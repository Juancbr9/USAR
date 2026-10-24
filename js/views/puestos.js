'use strict';
// USAR 242 · Perfiles de misión y alta, baja y borrado de personal

function operatorForm(id) {
  if (!id) return newPersonForm();
  return personForm(id);
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
