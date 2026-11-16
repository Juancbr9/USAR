'use strict';
// SIER 242 · Los pasillos del almacén. Cada apartado tiene los suyos por número (el Parque, el 1 y el 2; Agua, el 4…) y cada
// pasillo tiene estanterías a la izquierda y a la derecha, con sus módulos y baldas. Todo se configura desde la app y se
// guarda en meta «appas-<apartado>»: { nums: [4], lados: { '4I': { mods, baldas }, '4D': { … } } }.
// Cada material recuerda su hueco: «pas» (n.º de pasillo), «lado» (I o D), «mod» (módulo: 1, 2…) y «niv» (0 = suelo,
// 1 = primera balda…). Lo que no tiene hueco —o lo tenía en uno que ya no existe— sale en «Sin colocar».

const PASILLO_DEF = { mods: 4, baldas: 2 };
const LADOS = { I: 'Izquierda', D: 'Derecha' };
const pasCfg = k => get('meta', 'appas-' + k)?.value || {};
const apPasillos = k => [...new Set((Array.isArray(pasCfg(k).nums) ? pasCfg(k).nums : APARTADOS[k]?.pasillos || []).map(Number).filter(n => n >= 1 && n <= 99))].sort((a, b) => a - b);
const pasLado = (k, pas, lado) => { const p = { ...PASILLO_DEF, ...(pasCfg(k).lados?.[pas + lado] || {}) }; return { mods: Math.min(12, Math.max(1, +p.mods || 1)), baldas: Math.min(6, Math.max(1, +p.baldas || 1)) }; };
const nivNombre = (n, baldas = 2) => !n ? 'Suelo' : baldas > 1 ? 'Balda ' + n : 'Balda';
// Dónde está un material, ya normalizado (lo apuntado antes de haber lados va al primer pasillo, a la izquierda)
const ubic = m => ({ pas: +m.pas || apPasillos(m.ap)[0] || 0, lado: m.lado === 'D' ? 'D' : 'I', mod: +m.mod || 0, niv: +m.niv || 0 });
const colocado = (k, m) => { const u = ubic(m); if (!u.mod || !apPasillos(k).includes(u.pas)) return false; const c = pasLado(k, u.pas, u.lado); return u.mod <= c.mods && u.niv <= c.baldas; };
const enHueco = (k, pas, lado, mod, niv) => apMat(k).filter(m => { const u = ubic(m); return colocado(k, m) && u.pas === pas && u.lado === lado && u.mod === mod && u.niv === niv; });
const sinColocar = k => apMat(k).filter(m => !colocado(k, m));
const huecoTxt = m => { if (!m.ap || m.veh || !colocado(m.ap, m)) return ''; const u = ubic(m);
  return `Pasillo ${u.pas} · ${LADOS[u.lado].toLowerCase()} · módulo ${u.mod} · ${nivNombre(u.niv, pasLado(m.ap, u.pas, u.lado).baldas).toLowerCase()}`; };
// El pasillo y el lado que se están viendo en un apartado
const pasVista = k => { const nums = apPasillos(k); return { pas: nums.includes(prefs.pasN?.[k]) ? prefs.pasN[k] : nums[0], lado: prefs.pasLado === 'D' ? 'D' : 'I' }; };

