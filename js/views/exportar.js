'use strict';
// USAR 242 · Croquis de posiciones sin conexión, exportación (CSV, GeoJSON, KML) y necesidades humanitarias

const parseGps = s => parseCoord(s);   // lat/lon, UTM o MGRS (js/geo.js)
const CAT_COLOR = { A: '#c62828', B: '#e07b00', C: '#1f5fa8', D: '#6b6b6b' };

function mapPoints(m) {
  const pts = worksitesOf(m.id).filter(w => w.lat && w.lon).map(w => ({ kind: 'ws', name: w.code, lat: +w.lat, lon: +w.lon, color: CAT_COLOR[w.cat] || '#22382a', ws: w }));
  const boo = parseGps(m.zone?.booGps), meet = parseGps(m.zone?.meetingGps);
  if (boo) pts.push({ kind: 'boo', name: 'Base', lat: boo[0], lon: boo[1] });
  if (meet) pts.push({ kind: 'meet', name: 'Reunión', lat: meet[0], lon: meet[1] });
  return pts.filter(p => isFinite(p.lat) && isFinite(p.lon));
}

// Croquis a escala con las coordenadas GPS (sin mapa de fondo: funciona sin cobertura)
function croquisPanel(m) {
  const pts = mapPoints(m);
  if (!pts.length) return `
    <div class="panel"><h3 class="sec-title">${ic('pin')} Croquis de posiciones</h3>
      <p class="muted">Añade el GPS de los worksites (botón «Usar mi ubicación») y de la base y el punto de reunión (Seguridad → Zona) para ver aquí sus posiciones a escala, también sin cobertura.</p>
      <button class="btn btn-g btn-sm" style="margin-top:10px" onclick="openMap('${m.id}')">${ic('map', 'i-sm')} Mapa con calles</button></div>`;
  const lat0 = pts.reduce((s, p) => s + p.lat, 0) / pts.length, lon0 = pts.reduce((s, p) => s + p.lon, 0) / pts.length;
  const xy = p => [(p.lon - lon0) * Math.cos(lat0 * Math.PI / 180) * 111320, (p.lat - lat0) * 110540];
  const ms = pts.map(xy);
  const W = 340, H = 240;
  const mx = Math.max(30, ...ms.map(([x]) => Math.abs(x))), my = Math.max(30, ...ms.map(([, y]) => Math.abs(y)));
  const k = Math.min((W / 2 - 50) / mx, (H / 2 - 42) / my);
  const P = ([x, y]) => [W / 2 + x * k, H / 2 - y * k];
  const nice = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000].find(d => d * k > 50) || 10000;
  const marks = pts.map((p, i) => {
    const [x, y] = P(ms[i]);
    if (p.kind === 'boo') return `<rect x="${x - 7}" y="${y - 7}" width="14" height="14" fill="#22382a"/><text x="${x + 10}" y="${y + 4}" class="cq">Base</text>`;
    if (p.kind === 'meet') return `<circle cx="${x}" cy="${y}" r="8" fill="#2e7d32"/><text x="${x}" y="${y + 3.5}" text-anchor="middle" fill="#fff" font-size="10" font-weight="800">R</text><text x="${x + 11}" y="${y + 4}" class="cq">Reunión</text>`;
    return `<g onclick="setPref({ ws: '${p.ws.id}' })" style="cursor:pointer"><circle cx="${x}" cy="${y}" r="9" fill="${p.color}" stroke="#fff" stroke-width="2"/>
      <text x="${x}" y="${y - 13}" text-anchor="middle" class="cq b">${esc(p.name)}</text></g>`;
  }).join('');
  return `
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('pin')} Croquis de posiciones</h3>
        <div class="row"><button class="btn btn-a btn-sm" onclick="openMap('${m.id}')">${ic('map', 'i-sm')} Mapa con calles</button>
          <a class="btn btn-g btn-sm" target="_blank" rel="noopener" href="${mapsUrl(lat0.toFixed(5) + ',' + lon0.toFixed(5))}">Maps</a></div></div>
      <svg viewBox="0 0 ${W} ${H}" class="croquis" role="img" aria-label="Croquis de posiciones de los worksites">
        <rect width="${W}" height="${H}" rx="8" fill="var(--sunk)"/>
        <path d="M${W - 24} 34l6-16 6 16-6-4z" fill="var(--ink)"/><text x="${W - 18}" y="48" text-anchor="middle" class="cq b">N</text>
        <path d="M14 ${H - 14}h${nice * k}" stroke="var(--ink)" stroke-width="3"/><text x="14" y="${H - 20}" class="cq">${fmtDist(nice)}</text>
        ${marks}
      </svg>
      <p class="muted" style="margin-top:6px">Colores por categoría: <b style="color:${CAT_COLOR.A}">A</b> · <b style="color:${CAT_COLOR.B}">B</b> · <b style="color:${CAT_COLOR.C}">C</b> · <b style="color:${CAT_COLOR.D}">D</b>. Toca un worksite para abrirlo.</p>
    </div>`;
}

