'use strict';
// USAR 242 · Interfaz común: navegación, Inicio, búsqueda, ventanas, formularios y enlaces

/* ==================== RENDER GENERAL ==================== */
// Áreas, secciones y barra de navegación: ver js/areas.js

/* ---------- Movimiento ----------
   Transiciones entre pantallas, ventanas que suben y bajan, el menú que se desliza y cifras que cuentan. Solo con la
   clase «motion» en <html>: no si el móvil pide reducir el movimiento (accesibilidad) ni en las pruebas automáticas
   (navigator.webdriver), que necesitan que todo esté quieto al momento. */
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const setMotion = () => document.documentElement.classList.toggle('motion', !reduceMotion.matches && !navigator.webdriver);
setMotion(); reduceMotion.addEventListener?.('change', setMotion);
const motion = () => document.documentElement.classList.contains('motion');
// Cifras que cuentan desde cero hasta su valor al entrar en la pantalla (data-count, con data-suf detrás: «%», «/13»…)
function countUp() {
  document.querySelectorAll('#view [data-count]').forEach(el => {
    const to = +el.dataset.count, suf = el.dataset.suf || '', t0 = performance.now();
    if (!(to > 0)) return;
    const step = t => { const p = Math.min(1, (t - t0) / 700), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e) + suf; if (p < 1 && el.isConnected) requestAnimationFrame(step); };
    el.textContent = '0' + suf; requestAnimationFrame(step);
  });
}
// La cabecera se eleva (sombra) en cuanto se baja un poco
addEventListener('scroll', () => document.body.classList.toggle('scrolled', scrollY > 4), { passive: true });

// Al cambiar de pantalla (no en cada actualización de datos) el contenido entra con una transición corta
let LAST_SCREEN = '', LAST_SUB = '';
// Lo que cambia dentro de una misma pantalla (pestañas, vistas, pasillo y lado, mes…)
const SUB_KEYS = ['aptab', 'pview', 'ptab', 'almPas', 'pasN', 'pasLado', 'cuadMes', 'cside', 'cview', 'logDia', 'vehVista', 'vehGrupo', 'asrTab'];
// Dónde estaba la pestaña (o el botón) activo de cada grupo antes de redibujar, para que su marca se deslice hasta el nuevo
const IND_SEL = '.ctabs, .seg-row, .tabs';
function indSnap() {
  return [...document.querySelectorAll('#view ' + IND_SEL.split(', ').join(', #view '))].map(g => { const on = g.querySelector('.on'); return on ? { k: g.getAttribute('aria-label') || '', left: on.offsetLeft, width: on.offsetWidth } : null; });
}
function indSlide(antes) {
  if (!antes) return;
  document.querySelectorAll('#view ' + IND_SEL.split(', ').join(', #view ')).forEach((g, i) => { const on = g.querySelector('.on'), a = antes[i];
    if (!on || !a || a.k !== (g.getAttribute('aria-label') || '') || !on.offsetWidth || (a.left === on.offsetLeft && a.width === on.offsetWidth)) return;
    on.style.setProperty('--dx', a.left - on.offsetLeft + 'px'); on.style.setProperty('--sx', a.width / on.offsetWidth); on.classList.add('slide'); });
}
function render() {
  $('boot')?.remove();
  if (!loggedIn()) return renderLogin();
  if (bloqueado()) return renderMantenimiento();
  document.body.classList.remove('login-on');
  if (HUB_TO[prefs.tab]) prefs.tab = HUB_TO[prefs.tab];
  if (prefs.tab === 'consumibles') prefs.almFold = { ...prefs.almFold, fungible: false };   // el fungible se abre desplegado
  if (ALMACEN_TABS.includes(prefs.tab)) prefs.tab = 'contenedor';
  applyArea();
  renderHeader();
  renderNav();
  // Si una pantalla falla, se ve un aviso con salida (y el error sigue llegando a la consola)
  const marcas = motion() ? indSnap() : null;
  try { $('view').innerHTML = areaHeader(prefs.tab) + (VIEWS[prefs.tab] || VIEWS.avisos)(); }
  catch (e) { $('view').innerHTML = errorState(); setTimeout(() => { throw e; }); }
  const screen = [prefs.tab, prefs.person].join('|'), sub = SUB_KEYS.map(k => JSON.stringify(prefs[k] ?? '')).join('|');
  if (screen !== LAST_SCREEN) { LAST_SCREEN = screen; const v = $('view'); v.classList.remove('enter', 'swap'); void v.offsetWidth; v.classList.add('enter'); if (motion()) countUp(); }
  // Misma pantalla, otra pestaña u otro pasillo: el indicador se desliza a su sitio y el contenido cambia con un fundido corto
  else if (sub !== LAST_SUB && motion()) { const v = $('view'); v.classList.remove('enter', 'swap'); void v.offsetWidth; v.classList.add('swap'); indSlide(marcas); }
  LAST_SUB = sub;
  if (document.querySelector('.cvi')) fitCells();
  if (prefs.tab === 'apuntalamientos') apuKeepFocus();
  if (prefs.tab === 'personal') persKeepFocus();
  navTrack();
  if ($('search').value) renderSearch();
  updateWakeLock();
}

const WIDE = matchMedia('(min-width: 1024px)');
WIDE.addEventListener?.('change', () => renderNav());
function renderNav() {
  const count = alertCount(alerts());
  renderDrawer(count);
  // Tablet en horizontal y PC: el mismo menú desplegable, fijo a la izquierda. En el móvil, la barra de abajo con lo de
  // todos los días y «Más», que abre el menú completo (el mismo de las tres rayas)
  $('nav').innerHTML = WIDE.matches ? `<div class="nav-tree">${menuTree(count)}</div>` : '';
  const cur = menuTab(prefs.tab), enBarra = BARRA.some(b => b[0] === cur);
  $('tabbar').innerHTML = WIDE.matches ? '' : BARRA.map(([id, icon, t]) => `<button class="${cur === id ? 'on' : ''}" ${cur === id ? 'aria-current="page"' : ''} onclick="go('${id}')">${ic(icon)}<span>${t}</span>${id === 'avisos' && count ? `<i class="tb-n">${count > 99 ? '99+' : count}</i>` : ''}</button>`).join('')
    + `<button class="${enBarra ? '' : 'on'}" aria-haspopup="true" aria-label="Más: todo el menú" onclick="toggleDrawer(true)">${ic('grid')}<span>Más</span></button>`;
}

