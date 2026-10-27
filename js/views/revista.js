'use strict';
// USAR 242 · Revista del material: se elige qué se revista (por sitios), y de cada equipo se marca
// correcto, con fallo (pasa a revisión), en el taller, en otro sitio, de baja o «no se revista».

const REV_MARKS = {
  ok: ['Correcto', 'ok'], bad: ['Con fallo', 'bad'], taller: ['En el taller', 'warn'], moved: ['En otro sitio', 'info'], baja: ['De baja', 'bad'], skip: ['No se revista', 'neutral']
};
const REV_REASONS = ['Mensual', 'Antes de salir', 'Tras una intervención', 'Tras un ejercicio', 'Otra'];
// Grupos que se pueden elegir al empezar: laterales del contenedor, sin ubicar, pasillo, armarios y otros
// (lo que tiene una persona no está en su sitio: no entra en la revista del almacén)
const revGroups = () => [
  ['izq', 'Contenedor · lateral izquierdo', g => g.door >= 1 && g.door <= 10],
  ['der', 'Contenedor · lateral derecho', g => g.door >= 11 && g.door <= 20],
  ['sin', 'Contenedor · sin ubicar', g => !g.door],
  ['pasillo', 'Pasillo', g => enPasillo(g.door)],
  ['armarios', 'Armarios', g => enArmarios(g.door)],
  ['otros', 'Otros', g => g.door === OTROS]
].map(([k, l, f]) => [k, l, g => enAlmacen(g) && f(g)]);
const markOf = r => !r ? '' : r.mark || (r.ok === true ? 'ok' : r.ok === false ? 'bad' : '');

/* ==================== VISTA: REVISTA ==================== */
function viewRevista() {
  const d = prefs.draft;
  if (!d) {
    const history = list('inspections').sort((a, b) => b.date - a.date);
    return `
      <div class="panel between wrap-row">
        <h2>Revista</h2>
        <button class="btn btn-a" onclick="startRevista()">${ic('clipboard')} Iniciar revista</button>
      </div>
      <div class="panel">
        <h3 class="sec-title">${ic('history')} Revistas anteriores</h3>
        ${history.length ? `<div class="list">${history.map(r => `
          <details class="item">
            <summary><div><b>${fmtWhen(r.date)}${r.reason ? ' · ' + esc(r.reason) : ''}</b><small>${esc(r.by)} · ${r.checked}/${r.total} revisados${r.scope ? ' · ' + esc(r.scope) : ''}</small></div>
              <span class="tag ${r.fails.length ? 'bad' : 'ok'}">${r.fails.length ? r.fails.length + ' fallos' : 'Todo OK'}</span></summary>
            ${r.fails.length ? `<ul class="fails">${r.fails.map(f => `<li><b>${esc(f.name)}</b>${f.note ? ' — ' + esc(f.note) : ''}</li>`).join('')}</ul>` : ''}
            ${(r.other || []).length ? `<ul class="fails">${r.other.map(f => `<li><b>${esc(f.name)}</b> — ${esc(REV_MARKS[f.mark]?.[0] || f.mark)}${f.note ? ': ' + esc(f.note) : ''}</li>`).join('')}</ul>` : ''}
          </details>`).join('')}</div>` : '<p class="muted">Todavía no hay revistas registradas.</p>'}
      </div>`;
  }

  const ids = new Set(d.ids || list('gear').map(g => g.id));
  const gearList = list('gear').filter(g => ids.has(g.id));
  const counted = gearList.filter(g => markOf(d.res[g.id]) && markOf(d.res[g.id]) !== 'skip');
  const skipped = gearList.filter(g => markOf(d.res[g.id]) === 'skip').length;
  const fails = gearList.filter(g => markOf(d.res[g.id]) === 'bad').length;
  const total = gearList.length - skipped, pct = total ? Math.round(counted.length / total * 100) : 100;
  const pend = prefs.revPend;
  const groups = gearGroups(gearList).map(([id, label, gs]) => {
    const items = pend ? gs.filter(g => !markOf(d.res[g.id])) : gs;
    if (!items.length) return '';
    return `
      <div class="panel">
        <div class="between sec-head"><h3>${esc(label)}</h3>
          <div class="row"><button class="btn btn-g btn-sm" onclick="markGroup(${jsq(JSON.stringify(gs.map(g => g.id)))}, 'skip')">No revistar</button>
            <button class="btn btn-g btn-sm" onclick="markGroup(${jsq(JSON.stringify(gs.map(g => g.id)))}, 'ok')">${ic('check')} Todo OK</button></div></div>
        <div class="list">${items.map(g => revRow(g, d.res[g.id])).join('')}</div>
      </div>`;
  }).join('');

  return `
    <div class="panel progress">
      <div class="between"><div><h2>Revista en curso</h2><p class="muted">${esc(d.by)} · ${esc(d.reason || '')} · desde ${fmtWhen(d.start)}${fails ? ` · <span style="color:var(--bad)">${fails} fallos</span>` : ''}</p></div>
        <b class="mono big">${counted.length}/${total}</b></div>
      <div class="bar"><span style="width:${pct}%"></span></div>
      <div class="row between wrap-row" style="margin-top:10px">
        <label class="check-row"><input type="checkbox" ${pend ? 'checked' : ''} onchange="setPref({ revPend: this.checked })"><span>Solo lo que falta</span></label>
        <div class="row"><button class="btn btn-g" onclick="cancelRevista()">Cancelar</button><button class="btn btn-a" onclick="finishRevista()">${ic('check')} Finalizar revista</button></div>
      </div>
    </div>
    ${groups || '<div class="panel"><p class="muted">Ya está todo marcado.</p></div>'}`;
}

