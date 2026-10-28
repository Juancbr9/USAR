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
    { k: 'door', label: 'Dónde está (en reserva)', value: String(e.door ?? 231), options: placeOptions() },
    { k: 'status', label: 'Estado', value: e.status, options: [['OK', 'OK'], ['REVISAR', 'Revisar / cambiar']] },
    { k: 'expires', label: 'Caducidad', type: 'date', value: e.expires },
    { k: 'holder', label: 'Lo lleva', value: e.holder, wide: true, options: [...operators().map(o => [o.id, o.name]), [RESERVA, '— Reserva almacén —']] }
  ], v => {
    const qty = Math.max(1, Math.round(+v.qty || 1));
    v.door = +v.door || 0;
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

/* ==================== EPI: de un vistazo, qué lleva cada uno y qué hay en reserva ==================== */
function viewEpi() {
  const ops = operators(), types = Object.keys(EPI_TYPES), mine = op => list('epis').filter(e => e.holder === op);
  const spares = list('epis').filter(e => e.holder === RESERVA).sort((a, b) => epiLabel(a).localeCompare(epiLabel(b), 'es', { numeric: true }) || String(a.size).localeCompare(String(b.size), 'es', { numeric: true }));
  const cells = ops.flatMap(o => types.map(t => epiState(mine(o.id).find(e => e.type === t))));
  const falta = cells.filter(s => s.text === 'Falta').length, rev = cells.filter(s => s.cls !== 'ok' && s.text !== 'Falta').length;
  const cell = (o, t) => { const e = mine(o.id).find(x => x.type === t), st = epiState(e);
    return `<button class="epi-cell ${st.cls}" onclick="${e ? `epiForm('${e.id}')` : `epiForm(null, '${t}', '${o.id}')`}" aria-label="${esc(EPI_TYPES[t])} de ${esc(o.name)}: ${esc(st.text)}">
      <b>${e ? (e.size && e.size !== 'Universal' ? esc(e.size) : ic('check', 'i-sm')) : '—'}</b><small>${esc(st.text)}</small></button>`; };
  return `
    <div class="panel">
      <div class="between sec-head"><div><h2>EPI</h2><p class="muted">Qué lleva cada uno; toca una casilla para asignar o cambiar.</p></div>
        <span class="row">${falta ? `<span class="tag bad">${falta} faltan</span>` : ''}${rev ? `<span class="tag warn">${rev} por revisar</span>` : ''}${!falta && !rev ? '<span class="tag ok">Todo al día</span>' : ''}</span></div>
      <div class="epi-tbl" style="--cols:${types.length}">
        <span></span>${types.map(t => `<span class="epi-th"><span class="art art-sm">${toolArt(EPI_TYPES[t])}</span>${esc(EPI_TYPES[t])}</span>`).join('')}
        ${ops.map(o => `<button class="epi-who" onclick="openPerson('${o.id}')">${personPhoto(o, 'sm')}<b>${esc(o.name)}</b></button>${types.map(t => cell(o, t)).join('')}`).join('')}
      </div>
    </div>
    <div class="panel">
      <div class="between sec-head"><h3>${ic('hardhat')} Reserva en almacén</h3><span class="tag neutral">${spares.reduce((s, e) => s + epiQty(e), 0)}</span></div>
      <div class="list">${spares.map(e => `<button class="item" onclick="epiForm('${e.id}')"><div class="who-row"><span class="art art-sm">${toolArt(`${EPI_TYPES[e.type] || e.name} ${e.color || ''}`)}</span><div><b>${esc(epiLabel(e))}${e.size && e.size !== 'Universal' ? ' · talla ' + esc(e.size) : ''}</b>
        <small>${esc(e.door ? doorName(+e.door) : 'Sin sitio')}</small></div></div><span class="tag ${epiQty(e) ? 'neutral' : 'bad'}">×${epiQty(e)}</span></button>`).join('') || '<p class="muted">No hay EPI de reserva.</p>'}</div>
      <button class="btn btn-g btn-sm" style="margin-top:10px" onclick="epiForm(null, 'casco', '${RESERVA}')">${ic('plus')} EPI de reserva</button>
    </div>`;
}
