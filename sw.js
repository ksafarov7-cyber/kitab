const C='oxu-v2',A=['./','index.html','manifest.json','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(A)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{const u=new URL(e.request.url),own=u.origin===location.origin;
 if(e.request.method!=='GET'||!(own||u.host==='cdnjs.cloudflare.com'))return;
 const save=r=>{if(r.ok){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp))}return r};
 e.respondWith(own?fetch(e.request).then(save).catch(()=>caches.match(e.request))
  :caches.match(e.request).then(h=>h||fetch(e.request).then(save)))});