function revRow(g, r) {
  const mk = markOf(r);
  return `
    <div class="check ${mk === 'ok' ? 'is-ok' : mk === 'bad' || mk === 'baja' ? 'is-bad' : mk ? 'is-other' : ''}">
      <div class="between">
        <div class="grow"><b>${esc(g.name)}${qtyText(g)}</b><small class="muted mono">${boxCode(g) ? 'Caja ' + esc(boxCode(g)) : 'Suelto'}${g.serial ? ' · S/N ' + esc(g.serial) : ''}</small>
          ${mk && !['ok', 'bad'].includes(mk) ? `<span class="tag ${REV_MARKS[mk][1]}">${REV_MARKS[mk][0]}${mk === 'moved' && r.door != null ? ': ' + esc(placeShort({ door: +r.door })) : ''}</span>` : ''}</div>
        <div class="row nowrap">
          <button class="seg ok ${mk === 'ok' ? 'on' : ''}" aria-label="Correcto" onclick="mark('${g.id}', 'ok')">${ic('check', 'i-lg')}</button>
          <button class="seg bad ${mk === 'bad' ? 'on' : ''}" aria-label="Con fallo" onclick="mark('${g.id}', 'bad')">${ic('x', 'i-lg')}</button>
          <button class="seg ${mk && !['ok', 'bad'].includes(mk) ? 'on' : ''}" aria-label="Otra situación: taller, otro sitio, de baja o no se revista" onclick="markMore('${g.id}')">${ic('dots', 'i-lg')}</button>
        </div>
      </div>
      ${mk === 'bad' || (mk && !['ok', 'skip'].includes(mk)) ? `<input class="input" placeholder="${mk === 'bad' ? '¿Qué le pasa?' : 'Nota (opcional)'}" aria-label="Nota" value="${esc(r.note)}" oninput="markNote('${g.id}', this.value)">` : ''}
    </div>`;
}

