'use strict';
// USAR 242 · Ficha de una operación, organizada por pestañas siguiendo el orden de trabajo de la UME

const MTABS = [
  ['resumen', 'flag', 'Resumen'], ['personal', 'users', 'Personal'], ['seguridad', 'shield', 'Seguridad'],
  ['worksites', 'building', 'Worksites'], ['victimas', 'heart', 'Víctimas'], ['material', 'box', 'Material'],
  ['informes', 'file', 'Informes'], ['diario', 'history', 'Diario']
];
const opLink = id => esc(get('operators', id)?.name || '—');
const textBlock = (title, text) => `<div><b class="lbl-sm">${title}</b><p class="pre">${esc(text) || '<span class="dim">—</span>'}</p></div>`;
const stat = (n, text, cls = '') => `<div class="kpi ${cls}"><div><small>${text}</small><b>${n}</b></div></div>`;
const phaseOf = m => { const ps = phasesFor(m); return ps[Math.max(0, Math.min(Math.floor(+m.phase) || 0, ps.length - 1))]; };

function viewMission(m) {
  const [label, cls] = MISSION_STATUS[m.status];
  const tabs = m.scope === 'bic' ? [MTABS[0], ['patrimonio', 'landmark', 'Patrimonio'], ...MTABS.slice(1)] : MTABS;
  const tab = tabs.some(([id]) => id === prefs.mtab) ? prefs.mtab : 'resumen';
  const counts = {
    patrimonio: heritageOf(m.id).length, personal: missionPeople(m).length, worksites: worksitesOf(m.id).length, victimas: victimsOf(m.id).length,
    material: missionGearIds(m).length + (m.extras || []).length, diario: list('mlog').filter(e => e.mission === m.id).length
  };
  const statusBtn = {
    prep: `<button class="btn btn-a" onclick="startMission('${m.id}')">${ic('play')} Iniciar</button>`,
    active: `<button class="btn btn-stop" onclick="finishMission('${m.id}')">${ic('stop')} Finalizar</button>`,
    done: `<button class="btn btn-g" onclick="saveMission(mget('${m.id}'), { status: 'prep' }, 'reabierta')">${ic('refresh')} Reabrir</button>`
  }[m.status];

  const body = {
    resumen: tabResumen, patrimonio: tabPatrimonio, personal: tabPersonal, seguridad: tabSeguridad, worksites: tabWorksites,
    victimas: tabVictimas, material: tabMaterial, informes: tabInformes, diario: tabDiario
  }[tab](m);

  return `
    <button class="link" onclick="go('${m.type === 'ejercicio' ? 'ejercicios' : 'intervenciones'}')">${ic('back', 'i-sm')} ${m.type === 'ejercicio' ? 'Todos los ejercicios' : 'Todas las intervenciones'}</button>
    ${m.status === 'active' ? missionConsole(m) : `<div class="panel">
      <div class="row" style="margin-bottom:8px"><span class="tag ${m.type === 'ejercicio' ? 'info' : 'warn'}">${esc(MISSION_TYPES[m.type] || m.type || 'Operación')}</span>${m.scope === 'bic' ? '<span class="tag info">Patrimonio BIC</span>' : ''}<span class="tag ${cls}">${label}</span>
        <span class="tag neutral">Fase ${(m.phase || 0) + 1}/${phasesFor(m).length}: ${phaseOf(m).short}</span></div>
      <h2 style="font-size:22px">${esc(m.title)}</h2>
      ${m.objective ? `<p class="muted pre" style="margin-top:4px">${esc(m.objective)}</p>` : ''}
      <dl class="dl" style="margin-top:14px">
        <dt>Salida</dt><dd>${fmtDT(m.date)}</dd>
        <dt>Ubicación</dt><dd>${m.location ? `<a href="${mapsUrl(m.location)}" target="_blank" rel="noopener" class="ext">${esc(m.location)} ↗</a>` : '—'}</dd>
        <dt>Reunión</dt><dd>${esc(m.meeting) || '—'}</dd>
        <dt>Jefe</dt><dd>${opLink(m.chief)}</dd>
        <dt>Radio</dt><dd>${esc(m.channel) || '—'}</dd>
      </dl>
      <div class="row">
        ${statusBtn}
        <button class="btn btn-g" onclick="missionForm('${m.id}')">${ic('pencil')} Editar</button>
        <button class="btn btn-g" onclick="open('https://wa.me/?text=' + encodeURIComponent(missionText(mget('${m.id}'))), '_blank')">${ic('chat')} Orden de salida</button>
        <button class="btn btn-g" aria-label="Más acciones" onclick="missionMenu('${m.id}')">${ic('dots')}</button>
      </div>
    </div>`}

    <div class="mlayout"><nav class="tabs" aria-label="Secciones de la operación">${tabs.map(([id, icon, name]) => `
      <button class="tab ${tab === id ? 'on' : ''}" ${tab === id ? 'aria-current="page"' : ''} onclick="setPref({ mtab: '${id}' })">${ic(icon, 'i-sm')}${name}${counts[id] ? `<span class="n">${counts[id]}</span>` : ''}</button>`).join('')}
    </nav>
    <div class="mbody">${body}</div></div>`;
}

