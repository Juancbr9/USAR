'use strict';
// SIER 242 · Apartados de las especialidades y equipos (Agua, Cuerdas, RPAS, SVA y Motosierras; USAR tiene sus propias
// pantallas). Todos funcionan igual: su gente (con presentes y ausentes), su material (un inventario sencillo con estado,
// dónde está y próxima revisión o caducidad), la revista de ese material y unas notas compartidas.

const AP_ESTADOS = { OPERATIVO: ['Operativo', 'ok'], 'REVISIÓN': ['En revisión', 'warn'], AVERIADO: ['Averiado', 'bad'] };
const apMiembros = k => { const a = APARTADOS[k]; return operators().filter(o => a.esp ? opEsp(o) === a.esp : a.eq ? (o.eq || []).includes(a.eq) : !!o.moto).sort(ordenSier); };
const apMat = k => list('matesp').filter(m => m.ap === k).sort(byName);
const apUds = arr => arr.reduce((s, m) => s + (+m.qty || 1), 0);
// Material: lo llevan los del apartado y quien tiene permiso de logística
const apPuede = k => puedeFlota() || apMiembros(k).some(o => o.id === me()?.id);
const apRevistas = k => get('meta', 'aprev-' + k)?.value || [];
const apNota = k => get('meta', 'apnota-' + k)?.value || '';
// El apartado de una persona (para enlazar desde Logística y Personal)
const apDe = esp => Object.keys(APARTADOS).find(k => APARTADOS[k].esp === esp);

function apMatRow(k, m) {
  const [txt, cls] = AP_ESTADOS[m.status] || AP_ESTADOS.OPERATIVO, n = m.review ? daysTo(m.review) : null;
  return `<button class="item" onclick="apMatForm('${k}', '${m.id}')"><div><b>${esc(m.name)}${(+m.qty || 1) > 1 ? ` <span class="muted">× ${+m.qty}</span>` : ''}</b>
    <small>${esc([m.place || 'Sin sitio apuntado', m.serial ? 'n.º ' + m.serial : '', m.notes].filter(Boolean).join(' · '))}</small></div>
    <span class="row tags" style="justify-content:flex-end">${n != null && n <= 30 ? `<span class="tag ${n < 0 ? 'bad' : 'warn'}">${n < 0 ? 'Revisión pasada' : n === 0 ? 'Revisión hoy' : `Revisión en ${n} d`}</span>` : ''}
      ${cls === 'ok' ? '' : `<span class="tag ${cls}">${txt}</span>`}</span></button>`;
}

