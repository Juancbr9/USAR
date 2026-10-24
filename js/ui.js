'use strict';
// USAR 242 · Interfaz común: navegación, Inicio, búsqueda, ventanas, formularios y enlaces

/* ==================== RENDER GENERAL ==================== */
// Áreas, secciones y barra de navegación: ver js/areas.js

function render() {
  if (!loggedIn()) return renderLogin();
  if (bloqueado()) return renderMantenimiento();
  document.body.classList.remove('login-on');
  if (HUB_TO[prefs.tab]) prefs.tab = HUB_TO[prefs.tab];
  applyArea();
  renderHeader();
  renderNav();
  renderActivationBar();
  $('view').innerHTML = areaHeader(prefs.tab) + (VIEWS[prefs.tab] || VIEWS.avisos)();
  if (document.querySelector('.cvi')) fitCells();
  navTrack();
  if ($('search').value) renderSearch();
  updateWakeLock();
  renderFab();
}

const WIDE = matchMedia('(min-width: 1024px)');
WIDE.addEventListener?.('change', () => renderNav());
function renderNav() {
  const count = alertCount(alerts()), active = list('missions').some(m => m.status === 'active');
  renderDrawer(count, active);
  // Tablet en horizontal y PC: el mismo menú desplegable, fijo a la izquierda
  $('nav').innerHTML = WIDE.matches ? `<div class="nav-tree">${menuTree(count, active)}</div>` : '';
}

// Menú por niveles: Inicio, Activación, Logística (con Material dentro), Equipo y Ajustes. Al tocar un grupo se despliega.
const tabGroups = tab => { const s = sectionOf(tab) || (tab === 'operaciones' ? [, , , , 'ops'] : null); return s ? [s[4], s[5]].filter(Boolean) : []; };
function menuOpen(g) { return (prefs.menuOpen ?? tabGroups(prefs.tab)).includes(g); }
function toggleMenuGroup(g) {
  let cur = prefs.menuOpen ?? tabGroups(prefs.tab);
  if (cur.includes(g)) cur = cur.filter(x => x !== g && !(g === 'log' && x === 'mat'));
  else cur = g === 'mat' ? [...cur, 'mat'] : [g];   // en el primer nivel, un grupo abierto a la vez
  prefs.menuOpen = cur; writeJSON(KEY.prefs, prefs); renderNav();
}
function menuTree(count, active) {
  const curTab = prefs.tab === 'operaciones' ? (get('missions', prefs.mission)?.type === 'ejercicio' ? 'ejercicios' : 'intervenciones') : prefs.tab;
  const item = (id, icon, title, cls = '') => { const st = sectionStatus(id); return `
    <button class="dr-item ${cls} ${curTab === id ? 'on' : ''}" data-area="${areaOf(id)}" ${curTab === id ? 'aria-current="page"' : ''} onclick="go('${id}')">
      ${ic(icon, 'i-lg')}<span class="grow"><b>${title}</b>${id === 'avisos' ? `<small>${count ? count + ' avisos' : 'Todo en orden'}</small>` : ''}</span>
      ${id === 'avisos' && count ? `<span class="count">${count}</span>` : ''}${id === 'intervenciones' && active ? '<span class="live-dot"></span>' : ''}
      ${st && st[1] !== 'neutral' && st[1] !== 'ok' ? `<span class="dr-dot ${st[1]}" title="${esc(st[0])}"></span>` : ''}</button>`; };
  const head = (g, icon, title, cls = '') => { const open = menuOpen(g), on = tabGroups(curTab).includes(g);
    return `<button class="dr-group-head ${cls} ${on ? 'has-on' : ''}" data-area="${g === 'mat' ? 'log' : g}" aria-expanded="${open}" onclick="toggleMenuGroup('${g}')">${ic(icon, 'i-lg')}<span class="grow"><b>${title}</b></span>${ic('chev', 'i-sm chev')}</button>`; };
  const items = (filter, cls) => SECTIONS.filter(filter).map(([id, icon, title]) => item(id, icon, title, cls)).join('');
  return item('avisos', 'home', 'Inicio') + ['ops', 'log', 'team', 'help'].map(ar => `
    <div class="dr-group ${menuOpen(ar) ? 'open' : ''}" data-area="${ar}">
      ${head(ar, AREAS[ar].icon, AREAS[ar].name)}
      ${menuOpen(ar) ? `<div class="dr-children">${ar === 'log'
        ? `<div class="dr-group sub ${menuOpen('mat') ? 'open' : ''}">${head('mat', 'box', 'Material', 'sub')}${menuOpen('mat') ? `<div class="dr-children">${items(s => s[5] === 'mat', 'sub2')}</div>` : ''}</div>` + items(s => s[4] === ar && !s[5], 'sub')
        : items(s => s[4] === ar, 'sub')}</div>` : ''}
    </div>`).join('');
}

