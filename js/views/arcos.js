'use strict';
// USAR 242 · Apuntalar arcos: cuadro (solera, puntales y cumbrera) y cerchas a la medida del arco.
// Con las medidas A–G da el dibujo, la lista de cortes con rótulos, el trazado de cada cercha sobre el tablón,
// cómo sacar las piezas de las barras y el orden de montaje. El cálculo está en js/arcos.js (ARCO).
// Cada arco se guarda en «arcs» y se comparte con el equipo; puede ir unido a un worksite (vigilancia cada 12 h).

const ARC_DEF = { seccion: '10x10', tablonAncho: 20, tablonGrueso: 7, riostra: 'tabla 15×2,5', stockViga: 400, stockTablon: 400, paso: false,
  correas: true, cumbreraDoble: true, holguraLateral: 4, holguraArco: 2, huecoCunas: 4, sepMax: 120, anchoCorrea: 15, grosorCorrea: 2.5 };
const ARC_NUMS = ['Larr', 'Lsuelo', 'Hizq', 'Hder', 'Hclave', 'hq', 'fondo', 'tablonAncho', 'tablonGrueso', 'stockViga', 'stockTablon',
  'holguraLateral', 'holguraArco', 'huecoCunas', 'sepMax', 'anchoCorrea', 'grosorCorrea'];
const ARC_SECCIONES = [['10x10', '10×10'], ['15x15', '15×15'], ['20x7x2', '2 tablones 20×7 embridados']];
const ARC_RIOSTRAS = ['tabla 15×2,5', 'listón 5×10', 'tabla 20×2,5', 'tablón 20×7'];
const ARC_TABS = [['alzado', 'building', 'Alzado'], ['fondo', 'layers', 'Fondo'], ['cortes', 'list', 'Cortes'], ['cerchas', 'wrench', 'Cerchas'], ['plan', 'calc', 'Plan de corte'], ['montaje', 'check', 'Montaje']];
const ARC_TIPO = { 'medio punto': 'Medio punto', rebajado: 'Rebajado', apuntado: 'Apuntado' };
const ARC_NIVEL = { alto: ['bad', 'Atención'], medio: ['warn', 'Revisar'], info: ['info', 'Nota'] };
// Las medidas que se toman en el arco (letra, nombre, explicación)
const ARC_MEDIDAS = [['A', 'Larr', 'Luz en el arranque', 'Ancho libre entre jambas a la altura del arranque'], ['B', 'Lsuelo', 'Luz a ras de suelo', 'Para ver si las jambas están a plomo'],
  ['C', 'Hizq', 'Arranque izquierdo', 'Del suelo al arranque, jamba izquierda'], ['D', 'Hder', 'Arranque derecho', 'Del suelo al arranque, jamba derecha'],
  ['E', 'Hclave', 'Altura de la clave', 'Del suelo al punto más alto del intradós'], ['F', 'hq', 'Altura a ¼ de la luz', 'Opcional: del suelo al intradós a ¼ de A desde la jamba izquierda'],
  ['G', 'fondo', 'Fondo del arco', 'Espesor del muro, de cara a cara']];

const arcNum = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const arcF = (v, d = 1) => Number.isFinite(+v) ? (+v).toLocaleString('es-ES', { maximumFractionDigits: d }) : '—';
// Medidas y opciones del arco, como números (lo que no es un número queda vacío)
function arcInput(a) {
  const inp = { ...ARC_DEF, ...a };
  ARC_NUMS.forEach(k => { inp[k] = arcNum(inp[k]); });
  ['paso', 'correas', 'cumbreraDoble'].forEach(k => { inp[k] = inp[k] === true || inp[k] === '1'; });
  if (!ARC_SECCIONES.some(([v]) => v === inp.seccion)) inp.seccion = '10x10';
  inp.riostra = String(inp.riostra || ARC_DEF.riostra);
  inp.equipo = a.team || '';
  return inp;
}
const arcMissing = a => ARC_MEDIDAS.filter(([, k]) => k !== 'hq' && k !== 'Lsuelo' && arcNum(a[k]) === null);
function arcCalc(a) {
  if (arcMissing(a).length) return null;
  try { return ARCO.calcular(arcInput(a)); } catch (e) { setTimeout(() => { throw e; }); return { error: 'No se ha podido calcular este arco. Revisa las medidas.' }; }
}
const arcWs = a => a.ws ? get('worksites', a.ws) : null;

/* ---------- Lista de arcos ---------- */
function viewArcos() {
  const a = prefs.arc && get('arcs', prefs.arc);
  if (a) return arcDetail(a);
  const arcs = list('arcs').sort((x, y) => (y.created || 0) - (x.created || 0));
  return `
    <div class="panel">
      <button class="link" onclick="openApu('arco')">${ic('back', 'i-sm')} Apuntalamiento de arcos</button>
      <div class="between sec-head"><div><h2>Apuntalar arcos</h2>
        <p class="muted">Cuadro y cerchas a la medida del arco: dibujo, lista de cortes con rótulos, plantilla de cada cercha y montaje. Según el Manual de Campo USAR y los temas de apuntalamiento de la UME.</p></div>
        <button class="btn btn-a" onclick="arcForm()">${ic('plus')} Arco</button></div>
      ${arcs.length ? `<div class="list">${arcs.map(x => { const r = arcCalc(x), ws = arcWs(x), pend = arcPending(x, r);
        return `<button class="item" onclick="openArc('${x.id}')"><div class="grow"><b>${esc(x.name || 'Arco')}</b>
          <small>${r && !r.error ? `${ARC_TIPO[r.A.tipo]} · luz ${arcF(r.inp.Larr)} cm · ${r.nf} pórticos` : 'Faltan medidas'}${ws ? ` · worksite ${esc(ws.code)}` : ''}${x.team ? ' · ' + esc(x.team) : ''}</small></div>
          ${!r || r.error ? '<span class="tag warn">Medidas</span>' : pend ? `<span class="tag info">${pend} por cortar</span>` : '<span class="tag ok">Cortado</span>'}</button>`; }).join('')}</div>`
        : emptyState('wrench', 'Ningún arco todavía', 'Mide el arco (A–G) y pulsa «Arco»: la app calcula las piezas.',
          `<button class="btn btn-g" onclick="arcExample()">Ver un ejemplo</button>`)}
    </div>
    <div class="panel" style="margin-top:12px">
      <h3 class="sec-title">${ic('pencil')} Qué medir</h3>
      ${arcMeasureGuide()}
    </div>`;
}
const arcPending = (a, r) => r && !r.error ? r.piezas.filter(p => !(a.done || {})[p.code]).reduce((s, p) => s + p.cant, 0) : 0;
function openArc(id) { toggleDrawer(false); closeModal(); setPref({ tab: 'arcos', arc: id }); scrollTo(0, 0); }
function arcExample() {
  const id = uid('AR');
  put('arcs', { id, ...ARC_DEF, name: 'Arco de ejemplo', team: 'Equipo 1', Larr: 210, Lsuelo: 210, Hizq: 230, Hder: 230, Hclave: 335, hq: 321, fondo: 50,
    created: Date.now(), by: prefs.activeOperator, done: {} }, 'Arco de ejemplo creado');
  openArc(id);
}

