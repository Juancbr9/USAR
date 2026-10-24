'use strict';
// Vehículos: la flota son modelos (SsangYong, Amarok…). En cada actividad se añaden los que salen, repetidos si hace falta.
const vehName = id => get('vehicles', id)?.name || 'Vehículo';
const vkey = v => v.key || v.id;   // cada vehículo de una actividad tiene su clave (puede haber tres SsangYong)
// USAR 242 · Datos iniciales y almacén local

/* ==================== DATOS INICIALES ==================== */
const opId = i => 'OP-' + String(i + 1).padStart(2, '0');
const gear = (id, door, shelf, name, qty = '', func = '', vehicle = '') =>
  ({ id, door, shelf, name, qty, func, vehicle, serial: '', status: 'OPERATIVO', notes: '', service: '', photo: '', out: null, lastCheck: '' });

// Material del contenedor según las hojas pegadas en él: huecos B1–B20 y cajas H (lateral izquierdo) y U (lateral derecho).
// No va asignado a nadie: sale con el contenedor. door = número de hueco (0 = sin ubicar).
const gitem = (id, door, name, qty = 1, box = '', func = '', extra = {}) => ({ ...gear(id, door, 'A', name, +qty > 1 ? +qty : '', func), box, ...extra });
const BASE_BOXES = [
  ['H-2', 'Corte hormigón', 'amarillo', 5], ['H-3', 'Herramienta eléctrica', 'amarillo', 8], ['H-12', 'Señalización', 'amarillo', 7],
  ['H-13', 'Iluminación', 'amarillo', 8], ['H-30', 'Tractel T-13', 'negro', 5],
  ['U-1', 'Hycon (perforación)', 'negro', 15], ['U-2', 'Tractel T-35 con implementos', 'negro', 15], ['U-3', 'Herramienta eléctrica', 'negro', 17],
  ['U-4', 'Iluminación', 'negro', 17], ['U-5', 'Excarcelación', 'negro', 18], ['U-6', 'Excarcelación', 'negro', 18],
  ['U-7', 'Excarcelación · grupo hidráulico', 'negro', 14], ['U-8', 'Electrobomba', 'negro', 0]
].map(([code, name, color, door]) => ({ id: 'K-' + code.replace('-', ''), code, name, color, door, shelf: 'A', vehicle: '', model: '', heli: 'si', pos: 0, func: '' }));
// Contenido de cada caja: [código, [nombre, cantidad, función, extra]]
const BOX_CONTENT = {
  'H-2': [['Motorradial de hormigón'], ['Motosierra de hormigón'], ['Garrafa de aceite'], ['Discos', 2], ['Cadena'], ['Espadín'],
    ['Juego de herramientas', 1, '', { notes: 'Llave de bujía, destornillador plano, llave fija y llave Allen' }], ['Bomba de agua + manguera']],
  'H-3': [['Taladro Bosch'], ['Taladro de batería Hilti (cuerdas)'], ['Radial Würth'], ['Sierra sable Hilti']],
  'H-12': [['Rollos de cinta de balizar', 4], ['Cialúmenes', 10], ['Multiusos manual'], ['Carretes de vida', 2], ['Líneas de vida', 2], ['Sprays', 3], ['Herramienta manual Paratech'], ['Botiquín de sección', 1, 'Médico']],
  'H-13': [['Linternas grandes áreas + cargador', 2], ['Linterna Peli negra + cargador'], ['Alargaderas', 2]],
  'H-30': [['Tractel T-13'], ['Cable 20 m'], ['Maneral para Tractel'], ['Eslingas', 3], ['Polea'], ['Juego de cadenas de izado', 3], ['Perrillos de anclaje', 3], ['Quitavueltas', 3], ['Pata de cabra']],
  'U-1': [['Radial Hycon'], ['Martillo rompedor pesado Hycon'], ['Martillo rompedor espacios confinados']],
  'U-2': [['Tractel T-35'], ['Maneral'], ['Placas de anclaje', 2], ['Cable 5 m'], ['Cuerdas', 2]],
  'U-3': [['Circular Makita'], ['Circular Bosch'], ['Radial Bosch'], ['Motosierra eléctrica']],
  'U-4': [['Linternas Peli amarilla + cargador', 2]],
  'U-5': [['Separador hidráulico con acoples'], ['Separador manual']],
  'U-6': [['Cizalla hidráulica'], ['Gatos hidráulicos', 2], ['Bomba manual'], ['Cilindro con acoples y soportes'], ['Manguera hidráulica naranja fina'], ['Manguera hidráulica verde fina']],
  'U-7': [['Grupo PU-30'], ['Manguera hidráulica naranja'], ['Manguera hidráulica azul'], ['Llave']],
  'U-8': [['Bomba eléctrica RW 2015 2MA', 1, '', { serial: '40073' }], ['Manguera de 70 mm']]
};
const BOX_FUNC = { 'H-12': 'Seguridad', 'H-13': 'Logística', 'U-4': 'Logística', 'U-8': 'Logística' };
// Material suelto en cada hueco
const HUECO_CONTENT = {
  1: [['Ventilador eléctrico'], ['Ventilador de gasolina'], ['Extractor'], ['Mangotes', 2], ['Alargaderas de 25 m', 2], ['Alargaderas de 50 m', 2]],
  2: [['Puntales hidráulicos Holmatro'], ['Toldo verde y rojo']],
  3: [['Desbrozadora y atalaje'], ['Bidón con arnés'], ['Camilla Nest', 1, 'Médico'], ['Camilla nido', 1, 'Médico'], ['Bidón de cuerdas'], ['Trípode']],
  4: [['Cajas metálicas', 7], ['Cajas de carpintero', 3], ['Herramientas eléctricas en caja'], ['Máscara de soldadura']],
  7: [['Multiusos manual'], ['Detector de gases', 1, 'Seguridad']],
  9: [['Iluminarias (parque)', 4, 'Logística'], ['Mesa ingletadora'], ['Motosierra'], ['Caja EPI motosierra', 1, 'Seguridad']],
  10: [['Motor Hycon'], ['Caballetes de trabajo', 2], ['Ingletadora']],
  11: [['Garrafas de gasolina', 2, 'Logística', { dg: 'Combustible' }], ['Garrafa de gasoil', 1, 'Logística', { dg: 'Combustible' }], ['Garrafa de mezcla', 1, 'Logística', { dg: 'Combustible' }],
    ['Garrafa de agua', 1, 'Logística'], ['Aceite 2 tiempos', 1, 'Logística'], ['Aceite 4 tiempos', 1, 'Logística'], ['Aceite de cadena', 1, 'Logística'], ['Aceite hidráulico', 1, 'Logística']],
  12: [['Grupo electrógeno Rosenbauer', 1, 'Logística'], ['Grupo electrógeno Takuma', 1, 'Logística']],
  13: [['Escalera de 3 tramos'], ['Puntales metálicos grandes', 9], ['Puntales metálicos pequeños', 5]],
  14: [['Caja verde de bridas metálicas'], ['Manguera neumática roja'], ['Caja de señalización', 1, 'Seguridad'], ['Caja de cuñas'], ['Caja de eslingas']],
  19: [['Bobina de alambre'], ['Carretilla', 1, 'Logística'], ['Detector de gases', 1, 'Seguridad'], ['Escalera telescópica'], ['Escalera plegable']],
  20: [['Puntales hidráulicos Holmatro'], ['Zampeado'], ['Placas de madera']]
};
// Material de la lista anterior que no sale en las hojas: queda «sin ubicar» hasta que lo coloquéis
const UNPLACED = [['B-101', 'Cizalla Holmatro eléctrica'], ['B-102', 'Cizalla Holmatro manual'], ['B-105', 'Cojín Holmatro pequeño'], ['B-106', 'Cojín Holmatro mediano'],
  ['B-107', 'Cojín Holmatro grande'], ['B-204', 'Pistola de clavos'], ['B-401', 'Equipo de búsqueda técnica', 'Búsqueda'], ['B-402', 'Geófono', 'Búsqueda'],
  ['B-501', 'Arneses'], ['B-502', 'Material de cuerdas'], ['B-602', 'Casco para víctima', 'Médico'], ['B-701', 'Botellas ERA', 'Seguridad'],
  ['B-801', 'Carpa', 'Logística'], ['B-802', 'Mesas', 'Logística'], ['B-803', 'Sillas', 'Logística']];
