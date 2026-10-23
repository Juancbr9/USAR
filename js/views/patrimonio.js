'use strict';
// USAR 242 · Salvaguarda de bienes culturales (BIC): evacuar o proteger in situ el patrimonio de un inmueble
// ante incendio, erupción volcánica, inundación, terremoto… Flujo ICCROM-UNESCO: documentar → embalar → trasladar → depósito,
// con prioridad por valor, riesgo y facilidad de traslado, y cadena de custodia de cada bien.

/* ==================== DATOS ==================== */
const PHASES_BIC = [
  { id: 'b-activacion', name: 'Activación y salida', short: 'Salida', checks: [
    'Personal asignado a documentación, embalaje, traslado y depósito',
    'Vehículo de carga y conductor',
    'Material de embalaje: papel sin ácido, film de burbujas, mantas, cajas, cinchas, etiquetas y rotuladores',
    'Guantes de nitrilo y algodón; linternas; móvil o cámara cargados',
    'Contacto con el responsable del bien'] },
  { id: 'b-informacion', name: 'Información y responsable del bien', short: 'Información', checks: [
    'Responsable del bien (párroco, conservador) y técnico de patrimonio localizados',
    'Inventario o plan de salvaguarda existente',
    'Prioridades marcadas por el responsable',
    'Llaves, alarmas y accesos',
    'Tiempo disponible ante la amenaza'] },
  { id: 'b-evaluacion', name: 'Evaluación del inmueble y de la amenaza', short: 'Evaluación', checks: [
    'Estado estructural: cubiertas, arcos, bóvedas y columnas',
    'Avance de la amenaza (lava, fuego, agua, ceniza) y ruta de salida',
    'Bienes identificados por zonas',
    'Decisión por bien: evacuar, proteger in situ o dejar'] },
  { id: 'b-organizacion', name: 'Organización de la zona', short: 'Organización', checks: [
    'Puesto de documentación junto a la salida',
    'Zona de embalaje protegida',
    'Ruta de evacuación de bienes despejada y balizada',
    'Depósito temporal preparado: seco, seguro y vigilado',
    'Control de accesos al inmueble y recuento'] },
  { id: 'b-evacuacion', name: 'Evacuación de bienes', short: 'Evacuación', checks: [
    'Por prioridad: primero los P1',
    'Cada bien numerado y fotografiado antes de moverlo',
    'Manipulación con guantes; piezas grandes entre dos o más',
    'Embalado y etiquetado con su número',
    'Registro de salida y de quién lo lleva'] },
  { id: 'b-insitu', name: 'Protección in situ y estabilización', short: 'In situ', checks: [
    'Retablos y elementos fijos cubiertos',
    'Arcos apuntalados y columnas estabilizadas si hace falta',
    'Agua, ceniza o escombro retirados; sacos terreros',
    'Suministros cortados'] },
  { id: 'b-cierre', name: 'Entrega y cierre', short: 'Cierre', checks: [
    'Recepción en el depósito comprobada bien a bien',
    'Acta de entrega firmada',
    'Recuento de personal y material',
    'Informe y lecciones aprendidas'] }
];
const phasesFor = m => m?.scope === 'bic' ? PHASES_BIC : PHASES;

const THREATS = ['Incendio', 'Erupción volcánica (lava)', 'Ceniza volcánica', 'Inundación', 'Terremoto', 'Temporal / viento', 'Derrumbe'];
const HER_TYPES = ['Pintura (lienzo o tabla)', 'Escultura / imagen', 'Orfebrería', 'Textil / ornamentos', 'Libros y documentos', 'Mobiliario', 'Retablo / elemento fijo', 'Otro'];
// Recorrido de cada bien: de su sitio al depósito temporal
const HER_FLOW = [
  ['pendiente', 'Pendiente', 'warn'], ['documentado', 'Documentado', 'info'], ['embalado', 'Embalado', 'info'],
  ['traslado', 'En traslado', 'bad'], ['deposito', 'En depósito', 'ok']
];
const HER_OTHER = { insitu: ['Protegido in situ', 'ok'], dejado: ['No se evacua', 'neutral'] };
const herStatus = s => (HER_FLOW.find(f => f[0] === s) || [s, ...(HER_OTHER[s] || [s, 'neutral'])]).slice(1);
const LEVEL3 = [['3', 'Alto'], ['2', 'Medio'], ['1', 'Bajo']];
const MOVE = [['facil', 'Sí, a mano'], ['medios', 'Sí, con medios o desmontando'], ['no', 'No se puede mover']];