function viewApartado(k) {
  const a = APARTADOS[k], gente = apMiembros(k), pres = gente.filter(o => !esAusente(o)), mat = apMat(k), ok = mat.filter(m => (m.status || 'OPERATIVO') === 'OPERATIVO');
  const ult = apRevistas(k)[0], puede = apPuede(k), nota = apNota(k);
  const tabs = [['equipo', 'users', 'Equipo', gente.length], ['material', 'box', 'Material', mat.length], ['notas', 'file', 'Notas', 0]];
  const tab = tabs.some(t => t[0] === prefs.aptab) ? prefs.aptab : 'equipo';
  const sub = p => [p.peloton, a.moto ? motoTxt(p.moto) : '', ...(a.esp ? opEquipos(p) : [espLabel(p) === ESP_NINGUNA ? '' : espLabel(p)])].filter(Boolean).join(' · ');
  const cuerpo = {
    equipo: () => !gente.length ? `<div class="panel">${emptyState('users', 'Nadie apuntado todavía', `En Personal, edita a cada persona y ponle ${a.esp ? 'la especialidad «' + a.esp + '»' : a.eq ? 'el equipo «' + a.name + '»' : 'que es motosierrista'}.`,
        `<button class="btn btn-g" onclick="go('personal')">${ic('users')} Ir a Personal</button>`)}</div>`
      : a.moto ? ['T', 'S'].map(t => { const m = gente.filter(p => (p.moto.tipo === 'S') === (t === 'S')).sort((x, y) => (+x.moto.eq || 99) - (+y.moto.eq || 99));
          return m.length ? persPanel(t === 'S' ? 'Suplentes' : 'Titulares', m, sub) : ''; }).join('')
      : persPanel(a.largo, gente, sub),
    material: () => `<div class="panel">
        <div class="between wrap-row sec-head"><h3>Material</h3>
          ${puede ? `<div class="row"><button class="btn btn-a btn-sm" onclick="apMatForm('${k}')">${ic('plus')} Material</button>
            ${mat.length ? `<button class="btn btn-g btn-sm" onclick="apRevista('${k}')">${ic('clipboard')} Pasar revista</button>` : ''}</div>` : ''}</div>
        ${mat.length ? `<div class="list">${mat.map(m => apMatRow(k, m)).join('')}</div>
          ${ult ? `<p class="muted" style="margin-top:10px">Última revista: ${fmtWhen(ult.ts)}, ${esc(ult.by || '')}. ${ult.fails.length ? 'Fallos: ' + esc(ult.fails.join(', ')) + '.' : 'Todo bien.'}</p>` : ''}`
        : emptyState('box', 'Aún no hay material apuntado', `Apunta aquí el material de ${a.largo.toLowerCase()}: qué es, cuántos hay, dónde está y cuándo toca revisarlo.`,
            puede ? `<button class="btn btn-g" onclick="apHabitual('${k}')">${ic('list')} Empezar con lo habitual</button>` : '')}
      </div>`,
    notas: () => `<div class="panel">
        <div class="between sec-head"><h3>Notas</h3>${puede ? `<button class="btn btn-g btn-sm" onclick="apNotaForm('${k}')">${ic('pencil')} Editar</button>` : ''}</div>
        ${nota ? `<p class="ap-nota">${esc(nota)}</p>` : emptyState('file', 'Sin notas', 'Procedimientos, contactos, dónde se guarda cada cosa… lo que convenga tener a mano. Las ve todo el equipo.')}
      </div>`
  };
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><div><h2>${esc(a.name)}</h2><p class="muted">${esc(a.largo)} · ${UNIDAD}</p></div></div>
      <div class="sier-res">
        <div class="sier-kpi ${logCls(pres.length, gente.length) === 'bad' ? 'bad' : ''}"><small>Presentes</small><b>${pres.length}<span class="ap-de">/${gente.length}</span></b></div>
        <div class="sier-kpi ${ok.length < mat.length ? 'bad' : ''}"><small>Material</small><b>${ok.length}<span class="ap-de">/${mat.length}</span></b></div>
        <div class="sier-kpi"><small>Revista</small><b class="ap-fecha">${ult ? fmtDate(new Date(ult.ts - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)) : '—'}</b></div>
      </div>
    </div>
    <nav class="ctabs" aria-label="Partes del apartado">${tabs.map(([id, icon, l, n]) => `<button class="ctab ${tab === id ? 'on' : ''}" ${tab === id ? 'aria-current="page"' : ''} onclick="setPref({ aptab: '${id}' })">${ic(icon, 'i-sm')} ${l}${n ? ` <span class="n neutral">${n}</span>` : ''}</button>`).join('')}</nav>
    ${cuerpo[tab]()}`;
}

/* ---------- Material del apartado ---------- */
function apMatForm(k, id) {
  if (!apPuede(k)) return toast(`El material de ${APARTADOS[k].name} lo llevan los de ese apartado y logística`, 'bad');
  const m = id ? get('matesp', id) : { status: 'OPERATIVO', qty: 1 };
  openForm(id ? m.name : `Material de ${APARTADOS[k].name}`, [
    { k: 'name', label: 'Qué es', value: m.name || '', required: true, wide: true, placeholder: 'Ej.: ' + APARTADOS[k].habitual[0] },
    { k: 'qty', label: 'Cuántos', type: 'number', value: m.qty || 1 },
    { k: 'status', label: 'Estado', value: m.status || 'OPERATIVO', options: Object.entries(AP_ESTADOS).map(([v, [l]]) => [v, l]) },
    { k: 'place', label: 'Dónde está', value: m.place || '', wide: true, placeholder: 'Ej.: Almacén, armario 2' },
    { k: 'review', label: 'Próxima revisión o caducidad', type: 'date', value: m.review || '' },
    { k: 'serial', label: 'N.º de serie', value: m.serial || '' },
    { k: 'notes', label: 'Notas', value: m.notes || '', wide: true }
  ], v => put('matesp', { ...m, id: m.id || uid('ME'), ap: k, name: v.name.trim(), qty: Math.max(1, Math.round(+v.qty || 1)), status: v.status, place: v.place || '', review: v.review || '', serial: v.serial || '', notes: v.notes || '' },
    id ? `${APARTADOS[k].name}: ${v.name} actualizado` : `${APARTADOS[k].name}: añadido ${v.name}`),
  id ? `<button type="button" class="btn btn-bad span2" onclick="apMatBorrar('${id}')">${ic('trash')} Eliminar</button>` : '');
}
function apMatBorrar(id) {
  const m = get('matesp', id); if (!m || !confirm(`¿Eliminar «${m.name}»?`)) return;
  remove('matesp', id, `${APARTADOS[m.ap]?.name || 'Material'}: eliminado ${m.name}`); closeModal();
}
// Para no empezar de cero: la lista habitual de ese apartado, que luego se ajusta (cantidades, sitio, lo que sobre)
function apHabitual(k) {
  if (!apPuede(k)) return;
  putMany('matesp', APARTADOS[k].habitual.map(name => ({ id: uid('ME'), ap: k, name, qty: 1, status: 'OPERATIVO', place: '', review: '', serial: '', notes: '' })), `${APARTADOS[k].name}: lista de material habitual añadida`);
  toast('Lista añadida: ajusta cantidades y borra lo que no tengáis');
}
// Revista: todo marcado como bien; se desmarca lo que falla (pasa a «En revisión») y queda apuntado quién la pasó y cuándo
function apRevista(k) {
  const mat = apMat(k); if (!mat.length) return;
  openForm(`Revista de ${APARTADOS[k].name}`, [
    { k: 'ok', label: 'Deja marcado lo que está bien y desmarca lo que falla o falta', type: 'checks', wide: true, value: mat.filter(m => m.status !== 'AVERIADO').map(m => m.id),
      options: mat.map(m => [m.id, `${m.name}${(+m.qty || 1) > 1 ? ' × ' + m.qty : ''}${m.place ? ' · ' + m.place : ''}`]) },
    { k: 'nota', label: 'Qué falla (si falla algo)', value: '', wide: true }
  ], v => {
    const ok = new Set(v.ok || []), mal = mat.filter(m => !ok.has(m.id));
    mat.forEach(m => { const bien = ok.has(m.id);
      if (bien && m.status !== 'OPERATIVO') stamp('matesp', { ...m, status: 'OPERATIVO' });
      if (!bien && m.status === 'OPERATIVO') stamp('matesp', { ...m, status: 'REVISIÓN', notes: [m.notes, v.nota ? `Revista ${fmtDate(todayISO())}: ${v.nota}` : ''].filter(Boolean).join(' · ') }); });
    put('meta', { id: 'aprev-' + k, value: [{ ts: Date.now(), by: prefs.activeOperator, total: mat.length, fails: mal.map(m => m.name), nota: v.nota || '' }, ...apRevistas(k)].slice(0, 12) },
      `Revista de ${APARTADOS[k].name}: ${mal.length ? mal.length + (mal.length === 1 ? ' fallo' : ' fallos') : 'todo bien'}`);
    toast(mal.length ? `Revista guardada: ${mal.length} ${mal.length === 1 ? 'cosa pasa' : 'cosas pasan'} a revisión` : 'Revista guardada: todo bien');
  });
}
function apNotaForm(k) {
  openForm(`Notas de ${APARTADOS[k].name}`, [{ k: 'value', label: 'Notas (las ve todo el equipo)', type: 'textarea', rows: 8, value: apNota(k), wide: true, placeholder: 'Procedimientos, contactos, dónde se guarda cada cosa…' }],
    v => put('meta', { id: 'apnota-' + k, value: (v.value || '').trim() }, `Notas de ${APARTADOS[k].name} actualizadas`));
}
