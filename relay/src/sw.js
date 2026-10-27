// The service worker: makes the page an installable app that opens without a connection, and shows the
// "TV on/off" notifications. The page is network first (a deploy shows up on the next open) and falls back to
// the last copy after 3 s or with no connection; the font, icons and manifest come from the cache. The API and
// the WebSocket always go to the network: they are the TV's live state.
// Bump CACHE when the font, the icons or the manifest change.
export const SW = `
const CACHE = "tv-remote-shell-v1";
const STATIC = ["/outfit.ttf", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest"];
const PAGE_TIMEOUT_MS = 3000;

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"].concat(STATIC))).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("tv-remote-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// A paired page (/?p=<id>.<key>) links a manifest with the key in its address; the cached copy keeps the plain
// link so the key is not stored twice. The page itself reads the key from its own address.
async function keepPage(res) {
  const html = (await res.text()).replace(/manifest\\.webmanifest\\?p=[^"]*/, "manifest.webmanifest");
  const headers = new Headers(res.headers);
  const cache = await caches.open(CACHE);
  await cache.put("/", new Response(html, { status: 200, headers: headers }));
}

function page(req) {
  const net = fetch(req).then((res) => {
    if (res.ok) keepPage(res.clone()).catch(() => {});
    return res;
  });
  const cached = caches.match("/");
  const late = new Promise((resolve) => setTimeout(resolve, PAGE_TIMEOUT_MS));
  return Promise.race([net.catch(() => null), late.then(() => null)]).then((res) => {
    if (res) return res;
    return cached.then((hit) => hit || net);
  });
}

function asset(path, req) {
  return caches.match(path).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(path, copy)).catch(() => {});
    }
    return res;
  }));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === "navigate" && url.pathname === "/") { e.respondWith(page(req)); return; }
  if (!url.search && STATIC.includes(url.pathname)) { e.respondWith(asset(url.pathname, req)); return; }
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {}
  e.waitUntil(self.registration.showNotification(d.title || "TV Remote", {
    body: d.body || "",
    tag: d.tag || "tv",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const c of list) if ("focus" in c) return c.focus();
    return self.clients.openWindow("/");
  }));
});
`;
