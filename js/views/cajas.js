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
// Lo que tiene una persona del equipo (dado o sacado por ella; no las entregas a gente de fuera ni lo de una salida) no
// está en el almacén: no sale en su sitio hasta que se devuelve, y entonces vuelve a él
const conPersona = x => !!(x?.out && !x.out.loan && !x.out.mission);
const enAlmacen = x => !conPersona(x);
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
  if (!soloFlota()) return;
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
  if (!soloFlota()) return;
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
    <div class="fx-acts" style="margin-top:14px">
      <button class="fx-act" onclick="moveForm('box', '${id}')">${ic('move')}Mover</button>
      <button class="fx-act" onclick="novForm('box', '${id}')">${ic('pencil')}${b.nov?.text ? 'Cambiar nota' : 'Nota / novedad'}</button>
      <button class="fx-act" onclick="printBoxLabels(['${id}'])">${ic('qr')}Etiqueta</button>
      ${puedeFlota() ? `<button class="fx-act" onclick="boxForm('${id}')">${ic('pencil')}Editar</button>` : ''}
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
function tokBox(b, kase) {
  const [, hex, ink] = colorOf(b), n = boxItems(b.id).length, [w, h] = kase ? caseSize(b) : [];
  return `<div class="tok tok-box ${kase ? 'tok-case' : ''} ${boxBad(b) ? 'has-bad' : ''} ${b.nov?.text || boxItems(b.id).some(g => g.nov?.text) ? 'has-nov' : ''} ${boxItems(b.id).length && boxItems(b.id).every(g => g.out && !g.out.mission) ? 'is-out' : ''}" data-box="${b.id}" style="--c:${hex}; --ink:${ink}${kase ? `; --w:${w}; aspect-ratio:${w} / ${h}` : ''}" role="button" tabindex="0" aria-label="Caja ${esc(b.code)}: ${esc(b.name || '')}, ${n} equipos, ${esc(boxWeightText(b))}"${kase ? ` title="${esc(b.code)} · ${esc(b.name || '')}"` : ''}>
    ${kase ? caseArt(w, h, b.color === 'negro' || !BOX_COLORS[b.color] ? '#3a3d42' : 'var(--c)') + `<b>${esc(b.code)}</b>` : `<span class="tok-lid"></span><b>${esc(b.code)}</b><small>${esc(b.name || '')}</small><em>${n} ${n === 1 ? 'equipo' : 'equipos'}${boxWeight(b).kg ? ' · ' + esc(boxWeightText(b)) : ''}</em>`}</div>`;
}
// Cajas en el dibujo del contenedor: estancas tipo Peli, de frente y a su tamaño real (escala del dibujo, en «cqw» del contenedor).
// Ancho: el largo medido o el del modelo; alto: el medido o el de las cajas del equipo (foto: casi tan altas como anchas).
const CASE_LEN = { 1450: 46, 1550: 52, 1600: 62, 1610: 62, 1620: 63, 1650: 80, 1660: 80, 1690: 90, 1730: 92, 1780: 103 };
const caseSize = b => { const w = +b.len || CASE_LEN[String(b.model || '').match(/\d{4}/)?.[0]] || 62; return [w, +b.hei || Math.round(w * .84)]; };
// Dibujo (en cm) con el trazo del contenedor: tapa, cierres, nervios laterales, asa negra abatible y patas
function caseArt(W, H, fill) {
  const L = Math.max(7, H * .26), k = '#1d1d1d', hx = W * .29, hy = H * .72;
  return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true" stroke="${k}" stroke-linejoin="round">
    <rect x="3" y="${H - 3.5}" width="7" height="3" fill="${k}"/><rect x="${W - 10}" y="${H - 3.5}" width="7" height="3" fill="${k}"/>
    <rect x="1" y="1" width="${W - 2}" height="${H - 3.5}" rx="3.5" fill="${fill}" stroke-width="1.3"/>
    <path d="M2 ${L * .45}Q2 1.6 4.5 1.6H${W - 4.5}Q${W - 2} 1.6 ${W - 2} ${L * .45}Z" fill="#fff" fill-opacity=".3" stroke="none"/>
    <rect x="1.6" y="${L}" width="${W - 3.2}" height="2.2" fill="#000" fill-opacity=".3" stroke="none"/><path d="M1 ${L}H${W - 1}" stroke-width=".9"/>
    <rect x="1.6" y="${H - 9}" width="${W - 3.2}" height="5" fill="#000" fill-opacity=".18" stroke="none"/>
    <rect x="4" y="${L + 4}" width="5" height="${H - L - 12}" rx="1.2" fill="#000" fill-opacity=".12" stroke-width=".8"/>
    <rect x="${W - 9}" y="${L + 4}" width="5" height="${H - L - 12}" rx="1.2" fill="#000" fill-opacity=".12" stroke-width=".8"/>
    ${[W * .2, W * .68].map(x => `<rect x="${x}" y="${L - 3.5}" width="${W * .12}" height="7.5" rx="1.5" fill="#1a1b1d" stroke-width=".8"/>
    <path d="M${x + 1.5} ${L - 2}H${x + W * .12 - 1.5}" stroke="#fff" stroke-opacity=".35" stroke-width=".8"/>`).join('')}
    <path d="M${hx} ${hy - 3}L${hx + 4} ${hy + 6}H${W - hx - 4}L${W - hx} ${hy - 3}" fill="none" stroke="#141414" stroke-width="3.2" stroke-linecap="round"/>
    <path d="M${hx + 4.5} ${hy + 4.6}H${W - hx - 4.5}" stroke="#fff" stroke-opacity=".4" stroke-width=".8"/>
  </svg>`;
}
// Dibujo pequeño (o la foto, si tiene) para listas
const artMini = g => g.photo ? `<img class="thumb sm" data-img="${esc(g.photo)}" src="${String(g.photo).startsWith('data:') ? esc(g.photo) : ''}" alt="">` : `<span class="art art-sm">${toolArt(g.name)}</span>`;
const tokGear = g => `<div class="tok tok-gear ${g.status !== 'OPERATIVO' ? 'has-bad' : ''} ${g.nov?.text ? 'has-nov' : ''} ${g.out && !g.out.mission ? 'is-out' : ''}" data-gear="${g.id}" role="button" tabindex="0" aria-label="${esc(g.name)}${g.out ? ', fuera: ' + esc(g.out.who) : ''}"><span class="tok-art">${toolArt(g.name)}</span><span class="tok-name">${esc(g.name)}${qtyText(g)}</span></div>`;

function cellContent(items, bs, kase) {
  const loose = items.filter(g => !g.box || !get('boxes', g.box)).sort(byName).map(tokGear).join(''), sorted = bs.sort((a, b) => (a.pos || 0) - (b.pos || 0));
  // En el dibujo del contenedor, las cajas van posadas en el suelo del hueco, una junto a otra; el material suelto, encima
  if (kase) return loose + (bs.length ? `<div class="cv-cases">${sorted.map(b => tokBox(b, true)).join('')}</div>` : '');
  return sorted.map(b => tokBox(b)).join('') + loose;
}

function viewContVisual() {
  const side = SIDES[prefs.cside] ? prefs.cside : 'izq', [sideTitle, range, off] = SIDES[side];
  const gear = list('gear'), bs = list('boxes');
  const at = d => [gear.filter(g => !g.vehicle && enAlmacen(g) && (g.door || 0) === d), bs.filter(b => !b.vehicle && enAlmacen(b) && (b.door || 0) === d)];
  const first = off + 1;
  const [ug, ub] = at(0);
  return `
    <div class="panel">
      <div class="between wrap-row sec-head">
        <div><h2>${esc(sideTitle)}</h2><p class="muted">Toca un hueco para verlo; mantén pulsado para arrastrar.</p></div>
        <div class="row"><button class="btn btn-g btn-sm" onclick="printBoxLabels()">${ic('qr')} Etiquetas</button>
          <button class="btn btn-g btn-sm" onclick="openScanner(null, { title: 'Escanear material', hint: 'Apunta a la etiqueta QR de un equipo o de una caja' })">${ic('scan')} Escanear</button>
          ${(n => n ? `<button class="btn btn-g btn-sm" onclick="pedidoForm()">${ic('share')} Pedido <span class="tag bad">${n}</span></button>` : '')(list('consumables').filter(consLow).length)}
          ${puedeFlota() ? `<button class="btn btn-a btn-sm" onclick="addMaterial()">${ic('plus')} Material</button>` : ''}</div>
        <div class="seg-row" role="group" aria-label="Lateral">${Object.entries(SIDES).map(([k, [l, r]]) => `<button class="${k === side ? 'on' : ''}" data-cside="${k}" onclick="setPref({ cside: '${k}' })">${l.replace('Lateral i', 'I').replace('Lateral d', 'D')} <small>${r}</small></button>`).join('')}</div>
      </div>
      <div class="cv cvi" data-side="${side}">
        <img class="cvi-bg" src="img/contenedor-lateral.webp" alt="" aria-hidden="true" width="1200" height="708">
        <div class="cv-grid">${HUECOS.filter(h => h.id > off && h.id <= off + 10).map(h => { const [items, b] = at(h.id), [x, y, w, hh] = HUECO_RECT[h.id - off]; return `
          <div class="cv-cell ${h.label.includes(' y ') ? 'cv-wide' : ''}" style="left:${x}%; top:${y}%; width:${w}%; height:${hh}%" data-door="${h.id}" onclick="cvClick(event, ${h.id})">
            <button class="cv-tag" aria-label="${esc(h.label)}: ${b.length} cajas y ${items.filter(g => !get('boxes', g.box)).length} equipos sueltos">${esc(h.label)}</button>${cellContent(items, b, true)}<span class="cv-more" hidden></span></div>`; }).join('')}</div>
      </div>
      <div class="cv-legend"><span><i class="lg-box"></i>Caja</span><span><i class="lg-gear"></i>Suelto</span><span><i class="lg-bad"></i>En revisión</span><span><i class="lg-nov"></i>Novedad</span></div>
    </div>
    ${ug.length || ub.length ? `<div class="panel">
      <h3 class="sec-title">${ic('alert')} Sin ubicar</h3>
      <div class="cv-cell cv-unplaced" data-door="0" onclick="cvClick(event, 0)"><button class="sr-only" aria-label="Sin ubicar: ${ub.length} cajas y ${ug.filter(g => !get('boxes', g.box)).length} equipos">Sin ubicar</button>${cellContent(ug, ub)}</div>
    </div>` : ''}
    ${consIn(d => d <= 20).length ? `<div class="panel" id="alm-fungible">${consList(consIn(d => d <= 20), true)}</div>` : ''}
`;
}

// El dibujo no crece: lo que no cabe en un hueco se resume en «+N» (se ve todo al tocar el hueco)
function fitCells() {
  document.querySelectorAll('.cvi .cv-cell').forEach(c => {
    const more = c.querySelector('.cv-more'), row = c.querySelector('.cv-cases');
    const toks = [...c.querySelectorAll(':scope > .tok')], cases = [...c.querySelectorAll('.cv-cases > .tok')];
    [...toks, ...cases].forEach(t => t.classList.remove('cv-hide')); more.hidden = true;
    let n = 0;
    const hide = t => { t.classList.add('cv-hide'); n++; more.hidden = false; more.textContent = '+' + n; };
    // Cajas que no caben a lo ancho del hueco
    const right = c.getBoundingClientRect().right - 1;
    for (let i = cases.length - 1; i > 0 && cases.some(t => !t.classList.contains('cv-hide') && t.getBoundingClientRect().right > right); i--) if (!cases[i].classList.contains('found')) hide(cases[i]);
    // Material suelto que no cabe encima de las cajas
    const limit = (row && cases.length ? row.getBoundingClientRect().top : c.getBoundingClientRect().bottom) - 1;
    const over = () => toks.some(t => !t.classList.contains('cv-hide') && t.getBoundingClientRect().bottom > limit) || (!row && !more.hidden && more.getBoundingClientRect().bottom > limit);
    for (let i = toks.length - 1; i >= 0 && over(); i--) if (!toks[i].classList.contains('found')) hide(toks[i]);
  });
}
addEventListener('resize', () => document.querySelector('.cvi') && fitCells());

let CV_SUPPRESS = false;
function cvClick(e, door, veh = '') {
  if (CV_SUPPRESS) return;
  const tok = e.target.closest('.tok');
  if (tok?.dataset.epi) return epiForm(tok.dataset.epi);
  if (tok?.dataset.box) return boxDetail(tok.dataset.box);
  if (tok?.dataset.gear) return gearDetail(tok.dataset.gear);
  cellModal(door, veh);
}

function cellModal(door, veh = '') {
  const inCell = x => enAlmacen(x) && (veh ? x.vehicle === veh : !x.vehicle && (x.door || 0) === door);
  const bs = list('boxes').filter(inCell).sort((a, b) => (a.pos || 0) - (b.pos || 0));
  const loose = list('gear').filter(g => inCell(g) && (!g.box || !get('boxes', g.box))).sort(byName);
  const cons = veh ? [] : consIn(d => d === door);
  const total = bs.reduce((s, b) => s + boxWeight(b).kg, 0) + loose.reduce((s, g) => s + (parseFloat(g.weight) || 0) * (+g.qty > 1 ? +g.qty : 1), 0);
  const title = veh ? vehName(veh) : placeRec(door)?.label || placeOf({ door });
  const at = JSON.stringify(veh ? { vehicle: veh, door: 0 } : { door }).replace(/"/g, '&quot;');
  openModal(title, `
    <p class="muted" style="margin-bottom:10px">${bs.length} cajas · ${loose.length} equipos sueltos${cons.length ? ` · ${cons.length} fungibles` : ''}${total ? ' · ' + kg(total) : ''}</p>
    ${bs.map(b => { const items = boxItems(b.id), [, hex, ink] = colorOf(b); return `
      <details class="cell-box" open><summary><span class="sw" style="background:${hex}"></span><b>${esc(b.code)}</b> ${esc(b.name || '')}<small class="muted"> · ${esc(boxWeightText(b))}</small>
        <button class="link" style="margin-left:auto" onclick="event.preventDefault(); boxDetail('${b.id}')">Abrir</button></summary>
        <ul>${items.map(g => `<li class="li-art"><span class="tok-art">${toolArt(g.name)}</span><button class="link" onclick="gearDetail('${g.id}')">${esc(g.name)}${qtyText(g)}</button> ${revTag(g)}${novTag(g)}</li>`).join('') || '<li class="muted">Vacía</li>'}</ul></details>`; }).join('')}
    ${loose.length ? `<h4 class="sec-title" style="margin-top:12px">Suelto</h4><div class="list">${loose.map(g => `
      <button class="item" onclick="gearDetail('${g.id}')"><div class="who-row">${artMini(g)}<div><b>${esc(g.name)}${qtyText(g)}</b><small>${g.weight ? kg(g.weight) : 'sin peso'}</small></div></div>${revTag(g)}${novTag(g)}${g.out ? `<span class="tag info">${ic('out', 'i-sm')} ${esc(g.out.who)}</span>` : ''}</button>`).join('')}</div>` : ''}
    ${veh ? '' : `<div style="margin-top:12px">${consList(cons)}</div>`}
    ${!bs.length && !loose.length && !cons.length ? '<p class="muted">Vacío.</p>' : ''}
    <div class="grid g2" style="grid-template-columns:1fr 1fr; margin-top:14px">
      ${puedeFlota() ? `<button class="btn btn-a span2" onclick="addMaterial(${at})">${ic('plus')} Material aquí</button>` : ''}
      ${bs.length || loose.length ? `<button class="btn btn-g span2" onclick="printLabels(${door})">${ic('qr')} Etiquetas de lo que hay aquí</button>` : ''}
    </div>`);
}
function gearFormAt(at = {}) { if (at.vehicle || at.door !== undefined) setPref({ door: at.vehicle || at.door }); gearForm(null); }

/* ---------- Arrastrar y soltar (ratón: arrastrar; táctil: mantener pulsado y arrastrar) ---------- */
let DRAG = null;
function dragTarget(x, y) {
  const el = document.elementFromPoint(x, y);
  const rev = el?.closest('[data-rev]');
  if (rev) return { rev: true, el: rev };
  const box = DRAG?.gear && el?.closest('.tok-box, .place-box');
  if (box && box.dataset.box !== get('gear', DRAG.gear)?.box) return { box: box.dataset.box, el: box };
  const person = el?.closest('[data-person]');
  if (person) return { person: true, el: person };
  const cell = el?.closest('.cv-cell, .drop-zone, .dock-zone');
  return cell ? { cell, el: cell } : null;
}
// Barra de abajo mientras se arrastra: sitios a los que soltar sin tener que bajar por la página
function dragDock() {
  const z = (attr, icon, label) => `<div class="dock-zone" ${attr}>${ic(icon, 'i-sm')}<span>${label}</span></div>`;
  const dock = Object.assign(document.createElement('div'), { id: 'dragDock', className: 'drag-dock' });
  dock.innerHTML = z('data-door="0"', 'box', 'Sin ubicar') + z(`data-door="${PASILLO}"`, 'layers', 'Pasillo') + z(`data-door="${OTROS}"`, 'dots', 'Otros')
    + (DRAG?.cons ? '' : z('data-person="1"', 'hardhat', 'Persona')) + (DRAG?.gear ? z('data-rev="1"', 'wrench', 'En revisión') : '');
  document.body.appendChild(dock);
}
function startDrag(d) {
  d.started = true; haptic(25);
  const r = d.tok.getBoundingClientRect();
  d.ghost = d.tok.cloneNode(true); d.ghost.classList.add('tok-ghost');
  Object.assign(d.ghost.style, { width: r.width + 'px', left: r.left + 'px', top: r.top + 'px' });
  d.dx = d.x - r.left; d.dy = d.y - r.top;
  document.body.appendChild(d.ghost); d.tok.classList.add('dragging'); document.body.classList.add('cv-dragging');
  dragDock();
}
function endDrag() {
  if (!DRAG) return;
  clearTimeout(DRAG.timer); clearTimeout(DRAG.sideTimer); clearInterval(DRAG.scroll); DRAG.ghost?.remove(); DRAG.tok.classList.remove('dragging'); DRAG.over?.classList.remove('drop-on');
  document.body.classList.remove('cv-dragging'); $('dragDock')?.remove(); DRAG = null;
}
document.addEventListener('pointerdown', e => {
  const tok = e.target.closest('#view .tok, .drag-it, .cons-item'); if (!tok || e.button > 0 || e.target.closest('.btn-sm, #modal')) return;
  DRAG = { tok, x: e.clientX, y: e.clientY, box: tok.dataset.box, gear: tok.dataset.gear, cons: tok.dataset.cons, epi: tok.dataset.epi, touch: e.pointerType !== 'mouse', started: false };
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
  const dockTop = $('dragDock')?.getBoundingClientRect().top ?? innerHeight;
  const edge = e.clientY < 90 ? -1 : e.clientY > dockTop - 60 && e.clientY < dockTop ? 1 : 0;
  if (edge && !d.scroll) d.scroll = setInterval(() => { scrollBy(0, edge * 14); const t = dragTarget(d.cx, d.cy); if (d.over !== t?.el) { d.over?.classList.remove('drop-on'); d.over = t?.el; d.over?.classList.add('drop-on'); } }, 30);
  if (!edge && d.scroll) { clearInterval(d.scroll); d.scroll = null; }
  const t = dragTarget(e.clientX, e.clientY);
  if (d.over !== t?.el) { d.over?.classList.remove('drop-on'); d.over = t?.el; d.over?.classList.add('drop-on'); }
  // Encima del botón del otro lateral del contenedor, al poco se cambia de lateral para soltar allí
  const side = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cside]')?.dataset.cside;
  if (side !== d.side) { clearTimeout(d.sideTimer); d.side = side; if (side && side !== prefs.cside) d.sideTimer = setTimeout(() => DRAG === d && setPref({ cside: side }), 450); }
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
  if (t.person) return givePicker(d);
  if (d.epi) { const x = get('epis', d.epi), door = +t.cell.dataset.door || 0; if (x && !t.cell.dataset.veh && +x.door !== door) put('epis', { ...x, door }, `${epiLabel(x)} → ${placeName(door, '')}`); return; }
  if (t.rev) { const g = get('gear', d.gear); return g && (g.status === 'OPERATIVO' ? revForm(g.id) : toast(`${g.name} ya está en revisión`)); }
  if (t.box) return putInBox(d.gear, t.box);
  const { door, veh } = t.cell.dataset;
  if (d.cons) { const c = get('consumables', d.cons); if (c && !veh && consDoor(c) !== +door) put('consumables', { ...c, door: +door || 0, location: '' }, `"${c.name}" → ${placeName(+door || 0, '')}`); return; }
  const same = it => veh ? it.vehicle === veh : !it.vehicle && (it.door || 0) === +door;
  if (d.box) { const b = get('boxes', d.box); if (!same(b)) moveBox(d.box, +door || 0, veh || ''); }
  else { const g = get('gear', d.gear); if (!same(g) || g.box) moveGear(d.gear, +door || 0, veh || ''); }
});

// Soltar en «Persona»: se elige quién y le aparece en su ficha (el EPI como suyo; el material, como que lo lleva)
function givePicker(d) {
  const what = d.epi ? epiLabel(get('epis', d.epi)) : d.box ? 'caja ' + get('boxes', d.box)?.code : get('gear', d.gear)?.name;
  openModal(`¿A quién? · ${what || ''}`, `<div class="list give-list">${operators().map(o => `
    <button class="item" onclick="closeModal(); giveTo(${jsq(JSON.stringify({ epi: d.epi, box: d.box, gear: d.gear }))}, '${o.id}')"><div class="who-row"><span class="avatar">${esc(initials(o.name))}</span><b>${esc(o.name)}</b></div>${ic('chev', 'i-sm')}</button>`).join('')}</div>`);
}
function giveTo(what, op) {
  const { epi, box, gear } = JSON.parse(what), o = get('operators', op);
  if (!o) return;
  if (epi) {
    const e = get('epis', epi); if (!e) return;
    if (e.holder === op) return toast(`${o.name} ya lo tiene`);
    // De la reserva con cantidad sale uno; si no, pasa entero a la persona
    if (e.holder === RESERVA && epiQty(e) > 1) {
      stamp('epis', { ...e, qty: epiQty(e) - 1 });
      return put('epis', { ...e, id: uid('EPI'), qty: '', door: '', holder: op }, `${epiLabel(e)} de la reserva para ${o.name}${e.size && e.size !== 'Universal' ? ', talla ' + e.size : ''}`);
    }
    return put('epis', { ...e, qty: '', door: '', holder: op }, `${epiLabel(e)} para ${o.name}`);
  }
  const out = { who: o.name, op, since: Date.now(), note: '' };
  const items = box ? boxItems(box) : [get('gear', gear)].filter(Boolean);
  if (!items.length) return toast('La caja está vacía', 'bad');
  const busy = items.filter(g => g.out && g.out.op !== op);
  if (busy.length) return toast(`${busy[0].name} ya está fuera (${busy[0].out.who})`, 'bad');
  if (box) stamp('boxes', { ...get('boxes', box), out });
  items.forEach((g, i) => (i < items.length - 1 ? stamp : put)('gear', { ...g, out }, box ? `Caja ${get('boxes', box).code} con ${o.name}` : `"${g.name}" con ${o.name}`));
}
// Devolver una caja que tenía una persona: vuelve a su sitio con lo que lleva
function returnBox(bid) {
  const b = get('boxes', bid); if (!b) return;
  boxItems(bid).filter(g => g.out && g.out.op === b.out?.op).forEach(g => stamp('gear', { ...g, out: null }));
  put('boxes', { ...b, out: null }, `Devuelta la caja ${b.code} a ${placeShort(b)}`);
}
// Material que lleva una persona (lo que se le ha dado o ha sacado él; no lo de las entregas ni lo de una salida)
const isWith = (x, o) => conPersona(x) && (x.out.op ? x.out.op === o.id : x.out.who === o.name);
const boxesWith = o => boxes().filter(b => isWith(b, o));
const gearWith = o => list('gear').filter(g => isWith(g, o) && !isWith(get('boxes', g.box), o)).sort(byName);

/* ---------- Dónde está cada cosa (lo usa la lupa de arriba) ---------- */
const fold = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
// Frase con la ubicación completa: lateral y hueco, sin ubicar o vehículo
function whereIs(x) {
  if (conPersona(x)) return `Con ${x.out.who} (vuelve a ${placeShort(x)})`;
  if (x.vehicle) return `En el vehículo ${vehName(x.vehicle)}`;
  if (!x.door) return 'Contenedor · sin ubicar';
  if (x.door <= 20) return `Contenedor · ${x.door <= 10 ? 'lateral izquierdo' : 'lateral derecho'} · hueco ${doorName(x.door)}`;
  return placeOf(x);
}
// Pestaña de Material donde se ve cada sitio
const placeTab = () => 'contenedor';   // todo está en «Contenedor y almacén»
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
  const x = kind === 'box' ? get('boxes', id) : kind === 'cons' ? get('consumables', id) : get('gear', id); if (!x) return;
  const box = kind === 'gear' ? boxOf(x) : kind === 'box' ? x : null, door = kind === 'cons' ? consDoor(x) : x.door;
  setPref({ tab: 'contenedor', ...(x.vehicle || !door || door > 20 ? {} : { cside: door <= 10 ? 'izq' : 'der' }) });
  const sel = box ? `[data-box="${box.id}"]` : kind === 'cons' ? `[data-cons="${id}"]` : `[data-gear="${id}"]`;
  const el = document.querySelector(sel);
  if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.classList.add('found'); setTimeout(() => el.classList.remove('found'), 3200); }
  if (kind === 'cons') return toast(`${x.name}: ${x.stock} ${x.unit} · ${door ? doorName(door) : 'sin ubicar'}`);
  toast(`${kind === 'box' ? 'Caja ' + x.code : x.name}: ${whereIs(x)}${kind === 'gear' && box ? ' · caja ' + box.code : ''}`);
}

/* ---------- Armarios: tres armarios de dos puertas sobre la estantería, abiertos, con sus baldas ---------- */
// Lo que hay en un sitio (sin vehículo): [equipos, cajas]
const enSitio = d => [list('gear').filter(g => !g.vehicle && enAlmacen(g) && g.door === d), list('boxes').filter(b => !b.vehicle && enAlmacen(b) && b.door === d)];
// Un hueco que admite soltar material: se toca para verlo y se mantiene pulsado lo de dentro para arrastrarlo
// EPI de reserva guardado en un sitio (cascos, protectores, monos…): un icono por línea, con su cantidad
const epiEn = d => list('epis').filter(e => e.holder === RESERVA && +e.door === d);
const tokEpi = e => `<div class="tok tok-gear tok-epi" data-epi="${e.id}" role="button" tabindex="0" aria-label="${esc(epiLabel(e))}${e.size && e.size !== 'Universal' ? ', talla ' + esc(e.size) : ''}: ${epiQty(e)}"><span class="tok-art">${toolArt(`${EPI_TYPES[e.type] || e.name} ${e.color || ''}`)}</span><span class="tok-name">${esc(epiLabel(e))}</span>${epiQty(e) > 1 ? `<i class="tok-n">${epiQty(e)}</i>` : ''}</div>`;
const hueco = (d, cls, label, extra = '') => { const [items, b] = enSitio(d); return `
  <div class="cv-cell ${cls}" data-door="${d}" aria-label="${esc(placeRec(d).label)}" onclick="cvClick(event, ${d})">
    <button class="cv-tag" aria-label="${esc(placeRec(d).label)}: ${b.length} cajas y ${items.filter(g => !get('boxes', g.box)).length} equipos">${label}</button>${extra}${cellContent(items, b)}${epiEn(d).map(tokEpi).join('')}</div>`; };
function viewArmarios() {
  const cons = consIn(enArmarios), lleno = ARMARIOS.map(a => a.id).concat(ARM_SUELO).filter(d => enSitio(d).flat().length || epiEn(d).length);
  return `
    <div class="panel">
      <div class="between sec-head"><h2>Armarios</h2></div>
      <p class="muted" style="margin:-4px 0 12px">Toca una balda para verla; mantén pulsado para arrastrar.</p>
      <div class="arm">
        <div class="arm-row">${[1, 2, 3].map(n => `
          <div class="arm-cab" aria-label="Armario ${n}">
            <div class="arm-top">Armario ${n}</div>
            <div class="arm-body"><span class="arm-leaf" aria-hidden="true"><i></i></span>
              <div class="arm-in">${ARMARIOS.filter(a => a.n === n).map(a => hueco(a.id, 'arm-shelf', a.balda)).join('')}</div>
              <span class="arm-leaf r" aria-hidden="true"><i></i></span></div></div>`).join('')}</div>
        ${hueco(ARM_SUELO, 'arm-floor', 'Delante de los armarios')}
        <div class="rack-beam" aria-hidden="true"></div>
      </div>
    </div>
    ${lleno.length ? `<div class="panel"><div class="list">${lleno.map(d => { const [items, b] = enSitio(d), loose = items.filter(g => !get('boxes', g.box)); return `
      <button class="item" onclick="cellModal(${d})"><div><b>${esc(placeRec(d).label)}</b><small>${esc([...b.map(x => 'caja ' + x.code), ...loose.map(g => g.name + qtyText(g)), ...epiEn(d).map(e => `${epiLabel(e)}${e.size && e.size !== 'Universal' ? ' T' + e.size : ''} ×${epiQty(e)}`)].join(', '))}</small></div>${ic('chev', 'i-sm')}</button>`; }).join('')}</div></div>` : ''}
    ${cons.length ? `<div class="panel">${consList(cons, true)}</div>` : ''}`;
}

/* ---------- Pasillo: estantería de palés, 5 módulos con suelo y balda 1 ---------- */
function viewPasillo() {
  const cons = consIn(d => PASILLO_SITIOS.some(p => p.id === d));
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><h2>Pasillo</h2></div>
      <p class="muted" style="margin:-4px 0 12px">La estantería del pasillo: 5 módulos, con el suelo y la primera balda. Toca un hueco para verlo; mantén pulsado para arrastrar.</p>
      <div class="pas-scroll"><div class="pas" style="--mods:${PAS_MOD}">
        ${[...PAS_NIV.keys()].reverse().map(nv => `
          <div class="pas-lvl${nv ? '' : ' floor'}">${nv ? 'Balda' : 'Suelo'}</div>
          ${Array.from({ length: PAS_MOD }, (_, m) => hueco(100 + (m + 1) * 10 + nv, 'pas-cell' + (nv ? '' : ' pas-floor'), nv === PAS_NIV.length - 1 ? 'M' + (m + 1) : '')).join('')}`).join('')}
      </div></div>
    </div>
    ${cons.length ? `<div class="panel">${consList(cons, true)}</div>` : ''}
    ${viewPlace(PASILLO, 'En el pasillo, sin hueco concreto')}`;
}

