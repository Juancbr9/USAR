'use strict';
// USAR 242 · Cajas Peli, dibujo del contenedor por laterales y de los armarios (arrastrar y soltar), pasillo 3 y otros.
// El material va casi siempre dentro de cajas (Peli, de madera…). Cada caja tiene su sitio (un hueco B1–B20, o un vehículo),
// su peso en vacío y sus medidas; el peso total se calcula con lo que lleva dentro o se apunta pesándola.

const BOX_COLORS = {
  negro: ['Negra', '#2b2d30', '#fff'], amarillo: ['Amarilla', '#f2c200', '#1d1d1d'], naranja: ['Naranja', '#e8711c', '#1d1d1d'],
  rojo: ['Roja', '#c62828', '#fff'], azul: ['Azul', '#2563b0', '#fff'], verde: ['Verde', '#55663a', '#fff'],
  gris: ['Gris', '#8a9096', '#111'], arena: ['Arena', '#c8b48a', '#1d1d1d'], madera: ['Madera', '#a0703c', '#fff']
};
const BOX_PICK = ['negro', 'amarillo'];   // colores de las cajas del equipo
function setBoxColor(id, color) { const b = get('boxes', id); put('boxes', { ...b, color }, `Caja ${b.code}: ${BOX_COLORS[color][0].toLowerCase()}`); boxDetail(id); }
const SIDES = { izq: ['Lateral izquierdo', 'B1–B10', 0], der: ['Lateral derecho', 'B11–B20', 10] };

/* ---------- Datos de cajas ---------- */
const boxes = () => list('boxes').sort((a, b) => (a.code || '').localeCompare(b.code || '', 'es', { numeric: true }));
const boxItems = id => list('gear').filter(g => g.box === id).sort(byName);
const boxOf = g => g.box ? get('boxes', g.box) : null;
const boxCode = g => boxOf(g)?.code || '';
const boxPlace = b => placeShort(b);
const kg = n => (Math.round(n * 10) / 10).toLocaleString('es-ES') + ' kg';
// Siguiente código libre: H- en el lateral izquierdo y U- en el derecho, como las cajas del equipo
function nextBoxCode(door) {
  const pre = door > 10 && door <= 20 ? 'U-' : 'H-';
  return pre + (Math.max(0, ...list('boxes').filter(b => String(b.code).startsWith(pre)).map(b => parseInt(String(b.code).slice(2)) || 0)) + 1);
}
// Peso de una caja: el pesado si se apuntó; si no, vacío + lo de dentro (estimado si a algún equipo le falta el peso)
function boxWeight(b) {
  const items = boxItems(b.id);
  const inside = items.reduce((s, g) => s + (parseFloat(g.weight) || 0) * (+g.qty > 1 ? +g.qty : 1), 0);
  if (+b.measured) return { kg: +b.measured, measured: true, missing: 0 };
  return { kg: (parseFloat(b.tare) || 0) + inside, measured: false, missing: items.filter(g => !parseFloat(g.weight)).length + (parseFloat(b.tare) ? 0 : 1) };
}
const boxWeightText = b => { const w = boxWeight(b); return w.kg ? (w.missing && !w.measured ? '≈ ' : '') + kg(w.kg) : 'Sin peso'; };
const boxDims = b => [b.len, b.wid, b.hei].every(x => +x) ? `${b.len} × ${b.wid} × ${b.hei} cm` : '';
const boxVolume = b => [b.len, b.wid, b.hei].every(x => +x) ? b.len * b.wid * b.hei / 1e6 : 0;
const boxDG = b => [...new Set(boxItems(b.id).map(g => g.dg).filter(Boolean))];
const boxBad = b => boxItems(b.id).some(g => g.status !== 'OPERATIVO');
const colorOf = b => BOX_COLORS[b.color] || BOX_COLORS.negro;

// Mueve una caja con todo lo que lleva dentro
const placeName = (door, vehicle) => vehicle ? vehName(vehicle) : placeShort({ door: +door });
function moveBox(id, door, vehicle = '') {
  const b = get('boxes', id); if (!b) return;
  const pos = Date.now();
  stamp('boxes', { ...b, door: vehicle ? 0 : +door, shelf: 'A', vehicle, pos });
  boxItems(id).forEach(g => stamp('gear', { ...g, door: vehicle ? 0 : +door, shelf: 'A', vehicle }));
  addLog(`Caja ${b.code} → ${placeName(door, vehicle)}`); commit();
}
// Mueve un equipo suelto (si estaba en una caja, sale de ella)
function moveGear(id, door, vehicle = '') {
  const g = get('gear', id); if (!g) return;
  put('gear', { ...g, box: '', door: vehicle ? 0 : +door, shelf: 'A', vehicle }, `"${g.name}" → ${placeName(door, vehicle)}`);
}
function putInBox(gid, bid) {
  const g = get('gear', gid), b = get('boxes', bid); if (!g || !b) return;
  put('gear', { ...g, box: bid, door: b.door, shelf: 'A', vehicle: b.vehicle || '' }, `"${g.name}" dentro de la caja ${b.code}`);
}