const BASE_GEAR = [
  ...Object.entries(BOX_CONTENT).flatMap(([code, items]) => { const b = BASE_BOXES.find(x => x.code === code);
    return items.map(([name, qty, func, extra], n) => gitem(`G-${code.replace('-', '')}-${n + 1}`, b.door, name, qty, b.id, func || BOX_FUNC[code] || 'Rescate', extra)); }),
  ...Object.entries(HUECO_CONTENT).flatMap(([h, items]) => items.map(([name, qty, func, extra], n) => gitem(`G-B${h}-${n + 1}`, +h, name, qty, '', func || 'Rescate', extra))),
  ...UNPLACED.map(([id, name, func]) => gitem(id, 0, name, 1, '', func || 'Rescate')),
  gear('B-901', 0, 'A', 'Transmisiones (TETRA)', '', 'Comunicaciones'),
  gear('B-902', 0, 'A', 'Botiquín', 1, 'Médico')
];
// Base anterior (v2) que ya está en las hojas con otro nombre: se borra si nadie la había tocado
const V2_REPLACED = ['B-103', 'B-104', 'B-201', 'B-202', 'B-203', 'B-301', 'B-302', 'B-503', 'B-601', 'B-702', 'B-703', 'B-704'];
const OLD_BASE_IDS = ['G-101', 'G-102', 'G-103', 'G-104', 'G-105', 'G-201', 'G-202', 'G-203', 'G-301', 'G-302', 'G-303', 'G-401', 'G-402', 'G-403'];

