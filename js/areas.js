'use strict';
// SIER 242 · Orden de la app: cada cosa en un solo sitio, con el color de su área para saber siempre dónde estás.
//   Inicio                → resumen del día, avisos y vencimientos
//   Logística (azul)      → lo disponible ahora mismo: personal, capacidades, vehículos y material; pasar lista
//   Calendario            → ejercicios, formación y guardias, con asistencia
//   Personal (petróleo)   → toda la sección: pelotones, especialidades, equipos y presentes
//   Vehículos (azul)      → flota, ITV y revista de salida
//   USAR                  → lo propio del equipo USAR: material (almacén, fuera, revisión y revista), EPI,
//                           guía de campo y apuntalamientos
//   Ajustes (gris)        → ajustes, listas y manual de uso
// Cuando hay una operación en curso, una barra fija lo recuerda en todas las pantallas.

const AREAS = {
  home: { name: 'Inicio', icon: 'home', desc: 'Resumen del día, avisos y vencimientos' },
  ops: { name: 'Calendario', icon: 'calendar', desc: 'Ejercicios, formación y guardias' },
  log: { name: 'Material', icon: 'case', desc: 'Almacén, lo que está fuera, revisión y revista', hub: 'logistica' },
  team: { name: 'Personal', icon: 'users', desc: 'Toda la sección: pelotones, especialidades, equipos y EPI', hub: 'equipo' },
  help: { name: 'Ajustes', icon: 'sliders', desc: 'Ajustes, listas y manual de uso', hub: 'mas' }
};
// Menú: en este orden; las áreas se despliegan con sus secciones y el resto son secciones sueltas
const MENU = ['avisos', 'recursos', 'personal', 'vehiculos', ...Object.keys(APARTADOS).filter(k => APARTADOS[k].comun), 'calendario', '#Especialidades y equipos', 'usar', ...Object.keys(APARTADOS).filter(k => !APARTADOS[k].comun), 'help'];
// Partes de la sección con sus pantallas (cada pantalla conserva el color de su área). USAR es la primera;
// las demás especialidades se añadirán aquí cuando tengan sus propias pantallas.
const MENU_PARTES = { usar: { name: 'USAR', icon: 'hardhat', items: ['contenedor', 'fuera', 'revision', 'revista', 'epi', 'guia', 'apuntalamientos'] } };
// [id, icono, título, descripción, área, grupo, oculta (no sale en el menú: se llega desde otra pantalla)]
const SECTIONS = [
  ['avisos', 'home', 'Inicio', 'Resumen del día, avisos y vencimientos', 'home'],
  ['recursos', 'gauge', 'Logística', 'Lo disponible ahora o el día que elijas: personal, capacidades, vehículos y material', 'log'],
  ['calendario', 'calendar', 'Calendario', 'Ejercicios, formación y guardias, con asistencia y horas', 'ops'],
  // Todo el material guardado en una sola página: contenedor, pasillo, armarios, escalón y fungible
  ['contenedor', 'box', 'Almacén', 'Contenedor, pasillo, armarios, escalón y fungible', 'log', 'mat'],
  ['fuera', 'out', 'Fuera', 'Lo que tiene cada uno y lo prestado con firma', 'log', 'mat'],
  ['revision', 'wrench', 'Revisión', 'En el escalón, en el taller y novedades', 'log', 'mat'],
  ['revista', 'clipboard', 'Revista', 'Comprobar el material', 'log', 'mat'],
  // Apartados de esa página (no salen sueltos en el menú; llevan a la página, a su altura)
  ['pasillo', 'layers', 'Pasillo', 'La estantería del pasillo: módulos, suelo y balda', 'log', 'mat', true],
  ['armarios', 'case', 'Armarios', 'Tres armarios con sus baldas', 'log', 'mat', true],
  ['otros', 'dots', 'Otros', 'Material en otros sitios', 'log', 'mat', true],
  ['consumibles', 'package', 'Material fungible', 'Discos, cadenas, hojas de sierra y gasolina', 'log', 'mat', true],
  ['entregas', 'out', 'Entregas con firma', 'Material prestado a personal de fuera, con firma', 'log', 'mat', true],
  ['vehiculos', 'truck', 'Vehículos', 'Flota, ITV y revista de salida', 'log'],
  ['personal', 'users', 'Personal', 'Toda la sección: pelotones, especialidades, equipos, presentes y la ficha de cada persona', 'team'],
  ['epi', 'hardhat', 'EPI', 'Qué lleva cada uno y la reserva', 'team'],
  // Un apartado por especialidad o equipo: su gente, su material y su revista
  ...Object.entries(APARTADOS).map(([k, a]) => [k, a.icon, a.name, `${a.largo}: su gente, su material y su revista`, 'team']),
  ['guia', 'book', 'Guía de campo', 'Señales, marcaje, triaje, apuntalamiento, confinados y calculadoras', 'help'],
  ['apuntalamientos', 'wrench', 'Apuntalamientos', 'Todos los tipos de los temas de la UME: dibujo, piezas, datos y montaje', 'help'],
  // La calculadora de arcos se abre desde «Apuntalamientos» (tipo «Apuntalamiento de arcos»)
  ['arcos', 'wrench', 'Apuntalar arcos', 'Cuadro y cercha de camones a medida: lista de cortes, plantillas y montaje', 'help', '', true],
  ['ajustes', 'grid', 'General', 'Sesión, compartir datos, pantalla, unidades y copias', 'help'],
  ['listas', 'layers', 'Listas y opciones', 'Opciones de los desplegables: añade las vuestras', 'help'],
  ['manual', 'file', 'Manual de uso', 'Todo lo que se puede hacer, paso a paso, con ejemplos e imágenes', 'help']
];
const HUBS = { logistica: 'log', equipo: 'team', mas: 'help' };
const sectionOf = tab => SECTIONS.find(s => s[0] === tab);
const areaOf = tab => HUBS[tab] || sectionOf(tab)?.[4] || 'home';

