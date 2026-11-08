// Bump the version number (music-notes-vN) below whenever you update the app files.
const C='music-notes-v17',F=['./','index.html','manifest.webmanifest','icon-180.png','icon-192.png','icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(F)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C&&x!=='mn-cdn').map(x=>caches.delete(x))))));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  // the PDF reader (PDF.js) is cached the first time it is used, so importing also works offline afterwards
  if(u.hostname==='cdn.jsdelivr.net'){
    e.respondWith(caches.open('mn-cdn').then(async c=>{
      const hit=await c.match(e.request);if(hit)return hit;
      const res=await fetch(e.request);
      if(res&&(res.ok||res.type==='opaque'))c.put(e.request,res.clone());
      return res;
    }));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