// Menú por niveles (en el orden de MENU): Inicio, Actividades, Material, Vehículos, Equipo, Guía de campo y Ajustes.
// Al tocar un área se despliegan sus secciones (un área abierta a la vez).
const menuTab = tab => tab === 'arcos' ? 'apuntalamientos' : ALMACEN_TABS.includes(tab) || tab === 'entregas' ? (tab === 'entregas' ? 'fuera' : 'contenedor') : tab;
const parteDe = tab => Object.keys(MENU_PARTES).find(k => MENU_PARTES[k].items.includes(tab));
const tabGroups = tab => { tab = menuTab(tab); const s = sectionOf(tab), parte = parteDe(tab); return parte ? [parte] : s && !MENU.includes(tab) && s[4] !== 'home' ? [s[4]] : []; };
function menuOpen(g) { return (prefs.menuOpen ?? tabGroups(prefs.tab)).includes(g); }
function toggleMenuGroup(g) {
  prefs.menuOpen = menuOpen(g) ? [] : [g];
  writeJSON(KEY.prefs, prefs); renderNav();
}
function menuTree(count) {
  const curTab = menuTab(prefs.tab);
  const item = (id, icon, title, cls = '') => { const st = sectionStatus(id); return `
    <button class="dr-item ${cls} ${curTab === id ? 'on' : ''}" data-area="${areaOf(id)}" ${curTab === id ? 'aria-current="page"' : ''} onclick="go('${id}')">
      ${ic(icon, 'i-lg')}<span class="grow"><b>${title}</b>${id === 'avisos' ? `<small>${count ? count + (count === 1 ? ' aviso' : ' avisos') : 'Todo en orden'}</small>` : ''}</span>
      ${id === 'avisos' && count ? `<span class="count">${count}</span>` : ''}
      ${st && st[1] !== 'neutral' && st[1] !== 'ok' ? `<span class="dr-dot ${st[1]}" title="${esc(st[0])}"></span>` : ''}</button>`; };
  const head = (g, icon, title) => { const open = menuOpen(g), on = tabGroups(curTab).includes(g);
    return `<button class="dr-group-head ${on ? 'has-on' : ''}" data-area="${g}" aria-expanded="${open}" onclick="toggleMenuGroup('${g}')">${ic(icon, 'i-lg')}<span class="grow"><b>${title}</b></span>${ic('chev', 'i-sm chev')}</button>`; };
  return MENU.map(k => {
    if (k[0] === '#') return `<p class="dr-label">${esc(k.slice(1))}</p>`;
    const parte = MENU_PARTES[k];
    if (!AREAS[k] && !parte) { const [id, icon, title] = sectionOf(k); return item(id, icon, k === 'avisos' ? 'Inicio' : title); }
    const kids = parte ? parte.items.map(sectionOf) : SECTIONS.filter(s => s[4] === k && !s[6] && !MENU.includes(s[0]) && !parteDe(s[0]));
    return `
    <div class="dr-group ${menuOpen(k) ? 'open' : ''}" data-area="${k}">
      ${head(k, (parte || AREAS[k]).icon, (parte || AREAS[k]).name)}
      ${menuOpen(k) ? `<div class="dr-children">${kids.map(([id, icon, title]) => item(id, icon, title, 'sub')).join('')}</div>` : ''}
    </div>`; }).join('');
}

// Menú de tres rayas (móvil y tablet)
function renderDrawer(count = alertCount(alerts())) {
  const mc = $('menuCount');
  if (mc) { mc.textContent = count > 99 ? '99+' : count; mc.classList.toggle('hidden', !count); }
  const panel = $('drawerPanel'); if (!panel || $('drawer').classList.contains('hidden')) return;
  panel.innerHTML = `
    <div class="dr-head"><div class="dr-brand"><img src="img/logo.webp" width="44" height="44" alt=""><div class="wordmark">SIER <span class="plate">242</span></div></div>
      <button class="icon-btn" aria-label="Cerrar menú" onclick="toggleDrawer(false)">${ic('x', 'i-lg')}</button></div>
    ${menuTree(count)}`;
}
let DRAWER_CLOSING = null;
function toggleDrawer(open) {
  const d = $('drawer'); if (!d) return;
  open ??= d.classList.contains('hidden') || !!DRAWER_CLOSING;
  if (DRAWER_CLOSING) { clearTimeout(DRAWER_CLOSING); DRAWER_CLOSING = null; d.classList.remove('closing'); if (!open) { d.classList.add('hidden'); $('drawerPanel').innerHTML = ''; } }
  if (!open && !d.classList.contains('hidden') && motion()) {
    // Se desliza hacia fuera y luego se oculta
    d.classList.add('closing'); document.body.classList.remove('drawer-open'); $('menuBtn')?.setAttribute('aria-expanded', false);
    DRAWER_CLOSING = setTimeout(() => { DRAWER_CLOSING = null; d.classList.remove('closing'); d.classList.add('hidden'); $('drawerPanel').innerHTML = ''; }, 200);
    return;
  }
  d.classList.toggle('hidden', !open); document.body.classList.toggle('drawer-open', open);
  if (!open) $('drawerPanel').innerHTML = '';
  $('menuBtn')?.setAttribute('aria-expanded', open);
  if (open) { renderDrawer(); d.querySelector('.dr-item.on, .dr-item')?.focus({ preventScroll: true }); history.pushState({ nav: navSnap(), drawer: 1 }, ''); }
}

function go(tab) {
  // El pasillo de USAR ya es uno más del Almacén
  if (tab === 'pasillo') { prefs.almPas = usarPasillos()[0] || prefs.almPas; tab = 'almacen'; }
  const sub = ALMACEN_TABS.includes(tab) && tab;
  tab = sub ? 'contenedor' : HUB_TO[tab] || tab;
  toggleDrawer(false); haptic(8);
  setPref({ tab, menuOpen: null, ...(tab === 'personal' ? { person: null } : {}), ...(tab === 'avisos' ? { vAll: false } : {}), ...(tab === 'arcos' ? { arc: null } : {}), ...(tab === 'apuntalamientos' ? { apu: null } : {}) });
  scrollTo(0, 0); if (sub) almacenGo(sub === 'consumibles' ? 'fungible' : sub === 'otros' ? 'escalon' : sub); }

function toggleSearch() {
  const bar = $('searchbar');
  bar.classList.toggle('hidden');
  if (!bar.classList.contains('hidden')) $('search').focus(); else clearSearch();
}

function renderHeader() {
  prefs.activeOperator = me()?.name || prefs.activeOperator;   // quien ha iniciado sesión
  renderSyncBadge();
}

function renderSyncBadge() {
  const el = $('syncBadge');
  if (!el) return;
  const pending = Sync.pending;
  const [dot, text] = {
    local: ['', ''],
    syncing: ['warn', 'Sincronizando…'],
    online: ['ok', 'Equipo conectado'],
    offline: ['warn', `Sin conexión${pending ? `, ${pending} cambios pendientes` : ''}`],
    error: ['bad', 'Error al sincronizar']
  }[Sync.status];
  el.innerHTML = text ? `<span class="dot ${dot}"></span>${text}` : '';
  // Todo bien: no se enseña (la app sincroniza sola); solo se ve sin conexión o si hay un error
  el.classList.toggle('quiet', ['online', 'syncing', 'local'].includes(Sync.status));
}