/* ---------- Estado de cada sección para las tarjetas de las áreas ---------- */
function sectionStatus(id) {
  const a = alerts(), gearList = list('gear');
  switch (id) {
    case 'revision': { const n = gearList.filter(g => g.status !== 'OPERATIVO').length; return n ? [`${n} en revisión`, 'warn'] : ['Nada en revisión', 'ok']; }
    case 'fuera':
    case 'entregas': { const late = list('loans').filter(l => !l.returned && l.due && daysTo(l.due) < 0).length; return late ? [`${late} sin devolver a tiempo`, 'bad'] : ['', 'neutral']; }
    case 'contenedor': { const ok = gearList.filter(g => g.status === 'OPERATIVO').length, pct = Math.round(ok / (gearList.length || 1) * 100);
      if (a.low.length) return [`${a.low.length} fungibles bajo mínimo`, 'bad'];
      return [`${pct} % operativo`, pct >= 90 ? 'ok' : pct >= 75 ? 'warn' : 'bad']; }
    case 'revista': { // el punto del menú solo avisa de una revista empezada y sin finalizar
      if (prefs.draft) return ['Revista en curso sin finalizar', 'warn'];
      const t = r => +(r.date || r.ts) || 0, last = list('inspections').sort((x, y) => t(y) - t(x))[0];
      return last && t(last) ? [`Última: ${fmtDate(new Date(t(last)).toISOString().slice(0, 10))}`, 'ok'] : ['Sin revistas', 'neutral']; }
    case 'vehiculos': return [`${list('vehicles').length} vehículos`, 'neutral'];
    case 'personal': { const n = operators().reduce((s, o) => s + readinessIssues(o.id).length, 0); return n ? [`${n} ${n === 1 ? 'aviso' : 'avisos'}`, 'warn'] : [`${operators().length} personas`, 'ok']; }
    case 'calendario': { const next = list('events').filter(e => (e.start || '') >= localNow()).sort((x, y) => x.start.localeCompare(y.start))[0];
      return next ? [`Próximo: ${fmtDT(next.start)}`, 'info'] : ['Nada programado', 'neutral']; }
    default: return null;
  }
}

