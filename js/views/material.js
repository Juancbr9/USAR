'use strict';
// SIER 242 · Material de las especialidades, los equipos y los vehículos (registros «matesp»). Cada cosa tiene un dueño
// —un apartado (ap) o un vehículo (veh)—, cantidad, sitio, estado, revisión, caducidad, foto e historial. En las funciones
// el dueño se pasa como texto: «ap:agua» o «veh:V-…». Dónde está cada cosa (un hueco de cualquier pasillo, el contenedor, un
// armario o un vehículo) y cómo se mueve está en js/views/pasillo.js (matLugar, matPoner, moverA).

// «Para dar de baja»: sigue en la lista hasta que se retire, pero ya no cuenta como material ni entra en las revistas
const AP_ESTADOS = { OPERATIVO: ['Operativo', 'ok'], 'REVISIÓN': ['En revisión', 'warn'], AVERIADO: ['Averiado', 'bad'], BAJA: ['Para dar de baja', 'neutral'] };
// Para empezar la dotación de un vehículo sin escribirlo todo (luego se ajusta a lo que lleve cada uno)
const VEH_HABITUAL = ['Mangotes de aspiración', 'Mangueras de 25 mm', 'Mangueras de 45 mm', 'Mangueras de 70 mm', 'Puntas de lanza', 'Bifurcaciones', 'Reducciones',
  'Llave de hidrante', 'Extintor', 'Calzos', 'Cadenas', 'Eslingas', 'Caja de herramientas', 'Pala y pico', 'Triángulos y chalecos', 'Botiquín'];
// Cada cuánto toca pasar revista (días): se elige por apartado o vehículo y avisa en Inicio cuando toca
const REV_CADA = [[0, 'Sin aviso'], [7, 'Cada semana'], [15, 'Cada 15 días'], [30, 'Cada mes'], [90, 'Cada 3 meses'], [180, 'Cada 6 meses'], [365, 'Cada año']];

const duenoDe = owner => { const i = owner.indexOf(':'), id = owner.slice(i + 1); return owner.slice(0, i) === 'veh' ? { veh: id } : { ap: id }; };
const duenoTxt = m => m.veh ? 'veh:' + m.veh : 'ap:' + m.ap;
const matVivo = m => m.status !== 'BAJA';
const matDe = d => list('matesp').filter(m => d.veh ? m.veh === d.veh : !m.veh && m.ap === d.ap).sort(byName);
// Todo el material que cuenta: con dueño vigente (si se borra un vehículo, lo suyo deja de contar) y sin lo que va a darse de baja
const matTodo = () => list('matesp').filter(m => matVivo(m) && (m.veh ? get('vehicles', m.veh) : APARTADOS[m.ap]));
const matOk = m => (m.status || 'OPERATIVO') === 'OPERATIVO';
const matDueno = m => m.veh ? get('vehicles', m.veh)?.name || 'Vehículo' : APARTADOS[m.ap]?.name || '';
const matIr = m => m.veh ? `go('vehiculos'); vehicleView('${m.veh}')` : `setPref({ tab: '${m.ap}', aptab: 'material' }); scrollTo(0, 0)`;
const duenoNombre = owner => matDueno(duenoDe(owner));
const duenoHabitual = owner => duenoDe(owner).veh ? VEH_HABITUAL : APARTADOS[duenoDe(owner).ap].habitual;
const duenos = () => [...Object.keys(APARTADOS).map(k => 'ap:' + k), ...vehicles().map(v => 'veh:' + v.id)];
// Lo rellena cualquiera del equipo: somos gente de confianza y así nos ayudamos (queda apuntado quién cambia cada cosa)
const matPuede = owner => !!me();
const matRevId = owner => (duenoDe(owner).veh ? 'vehrev-' : 'aprev-') + owner.slice(owner.indexOf(':') + 1);
const matRevistas = owner => get('meta', matRevId(owner))?.value || [];
// Al guardar o borrar el material de un vehículo se vuelve a su ficha (que es una ventana)
const matVuelve = owner => { const d = duenoDe(owner); if (d.veh) setTimeout(() => vehicleView(d.veh), 0); };
// Material (de apartados y vehículos) que tiene asignado una persona
const matCon = id => matTodo().filter(m => m.holder === id).sort(byName);
const matricula = m => m.veh && m.unit ? (get('vehicles', m.veh)?.units || []).find(u => u.id === m.unit)?.plate || '' : '';
const matUrl = id => appUrl() + '#m=' + id;
const matSitio = m => [matricula(m), huecoTxt(m), m.place].filter(Boolean).join(' · ');

