'use strict';
// USAR 242 · Víctimas: localización, rescate, triaje START, extracción y entrega con trazabilidad (ficha A1 de INSARAG)

const V_ORDER = { rescate: 0, localizada: 1, extraida: 2, entregada: 3 };
const C_ORDER = { rojo: 0, amarillo: 1, verde: 2, negro: 3 };
function victimsOf(mid) {
  return list('victims').filter(v => v.mission === mid).sort((a, b) =>
    V_ORDER[a.status] - V_ORDER[b.status] || (C_ORDER[a.color] ?? 9) - (C_ORDER[b.color] ?? 9) || (a.located || 0) - (b.located || 0));
}
const victimRef = v => `${get('worksites', v.worksite)?.code || 'SW'}-V${v.n}`;
const isOut = v => ['extraida', 'entregada'].includes(v.status);
const colorDot = c => c ? `<span class="vdot" style="background:${V_COLORS[c][1]}" title="${V_COLORS[c][0]}"></span>` : '<span class="vdot none" title="Sin triaje"></span>';

function victimRow(v) {
  const since = v.status === 'rescate' && v.rescueStart ? ` · rescate desde las ${fmtHour(v.rescueStart)}` : '';
  return `
    <button class="item" onclick="victimDetail('${v.id}')">
      <div class="who-row">${colorDot(v.color)}<div><b>${esc(victimRef(v))} · ${V_STATE[v.state]}</b>
        <small>${esc([v.floor, v.position].filter(Boolean).join(', ') || 'Sin ubicación')}${since}${v.crush ? ' · ⚠ aplastamiento' : ''}</small></div></div>
      <span class="tag ${V_STATUS[v.status][1]}">${V_STATUS[v.status][0]}</span>
    </button>`;
}

function tabVictimas(m) {
  const vs = victimsOf(m.id);
  const c = f => vs.filter(f).length;
  return `
    <div class="grid g4">
      ${stat(c(v => v.status === 'localizada'), 'Localizadas', c(v => v.status === 'localizada') ? 'warn' : '')}
      ${stat(c(v => v.status === 'rescate'), 'En rescate', c(v => v.status === 'rescate') ? 'bad' : '')}
      ${stat(c(v => isOut(v) && v.state === 'viva'), 'Rescatadas vivas', 'ok')}
      ${stat(c(v => isOut(v) && v.state === 'fallecida'), 'Fallecidas recuperadas')}
    </div>
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('heart')} Víctimas</h3>
        <button class="btn btn-a" onclick="victimForm('${m.id}')">${ic('plus')} Víctima</button></div>
      ${vs.length ? `<div class="list">${vs.map(victimRow).join('')}</div>` : '<p class="muted">Sin víctimas registradas.</p>'}
    </div>
    <div class="panel">
      <h3 class="sec-title">${ic('shield')} Mientras se rescata</h3>
      <ul class="tips">
        <li><b>Contacto:</b> háblale siempre; si hay hueco, cámara y una luz química hasta ella. Sube la moral.</li>
        <li><b>Protección:</b> mascarilla, gafas, casco o manta contra el polvo y los cortes; hidratación si está consciente y el rescate será largo.</li>
        <li><b>C-ABC:</b> consciencia, vía aérea, respiración y circulación. Hemorragia: presión directa 10 min o torniquete (anota la hora).</li>
        <li><b>Aplastamiento:</b> no se libera hasta que toda la cadena sanitaria esté preparada. Torniquete tres dedos por encima, vendaje compresivo, no calentar la zona.</li>
        <li><b>Ética:</b> sin fotos de víctimas fuera de lo necesario para el informe; trato digno a los fallecidos.</li>
      </ul>
    </div>`;
}