// Las antiguas portadas de área (Logística, Equipo, Más) repetían el menú: ahora llevan a su primera sección.
// Vencimientos está en Inicio y Alistamiento se quitó.
const HUB_TO = { logistica: 'contenedor', equipo: 'personal', mas: 'manual', puestos: 'personal', despliegue: 'personal', vencimientos: 'avisos' };
// Cada tipo de actividad se ve en «Todas las actividades», ya filtrada por él
const MAT_TABS = SECTIONS.filter(s => s[5] === 'mat' && !s[6]).map(s => s[0]);
// Apartados de «Contenedor y almacén»: los nombres antiguos (y «fuera») llevan a la página, a la altura de cada uno
const ALMACEN_TABS = ['pasillo', 'armarios', 'escalon', 'otros', 'consumibles'];
// Lleva a una parte de «Contenedor y almacén» (desplegándola), p. ej. desde los nombres antiguos del menú
function almacenGo(id, smooth) {
  almUnfold(id); document.getElementById('alm-' + id)?.scrollIntoView({ block: 'start', behavior: smooth ? 'smooth' : 'auto' }); }
// Ya no hay franja «Área › Sección»: el color de la cabecera y el menú dicen dónde estás
const areaHeader = tab => `<h1 class="sr-only">${esc(sectionOf(tab)?.[2] || UNIDAD)}</h1>`;

/* ---------- Vehículos (antes dentro de Operaciones) ---------- */
// Aviso en la tarjeta del modelo si alguna de sus matrículas tiene la ITV caducada o en los próximos 30 días
// Aviso en la tarjeta si la última revista de salida de alguna de sus matrículas tuvo fallos
const vehFails = v => (v.units || []).some(u => lastVcheck(u.id)?.fails.length) ? '<span class="tag bad">Fallo en revista</span>' : '';
const itvSoon = v => { const n = Math.min(...(v.units || []).filter(u => u.itv).map(u => daysTo(u.itv))); return n < 0 ? '<span class="tag bad">ITV caducada</span>' : n <= 30 ? '<span class="tag warn">ITV pronto</span>' : ''; };
function viewVehiculos() {
  return `
    <div class="panel">
      <div class="between sec-head"><div><h2>Vehículos</h2><p class="muted">La flota con sus matrículas, la ITV, la revista de salida y el material que lleva cada uno.</p></div>
        ${puedeFlota() ? `<button class="btn btn-a" onclick="vehicleForm()">${ic('plus')} Modelo</button>` : ''}</div>
      <div class="grid g3">${vehicles().map(v => {
        const nm = matDe({ veh: v.id }).length;
        return `<button onclick="vehicleView('${v.id}')" class="item veh-item">${vehArt(v)}<div class="grow"><b>${esc(v.name)}</b>
          <small>${[(v.units || []).length ? (v.units.length === 1 ? v.units[0].plate : v.units.length + ' matrículas') : '', v.seats ? v.seats + ' plazas' : '', nm ? nm + ' de material' : '', v.notes].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</small>
          ${vehFails(v)}${itvSoon(v)}</div></button>`; }).join('')
        || '<p class="muted">Añade los modelos de vehículo de la unidad.</p>'}</div>
    </div>`;
}

// Marca el área actual en la página (colores de la cabecera, barra y botones)
function applyArea() {
  document.documentElement.dataset.area = areaOf(prefs.tab);
  // La barra de estado del móvil toma el color de la cabecera del área
  const bar = getComputedStyle(document.documentElement).getPropertyValue('--bar').trim();
  if (bar) document.querySelector('meta[name=theme-color]')?.setAttribute('content', bar);
}

// Altura real de la cabecera (con o sin franja de activación) para que lo fijo quede justo debajo
try {
  const top = document.querySelector('.topbar');
  new ResizeObserver(() => document.documentElement.style.setProperty('--top-h', top.offsetHeight + 'px')).observe(top);
} catch {}
