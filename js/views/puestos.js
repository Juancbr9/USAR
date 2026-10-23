'use strict';
// USAR 242 · Puestos y perfiles de misión

/* ==================== VISTA: PUESTOS ==================== */
function viewPuestos() {
  const ops = operators();
  const cells = [...new Set(ops.map(o => o.cell))];
  const missionOptions = Object.entries(PRESETS).map(([k, [label]]) => `<option value="${k}" ${mission() === k ? 'selected' : ''}>${label}</option>`).join('');
  return `
    <div class="panel between wrap-row">
      <div><h2>Matriz de puestos</h2></div>
      <select class="input sm" style="border-color:rgba(255,85,0,.6)" onchange="applyPreset(this.value)">${missionOptions}</select>
    </div>
    <div class="grid g3">${cells.map(cell => {
      const members = ops.filter(o => o.cell === cell);
      return `
        <div class="panel">
          <div class="between sec-head"><h3>${esc(cell)}</h3><span class="muted">${members.length}</span></div>
          <div class="list">${members.map(m => `
            <button class="item" onclick="operatorForm('${m.id}')"><div class="who-row">${avatar(m.name, 'sm')}<div><b>${esc(m.name)}</b><small>${esc(m.role)}</small></div></div>${ic('pencil', 'i-sm')}</button>`).join('')}
          </div>
        </div>`;
    }).join('')}</div>`;
}

function operatorForm(id) {
  if (!id) return newPersonForm();
  return personForm(id);
  const o = get('operators', id);
  openForm('Editar ' + o.name, [
    { k: 'name', label: 'Nombre', value: o.name, required: true, wide: true },
    { k: 'cell', label: 'Célula', value: o.cell, required: true, wide: true },
    { k: 'role', label: 'Puesto', value: o.role, required: true, wide: true }
  ], v => {
    if (prefs.activeOperator === o.name) { prefs.activeOperator = v.name; writeJSON(KEY.prefs, prefs); }
    if (v.name !== o.name && allOperators().some(x => x.id !== o.id && x.name === v.name)) return toast('Ya hay otra persona con ese nombre', 'bad');
    put('operators', { ...o, ...v }, `Puesto de ${v.name}: ${v.role} (${v.cell})`);
  }, `<div class="row span2" style="gap:8px">
    ${o.active === false ? `<button type="button" class="btn btn-g" onclick="setActive('${o.id}', true)">${ic('check')} Volver a dar de alta</button>`
      : `<button type="button" class="btn btn-g" onclick="setActive('${o.id}', false)">${ic('out')} Dar de baja</button>`}
    <button type="button" class="btn btn-bad" onclick="deletePerson('${o.id}')">${ic('trash')} Eliminar</button></div>`);
}

function applyPreset(key) {
  const slots = PRESETS[key][1];
  stamp('meta', { id: 'mission', value: key });
  putMany('operators', operators().map((o, i) => {
    if (!slots[i]) return o;
    const [cell, role] = slots[i].split('|');
    return { ...o, cell, role };
  }), 'Perfil de misión: ' + PRESETS[key][0]);
}

/* ---------- Alta, baja y borrado de personal ---------- */
function newPersonForm() {
  const cells = [...new Set(allOperators().map(o => o.cell).filter(Boolean))];
  openForm('Nueva persona', [
    { k: 'name', label: 'Nombre (como se le conoce en el equipo)', required: true, wide: true, placeholder: 'Ej: PÉREZ' },
    { k: 'cell', label: 'Célula', list: cells, wide: true, placeholder: 'Ej: Corte y Penetración' },
    { k: 'role', label: 'Puesto', wide: true, placeholder: 'Ej: Rescatador' },
    { k: 'phone', label: 'Teléfono', type: 'tel', placeholder: '600 000 000' }
  ], v => {
    const name = v.name.trim().toUpperCase();
    if (allOperators().some(o => o.name === name)) return toast('Ya hay una persona con ese nombre', 'bad');
    const o = { id: uid('OP'), name, cell: v.cell || 'Sin célula', role: v.role || 'Rescatador', phone: v.phone || '' };
    stamp('operators', o);
    Object.keys(EPI_TYPES).forEach(type => stamp('epis', newEpi(type, o.id)));
    addLog(`Alta de ${name} en la unidad`); commit();
    toast(`${name} añadido a la unidad`);
    if (prefs.tab === 'personal') setPref({ person: o.id });
  });
}
function setActive(id, active) {
  const o = get('operators', id);
  if (!active && !confirm(`¿Dar de baja a ${o.name}?\n\nDeja de salir en las listas, puestos y operaciones nuevas. Su historial, documentos y EPI se conservan y se puede volver a dar de alta.`)) return;
  closeModal();
  put('operators', { ...o, active }, `${o.name}: ${active ? 'alta de nuevo' : 'baja'} en la unidad`);
}
function deletePerson(id) {
  const o = get('operators', id);
  if (!confirm(`¿Eliminar a ${o.name} definitivamente?\n\nSe borran su ficha y sus documentos. Sus EPI pasan a «Reserva almacén». Si solo deja la unidad, mejor «Dar de baja».`)) return;
  list('docs').filter(d => d.op === id).forEach(d => { (d.imgs || []).forEach(i => Img.del(i)); stamp('docs', { id: d.id, _del: true }); });
  list('epis').filter(e => e.holder === id).forEach(e => stamp('epis', { ...e, holder: '' }));
  closeModal();
  if (prefs.person === id) prefs.person = null;
  remove('operators', id, `Eliminado ${o.name} de la unidad`);
}