// Prioridad: valor + riesgo ante esta amenaza; si no se puede mover, se protege donde está
function herPriority(h) {
  if (h.move === 'no') return 'IS';
  if (!h.val || !h.risk) return '';
  const s = +h.val + +h.risk - (h.move === 'medios' ? 1 : 0);
  return s >= 5 ? 'P1' : s >= 4 ? 'P2' : 'P3';
}
const PRIO = { P1: ['P1 · primero', 'bad'], P2: ['P2', 'warn'], P3: ['P3', 'info'], IS: ['Proteger in situ', 'neutral'] };
const prioTag = p => p ? `<span class="tag ${PRIO[p][1]}">${PRIO[p][0]}</span>` : '<span class="tag neutral">Sin prioridad</span>';

// Cómo coger y embalar cada tipo de bien
const HANDLING = {
  'Pintura (lienzo o tabla)': 'Entre dos, por el marco y por los lados, con la pintura hacia dentro. Nunca tocar la capa pictórica ni enrollar. Embalar cara con cara o con cartón rígido y papel sin ácido; sin cinta sobre el marco dorado.',
  'Escultura / imagen': 'Por la base y la zona más sólida del cuerpo, nunca por brazos, manos, coronas o potencias. Retirar antes las piezas sueltas y embalarlas aparte con el mismo número. Acolchar con mantas y cinchar de pie.',
  'Orfebrería': 'Guantes de nitrilo (el sudor mancha la plata). Una pieza cada vez, envuelta en papel sin ácido y caja acolchada. Contar las piezas al cerrar la caja.',
  'Textil / ornamentos': 'Planos o con el menor número de pliegues, con papel sin ácido entre capas. Si están mojados, no apilarlos.',
  'Libros y documentos': 'De pie o planos en cajas, sin apretar. Si están mojados: no abrir ni separar hojas; bolsa y frío (congelar en 48 h).',
  'Mobiliario': 'Vaciar cajones y retirar llaves y piezas sueltas. Por la estructura, nunca por molduras o tallas. Proteger esquinas.',
  'Retablo / elemento fijo': 'Normalmente no se evacua: cubrir con lámina o manta (ignífuga si hay fuego), proteger de agua y ceniza, apuntalar si hay riesgo.',
  'Otro': 'Coger por la parte más sólida, con guantes, de uno en uno y sin prisa.'
};

const heritageOf = mid => list('heritage').filter(h => h.mission === mid).sort((a, b) =>
  ({ P1: 0, P2: 1, P3: 2, IS: 3, '': 4 }[a.p || ''] - { P1: 0, P2: 1, P3: 2, IS: 3, '': 4 }[b.p || '']) || a.n - b.n);
const herCode = h => 'BC-' + String(parseInt(h.n) || 0).padStart(3, '0');

