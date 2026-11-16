'use strict';
// SIER 242 · El pasillo de cada especialidad: una estantería dibujada (módulos × niveles) donde se coloca su material,
// como el pasillo de USAR. Cada apartado dice cuántos módulos y baldas tiene (meta «appas-<apartado>») y cada material
// recuerda su hueco en «mod» (módulo: 1, 2…) y «niv» (0 = suelo, 1 = primera balda…). Lo que no tiene hueco —o lo tenía en
// un módulo que ya no existe— sale en «Sin colocar».

const PASILLO_DEF = { mods: 4, baldas: 2 };
const apPasillo = k => { const p = { ...PASILLO_DEF, ...(get('meta', 'appas-' + k)?.value || {}) }; return { mods: Math.min(12, Math.max(1, +p.mods || 1)), baldas: Math.min(6, Math.max(1, +p.baldas || 1)) }; };
const nivNombre = (n, baldas = 2) => !n ? 'Suelo' : baldas > 1 ? 'Balda ' + n : 'Balda';
const colocado = (k, m) => { const p = apPasillo(k); return +m.mod >= 1 && +m.mod <= p.mods && (+m.niv || 0) <= p.baldas; };
const enHueco = (k, mod, niv) => apMat(k).filter(m => colocado(k, m) && +m.mod === mod && (+m.niv || 0) === niv);
const sinColocar = k => apMat(k).filter(m => !colocado(k, m));
const huecoTxt = m => m.ap && !m.veh && colocado(m.ap, m) ? `Pasillo · módulo ${m.mod} · ${nivNombre(+m.niv || 0, apPasillo(m.ap).baldas).toLowerCase()}` : '';

function pasilloPanel(k) {
  const p = apPasillo(k), puede = apPuede(k), sueltos = sinColocar(k), total = apMat(k).length;
  const cell = (mod, niv) => { const its = enHueco(k, mod, niv);
    return `<button class="px-cell ${niv ? '' : 'px-floor'}" aria-label="Módulo ${mod}, ${nivNombre(niv, p.baldas).toLowerCase()}: ${its.length ? its.length + (its.length === 1 ? ' cosa' : ' cosas') : 'vacío'}" onclick="pasHueco('${k}', ${mod}, ${niv})">
      ${niv === p.baldas ? `<span class="px-tag">M${mod}</span>` : ''}
      ${its.slice(0, 4).map(m => `<span class="px-it ${matOk(m) ? '' : m.status === 'AVERIADO' ? 'bad' : 'warn'}">${esc(m.name)}${(+m.qty || 1) > 1 ? ' ×' + m.qty : ''}</span>`).join('')}
      ${its.length > 4 ? `<span class="px-more">+${its.length - 4} más</span>` : ''}</button>`; };
  return `<div class="panel">
    <div class="between sec-head"><h3>Pasillo</h3>${puede ? `<button class="btn btn-g btn-sm" onclick="pasConfig('${k}')">${ic('sliders')} Módulos y baldas</button>` : ''}</div>
    <p class="muted" style="margin:0 0 12px">${p.mods} ${p.mods === 1 ? 'módulo' : 'módulos'}, con el suelo y ${p.baldas} ${p.baldas === 1 ? 'balda' : 'baldas'}. Toca un hueco para ver lo que hay o colocar material.</p>
    <div class="px-scroll"><div class="px" style="--mods:${p.mods}">
      ${Array.from({ length: p.baldas + 1 }, (_, i) => p.baldas - i).map(niv => `
        <div class="px-lvl ${niv ? '' : 'floor'}"><span>${nivNombre(niv, p.baldas)}</span></div>
        ${Array.from({ length: p.mods }, (_, m) => cell(m + 1, niv)).join('')}`).join('')}
    </div></div>
    ${total ? `<p class="px-suelto ${sueltos.length ? 'warn' : ''}">${sueltos.length ? `${ic('alert', 'i-sm')} Sin colocar: ${sueltos.length} de ${total}. Toca un hueco y elige «Colocar aquí».` : `${ic('checkc', 'i-sm')} Todo el material tiene su hueco.`}</p>` : ''}
  </div>`;
}

// Un hueco: lo que hay, quitarlo de ahí, añadir material nuevo directamente en él o traer algo que estaba sin colocar
function pasHueco(k, mod, niv) {
  const p = apPasillo(k), its = enHueco(k, mod, niv), sueltos = sinColocar(k), puede = apPuede(k);
  openModal(`Módulo ${mod} · ${nivNombre(niv, p.baldas)}`, `
    ${its.length ? `<div class="list">${its.map(m => `<div class="item"><button class="link-row grow" onclick="matForm('ap:${k}', '${m.id}')"><b>${esc(m.name)}${(+m.qty || 1) > 1 ? ` <span class="muted nw">× ${+m.qty}</span>` : ''}</b>
        <small>${esc([AP_ESTADOS[m.status]?.[0] !== 'Operativo' ? AP_ESTADOS[m.status]?.[0] : '', m.place, m.notes].filter(Boolean).join(' · ') || 'Toca para ver o cambiar')}</small></button>
        ${puede ? `<button class="btn btn-g btn-sm" onclick="pasMover('${m.id}', 0, 0); pasHueco('${k}', ${mod}, ${niv})">Quitar</button>` : ''}</div>`).join('')}</div>`
      : `<p class="muted">Este hueco está vacío.</p>`}
    ${puede ? `<div class="row" style="margin-top:12px"><button class="btn btn-a" onclick="matForm('ap:${k}', '', { mod: ${mod}, niv: ${niv} })">${ic('plus')} Material aquí</button></div>
      ${sueltos.length ? `<h4 class="sec-title" style="margin:16px 0 8px">Colocar aquí lo que no tiene sitio</h4>
        <div class="list">${sueltos.map(m => `<button class="item" onclick="pasMover('${m.id}', ${mod}, ${niv}); pasHueco('${k}', ${mod}, ${niv})"><div><b>${esc(m.name)}${(+m.qty || 1) > 1 ? ` <span class="muted nw">× ${+m.qty}</span>` : ''}</b>
          <small>${esc(m.place || 'Sin sitio apuntado')}</small></div>${ic('in', 'i-sm')}</button>`).join('')}</div>` : ''}` : ''}`);
}
function pasMover(id, mod, niv) {
  const m = get('matesp', id); if (!m || !apPuede(m.ap)) return;
  put('matesp', { ...m, mod, niv }, mod ? `${APARTADOS[m.ap].name}: ${m.name} al módulo ${mod}, ${nivNombre(niv, apPasillo(m.ap).baldas).toLowerCase()}` : `${APARTADOS[m.ap].name}: ${m.name} sin colocar`);
}
function pasConfig(k) {
  if (!apPuede(k)) return;
  const p = apPasillo(k);
  openForm(`Pasillo de ${APARTADOS[k].name}`, [
    { k: 'mods', label: 'Módulos (de 1 a 12)', type: 'number', value: p.mods, required: true },
    { k: 'baldas', label: 'Baldas, sin contar el suelo (de 1 a 6)', type: 'number', value: p.baldas, required: true }
  ], v => put('meta', { id: 'appas-' + k, value: { mods: Math.min(12, Math.max(1, Math.round(+v.mods || 1))), baldas: Math.min(6, Math.max(1, Math.round(+v.baldas || 1))) } }, `Pasillo de ${APARTADOS[k].name}: ${v.mods} módulos y ${v.baldas} baldas`),
  `<p class="muted span2">Si quitas módulos o baldas, lo que estaba en ellos pasa a «Sin colocar»; no se borra nada.</p>`);
}
