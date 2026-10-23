'use strict';
// USAR 242 · Listas de opciones: cada desplegable trae opciones de serie y el equipo puede añadir las suyas.
// Cada opción propia es un registro (kind 'options'), así dos móviles pueden añadir a la vez sin pisarse.
// Las opciones de serie se pueden ocultar; las propias se pueden borrar.

const CATALOGS = {
  docTypes: ['Tipos de documento', ['DNI', 'Pasaporte', 'Carné de conducir', 'Tarjeta de identidad militar (TIM)', 'Tarjeta sanitaria europea',
    'Cartilla internacional de vacunación', 'Reconocimiento médico', 'Certificado de curso', 'Seguro de accidentes', 'Otro']],
  quals: ['Cualificaciones y cursos', ['Rescatador USAR', 'Espacios confinados', 'Rescate vertical', 'Apuntalamiento', 'Primeros auxilios / SVB',
    'Guía canino', 'Búsqueda técnica', 'Materiales peligrosos (NRBQ)', 'Conductor de vehículos pesados', 'Operador de radio', 'Salvaguarda de patrimonio']],
  risks: ['Riesgos', RISK_CATALOG],
  hazards: ['Peligros de la zona', HAZARDS],
  buildUse: ['Usos de edificio', BUILD_USE],
  construction: ['Tipos de construcción', CONSTRUCTION],
  collapse: ['Tipos de colapso', COLLAPSE],
  vMethods: ['Cómo se localiza una víctima', V_METHODS],
  vHanded: ['A quién se entrega una víctima', V_HANDED],
  gearFuncs: ['Funciones del material', GEAR_FUNCS],
  opFuncs: ['Funciones del personal', ['Jefe de equipo', 'Rescatador', 'Sanitario', 'Búsqueda técnica', 'Búsqueda canina', 'Estructuras / apuntalamiento',
    'Corte y penetración', 'Rescate vertical', 'Espacios confinados', 'Materiales peligrosos', 'Logística', 'Comunicaciones', 'Seguridad', 'Conductor']],
  boxModels: ['Modelos de caja', ['Peli 1450', 'Peli 1550', 'Peli 1600', 'Peli 1610', 'Peli 1620', 'Peli 1650', 'Peli 1660', 'Peli 1690', 'Peli 1730', 'Peli 1780', 'Peli 0450', 'Peli 0500', 'Peli 0550', 'Caja de madera', 'Caja de plástico', 'Bolsa / petate']],
  commFuncs: ['Funciones de radio', ['Mando', 'Táctico', 'Seguridad', 'Sanitario', 'Logística', 'Coordinación externa']],
  threats: ['Amenazas para el patrimonio', ['Incendio', 'Erupción volcánica (lava)', 'Ceniza volcánica', 'Inundación', 'Terremoto', 'Temporal / viento', 'Derrumbe']],
  herTypes: ['Tipos de bien cultural', ['Pintura (lienzo o tabla)', 'Escultura / imagen', 'Orfebrería', 'Textil / ornamentos', 'Libros y documentos', 'Mobiliario', 'Retablo / elemento fijo', 'Otro']],
  protection: ['Protección del inmueble', ['Bien de Interés Cultural (BIC)', 'Bien catalogado', 'Conjunto histórico', 'Sin protección específica']],
  needs: ['Necesidades de la población', ['Agua', 'Comida', 'Refugio', 'Saneamiento', 'Atención médica', 'Seguridad', 'Ropa y abrigo']],
  destinations: ['Destinos de salida', ['Puesto de mando', 'Worksite', 'Hospital', 'Base de operaciones', 'Avituallamiento', 'Reunión de coordinación']],
  diary: ['Frases rápidas del diario', ['Llegada a zona', 'Zona balizada', 'Inicio de búsqueda', 'Víctima localizada', 'Relevo de equipo', 'Réplica: se para el trabajo']]
};

const optSlug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
// Opciones visibles de una lista: las de serie (menos las ocultas) y las propias, sin repetir
function catalog(key) {
  const recs = list('options').filter(o => o.key === key);
  const hidden = new Set(recs.filter(o => o.hidden).map(o => o.label));
  const own = recs.filter(o => !o.hidden && !o.builtin).sort((a, b) => (a.ts || 0) - (b.ts || 0)).map(o => o.label);
  return [...new Set([...(CATALOGS[key]?.[1] || []).filter(l => !hidden.has(l)), ...own])];
}
function addOption(key, label) {
  label = String(label || '').trim();
  if (!label || catalog(key).some(l => l.toLowerCase() === label.toLowerCase())) return false;
  stamp('options', { id: `${key}:${optSlug(label)}`, key, label, ts: Date.now() });
  return true;
}