/* ==================== PESTAÑA PATRIMONIO ==================== */
function tabPatrimonio(m) {
  const b = m.bic || {}, hs = heritageOf(m.id);
  const f = (k, v) => `<dt>${k}</dt><dd>${v || '<span class="dim">—</span>'}</dd>`;
  const left = b.eta ? new Date(b.eta).getTime() - Date.now() : null;
  const count = s => hs.filter(h => h.status === s).length;
  const filter = prefs.herFilter || 'todos';
  const shown = filter === 'todos' ? hs : hs.filter(h => h.status === filter);
  return `
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('landmark')} Inmueble y amenaza</h3>
        <button class="btn btn-g btn-sm" onclick="bicForm('${m.id}')">${ic('pencil')} Editar</button></div>
      ${left != null ? `<div class="callout ${left < 30 * 6e4 ? 'bad' : ''}"><b class="num" data-until="${new Date(b.eta).getTime()}">${fmtDur(Math.max(0, left))}</b><span>de tiempo disponible antes de que llegue la amenaza (${esc(b.threat || '')}). Prioriza los P1.</span></div>` : ''}
      <dl class="dl">
        ${f('Inmueble', esc(b.building))}${f('Protección', esc(b.protection))}${f('Amenaza', esc(b.threat))}
        ${f('Responsable del bien', esc(b.owner))}${f('Técnico de patrimonio', esc(b.expert))}
        ${f('Inventario previo', esc(b.plan))}${f('Llaves y alarmas', esc(b.keys))}
        ${f('Ruta de salida', esc(b.route))}${f('Depósito temporal', esc(b.depot))}${f('Recibe en depósito', esc(b.depotContact))}
      </dl>
      <p class="muted">El responsable del bien o un técnico de patrimonio deben estar desde el principio: ellos marcan qué es lo más valioso.</p>
    </div>

    <div class="flow">${HER_FLOW.map(([k, l]) => `<button class="flow-step ${filter === k ? 'on' : ''}" onclick="setPref({ herFilter: '${filter === k ? 'todos' : k}' })"><b class="num">${count(k)}</b><small>${l}</small></button>`).join('')}
      <button class="flow-step ${filter === 'insitu' ? 'on' : ''}" onclick="setPref({ herFilter: '${filter === 'insitu' ? 'todos' : 'insitu'}' })"><b class="num">${count('insitu')}</b><small>In situ</small></button></div>

    <div class="panel">
      <div class="between wrap-row sec-head"><div><h3 class="sec-title" style="margin:0">${ic('package')} Bienes (${hs.length})</h3>
        </div>
        <button class="btn btn-a" onclick="heritageForm('${m.id}')">${ic('plus')} Bien</button></div>
      ${filter !== 'todos' ? `<p class="muted" style="margin-bottom:8px">Filtro: ${herStatus(filter)[0]} · <button class="link" onclick="setPref({ herFilter: 'todos' })">ver todos</button></p>` : ''}
      ${shown.length ? `<div class="list">${shown.map(heritageRow).join('')}</div>`
        : '<p class="muted">Registra cada bien con su ubicación y una foto antes de moverlo. Recibe un número (BC-001) que va en la etiqueta del embalaje.</p>'}
      ${hs.length ? `<div class="row" style="margin-top:12px">
        <button class="btn btn-g btn-sm" onclick="shareText(heritageSummary(mget('${m.id}')), 'Estado de la salvaguarda')">${ic('share', 'i-sm')} Enviar estado</button>
        <button class="btn btn-g btn-sm" onclick="printHandover('${m.id}')">${ic('printer', 'i-sm')} Acta de entrega al depósito</button>
        <button class="btn btn-g btn-sm" onclick="printHeritageLabels('${m.id}')">${ic('printer', 'i-sm')} Etiquetas</button></div>` : ''}
    </div>`;
}

function heritageRow(h) {
  const [label, cls] = herStatus(h.status);
  return `
    <button class="item her ${h.p === 'P1' && h.status === 'pendiente' ? 'over' : ''}" onclick="heritageDetail('${h.id}')">
      ${h.photo ? `<img class="thumb sm" src="${esc(h.photo)}" alt="">` : `<span class="her-code">${herCode(h)}</span>`}
      <div class="grow"><b>${esc(h.name)}</b><small>${h.photo ? herCode(h) + ' · ' : ''}${esc([h.type, h.place].filter(Boolean).join(' · '))}</small>
        <div class="row" style="gap:6px; margin-top:4px">${prioTag(h.p)}<span class="tag ${cls}">${label}</span>${h.box ? `<span class="tag neutral">${esc(h.box)}</span>` : ''}</div></div>
    </button>`;
}

