'use strict';
// USAR 242 · Fichaje: quién está en la zona de la operación, desde cuándo y cuánto tiempo lleva
// Cada entrada o salida es un registro propio (kind 'checkins'), así dos móviles pueden fichar a la vez sin pisarse.

const fmtDur = ms => {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min`;
};
const fmtHour = ts => new Date(ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

function checkins(mid) { return list('checkins').filter(c => c.mission === mid).sort((a, b) => a.ts - b.ts); }

// Estado de cada persona: 'in' en zona, 'out' salió, 'none' sin fichar; y tiempo total acumulado en zona
function presence(m) {
  const events = checkins(m.id);
  return missionPeople(m).map(op => {
    const mine = events.filter(e => e.op === op);
    let total = 0, since = null;
    mine.forEach(e => {
      if (e.type === 'in' && since === null) since = e.ts;
      if (e.type === 'out' && since !== null) { total += e.ts - since; since = null; }
    });
    const last = mine[mine.length - 1];
    return { op, state: last ? last.type : 'none', since, last, total, firstIn: mine.find(e => e.type === 'in')?.ts };
  });
}
const presenceTotal = p => p.total + (p.since ? Date.now() - p.since : 0);

function punch(mid, ops, type) {
  ops.forEach(op => stamp('checkins', { id: uid('F'), mission: mid, op, type, ts: Date.now(), by: prefs.activeOperator }));
  const who = ops.length === 1 ? get('operators', ops[0])?.name : `${ops.length} personas`;
  addLog(`${mget(mid).title}: ${who} ${type === 'in' ? 'entra en zona' : 'sale de zona'}`);
  haptic(type === 'in' ? 15 : [15, 30, 15]);
  commit();
}

function punchAll(mid, type) {
  const ps = presence(mget(mid));
  const ops = ps.filter(p => (type === 'in' ? p.state !== 'in' : p.state === 'in')).map(p => p.op);
  if (!ops.length) return toast(type === 'in' ? 'Todos están ya en zona' : 'No hay nadie en zona', 'bad');
  if (type === 'out' && !confirm(`¿Marcar la salida de las ${ops.length} personas que están en zona?`)) return;
  punch(mid, ops, type);
}

function presencePanel(m) {
  if (m.status === 'prep') return '';
  const ps = presence(m);
  const inZone = ps.filter(p => p.state === 'in').length, out = ps.filter(p => p.state === 'out').length;
  const none = ps.length - inZone - out;
  const live = m.status === 'active';
  const limit = (m.zone?.relevo || 60) * 6e4;
  const row = p => {
    const name = get('operators', p.op)?.name;
    const tag = p.state === 'in' ? `<span class="tag ok">En zona</span>` : p.state === 'out' ? `<span class="tag neutral">Fuera</span>` : `<span class="tag warn">Sin fichar</span>`;
    const detail = p.state === 'in'
      ? `Desde las ${fmtHour(p.since)} · <span data-since="${p.since}" data-base="0" data-limit="${limit}">${fmtDur(Date.now() - p.since)}</span> seguidos · <span class="relevo-tag">toca relevo</span>`
      : p.state === 'out' ? `Salió a las ${fmtHour(p.last.ts)} · ${fmtDur(p.total)} en zona` : 'Todavía no ha entrado';
    return `
      <div class="item ${p.state === 'in' && Date.now() - p.since > limit ? 'over' : ''}">
        <div class="who-row grow">${avatar(name, 'sm')}<div class="grow"><div class="row" style="gap:6px"><b>${esc(name)}</b>${tag}</div><small>${detail}</small></div></div>
        ${live ? (p.state === 'in'
          ? `<button class="btn btn-g btn-sm" style="flex:none" onclick="punch('${m.id}', ['${p.op}'], 'out')">${ic('out', 'i-sm')} Sale</button>`
          : `<button class="btn btn-a btn-sm" style="flex:none" onclick="punch('${m.id}', ['${p.op}'], 'in')">${ic('in', 'i-sm')} Entra</button>`) : ''}
      </div>`;
  };
  return `
    <div class="panel">
      <div class="between wrap-row sec-head">
        <h3 class="sec-title" style="margin:0">${ic('users')} Control de personal en zona</h3>
        ${live ? `<div class="row"><button class="btn btn-a btn-sm" onclick="punchAll('${m.id}', 'in')">Entran todos</button><button class="btn btn-g btn-sm" onclick="punchAll('${m.id}', 'out')">Salen todos</button><button class="btn btn-a btn-sm" onclick="openScanner('${m.id}')">${ic('scan', 'i-sm')} Fichar con QR</button></div>` : ''}
      </div>
      <div class="status" style="margin-bottom:12px; grid-template-columns:repeat(3, 1fr)">
        <div class="kpi ok"><div><small>En zona</small><b>${inZone}</b></div></div>
        <div class="kpi"><div><small>Fuera</small><b>${out}</b></div></div>
        <div class="kpi ${none && live ? 'warn' : ''}"><div><small>Sin fichar</small><b>${none}</b></div></div>
      </div>
      ${live ? `<p class="muted" style="margin-bottom:10px">Control de puerta (hombre-puerta): quién entra, quién sale y cuánto lleva dentro. Aviso de relevo a los ${m.zone?.relevo || 60} min seguidos.</p>` : ''}
      ${ps.length ? `<div class="list">${ps.map(row).join('')}</div>` : '<p class="muted">Asigna personal a equipos o vehículos para poder ficharlo.</p>'}
    </div>`;
}

// Al finalizar una operación, se cierra la salida de quien siga en zona
function closePresence(m) {
  const still = presence(m).filter(p => p.state === 'in').map(p => p.op);
  if (still.length) still.forEach(op => stamp('checkins', { id: uid('F'), mission: m.id, op, type: 'out', ts: Date.now(), by: prefs.activeOperator }));
  return still.length;
}

function presenceText(m) {
  const ps = presence(m).filter(p => p.state === 'in');
  return ps.length ? `👷 En zona (${ps.length}): ${ps.map(p => get('operators', p.op)?.name).join(', ')}` : '';
}

// Actualiza los contadores de tiempo en pantalla cada 30 s sin redibujar la página
setInterval(() => document.querySelectorAll('[data-since]').forEach(el => {
  const ms = +el.dataset.base + Date.now() - +el.dataset.since;
  el.textContent = fmtDur(ms);
  if (el.dataset.limit) el.closest('.item')?.classList.toggle('over', ms > +el.dataset.limit);
}), 30000);