function alerts() {
  const gearList = list('gear');
  return {
    broken: gearList.filter(g => g.status === 'AVERIADO').sort(byName),
    review: gearList.filter(g => g.status === 'REVISIÓN').sort(byName),
    nov: [...gearList.filter(g => g.nov?.text && g.status === 'OPERATIVO'), ...list('boxes').filter(b => b.nov?.text)],
    due: [
      ...gearList.filter(g => isDueSoon(g.service)).map(g => ({ kind: 'gear', item: g, date: g.service, what: 'Mantenimiento' })),
      ...list('epis').filter(e => isDueSoon(e.expires)).map(e => ({ kind: 'epi', item: e, date: e.expires, what: 'Caducidad EPI' }))
    ].sort((a, b) => a.date.localeCompare(b.date)),
    epi: list('epis').filter(e => e.status === 'REVISAR' && e.holder !== RESERVA),
    low: list('consumables').filter(c => c.stock <= c.min).sort(byName),
    out: gearList.filter(g => g.out && !g.out.mission).sort(byName),   // préstamos; lo que sale con una operación no es un aviso
    ready: operators().flatMap(o => readinessIssues(o.id).map(([cls, text]) => ({ o, cls, text }))),
    // Matrículas cuya última revista de salida tuvo fallos (hasta que otra revista salga bien)
    veh: vehicles().flatMap(v => (v.units || []).map(u => ({ v, u, c: lastVcheck(u.id) }))).filter(x => unitFallos(x.v, x.u).length),
    // ITV que ya ha llegado: se pregunta si la ha pasado
    itv: itvPending(),
    // Material de los apartados (Agua, Cuerdas…) en revisión o averiado
    esp: matTodo().filter(m => !matOk(m)).sort(byName),
    // Revistas con aviso que ya tocan (de un apartado o de un vehículo)
    rev: revPendientes()
  };
}
const alertCount = a => a.broken.length + a.review.length + a.nov.length + a.epi.length + a.due.length + a.low.length + a.out.length + a.ready.length + a.veh.length + a.itv.length + a.esp.length + a.rev.length;

/* ==================== VISTA: INICIO ==================== */
// La sección de un vistazo: saludo y operatividad, una tarjeta por especialidad, la fuerza de hoy, los avisos, los
// vencimientos y lo próximo del calendario
function viewAvisos() {
  const a = alerts(), total = alertCount(a), gearList = list('gear');
  // art: dibujo del equipo o la caja delante (como en el resto de listas del material)
  const row = (onclick, title, sub, right = '', art = '') =>
    `<button class="item" onclick="${onclick}">${art ? '<div class="who-row">' + art : ''}<div><b>${esc(title)}</b><small>${esc(sub)}</small></div>${art ? '</div>' : ''}${right}</button>`;
  const boxArt = b => `<span class="box-chip sm" style="--c:${colorOf(b)[1]}; --ink:${colorOf(b)[2]}">${esc(b.code)}</span>`;
  const section = (title, cls, rows, area = 'log', foot = '', chip = 'USAR') => rows.length ? `
    <div class="panel area-panel" data-area="${area}"><div class="between sec-head"><h3><span class="area-chip">${chip}</span>${title}</h3><span class="tag ${cls}">${rows.length}</span></div>
    <div class="list">${rows.join('')}</div>${foot}</div>` : '';
  const where = g => whereIs(g) + (boxCode(g) ? ', caja ' + boxCode(g) : '');
  const hour = new Date().getHours();
  const hello = hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const upcoming = events().filter(e => eventDays(e).at(-1) >= todayISO()).slice(0, 3);
  // Operatividad de la sección: material operativo (el de todas las especialidades y vehículos), personal presente y
  // matrículas sin fallos en su última revista ni la ITV caducada
  const ops = operators(), mat = [...gearList, ...matTodo()], flota = flotaEstado();
  const pct = (n, t) => t ? n / t * 100 : 100;
  const parts = [pct(mat.filter(matOk).length, mat.length), pct(ops.filter(o => !esAusente(o)).length, ops.length), pct(flota.filter(x => !x.fallo && !x.itv).length, flota.length)];
  const ready = Math.round(parts.reduce((s, x) => s + x, 0) / 3);

  return `
    <div class="hero">
      <p class="hero-date">${esc(today)}</p>
      <p class="hello">${hello}, ${esc(nombreBonito(prefs.activeOperator))}</p>
      <p class="hero-msg">${total ? `${ic('alert', 'i-sm')} Hay ${total} ${total === 1 ? 'cosa' : 'cosas'} que revisar.` : `${ic('checkc', 'i-sm')} Todo en orden.`}</p>
      <div class="hero-ops" role="img" aria-label="Operatividad de la sección: ${ready} %. Material ${Math.round(parts[0])} %, personal ${Math.round(parts[1])} %, vehículos ${Math.round(parts[2])} %">
        <div class="hero-pct ${ready >= 90 ? 'ok' : ready >= 75 ? 'warn' : 'bad'}"><b data-count="${ready}" data-suf="%">${ready}%</b><small>operativa</small></div>
        <div class="hero-bars">${[['Material', parts[0]], ['Personal', parts[1]], ['Vehículos', parts[2]]].map(([l, v]) =>
          `<div class="hero-bar"><span>${l}</span><i><u class="${v >= 90 ? '' : v >= 75 ? 'warn' : 'bad'}" style="width:${Math.round(v)}%"></u></i><b>${Math.round(v)}%</b></div>`).join('')}</div>
      </div>
    </div>

    ${espTiles()}
    ${enMantenimiento() ? mantenimientoPanel() : ''}

    ${fuerzaPanel()}

    ${total ? `<div class="grid g2">
      ${section('Averiados', 'bad', a.broken.map(g => row(`gearDetail('${g.id}')`, g.name, revLine(g, where), '', artMini(g))))}
      ${section('En revisión', 'warn', a.review.map(g => row(`gearDetail('${g.id}')`, g.name, revLine(g, where), '', artMini(g))))}
      ${section('Novedades', 'warn', a.nov.map(x => get('boxes', x.id) && x.code ? row(`boxDetail('${x.id}')`, 'Caja ' + x.code, x.nov.text, '', boxArt(x)) : row(`gearDetail('${x.id}')`, x.name, x.nov.text, '', artMini(x))))}
      ${section('EPI por revisar', 'warn', a.epi.map(e => row(`epiForm('${e.id}')`, `${epiLabel(e)} de ${opName(e.holder)}`, e.size ? 'Talla ' + e.size : 'Sin talla')))}
      ${section('Stock bajo mínimo', 'bad', a.low.map(c => row(`findGo('cons', '${c.id}')`, c.name, `Quedan ${c.stock} ${c.unit}, mínimo ${c.min}`)), 'log',
        `<button class="btn btn-g full" style="margin-top:10px" onclick="pedidoForm()">${ic('share')} Preparar el pedido</button>`)}
      ${section('ITV: ¿la han pasado?', 'warn', a.itv.map(x => row(`itvForm('${x.v.id}', '${x.u.id}')`, `${x.v.name} · ${x.u.plate}`,
        `${daysTo(x.u.itv) < 0 ? 'Caducó' : 'Vence hoy'} (${fmtDate(x.u.itv)}). Toca para apuntar el resultado y la próxima fecha.`)), 'log', '', 'Vehículos')}
      ${section('Vehículos con fallos', 'bad', a.veh.map(x => row(`unidadView('${x.v.id}', '${x.u.id}')`, `${x.v.name} · ${x.u.plate}`, unitFallos(x.v, x.u).join(', '))), 'log', '', 'Vehículos')}
      ${section('Material en revisión o averiado', a.esp.some(m => m.status === 'AVERIADO') ? 'bad' : 'warn', a.esp.map(m => row(matIr(m), m.name, `${matDueno(m)} · ${AP_ESTADOS[m.status]?.[0] || m.status}${m.notes ? ' · ' + m.notes : ''}`)), 'team', '', 'Material')}
      ${section('Toca pasar revista', 'warn', a.rev.map(([o]) => row(matIr(duenoDe(o)), duenoNombre(o), (REV_CADA.find(r => r[0] === revCada(o))?.[1] || '') + (matRevistas(o)[0] ? ' · última: ' + fmtWhen(matRevistas(o)[0].ts) : ' · aún no se ha pasado'))), 'team', '', 'Material')}
      ${section('Documentación del personal', 'warn', a.ready.map(r => row(`openPerson('${r.o.id}')`, r.o.name, r.text)), 'team', '', 'Personal')}
      ${section('Fuera del contenedor', 'info', a.out.map(g => row(`gearDetail('${g.id}')`, g.name,
        `Lo tiene ${g.out.who} desde ${fmtWhen(g.out.since)}${g.out.note ? '. ' + g.out.note : ''}`, '', artMini(g))))}
    </div>` : ''}

    ${vencPanel()}

      <div class="panel dash-next">
        <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('calendar')} Próximamente</h3><button class="link" onclick="go('calendario')">Calendario</button></div>
        ${upcoming.length ? `<div class="list">${upcoming.map(e => { const d = new Date(e.start); return `<button class="item" onclick="eventDetail('${e.id}')">
          <span class="dash-day"><b>${d.getDate()}</b><small>${MONTHS_ES[d.getMonth()].slice(0, 3)}</small></span>
          <div class="grow"><b>${esc(e.title || e.type)}</b><small>${esc(e.type)}${e.place ? ' · ' + esc(e.place) : ''}</small></div>${ic('chev', 'i-sm')}</button>`; }).join('')}</div>`
          : emptyState('calendar', 'Nada programado', 'Los ejercicios, formaciones y guardias del calendario salen aquí.')}
      </div>

    <div class="dash-actions">
      <button class="btn btn-g" onclick="shareText(reportText())">${ic('share')} Enviar estado</button>
      <button class="btn btn-g" onclick="printManifest()">${ic('printer')} Imprimir estado</button>
    </div>`;
}

