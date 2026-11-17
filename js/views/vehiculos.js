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
const vehLabel = v => vehName(v.id) + (v.id === RENAULT && v.mod ? ` (${RENAULT_MOD[v.mod]?.[0].replace(/^./, c => c.toLowerCase())})` : '') + (v.plate ? ' · ' + v.plate : '');

// Flota: los modelos de vehículo de la unidad
// Dibujo o foto de un modelo de vehículo (la autobomba Renault, con el módulo que se elija)
const vehArtSrc = (id, mod = '') => `img/veh/${id === RENAULT ? RENAULT_MOD[mod]?.[1] || RENAULT_MOD[''][1] : id.toLowerCase()}.webp`;
const vehArt = (v, cls = '', mod = '') => v?.photo && !(v.id === RENAULT && mod) ? `<img class="veh-art ${cls}" data-img="veh:${v.id}" alt="">`
  : VEH_ART.includes(v?.id) ? `<img class="veh-art ${cls}" src="${vehArtSrc(v.id, mod)}" alt="" loading="lazy">` : `<span class="veh-art none ${cls}">${ic('truck', 'i-lg')}</span>`;
// La Renault con cada módulo, para verla: se toca un módulo y cambia el dibujo
const modPreview = (mod = '', title = 'Módulo detrás') => `<div class="lbl wide veh-mods"><span class="veh-mods-t">${title}</span><img class="veh-art lg" src="${vehArtSrc(RENAULT, mod)}" alt="">
  <div class="seg-row" role="group" aria-label="Módulo detrás">${Object.entries(RENAULT_MOD).map(([k, [l]]) => `<button type="button" class="${k === mod ? 'on' : ''}" data-mod="${k}"
    onclick="const w = this.closest('.veh-mods'); w.querySelector('img').src = ${jsq(vehArtSrc(RENAULT, k))}; w.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === this)); const s = $('modalForm')?.elements.mod; if (s) s.value = '${k}'">${esc(l.replace(' (sin módulo)', ''))}</button>`).join('')}</div></div>`;
// Ficha de un modelo para todo el equipo: su dibujo (la Renault, con cada módulo), sus matrículas con la ITV y la última
// revista de salida de cada una. Quien gestiona la flota, además, la edita.
// Lo que va en un vehículo sin ser suyo: material de un apartado o de otro vehículo, y equipos o cajas de USAR
function vehOtros(id) {
  const usar = (x, kind) => `<div class="item"><button class="link-row grow" onclick="${kind === 'box' ? 'boxDetail' : 'gearDetail'}('${x.id}')"><div class="who-row"><span class="cons-ico">${ic(kind === 'box' ? 'case' : 'hardhat')}</span><div><b>${esc(kind === 'box' ? 'Caja ' + x.code : x.name)}${kind === 'box' ? '' : qtyText(x)}</b><small>${esc(['USAR', kind === 'box' ? x.name : ''].filter(Boolean).join(' · '))}</small></div></div></button>
    <button class="btn btn-g btn-sm" onclick="moverA('${kind}', '${x.id}')">${ic('move', 'i-sm')} Mover</button></div>`;
  return [...matEn(0, id).map(matFila), ...list('boxes').filter(b => b.vehicle === id).map(b => usar(b, 'box')), ...list('gear').filter(g => g.vehicle === id && !get('boxes', g.box)).sort(byName).map(g => usar(g, 'gear'))].join('');
}
function vehicleView(id) {
  const v = get('vehicles', id); if (!v) return;
  const units = unitsOf_(v);
  const unitRow = u => { const c = lastVcheck(u.id); return `
    <div class="item unit-row"><div class="grow"><b class="nw">${esc(u.plate)}</b>${u.use || u.titular ? `<small>${esc([u.use, u.titular].filter(Boolean).join(' · '))}</small>` : ''}
      ${c ? `<button class="link vc-line ${c.fails.length ? 'bad' : 'ok'}" onclick="vcheckHistory('${id}', '${u.id}')">${esc(checkLine(c))}</button>` : '<small class="muted">Sin revista de salida</small>'}
      ${(l => l ? `<button class="link vc-line ${ITV_RES[l.res]?.[1] === 'ok' ? 'ok' : 'bad'}" onclick="itvHistory('${id}', '${u.id}')">ITV ${fmtDate(l.date)}: ${esc(ITV_RES[l.res]?.[0].split(' (')[0] || l.res)}${l.defects ? ' · ' + esc(l.defects) : ''}</button>` : '')(itvLast(u))}</div>
      <div class="unit-acts">${u.itv && daysTo(u.itv) <= 0 ? `<button class="btn btn-a btn-sm" onclick="itvForm('${id}', '${u.id}')">${ic('alert', 'i-sm')} ¿Pasó la ITV?</button>` : `<button class="link" aria-label="ITV de ${esc(u.plate)}" onclick="itvHistory('${id}', '${u.id}')">${itvTag(u) || '<span class="tag neutral">ITV</span>'}</button>`}<button class="btn btn-g btn-sm" onclick="vcheckForm('${id}', '${u.id}')">${ic('clipboard', 'i-sm')} Revista</button></div></div>`; };
  openModal(v.name, `
    ${id === RENAULT ? `<p class="muted" style="margin-bottom:10px">Viene vacía detrás. Elige un módulo para verla con él.</p>
      <div class="form">${modPreview('', 'Módulo')}</div>` : `<div class="veh-hero">${vehArt(v, 'lg')}</div>`}
    ${v.notes || v.seats ? `<p class="muted" style="margin-top:8px">${esc([v.seats ? v.seats + ' plazas' : '', v.notes].filter(Boolean).join(' · '))}</p>` : ''}
    <h4 class="sec-title" style="margin-top:14px">Matrículas (${units.length})</h4>
    ${units.length ? `<div class="list">${units.map(unitRow).join('')}</div>`
      : `<button class="btn btn-g full" onclick="vcheckForm('${id}')">${ic('clipboard')} Revista de salida</button>`}
    <div class="veh-mat">${matBloque('veh:' + id, 'Apunta lo que lleva: mangotes, mangueras, puntas de lanza, herramientas, calzos, cadenas…')}</div>
    ${(o => o ? `<h4 class="sec-title" style="margin:16px 0 8px">También va en este vehículo</h4><div class="list veh-otros">${o}</div>` : '')(vehOtros(id))}
    ${puedeFlota() ? `<button class="btn btn-g full" style="margin-top:12px" onclick="vehicleForm('${id}')">${ic('pencil')} Editar modelo y matrículas</button>` : ''}`);
}