// Modo misión: con la operación en curso, la cabecera es una consola oscura y de letra grande, con el tiempo
// transcurrido y la hora siempre a la vista, las cifras que importan y lo justo para actuar
const hms = ms => { const t = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(t / 3600), Math.floor(t / 60) % 60, t % 60].map(n => String(n).padStart(2, '0')).join(':'); };
function missionConsole(m) {
  const inZone = presence(m).filter(p => p.state === 'in').length, pend = victimsOf(m.id).filter(v => !isOut(v)).length;
  const par = Math.round((parEvery(m) - (Date.now() - lastPar(m))) / 6e4);
  const stat = (n, label, tab, cls = '') => `<button class="mc-stat ${cls}" onclick="setPref({ mtab: '${tab}' })"><b class="num">${n}</b><small>${label}</small></button>`;
  return `<div class="mc ${m.type === 'ejercicio' ? 'ex' : ''}">
    <div class="mc-top"><span class="live-tag">${m.type === 'ejercicio' ? 'Ejercicio' : 'Activación'} en curso</span><span class="mc-now" data-now>${fmtHour(Date.now())}</span></div>
    <h2 class="mc-title">${esc(m.title)}</h2>
    <p class="mc-sub">Fase ${(m.phase || 0) + 1}/${phasesFor(m).length}: ${esc(phaseOf(m).short)}${m.location ? ` · <a href="${mapsUrl(m.location)}" target="_blank" rel="noopener">${esc(m.location)} ↗</a>` : ''}${m.channel ? ` · ${ic('radio', 'i-sm')} ${esc(m.channel)}` : ''}</p>
    <div class="mc-clock"><b class="num" data-since="${m.startedAt || Date.now()}">${hms(Date.now() - (m.startedAt || Date.now()))}</b><small>desde ${m.startedAt ? fmtHour(m.startedAt) : '—'}</small></div>
    <div class="mc-stats">${stat(inZone, 'en zona', 'personal')}${stat(pend, 'víctimas pendientes', 'victimas', pend ? 'warn' : '')}${stat(par <= 0 ? '¡Ya!' : par + ' min', 'próximo recuento', 'seguridad', par <= 0 ? 'bad' : par <= 5 ? 'warn' : '')}</div>
    <div class="mc-acts">
      <button class="btn btn-stop" onclick="finishMission('${m.id}')">${ic('stop')} Finalizar</button>
      <button class="btn mc-btn" onclick="missionForm('${m.id}')">${ic('pencil')} Editar</button>
      <button class="btn mc-btn" aria-label="Más acciones" onclick="missionMenu('${m.id}')">${ic('dots')}</button>
    </div></div>`;
}
// El reloj de la consola corre solo (sin volver a pintar la pantalla)
setInterval(() => {
  document.querySelectorAll('[data-since]').forEach(el => { el.textContent = hms(Date.now() - +el.dataset.since); });
  document.querySelectorAll('[data-now]').forEach(el => { el.textContent = fmtHour(Date.now()); });
}, 500);

