'use strict';
// USAR 242 · Material: contenedor, revisión, pasillo 3, armarios y otros; préstamos y QR

/* ==================== VISTA: MATERIAL ==================== */
// Contenedor y almacén: una página con sus partes (contenedor, sin ubicar, pasillo, armarios, escalón y fungible). Cada
// parte se pliega tocando su barra y se ordena arrastrándola por el asa (⋮⋮); el orden y lo plegado se recuerdan.
// De serie, arriba lo que se arrastra y, al final, el fungible, plegado.
const ALM_SECS = {
  contenedor: ['Contenedor', 'box', () => viewContVisual()],
  sinubicar: ['Sin ubicar', 'alert', () => viewSinUbicar()],
  pasillo: ['Pasillo', 'layers', () => viewPasillo()],
  armarios: ['Armarios', 'case', () => viewArmarios()],
  escalon: ['Escalón', 'wrench', () => viewPlace(ESCALON, '', 'Material en revisión o arreglándose. Suelta aquí lo que se va a revisar.')],
  fungible: ['Fungible', 'package', () => viewFungible()]
};
const almOrder = () => { const o = (prefs.almOrder || []).filter(id => ALM_SECS[id]); return [...o, ...Object.keys(ALM_SECS).filter(id => !o.includes(id))]; };
const almFolded = id => prefs.almFold?.[id] ?? id === 'fungible';
const almUnfold = id => almFolded(id) && setPref({ almFold: { ...prefs.almFold, [id]: false } });
function almFold(id) { setPref({ almFold: { ...prefs.almFold, [id]: !almFolded(id) } }); }
function almFoldAll() { const fold = !almOrder().every(almFolded); setPref({ almFold: Object.fromEntries(Object.keys(ALM_SECS).map(id => [id, fold])) }); }
// Parte de la página donde se ve un sitio (para desplegarla al buscar)
const almSecOf = d => !d ? 'sinubicar' : d <= 20 ? 'contenedor' : enPasillo(d) ? 'pasillo' : enArmarios(d) ? 'armarios' : d === ESCALON ? 'escalon' : '';
// Lo que se ve en la barra de una parte plegada: cuánto hay
function almCount(id) {
  if (id === 'fungible') { const cs = list('consumables'), low = cs.filter(consLow).length; return `${cs.length} artículos${low ? ` · <span class="tag bad">${low} a reponer</span>` : ''}`; }
  const inSec = x => !x.vehicle && enAlmacen(x) && almSecOf(+x.door || 0) === id;
  const b = list('boxes').filter(inSec).length, g = list('gear').filter(x => inSec(x) && !get('boxes', x.box)).length;
  const e = list('epis').filter(x => x.holder === RESERVA && almSecOf(+x.door || 0) === id && +x.door).reduce((s, x) => s + epiQty(x), 0);
  return [b ? b + (b === 1 ? ' caja' : ' cajas') : '', g ? g + (g === 1 ? ' equipo' : ' equipos') : '', e ? e + ' EPI' : ''].filter(Boolean).join(' · ') || 'Vacío';
}
function viewContenedor() {
  const all = almOrder().every(almFolded);
  return `    <div class="alm-tools"><button class="link" onclick="almFoldAll()">${all ? 'Desplegar todo' : 'Plegar todo'}</button></div>
    ${almOrder().map(id => {
      if (id === 'sinubicar' && almCount(id) === 'Vacío') return '';
      const [title, icon, view] = ALM_SECS[id], folded = almFolded(id);
      return `<section id="alm-${id}" class="alm-sec ${folded ? 'folded' : ''}" data-sec="${id}">
        <div class="alm-bar"><button class="alm-grip" aria-label="Arrastrar para cambiar el orden de ${title}">${ic('grip')}</button>
          <button class="alm-tog" aria-expanded="${!folded}" onclick="ALM_NOCLICK || almFold('${id}')">${ic(icon, 'i-sm')}<b>${title}</b><small>${almCount(id)}</small>${ic('chev', 'i-sm alm-chev')}</button></div>
        ${folded ? '' : `<div class="alm-body">${view()}</div>`}</section>`;
    }).join('')}`;
}
// Todo el fungible junto (al final de serie, plegado)
function viewFungible() {
  const cs = list('consumables').sort(byName);
  return `<div class="panel fung">
    ${puedeFlota() ? `<div class="row" style="margin-bottom:12px"><button class="btn btn-a btn-sm" onclick="consForm()">${ic('plus')} Fungible</button></div>` : ''}
    ${cs.length ? `<div class="list">${cs.map(c => consRow(c, true)).join('')}</div>` : '<p class="muted">Aún no hay material fungible.</p>'}
  </div>`;
}