// Menú de tres rayas (móvil y tablet)
function renderDrawer(count = alertCount(alerts()), active = list('missions').some(m => m.status === 'active')) {
  const mc = $('menuCount');
  if (mc) { mc.textContent = count > 99 ? '99+' : count; mc.classList.toggle('hidden', !count); }
  const panel = $('drawerPanel'); if (!panel || $('drawer').classList.contains('hidden')) return;
  panel.innerHTML = `
    <div class="dr-head"><div class="wordmark">USAR <span class="plate">242</span></div>
      <button class="icon-btn" aria-label="Cerrar menú" onclick="toggleDrawer(false)">${ic('x', 'i-lg')}</button></div>
    ${menuTree(count, active)}`;
}
function toggleDrawer(open) {
  const d = $('drawer'); if (!d) return;
  open ??= d.classList.contains('hidden');
  d.classList.toggle('hidden', !open); document.body.classList.toggle('drawer-open', open);
  if (!open) $('drawerPanel').innerHTML = '';
  $('menuBtn')?.setAttribute('aria-expanded', open);
  if (open) { renderDrawer(); d.querySelector('.dr-item.on, .dr-item')?.focus({ preventScroll: true }); history.pushState({ nav: navSnap(), drawer: 1 }, ''); }
}

function go(tab) { tab = HUB_TO[tab] || tab; toggleDrawer(false); haptic(8); setPref({ tab, menuOpen: null, ...(['operaciones', 'intervenciones', 'ejercicios'].includes(tab) ? { mission: null, ws: null, mtab: 'resumen' } : {}), ...(tab === 'personal' ? { person: null } : {}) }); scrollTo(0, 0); }
const openMission = (id, mtab = 'resumen') => { toggleDrawer(false); setPref({ tab: 'operaciones', mission: id, ws: null, mtab }); scrollTo(0, 0); };

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
    ready: operators().flatMap(o => readinessIssues(o.id).map(([cls, text]) => ({ o, cls, text })))
  };
}
const alertCount = a => a.broken.length + a.review.length + a.nov.length + a.epi.length + a.due.length + a.low.length + a.out.length + a.ready.length;

