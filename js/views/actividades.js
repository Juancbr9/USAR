'use strict';
// USAR 242 · Actividades: maniobras (logística del traslado, alojamientos y planning diario) y convoyes (de un sitio a otro, ida o ida y vuelta).
// Personal, vehículos y material se reparten igual que en las operaciones: nadie va en dos vehículos y la carga no se repite.

const ACT_TYPES = { maniobra: ['Maniobra', 'maniobras', 'tent', 'Maniobras'], convoy: ['Convoy', 'convoy', 'route', 'Convoyes'] };
const ACT_TABS = Object.values(ACT_TYPES).map(t => t[1]);
const LODGING = { fijo: 'Siempre en el mismo sitio', variable: 'Cambia según el día', no: 'Sin alojamiento' };
const actGet = id => get('moves', id);
const acts = type => list('moves').filter(x => x.type === type).sort((a, b) => (a.start || '').localeCompare(b.start || ''));
// Lo cambia quien lo creó (y el administrador); los demás lo ven
const canAct = x => !x.by || x.by === me()?.id || isAdmin();
const actEnd = x => (x.type === 'convoy' ? (x.round && x.back) || x.start : x.end || x.start) || '';
const actWhen = x => x.type === 'convoy'
  ? `${fmtDT(x.start)}${x.round ? ' · vuelta ' + (x.back ? fmtDT(x.back) : 'sin fecha') : ' · solo ida'}`
  : !x.start ? 'Sin fecha' : x.end && x.end > x.start ? `del ${fmtDate(x.start)} al ${fmtDate(x.end)} (${eventDays(x).length} días)` : fmtDate(x.start);
const actRoute = x => [x.origin, x.destination].filter(Boolean).join(' → ');
const actLines = t => String(t || '').split('\n').map(s => s.trim()).filter(Boolean);
// Tarjeta de una maniobra o un convoy en «Todas las actividades»
const actCard = x => `
  <button class="item act-card" data-kind="${x.type}" onclick="openAct('${x.id}')"><div><b>${esc(x.title)}</b>
    <small>${ACT_TYPES[x.type][0]} · ${x.type === 'convoy' && actRoute(x) ? esc(actRoute(x)) + ' · ' : x.place ? esc(x.place) + ' · ' : ''}${actWhen(x)}</small>
    <small>${(x.people || []).length} personas · ${(x.vehicles || []).length} vehículos</small></div>${ic('chev', 'i-sm')}</button>`;
const openAct = id => { const x = actGet(id); toggleDrawer(false); setPref({ tab: ACT_TYPES[x.type][1], move: id }); scrollTo(0, 0); };

function viewActs(type) {
  const cur = prefs.move && actGet(prefs.move);
  return cur && cur.type === type ? viewAct(cur) : viewActividades();
}

/* ---------- Todas las actividades: una sola lista con filtro por tipo y un solo botón «Nueva» ---------- */
// [id del filtro, nombre, icono, «Nueva …»]
const ACT_KINDS = [['intervencion', 'Intervenciones', 'alert', 'Nueva intervención', 'Salida real'], ['ejercicio', 'Ejercicios', 'flag', 'Nuevo ejercicio', 'Simulacro o práctica'],
  ['maniobra', 'Maniobras', 'tent', 'Nueva maniobra', 'Traslado, alojamiento y planning'], ['convoy', 'Convoyes', 'route', 'Nuevo convoy', 'Movimiento de un sitio a otro']];
