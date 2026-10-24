'use strict';
// USAR 242 · Seguridad de la operación: señales acústicas, recuento, información inicial, zona de trabajo y riesgos

/* ==================== SEÑALES ACÚSTICAS ==================== */
// El móvil hace de bocina: suena fuerte, vibra y queda anotado en el diario.
let audioCtx = null;
function playSignal(seq) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume?.();
    let t = audioCtx.currentTime + .05;
    seq.forEach(([on, off]) => {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = 'square'; osc.frequency.value = 2400;
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.5, t + .02);
      gain.gain.setValueAtTime(.5, t + on / 1000 - .03); gain.gain.linearRampToValueAtTime(0, t + on / 1000);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t); osc.stop(t + on / 1000 + .02);
      t += (on + off) / 1000;
    });
  } catch {}
  haptic(seq.flat());
}

function signalButtons(mid) {
  return `<div class="signals">${SIGNALS.map(([id, name, desc]) => `
    <button class="signal ${id}" onclick="emitSignal('${mid}', '${id}')">
      <span class="sig-name">${name}</span><span class="sig-desc">${desc}</span>
      <span class="sig-pat">${SIGNALS.find(s => s[0] === id)[3].map(([on]) => `<i style="width:${Math.round(on / 60)}px"></i>`).join('')}</span>
    </button>`).join('')}</div>`;
}

function emitSignal(mid, id) {
  const [, name, desc, seq] = SIGNALS.find(s => s[0] === id);
  playSignal(seq);
  if (mid) addEntry(mid, null, `Señal acústica: ${name.toUpperCase()} (${desc})`);
  if (id === 'evacuar' && mid) setTimeout(() => openRollCall(mid), 400);
}

function openSignals(mid) {
  openModal('Señales acústicas', `
    <p class="muted" style="margin-bottom:12px">Sube el volumen. Cada señal queda anotada en el diario. Tras la evacuación se abre el recuento.</p>
    ${signalButtons(mid)}
    <div class="row" style="margin-top:12px"><button class="btn btn-g full" onclick="openRollCall('${mid}')">${ic('users')} Hacer recuento</button></div>
    <p class="muted" style="margin-top:12px">De noche: luz química <b style="color:var(--bad)">roja</b> = riesgo; <b style="color:var(--ok)">verde</b> = ruta y entrada a zona.</p>`);
}

/* ==================== RECUENTO EN EL PUNTO DE REUNIÓN ==================== */
function openRollCall(mid) {
  const m = mget(mid);
  const ps = m.status === 'prep' ? missionPeople(m).map(op => ({ op, state: 'none' })) : presence(m);
  const sorted = [...ps].sort((a, b) => (a.state === 'in' ? 0 : 1) - (b.state === 'in' ? 0 : 1));
  openModal('Recuento', `
    <p class="muted" style="margin-bottom:6px">Punto de reunión: <b>${esc(m.zone?.meeting || m.meeting || 'sin definir')}</b></p>
    
    <form id="rollForm">
      <div class="checks one">${sorted.map(p => `<label class="check-row"><input type="checkbox" name="op" value="${p.op}">
        <span class="grow">${esc(get('operators', p.op)?.name)}</span>${p.state === 'in' ? '<span class="tag warn">Estaba en zona</span>' : ''}</label>`).join('')}</div>
      <div class="roll-count" id="rollCount"></div>
      <button class="btn btn-a full">${ic('check')} Guardar recuento</button>
    </form>`);
  const form = $('rollForm'), total = sorted.length;
  const update = () => {
    const n = new FormData(form).getAll('op').length;
    $('rollCount').innerHTML = n === total ? `<span class="tag ok">Todos presentes: ${n}/${total}</span>` : `<span class="tag bad">Faltan ${total - n} de ${total}</span>`;
  };
  form.onchange = update; update();
  form.onsubmit = e => {
    e.preventDefault();
    const here = new FormData(form).getAll('op');
    const missing = sorted.filter(p => !here.includes(p.op)).map(p => get('operators', p.op)?.name);
    closeModal();
    const fresh = mget(mid);
    saveMission(fresh, { pars: [...(fresh.pars || []), { ts: Date.now(), total, here: here.length, missing, by: prefs.activeOperator }] });
    addEntry(mid, null, missing.length ? `Recuento: ${here.length}/${total}. FALTAN: ${missing.join(', ')}` : `Recuento: todos presentes (${total})`);
    if (missing.length) toast(`Faltan ${missing.length}: ${missing.join(', ')}`, 'bad');
    else toast('Todos presentes');
  };
}