/* ==================== VISTA: INICIO ==================== */
function viewAvisos() {
  const a = alerts(), total = alertCount(a), gearList = list('gear');
  const pct = Math.round(gearList.filter(g => g.status === 'OPERATIVO').length / (gearList.length || 1) * 100);
  const row = (onclick, title, sub, right = '') =>
    `<button class="item" onclick="${onclick}"><div><b>${esc(title)}</b><small>${esc(sub)}</small></div>${right}</button>`;
  const section = (title, cls, rows, area = 'log') => rows.length ? `
    <div class="panel area-panel" data-area="${area}"><div class="between sec-head"><h3><span class="area-chip">${AREAS[area].name}</span>${title}</h3><span class="tag ${cls}">${rows.length}</span></div>
    <div class="list">${rows.join('')}</div></div>` : '';
  const where = g => whereIs(g) + (boxCode(g) ? ', caja ' + boxCode(g) : '');
  const kpi = (label, value, cls, tab) => `<button class="kpi ${cls}" onclick="go('${tab}')"><div><small>${label}</small><b>${value}</b></div></button>`;
  const active = list('missions').filter(m => m.status === 'active');
  const next = list('missions').filter(m => m.status === 'prep').sort((x, y) => (x.date || '').localeCompare(y.date || ''))[0];
  const hour = new Date().getHours();
  const hello = hour < 14 ? 'Buenos días' : hour < 21 ? 'Buenas tardes' : 'Buenas noches';

  return `
    <div class="hero">
      <p class="hello">${hello}, ${esc(prefs.activeOperator)}</p>
      <p style="margin:6px 0 10px">${total ? `Hay ${total} ${total === 1 ? 'cosa' : 'cosas'} que revisar.` : 'Todo el material está en orden.'}</p>
    </div>

    ${active.map(m => {
      const inZone = presence(m).filter(p => p.state === 'in').length, vs = victimsOf(m.id), ws = worksitesOf(m.id);
      const pend = vs.filter(v => !isOut(v)).length;
      return `
      <div class="panel live">
        <button class="grow" style="display:block; width:100%" onclick="openMission('${m.id}')">
          <span class="live-tag">En curso · ${esc(phaseOf(m).name)}</span>
          <h2 style="margin-top:4px">${esc(m.title)}</h2>
          <p class="muted">${esc(mtypeName(m))}${m.location ? ' en ' + esc(m.location) : ''}</p>
        </button>
        <div class="live-stats">
          <button onclick="openMission('${m.id}', 'personal')"><b class="num">${inZone}</b><small>en zona</small></button>
          <button onclick="openMission('${m.id}', 'worksites')"><b class="num">${ws.length}</b><small>worksites</small></button>
          <button onclick="openMission('${m.id}', 'victimas')"><b class="num ${pend ? 'warn' : ''}">${pend}</b><small>víctimas pendientes</small></button>
        </div>
      </div>`; }).join('')}

    ${next ? `<button class="item" onclick="openMission('${next.id}')"><div><small>Próxima salida</small><b>${esc(next.title)}</b><small>${fmtDT(next.date)}${next.location ? ', ' + esc(next.location) : ''}</small></div><span class="tag warn">En preparación</span></button>` : ''}

    ${total ? `<div class="grid g2">
      ${section('Averiados', 'bad', a.broken.map(g => row(`gearDetail('${g.id}')`, g.name, revLine(g, where))))}
      ${section('En revisión', 'warn', a.review.map(g => row(`gearDetail('${g.id}')`, g.name, revLine(g, where))))}
      ${section('Novedades', 'warn', a.nov.map(x => get('boxes', x.id) && x.code ? row(`boxDetail('${x.id}')`, 'Caja ' + x.code, x.nov.text) : row(`gearDetail('${x.id}')`, x.name, x.nov.text)))}
      ${section('EPI por revisar', 'warn', a.epi.map(e => row(`epiForm('${e.id}')`, `${epiLabel(e)} de ${opName(e.holder)}`, e.size ? 'Talla ' + e.size : 'Sin talla')))}
      ${section(`Vencen en ${SOON_DAYS} días`, 'warn', a.due.map(d => row(
        d.kind === 'gear' ? `gearDetail('${d.item.id}')` : `epiForm('${d.item.id}')`,
        d.kind === 'gear' ? d.item.name : `${epiLabel(d.item)} de ${opName(d.item.holder)}`, d.what, dueTag(d.date))))}
      ${section('Stock bajo mínimo', 'bad', a.low.map(c => row(`go('consumibles')`, c.name, `Quedan ${c.stock} ${c.unit}, mínimo ${c.min}`)))}
      ${section('Documentación del personal', 'warn', a.ready.map(r => row(`openPerson('${r.o.id}')`, r.o.name, r.text)), 'team')}
      ${section('Fuera del contenedor', 'info', a.out.map(g => row(`gearDetail('${g.id}')`, g.name,
        `Lo tiene ${g.out.who} desde ${fmtWhen(g.out.since)}${g.out.note ? '. ' + g.out.note : ''}`)))}
    </div>` : ''}

    <div class="row">
      <button class="btn btn-g" onclick="shareText(reportText())">${ic('share')} Enviar estado del material</button>
      <button class="btn btn-g" onclick="printManifest()">${ic('printer')} Imprimir estado</button>
    </div>`;
}

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
      ['Stock', c.name, `${c.stock} ${c.unit} · ${c.location}`, `setPref({ tab: 'consumibles' })`]),
    ...operators().filter(o => hit(o.name, o.role, o.cell, o.phone, readiness(o.id).fullName)).map(o =>
      ['Personal', o.name, [o.role, o.phone].filter(Boolean).join(' · '), `openPerson('${o.id}')`]),
    ...list('docs').filter(d => hit(d.type, d.number, d.notes, opName(d.op))).map(d =>
      ['Documento', `${d.type} de ${opName(d.op)}`, d.expires ? 'Caduca ' + fmtDate(d.expires) : 'Sin caducidad', `openPerson('${d.op}'); docDetail('${d.id}')`]),
    ...list('missions').filter(m => hit(m.title, m.location, m.objective)).map(m =>
      ['Operación', m.title, `${mtypeName(m)} · ${fmtDT(m.date)}`, `openMission('${m.id}')`]),
    ...list('worksites').filter(w => hit(w.code, w.address, w.notes)).map(w =>
      ['Worksite', w.code, `${mget(w.mission)?.title || ''}${w.address ? ' · ' + w.address : ''}`, `openMission('${w.mission}', 'worksites'); setPref({ ws: '${w.id}' })`]),
    ...list('heritage').filter(h => hit(h.name, h.place, h.type)).map(h =>
      ['Patrimonio', `${herCode(h)} ${h.name}`, `${mget(h.mission)?.title || ''} · ${herStatus(h.status)[0]}`, `openMission('${h.mission}', 'patrimonio'); heritageDetail('${h.id}')`])
  ];
  // El material y las cajas van primero, diciendo dónde están (lateral, hueco, caja o vehículo)
  const mat = findResults(q);
  box.innerHTML = `
    <div class="between" style="margin-bottom:10px"><h3 class="sec-title" style="margin:0">${ic('search')} ${mat.length + results.length} ${mat.length + results.length === 1 ? 'resultado' : 'resultados'}</h3>
      <button class="link" onclick="clearSearch()">Cerrar</button></div>
    ${mat.length ? `<div class="find-res" style="margin:0 0 12px; box-shadow:none">${findItems(mat)}</div>` : ''}
    <div class="grid g3">${results.map(([where, name, detail, go]) => `
      <button class="item" style="display:block" onclick="clearSearch(); ${go}">
        <small style="font-weight:700; color:var(--ic)">${esc(where)}</small><b>${esc(name)}</b><small>${esc(detail)}</small>
      </button>`).join('') || (mat.length ? '' : '<p class="muted">Sin coincidencias.</p>')}</div>`;
}
function clearSearch() { $('search').value = ''; renderSearch(); $('searchbar').classList.add('hidden'); }

