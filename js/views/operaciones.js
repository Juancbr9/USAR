'use strict';
// USAR 242 · Operaciones: intervenciones y ejercicios

/* ==================== VISTA: OPERACIONES (intervenciones y ejercicios) ==================== */
const MISSION_TYPES = { intervencion: 'Intervención', ejercicio: 'Ejercicio' };
const mtypeName = m => MISSION_TYPES[m.type] || 'Operación';
const MISSION_STATUS = { prep: ['En preparación', 'warn'], active: ['En curso', 'bad'], done: ['Finalizada', 'neutral'] };
const STATUS_ORDER = { active: 0, prep: 1, done: 2 };
// En el orden de la flota de la unidad; los añadidos después, por nombre
// Flota por orden alfabético (también los vehículos que se añadan o renombren)
const vehicles = () => list('vehicles').sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { numeric: true }));
// Las matrículas de la unidad son «ET-» y números: se añade el prefijo si falta (vacío o solo «ET-» = sin matrícula)
const etPlate = p => { const s = String(p || '').trim().toUpperCase(); if (/^RQ[\s-]/.test(s)) return 'RQ-' + s.replace(/^RQ[\s-]*/, ''); const t = s.replace(/^ET[\s-]*/, '').trim(); return t ? 'ET-' + t : ''; };
const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const fmtDT = v => v ? new Date(v).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha';
const mapsUrl = q => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
const opOptions = (empty = 'Sin asignar') => [['', empty], ...operators().map(o => [o.id, o.name])];
const opChecks = () => operators().map(o => [o.id, o.name]);
const names = ids => ids.map(id => get('operators', id)?.name).filter(Boolean);

function missionPeople(m) {
  const ids = [m.chief, ...(m.teams || []).flatMap(t => [t.leader, ...(t.members || [])]), ...(m.vehicles || []).flatMap(v => [v.driver, ...(v.crew || [])]), ...(m.extra || [])];
  return [...new Set(ids)].filter(id => id && get('operators', id));
}
const teamOf = (m, opid) => (m.teams || []).filter(t => t.leader === opid || (t.members || []).includes(opid));
const missionRole = (m, opid) => m.roles?.[opid] || (m.chief === opid ? 'Jefe de la operación' : '') ||
  (teamOf(m, opid).find(t => t.leader === opid) ? 'Jefe de equipo' : '') || get('operators', opid)?.role || '';
function saveMission(m, patch, msg) {
  put('missions', { ...m, ...patch }, msg ? `${m.title}: ${msg}` : null);
  const n = mget(m.id);
  if (n?.status === 'active' && ('vehicles' in patch || 'gear' in patch || 'container' in patch)) syncGearOut(n);
}
const mget = id => get('missions', id);

function viewOperaciones() {
  const m = prefs.mission && mget(prefs.mission);
  return m ? viewMission(m) : viewMissionList();
}

// Intervenciones o ejercicios (cada uno en su apartado del menú); sin tipo, todas
function viewMissionList(type) {
  const ms = list('missions').filter(m => !type || (type === 'ejercicio' ? m.type === 'ejercicio' : m.type !== 'ejercicio')).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (b.date || '').localeCompare(a.date || ''));
  const card = m => {
    const [label, cls] = MISSION_STATUS[m.status];
    return `
      <button class="item" onclick="openMission('${m.id}')">
        <div><b>${esc(m.title)}</b><small>${mtypeName(m)}${m.scope === 'bic' ? ' de patrimonio (BIC)' : ''} · ${fmtDT(m.date)}${m.location ? ' · ' + esc(m.location) : ''}</small>
          <small>${missionPeople(m).length} personas · ${worksitesOf(m.id).length} worksites · ${victimsOf(m.id).length} víctimas · fase: ${phaseOf(m).short}</small></div>
        <span class="tag ${cls}">${label}</span>
      </button>`;
  };
  const by = st => ms.filter(m => m.status === st);
  const block = (st, title, icon, open = true) => { const xs = by(st); return xs.length ? (open ? `
    <div class="panel"><h3 class="sec-title">${ic(icon)} ${title} (${xs.length})</h3><div class="list">${xs.map(card).join('')}</div></div>` : `
    <details class="panel"><summary class="sec-title" style="cursor:pointer">${ic(icon)} ${title} (${xs.length})</summary><div class="list" style="margin-top:10px">${xs.map(card).join('')}</div></details>`) : ''; };
  return `
    <div class="op-new ${type ? 'one' : ''}">
      ${type !== 'ejercicio' ? `<button class="op-tile real" onclick="newMission('intervencion')">${ic('alert', 'i-lg')}<b>Nueva intervención</b><small>Salida real</small></button>` : ''}
      ${type !== 'intervencion' ? `<button class="op-tile ex" onclick="newMission('ejercicio')">${ic('flag', 'i-lg')}<b>Nuevo ejercicio</b><small>Simulacro o práctica</small></button>` : ''}
    </div>
    ${block('active', 'En curso', 'play')}
    ${block('prep', 'En preparación', 'clock')}
    ${block('done', 'Terminadas', 'history', false)}
    ${!ms.length ? `<div class="panel">${emptyState(type === 'ejercicio' ? 'flag' : 'alert', `Todavía no hay ${type === 'ejercicio' ? 'ningún ejercicio' : type ? 'ninguna intervención' : 'ninguna'}`,
      type === 'ejercicio' ? 'Crea el primero con «Nuevo ejercicio» o empieza desde una plantilla.' : 'Cuando haya una salida real, pulsa «Nueva intervención» o empieza desde una plantilla.')}</div>` : ''}
    ${templatesPanel()}`;
}

function missionForm(id, type = 'intervencion') {
  const m = mget(id) || { type, date: localNow(), chief: operators().find(o => o.name === prefs.activeOperator)?.id || '' };
  openForm(id ? 'Editar datos generales' : `Nueva ${MISSION_TYPES[type].toLowerCase()}`, [
    { k: 'title', label: 'Nombre', value: m.title, required: true, wide: true, placeholder: type === 'ejercicio' ? 'Ej: Simulacro colapso nave' : 'Ej: Derrumbe vivienda C/ Real' },
    { k: 'type', label: 'Tipo', value: m.type, options: Object.entries(MISSION_TYPES) },
    { k: 'scope', label: 'Ámbito', value: m.scope || 'usar', options: [['usar', 'Rescate de personas (USAR)'], ['bic', 'Salvaguarda de patrimonio (BIC)']] },
    { k: 'date', label: 'Fecha y hora de salida', type: 'datetime-local', value: m.date },
    { k: 'location', label: 'Ubicación', value: m.location, wide: true, placeholder: 'Dirección o lugar' },
    { k: 'meeting', label: 'Punto de reunión', value: m.meeting, wide: true, placeholder: 'Ej: Parque de bomberos, 07:30' },
    { k: 'chief', label: 'Jefe de la operación', value: m.chief, options: opOptions() },
    { k: 'channel', label: 'Canal de radio', value: m.channel, placeholder: 'Ej: TETRA 2' },
    { k: 'emergency', label: 'Tipo de emergencia (para sugerir material)', value: m.emergency || guessEmergency(m.template || m.title || ''), options: [['', 'Sin indicar'], ...Object.entries(EMERGENCIES).map(([k, [l]]) => [k, l])], wide: true },
    { k: 'objective', label: 'Objetivo / situación', type: 'textarea', rows: 3, value: m.objective, wide: true }
  ], v => {
    if (id) return saveMission(m, v, 'datos actualizados');
    const rec = { id: uid('M'), status: 'prep', teams: [], vehicles: [], gear: [], container: v.type === 'intervencion', extras: [], roles: {}, safety: '', contacts: '', notes: '', summary: '', ...v };
    put('missions', rec, `Creada ${MISSION_TYPES[rec.type].toLowerCase()} "${rec.title}"`);
    openMission(rec.id);
  });
}


