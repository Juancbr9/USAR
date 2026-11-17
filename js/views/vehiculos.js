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
/* ---------- Cofres: dónde va cada cosa dentro del vehículo ---------- */
// Cada modelo (o módulo) puede tener cofres: la cabina, los de cada lado (de delante atrás), el techo y la trasera. De
// serie los llevan las autobombas; en los demás se ponen con «Cofres». El material dice en cuál va (campo «cofre»).
const COFRES_SERIE = { izq: 3, der: 3, cab: true, techo: true, tras: true }, CON_COFRES = ['V-AB', 'V-AB-CHASIS', 'V-ATB-M1', 'V-ATB-M2'];
const vehCofres = v => v?.cofres || (CON_COFRES.includes(v?.id) ? COFRES_SERIE : null);
// En el orden en que se revisan: cabina, lado izquierdo, techo, lado derecho y trasera
const cofresDe = v => { const c = vehCofres(v); if (!c) return []; const lado = (n, p, t) => Array.from({ length: Math.min(8, +n || 0) }, (_, i) => [p + (i + 1), `Cofre ${t} ${i + 1}`]);
  return [...(c.cab ? [['CAB', 'Cabina']] : []), ...lado(c.izq, 'I', 'izquierdo'), ...(c.techo ? [['TECHO', 'Techo']] : []), ...lado(c.der, 'D', 'derecho'), ...(c.tras ? [['TRAS', 'Trasera']] : [])]; };
const cofreNombre = (v, id) => cofresDe(v).find(c => c[0] === id)?.[1] || '';
// El dibujo: el vehículo visto desde arriba, con la cabina delante; en cada cofre, cuántas cosas lleva (en rojo si algo falta o está roto)
function cofresPlano(owner) {
  const d = duenoDe(owner), v = get('vehicles', d.veh), cs = cofresDe(v); if (!cs.length) return '';
  const mat = matDe(d).filter(matVivo), c = vehCofres(v), n = Math.max(+c.izq || 0, +c.der || 0, 1);
  const cof = (id, corto, cls = '') => { const ms = mat.filter(m => (m.cofre || '') === id), mal = ms.some(m => !matOk(m));
    return `<button class="cof ${cls} ${mal ? 'bad' : ''}" aria-label="${esc(cofreNombre(v, id))}: ${ms.length} ${ms.length === 1 ? 'cosa' : 'cosas'}${mal ? ', algo falta o está roto' : ''}" onclick="cofreVer('${owner}', '${id}')"><span>${corto}</span><b>${ms.length}</b></button>`; };
  const lado = (p, k, t) => Array.from({ length: Math.min(8, +c[k] || 0) }, (_, i) => cof(p + (i + 1), `${t} ${i + 1}`)).join('');
  const sin = mat.filter(m => !cs.some(x => x[0] === m.cofre)).length;
  return `<div class="cofres" style="--n:${n}" role="group" aria-label="Cofres del vehículo">
      ${c.cab ? cof('CAB', 'Cabina', 'cof-cab') : '<span class="cof-morro" aria-hidden="true">Delante</span>'}
      <div class="cof-lado">${lado('I', 'izq', 'Izq.')}</div>${c.techo ? cof('TECHO', 'Techo', 'cof-techo') : '<span class="cof-techo cof-nada" aria-hidden="true"></span>'}<div class="cof-lado">${lado('D', 'der', 'Der.')}</div>
      ${c.tras ? cof('TRAS', 'Trasera', 'cof-tras') : ''}
    </div>
    <p class="muted cof-pie">Toca un cofre para ver lo que lleva o añadir.${sin ? ` Sin cofre: ${sin}.` : ''} <button class="link" onclick="cofresForm('${d.veh}', '${owner}')">Cambiar los cofres</button></p>`;
}
function cofreVer(owner, id) {
  const d = duenoDe(owner), v = get('vehicles', d.veh), ms = matDe(d).filter(m => matVivo(m) && (m.cofre || '') === id);
  openModal(`${cofreNombre(v, id)} · ${duenoNombre(owner)}`, `${ms.length ? `<div class="list">${ms.map(m => matRow(owner, m)).join('')}</div>` : '<p class="muted">Este cofre está vacío.</p>'}
    <button class="btn btn-a full" style="margin-top:12px" onclick="matForm('${owner}', '', { cofre: '${id}' })">${ic('plus')} Material aquí</button>
    <button class="btn btn-g full" style="margin-top:8px" onclick="${d.unit ? `unidadView('${d.veh}', '${d.unit}')` : `vehicleView('${d.veh}')`}">${ic('back')} Volver al vehículo</button>`);
}
// Cuántos cofres tiene el modelo (vale para todas sus matrículas)
function cofresForm(vid, owner = '') {
  if (!soloFlota()) return;
  const v = get('vehicles', vid), c = vehCofres(v) || { izq: 0, der: 0 }, volver = () => { const d = owner ? duenoDe(owner) : {}; d.unit ? unidadView(vid, d.unit) : vehicleView(vid); };
  openForm(`Cofres de ${v.name}`, [
    { k: 'izq', label: 'Cofres del lado izquierdo (de 0 a 8)', type: 'number', value: c.izq || 0 },
    { k: 'der', label: 'Cofres del lado derecho (de 0 a 8)', type: 'number', value: c.der || 0 },
    { k: 'mas', label: 'Además', type: 'checks', wide: true, value: ['cab', 'techo', 'tras'].filter(k => c[k]), options: [['cab', 'Cabina'], ['techo', 'Techo'], ['tras', 'Trasera']] }
  ], val => { const n = x => Math.min(8, Math.max(0, Math.round(+x || 0)));
    put('vehicles', { ...get('vehicles', vid), cofres: { izq: n(val.izq), der: n(val.der), cab: val.mas.includes('cab'), techo: val.mas.includes('techo'), tras: val.mas.includes('tras') } }, `Cofres de ${v.name} cambiados`); volver(); },
  `<p class="muted span2">Es el mismo reparto para todas las matrículas de este modelo. Si quitas un cofre, lo que llevaba queda «sin cofre»; no se borra nada.</p>`);
}