/* ---------- Revista de salida de cada vehículo (cualquiera la hace; queda el historial por matrícula) ---------- */
const VCHECK = ['Niveles (aceite, refrigerante, AdBlue)', 'Luces y rotativos', 'Neumáticos', 'Frenos', 'Limpiaparabrisas',
  'Documentación (permiso de circulación, ITV, seguro)', 'Extintor, botiquín y triángulos', 'Emisora y transmisiones', 'Carrocería y limpieza'];
const FUEL = ['Lleno', '3/4', '1/2', '1/4', 'Reserva'];
const checksOf = (vid, unit) => list('vchecks').filter(c => c.vid === vid && (c.unit || '') === (unit || '')).sort((a, b) => b.date - a.date);
const lastVcheck = unit => list('vchecks').filter(c => c.unit === unit).sort((a, b) => b.date - a.date)[0];
const checkLine = c => `Revista ${fmtWhen(c.date)} · ${c.fails.length ? `${c.fails.length === 1 ? 'Fallo' : c.fails.length + ' fallos'}: ${c.fails.map(f => f.split(' (')[0].toLowerCase()).join(', ')}` : 'todo bien'}${c.km ? ` · ${(+c.km).toLocaleString('es-ES')} km` : ''}`;
function vcheckForm(vid, unit = '') {
  const v = get('vehicles', vid), u = (v.units || []).find(x => x.id === unit), prev = checksOf(vid, unit)[0];
  openForm(`Revista de salida · ${u ? u.plate : v.name}`, [
    { k: 'ok', label: 'Marca lo que está bien (lo que quede sin marcar es un fallo)', type: 'checks', options: VCHECK.map(x => [x, x]), value: VCHECK, wide: true },
    { k: 'km', label: 'Kilómetros', type: 'number', value: '', placeholder: prev?.km ? `La última: ${prev.km}` : 'Ej: 45210' },
    { k: 'fuel', label: 'Combustible', value: 'Lleno', options: FUEL.map(x => [x, x]) },
    { k: 'notes', label: 'Observaciones', type: 'textarea', rows: 2, value: '', wide: true, placeholder: 'Ej: El rotativo trasero no funciona' }
  ], val => {
    const fails = VCHECK.filter(x => !val.ok.includes(x)), km = Math.round(+val.km) || '';
    if (km && prev?.km && km < +prev.km && !confirm(`Pones ${km} km y la revista anterior tenía ${prev.km}. ¿Guardar igualmente?`)) return;
    put('vchecks', { id: uid('VC'), vid, unit, plate: u?.plate || '', date: Date.now(), by: prefs.activeOperator, km, fuel: val.fuel, fails, notes: val.notes },
      `Revista de salida de ${u ? u.plate : v.name}: ${fails.length ? fails.length + ' fallos' : 'todo bien'}`);
    toast(fails.length ? `Guardada con ${fails.length} ${fails.length === 1 ? 'fallo' : 'fallos'}: sale en Inicio` : 'Revista guardada: todo bien', fails.length ? 'bad' : 'ok');
    vehicleView(vid);
  });
}
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