function addEntry(mid, input, text) {
  const value = (text ?? input?.value ?? '').trim();
  if (!value) return;
  stamp('mlog', { id: uid('D'), mission: mid, ts: Date.now(), by: prefs.activeOperator, text: value });
  commit();
}

function detailsForm(mid) {
  const m = mget(mid);
  openForm('Seguridad, contactos y notas', [
    { k: 'safety', label: 'Riesgos y medidas de seguridad', type: 'textarea', value: m.safety, wide: true, placeholder: 'Ej: Riesgo de colapso secundario, vigía en el acceso norte, señal de evacuación: 3 pitidos largos' },
    { k: 'contacts', label: 'Contactos', type: 'textarea', rows: 3, value: m.contacts, wide: true, placeholder: 'Ej: Sala 112 · Jefe de guardia 600 000 000' },
    { k: 'notes', label: 'Notas', type: 'textarea', value: m.notes, wide: true },
    ...(m.status === 'done' ? [{ k: 'summary', label: 'Cierre y lecciones aprendidas', type: 'textarea', value: m.summary, wide: true }] : [])
  ], v => saveMission(m, v, 'seguridad y notas actualizadas'));
}

function teamForm(mid, tid) {
  const m = mget(mid), t = (m.teams || []).find(x => x.id === tid) || {};
  openForm(tid ? 'Editar equipo' : 'Nuevo equipo', [
    { k: 'name', label: 'Nombre del equipo', value: t.name, required: true, wide: true, placeholder: 'Ej: Equipo corte 1' },
    { k: 'func', label: 'Función / tarea', value: t.func, placeholder: 'Ej: Apertura de huecos' },
    { k: 'zone', label: 'Sector / zona', value: t.zone, placeholder: 'Ej: A' },
    { k: 'leader', label: 'Jefe de equipo', value: t.leader, options: opOptions(), wide: true },
    { k: 'members', label: 'Componentes', type: 'checks', value: t.members, options: opChecks(), wide: true }
  ], v => {
    const team = { id: tid || uid('T'), ...v, members: v.leader && !v.members.includes(v.leader) ? [v.leader, ...v.members] : v.members };
    const teams = tid ? m.teams.map(x => (x.id === tid ? team : x)) : [...(m.teams || []), team];
    saveMission(m, { teams }, `equipo "${team.name}" ${tid ? 'editado' : 'creado'}`);
  }, tid ? `<button type="button" class="btn btn-bad span2" onclick="if (confirm('¿Quitar este equipo?')) { const m = mget('${mid}'); saveMission(m, { teams: m.teams.filter(x => x.id !== '${tid}') }, 'equipo eliminado'); closeModal(); }">${ic('trash')} Quitar equipo</button>` : '');
}

function autoTeams(mid) {
  const m = mget(mid);
  if ((m.teams || []).length && !confirm('Se sustituirán los equipos actuales por las células del personal. ¿Continuar?')) return;
  const ops = operators();
  const teams = [...new Set(ops.map(o => o.cell))].map(cell => {
    const members = ops.filter(o => o.cell === cell).map(o => o.id);
    return { id: uid('T'), name: cell, func: '', zone: '', leader: members[0], members };
  });
  saveMission(m, { teams, chief: m.chief || ops[0]?.id || '' }, `${teams.length} equipos creados por células`);
}

function roleForm(mid, opid) {
  const m = mget(mid);
  openForm(`Puesto de ${get('operators', opid).name}`, [
    { k: 'role', label: 'Puesto en esta operación', value: missionRole(m, opid), required: true, wide: true }
  ], v => saveMission(m, { roles: { ...(m.roles || {}), [opid]: v.role } }, `puesto de ${get('operators', opid).name}: ${v.role}`));
}

// Vehículo de una actividad: modelo de la flota (se puede repetir), matrícula de ese día, conductor, ocupantes y lo que carga.
// Nadie va en dos vehículos y el material no se repite: solo lo que queda libre (por unidades si hay varias del mismo equipo)
const unitsOf = g => Math.max(1, +g?.qty || 1);
const vehUnits = (v, id) => get('boxes', id) ? 1 : (v.gearQty?.[id] || unitsOf(get('gear', id)));
function missionVehicleForm(mid, key) {
  const m = mget(mid), cur = (m.vehicles || []).find(v => vkey(v) === key) || {};
  if (!vehicles().length) return toast('No hay vehículos en la flota. Añádelos en Logística → Vehículos.', 'bad');
  vehicleEntryForm(cur, key, (m.vehicles || []).filter(v => vkey(v) !== key), entry => {
    const list_ = key ? m.vehicles.map(x => (vkey(x) === key ? entry : x)) : [...(m.vehicles || []), entry];
    // Lo que se carga entero en el vehículo deja de ir en el contenedor
    const gear = (m.gear || []).filter(id => !entry.gear.includes(id) || entry.gearQty[id]);
    saveMission(m, { vehicles: list_, gear }, `vehículo ${vehName(entry.id)}${entry.plate ? ' ' + entry.plate : ''} ${key ? 'editado' : 'añadido'}`);
  }, key ? `<button type="button" class="btn btn-bad span2" onclick="const m = mget('${mid}'); saveMission(m, { vehicles: m.vehicles.filter(x => vkey(x) !== '${key}') }, 'vehículo quitado'); closeModal();">${ic('trash')} Quitar de la operación</button>` : '');
}
// Formulario de un vehículo (operaciones, maniobras y convoyes): solo salen las personas y la carga que no van ya en otro de la lista
function vehicleEntryForm(cur, key, others, onSave, extra = '') {
  const used = id => others.reduce((n, v) => n + ((v.gear || []).includes(id) ? vehUnits(v, id) : 0), 0);
  const loads = [...boxes().filter(b => !used(b.id)).map(b => [b.id, `${b.code} · ${b.name || ''}`]),
    ...list('gear').filter(g => !get('boxes', g.box)).sort(byName).map(g => {
      const all = unitsOf(g), left = all - used(g.id);
      return left > 0 && [g.id, g.name + (left < all ? ` (quedan ${left} de ${all})` : qtyText(g)), left];
    }).filter(Boolean)];
  const busy = new Set(others.flatMap(v => [v.driver, ...(v.crew || [])]).filter(Boolean));
  const free = operators().filter(o => !busy.has(o.id)).map(o => [o.id, o.name]);
  openForm(key ? 'Editar vehículo' : 'Añadir vehículo', [
    { k: 'id', label: 'Vehículo (modelo)', value: cur.id, options: vehicles().map(v => [v.id, v.name]), wide: true },
    { k: 'plate', label: 'Matrícula (opcional)', value: cur.plate || 'ET-', placeholder: 'Ej: ET-12345', list: [] },
    { k: 'mod', label: 'Módulo detrás', value: cur.mod || '', options: Object.entries(RENAULT_MOD).map(([k, [l]]) => [k, l]), wide: true },
    { k: 'driver', label: 'Conductor', value: cur.driver, options: [['', 'Sin asignar'], ...free] },
    { k: 'crew', label: 'Ocupantes' + (busy.size ? ` <small class="muted">(no salen los ${busy.size} que ya van en otro vehículo)</small>` : ''), type: 'checks', value: cur.crew, options: free, wide: true },
    { k: 'gear', label: 'Lo que carga este vehículo (cajas o equipos; opcional)', type: 'checks', value: cur.gear,
      qty: Object.fromEntries((cur.gear || []).map(id => [id, vehUnits(cur, id)])), options: loads, wide: true }
  ], v => {
    const gearQty = Object.fromEntries(Object.entries(v.gearQty || {}).filter(([id, n]) => n < unitsOf(get('gear', id))));
    onSave({ ...cur, ...v, gearQty, key: key || uid('MV'), plate: etPlate(v.plate), mod: v.id === RENAULT ? v.mod : '', crew: v.crew.filter(id => id !== v.driver) });
  }, extra);
  // Quien conduce no aparece entre los ocupantes
  const form = $('modalForm'), driver = form.elements.driver;
  const hideDriver = () => form.querySelectorAll('input[name=crew]').forEach(c => {
    const me = c.value === driver.value;
    if (me) c.checked = false;
    c.closest('.check-row').hidden = me;
  });
  driver.addEventListener('change', hideDriver); hideDriver();
  // Matrículas del modelo elegido como sugerencias (las que ya van en otro vehículo de la lista no salen)
  const model = form.elements.id, dl = $('dl-plate'), taken = new Set(others.map(v => v.plate).filter(Boolean));
  const plates = () => {
    const ps = unitsOf_(get('vehicles', model.value)).map(u => u.plate).filter(p => !taken.has(p));
    dl.innerHTML = ps.map(p => `<option value="${esc(p)}">`).join('');
    if (!cur.plate && ps.length === 1) form.elements.plate.value = ps[0];
  };
  // La autobomba Renault: se elige el módulo que lleva (viene vacía), viéndola con él
  const modRow = form.elements.mod.closest('label');
  modRow.insertAdjacentHTML('afterend', modPreview(cur.mod || ''));
  const prev = form.querySelector('.veh-mods'), showMod = () => { prev.hidden = model.value !== RENAULT; };
  modRow.hidden = true;  // se elige con los botones del dibujo
  form.elements.mod.addEventListener('change', () => prev.querySelector(`[data-mod="${form.elements.mod.value}"]`)?.click());
  model.addEventListener('change', () => { if (!cur.plate) form.elements.plate.value = 'ET-'; plates(); showMod(); }); plates(); showMod();
}
// Lo que carga un vehículo de la actividad, en texto (las cajas por su código)
const vehLoad = (v, m) => [...(v.gear || []).map(id => get('boxes', id) ? 'caja ' + get('boxes', id).code : get('gear', id) ? get('gear', id).name + (v.gearQty?.[id] ? ` ×${v.gearQty[id]}` : qtyText(get('gear', id))) : ''),
  ...((m?.extras || []).filter(x => x.in === vkey(v)).map(extraText))].filter(Boolean);
