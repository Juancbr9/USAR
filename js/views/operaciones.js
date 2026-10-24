'use strict';
// USAR 242 · Operaciones: intervenciones y ejercicios

/* ==================== VISTA: OPERACIONES (intervenciones y ejercicios) ==================== */
const MISSION_TYPES = { intervencion: 'Intervención', ejercicio: 'Ejercicio' };
const mtypeName = m => MISSION_TYPES[m.type] || 'Operación';
const MISSION_STATUS = { prep: ['En preparación', 'warn'], active: ['En curso', 'bad'], done: ['Finalizada', 'neutral'] };
const STATUS_ORDER = { active: 0, prep: 1, done: 2 };
// En el orden de la flota de la unidad; los añadidos después, por nombre
const VEH_ORDER = id => { const i = DEFAULT_VEHICLES.findIndex(v => v.id === id); return i < 0 ? 999 : i; };
const vehicles = () => list('vehicles').sort((a, b) => VEH_ORDER(a.id) - VEH_ORDER(b.id) || byName(a, b));
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
      ${type !== 'intervencion' ? `<button class="op-tile ex" onclick="newMission('ejercicio')">${ic('flag', 'i-lg')}<b>Nuevo ejercicio</b><small>Maniobra o simulacro</small></button>` : ''}
    </div>
    ${block('active', 'En curso', 'play')}
    ${block('prep', 'En preparación', 'clock')}
    ${block('done', 'Terminadas', 'history', false)}
    ${!ms.length ? `<div class="panel"><p class="muted">Todavía no hay ${type === 'ejercicio' ? 'ningún ejercicio' : type ? 'ninguna intervención' : 'ninguna'}.</p></div>` : ''}
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

// Vehículo de una actividad: modelo de la flota (se puede repetir), matrícula de ese día, conductor, ocupantes y lo que carga
function missionVehicleForm(mid, key) {
  const m = mget(mid), cur = (m.vehicles || []).find(v => vkey(v) === key) || {};
  if (!vehicles().length) return toast('No hay vehículos en la flota. Añádelos en Logística → Vehículos.', 'bad');
  const inOther = new Set((m.vehicles || []).filter(v => vkey(v) !== key).flatMap(v => v.gear || []));
  const loads = [...boxes().map(b => [b.id, `${b.code} · ${b.name || ''}`]), ...list('gear').filter(g => !get('boxes', g.box)).sort(byName).map(g => [g.id, g.name + qtyText(g)])]
    .filter(([id]) => !inOther.has(id));
  openForm(key ? 'Editar vehículo' : 'Añadir vehículo', [
    { k: 'id', label: 'Vehículo (modelo)', value: cur.id, options: vehicles().map(v => [v.id, v.name]), wide: true },
    { k: 'plate', label: 'Matrícula (opcional)', value: cur.plate, placeholder: 'Ej: 1234 ABC' },
    { k: 'driver', label: 'Conductor', value: cur.driver, options: opOptions() },
    { k: 'crew', label: 'Ocupantes', type: 'checks', value: cur.crew, options: opChecks(), wide: true },
    { k: 'gear', label: 'Lo que carga este vehículo (cajas o equipos; opcional)', type: 'checks', value: cur.gear, options: loads, wide: true }
  ], v => {
    const entry = { ...cur, ...v, key: key || uid('MV'), plate: (v.plate || '').trim().toUpperCase(), crew: v.crew.filter(id => id !== v.driver) };
    const list_ = key ? m.vehicles.map(x => (vkey(x) === key ? entry : x)) : [...(m.vehicles || []), entry];
    saveMission(m, { vehicles: list_ }, `vehículo ${vehName(v.id)}${entry.plate ? ' ' + entry.plate : ''} ${key ? 'editado' : 'añadido'}`);
  }, key ? `<button type="button" class="btn btn-bad span2" onclick="const m = mget('${mid}'); saveMission(m, { vehicles: m.vehicles.filter(x => vkey(x) !== '${key}') }, 'vehículo quitado'); closeModal();">${ic('trash')} Quitar de la operación</button>` : '');
}
// Lo que carga un vehículo de la actividad, en texto (las cajas por su código)
const vehLoad = (v, m) => [...(v.gear || []).map(id => get('boxes', id) ? 'caja ' + get('boxes', id).code : get('gear', id) ? get('gear', id).name + qtyText(get('gear', id)) : ''),
  ...((m?.extras || []).filter(x => x.in === vkey(v)).map(extraText))].filter(Boolean);
const vehHasLoad = (v, m) => vehLoad(v, m).length > 0;
const vehGearIds = m => new Set((m.vehicles || []).flatMap(v => (v.gear || []).flatMap(id => get('boxes', id) ? boxItems(id).map(g => g.id) : [id])));
const vehLabel = v => vehName(v.id) + (v.plate ? ' · ' + v.plate : '');

