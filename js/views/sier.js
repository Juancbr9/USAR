'use strict';
// SIER 242 · Personal de toda la sección: pelotón, especialidad, empleo, equipos (RPAS, SVA y motosierristas) y presentes,
// como en la hoja de la sección. Los datos de las personas están solo en la base de datos del equipo: se cargan pegando el
// listado en «Importar personal» (nunca van en el código, que es público).

const ESP_NINGUNA = 'Sin especialidad';
const espLabel = o => opEsp(o) || ESP_NINGUNA;
const opEquipos = o => [...(o.eq || []).map(k => EQUIPOS[k]).filter(Boolean), ...(o.moto ? [`Motosierra ${o.moto.tipo === 'S' ? 'suplente' : 'titular'}`] : [])];
const motoTxt = m => m ? `${m.tipo === 'S' ? 'Suplente' : 'Titular'}${m.eq ? ` · equipo ${m.eq}` : ''}${m.aut ? ` (AUT. ${m.aut})` : ''}` : '';
const ausTxt = o => esAusente(o) ? [o.aus.motivo || 'Ausente', o.aus.hasta ? 'hasta el ' + fmtDate(o.aus.hasta) : ''].filter(Boolean).join(' ') : '';
const conEmpleo = o => [o.empleo, o.name].filter(Boolean).join(' ');
// Vistas del personal
const PVIEWS = [['peloton', 'Pelotones'], ['esp', 'Especialidades'], ['equipos', 'Equipos'], ['puestos', 'Puestos USAR']];

function personRow(p, sub) {
  const issues = readinessIssues(p.id), eb = list('epis').filter(e => e.holder === p.id && epiState(e).cls !== 'ok').length, n = issues.length + (eb ? 1 : 0), aus = esAusente(p);
  return `<button class="item ${aus ? 'pers-aus' : ''}" onclick="openPerson('${p.id}')">
    <div class="who-row">${personPhoto(p)}<div><b>${p.empleo ? `<span class="pers-emp">${esc(p.empleo)}</span> ` : ''}${esc(p.name)}</b>
      <small>${esc(sub ?? [espLabel(p) === ESP_NINGUNA ? '' : espLabel(p), ...opEquipos(p)].filter(Boolean).join(' · '))}</small>
      ${readiness(p.id).fullName ? `<small class="pers-full">${esc(readiness(p.id).fullName)}</small>` : ''}</div></div>
    ${aus ? `<span class="tag bad">${esc(ausTxt(p))}</span>` : `<span class="tag ${issues.some(i => i[0] === 'bad') ? 'bad' : n ? 'warn' : 'ok'}">${n ? n + (n === 1 ? ' aviso' : ' avisos') : 'Al día'}</span>`}
  </button>`;
}
const persPanel = (title, members, sub, extra = '') => `
  <div class="panel pers-panel">
    <div class="between sec-head"><h3>${esc(title)}</h3><span class="muted">${members.length}${members.some(esAusente) ? ` · ${members.filter(esAusente).length} ausente${members.filter(esAusente).length === 1 ? '' : 's'}` : ''}</span></div>
    ${extra}<div class="list pers-list">${members.map(p => personRow(p, sub ? sub(p) : undefined)).join('') || '<p class="muted">Nadie.</p>'}</div>
  </div>`;