const vehHasLoad = (v, m) => vehLoad(v, m).length > 0;
const vehGearIds = m => new Set((m.vehicles || []).flatMap(v => (v.gear || []).flatMap(id => get('boxes', id) ? boxItems(id).map(g => g.id) : [id])));
const vehLabel = v => vehName(v.id) + (v.id === RENAULT && v.mod ? ` (${RENAULT_MOD[v.mod]?.[0].replace(/^./, c => c.toLowerCase())})` : '') + (v.plate ? ' · ' + v.plate : '');

// Flota: los modelos de vehículo de la unidad
// Dibujo o foto de un modelo de vehículo (la autobomba Renault, con el módulo que lleve en esa actividad)
const vehArtSrc = (id, mod = '') => `img/veh/${id === RENAULT ? RENAULT_MOD[mod]?.[1] || RENAULT_MOD[''][1] : id.toLowerCase()}.webp`;
const vehArt = (v, cls = '', mod = '') => v?.photo && !(v.id === RENAULT && mod) ? `<img class="veh-art ${cls}" data-img="veh:${v.id}" alt="">`
  : VEH_ART.includes(v?.id) ? `<img class="veh-art ${cls}" src="${vehArtSrc(v.id, mod)}" alt="" loading="lazy">` : `<span class="veh-art none ${cls}">${ic('truck', 'i-lg')}</span>`;
// La Renault con cada módulo, para verla: se toca un módulo y cambia el dibujo
const modPreview = (mod = '', title = 'Módulo detrás') => `<div class="lbl wide veh-mods"><span class="veh-mods-t">${title}</span><img class="veh-art lg" src="${vehArtSrc(RENAULT, mod)}" alt="">
  <div class="seg-row" role="group" aria-label="Módulo detrás">${Object.entries(RENAULT_MOD).map(([k, [l]]) => `<button type="button" class="${k === mod ? 'on' : ''}" data-mod="${k}"
    onclick="const w = this.closest('.veh-mods'); w.querySelector('img').src = ${jsq(vehArtSrc(RENAULT, k))}; w.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === this)); const s = $('modalForm')?.elements.mod; if (s) s.value = '${k}'">${esc(l.replace(' (sin módulo)', ''))}</button>`).join('')}</div></div>`;
// Ficha de un modelo para todo el equipo: su dibujo (la Renault, con cada módulo), sus matrículas con la ITV y la última
// revista de salida de cada una. Quien gestiona la flota, además, la edita.
function vehicleView(id) {
  const v = get('vehicles', id); if (!v) return;
  const units = unitsOf_(v);
  const unitRow = u => { const c = lastVcheck(u.id); return `
    <div class="item unit-row"><div class="grow"><b class="nw">${esc(u.plate)}</b>${u.use || u.titular ? `<small>${esc([u.use, u.titular].filter(Boolean).join(' · '))}</small>` : ''}
      ${c ? `<button class="link vc-line ${c.fails.length ? 'bad' : 'ok'}" onclick="vcheckHistory('${id}', '${u.id}')">${esc(checkLine(c))}</button>` : '<small class="muted">Sin revista de salida</small>'}
      ${(l => l ? `<button class="link vc-line ${ITV_RES[l.res]?.[1] === 'ok' ? 'ok' : 'bad'}" onclick="itvHistory('${id}', '${u.id}')">ITV ${fmtDate(l.date)}: ${esc(ITV_RES[l.res]?.[0].split(' (')[0] || l.res)}${l.defects ? ' · ' + esc(l.defects) : ''}</button>` : '')(itvLast(u))}</div>
      <div class="unit-acts">${u.itv && daysTo(u.itv) <= 0 ? `<button class="btn btn-a btn-sm" onclick="itvForm('${id}', '${u.id}')">${ic('alert', 'i-sm')} ¿Pasó la ITV?</button>` : `<button class="link" aria-label="ITV de ${esc(u.plate)}" onclick="itvHistory('${id}', '${u.id}')">${itvTag(u) || '<span class="tag neutral">ITV</span>'}</button>`}<button class="btn btn-g btn-sm" onclick="vcheckForm('${id}', '${u.id}')">${ic('clipboard', 'i-sm')} Revista</button></div></div>`; };
  openModal(v.name, `
    ${id === RENAULT ? `<p class="muted" style="margin-bottom:10px">Viene vacía detrás. Elige un módulo para verla con él; en cada actividad se elige el que lleva.</p>
      <div class="form">${modPreview('', 'Módulo')}</div>` : `<div class="veh-hero">${vehArt(v, 'lg')}</div>`}
    ${v.notes || v.seats ? `<p class="muted" style="margin-top:8px">${esc([v.seats ? v.seats + ' plazas' : '', v.notes].filter(Boolean).join(' · '))}</p>` : ''}
    <h4 class="sec-title" style="margin-top:14px">Matrículas (${units.length})</h4>
    ${units.length ? `<div class="list">${units.map(unitRow).join('')}</div>`
      : `<button class="btn btn-g full" onclick="vcheckForm('${id}')">${ic('clipboard')} Revista de salida</button>`}
    ${puedeFlota() ? `<button class="btn btn-g full" style="margin-top:12px" onclick="vehicleForm('${id}')">${ic('pencil')} Editar modelo y matrículas</button>` : ''}`);
}

/* ---------- Revista de salida de cada vehículo (cualquiera la hace; queda el historial por matrícula) ---------- */
const VCHECK = ['Niveles (aceite, refrigerante, AdBlue)', 'Luces y rotativos', 'Neumáticos', 'Frenos', 'Limpiaparabrisas',
  'Documentación (permiso de circulación, ITV, seguro)', 'Extintor, botiquín y triángulos', 'Emisora y transmisiones', 'Carrocería y limpieza'];
