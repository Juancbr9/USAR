'use strict';
// USAR 242 · Plantillas de operación: crear una salida completa en dos toques.
// Las plantillas de serie usan los perfiles de misión; las propias se guardan desde una operación.

const DEFAULT_TEMPLATES = [
  {
    id: 'TPL-colapso', builtin: true, name: 'Colapso estructural', type: 'intervencion', preset: 'colapso',
    container: true, vehicleIds: ['V-VPI', 'V-SANGYONG', 'V-GUAGUA-P'],
    objective: 'Localizar, acceder y extraer víctimas en una estructura colapsada.',
    safety: 'Vigía estructural permanente.\nSeñal de evacuación: 3 toques largos de silbato.\nComprobar la atmósfera antes de entrar en huecos.\nZona de trabajo delimitada y control de accesos.'
  },
  {
    id: 'TPL-busqueda', builtin: true, name: 'Búsqueda técnica', type: 'intervencion', preset: 'busqueda',
    container: true, vehicleIds: ['V-VPI', 'V-SANGYONG', 'V-GUAGUA-P'],
    objective: 'Localizar víctimas con medios técnicos y marcar la zona según INSARAG.',
    safety: 'Silencio total durante las escuchas.\nMarcaje INSARAG de estructuras y víctimas.\nControl de atmósfera y vigía estructural.'
  },
  {
    id: 'TPL-bic', builtin: true, name: 'Salvaguarda de patrimonio (BIC)', type: 'ejercicio', preset: 'bic', scope: 'bic',
    container: true, vehicleIds: ['V-VPI', 'V-SANGYONG', 'V-GUAGUA-P'],
    objective: 'Poner a salvo los bienes culturales del inmueble ante la amenaza: evacuar por orden de prioridad, proteger in situ lo que no se puede mover y entregar en el depósito temporal con su ficha y cadena de custodia.',
    safety: 'El inmueble se evalúa antes de entrar (cubiertas, arcos, columnas).\nSalida siempre libre y vigía en el exterior que controla el avance de la amenaza.\nNingún bien vale más que una persona: si la amenaza llega, se evacua al personal.\nPiezas pesadas entre dos o más, con la espalda recta.'
  },
  {
    id: 'TPL-vertical', builtin: true, name: 'Rescate vertical / espacio confinado', type: 'intervencion', preset: 'vertical',
    container: true, vehicleIds: ['V-VPI', 'V-SANGYONG', 'V-GUAGUA-P'],
    objective: 'Acceder a la víctima en altura o espacio confinado y evacuarla en camilla.',
    safety: 'Doble anclaje y comprobación cruzada de cada montaje.\nControl multigás continuo en el espacio confinado.\nPlan de rescate del rescatador preparado antes de entrar.'
  }
];

// Equipos y puestos a partir de un perfil de misión (una persona por puesto, en orden)
function teamsFromPreset(key) {
  const slots = PRESETS[key]?.[1] || [];
  const ops = operators(), roles = {}, cells = new Map();
  ops.forEach((o, i) => {
    const [cell, role] = (slots[i] || `${o.cell}|${o.role}`).split('|');
    roles[o.id] = role;
    if (!cells.has(cell)) cells.set(cell, []);
    cells.get(cell).push(o.id);
  });
  const teams = [...cells].map(([name, members]) => ({ id: uid('T'), name, func: '', zone: '', leader: members[0], members }));
  return { teams, roles };
}

function templateSummary(t) {
  const teams = t.preset ? new Set((PRESETS[t.preset]?.[1] || []).map(s => s.split('|')[0])).size : (t.teams || []).length;
  const veh = t.vehicles ? t.vehicles.length : (t.vehicleIds || []).length;
  const gear = t.gear ? t.gear.length : list('gear').filter(g => (t.gearDoors || []).includes(g.door) || (t.gearMatch && new RegExp(t.gearMatch, 'i').test(g.name))).length;
  return `${teams} equipos · ${veh} vehículos · ${t.container ? 'contenedor completo' : gear + ' equipos de material'}`;
}