/* ---------- Formularios ---------- */
function arcForm(id) {
  const a = id ? get('arcs', id) : null;
  const wss = list('worksites').filter(w => w.status !== 'closed' || w.id === a?.ws).sort((x, y) => String(x.code).localeCompare(String(y.code)));
  openForm(a ? 'Medidas del arco' : 'Nuevo arco', [
    { k: 'name', label: 'Nombre', value: a?.name, required: true, wide: true, placeholder: 'Ej: Arco del pasillo, planta baja' },
    ...ARC_MEDIDAS.map(([l, k, t]) => ({ k, label: `${l} · ${t} (cm)${k === 'hq' ? ' · opcional' : ''}`, type: 'number', value: a?.[k] ?? '', required: !['hq', 'Lsuelo'].includes(k) })),
    { k: 'ws', label: 'Worksite', value: a?.ws || '', options: [['', 'Sin worksite'], ...wss.map(w => [w.id, `${w.code}${w.name ? ' · ' + w.name : ''} (${mget(w.mission)?.title || 'operación'})`])] },
    { k: 'team', label: 'Equipo (va en el rótulo)', value: a?.team, carry: 'arcTeam', placeholder: 'Ej: Equipo 1' }
  ], v => {
    const rec = { ...ARC_DEF, ...(a || { id: uid('AR'), created: Date.now(), by: prefs.activeOperator, done: {} }), name: v.name, ws: v.ws, team: v.team };
    ARC_MEDIDAS.forEach(([, k]) => { rec[k] = arcNum(v[k]) ?? ''; });
    if (!rec.Lsuelo && rec.Larr) rec.Lsuelo = rec.Larr;
    put('arcs', rec, `${a ? 'Medidas del arco' : 'Arco nuevo'} «${rec.name}»`);
    if (!a) openArc(rec.id);
  }, `<details class="wide arc-help"><summary class="link">${ic('book', 'i-sm')} ¿Qué es cada medida?</summary>${arcMeasureGuide()}</details>`);
}
function arcWoodForm(id) {
  const a = { ...ARC_DEF, ...get('arcs', id) };
  const yn = (k, label, yes = 'Sí', no = 'No') => ({ k, label, value: a[k] ? '1' : '', options: [['1', yes], ['', no]] });
  openForm('Madera y opciones', [
    { k: 'seccion', label: 'Puntales, solera y cumbrera', value: a.seccion, options: ARC_SECCIONES },
    { k: 'riostra', label: 'Riostras', value: a.riostra, options: [...new Set([...ARC_RIOSTRAS, a.riostra])].map(x => [x, x]) },
    { k: 'tablonAncho', label: 'Tablón de las cerchas: ancho (cm)', type: 'number', value: a.tablonAncho, required: true },
    { k: 'tablonGrueso', label: 'Tablón de las cerchas: grueso (cm)', type: 'number', value: a.tablonGrueso, required: true },
    { k: 'stockViga', label: 'Largo de vuestras vigas (cm)', type: 'number', value: a.stockViga, required: true },
    { k: 'stockTablon', label: 'Largo de tablones y tablas (cm)', type: 'number', value: a.stockTablon, required: true },
    yn('paso', '¿Hay que dejar paso por el arco?', 'Sí: sin puntales intermedios ni X', 'No'),
    yn('cumbreraDoble', 'Cumbrera doble', 'Sí (recomendado)', 'No'),
    yn('correas', 'Correas de reparto sobre las cerchas'),
    { k: 'holguraLateral', label: 'Holgura en el ancho (cm, total)', type: 'number', value: a.holguraLateral },
    { k: 'holguraArco', label: 'Holgura cercha–intradós (cm)', type: 'number', value: a.holguraArco },
    { k: 'huecoCunas', label: 'Cuñas bajo el puntal (cm)', type: 'number', value: a.huecoCunas },
    { k: 'sepMax', label: 'Separación máx. entre pórticos (cm)', type: 'number', value: a.sepMax },
    { k: 'anchoCorrea', label: 'Correas: ancho (cm)', type: 'number', value: a.anchoCorrea },
    { k: 'grosorCorrea', label: 'Correas: grueso (cm)', type: 'number', value: a.grosorCorrea }
  ], v => {
    const rec = { ...get('arcs', id), seccion: v.seccion, riostra: v.riostra, paso: !!v.paso, cumbreraDoble: !!v.cumbreraDoble, correas: !!v.correas };
    ['tablonAncho', 'tablonGrueso', 'stockViga', 'stockTablon', 'holguraLateral', 'holguraArco', 'huecoCunas', 'sepMax', 'anchoCorrea', 'grosorCorrea']
      .forEach(k => { const n = arcNum(v[k]); rec[k] = n ?? ARC_DEF[k]; });
    put('arcs', rec, `Madera del arco «${rec.name}»`);
  }, '<p class="muted wide">Holguras del manual: el cuadro, 4 cm menor que el hueco; bajo el puntal se restan 4 cm con cuñas de 5×10.</p>');
}
function arcDelete(id) {
  const a = get('arcs', id);
  if (!a || !confirm(`¿Borrar el arco «${a.name}»?`)) return;
  remove('arcs', id, `Arco «${a.name}» borrado`);
  setPref({ arc: null });
}
function arcDone(id, code, on) {
  const a = get('arcs', id); if (!a) return;
  put('arcs', { ...a, done: { ...(a.done || {}), [code]: on } });
}
// Vigilancia estructural del worksite: el apuntalamiento se revisa cada 12 h y tras cada réplica
function arcMonitor(id) {
  const a = get('arcs', id), w = a && arcWs(a);
  if (!w) return;
  if ((w.monitors || []).some(x => x.arc === a.id)) return toast('Ya está en la vigilancia del worksite');
  const rec = { id: uid('VG'), type: 'Apuntalamiento', place: `Arco «${a.name}»`, every: MONITOR_TYPES.Apuntalamiento, arc: a.id,
    checks: [{ ts: Date.now(), value: 'Montado', by: prefs.activeOperator }] };
  put('worksites', { ...w, monitors: [...(w.monitors || []), rec] }, `${w.code}: vigilancia del arco ${a.name}`);
  toast('Añadido a la vigilancia: revisar cada 12 h');
}