function pasilloPanel(k) {
  const nums = apPasillos(k), puede = apPuede(k);
  if (!nums.length) return `<div class="panel"><div class="between sec-head"><h3>Pasillo</h3>${puede ? `<button class="btn btn-g btn-sm" onclick="pasConfig('${k}')">${ic('sliders')} Pasillos</button>` : ''}</div>
    <p class="muted">Este apartado no tiene pasillo apuntado. Si guarda su material en alguno, dilo en «Pasillos» y podrás colocarlo en su dibujo.</p></div>`;
  const { pas, lado } = pasVista(k), p = pasLado(k, pas, lado), sueltos = sinColocar(k), total = apMat(k).length;
  const cuantos = (n, l) => apMat(k).filter(m => colocado(k, m) && ubic(m).pas === n && (!l || ubic(m).lado === l)).length;
  const cell = (mod, niv) => { const its = enHueco(k, pas, lado, mod, niv);
    return `<button class="px-cell ${niv ? '' : 'px-floor'}" aria-label="Módulo ${mod}, ${nivNombre(niv, p.baldas).toLowerCase()}: ${its.length ? its.length + (its.length === 1 ? ' cosa' : ' cosas') : 'vacío'}" onclick="pasHueco('${k}', ${pas}, '${lado}', ${mod}, ${niv})">
      ${niv === p.baldas ? `<span class="px-tag">M${mod}</span>` : ''}
      ${its.slice(0, 4).map(m => `<span class="px-it ${matOk(m) ? '' : m.status === 'AVERIADO' ? 'bad' : m.status === 'BAJA' ? 'baja' : 'warn'}">${esc(m.name)}${(+m.qty || 1) > 1 ? ' ×' + m.qty : ''}</span>`).join('')}
      ${its.length > 4 ? `<span class="px-more">+${its.length - 4} más</span>` : ''}</button>`; };
  return `<div class="panel">
    <div class="between sec-head"><h3>Pasillo ${pas}</h3>${puede ? `<button class="btn btn-g btn-sm" onclick="pasConfig('${k}')">${ic('sliders')} Pasillos y baldas</button>` : ''}</div>
    ${nums.length > 1 ? `<div class="row chips" role="group" aria-label="Pasillo" style="margin-bottom:10px">${nums.map(n => `<button class="chip ${n === pas ? 'on' : ''}" aria-pressed="${n === pas}" onclick="setPref({ pasN: { ...prefs.pasN, ${k}: ${n} } })">Pasillo ${n} <span class="muted">${cuantos(n)}</span></button>`).join('')}</div>` : ''}
    <div class="seg-row" role="group" aria-label="Lado del pasillo">${Object.entries(LADOS).map(([l, t]) => `<button class="${l === lado ? 'on' : ''}" aria-pressed="${l === lado}" onclick="setPref({ pasLado: '${l}' })">${t}<small>${cuantos(pas, l)} ${cuantos(pas, l) === 1 ? 'cosa' : 'cosas'}</small></button>`).join('')}</div>
    <p class="muted" style="margin:10px 0 12px">${LADOS[lado]} del pasillo ${pas}: ${p.mods} ${p.mods === 1 ? 'módulo' : 'módulos'}, con el suelo y ${p.baldas} ${p.baldas === 1 ? 'balda' : 'baldas'}. Toca un hueco para ver lo que hay o colocar material.</p>
    <div class="px-scroll"><div class="px" style="--mods:${p.mods}">
      ${Array.from({ length: p.baldas + 1 }, (_, i) => p.baldas - i).map(niv => `
        <div class="px-lvl ${niv ? '' : 'floor'}"><span>${nivNombre(niv, p.baldas)}</span></div>
        ${Array.from({ length: p.mods }, (_, m) => cell(m + 1, niv)).join('')}`).join('')}
    </div></div>
    ${puede ? `<div class="row mat-mas"><button class="link" onclick="pasEtiquetas('${k}')">${ic('qr', 'i-sm')} Etiquetas QR de los huecos</button></div>` : ''}
    ${total ? `<p class="px-suelto ${sueltos.length ? 'warn' : ''}">${sueltos.length ? `${ic('alert', 'i-sm')} Sin colocar: ${sueltos.length} de ${total}. Toca un hueco y elige «Colocar aquí».` : `${ic('checkc', 'i-sm')} Todo el material tiene su hueco.`}</p>` : ''}
  </div>`;
}