function newFromTemplate(tid, type) {
  const t = get('templates', tid);
  if (!t) return toast('Esa plantilla ya no existe', 'bad');
  let teams, roles = {};
  if (t.preset) ({ teams, roles } = teamsFromPreset(t.preset));
  else teams = (t.teams || []).map(x => ({ ...x, id: uid('T'), members: (x.members || []).filter(id => get('operators', id)) }));
  const gear = t.gear
    ? t.gear.filter(id => get('gear', id))
    : list('gear').filter(g => (t.gearDoors || []).includes(g.door) || (t.gearMatch && new RegExp(t.gearMatch, 'i').test(g.name))).map(g => g.id);
  const vehiclesList = t.vehicles
    ? t.vehicles.filter(v => get('vehicles', v.id)).map(v => ({ ...v, key: uid('MV'), crew: [...(v.crew || [])], gear: [...(v.gear || [])] }))
    : (t.vehicleIds || []).filter(id => get('vehicles', id)).map(id => ({ key: uid('MV'), id, driver: '', crew: [], gear: [] }));
  const rec = {
    id: uid('M'), status: 'prep', type: type || t.type, title: t.name, date: localNow(),
    location: '', meeting: t.meeting || '', channel: t.channel || '', objective: t.objective || '',
    chief: (t.chief && get('operators', t.chief)) ? t.chief : teams[0]?.leader || '',
    teams, vehicles: vehiclesList, gear, roles: { ...roles, ...(t.roles || {}) },
    safety: t.safety || '', contacts: t.contacts || '', notes: t.notes || '', summary: '', template: t.name, scope: t.scope || 'usar',
    container: !!t.container, extras: (t.extras || []).map(x => ({ ...x })), emergency: t.emergency || guessEmergency(t.name)
  };
  closeModal();
  put('missions', rec, `Creada ${MISSION_TYPES[rec.type].toLowerCase()} "${rec.title}" desde la plantilla`);
  openMission(rec.id);
  toast('Operación creada: completa el nombre y la ubicación');
  missionForm(rec.id);
}

// Elegir cómo empezar una operación nueva
function newMission(type = 'intervencion') {
  const tpls = list('templates').sort((a, b) => (b.builtin ? 0 : 1) - (a.builtin ? 0 : 1) || byName(a, b));
  if (!tpls.length) return missionForm(null, type);
  openModal(`Nueva ${MISSION_TYPES[type].toLowerCase()}`, `
    <p class="muted" style="margin-bottom:12px">Empieza con una plantilla y ajusta lo que necesites, o créala en blanco.</p>
    <div class="list">
      ${tpls.map(t => `
        <button class="item" onclick="newFromTemplate('${t.id}', '${type}')">
          <div><b>${esc(t.name)}</b><small>${esc(templateSummary(t))}</small></div>${ic('chev', 'i-sm')}
        </button>`).join('')}
      <button class="item" onclick="closeModal(); missionForm(null, '${type}')">
        <div><b>En blanco</b><small>Sin equipos, vehículos ni material</small></div>${ic('chev', 'i-sm')}
      </button>
    </div>`);
}

function saveAsTemplate(mid) {
  const m = mget(mid);
  openForm('Guardar como plantilla', [
    { k: 'name', label: 'Nombre de la plantilla', value: m.title, required: true, wide: true, placeholder: 'Ej: Simulacro anual de colapso' }
  ], v => {
    put('templates', {
      id: uid('TPL'), name: v.name, type: m.type, chief: m.chief, meeting: m.meeting, channel: m.channel, objective: m.objective,
      teams: m.teams || [], vehicles: m.vehicles || [], gear: m.gear || [], container: !!m.container, extras: m.extras || [], roles: m.roles || {},
      safety: m.safety, contacts: m.contacts, notes: m.notes
    }, `Plantilla "${v.name}" guardada`);
    toast('Plantilla guardada');
  });
}

function templateForm(tid) {
  const t = get('templates', tid);
  openForm('Editar plantilla', [
    { k: 'name', label: 'Nombre', value: t.name, required: true, wide: true },
    { k: 'objective', label: 'Objetivo', type: 'textarea', rows: 2, value: t.objective, wide: true },
    { k: 'safety', label: 'Riesgos y medidas de seguridad', type: 'textarea', value: t.safety, wide: true }
  ], v => put('templates', { ...t, ...v }, `Plantilla "${v.name}" editada`),
  `<button type="button" class="btn btn-bad span2" onclick="removeItem('templates', '${tid}')">${ic('trash')} Eliminar plantilla</button>`);
}

function templatesPanel() {
  const tpls = list('templates').sort((a, b) => (b.builtin ? 0 : 1) - (a.builtin ? 0 : 1) || byName(a, b));
  return `
    <div class="panel">
      <h3 class="sec-title">${ic('copy')} Plantillas</h3>
      
      ${tpls.length ? `<div class="list">${tpls.map(t => `
        <div class="item">
          <button class="grow" style="text-align:left" onclick="newFromTemplate('${t.id}')"><b>${esc(t.name)}</b><small>${esc(templateSummary(t))}</small></button>
          <button class="link" aria-label="Editar plantilla" onclick="templateForm('${t.id}')">${ic('pencil', 'i-sm')}</button>
        </div>`).join('')}</div>` : '<p class="muted">No hay plantillas.</p>'}
    </div>`;
}
