'use strict';
// USAR 242 · EPI de cada persona (se ve y se edita en su ficha de Personal)

function epiState(e) {
  if (!e) return { cls: 'bad', text: 'Falta' };
  if (e.status === 'REVISAR') return { cls: 'warn', text: 'Revisar' };
  const d = due(e.expires);
  if (d && d.cls !== 'neutral') return { cls: d.cls, text: d.text };
  return { cls: 'ok', text: 'OK' };
}

function epiForm(id, type = 'casco', holder = RESERVA) {
  const e = get('epis', id) || { type, holder, size: EPI_SIZED.includes(type) ? '' : 'Universal', status: 'OK', expires: '' };
  const typeOptions = Object.entries(EPI_TYPES);
  if (!EPI_TYPES[e.type]) typeOptions.push([e.type, e.name || 'Otro EPI']);
  openForm(id ? `${epiLabel(e)} · ${opName(e.holder)}` : 'Asignar EPI', [
    { k: 'type', label: 'Tipo', value: e.type, options: typeOptions },
    { k: 'size', label: 'Talla', value: e.size, placeholder: 'S / M / L / XL' },
    { k: 'status', label: 'Estado', value: e.status, options: [['OK', 'OK'], ['REVISAR', 'Revisar / cambiar']] },
    { k: 'expires', label: 'Caducidad', type: 'date', value: e.expires },
    { k: 'holder', label: 'Lo lleva', value: e.holder, wide: true, options: [...operators().map(o => [o.id, o.name]), [RESERVA, '— Reserva almacén —']] }
  ], v => {
    const rec = { ...(get('epis', id) || { id: uid('EPI') }), ...v, name: EPI_TYPES[v.type] || e.name };
    put('epis', rec, `${epiLabel(rec)} de ${opName(rec.holder)}: ${rec.status}${rec.size ? ', talla ' + rec.size : ''}`);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="removeItem('epis', '${id}')">${ic('trash')} Dar de baja</button>` : '');
}
