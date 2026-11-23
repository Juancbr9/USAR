'use strict';
// USAR 242 · ASR (evaluación, búsqueda y rescate): la herramienta de campo del equipo USAR, según las guías INSARAG 2026–2030.
//   · Sitios: cada edificio o sitio del sector, con su triaje (categoría A, B, C o D en dos preguntas), ordenados solos por
//     prioridad; su estado, los niveles ASR terminados y las víctimas. Son registros «asr», compartidos con el equipo.
//   · Marcaje: de cada sitio, el dibujo de lo que hay que pintar ahora (caja, V de víctimas o rombo), y un generador libre.
//   · Informes: el triaje y el informe de un worksite, y el parte del sector, para mandar por WhatsApp.
//   · Niveles: los cinco niveles ASR (los mismos de la Guía de campo).
// Lo pidió el usuario: son solo los sitios del ASR; no vuelven las misiones, los ejercicios ni el registro de víctimas.

const ASR_VIC = [['viva', 'Hay alguien vivo', 'Se le oye, se le ve o lo confirma la búsqueda'], ['posible', 'Puede haber alguien vivo', 'Falta gente o era hora de estar dentro, pero no está confirmado'],
  ['fallecidos', 'Solo fallecidos', 'Seguro que no queda nadie vivo'], ['nadie', 'No hay nadie', 'Comprobado: registrado entero o con pruebas claras']];
const ASR_HUECOS = ['Grandes (se puede gatear)', 'Pequeños (solo tumbado)', 'No se sabe'];
// Qué significa cada resultado, qué se hace después y qué marca se pinta («caja» de worksite o rombo de marcaje rápido)
const ASR_RES = {
  A: { t: 'Categoría A', d: 'Víctimas vivas confirmadas y rescate en menos de 12 horas. Máxima prioridad.', cls: 'bad', marca: 'caja',
    ahora: ['Informar ya al mando o a quien coordine el sector.', 'Marcar el worksite: caja con el ID, el equipo, «ASR 2» y la fecha, y la A debajo.',
      'Rescate rápido (ASR 3): si es nuestra misión o nos lo autorizan, se empieza; si no, queda marcado y se sigue con el sector.', 'Si nos vamos del sitio: una V donde esté cada víctima, con L y el número de vivas.'] },
  B: { t: 'Categoría B', d: 'Víctimas vivas confirmadas, pero el rescate pasará de 12 horas. Prioridad alta, detrás de las A.', cls: 'warn', marca: 'caja',
    ahora: ['Informar ya al mando o a quien coordine el sector.', 'Marcar el worksite: caja con el ID, el equipo, «ASR 2» y la fecha, y la B debajo.',
      'Hará falta trabajo a fondo (ASR 4): equipo medio o pesado, o nosotros con relevos y apoyo.', 'Si nos vamos del sitio: una V donde esté cada víctima, con L y el número de vivas.'] },
  C: { t: 'Categoría C', d: 'Posibles víctimas vivas, sin confirmar. Se trabaja después de todos los sitios con vivas confirmadas.', cls: 'info', marca: 'caja',
    ahora: ['Marcar el worksite: caja con el ID, el equipo, «ASR 2» y la fecha, y la C debajo.', 'Apuntar quién falta y quién lo dice.',
      'Intentar confirmarlo: llamada y escucha, perro o búsqueda técnica. Si se confirma, pasa a A o B.'] },
  D: { t: 'Categoría D', d: 'Solo fallecidos. No es prioridad de rescate.', cls: 'neutral', marca: 'D',
    ahora: ['Se le da ID para que conste y no se mande a nadie a rescatar allí.', 'Si la autoridad usa el marcaje rápido: rombo con una D, el equipo y la fecha.',
      'La recuperación (ASR 5) la decide la autoridad local.'] },
  N: { t: 'No es worksite', d: 'Comprobado que no hay nadie: ni ID ni caja.', cls: 'ok', marca: 'C',
    ahora: ['Si la autoridad usa el marcaje rápido: rombo con una C (despejado), el equipo y la fecha.', 'Solo vale si se ha podido registrar entero o hay pruebas claras de que no queda nadie.',
      'Apuntarlo en el croquis del sector como recorrido.'] }
};

/* ---------- Triaje: el borrador que se está rellenando (se queda en el móvil hasta guardarlo como sitio) ---------- */
const asrD = () => prefs.asr || (prefs.asr = { team: teamCode() });
const asrSave = () => writeJSON(KEY.prefs, prefs);
// La categoría sale solo de lo que se sabe de las víctimas: '' si falta algo por contestar
function asrCat(d = asrD()) {
  return d.vic === 'viva' ? (d.h12 === 'si' ? 'A' : d.h12 === 'no' ? 'B' : '') : d.vic === 'posible' ? 'C' : d.vic === 'fallecidos' ? 'D' : d.vic === 'nadie' ? 'N' : '';
}
function asrSet(k, v) { const d = asrD(); d[k] = d[k] === v ? '' : v; if (k === 'vic') d.h12 = ''; asrSave(); asrPinta(); }
function asrOp(k) { const d = asrD(); d.ops = (d.ops || []).includes(k) ? d.ops.filter(x => x !== k) : [...(d.ops || []), k]; asrSave(); asrPinta(); }
// Lo que se escribe en los datos del sitio: se guarda y se repinta solo el resultado (para no perder el cursor)
function asrTxt(el) { asrD()[el.name] = el.value; asrSave(); const o = $('asrOut'); if (o) o.innerHTML = asrOutHtml(); }
function asrPinta() { const t = $('asrTool'); if (t) t.outerHTML = asrToolHtml(); }
function asrGps() {
  if (!navigator.geolocation) return toast('Este móvil no da la posición', 'bad');
  navigator.geolocation.getCurrentPosition(p => { asrD().gps = p.coords.latitude.toFixed(5) + ', ' + p.coords.longitude.toFixed(5); asrSave(); asrPinta(); },
    () => toast('No se ha podido coger la posición', 'bad'), { enableHighAccuracy: true, timeout: 10000 });
}
// El ID siguiente a uno dado (A-1 → A-2, ESP01-0056 → ESP01-0057); '' si no acaba en número
const asrSigId = id => { const sig = (id || '').replace(/(\d+)(\D*)$/, (m, n, r) => String(+n + 1).padStart(n.length, '0') + r); return sig !== id ? sig : ''; };
const asrFila = (k, v) => v ? [`${k}: ${v}`] : [];
const asrN = v => v === '' || v == null ? '' : String(v);
const asrFirma = d => `${d.team || teamCode()} · ${new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${prefs.activeOperator || ''}`;
// Las líneas comunes del triaje y del informe: lugar, edificio, colapso, lo que hace falta, riesgos y notas
const asrDatosTxt = d => [...asrFila('Lugar', [d.sector ? 'sector ' + d.sector : '', d.lugar, d.gps ? 'GPS ' + d.gps : ''].filter(Boolean).join(' · ')),
  ...asrFila('Edificio', [d.uso, d.cons, asrN(d.plantas) ? d.plantas + ' plantas' : '', asrN(d.sot) && +d.sot ? d.sot + ' sótanos' : ''].filter(Boolean).join(', ')),
  ...asrFila('Colapso', [d.colapso, d.hueco ? 'huecos ' + d.hueco.toLowerCase() : ''].filter(Boolean).join(' · '))];
