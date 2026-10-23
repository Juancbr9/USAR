'use strict';
// USAR 242 · Espacios confinados: mediciones de atmósfera, decisión de entrada, roles, autonomía del ERA y control de tiempos
// Orden de medida: oxígeno → explosividad → toxicidad. Autonomía ERA = litros × bar / 50.

const confinedOf = mid => list('confined').filter(c => c.mission === mid).sort((a, b) => (b.created || 0) - (a.created || 0));
const lastReading = c => (c.readings || [])[(c.readings || []).length - 1];
const C_STATUS = { prep: ['Preparando', 'warn'], inside: ['Dentro', 'bad'], out: ['Terminada', 'ok'] };

function confinedPanel(m) {
  const cs = confinedOf(m.id);
  return `
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('wind')} Espacios confinados</h3>
        <button class="btn btn-a btn-sm" onclick="confinedForm('${m.id}')">${ic('plus')} Entrada</button></div>
      ${cs.length ? `<div class="list">${cs.map(c => {
        const r = lastReading(c), v = r ? atmosphereVerdict(r) : null;
        return `<button class="item" onclick="confinedDetail('${c.id}')"><div><b>${esc(c.place)}</b>
          <small>${v ? v[1] : 'Sin medir'}${c.status === 'inside' ? ` · dentro desde las ${fmtHour(c.start)}` : ''}</small></div>
          <span class="tag ${C_STATUS[c.status][1]}">${C_STATUS[c.status][0]}</span></button>`;
      }).join('')}</div>` : ''}
    </div>`;
}

function confinedForm(mid, id) {
  const c = get('confined', id) || { litres: 6, bar: 300 };
  openForm(id ? 'Editar entrada' : 'Nueva entrada en espacio confinado', [
    { k: 'place', label: 'Lugar', value: c.place, required: true, wide: true, placeholder: 'Ej: Sótano 1, cuadrante B' },
    { k: 'worksite', label: 'Worksite', value: c.worksite, options: [['', 'Ninguno'], ...worksitesOf(mid).map(w => [w.id, w.code])] },
    { k: 'vent', label: 'Ventilación', value: c.vent, options: [['', 'Sin ventilar'], ['positiva', 'Positiva (impulsión)'], ['negativa', 'Negativa (extracción)'], ['mixta', 'Positiva y negativa']] },
    { k: 'litres', label: 'Botella ERA (litros)', type: 'number', value: c.litres },
    { k: 'bar', label: 'Presión al entrar (bar)', type: 'number', value: c.bar },
    ...CONFINED_ROLES.map(([k, label]) => ({ k, label, type: 'checks', value: c[k], options: opChecks(), wide: true }))
  ], v => {
    const rec = { ...(c.id ? c : { id: uid('EC'), mission: mid, status: 'prep', readings: [], created: Date.now() }), ...v, litres: +v.litres || 6, bar: +v.bar || 300 };
    put('confined', rec, `${mget(mid).title}: espacio confinado "${rec.place}" ${id ? 'editado' : 'registrado'}`);
    confinedDetail(rec.id);
  });
}