// Flota: los modelos de vehículo de la unidad
// Dibujo o foto de un modelo de vehículo
const vehArt = (v, cls = '') => v?.photo ? `<img class="veh-art ${cls}" data-img="veh:${v.id}" alt="">`
  : VEH_ART.includes(v?.id) ? `<img class="veh-art ${cls}" src="img/veh/${v.id.toLowerCase()}.webp" alt="" loading="lazy">` : `<span class="veh-art none ${cls}">${ic('truck', 'i-lg')}</span>`;
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
  id ? `<button type="button" class="btn btn-bad span2" onclick="deleteVehicle('${id}')">${ic('trash')} Eliminar de la flota</button>` : '');
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
  const groups = gearGroups(list('gear'));
  const sel = (g) => `<select class="input sm dest" name="dest-${g.id}" aria-label="Dónde va ${esc(g.name)}">${dests.map(([k, l]) => `<option value="${esc(k)}" ${destOf(m, g.id) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
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
    const vehicles = (m.vehicles || []).map(v => ({ ...v, gear: [...(v.gear || []).filter(id => !all.has(id)), ...ids.filter(id => where(id) === vkey(v))] }));
    closeModal();
    saveMission(m, { gear: ids.filter(id => where(id) === 'cont'), container, vehicles }, container ? 'sale el contenedor completo' : `material: ${ids.length} equipos`);
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
  const L = [`*USAR 242 · ${m.type === 'ejercicio' ? '🏋️ EJERCICIO' : '🚨 INTERVENCIÓN'}: ${m.title}*`, `📅 ${fmtDT(m.date)}`];
  if (m.location) L.push(`📍 ${m.location}`, mapsUrl(m.location));
  if (m.meeting) L.push(`🤝 Reunión: ${m.meeting}`);
  L.push(`⭐ Jefe: ${opn(m.chief)}${m.channel ? ' · 📻 ' + m.channel : ''}`);
  if (m.status !== 'prep') L.push(`🧭 Fase: ${phaseOf(m).name}`);
  const fn = FUNCS.filter(([k]) => m.func?.[k]).map(([k, name]) => `${name}: ${opn(m.func[k])}`);
  if (fn.length) L.push(`🦺 ${fn.join(' · ')}`);
  if (m.zone?.meeting) L.push(`📍 Punto de reunión en zona: ${m.zone.meeting}`);
  if (m.status === 'active' && presenceText(m)) L.push(presenceText(m));
  if (m.objective) L.push('', m.objective);
  if (m.scope === 'bic' && m.bic) {
    const b = m.bic;
    L.push('', '*🏛️ Patrimonio*', ...[b.building && `Inmueble: ${b.building}`, b.threat && `Amenaza: ${b.threat}`, b.owner && `Responsable: ${b.owner}`, b.depot && `Depósito: ${b.depot}`, b.route && `Ruta de los bienes: ${b.route}`].filter(Boolean));
  }
  if ((m.comms || []).length) { L.push('', '*📻 Comunicaciones*'); m.comms.forEach(c => L.push(`• ${c.func}: ${c.channel}${c.who ? ' (' + c.who + ')' : ''}`)); }
  if ((m.vehicles || []).length) {
    L.push('', '*🚒 Vehículos*');
    m.vehicles.forEach(v => L.push(`• ${vehLabel(v)}: ${opn(v.driver)} (conductor)${(v.crew || []).length ? ', ' + names(v.crew).join(', ') : ''}`));
  }
  if ((m.teams || []).length) {
    L.push('', '*👥 Equipos*');
    m.teams.forEach(t => L.push(`• ${t.name}${t.func ? ' – ' + t.func : ''}${t.zone ? ' (sector ' + t.zone + ')' : ''}\n   Jefe: ${opn(t.leader)}${(t.members || []).filter(id => id !== t.leader).length ? ' · ' + names(t.members.filter(id => id !== t.leader)).join(', ') : ''}`));
  }
  const gearList = missionGear(m);
  if (gearList.length || (m.extras || []).length) {
    L.push('', `*🧰 Material${m.container ? ' · contenedor completo' : ''} (${gearList.length})*`);
    (m.vehicles || []).filter(v => vehHasLoad(v, m)).forEach(v => L.push(`• En ${vehLabel(v)}: ${vehLoad(v, m).join(', ')}`));
    gearGroups(gearList.filter(g => !vehGearIds(m).has(g.id))).forEach(([, label, gs]) => L.push(`• ${label}: ${gs.map(g => g.name + qtyText(g)).join(', ')}`));
    if ((m.extras || []).some(x => !x.in)) L.push(`• Extra: ${m.extras.filter(x => !x.in).map(extraText).join(', ')}`);
  }
  if (m.safety) L.push('', `*⚠️ Seguridad*`, m.safety);
  if (m.contacts) L.push('', `*📞 Contactos*`, m.contacts);
  if (m.notes) L.push('', `*📝 Notas*`, m.notes);
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