/* ==================== PESTAÑA SEGURIDAD ==================== */
function tabSeguridad(m) {
  const z = m.zone || {}, info = m.info || {};
  const dist = z.height ? Math.ceil(z.height * 2) : null;
  const field = (k, v) => `<dt>${k}</dt><dd>${v || '<span class="dim">—</span>'}</dd>`;
  return `
    ${m.status === 'active' ? `<div class="panel">
      <h3 class="sec-title">${ic('megaphone')} Señales acústicas</h3>
      ${signalButtons(m.id)}
    </div>` : ''}

    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('search')} Información inicial</h3>
        <button class="btn btn-g btn-sm" onclick="infoForm('${m.id}')">${ic('pencil')} Editar</button></div>
      <dl class="dl">
        ${field('Hora del siniestro', esc(info.when))}
        ${field('Edificios afectados', esc(info.buildings))}
        ${field('Ocupación', esc(info.people))}
        ${field('Meteo / réplicas', esc(info.weather))}
        ${field('Peligros conocidos', esc(info.dangers))}
        ${field('Accesos y planos', esc(info.access))}
        ${field('Hecho antes', esc(info.previous))}
        ${field('Fuente', esc(info.source))}
      </dl>
    </div>

    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('route')} Zona de trabajo</h3>
        <button class="btn btn-g btn-sm" onclick="zoneForm('${m.id}')">${ic('pencil')} Editar</button></div>
      ${dist ? `<div class="callout"><b class="num">${fmtDist(dist)}</b><span>Distancia de seguridad: el doble de la altura de lo que queda en pie (${esc(fmtDist(+z.height || 0))}).</span></div>` : ''}
      <dl class="dl">
        ${field('Entrada única', esc(z.door))}
        ${field('Punto de reunión', esc(z.meeting))}
        ${field('Ruta de evacuación', esc(z.escape))}
        ${field('Zona de seguridad', esc(z.safe))}
        ${field('Viento', esc(z.wind))}
        ${field('Relevos', z.relevo ? `cada ${esc(z.relevo)} min` : '')}
        ${field('Recuento', `cada ${esc(z.par || 30)} min`)}
        ${field('Calor', z.heat ? 'aviso de hidratación cada 20 min' : '')}
      </dl>
      <div class="row tags">
        ${SUPPLIES.map(s => `<span class="tag ${(z.cut || []).includes(s) ? 'ok' : 'warn'}">${(z.cut || []).includes(s) ? ic('check', 'i-sm') : ic('alert', 'i-sm')} ${s} ${(z.cut || []).includes(s) ? 'cortado' : 'sin cortar'}</span>`).join('')}
      </div>
      ${(z.hazards || []).length ? `<p style="margin-top:10px"><b>Peligros:</b> ${(z.hazards || []).map(h => `<span class="tag bad">${esc(h)}</span>`).join(' ')}</p>` : ''}
      <div class="row" style="margin-top:12px"><button class="btn btn-g btn-sm" onclick="shareText(briefingText(mget('${m.id}')), 'Briefing de seguridad')">${ic('share', 'i-sm')} Enviar briefing de seguridad</button></div>
    </div>

    ${m.status === 'active' ? `<button class="btn btn-bad full" onclick="aftershock('${m.id}')">${ic('alert')} Ha habido una réplica</button>` : ''}
    ${commsPanel(m)}
    ${risksPanel(m)}
    ${avanzado() || confinedOf(m.id).length ? confinedPanel(m) : ''}

    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('shield')} Seguridad, contactos y notas</h3>
        <button class="btn btn-g btn-sm" onclick="detailsForm('${m.id}')">${ic('pencil')} Editar</button></div>
      <div class="stack">${textBlock('Riesgos y medidas de seguridad', m.safety)}${textBlock('Contactos (112, mando, responsable del lugar…)', m.contacts)}${textBlock('Notas', m.notes)}</div>
    </div>`;
}

function infoForm(mid) {
  const m = mget(mid), i = m.info || {};
  openForm('Información inicial', [
    { k: 'when', label: 'Hora del siniestro', value: i.when, placeholder: 'Ej: 06:40' },
    { k: 'buildings', label: 'Edificios afectados', value: i.buildings, placeholder: 'Ej: 1 vivienda de 2 plantas' },
    { k: 'people', label: 'Ocupación: cuántas personas, edad, sexo y dónde estaban', type: 'textarea', rows: 3, value: i.people, wide: true },
    { k: 'weather', label: 'Meteorología y réplicas', value: i.weather, wide: true },
    { k: 'dangers', label: 'Peligros: gas, luz, agua, químicos', type: 'textarea', rows: 2, value: i.dangers, wide: true },
    { k: 'access', label: 'Accesos y planos', value: i.access, wide: true },
    { k: 'previous', label: 'Qué se ha hecho ya (otros servicios, vecinos)', type: 'textarea', rows: 2, value: i.previous, wide: true },
    { k: 'source', label: 'Quién informa', value: i.source, wide: true, placeholder: 'Ej: Jefe de bomberos, vecino del 2º' }
  ], v => saveMission(m, { info: v }, 'información inicial actualizada'));
}