// Ordenar las partes: se mantiene pulsada la barra (o se arrastra desde el asa ⋮⋮) y se lleva encima o debajo de otra;
// la barra sigue al dedo y una raya amarilla marca dónde quedará. Un toque corto solo pliega o despliega.
let SEC_DRAG = null, ALM_NOCLICK = false;
function secStart(d) {
  d.started = true; haptic(25);
  const r = d.bar.getBoundingClientRect(); d.dy = d.y - r.top;
  d.ghost = Object.assign(d.bar.cloneNode(true), { className: 'alm-bar alm-ghost' });
  Object.assign(d.ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px' });
  document.body.appendChild(d.ghost); d.sec.classList.add('sec-moving'); document.body.classList.add('sec-sorting');
}
document.addEventListener('pointerdown', e => {
  const bar = e.target.closest('#view .alm-bar'); if (!bar || e.button > 0) return;
  const grip = !!e.target.closest('.alm-grip'), d = { bar, sec: bar.closest('.alm-sec'), x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' };
  d.id = d.sec.dataset.sec; SEC_DRAG = d;
  if (grip) { e.preventDefault(); secStart(d); }
  else d.timer = setTimeout(() => SEC_DRAG === d && secStart(d), d.touch ? 350 : 450);
});
document.addEventListener('pointermove', e => {
  const d = SEC_DRAG; if (!d) return;
  if (!d.started) { if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) { clearTimeout(d.timer); SEC_DRAG = null; } return; }
  d.ghost.style.top = e.clientY - d.dy + 'px';
  document.querySelectorAll('.alm-sec.drop-before, .alm-sec.drop-after').forEach(s => s.classList.remove('drop-before', 'drop-after'));
  d.ghost.hidden = true; const t = document.elementFromPoint(e.clientX, e.clientY)?.closest('.alm-sec'); d.ghost.hidden = false;
  d.to = t && t !== d.sec ? [t.dataset.sec, e.clientY < t.getBoundingClientRect().top + t.getBoundingClientRect().height / 2 ? 'before' : 'after'] : null;
  if (d.to) t.classList.add('drop-' + d.to[1]);
  const edge = e.clientY < 130 ? -1 : e.clientY > innerHeight - 130 ? 1 : 0;
  if (edge && !d.scroll) d.scroll = setInterval(() => scrollBy(0, edge * 14), 30);
  if (!edge && d.scroll) { clearInterval(d.scroll); d.scroll = null; }
});
document.addEventListener('touchmove', e => { if (SEC_DRAG?.started) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (e.target.closest('.alm-bar')) e.preventDefault(); });
const secDragEnd = () => {
  const d = SEC_DRAG; if (!d) return; SEC_DRAG = null; clearTimeout(d.timer); clearInterval(d.scroll); d.ghost?.remove();
  document.querySelectorAll('.alm-sec').forEach(s => s.classList.remove('drop-before', 'drop-after', 'sec-moving')); document.body.classList.remove('sec-sorting');
  if (d.started) { ALM_NOCLICK = true; setTimeout(() => { ALM_NOCLICK = false; }, 60); }
  return d;
};
document.addEventListener('pointerup', () => {
  const d = secDragEnd(); if (!d?.started || !d.to) return;
  const o = almOrder().filter(id => id !== d.id), [to, where] = d.to;
  o.splice(o.indexOf(to) + (where === 'after' ? 1 : 0), 0, d.id);
  setPref({ almOrder: o }); haptic(10);
});
document.addEventListener('pointercancel', () => { if (!SEC_DRAG?.started) secDragEnd(); });

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
      <button class="btn btn-g btn-sm" onclick="itemHistory('gear', '${id}')">${ic('history', 'i-sm')} Historial</button>
      ${puedeFlota() ? `<button class="btn btn-g btn-sm" onclick="gearForm('${id}')">${ic('pencil', 'i-sm')} Editar</button>
        <button class="btn btn-bad btn-sm" onclick="removeItem('gear', '${id}')">${ic('trash', 'i-sm')} Eliminar</button>` : ''}
    </div>`);
}

/* ---------- Historial de un equipo o una caja: dónde ha estado, quién lo llevó, revisiones y novedades ---------- */
function itemHistory(kind, id) {
  const x = get(kind, id); if (!x) return;
  const name = kind === 'boxes' ? 'Caja ' + x.code : x.name, ev = [];
  list('logs').filter(l => l.ref === kind + ':' + id).forEach(l => ev.push({ ts: l.ts, icon: 'history', text: l.action, who: l.operator }));
  if (kind === 'gear') {
    (x.revHistory || []).forEach(h => h.since && ev.push({ ts: Date.parse(h.since), icon: 'wrench', text: `Entró en revisión${h.reason ? ': ' + h.reason : ''}${h.where ? ' · ' + h.where : ''}`, ref: true }));
    loans().filter(l => (l.gear || []).includes(id)).forEach(l => {
      ev.push({ ts: Date.parse(l.date), icon: 'out', text: `Prestado con firma a ${loanWho(l)}${l.purpose ? ' · ' + l.purpose : ''}` });
      if (l.returned) ev.push({ ts: +l.returned || Date.parse(l.returned) || Date.parse(l.date), icon: 'in', text: `Devuelto por ${loanWho(l)}` });
    });
    list('missions').filter(m => m.status !== 'prep' && missionGearIds(m).includes(id)).forEach(m => ev.push({ ts: m.startedAt || Date.parse(m.date), icon: 'radio', text: `Salió con «${m.title}»` }));
    if (x.out && !x.out.mission && !x.out.loan) ev.push({ ts: x.out.since, icon: 'users', text: `Lo lleva ${x.out.who}` });
  }
  const seen = new Set(), rows = ev.filter(e => e.ts && !isNaN(e.ts)).sort((a, b) => b.ts - a.ts).filter(e => { const k = e.ts + e.text; if (seen.has(k)) return false; seen.add(k); return true; });
  openModal(`Historial · ${name}`, rows.length ? `<ol class="timeline">${rows.map(e => `<li><span class="tl-dot">${ic(e.icon, 'i-sm')}</span><div><b>${esc(e.text)}</b>
    <small>${fmtWhen(e.ts)}${e.who ? ' · ' + esc(e.who) : ''}</small></div></li>`).join('')}</ol>` : emptyState('history', 'Sin historial todavía', 'A partir de ahora se apunta cada cambio: dónde está, quién lo lleva, revisiones y notas.'));
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
  // Si está guardado en el almacén, se ofrece dejarlo en el escalón (donde va el material en revisión)
  const toEsc = !g.vehicle && !g.out && g.door !== ESCALON;
  openForm(`Revisión · ${g.name}`, [
    ...(toEsc ? [{ k: 'esc', label: 'Dónde se deja', value: '1', options: [['1', 'En el escalón'], ['', `Donde está ahora (${placeShort(g)}${boxCode(g) ? ', caja ' + boxCode(g) : ''})`]], wide: true }] : []),
    { k: 'state', label: 'Situación', value: r.state || 'espera', options: Object.entries(REV_STATES).map(([k, [l]]) => [k, l]), required: true },
    { k: 'since', label: 'Desde', type: 'date', value: r.since || todayISO(), required: true },
    { k: 'where', label: 'Dónde está o quién lo tiene', value: r.where, wide: true, placeholder: 'Ej: Taller Holmatro Telde / lo tiene DORTA' },
    { k: 'reason', label: 'Motivo', type: 'textarea', value: r.reason || g.nov?.text, wide: true, placeholder: 'Ej: Pierde aceite por el latiguillo' },
    { k: 'notes', label: 'Notas', value: r.notes, wide: true, placeholder: 'Ej: Presupuesto pedido; nº de orden 1234' }
  ], v => {
    const { esc: aEsc, ...rv } = v;
    put('gear', { ...g, ...(aEsc ? { door: ESCALON, box: '', shelf: 'A' } : {}), status: ['inoperativo', 'baja'].includes(v.state) ? 'AVERIADO' : 'REVISIÓN', rev: { ...r, ...rv, by: r.by || prefs.activeOperator } },
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
  // En el escalón (aquí, a mano) y en el taller o en otro sitio (lo tiene alguien, en un vehículo, sin sitio…)
  const enEsc = inRev.filter(g => g.door === ESCALON && !g.vehicle && !g.out), away = inRev.filter(g => !enEsc.includes(g));
  const grp = (title, icon, gs, hint) => gs.length ? `<h3 class="sec-title rev-grp">${ic(icon, 'i-sm')} ${title} <span class="tag neutral">${gs.length}</span></h3>${hint ? `<p class="muted" style="margin:-6px 0 8px">${hint}</p>` : ''}<div class="list">${gs.map(card).join('')}</div>` : '';
  return `
    <div class="panel"><div class="between sec-head"><h2>Revisión</h2><span class="tag ${inRev.length ? 'warn' : 'ok'}">${inRev.length}</span></div>
      ${inRev.length ? grp('En el escalón', 'wrench', enEsc, 'Aquí, a la espera o arreglándose.') + grp('En el taller o en otro sitio', 'truck', away, 'Fuera del escalón: en el taller, con alguien o sin colocar.')
        : emptyState('checkc', 'Nada en revisión', 'Todo el material está operativo.')}</div>
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
    const item = { ...base, ...rest, where: '', shelf: 'A', door, vehicle: '', qty: +v.qty > 1 ? +v.qty : '', weight: parseFloat(v.weight) || '', volume: parseFloat(v.volume) || '', value: parseFloat(v.value) || '' };
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