function missionMenu(mid) {
  const m = mget(mid);
  const item = (icon, title, sub, action) => `<button class="menu-item" onclick="closeModal(); ${action}">${ic(icon, 'i-lg')}<div class="grow"><b>${title}</b><small>${sub}</small></div></button>`;
  openModal(m.title, `<div class="menu">
    ${item('share', 'Compartir orden de salida', 'Por WhatsApp, correo o cualquier app', `shareText(missionText(mget('${mid}')), mget('${mid}').title)`)}
    ${item('printer', 'Imprimir dosier completo', 'Personal, worksites, víctimas, seguridad y diario', `printMission('${mid}')`)}
    ${item('copy', 'Duplicar', 'Crea una copia en preparación', `duplicateMission('${mid}')`)}
    ${item('layers', 'Guardar como plantilla', 'Para repetir esta organización otra vez', `saveAsTemplate('${mid}')`)}
    ${item('trash', 'Eliminar operación', 'Borra también su diario, worksites y víctimas', `deleteMission('${mid}')`)}
  </div>`);
}

/* ---------- Resumen: fases, funciones clave y cifras ---------- */
function tabResumen(m) {
  const ws = worksitesOf(m.id), vs = victimsOf(m.id);
  const inZone = m.status === 'prep' ? 0 : presence(m).filter(p => p.state === 'in').length;
  const live = vs.filter(v => v.state === 'viva' && ['extraida', 'entregada'].includes(v.status)).length;
  const hs = heritageOf(m.id);
  if (m.scope === 'bic') return `
    <div class="grid g4">
      ${stat(`${inZone}/${missionPeople(m).length}`, 'En zona / total', inZone ? 'ok' : '')}
      ${stat(hs.length, 'Bienes registrados')}
      ${stat(hs.filter(h => h.p === 'P1' && !['deposito', 'insitu'].includes(h.status)).length, 'P1 sin poner a salvo', hs.some(h => h.p === 'P1' && !['deposito', 'insitu'].includes(h.status)) ? 'bad' : '')}
      ${stat(hs.filter(h => ['deposito', 'insitu'].includes(h.status)).length, 'A salvo', 'ok')}
    </div>
    ${m.type === 'ejercicio' ? sessionPanel(m) : ''}
    ${phasesPanel(m)}
    ${funcsPanel(m)}`;
  return `
    <div class="grid g4">
      ${stat(`${inZone}/${missionPeople(m).length}`, 'En zona / total', inZone ? 'ok' : '')}
      ${stat(ws.length, 'Worksites')}
      ${stat(vs.filter(v => !['extraida', 'entregada'].includes(v.status)).length, 'Víctimas pendientes', vs.some(v => v.status !== 'extraida' && v.status !== 'entregada') ? 'warn' : '')}
      ${stat(live, 'Rescatadas con vida', live ? 'ok' : '')}
    </div>
    ${m.type === 'ejercicio' ? sessionPanel(m) : ''}
    ${phasesPanel(m)}
    ${funcsPanel(m)}`;
}

function phasesPanel(m) {
  const cur = m.phase || 0, checks = m.checks || {}, PHASES_M = phasesFor(m);
  return `
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('route')} Fases</h3>
        <span class="muted">${cur + 1} de ${PHASES_M.length}</span></div>
      <ol class="phases">${PHASES_M.map((ph, i) => {
        const done = ph.checks.filter((_, j) => checks[`${ph.id}.${j}`]).length;
        const state = i < cur ? 'done' : i === cur ? 'now' : '';
        return `
        <li class="phase ${state}">
          <details ${i === cur ? 'open' : ''}>
            <summary><span class="ph-dot">${i < cur ? ic('check', 'i-sm') : i + 1}</span><b class="grow">${ph.name}</b><span class="muted num">${done}/${ph.checks.length}</span></summary>
            <div class="ph-body">
              ${ph.checks.map((c, j) => { const k = `${ph.id}.${j}`; return `
                <label class="check-row"><input type="checkbox" ${checks[k] ? 'checked' : ''} onchange="toggleCheck('${m.id}', '${k}', this.checked)"><span>${esc(c)}</span></label>`; }).join('')}
              ${i === cur ? `<div class="row" style="margin-top:10px">
                ${i > 0 ? `<button class="btn btn-g btn-sm" onclick="setPhase('${m.id}', ${i - 1})">${ic('back', 'i-sm')} Fase anterior</button>` : ''}
                ${i < PHASES_M.length - 1 ? `<button class="btn btn-a btn-sm" onclick="setPhase('${m.id}', ${i + 1})">Pasar a: ${PHASES_M[i + 1].short} ${ic('chev', 'i-sm')}</button>` : ''}
              </div>` : `<button class="link" style="margin-top:8px" onclick="setPhase('${m.id}', ${i})">Marcar como fase actual</button>`}
            </div>
          </details>
        </li>`; }).join('')}
      </ol>
    </div>`;
}