const FUEL = ['Lleno', '3/4', '1/2', '1/4', 'Reserva'];
const checksOf = (vid, unit) => list('vchecks').filter(c => c.vid === vid && (c.unit || '') === (unit || '')).sort((a, b) => b.date - a.date);
const lastVcheck = unit => list('vchecks').filter(c => c.unit === unit).sort((a, b) => b.date - a.date)[0];
const checkLine = c => `Revista ${fmtWhen(c.date)} · ${c.fails.length ? `${c.fails.length === 1 ? 'Fallo' : c.fails.length + ' fallos'}: ${c.fails.map(f => f.split(' (')[0].toLowerCase()).join(', ')}` : 'todo bien'}${c.km ? ` · ${(+c.km).toLocaleString('es-ES')} km` : ''}`;
function vcheckForm(vid, unit = '') {
  const v = get('vehicles', vid), u = (v.units || []).find(x => x.id === unit), prev = checksOf(vid, unit)[0];
  openForm(`Revista de salida · ${u ? u.plate : v.name}`, [
    { k: 'ok', label: 'Marca lo que está bien (lo que quede sin marcar es un fallo)', type: 'checks', options: VCHECK.map(x => [x, x]), value: VCHECK, wide: true },
    { k: 'km', label: 'Kilómetros', type: 'number', value: '', placeholder: prev?.km ? `La última: ${prev.km}` : 'Ej: 45210' },
    { k: 'fuel', label: 'Combustible', value: 'Lleno', options: FUEL.map(x => [x, x]) },
    { k: 'notes', label: 'Observaciones', type: 'textarea', rows: 2, value: '', wide: true, placeholder: 'Ej: El rotativo trasero no funciona' }
  ], val => {
    const fails = VCHECK.filter(x => !val.ok.includes(x)), km = Math.round(+val.km) || '';
    if (km && prev?.km && km < +prev.km && !confirm(`Pones ${km} km y la revista anterior tenía ${prev.km}. ¿Guardar igualmente?`)) return;
    put('vchecks', { id: uid('VC'), vid, unit, plate: u?.plate || '', date: Date.now(), by: prefs.activeOperator, km, fuel: val.fuel, fails, notes: val.notes },
      `Revista de salida de ${u ? u.plate : v.name}: ${fails.length ? fails.length + ' fallos' : 'todo bien'}`);
    toast(fails.length ? `Guardada con ${fails.length} ${fails.length === 1 ? 'fallo' : 'fallos'}: sale en Inicio` : 'Revista guardada: todo bien', fails.length ? 'bad' : 'ok');
    vehicleView(vid);
  });
}
/* ---------- ITV: al llegar la fecha se pregunta si la ha pasado; resultado, defectos y próxima fecha ---------- */
const ITV_RES = { favorable: ['Favorable', 'ok'], desfavorable: ['Desfavorable (con defectos)', 'warn'], negativa: ['Negativa (no puede circular)', 'bad'] };
// Matrículas cuya ITV ya ha llegado (o pasado) y aún no se ha apuntado el resultado
const itvPending = () => vehicles().flatMap(v => (v.units || []).filter(u => u.itv && daysTo(u.itv) <= 0).map(u => ({ v, u })));
const itvLast = u => (u.itvs || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
function itvForm(vid, unit, pre = {}) {
  const v = get('vehicles', vid), u = (v?.units || []).find(x => x.id === unit); if (!u) return;
  const next = new Date(); next.setFullYear(next.getFullYear() + 1);
  openForm(`ITV · ${v.name} ${u.plate}`, [
    { k: 'res', label: '¿Ha pasado la ITV?', value: pre.res || 'favorable', options: Object.entries(ITV_RES).map(([k, [l]]) => [k, l]), required: true, wide: true },
    { k: 'date', label: 'Fecha en que se pasó', type: 'date', value: pre.date || todayISO(), required: true },
    { k: 'next', label: 'Próxima fecha (siguiente ITV, o volver a pasarla si ha fallado)', type: 'date', value: pre.next || next.toISOString().slice(0, 10), required: true, wide: true },
    { k: 'defects', label: 'Fallos o defectos (si ha tenido)', type: 'textarea', value: pre.defects || '', wide: true, placeholder: 'Ej: Luz de matrícula fundida; holgura en la dirección' },
    { k: 'station', label: 'Estación ITV', value: pre.station || '', placeholder: 'Ej: ITV Arinaga' }
  ], val => {
    if (val.res !== 'favorable' && !val.defects.trim()) { toast('Apunta qué fallos ha tenido', 'bad'); return itvForm(vid, unit, val); }
    const rec = { date: val.date, res: val.res, next: val.next, defects: val.defects.trim(), station: val.station.trim(), by: prefs.activeOperator };
    const cur = get('vehicles', vid);
    put('vehicles', { ...cur, units: cur.units.map(x => x.id === unit ? { ...x, itv: val.next, cita: '', itvs: [...(x.itvs || []), rec] } : x) },
      `ITV ${u.plate}: ${ITV_RES[val.res][0].toLowerCase()}${rec.defects ? ' (' + rec.defects + ')' : ''}; próxima ${fmtDate(val.next)}`);
    vehicleView(vid);
  });
}
function itvHistory(vid, unit) {
  const v = get('vehicles', vid), u = (v?.units || []).find(x => x.id === unit); if (!u) return;
  const hs = (u.itvs || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  openModal(`ITV · ${u.plate}`, `<p class="muted" style="margin-bottom:10px">${u.itv ? `Próxima: ${fmtDate(u.itv)}` : 'Sin fecha de ITV'}</p>
    <div class="list">${hs.map(h => `<div class="item"><div class="grow"><b>${fmtDate(h.date)}${h.station ? ' · ' + esc(h.station) : ''}</b>
      ${h.defects ? `<small class="${h.res === 'favorable' ? '' : 'bad-text'}">Defectos: ${esc(h.defects)}</small>` : ''}<small>Próxima: ${fmtDate(h.next)}${h.by ? ' · ' + esc(h.by) : ''}</small></div>
      <span class="tag ${ITV_RES[h.res]?.[1] || 'neutral'}">${esc((ITV_RES[h.res]?.[0] || h.res).split(' (')[0])}</span></div>`).join('') || '<p class="muted">Aún no hay ITV apuntadas.</p>'}</div>
    <button class="btn btn-a full" style="margin-top:12px" onclick="itvForm('${vid}', '${unit}')">${ic('check')} Apuntar ITV</button>`);
}

function vcheckHistory(vid, unit = '') {
  const v = get('vehicles', vid), u = (v.units || []).find(x => x.id === unit), cs = checksOf(vid, unit);
  openModal(`Revistas · ${u ? u.plate : v.name}`, `<div class="list">${cs.map(c => `
    <div class="item"><div class="grow"><b>${fmtWhen(c.date)} · ${esc(c.by || '')}</b><small>${esc([c.km ? (+c.km).toLocaleString('es-ES') + ' km' : '', c.fuel ? 'Combustible: ' + c.fuel : ''].filter(Boolean).join(' · '))}</small>
      ${c.fails.length ? `<small class="bad-text">Fallos: ${esc(c.fails.join(', '))}</small>` : ''}${c.notes ? `<small>${esc(c.notes)}</small>` : ''}</div>
      <span class="tag ${c.fails.length ? 'bad' : 'ok'}">${c.fails.length ? c.fails.length + ' fallos' : 'Bien'}</span></div>`).join('') || '<p class="muted">Sin revistas.</p>'}</div>
    <button class="btn btn-a full" style="margin-top:12px" onclick="vcheckForm('${vid}', '${unit}')">${ic('clipboard')} Nueva revista</button>`);
}
function vehicleForm(id) {
  if (!soloFlota()) return;
  const v = get('vehicles', id) || {};
  openForm(id ? `Editar ${v.name}` : 'Nuevo modelo de vehículo', [
    { k: 'name', label: 'Nombre o modelo', value: v.name, required: true, wide: true, placeholder: 'Ej: Amarok' },
    { k: 'seats', label: 'Plazas', type: 'number', value: v.seats },
    { k: 'notes', label: 'Notas', value: v.notes, wide: true, placeholder: 'Ej: Lleva el contenedor USAR' },
    { k: 'photo', label: VEH_ART.includes(id) ? 'Foto (sustituye al dibujo)' : 'Foto o dibujo', type: 'photo', value: '', wide: true }
  ], async val => {
    const rec = { ...(get('vehicles', id) || { id: uid('V') }), ...val, seats: +val.seats || '' };
    if (val.photo) await Img.put(`veh:${rec.id}`, val.photo);
    put('vehicles', { ...rec, photo: val.photo ? true : (get('vehicles', id)?.photo || false) }, `Vehículo "${val.name}" ${id ? 'editado' : 'añadido'}`);
  },
  id ? `<div class="span2 units-list"><b>Matrículas (${unitsOf_(v).length})</b>
      ${unitsOf_(v).map(u => `<button type="button" class="item" onclick="unitForm('${id}', '${u.id}')"><div class="grow"><b>${esc(u.plate)}</b>
        <small>${esc([u.use, u.titular].filter(Boolean).join(' · ') || ' ')}</small></div>${itvTag(u)}</button>`).join('')}
      <button type="button" class="btn btn-g full" onclick="unitForm('${id}')">${ic('plus')} Añadir matrícula</button></div>
    <button type="button" class="btn btn-bad span2" onclick="deleteVehicle('${id}')">${ic('trash')} Eliminar de la flota</button>` : '');
  if (id === RENAULT) $('modalForm').insertAdjacentHTML('afterbegin', modPreview('', 'Verla con un módulo'));
}
// Matrículas de un modelo (cada vehículo real), ordenadas
const unitsOf_ = v => [...(v?.units || [])].sort((a, b) => a.plate.localeCompare(b.plate, 'es', { numeric: true }));
const allUnits = () => vehicles().flatMap(v => (v.units || []).map(u => ({ ...u, vid: v.id })));
const itvTag = u => { if (!u.itv) return ''; const n = daysTo(u.itv); return `<span class="tag ${n < 0 ? 'bad' : n <= 30 ? 'warn' : 'neutral'}">ITV ${n < 0 ? 'caducada' : fmtDate(u.itv)}</span>`; };
// Una matrícula: datos de la hoja y la pizarra (ITV, cita, destino, titular y suplente). Cambiar el modelo la pasa a otro
// (ATB M1 o M2) y con él cambia el dibujo.
function unitForm(vid, id) {
  if (!soloFlota()) return;
  const v = get('vehicles', vid), u = (v.units || []).find(x => x.id === id) || {};
  openForm(id ? u.plate : `Nueva matrícula · ${v.name}`, [
    { k: 'plate', label: 'Matrícula', value: u.plate || 'ET-', required: true, placeholder: 'Ej: ET-120111 o RQ-112426' },
    { k: 'vid', label: 'Modelo', value: vid, options: vehicles().map(x => [x.id, x.name]), required: true },
    { k: 'itv', label: 'Caducidad ITV', type: 'date', value: u.itv },
    { k: 'cita', label: 'Próxima cita ITV', value: u.cita, placeholder: 'Ej: 28/10 11:00' },
    { k: 'use', label: 'Destino u observaciones', value: u.use, wide: true, placeholder: 'Ej: 1º pelotón' },
    { k: 'titular', label: 'Operador titular', value: u.titular },
    { k: 'suplente', label: 'Suplente / ayudante', value: u.suplente }
  ], val => {
    const plate = etPlate(val.plate);
    if (!plate) return toast('Falta la matrícula', 'bad');
    const dup = allUnits().find(x => x.plate === plate && x.id !== id);
    if (dup) return toast(`La matrícula ${plate} ya está en ${vehName(dup.vid)}`, 'bad');
    const rec = { ...u, id: id || unitId(plate), plate, itv: val.itv, cita: val.cita, use: val.use, titular: val.titular, suplente: val.suplente };
    const to = get('vehicles', val.vid) || v;
    if (to.id !== vid) stamp('vehicles', { ...v, units: (v.units || []).filter(x => x.id !== id) });
    put('vehicles', { ...to, units: [...(to.units || []).filter(x => x.id !== rec.id), rec] },
      to.id !== vid ? `${plate} pasa a ${to.name}` : `Matrícula ${plate} ${id ? 'editada' : 'añadida'} (${to.name})`);
    vehicleForm(to.id);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="deleteUnit('${vid}', '${id}')">${ic('trash')} Quitar matrícula</button>` : '');
}
function deleteUnit(vid, id) {
  if (!soloFlota()) return;
  const v = get('vehicles', vid), u = (v.units || []).find(x => x.id === id);
  if (!u || !confirm(`¿Quitar la matrícula ${u.plate} de ${v.name}?`)) return;
  put('vehicles', { ...v, units: v.units.filter(x => x.id !== id) }, `Quitada la matrícula ${u.plate} de ${v.name}`);
  vehicleForm(vid);
}
function deleteVehicle(id) {
  if (!soloFlota()) return;
  const v = get('vehicles', id);
  if (!confirm(`¿Eliminar ${v.name} de la flota?\n\nLas actividades donde salió lo conservan en su historial.`)) return;
  closeModal(); remove('vehicles', id, `Eliminado el vehículo ${v.name}`);
}

// Dónde va cada cosa en una salida: en el contenedor o en uno de los vehículos de la actividad
const destOptions = m => [['cont', 'En el contenedor'], ...(m.vehicles || []).map(v => [vkey(v), 'En ' + vehLabel(v)])];
const destOf = (m, id) => (m.vehicles || []).find(v => (v.gear || []).includes(id)) ? vkey((m.vehicles || []).find(v => (v.gear || []).includes(id))) : 'cont';

// Elegir el material de la salida: el contenedor completo o solo lo que se marque (de cualquier sitio), y dónde va cada cosa
function gearPicker(mid) {
  const m = mget(mid), inVeh = new Set((m.vehicles || []).flatMap(v => v.gear || []));
  const chosen = new Set([...(m.gear || []), ...inVeh]), dests = destOptions(m);
  // Lo repartido por unidades entre varios sitios se reparte en cada vehículo, aquí no se mueve
  const split = id => (m.vehicles || []).some(v => v.gearQty?.[id]) || (m.vehicles || []).filter(v => (v.gear || []).includes(id)).length > 1;
  const groups = gearGroups(list('gear'));
  const sel = (g) => split(g.id) ? `<span class="tag info">repartido</span>` : `<select class="input sm dest" name="dest-${g.id}" aria-label="Dónde va ${esc(g.name)}">${dests.map(([k, l]) => `<option value="${esc(k)}" ${destOf(m, g.id) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  openModal('Material que se lleva', `
    <form id="gearPickForm" class="stack">
      <div class="seg-row" role="radiogroup" aria-label="Cómo sale el material">
        <label class="${m.container ? 'on' : ''}"><input type="radio" name="container" value="1" ${m.container ? 'checked' : ''} onchange="this.closest('.seg-row').querySelectorAll('label').forEach(l => l.classList.toggle('on', l.contains(this)))"> Contenedor completo</label>
        <label class="${m.container ? '' : 'on'}"><input type="radio" name="container" value="" ${m.container ? '' : 'checked'} onchange="this.closest('.seg-row').querySelectorAll('label').forEach(l => l.classList.toggle('on', l.contains(this)))"> Solo lo que marque</label>
      </div>
      <p class="muted">Marca lo que sale suelto o fuera del contenedor (pasillo, armarios…) y elige dónde va: en el contenedor o en un vehículo.${(m.vehicles || []).length ? '' : ' Para elegir un vehículo, añádelo antes en Personal → Vehículo.'}</p>
      <input class="input" type="search" placeholder="Filtrar…" aria-label="Filtrar material" oninput="const q = fold(this.value); document.querySelectorAll('#gearPickForm .pick-row').forEach(r => r.hidden = q && !fold(r.textContent).includes(q))">
      ${groups.map(([d, label, gs]) => `
        <fieldset style="border:0; padding:0; margin:0">
          <div class="between" style="margin-bottom:6px"><b style="font-size:15px">${esc(label)}</b>
            <button type="button" class="link" onclick="const bs = this.closest('fieldset').querySelectorAll('input[name=gear]'); const all = [...bs].every(b => b.checked); bs.forEach(b => b.checked = !all)">Todo</button></div>
          <div class="checks">${gs.map(g => `<div class="pick-row"><label class="check-row"><input type="checkbox" name="gear" value="${g.id}" ${chosen.has(g.id) ? 'checked' : ''}>
            <span>${esc(g.name)}${qtyText(g)}${boxCode(g) ? ` <small class="muted">${esc(boxCode(g))}</small>` : ''}${g.status !== 'OPERATIVO' ? ` <span class="tag ${STATUS_TAG[g.status]}">${g.status}</span>` : ''}${g.out && g.out.mission !== mid ? ` <span class="tag info">fuera</span>` : ''}</span></label>${dests.length > 1 ? sel(g) : ''}</div>`).join('')}</div>
        </fieldset>`).join('')}
      <button class="btn btn-a full">${ic('check')} Guardar material</button>
    </form>`);
  $('gearPickForm').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target), ids = fd.getAll('gear'), container = !!fd.get('container');
    const where = id => fd.get('dest-' + id) || 'cont';
    const all = new Set(list('gear').map(g => g.id));
    const keep = id => !all.has(id) || (split(id) && ids.includes(id));
    const vehicles = (m.vehicles || []).map(v => {
      const gear = [...(v.gear || []).filter(keep), ...ids.filter(id => !split(id) && where(id) === vkey(v))];
      return { ...v, gear, gearQty: Object.fromEntries(Object.entries(v.gearQty || {}).filter(([id]) => gear.includes(id))) };
    });
    closeModal();
    saveMission(m, { gear: ids.filter(id => split(id) ? (m.gear || []).includes(id) : where(id) === 'cont'), container, vehicles }, container ? 'sale el contenedor completo' : `material: ${ids.length} equipos`);
  };
}

// Material extra para una salida concreta (lo que no está en la app): nombre, cantidad y dónde va
const extraText = x => (+x.qty > 1 ? x.qty + ' × ' : '') + x.name;
function extrasForm(mid) {
  if (!soloFlota()) return;
  const m = mget(mid), dests = destOptions(m), rows = [...(m.extras || []), { name: '', qty: 1, in: 'cont' }];
  const row = x => `<div class="extra-row"><input class="input" name="name" value="${esc(x.name)}" placeholder="Ej: Puntales de madera" aria-label="Material">
    <input class="input qty" name="qty" type="number" min="1" inputmode="numeric" value="${x.qty || 1}" aria-label="Cantidad">
    <select class="input" name="in" aria-label="Dónde va">${dests.map(([k, l]) => `<option value="${esc(k)}" ${(x.in || 'cont') === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  openModal('Material extra', `
    <form id="extrasForm" class="stack">
      <p class="muted">Lo que no está en la app y se lleva solo para esta salida.</p>
      <div id="extraRows" class="stack">${rows.map(row).join('')}</div>
      <button type="button" class="btn btn-g" onclick="$('extraRows').insertAdjacentHTML('beforeend', ${jsq(row({ name: '', qty: 1, in: 'cont' }))})">${ic('plus')} Otra línea</button>
      <button class="btn btn-a full">${ic('check')} Guardar</button>
    </form>`);
  $('extrasForm').onsubmit = e => {
    e.preventDefault();
    const extras = [...document.querySelectorAll('#extraRows .extra-row')].map(r => ({ name: r.querySelector('[name=name]').value.trim(), qty: +r.querySelector('[name=qty]').value || 1, in: r.querySelector('[name=in]').value }))
      .filter(x => x.name).map(x => (x.in === 'cont' ? { name: x.name, qty: x.qty } : x));
    closeModal(); saveMission(m, { extras }, `material extra: ${extras.length}`);
  };
}

// Marca como "fuera" el material de una operación en curso y devuelve el que ya no está en la lista
function syncGearOut(m, returnAll = false) {
  const keep = returnAll ? new Set() : new Set(missionGearIds(m));
  const changes = list('gear').flatMap(g => {
    if (keep.has(g.id) && !g.out) return [{ ...g, out: { who: m.title, since: Date.now(), note: get('operators', m.chief)?.name ? 'Jefe: ' + get('operators', m.chief).name : '', mission: m.id } }];
    if (!keep.has(g.id) && g.out?.mission === m.id) return [{ ...g, out: null }];
    return [];
  });
  if (changes.length) putMany('gear', changes);
}

function startMission(mid) {
  const m = mget(mid);
  const issues = missionGear(m).filter(g => g.status !== 'OPERATIVO');
  const msg = `¿Iniciar "${m.title}"?\n\nEl material seleccionado quedará marcado como fuera del contenedor.` +
    (issues.length ? `\n\n⚠️ Hay ${issues.length} equipo(s) que no están operativos: ${issues.map(g => g.name).join(', ')}` : '');
  if (!confirm(msg)) return;
  saveMission(m, { status: 'active', startedAt: Date.now(), phase: Math.max(m.phase || 0, 1) }, 'iniciada');
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
  syncGearOut(mget(mid));
  addEntry(mid, null, 'Operación iniciada');
}

function finishMission(mid) {
  const m = mget(mid);
  const inZone = presence(m).filter(p => p.state === 'in').length;
  if (!confirm(`¿Finalizar "${m.title}"? El material volverá a figurar en el contenedor.` + (inZone ? `\n\nSe marcará la salida de las ${inZone} personas que siguen en zona.` : ''))) return;
  closePresence(m);
  syncGearOut(m, true);
  saveMission(m, { status: 'done', endedAt: Date.now() }, 'finalizada');
  addEntry(mid, null, 'Operación finalizada');
  openForm('Cierre de la operación', [
    { k: 'summary', label: 'Resumen y lecciones aprendidas', type: 'textarea', rows: 6, value: m.summary, wide: true,
      placeholder: '¿Qué fue bien? ¿Qué hay que mejorar? ¿Algún material dañado o que faltó?' }
  ], v => saveMission(mget(mid), v, 'cierre guardado'));
}

function duplicateMission(mid) {
  const m = mget(mid);
  const copy = { ...m, id: uid('M'), title: m.title + ' (copia)', status: 'prep', date: localNow(), summary: '', startedAt: null, endedAt: null,
    phase: 0, checks: {}, risks: m.risks || [], rcm: [], sitreps: [], lastSitrep: null, post: {}, critique: {} };
  put('missions', copy, `Duplicada "${m.title}"`);
  openMission(copy.id);
  toast('Copia creada: revisa fecha y datos');
}

function deleteMission(mid) {
  const m = mget(mid);
  if (!confirm(`¿Eliminar "${m.title}" con todos sus datos?`)) return;
  syncGearOut(m, true);
  list('mlog').filter(e => e.mission === mid).forEach(e => stamp('mlog', { id: e.id, _del: true }));
  checkins(mid).forEach(e => stamp('checkins', { id: e.id, _del: true }));
  ['worksites', 'victims', 'confined', 'outings', 'availability', 'medlog', 'heritage'].forEach(kind => list(kind).filter(r => r.mission === mid).forEach(r => stamp(kind, { id: r.id, _del: true })));
  remove('missions', mid, `Eliminada la operación "${m.title}"`);
  setPref({ mission: null });
}

function missionText(m) {
  const opn = id => get('operators', id)?.name || '—';
  const ex = m.type === 'ejercicio';
  const L = waHead(ex ? '🏋️' : '🚨', `USAR 242 · ${ex ? 'EJERCICIO' : 'INTERVENCIÓN'}`, m.title);
  L.push(`📅 *Fecha:* ${fmtDT(m.date)}`);
  if (m.location) L.push(`📍 *Lugar:* ${m.location}`, `🗺️ ${mapsUrl(m.location)}`);
  if (m.meeting) L.push(`🤝 *Reunión:* ${m.meeting}`);
  L.push(`⭐ *Jefe:* ${opn(m.chief)}`);
  if (m.channel) L.push(`📻 *Canal:* ${m.channel}`);
  if (m.status !== 'prep') L.push(`🧭 *Fase:* ${phaseOf(m).name}`);
  if (m.zone?.meeting) L.push(`🚩 *Punto de reunión en zona:* ${m.zone.meeting}`);
  if (m.status === 'active' && presenceText(m)) L.push(presenceText(m));
  if (m.objective) L.push(...waSec('🎯', 'Objetivo'), m.objective);
  const fn = FUNCS.filter(([k]) => m.func?.[k]).map(([k, name]) => `• ${name}: ${opn(m.func[k])}`);
  if (fn.length) L.push(...waSec('🦺', 'Funciones'), ...fn);
  if (m.scope === 'bic' && m.bic) {
    const b = m.bic;
    L.push(...waSec('🏛️', 'Patrimonio'), ...[b.building && `• Inmueble: ${b.building}`, b.threat && `• Amenaza: ${b.threat}`, b.owner && `• Responsable: ${b.owner}`, b.depot && `• Depósito: ${b.depot}`, b.route && `• Ruta de los bienes: ${b.route}`].filter(Boolean));
  }
  if ((m.comms || []).length) { L.push(...waSec('📻', 'Comunicaciones')); m.comms.forEach(c => L.push(`• ${c.func}: ${c.channel}${c.who ? ' (' + c.who + ')' : ''}`)); }
  if ((m.vehicles || []).length) {
    L.push(...waSec('🚒', `Vehículos (${m.vehicles.length})`));
    m.vehicles.forEach(v => L.push(`▪️ ${waB(vehLabel(v))}`, `   🧑‍✈️ Conductor: ${opn(v.driver)}`, ...((v.crew || []).length ? [`   👥 Ocupantes: ${names(v.crew).join(', ')}`] : [])));
  }
  if ((m.teams || []).length) {
    L.push(...waSec('👥', `Equipos (${m.teams.length})`));
    m.teams.forEach(t => L.push(`▪️ ${waB(t.name)}${t.func ? ' – ' + t.func : ''}${t.zone ? ' (sector ' + t.zone + ')' : ''}`, `   ⭐ Jefe: ${opn(t.leader)}`,
      ...((t.members || []).filter(id => id !== t.leader).length ? [`   👤 ${names(t.members.filter(id => id !== t.leader)).join(', ')}`] : [])));
  }
  const gearList = missionGear(m);
  if (gearList.length || (m.extras || []).length) {
    L.push(...waSec('🧰', `Material${m.container ? ' · contenedor completo' : ''} (${gearList.length})`));
    (m.vehicles || []).filter(v => vehHasLoad(v, m)).forEach(v => L.push(`• 🚒 En ${vehLabel(v)}: ${vehLoad(v, m).join(', ')}`));
    gearGroups(gearList.filter(g => !vehGearIds(m).has(g.id))).forEach(([, label, gs]) => L.push(`• ${label}: ${gs.map(g => g.name + qtyText(g)).join(', ')}`));
    if ((m.extras || []).some(x => !x.in)) L.push(`• ➕ Extra: ${m.extras.filter(x => !x.in).map(extraText).join(', ')}`);
  }
  if (m.safety) L.push(...waSec('⚠️', 'Seguridad'), m.safety);
  if (m.contacts) L.push(...waSec('📞', 'Contactos'), m.contacts);
  if (m.notes) L.push(...waSec('📝', 'Notas'), m.notes);
  return L.join('\n');
}

function printMission(mid) {
  const m = mget(mid), opn = id => esc(get('operators', id)?.name || '—');
  const gearList = missionGear(m);
  const diary = list('mlog').filter(e => e.mission === mid).sort((a, b) => a.ts - b.ts);
  const pre = t => `<p style="white-space:pre-wrap">${esc(t) || '—'}</p>`;
  $('print').innerHTML = `
    <h1>USAR 242 · ${m.type === 'ejercicio' ? 'Ejercicio' : 'Intervención'}: ${esc(m.title)}</h1>
    <p>${fmtDT(m.date)} · ${esc(m.location || 'Sin ubicación')} · Reunión: ${esc(m.meeting || '—')} · Jefe: ${opn(m.chief)} · Radio: ${esc(m.channel || '—')}</p>
    ${m.objective ? pre(m.objective) : ''}
    <h2>Personal y puestos</h2>
    <table><tr><th>Persona</th><th>Puesto</th><th>Equipo</th></tr>${missionPeople(m).map(id => `<tr><td><b>${opn(id)}</b></td><td>${esc(missionRole(m, id))}</td><td>${esc(teamOf(m, id).map(t => t.name).join(', '))}</td></tr>`).join('')}</table>
    <h2>Equipos</h2>
    <table><tr><th>Equipo</th><th>Jefe</th><th>Función / sector</th><th>Componentes</th></tr>${(m.teams || []).map(t => `<tr><td><b>${esc(t.name)}</b></td><td>${opn(t.leader)}</td><td>${esc([t.func, t.zone].filter(Boolean).join(' · '))}</td><td>${esc(names((t.members || []).filter(id => id !== t.leader)).join(', '))}</td></tr>`).join('')}</table>
    <h2>Vehículos</h2>
    <table><tr><th>Vehículo</th><th>Conductor</th><th>Ocupantes</th><th>Carga</th></tr>${(m.vehicles || []).map(v => `<tr><td><b>${esc(vehLabel(v))}</b></td><td>${opn(v.driver)}</td><td>${esc(names(v.crew || []).join(', '))}</td><td>${esc(vehLoad(v, m).join(', '))}</td></tr>`).join('')}</table>
    <h2>Material (${gearList.length})${m.container ? ' · contenedor completo' : ''}</h2>
    <ul>${gearList.map(g => `<li>[${esc(placeShort(g))}] ${esc(g.name)}${qtyText(g)}${g.status !== 'OPERATIVO' ? ' — ' + g.status : ''}</li>`).join('') || '<li>—</li>'}${(m.extras || []).map(x => `<li>[Extra] ${esc(extraText(x))}</li>`).join('')}</ul>
    ${m.status !== 'prep' ? `<h2>Control de personal en zona</h2>
    <table><tr><th>Persona</th><th>Primera entrada</th><th>Estado</th><th>Tiempo en zona</th></tr>${presence(m).map(p => `<tr><td><b>${opn(p.op)}</b></td><td>${p.firstIn ? fmtHour(p.firstIn) : '—'}</td><td>${p.state === 'in' ? 'En zona' : p.state === 'out' ? 'Salió ' + fmtHour(p.last.ts) : 'Sin fichar'}</td><td>${fmtDur(presenceTotal(p))}</td></tr>`).join('')}</table>` : ''}
    ${printExtra(m)}
    <h2>Seguridad</h2>${pre(m.safety)}<h2>Contactos</h2>${pre(m.contacts)}<h2>Notas</h2>${pre(m.notes)}
    ${m.summary ? `<h2>Cierre</h2>${pre(m.summary)}` : ''}
    ${diary.length ? `<h2>Diario</h2><ul>${diary.map(e => `<li>[${fmtWhen(e.ts)}] ${esc(e.by)}: ${esc(e.text)}</li>`).join('')}</ul>` : ''}`;
  print();
}

// Dosier impreso: fases, zona, riesgos, worksites, víctimas y espacios confinados
function printExtra(m) {
  const z = m.zone || {}, ws = worksitesOf(m.id), vs = victimsOf(m.id), cs = confinedOf(m.id);
  const fns = FUNCS.filter(([k]) => m.func?.[k]);
  return `
    <h2>Fase actual: ${esc(phaseOf(m).name)}</h2>
    ${m.scope === 'bic' ? `<h2>Patrimonio: ${esc(m.bic?.building || '')}</h2><p>Amenaza: ${esc(m.bic?.threat || '—')} · Responsable: ${esc(m.bic?.owner || '—')} · Depósito: ${esc(m.bic?.depot || '—')}</p>
      <table><tr><th>Nº</th><th>Bien</th><th>Prioridad</th><th>Estado</th><th>Caja</th><th>Último movimiento</th></tr>${heritageOf(m.id).map(h => { const c = (h.custody || []).slice(-1)[0]; return `<tr><td><b>${herCode(h)}</b></td><td>${esc(h.name)}</td><td>${h.p ? PRIO[h.p][0] : ''}</td><td>${herStatus(h.status)[0]}</td><td>${esc(h.box || '')}</td><td>${c ? fmtWhen(c.ts) + ' ' + esc(c.by) : ''}</td></tr>`; }).join('')}</table>` : ''}
    ${fns.length ? `<p>${fns.map(([k, name]) => `<b>${name}:</b> ${esc(get('operators', m.func[k])?.name || '')}`).join(' · ')}</p>` : ''}
    ${(m.comms || []).length ? `<h2>Plan de comunicaciones</h2><table><tr><th>Función</th><th>Canal</th><th>Quién</th><th>Notas</th></tr>${m.comms.map(c => `<tr><td>${esc(c.func)}</td><td>${esc(c.channel)}</td><td>${esc(c.who || '')}</td><td>${esc(c.notes || '')}</td></tr>`).join('')}</table>` : ''}
    <h2>Zona de trabajo</h2>
    <p>${z.height ? `Distancia de seguridad: <b>${Math.ceil(z.height * 2)} m</b> · ` : ''}Entrada: ${esc(z.door || '—')} · Punto de reunión: ${esc(z.meeting || '—')} · Evacuación: ${esc(z.escape || '—')}</p>
    <p>Suministros cortados: ${esc((z.cut || []).join(', ') || 'ninguno')} · Peligros: ${esc((z.hazards || []).join(', ') || '—')}</p>
    ${(m.risks || []).length ? `<h2>Riesgos</h2><table><tr><th>Riesgo</th><th>Nivel</th><th>Medidas</th></tr>${m.risks.map(r => `<tr><td>${esc(r.name)}</td><td>${riskLevel(r.p, r.c)[0]}</td><td>${esc(r.measures || '')}</td></tr>`).join('')}</table>` : ''}
    ${ws.length ? `<h2>Worksites (${ws.length})</h2><table><tr><th>Código</th><th>Cat.</th><th>Estado</th><th>ASR</th><th>Dirección</th><th>Víctimas</th></tr>${ws.map(w => `<tr><td><b>${esc(w.code)}</b></td><td>${w.cat || '—'}</td><td>${WS_STATUS[w.status][0]}</td><td>${(w.asr || []).map(r => r.level).join(', ') || '—'}</td><td>${esc(w.address || '')}</td><td>${vs.filter(v => v.worksite === w.id).length}</td></tr>`).join('')}</table>` : ''}
    ${vs.length ? `<h2>Víctimas (${vs.length})</h2><table><tr><th>Ref.</th><th>Estado</th><th>Triaje</th><th>Situación</th><th>Localizada</th><th>Extraída</th><th>Entregada a</th></tr>${vs.map(v => `<tr><td><b>${esc(victimRef(v))}</b></td><td>${V_STATE[v.state]}</td><td>${v.color || '—'}</td><td>${V_STATUS[v.status][0]}</td><td>${v.located ? fmtWhen(v.located) : ''}</td><td>${v.extricated ? fmtWhen(v.extricated) : ''}</td><td>${esc(v.handed || '')}</td></tr>`).join('')}</table>` : ''}
    ${cs.length ? `<h2>Espacios confinados</h2><ul>${cs.map(c => `<li><b>${esc(c.place)}</b>: ${(c.readings || []).length} mediciones${lastReading(c) ? ' · última: ' + atmosphereVerdict(lastReading(c))[1] : ''}${c.start ? ' · dentro ' + fmtHour(c.start) + (c.end ? '–' + fmtHour(c.end) : '') : ''} · entran: ${esc(names(c.entrants || []).join(', '))}</li>`).join('')}</ul>` : ''}`;
}

/* ---------- Material sugerido según la emergencia ---------- */
// Adivina el tipo por el nombre de la plantilla o de la operación
function guessEmergency(t) {
  const f = fold(t);
  return /colapso|derrumbe|terremoto|sismo/.test(f) ? 'colapso' : /vertical|altura|pozo/.test(f) ? 'vertical' : /confinad/.test(f) ? 'confinado'
    : /inunda|riada|dana/.test(f) ? 'inundacion' : /patrimonio|bic/.test(f) ? 'patrimonio' : /busqueda|desaparec/.test(f) ? 'busqueda' : /trafico|vehicul|tren|accidente/.test(f) ? 'vehiculos' : '';
}
// Material de la unidad que encaja con el tipo de emergencia y que todavía no va en la salida
function suggestedGear(m) {
  const e = EMERGENCIES[m.emergency]; if (!e) return [];
  const going = new Set(missionGearIds(m));
  return list('gear').filter(g => !going.has(g.id) && g.status !== 'AVERIADO' && !(g.out && g.out.mission !== m.id) && e[1].some(k => fold(`${g.name} ${g.func || ''}`).includes(k)))
    .sort((a, b) => placeShort(a).localeCompare(placeShort(b), 'es', { numeric: true }) || byName(a, b));
}
function suggestPanel(m) {
  const e = EMERGENCIES[m.emergency], sug = suggestedGear(m);
  return `
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('star')} Material sugerido</h3>
        <select class="input sm" aria-label="Tipo de emergencia" onchange="saveMission(mget('${m.id}'), { emergency: this.value }, 'tipo de emergencia: ' + (this.selectedOptions[0].text))">
          <option value="">Tipo de emergencia…</option>${Object.entries(EMERGENCIES).map(([k, [l]]) => `<option value="${k}" ${m.emergency === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
      ${!e ? '<p class="muted">Elige el tipo de emergencia y la app propone el material que suele hacer falta.</p>'
        : sug.length ? `<form id="sugForm" class="stack">
          <p class="muted">${m.container ? 'Sale el contenedor completo; esto está fuera de él o sin marcar:' : 'Para una emergencia así suele hacer falta, y aún no va:'}</p>
          <div class="checks">${sug.map(g => `<label class="check-row"><input type="checkbox" name="g" value="${g.id}" checked><span>${esc(g.name)}${qtyText(g)} <small class="muted">${esc(placeShort(g))}${boxCode(g) ? ' · ' + esc(boxCode(g)) : ''}</small></span></label>`).join('')}</div>
          <button type="button" class="btn btn-a" onclick="addSuggested('${m.id}')">${ic('plus')} Añadir lo marcado</button></form>`
        : '<p class="muted">Ya va todo lo que se suele llevar para este tipo de emergencia.</p>'}
    </div>`;
}
function addSuggested(mid) {
  const m = mget(mid), ids = [...document.querySelectorAll('#sugForm input[name=g]:checked')].map(i => i.value);
  if (!ids.length) return toast('Marca algo', 'bad');
  saveMission(m, { gear: [...new Set([...(m.gear || []), ...ids])] }, `material sugerido: ${ids.length} equipos`);
  toast(`${ids.length} equipos añadidos. Elige en «Elegir material» si alguno va en un vehículo.`);
}
