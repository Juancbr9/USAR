'use strict';
// USAR 242 · Mapa con calles (OpenStreetMap) de la operación: worksites por categoría, base, punto de reunión y tu posición.
// Las zonas que se ven con cobertura quedan guardadas en el móvil y se pueden volver a ver sin conexión.
// (Las normas de OpenStreetMap no permiten descargar zonas enteras de golpe; por eso se guarda lo que se va viendo.)

const TILE = 256;
const lon2x = (lon, z) => (lon + 180) / 360 * TILE * 2 ** z;
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * TILE * 2 ** z; };
const x2lon = (x, z) => x / (TILE * 2 ** z) * 360 - 180;
const y2lat = (y, z) => { const n = Math.PI - 2 * Math.PI * y / (TILE * 2 ** z); return 180 / Math.PI * Math.atan(Math.sinh(n)); };

let map = null;
function openMap(mid) {
  const m = mget(mid), pts = mapPoints(m);
  openModal(`Mapa · ${m.title}`, `
    <div class="map" id="map"><div class="map-tiles"></div><div class="map-pins"></div>
      <div class="map-ctl"><button aria-label="Acercar" onclick="mapZoom(1)">${ic('plus')}</button><button aria-label="Alejar" onclick="mapZoom(-1)">−</button>
        <button aria-label="Mi posición" onclick="mapLocate()">${ic('locate')}</button></div>
      <div class="map-attr">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a></div></div>
    <p class="muted" style="margin-top:8px">${pts.length ? 'Toca un worksite para abrirlo.' : 'Añade el GPS de los worksites, la base o el punto de reunión para verlos aquí.'} Lo que veas con cobertura se podrá ver después sin conexión.</p>`);
  let lat = 28.29, lon = -16.63, z = 10;   // Tenerife por defecto
  if (pts.length) {
    lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length; lon = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
    const el = $('map'), w = el.clientWidth - 60, h = el.clientHeight - 60;
    for (z = 18; z > 3; z--) {
      const xs = pts.map(p => lon2x(p.lon, z)), ys = pts.map(p => lat2y(p.lat, z));
      if (Math.max(...xs) - Math.min(...xs) < w && Math.max(...ys) - Math.min(...ys) < h) break;
    }
  }
  map = { el: $('map'), lat, lon, z, pts, me: null };
  drawMap();
  dragMap(map.el);
}
function drawMap() {
  if (!map || !document.body.contains(map.el)) return;
  const { el, z } = map, W = el.clientWidth, H = el.clientHeight;
  const cx = lon2x(map.lon, z), cy = lat2y(map.lat, z), x0 = cx - W / 2, y0 = cy - H / 2, n = 2 ** z;
  const tiles = [];
  for (let tx = Math.floor(x0 / TILE); tx <= Math.floor((x0 + W) / TILE); tx++)
    for (let ty = Math.floor(y0 / TILE); ty <= Math.floor((y0 + H) / TILE); ty++) {
      if (ty < 0 || ty >= n) continue;
      const wx = ((tx % n) + n) % n;
      tiles.push(`<img src="https://tile.openstreetmap.org/${z}/${wx}/${ty}.png" style="left:${Math.round(tx * TILE - x0)}px; top:${Math.round(ty * TILE - y0)}px" alt="" draggable="false">`);
    }
  el.querySelector('.map-tiles').innerHTML = tiles.join('');
  const at = (lat, lon) => [lon2x(lon, z) - x0, lat2y(lat, z) - y0];
  el.querySelector('.map-pins').innerHTML = map.pts.map(p => {
    const [x, y] = at(p.lat, p.lon);
    if (p.kind === 'ws') return `<button class="pin" style="left:${x}px; top:${y}px; --c:${p.color}" onclick="closeModal(); setPref({ ws: '${p.ws.id}' })"><span>${esc(p.name)}</span></button>`;
    return `<span class="pin ${p.kind}" style="left:${x}px; top:${y}px"><span>${p.kind === 'boo' ? 'Base' : 'Reunión'}</span></span>`;
  }).join('') + (map.me ? (([x, y]) => `<span class="pin me" style="left:${x}px; top:${y}px"></span>`)(at(...map.me)) : '');
}
function mapZoom(d) { if (!map) return; map.z = Math.max(3, Math.min(19, map.z + d)); drawMap(); }
function mapLocate() {
  getPos().then(p => { if (!p) return toast('No se pudo obtener tu posición', 'bad'); map.me = p; map.lat = p[0]; map.lon = p[1]; map.z = Math.max(map.z, 16); drawMap(); });
}
function dragMap(el) {
  let start = null, pinch = null;
  const pts = new Map(), d2 = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  el.onpointerdown = e => {
    if (e.target.closest('button')) return;
    el.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { pinch = { d: d2() }; start = null; return; }
    start = { x: e.clientX, y: e.clientY, cx: lon2x(map.lon, map.z), cy: lat2y(map.lat, map.z) };
  };
  el.onpointermove = e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    // pellizco: amplía o reduce un nivel cada vez que la distancia entre dedos cambia lo suficiente
    if (pinch && pts.size === 2) { const r = d2() / pinch.d; if (r > 1.35) { pinch.d = d2(); mapZoom(1); } else if (r < 0.74) { pinch.d = d2(); mapZoom(-1); } return; }
    if (!start) return;
    map.lon = x2lon(start.cx - (e.clientX - start.x), map.z); map.lat = y2lat(start.cy - (e.clientY - start.y), map.z);
    el.querySelectorAll('.map-tiles img, .map-pins > *').forEach(n => { n.style.translate = `${e.clientX - start.x}px ${e.clientY - start.y}px`; });
  };
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (start && !pts.size) { start = null; drawMap(); } };
  el.onpointerup = up; el.onpointercancel = up;
  el.ondblclick = () => mapZoom(1);
  el.onwheel = e => { e.preventDefault(); mapZoom(e.deltaY < 0 ? 1 : -1); };
}