// Inicio: una tarjeta por especialidad o equipo, con su icono, los presentes y el material operativo
// Inicio: cómo está cada especialidad, en una tabla. Una fila por especialidad y cuatro datos alineados: gente presente,
// material operativo, la revista (cuándo fue la última, o si toca) y cuántas necesidades tiene abiertas. Solo lleva
// color lo que hay que atender.
function espTiles() {
  const corta = ts => new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'numeric' });
  const cel = (label, txt, cls = '') => `<span class="esp-c ${cls}"><span class="sr-only">${label} </span>${txt}</span>`;
  const frac = (label, n, t, bad) => t ? cel(label, `${n}<i>/${t}</i>`, bad ? 'bad' : '') : cel(label, '—', 'nada');
  // gente: los del apartado (null en el Parque, que es de todos); rev: [texto, clase]; nec: necesidades abiertas
  const fila = (onclick, art, name, sub, gente, mat, rev, nec) => `<button class="esp-tile" onclick="${onclick}">${art}<span class="esp-t"><b>${esc(name)}</b><small>${esc(sub)}</small></span>
    ${gente ? frac('Gente', gente.filter(o => !esAusente(o)).length, gente.length, gente.length && gente.filter(o => !esAusente(o)).length / gente.length < .75) : cel('Gente', '—', 'nada')}
    ${frac('Material', mat.filter(matOk).length, mat.length, mat.some(m => !matOk(m)))}${cel('Revista', rev[0], rev[1])}${cel('Faltan', nec, nec ? 'warn' : 'nada')}</button>`;
  const tU = r => +(r.date || r.ts) || 0, uU = list('inspections').sort((x, y) => tU(y) - tU(x))[0];
  const revAp = k => { const f = revFalta('ap:' + k), u = apRevistas(k)[0]; return f != null && f <= 0 ? ['toca', 'warn txt'] : u ? [corta(u.ts), ''] : ['—', 'nada']; };
  return `<div class="esp-tiles" role="group" aria-label="Estado de cada especialidad">
    <div class="esp-head" aria-hidden="true"><span></span><span class="esp-h-n">Especialidad</span><span>Gente</span><span>Material</span><span>Revista</span><span>Faltan</span></div>
    ${fila("go('contenedor')", '<img class="esp-art" src="img/logo.webp" alt="">', 'USAR', 'Rescate urbano', usarOps(), list('gear').map(g => ({ status: g.status })), prefs.draft ? ['abierta', 'warn txt'] : uU && tU(uU) ? [corta(tU(uU)), ''] : ['—', 'nada'], needsAbiertas('usar').length)}
    ${Object.entries(APARTADOS).map(([k, ap]) => fila(`go('${k}')`, ESP_ART.includes(k) ? `<img class="esp-art" src="img/esp/${k}.webp" alt="">` : `<span class="esp-art">${ic(ap.icon)}</span>`, ap.name, ap.largo, ap.comun ? null : apMiembros(k), apVivo(k), revAp(k), needsAbiertas(k).length)).join('')}
  </div>`;
}

// «GRANADOS» → «Granados» (los nombres se guardan en mayúsculas)
const nombreBonito = n => String(n || '').toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
// Inicio: la fuerza de hoy (presentes por pelotón) y los accesos de cada día
function fuerzaPanel() {
  const ops = operators(), pres = ops.filter(o => !esAusente(o)), pels = PELOTONES.filter(k => ops.some(o => o.peloton === k));
  const q = (icon, label, onclick) => `<button class="dash-q" onclick="${onclick}"><span class="dash-q-i">${ic(icon, 'i-lg')}</span>${label}</button>`;
  return `<div class="dash-cols">
    <div class="panel">
      <div class="between"><h3>Fuerza de hoy</h3><button class="link" onclick="go('recursos')">Logística</button></div>
      <div class="log-fig ${logCls(pres.length, ops.length)}"><b>${pres.length}</b><span>de ${ops.length} presentes</span></div>
      ${pels.map(k => logMeter(k, pres.filter(o => o.peloton === k).length, ops.filter(o => o.peloton === k).length, "go('recursos')")).join('')}
    </div>
    <div class="dash-quick">
      ${q('check', 'Pasar lista', 'pasarLista()')}${q('chat', 'Parte', "shareText(sierParte(), 'Parte de personal')")}
      ${q('gauge', 'Logística', "go('recursos')")}${q('clipboard', 'Revista', "go('revista')")}
    </div>
  </div>`;
}
// Estado vacío: icono en un círculo, una frase y, si hace falta, el botón para empezar
const errorState = () => `<div class="panel">${emptyState('alert', 'Esta pantalla no se ha podido abrir', 'Tus datos están a salvo. Vuelve a Inicio o recarga la app; si se repite, avisa al jefe.',
  `<div class="row" style="justify-content:center; margin-top:12px"><button class="btn btn-a" onclick="go('avisos')">${ic('home')} Ir a Inicio</button><button class="btn btn-g" onclick="location.reload()">${ic('refresh')} Recargar</button></div>`)}</div>`;
