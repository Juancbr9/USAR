'use strict';
// USAR 242 · Asistente ASR: el triaje de un worksite (ASR 2) en dos preguntas. Dice la categoría (A, B, C o D), qué hay que
// pintar (lo dibuja con los datos del sitio) y qué se hace después, y prepara el triaje para mandarlo por WhatsApp.
// Sigue las guías INSARAG 2026–2030 (Operaciones: «Worksite Triage»; mismas categorías que en 2020).
// No guarda intervenciones ni worksites: es una ayuda de campo, como las calculadoras. Lo que se va escribiendo se queda en
// este móvil (prefs.asr) para no perderlo si se cierra la app, hasta que se pulsa «Otro sitio».

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
// Otro sitio: se queda el equipo y se propone el ID siguiente (A-1 → A-2, ESP01-0056 → ESP01-0057)
function asrNuevo() {
  const d = asrD(), sig = (d.id || '').replace(/(\d+)(\D*)$/, (m, n, r) => String(+n + 1).padStart(n.length, '0') + r);
  prefs.asr = { team: d.team || teamCode(), id: sig !== d.id ? sig : '', mas: d.mas };
  asrSave(); asrPinta(); $('asrTool')?.scrollIntoView({ block: 'start', behavior: motion() ? 'smooth' : 'auto' });
}
// El triaje en texto, con los campos de la hoja de triaje de INSARAG, para mandarlo
function asrTexto() {
  const d = asrD(), c = asrCat(d), r = ASR_RES[c], n = v => v === '' || v == null ? '' : String(v);
  const fila = (k, v) => v ? [`${k}: ${v}`] : [];
  return [...waHead('🏚️', `${UNIDAD} · TRIAJE DE WORKSITE (ASR 2)`, [d.id ? 'Worksite ' + d.id : '', r ? r.t : ''].filter(Boolean).join(' · ')),
    ...(r ? [r.d] : []),
    ...fila('Lugar', [d.lugar, d.gps ? 'GPS ' + d.gps : ''].filter(Boolean).join(' · ')),
    ...fila('Edificio', [d.uso, d.cons, n(d.plantas) ? d.plantas + ' plantas' : '', n(d.sot) && +d.sot ? d.sot + ' sótanos' : ''].filter(Boolean).join(', ')),
    ...fila('Colapso', [d.colapso, d.hueco ? 'huecos ' + d.hueco.toLowerCase() : ''].filter(Boolean).join(' · ')),
    ...fila('Víctimas', [n(d.vivas) ? `vivas confirmadas ${waB(d.vivas)}` : '', n(d.desap) ? `desaparecidos ${waB(d.desap)}` : '', n(d.fall) ? `fallecidos ${waB(d.fall)}` : '',
      d.vic === 'viva' && d.h12 ? `rescate en menos de 12 h: ${d.h12 === 'si' ? 'sí' : 'no'}` : ''].filter(Boolean).join(' · ')),
    ...fila('Hace falta', WS_OPS.filter(([k]) => (d.ops || []).includes(k)).map(([, l]) => l.toLowerCase()).join(', ')),
    ...fila('Riesgos', d.riesgos), ...fila('Notas', d.notas),
    '', `${d.team || teamCode()} · ${new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${prefs.activeOperator || ''}`].join('\n');
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
        ${txt('lugar', 'Dirección o referencia', 'Calle y número, o «fábrica junto al puente»')}
        <label class="lbl">GPS<span class="asr-gps"><input class="input" name="gps" value="${v('gps')}" placeholder="28.12345, -15.43210" oninput="asrTxt(this)"><button type="button" class="btn btn-g btn-sm" onclick="asrGps()">${ic('pin', 'i-sm')} Mi posición</button></span></label>
        ${sel('uso', 'Uso del edificio', BUILD_USE)}${sel('cons', 'Construcción', CONSTRUCTION)}${num('plantas', 'Plantas')}${num('sot', 'Sótanos')}
        ${sel('colapso', 'Tipo de colapso', ASR_COLAPSOS.map(x => x[0]))}${sel('hueco', 'Huecos', ASR_HUECOS)}
        ${num('vivas', 'Vivas confirmadas')}${num('desap', 'Desaparecidos')}${num('fall', 'Fallecidos')}
        ${txt('riesgos', 'Riesgos (se pintan encima de la caja)', 'Amianto, gas…')}
        <div class="lbl asr-ancho">Qué hará falta<div class="asr-chips" role="group" aria-label="Qué hará falta">${WS_OPS.map(([k, l]) => `<button type="button" class="chip ${(d.ops || []).includes(k) ? 'on' : ''}" aria-pressed="${(d.ops || []).includes(k)}" onclick="asrOp('${k}')">${l}</button>`).join('')}</div></div>
        <label class="lbl asr-ancho">Notas<textarea class="input" name="notas" rows="2" oninput="asrTxt(this)">${v('notas')}</textarea></label>
      </div></details>
    <div class="row asr-acts">${c ? `<button type="button" class="btn btn-a" onclick="shareText(asrTexto(), 'Triaje de worksite')">${ic('chat')} Enviar el triaje</button>` : ''}
      ${d.vic || d.id || d.lugar ? `<button type="button" class="btn btn-g" onclick="asrNuevo()">${ic('plus')} Otro sitio</button>` : ''}</div>
  </div>`;
}
// Abre una ficha de la guía (y cierra las demás) y la lleva arriba
function guiaAbre(id) {
  document.querySelectorAll('details.guide[open]').forEach(x => { x.open = false; });
  const el = $('g-' + id); if (!el) return; el.open = true; el.scrollIntoView({ block: 'start', behavior: motion() ? 'smooth' : 'auto' });
}