/* ---------- Ficha del arco ---------- */
function arcDetail(a) {
  const r = arcCalc(a), ws = arcWs(a), tab = ARC_TABS.some(([t]) => t === prefs.arcTab) ? prefs.arcTab : 'alzado';
  const head = `
    <button class="link" onclick="setPref({ arc: null })">${ic('back', 'i-sm')} Todos los arcos</button>
    <div class="panel">
      <div class="between top"><div class="grow"><h2>${esc(a.name || 'Arco')}</h2>
        <p class="muted">${r && !r.error ? `${ARC_TIPO[r.A.tipo]} · luz ${arcF(r.inp.Larr)} cm · clave a ${arcF(r.inp.Hclave)} cm · fondo ${arcF(r.inp.fondo)} cm` : 'Faltan medidas para calcular'}${a.team ? ' · ' + esc(a.team) : ''}</p></div></div>
      <div class="row" style="margin-top:12px">
        <button class="btn btn-g btn-sm" onclick="arcForm('${a.id}')">${ic('pencil', 'i-sm')} Medidas</button>
        <button class="btn btn-g btn-sm" onclick="arcWoodForm('${a.id}')">${ic('sliders', 'i-sm')} Madera y opciones</button>
        ${r && !r.error ? `<button class="btn btn-g btn-sm" onclick="shareText(arcText('${a.id}'), 'Apuntalamiento de arco')">${ic('chat', 'i-sm')} Enviar</button>
        <button class="btn btn-g btn-sm" onclick="printArc('${a.id}')">${ic('printer', 'i-sm')} Hoja de corte</button>` : ''}
        <button class="btn btn-bad btn-sm" onclick="arcDelete('${a.id}')">${ic('trash', 'i-sm')} Borrar</button>
      </div>
      ${ws ? `<div class="item arc-ws"><div class="grow"><b>Worksite ${esc(ws.code)}${ws.name ? ' · ' + esc(ws.name) : ''}</b>
        <small>${(ws.monitors || []).some(x => x.arc === a.id) ? 'En la vigilancia estructural: revisar cada 12 h y tras una réplica' : 'Añádelo a la vigilancia para que avise cada 12 h'}</small></div>
        ${(ws.monitors || []).some(x => x.arc === a.id) ? '' : `<button class="btn btn-a btn-sm" onclick="arcMonitor('${a.id}')">${ic('gauge', 'i-sm')} Vigilar</button>`}
        <button class="btn btn-g btn-sm" onclick="setPref({ tab: 'operaciones', mission: '${ws.mission}', mtab: 'worksites', ws: '${ws.id}' }); scrollTo(0, 0)">Abrir</button></div>` : ''}
    </div>`;
  if (!r) return head + `<div class="panel" style="margin-top:12px">${emptyState('pencil', 'Faltan medidas', `Mide y apunta: ${arcMissing(a).map(([l, , t]) => l + ' (' + t.toLowerCase() + ')').join(', ')}.`,
    `<button class="btn btn-a" onclick="arcForm('${a.id}')">${ic('pencil')} Medidas</button>`)}<h3 class="sec-title" style="margin-top:16px">${ic('pencil')} Qué medir</h3>${arcMeasureGuide()}</div>`;
  if (r.error) return head + `<div class="panel" style="margin-top:12px">${emptyState('alert', 'No sale el cálculo', r.error, `<button class="btn btn-a" onclick="arcForm('${a.id}')">${ic('pencil')} Medidas</button>`)}</div>`;
  const total = r.piezas.reduce((s, p) => s + p.cant, 0), pend = arcPending(a, r);
  const ord = { alto: 0, medio: 1, info: 2 };
  return head + `
    <div class="status arc-kpis">
      <div class="kpi"><div><small>Pórticos</small><b>${r.nf}</b></div></div>
      <div class="kpi"><div><small>Puntales / pórtico</small><b>${2 + r.nInter}</b></div></div>
      <div class="kpi"><div><small>Cerchas / pórtico</small><b>${2 * r.n}</b></div></div>
      <div class="kpi ${pend ? '' : 'ok'}"><div><small>Piezas por cortar</small><b>${pend}<span class="arc-of">/${total}</span></b></div></div>
    </div>
    ${r.checkQ ? `<p class="muted arc-q">Comprobación F: medido ${arcF(r.checkQ.medido)} cm, previsto ${arcF(r.checkQ.previsto)} cm.${Math.abs(r.checkQ.dif) <= 3 ? ' La forma cuadra.' : ''}</p>` : ''}
    ${r.warnings.length ? `<div class="list arc-warns">${r.warnings.slice().sort((x, y) => ord[x.nivel] - ord[y.nivel]).map(w => `
      <div class="item"><span class="tag ${ARC_NIVEL[w.nivel][0]}">${ARC_NIVEL[w.nivel][1]}</span><span class="grow">${esc(w.txt)}${w.ref ? ` <small class="arc-ref">${esc(w.ref)}</small>` : ''}</span></div>`).join('')}</div>` : ''}
    <nav class="tabs arc-tabs" aria-label="Partes del apuntalamiento">${ARC_TABS.map(([id, icon, name]) => `
      <button class="tab ${tab === id ? 'on' : ''}" ${tab === id ? 'aria-current="page"' : ''} onclick="setPref({ arcTab: '${id}' })">${ic(icon, 'i-sm')}${name}</button>`).join('')}</nav>
    <div class="panel arc-body">${ARC_TAB_VIEW[tab](a, r)}</div>`;
}