function zoneForm(mid) {
  const m = mget(mid), z = m.zone || {};
  openForm('Zona de trabajo', [
    { k: 'height', label: 'Altura de lo que queda en pie (m)', type: 'number', value: z.height },
    { k: 'relevo', label: 'Relevos cada (min)', type: 'number', value: z.relevo || 60 },
    { k: 'par', label: 'Recuento cada (min)', type: 'number', value: z.par || 30 },
    { k: 'heat', label: 'Calor: aviso de hidratación', value: z.heat ? '1' : '', options: [['', 'No'], ['1', 'Sí, cada 20 min']] },
    { k: 'door', label: 'Entrada única (puerta)', value: z.door, wide: true, placeholder: 'Ej: Esquina lado 1 con lado 2' },
    { k: 'meeting', label: 'Punto de reunión / recuento', value: z.meeting, wide: true },
    { k: 'meetingGps', label: 'Coordenadas del punto de reunión (lat/lon, UTM o MGRS)', value: z.meetingGps, placeholder: '28.12350, -15.43630' },
    { k: 'booGps', label: 'Coordenadas de la base / puesto de mando', value: z.booGps, placeholder: '28R DS 57150 10960' },
    { k: 'escape', label: 'Ruta de evacuación', value: z.escape, wide: true },
    { k: 'safe', label: 'Zona de seguridad (parque de material)', value: z.safe, wide: true },
    { k: 'wind', label: 'Dirección del viento', value: z.wind, placeholder: 'Ej: del norte, flojo' },
    { k: 'cut', label: 'Suministros cortados', type: 'checks', value: z.cut, options: SUPPLIES.map(s => [s, s]), wide: true },
    { k: 'hazards', label: 'Peligros en la zona', type: 'checks', value: z.hazards, catalog: 'hazards', wide: true }
  ], v => saveMission(m, { zone: { ...v, height: parseFloat(v.height) || '', relevo: parseInt(v.relevo) || 60, par: parseInt(v.par) || 30, heat: !!v.heat } }, 'zona de trabajo actualizada'),
  `<button type="button" class="btn btn-g span2" onclick="fillGps(this, 'booGps')">${ic('locate')} Estoy en la base: usar mi ubicación</button>`);
}

function briefingText(m) {
  const z = m.zone || {}, f = m.func || {};
  const who = k => get('operators', f[k])?.name || '—';
  const L = [...waHead('⛑️', 'USAR 242 · Briefing de seguridad', m.title), `📅 ${fmtWhen(Date.now())}`, ''];
  if (z.height) L.push(`📏 *Distancia de seguridad:* ${fmtDist(Math.ceil(z.height * 2))}`);
  L.push(`🚪 *Entrada única:* ${z.door || 'por definir'} · hombre-puerta: ${who('puerta')}`);
  if (z.meeting) L.push(`📍 *Punto de reunión:* ${z.meeting}`);
  if (z.escape) L.push(`🏃 *Evacuación:* ${z.escape}`);
  L.push(...waSec('🦺', 'Funciones'), `• 👁 Vigía: ${who('vigia')}`, `• 🦺 Seguridad: ${who('seguridad')}`, `• ➕ Sanitario: ${who('sanitario')}`);
  const notCut = SUPPLIES.filter(s => !(z.cut || []).includes(s));
  if ((z.hazards || []).length || notCut.length) L.push('');
  if ((z.hazards || []).length) L.push(`⚠️ *Peligros:* ${z.hazards.join(', ')}`);
  if (notCut.length) L.push(`🔌 *Sin cortar:* ${notCut.join(', ')}`);
  const high = (m.risks || []).filter(r => riskLevel(r.p, r.c)[1] !== 'ok');
  if (high.length) { L.push(...waSec('🔺', 'Riesgos a vigilar')); high.forEach(r => L.push(`• ${r.name} (${riskLevel(r.p, r.c)[0]})${r.measures ? ': ' + r.measures : ''}`)); }
  L.push(...waSec('📢', 'Señales'), '• 🚨 Evacuación: 3 pitadas cortas', '• ✋ Parar, todos quietos: 1 larga de 3 s', '• ▶️ Continuar: 1 larga y 1 corta');
  L.push('', '❗ _Solo entra el personal imprescindible. Relevos' + (z.relevo ? ` cada ${z.relevo} min._` : '._'));
  return L.join('\n');
}