/* ==================== EXPORTACIÓN ==================== */
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Descargado ${name}`);
}
const csvCell = v => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const toCsv = (head, rows) => '﻿' + [head, ...rows].map(r => r.map(csvCell).join(';')).join('\r\n');
const fileBase = m => 'usar242-' + m.title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function exportWorksitesCsv(mid) {
  const m = mget(mid);
  download(fileBase(m) + '-worksites.csv', toCsv(
    ['E1 Worksite', 'E2 Latitud', 'E2 Longitud', 'E3 Dirección', 'F4 Uso', 'F5 Construcción', 'F6 Planta (m)', 'F7 Plantas', 'F8 Sótanos', 'F9 Desaparecidos', 'F10 Vivas confirmadas', 'F11 Categoría', 'F12 Daño %', 'F13 Colapso', 'F14 Riesgos', 'Estado', 'ASR'],
    worksitesOf(mid).map(w => [w.code, w.lat, w.lon, w.address, w.use, w.construction, w.size, w.floors, w.basements, w.missing, w.live, w.cat, w.damage, w.collapse, w.hazards, WS_STATUS[w.status][0], (w.asr || []).map(r => r.level).join(' ')])),
  'text/csv;charset=utf-8');
}
function exportVictimsCsv(mid) {
  const m = mget(mid);
  download(fileBase(m) + '-victimas.csv', toCsv(
    ['Referencia', 'E1 Worksite', 'V1 Nº', 'V2 Fecha', 'V3 Hora', 'V5 Planta', 'V6 Posición', 'V7 Trabajo', 'V8 Minutos', 'V9 Estado', 'Triaje START', 'V10 Lesiones', 'V11 Entregada a', 'V12 Recibe'],
    victimsOf(mid).map(v => {
      const d = v.extricated ? new Date(v.extricated) : null;
      return [victimRef(v), get('worksites', v.worksite)?.code || '', v.n, d ? d.toLocaleDateString('es-ES') : '', d ? fmtHour(v.extricated) : '', v.floor, v.position, v.work,
        v.extricated && v.rescueStart ? Math.round((v.extricated - v.rescueStart) / 6e4) : '', V_STATE[v.state], v.color || '', V_INJURY[v.injury] || '', v.handed, v.handedContact];
    })), 'text/csv;charset=utf-8');
}
function exportGeoJson(mid) {
  const m = mget(mid);
  const features = mapPoints(m).map(p => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
    properties: p.ws ? { tipo: 'worksite', id: p.ws.code, categoria: p.ws.cat || '', estado: WS_STATUS[p.ws.status][0], direccion: p.ws.address || '', victimas: victimsOf(mid).filter(v => v.worksite === p.ws.id).length } : { tipo: p.kind === 'boo' ? 'base' : 'punto de reunión', id: p.name } }));
  download(fileBase(m) + '.geojson', JSON.stringify({ type: 'FeatureCollection', features }, null, 1), 'application/geo+json');
}
function exportKml(mid) {
  const m = mget(mid);
  const pm = mapPoints(m).map(p => `<Placemark><name>${esc(p.name)}</name><description>${esc(p.ws ? `Categoría ${p.ws.cat || '-'} · ${WS_STATUS[p.ws.status][0]} · ${p.ws.address || ''}` : '')}</description><Point><coordinates>${p.lon},${p.lat},0</coordinates></Point></Placemark>`).join('\n');
  download(fileBase(m) + '.kml', `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${esc(m.title)}</name>\n${pm}\n</Document></kml>`, 'application/vnd.google-earth.kml+xml');
}

function exportPanel(m) {
  return `
    <div class="panel">
      <h3 class="sec-title">${ic('download')} Exportar</h3>
      <p class="muted" style="margin-bottom:10px">Con los códigos de campo INSARAG (E, F, G, V). Las víctimas van sin datos personales. GeoJSON y KML se abren en Google Earth, CalTopo o ATAK.</p>
      <div class="grid g2">
        <button class="btn btn-g" onclick="exportWorksitesCsv('${m.id}')">${ic('file')} Worksites (CSV)</button>
        <button class="btn btn-g" onclick="exportVictimsCsv('${m.id}')">${ic('file')} Víctimas (CSV)</button>
        <button class="btn btn-g" onclick="exportGeoJson('${m.id}')">${ic('pin')} Posiciones (GeoJSON)</button>
        <button class="btn btn-g" onclick="exportKml('${m.id}')">${ic('pin')} Posiciones (KML)</button>
      </div>
    </div>`;
}

/* ==================== NECESIDADES HUMANITARIAS ==================== */
function needsPanel(m) {
  const ns = m.needs || [];
  return `
    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('users')} Necesidades de la población</h3>
        <p class="muted">Lo que ves al trabajar y conviene pasar al mando (se puede anotar en cualquier nivel ASR).</p></div>
        <button class="btn btn-g btn-sm" onclick="needForm('${m.id}')">${ic('plus')} Anotar</button></div>
      ${ns.length ? `<div class="list">${ns.map((n, i) => `<div class="item"><div><b>${esc(n.place)}</b><small>${n.people ? esc(n.people) + ' personas · ' : ''}${esc(n.needs.join(', '))}${n.notes ? ' · ' + esc(n.notes) : ''}</small></div>
        <button class="link bad" onclick="if (confirm('¿Quitar?')) { const m = mget('${m.id}'); saveMission(m, { needs: m.needs.filter((_, j) => j !== ${i}) }); }">Quitar</button></div>`).join('')}</div>
        <button class="btn btn-g btn-sm" style="margin-top:10px" onclick="shareText(needsText(mget('${m.id}')), 'Necesidades humanitarias')">${ic('share', 'i-sm')} Enviar</button>`
        : '<p class="muted">Nada anotado.</p>'}
    </div>`;
}
function needForm(mid) {
  openForm('Necesidades de la población', [
    { k: 'place', label: 'Lugar', required: true, wide: true, placeholder: 'Ej: Plaza de la iglesia, sector A' },
    { k: 'people', label: 'Personas afectadas (aprox.)', type: 'number' },
    { k: 'needs', label: 'Qué necesitan', type: 'checks', catalog: 'needs', wide: true },
    { k: 'notes', label: 'Notas', type: 'textarea', rows: 2, wide: true }
  ], v => { const m = mget(mid); saveMission(m, { needs: [...(m.needs || []), { ...v, ts: Date.now() }] }, `necesidades en ${v.place}`); });
}
const needsText = m => [...waHead('🆘', 'USAR 242 · Necesidades humanitarias', m.title), `📅 ${fmtWhen(Date.now())}`, '',
  ...(m.needs || []).map(n => `📍 ${waB(n.place)}${n.people ? ` (👥 ${n.people} personas)` : ''}: ${n.needs.join(', ') || '—'}${n.notes ? '. ' + n.notes : ''}`)].join('\n');
