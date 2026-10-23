'use strict';
// USAR 242 · Orden de la app: áreas con su color para saber siempre dónde estás.
//   Activación (rojo)  → operaciones: intervenciones y ejercicios
//   Logística (azul)   → contenedor, revista, stock, EPI, vehículos y despliegue
//   Equipo (petróleo)  → personal, calendario, puestos y vencimientos
//   Ayuda (gris)       → manual, guía de campo, listas y ajustes
// Cuando hay una operación en curso, una barra fija lo recuerda en todas las pantallas.

const AREAS = {
  home: { name: 'Inicio', icon: 'home', desc: 'Resumen del día y avisos' },
  ops: { name: 'Activación', icon: 'flag', desc: 'Intervenciones y ejercicios: preparar, salir, trabajar por fases e informar', hub: 'operaciones' },
  log: { name: 'Logística', icon: 'box', desc: 'Material, revista, stock, EPI, vehículos y preparación del despliegue', hub: 'logistica' },
  team: { name: 'Equipo', icon: 'users', desc: 'Personas, documentación, formación, guardias y caducidades', hub: 'equipo' },
  help: { name: 'Ajustes', icon: 'sliders', desc: 'Ajustes, listas, manual de uso y guía de campo', hub: 'mas' }
};
// [id, icono, título, descripción, área]
const SECTIONS = [
  ['avisos', 'home', 'Inicio', 'Resumen del día y avisos', 'home'],
  ['intervenciones', 'alert', 'Intervenciones', 'Salidas reales', 'ops'],
  ['ejercicios', 'flag', 'Ejercicios', 'Maniobras y simulacros', 'ops'],
  // Material: con subopciones (sexto campo) que el menú pinta sangradas bajo «Material»
  ['contenedor', 'box', 'Contenedor', 'Dibujo por laterales, huecos y cajas', 'log', 'mat'],
  ['revision', 'refresh', 'En revisión', 'Taller, a la espera, inoperativo y novedades', 'log', 'mat'],
  ['pasillo', 'layers', 'Pasillo', 'Material guardado en el pasillo', 'log', 'mat'],
  ['armarios', 'case', 'Armarios', 'Tres armarios de dos puertas', 'log', 'mat'],
  ['otros', 'dots', 'Otros', 'Material en otros sitios', 'log', 'mat'],
  ['consumibles', 'package', 'Material fungible', 'Discos, cadenas, hojas de sierra y gasolina', 'log', 'mat'],
  ['entregas', 'out', 'Entregas', 'Material prestado a personal de fuera, con firma', 'log', 'mat'],
  ['revista', 'clipboard', 'Revista', 'Comprobar el material', 'log'],
  ['vehiculos', 'truck', 'Vehículos', 'Flota de la unidad y plazas', 'log'],
  ['despliegue', 'package', 'Alistamiento y despliegue', 'Ficha del equipo, manifiestos y mercancías peligrosas', 'log'],
  ['personal', 'users', 'Personal', 'Ficha de cada persona: puesto, foto, documentos y EPI', 'team'],
  ['calendario', 'calendar', 'Calendario', 'Ejercicios, formación y guardias, con asistencia y horas', 'team'],
  ['vencimientos', 'clock', 'Vencimientos', 'Documentos, cursos, EPI y mantenimiento por fecha', 'team'],
  ['ajustes', 'sliders', 'General', 'Sesión, compartir datos, pantalla, unidades y copias', 'help'],
  ['listas', 'layers', 'Listas y opciones', 'Opciones de los desplegables: añade las vuestras', 'help'],
  ['manual', 'clipboard', 'Manual de uso', 'Todo lo que se puede hacer, paso a paso, con ejemplos e imágenes', 'help'],
  ['guia', 'book', 'Guía de campo', 'Señales, marcaje, triaje, apuntalamiento, confinados y calculadoras', 'help']
];
const HUBS = { logistica: 'log', equipo: 'team', mas: 'help' };
const sectionOf = tab => SECTIONS.find(s => s[0] === tab);
const areaOf = tab => HUBS[tab] || sectionOf(tab)?.[4] || (tab === 'operaciones' ? 'ops' : 'home');

