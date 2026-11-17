'use strict';
// SIER 242 · El almacén: todos los pasillos juntos (el Parque, USAR y cada especialidad). Cada pasillo tiene estantería a
// la izquierda y a la derecha, con sus módulos y baldas, y en cada hueco puede haber material de cualquiera: lo de USAR
// (equipos, cajas, fungible y EPI de reserva) y lo de los apartados y vehículos (registros «matesp»).
// · De quién es cada pasillo: meta «appas-<apartado>» ({ nums: [4] }) y meta «usarpas» ([3]).
// · Cuánto mide cada lado: meta «pasgeo» ({ '4I': { mods, baldas } }); antes iba dentro de «appas-…» y se sigue leyendo.
// · Un hueco es un número (pasDoor, en js/config.js) en el mismo campo «door» que el contenedor y los armarios, así que lo
//   de USAR se mueve aquí igual que entre huecos del contenedor. El material «matesp» guarda pas, lado, mod y niv; si está
//   en el contenedor o en un armario, «door»; y si va en un vehículo que no es el suyo, «enveh».

const PASILLO_DEF = { mods: 4, baldas: 2 }, PAS_USAR = { mods: 5, baldas: 1 };
const LADOS = { I: 'Izquierda', D: 'Derecha' };
const pasCfg = k => get('meta', 'appas-' + k)?.value || {};
const apPasillos = k => [...new Set((Array.isArray(pasCfg(k).nums) ? pasCfg(k).nums : APARTADOS[k]?.pasillos || []).map(Number).filter(n => n >= 1 && n <= 99))].sort((a, b) => a - b);
const usarPasillos = () => { const v = get('meta', 'usarpas')?.value; return (Array.isArray(v) ? v : [3]).map(Number).filter(n => n >= 1); };
const pasDuenos = n => [...(usarPasillos().includes(n) ? ['usar'] : []), ...Object.keys(APARTADOS).filter(k => apPasillos(k).includes(n))];
const pasDuenoTxt = d => d === 'usar' ? 'USAR' : APARTADOS[d]?.name || '';
const almacenNums = (extra = 0) => Array.from({ length: Math.max(6, ...usarPasillos(), ...Object.keys(APARTADOS).flatMap(apPasillos)) + extra }, (_, i) => i + 1);
// Módulos y baldas de un lado de un pasillo
const pasGeo = (pas, lado) => { const k = pas + (lado === 'D' ? 'D' : 'I'), viejo = Object.keys(APARTADOS).map(a => pasCfg(a).lados?.[k]).find(Boolean);
  const p = { ...(usarPasillos().includes(+pas) ? PAS_USAR : PASILLO_DEF), ...(viejo || {}), ...((get('meta', 'pasgeo')?.value || {})[k] || {}) };
  return { mods: Math.min(12, Math.max(1, +p.mods || 1)), baldas: Math.min(6, Math.max(1, +p.baldas || 1)) }; };
const pasLado = (k, pas, lado) => pasGeo(pas, lado);
const nivNombre = (n, baldas = 2) => !n ? 'Suelo' : baldas > 1 ? 'Balda ' + n : 'Balda';
// Un hueco vale si su pasillo existe y cabe en lo que mide ese lado (si se quitan módulos o baldas, lo de ahí queda sin colocar)
const pasVale = d => { const u = pasDe(d); if (!u || !u.mod || !almacenNums().includes(u.pas)) return false; const g = pasGeo(u.pas, u.lado); return u.mod <= g.mods && u.niv <= g.baldas; };

