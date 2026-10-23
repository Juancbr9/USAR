'use strict';
// USAR 242 · Consumibles

/* ==================== VISTA: CONSUMIBLES ==================== */
function viewConsumibles() {
  const items = list('consumables').sort(byName);
  return `
    <div class="panel between wrap-row">
      <div><h2>Material fungible</h2><p class="muted">Aviso cuando algo baja del mínimo.</p></div>
      <button class="btn btn-a" onclick="consForm()">${ic('plus')} Consumible</button>
    </div>
    <div class="grid g3">${items.map(c => {
      const low = c.stock <= c.min;
      const pct = Math.min(100, Math.round(c.stock / ((c.min || 1) * 2) * 100));
      const step = n => `<button class="btn btn-g btn-sm" onclick="adjust('${c.id}', ${n})">${n > 0 ? '+' + n : n}</button>`;
      return `
        <div class="panel" ${low ? 'style="border-color:rgba(248,113,113,.7)"' : ''}>
          <div class="between top"><b>${esc(c.name)}</b><span class="tag ${low ? 'bad' : 'ok'}">${low ? 'REPONER' : 'OK'}</span></div>
          <small class="muted mono" style="margin-top:2px">${esc(c.location)}</small>
          <div class="between" style="margin-top:12px; align-items:baseline">
            <span><span class="qty ${low ? 'bad' : ''}">${c.stock}</span> <span class="muted">${esc(c.unit)}</span></span>
            <span class="muted">Mín. ${c.min}</span>
          </div>
          <div class="bar ${low ? 'bad' : ''}" style="margin:8px 0 12px"><span style="width:${pct}%"></span></div>
          <div class="between">
            <div class="row nowrap">${step(-1)}${step(1)}${step(5)}</div>
            <button class="link" onclick="consForm('${c.id}')">Editar</button>
          </div>
        </div>`;
    }).join('') || '<p class="muted">No hay consumibles.</p>'}</div>`;
}

function adjust(id, n) {
  haptic(10);
  const c = get('consumables', id);
  const stock = Math.max(0, c.stock + n);
  put('consumables', { ...c, stock }, `Stock "${c.name}": ${stock} ${c.unit} (${n > 0 ? '+' : ''}${n})`);
}

function consForm(id) {
  const c = get('consumables', id) || { stock: 10, min: 5, unit: 'uds' };
  openForm(id ? 'Editar consumible' : 'Nuevo consumible', [
    { k: 'name', label: 'Nombre', value: c.name, required: true, wide: true },
    { k: 'stock', label: 'Stock actual', type: 'number', value: c.stock },
    { k: 'min', label: 'Mínimo', type: 'number', value: c.min },
    { k: 'unit', label: 'Unidad', value: c.unit },
    { k: 'location', label: 'Ubicación', value: c.location, placeholder: 'B11 / caja H-2' }
  ], v => {
    const rec = { ...(get('consumables', id) || { id: uid('C') }), ...v,
      stock: Math.max(0, +v.stock || 0), min: Math.max(0, +v.min || 0), unit: v.unit || 'uds', location: v.location || 'Almacén' };
    put('consumables', rec, `${id ? 'Editado' : 'Nuevo'} consumible "${rec.name}" (${rec.stock} ${rec.unit})`);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="removeItem('consumables', '${id}')">${ic('trash')} Borrar</button>` : '');
}