/* ---------- Incidencias: lo que le pasa a un vehículo, hasta que se arregla ---------- */
// Registros «issues»: { id, veh, unit, text, item (el punto del checklist que la abrió), st, resp, nota, photo, by, ts, cierre }
const INC_ESTADOS = { abierta: ['Abierta', 'bad'], reparacion: ['En reparación', 'warn'], resuelta: ['Resuelta', 'ok'] }, INC_ORDEN = Object.keys(INC_ESTADOS);
const incidencias = (vid, unit = '') => list('issues').filter(i => i.veh === vid && (i.unit || '') === unit).sort((a, b) => INC_ORDEN.indexOf(a.st) - INC_ORDEN.indexOf(b.st) || (b.ts || 0) - (a.ts || 0));
const incAbiertas = (vid, unit = '') => incidencias(vid, unit).filter(i => i.st !== 'resuelta');
// Lo que tiene pendiente una matrícula: sus incidencias sin resolver (o, en checklists de antes de haber incidencias, sus fallos)
const unitFallos = (v, u) => { const ab = incAbiertas(v.id, u.id), c = lastVcheck(u.id); return ab.length ? ab.map(i => i.text) : c?.fails.length && !c.inc ? c.fails.map(f => f.split(' (')[0]) : []; };
// Tras un checklist: cada fallo abre su incidencia (si no estaba abierta) y cada punto que vuelve a estar bien cierra la suya
function incDeChecklist(vid, unit, fails, nota) {
  const ab = incAbiertas(vid, unit), quien = prefs.activeOperator;
  fails.filter(f => !ab.some(i => i.item === f)).forEach(f => stamp('issues', { id: uid('IN'), veh: vid, unit, item: f, text: f.split(' (')[0], st: 'abierta', resp: '', nota, by: quien, ts: Date.now(), origen: 'checklist' }));
  ab.filter(i => i.item && !fails.includes(i.item)).forEach(i => stamp('issues', { ...i, st: 'resuelta', cierre: { by: quien, ts: Date.now(), nota: 'En el checklist ya estaba bien' } }));
}
function incRow(i) {
  const [txt, cls] = INC_ESTADOS[i.st] || INC_ESTADOS.abierta;
  return `<div class="item need inc ${i.st === 'resuelta' ? 'need-ok' : ''}"><button class="link-row grow" onclick="incForm(${jsq(i.veh)}, ${jsq(i.unit || '')}, ${jsq(i.id)})">${i.photo ? `<div class="who-row"><img class="thumb mat-foto" data-img="inc:${esc(i.id)}" alt="">` : ''}<div><b>${esc(i.text)}</b>
    <small>${esc([i.resp && get('operators', i.resp) ? 'La lleva ' + opName(i.resp) : '', i.nota, `${i.by || ''} · ${fmtWhen(i.ts)}`, i.cierre ? `Resuelta por ${i.cierre.by || ''}, ${fmtWhen(i.cierre.ts)}` : ''].filter(Boolean).join(' · '))}</small></div>${i.photo ? '</div>' : ''}</button>
    <button class="tag ${cls} need-estado" aria-label="${esc(i.text)}: ${txt}. Tocar para pasar al siguiente estado" onclick="incAvanza(${jsq(i.id)})">${txt}</button></div>`;
}
function incBloque(vid, unit = '') {
  const todas = incidencias(vid, unit), ab = todas.filter(i => i.st !== 'resuelta'), hechas = todas.filter(i => i.st === 'resuelta');
  return `<div class="veh-inc"><div class="between wrap-row sec-head"><h3>Incidencias${ab.length ? ` (${ab.length})` : ''}</h3>
      ${me() ? `<button class="btn btn-g btn-sm" onclick="incForm('${vid}', '${unit}')">${ic('plus')} Incidencia</button>` : ''}</div>
    ${ab.length ? `<div class="list">${ab.map(incRow).join('')}</div>` : '<p class="muted">Sin incidencias abiertas. Los fallos de un checklist se apuntan aquí solos; también puedes añadir una a mano (un golpe, una avería…).</p>'}
    ${hechas.length ? `<details class="need-hechas"><summary class="link">Resueltas (${hechas.length})</summary><div class="list" style="margin-top:8px">${hechas.slice(0, 20).map(incRow).join('')}</div></details>` : ''}</div>`;
}
const incVuelve = (vid, unit) => setTimeout(() => unit ? unidadView(vid, unit) : vehicleView(vid), 0);
function incForm(vid, unit = '', id = '') {
  if (!me()) return;
  const i = id ? get('issues', id) : { veh: vid, unit, st: 'abierta' }; if (!i) return;
  openForm(id ? 'Incidencia' : 'Nueva incidencia', [
    { k: 'text', label: 'Qué le pasa', value: i.text || '', required: true, wide: true, placeholder: 'Ej.: Golpe en la puerta del cofre derecho' },
    { k: 'st', label: 'Estado', value: i.st || 'abierta', options: Object.entries(INC_ESTADOS).map(([k, [l]]) => [k, l]) },
    { k: 'resp', label: 'Quién se encarga', value: i.resp || '', options: [['', 'Nadie todavía'], ...operators().sort(byName).map(o => [o.id, conEmpleo(o)])] },
    { k: 'nota', label: 'Notas (qué se ha hecho, a qué taller ha ido…)', type: 'textarea', rows: 2, value: i.nota || '', wide: true },
    { k: 'photo', label: i.photo ? 'Cambiar la foto' : 'Foto', type: 'photo', value: '', wide: true }
  ], async val => {
    const iid = i.id || uid('IN'), cerrar = val.st === 'resuelta' && i.st !== 'resuelta';
    if (val.photo) await Img.put('inc:' + iid, val.photo);
    put('issues', { ...i, id: iid, veh: vid, unit, text: val.text.trim(), st: val.st, resp: val.resp || '', nota: val.nota || '', photo: val.photo ? true : i.photo || false, by: i.by || prefs.activeOperator, ts: i.ts || Date.now(),
      cierre: val.st === 'resuelta' ? (cerrar ? { by: prefs.activeOperator, ts: Date.now() } : i.cierre) : null },
      `Incidencia de ${duenoNombre('veh:' + vid + (unit ? '#' + unit : ''))}: ${val.text} (${INC_ESTADOS[val.st][0].toLowerCase()})`);
    incVuelve(vid, unit);
  }, id ? `${i.photo ? `<img class="photo span2" data-img="inc:${id}" alt="Foto de la incidencia">` : ''}
    <button type="button" class="btn btn-bad span2" onclick="if (confirm('¿Borrar esta incidencia?')) { remove('issues', '${id}', 'Incidencia borrada'); closeModal(); incVuelve('${vid}', '${unit}'); }">${ic('trash')} Borrar</button>` : '');
}
// Un toque en la etiqueta la pasa al siguiente estado (abierta → en reparación → resuelta)
function incAvanza(id) {
  const i = get('issues', id); if (!i || !me()) return; const n = INC_ORDEN.indexOf(i.st); if (n < 0 || n >= INC_ORDEN.length - 1) return; const st = INC_ORDEN[n + 1];
  put('issues', { ...i, st, cierre: st === 'resuelta' ? { by: prefs.activeOperator, ts: Date.now() } : null }, `Incidencia «${i.text}» pasa a «${INC_ESTADOS[st][0].toLowerCase()}»`);
  incVuelve(i.veh, i.unit || '');
}

