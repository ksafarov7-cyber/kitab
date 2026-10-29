/* Oxu — service worker (v3) */
const V = 'oxu-v3.1.0';
const CORE = [
  './', './index.html', './manifest.json', './icon.svg',
  './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png',
  './vendor/pdf.min.js', './vendor/pdf.worker.min.js',
  './vendor/jszip.min.js', './vendor/epub.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.all(CORE.map(async u => {
      try {
        const r = await fetch(new Request(u, { cache: 'reload' }));
        if (r && r.ok) await c.put(u, r);
      } catch (_) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
  const own = u.origin === location.origin;
  const isVendor = own && /\/vendor\//.test(u.pathname);

  /* API çağırışları (tərcümə, lüğət) keşlənmir */
  if (!own && !/(^|\.)cdnjs\.cloudflare\.com$|(^|\.)cdn\.jsdelivr\.net$/.test(u.host)) return;

  if (own && req.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(V);
      const cached = (await c.match('./index.html')) || (await c.match('./'));
      try {
        const r = await Promise.race([
          fetch(req),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4500))
        ]);
        if (r && r.ok) c.put('./index.html', r.clone());
        return r;
      } catch (_) {
        return cached || new Response('Oflayn rejimdə bu səhifə tapılmadı.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      }
    })());
    return;
  }

  if (isVendor) {
    e.respondWith((async () => {
      const c = await caches.open(V);
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const r = await fetch(req);
        if (r && r.ok) c.put(req, r.clone());
        return r;
      } catch (_) { return new Response('', { status: 504 }); }
    })());
    return;
  }

  if (own) {
    /* stale-while-revalidate */
    e.respondWith((async () => {
      const c = await caches.open(V);
      const hit = await c.match(req, { ignoreSearch: true });
      const net = fetch(req).then(r => {
        if (r && r.ok) c.put(req, r.clone());
        return r;
      }).catch(() => null);
      if (hit) { e.waitUntil(net); return hit; }
      const r = await net;
      return r || new Response('', { status: 504 });
    })());
    return;
  }

  /* köhnə CDN ünvanları üçün ehtiyat */
  e.respondWith((async () => {
    const c = await caches.open(V);
    const hit = await c.match(req);
    if (hit) return hit;
    try {
      const r = await fetch(req);
      if (r && r.ok) c.put(req, r.clone());
      return r;
    } catch (_) { return new Response('', { status: 504 }); }
  })());
});