function bicForm(mid) {
  const m = mget(mid), b = m.bic || {};
  openForm('Inmueble y amenaza', [
    { k: 'building', label: 'Inmueble', value: b.building, wide: true, placeholder: 'Ej: Iglesia de Santa Ana, Garachico' },
    { k: 'protection', label: 'Protección', value: b.protection, catalog: 'protection' },
    { k: 'threat', label: 'Amenaza', value: b.threat, catalog: 'threats' },
    { k: 'eta', label: 'La amenaza llega (aprox.)', type: 'datetime-local', value: b.eta },
    { k: 'owner', label: 'Responsable del bien y contacto', value: b.owner, wide: true, placeholder: 'Ej: Párroco, 600 000 000' },
    { k: 'expert', label: 'Técnico de patrimonio', value: b.expert, wide: true, placeholder: 'Ej: Técnico del Cabildo, restaurador' },
    { k: 'plan', label: 'Inventario o plan de salvaguarda previo', value: b.plan, wide: true, placeholder: 'Ej: Sí, inventario del Obispado con prioridades' },
    { k: 'keys', label: 'Llaves, alarmas y accesos', value: b.keys, wide: true },
    { k: 'route', label: 'Ruta de salida de los bienes', value: b.route, wide: true, placeholder: 'Ej: Puerta lateral → plaza → camión' },
    { k: 'depot', label: 'Depósito temporal', value: b.depot, wide: true, placeholder: 'Ej: Casa de la Cultura de Icod, sala 2' },
    { k: 'depotContact', label: 'Quién recibe en el depósito', value: b.depotContact, wide: true }
  ], v => saveMission(m, { bic: v }, 'inmueble y amenaza actualizados'));
}

