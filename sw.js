// Permite usar la app sin conexión.
// Con conexión siempre se descarga la última versión; la copia guardada solo se usa sin red.
const CACHE = 'usar242-v67';
const FILES = ['./', 'index.html', 'styles.css', 'qr.js', 'manifest.webmanifest', 'icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'img/contenedor-lateral.webp', 'img/mantenimiento.webp', 'img/logo.webp', 'img/veh/v-ab.webp', 'img/veh/v-ab-cont.webp', 'img/veh/v-ab-cont2.webp', 'img/veh/v-atb-m1.webp', 'img/veh/v-atb-m2.webp', 'img/veh/v-ab-lcif.webp', 'img/veh/v-ab-chasis.webp', 'img/veh/v-sangyong.webp', 'img/veh/v-amarok.webp', 'img/veh/v-amb.webp', 'img/veh/v-cam-verde.webp', 'img/veh/v-cupra.webp', 'img/veh/v-guagua-g.webp', 'img/veh/v-guagua-p.webp', 'img/veh/v-vpi.webp',
  'js/nativo.js', 'js/config.js', 'js/icons.js', 'js/utils.js', 'js/geo.js', 'js/pdf.js', 'js/data.js', 'js/metodo.js', 'js/sync.js', 'js/ui.js', 'js/sesion.js', 'js/areas.js', 'js/catalogos.js', 'js/marcaje.js', 'js/views/contenedor.js', 'js/views/cajas.js', 'js/views/revista.js', 'js/views/epi.js', 'js/views/operaciones.js', 'js/views/mision.js', 'js/views/seguridad.js', 'js/views/confinados.js', 'js/views/worksites.js', 'js/views/victimas.js', 'js/views/informes.js', 'js/views/guia.js', 'js/views/registros.js', 'js/views/exportar.js', 'js/views/despliegue.js', 'js/views/patrimonio.js', 'js/views/persona.js', 'js/views/campo.js', 'js/views/calendario.js', 'js/views/mapa.js', 'js/views/manual.js', 'vendor/jsQR.js', 'js/views/fichaje.js', 'js/views/plantillas.js', 'js/views/puestos.js', 'js/views/stock.js', 'js/views/entregas.js', 'js/views/actividades.js', 'js/views/ajustes.js', 'js/main.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== TILES && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Teselas del mapa (OpenStreetMap): se guardan las que se van viendo para poder verlas sin conexión (máx. ~1500)
const TILES = 'usar242-tiles';
async function tile(req) {
  const cache = await caches.open(TILES);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok || res.type === 'opaque') {
      cache.put(req, res.clone());
      cache.keys().then(ks => { if (ks.length > 1500) ks.slice(0, ks.length - 1500).forEach(k => cache.delete(k)); });
    }
    return res;
  } catch { return new Response('', { status: 504 }); }
}

// Tipografías (Google Fonts): se guardan la primera vez para verlas igual sin conexión
const FONTS = 'usar242-fonts';
async function font(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  if (hit) return hit;
  try { const res = await fetch(req); if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }
  catch { return /googleapis/.test(req.url) ? new Response('', { headers: { 'Content-Type': 'text/css' } }) : Response.error(); }   // sin red: letra del sistema
}

// Con cobertura mala (lo normal en una zona de intervención) no se espera a la red más de 3 s:
// si tarda, se abre la copia guardada y la versión nueva se guarda en cuanto llega.
const timeout = (p, ms) => new Promise((ok, ko) => { const t = setTimeout(() => ko(new Error('lenta')), ms); p.then(r => { clearTimeout(t); ok(r); }, e => { clearTimeout(t); ko(e); }); });

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'GET' && url.hostname === 'tile.openstreetmap.org') return e.respondWith(tile(e.request));
  if (e.request.method === 'GET' && /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) return e.respondWith(font(e.request));
  if (e.request.method !== 'GET' || url.origin !== location.origin) return; // Supabase va siempre a la red
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(e.request, { cache: 'no-cache' }).then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; });
    try { return await timeout(net, 3000); }
    catch {
      const hit = await cache.match(e.request, { ignoreSearch: true });
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      try { return await net; } catch { return (await cache.match('index.html')) || Response.error(); }
    }
  })());
});

// Al tocar un aviso del sistema se abre la app
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs[0] ? cs[0].focus() : self.clients.openWindow('./')));
});