function confinedDetail(id) {
  const c = get('confined', id);
  if (!c) return closeModal();
  const r = lastReading(c), v = r ? atmosphereVerdict(r) : null;
  const toAlarm = eraToAlarm(c.litres, c.bar), total = eraMinutes(c.litres, c.bar);
  const alarmAt = c.start ? c.start + toAlarm * 6e4 : null;
  const role = k => names(c[k] || []).join(', ') || '—';
  const val = (x, unit) => x === '' || x == null ? '—' : `${x}${unit}`;
  openModal(c.place, `
    ${v ? `<div class="verdict ${v[0]}"><b>${v[1]}</b><span>${v[2]}</span>${v[3].length ? `<ul>${v[3].map(n => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}</div>`
      : `<div class="verdict warn"><b>Sin medir</b><span>Mide antes de entrar: primero O₂, luego explosividad y después tóxicos. La atmósfera puede estar estratificada: mide arriba, en medio y abajo.</span></div>`}

    <h3 class="sub">Nueva medición</h3>
    <form id="readForm" class="form four">
      <label class="lbl">O₂ %<input class="input" name="o2" inputmode="decimal" placeholder="20.9"></label>
      <label class="lbl">LEL %<input class="input" name="lel" inputmode="decimal" placeholder="0"></label>
      <label class="lbl">CO ppm<input class="input" name="co" inputmode="decimal" placeholder="0"></label>
      <label class="lbl">H₂S ppm<input class="input" name="h2s" inputmode="decimal" placeholder="0"></label>
      <button class="btn btn-a wide">${ic('gauge')} Guardar medición</button>
    </form>
    ${(c.readings || []).length ? `<table class="readings"><tr><th>Hora</th><th>O₂</th><th>LEL</th><th>CO</th><th>H₂S</th></tr>
      ${[...c.readings].reverse().map(x => { const o = o2Status(parseFloat(x.o2)); return `<tr><td>${fmtHour(x.ts)}</td><td class="${o ? o[0] : ''}">${val(x.o2, '%')}</td>
        <td class="${parseFloat(x.lel) >= 10 ? 'bad' : parseFloat(x.lel) >= 5 ? 'warn' : ''}">${val(x.lel, '%')}</td>
        <td class="${parseFloat(x.co) > GAS_LIMITS.co ? 'bad' : ''}">${val(x.co, '')}</td><td class="${parseFloat(x.h2s) > GAS_LIMITS.h2s ? 'bad' : ''}">${val(x.h2s, '')}</td></tr>`; }).join('')}</table>` : ''}

    <h3 class="sub">Aire del ERA</h3>
    <div class="callout"><b class="num">${toAlarm} min</b><span>hasta el silbato (50 bar) con ${c.litres} l a ${c.bar} bar. Autonomía total ${total} min. Regla rápida: 10 bar ≈ 1 min.</span></div>
    ${c.status === 'inside' ? `<div class="callout ${alarmAt - Date.now() < 5 * 6e4 ? 'bad' : ''}"><b class="num" data-until="${alarmAt}">${fmtDur(Math.max(0, alarmAt - Date.now()))}</b><span>restantes. Dentro desde las ${fmtHour(c.start)}; silbato hacia las ${fmtHour(alarmAt)}.</span></div>` : ''}

    <h3 class="sub">Equipo</h3>
    <dl class="dl">${CONFINED_ROLES.map(([k, label]) => `<dt>${label}</dt><dd>${esc(role(k))}</dd>`).join('')}
      <dt>Ventilación</dt><dd>${esc(c.vent || 'Sin ventilar')}</dd></dl>

    <details class="well" style="margin-bottom:12px"><summary><b>Criterios para abortar y salir</b></summary>
      <ul class="tips">${ABORT.map(a => `<li>${a}</li>`).join('')}</ul></details>

    <div class="row">
      ${c.status === 'prep' ? `<button class="btn btn-a" onclick="confinedEnter('${id}')">${ic('in')} Entran</button>` : ''}
      ${c.status === 'inside' ? `<button class="btn btn-a" onclick="confinedExit('${id}')">${ic('out')} Salen todos</button>` : ''}
      <button class="btn btn-g" onclick="confinedForm('${c.mission}', '${id}')">${ic('pencil')} Editar</button>
      <button class="btn btn-bad" aria-label="Eliminar" onclick="if (confirm('¿Eliminar este registro?')) { remove('confined', '${id}', 'Espacio confinado eliminado'); closeModal(); }">${ic('trash')}</button>
    </div>`);
  $('readForm').onsubmit = e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    if (!Object.values(fd).some(x => x.trim())) return toast('Escribe al menos un valor', 'bad');
    Object.keys(fd).forEach(k => { fd[k] = fd[k].replace(',', '.').trim(); });
    const reading = { ...fd, ts: Date.now(), by: prefs.activeOperator };
    const verdict = atmosphereVerdict(reading);
    put('confined', { ...get('confined', id), readings: [...(get('confined', id).readings || []), reading] });
    addEntry(c.mission, null, `Atmósfera en ${c.place}: ${verdict[1]} (O₂ ${reading.o2 || '—'}%, LEL ${reading.lel || '—'}%, CO ${reading.co || '—'}, H₂S ${reading.h2s || '—'})`);
    if (verdict[0] !== 'ok') toast(verdict[1], 'bad');
    confinedDetail(id);
  };
}

function confinedEnter(id) {
  const c = get('confined', id), r = lastReading(c);
  if (!r) return toast('Primero mide la atmósfera', 'bad');
  const v = atmosphereVerdict(r);
  if (v[0] === 'bad' && !confirm('La última medición PROHÍBE la entrada. ¿Entrar igualmente (solo personal especializado)?')) return;
  if (!(c.entrants || []).length) return toast('Indica quién entra (Editar)', 'bad');
  put('confined', { ...c, status: 'inside', start: Date.now() });
  addEntry(c.mission, null, `Entran en ${c.place}: ${names(c.entrants).join(', ')}. ERA ${c.litres} l a ${c.bar} bar (${eraToAlarm(c.litres, c.bar)} min hasta el silbato)`);
  confinedDetail(id);
}
function confinedExit(id) {
  const c = get('confined', id);
  put('confined', { ...c, status: 'out', end: Date.now() });
  addEntry(c.mission, null, `Salen de ${c.place} tras ${fmtDur(Date.now() - c.start)}`);
  confinedDetail(id);
}

// Cuenta atrás del aire en pantalla
setInterval(() => document.querySelectorAll('[data-until]').forEach(el => {
  const left = +el.dataset.until - Date.now();
  el.textContent = fmtDur(Math.max(0, left));
  el.closest('.callout')?.classList.toggle('bad', left < 5 * 6e4);
}), 15000);
