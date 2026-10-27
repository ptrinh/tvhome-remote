// The service worker is one template literal too: no backtick or dollar-brace inside, and it must parse.
// Its fetch handling runs here against an in-memory Cache API and a fake network.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { SW } from "../src/sw.js";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "sw.js");

test("sw.js: only the two backticks that make the template, no dollar-brace", () => {
  const src = readFileSync(SRC, "utf8");
  assert.equal(src.split("`").length - 1, 2);
  assert.ok(!src.includes("$" + "{"));
});

/** Loads the worker into a sandbox; `net(url)` answers fetches (throw = offline). */
function load(net) {
  const store = new Map();
  const listeners = {};
  const cache = {
    async put(key, res) { store.set(typeof key === "string" ? key : new URL(key.url).pathname, await res.clone().text()); },
    async addAll(keys) { for (const k of keys) store.set(k, await (await net(k)).text()); },
  };
  const caches = {
    open: async () => cache,
    keys: async () => ["tv-remote-shell-v1"],
    delete: async () => true,
    match: async (key) => (store.has(key) ? new Response(store.get(key), { headers: { "content-type": "text/html" } }) : undefined),
  };
  const self = {
    location: { origin: "https://tv.example" },
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting() {},
    clients: { claim: async () => {} },
    registration: {},
  };
  const fetch = async (req) => net(typeof req === "string" ? req : new URL(req.url).pathname + new URL(req.url).search);
  vm.runInNewContext(SW, { self, caches, fetch, Response, Headers, URL, Promise, setTimeout, console });
  async function request(path, mode) {
    let answer = null;
    listeners.fetch({ request: { method: "GET", url: "https://tv.example" + path, mode }, respondWith: (p) => { answer = p; } });
    return answer ? (await answer).text() : null;
  }
  async function install() {
    let p;
    listeners.install({ waitUntil: (x) => { p = x; } });
    await p;
  }
  return { request, install, store };
}

const PAGE = '<link rel="manifest" href="/manifest.webmanifest"><p>page v1</p>';

test("the page opens from the cache with no connection", async () => {
  let online = true;
  const sw = load(async (path) => {
    if (!online) throw new TypeError("offline");
    return new Response(path.startsWith("/?") || path === "/" ? PAGE : "asset " + path);
  });
  await sw.install();
  online = false;
  assert.equal(await sw.request("/", "navigate"), PAGE);
  assert.equal(await sw.request("/?p=abc.def", "navigate"), PAGE);
  assert.equal(await sw.request("/outfit.ttf"), "asset /outfit.ttf");
});

test("with a connection the page comes from the network and refreshes the copy", async () => {
  let version = 1;
  const sw = load(async () => new Response(PAGE.replace("v1", "v" + version)));
  await sw.install();
  version = 2;
  assert.match(await sw.request("/", "navigate"), /page v2/);
  await new Promise((r) => setTimeout(r, 10));
  assert.match(sw.store.get("/"), /page v2/);
});

test("the cached copy of a paired page keeps no key", async () => {
  const sw = load(async (path) => new Response(path.startsWith("/?p=") ? PAGE.replace('webmanifest"', 'webmanifest?p=abc.def"') : PAGE));
  await sw.install();
  assert.match(await sw.request("/?p=abc.def", "navigate"), /webmanifest\?p=abc\.def/);
  await new Promise((r) => setTimeout(r, 10));
  assert.ok(!sw.store.get("/").includes("abc.def"));
});

test("the API is never answered by the worker", async () => {
  const sw = load(async () => new Response("live"));
  assert.equal(await sw.request("/api/status"), null);
  assert.equal(await sw.request("/api/vapid"), null);
});