/* ---------- Dónde está cada cosa ---------- */
// Sitio de un material de apartado o de vehículo, como el de USAR: { door, veh }. Lo de un vehículo, si no se ha movido,
// está en su vehículo; lo de un apartado sin hueco está «sin colocar».
function matLugar(m) {
  if (m.enveh && get('vehicles', m.enveh)) return { door: 0, veh: m.enveh };
  if (+m.door && !enPasillo(m.door)) return { door: +m.door, veh: '' };
  const pas = +m.pas || (m.ap && !m.veh ? apPasillos(m.ap)[0] : 0) || 0, d = +m.mod && pas ? pasDoor(pas, m.lado === 'D' ? 'D' : 'I', +m.mod, +m.niv || 0) : 0;
  return d && pasVale(d) ? { door: d, veh: '' } : { door: 0, veh: m.veh || '' };
}
const ubic = m => pasDe(matLugar(m).door) || { pas: +m.pas || apPasillos(m.ap)[0] || 0, lado: m.lado === 'D' ? 'D' : 'I', mod: 0, niv: 0 };
const colocado = (k, m) => { const l = matLugar(m); return !!(l.door || l.veh); };
const enHueco = (k, pas, lado, mod, niv) => { const d = pasDoor(pas, lado, mod, niv); return list('matesp').filter(m => matLugar(m).door === d).sort(byName); };
const sinColocar = k => apMat(k).filter(m => !colocado(k, m));
// El sitio de un material, en texto (nada si está donde se espera: lo de un vehículo, en su vehículo)
const huecoTxt = m => { const l = matLugar(m); return l.veh ? (l.veh === m.veh ? '' : 'En ' + vehName(l.veh)) : !l.door ? '' : enPasillo(l.door) ? pasNombre(l.door) : 'USAR · ' + placeOf({ door: l.door }); };
// Lleva un material a un sitio: un hueco de pasillo, un hueco del contenedor o un armario, un vehículo o a ninguno
function matPoner(id, door = 0, veh = '') {
  const m = get('matesp', id); if (!m || !me()) return;
  const u = pasDe(door), en = veh && veh !== m.veh ? veh : '';
  const rec = { ...m, pas: u ? u.pas : 0, lado: u ? u.lado : 'I', mod: u ? u.mod : 0, niv: u ? u.niv : 0, door: u || veh ? 0 : +door || 0, enveh: en };
  const antes = matLugar(m), ahora = matLugar(rec); if (antes.door === ahora.door && antes.veh === ahora.veh) return;
  put('matesp', rec, `${matDueno(m)}: ${m.name} → ${lugarTxt(ahora) || 'sin colocar'}`);
}
// Compatibilidad: colocar por pasillo, lado, módulo y altura
const pasMover = (id, pas = 0, lado = 'I', mod = 0, niv = 0) => matPoner(id, mod ? pasDoor(pas, lado, mod, niv) : 0);
const lugarTxt = l => l.veh ? vehName(l.veh) : !l.door ? '' : enPasillo(l.door) ? pasNombre(l.door) : placeOf({ door: l.door });

// Todo lo que hay en los huecos de los pasillos, sea de quien sea: { door: { boxes, gear, epis, cons, mat } }
function pasIndice() {
  const ix = {}, add = (d, t, x) => { if (!enPasillo(d)) return; (ix[d] = ix[d] || { boxes: [], gear: [], epis: [], cons: [], mat: [] })[t].push(x); };
  list('boxes').forEach(b => !b.vehicle && enAlmacen(b) && add(+b.door, 'boxes', b));
  list('gear').forEach(g => !g.vehicle && enAlmacen(g) && !get('boxes', g.box) && add(+g.door, 'gear', g));
  list('epis').forEach(e => e.holder === RESERVA && add(+e.door, 'epis', e));
  list('consumables').forEach(c => add(consDoor(c), 'cons', c));
  list('matesp').forEach(m => add(matLugar(m).door, 'mat', m));
  return ix;
}
const pasCuenta = (ix, pas, lado) => Object.keys(ix).reduce((t, d) => { const u = pasDe(d); return u.pas === pas && (!lado || u.lado === lado) && pasVale(d) ? t + ['boxes', 'gear', 'epis', 'cons', 'mat'].reduce((s, k) => s + ix[d][k].length, 0) : t; }, 0);