const ARC_TAB_VIEW = {
  alzado: (a, r) => `
    <div class="arc-fig">${arcSvgAlzado(r)}</div>
    <div class="arc-legend">${[['S', 'solera'], ['TA', 'tacos'], ['P', 'puntal lateral'], ...(r.nInter ? [['PI', 'puntal intermedio']] : []), ['J', 'jabalcón de cuadro'], ...(r.paso ? [] : [['RX', 'riostras en X']]),
      ['C', r.cumbreraDoble ? 'cumbrera doble' : 'cumbrera'], ['AT', 'atado de cercha'], ['PD', 'pendolón'], ...(r.jab.length ? [['JC', 'jabalcones de cercha']] : []), ['CE', 'cerchas'], ...(r.nCorr ? [['CR', 'correas']] : [])]
      .map(([c, t]) => `<span><b>${c}</b> ${t}</span>`).join('')}<span class="arc-wedge">▲ cuñas</span></div>
    <p class="muted">Vista desde la cara A. El cuadro se fabrica ${arcF(r.gLat)} cm más estrecho que el hueco (cuñas en un extremo de la solera y en el contrario de la cumbrera) y las cerchas ${arcF(r.gArco)} cm por debajo del intradós${r.nCorr ? ` más ${arcF(r.tCorr)} cm de correa` : ''}; ese hueco se cierra con calzos finos, sin levantar el arco.</p>`,

  fondo: (a, r) => `
    <div class="arc-fig arc-fig-fondo">${arcSvgFondo(r)}</div>
    <p class="muted">Corte por el eje del arco, mirando de lado. ${r.nf} pórtico${r.nf > 1 ? 's' : ''} de ${r.sec.b} cm de grueso, con ejes a ${r.zs.map(z => arcF(z)).join(', ')} cm de la cara A${r.nf > 1 ? ` (separación ${arcF(r.sep)} cm). Se atan con riostras longitudinales (RL) por la cara interior de los puntales y entre pendolones, y diagonales (RD) en cada lado` : ''}.${r.nCorr ? ' Las correas (CR) van atravesadas sobre las cerchas de todos los pórticos.' : ''}</p>`,

  cortes: (a, r) => {
    const done = a.done || {}, fams = { viga: `Escuadría (${r.sec.nombre})`, tablon: `Cerchas (tablón ${arcF(r.inp.tablonAncho)}×${arcF(r.inp.tablonGrueso)})`, riostra: 'Riostras, atados y correas' };
    let last = '', h = '<p class="muted">Marca cada pieza al cortarla. Escribe su rótulo bien visible (qué es, medida y equipo).</p>';
    r.piezas.forEach(p => {
      if (p.fam !== last) { h += `${last ? '</div>' : ''}<h3 class="sec-title arc-fam">${esc(fams[p.fam])}</h3><div class="list">`; last = p.fam; }
      h += `<label class="check-row arc-cut ${done[p.code] ? 'done' : ''}"><input type="checkbox" ${done[p.code] ? 'checked' : ''} onchange="arcDone('${a.id}', '${esc(p.code)}', this.checked)">
        <span class="grow"><span class="arc-cut-head"><b class="arc-code">${esc(p.code)}</b><b>${esc(p.nombre)}</b><span class="arc-len">${arcF(p.largo, 0)} cm × ${p.cant}</span></span>
          <small>${esc(p.seccion)} · ${esc(p.donde)}</small><small class="arc-cut-how">${esc(p.corte)}</small>
          <span class="arc-label">${esc(p.corto)} ${arcF(p.largo, 0)} cm${a.team ? ' · ' + esc(a.team) : ''}</span></span></label>`;
    });
    h += '</div><h3 class="sec-title arc-fam">Pletinas, cuñas, calzos y clavos</h3>';
    const rows = [...r.pletinas.map(p => [p.code, p.nombre, p.cant, `${p.donde} ${p.clavos} clavos cada una.`]),
      ['W', `Par de cuñas ${r.cunas.medida} cm`, r.cunas.cant, 'Un par bajo cada puntal, uno en un extremo de la solera y otro en el extremo contrario de la cumbrera. Dejar al menos 2,5 cm de sobrante y clavar tras ajustar.'],
      ['Z', 'Calzos o cuñas finas', r.calzos, `Entre ${r.nCorr ? 'correas' : 'cerchas'} e intradós, desde las dos caras. Rellenar todos los huecos, solo hasta contacto firme.`],
      ['', 'Clavos de 6,5 cm', r.nClavos, 'Con un 20 % de margen. Patrones de clavado del manual.']];
    h += `<div class="list">${rows.map(([c, n, q, d]) => `<div class="item arc-extra"><div class="grow"><span class="arc-cut-head"><b class="arc-code">${esc(c)}</b><b>${esc(n)}</b><span class="arc-len">× ${arcF(q, 0)}</span></span><small>${esc(d)}</small></div></div>`).join('')}</div>
      <p class="muted">Contrachapado de 2–3 cm: unos ${r.tableros} tablero${r.tableros === 1 ? '' : 's'} de 250×122 para todas las pletinas.</p>`;
    return h;
  },

  cerchas: (a, r) => `
    <p class="muted">Cada cercha sale de un tablón de ${arcF(r.inp.tablonAncho)} cm: el borde interior es el canto recto del tablón y solo se corta la curva exterior (radio ${arcF(r.Ro)} cm${r.A.tipo === 'apuntado' ? ', dos centros' : ''}). En los extremos queda al menos ⅓ del ancho (${arcF(r.cantoMin)} cm, línea discontinua). Marca las ordenadas desde el canto de arriba y únelas con un listón flexible, o usa una plantilla de cartón presentada en el arco. Corta con motosierra, despacio, siguiendo el trazo.</p>
    ${r.tipos.map(t => { const c = t.ref, cant = r.piezas.find(p => p.code === t.code)?.cant || 0; return `
      <div class="arc-cercha">
        <div><h3 class="sec-title">${ic('wrench')} ${esc(t.code)} · ${cant} piezas</h3>
          <div class="arc-fig">${arcSvgCercha(c, r)}</div>
          <dl class="dl arc-dl"><dt>Largo</dt><dd>${arcF(c.len)} cm (tablón de ${arcF(Math.ceil(c.len + 4), 0)})</dd>
            <dt>Flecha de la curva</dt><dd>${arcF(c.flecha)} cm</dd>
            <dt>Canto en los extremos</dt><dd>${arcF(c.cantoExtremo)} cm (mín. ${arcF(r.cantoMin)})</dd>
            <dt>Corte lado arranque</dt><dd>${arcF(c.cutS)}° fuera de escuadra${c.endS === 'h' ? ' (apoya a nivel)' : ''}</dd>
            <dt>Corte lado clave</dt><dd>${arcF(c.cutK)}° fuera de escuadra${c.endK === 'v' ? ' (a plomo)' : ''}</dd>
            <dt>Esquinas en el canto recto</dt><dd>a ${arcF(c.esquinas.intArr.s)} y ${arcF(c.esquinas.intClave.s)} cm del extremo</dd></dl></div>
        <div><b class="lbl-sm">Ordenadas desde el canto de arriba (cm)</b>
          <table class="ref arc-ord"><tr><th>A lo largo</th><th>Hasta la curva</th></tr>${c.ord.map(o => `<tr><td class="arc-num">${arcF(o.s)}</td><td class="arc-num">${o.ext == null ? '—' : arcF(o.ext)}</td></tr>`).join('')}</table></div>
      </div>`; }).join('')}`,

  plan: (a, r) => `
    <p class="muted">Cómo sacar las piezas de vuestras barras (${arcF(r.inp.stockViga, 0)} cm de viga y ${arcF(r.inp.stockTablon, 0)} cm de tablón y tabla), contando 0,5 cm de corte. Lo rayado es sobrante. Con varios arcos iguales, corta cada pieza de todos a la vez.</p>
    ${r.planes.filter(p => p.bars.length || p.largas.length).map(p => `
      <h3 class="sec-title arc-fam">${esc(p.sec)} · ${p.bars.length} barra${p.bars.length === 1 ? '' : 's'}</h3>
      <div class="arc-bars">${p.bars.map((b, i) => `<div><div class="arc-bar" role="img" aria-label="Barra ${i + 1}: ${b.items.map(it => it.code + ' ' + it.l + ' cm').join(', ')}">${b.items.map(it => `<span style="width:${(it.l / p.stock * 100).toFixed(2)}%">${esc(it.code)} ${it.l}</span>`).join('')}</div>
        <small class="muted">Barra ${i + 1} · sobra ${arcF(Math.max(0, b.rest))} cm</small></div>`).join('')}
        ${p.largas.length ? `<div class="item"><span class="tag bad">No caben</span><span class="grow">${p.largas.map(x => esc(x.code) + ' ' + x.l + ' cm').join(', ')}</span></div>` : ''}</div>`).join('')}`,

  montaje: (a, r) => `
    <ol class="tips arc-steps">
      <li><b>Valorar y organizar.</b> El especialista de estructuras valora el arco (grietas, dovelas desplazadas, clave descendida). Si está dañado, antes un apuntalamiento de emergencia. Equipo de colocación (jefe, medidor y tres apuntaladores) y equipo de corte (jefe, tres cortadores y parquista), con la zona de corte balizada y separada.</li>
      <li><b>Medir dos veces.</b> El medidor toma A–G y las pasa al jefe de corte. Si F no cuadra o el arco está deformado, saca las cerchas con plantilla de cartón o peine copiador.</li>
      <li><b>Cortar y rotular.</b> Con la lista de cortes; cada pieza con su rótulo. Mecaniza los cortes repetidos con escantillón.</li>
      <li><b>Prefabricar las cerchas en el suelo.</b> Dibuja el arco con una cuerda desde el centro de la cumbrera, presenta encima las cerchas, el pendolón y los jabalcones de cercha, clava pletinas de 30×30 en cada junta por las dos caras y la tabla de atado (AT) en los pies.</li>
      <li><b>Solera.</b> Asentada y a nivel, con un par de cuñas en un extremo metidas a la vez con golpes ligeros. En suelo blando, zapatas de tablón bajo cada puntal.</li>
      <li><b>Cuadro.</b> Cumbrera${r.cumbreraDoble ? ' doble' : ''} con sus cuñas en el extremo contrario; primer puntal bajo el lado de las cuñas de la cumbrera, luego el otro${r.nInter ? ' y los intermedios' : ''}, con un par de cuñas debajo de cada uno y a plomo. Tacos (TA) encerrando las cuñas, medias pletinas triangulares en las esquinas y jabalcones de cuadro (J).</li>
      <li><b>Subir las cerchas.</b> Centradas sobre la cumbrera (cara superior a ${arcF(r.yCum)} cm del suelo); clava las medias pletinas de apoyo de las cerchas y del pendolón.</li>
      <li><b>Atar los pórticos.</b> ${r.nf > 1 ? `Los ${r.nf} pórticos, con riostras longitudinales (RL) y diagonales (RD).` : 'Un solo pórtico: arriostra bien y comprueba que no se mueve fuera de su plano.'}</li>
      <li><b>Poner en carga.</b> ${r.nCorr ? 'Coloca las correas sobre las cerchas. ' : ''}Rellena todos los huecos entre cerchas e intradós con calzos desde las dos caras; después aprieta por igual las cuñas de los puntales, clávalas y cierra las medias pletinas. No levantes el arco: solo contacto.</li>
      <li><b>Arriostrar y comprobar.</b> ${r.paso ? 'Sin X para dejar paso: revisa jabalcones y riostras longitudinales' : 'Riostras en X por las dos caras, clavadas a solera, puntales y cumbrera'}${r.Hp > 180 ? '; riostra horizontal a media altura' : ''}. Comprueba con el nivel.</li>
      <li><b>Revisar.</b> Cada 12 horas (en el cambio de turno) y siempre después de una réplica.${arcWs(a) ? '' : ' Si el arco está en un worksite, únelo en «Medidas» y añádelo a la vigilancia.'}</li>
    </ol>
    <table class="ref"><tr><th>Regla</th><th>Fuente</th></tr>${[
      ['Puntales en los extremos con jabalcones; uno intermedio por cada 1,50 m de luz', 'M8 p.7'],
      ['Cerchas: un puntal vertical y dos inclinados desde el centro de la cumbrera; ideal 90° y 45°', 'M8 p.8–10'],
      ['Respetar ⅓ del tablón; borde interior recto y curva exterior', 'M8 p.8'],
      ['Prefabricado 4 cm menor que el hueco; restar 4 cm con cuñas de 5×10', 'MC p.111 · M6 p.20, 68'],
      ['Riostras a compresión ≤ 2,25 m; en X (solo tracción) hasta 3 m', 'M6 p.4'],
      ['Separación máxima entre pórticos 1,2 m; riostra horizontal si el puntal pasa de 1,8 m', 'MC p.93 · M6 p.21'],
      ['Pletina 30×30: 5 clavos al puntal y 8 a la cumbrera; media 15×30: 4 + 4; triangular: 13', 'M6 p.21, 68'],
      [`Referencia: dos puntales de 10×10 ${r.capacidad ? `a esta altura, unos ${arcF(r.capacidad, 0)} kg` : 'hasta 2,4 m, 7.200 kg; 3 m, 4.500 kg; 3,6 m, 3.100 kg'} (no es un cálculo del arco)`, 'M6 p.23 · FEMA']
    ].map(([t, f]) => `<tr><td>${t}</td><td>${f}</td></tr>`).join('')}</table>
    <p class="muted">MC: Manual de Campo USAR 2023. M6 y M8: temas de la UME «Apuntalamientos» y «Técnicas específicas: apuntalamiento de arcos». La app ayuda a medir y cortar; no sustituye al especialista de estructuras.</p>`
};