/* ==================== MODAL Y FORMULARIOS ==================== */
// Ventana: el foco pasa a la ventana (sin abrir el teclado) y vuelve al botón que la abrió al cerrar
let modalReturn = null;
function openModal(title, html) {
  const wasOpen = !$('modal').classList.contains('hidden');
  if (!wasOpen) { modalReturn = document.activeElement; history.pushState({ nav: navSnap(), modal: 1 }, ''); }
  $('modalTitle').textContent = title;
  $('modalBody').innerHTML = html;
  $('modal').classList.remove('hidden');
  const sheet = $('modal').querySelector('.sheet');
  sheet.setAttribute('tabindex', '-1'); sheet.focus({ preventScroll: true });
}
function closeModal() {
  if ($('modal').classList.contains('hidden')) return;
  $('modal').classList.add('hidden');
  if (modalReturn?.isConnected) modalReturn.focus({ preventScroll: true });
  modalReturn = null;
}
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
    if (f.type === 'checks') return (f.filter ? `<input class="input" type="search" placeholder="Filtrar…" aria-label="Filtrar ${esc(f.label)}" oninput="const q = fold(this.value); this.nextElementSibling.querySelectorAll('.check-row').forEach(r => r.hidden = q && !fold(r.textContent).includes(q))">` : '') + `<div class="checks${f.filter ? ' scroll' : ''}">${f.options.map(([v, l, max]) => `
      <label class="check-row"><input type="checkbox" name="${f.k}" value="${esc(v)}" ${(f.value || []).includes(v) ? 'checked' : ''}><span>${esc(l)}</span>${max > 1 ? `<input class="input sm qty-in" type="number" name="${f.k}__q_${esc(v)}" min="1" max="${max}" value="${Math.min(max, f.qty?.[v] || max)}" inputmode="numeric" aria-label="Unidades de ${esc(l)}" onclick="event.stopPropagation()">` : ''}</label>`).join('')}
      ${f.catalog ? `<input class="input sm check-new" name="${f.k}__new" aria-label="Añadir otra opción" placeholder="➕ Otra (separa con comas)" autocomplete="off">` : ''}</div>`;
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
    return `<input ${attrs} type="${f.type || 'text'}" value="${esc(f.value)}" placeholder="${esc(f.placeholder)}" ${f.list ? `list="dl-${f.k}" autocomplete="off"` : ''} ${f.type === 'number' ? 'inputmode="decimal" min="0" step="any"' : ''}>${dl}`;
  };
  openModal(title, `
    <form id="modalForm" class="form">
      ${fields.map(f => { const tag = ['photo', 'checks', 'signature'].includes(f.type) ? 'div' : 'label'; return `<${tag} class="lbl ${f.wide ? 'wide' : ''}">${f.label}${control(f)}</${tag}>`; }).join('')}
      <button class="btn btn-a wide">${ic('check')} Guardar</button>
      ${extra}
    </form>`);
  const form = $('modalForm');
  form.querySelectorAll('[data-sig]').forEach(initSig);
  form.onsubmit = e => {
    e.preventDefault();
    const fd = new FormData(form), values = {};
    fields.forEach(f => {
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

/* ==================== ENLACES (QR de equipo e invitaciones) ==================== */
function handleHash() {
  const hash = location.hash.slice(1);
  const eq = hash.indexOf('=');
  if (eq < 0) return;
  const [key, value] = [hash.slice(0, eq), decodeURIComponent(hash.slice(eq + 1))];
  history.replaceState(history.state, '', location.pathname + location.search);
  if (!loggedIn() && key !== 'join') { prefs.afterLogin = '#' + hash; writeJSON(KEY.prefs, prefs); return; }   // se abre al entrar
  if (bloqueado() && key !== 'join') return;

  if (key === 'g') {
    const g = get('gear', value);
    if (!g) return toast('Equipo no encontrado en este dispositivo', 'bad');
    setPref({ tab: 'contenedor', door: groupKey(g) });
    gearDetail(value);
  }
  if (key === 'k') {
    if (!get('boxes', value)) return toast('Caja no encontrada en este dispositivo', 'bad');
    setPref({ tab: placeTab(get('boxes', value)?.door) }); boxDetail(value);
  }
  if (key === 'join') {
    let c;
    try { c = JSON.parse(unb64(value)); } catch { return toast('Enlace de invitación no válido', 'bad'); }
    if (Sync.cfg()?.url === c.url) return toast('Este dispositivo ya está conectado al equipo');
    if (!confirm('¿Conectar este dispositivo a los datos compartidos del equipo? Se usarán los datos del equipo en lugar de los de este móvil.')) return;
    Sync.connect(c.url, c.key).then(r => { toast(r === 'login' ? 'Conectado al equipo: entra con tu usuario en Ajustes' : 'Conectado al equipo'); render(); }).catch(e => toast(e.message, 'bad'));
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
const navSnap = () => ({ tab: prefs.tab, mission: prefs.mission || null, mtab: prefs.mtab || null, person: prefs.person || null, ws: prefs.ws || null });
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