const asrFinTxt = d => [...asrFila('Hace falta', WS_OPS.filter(([k]) => (d.ops || []).includes(k)).map(([, l]) => l.toLowerCase()).join(', ')), ...asrFila('Riesgos', d.riesgos), ...asrFila('Notas', d.notas)];
// El triaje en texto, con los campos de la hoja de triaje de INSARAG, para mandarlo
function asrTexto(d = asrD()) {
  const c = asrCat(d), r = ASR_RES[c];
  return [...waHead('🏚️', `${UNIDAD} · TRIAJE DE WORKSITE (ASR 2)`, [d.id ? 'Worksite ' + d.id : '', r ? r.t : ''].filter(Boolean).join(' · ')),
    ...(r ? [r.d] : []), ...asrDatosTxt(d),
    ...asrFila('Víctimas', [asrN(d.vivas) ? `vivas confirmadas ${waB(d.vivas)}` : '', asrN(d.desap) ? `desaparecidos ${waB(d.desap)}` : '', asrN(d.fall) ? `fallecidos ${waB(d.fall)}` : '',
      d.vic === 'viva' && d.h12 ? `rescate en menos de 12 h: ${d.h12 === 'si' ? 'sí' : 'no'}` : ''].filter(Boolean).join(' · ')),
    ...asrFinTxt(d), '', asrFirma(d)].join('\n');
}
function asrOutHtml() {
  const d = asrD(), c = asrCat(d), r = ASR_RES[c], equipo = d.team || teamCode();
  if (!r) return `<p class="muted asr-espera">${d.vic === 'viva' ? 'Falta decir si el rescate será de menos de 12 horas.' : 'Contesta arriba y sale la categoría, qué hay que pintar y qué se hace después.'}</p>`;
  const marca = r.marca === 'caja' ? `<div class="mark">${worksiteMarkSvg({ code: d.id || 'A-1', hazards: d.riesgos, cat: c, status: 'active', asr: [{ team: equipo, level: 2, date: todayISO() }] })}</div>`
    : `<div class="mark small">${rcmSvg(r.marca, equipo, todayISO())}</div>`;
  return `<div class="asr-res asr-${r.cls}" role="status"><span class="asr-letra" aria-hidden="true">${c === 'N' ? '–' : c}</span><div><b>${r.t}</b><p>${r.d}</p></div></div>
    <div class="asr-dos"><div><b class="asr-sub">Qué se pinta</b>${marca}
        <p class="muted">${r.marca === 'caja' ? `Caja de 1,2 × 1 m junto a la entrada, en un color que contraste. ${d.id ? '' : 'El ID de ejemplo es A-1: pon el tuyo en los datos del sitio. '}Los riesgos van encima.` : 'Rombo de 20 × 20 cm en el sitio más visible. Solo si la autoridad ha decidido usar el marcaje rápido.'}</p></div>
      <div><b class="asr-sub">Qué se hace ahora</b>${ul(r.ahora)}</div></div>`;
}
function asrToolHtml() {
  const d = asrD(), c = asrCat(d), v = k => esc(d[k] ?? '');
  const op = (k, val, l, sub) => `<button type="button" class="asr-op ${d[k] === val ? 'on' : ''}" aria-pressed="${d[k] === val}" onclick="asrSet('${k}', '${val}')"><b>${l}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
  const txt = (k, l, ph = '', extra = '') => `<label class="lbl">${l}<input class="input" name="${k}" value="${v(k)}" placeholder="${esc(ph)}" oninput="asrTxt(this)" ${extra}></label>`;
  const num = (k, l) => txt(k, l, '', 'inputmode="numeric"');
  const sel = (k, l, ops) => `<label class="lbl">${l}<select class="input" name="${k}" onchange="asrTxt(this)"><option value="">Sin decir</option>${ops.map(o => `<option ${d[k] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  return `<div id="asrTool" class="asr-tool">
    <div class="asr-q"><b class="asr-sub">¿Qué sabemos de las víctimas?</b><div class="asr-ops">${ASR_VIC.map(([k, l, s]) => op('vic', k, l, s)).join('')}</div></div>
    ${d.vic === 'viva' ? `<div class="asr-q"><b class="asr-sub">¿Se le puede sacar en menos de 12 horas?</b>
      <div class="asr-ops dos">${op('h12', 'si', 'Sí, menos de 12 h')}${op('h12', 'no', 'No, más de 12 h')}</div>
      <p class="muted">Es una estimación a ojo: depende de dónde está, del material del edificio y de los medios que tenemos.</p></div>` : ''}
    <div id="asrOut">${asrOutHtml()}</div>
    <details class="asr-mas" ${d.mas ? 'open' : ''} ontoggle="asrD().mas = this.open; asrSave()"><summary class="link">${ic('pencil', 'i-sm')} Datos del sitio (para el marcaje y el informe)</summary>
      <div class="form asr-form">
        ${txt('id', 'ID del worksite', 'A-1 o ESP01-0001')}${txt('team', 'Equipo', teamCode())}
        ${txt('sector', 'Sector', 'A')}${txt('lugar', 'Dirección o referencia', 'Calle y número, o «fábrica junto al puente»')}
        <label class="lbl">GPS<span class="asr-gps"><input class="input" name="gps" value="${v('gps')}" placeholder="28.12345, -15.43210" oninput="asrTxt(this)"><button type="button" class="btn btn-g btn-sm" onclick="asrGps()">${ic('pin', 'i-sm')} Mi posición</button></span></label>
        ${sel('uso', 'Uso del edificio', BUILD_USE)}${sel('cons', 'Construcción', CONSTRUCTION)}${num('plantas', 'Plantas')}${num('sot', 'Sótanos')}
        ${sel('colapso', 'Tipo de colapso', ASR_COLAPSOS.map(x => x[0]))}${sel('hueco', 'Huecos', ASR_HUECOS)}
        ${num('vivas', 'Vivas confirmadas')}${num('desap', 'Desaparecidos')}${num('fall', 'Fallecidos')}
        ${txt('riesgos', 'Riesgos (se pintan encima de la caja)', 'Amianto, gas…')}
        <div class="lbl asr-ancho">Qué hará falta<div class="asr-chips" role="group" aria-label="Qué hará falta">${WS_OPS.map(([k, l]) => `<button type="button" class="chip ${(d.ops || []).includes(k) ? 'on' : ''}" aria-pressed="${(d.ops || []).includes(k)}" onclick="asrOp('${k}')">${l}</button>`).join('')}</div></div>
        <label class="lbl asr-ancho">Notas<textarea class="input" name="notas" rows="2" oninput="asrTxt(this)">${v('notas')}</textarea></label>
      </div></details>
    <div class="row asr-acts">${c ? `<button type="button" class="btn btn-a" onclick="asrGuardar()">${ic('check')} ${d._id ? 'Guardar los cambios' : 'Guardar el sitio'}</button>
      <button type="button" class="btn btn-g" onclick="shareText(asrTexto(), 'Triaje de worksite')">${ic('chat')} Enviar el triaje</button>` : ''}
      ${!d._id && (d.vic || d.lugar) ? `<button type="button" class="btn btn-g" onclick="asrVaciaBorrador()">${ic('trash')} Empezar de cero</button>` : ''}</div>
  </div>`;
}
function asrVaciaBorrador() { const d = asrD(); prefs.asr = { team: d.team || teamCode(), id: d.id, sector: d.sector, mas: d.mas }; asrSave(); asrPinta(); }

/* ---------- Sitios: los registros «asr» y su orden de prioridad ---------- */
const ASR_ST = { pend: ['Pendiente', 'neutral'], trab: ['En trabajo', 'info'], fin: ['Terminado', 'ok'] };
const ASR_PESO = { A: 0, B: 1, C: 2, D: 3, N: 4, '': 5 };
const asrSitios = () => list('asr');
const asrQuedan = s => Math.max(0, (+s.vivas || 0) - (+s.resc || 0));          // vivas confirmadas que siguen dentro
const asrFallQuedan = s => Math.max(0, (+s.fall || 0) - (+s.recu || 0));
// Cuántas víctimas pesan para ordenar: las vivas que quedan (A y B; si no se ha dicho cuántas, una) o los desaparecidos (C)
const asrVict = s => { const c = asrCat(s); return c === 'A' || c === 'B' ? (asrN(s.vivas) ? asrQuedan(s) : 1) : c === 'C' ? +s.desap || 0 : 0; };
const asrRescate = s => ['A', 'B', 'C'].includes(asrCat(s));                  // sitios donde puede haber alguien vivo
// Orden de prioridad (INSARAG): lo terminado al final; antes, lo que el mando ha puesto primero; después por categoría
// (vivas confirmadas antes que posibles), más víctimas primero y, a igualdad, el que lleva más tiempo esperando
function asrOrden(a, b) {
  const fin = s => s.st === 'fin' ? 1 : 0;
  return fin(a) - fin(b) || (b.pri ? 1 : 0) - (a.pri ? 1 : 0) || ASR_PESO[asrCat(a)] - ASR_PESO[asrCat(b)] || asrVict(b) - asrVict(a) || (a.ts || 0) - (b.ts || 0);
}
const asrLista = () => asrSitios().sort(asrOrden);
// Por qué está donde está, en una línea
function asrPorque(s) {
  const c = asrCat(s), n = (x, uno, varios) => `${x} ${x === 1 ? uno : varios}`;
  return [s.pri ? 'Primero por orden del mando' : '',
    c === 'A' || c === 'B' ? (asrN(s.vivas) ? (asrQuedan(s) ? n(asrQuedan(s), 'viva por rescatar', 'vivas por rescatar') : 'Ya no quedan vivas confirmadas') : 'Vivas confirmadas') + (c === 'A' ? ' · menos de 12 h' : ' · más de 12 h')
      : c === 'C' ? (+s.desap ? n(+s.desap, 'posible víctima', 'posibles víctimas') : 'Posibles víctimas') + ' sin confirmar' : c === 'D' ? 'Solo fallecidos' : 'Despejado, sin víctimas',
    +s.resc ? n(+s.resc, 'rescatada', 'rescatadas') : ''].filter(Boolean).join(' · ');
}
const asrUltNivel = s => Math.max(0, ...(s.niveles || []).map(x => +x.level || 0));
const asrNombre = s => s.id2 || 'Sin ID';   // el ID de worksite que se pinta (el del registro es «id»)
// Guardar el triaje como sitio (nuevo o el que se estaba cambiando). El triaje hecho cuenta como ASR 2 terminado.
function asrGuardar() {
  if (!me()) return;
  const d = asrD(), c = asrCat(d); if (!c) return toast('Falta contestar qué se sabe de las víctimas', 'bad');
  const viejo = d._id ? get('asr', d._id) : null, hoy = todayISO(), team = d.team || teamCode();
  const rec = { ...(viejo || { st: 'pend', niveles: c === 'N' ? [] : [{ team, level: 2, date: hoy }], by: prefs.activeOperator, ts: Date.now() }),
    id: d._id || uid('AS'), id2: (d.id || '').trim(), team, sector: (d.sector || '').trim(), lugar: d.lugar || '', gps: d.gps || '', uso: d.uso || '', cons: d.cons || '', plantas: d.plantas || '', sot: d.sot || '',
    colapso: d.colapso || '', hueco: d.hueco || '', vic: d.vic, h12: d.h12 || '', vivas: d.vivas || '', desap: d.desap || '', fall: d.fall || '', ops: d.ops || [], riesgos: d.riesgos || '', notas: d.notas || '', cat: c };
  prefs.asr = { team, sector: rec.sector, id: asrSigId(rec.id2), mas: d.mas };
  put('asr', rec, `ASR: ${viejo ? 'cambiado' : 'nuevo'} sitio ${asrNombre(rec)} (${ASR_RES[c].t.toLowerCase()})`);
  closeModal(); toast(`${asrNombre(rec)}: ${ASR_RES[c].t.toLowerCase()}`, 'ok');
  if (viejo) setTimeout(() => asrSitio(rec.id), 0);
}
// Abrir el triaje: de un sitio nuevo (sigue el borrador si lo había) o de uno guardado, para cambiarlo
function asrTriaje(id = '') {
  if (!me()) return;
  const s = id ? get('asr', id) : null;
  if (s) prefs.asr = { ...s, _id: s.id, id: s.id2, mas: true };
  else if (asrD()._id) prefs.asr = { team: asrD().team || teamCode() };
  if (!s && !asrD().id) asrD().id = asrSigId(asrSitios().sort((a, b) => (b.ts || 0) - (a.ts || 0))[0]?.id2 || '');
  asrSave();
  openModal(s ? `Triaje de ${asrNombre(s)}` : 'Triaje de un sitio', `<p class="muted" style="margin-bottom:10px">Delante del edificio o del sitio: dos preguntas y sale la categoría, qué se pinta y qué se hace después.</p>${asrToolHtml()}`);
}
// Cambios rápidos en la ficha de un sitio: estado, niveles terminados, víctimas y prioridad por orden
function asrCambia(id, cambio, msg) { const s = get('asr', id); if (!s || !me()) return; put('asr', { ...s, ...cambio(s) }, msg ? `ASR ${asrNombre(s)}: ${msg}` : ''); asrSitio(id); }
const asrEstado = (id, st) => asrCambia(id, s => ({ st, fin: st === 'fin' ? todayISO() : '' }), ASR_ST[st][0].toLowerCase());
const asrNivel = (id, n) => asrCambia(id, s => ({ niveles: (s.niveles || []).some(x => +x.level === n) ? s.niveles.filter(x => +x.level !== n)
  : [...(s.niveles || []), { team: s.team || teamCode(), level: n, date: todayISO() }].sort((a, b) => a.level - b.level) }), `ASR ${n}`);
// Las cuentas de víctimas no pueden quedar sin sentido: no se rescata a más de las vivas confirmadas, ni se recuperan más fallecidos de los localizados
function asrCuenta(id, k, mas) {
  asrCambia(id, s => { const v = Math.max(0, (+s[k] || 0) + mas), r = { [k]: v };
    if (k === 'resc' && v > (+s.vivas || 0)) r.vivas = v; if (k === 'vivas' && v < (+s.resc || 0)) r.resc = v;
    if (k === 'recu' && v > (+s.fall || 0)) r.fall = v; if (k === 'fall' && v < (+s.recu || 0)) r.recu = v; return r; });
}
function asrBorra(id) { const s = get('asr', id); if (!s || !confirm(`¿Borrar el sitio ${asrNombre(s)}?`)) return; remove('asr', id, `ASR: borrado el sitio ${asrNombre(s)}`); closeModal(); }
function asrBorraTodo() {
  const n = asrSitios().length; if (!n || !me() || !confirm(`¿Borrar los ${n} sitios y empezar otra intervención? Manda antes el parte si quieres guardarlo.`)) return;
  asrSitios().forEach(s => stamp('asr', { id: s.id, _del: true })); addLog(`ASR: borrados los ${n} sitios`); commit(); toast('Sitios borrados', 'ok');
}
// Las víctimas de un sitio, como las pide el dibujo de la V
const asrVmarca = s => victimMarkSvg([...Array.from({ length: +s.vivas || 0 }, (_, i) => ({ state: 'viva', status: i < (+s.resc || 0) ? 'extraida' : 'localizada' })),
  ...Array.from({ length: +s.fall || 0 }, (_, i) => ({ state: 'fallecida', status: i < (+s.recu || 0) ? 'extraida' : 'localizada' }))]);
// Lo que hay que tener pintado ahora en un sitio: la caja con todas sus líneas (y la raya si está terminado) o el rombo
function asrMarcaHtml(s) {
  const c = asrCat(s), r = ASR_RES[c], hayV = (+s.vivas || 0) + (+s.fall || 0) > 0;
  const caja = `<div class="mark">${worksiteMarkSvg({ code: s.id2 || '?', hazards: s.riesgos, cat: c === 'N' ? '' : c, status: s.st === 'fin' ? 'done' : 'active', asr: s.niveles || [] })}</div>`;
  return r.marca === 'caja' || (s.niveles || []).length ? `${caja}${hayV ? `<div class="mark small">${asrVmarca(s)}</div>` : ''}
      <p class="muted">Caja junto a la entrada, con una línea por cada nivel terminado${s.st === 'fin' ? ' y la raya horizontal: aquí ya no queda nada por hacer' : ''}.${hayV ? ' La V, donde están las víctimas: lo tachado ya está fuera.' : ''}</p>`
    : `<div class="mark small">${rcmSvg(r.marca, s.team || teamCode(), s.fin || todayISO())}</div><p class="muted">Rombo de 20 × 20 cm, solo si la autoridad usa el marcaje rápido.</p>`;
}
// Qué toca hacer en un sitio, según su categoría y cómo va
function asrAhora(s) {
  const c = asrCat(s), r = ASR_RES[c];
  if (s.st === 'fin') return ['Raya horizontal que cruce toda la caja.', 'Mandar el informe del worksite: ya no hay que volver.'];
  if (s.st === 'trab') return ['Mando y control del sitio: entrada única, vigía y relevos.', 'Cada víctima que sale: restarla aquí y tachar en la V.',
    (c === 'A' || c === 'B') && asrN(s.vivas) && !asrQuedan(s) ? 'Ya no quedan vivas confirmadas: si no falta nadie, márcalo terminado.' : 'Al acabar un nivel, márcalo aquí: sale la línea que hay que añadir a la caja.',
    'Si aparece alguien muy atrapado y no podemos solos, pedir refuerzo.'];
  return r.ahora;
}
// Informe de un worksite, con los campos del informe de INSARAG
function asrInforme(id) {
  const s = get('asr', id); if (!s) return ''; const c = asrCat(s), niv = (s.niveles || []).map(x => x.level);
  return [...waHead('🏚️', `${UNIDAD} · INFORME DE WORKSITE`, [asrNombre(s), ASR_RES[c].t, ASR_ST[s.st || 'pend'][0]].join(' · ')), ...asrDatosTxt(s),
    `Vivas confirmadas ahora (con rescates en curso): ${waB(asrQuedan(s))}`, ...asrFila('Desaparecidos', asrN(s.desap)),
    `Rescatadas vivas: ${waB(+s.resc || 0)} · Fallecidos recuperados: ${waB(+s.recu || 0)}${asrFallQuedan(s) ? ` · Fallecidos por recuperar: ${asrFallQuedan(s)}` : ''}`,
    ...asrFila('ASR terminado', niv.length ? niv.join(', ') : ''), ...(s.st === 'fin' ? [`Terminado el ${fmtDate(s.fin || todayISO())}`] : []), ...asrFinTxt(s), '', asrFirma(s)].join('\n');
}
// Parte del sector: totales y los sitios en orden de prioridad
function asrParte() {
  const l = asrLista(), ab = l.filter(s => s.st !== 'fin' && asrRescate(s)), fin = l.filter(s => s.st === 'fin'), sin = l.filter(s => s.st !== 'fin' && !asrRescate(s)), sum = k => l.reduce((t, s) => t + (+s[k] || 0), 0);
  const linea = (s, i) => `${i + 1}. ${waB(asrCat(s))} ${asrNombre(s)}${s.lugar ? ' · ' + s.lugar : ''} · ${asrPorque(s)} · ${ASR_ST[s.st || 'pend'][0].toLowerCase()}${asrUltNivel(s) ? ' · ASR ' + asrUltNivel(s) : ''}`;
  return [...waHead('📋', `${UNIDAD} · ASR · PARTE DEL SECTOR`, new Date().toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })),
    `Sitios con rescate: ${waB(ab.length)} abiertos · ${waB(fin.length)} terminados`,
    `Vivas por rescatar: ${waB(l.reduce((t, s) => t + (s.st === 'fin' ? 0 : asrQuedan(s)), 0))} · Rescatadas: ${waB(sum('resc'))} · Fallecidos recuperados: ${waB(sum('recu'))}`,
    ...(ab.length ? [...waSec('🔺', 'PRIORIDADES'), ...ab.map(linea)] : ['', '✅ Sin sitios de rescate abiertos']),
    ...(sin.length ? [...waSec('▫️', 'SIN RESCATE'), ...sin.map(s => `• ${asrNombre(s)}${s.lugar ? ' · ' + s.lugar : ''}: ${asrPorque(s).toLowerCase()}`)] : []),
    ...(fin.length ? [...waSec('✔️', 'TERMINADOS'), fin.map(asrNombre).join(', ')] : []), '', asrFirma({})].join('\n');
}

/* ---------- La ficha de un sitio ---------- */
function asrSitio(id) {
  const s = get('asr', id); if (!s) return;
  const c = asrCat(s), r = ASR_RES[c], st = s.st || 'pend', puede = !!me(), pos = asrLista().filter(x => x.st !== 'fin' && asrRescate(x)).findIndex(x => x.id === id);
  const paso = (k, l) => `<div class="asr-step"><span>${l}</span><span class="asr-step-b"><button type="button" class="btn btn-g btn-sm" aria-label="${l}: uno menos" ${+s[k] ? '' : 'disabled'} onclick="asrCuenta(${jsq(id)}, '${k}', -1)">−</button>
    <b aria-live="polite">${+s[k] || 0}</b><button type="button" class="btn btn-g btn-sm" aria-label="${l}: uno más" onclick="asrCuenta(${jsq(id)}, '${k}', 1)">+</button></span></div>`;
  const dato = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';
  openModal(asrNombre(s), `
    <div class="asr-res asr-${r.cls}"><span class="asr-letra" aria-hidden="true">${c === 'N' ? '–' : c}</span><div><b>${r.t}${pos >= 0 ? ` · prioridad ${pos + 1}` : ''}</b><p>${esc(asrPorque(s))}</p></div></div>
    <dl class="dl asr-dl">${dato('Lugar', [s.sector ? 'Sector ' + s.sector : '', s.lugar].filter(Boolean).join(' · '))}${dato('GPS', s.gps)}
      ${dato('Edificio', [s.uso, s.cons, asrN(s.plantas) ? s.plantas + ' plantas' : '', asrN(s.sot) && +s.sot ? s.sot + ' sótanos' : ''].filter(Boolean).join(', '))}
      ${dato('Colapso', [s.colapso, s.hueco ? 'huecos ' + s.hueco.toLowerCase() : ''].filter(Boolean).join(' · '))}
      ${dato('Hace falta', WS_OPS.filter(([k]) => (s.ops || []).includes(k)).map(([, l]) => l).join(', '))}${dato('Riesgos', s.riesgos)}${dato('Notas', s.notas)}
      ${dato('Triaje', `${s.by || ''} · ${fmtWhen(s.ts)}`)}</dl>
    ${puede ? `<b class="asr-sub">Cómo va</b>
    <div class="asr-ops tres" role="group" aria-label="Estado del sitio">${Object.entries(ASR_ST).map(([k, [l]]) => `<button type="button" class="asr-op ${st === k ? 'on' : ''}" aria-pressed="${st === k}" onclick="asrEstado(${jsq(id)}, '${k}')"><b>${l}</b></button>`).join('')}</div>
    <b class="asr-sub">Niveles ASR terminados</b>
    <div class="asr-chips" role="group" aria-label="Niveles ASR terminados">${[2, 3, 4, 5].map(n => { const on = (s.niveles || []).some(x => +x.level === n);
      return `<button type="button" class="chip ${on ? 'on' : ''}" aria-pressed="${on}" onclick="asrNivel(${jsq(id)}, ${n})">ASR ${n} · ${ASR[n - 1].corto}</button>`; }).join('')}</div>
    ${c === 'N' ? '' : `<b class="asr-sub">Víctimas</b>
    <div class="asr-steps">${paso('vivas', 'Vivas confirmadas')}${paso('resc', 'Rescatadas vivas')}${paso('fall', 'Fallecidos localizados')}${paso('recu', 'Fallecidos recuperados')}</div>`}` : ''}
    <div class="asr-dos"><div><b class="asr-sub">Qué tiene que estar pintado</b>${asrMarcaHtml(s)}</div>
      <div><b class="asr-sub">Qué se hace ahora</b>${ul(asrAhora(s))}</div></div>
    <div class="row asr-acts"><button type="button" class="btn btn-a" onclick="shareText(asrInforme(${jsq(id)}), 'Informe de worksite')">${ic('chat')} Enviar el informe</button>
      ${puede ? `<button type="button" class="btn btn-g" onclick="asrTriaje(${jsq(id)})">${ic('pencil')} Cambiar el triaje</button>
      ${st === 'fin' || !asrRescate(s) ? '' : `<button type="button" class="btn btn-g" aria-pressed="${!!s.pri}" onclick="asrCambia(${jsq(id)}, s => ({ pri: !s.pri }), ${s.pri ? "'ya no va primero'" : "'primero por orden del mando'"})">${ic('flag')} ${s.pri ? 'Quitar «primero por orden»' : 'Poner primero por orden'}</button>`}
      <button type="button" class="btn btn-bad" onclick="asrBorra(${jsq(id)})">${ic('trash')} Borrar</button>` : ''}</div>`);
}

/* ---------- Marcaje libre: para pintar algo que no es de un sitio guardado, o para practicar ---------- */
const ASR_MARCAS = [['caja', 'Caja de worksite'], ['v', 'Víctimas'], ['rombo', 'Marcaje rápido'], ['lados', 'Lados y plantas']];
const asrM = () => prefs.asrM || (prefs.asrM = { tipo: 'caja', team: teamCode(), cat: 'A', niv: [2], rombo: 'C' });
function asrMSet(k, v) { asrM()[k] = v; asrSave(); const el = $('asrMarc'); if (el) el.outerHTML = asrMarcajeHtml(); }
function asrMTxt(el) { asrM()[el.name] = el.value; asrSave(); const o = $('asrMDib'); if (o) o.innerHTML = asrMDibujo(); }
const asrMNiv = n => asrMSet('niv', (asrM().niv || []).includes(n) ? asrM().niv.filter(x => x !== n) : [...(asrM().niv || []), n].sort());
const asrMCuenta = (k, mas) => { const m = asrM(), v = Math.max(0, (+m[k] || 0) + mas), tope = { Lo: 'L', Do: 'D' }[k], base = { L: 'Lo', D: 'Do' }[k];
  m[k] = v; if (tope && v > (+m[tope] || 0)) m[tope] = v; if (base && v < (+m[base] || 0)) m[base] = v; asrMSet(k, v); };
function asrMDibujo() {
  const m = asrM(), team = m.team || teamCode(), hoy = todayISO();
  return m.tipo === 'v' ? `<div class="mark small">${victimMarkSvg([...Array.from({ length: +m.L || 0 }, (_, i) => ({ state: 'viva', status: i < (+m.Lo || 0) ? 'extraida' : 'localizada' })),
      ...Array.from({ length: +m.D || 0 }, (_, i) => ({ state: 'fallecida', status: i < (+m.Do || 0) ? 'extraida' : 'localizada' }))])}</div>`
    : m.tipo === 'rombo' ? `<div class="mark small">${rcmSvg(m.rombo === 'D' ? 'D' : 'C', team, hoy)}</div>`
    : m.tipo === 'lados' ? `<div class="mark small">${orientationSvg()}</div>`
    : `<div class="mark">${worksiteMarkSvg({ code: m.id || 'A-1', hazards: m.riesgos, cat: m.cat || '', status: m.fin ? 'done' : 'active', asr: (m.niv || []).map(n => ({ team, level: n, date: hoy })) })}</div>`;
}
const ASR_COMO = {
  caja: ['Junto a la entrada, donde mejor se vea, en un color que contraste con la pared.', 'Caja de 1,2 × 1 m. Dentro, arriba, el ID con letras de unos 40 cm.',
    'Debajo del ID, una línea por cada nivel terminado: equipo, ASR y fecha (letras de unos 10 cm).', 'Encima de la caja, los riesgos (amianto, gas…). Debajo, la categoría. Una flecha si hace falta señalar la entrada.',
    'Cuando no quede nada por hacer: una raya horizontal que cruce toda la caja.'],
  v: ['V de unos 50 cm lo más cerca posible de donde está la víctima, cuando no se la ve y el equipo se va del sitio.', 'Debajo, L y el número de vivas (L-2) y D y el número de fallecidos (D-1).',
    'Al sacar a alguien se tacha y se escribe debajo lo que queda. Con todo tachado, ya no queda nadie.', 'No va en la fachada junto a la caja, salvo que la víctima esté ahí.'],
  rombo: ['Solo si la autoridad ha decidido usar el marcaje rápido.', 'Rombo de 20 × 20 cm en el sitio más visible: una C si está despejado, una D si solo hay fallecidos. Debajo, el equipo y la fecha.',
    'Solo en sitios que se pueden registrar enteros deprisa o donde está claro que no queda nadie vivo. Vale para coches, casetas o montones de escombro.'],
  lados: ['Lado 1: la fachada de la calle. Los demás, en el sentido de las agujas del reloj.', 'Dentro, cuadrantes A, B, C y D en el mismo sentido, empezando en la esquina de los lados 1 y 2. El E es el centro (portal, escalera, ascensor).',
    'Plantas: la de la calle es la planta baja; hacia arriba, planta 1, 2…; hacia abajo, sótano 1, 2…', 'Sirve para decir dónde está algo: «lado 3, planta 2, cuadrante C».']
};
function asrMarcajeHtml() {
  const m = asrM(), v = k => esc(m[k] ?? ''), txt = (k, l, ph = '') => `<label class="lbl">${l}<input class="input" name="${k}" value="${v(k)}" placeholder="${esc(ph)}" oninput="asrMTxt(this)"></label>`;
  const paso = (k, l) => `<div class="asr-step"><span>${l}</span><span class="asr-step-b"><button type="button" class="btn btn-g btn-sm" aria-label="${l}: uno menos" ${+m[k] ? '' : 'disabled'} onclick="asrMCuenta('${k}', -1)">−</button>
    <b>${+m[k] || 0}</b><button type="button" class="btn btn-g btn-sm" aria-label="${l}: uno más" onclick="asrMCuenta('${k}', 1)">+</button></span></div>`;
  const chip = (on, l, js) => `<button type="button" class="chip ${on ? 'on' : ''}" aria-pressed="${on}" onclick="${js}">${l}</button>`;
  const campos = { caja: `<div class="form asr-form">${txt('id', 'ID del worksite', 'A-1 o ESP01-0001')}${txt('team', 'Equipo', teamCode())}${txt('riesgos', 'Riesgos', 'Amianto, gas…')}</div>
      <b class="asr-sub">Categoría</b><div class="asr-chips" role="group" aria-label="Categoría">${['A', 'B', 'C', 'D'].map(c => chip(m.cat === c, c, `asrMSet('cat', '${c}')`)).join('')}</div>
      <b class="asr-sub">Niveles terminados</b><div class="asr-chips" role="group" aria-label="Niveles terminados">${[2, 3, 4, 5].map(n => chip((m.niv || []).includes(n), 'ASR ' + n, `asrMNiv(${n})`)).join('')}${chip(!!m.fin, 'Trabajo terminado', `asrMSet('fin', ${!m.fin})`)}</div>`,
    v: `<div class="asr-steps">${paso('L', 'Vivas localizadas')}${paso('Lo', 'Vivas ya fuera')}${paso('D', 'Fallecidos localizados')}${paso('Do', 'Fallecidos ya fuera')}</div>`,
    rombo: `<div class="asr-ops dos" role="group" aria-label="Tipo de rombo">${[['C', 'C · Despejado'], ['D', 'D · Solo fallecidos']].map(([k, l]) => `<button type="button" class="asr-op ${(m.rombo || 'C') === k ? 'on' : ''}" aria-pressed="${(m.rombo || 'C') === k}" onclick="asrMSet('rombo', '${k}')"><b>${l}</b></button>`).join('')}</div>
      <div class="form asr-form" style="margin-top:10px">${txt('team', 'Equipo', teamCode())}</div>`, lados: '' };
  return `<div id="asrMarc" class="panel asr-marc">
    <div class="asr-ops" role="group" aria-label="Qué marca">${ASR_MARCAS.map(([k, l]) => `<button type="button" class="asr-op ${m.tipo === k ? 'on' : ''}" aria-pressed="${m.tipo === k}" onclick="asrMSet('tipo', '${k}')"><b>${l}</b></button>`).join('')}</div>
    <div class="asr-dos" style="margin-top:14px"><div><div id="asrMDib">${asrMDibujo()}</div>${campos[m.tipo] || ''}</div>
      <div><b class="asr-sub">Cómo se pinta</b>${ul(ASR_COMO[m.tipo] || ASR_COMO.caja)}
        <p class="muted">Se pinta con spray, cera de obra, pegatinas o tarjetas: lo que se tenga, siempre que se vea bien.</p></div></div>
  </div>`;
}

/* ---------- Los cinco niveles (también en la Guía de campo) ---------- */
const asrNivelesHtml = () => `
  <p class="asr-lema">${ASR.map(a => `<span><b>${a.n}</b> ${a.corto}</span>`).join('')}</p>
  <p><b>A nuestro nivel</b> (un pelotón o la sección USAR): lo nuestro es el <b>ASR 2 y el ASR 3</b> en el sector que nos asignen. El ASR 4, con relevos o con apoyo de otro equipo. El ASR 1 suele venir hecho y el ASR 5 solo se hace por orden.</p>
  <p class="muted">Van en orden, pero nos pueden mandar directamente a cualquiera, y en una misma catástrofe hay zonas en niveles distintos a la vez.</p>
  ${ASR.map(a => `<div class="asr-niv"><div class="asr-niv-h"><span class="asr-num">${a.n}</span><div><b>${a.name}</b><small>${a.quien}</small></div></div>
    <p>${a.que}</p>${ul(a.nos)}<p class="asr-sale"><b>Se entrega:</b> ${a.sale}</p></div>`).join('')}`;

/* ---------- La página ASR ---------- */
function asrFilaSitio(s, pos) {
  const c = asrCat(s), r = ASR_RES[c], [st, cls] = ASR_ST[s.st || 'pend'];
  return `<button class="asr-sitio" onclick="asrSitio(${jsq(s.id)})">
    ${pos ? `<span class="asr-rank" aria-label="Prioridad ${pos}">${pos}</span>` : ''}<span class="asr-letra sm asr-l-${r.cls}" aria-label="${r.t}">${c === 'N' ? '–' : c}</span>
    <span class="asr-sitio-t"><b>${esc(asrNombre(s))}${s.lugar ? ` <small>${esc(s.lugar)}</small>` : ''}</b><small>${esc(asrPorque(s))}</small></span>
    <span class="asr-sitio-e"><span class="tag ${cls}">${st}</span>${asrUltNivel(s) ? `<span class="tag neutral">ASR ${asrUltNivel(s)}</span>` : ''}</span></button>`;
}
function viewAsr() {
  const l = asrLista(), ab = l.filter(s => s.st !== 'fin' && asrRescate(s)), sin = l.filter(s => s.st !== 'fin' && !asrRescate(s)), fin = l.filter(s => s.st === 'fin');
  const vivas = ab.reduce((t, s) => t + asrQuedan(s), 0), resc = l.reduce((t, s) => t + (+s.resc || 0), 0), puede = !!me();
  const tabs = [['sitios', 'building', 'Sitios', ab.length], ['marcaje', 'pencil', 'Marcaje', 0], ['niveles', 'layers', 'Niveles', 0]], tab = tabs.some(t => t[0] === prefs.asrTab) ? prefs.asrTab : 'sitios';
  const cuerpo = {
    sitios: () => !l.length ? `<div class="panel">${emptyState('building', 'Aún no hay ningún sitio', 'Al llegar a cada edificio o sitio del sector, haz su triaje: dos preguntas dan la categoría y la app los ordena sola por prioridad.',
        puede ? `<button class="btn btn-a" onclick="asrTriaje()">${ic('plus')} Triaje de un sitio</button>` : '')}</div>`
      : `<div class="panel"><div class="between sec-head"><h3>Por prioridad</h3><span class="muted">${ab.length}</span></div>
          ${ab.length ? `<div class="asr-list">${ab.map((s, i) => asrFilaSitio(s, i + 1)).join('')}</div>
            <p class="muted asr-regla">El orden sale solo: lo que el mando pone primero; después A, B y C; a igual categoría, donde hay más víctimas; y, si empatan, el que lleva más tiempo esperando.</p>`
            : '<p class="muted">No queda ningún sitio de rescate abierto.</p>'}
          ${sin.length ? `<details class="asr-grupo"><summary class="link">Sin rescate: solo fallecidos o despejados (${sin.length})</summary><div class="asr-list">${sin.map(s => asrFilaSitio(s)).join('')}</div></details>` : ''}
          ${fin.length ? `<details class="asr-grupo"><summary class="link">Terminados (${fin.length})</summary><div class="asr-list">${fin.map(s => asrFilaSitio(s)).join('')}</div></details>` : ''}
          <div class="row asr-acts" style="margin-top:12px"><button class="btn btn-g" onclick="shareText(asrParte(), 'Parte del sector')">${ic('chat')} Enviar el parte del sector</button></div>
          ${puede ? `<button class="link asr-vaciar" onclick="asrBorraTodo()">${ic('trash', 'i-sm')} Borrar todos los sitios (otra intervención)</button>` : ''}</div>`,
    marcaje: () => asrMarcajeHtml(),
    niveles: () => `<div class="panel">${asrNivelesHtml()}
      <div class="row asr-acts" style="margin-top:12px"><button class="btn btn-g" onclick="go('guia'); guiaAbre('triaje')">${ic('book')} Triaje, en la Guía</button>
        <button class="btn btn-g" onclick="go('guia'); guiaAbre('insarag')">${ic('book')} Guías 2026–2030</button></div></div>`
  };
  return `
    <div class="panel">
      <div class="between sec-head asr-cab"><div><h2>ASR</h2><p class="muted">Los sitios del sector por prioridad, con su marcaje y sus informes.</p></div>
        ${puede ? `<button class="btn btn-a" onclick="asrTriaje()">${ic('plus')} Sitio</button>` : ''}</div>
      <div class="sier-res asr-kpis">
        <div class="sier-kpi"><small>Abiertos</small><b>${ab.length}</b></div>
        <div class="sier-kpi ${vivas ? 'bad' : ''}"><small>Vivas por rescatar</small><b>${vivas}</b></div>
        <div class="sier-kpi ${resc ? 'ok' : ''}"><small>Rescatadas</small><b>${resc}</b></div>
        <div class="sier-kpi"><small>Terminados</small><b>${fin.length}</b></div>
      </div>
    </div>
    <nav class="ctabs" aria-label="Partes del ASR">${tabs.map(([id, icon, lbl, n]) => `<button class="ctab ${tab === id ? 'on' : ''}" ${tab === id ? 'aria-current="page"' : ''} onclick="setPref({ asrTab: '${id}' })">${ic(icon, 'i-sm')} ${lbl}${n ? ` <span class="n neutral">${n}</span>` : ''}</button>`).join('')}</nav>
    ${cuerpo[tab]()}`;
}
// Abre una ficha de la guía (y cierra las demás) y la lleva arriba
function guiaAbre(id) {
  document.querySelectorAll('details.guide[open]').forEach(x => { x.open = false; });
  const el = $('g-' + id); if (!el) return; el.open = true; el.scrollIntoView({ block: 'start', behavior: motion() ? 'smooth' : 'auto' });
}