/* ---------- Mensaje para WhatsApp y hoja de corte ---------- */
function arcText(id) {
  const a = get('arcs', id), r = a && arcCalc(a);
  if (!r || r.error) return '';
  const ws = arcWs(a);
  return [...waHead('🏛️', 'APUNTALAMIENTO DE ARCO', a.name), `${ARC_TIPO[r.A.tipo]} · luz ${arcF(r.inp.Larr)} cm · arranque ${arcF(r.Hmin)} cm · clave ${arcF(r.inp.Hclave)} cm · fondo ${arcF(r.inp.fondo)} cm`,
    `${r.nf} pórticos · ${2 + r.nInter} puntales y ${2 * r.n} cerchas por pórtico${ws ? ` · worksite ${ws.code}` : ''}${a.team ? ` · ${a.team}` : ''}`,
    ...waSec('🪚', 'CORTES (cm)'), ...r.piezas.map(p => `${waB(p.code)} ${p.nombre} · ${p.seccion} · ${p.largo} × ${p.cant}`),
    ...waSec('🔩', 'PLETINAS, CUÑAS Y CLAVOS'), ...r.pletinas.map(p => `${p.code} ${p.nombre} × ${p.cant}`), `W Pares de cuñas ${r.cunas.medida} × ${r.cunas.cant}`, `Z Calzos finos × ${r.calzos}`, `Clavos 6,5 cm ≈ ${r.nClavos}`,
    ...(r.warnings.length ? [...waSec('⚠️', 'AVISOS'), ...r.warnings.map(w => '• ' + w.txt)] : [])].join('\n');
}
function printArc(id) {
  const a = get('arcs', id), r = a && arcCalc(a);
  if (!r || r.error) return;
  $('print').innerHTML = `<div class="arc-print">
    <h1>Apuntalamiento de arco · ${esc(a.name)}</h1>
    <p>${new Date().toLocaleString('es-ES')} · ${ARC_TIPO[r.A.tipo]} · luz ${arcF(r.inp.Larr)} cm · arranque ${arcF(r.Hmin)} cm · clave ${arcF(r.inp.Hclave)} cm · fondo ${arcF(r.inp.fondo)} cm${a.team ? ' · ' + esc(a.team) : ''}</p>
    <div class="arc-print-fig">${arcSvgAlzado(r)}</div>
    <h2>Lista de cortes</h2>
    <table><tr><th></th><th>Código</th><th>Pieza</th><th>Sección</th><th>Largo</th><th>Cant.</th><th>Corte</th><th>Rótulo</th></tr>
      ${r.piezas.map(p => `<tr><td>☐</td><td><b>${esc(p.code)}</b></td><td>${esc(p.nombre)}</td><td>${esc(p.seccion)}</td><td>${p.largo} cm</td><td>${p.cant}</td><td>${esc(p.corte)}</td><td>${esc(p.corto)} ${p.largo} cm${a.team ? ' · ' + esc(a.team) : ''}</td></tr>`).join('')}</table>
    <p>${r.pletinas.map(p => `${p.code} ${esc(p.nombre)} × ${p.cant}`).join(' · ')} · W pares de cuñas ${esc(r.cunas.medida)} × ${r.cunas.cant} · Z calzos × ${r.calzos} · clavos 6,5 cm ≈ ${r.nClavos}</p>
    ${r.tipos.map(t => `<h2>Cercha ${esc(t.code)} · ordenadas desde el canto de arriba</h2>
      <p>Largo ${arcF(t.ref.len)} cm · flecha ${arcF(t.ref.flecha)} cm · cortes ${arcF(t.ref.cutS)}° y ${arcF(t.ref.cutK)}° fuera de escuadra · radio ${arcF(r.Ro)} cm</p>
      <table><tr><th>A lo largo (cm)</th>${t.ref.ord.map(o => `<td>${arcF(o.s)}</td>`).join('')}</tr><tr><th>Hasta la curva (cm)</th>${t.ref.ord.map(o => `<td>${o.ext == null ? '—' : arcF(o.ext)}</td>`).join('')}</tr></table>`).join('')}
    ${r.warnings.length ? `<h2>Avisos</h2><ul>${r.warnings.map(w => `<li>${esc(w.txt)}</li>`).join('')}</ul>` : ''}
    <p>Revisar cada 12 h y siempre después de una réplica.</p></div>`;
  print();
}

