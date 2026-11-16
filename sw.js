// Service worker: ให้ติดตั้งเป็นแอปได้ และเปิดหน้าแอปได้แม้ออฟไลน์ (ข้อมูลซิงค์ยังต้องใช้อินเทอร์เน็ต)
const CACHE = 'vschem-shell-v2';
const HOSTS = ['cdn.tailwindcss.com', 'cdn.jsdelivr.net', 'fonts.googleapis.com', 'fonts.gstatic.com'];
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || !(u.origin === location.origin || HOSTS.includes(u.hostname))) return;   // ไม่แตะคำขอไป Google Sheet
  e.respondWith(fetch(e.request).then(r => { if (r && (r.ok || r.type === 'opaque')) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html') || caches.match('./'))));
});
