'use strict';
// SIER 242 · Vehículos: los modelos de la flota con sus matrículas, la ITV y la revista de salida de cada una

// En el orden de la flota de la unidad; los añadidos después, por nombre
// Flota por orden alfabético (también los vehículos que se añadan o renombren)
const vehicles = () => list('vehicles').sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es', { numeric: true }));
// Las matrículas de la unidad son «ET-» y números: se añade el prefijo si falta (vacío o solo «ET-» = sin matrícula)
const etPlate = p => { const s = String(p || '').trim().toUpperCase(); if (/^RQ[\s-]/.test(s)) return 'RQ-' + s.replace(/^RQ[\s-]*/, ''); const t = s.replace(/^ET[\s-]*/, '').trim(); return t ? 'ET-' + t : ''; };
const localNow = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const fmtDT = v => v ? new Date(v).toLocaleString('es-ES', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Sin fecha';
const opChecks = () => operators().map(o => [o.id, o.name]);
const names = ids => ids.map(id => get('operators', id)?.name).filter(Boolean);

// Módulos y contenedores que se montan en un vehículo (los contenedores pequeños de la Renault): van aparte de los
// vehículos, con su propio material y su revista. Se guardan como un vehículo más, con tipo «modulo» y sin matrículas.
const esModulo = v => v?.tipo === 'modulo';
// A quién está asignada una matrícula: a un pelotón o «Común» (del parque, o de los dos pelotones). Si no se ha dicho,
// se saca de lo apuntado en su destino («1º pelotón», «Parque»…); «-» es que se ha dejado sin asignar a propósito.
const VEH_COMUN = 'Común', VEH_GRUPOS = [...PELOTONES, VEH_COMUN];
const unitPel = u => { if (u.pel) return u.pel === '-' ? '' : u.pel; const t = String(u.use || '');
  return /1\S{0,2}\s*\/\s*2|parque/i.test(t) ? VEH_COMUN : /\b1\S{0,2}\s*pelot/i.test(t) ? 'PIEN 1' : /\b2\S{0,2}\s*pelot/i.test(t) ? 'PIEN 2' : ''; };
// Configuración de cada matrícula de la autobomba Renault (lo que lleva detrás): de serie, el módulo LCIF
const unitMod = u => u?.mod ?? 'lcif';

// Dibujo o foto de un modelo de vehículo (la autobomba Renault, con el módulo que lleve; un módulo, con el suyo)
const vehArtSrc = (id, mod = '') => `img/veh/${id === RENAULT ? RENAULT_MOD[mod]?.[1] || RENAULT_MOD[''][1] : id.toLowerCase()}.webp`;
const vehArt = (v, cls = '', mod = v?.id === RENAULT ? 'lcif' : '') => v?.photo ? `<img class="veh-art ${cls}" data-img="veh:${v.id}" alt="">`
  : v?.art ? `<img class="veh-art ${cls}" src="img/veh/${esc(v.art)}.webp" alt="" loading="lazy">`
  : VEH_ART.includes(v?.id) ? `<img class="veh-art ${cls}" src="${vehArtSrc(v.id, mod)}" alt="" loading="lazy">` : `<span class="veh-art none ${cls}">${ic(esModulo(v) ? 'box' : 'truck', 'i-lg')}</span>`;
// Lo que va en un vehículo sin ser suyo: material de un apartado o de otro vehículo, y equipos o cajas de USAR
function vehOtros(id) {
  const usar = (x, kind) => `<div class="item"><button class="link-row grow" onclick="${kind === 'box' ? 'boxDetail' : 'gearDetail'}('${x.id}')"><div class="who-row"><span class="cons-ico">${ic(kind === 'box' ? 'case' : 'hardhat')}</span><div><b>${esc(kind === 'box' ? 'Caja ' + x.code : x.name)}${kind === 'box' ? '' : qtyText(x)}</b><small>${esc(['USAR', kind === 'box' ? x.name : ''].filter(Boolean).join(' · '))}</small></div></div></button>
    <button class="btn btn-g btn-sm" onclick="moverA('${kind}', '${x.id}')">${ic('move', 'i-sm')} Mover</button></div>`;
  return [...matEn(0, id).map(matFila), ...list('boxes').filter(b => b.vehicle === id).map(b => usar(b, 'box')), ...list('gear').filter(g => g.vehicle === id && !get('boxes', g.box)).sort(byName).map(g => usar(g, 'gear'))].join('');
}
// Etiquetas de estado de una matrícula: ITV, fallos del último checklist, material que falta o está roto y si toca checklist
function unitTags(v, u) {
  const c = lastVcheck(u.id), mal = matDe({ veh: v.id, unit: u.id }).filter(m => matVivo(m) && !matOk(m)).length, f = revFalta(`veh:${v.id}#${u.id}`), n = u.itv ? daysTo(u.itv) : null;
  return [n != null && n < 0 ? '<span class="tag bad">ITV caducada</span>' : n != null && n <= 30 ? '<span class="tag warn">ITV pronto</span>' : '',
    c?.fails.length ? `<span class="tag bad">${c.fails.length === 1 ? 'Fallo' : c.fails.length + ' fallos'}</span>` : '',
    mal ? `<span class="tag bad">${mal} ${mal === 1 ? 'falta o está roto' : 'faltan o están rotos'}</span>` : '',
    f != null && f <= 0 ? '<span class="tag warn">Toca checklist</span>' : ''].join('');
}
// Ficha de una matrícula: su dibujo, a quién está asignada, la ITV, el último checklist y su material
function unidadView(vid, unit) {
  const v = get('vehicles', vid), u = (v?.units || []).find(x => x.id === unit); if (!u) return vehicleView(vid);
  const owner = `veh:${vid}#${u.id}`, pel = unitPel(u), l = itvLast(u), dato = (t, x) => x ? `<div class="log-row txt"><span>${t}</span><b>${esc(x)}</b></div>` : '';
  openModal(`${v.name} · ${u.plate}`, `
    <div class="veh-hero">${vehArt(v, 'lg', vid === RENAULT ? unitMod(u) : undefined)}</div>
    <div class="row tags uni-tags">${unitTags(v, u) || '<span class="tag ok">Todo en orden</span>'}</div>
    <div class="log-rows uni-datos">
      ${dato('Asignado a', pel || 'Sin asignar')}${vid === RENAULT ? dato('Configuración', RENAULT_MOD[unitMod(u)]?.[0] || '') : ''}
      ${dato('Titular', u.titular)}${dato('Suplente', u.suplente)}${dato('Destino', u.use)}
      <button class="log-row txt ${u.itv && daysTo(u.itv) < 0 ? 'bad' : ''}" onclick="${u.itv && daysTo(u.itv) <= 0 ? `itvForm('${vid}', '${u.id}')` : `itvHistory('${vid}', '${u.id}')`}"><span>ITV${l ? `<small> la última, ${fmtDate(l.date)}: ${esc((ITV_RES[l.res]?.[0] || l.res).split(' (')[0].toLowerCase())}${l.defects ? ' · ' + esc(l.defects) : ''}</small>` : ''}</span><b>${u.itv ? (daysTo(u.itv) <= 0 ? '¿La ha pasado?' : fmtDate(u.itv)) : 'Sin fecha'}</b></button>
    </div>
    <div class="veh-mat">${matBloque(owner, 'Apunta lo que lleva esta matrícula: mangotes, mangueras, puntas de lanza, herramientas, calzos, cadenas…')}</div>
    ${(o => o ? `<h4 class="sec-title" style="margin:16px 0 8px">También va en este vehículo</h4><div class="list veh-otros">${o}</div>` : '')(vehOtros(vid))}
    ${puedeFlota() ? `<div class="grid g2" style="grid-template-columns:1fr 1fr; margin-top:12px"><button class="btn btn-g" onclick="unitForm('${vid}', '${u.id}', true)">${ic('pencil')} Editar matrícula</button>
      <button class="btn btn-g" onclick="vehicleForm('${vid}')">${ic('truck')} Editar modelo</button></div>` : ''}`);
}
// Ficha de un modelo: sus matrículas (cada una abre la suya), el material de todas y, quien quiera, lo edita. Con una
// sola matrícula se abre directamente la ficha de esa matrícula. Un módulo o contenedor tiene solo su material.
function vehicleView(id) {
  const v = get('vehicles', id); if (!v) return;
  const units = unitsOf_(v), mod = esModulo(v);
  if (units.length === 1 && !mod) return unidadView(id, units[0].id);
  const fila = u => `<button class="item veh-u" onclick="unidadView('${id}', '${u.id}')"><div class="grow"><b class="nw">${esc(u.plate)}</b><small>${esc([unitPel(u) || 'Sin asignar', u.titular].filter(Boolean).join(' · '))}</small></div><span class="row tags">${unitTags(v, u)}</span>${ic('chev', 'i-sm')}</button>`;
  const en = mod && v.en ? allUnits().find(u => u.id === v.en) : null;
  openModal(v.name, `
    <div class="veh-hero">${vehArt(v, 'lg')}</div>
    ${v.notes || v.seats ? `<p class="muted" style="margin-top:8px">${esc([v.seats ? v.seats + ' plazas' : '', v.notes].filter(Boolean).join(' · '))}</p>` : ''}
    ${mod ? `<div class="log-rows uni-datos"><div class="log-row txt"><span>Dónde está</span><b>${esc(en ? `Montado en ${vehName(en.vid)} ${en.plate}` : v.sitio || 'En el parque')}</b></div></div>`
      : units.length ? `<h4 class="sec-title" style="margin-top:14px">Matrículas (${units.length})</h4><div class="list">${units.map(fila).join('')}</div>` : ''}
    <div class="veh-mat">${matBloque('veh:' + id, mod ? 'Apunta lo que lleva este módulo o contenedor.' : 'Apunta lo que lleva: mangotes, mangueras, puntas de lanza, herramientas, calzos, cadenas…')}</div>
    ${(o => o ? `<h4 class="sec-title" style="margin:16px 0 8px">También va en este ${mod ? 'módulo' : 'vehículo'}</h4><div class="list veh-otros">${o}</div>` : '')(vehOtros(id))}
    ${puedeFlota() ? `<button class="btn btn-g full" style="margin-top:12px" onclick="${mod ? `moduloForm('${id}')` : `vehicleForm('${id}')`}">${ic('pencil')} ${mod ? 'Editar' : 'Editar modelo y matrículas'}</button>` : ''}`);
}

/* ---------- La pantalla de Vehículos ---------- */
// Arriba, el resumen de la flota; debajo, las matrículas por pelotón (o los modelos) y, aparte, los módulos y contenedores
function viewVehiculos() {
  const todos = vehicles(), mods = todos.filter(esModulo), vs = todos.filter(v => !esModulo(v)), flota = flotaEstado(), libres = flota.filter(x => x.libre);
  // Por pelotón se ve un grupo cada vez; de entrada, el pelotón de quien mira (si tiene matrículas) o todos
  const grupos = [...VEH_GRUPOS, ''].map(g => [g, flota.filter(x => unitPel(x.u) === g)]).filter(([, xs]) => xs.length);
  const mio = me()?.peloton, gSel = grupos.some(([g]) => g === prefs.vehGrupo) || prefs.vehGrupo === 'todos' ? prefs.vehGrupo : grupos.some(([g]) => g === mio) ? mio : 'todos';
  const vista = prefs.vehVista === 'modelo' ? 'modelo' : 'pel', toca = revPendientes().filter(([o]) => o.startsWith('veh:')).length;
  const kpi = (label, valor, cls = '') => `<div class="sier-kpi ${cls}"><small>${label}</small><b>${valor}</b></div>`;
  const fila = ({ v, u }) => `<button class="item veh-u" onclick="unidadView('${v.id}', '${u.id}')">${vehArt(v, 'sm', v.id === RENAULT ? unitMod(u) : undefined)}<div class="grow"><b class="nw">${esc(u.plate)}</b>
    <small>${esc([v.name, v.id === RENAULT ? RENAULT_MOD[unitMod(u)]?.[0] : '', u.titular].filter(Boolean).join(' · '))}</small><span class="row tags">${unitTags(v, u)}</span></div>${ic('chev', 'i-sm')}</button>`;
  const grupo = (titulo, xs) => xs.length ? `<div class="panel veh-grupo"><div class="between sec-head"><h3>${esc(titulo)}</h3><span class="muted">${xs.length} ${xs.length === 1 ? 'matrícula' : 'matrículas'}</span></div>
    <div class="list">${xs.sort((a, b) => a.v.name.localeCompare(b.v.name, 'es') || a.u.plate.localeCompare(b.u.plate, 'es', { numeric: true })).map(fila).join('')}</div></div>` : '';
  const tarjeta = v => { const nm = matDe({ veh: v.id }).length; return `<button onclick="vehicleView('${v.id}')" class="item veh-item">${vehArt(v)}<div class="grow"><b>${esc(v.name)}</b>
    <small>${[(v.units || []).length ? (v.units.length === 1 ? v.units[0].plate : v.units.length + ' matrículas') : '', v.seats ? v.seats + ' plazas' : '', nm ? nm + ' de material' : '', v.notes].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</small>
    ${vehFails(v)}${itvSoon(v)}</div></button>`; };
  const sinMat = vs.filter(v => !(v.units || []).length);
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><div><h2>Vehículos</h2><p class="muted">Cada matrícula, con su pelotón, su ITV, su checklist y el material que lleva.</p></div>
        ${puedeFlota() ? `<button class="btn btn-a" onclick="vehicleForm()">${ic('plus')} Modelo</button>` : ''}</div>
      ${flota.length ? `<div class="sier-res log-res veh-res">${kpi('Disponibles', `${libres.length}<span class="ap-de">/${flota.length}</span>`, logCls(libres.length, flota.length) === 'bad' ? 'bad' : '')}
        ${kpi('Con fallos', flota.filter(x => x.fallo).length, flota.some(x => x.fallo) ? 'bad' : '')}${kpi('ITV caducada', flota.filter(x => x.itv).length, flota.some(x => x.itv) ? 'bad' : '')}${kpi('Toca checklist', toca)}</div>` : ''}
      <div class="seg-row veh-vista" role="group" aria-label="Ver">${[['pel', 'Por pelotón'], ['modelo', 'Por modelo']].map(([k, t]) => `<button class="${k === vista ? 'on' : ''}" aria-pressed="${k === vista}" onclick="setPref({ vehVista: '${k}' })">${t}</button>`).join('')}</div>
      ${vista === 'pel' && grupos.length > 1 ? `<div class="row chips veh-grupos" role="group" aria-label="Asignados a">${[['todos', 'Todos', flota.length], ...grupos.map(([g, xs]) => [g, g || 'Sin asignar', xs.length])].map(([g, t, n]) =>
        `<button class="chip ${g === gSel ? 'on' : ''}" aria-pressed="${g === gSel}" onclick="setPref({ vehGrupo: '${g}' })">${esc(t)} <span class="muted">${n}</span></button>`).join('')}</div>` : ''}
    </div>
    ${vista === 'pel' ? `${grupos.filter(([g]) => gSel === 'todos' || g === gSel).map(([g, xs]) => grupo(g || 'Sin asignar', xs)).join('')}
        ${sinMat.length ? `<div class="panel"><div class="between sec-head"><h3>Sin matrícula apuntada</h3><span class="muted">${sinMat.length}</span></div><div class="grid g3">${sinMat.map(tarjeta).join('')}</div></div>` : ''}`
      : `<div class="panel"><div class="grid g3">${vs.map(tarjeta).join('') || '<p class="muted">Añade los modelos de vehículo de la unidad.</p>'}</div></div>`}
    <div class="panel veh-mods-p">
      <div class="between wrap-row sec-head"><div><h3>Módulos y contenedores</h3><p class="muted">Lo que se monta en un vehículo y va aparte, con su propio material.</p></div>
        ${puedeFlota() ? `<button class="btn btn-g btn-sm" onclick="moduloForm()">${ic('plus')} Módulo</button>` : ''}</div>
      <div class="grid g3">${mods.map(tarjeta).join('') || '<p class="muted">Aún no hay módulos ni contenedores.</p>'}</div>
    </div>`;
}
// Un módulo o contenedor: su nombre, dónde está (o en qué matrícula va montado) y unas notas
function moduloForm(id) {
  if (!soloFlota()) return;
  const v = get('vehicles', id) || {};
  openForm(id ? `Editar ${v.name}` : 'Nuevo módulo o contenedor', [
    { k: 'name', label: 'Nombre', value: v.name, required: true, wide: true, placeholder: 'Ej: Contenedor pequeño' },
    { k: 'en', label: 'Montado en', value: v.en || '', wide: true, options: [['', 'No va montado'], ...allUnits().map(u => [u.id, `${vehName(u.vid)} ${u.plate}`])] },
    { k: 'sitio', label: 'Dónde está (si no va montado)', value: v.sitio, wide: true, placeholder: 'Ej: En el parque, junto al pasillo 6' },
    { k: 'notes', label: 'Notas', value: v.notes, wide: true },
    { k: 'photo', label: 'Foto', type: 'photo', value: '', wide: true }
  ], async val => {
    const rec = { plate: '', seats: '', units: [], ...(get('vehicles', id) || { id: uid('V-MOD') }), tipo: 'modulo', name: val.name, en: val.en || '', sitio: val.sitio || '', notes: val.notes || '' };
    if (val.photo) await Img.put(`veh:${rec.id}`, val.photo);
    put('vehicles', { ...rec, photo: val.photo ? true : rec.photo || false }, `Módulo "${val.name}" ${id ? 'editado' : 'añadido'}`); vehicleView(rec.id);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="deleteVehicle('${id}')">${ic('trash')} Eliminar</button>` : '');
}

