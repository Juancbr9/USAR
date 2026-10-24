'use strict';
// USAR 242 · Informes: situación (sitrep), worksites, fichas de víctimas, desmovilización y cierre (post-misión / juicio crítico)

const DEMOB = ['Recuento final de todo el personal', 'Material recogido, revisado y devuelto a su hueco', 'Averías y pérdidas anotadas en Contenedor',
  'EPI sucio a la zona sucia; manos y cara lavadas', 'Vehículos repostados y revisados', 'Marcaje final en los worksites', 'Informes enviados al mando'];
const POST = [
  ['prep', 'Preparación y movilización', 'Aviso, tiempos de salida, carga, documentación'],
  ['coord', 'Coordinación', 'Con el mando local, otros servicios y equipos'],
  ['base', 'Base y logística', 'Zona de seguridad, agua, comida, energía, relevos'],
  ['busqueda', 'Búsqueda', 'Métodos usados y qué funcionó'],
  ['rescate', 'Rescate', 'Accesos, apuntalamiento, cortes, extracción'],
  ['medica', 'Asistencia sanitaria', 'Víctimas y personal propio'],
  ['seguridad', 'Seguridad', 'Incidentes, casi accidentes, EPI'],
  ['lessons', 'Lecciones aprendidas', 'Qué repetir y qué cambiar'],
  ['recs', 'Recomendaciones', 'Material, formación, procedimientos']
];
const CRITIQUE = [
  ['goals', '¿Se cumplieron los objetivos?', ''], ['good', 'Lo que salió bien', ''], ['improve', 'Lo que hay que mejorar', ''],
  ['safety', 'Seguridad durante el ejercicio', 'Incidentes o situaciones de riesgo'], ['next', 'Próxima sesión', 'Qué practicar después']
];

function tabInformes(m) {
  const ws = worksitesOf(m.id), out = victimsOf(m.id).filter(isOut);
  const post = m.type === 'ejercicio' ? CRITIQUE : POST, data = (m.type === 'ejercicio' ? m.critique : m.post) || {};
  const checks = m.checks || {};
  return `
    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('file')} Informe de situación</h3>
        </div></div>
      <div class="row">
        <button class="btn btn-a" onclick="sitrepForm('${m.id}')">${ic('share')} Preparar y enviar</button>
        ${m.lastSitrep ? `<span class="muted">Último: ${fmtWhen(m.lastSitrep)}</span>` : ''}
      </div>
      ${(m.sitreps || []).length ? `<details style="margin-top:12px"><summary class="link">Informes enviados (${m.sitreps.length})</summary>
        <div class="list" style="margin-top:8px">${[...m.sitreps].reverse().map(s => `<div class="well"><small class="muted">${fmtWhen(s.ts)}</small><p class="pre small-text">${esc(s.text)}</p></div>`).join('')}</div></details>` : ''}
    </div>

    <div class="grid g2">
      <div class="panel">
        <h3 class="sec-title">${ic('building')} Informes de worksite</h3>
        ${ws.length ? `<div class="list">${ws.map(w => `<button class="item" onclick="shareText(worksiteReportText(get('worksites', '${w.id}')), ${jsq('Informe ' + w.code)})">
          <div><b>${esc(w.code)}</b><small>${WS_STATUS[w.status][0]}${w.cat ? ' · Cat. ' + w.cat : ''}</small></div>${ic('share', 'i-sm')}</button>`).join('')}</div>` : '<p class="muted">Sin worksites.</p>'}
      </div>
      <div class="panel">
        <h3 class="sec-title">${ic('heart')} Fichas de víctimas extraídas</h3>
        ${out.length ? `<div class="list">${out.map(v => `<button class="item" onclick="shareText(victimText(get('victims', '${v.id}')), ${jsq('Ficha ' + victimRef(v))})">
          <div class="who-row">${colorDot(v.color)}<div><b>${esc(victimRef(v))}</b><small>${V_STATE[v.state]} · ${v.handed ? 'a ' + esc(v.handed) : 'sin entregar'}</small></div></div>${ic('share', 'i-sm')}</button>`).join('')}</div>` : '<p class="muted">Ninguna todavía.</p>'}
      </div>
    </div>

    ${needsPanel(m)}
    ${avanzado() ? exportPanel(m) : ''}

    <div class="panel">
      <h3 class="sec-title">${ic('truck')} Desmovilización</h3>
      <div class="checks one">${DEMOB.map((c, j) => `<label class="check-row"><input type="checkbox" ${checks['demob.' + j] ? 'checked' : ''} onchange="toggleCheck('${m.id}', 'demob.${j}', this.checked)"><span>${c}</span></label>`).join('')}</div>
    </div>

    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('book')} ${m.type === 'ejercicio' ? 'Juicio crítico' : 'Informe post-misión'}</h3>
        <p class="muted">${m.type === 'ejercicio' ? 'Al terminar, con todo el personal: objetivos, aciertos y mejoras.' : 'Se recomienda completarlo en los 45 días siguientes.'}</p></div>
        <button class="btn btn-g btn-sm" onclick="postForm('${m.id}')">${ic('pencil')} Editar</button></div>
      <div class="stack">${m.summary ? textBlock('Resumen y lecciones (al cerrar)', m.summary) : ''}
        ${post.filter(([k]) => data[k]).map(([k, t]) => textBlock(t, data[k])).join('') || (m.summary ? '' : '<p class="muted">Todavía vacío.</p>')}</div>
      <div class="row" style="margin-top:12px"><button class="btn btn-g btn-sm" onclick="shareText(missionSummaryText(mget('${m.id}')), 'Resumen de la misión')">${ic('share', 'i-sm')} Enviar resumen de la misión</button></div>
    </div>`;
}

