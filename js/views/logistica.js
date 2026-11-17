'use strict';
// SIER 242 · Logística: lo que hay disponible ahora mismo (o el día que se elija) de personal, capacidades, vehículos y
// material, en una sola pantalla, y «Pasar lista» para marcar presentes y ausentes con un toque.

// Color de un medidor: completo → normal; tres cuartos o más → aviso; menos → mal
const logCls = (n, t) => !t || n >= t ? '' : n / t >= .75 ? 'warn' : 'bad';
const logMeter = (label, n, t, onclick = '', sub = '') => {
  const tagName = onclick ? 'button' : 'div';
  return `<${tagName} class="meter ${logCls(n, t)}" ${onclick ? `onclick="${onclick}"` : ''}><span>${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>
    <b>${n}<small>/${t}</small></b><i><u style="width:${t ? Math.round(n / t * 100) : 0}%"></u></i></${tagName}>`;
};
const logRow = (label, value, cls = '', onclick = '', sub = '') => {
  const tagName = onclick ? 'button' : 'div';
  return `<${tagName} class="log-row ${cls} ${typeof value === 'number' ? '' : 'txt'}" ${onclick ? `onclick="${onclick}"` : ''}><span>${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><b>${esc(String(value))}</b></${tagName}>`;
};
// Matrículas de la flota con su estado: con fallos en la última revista o con la ITV caducada
function flotaEstado() {
  return vehicles().flatMap(v => (v.units || []).map(u => {
    const fallo = !!lastVcheck(u.id)?.fails.length, itv = !!u.itv && daysTo(u.itv) < 0;
    return { v, u, fallo, itv, libre: !fallo && !itv };
  }));
}
// Material que tienen las personas (lo del almacén de USAR que llevan y lo asignado de apartados y vehículos), por persona
const cargosPorPersona = () => Object.entries([...list('gear').filter(g => g.out && !g.out.mission).map(g => [g.out.who || 'Sin nombre', g]), ...matTodo().filter(m => m.holder && get('operators', m.holder)).map(m => [opName(m.holder), m])]
  .reduce((m, [who, g]) => { (m[who] ||= []).push(g); return m; }, {}))
  .sort((a, b) => b[1].length - a[1].length);

