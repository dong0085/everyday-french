// Everyday French service worker: an offline message, nothing more.
// - On install it caches the signed-out /offline page, its stylesheets and the app icon.
// - For page navigations it always goes to the network; only when that fails does it show /offline.
// - It never caches API answers or signed-in pages, and never touches non-GET requests.
const CACHE = "ef-offline-v1";
const OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // credentials: "omit" → the cached copy is the signed-out page, with no account details in it.
      .then(async (c) => {
        const res = await fetch(new Request(OFFLINE, { credentials: "omit" }));
        if (!res.ok) throw new Error("offline page");
        // Keep its stylesheets too, so the message looks like the app.
        const html = await res.clone().text();
        const css = [...html.matchAll(/href="(\/_next\/static\/[^"]+\.css)"/g)].map((m) => m[1]);
        await c.put(OFFLINE, res);
        await c.addAll(["/icon-192.png", ...new Set(css)]);
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE).then((r) => r || Response.error())));
  } else if (req.destination === "style" && new URL(req.url).pathname.startsWith("/_next/static/")) {
    // Immutable build files: the network first, the copy kept for the offline page only when it fails.
    event.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r || Response.error())));
  }
});