function defaultData() {
  const ops = TEAM.map((name, i) => {
    const [cell, role] = PRESETS.estandar[1][i].split('|');
    return { id: opId(i), name, cell, role };
  });
  return {
    operators: ops,
    gear: BASE_GEAR.map(x => ({ ...x })),
    boxes: BASE_BOXES.map(x => ({ ...x })),
    // Cada persona: casco, protectores auditivos, mono, guantes, gafas, protección respiratoria y botas
    epis: ops.flatMap(o => Object.keys(EPI_TYPES).map(type => newEpi(type, o.id))),
    consumables: [
      { id: 'C-01', name: 'Discos de diamante (hormigón)', stock: 4, min: 2, unit: 'uds', location: 'Caja H-2' },
      { id: 'C-02', name: 'Discos de corte (hierro)', stock: 10, min: 5, unit: 'uds', location: 'Contenedor' },
      { id: 'C-03', name: 'Cadena de repuesto motosierra', stock: 2, min: 1, unit: 'uds', location: 'Contenedor' },
      { id: 'C-04', name: 'Hojas sierra sable madera', stock: 6, min: 3, unit: 'uds', location: 'Contenedor' },
      { id: 'C-05', name: 'Hojas sierra sable metal', stock: 6, min: 3, unit: 'uds', location: 'Contenedor' },
      { id: 'C-06', name: 'Gasolina mezcla 2T', stock: 10, min: 5, unit: 'L', location: 'Almacén' }
    ],
    vehicles: DEFAULT_VEHICLES,
    logs: [], inspections: [], missions: [], mlog: [],
    meta: [{ id: 'mission', value: 'estandar' }, { id: 'doors', value: DOOR_NAMES }, { id: 'gearbase', value: 3 }, { id: 'vehbase', value: 7 }]
  };
}

// Flota de la unidad (ids fijos para no duplicar entre móviles). Matrícula y plazas se completan en Vehículos.
const veh = (id, name, notes = '') => ({ id, name, plate: '', seats: '', notes });
const DEFAULT_VEHICLES = [
  veh('V-SANGYONG', 'SsangYong'),
  veh('V-VPI', 'VPI (contenedor USAR)', 'Lleva el contenedor USAR'),
  veh('V-AMAROK', 'Amarok'),
  veh('V-MOTO', 'Moto PM'),
  veh('V-AMB', 'Ambulancia'),
  veh('V-GUAGUA-P', 'Guagua pequeña'),
  veh('V-GUAGUA-G', 'Guagua grande'),
  veh('V-CUPRA', 'Cupra'),
  veh('V-AB-LCIF', 'Autobomba Renault (módulo LCIF)'),
  veh('V-AB-CONT', 'Autobomba Renault (contenedor pequeño)'),
  veh('V-AB-CONT2', 'Autobomba Renault (contenedor pequeño 2)'),
  veh('V-AB', 'Autobomba'),
  veh('V-ATB-M1', 'ATB Iveco M1'),
  veh('V-ATB-M2', 'ATB Iveco M2'),
  veh('V-CAM-ROJO', 'Camión rojo'),
  veh('V-CAM-VERDE', 'Camión verde'),
  veh('V-GRUA', 'Grúa'),
  veh('V-MINI', 'Minimáquina')
];
const OLD_VEHICLES = { 'V-1': ['Camión portacontenedor', 'V-VPI'], 'V-2': ['Furgón de rescate', ''], 'V-3': ['Vehículo de mando', ''] };