/* ---------- Dibujos (SVG en centímetros; colores de los tokens de styles.css) ---------- */
function arcMeasureGuide() {
  const dot = (x, y, l, filled = true) => `<circle cx="${x}" cy="${y}" r="9" fill="${filled ? 'var(--ink)' : 'var(--surface)'}" stroke="var(--ink)" stroke-width="2"/><text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11" font-weight="800" fill="${filled ? 'var(--surface)' : 'var(--ink)'}" font-family="var(--cond)">${l}</text>`;
  const arrow = (x1, y1, x2, y2, dash = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink)" stroke-width="1.4" ${dash ? `stroke-dasharray="${dash}"` : ''} marker-start="url(#arc-mk)" marker-end="url(#arc-mk)"/>`;
  return `<div class="arc-guide">
    <svg viewBox="0 0 330 250" role="img" aria-label="Medidas del arco: A luz en el arranque, B luz a ras de suelo, C y D alturas del arranque, E altura de la clave, F altura a un cuarto de la luz y G fondo">
      <defs><pattern id="arc-hg" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="var(--arc-wall)"/><line x1="0" y1="0" x2="0" y2="8" stroke="var(--arc-wall-line)" stroke-width="2"/></pattern>
        <marker id="arc-mk" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink)"/></marker></defs>
      <path fill-rule="evenodd" fill="url(#arc-hg)" d="M30 20H250V215H30Z M80 215L80 125A60 60 0 0 1 200 125L200 215Z"/>
      <line x1="20" y1="215" x2="310" y2="215" stroke="var(--ink)" stroke-width="2"/>
      <line x1="80" y1="125" x2="200" y2="125" stroke="var(--logo-orange)" stroke-dasharray="4 3"/>
      ${arrow(82, 118, 198, 118)}${dot(140, 107, 'A')}${arrow(82, 206, 198, 206)}${dot(140, 196, 'B')}
      ${arrow(90, 213, 90, 127)}${dot(100, 165, 'C')}${arrow(190, 213, 190, 127)}${dot(180, 165, 'D')}
      ${arrow(140, 213, 140, 67)}${dot(152, 82, 'E')}
      <line x1="110" y1="213" x2="110" y2="74" stroke="var(--ink)" stroke-width="1.4" stroke-dasharray="3 3" marker-end="url(#arc-mk)"/>${dot(110, 64, 'F', false)}
      <line x1="80" y1="225" x2="110" y2="225" stroke="var(--muted)"/><text x="95" y="238" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="var(--sans)">¼ de A</text>
      <g transform="translate(262 70)"><rect width="50" height="70" fill="url(#arc-hg)"/><rect y="22" width="50" height="26" fill="var(--surface)"/>
        ${arrow(25, 2, 25, 68)}${dot(25, 35, 'G')}<text x="25" y="86" text-anchor="middle" font-size="10" fill="var(--muted)" font-family="var(--sans)">fondo (planta)</text></g>
      <text x="205" y="122" font-size="10" fill="var(--logo-orange)" font-family="var(--sans)">arranque</text>
    </svg>
    <dl class="dl arc-dl">${ARC_MEDIDAS.map(([l, , t, d]) => `<dt><b>${l}</b> ${t}</dt><dd>${d}</dd>`).join('')}</dl>
    <p class="muted">El arranque es donde la jamba deja de ser vertical y empieza la curva. Todas las alturas desde el mismo suelo; si no está a nivel, desde una línea de nivel. Medir dos veces, cortar una.</p>
  </div>`;
}

function arcSvgAlzado(r) {
  const { A, sec, inp } = r, Ha = r.Ha, Lw = r.Lw;
  const mX = Math.max(70, Lw * 0.22), top = inp.Hclave + 45, bot = -40, x0 = -Lw / 2 - mX, x1 = Lw / 2 + mX, W = x1 - x0, H = top - bot;
  const fs = Math.max(8, W / 42), sw = Math.max(0.6, W / 500);
  const X = x => (x - x0).toFixed(1), Y = y => (top - y).toFixed(1);
  const P = pts => pts.map((p, i) => (i ? 'L' : 'M') + X(p.x) + ' ' + Y(p.y)).join(' ') + 'Z';
  const wood = `fill="var(--arc-wood)" stroke="var(--arc-wood-dark)" stroke-width="${sw}"`;
  const rect = (xa, ya, xb, yb, extra = wood) => `<rect x="${X(Math.min(xa, xb))}" y="${Y(Math.max(ya, yb))}" width="${Math.abs(xb - xa).toFixed(1)}" height="${Math.abs(yb - ya).toFixed(1)}" ${extra}/>`;
  const bar = (p1, p2, w) => { const ang = Math.atan2(p2.y - p1.y, p2.x - p1.x), nx = -Math.sin(ang) * w / 2, ny = Math.cos(ang) * w / 2;
    return `<path d="${P([{ x: p1.x + nx, y: p1.y + ny }, { x: p2.x + nx, y: p2.y + ny }, { x: p2.x - nx, y: p2.y - ny }, { x: p1.x - nx, y: p1.y - ny }])}" ${wood}/>`; };
  const left = []; for (let i = 0; i <= 60; i++) { const g = A.phiS - A.span * i / 60; left.push({ x: A.cx + A.R * Math.cos(g), y: Ha + A.cy + A.R * Math.sin(g) }); }
  const right = left.slice().reverse().map(p => ({ x: -p.x, y: p.y }));
  const Ls = inp.Lsuelo || inp.Larr, open = [{ x: -Ls / 2, y: 0 }, { x: -inp.Larr / 2, y: Ha }, ...left, ...right, { x: inp.Larr / 2, y: Ha }, { x: Ls / 2, y: 0 }];
  const a = sec.a, ts = sec.ts, gw = r.gapW, yC = r.yCum, tcT = r.tcTot, xL = -r.lCumb / 2, xR = r.lCumb / 2, yTop = yC - tcT;
  const labels = [];
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Alzado del apuntalamiento: solera, puntales, cumbrera, pendolón, jabalcones y cerchas" font-family="var(--sans)">
    <defs><pattern id="arc-hw" width="${fs}" height="${fs}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${fs}" height="${fs}" fill="var(--arc-wall)"/><line x1="0" y1="0" x2="0" y2="${fs}" stroke="var(--arc-wall-line)" stroke-width="${sw * 1.5}"/></pattern>
    <marker id="arc-am" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink)"/></marker></defs>
    <path fill-rule="evenodd" fill="url(#arc-hw)" d="M${X(x0 + 8)} ${Y(0)}L${X(x0 + 8)} ${Y(inp.Hclave + 40)}L${X(x1 - 8)} ${Y(inp.Hclave + 40)}L${X(x1 - 8)} ${Y(0)}Z ${P(open)}"/>
    <line x1="0" y1="${Y(0)}" x2="${W.toFixed(0)}" y2="${Y(0)}" stroke="var(--ink)" stroke-width="${sw * 3}"/>
    <path d="${P(open)}" fill="none" stroke="var(--ink)" stroke-width="${sw * 1.6}"/>
    <line x1="${X(-inp.Larr / 2)}" y1="${Y(Ha)}" x2="${X(inp.Larr / 2)}" y2="${Y(Ha)}" stroke="var(--logo-orange)" stroke-width="${sw}" stroke-dasharray="${fs * .6} ${fs * .4}"/>`;
  // Riostras en X (detrás), por vanos si la diagonal entera pasa de 3 m
  if (!r.paso) {
    const vanos = r.piezas.find(p => p.code === 'RX' && /vanos/.test(p.nombre)), xs = vanos ? r.xPosts.map((x, i, l) => i === 0 ? xL : i === l.length - 1 ? xR : x) : [xL, xR];
    const br = (xa, xb, op) => `<line x1="${X(xa)}" y1="${Y(ts / 2)}" x2="${X(xb)}" y2="${Y(yC - tcT / 2)}" stroke="var(--arc-wood-dark)" stroke-opacity="${op}" stroke-width="12"/>`;
    for (let i = 0; i < xs.length - 1; i++) s += br(xs[i], xs[i + 1], .35) + br(xs[i + 1], xs[i], .55);
    labels.push(['RX', xL + (xs[1] - xL) * 0.42, (yC + ts) * 0.33]);
  }
  if (r.Hp > 180) { const yh = ts + gw + r.Hp / 2; s += rect(xL, yh - 7, xR, yh + 7, `fill="var(--arc-wood-light)" stroke="var(--arc-wood-dark)" stroke-width="${sw}"`); labels.push(['RH', xR - r.lCumb * 0.22, yh]); }
  s += rect(-r.lSol / 2, 0, r.lSol / 2, ts);
  r.xPosts.forEach(px => {
    s += `<path d="M${X(px - a / 2 - 6)} ${Y(ts)}L${X(px + a / 2 + 6)} ${Y(ts)}L${X(px + a / 2 + 6)} ${Y(ts + gw * .45)}Z" fill="var(--arc-wedge)" stroke="var(--arc-wood-dark)" stroke-width="${sw}"/>
      <path d="M${X(px - a / 2 - 6)} ${Y(ts + gw * .45)}L${X(px + a / 2 + 6)} ${Y(ts + gw)}L${X(px - a / 2 - 6)} ${Y(ts + gw)}Z" fill="var(--arc-wedge)" stroke="var(--arc-wood-dark)" stroke-width="${sw}"/>`;
    s += rect(px - a / 2, ts + gw, px + a / 2, yTop);
  });
  s += rect(xL + a, ts, xL + a + 15, ts + 10) + rect(xR - a - 15, ts, xR - a, ts + 10);   // tacos
  const d = r.kneeD;
  s += bar({ x: xL + a, y: yTop - d }, { x: xL + a + d, y: yTop }, a) + bar({ x: xR - a, y: yTop - d }, { x: xR - a - d, y: yTop }, a);
  labels.push(['J', xR - a - d * .5 - 12, yTop - d * .5 - 10]);
  s += rect(xL, yTop, xR, yC);
  if (r.cumbreraDoble) s += `<line x1="${X(xL)}" y1="${Y(yC - tcT / 2)}" x2="${X(xR)}" y2="${Y(yC - tcT / 2)}" stroke="var(--arc-wood-dark)" stroke-width="${sw}"/>`;
  const yIc = Ha + r.yIc;
  s += rect(-a / 2, yC, a / 2, yIc);
  r.jab.forEach(j => [1, -1].forEach(m => { s += bar({ x: m * j.F.x, y: Ha + j.F.y }, { x: m * j.P.x, y: Ha + j.P.y }, a); }));
  s += rect(-r.footSpan / 2 - 10, yC + 1, r.footSpan / 2 + 10, yC + 16, `fill="var(--arc-wood-light)" stroke="var(--arc-wood-dark)" stroke-width="${sw}"`);
  labels.push(['AT', r.footSpan / 2 + 8, yC + 8.5]);
  r.camones.forEach(c => [1, -1].forEach(m => { s += `<path d="${P(c.poly.map(p => ({ x: m * p.x, y: Ha + p.y })))}" fill="var(--arc-wood-light)" stroke="var(--arc-wood-dark)" stroke-width="${sw * 1.4}"/>`; }));
  if (r.nCorr) {
    const ro = r.Ro, tC = r.tCorr, wC = inp.anchoCorrea || 15;
    const at = (g, m) => { const cx = A.cx + (ro + tC / 2) * Math.cos(g), cy = A.cy + (ro + tC / 2) * Math.sin(g), t = g - Math.PI / 2;
      const ux = Math.cos(t) * wC / 2, uy = Math.sin(t) * wC / 2, nx = Math.cos(g) * tC / 2, ny = Math.sin(g) * tC / 2;
      return [{ x: m * (cx + ux + nx), y: Ha + cy + uy + ny }, { x: m * (cx - ux + nx), y: Ha + cy - uy + ny }, { x: m * (cx - ux - nx), y: Ha + cy - uy - ny }, { x: m * (cx + ux - nx), y: Ha + cy + uy - ny }]; };
    for (let i = 1; i <= 2 * r.n - 1; i++) { const g = A.phiS - (r.th / 2) * i; s += `<path d="${P(at(g, 1))}" fill="var(--arc-wood-dark)"/><path d="${P(at(g, -1))}" fill="var(--arc-wood-dark)"/>`; }
    const yk = ARCO.yAt(A, ro + tC, -1e-4); if (Number.isFinite(yk)) s += rect(-wC / 2, Ha + yk - tC, wC / 2, Ha + yk, 'fill="var(--arc-wood-dark)"');
    labels.push(['CR', left[18].x + 22, left[18].y - 4]);
  }
  labels.push(['S', -r.lSol / 4, ts / 2], ['P', xL + a / 2, ts + gw + r.Hp * .28], ['TA', xL + a + 30, ts + 5], ['C', xL + r.lCumb * .3, yC - tcT / 2], ['PD', 0, yC + (yIc - yC) * .55]);
  r.xPosts.slice(1, -1).forEach((x, i) => labels.push(['PI', x, ts + gw + r.Hp * (.16 + .1 * (i % 2))]));
  r.jab.forEach((j, i) => labels.push(['JC' + (i + 1), j.F.x + (j.P.x - j.F.x) * .55, Ha + j.F.y + (j.P.y - j.F.y) * .55]));
  r.camones.forEach(c => { const g = (c.a1 + c.a2) / 2, rr = r.Ro - c.W * .45; labels.push([c.code, A.cx + rr * Math.cos(g), Ha + A.cy + rr * Math.sin(g)]); });
  labels.forEach(([t, x, y]) => { const w = fs * (.75 + .55 * t.length), h = fs * 1.35;
    s += `<rect x="${(+X(x) - w / 2).toFixed(1)}" y="${(+Y(y) - h / 2).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${(fs * .3).toFixed(1)}" fill="var(--ink)"/>
      <text x="${X(x)}" y="${(+Y(y) + fs * .38).toFixed(1)}" text-anchor="middle" font-size="${fs.toFixed(1)}" font-weight="800" fill="var(--surface)" font-family="var(--cond)">${esc(t)}</text>`; });
  const dim = (xa, ya, xb, yb, txt, vertical) => {
    const mx = (+X(xa) + +X(xb)) / 2, my = (+Y(ya) + +Y(yb)) / 2;
    return `<line x1="${X(xa)}" y1="${Y(ya)}" x2="${X(xb)}" y2="${Y(yb)}" stroke="var(--ink)" stroke-width="${sw}" marker-start="url(#arc-am)" marker-end="url(#arc-am)"/>
      <text ${vertical ? `transform="translate(${(mx - fs * .45).toFixed(1)} ${my.toFixed(1)}) rotate(-90)"` : `x="${mx.toFixed(1)}" y="${(my - fs * .4).toFixed(1)}"`} text-anchor="middle" font-size="${(fs * .95).toFixed(1)}" font-weight="700" fill="var(--ink)" font-family="var(--num)" paint-order="stroke" stroke="var(--surface)" stroke-width="${(fs * .35).toFixed(1)}">${txt}</text>`; };
  s += dim(-r.lSol / 2, -fs * 1.6, r.lSol / 2, -fs * 1.6, `solera y cumbrera ${arcF(r.lSol, 0)}`);
  s += dim(xR + fs * 1.4, ts + gw, xR + fs * 1.4, yTop, `puntal ${arcF(r.Hp, 0)}`, true);
  s += dim(x0 + mX * .45, 0, x0 + mX * .45, r.Hmin, `arranque ${arcF(r.Hmin)}`, true);
  s += dim(x0 + mX * .75, 0, x0 + mX * .75, inp.Hclave, `clave ${arcF(inp.Hclave)}`, true);
  return s + '</svg>';
}

function arcSvgFondo(r) {
  const { inp, sec } = r, e = r.e, Ha = r.Ha, m = Math.max(40, e * .35), top = inp.Hclave + 40, bot = -30;
  const z0 = -m, W = e + 2 * m, H = top - bot, fs = Math.max(7, Math.max(W, H * .6) / 40), sw = Math.max(.5, W / 500);
  const X = z => (z - z0).toFixed(1), Y = y => (top - y).toFixed(1);
  const wood = `fill="var(--arc-wood)" stroke="var(--arc-wood-dark)" stroke-width="${sw}"`;
  const R = (za, ya, zb, yb, f = wood) => `<rect x="${X(Math.min(za, zb))}" y="${Y(Math.max(ya, yb))}" width="${Math.abs(zb - za).toFixed(1)}" height="${Math.abs(yb - ya).toFixed(1)}" ${f}/>`;
  const b = sec.b, ts = sec.ts, gw = r.gapW, yC = r.yCum, tcT = r.tcTot;
  const yIn = Ha + r.yIc, yOk = ARCO.yAt(r.A, r.Ro, -1e-4), yOut = Number.isFinite(yOk) ? Ha + yOk : yIn + 10;
  let s = `<svg viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" role="img" aria-label="Corte por el eje del arco: pórticos a lo largo del fondo" font-family="var(--sans)">
    <defs><pattern id="arc-hw2" width="${fs}" height="${fs}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="${fs}" height="${fs}" fill="var(--arc-wall)"/><line x1="0" y1="0" x2="0" y2="${fs}" stroke="var(--arc-wall-line)" stroke-width="${sw * 1.5}"/></pattern>
    <marker id="arc-am2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink)"/></marker></defs>
    <rect x="${X(0)}" y="${Y(top)}" width="${e}" height="${(top - inp.Hclave).toFixed(1)}" fill="url(#arc-hw2)" stroke="var(--ink)" stroke-width="${sw * 1.5}"/>
    <line x1="0" y1="${Y(0)}" x2="${W.toFixed(0)}" y2="${Y(0)}" stroke="var(--ink)" stroke-width="${sw * 3}"/>`;
  r.zs.forEach(z => {
    s += R(z - b / 2, 0, z + b / 2, ts);
    if (r.nInter % 2 === 1) s += R(z - b / 2 - 4, ts, z + b / 2 + 4, ts + gw, `fill="var(--arc-wedge)" stroke="var(--arc-wood-dark)" stroke-width="${sw}"`) + R(z - b / 2, ts + gw, z + b / 2, yC - tcT);
    s += R(z - b / 2, yC - tcT, z + b / 2, yC) + R(z - b / 2, yC, z + b / 2, yIn);
    s += R(z - inp.tablonGrueso / 2, yIn, z + inp.tablonGrueso / 2, yOut, `fill="var(--arc-wood-light)" stroke="var(--arc-wood-dark)" stroke-width="${sw * 1.3}"`);
  });
  if (r.nCorr) s += R(1, yOut, e - 1, yOut + r.tCorr, 'fill="var(--arc-wood-dark)"');
  if (r.nf >= 2) { const yt = (yC + yIn) / 2; s += R(2, yt - 7, e - 2, yt + 7, `fill="var(--arc-wood-light)" stroke="var(--arc-wood-dark)" stroke-width="${sw}"`); }
  const yc0 = r.nCorr ? yOut + r.tCorr : yOut;
  [3, e - 3].forEach(z => { s += `<path d="M${X(z - 3)} ${Y(yc0)}L${X(z + 3)} ${Y(yc0)}L${X(z)} ${Y(inp.Hclave)}Z" fill="var(--arc-wedge)" stroke="var(--arc-wood-dark)" stroke-width="${sw}"/>`; });
  const lab = (t, y) => { const zl = r.zs[r.zs.length - 1] + b / 2 + 4;
    return `<line x1="${X(zl)}" y1="${Y(y)}" x2="${X(zl + m * .35)}" y2="${Y(y)}" stroke="var(--muted)" stroke-width="${sw}"/><text x="${X(zl + m * .38)}" y="${(+Y(y) + fs * .35).toFixed(1)}" font-size="${fs.toFixed(1)}" font-weight="800" font-family="var(--cond)" fill="var(--ink)">${t}</text>`; };
  s += lab('S', ts / 2) + (r.nInter % 2 === 1 ? lab('PI', ts + gw + (yC - tcT - ts - gw) * .3) : '') + lab('C', yC - tcT / 2) + lab('PD', yC + (yIn - yC) * .3) + lab('CE', (yIn + yOut) / 2 - fs * .6)
    + (r.nCorr ? lab('CR', yOut + r.tCorr + fs * .7) : '') + (r.nf >= 2 ? lab('RL', (yC + yIn) / 2) : '');
  s += `<line x1="${X(0)}" y1="${Y(-fs * 1.4)}" x2="${X(e)}" y2="${Y(-fs * 1.4)}" stroke="var(--ink)" stroke-width="${sw}" marker-start="url(#arc-am2)" marker-end="url(#arc-am2)"/>
    <text x="${X(e / 2)}" y="${(+Y(-fs * 1.4) - fs * .4).toFixed(1)}" text-anchor="middle" font-size="${fs.toFixed(1)}" font-weight="700" font-family="var(--num)" fill="var(--ink)">fondo ${arcF(e)}</text>
    <text x="${X(-m * .1)}" y="${Y(inp.Hclave + 18)}" text-anchor="end" font-size="${(fs * .9).toFixed(1)}" fill="var(--muted)">cara A</text><text x="${X(e + m * .1)}" y="${Y(inp.Hclave + 18)}" font-size="${(fs * .9).toFixed(1)}" fill="var(--muted)">cara B</text>`;
  return s + '</svg>';
}

function arcSvgCercha(c, r) {
  const Wb = r.inp.tablonAncho, len = c.len, mg = 2, Lb = len + 2 * mg, pad = 6, W = Lb + 2 * pad, H = Wb + 2 * pad;
  const X = s => (pad + mg + s).toFixed(2), Y = t => (pad + t).toFixed(2);
  const pts = c.O.concat([c.esquinas.intClave, c.esquinas.intArr]);
  return `<svg viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" role="img" aria-label="Trazado de la cercha ${esc(c.code)} sobre el tablón: curva arriba y canto recto abajo">
    <rect x="${pad}" y="${pad}" width="${Lb.toFixed(1)}" height="${Wb}" fill="var(--sunk)" stroke="var(--ink)" stroke-width=".4"/>
    <path d="${pts.map((p, i) => (i ? 'L' : 'M') + X(p.s) + ' ' + Y(p.t)).join(' ')}Z" fill="var(--arc-wood-light)" stroke="var(--arc-wood-dark)" stroke-width=".5"/>
    ${c.ord.filter(o => o.ext != null).map(o => `<line x1="${X(o.s)}" y1="${Y(0)}" x2="${X(o.s)}" y2="${Y(o.ext)}" stroke="var(--logo-orange)" stroke-width=".4"/>`).join('')}
    <line x1="${X(-mg)}" y1="${Y(Wb * 2 / 3)}" x2="${X(len + mg)}" y2="${Y(Wb * 2 / 3)}" stroke="var(--muted)" stroke-width=".3" stroke-dasharray="2 1.5"/>
  </svg>`;
}