/* ---------- El dibujo de un pasillo ---------- */
const matIcono = m => m.veh ? 'truck' : APARTADOS[m.ap]?.icon || 'box';
const tokMat = m => `<div class="tok tok-gear tok-mat ${matOk(m) ? '' : m.status === 'BAJA' ? 'is-baja' : 'has-bad'} ${m.holder && get('operators', m.holder) ? 'is-out' : ''}" data-mat="${m.id}" role="button" tabindex="0" aria-label="${esc(m.name)}, de ${esc(matDueno(m))}"><span class="tok-art">${ic(matIcono(m))}</span><span class="tok-name">${esc(m.name)}${(+m.qty || 1) > 1 ? ' ×' + m.qty : ''}</span></div>`;
const tokCons = c => `<div class="tok tok-gear tok-cons ${consLow(c) ? 'has-bad' : ''}" data-cons="${c.id}" role="button" tabindex="0" aria-label="${esc(c.name)}: ${c.stock} ${esc(c.unit)}"><span class="tok-art">${ic('package')}</span><span class="tok-name">${esc(c.name)}</span></div>`;
// Qué pasillo y qué lado se están viendo (el mismo en el Almacén y en los apartados)
const pasVista = k => { const nums = k ? apPasillos(k) : almacenNums(), n = k ? prefs.pasN?.[k] : prefs.almPas; return { pas: nums.includes(n) ? n : nums[0], lado: prefs.pasLado === 'D' ? 'D' : 'I' }; };
// Estantería de un lado: una fila por altura (arriba la balda más alta) y una columna por módulo. Se toca un hueco para
// verlo y se mantiene pulsado lo de dentro para arrastrarlo a otro hueco, a otro pasillo (pasando por encima de su botón)…
function pasDibujo(pas, lado, ix) {
  const g = pasGeo(pas, lado);
  const cell = (mod, niv) => { const d = pasDoor(pas, lado, mod, niv), c = ix[d] || { boxes: [], gear: [], epis: [], cons: [], mat: [] };
    const toks = [...c.boxes.sort((a, b) => (a.pos || 0) - (b.pos || 0)).map(b => tokBox(b)), ...c.gear.sort(byName).map(tokGear), ...c.epis.map(tokEpi), ...c.cons.map(tokCons), ...c.mat.sort(byName).map(tokMat)];
    return `<div class="cv-cell px-cell ${niv ? '' : 'px-floor'}" data-door="${d}" aria-label="${esc(pasNombre(d))}" onclick="cvClick(event, ${d})">
      <button class="cv-tag" aria-label="${esc(pasNombre(d))}: ${toks.length ? toks.length + (toks.length === 1 ? ' cosa' : ' cosas') : 'vacío'}">${niv === g.baldas ? 'M' + mod : ''}</button>${toks.slice(0, 6).join('')}${toks.length > 6 ? `<span class="px-more">+${toks.length - 6} más</span>` : ''}</div>`; };
  return `<div class="px-scroll"><div class="px" style="--mods:${g.mods}">
    ${Array.from({ length: g.baldas + 1 }, (_, i) => g.baldas - i).map(niv => `
      <div class="px-lvl ${niv ? '' : 'floor'}"><span>${nivNombre(niv, g.baldas)}</span></div>
      ${Array.from({ length: g.mods }, (_, m) => cell(m + 1, niv)).join('')}`).join('')}
  </div></div>`;
}
// Botones de pasillo y de lado. Al arrastrar algo por encima de uno (data-hop), se cambia a él para soltarlo allí.
function pasSelector(nums, pas, lado, ix, k) {
  const hop = o => esc(JSON.stringify(o)), pref = n => k ? { pasN: { ...prefs.pasN, [k]: n } } : { almPas: n };
  return `${nums.length > 1 ? `<div class="row chips pas-chips" role="group" aria-label="Pasillo">${nums.map(n => { const ds = pasDuenos(n).map(pasDuenoTxt).join(' y '), c = pasCuenta(ix, n);
      return `<button class="chip ${n === pas ? 'on' : ''}" aria-pressed="${n === pas}" data-hop="${hop(pref(n))}" onclick="setPref(${hop(pref(n))})">${k ? 'Pasillo ' : ''}<b>${n}</b>${k ? '' : ds ? ' ' + esc(ds) : ' Libre'}${c ? ` <span class="muted">${c}</span>` : ''}</button>`; }).join('')}</div>` : ''}
    <div class="seg-row" role="group" aria-label="Lado del pasillo">${Object.entries(LADOS).map(([l, t]) => { const c = pasCuenta(ix, pas, l);
      return `<button class="${l === lado ? 'on' : ''}" aria-pressed="${l === lado}" data-hop="${hop({ pasLado: l })}" onclick="setPref({ pasLado: '${l}' })">${t}<small>${c} ${c === 1 ? 'cosa' : 'cosas'}</small></button>`; }).join('')}</div>`;
}
// Lo que aún no tiene sitio, para arrastrarlo a un hueco (o tocar un hueco y «Traer aquí»); soltando aquí algo, se queda sin colocar
const sueltosZona = (mat, texto) => `<div class="cv-cell cv-unplaced px-sueltos" data-door="0" aria-label="Sin colocar">
    <span class="px-sueltos-t">${ic(mat.length ? 'alert' : 'checkc', 'i-sm')} ${mat.length ? `Sin colocar (${mat.length})` : texto}</span>${mat.map(tokMat).join('')}</div>`;