function newEpi(type, holder) {
  return { id: `EPI-${holder}-${type}`, type, name: EPI_TYPES[type], size: EPI_SIZED.includes(type) ? '' : 'Universal', status: 'OK', expires: '', holder };
}

// Adapta copias de seguridad de versiones anteriores
function normalize(data) {
  const base = defaultData();
  return {
    ...base, ...data,
    gear: (data.gear || []).map(g => ({ service: '', photo: '', out: null, lastCheck: '', serial: '', ...g })),
    epis: (data.epis || []).map(e => ({ type: 'otro', status: 'OK', expires: '', size: '', ...e })),
    logs: (data.logs || []).map((l, i) => ({ id: l.id || 'L-OLD-' + i, ts: l.ts || Date.now() - i * 1000, operator: l.operator, action: l.action })),
    meta: data.meta || base.meta
  };
}

/* ---------- Datos que llegan de fuera (nube o copia de seguridad) ----------
   Los identificadores y referencias acaban dentro de onclick="...('id')", y los números se pintan tal cual:
   se aceptan solo con forma segura. Así una fila manipulada en la nube no puede ejecutar código en los móviles. */
const SAFE_ID = /^[\w.:@-]{1,120}$/;
const REF_KEYS = new Set(['id', 'box', 'mission', 'worksite', 'op', 'holder', 'chief', 'leader', 'driver', 'vehicle', 'owner', 'ws', 'key', 'loan']);
const REF_LISTS = new Set(['members', 'crew', 'people', 'gear', 'extra', 'who', 'boxes', 'trips', 'imgs', 'photos']);
const NUM_KEYS = new Set(['n', 'num', 'qty', 'stock', 'min', 'weight', 'seats', 'tare', 'pos', 'len', 'wid', 'hei', 'volume', 'door', 'phase', 'priority', 'bar', 'litres', 'floors', 'basements', 'payload', 'kg', 'cap']);
function cleanValue(k, v) {
  if (v === null || v === undefined) return v;
  if (REF_KEYS.has(k) && typeof v !== 'object') return SAFE_ID.test(String(v)) || v === '' ? v : '';
  if (NUM_KEYS.has(k) && typeof v !== 'object') return v === '' || Number.isFinite(+v) ? v : '';
  if (Array.isArray(v)) {
    if (REF_LISTS.has(k)) return v.filter(x => typeof x === 'object' ? x && true : SAFE_ID.test(String(x))).map(x => typeof x === 'object' ? cleanObj(x) : x);
    return v.map(x => (x && typeof x === 'object' ? cleanObj(x) : x)).filter(x => !(x && typeof x === 'object' && x.id !== undefined && !SAFE_ID.test(String(x.id))));
  }
  if (typeof v === 'object') return cleanObj(v);
  return v;
}
function cleanObj(o) { return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, cleanValue(k, v)])); }
// Devuelve el registro limpio, o null si su identificador no es válido
const cleanRec = r => (r && SAFE_ID.test(String(r.id)) ? cleanObj(r) : null);

function toDb(data) {
  const db = Object.fromEntries(KINDS.map(k => [k, {}]));
  const t = Date.now();
  for (const kind of KINDS) (data[kind] || []).map(cleanRec).filter(Boolean).forEach(r => { db[kind][r.id] = { ...r, _u: t }; });
  return db;
}

/* ==================== ALMACÉN LOCAL ==================== */
function loadDb() {
  const saved = readJSON(KEY.db);
  if (saved) {
    KINDS.forEach(k => { saved[k] ||= {}; });
    return saved;
  }
  return toDb(defaultData());
}

let db = loadDb();
const prefs = { activeOperator: TEAM[0], door: 1, tab: 'avisos', draft: null, guide: true, mission: null, ...readJSON(KEY.prefs) };

