'use strict';
// SIER 242 · Material de las especialidades, los equipos y los vehículos (registros «matesp»). Cada cosa tiene un dueño
// —un apartado (ap) o un vehículo (veh)—, cantidad, sitio, estado y próxima revisión o caducidad. En las funciones el
// dueño se pasa como texto: «ap:agua» o «veh:V-…». (El material de USAR sigue en su almacén: contenedor, pasillo y armarios.)

const AP_ESTADOS = { OPERATIVO: ['Operativo', 'ok'], 'REVISIÓN': ['En revisión', 'warn'], AVERIADO: ['Averiado', 'bad'] };
// Para empezar la dotación de un vehículo sin escribirlo todo (luego se ajusta a lo que lleve cada uno)
const VEH_HABITUAL = ['Mangotes de aspiración', 'Mangueras de 25 mm', 'Mangueras de 45 mm', 'Mangueras de 70 mm', 'Puntas de lanza', 'Bifurcaciones', 'Reducciones',
  'Llave de hidrante', 'Extintor', 'Calzos', 'Cadenas', 'Eslingas', 'Caja de herramientas', 'Pala y pico', 'Triángulos y chalecos', 'Botiquín'];

const duenoDe = owner => { const i = owner.indexOf(':'), id = owner.slice(i + 1); return owner.slice(0, i) === 'veh' ? { veh: id } : { ap: id }; };
const matDe = d => list('matesp').filter(m => d.veh ? m.veh === d.veh : !m.veh && m.ap === d.ap).sort(byName);
// Todo el material con dueño vigente (si se borra un vehículo o un apartado, lo suyo deja de contar)
const matTodo = () => list('matesp').filter(m => m.veh ? get('vehicles', m.veh) : APARTADOS[m.ap]);
const matOk = m => (m.status || 'OPERATIVO') === 'OPERATIVO';
const matDueno = m => m.veh ? get('vehicles', m.veh)?.name || 'Vehículo' : APARTADOS[m.ap]?.name || '';
const matIr = m => m.veh ? `go('vehiculos'); vehicleView('${m.veh}')` : `setPref({ tab: '${m.ap}', aptab: 'material' }); scrollTo(0, 0)`;
const duenoNombre = owner => matDueno(duenoDe(owner));
const duenoHabitual = owner => duenoDe(owner).veh ? VEH_HABITUAL : APARTADOS[duenoDe(owner).ap].habitual;
// Lo rellena cualquiera del equipo: somos gente de confianza y así nos ayudamos (queda apuntado quién cambia cada cosa)
const matPuede = owner => !!me();
const matRevId = owner => (duenoDe(owner).veh ? 'vehrev-' : 'aprev-') + owner.slice(owner.indexOf(':') + 1);
const matRevistas = owner => get('meta', matRevId(owner))?.value || [];
// Al guardar o borrar el material de un vehículo se vuelve a su ficha (que es una ventana)
const matVuelve = owner => { const d = duenoDe(owner); if (d.veh) setTimeout(() => vehicleView(d.veh), 0); };
// Material (de apartados y vehículos) que tiene asignado una persona
const matCon = id => matTodo().filter(m => m.holder === id).sort(byName);
const matricula = m => m.veh && m.unit ? (get('vehicles', m.veh)?.units || []).find(u => u.id === m.unit)?.plate || '' : '';

function matRow(owner, m) {
  const [txt, cls] = AP_ESTADOS[m.status] || AP_ESTADOS.OPERATIVO, n = m.review ? daysTo(m.review) : null;
  return `<button class="item" onclick="matForm('${owner}', '${m.id}')"><div><b>${esc(m.name)}${(+m.qty || 1) > 1 ? ` <span class="muted nw">× ${+m.qty}</span>` : ''}</b>
    <small>${esc([m.holder && get('operators', m.holder) ? 'Lo tiene ' + opName(m.holder) : '', matricula(m), huecoTxt(m), m.place || (m.veh || huecoTxt(m) ? '' : 'Sin colocar'), m.serial ? 'n.º ' + m.serial : '', m.notes].filter(Boolean).join(' · ') || 'Toca para completarlo')}</small></div>
    <span class="row tags" style="justify-content:flex-end">${n != null && n <= 30 ? `<span class="tag ${n < 0 ? 'bad' : 'warn'}">${n < 0 ? 'Revisión pasada' : n === 0 ? 'Revisión hoy' : `Revisión en ${n} d`}</span>` : ''}
      ${cls === 'ok' ? '' : `<span class="tag ${cls}">${txt}</span>`}</span></button>`;
}
// El bloque de material de un dueño: botones, lista y la última revista (o cómo empezar si está vacío)
function matBloque(owner, vacio) {
  const mat = matDe(duenoDe(owner)), puede = matPuede(owner), ult = matRevistas(owner)[0];
  return `<div class="between wrap-row sec-head"><h3>Material</h3>
      ${puede ? `<div class="row"><button class="btn btn-a btn-sm" onclick="matForm('${owner}')">${ic('plus')} Material</button>
        ${mat.length ? `<button class="btn btn-g btn-sm" onclick="matRevista('${owner}')">${ic('clipboard')} Pasar revista</button>` : ''}</div>` : ''}</div>
    ${mat.length ? `<div class="list">${mat.map(m => matRow(owner, m)).join('')}</div>
      ${ult ? `<p class="muted" style="margin-top:10px">Última revista: ${fmtWhen(ult.ts)}, ${esc(ult.by || '')}. ${ult.fails.length ? 'Fallos: ' + esc(ult.fails.join(', ')) + '.' : 'Todo bien.'}</p>` : ''}`
    : emptyState('box', 'Aún no hay material apuntado', vacio,
        puede ? `<button class="btn btn-g" onclick="matHabitual('${owner}')">${ic('list')} Empezar con lo habitual</button>` : '')}`;
}

