'use strict';
// USAR 242 · Iconos de la interfaz e ilustraciones del material

/* ==================== ICONOS (trazos estilo Lucide) ==================== */
const ICONS = {
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4M12 16h.01"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/>',
  hardhat: '<path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/><path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5M4 15v-3a6 6 0 0 1 6-6M14 6a6 6 0 0 1 6 6v3"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 9V3h12v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkc: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  qr: '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3M21 21v.01M12 7v3a2 2 0 0 1-2 2H7M3 12h.01M12 3h.01M12 16v.01M16 12h1M21 12v.01M12 21v-1"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16M8 16H3v5"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  heli: '<path d="M3 4h18M12 4v3"/><path d="M5 11h3l2-4h6a4 4 0 0 1 4 4v1a3 3 0 0 1-3 3h-7l-3-4"/><path d="M9 19h10M12 15v4M17 15v4M2 9l3 2"/>',
  case: '<rect x="3" y="7" width="18" height="12" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 12h18M8 12v2M16 12v2"/>',
  move: '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
  package: '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12M3.29 7 12 12l8.71-5M7.5 4.27l9 5.15"/>',
  pencil: '<path d="M21.17 6.81a1 1 0 0 0-3.99-3.99L3.84 16.17a2 2 0 0 0-.5.83l-1.32 4.35a.5.5 0 0 0 .62.62l4.35-1.32a2 2 0 0 0 .83-.5z"/>',
  trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  in: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8M3 3v5h5M12 7v5l4 2"/>',
  phone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  pin: '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  radio: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5M19.1 4.9C23 8.8 23 15.1 19.1 19"/>',
  play: '<path d="m6 3 14 9-14 9z"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  star: '<path d="M11.5 2.3a.5.5 0 0 1 1 0l2.3 4.7a2 2 0 0 0 1.6 1.1l5.2.8a.5.5 0 0 1 .3.9l-3.8 3.7a2 2 0 0 0-.6 1.8l.9 5.2a.5.5 0 0 1-.8.6l-4.6-2.5a2 2 0 0 0-1.9 0L5 21.1a.5.5 0 0 1-.8-.6l.9-5.2a2 2 0 0 0-.6-1.8L.7 9.8a.5.5 0 0 1 .3-.9l5.2-.8a2 2 0 0 0 1.6-1.1z"/>',
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  chev: '<path d="m9 18 6-6-6-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5M3 12a9 3 0 0 0 18 0"/>',
  building: '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18zM6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2M10 6h4M10 10h4M10 14h4M10 18h4"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.2 12.5h4.3l1.5-3 2 6 1.5-3h8.3"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h8M8 17h5"/>',
  megaphone: '<path d="m3 11 18-5v12L3 14v-3zM11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  dots: '<circle cx="12" cy="12" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  route: '<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>',
  tent: '<path d="M3.5 21 14 3M20.5 21 10 3M15.5 21 12 15l-3.5 6M2 21h20"/>',
  wind: '<path d="M12.8 19.6A2 2 0 1 0 14 16H2M17.5 8a2.5 2.5 0 1 1 2 4H2M9.8 4.4A2 2 0 1 1 11 8H2"/>',
  gauge: '<path d="m12 14 4-4M3.34 19a10 10 0 1 1 17.32 0"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3M12 9v4M12 17h.01"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  calc: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8M16 14v4M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01"/>',
  locate: '<path d="M2 12h3M19 12h3M12 2v3M12 19v3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>',
  landmark: '<path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l8 5H4z"/><path d="M4 18h16M4 11h16"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  map: '<path d="M14.1 5.6 9.9 3.4a2 2 0 0 0-1.8 0L3.6 5.6A1 1 0 0 0 3 6.5v13a1 1 0 0 0 1.4.9l3.7-1.8a2 2 0 0 1 1.8 0l4.2 2.1a2 2 0 0 0 1.8 0l4.5-2.3a1 1 0 0 0 .6-.9v-13a1 1 0 0 0-1.4-.9l-3.7 1.8a2 2 0 0 1-1.8 0zM9 3.2v15M15 5.8v15"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  finger: '<path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/><path d="M14 13.12c0 2.38 0 6.38-1 8.88"/><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/><path d="M2 12a10 10 0 0 1 18-6"/><path d="M2 16h.01"/><path d="M21.8 16c.2-2 .131-5.354 0-6"/><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/><path d="M8.65 22c.21-.66.45-1.32.57-2"/><path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>',
  timer: '<path d="M10 2h4M12 14l3-3"/><circle cx="12" cy="14" r="8"/>'
};
const ic = (name, cls = 'i') => ICONS[name]
  ? `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`
  : (console.warn('Icono desconocido:', name), '');

/* ==================== ICONOS DE LAS ÁREAS (menú) ====================
   A color con contorno negro, como los dibujos del material, sobre una placa del color del área. */
const AREA_ART = (() => {
  const K = '#1d1d1b', HI = 'rgba(255,255,255,.5)';
  const tile = c => `<rect x="1" y="1" width="30" height="30" rx="8" fill="${c}"/>`;
  // Rueda dentada de 8 dientes alrededor de (16, 16)
  const gear = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8, r = i % 2 ? 7.4 : 10.6, b = Math.PI / 14;
    return [a - b, a + b].map(t => `${(16 + r * Math.cos(t)).toFixed(1)} ${(16 + r * Math.sin(t)).toFixed(1)}`).join(' L');
  }).join(' L');
  return {
    home: `${tile('#f5b800')}<path d="M6 16 16 7l10 9z" fill="#d6332a"/><rect x="8.5" y="15.5" width="15" height="10.5" fill="#fff"/>
      <rect x="14" y="19" width="5" height="7" fill="#3b3f43"/><rect x="10" y="18" width="3" height="3" fill="#7fb8ea"/><path d="M5 26h22" stroke-width="1.6"/>`,
    ops: `${tile('#c62828')}<path d="M16 4.5v3M7.5 8l2 2M24.5 8l-2 2M5 15.5h3M24 15.5h3" stroke="#fff" stroke-width="1.8"/>
      <path d="M10 21a6 7.5 0 0 1 12 0z" fill="#3d8fe0"/><path d="M12.5 18a3.5 4.5 0 0 1 2.5-3.5" stroke="${HI}" stroke-width="1.4"/>
      <rect x="8" y="21" width="16" height="5" rx="1" fill="#262626"/>`,
    log: `${tile('#1f5fa8')}<rect x="4.5" y="10" width="23" height="14" rx="1" fill="#d6332a"/>
      <path d="M8 12v10M11 12v10M14 12v10M17 12v10M20 12v10" stroke="#9e1f1a" stroke-width="1"/><path d="M23 10v14" />
      <path d="M25 13v8" stroke="#3b3f43" stroke-width="1"/><path d="M5.5 11.5h16" stroke="${HI}" stroke-width="1.2"/>
      <path d="M4.5 10h3v3h-3zM24.5 10h3v3h-3zM4.5 21h3v3h-3zM24.5 21h3v3h-3z" fill="#3b3f43"/>`,
    team: `${tile('#1f7a72')}<path d="M15 27a7 6.5 0 0 1 13 0z" fill="#e07b00"/><circle cx="21.5" cy="15" r="3.6" fill="#f1c27d"/>
      <path d="M17.5 12.5a4 4 0 0 1 8 0z" fill="#f2f2f2"/><path d="M4 28a8 7.5 0 0 1 16 0z" fill="#f39200"/><path d="M7 25.5h10" stroke="#f6c400" stroke-width="1.6"/>
      <circle cx="12" cy="16" r="4.4" fill="#f1c27d"/><path d="M7 13.5a5 5 0 0 1 10 0z" fill="#f6c400"/><path d="M6 13.5h12" stroke-width="1.6"/>`,
    help: `${tile('#56606f')}<path d="M${gear}z" fill="#c3cad0"/><circle cx="16" cy="16" r="3.6" fill="#3b3f43"/>
      <path d="M10 12a7 7 0 0 1 4-3" stroke="${HI}" stroke-width="1.4"/>`
  };
})();
const areaIc = (area, cls = 'area-ic') => `<svg class="${cls}" viewBox="0 0 32 32" fill="none" stroke="#1d1d1b" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${AREA_ART[area]}</svg>`;

