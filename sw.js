// Panel Álex: guarda la app para que abra sin conexión.
const CACHE = 'panel-alex-v15';
const ARCHIVOS = ['./', 'index.html', 'plan-auto.js', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png'];
const LINEA = '<script src="plan-auto.js"></script>';

// Añade el plan automático a la página sin tocar index.html.
// Si index.html ya lleva la línea, no hace nada.
async function conPlan(r) {
  try {
    if (!r.ok || !(r.headers.get('content-type') || '').includes('text/html')) return r;
    const t = await r.clone().text();
    if (t.includes('plan-auto.js') || !t.includes('</body>')) return r;
    const h = new Headers(r.headers); h.delete('content-length'); h.delete('content-encoding');
    return new Response(t.replace('</body>', LINEA + '\n</body>'), { status: r.status, statusText: r.statusText, headers: h });
  } catch (err) { return r; }
}
const esPagina = (u, req) => req.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('index.html');

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Primero la red (para recibir versiones nuevas); si no hay conexión, la copia guardada.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(async r => {
      if (esPagina(u, e.request)) r = await conPlan(r);
      if (r.ok && !u.pathname.endsWith('precios.json')) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