function startRevista() {
  const gs = list('gear');
  openForm('Nueva revista', [
    { k: 'reason', label: 'Motivo', value: 'Mensual', options: REV_REASONS.map(r => [r, r]) },
    { k: 'groups', label: 'Qué se revista', type: 'checks', options: revGroups().map(([k, l, f]) => [k, `${l} (${gs.filter(f).length})`]).filter((_, i) => gs.some(revGroups()[i][2])), value: ['izq', 'der', 'sin'], wide: true },
    { k: 'extra', label: 'Incluir también', type: 'checks', options: [['rev', `Lo que está en revisión (${gs.filter(g => g.status !== 'OPERATIVO').length})`], ['out', `Lo prestado o entregado (${gs.filter(g => g.out && !g.out.mission).length})`]], value: [], wide: true }
  ], v => {
    if (!v.groups.length) return toast('Elige al menos un sitio', 'bad');
    const fs = revGroups().filter(([k]) => v.groups.includes(k)).map(x => x[2]);
    const ids = gs.filter(g => fs.some(f => f(g)) && (v.extra.includes('rev') || g.status === 'OPERATIVO') && (v.extra.includes('out') || !g.out || g.out.mission)).map(g => g.id);
    if (!ids.length) return toast('No hay material en lo elegido', 'bad');
    const scope = revGroups().filter(([k]) => v.groups.includes(k)).map(x => x[1].replace('Contenedor · ', '')).join(', ');
    setPref({ draft: { start: Date.now(), by: prefs.activeOperator, reason: v.reason, scope, ids, res: {} }, revPend: false });
  });
}
function mark(id, m, extra = {}) {
  haptic(m === 'ok' ? 10 : [20, 30]);
  if (m === true || m === false) m = m ? 'ok' : 'bad';   // compatibilidad
  const cur = prefs.draft.res[id] || {};
  prefs.draft.res[id] = markOf(cur) === m && !Object.keys(extra).length ? { note: '' } : { mark: m, ok: m === 'ok', note: cur.note || '', ...extra };
  if (!prefs.draft.res[id].mark) delete prefs.draft.res[id];
  setPref({});
}
function markMore(id) {
  const g = get('gear', id);
  openModal(g.name, `<div class="list">
    <button class="item" onclick="closeModal(); mark('${id}', 'taller')"><div><b>Está en el taller</b><small>Pasa a revisión: en el taller</small></div></button>
    <button class="item" onclick="markMoved('${id}')"><div><b>Está en otro sitio</b><small>Se cambia su ubicación</small></div></button>
    <button class="item" onclick="closeModal(); mark('${id}', 'baja')"><div><b>De baja</b><small>Ya no se usa: queda inoperativo, de baja</small></div></button>
    <button class="item" onclick="closeModal(); mark('${id}', 'skip')"><div><b>No se revista</b><small>No cuenta en esta revista</small></div></button>
  </div>`);
}
function markMoved(id) {
  const g = get('gear', id);
  openForm(`${g.name}: ¿dónde está?`, [{ k: 'place', label: 'Dónde está', value: String(g.door ?? 0), options: placeOptions(), wide: true }],
    v => mark(id, 'moved', { door: +v.place }));
}
function markNote(id, note) { prefs.draft.res[id].note = note; writeJSON(KEY.prefs, prefs); }
function markGroup(json, m) {
  JSON.parse(json).forEach(id => { if (!markOf(prefs.draft.res[id]) || m === 'skip') prefs.draft.res[id] = { mark: m, ok: m === 'ok', note: '' }; });
  setPref({});
}
function cancelRevista() { if (confirm('¿Descartar la revista en curso?')) setPref({ draft: null }); }

function finishRevista() {
  const d = prefs.draft, ids = new Set(d.ids || list('gear').map(g => g.id)), gearList = list('gear').filter(g => ids.has(g.id));
  const marked = gearList.filter(g => markOf(d.res[g.id]) && markOf(d.res[g.id]) !== 'skip');
  if (!marked.length) return toast('Marca al menos un equipo', 'bad');
  const left = gearList.filter(g => !markOf(d.res[g.id])).length;
  if (left && !confirm(`Quedan ${left} equipos sin marcar. ¿Finalizar igualmente?`)) return;

  const today = todayISO(), by = prefs.activeOperator;
  const rev = (g, state, reason) => g.rev?.state === state ? g.rev : { state, since: today, reason, by };
  putMany('gear', marked.map(g => {
    const r = d.res[g.id], mk = markOf(r), base = { ...g, lastCheck: today };
    if (mk === 'ok') return base;
    if (mk === 'bad') return { ...base, status: g.status === 'OPERATIVO' ? 'REVISIÓN' : g.status, rev: g.rev || rev(g, 'espera', r.note ? `Revista: ${r.note}` : 'Fallo en la revista') };
    if (mk === 'taller') return { ...base, status: 'REVISIÓN', rev: { ...rev(g, 'taller', r.note || 'En el taller (revista)'), notes: r.note || g.rev?.notes || '' } };
    if (mk === 'baja') return { ...base, status: 'AVERIADO', rev: rev(g, 'baja', r.note || 'De baja (revista)') };
    if (mk === 'moved') return { ...base, door: +r.door, box: '', vehicle: '' };
    return base;
  }));
  const failed = marked.filter(g => markOf(d.res[g.id]) === 'bad'), other = marked.filter(g => !['ok', 'bad'].includes(markOf(d.res[g.id])));
  put('inspections', {
    id: uid('R'), date: Date.now(), by: d.by, reason: d.reason || '', scope: d.scope || '', total: gearList.length, checked: marked.length,
    fails: failed.map(g => ({ id: g.id, name: g.name, note: d.res[g.id].note })),
    other: other.map(g => ({ id: g.id, name: g.name, mark: markOf(d.res[g.id]), note: d.res[g.id].note || '' }))
  }, `Revista completada: ${marked.length} equipos, ${failed.length} con fallo`);
  setPref({ draft: null });
  toast(failed.length ? `Revista guardada · ${failed.length} equipos pasan a revisión` : 'Revista guardada · todo OK');
}
