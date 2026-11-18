'use strict';
// SIER 242 · Personal de toda la sección: pelotón, especialidad, empleo, equipos (RPAS, SVA y motosierristas) y presentes,
// como en la hoja de la sección. Los datos de las personas están solo en la base de datos del equipo: se cargan pegando el
// listado en «Importar personal» (nunca van en el código, que es público).

const ESP_NINGUNA = 'Sin especialidad';
const espLabel = o => opEsp(o) || ESP_NINGUNA;
const opEquipos = o => [...(o.eq || []).map(k => EQUIPOS[k]).filter(Boolean), ...(o.moto ? [`Motosierra ${o.moto.tipo === 'S' ? 'suplente' : 'titular'}`] : [])];
const motoTxt = m => m ? `${m.tipo === 'S' ? 'Suplente' : 'Titular'}${m.eq ? ` · equipo ${m.eq}` : ''}${m.aut ? ` (AUT. ${m.aut})` : ''}` : '';
const ausTxt = o => { const a = ausHoy(o); return a ? [a.motivo || 'Ausente', a.lugar ? 'en ' + a.lugar : '', a.hasta ? 'hasta el ' + fmtDate(a.hasta) : ''].filter(Boolean).join(' ') : ''; };
// Dónde está cada uno: «En base» o el motivo de su ausencia
const EN_BASE = 'En base';
const situacion = o => ausHoy(o) ? ausHoy(o).motivo || 'Ausente' : EN_BASE;
const conEmpleo = o => [o.empleo, o.name].filter(Boolean).join(' ');
// Vistas del personal
const PVIEWS = [['peloton', 'Pelotones'], ['situacion', 'Situación'], ['cuadrante', 'Vacaciones'], ['esp', 'Especialidades'], ['equipos', 'Equipos'], ['puestos', 'Puestos USAR']];

