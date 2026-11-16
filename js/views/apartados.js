'use strict';
// SIER 242 · Apartados de las especialidades y equipos (Agua, Cuerdas, RPAS, SVA y Motosierras; USAR tiene sus propias
// pantallas). Todos funcionan igual: su gente (con presentes y ausentes), su material (un inventario sencillo con estado,
// dónde está y próxima revisión o caducidad), la revista de ese material y unas notas compartidas.

const apMiembros = k => { const a = APARTADOS[k]; return a.comun ? [] : operators().filter(o => a.esp ? opEsp(o) === a.esp : a.eq ? (o.eq || []).includes(a.eq) : !!o.moto).sort(ordenSier); };
// El material es el de js/views/material.js, con el apartado como dueño («ap:agua»)
const apMat = k => matDe({ ap: k });
const apPuede = k => matPuede('ap:' + k);
// Lo que cuenta como material del apartado (sin lo que va a darse de baja)
const apVivo = k => apMat(k).filter(matVivo);
const apRevistas = k => matRevistas('ap:' + k);
const apHabitual = k => matHabitual('ap:' + k);
const apNota = k => get('meta', 'apnota-' + k)?.value || '';
// El apartado de una persona (para enlazar desde Logística y Personal)
const apDe = esp => Object.keys(APARTADOS).find(k => APARTADOS[k].esp === esp);

function viewApartado(k) {
  const a = APARTADOS[k], gente = apMiembros(k), pres = gente.filter(o => !esAusente(o)), mat = apVivo(k), ok = mat.filter(matOk), nec = needsAbiertas(k).length;
  const ult = apRevistas(k)[0], puede = apPuede(k), nota = apNota(k);
  const tabs = [...(a.comun ? [] : [['equipo', 'users', 'Equipo', gente.length]]), ['material', 'box', 'Material', mat.length], ['necesidades', 'clipboard', 'Necesidades', nec], ['notas', 'file', 'Notas', 0]];
  const tab = tabs.some(t => t[0] === prefs.aptab) ? prefs.aptab : tabs[0][0], fuera = mat.filter(m => m.holder && get('operators', m.holder)).length;
  const sub = p => [p.peloton, a.moto ? motoTxt(p.moto) : '', ...(a.esp ? opEquipos(p) : [espLabel(p) === ESP_NINGUNA ? '' : espLabel(p)])].filter(Boolean).join(' · ');
  const cuerpo = {
    equipo: () => !gente.length ? `<div class="panel">${emptyState('users', 'Nadie apuntado todavía', `En Personal, edita a cada persona y ponle ${a.esp ? 'la especialidad «' + a.esp + '»' : a.eq ? 'el equipo «' + a.name + '»' : 'que es motosierrista'}.`,
        `<button class="btn btn-g" onclick="go('personal')">${ic('users')} Ir a Personal</button>`)}</div>`
      : a.moto ? ['T', 'S'].map(t => { const m = gente.filter(p => (p.moto.tipo === 'S') === (t === 'S')).sort((x, y) => (+x.moto.eq || 99) - (+y.moto.eq || 99));
          return m.length ? persPanel(t === 'S' ? 'Suplentes' : 'Titulares', m, sub) : ''; }).join('')
      : persPanel(a.largo, gente, sub),
    material: () => `${pasilloPanel(k)}<div class="panel">${matBloque('ap:' + k, `Apunta aquí el material de ${a.largo.toLowerCase()}: qué es, cuántos hay, dónde está y cuándo toca revisarlo.`)}</div>`,
    necesidades: () => `<div class="panel">${needsBloque(k)}</div>`,
    notas: () => `<div class="panel">
        <div class="between sec-head"><h3>Notas</h3>${puede ? `<button class="btn btn-g btn-sm" onclick="apNotaForm('${k}')">${ic('pencil')} Editar</button>` : ''}</div>
        ${nota ? `<p class="ap-nota">${esc(nota)}</p>` : emptyState('file', 'Sin notas', 'Procedimientos, contactos, dónde se guarda cada cosa… lo que convenga tener a mano. Las ve todo el equipo.')}
      </div>`
  };
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><div><h2>${esc(a.name)}</h2><p class="muted">${esc(a.largo)} · ${UNIDAD}</p></div></div>
      <div class="sier-res">
        ${a.comun ? `<div class="sier-kpi"><small>Lo tiene alguien</small><b>${fuera}</b></div>`
          : `<div class="sier-kpi ${logCls(pres.length, gente.length) === 'bad' ? 'bad' : ''}"><small>Presentes</small><b>${pres.length}<span class="ap-de">/${gente.length}</span></b></div>`}
        <div class="sier-kpi ${ok.length < mat.length ? 'bad' : ''}"><small>Material</small><b>${ok.length}<span class="ap-de">/${mat.length}</span></b></div>
        <div class="sier-kpi"><small>Revista</small><b class="ap-fecha">${ult ? fmtDate(new Date(ult.ts - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)) : '—'}</b></div>
      </div>
    </div>
    <nav class="ctabs" aria-label="Partes del apartado">${tabs.map(([id, icon, l, n]) => `<button class="ctab ${tab === id ? 'on' : ''}" ${tab === id ? 'aria-current="page"' : ''} onclick="setPref({ aptab: '${id}' })">${ic(icon, 'i-sm')} ${l}${n ? ` <span class="n neutral">${n}</span>` : ''}</button>`).join('')}</nav>
    ${cuerpo[tab]()}`;
}

/* ---------- Notas del apartado ---------- */
function apNotaForm(k) {
  openForm(`Notas de ${APARTADOS[k].name}`, [{ k: 'value', label: 'Notas (las ve todo el equipo)', type: 'textarea', rows: 8, value: apNota(k), wide: true, placeholder: 'Procedimientos, contactos, dónde se guarda cada cosa…' }],
    v => put('meta', { id: 'apnota-' + k, value: (v.value || '').trim() }, `Notas de ${APARTADOS[k].name} actualizadas`));
}