/* ---------- Mantenimiento de cada matrícula: cada tantos kilómetros o cada tantos meses ---------- */
// Se guarda en la matrícula: mant = [{ id, name, km (cada cuántos), meses (cada cuántos), ult (fecha de la última vez), ultKm }]
const MANT_SERIE = [['Aceite y filtros', 15000, 12], ['Neumáticos', 0, 6], ['Revisión general', 0, 12], ['Batería', 0, 24]];
const unitKm = u => Math.max(0, ...list('vchecks').filter(c => c.unit === u.id && +c.km).map(c => +c.km));   // los últimos kilómetros apuntados en un checklist
const masMeses = (iso, n) => { const d = new Date(iso + 'T12:00'); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); };
// Lo que falta: { km, dias } (null lo que no aplica o no se puede saber), y si toca ya («bad») o pronto («warn»)
function mantFalta(u, m) {
  const act = unitKm(u), km = +m.km && act && m.ultKm !== '' && m.ultKm != null ? +m.ultKm + +m.km - act : null, dias = +m.meses && m.ult ? daysTo(masMeses(m.ult, +m.meses)) : null;
  return { km, dias, cls: (km != null && km <= 0) || (dias != null && dias <= 0) ? 'bad' : (km != null && km <= 1000) || (dias != null && dias <= 30) ? 'warn' : '', sin: km == null && dias == null };
}
const mantTxt = f => f.sin ? 'Apunta la última vez' : f.cls === 'bad' ? 'Toca' : [f.km != null ? `faltan ${f.km.toLocaleString('es-ES')} km` : '', f.dias != null ? `en ${f.dias} ${f.dias === 1 ? 'día' : 'días'}` : ''].filter(Boolean).join(' · ');
const mantCada = m => [+m.km ? `cada ${(+m.km).toLocaleString('es-ES')} km` : '', +m.meses ? `cada ${m.meses} ${+m.meses === 1 ? 'mes' : 'meses'}` : ''].filter(Boolean).join(' o ');
const mantPeor = u => (u.mant || []).map(m => mantFalta(u, m).cls).reduce((a, c) => c === 'bad' || a === 'bad' ? 'bad' : c || a, '');
function mantBloque(vid, u) {
  const ms = u.mant || [], km = unitKm(u);
  return `<div class="veh-mant"><div class="between wrap-row sec-head"><h3>Mantenimiento</h3>${me() ? `<button class="btn btn-g btn-sm" onclick="mantForm('${vid}', '${u.id}')">${ic('plus')} Mantenimiento</button>` : ''}</div>
    ${ms.length ? `<div class="log-rows">${ms.map(m => { const f = mantFalta(u, m); return `<button class="log-row txt ${f.cls}" onclick="mantForm('${vid}', '${u.id}', '${m.id}')"><span>${esc(m.name)}<small> ${esc([mantCada(m), m.ult ? 'la última, ' + fmtDate(m.ult) + (m.ultKm ? ` con ${(+m.ultKm).toLocaleString('es-ES')} km` : '') : ''].filter(Boolean).join(' · '))}</small></span><b>${esc(mantTxt(f))}</b></button>`; }).join('')}</div>
      <p class="muted" style="margin-top:8px">${km ? `Kilómetros actuales: ${km.toLocaleString('es-ES')} (del último checklist).` : 'Los kilómetros se toman del checklist: apúntalos al hacerlo.'}</p>`
      : `<p class="muted">Apunta lo que hay que hacerle cada cierto tiempo o cada tantos kilómetros (aceite, neumáticos, revisión…), y la app avisa cuando toque.</p>
        ${me() ? `<button class="btn btn-g" style="margin-top:8px" onclick="mantSerie('${vid}', '${u.id}')">${ic('list')} Empezar con lo habitual</button>` : ''}`}</div>`;
}
const mantGuarda = (vid, unit, mant, msg) => { const v = get('vehicles', vid); put('vehicles', { ...v, units: v.units.map(x => x.id === unit ? { ...x, mant } : x) }, msg); setTimeout(() => unidadView(vid, unit), 0); };
function mantSerie(vid, unit) {
  const u = get('vehicles', vid).units.find(x => x.id === unit);
  mantGuarda(vid, unit, MANT_SERIE.map(([name, km, meses]) => ({ id: uid('MT'), name, km, meses, ult: '', ultKm: '' })), `Mantenimiento de ${u.plate}: lista habitual añadida`);
}
function mantForm(vid, unit, id = '') {
  if (!me()) return;
  const v = get('vehicles', vid), u = v.units.find(x => x.id === unit), m = (u.mant || []).find(x => x.id === id) || { km: '', meses: 12 }, km = unitKm(u);
  const guarda = (rec, msg) => mantGuarda(vid, unit, [...(u.mant || []).filter(x => x.id !== rec.id), rec].sort(byName), msg);
  openForm(id ? m.name : `Mantenimiento · ${u.plate}`, [
    { k: 'name', label: 'Qué hay que hacer', value: m.name || '', required: true, wide: true, placeholder: 'Ej.: Aceite y filtros' },
    { k: 'km', label: 'Cada cuántos kilómetros (vacío si no va por km)', type: 'number', value: m.km || '' },
    { k: 'meses', label: 'Cada cuántos meses (vacío si no va por tiempo)', type: 'number', value: m.meses || '' },
    { k: 'ult', label: 'Última vez que se hizo', type: 'date', value: m.ult || '' },
    { k: 'ultKm', label: 'Kilómetros que tenía entonces', type: 'number', value: m.ultKm ?? '', placeholder: km ? `Ahora tiene ${km}` : '' }
  ], val => {
    if (!+val.km && !+val.meses) { toast('Pon cada cuántos kilómetros o cada cuántos meses', 'bad'); return mantForm(vid, unit, id); }
    guarda({ id: m.id || uid('MT'), name: val.name.trim(), km: Math.round(+val.km) || 0, meses: Math.round(+val.meses) || 0, ult: val.ult || '', ultKm: val.ultKm === '' ? '' : Math.round(+val.ultKm) || 0 }, `Mantenimiento de ${u.plate}: ${val.name}`);
  }, id ? `<button type="button" class="btn btn-g span2" onclick="closeModal(); mantHecho('${vid}', '${unit}', '${id}')">${ic('checkc')} Hecho hoy${km ? ` (con ${km.toLocaleString('es-ES')} km)` : ''}</button>
    <button type="button" class="btn btn-bad span2" onclick="if (confirm('¿Quitar este mantenimiento?')) { closeModal(); mantGuarda('${vid}', '${unit}', get('vehicles', '${vid}').units.find(x => x.id === '${unit}').mant.filter(x => x.id !== '${id}'), 'Mantenimiento quitado'); }">${ic('trash')} Quitar</button>` : '');
}
function mantHecho(vid, unit, id) {
  const u = get('vehicles', vid).units.find(x => x.id === unit), km = unitKm(u);
  mantGuarda(vid, unit, u.mant.map(m => m.id === id ? { ...m, ult: todayISO(), ultKm: km || m.ultKm } : m), `Mantenimiento de ${u.plate}: ${u.mant.find(m => m.id === id).name}, hecho`);
  toast('Apuntado: hecho hoy');
}

