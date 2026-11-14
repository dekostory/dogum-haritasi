/* Çevrimdışı açılabilmek için: önce ağ, ağ yoksa önbellek. Danışan verisi burada tutulmaz (tarayıcı deposunda). */
const ON = "dh-v1";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || (u.origin !== location.origin && !u.hostname.endsWith("gstatic.com") && !u.hostname.endsWith("googleapis.com"))) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const k = r.clone(); caches.open(ON).then(c => c.put(e.request, k)); }
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