const emptyState = (icon, title, text = '', action = '') => `<div class="empty"><span class="empty-i">${ic(icon)}</span><b>${esc(title)}</b>${text ? `<p>${esc(text)}</p>` : ''}${action}</div>`;

// Una línea con la situación de lo que está en revisión: dónde está, desde cuándo y por qué
const revLine = (g, where) => g.rev ? [REV_STATES[g.rev.state]?.[0], g.rev.where || where(g), g.rev.since ? 'desde ' + fmtDate(g.rev.since) : '', g.rev.reason].filter(Boolean).join(' · ') : where(g) + (g.nov?.text ? '. ' + g.nov.text : '');
function reportText() {
  const a = alerts(), gearList = list('gear');
  const ok = gearList.filter(g => g.status === 'OPERATIVO').length;
  const lines = [
    ...waHead('🧰', 'USAR 242 · Estado del material'),
    `📅 ${fmtWhen(Date.now())} · 👤 ${prefs.activeOperator}`,
    `📊 *Operatividad:* ${Math.round(ok / (gearList.length || 1) * 100)}% (${ok}/${gearList.length} equipos)`
  ];
  const block = (title, items) => { if (items.length) lines.push('', `${waB(title + ' (' + items.length + ')')}`, ...items.map(s => '• ' + s)); };
  block('🔴 Averiados', a.broken.map(g => `${g.name}: ${revLine(g, placeShort)}`));
  block('🟡 En revisión', a.review.map(g => `${g.name}: ${revLine(g, placeShort)}`));
  block('📝 Novedades', a.nov.map(x => `${x.code && get('boxes', x.id) ? 'Caja ' + x.code : x.name}: ${x.nov.text}`));
  block('🦺 EPI por revisar', a.epi.map(e => `${epiLabel(e)} de ${opName(e.holder)}`));
  block('⏰ Vencimientos', a.due.map(d => `${d.kind === 'gear' ? d.item.name : epiLabel(d.item) + ' de ' + opName(d.item.holder)}: ${due(d.date).text.toLowerCase()}`));
  block('📦 Stock bajo', a.low.map(c => `${c.name}: ${c.stock} ${c.unit} (mín. ${c.min})`));
  block('🚗 ITV sin apuntar', a.itv.map(x => `${x.v.name} ${x.u.plate}: ${fmtDate(x.u.itv)}`));
  block('🚒 Vehículos con fallos', a.veh.map(x => `${x.v.name} ${x.u.plate}: ${unitFallos(x.v, x.u).join(', ')}`));
  block('↗️ Fuera del contenedor', a.out.map(g => `${g.name} → ${g.out.who}`));
  if (!alertCount(a)) lines.push('', '✅ *Sin incidencias*');
  return lines.join('\n');
}
/* ==================== BÚSQUEDA ==================== */
function renderSearch() {
  const q = $('search').value.trim().toLowerCase();
  const box = $('results');
  box.classList.toggle('hidden', !q);
  if (!q) return;
  const qf = fold(q), hit = (...fields) => fields.some(f => fold(f).includes(qf));   // sin tildes: «cojin» encuentra «Cojín»
  const results = [
    ...list('epis').filter(e => hit(e.name, e.size, opName(e.holder))).map(e =>
      ['EPI', e.name, `${opName(e.holder)} · Talla ${e.size}`, `epiForm('${e.id}')`]),
    ...list('consumables').filter(c => hit(c.name, c.location)).map(c =>
      ['Stock', c.name, `${c.stock} ${c.unit} · ${consDoor(c) ? doorName(consDoor(c)) : 'sin ubicar'}`, `findGo('cons', '${c.id}')`]),
    ...operators().filter(o => hit(o.name, o.role, o.cell, o.phone, readiness(o.id).fullName, o.empleo, o.peloton, opEsp(o))).map(o =>
      ['Personal', o.name, [dispDe(o).txt, o.peloton, o.role].filter(Boolean).join(' · '), `openPerson('${o.id}')`, dispDe(o).cls]),
    ...list('docs').filter(d => hit(d.type, d.number, d.notes, opName(d.op))).map(d =>
      ['Documento', `${d.type} de ${opName(d.op)}`, d.expires ? 'Caduca ' + fmtDate(d.expires) : 'Sin caducidad', `openPerson('${d.op}'); docDetail('${d.id}')`]),
    ...matTodo().filter(m => hit(m.name, m.place, m.serial, m.notes)).map(m =>
      ['Material', m.name, [matDueno(m), huecoTxt(m), m.place].filter(Boolean).join(' · '), matIr(m), matPeor(m)]),
    ...list('arcs').filter(x => hit(x.name, x.team)).map(x =>
      ['Arco', x.name, ['Apuntalar arcos', x.team].filter(Boolean).join(' · '), `openArc('${x.id}')`])
  ];
  // El material y las cajas van primero, diciendo dónde están (lateral, hueco, caja o vehículo)
  const mat = findResults(q);
  box.innerHTML = `
    <div class="between" style="margin-bottom:10px"><h3 class="sec-title" style="margin:0">${ic('search')} ${mat.length + results.length} ${mat.length + results.length === 1 ? 'resultado' : 'resultados'}</h3>
      <button class="link" onclick="clearSearch()">Cerrar</button></div>
    ${mat.length ? `<div class="find-res" style="margin:0 0 12px; box-shadow:none">${findItems(mat)}</div>` : ''}
    <div class="grid g3">${results.map(([where, name, detail, go, st]) => `
      <button class="item res-item ${st ? 'res-st-' + st : ''}" style="display:block" onclick="clearSearch(); ${go}">
        <small class="res-k">${esc(where)}</small><b>${st ? `<i class="disp-dot" aria-hidden="true"></i>` : ''}${esc(name)}</b><small class="res-d">${esc(detail)}</small>
      </button>`).join('') || (mat.length ? '' : '<p class="muted">Sin coincidencias.</p>')}</div>`;
}
function clearSearch() { $('search').value = ''; renderSearch(); $('searchbar').classList.add('hidden'); }

