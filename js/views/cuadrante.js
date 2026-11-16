'use strict';
// SIER 242 · Cuadrante de vacaciones y permisos: un mes entero con una fila por persona y una columna por día, para ver
// de un vistazo quién falta cada semana. Cada persona puede tener varias ausencias apuntadas (operators.plan: una lista de
// { id, motivo, desde, hasta, lugar, nota }), además de la que tenga en curso (aus). Debajo, los presentes de cada
// especialidad día a día, en rojo cuando bajan del mínimo que se haya puesto (meta «minimos»).

// Letra de cada motivo en las casillas
const MOTIVO_LETRA = { 'Permiso': 'P', 'Vacaciones': 'V', 'Baja médica': 'B', 'Curso': 'C', 'Comisión de servicio': 'S', 'Guardia o servicio': 'G', 'Asuntos propios': 'A', 'Otro': 'O' };
const letraDe = m => MOTIVO_LETRA[m] || 'O';
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const cuadMes = () => /^\d{4}-\d{2}$/.test(prefs.cuadMes || '') ? prefs.cuadMes : todayISO().slice(0, 7);
const mesMas = (ym, n) => { const [y, m] = ym.split('-').map(Number), d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const minimos = () => get('meta', 'minimos')?.value || {};
// Grupos de los que se vigila el mínimo: toda la sección y cada especialidad
const cuadGrupos = () => [['todos', 'Sección', () => true], ...ESPECIALIDADES.map(e => [e, e, o => opEsp(o) === e])];
// Días de un año que una persona tiene apuntados de un motivo (para llevar la cuenta de las vacaciones)
function diasDe(o, motivo, year = new Date().getFullYear()) {
  const ini = year + '-01-01', fin = year + '-12-31';
  return [...(o.plan || []), ...(o.aus && o.aus.hasta ? [o.aus] : [])].filter(p => p.motivo === motivo && p.desde <= fin && p.hasta >= ini)
    .reduce((s, p) => s + Math.round((new Date((p.hasta < fin ? p.hasta : fin) + 'T12:00') - new Date((p.desde > ini ? p.desde : ini) + 'T12:00')) / 864e5) + 1, 0);
}
// Días de los próximos «dias» en que algún grupo baja de su mínimo: [{ dia, grupo, n, min }]
function bajoMinimos(dias = 30) {
  const min = minimos(), ops = operators(), out = [];
  for (let i = 0; i < dias; i++) {
    const dia = new Date(Date.now() + i * 864e5 - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    cuadGrupos().forEach(([k, nombre, f]) => { if (!min[k]) return; const n = ops.filter(o => f(o) && !ausenteEl(o, dia)).length; if (n < min[k]) out.push({ dia, grupo: nombre, n, min: min[k] }); });
  }
  return out;
}

function cuadrantePanel(ops) {
  const ym = cuadMes(), [y, m] = ym.split('-').map(Number), nd = new Date(y, m, 0).getDate(), hoy = todayISO(), min = minimos();
  const dias = Array.from({ length: nd }, (_, i) => { const iso = ym + '-' + String(i + 1).padStart(2, '0'), wd = new Date(iso + 'T12:00').getDay(); return { n: i + 1, iso, finde: wd === 0 || wd === 6, hoy: iso === hoy }; });
  const cls = d => (d.finde ? ' fs' : '') + (d.hoy ? ' hoy' : '');
  const fila = o => `<tr><th scope="row"><button class="cq-nombre" onclick="planDe('${o.id}')">${o.empleo ? `<small>${esc(o.empleo)}</small> ` : ''}${esc(o.name)}</button></th>
    ${dias.map(d => { const a = ausDe(o, d.iso); return `<td class="${cls(d).trim()}${a ? ' aus m-' + letraDe(a.motivo) : ''}" ${a ? `title="${esc(o.name)}: ${esc(a.motivo || 'Ausente')}"` : ''}>${a ? letraDe(a.motivo) : ''}</td>`; }).join('')}</tr>`;
  const grupos = cuadGrupos().map(([k, nombre, f]) => [k, nombre, operators().filter(f)]).filter(g => g[2].length);
  const usados = [...new Set(ops.flatMap(o => dias.map(d => ausDe(o, d.iso)?.motivo).filter(Boolean)))];
  return `<div class="panel span2 cq-panel">
    <div class="between wrap-row sec-head"><div class="row"><button class="btn btn-g btn-sm" aria-label="Mes anterior" onclick="setPref({ cuadMes: mesMas(cuadMes(), -1) })">${ic('back')}</button>
        <h3 class="cq-mes">${MESES[m - 1][0].toUpperCase() + MESES[m - 1].slice(1)} de ${y}</h3>
        <button class="btn btn-g btn-sm cq-sig" aria-label="Mes siguiente" onclick="setPref({ cuadMes: mesMas(cuadMes(), 1) })">${ic('back')}</button></div>
      <div class="row"><button class="btn btn-a btn-sm" onclick="planForm()">${ic('plus')} Ausencia</button>
        <button class="btn btn-g btn-sm" onclick="minimosForm()">${ic('sliders')} Mínimos</button></div></div>
    <div class="cq-scroll"><table class="cq" aria-label="Cuadrante de ausencias de ${MESES[m - 1]} de ${y}">
      <thead><tr><th scope="col">Persona</th>${dias.map(d => `<th scope="col" class="${cls(d).trim()}">${d.n}</th>`).join('')}</tr></thead>
      <tbody>${ops.map(fila).join('') || `<tr><td colspan="${nd + 1}">Nadie con esa búsqueda.</td></tr>`}</tbody>
      <tfoot>${grupos.map(([k, nombre, gente]) => `<tr><th scope="row"><span class="cq-nombre cq-grupo">${esc(nombre)}${min[k] ? ` <small>mín. ${min[k]}</small>` : ''}</span></th>
        ${dias.map(d => { const n = gente.filter(o => !ausenteEl(o, d.iso)).length; return `<td class="${cls(d).trim()}${min[k] && n < min[k] ? ' bajo' : ''}">${n}</td>`; }).join('')}</tr>`).join('')}</tfoot>
    </table></div>
    <p class="muted cq-ley">${usados.length ? usados.map(u => `<span class="cq-l m-${letraDe(u)}">${letraDe(u)}</span> ${esc(u)}`).join(' · ') + '. ' : ''}Toca un nombre para ver o apuntar sus ausencias. Abajo, los presentes de cada día${Object.values(min).some(Boolean) ? ' (en rojo, por debajo del mínimo)' : ''}.</p>
  </div>`;
}

// Las ausencias de una persona: la que tiene en curso, las apuntadas (futuras y pasadas) y los días de vacaciones del año
function planDe(id) {
  const o = get('operators', id); if (!o) return;
  const hoy = todayISO(), plan = [...(o.plan || [])].sort((a, b) => b.desde.localeCompare(a.desde)), y = new Date().getFullYear();
  const fila = p => `<button class="item" onclick="planForm('${id}', '${p.id}')"><div><b>${esc(p.motivo)}${p.lugar ? ' · ' + esc(p.lugar) : ''}</b>
    <small>Del ${fmtDate(p.desde)} al ${fmtDate(p.hasta)}${p.nota ? ' · ' + esc(p.nota) : ''}</small></div><span class="tag ${p.hasta < hoy ? 'neutral' : p.desde <= hoy ? 'bad' : 'warn'}">${p.hasta < hoy ? 'Pasada' : p.desde <= hoy ? 'En curso' : 'Prevista'}</span></button>`;
  openModal(`Ausencias de ${o.name}`, `
    <p class="muted">Vacaciones de ${y}: <b>${diasDe(o, 'Vacaciones', y)} días</b> apuntados${diasDe(o, 'Permiso', y) ? ` · Permisos: <b>${diasDe(o, 'Permiso', y)} días</b>` : ''}.</p>
    ${o.aus ? `<div class="callout ${esAusente(o) ? 'bad' : ''}" style="margin-top:10px"><span>${esAusente(o) ? 'Ahora: ' + esc(ausTxt(o)) : 'Prevista: ' + esc(ausPrevTxt(o))}</span><button class="btn btn-g btn-sm" onclick="ausenciaForm('${id}')">Cambiar</button></div>` : ''}
    ${plan.length ? `<div class="list" style="margin-top:10px">${plan.map(fila).join('')}</div>` : '<p class="muted" style="margin-top:10px">No tiene ausencias apuntadas en el cuadrante.</p>'}
    <div class="row" style="margin-top:12px"><button class="btn btn-a" onclick="planForm('${id}')">${ic('plus')} Vacaciones o permiso</button>
      <button class="btn btn-g" onclick="closeModal(); openPerson('${id}')">${ic('users')} Su ficha</button></div>`);
}
// Apuntar (o cambiar) unos días de ausencia con fecha de inicio y de fin. Sin persona, se elige en el formulario
function planForm(id = '', pid = '') {
  const o = id ? get('operators', id) : null, p = (o?.plan || []).find(x => x.id === pid) || {}, base = cuadMes() === todayISO().slice(0, 7) ? todayISO() : cuadMes() + '-01';
  openForm(pid ? `${o.name}: ${p.motivo}` : 'Apuntar una ausencia', [
    ...(o ? [] : [{ k: 'op', label: 'Quién', required: true, wide: true, value: '', options: [['', 'Elige a la persona'], ...operators().sort(ordenSier).map(x => [x.id, conEmpleo(x)])] }]),
    { k: 'motivo', label: 'Motivo', value: p.motivo || 'Vacaciones', options: MOTIVOS_AUSENCIA.map(m => [m, m]), required: true, wide: true },
    { k: 'desde', label: 'Desde', type: 'date', value: p.desde || base, required: true },
    { k: 'hasta', label: 'Hasta (ese día incluido)', type: 'date', value: p.hasta || base, required: true },
    { k: 'lugar', label: 'Dónde está (opcional)', value: p.lugar || '', wide: true },
    { k: 'nota', label: 'Nota', value: p.nota || '', wide: true }
  ], v => {
    const quien = o || get('operators', v.op); if (!quien) return toast('Elige a la persona', 'bad');
    if (v.hasta < v.desde) return toast('La fecha de fin es anterior a la de inicio', 'bad');
    const rec = { id: pid || uid('AU'), motivo: v.motivo, desde: v.desde, hasta: v.hasta, lugar: v.lugar || '', nota: v.nota || '' };
    put('operators', { ...quien, plan: [...(quien.plan || []).filter(x => x.id !== rec.id), rec] }, `${quien.name}: ${v.motivo.toLowerCase()} del ${fmtDate(v.desde)} al ${fmtDate(v.hasta)}`);
    // Lo que quedaría por debajo del mínimo se avisa al guardar (no se impide: decide quien organiza)
    const bajo = bajoMinimos(120).filter(b => b.dia >= v.desde && b.dia <= v.hasta);
    if (bajo.length) toast(`Ojo: ${bajo[0].grupo} baja del mínimo (${bajo[0].n} de ${bajo[0].min}) el ${fmtDate(bajo[0].dia)}${bajo.length > 1 ? ` y ${bajo.length - 1} ${bajo.length === 2 ? 'día' : 'días'} más` : ''}`, 'bad');
    if (id) setTimeout(() => planDe(id), 0);
  }, pid ? `<button type="button" class="btn btn-bad span2" onclick="planBorrar('${id}', '${pid}')">${ic('trash')} Quitar esta ausencia</button>` : '');
}
function planBorrar(id, pid) {
  const o = get('operators', id), p = (o?.plan || []).find(x => x.id === pid); if (!p || !confirm(`¿Quitar ${p.motivo.toLowerCase()} del ${fmtDate(p.desde)} al ${fmtDate(p.hasta)}?`)) return;
  put('operators', { ...o, plan: o.plan.filter(x => x.id !== pid) }, `${o.name}: quitada ${p.motivo.toLowerCase()} del ${fmtDate(p.desde)}`);
  closeModal(); setTimeout(() => planDe(id), 0);
}
// Cuánta gente tiene que quedar, como mínimo, en la sección y en cada especialidad (0 = sin mínimo)
function minimosForm() {
  const min = minimos();
  openForm('Mínimos de personal', cuadGrupos().map(([k, nombre, f]) => ({ k: 'm_' + fold(k).replace(/[^a-z0-9]/g, ''), label: `${nombre} (ahora ${operators().filter(f).length})`, type: 'number', value: min[k] || 0 })),
    v => put('meta', { id: 'minimos', value: Object.fromEntries(cuadGrupos().map(([k]) => [k, Math.max(0, Math.round(+v['m_' + fold(k).replace(/[^a-z0-9]/g, '')] || 0))])) }, 'Mínimos de personal actualizados'),
    `<p class="muted span2">Cuántos tienen que quedar presentes cada día. Con 0 no se vigila. Al apuntar una ausencia que deje a alguien por debajo, la app avisa (pero deja guardarla).</p>`);
}
