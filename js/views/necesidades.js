'use strict';
// SIER 242 · Lista de necesidades: lo que falta o hay que pedir en cada apartado, para que no dependa de la memoria de nadie.
// Cada necesidad (registros «needs») es de un apartado, de USAR, de los vehículos o general, y va pasando de «Falta» a
// «Hay que pedir», «Pedido» y «Recibido» (las recibidas se guardan un tiempo en el historial y luego se pueden borrar).

const NEED_ESTADOS = { falta: ['Falta', 'bad'], pedir: ['Hay que pedir', 'warn'], pedido: ['Pedido', 'info'], recibido: ['Recibido', 'ok'] };
const NEED_ORDEN = Object.keys(NEED_ESTADOS);
// De quién puede ser una necesidad: cada apartado y, además, USAR, Vehículos y General
const needDuenos = () => [...Object.entries(APARTADOS).map(([k, a]) => [k, a.name]), ['usar', 'USAR'], ['veh', 'Vehículos'], ['general', 'General']];
const needDueno = k => needDuenos().find(d => d[0] === k)?.[1] || 'General';
const needs = k => list('needs').filter(n => !k || n.ap === k).sort((a, b) => NEED_ORDEN.indexOf(a.state) - NEED_ORDEN.indexOf(b.state) || (b.ts || 0) - (a.ts || 0));
const needsAbiertas = k => needs(k).filter(n => n.state !== 'recibido');

function needRow(n, conDueno) {
  const [txt, cls] = NEED_ESTADOS[n.state] || NEED_ESTADOS.falta;
  return `<div class="item need ${n.state === 'recibido' ? 'need-ok' : ''}"><button class="link-row grow" onclick="needForm('${n.ap}', '${n.id}')"><b>${esc(n.text)}${(+n.qty || 1) > 1 ? ` <span class="muted nw">× ${+n.qty}</span>` : ''}</b>
    <small>${esc([conDueno ? needDueno(n.ap) : '', n.nota, `${n.by || ''} · ${fmtDate(new Date((n.ts || Date.now()) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10))}`].filter(Boolean).join(' · '))}</small></button>
    <button class="tag ${cls} need-estado" aria-label="${esc(n.text)}: ${txt}. Tocar para pasar al siguiente estado" onclick="needAvanza('${n.id}')">${txt}</button></div>`;
}
// El bloque de necesidades de un apartado (o de todos, con el nombre de cada uno, si no se dice cuál)
function needsBloque(k) {
  const todas = needs(k), abiertas = todas.filter(n => n.state !== 'recibido'), hechas = todas.filter(n => n.state === 'recibido');
  return `<div class="between wrap-row sec-head"><h3>Necesidades</h3><div class="row"><button class="btn btn-a btn-sm" onclick="needForm('${k || ''}')">${ic('plus')} Necesidad</button>
      ${abiertas.length ? `<button class="btn btn-g btn-sm" onclick="shareText(needsTexto('${k || ''}'), 'Lista de necesidades')">${ic('chat')} Enviar</button>` : ''}</div></div>
    ${abiertas.length ? `<div class="list">${abiertas.map(n => needRow(n, !k)).join('')}</div>` : emptyState('checkc', 'Nada pendiente', 'Apunta aquí lo que falta o hay que pedir. Toca la etiqueta para pasarlo a «Hay que pedir», «Pedido» y «Recibido».')}
    ${hechas.length ? `<details class="need-hechas"><summary class="link">Recibido (${hechas.length})</summary><div class="list" style="margin-top:8px">${hechas.map(n => needRow(n, !k)).join('')}</div></details>` : ''}`;
}
function needForm(k, id) {
  const n = id ? get('needs', id) : { ap: k || 'general', state: 'falta', qty: 1 };
  openForm(id ? 'Necesidad' : 'Nueva necesidad', [
    { k: 'text', label: 'Qué hace falta', value: n.text || '', required: true, wide: true, placeholder: 'Ej.: Mosquetones de seguridad' },
    { k: 'qty', label: 'Cuántos', type: 'number', value: n.qty || 1 },
    { k: 'state', label: 'Estado', value: n.state || 'falta', options: Object.entries(NEED_ESTADOS).map(([v, [l]]) => [v, l]) },
    { k: 'ap', label: 'Para', value: n.ap || 'general', options: needDuenos(), wide: true },
    { k: 'nota', label: 'Nota (para qué, a quién se ha pedido…)', value: n.nota || '', wide: true }
  ], v => put('needs', { ...n, id: n.id || uid('NE'), ap: v.ap, text: v.text.trim(), qty: Math.max(1, Math.round(+v.qty || 1)), state: v.state, nota: v.nota || '', by: n.by || prefs.activeOperator, ts: n.ts || Date.now() },
    `Necesidad de ${needDueno(v.ap)}: ${v.text} (${NEED_ESTADOS[v.state][0].toLowerCase()})`),
  id ? `<button type="button" class="btn btn-bad span2" onclick="if (confirm('¿Borrar esta necesidad?')) { remove('needs', '${id}', 'Necesidad borrada'); closeModal(); }">${ic('trash')} Borrar</button>` : '');
}
// Un toque en la etiqueta la pasa al siguiente estado (de «Recibido» ya no pasa)
function needAvanza(id) {
  const n = get('needs', id); if (!n) return; const i = NEED_ORDEN.indexOf(n.state); if (i < 0 || i >= NEED_ORDEN.length - 1) return;
  put('needs', { ...n, state: NEED_ORDEN[i + 1] }, `Necesidad de ${needDueno(n.ap)}: ${n.text} pasa a «${NEED_ESTADOS[NEED_ORDEN[i + 1]][0].toLowerCase()}»`);
}
function needsTexto(k) {
  const ab = needsAbiertas(k);
  return [...waHead('📝', `${UNIDAD} · NECESIDADES`, k ? needDueno(k) : 'Toda la sección'),
    ...NEED_ORDEN.slice(0, 3).flatMap(st => { const l = ab.filter(n => n.state === st); return l.length ? [...waSec(st === 'falta' ? '🔴' : st === 'pedir' ? '🟡' : '🔵', NEED_ESTADOS[st][0].toUpperCase()),
      ...l.map(n => `• ${n.text}${(+n.qty || 1) > 1 ? ' × ' + n.qty : ''}${k ? '' : ' (' + needDueno(n.ap) + ')'}${n.nota ? ': ' + n.nota : ''}`)] : []; })].join('\n');
}