// Etiquetas de estado de una matrícula: ITV, fallos del último checklist, material que falta o está roto y si toca checklist
function unitTags(v, u) {
  const mal = matDe({ veh: v.id, unit: u.id }).filter(m => matVivo(m) && !matOk(m)).length, f = revFalta(`veh:${v.id}#${u.id}`), n = u.itv ? daysTo(u.itv) : null;
  return [n != null && n < 0 ? '<span class="tag bad">ITV caducada</span>' : n != null && n <= 30 ? '<span class="tag warn">ITV pronto</span>' : '',
    (k => k ? `<span class="tag bad">${k === 1 ? '1 incidencia' : k + ' incidencias'}</span>` : '')(unitFallos(v, u).length),
    (m => m ? `<span class="tag ${m}">Mantenimiento</span>` : '')(mantPeor(u)),
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
    ${incBloque(vid, u.id)}
    <div class="veh-mat">${cofresPlano(owner)}${matBloque(owner, 'Apunta lo que lleva esta matrícula: mangotes, mangueras, puntas de lanza, herramientas, calzos, cadenas…')}</div>
    ${mantBloque(vid, u)}
    ${(o => o ? `<h4 class="sec-title" style="margin:16px 0 8px">También va en este vehículo</h4><div class="list veh-otros">${o}</div>` : '')(vehOtros(vid))}
    ${puedeFlota() ? `<div class="grid g2" style="grid-template-columns:1fr 1fr; margin-top:12px"><button class="btn btn-g" onclick="unitForm('${vid}', '${u.id}', true)">${ic('pencil')} Editar matrícula</button>
      <button class="btn btn-g" onclick="vehicleForm('${vid}')">${ic('truck')} Editar modelo</button>
      ${cofresDe(v).length ? '' : `<button class="btn btn-g span2" onclick="cofresForm('${vid}', '${owner}')">${ic('grid')} Poner cofres a este modelo</button>`}</div>` : ''}`);
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
    ${!units.length && !mod ? incBloque(id, '') : ''}
    <div class="veh-mat">${cofresPlano('veh:' + id)}${matBloque('veh:' + id, mod ? 'Apunta lo que lleva este módulo o contenedor.' : 'Apunta lo que lleva: mangotes, mangueras, puntas de lanza, herramientas, calzos, cadenas…')}</div>
    ${(o => o ? `<h4 class="sec-title" style="margin:16px 0 8px">También va en este ${mod ? 'módulo' : 'vehículo'}</h4><div class="list veh-otros">${o}</div>` : '')(vehOtros(id))}
    ${puedeFlota() ? `<button class="btn btn-g full" style="margin-top:12px" onclick="${mod ? `moduloForm('${id}')` : `vehicleForm('${id}')`}">${ic('pencil')} ${mod ? 'Editar' : 'Editar modelo y matrículas'}</button>
      ${cofresDe(v).length ? '' : `<button class="btn btn-g full" style="margin-top:8px" onclick="cofresForm('${id}')">${ic('grid')} Poner cofres</button>`}` : ''}`);
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
        ${kpi('Con incidencias', flota.filter(x => x.fallo).length, flota.some(x => x.fallo) ? 'bad' : '')}${kpi('ITV caducada', flota.filter(x => x.itv).length, flota.some(x => x.itv) ? 'bad' : '')}${kpi('Toca checklist', toca)}</div>` : ''}
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