/* ---------- Almacén: todos los pasillos ---------- */
function viewAlmacen() {
  const nums = almacenNums(), { pas, lado } = pasVista(), ix = pasIndice(), g = pasGeo(pas, lado), ds = pasDuenos(pas);
  const sueltos = ds.filter(d => d !== 'usar').flatMap(sinColocar), usarSin = ds.includes('usar') ? list('gear').filter(x => !x.vehicle && enAlmacen(x) && !+x.door && !get('boxes', x.box)).length + list('boxes').filter(x => !x.vehicle && enAlmacen(x) && !+x.door).length : 0;
  const otros = [['box', 'Contenedor de USAR', 'Huecos B1 a B20, armarios y escalón', "go('contenedor')"], ['truck', 'Vehículos', 'Lo que lleva cada uno', "go('vehiculos')"],
    ...Object.keys(APARTADOS).filter(k => !apPasillos(k).length).map(k => [APARTADOS[k].icon, APARTADOS[k].name, 'Sin pasillo: su material, en su apartado', `setPref({ tab: '${k}', aptab: 'material' }); scrollTo(0, 0)`])];
  return `
    <div class="panel alm-top">
      <div class="between wrap-row sec-head"><div><h2>Almacén</h2><p class="muted">Todos los pasillos, con lo que hay en cada hueco, sea de quien sea.</p></div>
        <button class="btn btn-g btn-sm" onclick="almacenForm()">${ic('sliders')} De quién es cada pasillo</button></div>
      ${pasSelector(nums, pas, lado, ix)}
    </div>
    <div class="panel alm-rack">
      <div class="between sec-head"><div><h3>Pasillo ${pas} · ${LADOS[lado].toLowerCase()}</h3><p class="muted">${ds.length ? esc(ds.map(pasDuenoTxt).join(' y ')) : 'Libre'} · ${g.mods} ${g.mods === 1 ? 'módulo' : 'módulos'}, suelo y ${g.baldas} ${g.baldas === 1 ? 'balda' : 'baldas'}</p></div>
        <button class="btn btn-g btn-sm" onclick="pasConfig('', ${pas})">${ic('sliders')} Módulos y baldas</button></div>
      ${pasDibujo(pas, lado, ix)}
      <p class="muted px-ayuda">Toca un hueco para ver lo que hay o añadir. Mantén pulsado algo para arrastrarlo a otro hueco; pásalo por encima de otro pasillo o del otro lado para soltarlo allí.</p>
      ${sueltos.length ? sueltosZona(sueltos, '') : ''}
      ${usarSin ? `<p class="px-suelto warn">${ic('alert', 'i-sm')} USAR tiene ${usarSin} sin ubicar. <button class="link" onclick="go('contenedor')">Verlo</button></p>` : ''}
      <div class="row mat-mas"><button class="link" onclick="pasEtiquetas('', ${pas})">${ic('qr', 'i-sm')} Etiquetas QR de los huecos</button></div>
    </div>
    <div class="panel"><h3 class="sec-head">Otros sitios</h3>
      <div class="list">${otros.map(([icon, t, s, js]) => `<button class="item" onclick="${js}"><div class="who-row"><span class="cons-ico">${ic(icon)}</span><div><b>${esc(t)}</b><small>${esc(s)}</small></div></div>${ic('chev', 'i-sm')}</button>`).join('')}</div></div>`;
}

// El pasillo (o los pasillos) de un apartado, dentro de su pestaña «Material»: el mismo dibujo, solo con los suyos
function pasilloPanel(k) {
  const nums = apPasillos(k), puede = apPuede(k);
  if (!nums.length) return `<div class="panel"><div class="between sec-head"><h3>Pasillo</h3>${puede ? `<button class="btn btn-g btn-sm" onclick="pasConfig('${k}')">${ic('sliders')} Pasillos</button>` : ''}</div>
    <p class="muted">Este apartado no tiene pasillo propio. Su material se puede colocar en cualquier pasillo del <button class="link" onclick="go('almacen')">Almacén</button>, en el contenedor o en un vehículo con «Mover».</p></div>`;
  const { pas, lado } = pasVista(k), p = pasGeo(pas, lado), ix = pasIndice(), sueltos = sinColocar(k), total = apMat(k).length;
  return `<div class="panel alm-rack">
    <div class="between sec-head"><h3>Pasillo ${pas}</h3>${puede ? `<button class="btn btn-g btn-sm" onclick="pasConfig('${k}')">${ic('sliders')} Pasillos y baldas</button>` : ''}</div>
    ${pasSelector(nums, pas, lado, ix, k)}
    <p class="muted" style="margin:10px 0 12px">${LADOS[lado]} del pasillo ${pas}: ${p.mods} ${p.mods === 1 ? 'módulo' : 'módulos'}, con el suelo y ${p.baldas} ${p.baldas === 1 ? 'balda' : 'baldas'}. Toca un hueco para ver lo que hay o colocar material; mantén pulsado algo para arrastrarlo.</p>
    ${pasDibujo(pas, lado, ix)}
    ${total ? sueltosZona(sueltos, 'Todo el material tiene su sitio.') : ''}
    <div class="row mat-mas">${puede ? `<button class="link" onclick="pasEtiquetas('${k}')">${ic('qr', 'i-sm')} Etiquetas QR de los huecos</button>` : ''}
      <button class="link" onclick="setPref({ tab: 'almacen', almPas: ${pas} }); scrollTo(0, 0)">${ic('layers', 'i-sm')} Ver todo el almacén</button></div>
  </div>`;
}

