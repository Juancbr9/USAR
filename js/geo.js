'use strict';
// USAR 242 · Coordenadas: latitud/longitud (WGS84), UTM y MGRS, en los dos sentidos, y unidades de distancia.
// Lo que se ve depende de Ajustes → Unidades (prefs.coordFmt: 'latlon' | 'utm' | 'mgrs'; prefs.distUnit: 'km' | 'm' | 'cm').

const WGS = { a: 6378137, f: 1 / 298.257223563, k0: 0.9996 };
WGS.e2 = WGS.f * (2 - WGS.f); WGS.ep2 = WGS.e2 / (1 - WGS.e2);
const BANDS = 'CDEFGHJKLMNPQRSTUVWX';
const MGRS_COL = ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'], MGRS_ROW = 'ABCDEFGHJKLMNPQRSTUV';

function toUTM(lat, lon) {
  const zone = Math.floor((lon + 180) / 6) + 1, lon0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const φ = lat * Math.PI / 180, λ = lon * Math.PI / 180, { a, e2, ep2, k0 } = WGS;
  const N = a / Math.sqrt(1 - e2 * Math.sin(φ) ** 2), T = Math.tan(φ) ** 2, C = ep2 * Math.cos(φ) ** 2, A = Math.cos(φ) * (λ - lon0);
  const M = a * ((1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256) * φ - (3 * e2 / 8 + 3 * e2 ** 2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * φ)
    + (15 * e2 ** 2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * φ) - (35 * e2 ** 3 / 3072) * Math.sin(6 * φ));
  const e = k0 * N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;
  let n = k0 * (M + N * Math.tan(φ) * (A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24 + (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720));
  if (lat < 0) n += 10000000;
  return { zone, band: BANDS[Math.max(0, Math.min(19, Math.floor((lat + 80) / 8)))], e, n };
}

function fromUTM(zone, band, e, n) {
  const { a, e2, ep2, k0 } = WGS, south = BANDS.indexOf(band.toUpperCase()) < 10;
  const x = e - 500000, y = south ? n - 10000000 : n, lon0 = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180;
  const M = y / k0, μ = M / (a * (1 - e2 / 4 - 3 * e2 ** 2 / 64 - 5 * e2 ** 3 / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const φ1 = μ + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * μ) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * μ) + (151 * e1 ** 3 / 96) * Math.sin(6 * μ) + (1097 * e1 ** 4 / 512) * Math.sin(8 * μ);
  const N1 = a / Math.sqrt(1 - e2 * Math.sin(φ1) ** 2), T1 = Math.tan(φ1) ** 2, C1 = ep2 * Math.cos(φ1) ** 2;
  const R1 = a * (1 - e2) / (1 - e2 * Math.sin(φ1) ** 2) ** 1.5, D = x / (N1 * k0);
  const φ = φ1 - (N1 * Math.tan(φ1) / R1) * (D ** 2 / 2 - (5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4 / 24 + (61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6 / 720);
  const λ = lon0 + (D - (1 + 2 * T1 + C1) * D ** 3 / 6 + (5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5 / 120) / Math.cos(φ1);
  return [φ * 180 / Math.PI, λ * 180 / Math.PI];
}

function toMGRS(lat, lon) {
  const u = toUTM(lat, lon), set = (u.zone - 1) % 3;
  const col = MGRS_COL[set][Math.floor(u.e / 100000) - 1];
  const row = MGRS_ROW[(Math.floor(u.n / 100000) + (u.zone % 2 === 0 ? 5 : 0)) % 20];
  const pad = v => String(Math.floor(v % 100000)).padStart(5, '0');
  return `${u.zone}${u.band} ${col}${row} ${pad(u.e)} ${pad(u.n)}`;
}

function fromMGRS(s) {
  const m = String(s).toUpperCase().replace(/\s+/g, '').match(/^(\d{1,2})([C-X])([A-Z])([A-Z])(\d+)$/);
  if (!m || m[5].length % 2) return null;
  const zone = +m[1], band = m[2], digits = m[5], half = digits.length / 2, mul = 10 ** (5 - half);
  const colIdx = MGRS_COL[(zone - 1) % 3].indexOf(m[3]), rowIdx = MGRS_ROW.indexOf(m[4]);
  if (colIdx < 0 || rowIdx < 0) return null;
  const e = (colIdx + 1) * 100000 + +digits.slice(0, half) * mul + mul / 2;   // centro del cuadrado
  let n = ((rowIdx - (zone % 2 === 0 ? 5 : 0) + 20) % 20) * 100000 + +digits.slice(half) * mul + mul / 2;
  // la fila se repite cada 2.000 km: se busca la que cae dentro de la banda de latitud
  const bandLat = -80 + BANDS.indexOf(band) * 8, minN = toUTM(bandLat, (zone - 1) * 6 - 180 + 3).n;
  while (n < minN - 100000) n += 2000000;
  return fromUTM(zone, band, e, n);
}

// Acepta «28.1, -15.4», «28R 456789 3112345» (UTM) o «28R DS 56789 12345» (MGRS) y devuelve [lat, lon]
function parseCoord(s) {
  const t = String(s || '').trim(); if (!t) return null;
  const ll = t.match(/^(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)$/);
  if (ll) { const [lat, lon] = [+ll[1].replace(',', '.'), +ll[2].replace(',', '.')]; return Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? [lat, lon] : null; }
  const utm = t.toUpperCase().match(/^(\d{1,2})\s*([C-X])\s+(\d{5,7}(?:\.\d+)?)\s*[E]?\s+(\d{6,8}(?:\.\d+)?)\s*[N]?$/);
  if (utm) return fromUTM(+utm[1], utm[2], +utm[3], +utm[4]);
  return fromMGRS(t);
}

const coordFmt = () => prefs.coordFmt || 'latlon';
function fmtCoord(lat, lon, fmt = coordFmt()) {
  lat = +lat; lon = +lon; if (!isFinite(lat) || !isFinite(lon)) return '';
  if (fmt === 'mgrs') return toMGRS(lat, lon);
  if (fmt === 'utm') { const u = toUTM(lat, lon); return `${u.zone}${u.band} ${Math.round(u.e)} E ${Math.round(u.n)} N`; }
  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}
// Las tres a la vez (fichas e informes)
const allCoords = (lat, lon) => ['latlon', 'utm', 'mgrs'].map(f => fmtCoord(lat, lon, f));

const distUnit = () => prefs.distUnit || 'm';
function fmtDist(meters, unit = distUnit()) {
  const v = +meters; if (!isFinite(v)) return '';
  if (unit === 'km') return (v / 1000).toLocaleString('es-ES', { maximumFractionDigits: v < 1000 ? 3 : 2 }) + ' km';
  if (unit === 'cm') return Math.round(v * 100).toLocaleString('es-ES') + ' cm';
  return (v < 10 ? Math.round(v * 10) / 10 : Math.round(v)).toLocaleString('es-ES') + ' m';
}
