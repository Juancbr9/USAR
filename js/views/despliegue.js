'use strict';
// USAR 242 · Datos de alistamiento de cada persona (pasaporte, cualificaciones, contacto de emergencia) y datos médicos,
// que se rellenan desde su ficha de Personal. (La página «Alistamiento y despliegue» se quitó del menú.)

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