// Un hueco: lo que hay, quitarlo de ahí, añadir material nuevo directamente en él o traer algo que estaba sin colocar
function pasHueco(k, pas, lado, mod, niv) {
  const p = pasLado(k, pas, lado), its = enHueco(k, pas, lado, mod, niv), sueltos = sinColocar(k), puede = apPuede(k), aqui = `${pas}, '${lado}', ${mod}, ${niv}`;
  openModal(`Pasillo ${pas} ${LADOS[lado].toLowerCase()} · M${mod} · ${nivNombre(niv, p.baldas)}`, `
    ${its.length ? `<div class="list">${its.map(m => `<div class="item"><button class="link-row grow" onclick="matForm('ap:${k}', '${m.id}')"><b>${esc(m.name)}${(+m.qty || 1) > 1 ? ` <span class="muted nw">× ${+m.qty}</span>` : ''}</b>
        <small>${esc([m.holder && get('operators', m.holder) ? 'Lo tiene ' + opName(m.holder) : '', AP_ESTADOS[m.status]?.[0] !== 'Operativo' ? AP_ESTADOS[m.status]?.[0] : '', m.place, m.notes].filter(Boolean).join(' · ') || 'Toca para ver o cambiar')}</small></button>
        ${puede ? `<button class="btn btn-g btn-sm" onclick="pasMover('${m.id}'); pasHueco('${k}', ${aqui})">Quitar</button>` : ''}</div>`).join('')}</div>`
      : `<p class="muted">Este hueco está vacío.</p>`}
    ${puede ? `<div class="row" style="margin-top:12px"><button class="btn btn-a" onclick="matForm('ap:${k}', '', { pas: ${pas}, lado: '${lado}', mod: ${mod}, niv: ${niv} })">${ic('plus')} Material aquí</button></div>
      ${sueltos.length ? `<h4 class="sec-title" style="margin:16px 0 8px">Colocar aquí lo que no tiene sitio</h4>
        <div class="list">${sueltos.map(m => `<button class="item" onclick="pasMover('${m.id}', ${aqui}); pasHueco('${k}', ${aqui})"><div><b>${esc(m.name)}${(+m.qty || 1) > 1 ? ` <span class="muted nw">× ${+m.qty}</span>` : ''}</b>
          <small>${esc(m.place || 'Sin sitio apuntado')}</small></div>${ic('in', 'i-sm')}</button>`).join('')}</div>` : ''}` : ''}`);
}
// Coloca un material en un hueco; sin hueco, lo deja sin colocar
function pasMover(id, pas = 0, lado = 'I', mod = 0, niv = 0) {
  const m = get('matesp', id); if (!m || !apPuede(m.ap)) return;
  put('matesp', { ...m, pas, lado, mod, niv }, mod ? `${APARTADOS[m.ap].name}: ${m.name} al pasillo ${pas} ${LADOS[lado].toLowerCase()}, módulo ${mod}, ${nivNombre(niv, pasLado(m.ap, pas, lado).baldas).toLowerCase()}` : `${APARTADOS[m.ap].name}: ${m.name} sin colocar`);
}
// Qué pasillos tiene el apartado y cuántos módulos y baldas tiene el lado que se está viendo (o los dos a la vez)
function pasConfig(k) {
  if (!apPuede(k)) return;
  const nums = apPasillos(k), { pas, lado } = pasVista(k), p = pas ? pasLado(k, pas, lado) : PASILLO_DEF;
  openForm(`Pasillos de ${APARTADOS[k].name}`, [
    { k: 'nums', label: 'Números de pasillo de este apartado (separados por comas; vacío si no tiene)', value: nums.join(', '), wide: true, placeholder: 'Ej.: 1, 2' },
    ...(pas ? [{ k: 'mods', label: `Módulos del pasillo ${pas}, ${LADOS[lado].toLowerCase()} (de 1 a 12)`, type: 'number', value: p.mods, required: true },
      { k: 'baldas', label: 'Baldas, sin contar el suelo (de 1 a 6)', type: 'number', value: p.baldas, required: true },
      { k: 'ambos', label: 'Lados', type: 'checks', wide: true, value: [], options: [['si', 'Poner lo mismo en el otro lado del pasillo']] }] : [])
  ], v => {
    const nuevos = [...new Set(String(v.nums || '').split(/[^\d]+/).map(Number).filter(n => n >= 1 && n <= 99))].sort((a, b) => a - b);
    const cfg = { mods: Math.min(12, Math.max(1, Math.round(+v.mods || PASILLO_DEF.mods))), baldas: Math.min(6, Math.max(1, Math.round(+v.baldas || PASILLO_DEF.baldas))) };
    const lados = { ...(pasCfg(k).lados || {}), ...(pas ? { [pas + lado]: cfg, ...((v.ambos || []).includes('si') ? { [pas + (lado === 'I' ? 'D' : 'I')]: cfg } : {}) } : {}) };
    put('meta', { id: 'appas-' + k, value: { nums: nuevos, lados } }, `Pasillos de ${APARTADOS[k].name}: ${nuevos.join(', ') || 'ninguno'}`);
  }, `<p class="muted span2">Si quitas un pasillo, módulos o baldas, lo que estaba en ellos pasa a «Sin colocar»; no se borra nada.</p>`);
}