// Pasillo 3 y Otros: lista de lo que hay, con sus cajas
function viewPlace(door, title) {
  const p = placeRec(door), at = JSON.stringify({ door }).replace(/"/g, '&quot;');
  const bs = list('boxes').filter(b => !b.vehicle && enAlmacen(b) && b.door === door).sort((a, b) => (a.code || '').localeCompare(b.code || '', 'es', { numeric: true }));
  const loose = list('gear').filter(g => !g.vehicle && enAlmacen(g) && g.door === door && !get('boxes', g.box)).sort((a, b) => (a.where || '').localeCompare(b.where || '') || byName(a, b));
  const cons = consIn(d => d === door);
  const row = g => `<button class="item drag-it" data-gear="${g.id}" onclick="gearDetail('${g.id}')"><div class="who-row">${artMini(g)}<div><b>${esc(g.name)}${qtyText(g)}</b>${g.where ? `<small>${esc(g.where)}</small>` : ''}</div></div>${revTag(g)}${novTag(g)}</button>`;
  return `
    <div class="panel drop-zone" data-door="${door}">
      <div class="between wrap-row sec-head"><h2>${esc(title || p.label)}</h2>
        ${puedeFlota() ? `<button class="btn btn-g" onclick="addMaterial(${at})">${ic('plus')} Material</button>` : ''}</div>
      ${bs.map(b => { const [, hex, ink] = colorOf(b), items = boxItems(b.id); return `
        <div class="well drag-it place-box" data-box="${b.id}">
          <button class="between box-head" onclick="boxDetail('${b.id}')"><span class="row"><span class="box-chip" style="--c:${hex}; --ink:${ink}">${esc(b.code)}</span><b>${esc(b.name || '')}</b>${novTag(b)}</span><span class="muted">${items.length}</span></button>
          ${items.length ? `<div class="list">${items.map(row).join('')}</div>` : ''}</div>`; }).join('')}
      ${loose.length ? `<div class="list">${loose.map(row).join('')}</div>` : ''}
      ${consList(cons)}
      ${!bs.length && !loose.length && !cons.length ? `<p class="muted">${door === OTROS ? 'Material guardado en otros sitios (nave, otro parque…). Al añadirlo, escribe dónde está.' : 'Vacío.'}</p>` : ''}
      ${bs.length || loose.length ? `<button class="btn btn-g btn-sm" style="margin-top:12px" onclick="printLabels(${door})">${ic('qr')} Etiquetas</button>` : ''}
    </div>`;
}
