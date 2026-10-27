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
    { k: 'desc', label: 'Modelo', value: e.desc, placeholder: 'Ej: Casco USAR con orejeras' },
    { k: 'color', label: 'Color', value: e.color, placeholder: 'Ej: Rojo' },
    { k: 'size', label: 'Talla', value: e.size, placeholder: 'S / M / L / XL o 44, 46…' },
    { k: 'qty', label: 'Cantidad (en reserva)', type: 'number', value: e.holder === RESERVA ? epiQty(e) : 1 },
    { k: 'status', label: 'Estado', value: e.status, options: [['OK', 'OK'], ['REVISAR', 'Revisar / cambiar']] },
    { k: 'expires', label: 'Caducidad', type: 'date', value: e.expires },
    { k: 'holder', label: 'Lo lleva', value: e.holder, wide: true, options: [...operators().map(o => [o.id, o.name]), [RESERVA, '— Reserva almacén —']] }
  ], v => {
    const qty = Math.max(1, Math.round(+v.qty || 1));
    // Uno de la reserva (con cantidad) que se asigna a una persona: sale uno de la reserva y esa persona lleva el suyo
    if (id && e.holder === RESERVA && epiQty(e) > 1 && v.holder !== RESERVA) {
      stamp('epis', { ...e, qty: epiQty(e) - 1 });
      const rec = { ...e, ...v, id: uid('EPI'), qty: '', name: EPI_TYPES[v.type] || e.name };
      return put('epis', rec, `${epiLabel(rec)} de la reserva para ${opName(rec.holder)}${rec.size ? ', talla ' + rec.size : ''}`);
    }
    const rec = { ...(get('epis', id) || { id: uid('EPI') }), ...v, qty: v.holder === RESERVA && qty > 1 ? qty : '', name: EPI_TYPES[v.type] || e.name };
    put('epis', rec, `${epiLabel(rec)}${rec.holder === RESERVA && qty > 1 ? ' ×' + qty : ''} de ${opName(rec.holder)}: ${rec.status}${rec.size ? ', talla ' + rec.size : ''}`);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="removeItem('epis', '${id}')">${ic('trash')} Dar de baja</button>` : '');
}
