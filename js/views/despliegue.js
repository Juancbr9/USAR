'use strict';
// USAR 242 · Alistamiento y despliegue: datos de cada persona (pasaporte, cualificaciones, contacto de emergencia),
// datos médicos solo en este móvil, ficha del equipo (Team Fact Sheet) y manifiestos de personal y material.

const TEAM_STATUS = { base: 'En base', alerta: 'En alerta', movilizando: 'Movilizando', desplegado: 'Desplegado', desmovilizando: 'Desmovilizando' };
const readiness = id => get('readiness', id) || {};
const medical = id => get('medical', id) || {};
const monthsTo = iso => iso ? (new Date(iso + 'T00:00') - Date.now()) / (30.44 * 864e5) : null;

// Problemas de alistamiento de una persona: pasaporte (6 meses de validez) y cualificaciones caducadas o por caducar
function readinessIssues(op) {
  const r = readiness(op), out = [];
  const pm = docsOf(op).some(d => /pasaporte/i.test(d.type)) ? null : monthsTo(r.passportExp);
  if (pm == null) {}
  else if (r.passportExp && pm < 0) out.push(['bad', 'Pasaporte caducado']);
  else if (r.passportExp && pm < 6) out.push(['warn', `Pasaporte: menos de 6 meses (${fmtDate(r.passportExp)})`]);
  docsOf(op).forEach(d => { const st = docState(d); if (['bad', 'warn'].includes(st.cls)) out.push([st.cls, `${d.type}: ${st.text.toLowerCase()}`]); });
  (r.quals || []).forEach(q => {
    const d = due(q.expires);
    if (d && d.cls !== 'neutral') out.push([d.cls, `${q.name}: ${d.text.toLowerCase()}`]);
  });
  return out;
}