function viewLogistica() {
  const hoy = todayISO(), dia = prefs.logDia && prefs.logDia > hoy ? prefs.logDia : hoy, esHoy = dia === hoy;
  const ops = operators().sort(ordenSier), fuera = o => ausenteEl(o, dia), aus = ops.filter(fuera), pres = ops.filter(o => !fuera(o));
  const cuenta = f => [pres.filter(f).length, ops.filter(f).length];
  const irPers = pview => `setPref({ tab: 'personal', person: null, persQ: '', pview: '${pview}' }); scrollTo(0, 0)`;
  // Capacidades: especialidades y equipos
  const irAp = (k, aptab = 'equipo') => `setPref({ tab: '${k}', aptab: '${aptab}' }); scrollTo(0, 0)`;
  const caps = [...ESPECIALIDADES.map(e => [e, ...cuenta(o => opEsp(o) === e), apDe(e) ? irAp(apDe(e)) : irPers('esp')]),
    ...Object.entries(EQUIPOS).filter(([k]) => k !== 'moto').map(([k, l]) => [l, ...cuenta(o => (o.eq || []).includes(k)), APARTADOS[k] ? irAp(k) : irPers('equipos')])].filter(c => c[2]);
  // Material de cada apartado (Agua, Cuerdas…) y de cada vehículo: operativo del total
  const matAp = [...Object.keys(APARTADOS).map(k => [APARTADOS[k].name, apVivo(k), irAp(k, 'material')]), ...vehicles().map(v => [v.name, matDe({ veh: v.id }).filter(matVivo), `go('vehiculos'); vehicleView('${v.id}')`])].filter(([, m]) => m.length);
  const [motoT, motoTt] = cuenta(o => o.moto?.tipo === 'T'), [motoS, motoSt] = cuenta(o => o.moto?.tipo === 'S');
  // Quién vuelve y quién falta en los próximos días
  const vuelven = ops.filter(o => fuera(o) && ausDe(o, dia).hasta && daysTo(ausDe(o, dia).hasta) <= 7).sort((a, b) => ausDe(a, dia).hasta.localeCompare(ausDe(b, dia).hasta));
  // Ausencias que empiezan en los próximos 30 días: la prevista de cada uno y las apuntadas en el cuadrante
  const en30 = new Date(new Date(dia + 'T12:00').getTime() + 30 * 864e5).toISOString().slice(0, 10);
  const previstas = ops.flatMap(o => [...(o.aus ? [o.aus] : []), ...(o.plan || [])].filter(a => (a.desde || '') > dia && a.desde <= en30).map(a => [o, a])).sort((x, y) => x[1].desde.localeCompare(y[1].desde));
  const bajo = bajoMinimos(30), revs = revPendientes(), nec = needsAbiertas();
  // Vehículos y material (siempre a día de hoy)
  const flota = flotaEstado(), libres = flota.filter(x => x.libre), plazas = libres.reduce((s, x) => s + (+x.v.seats || 0), 0);
  const a = alerts(), gear = list('gear'), okGear = gear.filter(g => g.status === 'OPERATIVO').length;
  const exp = expiries(), venc = exp.filter(x => daysTo(x.date) <= 30).length, cargos = cargosPorPersona();
  // Resumen: material operativo de toda la sección (USAR, apartados y vehículos) y lo que hay pendiente de atender
  const matTot = matTodo(), matOkN = okGear + matTot.filter(matOk).length, matN = gear.length + matTot.length;
  const pend = revs.length + nec.length + a.low.length + flota.filter(x => !x.libre).length;
  const kpi = (id, label, valor, cls = '') => `<button class="sier-kpi ${cls}" onclick="document.getElementById('log-${id}')?.scrollIntoView({ behavior: motion() ? 'smooth' : 'auto', block: 'start' })"><small>${label}</small><b>${valor}</b></button>`;
  const sec = (id, titulo, sub, paneles) => `<section class="log-sec" id="log-${id}" aria-label="${titulo}"><div class="log-sec-t"><h2>${titulo}</h2><p class="muted">${sub}</p></div><div class="log-grid">${paneles}</div></section>`;
  const diaTxt = esHoy ? 'hoy' : 'el ' + new Date(dia + 'T00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });

  return `
    <div class="panel">
      <div class="log-head"><div><h2>Logística</h2><p class="muted">Lo disponible ${esc(diaTxt)} en la ${UNIDAD}.</p></div>
        <div class="row"><label class="lbl">Ver el día<input class="input" type="date" min="${hoy}" value="${dia}" onchange="setPref({ logDia: this.value > todayISO() ? this.value : '' })"></label>
          ${esHoy ? '' : `<button class="btn btn-g" style="align-self:flex-end" onclick="setPref({ logDia: '' })">Hoy</button>`}</div></div>
      <div class="sier-res log-res" role="group" aria-label="Resumen">
        ${kpi('personal', 'Personal', `${pres.length}<span class="ap-de">/${ops.length}</span>`, logCls(pres.length, ops.length) === 'bad' ? 'bad' : '')}
        ${kpi('material', 'Material', `${matOkN}<span class="ap-de">/${matN}</span>`, matOkN < matN ? 'bad' : '')}
        ${kpi('flota', 'Vehículos', `${libres.length}<span class="ap-de">/${flota.length}</span>`, logCls(libres.length, flota.length) === 'bad' ? 'bad' : '')}
        ${kpi('material', 'Pendiente', pend, '')}
      </div>
    </div>
    ${sec('personal', 'Personal', `Quién hay ${esc(diaTxt)} y qué capacidades suman.`, `
      <div class="panel">
        <div class="between"><h3>Presentes</h3><button class="link" onclick="${irPers('peloton')}">Ver todos</button></div>
        <div class="log-fig ${logCls(pres.length, ops.length)}"><b>${pres.length}</b><span>de ${ops.length} presentes ${esc(diaTxt)}</span></div>
        ${PELOTONES.filter(k => ops.some(o => o.peloton === k)).map(k => logMeter(k, ...cuenta(o => o.peloton === k), irPers('peloton'))).join('')}
        ${ops.some(o => !o.peloton) && ops.some(o => o.peloton) ? logMeter('Sin pelotón', ...cuenta(o => !o.peloton), irPers('peloton')) : ''}
        ${aus.length ? `<div class="log-rows">${aus.map(o => logRow(conEmpleo(o), ausDe(o, dia).hasta ? 'hasta ' + fmtDate(ausDe(o, dia).hasta) : 'sin fecha', 'bad', `openPerson('${o.id}')`, ' ' + [ausDe(o, dia).motivo || 'Ausente', ausDe(o, dia).lugar].filter(Boolean).join(' · '))).join('')}</div>` : ''}
        <div class="log-foot">${esHoy ? `<button class="btn btn-a" onclick="pasarLista()">${ic('check')} Pasar lista</button>` : ''}
          <button class="btn btn-g" onclick="shareText(sierParte(), 'Parte de personal')">${ic('chat')} Parte</button></div>
      </div>
      <div class="panel">
        <h3>Capacidades</h3><p class="muted" style="margin-bottom:6px">Gente presente ${esc(diaTxt)} de cada especialidad y equipo.</p>
        ${caps.map(([l, n, t, go]) => logMeter(l, n, t, go)).join('')}
        ${motoTt ? logMeter('Motosierristas', motoT, motoTt, irAp('moto'), motoSt ? ` + ${motoS} de ${motoSt} suplentes` : '') : ''}
        ${caps.length || motoTt ? '' : '<p class="muted">Aún no hay especialidades ni equipos apuntados en el personal.</p>'}
      </div>
      ${vuelven.length || previstas.length || bajo.length ? `<div class="panel">
        <div class="between"><h3>Próximos cambios</h3><button class="link" onclick="setPref({ tab: 'personal', person: null, pview: 'cuadrante' }); scrollTo(0, 0)">Cuadrante</button></div>
        <div class="log-rows">${[...new Map(bajo.map(b => [b.grupo, b])).values()].map(b => logRow(`${b.grupo} baja del mínimo`, `el ${fmtDate(b.dia)}`, 'bad', "setPref({ tab: 'personal', person: null, pview: 'cuadrante' }); scrollTo(0, 0)", ` ${b.n} de ${b.min}${bajo.filter(x => x.grupo === b.grupo).length > 1 ? ` · ${bajo.filter(x => x.grupo === b.grupo).length} días en 30` : ''}`)).join('')}
          ${vuelven.map(o => logRow(conEmpleo(o), 'vuelve el ' + fmtDate(new Date(new Date(ausDe(o, dia).hasta + 'T12:00').getTime() + 864e5).toISOString().slice(0, 10)), '', `openPerson('${o.id}')`, ' ' + (ausDe(o, dia).motivo || ''))).join('')}
          ${previstas.map(([o, a]) => logRow(conEmpleo(o), 'desde el ' + fmtDate(a.desde), 'warn', `planDe('${o.id}')`, ' ' + (a.motivo || 'Ausencia') + (a.hasta ? ' hasta el ' + fmtDate(a.hasta) : ''))).join('')}</div>
      </div>` : ''}`)}
    ${sec('flota', 'Vehículos y almacén', 'Las matrículas disponibles y qué hay en cada pasillo.', `
      <div class="panel">
        <div class="between"><h3>Vehículos</h3><button class="link" onclick="go('vehiculos')">Flota</button></div>
        ${flota.length ? `<div class="log-fig ${logCls(libres.length, flota.length)}"><b>${libres.length}</b><span>de ${flota.length} matrículas disponibles${plazas ? ` · ${plazas} plazas` : ''}</span></div>
        <div class="log-rows">
          ${logRow('Con fallos en la última revista', flota.filter(x => x.fallo).length, flota.some(x => x.fallo) ? 'bad' : '', "go('vehiculos')")}
          ${logRow('ITV caducada', flota.filter(x => x.itv).length, flota.some(x => x.itv) ? 'bad' : '', "go('vehiculos')")}
          ${logRow('ITV en los próximos 30 días', flota.filter(x => x.u.itv && daysTo(x.u.itv) >= 0 && daysTo(x.u.itv) <= 30).length, '', "go('vehiculos')")}
        </div>` : `<p class="muted">Aún no hay matrículas apuntadas en los vehículos.</p>`}
      </div>
      ${almacenPanel()}`)}
    ${sec('material', 'Material', 'Cómo está el de USAR y el de cada especialidad y vehículo, y lo que falta.', `
      <div class="panel">
        <div class="between"><h3>Material de USAR</h3><button class="link" onclick="go('contenedor')">Contenedor</button></div>
        <div class="log-fig ${logCls(okGear, gear.length)}"><b>${okGear}</b><span>de ${gear.length} equipos operativos</span></div>
        <div class="log-rows">
          ${logRow('Prestado a personas', a.out.length, '', "go('fuera')")}
          ${logRow('En revisión o averiado', a.review.length + a.broken.length, a.broken.length ? 'bad' : a.review.length ? 'warn' : '', "go('revision')")}
          ${logRow('Fungible bajo mínimo', a.low.length, a.low.length ? 'bad' : '', a.low.length ? 'pedidoForm()' : "go('consumibles')", a.low.length ? ' toca para preparar el pedido' : '')}
          ${logRow('EPI por revisar', a.epi.length, a.epi.length ? 'warn' : '', "go('epi')")}
          ${logRow('Vencimientos en 30 días', venc, exp.some(x => daysTo(x.date) < 0) ? 'bad' : venc ? 'warn' : '', "setPref({ tab: 'avisos', vwin: 30, vAll: true }); setTimeout(() => document.getElementById('venc')?.scrollIntoView(), 60)")}
        </div>
      </div>
      ${matAp.length ? `<div class="panel">
        <h3>Material de especialidades y vehículos</h3><p class="muted" style="margin-bottom:6px">Operativo del total apuntado en cada uno.</p>
        ${matAp.map(([nombre, m, ir]) => logMeter(nombre, m.filter(matOk).length, m.length, ir, m.some(x => x.review && daysTo(x.review) <= 30) ? ' revisión próxima' : '')).join('')}
      </div>` : ''}
      ${revs.length ? `<div class="panel">
        <h3>Revistas que tocan</h3>
        <div class="log-rows">${revs.map(([o]) => logRow(duenoNombre(o), 'toca', 'warn', matIr(duenoDe(o)), ' ' + (REV_CADA.find(r => r[0] === revCada(o))?.[1].toLowerCase() || ''))).join('')}</div>
      </div>` : ''}
      <div class="panel">${needsBloque('')}</div>
      ${cargos.length ? `<div class="panel">
        <div class="between"><h3>Quién tiene material</h3><button class="link" onclick="go('fuera')">Fuera</button></div>
        <div class="log-rows">${cargos.map(([who, gs]) => logRow(who, gs.length + (gs.length === 1 ? ' equipo' : ' equipos'), '', operators().find(o => o.name === who) ? `setPref({ tab: 'personal', person: '${operators().find(o => o.name === who)?.id}', ptab: 'mat' }); scrollTo(0, 0)` : "go('fuera')", ' ' + gs.slice(0, 2).map(g => g.name).join(', ') + (gs.length > 2 ? '…' : ''))).join('')}</div>
      </div>` : ''}`)}`;
}

/* ---------- Pasar lista ---------- */
let LISTA_MOTIVO = MOTIVOS_AUSENCIA[0], LISTA_LUGAR = '';
function listaHtml() {
  const ops = operators().sort(ordenSier), n = ops.filter(esAusente).length;
  const grupos = [...PELOTONES, ''].map(k => [k || (ops.some(o => o.peloton) ? 'Sin pelotón' : 'Personal'), ops.filter(o => (o.peloton || '') === k)]).filter(g => g[1].length);
  return `<div id="listaBody">
    <p class="muted">Toca a quien falte: queda ausente con el motivo elegido. Tócalo otra vez y vuelve a estar presente.</p>
    <label class="lbl" style="margin-top:10px">Motivo de los que marques
      <select class="input" onchange="LISTA_MOTIVO = this.value">${MOTIVOS_AUSENCIA.map(m => `<option ${m === LISTA_MOTIVO ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></label>
    <label class="lbl" style="margin-top:8px">Dónde están (opcional)<input class="input" id="listaLugar" value="${esc(LISTA_LUGAR)}" placeholder="Ej.: Academia, Las Palmas…" autocomplete="off" oninput="LISTA_LUGAR = this.value"></label>
    <div class="lista-res" aria-live="polite"><span>Presentes</span><b>${ops.length - n}<small style="display:inline">/${ops.length}</small></b></div>
    ${grupos.map(([t, m]) => `<div class="lista-grupo"><p class="lista-t"><span>${esc(t)}</span><span>${m.filter(o => !esAusente(o)).length}/${m.length}</span></p>
      <div class="lista-fichas">${m.map(o => { const f = esAusente(o); return `<button class="lista-f ${f ? 'aus' : ''}" aria-pressed="${!f}" aria-label="${esc(o.name)}: ${f ? 'ausente' : 'presente'}" onclick="listaToca('${o.id}')">
        <b>${esc(o.name)}</b><small>${esc(f ? [ausHoy(o).motivo || 'Ausente', ausHoy(o).lugar].filter(Boolean).join(' · ') : o.empleo || 'Presente')}</small></button>`; }).join('')}</div></div>`).join('')}
    <div class="row" style="margin-top:16px"><button class="btn btn-a" onclick="closeModal()">${ic('check')} Hecho</button>
      <button class="btn btn-g" onclick="shareText(sierParte(), 'Parte de personal')">${ic('chat')} Enviar el parte</button></div>
  </div>`;
}
function pasarLista() { openModal('Pasar lista', listaHtml()); }
function listaToca(id) {
  const o = get('operators', id), f = esAusente(o), sheet = document.querySelector('#modal .sheet'), y = sheet?.scrollTop || 0;
  // Una ausencia prevista (aún sin empezar) conserva su motivo y su fecha de fin: solo se adelanta a hoy
  put('operators', f ? ponerPresente(o) : { ...o, aus: { motivo: LISTA_MOTIVO, hasta: '', nota: '', lugar: LISTA_LUGAR.trim(), ...(ausPrevista(o) ? o.aus : {}), desde: todayISO() } }, `${o.name}: ${f ? 'presente' : 'ausente (' + LISTA_MOTIVO + ')'}`);
  const body = $('listaBody'); if (!body) return;
  body.outerHTML = listaHtml(); if (sheet) sheet.scrollTop = y;
  document.querySelector(`#listaBody .lista-f[onclick*="${id}"]`)?.focus({ preventScroll: true });
}
