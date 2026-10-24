'use strict';
// USAR 242 · Control del personal durante la operación:
// disponibilidad al activar, recuento periódico (PAR), salidas de la base, bienestar, registro médico (solo en este móvil),
// hidratación con calor y plan de comunicaciones (tipo ICS 205).

/* ==================== DISPONIBILIDAD AL ACTIVAR ==================== */
const AVAIL = { voy: ['Voy', 'ok'], tarde: ['Voy con retraso', 'warn'], no: ['No puedo', 'bad'] };
const availOf = mid => list('availability').filter(a => a.mission === mid);

function availabilityPanel(m) {
  if (m.status === 'done') return '';
  const as = availOf(m.id), ops = operators();
  const meOp = ops.find(o => o.name === prefs.activeOperator);
  const mine = meOp && as.find(a => a.op === meOp.id);
  const count = k => as.filter(a => a.state === k).length;
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><div><h3 class="sec-title" style="margin:0">${ic('bell')} Disponibilidad</h3>
        <p class="muted">Cada uno responde desde su móvil. ${count('voy')} van, ${count('tarde')} con retraso, ${count('no')} no pueden, ${ops.length - as.length} sin responder.</p></div>
        <button class="btn btn-g btn-sm" onclick="open('https://wa.me/?text=' + encodeURIComponent(activationText(mget('${m.id}'))), '_blank')">${ic('chat', 'i-sm')} Enviar activación</button></div>
      ${meOp ? `<div class="row" style="margin-bottom:12px"><b>${esc(meOp.name)}:</b>
        ${Object.entries(AVAIL).map(([k, [l, cls]]) => `<button class="btn btn-sm ${mine?.state === k ? 'btn-a' : 'btn-g'}" onclick="setAvailability('${m.id}', '${meOp.id}', '${k}')">${l}</button>`).join('')}</div>` : ''}
      <div class="avail">${ops.map(o => { const a = as.find(x => x.op === o.id); return `
        <button class="avail-row" onclick="availabilityForm('${m.id}', '${o.id}')">${avatar(o.name, 'sm')}<span class="grow">${esc(o.name)}</span>
          ${a ? `<span class="tag ${AVAIL[a.state][1]}">${AVAIL[a.state][0]}${a.eta ? ' · ' + esc(a.eta) : ''}</span>` : '<span class="tag neutral">Sin respuesta</span>'}</button>`; }).join('')}</div>
    </div>`;
}

function setAvailability(mid, op, state, eta = '') {
  put('availability', { id: `${mid}-${op}`, mission: mid, op, state, eta, ts: Date.now() }, `${mget(mid).title}: ${get('operators', op)?.name} · ${AVAIL[state][0]}`);
  haptic(12);
}
function availabilityForm(mid, op) {
  const a = get('availability', `${mid}-${op}`) || {};
  openForm(`Disponibilidad de ${get('operators', op)?.name}`, [
    { k: 'state', label: 'Respuesta', value: a.state || 'voy', options: Object.entries(AVAIL).map(([k, [l]]) => [k, l]), wide: true },
    { k: 'eta', label: 'Hora estimada de llegada', value: a.eta, placeholder: 'Ej: 07:45', wide: true }
  ], v => setAvailability(mid, op, v.state, v.eta));
}
function activationText(m) {
  return [...waHead('🚨', 'USAR 242 · ACTIVACIÓN', m.title), `📅 *Fecha:* ${fmtDT(m.date)}`, m.location ? `📍 *Lugar:* ${m.location}` : null, m.meeting ? `🤝 *Reunión:* ${m.meeting}` : null,
    '', '👉 *Responde en la app* (Operaciones → Personal):', '✅ Voy · ⏱️ Voy con retraso · ❌ No puedo', `🔗 ${appUrl()}`].filter(x => x !== null).join('\n');
}

/* ==================== RECUENTO PERIÓDICO (PAR) ==================== */
const parEvery = m => (m.zone?.par || 30) * 6e4;
const lastPar = m => (m.pars || []).reduce((mx, p) => Math.max(mx, p.ts), m.startedAt || 0);
const parOverdue = m => m.status === 'active' && Date.now() - lastPar(m) > parEvery(m);

function parPanel(m) {
  if (m.status !== 'active') return '';
  const last = (m.pars || [])[(m.pars || []).length - 1];
  const late = parOverdue(m);
  return `
    <div class="callout ${late ? 'bad' : ''}">
      <b class="num">${fmtDur(Date.now() - lastPar(m))}</b>
      <span>${last ? `desde el último recuento (${last.missing.length ? 'faltaban ' + esc(last.missing.join(', ')) : 'todos presentes'})` : 'desde el inicio sin recuento'}.
        Recuento cada ${m.zone?.par || 30} min, tras cada señal y si alguien no responde.</span>
      <button class="btn ${late ? 'btn-a' : 'btn-g'} btn-sm" style="flex:none" onclick="openRollCall('${m.id}')">Recuento</button>
    </div>`;
}

/* ==================== SALIDAS DE LA BASE ==================== */
const outingsOf = mid => list('outings').filter(o => o.mission === mid).sort((a, b) => (a.back ? 1 : 0) - (b.back ? 1 : 0) || b.out - a.out);
const outingLate = o => !o.back && o.eta && Date.now() > o.eta;

function outingsPanel(m) {
  if (m.status === 'prep') return '';
  const os = outingsOf(m.id), open_ = os.filter(o => !o.back);
  return `
    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('route')} Salidas de la base</h3>
        </div>
        <button class="btn btn-a btn-sm" onclick="outingForm('${m.id}')">${ic('plus')} Salida</button></div>
      ${os.length ? `<div class="list">${os.slice(0, 12).map(o => `
        <div class="item ${outingLate(o) ? 'over' : ''}"><div><b>${esc(names(o.who).join(', '))} → ${esc(o.dest)}</b>
          <small>Salió ${fmtHour(o.out)}${o.eta ? ` · vuelve ${fmtHour(o.eta)}` : ''}${o.back ? ` · volvió ${fmtHour(o.back)}` : ''}${o.radio ? ' · ' + esc(o.radio) : ''}</small>
          ${outingLate(o) ? '<small style="color:var(--bad); font-weight:700">No ha vuelto a la hora prevista</small>' : ''}</div>
          ${o.back ? '<span class="tag neutral">De vuelta</span>' : `<button class="btn btn-g btn-sm" style="flex:none" onclick="outingBack('${o.id}')">${ic('in', 'i-sm')} Vuelven</button>`}</div>`).join('')}</div>`
        : '<p class="muted">Nadie fuera.</p>'}
      ${open_.length ? `<p class="muted" style="margin-top:8px">${open_.length} ${open_.length === 1 ? 'salida abierta' : 'salidas abiertas'}.</p>` : ''}
    </div>`;
}
function outingForm(mid) {
  const back = new Date(Date.now() + 2 * 3.6e6 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  openForm('Salida de la base', [
    { k: 'who', label: 'Quién sale', type: 'checks', options: opChecks(), wide: true },
    { k: 'dest', label: 'Destino', required: true, wide: true, placeholder: 'Ej: Worksite A-2, reunión en el puesto de mando', catalog: 'destinations', free: true },
    { k: 'eta', label: 'Regreso previsto', type: 'datetime-local', value: back },
    { k: 'radio', label: 'Contacto', placeholder: 'Ej: Canal 2 / 600 000 000' }
  ], v => {
    if (!v.who.length) return toast('Marca quién sale', 'bad');
    put('outings', { id: uid('S'), mission: mid, who: v.who, dest: v.dest, radio: v.radio, out: Date.now(), eta: v.eta ? new Date(v.eta).getTime() : null });
    addEntry(mid, null, `Salen de la base ${names(v.who).join(', ')} hacia ${v.dest}`);
  });
}
function outingBack(id) {
  const o = get('outings', id);
  put('outings', { ...o, back: Date.now() });
  addEntry(o.mission, null, `Vuelven a la base ${names(o.who).join(', ')}`);
}

/* ==================== BIENESTAR Y REGISTRO MÉDICO ==================== */
const WELL = { bien: ['Bien', 'ok'], cansado: ['Cansado', 'warn'], mal: ['Mal', 'bad'] };
const MED_TYPES = { lesion: 'Lesión', enfermedad: 'Enfermedad', tratamiento: 'Tratamiento', estres: 'Estrés / incidente crítico' };
const medlogOf = mid => list('medlog').filter(e => e.mission === mid).sort((a, b) => b.ts - a.ts);

function wellbeingPanel(m) {
  if (m.status === 'prep') return '';
  const log = medlogOf(m.id);
  const latest = {};
  log.filter(e => e.type === 'bienestar').forEach(e => { if (!latest[e.op] || latest[e.op].ts < e.ts) latest[e.op] = e; });
  const bad = Object.values(latest).filter(e => e.status !== 'bien');
  const events = log.filter(e => e.type !== 'bienestar');
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><div><h3 class="sec-title" style="margin:0">${ic('heart')} Bienestar y registro médico</h3>
        <p class="muted">${ic('shield', 'i-sm')} Datos de salud del equipo: no salen por WhatsApp.</p></div>
        <div class="row"><button class="btn btn-g btn-sm" onclick="wellbeingCheck('${m.id}')">Control diario</button>
          <button class="btn btn-a btn-sm" onclick="medForm('${m.id}')">${ic('plus')} Anotar</button></div></div>
      ${Object.keys(latest).length ? `<p style="margin-bottom:8px">Último control: ${Object.keys(latest).length} personas, ${bad.length ? `<b style="color:var(--warn)">${bad.length} a vigilar</b> (${esc(bad.map(e => get('operators', e.op)?.name + ': ' + WELL[e.status][0].toLowerCase()).join(', '))})` : 'todos bien'}.</p>` : '<p class="muted" style="margin-bottom:8px">Haz un control físico y mental al menos una vez al día.</p>'}
      ${m.zone?.heat ? `<p class="muted" style="margin-bottom:8px">${ic('timer', 'i-sm')} Calor: aviso de hidratación cada 20 min (un vaso, ≈ 240 ml; no más de 1,4 l por hora).</p>` : ''}
      ${events.length ? `<div class="list log">${events.slice(0, 10).map(e => `<div class="well" style="padding:8px 10px"><span class="t">[${fmtWhen(e.ts)}]</span> <span class="w">${esc(get('operators', e.op)?.name || '')}:</span> ${MED_TYPES[e.type]}. ${esc(e.note)}</div>`).join('')}</div>` : ''}
    </div>`;
}