function victimForm(mid, id, wsId) {
  const v = get('victims', id) || { worksite: wsId || prefs.ws || worksitesOf(mid).find(w => w.status === 'active')?.id || '', state: 'viva', located: localNow() };
  const wsOptions = [['', 'Sin worksite'], ...worksitesOf(mid).map(w => [w.id, w.code + (w.address ? ' · ' + w.address : '')])];
  openForm(id ? `Editar ${victimRef(v)}` : 'Nueva víctima', [
    { k: 'worksite', label: 'Worksite', value: v.worksite, options: wsOptions, wide: true },
    { k: 'state', label: 'Estado', value: v.state, options: Object.entries(V_STATE) },
    { k: 'method', label: 'Localizada por', value: v.method, catalog: 'vMethods', carry: 'vMethod' },
    { k: 'floor', label: 'Planta', value: v.floor, placeholder: 'Ej: Planta 1, Sótano 1' },
    { k: 'position', label: 'Posición', value: v.position, placeholder: 'Ej: Cuadrante B, cocina' },
    { k: 'located', label: 'Hora de localización', type: 'datetime-local', value: typeof v.located === 'number' ? new Date(v.located - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : v.located },
    { k: 'crush', label: '¿Atrapada por peso (aplastamiento)?', value: v.crush ? '1' : '', options: [['', 'No'], ['1', 'Sí']] },
    { k: 'info', label: 'Datos personales (solo si lo pide la autoridad)', value: v.info, wide: true, placeholder: 'Nombre, edad, sexo, nacionalidad' },
    { k: 'notes', label: 'Notas', type: 'textarea', rows: 3, value: v.notes, wide: true }
  ], val => {
    const sameWs = list('victims').filter(x => x.mission === mid && x.worksite === val.worksite && x.id !== id);
    const rec = { ...(v.id ? v : { id: uid('VI'), mission: mid, status: 'localizada' }), ...val,
      crush: !!val.crush, located: val.located ? new Date(val.located).getTime() : Date.now() };
    if (!v.id || v.worksite !== val.worksite) rec.n = 1 + sameWs.reduce((mx, x) => Math.max(mx, +x.n || 0), 0);
    put('victims', rec, `${mget(mid).title}: víctima ${victimRef(rec)} ${id ? 'editada' : 'registrada'}`);
    if (!id) addEntry(mid, null, `Víctima ${victimRef(rec)} localizada (${V_STATE[rec.state].toLowerCase()})${rec.method ? ' por ' + rec.method.toLowerCase() : ''}${rec.floor ? ', ' + rec.floor : ''}`);
    victimDetail(rec.id);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="if (confirm('¿Eliminar esta víctima?')) { remove('victims', '${id}', 'Víctima eliminada'); closeModal(); }">${ic('trash')} Eliminar</button>` : '');
}

function victimDetail(id) {
  const v = get('victims', id);
  if (!v) return closeModal();
  const ws = get('worksites', v.worksite);
  const dur = v.extricated && v.rescueStart ? fmtDur(v.extricated - v.rescueStart) : v.rescueStart ? fmtDur(Date.now() - v.rescueStart) + ' (en curso)' : '—';
  const f = (k, val) => val ? `<dt>${k}</dt><dd>${val}</dd>` : '';
  openModal(victimRef(v), `
    <div class="row" style="gap:6px; margin-bottom:10px">${colorDot(v.color)}<b>${v.color ? V_COLORS[v.color][0] : 'Sin triaje START'}</b>
      <span class="tag ${V_STATUS[v.status][1]}">${V_STATUS[v.status][0]}</span><span class="tag neutral">${V_STATE[v.state]}</span></div>
    ${v.crush && !isOut(v) ? `<div class="verdict bad"><b>Riesgo de síndrome de aplastamiento</b><span>No liberar hasta que la cadena sanitaria esté lista. Torniquete tres dedos por encima de la zona y anota la hora. Vendaje compresivo y no calentar la zona.</span></div>` : ''}
    <dl class="dl" style="margin-top:12px">
      ${f('Worksite', ws ? esc(ws.code + (ws.address ? ' · ' + ws.address : '')) : 'Sin worksite')}
      ${f('Ubicación', esc([v.floor, v.position].filter(Boolean).join(', ')))}
      ${f('Localizada', v.located ? fmtWhen(v.located) + (v.method ? ' · ' + esc(v.method) : '') : '')}
      ${f('Rescate', v.rescueStart ? `desde ${fmtHour(v.rescueStart)} · ${dur}` : '')}
      ${f('Torniquete', v.tourniquet ? fmtHour(v.tourniquet) : '')}
      ${f('Extraída', v.extricated ? fmtWhen(v.extricated) : '')}
      ${f('Lesiones', V_INJURY[v.injury])}${f('Trabajo necesario', esc(v.work))}
      ${f('Entregada a', v.handed ? esc(v.handed + (v.handedContact ? ' · ' + v.handedContact : '')) : '')}
      ${f('Notas', esc(v.notes))}
    </dl>
    ${v.info ? `<details class="well" style="margin-bottom:12px"><summary><b>Datos personales</b> <small class="muted">(solo para la autoridad; no se comparten)</small></summary><p style="margin-top:6px">${esc(v.info)}</p></details>` : ''}
    <div class="row">
      ${v.status === 'localizada' ? `<button class="btn btn-a" onclick="victimRescue('${id}')">${ic('play')} Empezar rescate</button>` : ''}
      ${v.status === 'rescate' ? `<button class="btn btn-a" onclick="victimExtract('${id}')">${ic('check')} Extraída</button>` : ''}
      ${v.status === 'extraida' ? `<button class="btn btn-a" onclick="victimHandover('${id}')">${ic('out')} Entregar</button>` : ''}
      ${v.state !== 'fallecida' ? `<button class="btn btn-g" onclick="startTriage('${id}')">${ic('heart')} Triaje START</button>` : ''}
      ${v.crush && !v.tourniquet && !isOut(v) ? `<button class="btn btn-g" onclick="victimTourniquet('${id}')">${ic('timer')} Anotar torniquete</button>` : ''}
      <button class="btn btn-g" onclick="victimForm('${v.mission}', '${id}')">${ic('pencil')} Editar</button>
      <button class="btn btn-g" aria-label="Compartir ficha" onclick="shareText(victimText(get('victims', '${id}')), ${jsq('Ficha ' + victimRef(v))})">${ic('share')}</button>
    </div>`);
}

function victimRescue(id) {
  const v = get('victims', id);
  put('victims', { ...v, status: 'rescate', rescueStart: Date.now() });
  const ws = get('worksites', v.worksite);
  if (ws?.status === 'pending') put('worksites', { ...ws, status: 'active' }, `Worksite ${ws.code}: en trabajo`);
  addEntry(v.mission, null, `Empieza el rescate de ${victimRef(v)}`);
  victimDetail(id);
}
function victimTourniquet(id) {
  const v = get('victims', id);
  put('victims', { ...v, tourniquet: Date.now() });
  addEntry(v.mission, null, `${victimRef(v)}: torniquete a las ${fmtHour(Date.now())}`);
  victimDetail(id);
}
function victimExtract(id) {
  const v = get('victims', id);
  openForm(`Extracción de ${victimRef(v)}`, [
    { k: 'state', label: 'Estado', value: v.state === 'desconocida' ? 'viva' : v.state, options: [['viva', 'Viva'], ['fallecida', 'Fallecida']] },
    { k: 'injury', label: 'Lesiones', value: v.injury, options: Object.entries(V_INJURY) },
    { k: 'work', label: 'Trabajo necesario', value: v.work, options: V_WORK.map(x => [x, x]), wide: true }
  ], val => {
    const rec = { ...v, ...val, status: 'extraida', extricated: Date.now(), rescueStart: v.rescueStart || Date.now() };
    put('victims', rec);
    addEntry(v.mission, null, `${victimRef(v)} extraída (${V_STATE[val.state].toLowerCase()}) tras ${fmtDur(rec.extricated - rec.rescueStart)}`);
    victimDetail(id);
  });
}
function victimHandover(id) {
  const v = get('victims', id);
  openForm(`Entrega de ${victimRef(v)}`, [
    { k: 'handed', label: 'Entregada a', value: v.handed || (v.state === 'fallecida' ? 'Morgue' : 'Ambulancia'), catalog: 'vHanded', required: true, wide: true },
    { k: 'handedContact', label: 'Quién la recibe y contacto', value: v.handedContact, wide: true, placeholder: 'Ej: SVA 3, Dr. Pérez · destino Hospital Insular' }
  ], val => {
    put('victims', { ...v, ...val, status: 'entregada', handedAt: Date.now() });
    addEntry(v.mission, null, `${victimRef(v)} entregada a ${val.handed}${val.handedContact ? ' (' + val.handedContact + ')' : ''}`);
    victimDetail(id);
  });
}

/* ---------- Triaje START (no sanitario, < 30 s por víctima) ---------- */
function startTriage(id, step = 'walk') {
  const v = get('victims', id);
  if (V_COLORS[step]) {
    put('victims', { ...v, color: step });
    addEntry(v.mission, null, `${victimRef(v)}: triaje START ${step.toUpperCase()}`);
    return victimDetail(id);
  }
  const [q, answers] = START_STEPS[step];
  openModal(`START · ${victimRef(v)}`, `
    <p class="tri-q">${q}</p>
    <div class="stack" style="margin-top:16px">${answers.map(([label, next]) => `<button class="btn btn-g full tri-a" onclick="startTriage('${id}', '${next}')">${label}</button>`).join('')}</div>
    <p class="muted" style="margin-top:14px">Solo dos gestos mientras clasificas: abrir la vía aérea y taponar hemorragias.</p>`);
}

// Ficha de víctima extraída (formulario INSARAG de extracción, campos V). Sin datos personales (V4): solo si los pide la autoridad.
function victimText(v) {
  const ws = get('worksites', v.worksite);
  const cond = v.state === 'fallecida' ? 'Fallecida' : v.injury === 'critico' ? 'Viva, crítica' : v.injury === 'estable' ? 'Viva, estable' : V_STATE[v.state];
  const L = waHead('🧍', `Ficha de extracción ${victimRef(v)}`);
  L.push(`👥 *G3* Equipo: ${teamCode()}`, `🏚️ *E1* Worksite: ${ws?.code || '—'} · *V1* Víctima nº ${v.n}`);
  if (ws?.lat) L.push(`🛰️ *E2* GPS (WGS84): ${ws.lat}, ${ws.lon} · MGRS ${toMGRS(+ws.lat, +ws.lon)}`);
  if (ws?.address) L.push(`📍 *E3* ${ws.address}`);
  L.push(...waSec('🚑', 'Rescate'));
  if (v.extricated) L.push(`🕒 *V2–V3* Extracción: ${fmtWhen(v.extricated)}`);
  if (v.floor) L.push(`🏢 *V5* Planta: ${v.floor}`);
  if (v.position) L.push(`🧭 *V6* Posición: ${v.position}`);
  if (v.work) L.push(`🔧 *V7* Trabajo: ${v.work}`);
  if (v.extricated) L.push(`⏱️ *V8* Tiempo de extracción: ${fmtDur(v.extricated - (v.rescueStart || v.extricated))}`);
  L.push(`${v.state === 'fallecida' ? '🖤' : '💚'} *V9* Estado: ${cond}${v.color ? ' · triaje ' + v.color.toUpperCase() : ''}`);
  if (v.injury) L.push(`🩹 *V10* Lesiones: ${V_INJURY[v.injury]}${v.tourniquet ? ' · torniquete ' + fmtHour(v.tourniquet) : ''}`);
  if (v.handed) L.push(`🤝 *V11* Entregada a: ${v.handed}`, ...(v.handedContact ? [`👤 *V12* Recibe: ${v.handedContact}`] : []));
  if (v.notes) L.push(`📝 *V14* Otra información: ${v.notes}`);
  L.push('', `🔒 _V4 Datos personales: ${v.info ? 'en la app, solo para la autoridad' : 'no recogidos'}_`);
  return L.join('\n');
}