/* ---------- Un hueco: lo que hay, añadir y traer ---------- */
// Lo de apartados y vehículos que hay en un sitio (un hueco, o un vehículo que no es el suyo)
const matEn = (door, veh = '') => list('matesp').filter(m => { const l = matLugar(m); return veh ? l.veh === veh && m.veh !== veh : !l.veh && l.door === door; }).sort(byName);
const matFila = m => `<div class="item"><button class="link-row grow" onclick="matForm('${duenoTxt(m)}', '${m.id}')"><div class="who-row"><span class="cons-ico">${ic(matIcono(m))}</span><div><b>${esc(m.name)}${(+m.qty || 1) > 1 ? ` <span class="muted nw">× ${+m.qty}</span>` : ''}</b>
    <small>${esc([matDueno(m), m.holder && get('operators', m.holder) ? 'Lo tiene ' + opName(m.holder) : '', AP_ESTADOS[m.status]?.[0] !== 'Operativo' ? AP_ESTADOS[m.status]?.[0] : '', m.place].filter(Boolean).join(' · '))}</small></div></div></button>
  <button class="btn btn-g btn-sm" onclick="moverA('mat', '${m.id}')">${ic('move', 'i-sm')} Mover</button></div>`;
// Se abre desde el dibujo (cellModal, en cajas.js, añade lo de USAR que haya en el hueco)
function pasHueco(k, pas, lado, mod, niv) { cellModal(pasDoor(pas, lado, mod, niv)); }
// «Material aquí» en un hueco de pasillo: de quién es lo que se añade (primero, los dueños de ese pasillo)
function materialAqui(door) {
  const u = pasDe(door), ds = pasDuenos(u.pas), pre = `{ pas: ${u.pas}, lado: '${u.lado}', mod: ${u.mod}, niv: ${u.niv} }`;
  const ir = d => d === 'usar' ? `addMaterial({ door: ${door} })` : `matForm('ap:${d}', '', ${pre})`;
  if (ds.length === 1) return ds[0] === 'usar' ? addMaterial({ door }) : matForm('ap:' + ds[0], '', u);
  const resto = ['usar', ...Object.keys(APARTADOS)].filter(d => !ds.includes(d)), btn = d => `<button class="item" onclick="${ir(d)}"><div class="who-row"><span class="cons-ico">${ic(d === 'usar' ? 'hardhat' : APARTADOS[d].icon)}</span><b>${esc(pasDuenoTxt(d))}</b></div>${ic('chev', 'i-sm')}</button>`;
  openModal('¿De quién es el material?', `<p class="muted" style="margin-bottom:10px">${esc(pasNombre(door))}</p>
    <div class="list">${ds.map(btn).join('')}</div>${ds.length ? `<h4 class="sec-title" style="margin:14px 0 8px">De otro apartado</h4>` : ''}<div class="list">${resto.map(btn).join('')}</div>`);
}