/* ==================== ILUSTRACIONES DEL MATERIAL ====================
   Dibujos propios (48×48) por tipo de material, a color y con contorno negro, como el dibujo del contenedor y los
   vehículos. {c} es el color de la marca o del propio equipo (Bosch azul, Hilti rojo, manguera verde…). Si el equipo
   tiene foto, se usa la foto. */
const TOOL_ART = (() => {
  const K = '#1d1d1b', OR = '#f39200', YE = '#f6c400', RD = '#d6332a', MT = '#c3cad0', MD = '#8a939a', DK = '#3b3f43',
    BK = '#262626', GR = '#3f8f3f', WD = '#d9a35b', HI = 'rgba(255,255,255,.45)';
  // Trazo grueso con contorno (tubos, cuerdas, mangos)
  const T = (d, c, w = 3) => `<path d="${d}" stroke="${K}" stroke-width="${w + 1.8}"/><path d="${d}" stroke="${c}" stroke-width="${w}"/>`;
  const hi = (x, y, w, h = 2) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${HI}" stroke="none"/>`;
  // Cuerpo de las herramientas hidráulicas de excarcelación (asa, cilindro naranja y cabeza)
  const HYD = `<path d="M2 22h5v4H2z" fill="${BK}"/>${T('M10 19v-6a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v6', BK, 2.4)}
    <rect x="6" y="18" width="19" height="12" rx="3" fill="${OR}"/>${hi(8, 20, 15, 2.4)}<rect x="15" y="18" width="3" height="12" fill="${BK}"/>`;
  const HEAD = `<rect x="24" y="17" width="8" height="14" rx="2" fill="${MD}"/><circle cx="29" cy="24" r="2.3" fill="${MT}"/>`;
  return {
    cizalla: `${HYD}<path d="M30 20c4-6 9-9 16-10-1 5-6 10-12 13z" fill="${DK}"/><path d="M30 28c4 6 9 9 16 10-1-5-6-10-12-13z" fill="${DK}"/>
      <path d="M38 13.5c-2 2-4 4-6 6M38 34.5c-2-2-4-4-6-6" stroke="${MD}" stroke-width="1"/>${HEAD}`,
    separador: `${HYD}<path d="M29 20 42 7l3 2.5-13 13.5z" fill="${DK}"/><path d="M29 28 42 41l3-2.5-13-13.5z" fill="${DK}"/>
      <path d="M41 6.5l5 4-2 2-5-4zM41 41.5l5-4-2-2-5 4z" fill="${MD}"/>${HEAD}`,
    combinada: `${HYD}<path d="M30 20c4-5 8-9 14-12l2.5 3c-5 3-9 7-12 12z" fill="${DK}"/><path d="M30 28c4 5 8 9 14 12l2.5-3c-5-3-9-7-12-12z" fill="${DK}"/>
      <path d="M43 7.5l3.5 3.5M43 40.5l3.5-3.5" stroke="${MD}" stroke-width="2.4"/><path d="M36 15l-3 3M36 33l-3-3" stroke="${MD}" stroke-width="1"/>${HEAD}`,
    cilindro: `<rect x="2" y="15" width="5" height="18" rx="1.5" fill="${DK}"/><rect x="7" y="18" width="20" height="12" rx="2" fill="${OR}"/>${hi(9, 20, 16)}
      ${T('M11 18v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4', BK, 2.2)}<rect x="27" y="20" width="13" height="8" fill="${MT}"/>${hi(28, 21.5, 11, 1.6)}
      <path d="M40 16h5l2 2v12l-2 2h-5z" fill="${DK}"/><path d="M45 19h2M45 23h2M45 27h2" stroke="${MD}" stroke-width="1"/><rect x="18" y="30" width="5" height="3" fill="${MT}"/>`,
    bateria: `<rect x="17" y="6" width="14" height="6" rx="1.5" fill="${OR}"/><rect x="10" y="10" width="28" height="8" rx="2" fill="${DK}"/>
      <rect x="8" y="16" width="32" height="26" rx="3" fill="${BK}"/>${hi(10, 18.5, 28)}<path d="m25 21-6 9h5l-2 8 7-10h-5z" fill="${YE}"/>
      <circle cx="13" cy="37" r="1.3" fill="#5ccf5c"/><circle cx="13" cy="32" r="1.3" fill="#5ccf5c"/><circle cx="35" cy="37" r="1.3" fill="#5ccf5c"/><circle cx="35" cy="32" r="1.3" fill="${MD}"/>`,
    motodisco: `<rect x="14" y="26" width="20" height="6" rx="2" fill="${DK}"/><circle cx="33" cy="30" r="12" fill="${MT}"/>
      <circle cx="33" cy="30" r="12" stroke="${K}" stroke-width="1.2" stroke-dasharray="2.2 1.6"/><circle cx="33" cy="30" r="3" fill="${DK}"/>
      <path d="M20 30a13 13 0 0 1 26 0h-4a9 9 0 0 0-18 0z" fill="${OR}"/>${T('M7 17v-3a4 4 0 0 1 4-4h8', BK, 2.4)}
      <rect x="3" y="16" width="17" height="18" rx="3" fill="{c}"/>${hi(5, 18, 13)}<rect x="6" y="23" width="9" height="6" rx="1" fill="#e9e9e6"/><path d="M2 34h12" stroke="${BK}" stroke-width="2.4"/>`,
    martillo: `${T('M8 9h32', BK, 3.4)}<rect x="15" y="10" width="18" height="22" rx="3" fill="{c}"/>${hi(17, 12, 14)}
      <path d="M19 18h10M19 22h10M19 26h10" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><rect x="19" y="32" width="10" height="5" rx="1" fill="${DK}"/>
      <path d="M21.5 37h5v6l-2.5 3-2.5-3z" fill="${MT}"/>`,
    taladro: `<path d="M40 17h6" stroke="${MD}" stroke-width="2.6"/><path d="M41 15.5l1.5 3M43.5 15.5l1.5 3" stroke="${K}" stroke-width=".9"/>
      <rect x="33" y="12" width="7" height="10" rx="1.5" fill="${DK}"/><path d="M8 9h22a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H8a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3z" fill="{c}"/>${hi(8, 11, 21)}
      <path d="M12 25h9l-2 11h-9z" fill="${BK}"/><rect x="20" y="25" width="3" height="5" rx="1" fill="${DK}"/><rect x="5" y="36" width="18" height="8" rx="2" fill="${BK}"/>
      <path d="M7 39h14" stroke="{c}" stroke-width="1.6"/><path d="M12 17h12" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/>`,
    motosierra: `<rect x="23" y="25" width="23" height="7" rx="3.5" fill="${MT}"/><rect x="23" y="25" width="23" height="7" rx="3.5" stroke="${K}" stroke-width="1.4" stroke-dasharray="1.6 1.3"/>
      ${T('M10 19c0-6 4-9 10-9h3v8', BK, 2.4)}<path d="M24 12l3 8" stroke="${BK}" stroke-width="2.6"/>
      <path d="M7 19h18a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" fill="{c}"/><rect x="10" y="22" width="9" height="8" rx="1.5" fill="#e9e9e6"/>
      <path d="M12 24h5M12 26.5h5M12 29h5" stroke="${MD}" stroke-width="1"/><path d="M5 25H1v9h5" fill="${BK}"/><path d="M8 21h15" stroke="${HI}" stroke-width="1.6"/>`,
    sierra_circular: `<circle cx="22" cy="31" r="11" fill="${MT}"/><circle cx="22" cy="31" r="11" stroke="${K}" stroke-width="1.2" stroke-dasharray="2.2 1.6"/>
      <rect x="3" y="29" width="40" height="4" rx="1" fill="${DK}"/><path d="M9 29a13 13 0 0 1 26 0z" fill="${MD}"/><circle cx="22" cy="27" r="2.4" fill="${DK}"/>
      ${T('M14 19c0-7 5-11 13-11h6v9', BK, 2.6)}<rect x="28" y="15" width="16" height="12" rx="3" fill="{c}"/>${hi(30, 17, 12)}
      <path d="M31 21h10M31 24h10" stroke="rgba(0,0,0,.3)" stroke-width="1.1"/>`,
    sierra_sable: `<path d="M35 22h11l-2 6H35z" fill="${MT}"/><path d="M36 28l1 1.6M39 28l1 1.6M42 28l1 1.6" stroke="${K}" stroke-width="1"/>
      <rect x="31" y="19" width="5" height="12" rx="1" fill="${DK}"/><path d="M5 17h22l5 3v10l-5 3H5a3 3 0 0 1-3-3V20a3 3 0 0 1 3-3z" fill="{c}"/>${hi(5, 19, 20)}
      <rect x="2" y="21" width="11" height="8" rx="2" fill="${BK}"/><path d="M17 23h8M17 27h8" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/>`,
    radial: `<rect x="40" y="6" width="3.5" height="36" rx="1.5" fill="${MT}"/><path d="M43.5 8h3v16h-3z" fill="${DK}"/>
      <rect x="30" y="17" width="10" height="14" rx="2" fill="${DK}"/>${T('M35 17V6', BK, 3)}
      <rect x="4" y="19" width="28" height="10" rx="5" fill="{c}"/>${hi(7, 21, 22)}<path d="M4 24a5 5 0 0 0 5 5h3V19H9a5 5 0 0 0-5 5z" fill="${BK}"/>
      <path d="M16 22v4M20 22v4M24 22v4" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>`,
    cortapernos: `${T('M21 18 12 44', RD, 3.6)}${T('M27 18l9 26', RD, 3.6)}${T('M14.5 37 12 44M33.5 37l2.5 7', BK, 4)}
      <path d="M19 4c1-2 4-2 4 0l1 10h-5z" fill="${DK}"/><path d="M29 4c-1-2-4-2-4 0l-1 10h5z" fill="${DK}"/>
      <rect x="18" y="13" width="12" height="7" rx="1.5" fill="${MD}"/><circle cx="21" cy="16.5" r="1.2" fill="${DK}"/><circle cx="27" cy="16.5" r="1.2" fill="${DK}"/>`,
    generico: `${T('M18 15v-3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3', BK, 2.6)}<rect x="4" y="15" width="40" height="27" rx="3" fill="${BK}"/>
      ${hi(7, 17.5, 34)}<path d="M4 24h40" stroke="${K}" stroke-width="1.5"/><path d="M4 24h40" stroke="#4a4a4a" stroke-width="1"/>
      <rect x="9" y="21" width="6" height="7" rx="1" fill="${YE}"/><rect x="33" y="21" width="6" height="7" rx="1" fill="${YE}"/><path d="M8 36h32" stroke="#4a4a4a" stroke-width="1.2"/>`,
    ventilador: `${T('M10 38 15 29M34 38l-5-9', BK, 2.6)}${T('M4 41h32', BK, 2.6)}<circle cx="40" cy="40" r="4.5" fill="${BK}"/><circle cx="40" cy="40" r="1.6" fill="${MT}"/>
      <circle cx="22" cy="21" r="17" fill="{c}"/><circle cx="22" cy="21" r="13" fill="${DK}"/>
      <path d="M22 21c-1-6 1-10 5-11 2 4 0 8-5 11zM22 21c5-3 10-2 11 2-3 3-7 3-11-2zM22 21c3 5 2 10-2 11-3-3-2-7 2-11zM22 21c-5 3-10 2-11-2 3-3 7-3 11 2z" fill="${YE}"/>
      <circle cx="22" cy="21" r="13" stroke="${MD}" stroke-width=".8" stroke-dasharray="1 2"/><circle cx="22" cy="21" r="2.6" fill="${MT}"/><path d="M10 10a16 16 0 0 1 8-4" stroke="${HI}" stroke-width="2"/>`,
    extractor: `<rect x="23" y="19" width="19" height="12" fill="${MD}"/><path d="M26 19v12M29 19v12M32 19v12M35 19v12M38 19v12" stroke="${DK}" stroke-width="1.1"/>
      <rect x="41" y="16" width="5" height="18" rx="1.5" fill="${DK}"/><rect x="3" y="12" width="22" height="26" rx="3" fill="{c}"/>${hi(5, 14, 18)}
      <circle cx="14" cy="26" r="8" fill="${DK}"/><path d="M14 26l3-6M14 26l-6 1M14 26l3 6" stroke="${MT}" stroke-width="2.2"/><circle cx="14" cy="26" r="1.8" fill="${MT}"/>
      <path d="M6 38v4h5v-4M17 38v4h5v-4" fill="${BK}"/>`,
    mangote: `<circle cx="22" cy="24" r="18" fill="{c}"/><circle cx="22" cy="24" r="14.5" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/>
      <circle cx="22" cy="24" r="11" stroke="rgba(0,0,0,.4)" stroke-width="1.2"/><circle cx="22" cy="24" r="7.5" fill="${DK}"/><circle cx="22" cy="24" r="7.5" stroke="${K}"/>
      <path d="M10 14a15 15 0 0 1 9-5" stroke="${HI}" stroke-width="2"/><rect x="38" y="20" width="8" height="10" rx="1.5" fill="${MT}"/><path d="M40 20v10M43 20v10" stroke="${MD}" stroke-width="1"/>`,
    alargadera: `${T('M10 40 5 46M34 40l5 6', BK, 2.4)}${T('M22 5v5', BK, 2.4)}<circle cx="22" cy="25" r="17" fill="${DK}"/><circle cx="22" cy="25" r="13" fill="{c}"/>
      <circle cx="22" cy="25" r="10" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/><circle cx="22" cy="25" r="5.5" fill="${MT}"/><circle cx="22" cy="25" r="2" fill="${BK}"/>
      ${T('M35 31c6 1 7 5 7 9', '{c}', 2.4)}<rect x="37" y="39" width="10" height="7" rx="1.5" fill="${BK}"/><path d="M11 15a14 14 0 0 1 6-3" stroke="${HI}" stroke-width="1.8"/>`,
    puntal: `<rect x="13" y="2" width="22" height="4" rx="1" fill="${DK}"/><rect x="20.5" y="6" width="7" height="19" fill="${MT}"/>
      <circle cx="24" cy="10" r="1.2" fill="${K}"/><circle cx="24" cy="15" r="1.2" fill="${K}"/><circle cx="24" cy="20" r="1.2" fill="${K}"/>
      <rect x="18.5" y="27" width="11" height="15" fill="${MD}"/><path d="M21 29v11" stroke="${HI}" stroke-width="1.6"/>
      <rect x="17" y="22" width="14" height="6" rx="1.5" fill="${OR}"/><path d="M19 28l3-6M23 28l3-6M27 28l3-6" stroke="#b86b00" stroke-width="1"/>
      <path d="M11 24h26" stroke="${BK}" stroke-width="2.2"/><rect x="13" y="42" width="22" height="4" rx="1" fill="${DK}"/>`,
    puntal_hidraulico: `<rect x="14" y="2" width="20" height="4" rx="1" fill="${DK}"/><path d="M24 6v3" stroke="${K}" stroke-width="3"/><rect x="21" y="8" width="6" height="13" fill="${MT}"/>
      ${hi(22, 10, 1.6, 9)}<rect x="17" y="19" width="14" height="3.5" rx="1" fill="${BK}"/><rect x="18.5" y="22" width="11" height="19" rx="2" fill="{c}"/>${hi(20.5, 24, 2, 14)}
      <rect x="29" y="27" width="5" height="5" rx="1" fill="${MT}"/><rect x="13" y="41" width="22" height="5" rx="1" fill="${DK}"/>`,
    toldo: `${T('M7 22v22M41 22v22', MD, 2)}<path d="M4 18 14 7h20l10 11z" fill="${GR}"/><path d="M14 18l5-11h5v11zM34 18l-5-11h-5" fill="${RD}"/>
      <path d="M4 18 14 7h20l10 11z"/><path d="M4 18h40v4H4z" fill="${GR}"/><path d="M14 18h10v4H14zM34 18h10v4H34z" fill="${RD}" stroke="none"/><path d="M4 18h40v4H4z"/>
      <path d="M2 44h44" stroke="${MD}" stroke-width="1.4"/>`,
    carpa: `<path d="M30 25h15v17H30z" fill="#56692f"/><path d="M18 9h21l6 16H30z" fill="#4a5b28"/><path d="M5 42V25L18 9l12 16v17z" fill="#6b7f3a"/>
      <path d="M12 42v-9a6 6 0 0 1 12 0v9z" fill="${DK}"/><path d="M18 33v9" stroke="#56692f" stroke-width="1"/><rect x="34" y="29" width="7" height="5" rx="1" fill="${DK}"/>
      <path d="M8 26l10-12" stroke="${HI}" stroke-width="1.6"/><path d="M2 42h44" stroke="${MD}" stroke-width="1.4"/>`,
    desbrozadora: `${T('M12 12 38 38', MT, 2)}${T('M13 27 27 13', BK, 2.4)}<circle cx="12.5" cy="27.5" r="2.4" fill="{c}"/><circle cx="27.5" cy="12.5" r="2.4" fill="{c}"/>
      <rect x="3" y="3" width="13" height="10" rx="3" fill="{c}" transform="rotate(45 9.5 8)"/><circle cx="7" cy="7" r="2" fill="#e9e9e6"/>
      <path d="M32 37a8 8 0 0 1 14 0z" fill="{c}"/><ellipse cx="40" cy="41" rx="7" ry="2.6" fill="${MT}"/><circle cx="39" cy="38.5" r="2.2" fill="${DK}"/>`,
    garrafa: `<rect x="15" y="3" width="18" height="6" rx="1.5" stroke="${BK}" stroke-width="2.2"/><path d="M21 3v6M27 3v6" stroke="${BK}" stroke-width="1.6"/>
      <path d="M13 8h22l4 4v30a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V12z" fill="{c}"/><path d="M15 17l18 20M33 17 15 37" stroke="rgba(0,0,0,.25)" stroke-width="2.2"/>
      <rect x="15" y="17" width="18" height="20" rx="1" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/><path d="M12 13v26" stroke="${HI}" stroke-width="1.8"/>
      <rect x="7" y="6" width="6" height="5" rx="1" fill="${MD}" transform="rotate(-35 10 8.5)"/>`,
    agua: `${T('M16 9V6h16v3', '#2a6fb3', 2)}<rect x="9" y="9" width="30" height="35" rx="5" fill="#4a9be0"/><rect x="9" y="9" width="30" height="35" rx="5" fill="rgba(255,255,255,.18)" stroke="none"/>
      <path d="M9 18h30M9 35h30" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/><rect x="31" y="4" width="6" height="5" rx="1" fill="#e9e9e6"/>
      <path d="M24 20c4 5 5.5 7.5 5.5 9.5a5.5 5.5 0 0 1-11 0c0-2 1.5-4.5 5.5-9.5z" fill="#fff"/><path d="M12 12v28" stroke="${HI}" stroke-width="2"/>`,
    aceite: `<rect x="18" y="6" width="9" height="7" rx="1.5" fill="${BK}"/><path d="M15 13h15l5 7v22a2 2 0 0 1-2 2H15a2 2 0 0 1-2-2V15z" fill="{c}"/>
      ${T('M30 15c5 0 7 3 7 7v6', '{c}', 2.4)}<rect x="16" y="24" width="15" height="13" rx="1" fill="${BK}"/>
      <path d="M23.5 26.5c3 3.5 4 5.5 4 7a4 4 0 0 1-8 0c0-1.5 1-3.5 4-7z" fill="${OR}"/><path d="M15.5 16v24" stroke="${HI}" stroke-width="1.8"/>`,
    camilla: `<rect x="2" y="13" width="44" height="22" rx="9" fill="${OR}"/><rect x="6" y="16.5" width="36" height="15" rx="6.5" fill="#d9661a"/>
      <path d="M9 19.5h30" stroke="${HI}" stroke-width="1.4"/><path d="M15 13v22M24 13v22M33 13v22" stroke="${BK}" stroke-width="2.4"/>
      <rect x="13" y="22" width="4" height="4" rx=".8" fill="${MT}"/><rect x="22" y="22" width="4" height="4" rx=".8" fill="${MT}"/><rect x="31" y="22" width="4" height="4" rx=".8" fill="${MT}"/>
      <path d="M5 15.5h2M10 14h2M36 14h2M41 15.5h2M5 32.5h2M10 34h2M36 34h2M41 32.5h2" stroke="${BK}" stroke-width="1.4"/>`,
    tripode: `${T('M24 8v36', MD, 2.4)}${T('M22 8 6 44', MT, 2.6)}${T('M26 8l16 36', MT, 2.6)}<path d="M4 44h5M39 44h5" stroke="${BK}" stroke-width="3"/>
      <path d="M24 9v24" stroke="${RD}" stroke-width="1.8"/><path d="M24 33v3a2 2 0 1 0 2 2" stroke="${MD}" stroke-width="1.8"/>
      <rect x="18" y="3" width="12" height="7" rx="2" fill="${DK}"/><circle cx="24" cy="6.5" r="1.8" fill="${MT}"/><circle cx="13" cy="27" r="3.4" fill="${OR}"/><circle cx="13" cy="27" r="1.2" fill="${BK}"/>`,
    caja_metal: `${T('M18 13v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2', BK, 2.4)}<rect x="4" y="13" width="40" height="29" rx="2" fill="${MT}"/>${hi(6, 15, 36)}
      <path d="M4 19h40M4 26h40M4 36h40" stroke="${MD}" stroke-width="1.4"/><rect x="9" y="16" width="5" height="7" rx="1" fill="${DK}"/><rect x="34" y="16" width="5" height="7" rx="1" fill="${DK}"/>`,
    caja_carpintero: `<rect x="14" y="13" width="12" height="5" rx="1" fill="${DK}"/>${T('M24 18V10', '#8a5a2b', 2.4)}<path d="M30 20l8-10 3 2-6 9z" fill="${MT}"/>
      <path d="M6 24 10 8h3l3 16M42 24 38 8h-3l-3 16" fill="#c0843f"/>${T('M11 10h26', '#8a5a2b', 2.4)}
      <path d="M4 22h40l-2 20H6z" fill="${WD}"/><path d="M7 29h34M8 36h32" stroke="#a8722f" stroke-width="1.1"/><path d="M6 25h36" stroke="${HI}" stroke-width="1.6"/>`,
    mascara: `<path d="M10 14c0-6 6-10 14-10s14 4 14 10v18c0 8-6 13-14 13S10 40 10 32z" fill="${DK}"/><path d="M13 12c1-4 5-6 9-6" stroke="${HI}" stroke-width="1.8"/>
      <rect x="15" y="16" width="18" height="11" rx="2" fill="#2f6e4a"/><path d="M17 18l5 7" stroke="rgba(255,255,255,.5)" stroke-width="1.6"/>
      <path d="M17 33h14M18 37h12" stroke="${BK}" stroke-width="1.4"/><circle cx="8" cy="21" r="3" fill="${MD}"/><circle cx="40" cy="21" r="3" fill="${MD}"/>`,
    multiusos: `${T('M12 38 36 10', MT, 3.4)}${T('M17 32l5-6', BK, 4)}${T('M29 4 44 19', MD, 3)}<path d="M44 19l3 4-5-1z" fill="${MD}"/>
      <path d="M14 35 6 39 3 45l5-2 2 3 6-8z" fill="${DK}"/><path d="M7 41l3 2" stroke="${MT}" stroke-width="1"/>`,
    detector: `<rect x="20" y="2" width="8" height="5" rx="1" fill="${DK}"/><rect x="12" y="6" width="24" height="37" rx="5" fill="${YE}"/>${hi(14, 8, 2, 31)}
      <rect x="15" y="10" width="18" height="27" rx="2" fill="${BK}"/><rect x="17" y="12.5" width="14" height="9" rx="1" fill="#a9d18e"/>
      <path d="M19 15.5h6M19 18.5h9" stroke="${DK}" stroke-width="1.2"/><circle cx="19" cy="28" r="2" fill="${MT}"/><circle cx="29" cy="28" r="2" fill="${MT}"/>
      <path d="M20 33h8" stroke="${MD}" stroke-width="1.2"/><circle cx="24" cy="40" r="1.4" fill="${RD}"/>`,
    foco: `<path d="M22 13h4v18h-4z" fill="${BK}"/><path d="M23 15v14" stroke="${MD}" stroke-width="1"/>
      <rect x="9" y="3" width="30" height="11" rx="2.5" fill="${YE}"/><rect x="12" y="5.5" width="24" height="6" rx="1" fill="#fff7cc"/>
      <path d="M16 5.5v6M20 5.5v6M24 5.5v6M28 5.5v6M32 5.5v6" stroke="#e8d27a" stroke-width="1"/>
      <rect x="7" y="29" width="34" height="15" rx="3" fill="${YE}"/><path d="M9 32h30" stroke="${HI}" stroke-width="1.6"/>
      <rect x="17" y="34" width="14" height="5" rx="1" fill="${BK}"/><path d="M10 44v2h6v-2M32 44v2h6v-2" fill="${BK}"/>`,
    linterna: `<path d="M41 18l6-5v24l-6-5z" fill="rgba(246,196,0,.35)" stroke="none"/>${T('M10 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5', BK, 2.6)}
      <rect x="5" y="17" width="30" height="19" rx="3" fill="{c}"/>${hi(7, 19, 26)}<rect x="9" y="25" width="10" height="3" rx="1" fill="${YE}"/>
      <path d="M33 14h6a2 2 0 0 1 2 2v22a2 2 0 0 1-2 2h-6z" fill="${DK}"/><rect x="39" y="16" width="3" height="22" rx="1" fill="#fff6c2"/>
      <path d="M7 36v4h6v-4M27 36v4h6v-4" fill="${BK}"/>`,
    ingletadora: `<rect x="3" y="38" width="42" height="6" rx="1.5" fill="${DK}"/><rect x="8" y="33" width="32" height="5" fill="${MT}"/>
      ${T('M9 33 18 16', DK, 3)}<circle cx="27" cy="23" r="10" fill="${MT}"/><circle cx="27" cy="23" r="10" stroke="${K}" stroke-width="1.2" stroke-dasharray="2.2 1.6"/>
      <path d="M16 23a11 11 0 0 1 22 0z" fill="{c}"/><circle cx="27" cy="23" r="2.4" fill="${DK}"/><rect x="28" y="7" width="15" height="9" rx="3" fill="{c}"/>
      ${T('M38 7l4-4', BK, 2.6)}${hi(30, 9, 11)}`,
    caballete: `${T('M9 18 4 44M10 18l5 26M38 18l-5 26M39 18l5 26', MD, 2.4)}${T('M7 32h6M35 32h6', MD, 1.6)}
      <rect x="3" y="11" width="42" height="7" rx="1.5" fill="${YE}"/>${hi(5, 12.5, 38)}<path d="M2 44h5M13 44h5M30 44h5M41 44h5" stroke="${BK}" stroke-width="2.6"/>`,
    motor: `<rect x="4" y="12" width="40" height="28" rx="4" stroke="${BK}" stroke-width="3"/><rect x="8" y="14" width="15" height="8" rx="2.5" fill="{c}"/>
      <circle cx="12" cy="14.5" r="1.8" fill="${BK}"/><rect x="8" y="23" width="20" height="14" rx="2" fill="${MD}"/>
      <path d="M11 26h14M11 29h14M11 32h14" stroke="${DK}" stroke-width="1.1"/><circle cx="35" cy="22" r="6" fill="${DK}"/><circle cx="35" cy="22" r="2" fill="${RD}"/>
      <rect x="31" y="31" width="4" height="5" rx="1" fill="${OR}"/><rect x="37" y="31" width="4" height="5" rx="1" fill="#2e6fd6"/><path d="M6 40v4h6v-4M36 40v4h6v-4" fill="${BK}"/>`,
    generador: `<rect x="4" y="10" width="40" height="30" rx="4" stroke="${BK}" stroke-width="3"/><rect x="8" y="12" width="32" height="10" rx="3" fill="{c}"/>
      <path d="M10 14.5h20" stroke="${HI}" stroke-width="1.6"/><circle cx="35" cy="12.5" r="2.2" fill="${BK}"/><rect x="8" y="24" width="15" height="13" rx="2" fill="${MD}"/>
      <path d="M10 27h11M10 30h11M10 33h11" stroke="${DK}" stroke-width="1.1"/><rect x="25" y="24" width="15" height="13" rx="2" fill="${DK}"/>
      <rect x="27" y="26" width="11" height="9" rx="1" fill="${BK}"/><circle cx="30" cy="30.5" r="1.8" fill="${YE}"/><circle cx="35" cy="30.5" r="1.8" fill="${YE}"/>
      <path d="M6 40v4h6v-4M36 40v4h6v-4" fill="${BK}"/>`,
    escalera: `${T('M14 3v40M34 3v40', MT, 3.4)}${T('M14 9h20M14 16h20M14 23h20M14 30h20M14 37h20', MD, 2)}
      <path d="M10 43h8v3h-8zM30 43h8v3h-8z" fill="${BK}"/><path d="M12.8 5v36" stroke="${HI}" stroke-width="1"/>`,
    bobina: `<rect x="11" y="12" width="26" height="24" fill="${MT}"/><path d="M11 15l26 4M11 21l26 4M11 27l26 4M11 33l26 3" stroke="${MD}" stroke-width="1.2"/>
      <rect x="11" y="12" width="26" height="24"/><rect x="5" y="6" width="6" height="36" rx="2" fill="${WD}"/><rect x="37" y="6" width="6" height="36" rx="2" fill="${WD}"/>
      <circle cx="8" cy="24" r="1.6" fill="${BK}"/><circle cx="40" cy="24" r="1.6" fill="${BK}"/>${T('M30 12c0-5 6-7 10-5s5 5 2 6', MT, 1.4)}`,
    carretilla: `${T('M3 21 37 35', MD, 2.4)}${T('M16 27l-3 15M30 32l-2 10', MD, 2)}<path d="M2 19l5 2.5" stroke="${BK}" stroke-width="3.4"/>
      <path d="M7 12h34l-6 16H15z" fill="{c}"/><path d="M10 15h28" stroke="${HI}" stroke-width="1.8"/><circle cx="38" cy="38" r="6.5" fill="${BK}"/><circle cx="38" cy="38" r="2.4" fill="${MT}"/>`,
    madera: `<rect x="4" y="34" width="40" height="9" rx="1" fill="${WD}"/><path d="M8 37h14M26 40h14" stroke="#a8722f" stroke-width="1.1"/>
      <rect x="6" y="25" width="9" height="9" fill="#e8c088"/><rect x="33" y="25" width="9" height="9" fill="#e8c088"/><circle cx="10.5" cy="29.5" r="2" stroke="#a8722f" stroke-width="1"/>
      <circle cx="37.5" cy="29.5" r="2" stroke="#a8722f" stroke-width="1"/><rect x="4" y="16" width="40" height="9" rx="1" fill="${WD}"/><path d="M8 19h18M28 22h12" stroke="#a8722f" stroke-width="1.1"/>
      <rect x="6" y="7" width="9" height="9" fill="#e8c088"/><rect x="33" y="7" width="9" height="9" fill="#e8c088"/><circle cx="10.5" cy="11.5" r="2" stroke="#a8722f" stroke-width="1"/>
      <circle cx="37.5" cy="11.5" r="2" stroke="#a8722f" stroke-width="1"/>`,
    cuerda: `${T('M22 7a16 16 0 1 1-.1 0', '{c}', 6)}<circle cx="22" cy="23" r="16" stroke="${YE}" stroke-width="2" stroke-dasharray="1.5 3.5"/>
      ${T('M22 13a10 10 0 1 1-.1 0', '{c}', 4)}<circle cx="22" cy="23" r="10" stroke="${YE}" stroke-width="1.4" stroke-dasharray="1.5 3.5"/>
      ${T('M30 37c2 3 2 6 0 8', '{c}', 3)}<path d="M18 4v8M22 4v8M26 4v8" stroke="${K}" stroke-width="1.2"/>`,
    arnes: `${T('M17 18l7 6 7-6', BK, 3)}${T('M9 36a7 5 0 1 0 0 .1M39 36a7 5 0 1 1 0 .1', OR, 3.2)}
      <rect x="5" y="11" width="38" height="8" rx="3" fill="${BK}"/><path d="M8 15h32" stroke="${OR}" stroke-width="1.2" stroke-dasharray="2 2"/>
      <rect x="21" y="12" width="6" height="6" rx="1" fill="${MT}"/>${T('M24 27a3.5 3.5 0 1 0 0-.1', MT, 2)}${T('M24 30.5l-6 2M24 30.5l6 2', BK, 2)}
      <path d="M9 19v4M39 19v4" stroke="${BK}" stroke-width="1.8"/>`,
    era: `${T('M30 8h6v26', BK, 1.8)}<circle cx="38" cy="36" r="5" fill="#f2f2f2"/><path d="M38 36l2-3" stroke="${RD}" stroke-width="1.4"/>
      <rect x="12" y="10" width="20" height="35" rx="9" fill="${DK}"/><rect x="12" y="22" width="20" height="10" fill="${YE}"/><path d="M14 14v26" stroke="${HI}" stroke-width="2"/>
      <rect x="18" y="5" width="8" height="6" rx="1" fill="${MT}"/><rect x="14" y="2" width="16" height="4" rx="2" fill="${BK}"/><path d="M15 27h14" stroke="${BK}" stroke-width="1.2"/>`,
    mesa: `${T('M8 19v25M40 19v25', MD, 2.4)}${T('M8 31h32', MD, 1.6)}<rect x="2" y="13" width="44" height="6" rx="1.5" fill="#ecece8"/>${hi(4, 14, 40, 1.6)}
      <path d="M5 44h6M37 44h6" stroke="${BK}" stroke-width="2.6"/>`,
    silla: `${T('M12 4v40M36 4v40', MD, 2.4)}${T('M12 36h24', MD, 1.6)}<rect x="10" y="5" width="28" height="12" rx="2" fill="#2f5f9e"/>${hi(12, 7, 24)}
      <rect x="9" y="21" width="30" height="5" rx="1.5" fill="#2f5f9e"/><path d="M9 44h6M33 44h6" stroke="${BK}" stroke-width="2.6"/>`,
    cojin: `<rect x="3" y="7" width="36" height="34" rx="3" fill="${BK}"/><path d="M7 12h28M7 17h28M7 22h28M7 27h28M7 32h28M7 37h28" stroke="#3f3f3f" stroke-width="1.2"/>
      <circle cx="21" cy="24" r="8" fill="${BK}" stroke="${YE}" stroke-width="2"/><path d="M21 18v12M15 24h12" stroke="${YE}" stroke-width="1.6"/>
      <rect x="7" y="9" width="9" height="3" rx=".5" fill="${YE}" stroke="none"/><rect x="39" y="20" width="4" height="8" fill="${MT}"/><rect x="43" y="19" width="3" height="10" rx="1" fill="${YE}"/>`,
    pistola_clavos: `<path d="M30 33 8 25l-1 5 23 8z" fill="${DK}"/><path d="M10 27v3M14 28.5v3M18 30v3M22 31.5v3" stroke="${MD}" stroke-width="1"/>
      <rect x="6" y="11" width="25" height="8" rx="3" fill="${BK}"/><rect x="2" y="12" width="5" height="6" rx="1" fill="${MT}"/><path d="M19 19l2 6" stroke="${BK}" stroke-width="2.6"/>
      <rect x="28" y="5" width="13" height="30" rx="4" fill="{c}"/>${hi(30, 7, 2, 25)}<path d="M33 35h4v6h-4z" fill="${MT}"/><path d="M35 41v4" stroke="${K}" stroke-width="1.4"/>`,
    geofono: `${T('M10 22v-3a14 14 0 0 1 28 0v3', BK, 2.6)}<rect x="5" y="18" width="10" height="14" rx="4" fill="${BK}"/><rect x="33" y="18" width="10" height="14" rx="4" fill="${BK}"/>
      <rect x="7" y="20" width="3" height="10" rx="1.5" fill="${YE}" stroke="none"/><rect x="38" y="20" width="3" height="10" rx="1.5" fill="${YE}" stroke="none"/>
      ${T('M10 32c0 5 2 7 6 7', BK, 1.6)}<rect x="15" y="33" width="26" height="12" rx="2.5" fill="${YE}"/><rect x="18" y="35.5" width="12" height="7" rx="1" fill="#a9d18e"/>
      <path d="M20 40l2-2 2 2 2-3 2 2" stroke="${DK}" stroke-width="1"/><circle cx="35" cy="39" r="2.4" fill="${BK}"/>`,
    busqueda: `${T('M20 32 39 11', MT, 2.4)}${T('M17 35l5-5', BK, 3.4)}<rect x="36" y="3" width="10" height="8" rx="2" fill="${DK}" transform="rotate(-45 41 7)"/>
      <circle cx="43" cy="9" r="2.2" fill="${YE}"/><rect x="3" y="27" width="20" height="16" rx="2.5" fill="${BK}"/><rect x="5.5" y="29.5" width="15" height="11" rx="1" fill="#5aa0d8"/>
      <path d="M7 38l4-4 3 3 3-5 3 4" stroke="#fff" stroke-width="1.1"/>`,
    // Casco del equipo (fotos): rojo, franjas blancas fluorescentes, tira reflectante arriba, orejeras amarillas y frontal
    casco: `<path d="M5 32C5 17 14 8 26 8s19 9 19 22v2z" fill="{c}"/><path d="M4 31h41v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" fill="{c}"/>
      ${hi(11, 14, 9, 2)}<path d="M13 24c4-6 11-9 19-8" stroke="#eef3e8" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M21 9c8 0 15 3 19 9" stroke="${MT}" stroke-width="2.6" stroke-dasharray="2.2 1.2" stroke-linecap="butt"/>
      <path d="M6 33h16" stroke="#eef3e8" stroke-width="2.4"/><path d="M28 33h12" stroke="${MT}" stroke-width="2.2"/>
      ${T('M20 23l-5 7', MT, 1)}<ellipse cx="13" cy="33" rx="6" ry="8" fill="#d4f01e"/><path d="M17.5 27.5a6 8 0 0 1 0 11" stroke="${BK}" stroke-width="2.4"/>
      <rect x="39" y="23" width="7" height="7" rx="1.5" fill="${BK}"/><circle cx="44.5" cy="26.5" r="2.4" fill="${YE}"/><circle cx="44.5" cy="26.5" r="1" fill="#fff6c2"/>`,
    botiquin: `${T('M17 13v-3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3', BK, 2.6)}<rect x="4" y="13" width="40" height="30" rx="5" fill="${RD}"/>${hi(7, 15.5, 34)}
      <path d="M4 20h40" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/><path d="M21 22h6v6h6v6h-6v6h-6v-6h-6v-6h6z" fill="#fff"/>`,
    radio: `<rect x="16" y="2" width="4.5" height="12" rx="2.2" fill="${DK}"/><rect x="26" y="7" width="4" height="5" rx="1" fill="${DK}"/><rect x="21.5" y="8" width="4" height="4" rx="1" fill="${OR}"/>
      <rect x="13" y="11" width="22" height="33" rx="4" fill="${BK}"/>${hi(15, 13, 2, 27)}<rect x="16" y="14" width="16" height="9" rx="1" fill="#a9d18e"/>
      <path d="M18 17h7M18 20h10" stroke="${DK}" stroke-width="1.1"/><path d="M18 27h2M23 27h2M28 27h2M18 31h2M23 31h2M28 31h2M18 35h2M23 35h2M28 35h2" stroke="${MT}" stroke-width="2"/>
      <path d="M18 40h12" stroke="#4a4a4a" stroke-width="1.4"/>`,
    cinta: `<rect x="18" y="32" width="28" height="9" fill="#f7f7f5"/><path d="M22 32l-4 9h4l4-9zM30 32l-4 9h4l4-9zM38 32l-4 9h4l4-9z" fill="${RD}" stroke="none"/>
      <rect x="18" y="32" width="28" height="9"/><circle cx="18" cy="24" r="16" fill="${RD}"/><circle cx="18" cy="24" r="11" fill="#f7f7f5"/>
      <circle cx="18" cy="24" r="6" fill="${MD}"/><path d="M8 14a14 14 0 0 1 6-4" stroke="${HI}" stroke-width="2"/>`,
    cialumen: `<circle cx="24" cy="24" r="19" fill="rgba(124,217,87,.22)" stroke="none"/><rect x="19" y="5" width="10" height="34" rx="5" fill="#7cd957" transform="rotate(25 24 22)"/>
      <path d="M25 9l-9 20" stroke="rgba(255,255,255,.6)" stroke-width="2" transform="rotate(0)"/>
      <rect x="28" y="2" width="8" height="6" rx="2" fill="${BK}" transform="rotate(25 32 5)"/>${T('M33 2a3 3 0 1 1 3 3', MD, 1.2)}`,
    spray: `<path d="M34 7l6-3M35 11h7M34 15l6 3" stroke="#ff6a13" stroke-width="1.6" stroke-dasharray="1 2.2"/><rect x="20" y="5" width="9" height="6" rx="1.5" fill="${DK}"/>
      <path d="M29 7h4" stroke="${K}" stroke-width="2"/><path d="M15 15a9 5 0 0 1 18 0z" fill="${MT}"/><rect x="14" y="14" width="20" height="30" rx="3" fill="#ff6a13"/>
      <rect x="14" y="24" width="20" height="9" fill="#fff"/><path d="M17 28.5h14" stroke="#ff6a13" stroke-width="2"/><path d="M17 16v26" stroke="${HI}" stroke-width="1.8"/>`,
    tractel: `<path d="M20 19 33 5" stroke="${BK}" stroke-width="3.4"/><path d="M30 8l5-5" stroke="${RD}" stroke-width="4"/>
      <path d="M38 26h9" stroke="${MD}" stroke-width="2.6"/><path d="M39 26h8" stroke="${K}" stroke-width="2.6" stroke-dasharray="1 1.2" stroke-linecap="butt"/>
      <path d="M9 18h26a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4z" fill="${MT}"/><path d="M8 21h28" stroke="${HI}" stroke-width="1.8"/>
      <rect x="16" y="24" width="12" height="5" rx="1" fill="#1f5fa8"/><circle cx="20" cy="19" r="2.4" fill="${DK}"/>
      <path d="M5 26H2c-1.5 0-1.5 6 0 7l3 1" stroke="${MD}" stroke-width="2.4"/>`,
    polea: `${T('M12 26v20M36 26v20', RD, 3)}<path d="M24 3a6 6 0 0 1 6 6v4a14 14 0 1 1-12 0V9a6 6 0 0 1 6-6z" fill="{c}"/>
      <circle cx="24" cy="9" r="2.6" fill="${BK}"/><circle cx="24" cy="26" r="9" fill="${MT}"/><circle cx="24" cy="26" r="2.8" fill="${DK}"/><path d="M14 20a11 11 0 0 1 4-5" stroke="${HI}" stroke-width="1.8"/>`,
    cadena: `${T('M7 14h8a4 4 0 0 1 0 8H7a4 4 0 0 1 0-8z', MT, 2.4)}${T('M17 18h7', MD, 4.4)}${T('M23 14h8a4 4 0 0 1 0 8h-8a4 4 0 0 1 0-8z', MT, 2.4)}
      ${T('M33 18h6', MD, 4.4)}${T('M40 18v12a6 6 0 1 1-11 3', MT, 3)}<path d="M28 33l3-2" stroke="${K}" stroke-width="2"/><rect x="36" y="8" width="8" height="5" rx="1" fill="${YE}"/>
      ${T('M40 12v6', MD, 2.4)}`,
    palanca: `${T('M9 42 33 11', '{c}', 3.6)}${T('M33 11c2-5 8-7 11-3', '{c}', 3.6)}<path d="M41 9l3 2.5M43 6l2 3" stroke="${K}" stroke-width="1.2"/>
      <path d="M9 42l-4 3 1-5z" fill="${MD}"/>`,
    llave: `${T('M10 38 32 14', MT, 3.8)}<path d="M29.5 9.5A7.5 7.5 0 1 0 40 20l-3.5-1.5-2-2L36 13l-2-2z" fill="${MT}"/>
      <circle cx="9" cy="39" r="6" fill="${MT}"/><circle cx="9" cy="39" r="2.6" fill="${DK}"/>${T('M30 30l12 12', MT, 2)}<rect x="11" y="13" width="18" height="7" rx="3" fill="${RD}" transform="rotate(45 20 16.5)"/>
      ${T('M26 23l4 4', MT, 2)}`,
    bomba: `${T('M16 9V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3', BK, 2.4)}${T('M31 14h6a4 4 0 0 1 4 4v8', MT, 3)}<rect x="37" y="25" width="8" height="6" rx="1" fill="${MD}"/>
      <rect x="12" y="9" width="20" height="26" rx="4" fill="{c}"/>${hi(14, 11, 2, 22)}<path d="M16 16h12M16 20h12" stroke="rgba(0,0,0,.3)" stroke-width="1.2"/>
      <rect x="10" y="35" width="24" height="8" rx="2" fill="${DK}"/><path d="M14 37v4M18 37v4M22 37v4M26 37v4M30 37v4" stroke="${MD}" stroke-width="1.2"/>${T('M28 9c3-4 8-4 10-2', BK, 1.4)}`,
    bomba_manual: `${T('M14 30 40 10', BK, 3)}<path d="M38 9l5-3 2 3-5 3z" fill="${OR}"/><rect x="4" y="30" width="40" height="12" rx="2" fill="{c}"/>${hi(6, 32, 36)}
      <rect x="10" y="22" width="10" height="8" rx="1.5" fill="${DK}"/><circle cx="15" cy="28" r="2" fill="${MT}"/><rect x="34" y="34" width="10" height="4" rx="1" fill="${MT}"/>
      <path d="M8 42v3h6v-3M34 42v3h6v-3" fill="${BK}"/>`,
    disco: `<circle cx="24" cy="24" r="20" fill="${MT}"/><circle cx="24" cy="24" r="18.5" stroke="${DK}" stroke-width="3" stroke-dasharray="5.4 1.4" stroke-linecap="butt"/>
      <circle cx="24" cy="24" r="9" fill="${RD}"/><circle cx="24" cy="24" r="3" fill="#fff"/><path d="M12 14a15 15 0 0 1 7-5" stroke="${HI}" stroke-width="2"/>`,
    manguera: `${T('M22 8a16 16 0 1 1-.1 0', '{c}', 4)}${T('M22 13a11 11 0 1 1-.1 0', '{c}', 4)}${T('M22 18a6 6 0 1 1-.1 0', '{c}', 3.4)}
      ${T('M22 40h14', '{c}', 4)}<rect x="36" y="36" width="9" height="8" rx="1.5" fill="${MT}"/><path d="M39 36v8M42 36v8" stroke="${MD}" stroke-width="1"/>`,
    placas: `<rect x="3" y="12" width="24" height="30" rx="2" fill="${MD}"/><rect x="21" y="6" width="24" height="30" rx="2" fill="${MT}"/>${hi(23, 8, 20, 1.6)}
      <circle cx="26" cy="11" r="1.6" fill="${DK}"/><circle cx="40" cy="11" r="1.6" fill="${DK}"/><circle cx="26" cy="31" r="1.6" fill="${DK}"/><circle cx="40" cy="31" r="1.6" fill="${DK}"/>
      <circle cx="33" cy="21" r="4" fill="${DK}"/><circle cx="8" cy="38" r="1.6" fill="${DK}"/><circle cx="15" cy="27" r="3" fill="${DK}"/>`,
    epi: `<path d="M7 30a17 16 0 0 1 34 0z" fill="${OR}"/><path d="M5 29h38v4H5z" fill="${OR}"/><path d="M11 22a13 12 0 0 1 7-8" stroke="${HI}" stroke-width="2"/>
      <path d="M9 33h30v9a3 3 0 0 1-3 3H12a3 3 0 0 1-3-3z" fill="${DK}"/><path d="M14 33v12M19 33v12M24 33v12M29 33v12M34 33v12M9 37h30M9 41h30" stroke="${MD}" stroke-width=".9"/>
      <circle cx="7" cy="27" r="5" fill="${BK}"/><circle cx="41" cy="27" r="5" fill="${BK}"/><circle cx="7" cy="27" r="2.2" fill="${YE}"/><circle cx="41" cy="27" r="2.2" fill="${YE}"/>`
  };
})();
// Color por defecto de cada dibujo con {c}, y colores por marca o por el nombre del equipo (el primero que encaja)
const TOOL_COLOR = {
  motodisco: '#f37021', martillo: '#d6332a', taladro: '#d6332a', motosierra: '#f39200', sierra_circular: '#0f8a8f', sierra_sable: '#d6332a',
  radial: '#d6332a', ventilador: '#d6332a', extractor: '#f6c400', mangote: '#f6c400', alargadera: '#f39200', puntal_hidraulico: '#f39200',
  desbrozadora: '#f37021', garrafa: '#d6332a', aceite: '#f6c400', ingletadora: '#0f8a8f', motor: '#d6332a', generador: '#d6332a',
  carretilla: '#3f8f3f', cuerda: '#d6332a', linterna: '#262626', pistola_clavos: '#d6332a', casco: '#e2231a', polea: '#f39200',
  palanca: '#d6332a', bomba: '#1f5fa8', bomba_manual: '#f39200', manguera: '#d6332a'
};
const TOOL_TINT = [
  [/bosch/i, '#1f5fa8'], [/makita/i, '#0f8a8f'], [/hilti|w[uü]rth/i, '#d6332a'], [/stihl|husqvarna/i, '#f37021'],
  [/gasoil|di[eé]sel/i, '#262626'], [/mezcla/i, '#3f8f3f'], [/aceite (de cadena|hidr)/i, '#d6332a'],
  [/naranja/i, '#f39200'], [/azul/i, '#1f5fa8'], [/verde/i, '#3f8f3f'], [/amarill/i, '#f6c400'], [/roj/i, '#d6332a'], [/negr/i, '#262626']
];
const TOOL_MATCH = [
  [/cizalla/i, 'cizalla'], [/separador/i, 'separador'], [/combinad/i, 'combinada'], [/cilindro|gato|ram/i, 'cilindro'],
  [/bater|cargador/i, 'bateria'], [/motodisco|tronzadora|disco/i, 'motodisco'], [/martillo|demoledor/i, 'martillo'],
  [/taladro|perforador/i, 'taladro'], [/motosierra/i, 'motosierra'], [/circular/i, 'sierra_circular'],
  [/sable|sierra/i, 'sierra_sable'], [/radial|amoladora/i, 'radial'], [/cortapernos|cizalla manual/i, 'cortapernos']
];
// Del más concreto al más general: el primero que encaja con el nombre decide el dibujo
TOOL_MATCH.unshift(
  [/taladro/i, 'taladro'], [/motorradial|radial/i, 'radial'], [/pata de cabra|maneral|palanca/i, 'palanca'],
  [/ventilador/i, 'ventilador'], [/extractor/i, 'extractor'], [/mangote/i, 'mangote'], [/alargad/i, 'alargadera'],
  [/puntal(es)? hidr/i, 'puntal_hidraulico'], [/puntal/i, 'puntal'], [/toldo/i, 'toldo'], [/carpa/i, 'carpa'], [/desbrozadora/i, 'desbrozadora'],
  [/garrafa de agua/i, 'agua'], [/garrafa|bid[oó]n con|gasolina|gasoil|mezcla/i, 'garrafa'], [/aceite/i, 'aceite'], [/camilla/i, 'camilla'], [/tr[ií]pode/i, 'tripode'],
  [/carpinter/i, 'caja_carpintero'], [/epi\b/i, 'epi'], [/bidón de cuerdas|cuerda|eslinga|carrete|l[ií]nea|cable/i, 'cuerda'], [/arn[eé]s/i, 'arnes'],
  [/caja|bridas/i, 'caja_metal'], [/m[aá]scara/i, 'mascara'], [/multiusos|paratech|herramienta manual/i, 'multiusos'], [/detector/i, 'detector'],
  [/iluminaria|foco|grandes [aá]reas/i, 'foco'], [/linterna/i, 'linterna'], [/ingletadora/i, 'ingletadora'], [/caballete/i, 'caballete'],
  [/grupo (electr|rosen|takuma)/i, 'generador'], [/motor|grupo pu|grupo hidr/i, 'motor'], [/escalera/i, 'escalera'], [/bobina|alambre/i, 'bobina'],
  [/carretilla/i, 'carretilla'], [/zampeado|madera/i, 'madera'], [/botella|\bera\b/i, 'era'], [/mesa/i, 'mesa'], [/silla/i, 'silla'],
  [/coj[ií]n/i, 'cojin'], [/clavos/i, 'pistola_clavos'], [/ge[oó]fono/i, 'geofono'], [/b[uú]squeda/i, 'busqueda'], [/casco/i, 'casco'],
  [/botiqu[ií]n/i, 'botiquin'], [/tetra|transmisi|radio/i, 'radio'], [/cinta/i, 'cinta'], [/cial[uú]men/i, 'cialumen'], [/spray/i, 'spray'],
  [/tractel/i, 'tractel'], [/polea/i, 'polea'], [/cadena|perrillo|quitavueltas/i, 'cadena'], [/pata de cabra|maneral|palanca/i, 'palanca'],
  [/llave|destornillador|juego de herramientas|herramientas/i, 'llave'], [/bomba manual/i, 'bomba_manual'], [/bomba|electrobomba/i, 'bomba'], [/manguera/i, 'manguera'],
  [/placas/i, 'placas'], [/^discos?\b/i, 'disco'], [/espad[ií]n/i, 'motosierra']
);

function toolArt(name) {
  const key = (TOOL_MATCH.find(([re]) => re.test(name || '')) || [, 'generico'])[1];
  const tint = (TOOL_TINT.find(([re]) => re.test(name || '')) || [, TOOL_COLOR[key]])[1];
  return `<svg viewBox="0 0 48 48" fill="none" stroke="#1d1d1b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TOOL_ART[key].replaceAll('{c}', tint)}</svg>`;
}
const gearVisual = (g, size = '') => g.photo
  ? `<img class="${size ? 'photo' : 'thumb'}" src="${esc(g.photo)}" alt="Foto de ${esc(g.name)}" loading="lazy">`
  : `<div class="art ${size}">${toolArt(g.name)}</div>`;