// Etiquetas con QR para pegar en cada hueco del pasillo que se está viendo (los dos lados): al leerlas se abre ese hueco
function pasEtiquetas(k) {
  const { pas } = pasVista(k); if (!pas) return;
  const huecos = ['I', 'D'].flatMap(lado => { const p = pasLado(k, pas, lado);
    return Array.from({ length: p.mods }, (_, m) => Array.from({ length: p.baldas + 1 }, (_, niv) => [lado, m + 1, niv, p.baldas])).flat(); });
  $('print').innerHTML = `<div class="labels">${huecos.map(([lado, mod, niv, baldas]) => `<div class="label">${QR.svg(appUrl() + '#h=' + [k, pas, lado, mod, niv].join('.'), 2)}
    <b>Pasillo ${pas} · ${LADOS[lado]}</b>Módulo ${mod} · ${nivNombre(niv, baldas)} · ${esc(APARTADOS[k].name)}</div>`).join('')}</div>`;
  print();
}

/* ---------- Qué apartado hay en cada pasillo del almacén ---------- */
// USAR tiene su propio dibujo del pasillo (en su Almacén); aquí solo se apunta qué número es
const usarPasillos = () => { const v = get('meta', 'usarpas')?.value; return (Array.isArray(v) ? v : [3]).map(Number).filter(n => n >= 1); };
const pasDuenos = n => [...(usarPasillos().includes(n) ? ['usar'] : []), ...Object.keys(APARTADOS).filter(k => apPasillos(k).includes(n))];
const pasDuenoTxt = d => d === 'usar' ? 'USAR' : APARTADOS[d]?.name || '';
const almacenNums = (extra = 0) => Array.from({ length: Math.max(6, ...usarPasillos(), ...Object.keys(APARTADOS).flatMap(apPasillos)) + extra }, (_, i) => i + 1);
function almacenPanel() {
  return `<div class="panel"><div class="between"><h3>Pasillos del almacén</h3><button class="btn btn-g btn-sm" onclick="almacenForm()">${ic('sliders')} Cambiar</button></div>
    <div class="log-rows">${almacenNums().map(n => { const ds = pasDuenos(n), k = ds.find(d => d !== 'usar');
      const cuenta = ds.filter(d => d !== 'usar').reduce((t, d) => t + apMat(d).filter(m => colocado(d, m) && ubic(m).pas === n).length, 0);
      const ir = ds[0] === 'usar' ? "go('pasillo')" : k ? `setPref({ tab: '${k}', aptab: 'material', pasN: { ...prefs.pasN, ${k}: ${n} } }); scrollTo(0, 0)` : '';
      return logRow('Pasillo ' + n, ds.map(pasDuenoTxt).join(' y ') || 'Libre', '', ir, k ? ` ${cuenta} ${cuenta === 1 ? 'cosa colocada' : 'cosas colocadas'}` : ''); }).join('')}</div></div>`;
}
// Un desplegable por pasillo: de quién es. Solo se toca lo que se cambia (un pasillo compartido sigue compartido si no se toca)
function almacenForm() {
  const nums = almacenNums(2), antes = Object.fromEntries(nums.map(n => [n, pasDuenos(n)[0] || '']));
  openForm('Pasillos del almacén', nums.map(n => ({ k: 'p' + n, label: `Pasillo ${n}${pasDuenos(n).length > 1 ? ' (compartido: ' + pasDuenos(n).map(pasDuenoTxt).join(' y ') + ')' : ''}`, value: antes[n],
    options: [['', 'Libre'], ['usar', 'USAR'], ...Object.entries(APARTADOS).map(([k, a]) => [k, a.name])] })), v => {
    const cambios = nums.filter(n => (v['p' + n] || '') !== antes[n]); if (!cambios.length) return;
    let usar = usarPasillos(); const ap = Object.fromEntries(Object.keys(APARTADOS).map(k => [k, apPasillos(k)]));
    cambios.forEach(n => { const d = v['p' + n] || '';
      usar = usar.filter(x => x !== n); Object.keys(ap).forEach(k => { ap[k] = ap[k].filter(x => x !== n); });
      if (d === 'usar') usar.push(n); else if (d) ap[d].push(n); });
    Object.keys(ap).forEach(k => { if (ap[k].join() !== apPasillos(k).join()) stamp('meta', { id: 'appas-' + k, value: { ...pasCfg(k), nums: ap[k].sort((a, b) => a - b) } }); });
    put('meta', { id: 'usarpas', value: usar.sort((a, b) => a - b) }, `Pasillos del almacén: ${cambios.map(n => `el ${n}, ${v['p' + n] ? pasDuenoTxt(v['p' + n]) : 'libre'}`).join('; ')}`);
  }, `<p class="muted span2">Di qué especialidad hay en cada pasillo. Al cambiarlo no se borra nada: el material sigue apuntado en su apartado y, si se queda sin pasillo, pasa a «Sin colocar».</p>`);
}