function heritageForm(mid, id) {
  const h = get('heritage', id) || { status: 'pendiente', move: 'facil' };
  openForm(id ? `Editar ${herCode(h)}` : 'Nuevo bien', [
    { k: 'name', label: 'Bien', value: h.name, required: true, wide: true, placeholder: 'Ej: Imagen de Santa Ana, cáliz de plata, libro de bautismos' },
    { k: 'type', label: 'Tipo', value: h.type, catalog: 'herTypes', required: true, carry: 'herType' },
    { k: 'place', label: 'Dónde está', value: h.place, placeholder: 'Ej: Altar mayor, capilla lado 2', carry: 'herPlace' },
    { k: 'size', label: 'Medidas aprox.', value: h.size, placeholder: '120 × 80 cm' },
    { k: 'weight', label: 'Peso aprox. (kg)', type: 'number', value: h.weight },
    { k: 'people', label: 'Personas para moverlo', type: 'number', value: h.people || 1 },
    { k: 'val', label: 'Valor (lo dice el responsable)', value: h.val, options: [['', '—'], ...LEVEL3] },
    { k: 'risk', label: 'Riesgo ante esta amenaza', value: h.risk, options: [['', '—'], ...LEVEL3] },
    { k: 'move', label: '¿Se puede mover?', value: h.move, options: MOVE, wide: true },
    { k: 'condition', label: 'Estado de conservación y fragilidad', value: h.condition, wide: true, placeholder: 'Ej: Policromía que se levanta en la base' },
    { k: 'notes', label: 'Notas', type: 'textarea', rows: 2, value: h.notes, wide: true },
    { k: 'photo', label: 'Foto antes de moverlo', type: 'photo', value: h.photo, wide: true }
  ], v => {
    const all = list('heritage').filter(x => x.mission === mid);
    const rec = { ...(h.id ? h : { id: uid('BC'), mission: mid, status: 'pendiente', n: 1 + all.reduce((mx, x) => Math.max(mx, x.n || 0), 0), custody: [] }), ...v,
      weight: parseFloat(v.weight) || '', people: parseInt(v.people) || 1 };
    rec.p = herPriority(rec);
    put('heritage', rec, `${mget(mid).title}: bien ${herCode(rec)} ${id ? 'editado' : 'registrado'}`);
    if (!id) addEntry(mid, null, `Bien ${herCode(rec)} registrado: ${rec.name}${rec.p ? ' (' + PRIO[rec.p][0] + ')' : ''}`);
    heritageDetail(rec.id);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="if (confirm('¿Eliminar este bien del inventario?')) { remove('heritage', '${id}', 'Bien eliminado'); closeModal(); }">${ic('trash')} Eliminar</button>` : '');
}

function heritageDetail(id) {
  const h = get('heritage', id);
  if (!h) return closeModal();
  const m = mget(h.mission), [label, cls] = herStatus(h.status);
  const i = HER_FLOW.findIndex(f => f[0] === h.status);
  const next = i >= 0 && i < HER_FLOW.length - 1 ? HER_FLOW[i + 1] : null;
  const step = {
    documentado: ['Documentado', 'Número, foto y ficha hechos'],
    embalado: ['Embalado', 'Con su número en la etiqueta'],
    traslado: ['Sale hacia el depósito', 'Anota quién lo lleva'],
    deposito: ['Recibido en el depósito', 'Comprobado por quien lo recibe']
  };
  const f = (k, v) => v || v === 0 ? `<dt>${k}</dt><dd>${v}</dd>` : '';
  openModal(`${herCode(h)} · ${h.name}`, `
    ${h.photo ? `<img class="photo" src="${esc(h.photo)}" alt="">` : ''}
    <div class="row" style="gap:6px; margin-bottom:10px">${prioTag(h.p)}<span class="tag ${cls}">${label}</span></div>
    <dl class="dl">
      ${f('Tipo', esc(h.type))}${f('Dónde estaba', esc(h.place))}${f('Medidas', esc(h.size))}${f('Peso', h.weight ? esc(h.weight) + ' kg' : '')}
      ${f('Lo mueven', h.people > 1 ? `${h.people} personas` : '')}${f('Estado', esc(h.condition))}${f('Caja / bulto', esc(h.box))}
      ${f('Medidas in situ', esc(h.insitu))}${f('Notas', esc(h.notes))}
    </dl>
    <div class="well" style="margin-bottom:12px"><b>Cómo cogerlo y embalarlo</b><p class="muted" style="margin-top:4px">${esc(HANDLING[h.type] || HANDLING.Otro)}</p></div>
    ${(h.custody || []).length ? `<h3 class="sub">Cadena de custodia</h3><ol class="custody">${h.custody.map(c => `<li><b>${esc(herStatus(c.status)[0])}</b> · ${fmtWhen(c.ts)} · ${esc(c.by)}${c.note ? ' · ' + esc(c.note) : ''}</li>`).join('')}</ol>` : ''}
    <div class="row" style="margin-top:12px">
      ${!h.p ? `<button class="btn btn-a" onclick="heritageForm('${h.mission}', '${id}')">${ic('route')} Poner prioridad</button>` : ''}
      ${next && h.p !== 'IS' ? `<button class="btn btn-a" onclick="heritageStep('${id}', '${next[0]}')">${ic('check')} ${step[next[0]][0]}</button>` : ''}
      ${['pendiente', 'documentado'].includes(h.status) ? `<button class="btn btn-g" onclick="heritageInSitu('${id}')">${ic('shield')} Proteger in situ</button>` : ''}
      <button class="btn btn-g" onclick="heritageForm('${h.mission}', '${id}')">${ic('pencil')} Editar</button>
      <button class="btn btn-g" aria-label="Compartir ficha" onclick="shareText(heritageText(get('heritage', '${id}')), ${jsq(herCode(h))})">${ic('share')}</button>
    </div>
    ${next && h.p !== 'IS' ? `<p class="muted" style="margin-top:8px">Siguiente paso: ${step[next[0]][1].toLowerCase()}.</p>` : ''}`);
}

function heritageStep(id, status) {
  const h = get('heritage', id);
  const fields = {
    documentado: [{ k: 'note', label: 'Observaciones al documentar', wide: true, placeholder: 'Daños previos, piezas sueltas…' }],
    embalado: [{ k: 'box', label: 'Caja o bulto', value: h.box, wide: true, placeholder: 'Ej: Caja 3' }, { k: 'note', label: 'Cómo se ha embalado', wide: true }],
    traslado: [{ k: 'note', label: 'Quién lo lleva / vehículo', wide: true, value: prefs.activeOperator }],
    deposito: [{ k: 'note', label: 'Quién lo recibe y dónde queda', wide: true, value: mget(h.mission).bic?.depotContact || '' }]
  }[status];
  openForm(`${herCode(h)}: ${herStatus(status)[0].toLowerCase()}`, fields, v => {
    const rec = { ...h, status, ...(v.box ? { box: v.box } : {}), custody: [...(h.custody || []), { status, ts: Date.now(), by: prefs.activeOperator, note: v.note || v.box || '' }] };
    put('heritage', rec);
    addEntry(h.mission, null, `${herCode(h)} ${h.name}: ${herStatus(status)[0].toLowerCase()}${v.note ? ' (' + v.note + ')' : ''}`);
    heritageDetail(id);
  });
}

function heritageInSitu(id) {
  const h = get('heritage', id);
  openForm(`Proteger ${herCode(h)} in situ`, [
    { k: 'insitu', label: 'Medidas', type: 'textarea', rows: 3, value: h.insitu, wide: true,
      placeholder: 'Ej: Cubierto con manta ignífuga y lámina; sacos terreros en la puerta; arco apuntalado' }
  ], v => {
    put('heritage', { ...h, status: 'insitu', insitu: v.insitu, custody: [...(h.custody || []), { status: 'insitu', ts: Date.now(), by: prefs.activeOperator, note: v.insitu }] });
    addEntry(h.mission, null, `${herCode(h)} ${h.name}: protegido in situ (${v.insitu})`);
    heritageDetail(id);
  });
}

/* ==================== TEXTOS E IMPRESIÓN ==================== */
function heritageText(h) {
  const L = [`*Ficha de rescate ${herCode(h)} · ${h.name}*`, `${h.type || ''}${h.place ? ' · estaba en ' + h.place : ''}`,
    `Prioridad: ${h.p ? PRIO[h.p][0] : 'sin poner'} · Estado: ${herStatus(h.status)[0]}`];
  if (h.box) L.push(`Caja / bulto: ${h.box}`);
  if (h.condition) L.push(`Conservación: ${h.condition}`);
  if (h.insitu) L.push(`Medidas in situ: ${h.insitu}`);
  (h.custody || []).forEach(c => L.push(`• ${fmtWhen(c.ts)} ${herStatus(c.status)[0]} (${c.by})${c.note ? ': ' + c.note : ''}`));
  return L.join('\n');
}

function heritageSummary(m) {
  const hs = heritageOf(m.id), b = m.bic || {};
  const L = [`*USAR 242 · Salvaguarda de patrimonio · ${b.building || m.title}*`, fmtWhen(Date.now()), b.threat ? `Amenaza: ${b.threat}` : '', ''];
  L.push(`Bienes registrados: ${hs.length}`);
  [...HER_FLOW, ['insitu', 'Protegidos in situ']].forEach(([k, l]) => { const n = hs.filter(h => h.status === k).length; if (n) L.push(`• ${l}: ${n}`); });
  const p1 = hs.filter(h => h.p === 'P1' && !['deposito', 'insitu'].includes(h.status));
  if (p1.length) L.push('', `*P1 aún sin poner a salvo (${p1.length})*`, ...p1.map(h => `• ${herCode(h)} ${h.name} (${herStatus(h.status)[0].toLowerCase()})`));
  if (b.depot) L.push('', `Depósito: ${b.depot}`);
  return L.filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
}

// Acta de entrega al depósito temporal: lista para comprobar y firmar
function printHandover(mid) {
  const m = mget(mid), b = m.bic || {}, hs = heritageOf(mid).filter(h => h.status !== 'dejado');
  $('print').innerHTML = `
    <h1>Acta de entrega de bienes culturales</h1>
    <p><b>${esc(b.building || m.title)}</b> · ${esc(b.threat || '')} · ${new Date().toLocaleString('es-ES')}</p>
    <p>Equipo: ${esc(teamCode())} · Jefe: ${esc(get('operators', m.chief)?.name || '')} · Depósito: ${esc(b.depot || '')}</p>
    <table><tr><th>Nº</th><th>Bien</th><th>Tipo</th><th>Procedencia</th><th>Caja</th><th>Estado</th><th>Recibido ✓</th></tr>
      ${hs.map(h => `<tr><td><b>${herCode(h)}</b></td><td>${esc(h.name)}</td><td>${esc(h.type || '')}</td><td>${esc(h.place || '')}</td><td>${esc(h.box || '')}</td><td>${herStatus(h.status)[0]}</td><td></td></tr>`).join('')}</table>
    <p style="margin-top:28px">Entrega (equipo): ______________________ &nbsp;&nbsp; Recibe (responsable del bien / depósito): ______________________</p>`;
  print();
}
function printHeritageLabels(mid) {
  const hs = heritageOf(mid).filter(h => !['insitu', 'dejado'].includes(h.status));
  $('print').innerHTML = `<div class="labels">${hs.map(h => `<div class="label"><b style="font-size:20pt">${herCode(h)}</b><b>${esc(h.name)}</b><span>${esc(h.place || '')}</span><span>${h.p ? PRIO[h.p][0] : ''}</span></div>`).join('')}</div>`;
  print();
}