function viewDespliegue() {
  const ops = operators(), fs = get('meta', 'factsheet')?.value || {};
  const gearList = list('gear');
  const tot = k => gearList.reduce((s, g) => s + (parseFloat(g[k]) || 0), 0);
  const noWeight = gearList.filter(g => !g.weight).length;
  const dg = gearList.filter(g => g.dg);
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><div><h2>Alistamiento y despliegue</h2>
        </div>
        <span class="tag ${fs.status === 'desplegado' ? 'bad' : fs.status && fs.status !== 'base' ? 'warn' : 'ok'}">${TEAM_STATUS[fs.status || 'base']}</span></div>
      <div class="row">
        <button class="btn btn-a" onclick="factsheetForm()">${ic('flag')} Ficha del equipo</button>
        <button class="btn btn-g" onclick="shareText(factsheetText(), 'Ficha del equipo')">${ic('share')} Enviar ficha</button>
        <button class="btn btn-g" onclick="printPersonnelManifest()">${ic('printer')} Manifiesto de personal</button>
        <button class="btn btn-g" onclick="printGearManifest()">${ic('printer')} Manifiesto de material</button>
      </div>
    </div>

    <div class="status">
      <div class="kpi"><div><small>Material</small><b>${Math.round(tot('weight')).toLocaleString('es-ES')} kg</b></div></div>
      <div class="kpi"><div><small>Volumen</small><b>${tot('volume').toLocaleString('es-ES', { maximumFractionDigits: 2 })} m³</b></div></div>
      <div class="kpi"><div><small>Valor</small><b>${Math.round(tot('value')).toLocaleString('es-ES')} €</b></div></div>
      <div class="kpi ${dg.length ? 'warn' : ''}"><div><small>Mercancías peligrosas</small><b>${dg.length}</b></div></div>
    </div>
    ${noWeight ? `<p class="muted">${noWeight} equipos sin peso. Complétalos en Contenedor (peso, volumen, valor, función y bulto) para que el manifiesto salga completo.</p>` : ''}

    <div class="panel">
      <h3 class="sec-title">${ic('users')} Personas</h3>
      <p class="muted" style="margin-bottom:10px">${ic('shield', 'i-sm')} Todo el personal ve estos datos. Activa el modo seguro (usuarios con contraseña) si compartís los datos del equipo.</p>
      <div class="list">${ops.map(o => {
        const r = readiness(o.id), md = medical(o.id), issues = readinessIssues(o.id);
        const done = [r.passportNo && r.passportExp, r.emergencyPhone, (r.quals || []).length, r.fullName].filter(Boolean).length;
        return `
        <button class="item" onclick="openPerson('${o.id}')">
          <div class="who-row">${avatar(o.name, 'sm')}<div><b>${esc(o.name)}</b>
            <small>${issues.length ? issues.map(([, t]) => esc(t)).join(' · ') : `${done}/4 datos · ${(r.quals || []).length} cualificaciones${r.hours ? ` · ${esc(r.hours)} h de formación` : ''}${md.blood ? ' · médicos en este móvil' : ''}`}</small></div></div>
          <span class="tag ${issues.some(i => i[0] === 'bad') ? 'bad' : issues.length ? 'warn' : done === 4 ? 'ok' : 'neutral'}">${issues.length ? 'Revisar' : done === 4 ? 'Listo' : 'Incompleto'}</span>
        </button>`; }).join('')}</div>
    </div>

    ${dg.length ? `<div class="panel"><h3 class="sec-title">${ic('alert')} Mercancías peligrosas</h3>
      <p class="muted" style="margin-bottom:8px">Necesitan declaración del expedidor (IATA) para el transporte aéreo. Baterías de litio en caja señalizada; grupos sin combustible.</p>
      <ul class="tips">${dg.map(g => `<li><b>${esc(g.name)}</b>: ${esc(g.dg)}${boxCode(g) ? ` · caja ${esc(boxCode(g))}` : ''}</li>`).join('')}</ul></div>` : ''}`;
}

function readinessForm(op) {
  const o = get('operators', op), r = readiness(op), md = medical(op);
  openForm(o.name, [
    { k: 'fullName', label: 'Nombre y apellidos', value: r.fullName, wide: true },
    { k: 'birth', label: 'Fecha de nacimiento', type: 'date', value: r.birth },
    { k: 'nationality', label: 'Nacionalidad', value: r.nationality || 'Española' },
    { k: 'passportNo', label: 'Nº de pasaporte', value: r.passportNo },
    { k: 'passportExp', label: 'Caducidad del pasaporte', type: 'date', value: r.passportExp },
    { k: 'emergencyName', label: 'Contacto de emergencia', value: r.emergencyName, placeholder: 'Nombre y relación' },
    { k: 'emergencyPhone', label: 'Teléfono de emergencia', value: r.emergencyPhone, type: 'tel' },
    { k: 'hours', label: 'Horas de formación este año', type: 'number', value: r.hours },
    { k: 'blood', label: 'Grupo sanguíneo', value: md.blood, options: [['', '—'], ...['0-', '0+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'].map(x => [x, x])] },
    { k: 'allergies', label: 'Alergias y medicación', value: md.allergies, wide: true },
    { k: 'vaccines', label: 'Vacunas', type: 'textarea', rows: 2, value: md.vaccines, wide: true, placeholder: 'Tétanos 2024, hepatitis A y B, fiebre amarilla…' }
  ], v => {
    const { blood, allergies, vaccines, ...rest } = v;
    stamp('medical', { id: op, blood, allergies, vaccines });
    put('readiness', { ...r, id: op, ...rest }, `Alistamiento de ${o.name} actualizado`);
  }, `<button type="button" class="btn btn-g span2" onclick="qualsEditor('${op}')">${ic('book')} Cualificaciones (${(r.quals || []).length})</button>`);
}

function qualsEditor(op) {
  const o = get('operators', op), r = readiness(op), qs = r.quals || [];
  openModal(`Cualificaciones de ${o.name}`, `
    <div class="list" style="margin-bottom:14px">${qs.map((q, i) => `<div class="item"><div><b>${esc(q.name)}</b><small>${q.expires ? 'Caduca ' + fmtDate(q.expires) : 'Sin caducidad'}</small></div>
      <div class="row">${dueTag(q.expires)}<button class="link bad" onclick="const r = readiness('${op}'); put('readiness', { ...r, quals: r.quals.filter((_, j) => j !== ${i}) }); qualsEditor('${op}')">Quitar</button></div></div>`).join('') || '<p class="muted">Ninguna todavía.</p>'}</div>
    <form id="qualForm" class="form">
      <label class="lbl wide">Curso o titulación<input class="input" name="name" list="qualList" required placeholder="Ej: Rescatador USAR, espacios confinados, conductor C"></label>
      <datalist id="qualList">${catalog('quals').map(x => `<option value="${esc(x)}">`).join('')}</datalist>
      <label class="lbl">Caduca<input class="input" type="date" name="expires"></label>
      <button class="btn btn-a">${ic('plus')} Añadir</button>
    </form>
    <button class="btn btn-g full" style="margin-top:12px" onclick="readinessForm('${op}')">${ic('back')} Volver a la ficha</button>`);
  $('qualForm').onsubmit = e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    addOption('quals', fd.name);
    put('readiness', { ...readiness(op), id: op, quals: [...qs, { name: fd.name.trim(), expires: fd.expires }] }, `${o.name}: cualificación ${fd.name}`);
    qualsEditor(op);
  };
}

/* ---------- Ficha del equipo (Team Fact Sheet) ---------- */
function factsheetForm() {
  const fs = get('meta', 'factsheet')?.value || {};
  openForm('Ficha del equipo', [
    { k: 'status', label: 'Estado', value: fs.status || 'base', options: Object.entries(TEAM_STATUS) },
    { k: 'type', label: 'Tipo de equipo', value: fs.type || 'Ligero', options: [['Ligero', 'Ligero'], ['Medio', 'Medio'], ['Pesado', 'Pesado']] },
    { k: 'dogs', label: 'Perros', type: 'number', value: fs.dogs || 0 },
    { k: 'contact', label: 'Contacto del jefe', value: fs.contact, placeholder: 'Nombre y teléfono' },
    { k: 'capabilities', label: 'Capacidades', type: 'textarea', rows: 3, value: fs.capabilities, wide: true, placeholder: 'Búsqueda técnica, corte de hormigón, apuntalamiento, rescate vertical, sanitario…' },
    { k: 'selfSufficiency', label: 'Autosuficiencia', value: fs.selfSufficiency, wide: true, placeholder: 'Ej: 72 h de agua y comida; 24 h de trabajo con relevos' },
    { k: 'arrival', label: 'Llegada / punto de entrada', value: fs.arrival, wide: true }
  ], v => put('meta', { id: 'factsheet', value: { ...v, updated: Date.now() } }, `Ficha del equipo: ${TEAM_STATUS[v.status].toLowerCase()}`));
}
function factsheetText() {
  const fs = get('meta', 'factsheet')?.value || {}, g = list('gear');
  const kg = Math.round(g.reduce((s, x) => s + (parseFloat(x.weight) || 0), 0)), m3 = g.reduce((s, x) => s + (parseFloat(x.volume) || 0), 0);
  return [`*Ficha del equipo · ${teamCode()} (USAR 242)*`, `Estado: ${TEAM_STATUS[fs.status || 'base']} · Tipo: ${fs.type || '—'}`,
    `Personas: ${operators().length} · Perros: ${fs.dogs || 0}`, `Material: ${kg} kg, ${m3.toLocaleString('es-ES', { maximumFractionDigits: 2 })} m³`,
    fs.capabilities ? `Capacidades: ${fs.capabilities}` : '', fs.selfSufficiency ? `Autosuficiencia: ${fs.selfSufficiency}` : '',
    fs.arrival ? `Llegada: ${fs.arrival}` : '', fs.contact ? `Contacto: ${fs.contact}` : '', `Actualizado: ${fmtWhen(fs.updated || Date.now())}`].filter(Boolean).join('\n');
}

/* ---------- Manifiestos imprimibles ---------- */
function printPersonnelManifest() {
  $('print').innerHTML = `
    <h1>${esc(teamCode())} · Personnel manifest / Manifiesto de personal</h1>
    <p>${new Date().toLocaleString('es-ES')} · ${operators().length} personas</p>
    <table><tr><th>Name / Nombre</th><th>Date of birth</th><th>Nationality</th><th>Passport nº</th><th>Expiry</th><th>Position / Puesto</th></tr>
    ${operators().map(o => { const r = readiness(o.id); return `<tr><td><b>${esc(r.fullName || o.name)}</b></td><td>${r.birth ? fmtDate(r.birth) : ''}</td><td>${esc(r.nationality || '')}</td><td>${esc(r.passportNo || '')}</td><td>${r.passportExp ? fmtDate(r.passportExp) : ''}</td><td>${esc(o.role)}</td></tr>`; }).join('')}</table>
    <h2>Emergency contacts / Contactos de emergencia</h2>
    <table><tr><th>Nombre</th><th>Contacto</th><th>Teléfono</th></tr>${operators().map(o => { const r = readiness(o.id); return `<tr><td>${esc(o.name)}</td><td>${esc(r.emergencyName || '')}</td><td>${esc(r.emergencyPhone || '')}</td></tr>`; }).join('')}</table>`;
  print();
}
function printGearManifest() {
  const gs = list('gear');
  const groups = [...GEAR_FUNCS, ''].map(f => [f, gs.filter(g => (g.func || '') === f).sort((a, b) => boxCode(a).localeCompare(boxCode(b)) || byName(a, b))]).filter(([, l]) => l.length);
  const sum = (l, k) => l.reduce((s, g) => s + (parseFloat(g[k]) || 0), 0);
  const fmt = (n, d = 1) => n ? n.toLocaleString('es-ES', { maximumFractionDigits: d }) : '';
  $('print').innerHTML = `
    <h1>${esc(teamCode())} · Equipment manifest / Manifiesto de material</h1>
    <p>${new Date().toLocaleString('es-ES')} · ${gs.length} equipos · ${fmt(sum(gs, 'weight'))} kg · ${fmt(sum(gs, 'volume'), 2)} m³ · ${fmt(sum(gs, 'value'), 0)} €</p>
    ${groups.map(([f, l]) => `<h2>${esc(f || 'Sin función asignada')} (${l.length}) · ${fmt(sum(l, 'weight'))} kg</h2>
      <table><tr><th>Bulto</th><th>Equipo</th><th>Nº serie</th><th>Peso (kg)</th><th>Vol. (m³)</th><th>Valor (€)</th><th>MMPP</th></tr>
      ${l.map(g => `<tr><td>${esc(boxCode(g))}</td><td>${esc(g.name)}${qtyText(g)}</td><td>${esc(g.serial || '')}</td><td>${fmt(+g.weight)}</td><td>${fmt(+g.volume, 3)}</td><td>${fmt(+g.value, 0)}</td><td>${esc(g.dg || '')}</td></tr>`).join('')}</table>`).join('')}
    ${boxes().length ? `<h2>Bultos / cajas (${boxes().length}) · ${kg(boxes().reduce((s, b) => s + boxWeight(b).kg, 0))}</h2>
      <table><tr><th>Caja</th><th>Contenido</th><th>Modelo</th><th>Medidas (cm)</th><th>Peso</th><th>Helitransp.</th><th>MMPP</th></tr>
      ${boxes().map(b => `<tr><td><b>${esc(b.code)}</b></td><td>${esc(b.name || '')}</td><td>${esc(b.model || '')}</td><td>${boxDims(b)}</td><td>${esc(boxWeightText(b))}</td><td>${b.heli === 'no' ? 'No' : 'Sí'}</td><td>${esc(boxDG(b).join(', '))}</td></tr>`).join('')}</table>` : ''}`;
  print();
}