/* ---------- Pantalla Listas y opciones ---------- */
function viewListas() {
  return `
    <div class="panel"><h2>Listas y opciones</h2>
      </div>
    <div class="panel menu">${Object.entries(CATALOGS).map(([key, [name, defs]]) => {
      const own = catalog(key).filter(l => !defs.includes(l)).length;
      return `<button class="menu-item" onclick="catalogEditor('${key}')">${ic('layers', 'i-lg')}<div class="grow"><b>${name}</b><small>${catalog(key).length} opciones${own ? ` · ${own} propias` : ''}</small></div>${ic('chev', 'i-sm')}</button>`;
    }).join('')}</div>`;
}

function catalogEditor(key) {
  const [name, defs] = CATALOGS[key];
  const recs = list('options').filter(o => o.key === key);
  const hidden = new Set(recs.filter(o => o.hidden).map(o => o.label));
  const own = catalog(key).filter(l => !defs.includes(l));
  openModal(name, `
    <form id="optForm" class="row nowrap" style="margin-bottom:14px">
      <input class="input" name="label" placeholder="Nueva opción" autocomplete="off" required>
      <button class="btn btn-a">${ic('plus')} Añadir</button>
    </form>
    ${own.length ? `<h3 class="sub" style="margin-top:0">Propias</h3><div class="list">${own.map(l => `
      <div class="item"><span>${esc(l)}</span><button class="link bad" onclick="removeOption(${jsq(key)}, ${jsq(l)})">Borrar</button></div>`).join('')}</div>` : ''}
    <h3 class="sub">De serie</h3>
    <div class="list">${defs.map(l => `
      <div class="item ${hidden.has(l) ? 'muted-item' : ''}"><span>${esc(l)}</span>
        <button class="link" onclick="toggleBuiltin(${jsq(key)}, ${jsq(l)})">${hidden.has(l) ? 'Mostrar' : 'Ocultar'}</button></div>`).join('')}</div>`);
  $('optForm').onsubmit = e => {
    e.preventDefault();
    const label = e.target.label.value;
    if (!addOption(key, label)) return toast('Ya existe o está vacía', 'bad');
    commit(); toast('Opción añadida'); catalogEditor(key);
  };
}
function removeOption(key, label) {
  const rec = list('options').find(o => o.key === key && o.label === label && !o.hidden);
  if (rec) { stamp('options', { id: rec.id, _del: true }); commit(); }
  catalogEditor(key);
}
function toggleBuiltin(key, label) {
  const id = `${key}:hide:${optSlug(label)}`;
  if (get('options', id)) stamp('options', { id, _del: true });
  else stamp('options', { id, key, label, hidden: true, builtin: true, ts: Date.now() });
  commit(); catalogEditor(key);
}

// Desplegable: al elegir «➕ Otra…» se cambia por un campo de texto para escribirla
function catalogNew(sel) {
  if (sel.value !== '__new') return;
  const input = Object.assign(document.createElement('input'), { className: 'input', name: sel.name, placeholder: 'Escribe la nueva opción', required: sel.required });
  input.dataset.catalog = sel.dataset.catalog;
  sel.replaceWith(input);
  input.focus();
}

/* ==================== IMÁGENES (IndexedDB) ====================
   Las fotos (documentos, personas, worksites) se guardan en IndexedDB, que admite mucho más espacio que el resto de datos.
   Si el equipo comparte datos, se envían a la nube y llegan a los demás móviles. Entran en la copia de seguridad. */
const Img = (() => {
  let dbp = null;
  const open = () => dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(PRUEBAS ? 'pruebas242-img' : 'usar242-img', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img');
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  const tx = async (mode, fn) => { const d = await open(); return new Promise((res, rej) => { const t = d.transaction('img', mode); const out = fn(t.objectStore('img')); t.oncomplete = () => res(out?.result); t.onerror = () => rej(t.error); }); };
  return {
    // fromSync = true cuando la imagen llega de otro móvil (no se vuelve a enviar)
    put: async (id, data, fromSync = false) => { await tx('readwrite', s => s.put(data, id)); if (!fromSync) Sync.queueImage(id); document.querySelectorAll(`img[data-img="${CSS.escape(id)}"]`).forEach(el => { el.src = data; el.classList.remove('missing'); }); },
    get: id => tx('readonly', s => s.get(id)),
    del: async (id, fromSync = false) => { await tx('readwrite', s => s.delete(id)); if (!fromSync) Sync.queueImage(id, true); },
    all: async () => { const d = await open(); return new Promise(res => { const out = {}; const c = d.transaction('img').objectStore('img').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else res(out); }; }); }
  };
})();
// Rellena las <img data-img="id"> después de pintar la pantalla
function hydrateImages(root = document) {
  root.querySelectorAll('img[data-img]:not([src])').forEach(el => Img.get(el.dataset.img).then(src => { if (src) el.src = src; else el.classList.add('missing'); }).catch(() => {}));
}
new MutationObserver(() => hydrateImages()).observe(document.documentElement, { childList: true, subtree: true });