function postForm(mid) {
  const m = mget(mid), ex = m.type === 'ejercicio';
  const fields = ex ? CRITIQUE : POST, data = (ex ? m.critique : m.post) || {};
  openForm(ex ? 'Juicio crítico' : 'Informe post-misión', fields.map(([k, label, hint]) => ({ k, label, type: 'textarea', rows: 3, value: data[k], wide: true, placeholder: hint })),
    v => saveMission(m, { [ex ? 'critique' : 'post']: v }, ex ? 'juicio crítico guardado' : 'informe post-misión guardado'));
}

function sitrepForm(mid) {
  const m = mget(mid);
  openForm('Informe de situación', [
    { k: 'objectives', label: 'Objetivos para el próximo periodo', type: 'textarea', rows: 3, wide: true },
    { k: 'needs', label: 'Necesidades (personal, material, relevos…)', type: 'textarea', rows: 2, wide: true },
    { k: 'issues', label: 'Incidencias de seguridad', type: 'textarea', rows: 2, wide: true }
  ], v => {
    const text = sitrepText(mget(mid), v);
    const fresh = mget(mid);
    saveMission(fresh, { lastSitrep: Date.now(), sitreps: [...(fresh.sitreps || []), { ts: Date.now(), text }] }, 'informe de situación');
    shareText(text, 'Informe de situación');
  });
}

function sitrepText(m, extra = {}) {
  const since = m.lastSitrep || m.startedAt || 0;
  const ws = worksitesOf(m.id), vs = victimsOf(m.id);
  const by = st => ws.filter(w => w.status === st);
  const asrCount = (arr, n) => arr.filter(w => lastAsr(w) === n).length;
  const out = vs.filter(isOut), now = out.filter(v => (v.extricated || 0) >= since);
  const inZone = m.status === 'active' ? presence(m).filter(p => p.state === 'in').length : 0;
  const L = waHead('📋', 'USAR 242 · Informe de situación', m.title);
  L.push(`🕒 *Periodo:* ${since ? fmtWhen(since) : 'inicio'} → ${fmtWhen(Date.now())}`,
    `👥 *Equipo:* ${teamCode()} · ${missionPeople(m).length} personas (${inZone} en zona)`, `🧭 *Fase:* ${phaseOf(m).name}`);
  L.push(...waSec('🏚️', `Worksites (${ws.length})`));
  [['active', '🔨 En trabajo'], ['pending', '⏳ Pendientes'], ['done', '✅ Terminados']].forEach(([st, label]) => {
    const arr = by(st);
    if (arr.length) L.push(`• ${label}: ${arr.length} (ASR3 ${asrCount(arr, 3)}, ASR4 ${asrCount(arr, 4)}, ASR5 ${asrCount(arr, 5)}) — ${arr.map(w => w.code + (w.cat ? ' ' + w.cat : '')).join(', ')}`);
  });
  L.push('', '🧍 *Víctimas* _(periodo / total)_');
  L.push(`• 💚 Rescatadas vivas: ${now.filter(v => v.state === 'viva').length} / ${out.filter(v => v.state === 'viva').length}`);
  L.push(`• 🖤 Fallecidas recuperadas: ${now.filter(v => v.state === 'fallecida').length} / ${out.filter(v => v.state === 'fallecida').length}`);
  const pending = vs.filter(v => !isOut(v));
  if (pending.length) L.push(`• 🔎 Pendientes: ${pending.map(v => `${victimRef(v)} (${V_STATUS[v.status][0].toLowerCase()})`).join(', ')}`);
  if ((m.rcm || []).length) L.push(`• ✅ Lugares despejados (RCM): ${m.rcm.length}`);
  const hz = m.zone?.hazards || [];
  if (hz.length || extra.issues) L.push(...waSec('⚠️', 'Seguridad'), ...(hz.length ? [`Peligros: ${hz.join(', ')}`] : []), ...(extra.issues ? [extra.issues] : []));
  if (extra.objectives) L.push(...waSec('🎯', 'Próximo periodo'), extra.objectives);
  if (extra.needs) L.push(...waSec('📦', 'Necesidades'), extra.needs);
  return L.join('\n');
}

// Resumen de la misión (formulario C1 de INSARAG)
function missionSummaryText(m) {
  const out = victimsOf(m.id).filter(isOut), ws = worksitesOf(m.id);
  const L = waHead('🏁', 'USAR 242 · Resumen de la misión', m.title);
  L.push(`👥 *Equipo:* ${teamCode()}`, `⭐ *Jefe:* ${get('operators', m.chief)?.name || '—'}`);
  if (m.startedAt) L.push(`🕒 *Inicio:* ${fmtWhen(m.startedAt)}${m.endedAt ? ' · *Fin:* ' + fmtWhen(m.endedAt) + ' (' + fmtDur(m.endedAt - m.startedAt) + ')' : ''}`);
  if (m.location) L.push(`📍 *Lugar:* ${m.location}`);
  L.push(`🗺️ *Sectores:* ${[...new Set(ws.map(w => w.sector))].join(', ') || '—'} · *Worksites:* ${ws.length}`);
  L.push(...waSec('🧍', 'Víctimas'), `• 💚 Con vida extraídas: ${out.filter(v => v.state === 'viva').length}`, `• 🖤 Fallecidas recuperadas: ${out.filter(v => v.state === 'fallecida').length}`);
  const data = (m.type === 'ejercicio' ? m.critique : m.post) || {};
  if (m.summary) L.push(...waSec('📝', 'Resumen'), m.summary);
  if (data.lessons || data.improve) L.push(...waSec('💡', 'Lecciones'), data.lessons || data.improve);
  return L.join('\n');
}