function vcheckHistory(vid, unit = '') {
  const v = get('vehicles', vid), u = (v.units || []).find(x => x.id === unit), cs = checksOf(vid, unit);
  openModal(`Revistas · ${u ? u.plate : v.name}`, `<div class="list">${cs.map(c => `
    <div class="item"><div class="grow"><b>${fmtWhen(c.date)} · ${esc(c.by || '')}</b><small>${esc([c.km ? (+c.km).toLocaleString('es-ES') + ' km' : '', c.fuel ? 'Combustible: ' + c.fuel : ''].filter(Boolean).join(' · '))}</small>
      ${c.fails.length ? `<small class="bad-text">Fallos: ${esc(c.fails.join(', '))}</small>` : ''}${c.notes ? `<small>${esc(c.notes)}</small>` : ''}</div>
      <span class="tag ${c.fails.length ? 'bad' : 'ok'}">${c.fails.length ? c.fails.length + ' fallos' : 'Bien'}</span></div>`).join('') || '<p class="muted">Sin revistas.</p>'}</div>
    <button class="btn btn-a full" style="margin-top:12px" onclick="vcheckForm('${vid}', '${unit}')">${ic('clipboard')} Nueva revista</button>`);
}
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
  if (id === RENAULT) $('modalForm').insertAdjacentHTML('afterbegin', modPreview('', 'Verla con un módulo'));
}
// Matrículas de un modelo (cada vehículo real), ordenadas
const unitsOf_ = v => [...(v?.units || [])].sort((a, b) => a.plate.localeCompare(b.plate, 'es', { numeric: true }));
const allUnits = () => vehicles().flatMap(v => (v.units || []).map(u => ({ ...u, vid: v.id })));
const itvTag = u => { if (!u.itv) return ''; const n = daysTo(u.itv); return `<span class="tag ${n < 0 ? 'bad' : n <= 30 ? 'warn' : 'neutral'}">ITV ${n < 0 ? 'caducada' : fmtDate(u.itv)}</span>`; };
// Una matrícula: datos de la hoja y la pizarra (ITV, cita, destino, titular y suplente). Cambiar el modelo la pasa a otro
// (ATB M1 o M2) y con él cambia el dibujo.
function unitForm(vid, id) {
  if (!soloFlota()) return;
  const v = get('vehicles', vid), u = (v.units || []).find(x => x.id === id) || {};
  openForm(id ? u.plate : `Nueva matrícula · ${v.name}`, [
    { k: 'plate', label: 'Matrícula', value: u.plate || 'ET-', required: true, placeholder: 'Ej: ET-120111 o RQ-112426' },
    { k: 'vid', label: 'Modelo', value: vid, options: vehicles().map(x => [x.id, x.name]), required: true },
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
    const rec = { ...u, id: id || unitId(plate), plate, itv: val.itv, cita: val.cita, use: val.use, titular: val.titular, suplente: val.suplente };
    const to = get('vehicles', val.vid) || v;
    if (to.id !== vid) stamp('vehicles', { ...v, units: (v.units || []).filter(x => x.id !== id) });
    put('vehicles', { ...to, units: [...(to.units || []).filter(x => x.id !== rec.id), rec] },
      to.id !== vid ? `${plate} pasa a ${to.name}` : `Matrícula ${plate} ${id ? 'editada' : 'añadida'} (${to.name})`);
    vehicleForm(to.id);
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

