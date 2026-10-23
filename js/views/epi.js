'use strict';
// USAR 242 · EPI de cada persona

/* ==================== VISTA: EPI ==================== */
// Cada persona lleva casco, protectores auditivos y mono. Toca uno para cambiar talla, estado o caducidad.
function epiState(e) {
  if (!e) return { cls: 'bad', text: 'Falta' };
  if (e.status === 'REVISAR') return { cls: 'warn', text: 'Revisar' };
  const d = due(e.expires);
  if (d && d.cls !== 'neutral') return { cls: d.cls, text: d.text };
  return { cls: 'ok', text: 'OK' };
}

function viewEpi() {
  const ops = operators(), epis = list('epis');
  const issues = ops.reduce((n, o) => n + Object.keys(EPI_TYPES).filter(t => epiState(epis.find(e => e.holder === o.id && e.type === t)).cls !== 'ok').length, 0);
  const spares = epis.filter(e => e.holder === RESERVA).sort((a, b) => epiLabel(a).localeCompare(epiLabel(b)));

  const row = (e, type, holder) => {
    const st = epiState(e);
    const detail = e ? [e.size && `Talla ${e.size}`, e.expires && `Caduca ${fmtDate(e.expires)}`].filter(Boolean).join(' · ') || 'Sin talla' : 'Toca para asignar';
    return `
      <button class="item" onclick="${e ? `epiForm('${e.id}')` : `epiForm(null, '${type}', '${holder}')`}">
        <div><b>${esc(e ? epiLabel(e) : EPI_TYPES[type])}</b><small>${esc(detail)}</small></div>
        <span class="tag ${st.cls}">${st.text}</span>
      </button>`;
  };

  return `
    <div class="panel between wrap-row">
      <div><h2>EPI del equipo</h2><p class="muted">EPI mínimo INSARAG de cada persona: casco, protección auditiva y ocular, guantes, protección respiratoria, mono y botas. Toca uno para cambiar la talla, marcarlo para revisar o poner su caducidad.</p></div>
      <span class="tag ${issues ? 'warn' : 'ok'}">${issues ? issues + ' por revisar' : 'Todo OK'}</span>
    </div>
    <div class="grid g3">
      ${ops.map(o => {
        const mine = epis.filter(e => e.holder === o.id);
        const extras = mine.filter(e => !EPI_TYPES[e.type]);
        return `
          <div class="panel">
            <div class="between sec-head" style="margin-bottom:10px; padding-bottom:10px"><div class="who-row">${avatar(o.name)}<div><h3>${esc(o.name)}</h3><small class="muted">${esc(o.role)}</small></div></div></div>
            <div class="list">
              ${Object.keys(EPI_TYPES).map(t => row(mine.find(e => e.type === t), t, o.id)).join('')}
              ${extras.map(e => row(e, e.type, o.id)).join('')}
            </div>
          </div>`;
      }).join('')}
      <div class="panel">
        <div class="between sec-head" style="margin-bottom:10px; padding-bottom:10px"><div><h3>Reserva en almacén</h3><small class="muted">EPI de repuesto sin asignar</small></div>
          <button class="btn btn-g btn-sm" onclick="epiForm(null, 'casco', '${RESERVA}')">${ic('plus')} Añadir</button></div>
        <div class="list">${spares.map(e => row(e, e.type, RESERVA)).join('') || '<p class="muted">No hay EPI de reserva.</p>'}</div>
      </div>
    </div>`;
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