const newActivity = kind => ACT_TYPES[kind] ? actForm(kind) : newMission(kind);
function newActivityPicker() {
  openModal('Nueva actividad', `<div class="op-new">${ACT_KINDS.map(([k, , icon, label, sub]) => `
    <button class="op-tile ${k === 'intervencion' ? 'real' : 'ex'}" onclick="closeModal(); newActivity('${k}')">${ic(icon, 'i-lg')}<b>${label}</b><small>${sub}</small></button>`).join('')}</div>`);
}
function viewActividades() {
  const f = ACT_KINDS.some(k => k[0] === prefs.afil) ? prefs.afil : '', today = todayISO();
  const kindOf = m => m.type === 'ejercicio' ? 'ejercicio' : 'intervencion';
  const ms = list('missions').filter(m => !f || kindOf(m) === f), mv = list('moves').filter(x => ACT_TYPES[x.type] && (!f || x.type === f));
  const when = x => x.date || x.start || '';
  // En curso, próximas (y en preparación) y terminadas; cada grupo por fecha
  const live = [...ms.filter(m => m.status === 'active'), ...mv.filter(x => x.start && x.start.slice(0, 10) <= today && actEnd(x).slice(0, 10) >= today)];
  const next = [...ms.filter(m => m.status === 'prep'), ...mv.filter(x => !live.includes(x) && (!actEnd(x) || actEnd(x).slice(0, 10) >= today))].sort((a, b) => when(a).localeCompare(when(b)));
  const done = [...ms.filter(m => m.status === 'done'), ...mv.filter(x => !live.includes(x) && !next.includes(x))].sort((a, b) => when(b).localeCompare(when(a)));
  const card = x => x.status ? missionCard(x) : actCard(x);
  const one = ACT_KINDS.find(k => k[0] === f);
  const block = (xs, title, icon) => xs.length ? `<div class="panel"><h3 class="sec-title">${ic(icon)} ${title} (${xs.length})</h3><div class="list">${xs.map(card).join('')}</div></div>` : '';
  return `
    <div class="panel">
      <div class="between sec-head"><div><h2>Actividades</h2><p class="muted">Intervenciones, ejercicios, maniobras y convoyes.</p></div>
        <button class="btn btn-a" onclick="${one ? `newActivity('${f}')` : 'newActivityPicker()'}">${ic('plus')} ${one ? one[3] : 'Nueva'}</button></div>
      <div class="row chips act-chips">${[['', 'Todas', 'grid'], ...ACT_KINDS].map(([k, l, icon]) => `<button class="chip ${f === k ? 'on' : ''}" onclick="setPref({ afil: '${k}' })">${ic(icon, 'i-sm')} ${l}</button>`).join('')}</div>
    </div>
    ${block(live, 'En curso', 'play')}
    ${block(next, 'Próximas y en preparación', 'clock')}
    ${done.length ? `<details class="panel"><summary class="sec-title" style="cursor:pointer">${ic('history')} Terminadas (${done.length})</summary>
      <div class="list" style="margin-top:10px">${done.map(card).join('')}</div></details>` : ''}
    ${!live.length && !next.length && !done.length ? `<div class="panel">${emptyState(one ? one[2] : 'radio', one ? `Todavía no hay ${one[1].toLowerCase()}` : 'Todavía no hay ninguna actividad',
      `Pulsa «${one ? one[3] : 'Nueva'}»${!f || f === 'intervencion' || f === 'ejercicio' ? ' o empieza desde una plantilla' : ''}.`)}</div>` : ''}
    ${!f || f === 'intervencion' || f === 'ejercicio' ? templatesPanel() : ''}`;
}