/* ---------- Mover: un material, a cualquier sitio ---------- */
// kind: 'mat' (apartados y vehículos), 'gear' (equipo de USAR), 'box' (caja de USAR) o 'cons' (fungible de USAR)
const MV_KIND = { mat: 'matesp', gear: 'gear', box: 'boxes', cons: 'consumables' };
const mvRec = (kind, id) => get(MV_KIND[kind], id);
const mvNombre = (kind, x) => kind === 'box' ? 'la caja ' + x.code : x.name;
const mvLugar = (kind, x) => kind === 'mat' ? matLugar(x) : kind === 'cons' ? { door: consDoor(x), veh: '' } : { door: x.vehicle ? 0 : +x.door || 0, veh: x.vehicle || '' };
function ponerEn(kind, id, door = 0, veh = '') {
  const x = mvRec(kind, id); if (!x) return;
  if (kind === 'mat') matPoner(id, door, veh);
  else if (kind === 'box') moveBox(id, door, veh);
  else if (kind === 'gear') moveGear(id, door, veh);
  else put('consumables', { ...x, door: +door || 0, location: '' }, `"${x.name}" → ${placeName(+door || 0, '')}`);
}
// Mueve y avisa, con «Deshacer» (vuelve a dejarlo todo como estaba) y un destello en el sitio de destino
function moverCon(kind, id, door = 0, veh = '') {
  const x = mvRec(kind, id); if (!x) return;
  const antes = mvLugar(kind, x), foto = kind === 'box' ? [['boxes', x], ...boxItems(id).map(g => ['gear', g])] : [[MV_KIND[kind], x]];
  ponerEn(kind, id, door, veh);
  const ahora = mvLugar(kind, mvRec(kind, id)); if (antes.door === ahora.door && antes.veh === ahora.veh && !(kind === 'gear' && x.box)) return;
  const nombre = kind === 'box' ? 'Caja ' + x.code : x.name;
  toast(`${nombre}: ${lugarTxt(ahora) || (kind === 'mat' ? 'sin colocar' : 'sin ubicar')}`, 'ok', { label: 'Deshacer', fn: () => {
    foto.forEach(([k, r]) => stamp(k, { ...r })); addLog(`Deshecho: ${nombre} vuelve a ${lugarTxt(antes) || 'estar sin colocar'}`, MV_KIND[kind] + ':' + id); commit(); toast(`${nombre}: como estaba`); } });
  cellFlash(ahora.door, ahora.veh);
}
// El hueco al que acaba de llegar algo late un momento (en cualquier dibujo: pasillos, contenedor o armarios)
function cellFlash(door, veh = '') {
  requestAnimationFrame(() => { const el = document.querySelector(veh ? `#view [data-veh="${veh}"]` : `#view [data-door="${door}"]:not(.dock-zone)`); if (!el) return;
    el.classList.remove('cell-flash'); void el.offsetWidth; el.classList.add('cell-flash'); setTimeout(() => el.classList.remove('cell-flash'), 1300); });
}
function moverHecho(kind, id, door, veh) {
  closeModal();
  if (enPasillo(door) && prefs.tab === 'almacen') { const u = pasDe(door); prefs.almPas = u.pas; prefs.pasLado = u.lado; }
  moverCon(kind, id, door, veh);
}
// La ventana de mover: primero el tipo de sitio y, debajo, dónde exactamente (en un pasillo se toca el hueco en su dibujo)
function moverA(kind, id, st = {}) {
  const x = mvRec(kind, id); if (!x || !me()) return;
  const l = mvLugar(kind, x), u = pasDe(l.door), ir = `'${kind}', '${id}'`;
  const paso = st.paso || (l.veh ? 'veh' : u ? 'pas' : l.door && l.door <= 20 ? 'cont' : l.door ? 'arm' : 'pas');
  const tipos = [['pas', 'layers', 'Pasillo'], ['cont', 'box', 'Contenedor'], ['veh', 'truck', 'Vehículo'], ['arm', 'case', 'Armarios']].filter(t => kind !== 'cons' || t[0] !== 'veh');
  const go2 = (door, veh, txt, sub, on) => `<button class="mv-op ${on ? 'on' : ''}" ${on ? 'aria-current="true"' : ''} onclick="moverHecho(${ir}, ${door}, '${veh}')"><b>${txt}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
  let cuerpo = '';
  if (paso === 'pas') {
    const nums = almacenNums(), pas = nums.includes(st.pas) ? st.pas : u?.pas || (kind === 'mat' && x.ap ? apPasillos(x.ap)[0] : usarPasillos()[0]) || nums[0], lado = st.lado || u?.lado || 'I', g = pasGeo(pas, lado), ix = pasIndice();
    const n = d => ix[d] ? ['boxes', 'gear', 'epis', 'cons', 'mat'].reduce((s, t) => s + ix[d][t].length, 0) : 0;
    cuerpo = `<div class="row chips pas-chips" role="group" aria-label="Pasillo">${nums.map(p => `<button class="chip ${p === pas ? 'on' : ''}" aria-pressed="${p === pas}" onclick="moverA(${ir}, { paso: 'pas', pas: ${p}, lado: '${lado}' })"><b>${p}</b> ${esc(pasDuenos(p).map(pasDuenoTxt).join(' y ') || 'Libre')}</button>`).join('')}</div>
      <div class="seg-row" role="group" aria-label="Lado del pasillo">${Object.entries(LADOS).map(([k, t]) => `<button class="${k === lado ? 'on' : ''}" aria-pressed="${k === lado}" onclick="moverA(${ir}, { paso: 'pas', pas: ${pas}, lado: '${k}' })">${t}</button>`).join('')}</div>
      <p class="muted" style="margin:10px 0 8px">Toca el hueco donde lo dejas.</p>
      <div class="px-scroll"><div class="px mv-px" style="--mods:${g.mods}">${Array.from({ length: g.baldas + 1 }, (_, i) => g.baldas - i).map(niv => `<div class="px-lvl ${niv ? '' : 'floor'}"><span>${nivNombre(niv, g.baldas)}</span></div>
        ${Array.from({ length: g.mods }, (_, m) => { const d = pasDoor(pas, lado, m + 1, niv), c = n(d), on = l.door === d;
          return `<button class="px-cell mv-hueco ${niv ? '' : 'px-floor'} ${on ? 'on' : ''}" ${on ? 'aria-current="true"' : ''} aria-label="${esc(pasNombre(d))}${on ? ' (está aquí)' : ''}: ${c ? c + (c === 1 ? ' cosa' : ' cosas') : 'vacío'}" onclick="moverHecho(${ir}, ${d}, '')">${niv === g.baldas ? `<span class="px-tag">M${m + 1}</span>` : ''}${on ? '<span class="mv-aqui">Aquí</span>' : c ? `<span class="mv-n">${c}</span>` : ''}</button>`; }).join('')}`).join('')}</div></div>`;
  } else if (paso === 'cont') {
    const cuenta = d => list('gear').filter(g => !g.vehicle && +g.door === d && !get('boxes', g.box)).length + list('boxes').filter(b => !b.vehicle && +b.door === d).length + matEn(d).length;
    cuerpo = Object.values(SIDES).map(([t, , off]) => `<h4 class="sec-title" style="margin:12px 0 8px">${t}</h4><div class="mv-grid">${DOOR_IDS.filter(d => d > off && d <= off + 10).map(d => { const c = cuenta(d); return go2(d, '', doorName(d), c ? c + (c === 1 ? ' cosa' : ' cosas') : 'Vacío', l.door === d && !l.veh); }).join('')}</div>`).join('');
  } else if (paso === 'veh') {
    cuerpo = `<div class="mv-grid mv-veh">${vehicles().map(v => go2(0, v.id, esc(v.name), kind === 'mat' && x.veh === v.id ? 'Es su vehículo' : esc((v.units || []).map(q => q.plate).slice(0, 2).join(' · ')), l.veh === v.id)).join('') || '<p class="muted">No hay vehículos dados de alta.</p>'}</div>`;
  } else {
    cuerpo = [1, 2, 3].map(a => `<h4 class="sec-title" style="margin:12px 0 8px">Armario ${a}</h4><div class="mv-grid">${ARMARIOS.filter(r => r.n === a).map(r => go2(r.id, '', 'Balda ' + r.balda, '', l.door === r.id)).join('')}</div>`).join('')
      + `<h4 class="sec-title" style="margin:12px 0 8px">Junto a los armarios</h4><div class="mv-grid">${go2(ARM_SUELO, '', 'Delante de los armarios', '', l.door === ARM_SUELO)}${kind === 'mat' ? '' : go2(ESCALON, '', 'Escalón', 'En revisión', l.door === ESCALON)}</div>`;
  }
  const sinSitio = kind === 'mat' && x.veh ? ['A su vehículo', l.veh === x.veh] : [kind === 'mat' ? 'Sin colocar' : 'Sin ubicar', !l.door && !l.veh];
  openModal(`Mover ${mvNombre(kind, x)}`, `
    <p class="mv-ahora">${ic('pin', 'i-sm')} Ahora: <b>${esc(lugarTxt(l) || (kind === 'mat' ? 'sin colocar' : 'sin ubicar'))}</b></p>
    <div class="mv-tipos" role="group" aria-label="A dónde">${tipos.map(([p, icon, t]) => `<button class="${p === paso ? 'on' : ''}" aria-pressed="${p === paso}" onclick="moverA(${ir}, { paso: '${p}' })">${ic(icon)}<span>${t}</span></button>`).join('')}</div>
    <div class="mv-cuerpo">${cuerpo}</div>
    ${sinSitio[1] ? '' : `<button class="btn btn-g full" style="margin-top:14px" onclick="moverHecho(${ir}, 0, '${kind === 'mat' && x.veh ? x.veh : ''}')">${ic(kind === 'mat' && x.veh ? 'truck' : 'box')} ${sinSitio[0]}</button>`}`);
}
// Soltar un material de apartado o vehículo encima de «Persona» (al arrastrar): a quién se le asigna
function matDar(id) {
  const m = get('matesp', id); if (!m) return;
  openForm(`¿Quién se lleva ${m.name}?`, [{ k: 'holder', label: 'Persona', value: m.holder || me()?.id || '', wide: true, options: [['', 'Nadie: está en su sitio'], ...operators().sort(byName).map(o => [o.id, conEmpleo(o)])] }],
    v => put('matesp', { ...m, holder: v.holder || '', held: v.holder ? todayISO() : '' }, `${matDueno(m)}: ${m.name} ${v.holder ? 'asignado a ' + opName(v.holder) : 'vuelve a su sitio'}`));
}

/* ---------- Configurar ---------- */
// Módulos y baldas del lado que se está viendo (o de los dos) y, desde un apartado, qué pasillos son los suyos
function pasConfig(k, n) {
  if (!me()) return;
  const nums = k ? apPasillos(k) : [], v0 = pasVista(k), pas = n || v0.pas, lado = v0.lado, p = pas ? pasGeo(pas, lado) : PASILLO_DEF;
  openForm(k ? `Pasillos de ${APARTADOS[k].name}` : `Pasillo ${pas}`, [
    ...(k ? [{ k: 'nums', label: 'Números de pasillo de este apartado (separados por comas; vacío si no tiene)', value: nums.join(', '), wide: true, placeholder: 'Ej.: 1, 2' }] : []),
    ...(pas ? [{ k: 'mods', label: `Módulos del pasillo ${pas}, ${LADOS[lado].toLowerCase()} (de 1 a 12)`, type: 'number', value: p.mods, required: true },
      { k: 'baldas', label: 'Baldas, sin contar el suelo (de 1 a 6)', type: 'number', value: p.baldas, required: true },
      { k: 'ambos', label: 'Lados', type: 'checks', wide: true, value: [], options: [['si', 'Poner lo mismo en el otro lado del pasillo']] }] : [])
  ], v => {
    if (pas) { const cfg = { mods: Math.min(12, Math.max(1, Math.round(+v.mods || PASILLO_DEF.mods))), baldas: Math.min(6, Math.max(1, Math.round(+v.baldas || PASILLO_DEF.baldas))) };
      stamp('meta', { id: 'pasgeo', value: { ...(get('meta', 'pasgeo')?.value || {}), [pas + lado]: cfg, ...((v.ambos || []).includes('si') ? { [pas + (lado === 'I' ? 'D' : 'I')]: cfg } : {}) } }); }
    if (k) { const nuevos = [...new Set(String(v.nums || '').split(/[^\d]+/).map(Number).filter(x => x >= 1 && x <= 99))].sort((a, b) => a - b);
      put('meta', { id: 'appas-' + k, value: { ...pasCfg(k), nums: nuevos } }, `Pasillos de ${APARTADOS[k].name}: ${nuevos.join(', ') || 'ninguno'}`); }
    else { addLog(`Pasillo ${pas}: módulos y baldas cambiados`); commit(); }
  }, `<p class="muted span2">Si quitas módulos o baldas, lo que estaba en ellos pasa a «Sin colocar»; no se borra nada.</p>`);
}

// Etiquetas con QR para pegar en cada hueco del pasillo que se está viendo (los dos lados): al leerlas se abre ese hueco
function pasEtiquetas(k, n) {
  const pas = n || pasVista(k).pas; if (!pas) return;
  const huecos = ['I', 'D'].flatMap(lado => { const p = pasGeo(pas, lado);
    return Array.from({ length: p.mods }, (_, m) => Array.from({ length: p.baldas + 1 }, (_, niv) => [lado, m + 1, niv, p.baldas])).flat(); });
  const de = pasDuenos(pas).map(pasDuenoTxt).join(' y ');
  $('print').innerHTML = `<div class="labels">${huecos.map(([lado, mod, niv, baldas]) => `<div class="label">${QR.svg(appUrl() + '#h=' + [k || 'almacen', pas, lado, mod, niv].join('.'), 2)}
    <b>Pasillo ${pas} · ${LADOS[lado]}</b>Módulo ${mod} · ${nivNombre(niv, baldas)}${de ? ' · ' + esc(de) : ''}</div>`).join('')}</div>`;
  print();
}

/* ---------- De quién es cada pasillo ---------- */
function almacenPanel() {
  const ix = pasIndice();
  return `<div class="panel"><div class="between"><h3>Pasillos del almacén</h3><button class="btn btn-g btn-sm" onclick="almacenForm()">${ic('sliders')} Cambiar</button></div>
    <div class="log-rows">${almacenNums().map(n => { const ds = pasDuenos(n), cuenta = pasCuenta(ix, n);
      return logRow('Pasillo ' + n, ds.map(pasDuenoTxt).join(' y ') || 'Libre', '', `setPref({ tab: 'almacen', almPas: ${n} }); scrollTo(0, 0)`, ` ${cuenta} ${cuenta === 1 ? 'cosa colocada' : 'cosas colocadas'}`); }).join('')}</div></div>`;
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
  }, `<p class="muted span2">Di qué especialidad hay en cada pasillo. Al cambiarlo no se borra ni se mueve nada: lo que hay en cada hueco sigue ahí.</p>`);
}