/* ---------- Checklist de cada vehículo (cualquiera lo hace; queda el historial por matrícula) ---------- */
const VCHECK = ['Niveles (aceite, refrigerante, AdBlue)', 'Luces y rotativos', 'Neumáticos', 'Frenos', 'Limpiaparabrisas',
  'Documentación (permiso de circulación, ITV, seguro)', 'Extintor, botiquín y triángulos', 'Emisora y transmisiones', 'Carrocería y limpieza'];
const FUEL = ['Lleno', '3/4', '1/2', '1/4', 'Reserva'];
const checksOf = (vid, unit) => list('vchecks').filter(c => c.vid === vid && (c.unit || '') === (unit || '')).sort((a, b) => b.date - a.date);
const lastVcheck = unit => list('vchecks').filter(c => c.unit === unit).sort((a, b) => b.date - a.date)[0];
const checkLine = c => `Checklist ${fmtWhen(c.date)} · ${c.fails.length ? `${c.fails.length === 1 ? 'Fallo' : c.fails.length + ' fallos'}: ${c.fails.map(f => f.split(' (')[0].toLowerCase()).join(', ')}` : 'todo bien'}${c.km ? ` · ${(+c.km).toLocaleString('es-ES')} km` : ''}`;
// La revista de salida de antes es ahora el checklist de la matrícula (el vehículo y su material: ver material.js)
const vcheckForm = (vid, unit = '') => checklistForm('veh:' + vid + (unit ? '#' + unit : ''));
/* ---------- ITV: al llegar la fecha se pregunta si la ha pasado; resultado, defectos y próxima fecha ---------- */
const ITV_RES = { favorable: ['Favorable', 'ok'], desfavorable: ['Desfavorable (con defectos)', 'warn'], negativa: ['Negativa (no puede circular)', 'bad'] };
// Matrículas cuya ITV ya ha llegado (o pasado) y aún no se ha apuntado el resultado
const itvPending = () => vehicles().flatMap(v => (v.units || []).filter(u => u.itv && daysTo(u.itv) <= 0).map(u => ({ v, u })));
const itvLast = u => (u.itvs || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
function itvForm(vid, unit, pre = {}) {
  const v = get('vehicles', vid), u = (v?.units || []).find(x => x.id === unit); if (!u) return;
  const next = new Date(); next.setFullYear(next.getFullYear() + 1);
  openForm(`ITV · ${v.name} ${u.plate}`, [
    { k: 'res', label: '¿Ha pasado la ITV?', value: pre.res || 'favorable', options: Object.entries(ITV_RES).map(([k, [l]]) => [k, l]), required: true, wide: true },
    { k: 'date', label: 'Fecha en que se pasó', type: 'date', value: pre.date || todayISO(), required: true },
    { k: 'next', label: 'Próxima fecha (siguiente ITV, o volver a pasarla si ha fallado)', type: 'date', value: pre.next || next.toISOString().slice(0, 10), required: true, wide: true },
    { k: 'defects', label: 'Fallos o defectos (si ha tenido)', type: 'textarea', value: pre.defects || '', wide: true, placeholder: 'Ej: Luz de matrícula fundida; holgura en la dirección' },
    { k: 'station', label: 'Estación ITV', value: pre.station || '', placeholder: 'Ej: ITV Arinaga' }
  ], val => {
    if (val.res !== 'favorable' && !val.defects.trim()) { toast('Apunta qué fallos ha tenido', 'bad'); return itvForm(vid, unit, val); }
    const rec = { date: val.date, res: val.res, next: val.next, defects: val.defects.trim(), station: val.station.trim(), by: prefs.activeOperator };
    const cur = get('vehicles', vid);
    put('vehicles', { ...cur, units: cur.units.map(x => x.id === unit ? { ...x, itv: val.next, cita: '', itvs: [...(x.itvs || []), rec] } : x) },
      `ITV ${u.plate}: ${ITV_RES[val.res][0].toLowerCase()}${rec.defects ? ' (' + rec.defects + ')' : ''}; próxima ${fmtDate(val.next)}`);
    vehicleView(vid);
  });
}
function itvHistory(vid, unit) {
  const v = get('vehicles', vid), u = (v?.units || []).find(x => x.id === unit); if (!u) return;
  const hs = (u.itvs || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  openModal(`ITV · ${u.plate}`, `<p class="muted" style="margin-bottom:10px">${u.itv ? `Próxima: ${fmtDate(u.itv)}` : 'Sin fecha de ITV'}</p>
    <div class="list">${hs.map(h => `<div class="item"><div class="grow"><b>${fmtDate(h.date)}${h.station ? ' · ' + esc(h.station) : ''}</b>
      ${h.defects ? `<small class="${h.res === 'favorable' ? '' : 'bad-text'}">Defectos: ${esc(h.defects)}</small>` : ''}<small>Próxima: ${fmtDate(h.next)}${h.by ? ' · ' + esc(h.by) : ''}</small></div>
      <span class="tag ${ITV_RES[h.res]?.[1] || 'neutral'}">${esc((ITV_RES[h.res]?.[0] || h.res).split(' (')[0])}</span></div>`).join('') || '<p class="muted">Aún no hay ITV apuntadas.</p>'}</div>
    <button class="btn btn-a full" style="margin-top:12px" onclick="itvForm('${vid}', '${unit}')">${ic('check')} Apuntar ITV</button>`);
}

const vcheckHistory = (vid, unit = '') => checklistHistorial('veh:' + vid + (unit ? '#' + unit : ''));
function vehicleForm(id) {
  if (!soloFlota()) return;
  const v = get('vehicles', id) || {};
  openForm(id ? `Editar ${v.name}` : 'Nuevo modelo de vehículo', [
    { k: 'name', label: 'Nombre o modelo', value: v.name, required: true, wide: true, placeholder: 'Ej: Amarok' },
    { k: 'seats', label: 'Plazas', type: 'number', value: v.seats },
    { k: 'notes', label: 'Notas', value: v.notes, wide: true, placeholder: 'Ej: Lleva el contenedor USAR' },
    { k: 'photo', label: VEH_ART.includes(id) ? 'Foto (sustituye al dibujo)' : 'Foto o dibujo', type: 'photo', value: '', wide: true }
  ], async val => {
    const rec = { ...(get('vehicles', id) || { id: uid('V') }), ...val, seats: +val.seats || '' };
    if (val.photo) await Img.put(`veh:${rec.id}`, val.photo);
    put('vehicles', { ...rec, photo: val.photo ? true : (get('vehicles', id)?.photo || false) }, `Vehículo "${val.name}" ${id ? 'editado' : 'añadido'}`);
  },
  id ? `<div class="span2 units-list"><b>Matrículas (${unitsOf_(v).length})</b>
      ${unitsOf_(v).map(u => `<button type="button" class="item" onclick="unitForm('${id}', '${u.id}')"><div class="grow"><b>${esc(u.plate)}</b>
        <small>${esc([u.use, u.titular].filter(Boolean).join(' · ') || ' ')}</small></div>${itvTag(u)}</button>`).join('')}
      <button type="button" class="btn btn-g full" onclick="unitForm('${id}')">${ic('plus')} Añadir matrícula</button></div>
    <button type="button" class="btn btn-bad span2" onclick="deleteVehicle('${id}')">${ic('trash')} Eliminar de la flota</button>` : '');
}
// Matrículas de un modelo (cada vehículo real), ordenadas
const unitsOf_ = v => [...(v?.units || [])].sort((a, b) => a.plate.localeCompare(b.plate, 'es', { numeric: true }));
const allUnits = () => vehicles().flatMap(v => (v.units || []).map(u => ({ ...u, vid: v.id })));
const itvTag = u => { if (!u.itv) return ''; const n = daysTo(u.itv); return `<span class="tag ${n < 0 ? 'bad' : n <= 30 ? 'warn' : 'neutral'}">ITV ${n < 0 ? 'caducada' : fmtDate(u.itv)}</span>`; };
// Una matrícula: datos de la hoja y la pizarra (ITV, cita, destino, titular y suplente). Cambiar el modelo la pasa a otro
// (ATB M1 o M2) y con él cambia el dibujo.
// volver: tras guardar, a la ficha de la matrícula (si se abrió desde ella) o a la edición del modelo
function unitForm(vid, id, volver = false) {
  if (!soloFlota()) return;
  const v = get('vehicles', vid), u = (v.units || []).find(x => x.id === id) || {};
  openForm(id ? u.plate : `Nueva matrícula · ${v.name}`, [
    { k: 'plate', label: 'Matrícula', value: u.plate || 'ET-', required: true, placeholder: 'Ej: ET-120111 o RQ-112426' },
    { k: 'vid', label: 'Modelo', value: vid, options: vehicles().filter(x => !esModulo(x)).map(x => [x.id, x.name]), required: true },
    { k: 'pel', label: 'Asignado a', value: unitPel(u), options: [['', 'Sin asignar'], ...VEH_GRUPOS.map(g => [g, g === VEH_COMUN ? 'Común (parque o los dos pelotones)' : g])] },
    ...(vid === RENAULT ? [{ k: 'mod', label: 'Configuración (lo que lleva detrás)', value: unitMod(u), options: Object.entries(RENAULT_MOD).map(([k, [l]]) => [k, l]) }] : []),
    { k: 'itv', label: 'Caducidad ITV', type: 'date', value: u.itv },
    { k: 'cita', label: 'Próxima cita ITV', value: u.cita, placeholder: 'Ej: 28/10 11:00' },
    { k: 'use', label: 'Destino u observaciones', value: u.use, wide: true, placeholder: 'Ej: 1º pelotón' },
    { k: 'titular', label: 'Operador titular', value: u.titular },
    { k: 'suplente', label: 'Suplente / ayudante', value: u.suplente }
  ], val => {
    const plate = etPlate(val.plate);
    if (!plate) return toast('Falta la matrícula', 'bad');
    const dup = allUnits().find(x => x.plate === plate && x.id !== id);
    if (dup) return toast(`La matrícula ${plate} ya está en ${vehName(dup.vid)}`, 'bad');
    const rec = { ...u, id: id || unitId(plate), plate, itv: val.itv, cita: val.cita, use: val.use, titular: val.titular, suplente: val.suplente, pel: val.pel || '-', ...(val.mod !== undefined ? { mod: val.mod } : {}) };
    const to = get('vehicles', val.vid) || v;
    if (to.id !== vid) stamp('vehicles', { ...v, units: (v.units || []).filter(x => x.id !== id) });
    put('vehicles', { ...to, units: [...(to.units || []).filter(x => x.id !== rec.id), rec] },
      to.id !== vid ? `${plate} pasa a ${to.name}` : `Matrícula ${plate} ${id ? 'editada' : 'añadida'} (${to.name})`);
    volver ? unidadView(to.id, rec.id) : vehicleForm(to.id);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="deleteUnit('${vid}', '${id}')">${ic('trash')} Quitar matrícula</button>` : '');
}
function deleteUnit(vid, id) {
  if (!soloFlota()) return;
  const v = get('vehicles', vid), u = (v.units || []).find(x => x.id === id);
  if (!u || !confirm(`¿Quitar la matrícula ${u.plate} de ${v.name}?`)) return;
  put('vehicles', { ...v, units: v.units.filter(x => x.id !== id) }, `Quitada la matrícula ${u.plate} de ${v.name}`);
  vehicleForm(vid);
}
function deleteVehicle(id) {
  if (!soloFlota()) return;
  const v = get('vehicles', id);
  if (!confirm(`¿Eliminar ${v.name} de la flota?`)) return;
  closeModal(); remove('vehicles', id, `Eliminado el vehículo ${v.name}`);
}