/* ==================== MODAL Y FORMULARIOS ==================== */
// Ventana: el foco pasa a la ventana (sin abrir el teclado) y vuelve al botón que la abrió al cerrar
let modalReturn = null;
let MODAL_CLOSING = null;   // con movimiento, la ventana se cierra tras bajar (y si se abre otra entretanto, no se cierra)
function openModal(title, html) {
  if (MODAL_CLOSING) { clearTimeout(MODAL_CLOSING); MODAL_CLOSING = null; $('modal').classList.remove('closing'); }
  const wasOpen = !$('modal').classList.contains('hidden');
  if (!wasOpen) { modalReturn = document.activeElement; history.pushState({ nav: navSnap(), modal: 1 }, ''); }
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = html;
  $('modal').classList.remove('hidden');
  const sheet = $('modal').querySelector('.sheet');
  sheet.style.transform = ''; sheet.style.transition = '';
  // Si ya había una ventana abierta (un paso más), el contenido nuevo entra con un fundido corto
  if (wasOpen && motion()) $('modalBody').animate?.([{ opacity: .35, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.22, 1, .36, 1)' });
  sheet.setAttribute('tabindex', '-1'); sheet.focus({ preventScroll: true });
}
function closeModal() {
  if ($('modal').classList.contains('hidden') || MODAL_CLOSING) return;
  if (motion()) {
    $('modal').classList.add('closing');
    MODAL_CLOSING = setTimeout(() => { MODAL_CLOSING = null; $('modal').classList.remove('closing'); $('modal').classList.add('hidden'); }, 180);
  } else $('modal').classList.add('hidden');
  if (modalReturn?.isConnected) modalReturn.focus({ preventScroll: true });
  modalReturn = null;
}
// En el móvil, la ventana se cierra arrastrándola hacia abajo desde su cabecera (sigue al dedo; si se suelta pronto, vuelve)
let SHEET_DRAG = null;
document.addEventListener('pointerdown', e => {
  const head = e.target.closest('#modal .sheet-head'); if (!head || e.pointerType === 'mouse' || e.target.closest('button') || WIDE.matches) return;
  const sheet = head.parentElement; if (sheet.scrollTop > 0) return;
  SHEET_DRAG = { sheet, y: e.clientY, dy: 0 };
});
document.addEventListener('pointermove', e => {
  const d = SHEET_DRAG; if (!d) return;
  d.dy = Math.max(0, e.clientY - d.y); d.sheet.style.transition = 'none'; d.sheet.style.transform = d.dy ? `translateY(${d.dy}px)` : '';
});
const sheetDrop = () => { const d = SHEET_DRAG; if (!d) return; SHEET_DRAG = null;
  if (d.dy > 110) { haptic(10); return closeModal(); }
  d.sheet.style.transition = 'transform .24s cubic-bezier(.22, 1, .36, 1)'; d.sheet.style.transform = ''; };
document.addEventListener('pointerup', sheetDrop); document.addEventListener('pointercancel', sheetDrop);
// Con teclado, el tabulador no sale de la ventana abierta
addEventListener('keydown', e => {
  if (e.key !== 'Tab' || $('modal').classList.contains('hidden')) return;
  const f = [...$('modal').querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter(x => !x.disabled && x.offsetParent);
  if (!f.length) return;
  const first = f[0], last = f.at(-1);
  if (e.shiftKey && (document.activeElement === first || document.activeElement === $('modal').querySelector('.sheet'))) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

function removeItem(kind, id) {
  const item = get(kind, id);
  if (FLOTA_KINDS.includes(kind) && !soloFlota()) return;
  if (!item || !confirm(`¿Eliminar "${item.name}"?`)) return;
  remove(kind, id, `Eliminado "${item.name}"`);
  closeModal();
}

// fields: [{ k, label, value, type: text|number|date|photo, options: [[valor, texto]], required, wide, placeholder }]
// Campos checks: una opción [valor, texto, máximo] con máximo > 1 lleva casilla de unidades (valor inicial en f.qty) y devuelve values[k + 'Qty']
// Campos con lista (catalog): opciones de serie + propias y «➕ Otra…». Campos con carry: recuerdan el último valor usado.
function openForm(title, fields, onSave, extra = '') {
  prefs.last ||= {};
  fields.forEach(f => {
    if (f.carry && (f.value === undefined || f.value === '' || f.value === null) && prefs.last[f.carry] != null) f.value = prefs.last[f.carry];
    if (f.catalog) {
      const items = catalog(f.catalog), cur = [].concat(f.value || []).filter(v => v && !items.includes(v));
      if (f.type === 'checks') f.options = [...items, ...cur].map(x => [x, x]);
      else if (f.free) f.list = items;
      else f.options = [...(f.required ? [] : [['', f.empty || '—']]), ...[...items, ...cur].map(x => [x, x]), ['__new', '➕ Otra…']];
    }
  });
  const control = f => {
    const attrs = `name="${f.k}" class="input" ${f.required ? 'required' : ''} ${f.catalog ? `data-catalog="${f.catalog}"` : ''}`;
    if (f.type === 'checks') return (f.filter ? `<input class="input" type="search" placeholder="Filtrar…" aria-label="Filtrar ${esc(f.label)}" oninput="const q = fold(this.value); this.nextElementSibling.querySelectorAll('.check-row').forEach(r => r.hidden = q && !fold(r.textContent).includes(q))">` : '') + `<div class="checks${f.filter ? ' scroll' : ''}${f.one ? ' one' : ''}">${f.options.map(([v, l, max]) => `
      <label class="check-row"><input type="checkbox" name="${f.k}" value="${esc(v)}" ${(f.value || []).includes(v) ? 'checked' : ''}><span>${esc(l)}</span>${max > 1 ? `<input class="input sm qty-in" type="number" name="${f.k}__q_${esc(v)}" min="1" max="${max}" value="${Math.min(max, f.qty?.[v] || max)}" inputmode="numeric" aria-label="Unidades de ${esc(l)}" onclick="event.stopPropagation()">` : ''}</label>`).join('')}
      ${f.catalog ? `<input class="input sm check-new" name="${f.k}__new" aria-label="Añadir otra opción" placeholder="➕ Otra (separa con comas)…" autocomplete="off">` : ''}</div>`;
    // Lista de cosas con un estado cada una (p. ej. bien, falta o roto) y una nota cuando no está en el primero
    if (f.type === 'estados') return `<div class="est-list">${f.options.map(([v, l, sub, pre]) => { const cur = f.value?.[v] || f.estados[0][0]; return `
      <div class="est-row" data-est="${cur}" data-ini="${f.estados[0][0]}"><div class="est-t"><b>${esc(l)}</b>${sub ? `<small>${esc(sub)}</small>` : ''}</div>
        <div class="est-ops" role="radiogroup" aria-label="${esc(l)}">${f.estados.map(([e, t]) => `<label class="est-op est-${e}"><input type="radio" name="${f.k}__${esc(v)}" value="${e}" ${e === cur ? 'checked' : ''} onchange="this.closest('.est-row').dataset.est = this.value"><span>${t}</span></label>`).join('')}</div>
        ${pre != null ? `<label class="est-pre">Precinto (si está intacto, se da por bueno sin abrir)<input class="input sm" name="${f.k}__p_${esc(v)}" value="${esc(pre)}" autocomplete="off" aria-label="Precinto de ${esc(l)}"></label>` : ''}
        <input class="input sm est-nota" name="${f.k}__n_${esc(v)}" placeholder="Qué le pasa (opcional)" aria-label="Qué le pasa a ${esc(l)}" autocomplete="off"></div>`; }).join('')}</div>`;
    if (f.options) return `<select ${attrs} ${f.catalog ? 'onchange="catalogNew(this)"' : ''}>${f.options.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(f.value ?? '') ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    if (f.type === 'textarea') return `<span class="dictate-wrap"><textarea ${attrs} rows="${f.rows || 4}" placeholder="${esc(f.placeholder)}">${esc(f.value)}</textarea>${micButton()}</span>`;
    // Firma con el dedo (o el ratón): se guarda como imagen
    if (f.type === 'signature') return `<div class="sig" data-sig><canvas width="640" height="240" aria-label="${esc(f.label)}: firma con el dedo"></canvas>
      <input type="hidden" name="${f.k}" value=""><button type="button" class="link" onclick="sigClear(this)">Borrar firma</button></div>`;
    if (f.type === 'photo') return `
      <div class="photo-field" data-photo ${f.max ? `data-max="${f.max}"` : ''}>
        <input type="hidden" name="${f.k}" value="${esc(f.value)}">
        <img class="thumb ${f.value ? '' : 'hidden'}" src="${esc(f.value)}" alt="">
        <label class="btn btn-a btn-sm" style="cursor:pointer">${ic('camera', 'i-sm')} Cámara
          <input type="file" accept="image/*" capture="environment" class="hidden" onchange="pickPhoto(this)"></label>
        <label class="btn btn-g btn-sm" style="cursor:pointer">${ic('upload', 'i-sm')} Galería
          <input type="file" accept="image/*" class="hidden" onchange="pickPhoto(this)"></label>
        <button type="button" class="link bad ${f.value ? '' : 'hidden'}" onclick="clearPhoto(this)">Quitar</button>
      </div>`;
    const dl = f.list ? `<datalist id="dl-${f.k}">${f.list.map(o => `<option value="${esc(o)}">`).join('')}</datalist>` : '';
    return `<input ${attrs} type="${f.type || 'text'}" value="${esc(f.value)}" placeholder="${esc(f.placeholder)}" ${f.list ? `list="dl-${f.k}" ` : ''}autocomplete="off" ${f.type === 'number' ? 'inputmode="decimal" min="0" step="any"' : ''}>${dl}`;
  };
  openModal(title, `
    <form id="modalForm" class="form">
      ${fields.map(f => { const tag = ['photo', 'checks', 'signature', 'estados'].includes(f.type) ? 'div' : 'label'; return `<${tag} class="lbl ${f.wide ? 'wide' : ''}">${f.label}${control(f)}</${tag}>`; }).join('')}
      <button class="btn btn-a wide">${ic('check')} Guardar</button>
      ${extra}
    </form>`);
  const form = $('modalForm');
  form.querySelectorAll('[data-sig]').forEach(initSig);
  form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(form), values = {};
    fields.forEach(f => {
      if (f.type === 'estados') { values[f.k] = Object.fromEntries(f.options.map(([v]) => [v, { st: fd.get(`${f.k}__${v}`) || f.estados[0][0], nota: String(fd.get(`${f.k}__n_${v}`) || '').trim(), pre: fd.has(`${f.k}__p_${v}`) ? String(fd.get(`${f.k}__p_${v}`)).trim() : null }])); return; }
      if (f.type === 'checks') values[f.k] = [...fd.getAll(f.k), ...String(fd.get(f.k + '__new') || '').split(',').map(s => s.trim()).filter(Boolean)];
      else { const v = fd.get(f.k); values[f.k] = typeof v === 'string' ? v.trim() : ''; if (values[f.k] === '__new') values[f.k] = ''; }
      // Opciones con varias unidades (tercer elemento = máximo): cuántas se eligen de cada una
      if (f.type === 'checks' && f.options.some(o => o[2] > 1)) values[f.k + 'Qty'] = Object.fromEntries(f.options.filter(([v, , max]) => max > 1 && values[f.k].includes(v))
        .map(([v, , max]) => [v, Math.max(1, Math.min(max, Math.round(+fd.get(`${f.k}__q_${v}`) || max)))]));
      if (f.catalog) [].concat(values[f.k]).forEach(v => addOption(f.catalog, v));
      if (f.carry) prefs.last[f.carry] = values[f.k];
    });
    writeJSON(KEY.prefs, prefs);
    closeModal();
    onSave(values);
  };
  if (matchMedia('(min-width: 720px)').matches) form.querySelector('input:not([type=hidden])')?.focus();
}

async function pickPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const box = input.closest('[data-photo]');
  try {
    const data = await compressImage(file, +box.dataset.max || 900);
    box.querySelector('input[type=hidden]').value = data;
    const img = box.querySelector('img');
    img.src = data; img.classList.remove('hidden');
    box.querySelector('button').classList.remove('hidden');
  } catch { toast('No se pudo leer la imagen', 'bad'); }
}
function clearPhoto(btn) {
  const box = btn.closest('[data-photo]');
  box.querySelector('input[type=hidden]').value = '';
  box.querySelector('img').classList.add('hidden');
  btn.classList.add('hidden');
}
function compressImage(file, max = 900) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = Object.assign(document.createElement('canvas'), { width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.65));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/* ==================== MANIFIESTO ==================== */
function printManifest() {
  const a = alerts(), ops = operators();
  $('print').innerHTML = `
    <h1>USAR 242 · Manifiesto de salida</h1>
    <p>${new Date().toLocaleString('es-ES')} · Control: ${esc(prefs.activeOperator)} · Perfil: ${PRESETS[mission()][0]}</p>
    <h2>1. Personal y puestos (${ops.length})</h2>
    <table><tr><th>Efectivo</th><th>Célula</th><th>Puesto</th></tr>
      ${ops.map(o => `<tr><td><b>${esc(o.name)}</b></td><td>${esc(o.cell)}</td><td>${esc(o.role)}</td></tr>`).join('')}</table>
    <h2>2. Incidencias de material (${a.broken.length + a.review.length})</h2>
    <ul>${[...a.broken, ...a.review].map(g => `<li><b>[${esc(placeShort(g))}] ${esc(g.name)}</b> — ${esc(revLine(g, () => g.status))}</li>`).join('') || '<li>Todo el material operativo.</li>'}${a.nov.map(x => `<li><b>${esc(x.code && get('boxes', x.id) ? 'Caja ' + x.code : x.name)}</b> — novedad: ${esc(x.nov.text)}</li>`).join('')}</ul>
    <h2>3. Vencimientos próximos (${a.due.length})</h2>
    <ul>${a.due.map(d => `<li><b>${esc(d.item.name)}</b> — ${d.what}: ${fmtDate(d.date)} (${due(d.date).text})</li>`).join('') || '<li>Nada próximo a vencer.</li>'}</ul>
    <h2>4. Fuera del contenedor (${a.out.length})</h2>
    <ul>${a.out.map(g => `<li><b>${esc(g.name)}</b> — ${esc(g.out.who)}${g.out.note ? ' · ' + esc(g.out.note) : ''}</li>`).join('') || '<li>Todo el material en su sitio.</li>'}</ul>
    <h2>5. Consumibles bajo mínimo (${a.low.length})</h2>
    <ul>${a.low.map(c => `<li><b>${esc(c.name)}</b>: ${c.stock} ${esc(c.unit)} (mín. ${c.min})</li>`).join('') || '<li>Stock correcto.</li>'}</ul>`;
  print();
}

/* ==================== ENLACES (QR de equipo) ==================== */
function handleHash() {
  const hash = location.hash.slice(1);
  const eq = hash.indexOf('=');
  if (eq < 0) return;
  const [key, value] = [hash.slice(0, eq), decodeURIComponent(hash.slice(eq + 1))];
  history.replaceState(history.state, '', location.pathname + location.search);
  if (!loggedIn()) { prefs.afterLogin = '#' + hash; writeJSON(KEY.prefs, prefs); return; }   // se abre al entrar
  if (bloqueado()) return;

  if (key === 'g') {
    const g = get('gear', value);
    if (!g) return toast('Equipo no encontrado en este dispositivo', 'bad');
    setPref({ tab: 'contenedor', door: groupKey(g) });
    gearDetail(value);
  }
  if (key === 'm') {
    const m = get('matesp', value);
    if (!m) return toast('Material no encontrado en este dispositivo', 'bad');
    if (m.veh) { setPref({ tab: 'vehiculos' }); } else setPref({ tab: m.ap, aptab: 'material' });
    matForm(duenoTxt(m), m.id);
  }
  if (key === 'h') {   // apartado.pasillo.lado.módulo.altura
    const [k, pas, l, mod, niv] = value.split('.'), lado = l === 'D' ? 'D' : 'I', d = pasDoor(+pas, lado, +mod, +niv || 0);
    if (!pasVale(d)) return toast('Ese hueco ya no existe', 'bad');
    // Se abre en su apartado si el pasillo sigue siendo suyo; si no, en el Almacén
    if (APARTADOS[k] && apPasillos(k).includes(+pas)) setPref({ tab: k, aptab: 'material', pasN: { ...prefs.pasN, [k]: +pas }, pasLado: lado });
    else setPref({ tab: 'almacen', almPas: +pas, pasLado: lado });
    cellModal(d);
  }
  if (key === 'k') {
    if (!get('boxes', value)) return toast('Caja no encontrada en este dispositivo', 'bad');
    setPref({ tab: placeTab(get('boxes', value)?.door) }); boxDetail(value);
  }
}

/* ---------- Firma con el dedo ---------- */
function initSig(box) {
  const c = box.querySelector('canvas'), x = c.getContext('2d'), out = box.querySelector('input');
  x.lineWidth = 3.2; x.lineCap = x.lineJoin = 'round'; x.strokeStyle = '#111';
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  let drawing = false, last = null;
  const pos = e => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
  c.addEventListener('pointerdown', e => { drawing = true; last = pos(e); c.setPointerCapture(e.pointerId); e.preventDefault(); });
  c.addEventListener('pointermove', e => { if (!drawing) return; const p = pos(e); x.beginPath(); x.moveTo(...last); x.lineTo(...p); x.stroke(); last = p; box.classList.add('signed'); });
  const end = () => { if (!drawing) return; drawing = false; if (box.classList.contains('signed')) out.value = c.toDataURL('image/png'); };
  c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
}
function sigClear(btn) {
  const box = btn.closest('[data-sig]'), c = box.querySelector('canvas'), x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); box.classList.remove('signed'); box.querySelector('input').value = '';
}

/* ---------- Visor de fotos con zoom (la app no se amplía; las fotos y el mapa sí) ---------- */
function openZoom(src, alt = '') {
  if (!src) return;
  let z = $('zoomer');
  if (!z) { z = Object.assign(document.createElement('div'), { id: 'zoomer', className: 'zoomer' }); document.body.appendChild(z); }
  z.innerHTML = `<img src="${esc(src)}" alt="${esc(alt)}" draggable="false"><button class="zoom-x" aria-label="Cerrar">${ic('x', 'i-lg')}</button><small class="zoom-hint">Pellizca o toca dos veces para ampliar</small>`;
  z.classList.add('on'); document.body.classList.add('zooming');
  const img = z.querySelector('img'), pts = new Map();
  let s = 1, x = 0, y = 0, start = null, lastTap = 0;
  const apply = () => { img.style.transform = `translate(${x}px, ${y}px) scale(${s})`; };
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  z.onpointerdown = e => {
    if (e.target.closest('.zoom-x')) return;
    z.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) start = { d: dist(), s, x, y };
    else if (pts.size === 1) {
      const now = Date.now();
      if (now - lastTap < 300) { s = s > 1 ? 1 : 2.5; x = y = 0; apply(); }
      lastTap = now; start = { px: e.clientX, py: e.clientY, x, y };
    }
  };
  z.onpointermove = e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && start?.d) { s = Math.min(6, Math.max(1, start.s * dist() / start.d)); apply(); }
    else if (pts.size === 1 && start?.px != null && s > 1) { x = start.x + e.clientX - start.px; y = start.y + e.clientY - start.py; apply(); }
  };
  const up = e => { pts.delete(e.pointerId); if (s <= 1) { x = y = 0; apply(); } start = pts.size === 1 ? (() => { const p = [...pts.values()][0]; return { px: p.x, py: p.y, x, y }; })() : null; };
  z.onpointerup = up; z.onpointercancel = up;
  z.onwheel = e => { e.preventDefault(); s = Math.min(6, Math.max(1, s * (e.deltaY < 0 ? 1.2 : 1 / 1.2))); if (s === 1) x = y = 0; apply(); };
  z.querySelector('.zoom-x').onclick = closeZoom;
  history.pushState({ ...(history.state || {}), zoom: 1 }, '');
}
function closeZoom() { const z = $('zoomer'); if (!z?.classList.contains('on')) return false; z.classList.remove('on'); z.innerHTML = ''; document.body.classList.remove('zooming'); return true; }
// Pellizcar la página no la amplía (iOS ignora user-scalable=no): solo el visor de fotos y el mapa
document.addEventListener('gesturestart', e => { if (!e.target.closest?.('.zoomer, .map')) e.preventDefault(); }, { passive: false });
document.addEventListener('touchmove', e => { if (e.touches.length > 1 && !e.target.closest?.('.zoomer, .map')) e.preventDefault(); }, { passive: false });
// Tocar una foto la abre en el visor
document.addEventListener('click', e => {
  const img = e.target.closest?.('img.doc-full, .gal img, img.art-lg, img.thumb:not(.sm), .person-photo');
  if (img && !img.closest('[data-photo], .zoomer') && img.src) { e.preventDefault(); openZoom(img.src, img.alt); }
});

/* ---------- Gesto «atrás» del móvil (o botón atrás): vuelve a la pantalla anterior de la app ---------- */
// Cada cambio de pantalla deja una entrada en el historial del navegador; abrir una ventana, el menú o una foto, también.
const navSnap = () => ({ tab: prefs.tab, person: prefs.person || null, arc: prefs.arc || null });
const navKey = s => JSON.stringify(s);
let NAV_KEY = null, NAV_POP = false;
function navTrack() {
  const s = navSnap(), k = navKey(s);
  if (NAV_KEY === null) history.replaceState({ nav: s }, '');
  else if (!NAV_POP && k !== NAV_KEY) history.pushState({ nav: s }, '');
  NAV_KEY = k;
}
addEventListener('popstate', e => {
  if (closeZoom()) return;
  if (!$('modal').classList.contains('hidden')) { $('modal').classList.add('hidden'); modalReturn = null; return; }
  if (!$('drawer').classList.contains('hidden')) { const d = $('drawer'); d.classList.add('hidden'); document.body.classList.remove('drawer-open'); $('drawerPanel').innerHTML = ''; return; }
  const st = e.state;
  if (st?.modal || st?.drawer || st?.zoom) { history.back(); return; }   // entrada de una ventana que ya se cerró
  if (st?.nav && loggedIn()) {
    NAV_POP = true; Object.assign(prefs, st.nav); writeJSON(KEY.prefs, prefs); render(); NAV_POP = false;
    NAV_KEY = navKey(navSnap()); scrollTo(0, 0);
  }
});
