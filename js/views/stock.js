'use strict';
// USAR 242 · Material fungible (consumibles): cada uno va en su sitio (hueco, pasillo, armario u otros) y se ve en
// «Contenedor y almacén» junto al resto del material de ese sitio.

/* ==================== MATERIAL FUNGIBLE ==================== */
// Sitio de un fungible: el campo «door» como el resto del material; los antiguos solo tenían el texto «Ubicación»
function consDoor(c) {
  if (c.door !== undefined && c.door !== '') return +c.door || 0;
  const t = String(c.location || ''), box = t.match(/\b([HU])\s*-?\s*(\d+)\b/i), hueco = t.match(/\bB\s*(\d{1,2})\b/i), arm = t.match(/armario\s*(\d)/i);
  if (box) { const b = list('boxes').find(x => fold(x.code).replace(/\W/g, '') === fold(box[1] + box[2])); if (b && !b.vehicle) return b.door || 0; }
  if (hueco && +hueco[1] >= 1 && +hueco[1] <= 20) return +hueco[1];
  if (arm && +arm[1] >= 1 && +arm[1] <= 3) return 199 + +arm[1] * 2;
  if (/pasillo/i.test(t)) return PASILLO;
  if (/almac|nave|parque|otro/i.test(t)) return OTROS;
  return 0;
}
const consIn = test => list('consumables').filter(c => test(consDoor(c))).sort(byName);
const consLow = c => c.stock <= c.min;

// Una fila por fungible: stock, mínimo y botones para gastar o reponer (eso lo hace cualquiera)
function consRow(c, showWhere) {
  const d = consDoor(c), low = consLow(c), where = [showWhere ? (d ? doorName(d) : 'Sin ubicar') : '', c.location && !/^(contenedor|almac[eé]n)$/i.test(c.location) ? c.location : ''].filter(Boolean).join(' · ');
  const step = n => `<button class="btn btn-g btn-sm" onclick="adjust('${c.id}', ${n})">${n > 0 ? '+' + n : n}</button>`;
  return `<div class="item cons-item" data-cons="${c.id}"><div class="who-row"><span class="cons-ico">${ic('package')}</span><div><b>${esc(c.name)}</b>
      <small><span ${low ? 'style="color:var(--bad); font-weight:700"' : ''}>${c.stock} ${esc(c.unit)}</span> · mín. ${c.min}${where ? ' · ' + esc(where) : ''}</small></div></div>
    <span class="row nowrap">${low ? '<span class="tag bad">Reponer</span>' : ''}${step(-1)}${step(1)}${step(5)}${puedeFlota() ? `<button class="link" onclick="consForm('${c.id}')">Editar</button>` : ''}</span></div>`;
}
const consList = (cs, showWhere) => cs.length ? `<h4 class="sec-title cons-head">${ic('package')} Material fungible</h4><div class="list">${cs.map(c => consRow(c, showWhere)).join('')}</div>` : '';

function adjust(id, n) {
  haptic(10);
  const c = get('consumables', id);
  const stock = Math.max(0, c.stock + n);
  put('consumables', { ...c, stock }, `Stock "${c.name}": ${stock} ${c.unit} (${n > 0 ? '+' : ''}${n})`);
  if (!$('modal').classList.contains('hidden') && $('modal').querySelector(`[data-cons="${id}"]`)) cellModal(consDoor(c));
}

function consForm(id, at = {}) {
  if (!soloFlota()) return;
  const c = get('consumables', id) || { stock: 10, min: 5, unit: 'uds', door: at.door ?? (typeof prefs.door === 'number' ? prefs.door : 1) };
  openForm(id ? 'Editar fungible' : 'Nuevo material fungible', [
    { k: 'name', label: 'Nombre', value: c.name, required: true, wide: true },
    { k: 'stock', label: 'Stock actual', type: 'number', value: c.stock },
    { k: 'min', label: 'Mínimo', type: 'number', value: c.min },
    { k: 'unit', label: 'Unidad', value: c.unit },
    { k: 'place', label: 'Dónde va', value: String(consDoor(c)), options: placeOptions(), wide: true },
    { k: 'location', label: 'Sitio exacto (opcional)', value: c.location, placeholder: 'Ej: caja H-2, balda de arriba', wide: true }
  ], v => {
    const { place, ...rest } = v;
    const rec = { ...(get('consumables', id) || { id: uid('C') }), ...rest, door: +place || 0,
      stock: Math.max(0, +v.stock || 0), min: Math.max(0, +v.min || 0), unit: v.unit || 'uds', location: (v.location || '').trim() };
    put('consumables', rec, `${id ? 'Editado' : 'Nuevo'} fungible "${rec.name}" (${rec.stock} ${rec.unit})`);
    setPref({ door: rec.door });
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="removeItem('consumables', '${id}')">${ic('trash')} Borrar</button>` : '');
}