function toggleCheck(mid, key, on) {
  const m = mget(mid);
  saveMission(m, { checks: { ...(m.checks || {}), [key]: on } });
  haptic(8);
}
function setPhase(mid, i) {
  const m = mget(mid);
  const ph = phasesFor(m)[i];
  saveMission(m, { phase: i }, `fase ${i + 1}: ${ph.name}`);
  addEntry(mid, null, `Fase ${i + 1}: ${ph.name}`);
}

function funcsPanel(m) {
  const f = m.func || {};
  return `
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('star')} Funciones clave</h3>
        <button class="btn btn-g btn-sm" onclick="funcsForm('${m.id}')">${ic('pencil')} Asignar</button></div>
      <div class="grid g2">${FUNCS.map(([k, name, sub]) => `
        <div class="who-row fn ${f[k] ? '' : 'empty-fn'}">${f[k] ? avatar(get('operators', f[k])?.name, 'sm') : `<span class="avatar sm off">?</span>`}
          <div><b>${name}</b><small>${f[k] ? opLink(f[k]) : esc(sub)}</small></div></div>`).join('')}</div>
    </div>`;
}
function funcsForm(mid) {
  const m = mget(mid), f = m.func || {};
  openForm('Funciones clave', FUNCS.map(([k, name]) => ({ k, label: name, value: f[k], options: opOptions() })),
    v => saveMission(m, { func: v }, 'funciones clave asignadas'));
}

/* ---------- Personal: control de acceso, equipos, puestos y vehículos ---------- */
function tabPersonal(m) {
  const people = missionPeople(m), ops = operators();
  const teams = (m.teams || []).map(t => `
    <button class="item" style="display:block" onclick="teamForm('${m.id}', '${t.id}')">
      <div class="between"><b>${esc(t.name)}</b><span class="muted">${(t.members || []).length + (t.leader && !(t.members || []).includes(t.leader) ? 1 : 0)} pers.</span></div>
      ${t.func || t.zone ? `<small>${esc([t.func, t.zone && 'Sector ' + t.zone].filter(Boolean).join(' · '))}</small>` : ''}
      <small style="color:var(--warn)">${ic('star', 'i-sm')} Jefe: ${opLink(t.leader)}</small>
      <small>${esc(names((t.members || []).filter(id => id !== t.leader)).join(', ') || 'Sin componentes')}</small>
    </button>`).join('');
  const personal = people.map(id => `
    <button class="item" onclick="roleForm('${m.id}', '${id}')">
      <div class="who-row">${avatar(get('operators', id)?.name, 'sm')}<div><b>${opLink(id)}</b><small>${esc(missionRole(m, id))}${teamOf(m, id).length ? ' · ' + esc(teamOf(m, id).map(t => t.name).join(', ')) : ''}</small></div></div>${ic('pencil', 'i-sm')}
    </button>`).join('');
  const free = ops.filter(o => !people.includes(o.id));
  const mveh = (m.vehicles || []).map(v => {
    const fleet = get('vehicles', v.id);
    const seats = fleet?.seats ? ` (${1 + (v.crew || []).length}/${fleet.seats})` : '';
    const load = vehLoad(v, m);
    return `
      <button class="item veh-row" onclick="missionVehicleForm('${m.id}', '${vkey(v)}')">${vehArt(fleet, 'sm', v.mod)}<div class="grow">
        <div class="between"><b>${esc(fleet ? vehLabel({ id: v.id, mod: v.mod }) : 'Vehículo eliminado')}${v.plate ? ` <span class="plate-tag">${esc(v.plate)}</span>` : ''}</b><span class="muted">${seats}</span></div>
        <small>Conductor: ${opLink(v.driver)}</small><small>${esc(names(v.crew || []).join(', ') || 'Sin ocupantes')}</small>
        ${load.length ? `<small>${ic('box', 'i-sm')} ${esc(load.join(', '))}</small>` : ''}
      </div></button>`;
  }).join('');
  return `
    ${m.status === 'prep' ? availabilityPanel(m) : ''}
    ${parPanel(m)}
    ${presencePanel(m)}
    ${outingsPanel(m)}
    ${wellbeingPanel(m)}
    <div class="panel">
      <div class="between wrap-row sec-head"><h3 class="sec-title" style="margin:0">${ic('users')} Equipos</h3>
        <div class="row"><button class="btn btn-g btn-sm" onclick="autoTeams('${m.id}')">Crear por células</button><button class="btn btn-a btn-sm" onclick="teamForm('${m.id}')">${ic('plus')} Equipo</button></div></div>
      ${teams ? `<div class="grid g3">${teams}</div>` : '<p class="muted">Sin equipos.</p>'}
    </div>
    <div class="grid g2">
      <div class="panel">
        <h3 class="sec-title">${ic('hardhat')} Personal y puestos</h3>
        ${personal ? `<div class="list">${personal}</div>` : ''}
        ${free.length ? `<p class="muted" style="margin-top:12px"><b>No asignados (${free.length}):</b> ${esc(free.map(o => o.name).join(', '))}</p>` : ''}
      </div>
      <div class="panel">
        <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('truck')} Vehículos</h3>
          <button class="btn btn-a btn-sm" onclick="missionVehicleForm('${m.id}')">${ic('plus')} Vehículo</button></div>
        ${mveh ? `<div class="list">${mveh}</div>` : '<p class="muted">Sin vehículos.</p>'}
      </div>
    </div>
    ${m.status === 'active' ? availabilityPanel(m) : ''}`;
}

