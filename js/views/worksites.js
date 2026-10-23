'use strict';
// USAR 242 · Worksites (lugares de trabajo): identificación INSARAG, triaje A–D, niveles ASR, evaluación estructural y marcaje

const CAT_ORDER = { A: 0, B: 1, C: 2, D: 3 };
const WS_ORDER = { active: 0, pending: 1, done: 2 };
function worksitesOf(mid) {
  return list('worksites').filter(w => w.mission === mid).sort((a, b) =>
    (WS_ORDER[a.status] ?? 1) - (WS_ORDER[b.status] ?? 1) || (CAT_ORDER[a.cat] ?? 9) - (CAT_ORDER[b.cat] ?? 9) || a.code.localeCompare(b.code, 'es', { numeric: true }));
}
const wsCode = w => `${(w.sector || 'A').toUpperCase()}-${w.num}${w.sub || ''}`;
const catTag = cat => cat ? `<span class="tag cat ${TRIAGE[cat][1]}" title="${esc(TRIAGE[cat][0])}">Cat. ${cat}</span>` : '<span class="tag neutral">Sin triaje</span>';
const lastAsr = w => (w.asr || []).reduce((mx, r) => Math.max(mx, +r.level), 0);

function tabWorksites(m) {
  const w = prefs.ws && get('worksites', prefs.ws);
  if (w && w.mission === m.id) return worksiteDetail(w);
  const ws = worksitesOf(m.id);
  const rcm = m.rcm || [];
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><div><h3 class="sec-title" style="margin:0">${ic('building')} Worksites</h3>
        </div>
        <button class="btn btn-a" onclick="worksiteForm('${m.id}')">${ic('plus')} Worksite</button></div>
      ${ws.length ? `<div class="grid g2">${ws.map(w => {
        const vs = victimsOf(m.id).filter(v => v.worksite === w.id);
        const left = vs.filter(v => !['extraida', 'entregada'].includes(v.status)).length;
        return `
        <button class="ws-card" onclick="setPref({ ws: '${w.id}' }); scrollTo(0, 0)">
          <span class="ws-code">${esc(w.code)}</span>
          <div class="grow">
            <div class="row" style="gap:6px">${catTag(w.cat)}<span class="tag ${WS_STATUS[w.status][1]}">${WS_STATUS[w.status][0]}</span>${lastAsr(w) ? `<span class="tag neutral">ASR ${lastAsr(w)}</span>` : ''}</div>
            <small>${esc([w.address, w.use, w.collapse].filter(Boolean).join(' · ') || 'Sin datos')}</small>
            <small>${vs.length ? `${vs.length} víctimas${left ? `, ${left} pendientes` : ''}` : 'Sin víctimas registradas'}${w.missing ? ` · ${w.missing} desaparecidos` : ''}</small>
          </div>
        </button>`; }).join('')}</div>`
      : `<p class="muted">Cada edificio o zona colapsada donde puede haber víctimas es un worksite. Se nombra con la letra del sector y un número (A-1, A-2…); si es grande se divide (A-2a, A-2b).</p>`}
    </div>

    ${croquisPanel(m)}
    ${sectorsPanel(m)}

    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('checkc')} Marcaje rápido (RCM)</h3>
        <p class="muted">Lugares revisados sin víctimas vivas: así nadie los vuelve a buscar.</p></div>
        <button class="btn btn-g btn-sm" onclick="rcmForm('${m.id}')">${ic('plus')} Lugar</button></div>
      ${rcm.length ? `<div class="list">${rcm.map((r, i) => `
        <div class="item"><div class="who-row"><span class="rcm-mini"><span>${r.letter}</span></span><div><b>${esc(r.place)}</b><small>${r.letter === 'C' ? 'Despejado' : 'Solo fallecidos'} · ${esc(r.team)} · ${fmtDate(r.date)}</small></div></div>
          <button class="link bad" onclick="if (confirm('¿Quitar este lugar?')) { const m = mget('${m.id}'); saveMission(m, { rcm: m.rcm.filter((_, j) => j !== ${i}) }, 'marcaje rápido quitado'); }">Quitar</button></div>`).join('')}</div>`
        : '<p class="muted">Rombo con C (despejado) o D (solo fallecidos), con el equipo y la fecha debajo.</p>'}
    </div>`;
}

function rcmForm(mid) {
  openForm('Marcaje rápido', [
    { k: 'place', label: 'Lugar u objeto revisado', required: true, wide: true, placeholder: 'Ej: Nave 3, coche calle Real' },
    { k: 'letter', label: 'Resultado', value: 'C', options: [['C', 'C · Despejado'], ['D', 'D · Solo fallecidos']] },
    { k: 'date', label: 'Fecha', type: 'date', value: todayISO() }
  ], v => {
    const m = mget(mid);
    saveMission(m, { rcm: [...(m.rcm || []), { ...v, team: teamCode() }] }, `marcaje rápido ${v.letter} en ${v.place}`);
    openModal('Marcaje rápido', `<div class="mark">${rcmSvg(v.letter, teamCode(), v.date)}</div><p class="muted center">Píntalo de unos 20 × 20 cm en el sitio más visible.</p>`);
  });
}

// Letras de sector INSARAG: A–Z sin la I ni la O (se confunden con 1 y 0)
const SECTOR_LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
function worksiteForm(mid, id) {
  const all = list('worksites').filter(w => w.mission === mid);
  const w = get('worksites', id) || { sector: prefs.last?.wsSector || 'A', status: 'pending' };
  const nextNum = s => 1 + all.filter(x => (x.sector || 'A').toUpperCase() === s.toUpperCase() && x.id !== id).reduce((mx, x) => Math.max(mx, +x.num || 0), 0);
  openForm(id ? `Editar ${w.code}` : 'Nuevo worksite', [
    { k: 'sector', label: 'Sector (letra)', value: (w.sector || 'A').toUpperCase(), required: true, carry: 'wsSector',
      options: [...new Set([...(mget(mid).sectors || []).map(s => s.letter.toUpperCase()), ...SECTOR_LETTERS, (w.sector || 'A').toUpperCase()])].map(l => [l, (mget(mid).sectors || []).find(s => s.letter.toUpperCase() === l) ? `${l} · ${(mget(mid).sectors || []).find(s => s.letter.toUpperCase() === l).name || 'sector definido'}` : l]) },
    { k: 'num', label: 'Número', value: w.num ? String(w.num) : '', options: [['', 'Automático (el siguiente libre)'], ...Array.from({ length: 40 }, (_, i) => [String(i + 1), String(i + 1)])] },
    { k: 'sub', label: 'Subdivisión (si es grande)', value: w.sub || '', options: [['', 'Sin subdivisión'], ...'abcdefgh'.split('').map(l => [l, l])] },
    { k: 'status', label: 'Estado', value: w.status, options: Object.entries(WS_STATUS).map(([k, [l]]) => [k, l]) },
    { k: 'address', label: 'Dirección o referencia', value: w.address, wide: true, placeholder: 'Ej: Calle Real 12 / Edificio 1, fábrica' },
    { k: 'pos', label: 'Coordenadas (lat/lon, UTM o MGRS)', value: w.lat && w.lon ? fmtCoord(w.lat, w.lon) : '', wide: true, placeholder: coordFmt() === 'mgrs' ? '28R DS 57150 10960' : coordFmt() === 'utm' ? '28R 457151 3110960' : '28.12350, -15.43630' },
    { k: 'use', label: 'Uso del edificio', value: w.use, catalog: 'buildUse', carry: 'wsUse' },
    { k: 'construction', label: 'Construcción', value: w.construction, catalog: 'construction', carry: 'wsConstruction' },
    { k: 'floors', label: 'Plantas', type: 'number', value: w.floors },
    { k: 'basements', label: 'Sótanos', type: 'number', value: w.basements },
    { k: 'size', label: 'Planta (m × m)', value: w.size, placeholder: '25 × 40' },
    { k: 'damage', label: 'Daño (%)', type: 'number', value: w.damage },
    { k: 'collapse', label: 'Tipo de colapso', value: w.collapse, catalog: 'collapse', wide: true },
    { k: 'missing', label: 'Desaparecidos', type: 'number', value: w.missing },
    { k: 'live', label: 'Vivas confirmadas', type: 'number', value: w.live },
    { k: 'hazards', label: 'Riesgos para el marcaje (puedes marcar varios)', type: 'checks', catalog: 'hazards', value: String(w.hazards || '').split(',').map(x => x.trim()).filter(Boolean), wide: true },
    { k: 'team', label: 'Equipo asignado', value: w.team, options: [['', 'Sin asignar'], ...(mget(mid).teams || []).map(t => [t.id, t.name])], wide: true },
    { k: 'notes', label: 'Notas', type: 'textarea', rows: 3, value: w.notes, wide: true }
  ], v => {
    const pos = v.pos ? parseCoord(v.pos) : null;
    if (v.pos && !pos) return toast('No entiendo esas coordenadas. Ej: 28.1235, -15.4363 · 28R 457151 3110960 · 28R DS 57150 10960', 'bad');
    v.lat = pos ? pos[0].toFixed(6) : ''; v.lon = pos ? pos[1].toFixed(6) : ''; delete v.pos;
    v.hazards = v.hazards.join(', ');
    const rec = { ...(w.id ? w : { id: uid('WS'), mission: mid, asr: [], ops: [], eval: {}, created: Date.now() }), ...v,
      sector: (v.sector || 'A').trim().toUpperCase().slice(0, 2), num: +v.num || nextNum(v.sector || 'A'), sub: v.sub.toLowerCase() };
    rec.code = wsCode(rec);
    const dup = all.find(x => x.code === rec.code && x.id !== rec.id);
    if (dup) return toast(`Ya existe el worksite ${rec.code}`, 'bad');
    put('worksites', rec, `${mget(mid).title}: worksite ${rec.code} ${id ? 'editado' : 'creado'}`);
    if (!id) { setPref({ ws: rec.id }); if (!rec.cat) setTimeout(() => triageWizard(rec.id), 200); }
  }, `<button type="button" class="btn btn-g span2" onclick="fillLocation(this)">${ic('locate')} Usar mi ubicación</button>` +
    (id ? `<button type="button" class="btn btn-bad span2" onclick="deleteWorksite('${id}')">${ic('trash')} Eliminar worksite</button>` : ''));
}

function fillLocation(btn) {
  if (!navigator.geolocation) return toast('Este dispositivo no da la ubicación', 'bad');
  btn.disabled = true; btn.lastChild.textContent = ' Buscando…';
  navigator.geolocation.getCurrentPosition(p => {
    const f = $('modalForm');
    f.pos.value = fmtCoord(p.coords.latitude, p.coords.longitude);
    btn.disabled = false; btn.lastChild.textContent = ` Ubicación añadida (±${Math.round(p.coords.accuracy)} m)`;
  }, () => { btn.disabled = false; btn.lastChild.textContent = ' Usar mi ubicación'; toast('No se pudo obtener la ubicación', 'bad'); },
  { enableHighAccuracy: true, timeout: 15000 });
}

function deleteWorksite(id) {
  const w = get('worksites', id);
  if (!confirm(`¿Eliminar el worksite ${w.code}? Sus víctimas quedarán sin worksite.`)) return;
  closeModal();
  remove('worksites', id, `Worksite ${w.code} eliminado`);
  setPref({ ws: null });
}

/* ---------- Triaje del worksite (Manual de Campo USAR 2023 / INSARAG) ---------- */
function triageWizard(id, step = 'live') {
  const w = get('worksites', id);
  const steps = {
    live: ['¿Hay víctimas vivas confirmadas?', 'Alguien las ve, las oye o responde a la llamada.', [['Sí', 'time'], ['No', 'possible']]],
    time: ['¿El rescate durará menos de 12 horas?', 'Cuenta el tiempo de acceso, apuntalamiento y extracción.', [['Sí, menos de 12 h', 'A'], ['No, más de 12 h', 'B']]],
    possible: ['¿Puede haber víctimas vivas?', 'Desaparecidos sin localizar o huecos de vida (grandes: se puede gatear; pequeños: hay que estar tumbado).', [['Sí', 'C'], ['No', 'dead']]],
    dead: ['¿Hay víctimas fallecidas?', '', [['Sí, solo fallecidos', 'D'], ['No', 'none']]]
  };
  if (TRIAGE[step]) {
    put('worksites', { ...w, cat: step, triagedAt: Date.now() }, `Worksite ${w.code}: categoría ${step}`);
    addEntry(w.mission, null, `Triaje ${w.code}: categoría ${step} (${TRIAGE[step][0].toLowerCase()})`);
    return openModal(`Categoría ${step}`, `
      <div class="verdict ${TRIAGE[step][1] === 'neutral' ? '' : TRIAGE[step][1]}"><b>Categoría ${step}</b><span>${TRIAGE[step][0]}</span></div>
      <p class="muted" style="margin:12px 0">Prioridad de A (más alta) a D. Ajusta también por: número de víctimas, tipo de construcción, tamaño, recursos y tiempo, réplicas, edad de las víctimas (colegio, residencia) y lo que pida la autoridad local.</p>
      <button class="btn btn-a full" onclick="closeModal()">${ic('check')} Hecho</button>`);
  }
  if (step === 'none') return openModal('No es un worksite', `
    <p>No hay víctimas: no se le asigna código. Usa el marcaje rápido con <b>C</b> (despejado) y sigue con el siguiente edificio.</p>
    <div class="row" style="margin-top:14px"><button class="btn btn-a" onclick="closeModal(); rcmForm('${w.mission}')">Marcaje rápido</button>
    <button class="btn btn-g" onclick="closeModal()">Cerrar</button></div>`);
  const [q, help, answers] = steps[step];
  openModal(`Triaje de ${w.code}`, `
    <p class="tri-q">${q}</p>${help ? `<p class="muted" style="margin-top:6px">${help}</p>` : ''}
    <div class="stack" style="margin-top:16px">${answers.map(([label, next]) => `<button class="btn btn-g full tri-a" onclick="triageWizard('${id}', '${next}')">${label}</button>`).join('')}</div>`);
}

/* ---------- Ficha del worksite ---------- */
function worksiteDetail(w) {
  const m = mget(w.mission), vs = victimsOf(m.id).filter(v => v.worksite === w.id);
  const team = (m.teams || []).find(t => t.id === w.team);
  const field = (k, v) => v || v === 0 ? `<dt>${k}</dt><dd>${v}</dd>` : '';
  const evalDone = STRUCT_EVAL.filter(([k]) => (w.eval || {})[k]).length;
  return `
    <button class="link" onclick="setPref({ ws: null })">${ic('back', 'i-sm')} Todos los worksites</button>
    <div class="panel">
      <div class="between top">
        <div><span class="ws-code big">${esc(w.code)}</span>
          <div class="row" style="gap:6px; margin-top:8px">${catTag(w.cat)}<span class="tag ${WS_STATUS[w.status][1]}">${WS_STATUS[w.status][0]}</span></div></div>
        <button class="btn btn-g btn-sm" onclick="worksiteForm('${m.id}', '${w.id}')">${ic('pencil')} Editar</button>
      </div>
      ${w.cat ? `<p class="muted" style="margin-top:8px">${TRIAGE[w.cat][0]}</p>` : ''}
      <dl class="dl" style="margin-top:12px">
        ${field('Dirección', w.address ? esc(w.address) : '')}
        ${field('Coordenadas', w.lat && w.lon ? `<a class="ext" target="_blank" rel="noopener" href="${mapsUrl(w.lat + ',' + w.lon)}">${esc(fmtCoord(w.lat, w.lon))} ↗</a><br><small class="muted">${allCoords(w.lat, w.lon).filter(x => x !== fmtCoord(w.lat, w.lon)).map(esc).join(' · ')}</small>` : '')}
        ${field('Uso', esc(w.use))}${field('Construcción', esc(w.construction))}
        ${field('Plantas', w.floors ? esc(w.floors) + (w.basements ? ` + ${esc(w.basements)} sótanos` : '') : '')}
        ${field('Planta', esc(w.size))}${field('Colapso', esc(w.collapse))}${field('Daño', w.damage ? esc(w.damage) + ' %' : '')}
        ${field('Desaparecidos', esc(w.missing))}${field('Vivas confirmadas', esc(w.live))}
        ${field('Equipo', team ? esc(team.name) : '')}
      </dl>
      ${w.notes ? `<p class="pre muted">${esc(w.notes)}</p>` : ''}
      <div class="row" style="margin-top:12px">
        ${w.status === 'pending' ? `<button class="btn btn-a" onclick="wsStatus('${w.id}', 'active')">${ic('play')} Empezar trabajo</button>` : ''}
        ${w.status === 'active' ? `<button class="btn btn-a" onclick="wsStatus('${w.id}', 'done')">${ic('check')} Terminar</button>` : ''}
        ${w.status === 'done' ? `<button class="btn btn-g" onclick="wsStatus('${w.id}', 'active')">${ic('refresh')} Reabrir</button>` : ''}
        <button class="btn btn-g" onclick="triageWizard('${w.id}')">${ic('route')} ${w.cat ? 'Repetir triaje' : 'Hacer triaje'}</button>
        <button class="btn btn-g" onclick="shareText(worksiteReportText(get('worksites', '${w.id}')), ${jsq('Resumen ' + w.code)})">${ic('share')} Resumen</button>
      </div>
    </div>

    <div class="grid g2">
      <div class="panel">
        <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('pencil')} Marcaje en la fachada</h3>
          <button class="btn btn-g btn-sm" onclick="asrForm('${w.id}')">${ic('plus')} Nivel ASR</button></div>
        <div class="mark">${worksiteMarkSvg(w)}</div>
        <p class="muted">Caja de 1,2 × 1 m cerca de la entrada. Dentro: código (letras de 40 cm), equipo, nivel ASR y fecha. Encima, los riesgos; debajo, la categoría. Al terminar, línea horizontal.</p>
      </div>
      <div class="panel">
        <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('heart')} Víctimas (${vs.length})</h3>
          <button class="btn btn-a btn-sm" onclick="victimForm('${m.id}', null, '${w.id}')">${ic('plus')} Víctima</button></div>
        ${vs.length ? `<div class="mark small">${victimMarkSvg(vs)}</div><div class="list">${vs.map(victimRow).join('')}</div>`
          : '<p class="muted">Cuando localices a alguien, regístralo aquí: la marca V con L (vivas) y D (fallecidas) se actualiza sola.</p>'}
      </div>
    </div>

    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('wrench')} Trabajos necesarios</h3>
        <button class="btn btn-g btn-sm" onclick="opsForm('${w.id}')">${ic('pencil')} Editar</button></div>
      <div class="row tags">${WS_OPS.map(([k, l]) => `<span class="tag ${(w.ops || []).includes(k) ? 'info' : 'neutral'}">${(w.ops || []).includes(k) ? ic('check', 'i-sm') : ''} ${l}</span>`).join('')}</div>
      ${w.estimate ? `<p class="pre" style="margin-top:10px">${esc(w.estimate)}</p>` : ''}
    </div>

    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('building')} Evaluación estructural</h3>
        <button class="btn btn-g btn-sm" onclick="evalForm('${w.id}')">${ic('pencil')} ${evalDone}/${STRUCT_EVAL.length}</button></div>
      <div class="grid g2">${STRUCT_EVAL.map(([k, name, hint]) => `<div><b class="lbl-sm">${name}</b><p class="pre">${esc((w.eval || {})[k]) || `<span class="dim">${hint}</span>`}</p></div>`).join('')}</div>
      <details style="margin-top:12px"><summary class="link">Cómo se nombran lados, cuadrantes y plantas</summary>
        <div class="mark small" style="margin-top:10px">${orientationSvg()}</div>
        <p class="muted">Lado 1 = fachada a la calle; el resto en sentido horario. Cuadrante A = parte izquierda del lado 1, luego B, C y D en sentido horario; E = núcleo central (escaleras, ascensores). Plantas: nivel de calle, Planta 1, Planta 2…; Sótano 1, Sótano 2… Columnas: A1, B1… desde la izquierda del lado 1.</p>
      </details>
    </div>

    ${photosPanel(`ws:${w.id}`, w.photos || [], `takePhoto('${m.id}', '${w.id}')`)}
    ${periodsPanel(w)}
    ${monitorsPanel(w)}

    <div class="panel">
      <h3 class="sec-title">${ic('history')} Historial ASR</h3>
      ${(w.asr || []).length ? `<div class="list">${w.asr.map((r, i) => `<div class="item"><div><b>ASR ${r.level} · ${esc(ASR[r.level - 1][1])}</b><small>${esc(r.team)} · ${fmtDate(r.date)}</small></div>
        <button class="link bad" onclick="if (confirm('¿Quitar este nivel?')) { const w = get('worksites', '${w.id}'); put('worksites', { ...w, asr: w.asr.filter((_, j) => j !== ${i}) }); }">Quitar</button></div>`).join('')}</div>`
        : '<p class="muted">Anota cada nivel de evaluación, búsqueda y rescate que se haga aquí. Se añade al marcaje.</p>'}
    </div>`;
}

function wsStatus(id, status) {
  const w = get('worksites', id);
  if (status === 'done') {
    const left = victimsOf(w.mission).filter(v => v.worksite === id && !['extraida', 'entregada'].includes(v.status)).length;
    if (left && !confirm(`Quedan ${left} víctimas sin extraer en ${w.code}. ¿Terminar igualmente?`)) return;
  }
  put('worksites', { ...w, status }, `Worksite ${w.code}: ${WS_STATUS[status][0].toLowerCase()}`);
  addEntry(w.mission, null, `Worksite ${w.code}: ${WS_STATUS[status][0].toLowerCase()}`);
  if (status === 'done') toast('Pinta la línea horizontal en el marcaje');
}

function asrForm(id) {
  const w = get('worksites', id);
  openForm(`Nivel ASR en ${w.code}`, [
    { k: 'level', label: 'Nivel', value: Math.min(5, Math.max(2, lastAsr(w) + 1)), options: ASR.map(([n, name]) => [n, `ASR ${n} · ${name}`]), wide: true },
    { k: 'team', label: 'Equipo', value: teamCode() },
    { k: 'date', label: 'Fecha', type: 'date', value: todayISO() }
  ], v => {
    put('worksites', { ...w, asr: [...(w.asr || []), { ...v, level: +v.level }] }, `Worksite ${w.code}: ASR ${v.level}`);
    addEntry(w.mission, null, `${w.code}: ASR ${v.level} (${ASR[v.level - 1][1].toLowerCase()})`);
  }, `<p class="muted wide">${ASR.map(([n, , d]) => `<b>${n}</b>: ${d}`).join('<br>')}</p>`);
}

function opsForm(id) {
  const w = get('worksites', id);
  openForm(`Trabajos en ${w.code}`, [
    { k: 'ops', label: 'Qué hará falta', type: 'checks', value: w.ops, options: WS_OPS, wide: true },
    { k: 'estimate', label: 'Estimación de tiempo, personal y material', type: 'textarea', rows: 4, value: w.estimate, wide: true, placeholder: 'Ej: 2 equipos de 5, 6 h. Apuntalamiento en T y corte limpio de forjado.' }
  ], v => put('worksites', { ...w, ...v }, `Worksite ${w.code}: trabajos actualizados`));
}

function evalForm(id) {
  const w = get('worksites', id);
  openForm(`Evaluación estructural de ${w.code}`, STRUCT_EVAL.map(([k, name, hint]) => ({ k, label: name, type: 'textarea', rows: 2, value: (w.eval || {})[k], wide: true, placeholder: hint })),
    v => put('worksites', { ...w, eval: v }, `Worksite ${w.code}: evaluación estructural`));
}

// Informe del worksite (formulario X de INSARAG, simplificado)
function worksiteReportText(w) {
  const vs = victimsOf(w.mission).filter(v => v.worksite === w.id);
  const out = vs.filter(v => ['extraida', 'entregada'].includes(v.status));
  const L = [`*Informe de worksite ${w.code}* · ${teamCode()}`, fmtWhen(Date.now()), ''];
  if (w.address) L.push(`📍 ${w.address}`);
  if (w.lat && w.lon) L.push(`GPS ${allCoords(w.lat, w.lon).join(' · ')}`);
  L.push(`Categoría: ${w.cat ? `${w.cat} (${TRIAGE[w.cat][0].toLowerCase()})` : 'sin triaje'} · Estado: ${WS_STATUS[w.status][0].toLowerCase()}`);
  if ((w.asr || []).length) L.push(`ASR: ${w.asr.map(r => `${r.level} (${r.team}, ${markDate(r.date)})`).join(', ')}`);
  L.push(`Edificio: ${[w.use, w.construction, w.floors && w.floors + ' plantas', w.collapse, w.damage && w.damage + ' % daño'].filter(Boolean).join(', ') || '—'}`);
  if (w.hazards) L.push(`⚠️ Riesgos: ${w.hazards}`);
  L.push('', `Rescatados vivos: ${out.filter(v => v.state === 'viva').length} · Fallecidos recuperados: ${out.filter(v => v.state === 'fallecida').length}`);
  L.push(`Siguen desaparecidos: ${Math.max(0, (+w.missing || 0) - out.length)} · Contactos vivos en curso: ${vs.filter(v => v.state === 'viva' && !out.includes(v)).length}`);
  if ((w.ops || []).length) L.push(`Trabajos: ${w.ops.map(k => WS_OPS.find(o => o[0] === k)[1]).join(', ')}`);
  if (w.estimate) L.push(`Plan: ${w.estimate}`);
  if (out.length) L.push(`Fichas de extracción: ${out.map(victimRef).join(', ')}`);
  return L.join('\n');
}

/* ---------- Sectores (evaluación extensa, ASR 1) ---------- */
const SECTOR_STATUS = { pendiente: ['Sin evaluar', 'warn'], curso: ['Evaluando (ASR 2)', 'info'], hecho: ['Evaluado', 'ok'] };
function sectorsPanel(m) {
  const ss = m.sectors || [], ws = worksitesOf(m.id);
  return `
    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('layers')} Sectores</h3>
        <p class="muted">Evaluación extensa (ASR 1): reparte la zona en sectores con letra. No se usan la I ni la O.</p></div>
        <button class="btn btn-g btn-sm" onclick="sectorForm('${m.id}')">${ic('plus')} Sector</button></div>
      ${ss.length ? `<div class="list">${ss.map((s, i) => { const n = ws.filter(w => w.sector === s.letter).length; return `
        <button class="item" onclick="sectorForm('${m.id}', ${i})"><div class="who-row"><span class="ws-code" style="min-width:36px">${esc(s.letter)}</span>
          <div><b>${esc(s.name || 'Sector ' + s.letter)}</b><small>${n} worksites${s.notes ? ' · ' + esc(s.notes) : ''}</small></div></div>
          <span class="tag ${SECTOR_STATUS[s.status][1]}">${SECTOR_STATUS[s.status][0]}</span></button>`; }).join('')}</div>`
        : '<p class="muted">En una intervención pequeña basta con el sector A.</p>'}
    </div>`;
}
function sectorForm(mid, i) {
  const m = mget(mid), s = i != null ? m.sectors[i] : {};
  const used = (m.sectors || []).map(x => x.letter);
  const next = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('').find(l => !used.includes(l)) || '';
  openForm(i != null ? `Sector ${s.letter}` : 'Nuevo sector', [
    { k: 'letter', label: 'Letra', value: s.letter || next, required: true },
    { k: 'status', label: 'Estado', value: s.status || 'pendiente', options: Object.entries(SECTOR_STATUS).map(([k, [l]]) => [k, l]) },
    { k: 'name', label: 'Nombre o referencia', value: s.name, wide: true, placeholder: 'Ej: Telde centro, entre C/ Real y la plaza' },
    { k: 'notes', label: 'Evaluación (daños, accesos, población)', type: 'textarea', rows: 3, value: s.notes, wide: true }
  ], v => {
    const letter = v.letter.trim().toUpperCase().slice(0, 2);
    if (['I', 'O'].includes(letter)) return toast('No se usan la I ni la O (se confunden con 1 y 0)', 'bad');
    if (used.includes(letter) && letter !== s.letter) return toast(`Ya existe el sector ${letter}`, 'bad');
    const sectors = [...(m.sectors || [])], rec = { ...v, letter };
    if (i != null) sectors[i] = rec; else sectors.push(rec);
    saveMission(m, { sectors: sectors.sort((a, b) => a.letter.localeCompare(b.letter)) }, `sector ${letter}: ${SECTOR_STATUS[v.status][0].toLowerCase()}`);
  });
}

/* ---------- Informe del worksite por periodo operativo (formulario INSARAG, campos G) ---------- */
function periodsPanel(w) {
  const ps = w.periods || [];
  return `
    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('file')} Informes por periodo</h3>
        <p class="muted">Uno por periodo operativo (8, 12 o 24 h). Es el documento de relevo con otro equipo.</p></div>
        <button class="btn btn-a btn-sm" onclick="periodForm('${w.id}')">${ic('plus')} Informe</button></div>
      ${ps.length ? `<div class="list">${[...ps].reverse().map(p => `
        <button class="item" onclick="shareText(periodText(get('worksites', '${w.id}'), ${p.n}), ${jsq('Informe ' + w.code + ' nº ' + p.n)})">
          <div><b>Nº ${p.n} · ${fmtWhen(p.start)} → ${fmtWhen(p.end)}</b><small>ASR ${p.asr} ${p.asrDone ? 'completado' : 'en curso'} · ${p.live} vivos, ${p.dead} fallecidos · ${p.complete ? 'asignación completa' : 'sigue'}</small></div>${ic('share', 'i-sm')}</button>`).join('')}</div>`
        : '<p class="muted">Sin informes todavía.</p>'}
    </div>`;
}

function periodForm(id) {
  const w = get('worksites', id), ps = w.periods || [];
  const toLocal = ts => new Date(ts - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  const start = ps.length ? ps[ps.length - 1].end : (mget(w.mission).startedAt || w.created || Date.now());
  openForm(`Informe de ${w.code} · nº ${ps.length + 1}`, [
    { k: 'start', label: 'G1–G2 Inicio del periodo', type: 'datetime-local', value: toLocal(start) },
    { k: 'end', label: 'G13–G14 Fin del periodo', type: 'datetime-local', value: toLocal(Date.now()) },
    { k: 'asr', label: 'G5 Nivel ASR', value: Math.max(3, lastAsr(w)), options: [[3, 'ASR 3'], [4, 'ASR 4'], [5, 'ASR 5']] },
    { k: 'asrDone', label: 'G6 Estado', value: '', options: [['', 'En curso'], ['1', 'Completado']] },
    { k: 'other', label: 'G9 Otras actividades', value: '', wide: true, placeholder: 'Ej: Apuntalamiento extenso, grúa local' },
    { k: 'release', label: 'G10 Recursos que se pueden liberar', value: '', wide: true },
    { k: 'safety', label: 'G11 Seguridad local', value: w.hazards, wide: true },
    { k: 'contacts', label: 'G12 Contactos en el worksite', value: '', wide: true, placeholder: 'Propietario, jefe de rescate local, gruista…' },
    { k: 'complete', label: 'G16 Asignación completa', value: '', options: [['', 'No'], ['1', 'Sí']] },
    { k: 'eta', label: 'G21–G22 Fin estimado', type: 'datetime-local', value: '' },
    { k: 'plan', label: 'G19 Plan para el siguiente periodo', type: 'textarea', rows: 3, wide: true },
    { k: 'logistics', label: 'G20 Necesidades logísticas', type: 'textarea', rows: 2, wide: true }
  ], v => {
    const s = new Date(v.start).getTime(), e = new Date(v.end).getTime();
    const vs = victimsOf(w.mission).filter(x => x.worksite === id);
    const inPeriod = vs.filter(x => x.extricated && x.extricated > s && x.extricated <= e);
    const out = vs.filter(isOut);
    const rec = { ...v, n: ps.length + 1, start: s, end: e, asr: +v.asr, asrDone: !!v.asrDone, complete: !!v.complete, eta: v.eta ? new Date(v.eta).getTime() : null,
      live: inPeriod.filter(x => x.state === 'viva').length, dead: inPeriod.filter(x => x.state === 'fallecida').length,
      missing: Math.max(0, (+w.missing || 0) - out.length), contacts_live: vs.filter(x => x.state === 'viva' && !isOut(x)).length,
      refs: out.map(victimRef), by: prefs.activeOperator };
    put('worksites', { ...w, periods: [...ps, rec], ...(rec.complete ? { status: 'done' } : {}) }, `Worksite ${w.code}: informe de periodo nº ${rec.n}`);
    addEntry(w.mission, null, `Informe de periodo nº ${rec.n} de ${w.code}${rec.complete ? ' (asignación completa)' : ''}`);
    shareText(periodText(get('worksites', id), rec.n), `Informe ${w.code} nº ${rec.n}`);
  });
}

function periodText(w, n) {
  const p = (w.periods || []).find(x => x.n === n);
  const L = [`*Informe de worksite (INSARAG) · ${w.code} · nº ${p.n}*`, `G3 Equipo: ${teamCode()}`,
    `E1 Worksite: ${w.code}${w.lat ? ` · E2 GPS (WGS84): ${w.lat}, ${w.lon} · MGRS ${toMGRS(+w.lat, +w.lon)}` : ''}${w.address ? ` · E3 ${w.address}` : ''}`,
    `G1–G2 Inicio: ${fmtWhen(p.start)} · G13–G14 Fin: ${fmtWhen(p.end)}`,
    `G5 ASR ${p.asr} · G6 ${p.asrDone ? 'completado' : 'en curso'}`,
    `G7 Rescates con vida en el periodo: ${p.live} · G8 Fallecidos recuperados: ${p.dead}`];
  if (p.other) L.push(`G9 Otras actividades: ${p.other}`);
  if (p.release) L.push(`G10 Recursos que se pueden liberar: ${p.release}`);
  if (p.safety) L.push(`G11 Seguridad: ${p.safety}`);
  if (p.contacts) L.push(`G12 Contactos: ${p.contacts}`);
  L.push(`G16 Asignación completa: ${p.complete ? 'Sí' : 'No'}`, `G17 Siguen desaparecidos: ${p.missing} · G18 Contactos vivos / rescates en curso: ${p.contacts_live}`);
  if (p.plan) L.push(`G19 Plan: ${p.plan}`);
  if (p.logistics) L.push(`G20 Necesidades: ${p.logistics}`);
  if (p.eta) L.push(`G21–G22 Fin estimado: ${fmtWhen(p.eta)}`);
  if (p.refs.length) L.push(`G23 Fichas de extracción: ${p.refs.join(', ')}`);
  L.push(`Completado por: ${p.by}`);
  return L.join('\n');
}

/* ---------- Vigilancia estructural: testigos, apuntalamientos e inclinación ---------- */
const MONITOR_TYPES = { 'Testigo de grieta': 2, 'Apuntalamiento': 12, 'Inclinación / desplome': 2, 'Otro': 4 };   // horas entre revisiones
const lastCheck = x => (x.checks || [])[(x.checks || []).length - 1];
function monitorsDue(w) {
  const shock = mget(w.mission)?.aftershock || 0;
  return (w.monitors || []).filter(x => { const c = lastCheck(x); return !c || c.ts < shock || Date.now() - c.ts > x.every * 3.6e6; });
}
function monitorsPanel(w) {
  const due = new Set(monitorsDue(w).map(x => x.id));
  return `
    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('gauge')} Vigilancia estructural</h3>
        <p class="muted">Testigos de grietas, apuntalamientos e inclinación. Apuntalamientos cada 12 h y siempre tras una réplica.</p></div>
        <button class="btn btn-g btn-sm" onclick="monitorForm('${w.id}')">${ic('plus')} Punto</button></div>
      ${(w.monitors || []).length ? `<div class="list">${w.monitors.map(x => { const c = lastCheck(x); return `
        <button class="item ${due.has(x.id) ? 'over' : ''}" onclick="monitorCheck('${w.id}', '${x.id}')"><div><b>${esc(x.type)} · ${esc(x.place)}</b>
          <small>${c ? `Revisado ${fmtWhen(c.ts)} por ${esc(c.by)}${c.value ? ' · ' + esc(c.value) : ''}${c.changed ? ' · HA CAMBIADO' : ''}` : 'Sin revisar'} · cada ${x.every} h</small></div>
          <span class="tag ${due.has(x.id) ? 'bad' : c?.changed ? 'warn' : 'ok'}">${due.has(x.id) ? 'Revisar' : c?.changed ? 'Cambio' : 'OK'}</span></button>`; }).join('')}</div>`
        : '<p class="muted">Marca cada testigo con una X, su fecha y su anchura. Si cambia, para y evalúa.</p>'}
    </div>`;
}
function monitorForm(wid) {
  openForm('Nuevo punto de vigilancia', [
    { k: 'type', label: 'Tipo', options: Object.keys(MONITOR_TYPES).map(t => [t, t]) },
    { k: 'every', label: 'Revisar cada (h)', type: 'number', value: '' },
    { k: 'place', label: 'Dónde', required: true, wide: true, placeholder: 'Ej: Columna B1, planta baja, cara lado 2' },
    { k: 'value', label: 'Medida inicial', wide: true, placeholder: 'Ej: grieta 2 mm / desplome 1 cm' }
  ], v => {
    const w = get('worksites', wid);
    const rec = { id: uid('VG'), type: v.type, place: v.place, every: parseFloat(v.every) || MONITOR_TYPES[v.type], checks: [{ ts: Date.now(), value: v.value, by: prefs.activeOperator }] };
    put('worksites', { ...w, monitors: [...(w.monitors || []), rec] }, `${w.code}: vigilancia en ${v.place}`);
  });
}
function monitorCheck(wid, mid) {
  const w = get('worksites', wid), x = w.monitors.find(y => y.id === mid);
  openForm(`${x.type} · ${x.place}`, [
    { k: 'changed', label: '¿Ha cambiado?', options: [['', 'Sin cambios'], ['1', 'Ha cambiado']], wide: true },
    { k: 'value', label: 'Medida', value: lastCheck(x)?.value, wide: true },
    { k: 'note', label: 'Notas', wide: true }
  ], v => {
    const check = { ts: Date.now(), value: v.value, note: v.note, changed: !!v.changed, by: prefs.activeOperator };
    const fresh = get('worksites', wid);
    put('worksites', { ...fresh, monitors: fresh.monitors.map(y => y.id === mid ? { ...y, checks: [...(y.checks || []), check] } : y) });
    addEntry(w.mission, null, `${w.code}: ${x.type.toLowerCase()} en ${x.place} ${check.changed ? 'HA CAMBIADO' : 'sin cambios'}${v.value ? ' (' + v.value + ')' : ''}`);
    if (check.changed) toast('Ha cambiado: para el trabajo y evalúa la estructura', 'bad');
  }, `<p class="muted wide">Historial: ${(x.checks || []).slice(-5).map(c => `${fmtHour(c.ts)} ${esc(c.value || '')}${c.changed ? ' ⚠' : ''}`).join(' · ') || '—'}</p>
    <button type="button" class="btn btn-bad span2" onclick="if (confirm('¿Quitar este punto?')) { const w = get('worksites', '${wid}'); put('worksites', { ...w, monitors: w.monitors.filter(y => y.id !== '${mid}') }); closeModal(); }">${ic('trash')} Quitar</button>`);
}
