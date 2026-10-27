// The phone page is one template literal: its script may hold no backtick and no dollar-brace, and must parse.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGE } from "../src/page.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "page.js");

test("page.js: only the two backticks that make the template, no dollar-brace", () => {
  const src = readFileSync(SRC, "utf8");
  assert.equal(src.split("`").length - 1, 2);
  assert.ok(!src.includes("$" + "{"));
});

test("the page script parses", () => {
  const m = /<script>([\s\S]*)<\/script>/.exec(PAGE);
  assert.ok(m, "a script");
  const dir = mkdtempSync(join(tmpdir(), "tv-page-"));
  try {
    const file = join(dir, "page-script.js");
    writeFileSync(file, m[1]);
    const r = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the relay fills in the agent permissions", () => {
  assert.equal(PAGE.split("/*AGENT_PERMS*/null").length - 1, 1);
  for (const id of ["agentsCard", "agentCreate", "agentKey", "agentCopy", "agentList", "agentLog"]) assert.ok(PAGE.includes('id="' + id + '"'), id);
});

// ---- languages: the dictionary and the language choice, run from the page's own script.
function i18n() {
  const m = /[/][/] ---- i18n [(]begin[)][\s\S]*?[/][/] ---- i18n [(]end[)]/.exec(PAGE);
  assert.ok(m, "the i18n block");
  return new Function(m[0] + "\nreturn { T, pickLang, langOf };")();
}
const SCRIPT = /<script>([\s\S]*)<\/script>/.exec(PAGE)[1];

test("the page script has no backtick and no dollar-brace", () => {
  assert.ok(!SCRIPT.includes("`"));
  assert.ok(!SCRIPT.includes("$" + "{"));
});

test("every Vietnamese and Chinese key is an English key, with the same placeholders", () => {
  const { T } = i18n();
  assert.deepEqual(Object.keys(T).sort(), ["en", "vi", "zh"]);
  const holes = (s) => (s.match(/[{][0-9][}]/g) || []).sort().join();
  for (const l of ["vi", "zh"]) {
    for (const k of Object.keys(T[l])) {
      assert.ok(k in T.en, l + "." + k + " has no English");
      assert.equal(holes(T[l][k]), holes(T.en[k]), l + "." + k + " placeholders");
      assert.ok(T[l][k].length > 0, l + "." + k + " empty");
    }
  }
});

test("every key the page uses is in the English dictionary", () => {
  const { T } = i18n();
  const used = new Set();
  for (const m of PAGE.matchAll(/data-i18n(?:-html|-placeholder|-title|-aria-label)?="([a-z0-9_]+)"/g)) used.add(m[1]);
  for (const m of SCRIPT.matchAll(/(?:[^a-zA-Z_.]t|setT[(][^,]+,)[(]?\s*"([a-z0-9_]+)"/g)) used.add(m[1]);
  // The keys picked by a ?: right inside t(...) or setT(el, ...).
  for (const m of SCRIPT.matchAll(/(?:[^a-zA-Z_.]t[(]|setT[(][^,]+, )[^?()";]*[?] "([a-z0-9_]+)" : "([a-z0-9_]+)"/g)) { used.add(m[1]); used.add(m[2]); }
  assert.ok(used.size > 100, "found " + used.size + " keys");
  for (const k of used) assert.ok(k in T.en, "missing English key " + k);
});

test("language: a saved choice wins, then the TV's, then the phone's, then English", () => {
  const { pickLang } = i18n();
  assert.equal(pickLang("", "vi-VN", []), "vi");
  assert.equal(pickLang("", "zh-CN", []), "zh");
  assert.equal(pickLang("", "zh-Hans-CN", []), "zh");
  assert.equal(pickLang("", "en-US", ["vi-VN"]), "en");
  assert.equal(pickLang("", "fr-FR", []), "en");
  assert.equal(pickLang("", "", []), "en");
  assert.equal(pickLang("", "", ["fr-FR", "vi"]), "vi");
  assert.equal(pickLang("", "", undefined), "en");
  assert.equal(pickLang("en", "vi-VN", ["zh-CN"]), "en");
  assert.equal(pickLang("zh", "vi-VN", []), "zh");
  assert.equal(pickLang("vi", "", ["en-GB"]), "vi");
  assert.equal(pickLang("xx", "vi-VN", []), "vi");
});

test("the language picker offers Auto and each language in its own script", () => {
  for (const s of ['data-lang=""', 'data-lang="en" lang="en">English', 'data-lang="vi" lang="vi">Tiếng Việt', 'data-lang="zh" lang="zh-CN">中文']) assert.ok(PAGE.includes(s), s);
});

test("nothing in the page script hides t() behind a local of the same name", () => {
  assert.ok(!/(?:const|let|var) t\b|function [A-Za-z]*[(](?:[^)]*, )?t[,)]|[(]t[)] =>|[(]t, /.test(SCRIPT));
});