const list = kind => Object.values(db[kind]).filter(r => !r._del);
const get = (kind, id) => { const r = db[kind][id]; return r && !r._del ? r : null; };
// Personal en activo (los dados de baja se conservan para el historial, pero no salen en listas ni operaciones nuevas)
const allOperators = () => list('operators').sort((a, b) => a.id.localeCompare(b.id));
const operators = () => allOperators().filter(o => o.active !== false);
const opName = id => get('operators', id)?.name || 'Reserva almacén';
const mission = () => get('meta', 'mission')?.value || 'estandar';
// Huecos del contenedor (ver HUECOS en config.js); 0 = sin ubicar
const DOOR_IDS = HUECOS.map(h => h.id).sort((a, b) => a - b);
const inCont = d => !d || d <= 20;                       // hueco del contenedor o sin ubicar
const placeRec = id => PLACES.find(p => p.id === id);
const doorName = id => HUECOS.find(h => h.id === id)?.label || placeRec(id)?.short || placeRec(id)?.label || (id ? 'B' + id : 'Sin ubicar');
const sideName = id => id <= 10 ? 'lateral izquierdo' : id <= 20 ? 'lateral derecho' : '';
// Dónde está un equipo o una caja: contenedor (hueco), pasillo 3, armarios, otros o sin ubicar
const placeOf = g => g.vehicle ? vehName(g.vehicle) : !g.door ? 'Sin ubicar' : g.door <= 20 ? `${doorName(g.door)} · ${sideName(g.door)}`
  : g.door === OTROS && g.where ? `Otros · ${g.where}` : placeRec(g.door)?.label || doorName(g.door);
const placeShort = g => g.vehicle ? vehName(g.vehicle) : g.door ? (g.door === OTROS && g.where ? g.where : doorName(g.door)) : 'Sin ubicar';
const groupKey = g => g.vehicle || g.door;
// Material de una operación: el contenedor completo (si sale), lo elegido a mano y lo que va en sus vehículos
function missionGearIds(m) {
  const ids = new Set(m.gear || []), all = list('gear');
  if (m.container) all.filter(g => !g.vehicle && inCont(g.door)).forEach(g => ids.add(g.id));
  // Lo que se carga en cada vehículo de la actividad (una caja lleva todo lo de dentro)
  (m.vehicles || []).forEach(v => (v.gear || []).forEach(id => get('boxes', id) ? boxItems(id).forEach(g => ids.add(g.id)) : ids.add(id)));
  return [...ids].filter(id => get('gear', id));
}
const missionGear = m => missionGearIds(m).map(id => get('gear', id));
const qtyText = g => +g.qty > 1 ? ` ×${g.qty}` : '';
// Grupos de material en orden: huecos B1–B20, lo sin ubicar y después los vehículos que llevan material
function gearGroups(items = list('gear')) {
  const doors = [...DOOR_IDS, 0, ...PLACES.map(p => p.id)].map(d => [d, placeOf({ door: d }), items.filter(g => !g.vehicle && (g.door || 0) === d)]);
  const vs = [...new Set(items.filter(g => g.vehicle).map(g => g.vehicle))].map(v => [v, vehName(v), items.filter(g => g.vehicle === v)]);
  return [...doors, ...vs].filter(([, , gs]) => gs.length).map(([k, l, gs]) => [k, l, gs.sort((a, b) => (a.box || '').localeCompare(b.box || '') || byName(a, b))]);
}
const epiLabel = e => EPI_TYPES[e.type] || e.name || 'EPI';

function stamp(kind, rec) { rec._u = Date.now(); db[kind][rec.id] = rec; Sync.queue(kind, rec); }
function addLog(action) { stamp('logs', { id: uid('L'), ts: Date.now(), operator: prefs.activeOperator, action }); }
function put(kind, rec, msg) { stamp(kind, rec); if (msg) addLog(msg); commit(); }
function putMany(kind, recs, msg) { recs.forEach(r => stamp(kind, r)); if (msg) addLog(msg); commit(); }
function remove(kind, id, msg) { stamp(kind, { id, _del: true }); if (msg) addLog(msg); commit(); }