function viewPersonal() {
  const o = prefs.person && get('operators', prefs.person);
  if (o) return viewPerson(o);
  const todos = operators().sort(ordenSier), haySier = todos.some(x => x.peloton);
  const view = PVIEWS.some(v => v[0] === prefs.pview) ? prefs.pview : haySier ? 'peloton' : 'puestos';
  const q = fold(prefs.persQ || ''), ops = q ? todos.filter(p => fold([p.name, p.empleo, p.peloton, opEsp(p), readiness(p.id).fullName, p.phone].join(' ')).includes(q)) : todos;
  const aus = todos.filter(esAusente), cuenta = (arr, f) => arr.map(k => `${esc(k)} <b>${todos.filter(p => f(p) === k).length}</b>`).join(' · ');
  const porGrupo = (keys, f, vacio) => [...keys, ''].map(k => [k || vacio, ops.filter(p => (f(p) || '') === k)]).filter(([, m], i) => m.length || (i < keys.length && !q));
  const paneles = {
    peloton: () => porGrupo(PELOTONES, p => p.peloton, 'Sin pelotón').map(([t, m]) => persPanel(t, m)).join(''),
    esp: () => porGrupo(ESPECIALIDADES, opEsp, ESP_NINGUNA).map(([t, m]) => persPanel(t, m, p => [p.peloton, ...opEquipos(p)].filter(Boolean).join(' · '))).join(''),
    equipos: () => { const moto = t => ops.filter(p => p.moto && (p.moto.tipo === 'S') === (t === 'S')).sort((a, b) => (+a.moto.eq || 99) - (+b.moto.eq || 99));
      return [...Object.entries(EQUIPOS).filter(([k]) => k !== 'moto').map(([k, l]) => persPanel('Equipo ' + l, ops.filter(p => (p.eq || []).includes(k)), p => [p.peloton, espLabel(p) === ESP_NINGUNA ? '' : espLabel(p)].filter(Boolean).join(' · '))),
        persPanel('Motosierristas titulares', moto('T'), p => [motoTxt(p.moto).replace(/^Titular · /, ''), p.peloton].filter(Boolean).join(' · ')),
        persPanel('Motosierristas suplentes', moto('S'), p => [motoTxt(p.moto).replace(/^Suplente · /, ''), p.peloton].filter(Boolean).join(' · '))].join(''); },
    puestos: () => { const us = ops.filter(p => opEsp(p) === 'USAR'), cells = [...new Set(us.map(x => x.cell || 'Sin célula'))];
      return `<div class="panel span2"><label class="lbl">Perfil de misión USAR (reparte células y puestos del equipo USAR)
          <select class="input" onchange="applyPreset(this.value)">${Object.entries(PRESETS).map(([k, [label]]) => `<option value="${k}" ${mission() === k ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label></div>
        ${cells.map(c => persPanel(c, us.filter(x => (x.cell || 'Sin célula') === c), p => [p.role, ...(p.funcs || [])].filter(Boolean).join(' · '))).join('')}`; }
  };
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><div><h2>Personal</h2><p class="muted">${UNIDAD}: toda la sección.</p></div>
        <div class="row"><button class="btn btn-a" onclick="newPersonForm()">${ic('plus')} Persona</button>
          <button class="btn btn-g" onclick="shareText(sierParte(), 'Parte de personal')">${ic('chat')} Parte</button>
          <button class="btn btn-g" onclick="printPersonCards()">${ic('printer')} Tarjetas QR</button>
          ${puedeImportar() ? `<button class="btn btn-g" onclick="importPersonalForm()">${ic('upload')} Importar</button>` : ''}</div></div>
      <div class="sier-res">
        <div class="sier-kpi"><small>Total</small><b>${todos.length}</b></div>
        <div class="sier-kpi ok"><small>Presentes</small><b>${todos.length - aus.length}</b></div>
        <div class="sier-kpi ${aus.length ? 'bad' : ''}"><small>Ausentes</small><b>${aus.length}</b></div>
      </div>
      ${haySier ? `<p class="sier-cuenta">${cuenta(PELOTONES, p => p.peloton)}</p><p class="sier-cuenta">${cuenta(ESPECIALIDADES, opEsp)}</p>` : ''}
      ${aus.length ? `<div class="list" style="margin-top:8px">${aus.map(p => `<button class="item" onclick="openPerson('${p.id}')"><div><b>${esc(conEmpleo(p))}</b><small>${esc(p.peloton || '')}</small></div><span class="tag bad">${esc(ausTxt(p))}</span></button>`).join('')}</div>` : ''}
      <input class="input" type="search" style="margin-top:10px" aria-label="Buscar una persona" placeholder="Buscar por nombre, empleo, pelotón…" value="${esc(prefs.persQ || '')}"
        oninput="PERS_Q_POS = this.selectionStart; setPref({ persQ: this.value })">
      <div class="row chips pers-views" style="margin-top:10px" role="group" aria-label="Ver por">${PVIEWS.map(([k, l]) => `<button class="chip ${view === k ? 'on' : ''}" aria-pressed="${view === k}" onclick="setPref({ pview: '${k}' })">${l}</button>`).join('')}</div>
    </div>
    <div class="grid g3">${paneles[view]() || `<div class="panel span2">${emptyState('users', 'Nadie con esa búsqueda', 'Prueba con otra palabra.')}</div>`}</div>
    ${(() => { const gone = allOperators().filter(x => x.active === false); return gone.length ? `
    <details class="panel"><summary class="sec-title" style="cursor:pointer">De baja (${gone.length})</summary>
      <div class="list" style="margin-top:10px">${gone.map(x => `<button class="item" onclick="openPerson('${x.id}')"><div class="who-row">${avatar(x.name, 'sm')}<div><b>${esc(x.name)}</b><small>${esc(x.role || '')}</small></div></div><span class="tag neutral">Baja</span></button>`).join('')}</div>
    </details>` : ''; })()}`;
}
let PERS_Q_POS = null;
function persKeepFocus() { if (PERS_Q_POS == null) return; const i = document.querySelector('#view input[aria-label="Buscar una persona"]'); if (i) { i.focus(); i.setSelectionRange(PERS_Q_POS, PERS_Q_POS); } PERS_Q_POS = null; }

/* ---------- Presentes y ausentes ---------- */
function ausenciaForm(id) {
  const o = get('operators', id), a = o.aus || {};
  openForm(`${o.name}: ausencia`, [
    { k: 'motivo', label: 'Motivo', value: a.motivo || MOTIVOS_AUSENCIA[0], options: MOTIVOS_AUSENCIA.map(m => [m, m]), required: true, wide: true },
    { k: 'hasta', label: 'Hasta (ese día incluido; vacío: hasta que se marque presente)', type: 'date', value: a.hasta || '', wide: true },
    { k: 'nota', label: 'Nota', value: a.nota || '', wide: true }
  ], v => put('operators', { ...o, aus: { motivo: v.motivo, hasta: v.hasta || '', nota: v.nota || '', desde: a.desde || todayISO() } }, `${o.name}: ausente (${v.motivo}${v.hasta ? ' hasta ' + fmtDate(v.hasta) : ''})`));
}
function marcarPresente(id) { const o = get('operators', id); put('operators', { ...o, aus: null }, `${o.name}: presente`); }
// Parte de personal para WhatsApp: totales por pelotón y los ausentes con su motivo
function sierParte() {
  const ops = operators().sort(ordenSier), aus = ops.filter(esAusente);
  return [...waHead('👥', `${UNIDAD} · PARTE DE PERSONAL`, new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })),
    `Total: ${waB(ops.length)} · Presentes: ${waB(ops.length - aus.length)} · Ausentes: ${waB(aus.length)}`,
    ...(ops.some(p => p.peloton) ? [PELOTONES.map(k => `${k}: ${ops.filter(p => p.peloton === k && !esAusente(p)).length}/${ops.filter(p => p.peloton === k).length}`).join(' · ')] : []),
    ...(aus.length ? [...waSec('🚫', 'AUSENTES'), ...aus.map(p => `• ${conEmpleo(p)}${p.peloton ? ` (${p.peloton})` : ''}: ${ausTxt(p)}${p.aus.nota ? ' · ' + p.aus.nota : ''}`)] : ['', '✅ Sin ausencias'])].join('\n');
}

/* ---------- Importar el personal pegando el listado ---------- */
// Una persona por línea, con los datos separados por punto y coma:
//   NOMBRE EN LA APP; EMPLEO; APELLIDOS, NOMBRE; PELOTÓN; ESPECIALIDAD; TELÉFONO; EQUIPOS
// EQUIPOS (opcional), separados por comas: RPAS, SVA, MOTO T 6/13 (titular, equipo 6, AUT. 13) o MOTO S 8/45 (suplente).
const puedeImportar = () => isAdmin() || Sync.role === 'jefe';
const IMPORT_EJEMPLO = 'PEREZ; CBO; PEREZ LOPEZ, JUAN; PIEN 1; USAR; 600000000; SVA, MOTO T 3/68';
function parsePersonal(text) {
  const ok = [], mal = [], norm = s => fold(s).replace(/[^a-z0-9]/g, '');
  const de = (lista, v) => lista.find(x => norm(x) === norm(v)) ?? lista.find(x => norm(v) && norm(x).startsWith(norm(v)));
  String(text || '').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')).forEach((l, i) => {
    const c = l.split(';').map(x => x.trim());
    const name = (c[0] || '').toUpperCase();
    if (!name || c.length < 4) return mal.push(`Línea ${i + 1}: faltan datos («${l.slice(0, 40)}»)`);
    if (ok.some(r => r.name === name)) return mal.push(`Línea ${i + 1}: ${name} está repetido`);
    const r = { name, empleo: de(EMPLEOS, c[1]) || '', fullName: c[2] || '', peloton: de(PELOTONES, c[3]) || '', esp: /^(-|ninguna|sin.*)?$/i.test(c[4] || '') ? '' : (de(ESPECIALIDADES, c[4]) ?? null),
      phone: (c[5] || '').replace(/[^\d+]/g, ''), eq: [], moto: null };
    if (c[1] && !r.empleo) mal.push(`Línea ${i + 1}: no conozco el empleo «${c[1]}» (${EMPLEOS.join(', ')})`);
    if (c[3] && !r.peloton) mal.push(`Línea ${i + 1}: no conozco el pelotón «${c[3]}» (${PELOTONES.join(', ')})`);
    if (r.esp === null) { mal.push(`Línea ${i + 1}: no conozco la especialidad «${c[4]}» (${ESPECIALIDADES.join(', ')})`); r.esp = ''; }
    (c[6] || '').split(/[,+]/).map(x => x.trim()).filter(Boolean).forEach(t => {
      const m = t.match(/^moto\w*\s*([ts])\w*\s*(\d+)?\s*(?:[\/ ]\s*(\d+))?$/i);
      if (m) r.moto = { tipo: m[1].toUpperCase(), eq: m[2] || '', aut: m[3] || '' };
      else { const k = Object.keys(EQUIPOS).find(x => x !== 'moto' && norm(EQUIPOS[x]) === norm(t)); if (k) r.eq.push(k); else mal.push(`Línea ${i + 1}: no conozco el equipo «${t}»`); }
    });
    ok.push(r);
  });
  return { ok, mal };
}
function importPersonalForm() {
  openModal('Importar personal', `
    <p class="muted">Pega el listado: una persona por línea y los datos separados por punto y coma. Quien ya está (mismo nombre en la app) se actualiza; el resto se da de alta.</p>
    <p class="muted" style="font-size:13px;margin:6px 0"><b>NOMBRE; EMPLEO; APELLIDOS, NOMBRE; PELOTÓN; ESPECIALIDAD; TELÉFONO; EQUIPOS</b><br>Ej.: ${esc(IMPORT_EJEMPLO)}</p>
    <textarea id="impTxt" class="input" rows="9" aria-label="Listado del personal" placeholder="${esc(IMPORT_EJEMPLO)}…" autocomplete="off" spellcheck="false" oninput="importPreview()"></textarea>
    <div id="impPrev" class="imp-prev" aria-live="polite"></div>
    ${Sync.user && Sync.role === 'jefe' ? `<label class="check-row" style="margin-top:10px"><input type="checkbox" id="impPin" checked><span>Dar acceso con el PIN 0000 a quien aún no lo tenga (luego cada uno lo cambia)</span></label>` : ''}
    <div class="row" style="margin-top:12px"><button class="btn btn-a" id="impGo" disabled onclick="importPersonal()">${ic('upload')} Importar</button><button class="btn btn-g" onclick="closeModal()">Cancelar</button></div>`);
}
function importPreview() {
  const { ok, mal } = parsePersonal($('impTxt').value), ya = n => allOperators().some(o => o.name === n);
  const nuevas = ok.filter(r => !ya(r.name)).length;
  $('impPrev').innerHTML = ok.length || mal.length ? `<p><b>${ok.length}</b> personas: <b>${nuevas}</b> nuevas y <b>${ok.length - nuevas}</b> que se actualizan.</p>
    ${mal.length ? `<div class="callout warn"><p>${mal.slice(0, 8).map(esc).join('<br>')}${mal.length > 8 ? `<br>… y ${mal.length - 8} más` : ''}</p></div>` : ''}` : '';
  $('impGo').disabled = !ok.length;
}
async function importPersonal() {
  const { ok } = parsePersonal($('impTxt').value), darPin = $('impPin')?.checked;
  if (!ok.length) return;
  let nuevas = 0;
  ok.forEach(r => {
    const prev = allOperators().find(o => o.name === r.name);
    const o = { ...(prev || { id: uid('OP'), name: r.name, cell: '', role: '' }), empleo: r.empleo, peloton: r.peloton, esp: r.esp, eq: r.eq, moto: r.moto, ...(r.phone ? { phone: r.phone } : {}) };
    stamp('operators', o);
    if (r.fullName) stamp('readiness', { ...readiness(o.id), id: o.id, fullName: r.fullName });
    if (!prev) { nuevas++; if (r.esp === 'USAR') Object.keys(EPI_TYPES).forEach(type => stamp('epis', newEpi(type, o.id))); }
  });
  addLog(`Personal importado: ${ok.length} personas (${nuevas} nuevas)`); closeModal(); commit();
  toast(`${ok.length} personas importadas (${nuevas} nuevas)`);
  if (!darPin) return;
  // PIN 0000 a quien no tenga acceso todavía (hace falta ser jefe y tener conexión)
  try {
    const con = new Set((await Sync.people()).map(p => p.name)), faltan = ok.filter(r => !con.has(r.name));
    for (const r of faltan) { const x = await Sync.setPin(r.name, 'miembro', '0000'); if (x?.error) throw new Error(x.error); }
    if (faltan.length) toast(`${faltan.length} personas ya pueden entrar con el PIN 0000`);
  } catch (e) { toast('Personal importado, pero no se pudo dar el acceso: ' + e.message + '. Hazlo en Ajustes → Miembros y permisos.', 'bad'); }
}
