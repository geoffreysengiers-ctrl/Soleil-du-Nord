// Service worker de Soleil du Nord.
// Stratégie « réseau d'abord » : on affiche toujours la dernière version en ligne
// (nouveaux articles d'Hermès, nouvelles modifs du site), et la copie gardée
// sert seulement quand il n'y a pas de connexion.
const CACHE = "soleil-du-nord-v6";
const COQUILLE = ["./", "index.html", "style.css?v=5", "app.js?v=5", "manifest.webmanifest",
                  "data/news.json", "data/citations.json", "icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(COQUILLE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const cle = new URL(req.url);
  // news.json est demandé avec ?v=horodatage : on le range sous une seule clé
  if (cle.pathname.endsWith("/data/news.json")) cle.search = "";
  e.respondWith(
    fetch(req)
      .then((rep) => {
        if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then((c) => c.put(cle.href, copie)); }
        return rep;
      })
      .catch(() => caches.match(cle.href).then((r) => r || caches.match(req, { ignoreSearch: true })))
  );
});