function persist() {
  const logs = Object.values(db.logs);
  if (logs.length > 400) logs.sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(300).forEach(l => delete db.logs[l.id]);
  writeJSON(KEY.db, db);
}
// Añade los vehículos y plantillas de serie si no hay ninguno (sus ids son fijos, así no se duplican entre móviles)
function seedDefaults(share = false) {
  [['vehicles', DEFAULT_VEHICLES], ['templates', DEFAULT_TEMPLATES]].forEach(([kind, items]) => {
    // Vehículos: solo si no hay ninguno. Plantillas de serie: se añaden las nuevas (las borradas no vuelven)
    if (kind === 'vehicles' && list(kind).length) return;
    items.filter(r => !db[kind][r.id]).forEach(r => { const rec = { ...r, _u: Date.now() }; db[kind][r.id] = rec; if (share) Sync.queue(kind, rec); });
  });
  // Base de material v2: el material real del contenedor (sustituye al de ejemplo si no se había tocado)
  if (!(get('meta', 'gearbase')?.value >= 2)) {
    const stampIt = (kind, rec) => { rec = { ...rec, _u: Date.now() }; db[kind][rec.id] = rec; if (share) Sync.queue(kind, rec); };
    OLD_BASE_IDS.forEach(id => { const g = get('gear', id); if (g && !g.serial && !g.photo && !g.out && !g.notes) stampIt('gear', { id, _del: true }); });
    BASE_GEAR.forEach(g => { if (!db.gear[g.id]) stampIt('gear', { ...g }); });
    const doors = get('meta', 'doors')?.value;
    if (!doors || doors.every((d, i) => d === OLD_DOOR_NAMES[i])) stampIt('meta', { id: 'doors', value: DOOR_NAMES });
    DEFAULT_TEMPLATES.filter(t => get('templates', t.id)).forEach(t => stampIt('templates', { ...t }));
    stampIt('meta', { id: 'gearbase', value: 2 });
  }
  // Base de material v3: huecos y cajas reales del contenedor (hojas B1–B20, cajas H y U)
  if (get('meta', 'gearbase')?.value !== 3) {
    const stampIt = (kind, rec) => { rec = { ...rec, _u: Date.now() }; db[kind][rec.id] = rec; if (share) Sync.queue(kind, rec); };
    const untouched = g => !g.serial && !g.photo && !g.out && !g.notes && !g.box;
    V2_REPLACED.forEach(id => { const g = get('gear', id); if (g && untouched(g) && true) stampIt('gear', { id, _del: true }); });
    const baseIds = new Set([...BASE_GEAR.map(g => g.id), ...BASE_BOXES.map(b => b.id)]);
    // Lo que estaba colocado con el esquema anterior (puertas P1–P8) pasa a «sin ubicar» para recolocarlo
    list('boxes').filter(b => !baseIds.has(b.id) && !b.vehicle).forEach(b => stampIt('boxes', { ...b, door: 0, shelf: 'A' }));
    list('gear').filter(g => !baseIds.has(g.id) && !g.vehicle).forEach(g => stampIt('gear', { ...g, door: 0, shelf: 'A' }));
    UNPLACED.forEach(([id]) => { const g = get('gear', id); if (g && !g.vehicle) stampIt('gear', { ...g, door: 0, shelf: 'A' }); });
    BASE_BOXES.forEach(b => { if (!db.boxes[b.id] && !list('boxes').some(x => x.code === b.code)) stampIt('boxes', { ...b }); });
    BASE_GEAR.forEach(g => { if (!db.gear[g.id]) stampIt('gear', { ...g }); });
    stampIt('meta', { id: 'gearbase', value: 3 });
  }
  // Flota v2: los vehículos reales de la unidad sustituyen a los tres de ejemplo (si no se habían cambiado)
  if (!(get('meta', 'vehbase')?.value >= 2)) {
    const stampIt = (kind, rec) => { rec = { ...rec, _u: Date.now() }; db[kind][rec.id] = rec; if (share) Sync.queue(kind, rec); };
    Object.entries(OLD_VEHICLES).forEach(([id, [name, to]]) => {
      const v = get('vehicles', id); if (!v || v.name !== name || v.plate) return;
      [...list('gear'), ...list('boxes')].filter(x => x.vehicle === id).forEach(x => stampIt(x.code ? 'boxes' : 'gear', { ...x, vehicle: to, door: to ? 0 : 1, shelf: x.shelf || 'C' }));
      stampIt('vehicles', { id, _del: true });
    });
    DEFAULT_VEHICLES.forEach(v => { if (!db.vehicles[v.id]) stampIt('vehicles', { ...v }); });
    DEFAULT_TEMPLATES.filter(t => get('templates', t.id)).forEach(t => stampIt('templates', { ...t }));
  }
  // v3: las TETRA y el botiquín van «con el jefe» (su vehículo cambia en cada salida), no fijos en el SsangYong
  if (!(get('meta', 'vehbase')?.value >= 3)) {
    const stampIt = (kind, rec) => { rec = { ...rec, _u: Date.now() }; db[kind][rec.id] = rec; if (share) Sync.queue(kind, rec); };
    ['B-901', 'B-902'].forEach(id => { const g = get('gear', id); if (g && g.vehicle === 'V-SANGYONG') stampIt('gear', { ...g, vehicle: '', door: 0 }); });
    const sy = get('vehicles', 'V-SANGYONG');
    if (sy && /vehículo del jefe/i.test(sy.notes || '')) stampIt('vehicles', { ...sy, notes: '' });
    stampIt('meta', { id: 'vehbase', value: 3 });
  }
  // v4: el material ya no se guarda en vehículos (ni «con el jefe»): pasa a «sin ubicar». Se carga en cada actividad.
  if (!(get('meta', 'vehbase')?.value >= 4)) {
    const stampIt = (kind, rec) => { rec = { ...rec, _u: Date.now() }; db[kind][rec.id] = rec; if (share) Sync.queue(kind, rec); };
    list('boxes').filter(b => b.vehicle).forEach(b => stampIt('boxes', { ...b, vehicle: '', door: 0 }));
    list('gear').filter(g => g.vehicle).forEach(g => stampIt('gear', { ...g, vehicle: '', door: get('boxes', g.box) ? get('boxes', g.box).door : 0 }));
    list('vehicles').filter(v => /vehículo del jefe/i.test(v.notes || '')).forEach(v => stampIt('vehicles', { ...v, notes: '' }));
    stampIt('meta', { id: 'vehbase', value: 4 });
  }
  // v5: autobombas todoterreno Iveco M1 y M2. Solo se añaden si faltan: los vehículos ya editados no se tocan
  if (!(get('meta', 'vehbase')?.value >= 5)) {
    const stampIt = (kind, rec) => { rec = { ...rec, _u: Date.now() }; db[kind][rec.id] = rec; if (share) Sync.queue(kind, rec); };
    DEFAULT_VEHICLES.filter(v => ['V-ATB-M1', 'V-ATB-M2'].includes(v.id) && !db.vehicles[v.id]).forEach(v => stampIt('vehicles', { ...v }));
    stampIt('meta', { id: 'vehbase', value: 5 });
  }
  // v6: segundo modelo de autobomba Renault de contenedor pequeño (contenedor largo, hasta la cabina). Solo si falta
  if (!(get('meta', 'vehbase')?.value >= 6)) {
    const stampIt = (kind, rec) => { rec = { ...rec, _u: Date.now() }; db[kind][rec.id] = rec; if (share) Sync.queue(kind, rec); };
    DEFAULT_VEHICLES.filter(v => v.id === 'V-AB-CONT2' && !db.vehicles[v.id]).forEach(v => stampIt('vehicles', { ...v }));
    stampIt('meta', { id: 'vehbase', value: 6 });
  }
  // v7: SsangYong se escribe con dos S (solo se corrige esa palabra; el resto del nombre editado se respeta)
  if (!(get('meta', 'vehbase')?.value >= 7)) {
    const stampIt = (kind, rec) => { rec = { ...rec, _u: Date.now() }; db[kind][rec.id] = rec; if (share) Sync.queue(kind, rec); };
    list('vehicles').filter(v => /\bsang ?yong\b/i.test(v.name || '')).forEach(v => stampIt('vehicles', { ...v, name: v.name.replace(/\bsang ?yong\b/gi, 'SsangYong') }));
    stampIt('meta', { id: 'vehbase', value: 7 });
  }
  // «Bulto / caja» escrito a mano en versiones anteriores → caja de verdad (id fijo por código para no duplicar entre móviles)
  list('gear').filter(g => g.box && !db.boxes[g.box]).forEach(g => {
    const code = String(g.box).trim(), bid = 'K-' + code.toUpperCase().replace(/[^A-Z0-9]+/g, '');
    if (!db.boxes[bid]) { const b = { id: bid, code, name: g.func || 'Material', model: '', color: 'negro', heli: 'si', door: g.door, shelf: g.shelf, vehicle: g.vehicle || '', pos: 0, _u: Date.now() }; db.boxes[bid] = b; if (share) Sync.queue('boxes', b); }
    const rec = { ...g, box: bid, _u: Date.now() }; db.gear[g.id] = rec; if (share) Sync.queue('gear', rec);
  });
  // Nombres con Ñ que en versiones anteriores se guardaron con L
  const FIX = { IBALEZ: 'IBAÑEZ', NULEZ: 'NUÑEZ' };
  list('operators').filter(o => FIX[o.name]).forEach(o => {
    if (prefs.activeOperator === o.name) prefs.activeOperator = FIX[o.name];
    const rec = { ...o, name: FIX[o.name], _u: Date.now() }; db.operators[o.id] = rec; if (share) Sync.queue('operators', rec);
  });
  // Contraseñas del equipo (23/10/2026): solo la huella PBKDF2, nunca la contraseña. Se fechan al final de ese día para que
  // una contraseña cambiada después en cualquier móvil gane al sincronizar. FERNANDEZ crea la suya al entrar.
  if (get('meta', 'pinbase')?.value !== 1) {
    const PIN_TS = Date.UTC(2026, 9, 23, 23, 59), PINS = {
    'GRANADOS': {"s": "btFClOm2fJ6FMw72Pe4EJg==", "h": "ZLFehR+S3PfszytSbcYJtoOd5uRa2ksFGH1BlbdaLQQ=", "i": 150000},
    'DORTA': {"s": "c0xS6X6mEUj1LcZO6s471Q==", "h": "qvIBX2pjzcpH2+asZta8N3qoj2AF+fgmj5xeznZwFF4=", "i": 150000},
    'CABRERA': {"s": "zdYvrY2F5f2UsTa8HblMaA==", "h": "l88uypZ9ZO11m/F0sm+bigwIf5iUOleE0JdWRItZEo8=", "i": 150000},
    'IBAÑEZ': {"s": "24rQkyGl7j+AmpcwHGnDGA==", "h": "g9Nr8NuL8fZac3JtkgXcblcXNaxXIk0VP9NpseeUXYE=", "i": 150000},
    'AGUIAR': {"s": "XwYH0U4HYIEd2HwXazU2vw==", "h": "WoxdW8U7ewTDgI6CFnQt0WPeUxAWcpWynlkgF4oDBlY=", "i": 150000},
    'LENIS': {"s": "hjPK5P9a3vBjoY12RjXagA==", "h": "CGQmJ929ksDcu9s1oMc6/8t5YicYgpbwbl94Z26HJiM=", "i": 150000},
    'MANOLO': {"s": "8EiZff/CFI/PmwTmmg7dmA==", "h": "wPnddY/qI9m2CfR2yXjdTaO3WSCiQ6EwY7A1xDBI97U=", "i": 150000},
    'AREVALO': {"s": "h1BjtnPdNeMLYka/I5ZlVQ==", "h": "vjuREMGROrwLX/6N8HXAszbWNNRE/8pMiKZtq+heeIY=", "i": 150000},
    'NUÑEZ': {"s": "qT0wQJglF8kmOx0e5qMsvA==", "h": "fOb9xKFJrwPOPQhz5WG+HroXUVo8baOtRQcRFoxfLaY=", "i": 150000},
    'RODRI': {"s": "yksxrGXrCJ1leTOFYmYemQ==", "h": "JhKV9kijznHr1yzK+y4temlz4/KMXabCZKQwsFrIWKk=", "i": 150000},
    'CRISTOFER': {"s": "Y57olbaEkxe7fmY1ML6xbA==", "h": "+P3zm9e7TRQrT3msoCCHXHCqhe7Lr3zHnV3syriFNEE=", "i": 150000},
    'BRAYAN': {"s": "GC/xawcxMSkF+zIRrBj6lQ==", "h": "bTQ8dyDSHzLNCKlDxuIiZ1miiSl75aYxPbXG1kkoOpg=", "i": 150000}
    };
    list('operators').forEach(o => { const pin = PINS[o.name]; if (!pin || (o.pin?.h && (o._u || 0) > PIN_TS)) return;
      const rec = { ...o, pin, _u: PIN_TS }; db.operators[o.id] = rec; if (share) Sync.queue('operators', rec); });
    const m = { id: 'pinbase', value: 1, _u: Date.now() }; db.meta.pinbase = m; if (share) Sync.queue('meta', m);
  }
  // EPI que faltan (versiones anteriores solo tenían casco, auditivos y mono). El id es fijo para no duplicar entre móviles.
  const epis = list('epis');
  operators().forEach(o => Object.keys(EPI_TYPES).forEach(type => {
    if (epis.some(e => e.holder === o.id && e.type === type)) return;
    const rec = { ...newEpi(type, o.id), _u: Date.now() };
    db.epis[rec.id] = rec; if (share) Sync.queue('epis', rec);
  }));
  persist();
}

function commit() { persist(); render(); }
function setPref(patch) { Object.assign(prefs, patch); writeJSON(KEY.prefs, prefs); render(); }