// El material se guarda en el contenedor; a los vehículos se carga en cada actividad (Operación → Personal → Vehículo)
const placeOptions = () => [...DOOR_IDS.map(d => [String(d), `Contenedor · ${doorName(d)} (${sideName(d)})`]), ['0', 'Contenedor · sin ubicar (pendiente de colocar)'],
  ...PLACES.map(p => [String(p.id), p.label])];
const parsePlace = pl => pl.startsWith('V:') ? { vehicle: pl.slice(2), door: 0 } : { vehicle: '', door: +pl };

/* ---------- Formularios ---------- */
function boxForm(id, at = {}) {
  const door0 = at.door ?? (typeof prefs.door === 'number' ? prefs.door : 1);
  const b = get('boxes', id) || { code: nextBoxCode(door0), model: prefs.last?.boxModel || 'Peli 1650', color: 'negro', heli: 'si', door: door0, vehicle: at.vehicle || '' };
  openForm(id ? `Editar caja ${b.code}` : 'Nueva caja', [
    { k: 'code', label: 'Código (lo que pone en la caja)', value: b.code, required: true },
    { k: 'name', label: 'Qué lleva', value: b.name, required: true, placeholder: 'Ej: Cizallas Holmatro' },
    { k: 'model', label: 'Modelo de caja', value: b.model, catalog: 'boxModels', carry: 'boxModel' },
    { k: 'color', label: 'Color', value: b.color || 'negro', options: Object.entries(BOX_COLORS).filter(([k]) => BOX_PICK.includes(k) || k === b.color).map(([k, [l]]) => [k, l]) },
    { k: 'place', label: 'Dónde va', value: b.vehicle ? 'V:' + b.vehicle : String(b.door ?? 1), options: placeOptions() },
    { k: 'func', label: 'Tipo de material', value: b.func, catalog: 'gearFuncs' },
    { k: 'tare', label: 'Peso de la caja vacía (kg)', type: 'number', value: b.tare },
    { k: 'measured', label: 'Peso total pesada (kg)', type: 'number', value: b.measured, placeholder: 'Si la habéis pesado llena' },
    { k: 'len', label: 'Largo (cm)', type: 'number', value: b.len },
    { k: 'wid', label: 'Ancho (cm)', type: 'number', value: b.wid },
    { k: 'hei', label: 'Alto (cm)', type: 'number', value: b.hei },
    { k: 'notes', label: 'Notas', value: b.notes, wide: true, placeholder: 'Ej: Va cerrada con precinto; abrir con llave 2' },
    { k: 'photo', label: 'Foto de la caja abierta', type: 'photo', value: b.photo, wide: true }
  ], v => {
    const { place, ...rest } = v, loc = parsePlace(place);
    if (list('boxes').some(x => x.id !== id && x.code === v.code)) return toast(`Ya hay una caja ${v.code}`, 'bad');
    const num = k => parseFloat(v[k]) || '';
    const rec = { id: id || uid('K'), pos: b.pos || Date.now(), ...b, ...rest, ...loc, shelf: 'A', tare: num('tare'), measured: num('measured'), len: num('len'), wid: num('wid'), hei: num('hei') };
    const moved = id && (b.door !== rec.door || (b.vehicle || '') !== rec.vehicle);
    put('boxes', rec, `${id ? 'Editada' : 'Nueva'} caja ${rec.code} (${boxPlace(rec)})`);
    if (moved) moveBox(rec.id, rec.door, rec.vehicle);
    if (!id) boxDetail(rec.id);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="deleteBox('${id}')">${ic('trash')} Eliminar caja</button>` : '');
}

function deleteBox(id) {
  const b = get('boxes', id), items = boxItems(id);
  if (!confirm(`¿Eliminar la caja ${b.code}?` + (items.length ? `\n\nSus ${items.length} equipos se quedan sueltos en el mismo sitio (no se borran).` : ''))) return;
  items.forEach(g => stamp('gear', { ...g, box: '' }));
  closeModal(); remove('boxes', id, `Eliminada la caja ${b.code}`);
}

function boxDetail(id) {
  const b = get('boxes', id);
  if (!b) return toast('Esa caja ya no existe', 'bad');
  const items = boxItems(id), w = boxWeight(b), [cname, chex, cink] = colorOf(b), dg = boxDG(b);
  const rows = [
    ['Dónde está', whereIs(b)],
    ...(b.model ? [['Modelo', b.model]] : []),
    ['Medidas', boxDims(b) || 'Sin medidas'],
    ['Peso', w.kg ? `${kg(w.kg)} ${w.measured ? '(pesada)' : w.missing ? `(estimado: faltan ${w.missing} pesos)` : '(calculado)'}` : 'Sin peso'],
    ...(dg.length ? [['Mercancía peligrosa', dg.join(', ')]] : []),
    ...(b.func ? [['Tipo', b.func]] : []), ...(b.notes ? [['Notas', b.notes]] : [])
  ];
  openModal(`Caja ${b.code}`, `
    <div class="box-hero" style="--c:${chex}; --ink:${cink}"><span class="box-lid"></span><b>${esc(b.code)}</b><span>${esc(b.name || '')}</span></div>
    ${b.nov?.text ? novBox(b) : ''}
    <div class="color-pick" role="group" aria-label="Color de la caja"><span class="muted">Color</span>${BOX_PICK.map(k => `
      <button class="${b.color === k || (!b.color && k === 'negro') ? 'on' : ''}" style="--c:${BOX_COLORS[k][1]}" onclick="setBoxColor('${id}', '${k}')" aria-pressed="${b.color === k}"><i></i>${BOX_COLORS[k][0]}</button>`).join('')}</div>
    ${b.photo ? `<img class="art-lg" data-img="${esc(b.photo)}" alt="">` : ''}
    <dl class="dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
    <div class="between" style="margin:14px 0 8px"><h3 class="sec-title" style="margin:0">Dentro (${items.length})</h3>
      <button class="btn btn-a btn-sm" onclick="boxFill('${id}')">${ic('plus')} Meter material</button></div>
    ${items.length ? `<div class="list">${items.map(g => `
      <div class="item"><button class="grow who-row" style="text-align:left" onclick="gearDetail('${g.id}')">${artMini(g)}<span><b>${esc(g.name)}${qtyText(g)}</b>
        <small>${g.weight ? kg(g.weight * (+g.qty > 1 ? +g.qty : 1)) : 'sin peso'}${g.serial ? ' · S/N ' + esc(g.serial) : ''}</small></span></button>
        ${revTag(g)}${novTag(g)}
        <button class="link" aria-label="Sacar de la caja" title="Sacar de la caja" onclick="moveGear('${g.id}', ${b.door || 0}, '${b.vehicle || ''}'); boxDetail('${id}')">${ic('out', 'i-sm')}</button></div>`).join('')}</div>`
      : '<p class="muted">Caja vacía.</p>'}
    <div class="grid g2" style="grid-template-columns:1fr 1fr; margin-top:14px">
      <button class="btn btn-g" onclick="novForm('box', '${id}')">${ic('pencil')} ${b.nov?.text ? 'Cambiar nota' : 'Nota / novedad'}</button>
      <button class="btn btn-g" onclick="moveForm('box', '${id}')">${ic('move')} Mover</button>
      <button class="btn btn-g" onclick="boxForm('${id}')">${ic('pencil')} Editar</button>
      <button class="btn btn-g" onclick="printBoxLabels(['${id}'])">${ic('qr')} Etiqueta</button>
    </div>`);
}

// Elegir qué material va dentro de una caja (primero lo suelto del mismo hueco)
function boxFill(id) {
  const b = get('boxes', id), here = g => !g.vehicle === !b.vehicle && (b.vehicle ? g.vehicle === b.vehicle : (g.door || 0) === (b.door || 0));
  const cand = list('gear').filter(g => g.box !== id).sort((x, y) => (here(y) - here(x)) || (!!x.box - !!y.box) || byName(x, y));
  openModal(`Meter en la caja ${b.code}`, `
    <form id="boxFillForm" class="stack">
      
      <div class="checks">${cand.map(g => `<label class="check-row"><input type="checkbox" name="g" value="${g.id}">
        <span>${esc(g.name)}${qtyText(g)} <small class="muted">${esc(g.box ? 'en ' + boxCode(g) : placeShort(g))}</small></span></label>`).join('') || '<p class="muted">No hay más material.</p>'}</div>
      <button class="btn btn-a full">${ic('check')} Meter en la caja</button>
    </form>`);
  $('boxFillForm').onsubmit = e => {
    e.preventDefault();
    const ids = new FormData(e.target).getAll('g');
    ids.forEach(gid => { const g = get('gear', gid); stamp('gear', { ...g, box: id, door: b.door, shelf: 'A', vehicle: b.vehicle || '' }); });
    addLog(`${ids.length} equipos dentro de la caja ${b.code}`); commit(); boxDetail(id);
  };
}

// Mover una caja o un equipo sin arrastrar (también sirve para pasar de un lateral a otro)
function moveForm(kind, id) {
  const it = kind === 'box' ? get('boxes', id) : get('gear', id);
  openForm(`Mover ${kind === 'box' ? 'la caja ' + it.code : it.name}`, [
    { k: 'place', label: 'A dónde', value: it.vehicle ? 'V:' + it.vehicle : String(it.door ?? 1), options: placeOptions(), wide: true }
  ], v => {
    const { door, vehicle } = parsePlace(v.place);
    kind === 'box' ? moveBox(id, door, vehicle) : moveGear(id, door, vehicle);
    kind === 'box' ? boxDetail(id) : gearDetail(id);
  });
}

function printBoxLabels(ids = boxes().map(b => b.id)) {
  const bs = ids.map(id => get('boxes', id)).filter(Boolean);
  if (!bs.length) return toast('No hay cajas', 'bad');
  $('print').innerHTML = `<div class="box-labels">${bs.map(b => { const items = boxItems(b.id); return `
    <div class="box-label">
      <div class="bl-head"><b>${esc(b.code)}</b><span>${esc(teamCode())}</span></div>
      <div class="bl-body">${QR.svg(appUrl() + '#k=' + b.id, 2)}
        <div><p class="bl-name">${esc(b.name || '')}</p><p>${esc(boxWeightText(b))}${boxDims(b) ? ' · ' + boxDims(b) : ''}</p>
        ${boxDG(b).length ? `<p>MMPP: ${esc(boxDG(b).join(', '))}</p>` : ''}
        <p>Sitio: ${esc(boxPlace(b))}</p></div></div>
      <ul>${items.map(g => `<li>${esc(g.name)}${qtyText(g)}</li>`).join('') || '<li>—</li>'}</ul>
    </div>`; }).join('')}</div>`;
  print();
}

/* ---------- Dibujo del contenedor ---------- */
function tokBox(b) {
  const [, hex, ink] = colorOf(b), n = boxItems(b.id).length;
  return `<div class="tok tok-box ${boxBad(b) ? 'has-bad' : ''} ${b.nov?.text || boxItems(b.id).some(g => g.nov?.text) ? 'has-nov' : ''} ${boxItems(b.id).length && boxItems(b.id).every(g => g.out && !g.out.mission) ? 'is-out' : ''}" data-box="${b.id}" style="--c:${hex}; --ink:${ink}" role="button" tabindex="0" aria-label="Caja ${esc(b.code)}: ${esc(b.name || '')}, ${n} equipos, ${esc(boxWeightText(b))}">
    <span class="tok-lid"></span><b>${esc(b.code)}</b><small>${esc(b.name || '')}</small><em>${n} ${n === 1 ? 'equipo' : 'equipos'}${boxWeight(b).kg ? ' · ' + esc(boxWeightText(b)) : ''}</em></div>`;
}
// Dibujo pequeño (o la foto, si tiene) para listas
const artMini = g => g.photo ? `<img class="thumb sm" data-img="${esc(g.photo)}" src="${String(g.photo).startsWith('data:') ? esc(g.photo) : ''}" alt="">` : `<span class="art art-sm">${toolArt(g.name)}</span>`;
const tokGear = g => `<div class="tok tok-gear ${g.status !== 'OPERATIVO' ? 'has-bad' : ''} ${g.nov?.text ? 'has-nov' : ''} ${g.out && !g.out.mission ? 'is-out' : ''}" data-gear="${g.id}" role="button" tabindex="0" aria-label="${esc(g.name)}${g.out ? ', fuera: ' + esc(g.out.who) : ''}"><span class="tok-art">${toolArt(g.name)}</span><span class="tok-name">${esc(g.name)}${qtyText(g)}</span></div>`;

function cellContent(items, bs) {
  return bs.sort((a, b) => (a.pos || 0) - (b.pos || 0)).map(tokBox).join('') + items.filter(g => !g.box || !get('boxes', g.box)).sort(byName).map(tokGear).join('');
}

function viewContVisual() {
  const side = SIDES[prefs.cside] ? prefs.cside : 'izq', [sideTitle, range, off] = SIDES[side];
  const gear = list('gear'), bs = list('boxes');
  const at = d => [gear.filter(g => !g.vehicle && (g.door || 0) === d), bs.filter(b => !b.vehicle && (b.door || 0) === d)];
  const first = off + 1;
  const [ug, ub] = at(0);
  return `
    <div class="panel">
      <div class="between wrap-row sec-head">
        <div><h2>${esc(sideTitle)}</h2><p class="muted">Toca un hueco para verlo; mantén pulsado para arrastrar.</p></div>
        <div class="row"><button class="btn btn-g btn-sm" onclick="printBoxLabels()">${ic('qr')} Etiquetas</button><button class="btn btn-g btn-sm" onclick="boxForm()">${ic('case')} Caja</button><button class="btn btn-a btn-sm" onclick="gearForm()">${ic('plus')} Material</button></div>
        <div class="seg-row" role="group" aria-label="Lateral">${Object.entries(SIDES).map(([k, [l, r]]) => `<button class="${k === side ? 'on' : ''}" onclick="setPref({ cside: '${k}' })">${l.replace('Lateral i', 'I').replace('Lateral d', 'D')} <small>${r}</small></button>`).join('')}</div>
      </div>
      <div class="cv cvi" data-side="${side}">
        <img class="cvi-bg" src="img/contenedor-lateral.webp" alt="" aria-hidden="true" width="1200" height="708">
        <div class="cv-grid">${HUECOS.filter(h => h.id > off && h.id <= off + 10).map(h => { const [items, b] = at(h.id), [x, y, w, hh] = HUECO_RECT[h.id - off]; return `
          <div class="cv-cell ${h.label.includes(' y ') ? 'cv-wide' : ''}" style="left:${x}%; top:${y}%; width:${w}%; height:${hh}%" data-door="${h.id}" onclick="cvClick(event, ${h.id})">
            <button class="cv-tag" aria-label="${esc(h.label)}: ${b.length} cajas y ${items.filter(g => !get('boxes', g.box)).length} equipos sueltos">${esc(h.label)}</button>${cellContent(items, b)}<span class="cv-more" hidden></span></div>`; }).join('')}</div>
      </div>
      <div class="cv-legend"><span><i class="lg-box"></i>Caja</span><span><i class="lg-gear"></i>Suelto</span><span><i class="lg-bad"></i>En revisión</span><span><i class="lg-nov"></i>Novedad</span></div>
    </div>
    ${ug.length || ub.length ? `<div class="panel">
      <h3 class="sec-title">${ic('alert')} Sin ubicar</h3>
      <div class="cv-cell cv-unplaced" data-door="0" onclick="cvClick(event, 0)"><button class="sr-only" aria-label="Sin ubicar: ${ub.length} cajas y ${ug.filter(g => !get('boxes', g.box)).length} equipos">Sin ubicar</button>${cellContent(ug, ub)}</div>
    </div>` : ''}
`;
}

// El dibujo no crece: lo que no cabe en un hueco se resume en «+N» (se ve todo al tocar el hueco)
function fitCells() {
  document.querySelectorAll('.cvi .cv-cell').forEach(c => {
    const more = c.querySelector('.cv-more'), toks = [...c.querySelectorAll(':scope > .tok')];
    toks.forEach(t => t.classList.remove('cv-hide')); more.hidden = true;
    const limit = c.getBoundingClientRect().bottom - 1;
    const over = () => toks.some(t => !t.classList.contains('cv-hide') && t.getBoundingClientRect().bottom > limit) || (!more.hidden && more.getBoundingClientRect().bottom > limit);
    let n = 0;
    for (let i = toks.length - 1; i >= 0 && over(); i--) {
      if (toks[i].classList.contains('found')) continue;
      toks[i].classList.add('cv-hide'); n++; more.hidden = false; more.textContent = '+' + n;
    }
  });
}
addEventListener('resize', () => document.querySelector('.cvi') && fitCells());

let CV_SUPPRESS = false;
function cvClick(e, door, veh = '') {
  if (CV_SUPPRESS) return;
  const tok = e.target.closest('.tok');
  if (tok?.dataset.box) return boxDetail(tok.dataset.box);
  if (tok?.dataset.gear) return gearDetail(tok.dataset.gear);
  cellModal(door, veh);
}

function cellModal(door, veh = '') {
  const inCell = x => veh ? x.vehicle === veh : !x.vehicle && (x.door || 0) === door;
  const bs = list('boxes').filter(inCell).sort((a, b) => (a.pos || 0) - (b.pos || 0));
  const loose = list('gear').filter(g => inCell(g) && (!g.box || !get('boxes', g.box))).sort(byName);
  const total = bs.reduce((s, b) => s + boxWeight(b).kg, 0) + loose.reduce((s, g) => s + (parseFloat(g.weight) || 0) * (+g.qty > 1 ? +g.qty : 1), 0);
  const title = veh ? vehName(veh) : placeRec(door)?.label || placeOf({ door });
  const at = JSON.stringify(veh ? { vehicle: veh, door: 0 } : { door }).replace(/"/g, '&quot;');
  openModal(title, `
    <p class="muted" style="margin-bottom:10px">${bs.length} cajas · ${loose.length} equipos sueltos${total ? ' · ' + kg(total) : ''}</p>
    ${bs.map(b => { const items = boxItems(b.id), [, hex, ink] = colorOf(b); return `
      <details class="cell-box" open><summary><span class="sw" style="background:${hex}"></span><b>${esc(b.code)}</b> ${esc(b.name || '')}<small class="muted"> · ${esc(boxWeightText(b))}</small>
        <button class="link" style="margin-left:auto" onclick="event.preventDefault(); boxDetail('${b.id}')">Abrir</button></summary>
        <ul>${items.map(g => `<li class="li-art"><span class="tok-art">${toolArt(g.name)}</span><button class="link" onclick="gearDetail('${g.id}')">${esc(g.name)}${qtyText(g)}</button> ${revTag(g)}${novTag(g)}</li>`).join('') || '<li class="muted">Vacía</li>'}</ul></details>`; }).join('')}
    ${loose.length ? `<h4 class="sec-title" style="margin-top:12px">Suelto</h4><div class="list">${loose.map(g => `
      <button class="item" onclick="gearDetail('${g.id}')"><div class="who-row">${artMini(g)}<div><b>${esc(g.name)}${qtyText(g)}</b><small>${g.weight ? kg(g.weight) : 'sin peso'}</small></div></div>${revTag(g)}${novTag(g)}${g.out ? `<span class="tag info">${ic('out', 'i-sm')} ${esc(g.out.who)}</span>` : ''}</button>`).join('')}</div>` : ''}
    ${!bs.length && !loose.length ? '<p class="muted">Vacío.</p>' : ''}
    <div class="grid g2" style="grid-template-columns:1fr 1fr; margin-top:14px">
      <button class="btn btn-a" onclick="boxForm(null, ${at})">${ic('case')} Caja aquí</button>
      <button class="btn btn-g" onclick="gearFormAt(${at})">${ic('plus')} Material aquí</button>
      ${bs.length || loose.length ? `<button class="btn btn-g span2" onclick="printLabels(${door})">${ic('qr')} Etiquetas de lo que hay aquí</button>` : ''}
    </div>`);
}
function gearFormAt(at) { setPref({ door: at.vehicle || at.door }); gearForm(null); }

/* ---------- Arrastrar y soltar (ratón: arrastrar; táctil: mantener pulsado y arrastrar) ---------- */
let DRAG = null;
function dragTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  const box = DRAG?.gear && el?.closest('.tok-box');
  if (box && box.dataset.box !== get('gear', DRAG.gear)?.box) return { box: box.dataset.box, el: box };
  const cell = el?.closest('.cv-cell');
  return cell ? { cell, el: cell } : null;
}
function startDrag(d) {
  d.started = true; haptic(25);
  const r = d.tok.getBoundingClientRect();
  d.ghost = d.tok.cloneNode(true); d.ghost.classList.add('tok-ghost');
  Object.assign(d.ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
  d.dx = d.x - r.left; d.dy = d.y - r.top;
  document.body.appendChild(d.ghost); d.tok.classList.add('dragging'); document.body.classList.add('cv-dragging');
}
function endDrag() {
  if (!DRAG) return;
  clearTimeout(DRAG.timer); clearInterval(DRAG.scroll); DRAG.ghost?.remove(); DRAG.tok.classList.remove('dragging'); DRAG.over?.classList.remove('drop-on');
  document.body.classList.remove('cv-dragging'); DRAG = null;
}
document.addEventListener('pointerdown', e => {
  const tok = e.target.closest('.cv .tok, .cv-unplaced .tok, .arm .tok'); if (!tok || e.button > 0) return;
  DRAG = { tok, x: e.clientX, y: e.clientY, box: tok.dataset.box, gear: tok.dataset.gear, touch: e.pointerType !== 'mouse', started: false };
  if (DRAG.touch) { const d = DRAG; d.timer = setTimeout(() => DRAG === d && startDrag(d), 280); }
});
document.addEventListener('pointermove', e => {
  const d = DRAG; if (!d) return;
  const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
  if (!d.started) {
    if (d.touch && dist > 8) return endDrag();      // está desplazando la página
    if (!d.touch && dist > 5) startDrag(d); else return;
  }
  d.ghost.style.left = e.clientX - d.dx + 'px'; d.ghost.style.top = e.clientY - d.dy + 'px';
  d.cx = e.clientX; d.cy = e.clientY;
  // Cerca del borde de la pantalla, la página se desplaza sola (para llegar a los vehículos o al otro extremo)
  const edge = e.clientY < 90 ? -1 : e.clientY > innerHeight - 70 ? 1 : 0;
  if (edge && !d.scroll) d.scroll = setInterval(() => { scrollBy(0, edge * 14); const t = dragTarget(d.cx, d.cy); if (d.over !== t?.el) { d.over?.classList.remove('drop-on'); d.over = t?.el; d.over?.classList.add('drop-on'); } }, 30);
  if (!edge && d.scroll) { clearInterval(d.scroll); d.scroll = null; }
  const t = dragTarget(e.clientX, e.clientY);
  if (d.over !== t?.el) { d.over?.classList.remove('drop-on'); d.over = t?.el; d.over?.classList.add('drop-on'); }
});
document.addEventListener('touchmove', e => { if (DRAG?.started) e.preventDefault(); }, { passive: false });
document.addEventListener('contextmenu', e => { if (e.target.closest('.tok')) e.preventDefault(); });
document.addEventListener('pointercancel', () => endDrag());
document.addEventListener('pointerup', e => {
  const d = DRAG; if (!d) return;
  if (!d.started) return endDrag();
  const t = dragTarget(e.clientX, e.clientY);
  endDrag();
  CV_SUPPRESS = true; setTimeout(() => { CV_SUPPRESS = false; }, 50);
  if (!t) return;
  if (t.box) return putInBox(d.gear, t.box);
  const { door, veh } = t.cell.dataset;
  const same = it => veh ? it.vehicle === veh : !it.vehicle && (it.door || 0) === +door;
  if (d.box) { const b = get('boxes', d.box); if (!same(b)) moveBox(d.box, +door || 0, veh || ''); }
  else { const g = get('gear', d.gear); if (!same(g) || g.box) moveGear(d.gear, +door || 0, veh || ''); }
});

/* ---------- Dónde está cada cosa (lo usa la lupa de arriba) ---------- */
const fold = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Frase con la ubicación completa: lateral y hueco, sin ubicar o vehículo
function whereIs(x) {
  if (x.vehicle) return `En el vehículo ${vehName(x.vehicle)}`;
  if (!x.door) return 'Contenedor · sin ubicar';
  if (x.door <= 20) return `Contenedor · ${x.door <= 10 ? 'lateral izquierdo' : 'lateral derecho'} · hueco ${doorName(x.door)}`;
  return placeOf(x);
}
// Pestaña de Material donde se ve cada sitio
const placeTab = d => !d || d <= 20 ? 'contenedor' : d === PASILLO ? 'pasillo' : d === OTROS ? 'otros' : 'armarios';
function findResults(q) {
  const t = fold(q).trim(); if (!t) return [];
  const words = t.split(/\s+/), hit = (...f) => { const h = fold(f.join(' ')); return words.every(w => h.includes(w)); };
  const bs = list('boxes').filter(b => hit(b.code, b.name, b.model, b.notes)).map(b => ({ kind: 'box', x: b, name: `Caja ${b.code} · ${b.name || ''}`, where: whereIs(b), extra: `${boxItems(b.id).length} equipos dentro` }));
  const gs = list('gear').filter(g => hit(g.name, g.serial, g.notes, g.func, boxOf(g)?.code)).map(g => {
    const b = boxOf(g);
    return { kind: 'gear', x: g, name: g.name + qtyText(g), where: whereIs(g), extra: [b ? `dentro de la caja ${b.code}` : 'suelto', g.out ? `fuera: ${g.out.who}` : '', g.status !== 'OPERATIVO' ? g.status.toLowerCase() : ''].filter(Boolean).join(' · ') };
  });
  return [...bs, ...gs].slice(0, 15);
}
function findItems(r) {
  return r.map(({ kind, x, name, where, extra }) => `
    <button class="find-item" onclick="clearSearch(); findGo('${kind}', '${x.id}')">
      ${kind === 'box' ? `<span class="box-chip sm" style="--c:${colorOf(x)[1]}; --ink:${colorOf(x)[2]}">${esc(x.code)}</span>` : `<span class="find-ico">${toolArt(x.name)}</span>`}
      <span class="grow"><b>${esc(name)}</b><span class="find-where">${esc(where)}</span><small>${esc(extra)}</small></span>${ic('chev', 'i-sm')}</button>`).join('');
}
// Lleva al dibujo, en el lateral correcto, y hace parpadear la caja o el equipo
function findGo(kind, id) {
  const x = kind === 'box' ? get('boxes', id) : get('gear', id); if (!x) return;
  const box = kind === 'gear' ? boxOf(x) : x;
  setPref({ tab: placeTab(x.door), ...(x.vehicle || !x.door || x.door > 20 ? {} : { cside: x.door <= 10 ? 'izq' : 'der' }) });
  const sel = box ? `[data-box="${box.id}"]` : `[data-gear="${id}"]`;
  const el = document.querySelector(sel);
  if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('found'); setTimeout(() => el.classList.remove('found'), 3200); }
  toast(`${kind === 'box' ? 'Caja ' + x.code : x.name}: ${whereIs(x)}${kind === 'gear' && box ? ' · caja ' + box.code : ''}`);
}

/* ---------- Armarios: tres armarios marrones de dos puertas (monos, botas, gafas, guantes, documentación…) ---------- */
function viewArmarios() {
  const gear = list('gear'), bs = list('boxes');
  const at = d => [gear.filter(g => !g.vehicle && g.door === d), bs.filter(b => !b.vehicle && b.door === d)];
  return `
    <div class="panel">
      <div class="between sec-head"><h2>Armarios</h2></div>
      <p class="muted" style="margin:-4px 0 12px">Toca una puerta para verla; mantén pulsado para arrastrar.</p>
      <div class="arm">${[1, 2, 3].map(n => `
        <div class="arm-cab" aria-label="Armario ${n}"><div class="arm-top">Armario ${n}</div>
          <div class="arm-doors">${ARMARIOS.filter(a => a.n === n).map(a => { const [items, b] = at(a.id); return `
            <div class="cv-cell arm-door" data-door="${a.id}" onclick="cvClick(event, ${a.id})">
              <button class="cv-tag" aria-label="Armario ${n}, puerta ${a.side}: ${b.length} cajas y ${items.filter(g => !get('boxes', g.box)).length} equipos">${a.side === 'izquierda' ? 'Izq.' : 'Dcha.'}</button>
              <span class="arm-knob" aria-hidden="true"></span>${cellContent(items, b) || '<span class="cv-empty">Vacía</span>'}</div>`; }).join('')}</div>
          <div class="arm-feet" aria-hidden="true"><i></i><i></i></div></div>`).join('')}</div>
    </div>
    ${ARMARIOS.some(a => at(a.id).flat().length) ? `<div class="panel"><div class="list">${ARMARIOS.filter(a => at(a.id).flat().length).map(a => { const [items, b] = at(a.id), loose = items.filter(g => !get('boxes', g.box)); return `
      <button class="item" onclick="cellModal(${a.id})"><div><b>${esc(placeRec(a.id).label)}</b><small>${esc([...b.map(x => 'caja ' + x.code), ...loose.map(g => g.name + qtyText(g))].join(', '))}</small></div>${ic('chev', 'i-sm')}</button>`; }).join('')}</div></div>` : ''}`;
}

// Pasillo 3 y Otros: lista de lo que hay, con sus cajas
function viewPlace(door) {
  const p = placeRec(door), at = JSON.stringify({ door }).replace(/"/g, '&quot;');
  const bs = list('boxes').filter(b => !b.vehicle && b.door === door).sort((a, b) => (a.code || '').localeCompare(b.code || '', 'es', { numeric: true }));
  const loose = list('gear').filter(g => !g.vehicle && g.door === door && !get('boxes', g.box)).sort((a, b) => (a.where || '').localeCompare(b.where || '') || byName(a, b));
  const row = g => `<button class="item" data-gear="${g.id}" onclick="gearDetail('${g.id}')"><div class="who-row">${artMini(g)}<div><b>${esc(g.name)}${qtyText(g)}</b>${g.where ? `<small>${esc(g.where)}</small>` : ''}</div></div>${revTag(g)}${novTag(g)}</button>`;
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><h2>${esc(p.label)}</h2>
        <div class="row"><button class="btn btn-g" onclick="boxForm(null, ${at})">${ic('case')} Caja</button><button class="btn btn-a" onclick="gearFormAt(${at})">${ic('plus')} Material</button></div></div>
      ${bs.map(b => { const [, hex, ink] = colorOf(b), items = boxItems(b.id); return `
        <div class="well" data-box="${b.id}">
          <button class="between box-head" onclick="boxDetail('${b.id}')"><span class="row"><span class="box-chip" style="--c:${hex}; --ink:${ink}">${esc(b.code)}</span><b>${esc(b.name || '')}</b>${novTag(b)}</span><span class="muted">${items.length}</span></button>
          ${items.length ? `<div class="list">${items.map(row).join('')}</div>` : ''}</div>`; }).join('')}
      ${loose.length ? `<div class="list">${loose.map(row).join('')}</div>` : ''}
      ${!bs.length && !loose.length ? `<p class="muted">${door === OTROS ? 'Material guardado en otros sitios (nave, otro parque…). Al añadirlo, escribe dónde está.' : 'Vacío.'}</p>` : ''}
      ${bs.length || loose.length ? `<button class="btn btn-g btn-sm" style="margin-top:12px" onclick="printLabels(${door})">${ic('qr')} Etiquetas</button>` : ''}
    </div>`;
}