// pre: valores de partida de un material nuevo (p. ej. el hueco del pasillo desde el que se añade)
function matForm(owner, id, pre = {}) {
  if (!matPuede(owner)) return;
  const d = duenoDe(owner), m = id ? get('matesp', id) : { status: 'OPERATIVO', qty: 1, ...pre }, units = d.veh ? get('vehicles', d.veh)?.units || [] : [];
  // Pasillo: los del apartado; el desplegable de módulos y alturas llega hasta el lado más grande
  const nums = d.ap ? apPasillos(d.ap) : [], enSitio = nums.length && colocado(d.ap, m), u = enSitio || (pre.pas && !id) ? ubic({ ap: d.ap, ...m }) : { pas: nums[0], lado: 'I', mod: 0, niv: 0 };
  const tope = f => Math.max(...nums.flatMap(n => ['I', 'D'].map(l => pasLado(d.ap, n, l)[f])));
  openForm(id ? m.name : `Material de ${duenoNombre(owner)}`, [
    { k: 'name', label: 'Qué es', value: m.name || '', required: true, wide: true, placeholder: 'Ej.: ' + duenoHabitual(owner)[0] },
    { k: 'qty', label: 'Cuántos', type: 'number', value: m.qty || 1 },
    { k: 'status', label: 'Estado', value: m.status || 'OPERATIVO', options: Object.entries(AP_ESTADOS).map(([v, [l]]) => [v, l]) },
    ...(units.length > 1 ? [{ k: 'unit', label: 'Matrícula', value: m.unit || '', wide: true, options: [['', 'Todas las de este modelo'], ...units.map(u => [u.id, u.plate])] }] : []),
    ...(nums.length ? [...(nums.length > 1 ? [{ k: 'pas', label: 'Pasillo', value: u.pas, options: nums.map(n => [n, 'Pasillo ' + n]) }] : []),
      { k: 'lado', label: 'Lado del pasillo', value: u.lado, options: Object.entries(LADOS) },
      { k: 'mod', label: 'Módulo', value: u.mod, options: [[0, 'Sin colocar'], ...Array.from({ length: tope('mods') }, (_, i) => [i + 1, 'Módulo ' + (i + 1)])] },
      { k: 'niv', label: 'Altura', value: u.niv, options: Array.from({ length: tope('baldas') + 1 }, (_, n) => [n, nivNombre(n)]) }] : []),
    { k: 'place', label: d.veh ? 'Dónde va (cofre, cabina, techo…)' : 'Otro sitio o detalle', value: m.place || '', wide: true, placeholder: d.veh ? 'Ej.: Cofre lateral izquierdo' : 'Ej.: En la caja roja' },
    { k: 'holder', label: 'Asignado a (si lo tiene alguien a su cargo)', value: m.holder || '', wide: true, options: [['', 'Nadie: está en su sitio'], ...operators().sort(byName).map(o => [o.id, conEmpleo(o)])] },
    { k: 'review', label: 'Próxima revisión o caducidad', type: 'date', value: m.review || '' },
    { k: 'serial', label: 'N.º de serie', value: m.serial || '' },
    { k: 'notes', label: 'Notas', value: m.notes || '', wide: true }
  ], v => { put('matesp', { ...m, id: m.id || uid('ME'), ...d, name: v.name.trim(), qty: Math.max(1, Math.round(+v.qty || 1)), status: v.status, unit: v.unit || '', ...(nums.length ? { pas: +v.pas || nums[0], lado: v.lado === 'D' ? 'D' : 'I', mod: +v.mod || 0, niv: +v.mod ? +v.niv || 0 : 0 } : {}), place: v.place || '', holder: v.holder || '', ...(v.holder && v.holder !== m.holder ? { held: todayISO() } : {}), review: v.review || '', serial: v.serial || '', notes: v.notes || '' },
      id ? `${duenoNombre(owner)}: ${v.name} actualizado` : `${duenoNombre(owner)}: añadido ${v.name}`); matVuelve(owner); },
  id ? `${m.holder === me()?.id ? `<button type="button" class="btn btn-g span2" onclick="matLlevar('${owner}', '${id}', false)">${ic('in')} Lo devuelvo a su sitio</button>`
      : `<button type="button" class="btn btn-g span2" onclick="matLlevar('${owner}', '${id}', true)">${ic('out')} Me lo llevo yo</button>`}
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
  const mat = matDe(duenoDe(owner)); if (!mat.length) return;
  openForm(`Revista de ${duenoNombre(owner)}`, [
    { k: 'ok', label: 'Deja marcado lo que está bien y desmarca lo que falla o falta', type: 'checks', wide: true, value: mat.filter(m => m.status !== 'AVERIADO').map(m => m.id),
      options: mat.map(m => [m.id, `${m.name}${(+m.qty || 1) > 1 ? ' × ' + m.qty : ''}${m.place ? ' · ' + m.place : ''}`]) },
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