/* ---------- Material ---------- */
function tabMaterial(m) {
  const gearList = missionGear(m);
  const inVeh = vehGearIds(m), byDoor = gearGroups(gearList.filter(g => !inVeh.has(g.id))), extras = (m.extras || []).filter(x => !x.in);
  return `
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('box')} Material (${gearList.length})</h3>
        <div class="row">${puedeFlota() ? `<button class="btn btn-g btn-sm" onclick="extrasForm('${m.id}')">${ic('plus')} Extra</button>` : ''}
        <button class="btn btn-a btn-sm" onclick="gearPicker('${m.id}')">${ic('check')} Elegir material</button></div></div>
      ${(m.vehicles || []).filter(v => vehHasLoad(v, m)).map(v => `<div class="well mat-veh"><b style="font-size:15px" class="who-row">${vehArt(get('vehicles', v.id), 'xs', v.mod)} En ${esc(vehLabel(v))}</b>
        <ul style="margin:6px 0 0; padding-left:18px">${vehLoad(v, m).map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`).join('')}
      ${m.container ? `<p class="mat-banner">${ic('box')} <span><b>Sale el contenedor completo</b> con todos sus huecos y cajas.</span></p>` : ''}
      ${byDoor.length ? `<div class="grid g2">${byDoor.map(([d, label, gs]) => `
        <details class="well mat-group" ${!m.container ? 'open' : ''}><summary><b style="font-size:15px">${esc(label)}</b>
          <span class="muted">${gs.length}${gs.some(g => g.status !== 'OPERATIVO') ? ` · <span style="color:var(--bad)">${gs.filter(g => g.status !== 'OPERATIVO').length} con fallo</span>` : ''}</span></summary>
          <ul style="margin:6px 0 0; padding-left:18px">${gs.map(g => `<li>${esc(g.name)}${qtyText(g)}${boxCode(g) ? ` <small class="muted">(${esc(boxCode(g))})</small>` : ''}${g.status !== 'OPERATIVO' ? ` <span class="tag ${STATUS_TAG[g.status]}">${g.status}</span>` : ''}</li>`).join('')}</ul></details>`).join('')}</div>`
        : '<p class="muted">Sin material.</p>'}
      ${extras.length ? `<div class="well" style="margin-top:10px"><b style="font-size:15px">Extra, en el contenedor</b>
        <ul style="margin:6px 0 0; padding-left:18px">${extras.map(x => `<li>${esc(extraText(x))}</li>`).join('')}</ul></div>` : ''}
      ${m.status === 'active' && gearList.length ? '<p class="muted" style="margin-top:10px">Este material figura como fuera del contenedor hasta que finalices la operación.</p>' : ''}
    </div>
    ${m.status !== 'done' ? suggestPanel(m) : ''}
    <div class="panel">
      <h3 class="sec-title">${ic('tent')} Zona de seguridad y "parque"</h3>
      <ul class="tips">
        <li>Lona en el suelo con las herramientas ordenadas y la lista de carga (packing list) a mano.</li>
        <li>Cajas cerradas y material preparado <i>in advance</i>: lo que vaya a hacer falta, listo antes de pedirlo.</li>
        <li>Agua y comida para el equipo; vehículos aparcados con la salida libre.</li>
        <li>Al terminar: recoger, revisar y devolver cada caja y equipo a su hueco.</li>
      </ul>
    </div>`;
}

/* ---------- Diario ---------- */
function tabDiario(m) {
  const diary = list('mlog').filter(e => e.mission === m.id).sort((a, b) => b.ts - a.ts);
  const quick = catalog('diary');
  return `
    <div class="panel">
      <h3 class="sec-title">${ic('history')} Diario de operaciones</h3>
      <form class="row nowrap" style="margin-bottom:10px" onsubmit="event.preventDefault(); addEntry('${m.id}', this.t)">
        <span class="dictate-wrap grow"><input class="input" name="t" aria-label="Nueva anotación del diario" placeholder="Ej: 10:15 llegada a zona, se divide en 2 sectores" autocomplete="off">${micButton()}</span>
        <button class="btn btn-a" aria-label="Añadir">${ic('plus')}</button>
      </form>
      <div class="row chips" style="margin-bottom:12px">${quick.map(q => `<button class="chip" data-t="${esc(q)}" onclick="addEntry('${m.id}', null, this.dataset.t)">${esc(q)}</button>`).join('')}<button class="chip" onclick="catalogEditor('diary')">${ic('pencil', 'i-sm')} Editar</button></div>
      <div class="list log">${diary.map(e => `<div class="well" style="padding:8px 10px"><span class="t">[${fmtWhen(e.ts)}]</span> <span class="w">${esc(e.by)}:</span> ${esc(e.text)}</div>`).join('')
        || ''}</div>
    </div>
    ${photosPanel(`m:${m.id}`, m.photos || [], `takePhoto('${m.id}', null)`)}`;
}

/* ---------- Ejercicios: plan de la sesión práctica ---------- */
function sessionPanel(m) {
  const s = m.session || {};
  return `
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('clipboard')} Plan del ejercicio</h3>
        <button class="btn btn-g btn-sm" onclick="sessionForm('${m.id}')">${ic('pencil')} Editar</button></div>
      <div class="stack">
        ${textBlock('Objetivos', s.goals)}
        ${textBlock('Instructores y evaluadores', s.instructors)}
        ${textBlock('Supuesto: presentación, nudo y desenlace', s.scenario)}
        ${textBlock('Medidas de seguridad del ejercicio', s.safety)}
        ${textBlock('Duración prevista', s.duration)}
      </div>
    </div>`;
}
function sessionForm(mid) {
  const m = mget(mid), s = m.session || {};
  openForm('Plan del ejercicio', [
    { k: 'goals', label: 'Objetivos', type: 'textarea', rows: 3, value: s.goals, wide: true, placeholder: 'Ej: Practicar llamada y escucha y apuntalamiento en T' },
    { k: 'instructors', label: 'Instructores y evaluadores', value: s.instructors, wide: true },
    { k: 'scenario', label: 'Supuesto', type: 'textarea', value: s.scenario, wide: true, placeholder: 'Presentación (situación inicial), nudo (complicaciones que se meten) y desenlace' },
    { k: 'safety', label: 'Medidas de seguridad', type: 'textarea', rows: 3, value: s.safety, wide: true, placeholder: 'Palabra de parada real, botiquín, zonas prohibidas…' },
    { k: 'duration', label: 'Duración prevista', value: s.duration, placeholder: 'Ej: 3 h' }
  ], v => saveMission(m, { session: v }, 'plan del ejercicio actualizado'));
}