/* ==================== EVALUACIÓN DE RIESGOS ==================== */
function risksPanel(m) {
  const rs = (m.risks || []).map((r, i) => ({ ...r, i, lv: riskLevel(r.p, r.c) })).sort((a, b) => RISK_LEVELS.indexOf(b.lv) - RISK_LEVELS.indexOf(a.lv));
  return `
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('alert')} Evaluación de riesgos</h3>
        <button class="btn btn-a btn-sm" onclick="riskForm('${m.id}')">${ic('plus')} Riesgo</button></div>
      ${rs.length ? `<div class="list">${rs.map(r => `
        <button class="item" onclick="riskForm('${m.id}', ${r.i})"><div><b>${esc(r.name)}</b>
          <small>Probabilidad ${PROB[r.p].toLowerCase()} × consecuencias ${CONS[r.c].toLowerCase()}${r.measures ? ' · ' + esc(r.measures) : ''}</small></div>
          <span class="tag ${r.lv[1]}">${r.lv[0]}</span></button>`).join('')}</div>`
        : '<p class="muted">Añade los riesgos que veas. La app calcula su nivel (probabilidad × consecuencias) y te dice qué hacer.</p>'}
    </div>`;
}

function riskForm(mid, i) {
  const m = mget(mid), r = i != null ? m.risks[i] : { p: 1, c: 1 };
  const known = new Set((m.risks || []).map(x => x.name));
  openForm(i != null ? 'Editar riesgo' : 'Nuevo riesgo', [
    { k: 'name', label: 'Riesgo', value: r.name, required: true, wide: true, placeholder: 'Escribe o elige de la lista', catalog: 'risks', free: true },
    { k: 'p', label: 'Probabilidad', value: r.p, options: PROB.map((t, j) => [j, t]) },
    { k: 'c', label: 'Consecuencias', value: r.c, options: CONS.map((t, j) => [j, t]) },
    { k: 'measures', label: 'Medidas', type: 'textarea', rows: 3, value: r.measures, wide: true }
  ], v => {
    const rec = { name: v.name, p: +v.p, c: +v.c, measures: v.measures };
    const risks = [...(m.risks || [])];
    if (i != null) risks[i] = rec; else risks.push(rec);
    const lv = riskLevel(rec.p, rec.c);
    saveMission(m, { risks }, `riesgo "${rec.name}": ${lv[0]}`);
    if (lv[1] === 'bad') toast(`${lv[0]}: ${lv[2]}`, 'bad');
  }, `<div class="wide risk-help">${riskMatrix()}</div>` +
    (i != null ? `<button type="button" class="btn btn-bad span2" onclick="const m = mget('${mid}'); saveMission(m, { risks: m.risks.filter((_, j) => j !== ${i}) }, 'riesgo quitado'); closeModal();">${ic('trash')} Quitar riesgo</button>` : ''));
}

function riskMatrix() {
  return `<table class="matrix"><tr><th></th>${CONS.map(c => `<th>${c}</th>`).join('')}</tr>
    ${PROB.map((p, i) => `<tr><th>${p}</th>${CONS.map((_, j) => { const lv = riskLevel(i, j); return `<td class="${lv[1]}">${lv[0]}</td>`; }).join('')}</tr>`).join('')}</table>`;
}

// Réplica: todos quietos, recuento y revisar testigos y apuntalamientos antes de volver a entrar
function aftershock(mid) {
  if (!confirm('¿Registrar una réplica? Se pedirá recuento y habrá que revisar testigos y apuntalamientos antes de seguir.')) return;
  saveMission(mget(mid), { aftershock: Date.now() }, 'réplica');
  addEntry(mid, null, 'RÉPLICA: trabajo parado. Recuento y revisión de testigos y apuntalamientos');
  emitSignal(mid, 'parar');
  setTimeout(() => openRollCall(mid), 600);
}
function fillGps(btn, field) {
  if (!navigator.geolocation) return toast('Este dispositivo no da la ubicación', 'bad');
  btn.disabled = true;
  navigator.geolocation.getCurrentPosition(p => {
    $('modalForm')[field].value = fmtCoord(p.coords.latitude, p.coords.longitude);
    btn.disabled = false; toast(`Ubicación añadida (±${Math.round(p.coords.accuracy)} m)`);
  }, () => { btn.disabled = false; toast('No se pudo obtener la ubicación', 'bad'); }, { enableHighAccuracy: true, timeout: 15000 });
}