/* ---------- Datos generales ---------- */
function actForm(type, id) {
  const x = actGet(id) || { type, chief: me()?.id || '' }, man = type === 'maniobra';
  if (id && !canAct(x)) return toast('Solo quien lo creó puede cambiarlo', 'bad');
  openForm(id ? 'Editar datos' : man ? 'Nueva maniobra' : 'Nuevo convoy', [
    { k: 'title', label: 'Nombre', value: x.title, required: true, wide: true, placeholder: man ? 'Ej: Maniobras de colapso en Lanzarote' : 'Ej: Traslado del contenedor al puerto' },
    ...(man ? [
      { k: 'place', label: 'Lugar', value: x.place, wide: true, placeholder: 'Dónde son las maniobras' },
      { k: 'start', label: 'Primer día', type: 'date', value: x.start || todayISO() },
      { k: 'end', label: 'Último día', type: 'date', value: x.end || x.start || todayISO() }
    ] : [
      { k: 'origin', label: 'Origen', value: x.origin, required: true, placeholder: 'Ej: Base' },
      { k: 'destination', label: 'Destino', value: x.destination, required: true, placeholder: 'Ej: Puerto de Las Palmas' },
      { k: 'start', label: 'Salida de ida', type: 'datetime-local', value: x.start || localNow() },
      { k: 'round', label: 'Trayecto', value: x.round ? '1' : '', options: [['', 'Solo ida'], ['1', 'Ida y vuelta']] },
      { k: 'back', label: 'Salida de vuelta', type: 'datetime-local', value: x.back, wide: true }
    ]),
    { k: 'meeting', label: 'Punto de reunión', value: x.meeting, wide: true, placeholder: 'Ej: Parque, 07:30' },
    { k: 'chief', label: 'Responsable', value: x.chief, options: opOptions() },
    ...(man ? [
      { k: 'lodgingMode', label: 'Alojamiento', value: x.lodgingMode || 'fijo', options: Object.entries(LODGING) },
      { k: 'lodging', label: 'Dónde se duerme', value: x.lodging, wide: true, placeholder: 'Ej: Residencia del acuartelamiento, C/ …' }
    ] : []),
    { k: 'notes', label: man ? 'Cosas a tener en cuenta' : 'Notas', type: 'textarea', rows: 3, value: x.notes, wide: true,
      placeholder: man ? 'Ej: Llevar saco de dormir, ropa de deporte y DNI. Comidas en el comedor.' : 'Ej: Velocidad máxima 80 km/h, parada a mitad de camino' }
  ], v => {
    if (man && v.end && v.start && v.end < v.start) return toast('El último día es anterior al primero', 'bad');
    if (!man && v.round && v.back && v.back < v.start) return toast('La vuelta es anterior a la ida', 'bad');
    const rec = { ...(x.id ? x : { id: uid('AC'), type, by: me()?.id || '', people: [], vehicles: [], days: [], material: '' }), ...v, ...(man ? {} : { round: !!v.round, back: v.round ? v.back : '' }) };
    if (man) rec.days = planDays(rec);
    put('moves', rec, `${ACT_TYPES[type][0]} "${rec.title}" ${id ? 'editado' : 'creado'}`);
    if (!id) openAct(rec.id);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="deleteAct('${id}')">${ic('trash')} Eliminar</button>` : '');
  // Cada campo sale solo cuando hace falta: la vuelta si es ida y vuelta; el sitio, si siempre se duerme en el mismo
  const form = $('modalForm'), show = (k, on) => { const el = form.elements[k]; if (el) el.closest('.lbl').hidden = !on; };
  const sync = () => { show('back', form.elements.round?.value === '1'); show('lodging', form.elements.lodgingMode?.value === 'fijo'); };
  ['round', 'lodgingMode'].forEach(k => form.elements[k]?.addEventListener('change', sync)); sync();
}
// Un día de planning por cada día de la maniobra (se conservan los ya escritos aunque cambien las fechas)
function planDays(x) {
  const old = x.days || [], range = x.start ? eventDays(x) : [];
  const kept = range.map(d => old.find(o => o.date === d) || { id: uid('DY'), date: d, plan: '', lodging: '' });
  const extra = old.filter(o => !range.includes(o.date) && (o.plan || o.lodging));
  return [...kept, ...extra].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
}
function deleteAct(id) {
  const x = actGet(id);
  if (!canAct(x) || !confirm(`¿Eliminar "${x.title}"?`)) return;
  closeModal(); remove('moves', id, `${ACT_TYPES[x.type][0]} "${x.title}" eliminado`); setPref({ move: null });
}

/* ---------- Ficha ---------- */
function viewAct(x) {
  const man = x.type === 'maniobra', edit = canAct(x), [name] = ACT_TYPES[x.type];
  const opn = id => esc(get('operators', id)?.name || '—'), going = new Set(x.people || []), ops = operators();
  const dd = (t, v) => v ? `<dt>${t}</dt><dd>${v}</dd>` : '';
  return `
    <div class="panel">
      <button class="link" onclick="go('actividades')">${ic('back', 'i-sm')} Actividades</button>
      <div class="between sec-head"><div><h2>${esc(x.title)}</h2><p class="muted">${name}${x.by ? ' · creado por ' + opn(x.by) : ''}</p></div>
        ${edit ? `<button class="btn btn-g btn-sm" onclick="actForm('${x.type}', '${x.id}')">${ic('pencil', 'i-sm')} Editar</button>` : ''}</div>
      <dl class="dl">
        ${man ? dd('Cuándo', actWhen(x)) + dd('Lugar', esc(x.place || '')) : dd('Ruta', esc(actRoute(x))) + dd('Ida', fmtDT(x.start)) + dd('Vuelta', x.round ? (x.back ? fmtDT(x.back) : 'Sin fecha') : 'Solo ida')}
        ${dd('Reunión', esc(x.meeting || ''))}${dd('Responsable', x.chief ? opn(x.chief) : '')}
        ${man ? dd('Alojamiento', esc(x.lodgingMode === 'variable' ? 'Cambia según el día (ver planning)' : x.lodgingMode === 'no' ? 'Sin alojamiento' : x.lodging || 'Siempre en el mismo sitio')) : ''}
      </dl>
      ${x.notes ? `<h3 class="sub">${man ? 'Cosas a tener en cuenta' : 'Notas'}</h3><p style="white-space:pre-wrap">${esc(x.notes)}</p>` : ''}
      <div class="row" style="margin-top:12px"><button class="btn btn-g btn-sm" onclick="open('https://wa.me/?text=' + encodeURIComponent(actText(actGet('${x.id}'))), '_blank')">${ic('chat', 'i-sm')} Enviar por WhatsApp</button></div>
    </div>

    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('users')} Quién va (${going.size} de ${ops.length})</h3>
        ${edit ? `<div class="row"><button class="btn btn-g btn-sm" onclick="setActPeople('${x.id}', true)">Todos</button><button class="btn btn-g btn-sm" onclick="setActPeople('${x.id}', false)">Nadie</button></div>` : ''}</div>
      ${edit ? `<p class="muted">Toca cada nombre para marcar o quitar a quien va.</p>
        <div class="row chips move-people">${ops.map(o => `<button class="chip ${going.has(o.id) ? 'on' : ''}" aria-pressed="${going.has(o.id)}" onclick="toggleActPerson('${x.id}', '${o.id}')">${going.has(o.id) ? ic('check', 'i-sm') + ' ' : ''}${esc(o.name)}</button>`).join('')}</div>`
        : going.size ? `<p>${names([...going]).map(esc).join(', ')}</p>` : '<p class="muted">Todavía no hay nadie marcado.</p>'}
    </div>

    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('truck')} Vehículos y carga (${(x.vehicles || []).length})</h3>
        ${edit ? `<button class="btn btn-a btn-sm" onclick="actVehicleForm('${x.id}')">${ic('plus', 'i-sm')} Vehículo</button>` : ''}</div>
      ${(x.vehicles || []).length ? `<div class="list">${x.vehicles.map(v => `
        <${edit ? `button onclick="actVehicleForm('${x.id}', '${vkey(v)}')"` : 'div'} class="item veh-item">${vehArt(get('vehicles', v.id), '', v.mod)}<div class="grow"><b>${esc(vehLabel(v))}</b>
          <small>Conductor: ${opn(v.driver)}${(v.crew || []).length ? ' · ' + esc(names(v.crew).join(', ')) : ''}</small>
          ${vehHasLoad(v) ? `<small>Carga: ${esc(vehLoad(v).join(', '))}</small>` : ''}</div></${edit ? 'button' : 'div'}>`).join('')}</div>`
        : '<p class="muted">Añade los vehículos que salen, con conductor, ocupantes y lo que carga cada uno.</p>'}
    </div>

    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('box')} Otro material</h3>
        ${edit ? `<button class="btn btn-g btn-sm" onclick="actMaterialForm('${x.id}')">${ic('pencil', 'i-sm')} ${x.material ? 'Editar' : 'Añadir'}</button>` : ''}</div>
      ${actLines(x.material).length ? `<ul>${actLines(x.material).map(l => `<li>${esc(l)}</li>`).join('')}</ul>` : '<p class="muted">Lo que se lleva y no va cargado en un vehículo concreto (una línea por cosa).</p>'}
    </div>

    ${man ? `<div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('calendar')} Planning diario</h3>
        ${edit ? `<button class="btn btn-g btn-sm" onclick="actDayForm('${x.id}')">${ic('plus', 'i-sm')} Día</button>` : ''}</div>
      ${(x.days || []).length ? `<div class="list">${x.days.map((d, i) => `
        <${edit ? `button onclick="actDayForm('${x.id}', '${d.id}')"` : 'div'} class="item"><div class="grow"><b>Día ${i + 1} · ${d.date ? new Date(d.date + 'T12:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'sin fecha'}</b>
          ${x.lodgingMode === 'variable' ? `<small>${ic('tent', 'i-sm')} ${esc(d.lodging || 'Alojamiento sin indicar')}</small>` : ''}
          ${actLines(d.plan).length ? actLines(d.plan).map(l => `<small>${esc(l)}</small>`).join('') : '<small class="muted">Sin planning</small>'}</div></${edit ? 'button' : 'div'}>`).join('')}</div>`
        : '<p class="muted">Pon las fechas de la maniobra y aparecerá un día por cada una.</p>'}
    </div>` : ''}`;
}

/* ---------- Quién va: se marca de una vez, sin entrar en cada persona ---------- */
function toggleActPerson(id, op) {
  const x = actGet(id); if (!canAct(x)) return;
  const on = (x.people || []).includes(op);
  // Quien deja de ir sale también del vehículo en el que estaba
  const vehicles = on ? (x.vehicles || []).map(v => ({ ...v, driver: v.driver === op ? '' : v.driver, crew: (v.crew || []).filter(c => c !== op) })) : x.vehicles;
  put('moves', { ...x, people: on ? x.people.filter(p => p !== op) : [...(x.people || []), op], vehicles });
}
function setActPeople(id, all) {
  const x = actGet(id); if (!canAct(x)) return;
  put('moves', { ...x, people: all ? operators().map(o => o.id) : [], vehicles: all ? x.vehicles : (x.vehicles || []).map(v => ({ ...v, driver: '', crew: [] })) },
    `${x.title}: ${all ? 'van todos' : 'nadie marcado'}`);
}

/* ---------- Vehículos, material y planning ---------- */
function actVehicleForm(id, key) {
  const x = actGet(id); if (!canAct(x)) return;
  if (!vehicles().length) return toast('No hay vehículos en la flota. Añádelos en Logística → Vehículos.', 'bad');
  const cur = (x.vehicles || []).find(v => vkey(v) === key) || {};
  vehicleEntryForm(cur, key, (x.vehicles || []).filter(v => vkey(v) !== key), entry => {
    const n = actGet(id), vs = key ? n.vehicles.map(v => (vkey(v) === key ? entry : v)) : [...(n.vehicles || []), entry];
    // Quien va en un vehículo, va
    const people = [...new Set([...(n.people || []), entry.driver, ...entry.crew].filter(Boolean))];
    put('moves', { ...n, vehicles: vs, people }, `${n.title}: vehículo ${vehName(entry.id)}${entry.plate ? ' ' + entry.plate : ''} ${key ? 'editado' : 'añadido'}`);
  }, key ? `<button type="button" class="btn btn-bad span2" onclick="const x = actGet('${id}'); put('moves', { ...x, vehicles: x.vehicles.filter(v => vkey(v) !== '${key}') }, x.title + ': vehículo quitado'); closeModal();">${ic('trash')} Quitar vehículo</button>` : '');
}
function actMaterialForm(id) {
  const x = actGet(id); if (!canAct(x)) return;
  openForm('Otro material', [
    { k: 'material', label: 'Una línea por cosa', type: 'textarea', rows: 6, value: x.material, wide: true, placeholder: 'Ej: 2 cajas de agua\nCarpa\nBotiquín grande' }
  ], v => put('moves', { ...actGet(id), material: v.material }, `${x.title}: material actualizado`));
}
function actDayForm(id, dayId) {
  const x = actGet(id); if (!canAct(x)) return;
  const days = x.days || [], last = days.at(-1)?.date, nextDay = last ? new Date(new Date(last + 'T12:00').getTime() + 864e5).toISOString().slice(0, 10) : x.start || todayISO();
  const d = days.find(y => y.id === dayId) || { date: nextDay, plan: '', lodging: '' };
  openForm(dayId ? 'Planning del día' : 'Nuevo día', [
    { k: 'date', label: 'Día', type: 'date', value: d.date, required: true },
    ...(x.lodgingMode === 'variable' ? [{ k: 'lodging', label: 'Alojamiento esa noche', value: d.lodging, placeholder: 'Ej: Albergue de …' }] : []),
    { k: 'plan', label: 'Planning (una línea por actividad)', type: 'textarea', rows: 6, value: d.plan, wide: true, placeholder: '07:30 Desayuno\n08:30 Salida al campo de maniobras\n14:00 Comida' }
  ], v => {
    const n = actGet(id), rec = { ...d, ...v, id: d.id || uid('DY') };
    const list_ = (dayId ? n.days.map(y => (y.id === dayId ? rec : y)) : [...(n.days || []), rec]).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    put('moves', { ...n, days: list_ }, `${n.title}: planning del ${fmtDate(rec.date)}`);
  }, dayId ? `<button type="button" class="btn btn-bad span2" onclick="const x = actGet('${id}'); put('moves', { ...x, days: x.days.filter(y => y.id !== '${dayId}') }, x.title + ': día quitado'); closeModal();">${ic('trash')} Quitar día</button>` : '');
}

/* ---------- Mensaje para el grupo ---------- */
function actText(x) {
  const man = x.type === 'maniobra', opn = id => get('operators', id)?.name || '—';
  const L = waHead(man ? '⛺' : '🚚', `USAR 242 · ${man ? 'MANIOBRA' : 'CONVOY'}`, x.title);
  if (man) L.push(`📅 *Cuándo:* ${actWhen(x)}`, ...(x.place ? [`📍 *Lugar:* ${x.place}`] : []));
  else L.push(`🛣️ *Ruta:* ${actRoute(x)}`, `➡️ *Ida:* ${fmtDT(x.start)}`, `⬅️ *Vuelta:* ${x.round ? (x.back ? fmtDT(x.back) : 'sin fecha') : 'solo ida'}`);
  if (x.meeting) L.push(`🤝 *Reunión:* ${x.meeting}`);
  if (x.chief) L.push(`⭐ *Responsable:* ${opn(x.chief)}`);
  if (man && x.lodgingMode !== 'variable' && x.lodgingMode !== 'no' && x.lodging) L.push(`🛏️ *Alojamiento:* ${x.lodging}`);
  const ps = names(x.people || []);
  if (ps.length) L.push(...waSec('👥', `Personal (${ps.length})`), ps.join(', '));
  if ((x.vehicles || []).length) {
    L.push(...waSec('🚒', `Vehículos (${x.vehicles.length})`));
    x.vehicles.forEach(v => L.push(`▪️ ${waB(vehLabel(v))}`, `   🧑‍✈️ Conductor: ${opn(v.driver)}`, ...((v.crew || []).length ? [`   👥 Ocupantes: ${names(v.crew).join(', ')}`] : []),
      ...(vehHasLoad(v) ? [`   🧰 Carga: ${vehLoad(v).join(', ')}`] : [])));
  }
  if (actLines(x.material).length) L.push(...waSec('🧰', 'Otro material'), ...actLines(x.material).map(l => '• ' + l));
  if (man && (x.days || []).some(d => d.plan || d.lodging)) {
    L.push(...waSec('🗓️', 'Planning'));
    x.days.forEach((d, i) => L.push(`▪️ ${waB(`Día ${i + 1} · ${fmtDate(d.date)}`)}`, ...(x.lodgingMode === 'variable' && d.lodging ? [`   🛏️ ${d.lodging}`] : []), ...actLines(d.plan).map(l => '   ' + l)));
  }
  if (x.notes) L.push(...waSec('⚠️', man ? 'A tener en cuenta' : 'Notas'), x.notes);
  return L.join('\n');
}
