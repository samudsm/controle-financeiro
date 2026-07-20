// Service Worker — cache offline (estratégia network-first para navegação,
// cache-first para assets estáticos).
const CACHE = "financeiro-v1";
const ESSENCIAIS = ["/dashboard", "/manifest.json", "/icon.svg"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ESSENCIAIS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Não interceptar chamadas ao Supabase / APIs externas.
  if (url.origin !== self.location.origin) return;

  // Navegação (páginas): tenta rede, cai pro cache se offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/dashboard")))
    );
    return;
  }

  // Assets estáticos: cache-first.
  e.respondWith(
    caches.match(req).then((cache) => {
      if (cache) return cache;
      return fetch(req).then((resp) => {
        if (resp.ok && (url.pathname.startsWith("/_next/") || ESSENCIAIS.includes(url.pathname))) {
          const copia = resp.clone();
          caches.open(CACHE).then((c) => c.put(req, copia));
        }
        return resp;
      });
    })
  );
});