/* ---------- Estado de cada sección para las tarjetas de las áreas ---------- */
function sectionStatus(id) {
  const a = alerts(), gearList = list('gear');
  switch (id) {
    case 'revision': { const n = gearList.filter(g => g.status !== 'OPERATIVO').length; return n ? [`${n} en revisión`, 'warn'] : ['Nada en revisión', 'ok']; }
    case 'entregas': { const late = list('loans').filter(l => !l.returned && l.due && daysTo(l.due) < 0).length; return late ? [`${late} sin devolver a tiempo`, 'bad'] : ['', 'neutral']; }
    case 'contenedor': { const ok = gearList.filter(g => g.status === 'OPERATIVO').length, pct = Math.round(ok / (gearList.length || 1) * 100);
      return [`${pct} % operativo`, pct >= 90 ? 'ok' : pct >= 75 ? 'warn' : 'bad']; }
    case 'revista': { const t = r => +(r.date || r.ts) || 0, last = list('inspections').sort((x, y) => t(y) - t(x))[0];
      if (!last || !t(last)) return ['Sin revistas', 'warn'];
      const day = new Date(t(last)).toISOString().slice(0, 10);
      return [`Última: ${fmtDate(day)}`, daysTo(day) < -30 ? 'warn' : 'ok']; }
    case 'consumibles': return a.low.length ? [`${a.low.length} bajo mínimo`, 'bad'] : ['Stock correcto', 'ok'];
    case 'epi': return a.epi.length ? [`${a.epi.length} por revisar`, 'warn'] : ['Todo en orden', 'ok'];
    case 'vehiculos': return [`${list('vehicles').length} vehículos`, 'neutral'];
    case 'despliegue': { const fs = get('meta', 'factsheet')?.value; return [TEAM_STATUS[fs?.status || 'base'], fs?.status && fs.status !== 'base' ? 'warn' : 'neutral']; }
    case 'personal': { const n = operators().reduce((s, o) => s + readinessIssues(o.id).length, 0); return n ? [`${n} avisos`, 'warn'] : [`${operators().length} personas`, 'ok']; }
    case 'calendario': { const next = list('events').filter(e => (e.start || '') >= localNow()).sort((x, y) => x.start.localeCompare(y.start))[0];
      return next ? [`Próximo: ${fmtDT(next.start)}`, 'info'] : ['Nada programado', 'neutral']; }
    case 'vencimientos': { const n = expiries().filter(x => daysTo(x.date) <= 30).length; return n ? [`${n} en 30 días`, 'warn'] : ['Nada próximo', 'ok']; }
    case 'puestos': return [PRESETS[mission()]?.[0] || '', 'neutral'];
    default: return null;
  }
}

// Las antiguas portadas de área (Logística, Equipo, Más) repetían el menú: ahora llevan a su primera sección
const HUB_TO = { logistica: 'contenedor', equipo: 'personal', mas: 'manual', epi: 'personal', puestos: 'personal' };
const MAT_TABS = SECTIONS.filter(s => s[5] === 'mat').map(s => s[0]);
// Ya no hay franja «Área › Sección»: el color de la cabecera y el menú dicen dónde estás
const areaHeader = () => '';

/* ---------- Vehículos (antes dentro de Operaciones) ---------- */
function viewVehiculos() {
  const active = list('missions').filter(m => m.status === 'active');
  return `
    <div class="panel">
      <div class="between sec-head"><div><h2>Vehículos</h2><p class="muted">En cada actividad se añaden los que salen, con matrícula y carga.</p></div>
        <button class="btn btn-a" onclick="vehicleForm()">${ic('plus')} Modelo</button></div>
      <div class="grid g3">${vehicles().map(v => {
        const out = active.flatMap(m => (m.vehicles || []).filter(x => x.id === v.id)).length;
        return `<button class="item veh-item" onclick="vehicleForm('${v.id}')">${vehArt(v)}<div class="grow"><b>${esc(v.name)}</b>
          <small>${[v.seats ? v.seats + ' plazas' : '', v.notes].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</small></div>
          ${out ? `<span class="tag bad">${out} en salida</span>` : ''}</button>`; }).join('')
        || '<p class="muted">Añade los modelos de vehículo de la unidad.</p>'}</div>
    </div>`;
}

/* ---------- Barra de activación en curso ---------- */
function renderActivationBar() {
  // En Inicio y dentro de la propia operación ya se ve que está en curso: ahí la franja no se repite
  const live = list('missions').find(x => x.status === 'active');
  const m = prefs.tab === 'avisos' || (prefs.tab === 'operaciones' && prefs.mission === live?.id) ? null : live;
  let bar = $('actbar');
  if (!m) { bar?.remove(); document.body.classList.remove('activated'); return; }
  if (!bar) { bar = Object.assign(document.createElement('div'), { id: 'actbar' }); document.querySelector('.topbar').appendChild(bar); }
  const inZone = presence(m).filter(p => p.state === 'in').length;
  const ex = m.type === 'ejercicio';
  bar.className = 'actbar ' + (ex ? 'ex' : 'real');
  document.body.classList.add('activated');
  bar.innerHTML = `<div class="wrap"><span class="act-dot"></span><b>${ex ? 'EJERCICIO EN CURSO' : 'ACTIVACIÓN EN CURSO'}</b>
    <span class="act-title">${esc(m.title)}</span><span class="act-meta">${esc(phaseOf(m).short)} · ${inZone} en zona · desde ${m.startedAt ? fmtHour(m.startedAt) : '—'}</span>
    <button onclick="openMission('${m.id}')">Abrir</button></div>`;
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