/* ---------- Revistas periódicas ---------- */
const revCada = owner => +(get('meta', 'revcada')?.value || {})[owner] || 0;
// Días que faltan para la próxima revista (0 o menos: ya toca); null si no se ha pedido aviso o no hay material
const revFalta = owner => { const c = revCada(owner); if (!c || !matDe(duenoDe(owner)).some(matVivo)) return null;
  const u = matRevistas(owner)[0]; return u ? c - Math.floor((Date.now() - u.ts) / 864e5) : 0; };
const revPendientes = () => duenos().map(o => [o, revFalta(o)]).filter(([, n]) => n != null && n <= 0);
function revCadaSet(owner, dias) {
  put('meta', { id: 'revcada', value: { ...(get('meta', 'revcada')?.value || {}), [owner]: +dias || 0 } }, `Revista de ${duenoNombre(owner)}: ${REV_CADA.find(r => r[0] === (+dias || 0))?.[1].toLowerCase() || 'sin aviso'}`);
  matVuelve(owner);
}

function matRow(owner, m) {
  const [txt, cls] = AP_ESTADOS[m.status] || AP_ESTADOS.OPERATIVO, n = m.review ? daysTo(m.review) : null, c = m.caduca ? daysTo(m.caduca) : null;
  return `<button class="item ${matVivo(m) ? '' : 'mat-baja'}" onclick="matForm('${owner}', '${m.id}')">${m.photo ? `<div class="who-row"><img class="thumb mat-foto" data-img="mat:${m.id}" alt="">` : ''}<div><b>${esc(m.name)}${(+m.qty || 1) > 1 ? ` <span class="muted nw">× ${+m.qty}</span>` : ''}</b>
    <small>${esc([m.holder && get('operators', m.holder) ? 'Lo tiene ' + opName(m.holder) : '', matSitio(m) || (m.veh ? '' : 'Sin colocar'), m.serial ? 'n.º ' + m.serial : '', m.notes].filter(Boolean).join(' · ') || 'Toca para completarlo')}</small></div>${m.photo ? '</div>' : ''}
    <span class="row tags" style="justify-content:flex-end">${c != null && c <= 60 ? `<span class="tag ${c < 0 ? 'bad' : 'warn'}">${c < 0 ? 'Caducado' : c === 0 ? 'Caduca hoy' : `Caduca en ${c} d`}</span>` : ''}
      ${n != null && n <= 30 ? `<span class="tag ${n < 0 ? 'bad' : 'warn'}">${n < 0 ? 'Revisión pasada' : n === 0 ? 'Revisión hoy' : `Revisión en ${n} d`}</span>` : ''}
      ${cls === 'ok' ? '' : `<span class="tag ${cls}">${txt}</span>`}</span></button>`;
}
// El bloque de material de un dueño: botones, lista, la revista (última y cada cuánto toca) y lo de imprimir
function matBloque(owner, vacio) {
  const mat = matDe(duenoDe(owner)), puede = matPuede(owner), ult = matRevistas(owner)[0], falta = revFalta(owner), bajas = mat.filter(m => !matVivo(m)).length;
  return `<div class="between wrap-row sec-head"><h3>Material</h3>
      ${puede ? `<div class="row"><button class="btn btn-a btn-sm" onclick="matForm('${owner}')">${ic('plus')} Material</button>
        ${mat.some(matVivo) ? `<button class="btn btn-g btn-sm" onclick="matRevista('${owner}')">${ic('clipboard')} Pasar revista</button>` : ''}</div>` : ''}</div>
    ${falta != null && falta <= 0 ? `<div class="callout"><span>${ic('clock', 'i-sm')} Toca pasar revista (${REV_CADA.find(r => r[0] === revCada(owner))?.[1].toLowerCase()}).</span></div>` : ''}
    ${mat.length ? `<div class="list">${mat.map(m => matRow(owner, m)).join('')}</div>
      <p class="muted" style="margin-top:10px">${ult ? `Última revista: ${fmtWhen(ult.ts)}, ${esc(ult.by || '')}. ${ult.fails.length ? 'Fallos: ' + esc(ult.fails.join(', ')) + '.' : 'Todo bien.'}` : 'Aún no se ha pasado revista.'}${falta > 0 ? ` La próxima, en ${falta} ${falta === 1 ? 'día' : 'días'}.` : ''}</p>
      ${puede ? `<label class="lbl mat-cada">Avisar para pasar revista<select class="input" onchange="revCadaSet('${owner}', this.value)">${REV_CADA.map(([d, l]) => `<option value="${d}" ${d === revCada(owner) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>` : ''}
      <div class="row mat-mas"><button class="link" onclick="matInventario('${owner}')">${ic('printer', 'i-sm')} Imprimir inventario</button>
        <button class="link" onclick="matCsv('${owner}')">${ic('download', 'i-sm')} Excel</button>
        <button class="link" onclick="matEtiquetas('${owner}')">${ic('qr', 'i-sm')} Etiquetas QR</button>
        ${bajas ? `<button class="link" onclick="matBajas('${owner}')">${ic('trash', 'i-sm')} Lista de bajas (${bajas})</button>` : ''}</div>`
    : emptyState('box', 'Aún no hay material apuntado', vacio,
        puede ? `<button class="btn btn-g" onclick="matHabitual('${owner}')">${ic('list')} Empezar con lo habitual</button>` : '')}`;
}

// pre: valores de partida de un material nuevo (p. ej. el hueco del pasillo desde el que se añade)
function matForm(owner, id, pre = {}) {
  if (!matPuede(owner)) return;
  const d = duenoDe(owner), m = id ? get('matesp', id) : { status: 'OPERATIVO', qty: 1, ...pre }, units = d.veh ? get('vehicles', d.veh)?.units || [] : [];
  if (id && !m) return toast('Ese material ya no está apuntado', 'bad');
  // Hueco: cualquier pasillo del almacén (primero, los del apartado); los desplegables llegan hasta el lado más grande.
  // Lo de un vehículo va en su vehículo: para llevarlo a otro sitio (o lo de un apartado al contenedor o a un vehículo), «Mover».
  const nums = d.ap ? almacenNums() : [], l0 = matLugar({ ...d, ...m }), u0 = pasDe(l0.door), u = u0 || { pas: apPasillos(d.ap || '')[0] || nums[0], lado: 'I', mod: 0, niv: 0 };
  const tope = f => Math.max(...nums.flatMap(n => ['I', 'D'].map(l => pasGeo(n, l)[f])));
  const otro = !u0 && (l0.door || l0.veh) ? lugarTxt(l0) : '';
  const hist = id ? list('logs').filter(l => l.ref === 'matesp:' + id).sort((a, b) => b.ts - a.ts).slice(0, 8) : [];
  openForm(id ? m.name : `Material de ${duenoNombre(owner)}`, [
    { k: 'name', label: 'Qué es', value: m.name || '', required: true, wide: true, placeholder: 'Ej.: ' + duenoHabitual(owner)[0] },
    { k: 'qty', label: 'Cuántos', type: 'number', value: m.qty || 1 },
    { k: 'status', label: 'Estado', value: m.status || 'OPERATIVO', options: Object.entries(AP_ESTADOS).map(([v, [l]]) => [v, l]) },
    ...(units.length > 1 ? [{ k: 'unit', label: 'Matrícula', value: m.unit || '', wide: true, options: [['', 'Todas las de este modelo'], ...units.map(u => [u.id, u.plate])] }] : []),
    ...(nums.length ? [{ k: 'pas', label: 'Pasillo', value: u.pas, options: nums.map(n => [n, `Pasillo ${n}${pasDuenos(n).length ? ' · ' + pasDuenos(n).map(pasDuenoTxt).join(' y ') : ''}`]) },
      { k: 'lado', label: 'Lado del pasillo', value: u.lado, options: Object.entries(LADOS) },
      { k: 'mod', label: 'Módulo', value: u.mod, options: [[0, otro ? 'No está en un pasillo: ' + otro : 'Sin colocar'], ...Array.from({ length: tope('mods') }, (_, i) => [i + 1, 'Módulo ' + (i + 1)])] },
      { k: 'niv', label: 'Altura', value: u.niv, options: Array.from({ length: tope('baldas') + 1 }, (_, n) => [n, nivNombre(n)]) }] : []),
    { k: 'place', label: d.veh ? 'Dónde va (cofre, cabina, techo…)' : 'Otro sitio o detalle', value: m.place || '', wide: true, placeholder: d.veh ? 'Ej.: Cofre lateral izquierdo' : 'Ej.: En la caja roja' },
    { k: 'holder', label: 'Asignado a (si lo tiene alguien a su cargo)', value: m.holder || '', wide: true, options: [['', 'Nadie: está en su sitio'], ...operators().sort(byName).map(o => [o.id, conEmpleo(o)])] },
    { k: 'review', label: 'Próxima revisión', type: 'date', value: m.review || '' },
    { k: 'caduca', label: 'Caduca (fin de su vida útil)', type: 'date', value: m.caduca || '' },
    { k: 'fab', label: 'Fabricado', type: 'date', value: m.fab || '' },
    { k: 'serial', label: 'N.º de serie', value: m.serial || '' },
    { k: 'notes', label: 'Notas', value: m.notes || '', wide: true },
    { k: 'photo', label: m.photo ? 'Cambiar la foto' : 'Foto', type: 'photo', value: '', wide: true }
  ], async v => {
    const mid = m.id || uid('ME');
    // El hueco solo se toca si se ha cambiado en el formulario (lo que está en el contenedor o en un vehículo sigue donde estaba)
    const nu = nums.length && +v.mod ? { pas: +v.pas || u.pas, lado: v.lado === 'D' ? 'D' : 'I', mod: +v.mod, niv: +v.niv || 0 } : null;
    const igual = nu ? !!u0 && pasDoor(nu.pas, nu.lado, nu.mod, nu.niv) === l0.door : !u0;
    const sitio = !nums.length || igual ? {} : nu ? { ...nu, door: 0, enveh: '' } : { pas: 0, lado: 'I', mod: 0, niv: 0 };
    if (v.photo) await Img.put('mat:' + mid, v.photo);
    put('matesp', { ...m, id: mid, ...d, name: v.name.trim(), qty: Math.max(1, Math.round(+v.qty || 1)), status: v.status, unit: v.unit || '', ...sitio, place: v.place || '', holder: v.holder || '', ...(v.holder && v.holder !== m.holder ? { held: todayISO() } : {}),
      review: v.review || '', caduca: v.caduca || '', fab: v.fab || '', serial: v.serial || '', notes: v.notes || '', photo: v.photo ? true : m.photo || false },
      id ? `${duenoNombre(owner)}: ${v.name}${v.status !== (m.status || 'OPERATIVO') ? ' pasa a «' + AP_ESTADOS[v.status][0].toLowerCase() + '»' : v.holder !== (m.holder || '') ? (v.holder ? ' asignado a ' + opName(v.holder) : ' vuelve a su sitio') : ' actualizado'}` : `${duenoNombre(owner)}: añadido ${v.name}`); matVuelve(owner); },
  id ? `${m.photo ? `<img class="photo span2" data-img="mat:${id}" alt="Foto de ${esc(m.name)}">` : ''}
    ${m.holder === me()?.id ? `<button type="button" class="btn btn-g span2" onclick="matLlevar('${owner}', '${id}', false)">${ic('in')} Lo devuelvo a su sitio</button>`
      : `<button type="button" class="btn btn-g span2" onclick="matLlevar('${owner}', '${id}', true)">${ic('out')} Me lo llevo yo</button>`}
    <button type="button" class="btn btn-g span2" onclick="moverA('mat', '${id}')">${ic('move')} Mover a otro sitio</button>
    <button type="button" class="btn btn-g span2" onclick="matEtiquetas('${owner}', '${id}')">${ic('qr')} Etiqueta QR</button>
    ${hist.length ? `<details class="span2 mat-hist"><summary class="link">${ic('history', 'i-sm')} Historial (${hist.length})</summary>
      <ul>${hist.map(l => `<li><b>${fmtWhen(l.ts)}</b> · ${esc(l.operator || '')}: ${esc(l.action.replace(/^[^:]+: /, ''))}</li>`).join('')}</ul></details>` : ''}
    <button type="button" class="btn btn-bad span2" onclick="matBorrar('${owner}', '${id}')">${ic('trash')} Eliminar</button>` : '');
}
function matBorrar(owner, id) {
  const m = get('matesp', id); if (!m || !confirm(`¿Eliminar «${m.name}»?`)) return;
  remove('matesp', id, `${matDueno(m) || 'Material'}: eliminado ${m.name}`); closeModal(); matVuelve(owner);
}
// Coger algo y devolverlo con un toque: queda a tu nombre (sale en tu ficha) hasta que lo devuelvas
function matLlevar(owner, id, llevar) {
  const m = get('matesp', id), yo = me(); if (!m || !yo) return;
  put('matesp', { ...m, holder: llevar ? yo.id : '', held: llevar ? todayISO() : '' }, `${matDueno(m)}: ${m.name} ${llevar ? 'lo tiene ' + yo.name : 'devuelto por ' + yo.name}`);
  closeModal(); toast(llevar ? `${m.name}: queda a tu nombre` : `${m.name}: devuelto`); matVuelve(owner);
}
// Para no empezar de cero: la lista habitual, que luego se ajusta (cantidades, sitio, lo que sobre)
function matHabitual(owner) {
  if (!matPuede(owner)) return;
  putMany('matesp', duenoHabitual(owner).map(name => ({ id: uid('ME'), ...duenoDe(owner), name, qty: 1, status: 'OPERATIVO', unit: '', place: '', review: '', serial: '', notes: '' })), `${duenoNombre(owner)}: lista de material habitual añadida`);
  toast('Lista añadida: ajusta cantidades y borra lo que no lleve'); matVuelve(owner);
}
// Revista: todo marcado como bien; se desmarca lo que falla (pasa a «En revisión») y queda apuntado quién la pasó y cuándo
function matRevista(owner) {
  const mat = matDe(duenoDe(owner)).filter(matVivo); if (!mat.length) return;
  openForm(`Revista de ${duenoNombre(owner)}`, [
    { k: 'ok', label: 'Deja marcado lo que está bien y desmarca lo que falla o falta', type: 'checks', wide: true, value: mat.filter(m => m.status !== 'AVERIADO').map(m => m.id),
      options: mat.map(m => [m.id, `${m.name}${(+m.qty || 1) > 1 ? ' × ' + m.qty : ''}${matSitio(m) ? ' · ' + matSitio(m) : ''}`]) },
    { k: 'nota', label: 'Qué falla (si falla algo)', value: '', wide: true }
  ], v => {
    const ok = new Set(v.ok || []), mal = mat.filter(m => !ok.has(m.id));
    mat.forEach(m => { const bien = ok.has(m.id);
      if (bien && m.status !== 'OPERATIVO') stamp('matesp', { ...m, status: 'OPERATIVO' });
      if (!bien && m.status === 'OPERATIVO') stamp('matesp', { ...m, status: 'REVISIÓN', notes: [m.notes, v.nota ? `Revista ${fmtDate(todayISO())}: ${v.nota}` : ''].filter(Boolean).join(' · ') }); });
    put('meta', { id: matRevId(owner), value: [{ ts: Date.now(), by: prefs.activeOperator, total: mat.length, fails: mal.map(m => m.name), nota: v.nota || '' }, ...matRevistas(owner)].slice(0, 12) },
      `Revista de ${duenoNombre(owner)}: ${mal.length ? mal.length + (mal.length === 1 ? ' fallo' : ' fallos') : 'todo bien'}`);
    toast(mal.length ? `Revista guardada: ${mal.length} ${mal.length === 1 ? 'cosa pasa' : 'cosas pasan'} a revisión` : 'Revista guardada: todo bien'); matVuelve(owner);
  });
}

/* ---------- Para imprimir: inventario, Excel, etiquetas QR y lista de bajas ---------- */
const matFilas = owner => matDe(duenoDe(owner)).sort((a, b) => (matSitio(a) || 'zzz').localeCompare(matSitio(b) || 'zzz', 'es', { numeric: true }) || byName(a, b))
  .map(m => [m.name, +m.qty || 1, matSitio(m) || 'Sin colocar', (AP_ESTADOS[m.status] || AP_ESTADOS.OPERATIVO)[0], m.holder && get('operators', m.holder) ? opName(m.holder) : '', m.review ? fmtDate(m.review) : '', m.caduca ? fmtDate(m.caduca) : '', m.serial || '', m.notes || '']);
const MAT_COLS = ['Material', 'Cant.', 'Dónde está', 'Estado', 'Lo tiene', 'Revisión', 'Caduca', 'N.º de serie', 'Notas'];
function matInventario(owner) {
  const filas = matFilas(owner);
  $('print').innerHTML = `<h1>${UNIDAD} · Inventario de ${esc(duenoNombre(owner))}</h1>
    <p>${new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${filas.length} líneas · Impreso por ${esc(prefs.activeOperator)}</p>
    <table class="inv"><thead><tr><th>✓</th>${MAT_COLS.map(c => `<th>${c}</th>`).join('')}</tr></thead>
      <tbody>${filas.map(f => `<tr><td class="inv-chk"></td>${f.map(c => `<td>${esc(String(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  print();
}
function matCsv(owner) {
  const celda = c => /[";\n]/.test(String(c)) ? '"' + String(c).replace(/"/g, '""') + '"' : String(c);
  download(`inventario-${fold(duenoNombre(owner)).replace(/[^a-z0-9]+/g, '-')}.csv`, '﻿' + [MAT_COLS, ...matFilas(owner)].map(f => f.map(celda).join(';')).join('\n'), 'text/csv');
}
// Etiquetas con QR para pegar en el material: al leerlas se abre su ficha (y desde ahí se coge o se devuelve)
function matEtiquetas(owner, id) {
  const mat = id ? [get('matesp', id)].filter(Boolean) : matDe(duenoDe(owner)).filter(matVivo);
  if (!mat.length) return toast('No hay material para etiquetar', 'bad');
  $('print').innerHTML = `<div class="labels">${mat.map(m => `<div class="label">${QR.svg(matUrl(m.id), 2)}<b>${esc(m.name)}</b>${esc([matDueno(m), matSitio(m), m.serial ? 'S/N ' + m.serial : ''].filter(Boolean).join(' · '))}</div>`).join('')}</div>`;
  print();
}
function matBajas(owner) {
  const b = matDe(duenoDe(owner)).filter(m => !matVivo(m)); if (!b.length) return;
  shareText([...waHead('🗑️', `${UNIDAD} · PARA DAR DE BAJA`, duenoNombre(owner)), ...b.map(m => `• ${m.name}${(+m.qty || 1) > 1 ? ' × ' + m.qty : ''}${m.serial ? ' (n.º ' + m.serial + ')' : ''}${m.notes ? ': ' + m.notes : ''}`)].join('\n'), 'Material para dar de baja');
}