function wellbeingCheck(mid) {
  const people = missionPeople(mget(mid));
  openModal('Control de bienestar', `
    <p class="muted" style="margin-bottom:12px">¿Cómo está cada uno, física y mentalmente? Duerme, come, bebe, dolor, ánimo.</p>
    <form id="wellForm" class="stack">${people.map(op => `
      <div class="between"><b>${esc(get('operators', op)?.name)}</b>
        <div class="seg3">${Object.entries(WELL).map(([k, [l]], i) => `<label><input type="radio" name="${op}" value="${k}" ${i === 0 ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></div>`).join('')}
      <button class="btn btn-a full">${ic('check')} Guardar control</button>
    </form>`);
  $('wellForm').onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(e.target), ts = Date.now();
    people.forEach(op => stamp('medlog', { id: uid('MB'), mission: mid, op, type: 'bienestar', status: fd.get(op), ts, by: prefs.activeOperator }));
    const bad = people.filter(op => fd.get(op) !== 'bien').length;
    closeModal(); commit();
    addEntry(mid, null, `Control de bienestar hecho${bad ? `: ${bad} a vigilar` : ': todos bien'}`);
  };
}

function medForm(mid) {
  openForm('Registro médico del equipo', [
    { k: 'op', label: 'Persona', options: opOptions('—'), wide: true, required: true },
    { k: 'type', label: 'Tipo', options: Object.entries(MED_TYPES) },
    { k: 'note', label: 'Qué ha pasado y qué se ha hecho', type: 'textarea', rows: 3, wide: true, required: true }
  ], v => {
    if (!v.op) return toast('Elige la persona', 'bad');
    put('medlog', { id: uid('MI'), mission: mid, ...v, ts: Date.now(), by: prefs.activeOperator });
    addEntry(mid, null, `Registro médico: ${MED_TYPES[v.type].toLowerCase()} de un miembro del equipo`);
  });
}

/* ==================== AVISOS PERIÓDICOS (recuento, salidas, revisiones, hidratación) ==================== */
const warned = {};
function remind(key, everyMs, msg) {
  if (warned[key] && Date.now() - warned[key] < everyMs) return;
  warned[key] = Date.now();
  toast(msg, 'bad'); haptic([200, 100, 200]);
  systemNotify(msg);
}
setInterval(() => {
  if (bloqueado()) return;
  list('missions').filter(m => m.status === 'active').forEach(m => {
    if (parOverdue(m)) remind('par' + m.id, 5 * 6e4, `${m.title}: toca recuento de personal`);
    outingsOf(m.id).filter(outingLate).forEach(o => remind('out' + o.id, 10 * 6e4, `${names(o.who).join(', ')} no ha vuelto de ${o.dest}`));
    worksitesOf(m.id).forEach(w => monitorsDue(w).forEach(x => remind('mon' + x.id, 15 * 6e4, `${w.code}: revisar ${x.type.toLowerCase()} (${x.place})`)));
    if (m.zone?.heat) { if (!warned['h' + m.id]) warned['h' + m.id] = Date.now(); else remind('h' + m.id, 20 * 6e4, 'Hidratación: un vaso de agua para todos'); }
  });
}, 30000);

/* ==================== PLAN DE COMUNICACIONES (tipo ICS 205) ==================== */
const COMM_FUNCS = ['Mando', 'Táctico', 'Seguridad', 'Sanitario', 'Logística', 'Coordinación externa'];
function commsPanel(m) {
  const cs = m.comms || [];
  return `
    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('radio')} Plan de comunicaciones</h3>
        <p class="muted">Canales y teléfonos de la operación (como el ICS 205).</p></div>
        <button class="btn btn-a btn-sm" onclick="commForm('${m.id}')">${ic('plus')} Canal</button></div>
      ${cs.length ? `<table class="ref"><tr><th>Función</th><th>Canal / frecuencia</th><th>Quién</th></tr>
        ${cs.map((c, i) => `<tr onclick="commForm('${m.id}', ${i})" style="cursor:pointer"><td><b>${esc(c.func)}</b></td><td>${esc(c.channel)}${c.notes ? `<br><small class="muted">${esc(c.notes)}</small>` : ''}</td><td>${esc(c.who)}</td></tr>`).join('')}</table>`
        : `<p class="muted">Añade al menos el canal de mando y el táctico. Canal principal: ${esc(m.channel || 'sin definir')}.</p>`}
    </div>`;
}
function commForm(mid, i) {
  const m = mget(mid), c = i != null ? m.comms[i] : {};
  openForm(i != null ? 'Editar canal' : 'Nuevo canal', [
    { k: 'func', label: 'Función', value: c.func, catalog: 'commFuncs', free: true, required: true },
    { k: 'channel', label: 'Canal, frecuencia o teléfono', value: c.channel, required: true, placeholder: 'Ej: TETRA TG 2 / 600 000 000' },
    { k: 'who', label: 'Quién lo usa', value: c.who, wide: true, placeholder: 'Ej: Jefes de equipo y puesto de mando' },
    { k: 'notes', label: 'Notas', value: c.notes, wide: true, placeholder: 'Ej: Canal de reserva TG 3' }
  ], v => {
    const comms = [...(m.comms || [])];
    if (i != null) comms[i] = v; else comms.push(v);
    saveMission(m, { comms }, `canal ${v.func}: ${v.channel}`);
  }, i != null ? `<button type="button" class="btn btn-bad span2" onclick="const m = mget('${mid}'); saveMission(m, { comms: m.comms.filter((_, j) => j !== ${i}) }, 'canal quitado'); closeModal();">${ic('trash')} Quitar canal</button>` : '');
}