// Disponibilidad de una persona, de un vistazo: en base («ok»), fuera hoy («bad») o con una salida ya prevista («warn»)
const fechaCorta = iso => iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '';
function dispDe(o) {
  const a = ausHoy(o);
  if (a) return { cls: 'bad', txt: (a.motivo || 'Ausente') + (a.hasta ? ' · hasta ' + fechaCorta(a.hasta) : ''), largo: 'Fuera: ' + ausTxt(o) };
  if (ausPrevista(o)) return { cls: 'warn', txt: 'Sale el ' + fechaCorta(o.aus.desde), largo: 'En base. Ausencia prevista: ' + ausPrevTxt(o) };
  return { cls: 'ok', txt: EN_BASE, largo: EN_BASE };
}
// La foto o la inicial, con el punto de su disponibilidad en la esquina
const dispFoto = (p, d = dispDe(p)) => `<span class="disp-av disp-${d.cls}">${personPhoto(p)}<i class="disp-dot" aria-hidden="true"></i></span>`;
function personRow(p, sub) {
  const issues = readinessIssues(p.id), eb = list('epis').filter(e => e.holder === p.id && epiState(e).cls !== 'ok').length, n = issues.length + (eb ? 1 : 0), aus = esAusente(p), d = dispDe(p);
  return `<button class="item pers-row disp-${d.cls} ${aus ? 'pers-aus' : ''}" onclick="openPerson('${p.id}')">
    <div class="who-row">${dispFoto(p, d)}<div><b>${p.empleo ? `<span class="pers-emp">${esc(p.empleo)}</span> ` : ''}${esc(p.name)}</b>
      <small>${esc(sub ?? [espLabel(p) === ESP_NINGUNA ? '' : espLabel(p), ...opEquipos(p)].filter(Boolean).join(' · '))}</small>
      ${readiness(p.id).fullName ? `<small class="pers-full">${esc(readiness(p.id).fullName)}</small>` : ''}
      ${aus || d.cls === 'warn' ? `<span class="tag ${d.cls} disp-tag" title="${esc(d.largo)}">${esc(d.txt)}</span>` : ''}</div></div>
    ${aus || d.cls === 'warn' ? ic('chev', 'i-sm') : n ? `<span class="tag ${issues.some(i => i[0] === 'bad') ? 'bad' : 'warn'}">${n + (n === 1 ? ' aviso' : ' avisos')}</span>` : ic('chev', 'i-sm')}
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
    // Cuadrante del mes: una fila por persona y una columna por día
    cuadrante: () => cuadrantePanel(ops),
    // Tablero de situación: en base y, después, cada motivo de ausencia con quién está, dónde y hasta cuándo
    situacion: () => [EN_BASE, ...MOTIVOS_AUSENCIA, 'Ausente'].map(k => [k, ops.filter(p => situacion(p) === k)]).filter(([k, m]) => m.length || k === EN_BASE)
      .map(([t, m]) => persPanel(t, m, p => [p.peloton, esAusente(p) ? [ausHoy(p).lugar, ausHoy(p).hasta ? 'hasta el ' + fmtDate(ausHoy(p).hasta) : 'sin fecha de vuelta', ausHoy(p).nota].filter(Boolean).join(' · ') : (espLabel(p) === ESP_NINGUNA ? '' : espLabel(p))].filter(Boolean).join(' · '))).join(''),
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
    <div class="panel pers-top">
      <div class="between sec-head"><div><h2>Personal</h2><p class="muted">${UNIDAD}: toda la sección.</p></div>
        <button class="btn btn-a" onclick="newPersonForm()">${ic('plus')} Persona</button></div>
      <div class="sier-res disp-res" role="group" aria-label="Disponibilidad hoy">
        <div class="sier-kpi"><small>Total</small><b>${todos.length}</b></div>
        <div class="sier-kpi ok"><small>En base</small><b>${todos.length - aus.length}</b></div>
        <div class="sier-kpi ${aus.length ? 'bad' : ''}"><small>Fuera</small><b>${aus.length}</b></div>
        <div class="disp-barra" aria-hidden="true"><i class="ok" style="flex:${todos.length - aus.length}"></i><i class="bad" style="flex:${aus.length}"></i></div>
      </div>
      ${aus.length ? `<div class="disp-fuera" role="group" aria-label="Fuera hoy">${aus.map(p => `<button class="disp-chip" onclick="openPerson('${p.id}')" title="${esc(ausTxt(p))}"><b>${esc(p.name)}</b> ${esc(dispDe(p).txt)}</button>`).join('')}</div>` : ''}
      ${haySier ? `<p class="sier-cuenta">${cuenta(PELOTONES, p => p.peloton)}</p><p class="sier-cuenta">${cuenta(ESPECIALIDADES, opEsp)}</p>` : ''}
      <div class="pers-tools">
        <input class="input" type="search" aria-label="Buscar una persona" placeholder="Buscar por nombre, empleo, pelotón…" value="${esc(prefs.persQ || '')}"
          oninput="PERS_Q_POS = this.selectionStart; setPref({ persQ: this.value })">
        <div class="chips pers-views" role="group" aria-label="Ver por">${PVIEWS.map(([k, l]) => `<button class="chip ${view === k ? 'on' : ''}" aria-pressed="${view === k}" onclick="setPref({ pview: '${k}' })">${l}</button>`).join('')}</div>
      </div>
      <div class="row pers-mas"><button class="link" onclick="pasarLista()">${ic('check', 'i-sm')} Pasar lista</button>
        <button class="link" onclick="shareText(sierParte(), 'Parte de personal')">${ic('chat', 'i-sm')} Parte</button>
        <button class="link" onclick="printPersonCards()">${ic('printer', 'i-sm')} Tarjetas QR</button>
        ${puedeImportar() ? `<button class="link" onclick="importPersonalForm()">${ic('upload', 'i-sm')} Importar el listado</button>` : ''}</div>
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
    { k: 'desde', label: 'Desde (hoy, o una fecha futura si es una ausencia prevista)', type: 'date', value: ausPrevista(o) || esAusente(o) ? a.desde || todayISO() : todayISO(), required: true },
    { k: 'hasta', label: 'Hasta (ese día incluido; vacío: hasta que se marque presente)', type: 'date', value: a.hasta || '' },
    { k: 'lugar', label: 'Dónde está (opcional)', value: a.lugar || '', wide: true, placeholder: 'Ej.: Academia de Logística, Calatayud' },
    { k: 'nota', label: 'Nota', value: a.nota || '', wide: true }
  ], v => put('operators', { ...o, aus: { motivo: v.motivo, hasta: v.hasta || '', lugar: v.lugar || '', nota: v.nota || '', desde: v.desde || todayISO() } }, `${o.name}: ${v.desde > todayISO() ? 'ausencia prevista desde el ' + fmtDate(v.desde) : 'ausente'} (${v.motivo}${v.hasta ? ' hasta ' + fmtDate(v.hasta) : ''})`));
}
// Vuelve hoy: se quita la ausencia en curso; si venía del cuadrante, se acorta hasta ayer (o se quita si empezaba hoy)
function ponerPresente(o) {
  const hoy = todayISO(), ayer = new Date(Date.now() - 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  return { ...o, aus: null, plan: (o.plan || []).flatMap(p => p.desde <= hoy && p.hasta >= hoy ? (p.desde < hoy ? [{ ...p, hasta: ayer }] : []) : [p]) };
}
function marcarPresente(id) { const o = get('operators', id); put('operators', ausPrevista(o) ? { ...o, aus: null } : ponerPresente(o), `${o.name}: ${ausPrevista(o) ? 'ausencia prevista anulada' : 'presente'}`); }
const ausPrevTxt = o => ausPrevista(o) ? `${o.aus.motivo || 'Ausencia'} del ${fmtDate(o.aus.desde)}${o.aus.hasta ? ' al ' + fmtDate(o.aus.hasta) : ''}` : '';
// Parte de personal para WhatsApp: totales por pelotón y los ausentes con su motivo
function sierParte() {
  const ops = operators().sort(ordenSier), aus = ops.filter(esAusente);
  return [...waHead('👥', `${UNIDAD} · PARTE DE PERSONAL`, new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })),
    `Total: ${waB(ops.length)} · Presentes: ${waB(ops.length - aus.length)} · Ausentes: ${waB(aus.length)}`,
    ...(ops.some(p => p.peloton) ? [PELOTONES.map(k => `${k}: ${ops.filter(p => p.peloton === k && !esAusente(p)).length}/${ops.filter(p => p.peloton === k).length}`).join(' · ')] : []),
    ...(aus.length ? [...waSec('🚫', 'AUSENTES'), ...aus.map(p => `• ${conEmpleo(p)}${p.peloton ? ` (${p.peloton})` : ''}: ${ausTxt(p)}${ausHoy(p).nota ? ' · ' + ausHoy(p).nota : ''}`)] : ['', '✅ Sin ausencias'])].join('\n');
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
