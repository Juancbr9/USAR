'use strict';
// USAR 242 · Material: contenedor, revisión, pasillo 3, armarios y otros; préstamos y QR

/* ==================== VISTA: MATERIAL ==================== */
// Contenedor y almacén: todo el material guardado en una página (contenedor, pasillo, armarios y otros, con su fungible)
function viewContenedor() {
  return `${almacenJump()}
    <section id="alm-contenedor" class="alm-sec">${viewContVisual()}</section>
    <section id="alm-pasillo" class="alm-sec">${viewPasillo()}</section>
    <section id="alm-armarios" class="alm-sec">${viewArmarios()}</section>
    <section id="alm-otros" class="alm-sec">${viewPlace(OTROS)}</section>`;
}

// «+ Material» elige qué se añade: equipo o herramienta, caja o material fungible (en ese sitio, si se pasa)
function addMaterial(at = {}) {
  if (!soloFlota()) return;
  const a = JSON.stringify(at).replace(/"/g, '&quot;');
  const opt = (fn, icon, title, sub) => `<button class="item" data-add="${icon}" onclick="${fn}"><div class="who-row">${ic(icon, 'i-lg')}<div><b>${title}</b><small>${sub}</small></div></div>${ic('chev', 'i-sm')}</button>`;
  openModal('Añadir material', `<div class="list add-mat">
    ${opt(`gearFormAt(${a})`, 'plus', 'Equipo o herramienta', 'Suelto o dentro de una caja')}
    ${opt(`boxForm(null, ${a})`, 'case', 'Caja', 'Caja Peli con su código y lo que lleva')}
    ${opt(`consForm(null, ${a})`, 'package', 'Material fungible', 'Discos, cadenas, gasolina…: con stock y mínimo')}</div>`);
}

// Marca de novedad y de revisión en fichas y listas
const novTag = x => x.nov?.text ? `<span class="tag nov" title="${esc(x.nov.text)}">${ic('alert', 'i-sm')} Novedad</span>` : '';
const revTag = g => g.status === 'OPERATIVO' ? '' : g.rev ? `<span class="tag ${REV_STATES[g.rev.state]?.[1] || 'warn'}">${esc(REV_STATES[g.rev.state]?.[0] || g.status)}</span>` : `<span class="tag ${STATUS_TAG[g.status]}">${g.status}</span>`;

function gearDetail(id) {
  const g = get('gear', id);
  if (!g) return toast('Ese material ya no existe', 'bad');
  const rows = [
    ['Cantidad', g.qty || '1'],
    ...(g.weight ? [['Peso', kg(g.weight * (+g.qty > 1 ? +g.qty : 1))]] : []),
    ...(g.serial ? [['Nº serie', g.serial]] : []),
    ...(g.service ? [['Mantenimiento', `${fmtDate(g.service)} (${due(g.service).text})`]] : []),
    ...(g.lastCheck ? [['Última revista', fmtDate(g.lastCheck)]] : []),
    ...(g.notes ? [['Dotación', g.notes]] : [])
  ];
  if (g.out) rows.push(['Fuera', `${g.out.who} · desde ${fmtWhen(g.out.since)}${g.out.note ? ' · ' + g.out.note : ''}`]);
  // Cabecera: el dibujo o la foto en grande, el estado y dónde está; debajo, las cuatro acciones de siempre y el resto
  const [stTxt, stCls] = g.out && !g.out.mission ? [`Con ${g.out.who}`, 'info'] : g.status === 'OPERATIVO' ? ['Operativo', 'ok']
    : [REV_STATES[g.rev?.state]?.[0] || g.status, g.status === 'AVERIADO' ? 'bad' : 'warn'];
  openModal(g.name, `
    <div class="fx-hero">
      <div class="fx-art">${g.photo ? `<img src="${esc(g.photo)}" alt="Foto de ${esc(g.name)}">` : toolArt(g.name)}</div>
      <div class="fx-info"><span class="tag ${stCls}">${esc(stTxt)}</span><b>${ic('pin', 'i-sm')} ${esc(whereIs(g))}</b>
        ${boxOf(g) ? `<small>En la caja ${esc(boxCode(g))} · ${esc(boxOf(g).name || '')}</small>` : ''}</div>
    </div>
    ${g.nov?.text ? novBox(g) : ''}
    ${g.status !== 'OPERATIVO' ? revBox(g) : ''}
    <div class="fx-acts">
      <button class="fx-act" onclick="moveForm('gear', '${id}')">${ic('move')}Mover</button>
      ${g.out?.loan ? `<button class="fx-act" onclick="loanDetail('${g.out.loan}')">${ic('out')}Ver entrega</button>` : g.out ? `<button class="fx-act" onclick="checkin('${id}')">${ic('in')}Devolver</button>`
        : `<button class="fx-act" onclick="checkout('${id}')">${ic('out')}Sacar</button>`}
      ${g.status === 'OPERATIVO' ? `<button class="fx-act" onclick="revForm('${id}')">${ic('refresh')}A revisión</button>`
        : `<button class="fx-act" onclick="revEnd('${id}')">${ic('check')}Fin de revisión</button>`}
      <button class="fx-act" onclick="novForm('gear', '${id}')">${ic('pencil')}${g.nov?.text ? 'Cambiar nota' : 'Nota / novedad'}</button>
    </div>
    <dl class="dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <div class="fx-more">
      ${boxOf(g) ? `<button class="btn btn-g btn-sm" onclick="boxDetail('${g.box}')">${ic('case', 'i-sm')} Caja ${esc(boxCode(g))}</button>` : `<button class="btn btn-g btn-sm" onclick="gearToBox('${id}')">${ic('case', 'i-sm')} Meter en caja</button>`}
      <button class="btn btn-g btn-sm" onclick="qrModal('${id}')">${ic('qr', 'i-sm')} Código QR</button>
      ${puedeFlota() ? `<button class="btn btn-g btn-sm" onclick="gearForm('${id}')">${ic('pencil', 'i-sm')} Editar</button>
        <button class="btn btn-bad btn-sm" onclick="removeItem('gear', '${id}')">${ic('trash', 'i-sm')} Eliminar</button>` : ''}
    </div>`);
}

/* ---------- Notas y novedades ---------- */
// Una nota en cualquier material (o caja) lo marca con novedad: sale en Inicio y en «En revisión» hasta que se quita
const novBox = x => `<div class="callout nov"><b>${ic('alert', 'i-sm')} Novedad</b><p class="pre">${esc(x.nov.text)}</p><small class="muted">${esc(x.nov.by || '')} · ${fmtWhen(x.nov.ts)}</small></div>`;
function novForm(kind, id) {
  const x = get(kind === 'box' ? 'boxes' : 'gear', id), name = kind === 'box' ? 'caja ' + x.code : x.name;
  openForm(`Nota · ${name}`, [
    { k: 'text', label: 'Qué le pasa', type: 'textarea', value: x.nov?.text, wide: true, placeholder: 'Ej: Funciona, pero el gatillo se engancha' }
  ], v => {
    const text = (v.text || '').trim();
    put(kind === 'box' ? 'boxes' : 'gear', { ...x, nov: text ? { text, ts: Date.now(), by: prefs.activeOperator } : null },
      text ? `Novedad en ${name}: ${text}` : `Quitada la novedad de ${name}`);
    kind === 'box' ? boxDetail(id) : gearDetail(id);
  }, x.nov?.text ? `<button type="button" class="btn btn-g span2" onclick="const x = get('${kind === 'box' ? 'boxes' : 'gear'}', '${id}'); put('${kind === 'box' ? 'boxes' : 'gear'}', { ...x, nov: null }, ${jsq('Quitada la novedad de ' + name)}); ${kind === 'box' ? 'boxDetail' : 'gearDetail'}('${id}')">${ic('check')} Quitar la novedad</button>` : '');
}

/* ---------- Revisión ---------- */
const revDays = g => g.rev?.since ? Math.max(0, -daysTo(g.rev.since)) : null;
const revSince = g => g.rev?.since ? `Desde ${fmtDate(g.rev.since)}${revDays(g) ? ` (${revDays(g)} d)` : ''}` : 'Sin fecha';
const revBox = g => { const r = g.rev || {}, st = REV_STATES[r.state]; return `<div class="callout rev ${st?.[1] || 'warn'}">
  <b>${ic('refresh', 'i-sm')} ${esc(st?.[0] || 'En revisión')}</b>
  <p>${revSince(g)}${r.where ? ` · ${esc(r.where)}` : ''}</p>
  ${r.reason ? `<p class="pre">${esc(r.reason)}</p>` : ''}${r.notes ? `<small class="muted pre">${esc(r.notes)}</small>` : ''}
  <button class="link" onclick="revForm('${g.id}')">Editar</button></div>`; };
function revForm(id) {
  const g = get('gear', id), r = g.rev || {};
  openForm(`Revisión · ${g.name}`, [
    { k: 'state', label: 'Situación', value: r.state || 'espera', options: Object.entries(REV_STATES).map(([k, [l]]) => [k, l]), required: true },
    { k: 'since', label: 'Desde', type: 'date', value: r.since || todayISO(), required: true },
    { k: 'where', label: 'Dónde está o quién lo tiene', value: r.where, wide: true, placeholder: 'Ej: Taller Holmatro Telde / lo tiene DORTA' },
    { k: 'reason', label: 'Motivo', type: 'textarea', value: r.reason || g.nov?.text, wide: true, placeholder: 'Ej: Pierde aceite por el latiguillo' },
    { k: 'notes', label: 'Notas', value: r.notes, wide: true, placeholder: 'Ej: Presupuesto pedido; nº de orden 1234' }
  ], v => {
    put('gear', { ...g, status: ['inoperativo', 'baja'].includes(v.state) ? 'AVERIADO' : 'REVISIÓN', rev: { ...r, ...v, by: r.by || prefs.activeOperator } },
      `"${g.name}" en revisión: ${REV_STATES[v.state][0].toLowerCase()}${v.where ? ' · ' + v.where : ''}`);
    gearDetail(id);
  });
}
function revEnd(id) {
  const g = get('gear', id);
  openForm(`Fin de revisión · ${g.name}`, [
    { k: 'result', label: 'Cómo queda', value: 'OPERATIVO', options: [['OPERATIVO', 'Operativo, vuelve a su sitio'], ['AVERIADO', 'Sin arreglo (averiado)']], wide: true },
    { k: 'end', label: 'Fecha', type: 'date', value: todayISO() },
    { k: 'notes', label: 'Qué se hizo', value: '', wide: true, placeholder: 'Ej: Cambiado el latiguillo' }
  ], v => {
    const hist = [...(g.revHistory || []), { ...(g.rev || { since: '' }), end: v.end, result: v.result, endNotes: v.notes }].slice(-20);
    put('gear', { ...g, status: v.result, rev: v.result === 'AVERIADO' ? { ...(g.rev || {}), state: 'inoperativo' } : null, revHistory: hist, nov: v.result === 'OPERATIVO' ? null : g.nov },
      `"${g.name}": fin de revisión · ${v.result === 'OPERATIVO' ? 'operativo' : 'sin arreglo'}${v.notes ? ' · ' + v.notes : ''}`);
    gearDetail(id);
  });
}

function viewRevision() {
  const gs = list('gear'), inRev = gs.filter(g => g.status !== 'OPERATIVO').sort((a, b) => (a.rev?.since || '9').localeCompare(b.rev?.since || '9'));
  const nov = [...gs.filter(g => g.nov?.text && g.status === 'OPERATIVO'), ...list('boxes').filter(b => b.nov?.text)];
  const done = gs.flatMap(g => (g.revHistory || []).map(h => ({ g, h }))).sort((a, b) => (b.h.end || '').localeCompare(a.h.end || '')).slice(0, 10);
  const card = g => { const r = g.rev || {}; return `
    <button class="item" onclick="gearDetail('${g.id}')"><div class="who-row">${artMini(g)}<div><b>${esc(g.name)}${qtyText(g)}</b>
      <small>${revSince(g)}${r.where ? ' · ' + esc(r.where) : ''}</small>
      ${r.reason ? `<small>${esc(r.reason)}</small>` : ''}</div></div>${revTag(g)}</button>`; };
  return `
    <div class="panel"><div class="between sec-head"><h2>En revisión</h2><span class="tag ${inRev.length ? 'warn' : 'ok'}">${inRev.length}</span></div>
      ${inRev.length ? `<div class="list">${inRev.map(card).join('')}</div>` : emptyState('checkc', 'Nada en revisión', 'Todo el material está operativo.')}</div>
    ${nov.length ? `<div class="panel"><h3 class="sec-title">${ic('alert')} Con novedad (${nov.length})</h3><div class="list">${nov.map(x => x.code !== undefined && get('boxes', x.id) ? `
      <button class="item" onclick="boxDetail('${x.id}')"><div class="who-row"><span class="box-chip sm" style="--c:${colorOf(x)[1]}; --ink:${colorOf(x)[2]}">${esc(x.code)}</span><div><b>Caja ${esc(x.code)} · ${esc(x.name || '')}</b><small>${esc(x.nov.text)}</small></div></div>${novTag(x)}</button>` : `
      <button class="item" onclick="gearDetail('${x.id}')"><div class="who-row">${artMini(x)}<div><b>${esc(x.name)}</b><small>${esc(x.nov.text)}</small></div></div>${novTag(x)}</button>`).join('')}</div></div>` : ''}
    ${done.length ? `<details class="panel"><summary class="sec-title" style="cursor:pointer">${ic('history')} Revisiones terminadas</summary><div class="list" style="margin-top:10px">${done.map(({ g, h }) => `
      <button class="item" onclick="gearDetail('${g.id}')"><div class="who-row">${artMini(g)}<div><b>${esc(g.name)}</b><small>${h.since ? fmtDate(h.since) + ' → ' : ''}${fmtDate(h.end)}${h.where ? ' · ' + esc(h.where) : ''}${h.endNotes ? ' · ' + esc(h.endNotes) : ''}</small></div></div><span class="tag ${h.result === 'OPERATIVO' ? 'ok' : 'bad'}">${h.result === 'OPERATIVO' ? 'Operativo' : 'Sin arreglo'}</span></button>`).join('')}</div></details>` : ''}`;
}

function gearToBox(id) {
  const g = get('gear', id), bs = boxes();
  if (!bs.length) return toast('Todavía no hay cajas', 'bad');
  openForm(`Meter ${g.name} en una caja`, [{ k: 'box', label: 'Caja', wide: true, required: true, options: bs.map(b => [b.id, `${b.code} · ${b.name || ''} (${boxPlace(b)})`]) }],
    v => { putInBox(id, v.box); gearDetail(id); });
}

function gearForm(id) {
  if (!soloFlota()) return;
  const cur = prefs.door, g = get('gear', id) || { door: typeof cur === 'number' ? cur : 1 };
  openForm(id ? 'Editar material' : 'Añadir material', [
    { k: 'name', label: 'Herramienta / equipo', value: g.name, required: true, wide: true },
    { k: 'place', label: 'Dónde va', value: String(g.door ?? 1), options: placeOptions(), wide: true },
    { k: 'where', label: 'Sitio exacto (si es «Otros»)', value: g.where, wide: true, placeholder: 'Ej: Nave del parque, estantería 2' },
    { k: 'qty', label: 'Cantidad', type: 'number', value: g.qty || 1 },
    { k: 'serial', label: 'Nº serie', value: g.serial },
    { k: 'service', label: 'Próximo mantenimiento / calibración', type: 'date', value: g.service, wide: true },
    { k: 'notes', label: 'Dotación / descripción', value: g.notes, wide: true },
    { k: 'func', label: 'Función (manifiesto)', value: g.func, catalog: 'gearFuncs' },
    { k: 'box', label: 'Caja (si va en caja, el sitio es el de la caja)', value: get('boxes', g.box) ? g.box : '', options: [['', 'Suelto (sin caja)'], ...boxes().map(b => [b.id, `${b.code} · ${b.name || ''}`])], wide: true },
    { k: 'weight', label: 'Peso (kg)', type: 'number', value: g.weight },
    { k: 'volume', label: 'Volumen (m³)', type: 'number', value: g.volume },
    { k: 'value', label: 'Valor (€)', type: 'number', value: g.value },
    { k: 'dg', label: 'Mercancía peligrosa', value: g.dg, options: DANGEROUS.map(d => [d, d || 'No']) },
    { k: 'photo', label: 'Foto', type: 'photo', value: g.photo, wide: true }
  ], v => {
    const base = get('gear', id) || { id: uid('G'), out: null, lastCheck: '', status: 'OPERATIVO' };
    const { place: pl, ...rest } = v, bx = get('boxes', v.box);
    const door = bx ? bx.door : +pl;
    const item = { ...base, ...rest, where: door === OTROS ? (v.where || '').trim() : '', shelf: 'A', door, vehicle: '', qty: +v.qty > 1 ? +v.qty : '', weight: parseFloat(v.weight) || '', volume: parseFloat(v.volume) || '', value: parseFloat(v.value) || '' };
    put('gear', item, `${id ? 'Editado' : 'Añadido'} "${v.name}" en ${placeShort(item)}`);
    setPref({ door });
  });
}

function checkout(id) {
  const g = get('gear', id);
  openForm('Sacar: ' + g.name, [
    { k: 'who', label: 'Quién se lo lleva', value: prefs.activeOperator, options: operators().map(o => [o.name, o.name]), wide: true },
    { k: 'note', label: 'Destino o motivo', placeholder: 'Ej: Maniobras en Arinaga', wide: true }
  ], v => put('gear', { ...g, out: { who: v.who, op: operators().find(o => o.name === v.who)?.id || '', since: Date.now(), note: v.note } }, `Sale "${g.name}" con ${v.who}`));
}

function checkin(id) {
  const g = get('gear', id);
  put('gear', { ...g, out: null }, `Devuelto "${g.name}" a ${placeShort(g)}`);
  // Si era lo último que quedaba fuera de una caja que tenía esa persona, la caja también vuelve
  const b = boxOf(g);
  if (conPersona(b) && !boxItems(b.id).some(x => x.out && x.out.op === b.out.op)) put('boxes', { ...b, out: null });
  gearDetail(id);
}

/* ==================== QR Y ETIQUETAS ==================== */
const gearUrl = id => appUrl() + '#g=' + id;

function qrModal(id) {
  const g = get('gear', id);
  openModal('QR · ' + g.name, `
    <div class="qr">${QR.svg(gearUrl(id))}</div>
    <p class="muted center break" style="margin-bottom:14px">${esc(gearUrl(id))}</p>
    <p class="muted center" style="margin-bottom:14px">Escanéalo con la cámara del móvil para abrir la ficha de este equipo.</p>
    <button class="btn btn-a full" onclick="printLabels(null, ['${id}'])">${ic('printer')} Imprimir etiqueta</button>`);
}

function printLabels(door, ids) {
  const items = ids ? ids.map(id => get('gear', id)).filter(Boolean)
                    : list('gear').filter(g => (groupKey(g) || 0) === door).sort((a, b) => (a.box || '').localeCompare(b.box || '') || byName(a, b));
  if (!items.length) return toast('No hay material en este hueco', 'bad');
  $('print').innerHTML = `<div class="labels">${items.map(g => `
    <div class="label">${QR.svg(gearUrl(g.id), 2)}<b>${esc(g.name)}${qtyText(g)}</b>${esc(placeShort(g))}${boxCode(g) ? ' · caja ' + esc(boxCode(g)) : ''}${g.serial ? ' · S/N ' + esc(g.serial) : ''}</div>`).join('')}</div>`;
  print();
}
