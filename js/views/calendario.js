'use strict';
// USAR 242 · Calendario de ejercicios, formación, guardias y reuniones, con convocatoria, asistencia y horas por persona.

CATALOGS.eventTypes = ['Tipos de evento del calendario', ['Ejercicio', 'Formación', 'Guardia', 'Reunión', 'Revista de material', 'Otro']];
const TRAINING = /ejercicio|formaci/i;
const ATT = { si: ['Asiste', 'ok'], no: ['No asiste', 'bad'], just: ['Justificada', 'warn'] };
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const events = () => list('events').sort((a, b) => (a.start || '').localeCompare(b.start || ''));
// Horas de un evento. Si dura varios días, se cuenta el horario de un día (de la hora de inicio a la de fin) por cada día.
function evHours(e) {
  if (!(e.start && e.end)) return +e.hours || 0;
  const n = eventDays(e).length;
  if (n === 1) return Math.max(0, (new Date(e.end) - new Date(e.start)) / 3.6e6);
  const h = t => +t.slice(11, 13) + +t.slice(14, 16) / 60, perDay = h(e.end) - h(e.start);
  return n * (perDay > 0 ? perDay : 8);
}
const dayKey = iso => (iso || '').slice(0, 10);
// Días que ocupa un evento (de su día de inicio al de fin, ambos incluidos)
function eventDays(e) {
  const a = dayKey(e.start), b = dayKey(e.end) > a ? dayKey(e.end) : a, out = [];
  for (let d = new Date(a + 'T12:00'); dayKey(d.toISOString()) <= b && out.length < 120; d.setDate(d.getDate() + 1)) out.push(dayKey(d.toISOString()));
  return out;
}
const evClass = e => TRAINING.test(e.type) ? 'tr' : /guardia/i.test(e.type) ? 'gu' : '';

// Horas de formación y asistencia de una persona en un año (ejercicios y formación a los que asistió)
function trainingStats(op, year = new Date().getFullYear()) {
  const evs = events().filter(e => (e.start || '').startsWith(String(year)) && (e.people || []).includes(op) && new Date(e.start) <= new Date());
  const att = evs.filter(e => e.att?.[op] === 'si');
  return { called: evs.length, attended: att.length, hours: att.filter(e => TRAINING.test(e.type)).reduce((s, e) => s + evHours(e), 0) };
}

function viewCalendario() {
  const now = new Date(), ym = prefs.calMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [y, mo] = ym.split('-').map(Number);
  const first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate(), offset = (first.getDay() + 6) % 7;
  const evs = events(), byDay = {};
  evs.forEach(e => eventDays(e).forEach(k => (byDay[k] ||= []).push(e)));
  const sel = prefs.calDay;
  const shift = d => { const t = new Date(y, mo - 1 + d, 1); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`; };
  const cells = [...Array(offset).fill(''), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = todayISO();
  const listEvs = sel ? (byDay[sel] || []) : evs.filter(e => eventDays(e).at(-1) >= today).slice(0, 12);
  return `
    <div class="panel">
      <div class="between sec-head"><h2>Calendario</h2><button class="btn btn-a" onclick="eventForm()">${ic('plus')} Evento</button></div>
      <div class="between" style="margin-bottom:8px">
        <button class="btn btn-g btn-sm" aria-label="Mes anterior" onclick="setPref({ calMonth: '${shift(-1)}', calDay: null })">${ic('back', 'i-sm')}</button>
        <b class="cal-title">${MONTHS_ES[mo - 1]} ${y}</b>
        <button class="btn btn-g btn-sm" aria-label="Mes siguiente" onclick="setPref({ calMonth: '${shift(1)}', calDay: null })">${ic('chev', 'i-sm')}</button>
      </div>
      <div class="cal">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span class="cal-h">${d}</span>`).join('')}
        ${cells.map(d => { if (!d) return '<span></span>'; const k = `${ym}-${String(d).padStart(2, '0')}`, es = byDay[k] || [];
          return `<button class="cal-d ${k === today ? 'today' : ''} ${k === sel ? 'sel' : ''} ${es.length ? 'has' : ''}" onclick="setPref({ calDay: '${k === sel ? '' : k}' || null })" aria-label="${d}: ${es.length} eventos">${d}
            <span class="cal-dots">${es.slice(0, 3).map(e => `<i class="${evClass(e)}"></i>`).join('')}</span></button>`; }).join('')}
      </div>
    </div>
    <div class="panel">
      <h3 class="sec-title">${ic('calendar')} ${sel ? fmtDate(sel) : 'Próximos'}</h3>
      ${listEvs.length ? `<div class="list">${listEvs.map(eventRow).join('')}</div>` : `<p class="muted">${sel ? 'Nada este día.' : 'Nada programado.'} Crea un ejercicio, una formación o una guardia.</p>`}
    </div>
    <div class="panel">
      <h3 class="sec-title">${ic('users')} Asistencia y horas de formación (${now.getFullYear()})</h3>
      <div class="list">${operators().map(o => { const s = trainingStats(o.id); return `
        <div class="item"><div class="who-row">${avatar(o.name, 'sm')}<div><b>${esc(o.name)}</b><small>${s.attended}/${s.called} convocatorias · ${s.hours.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h de formación</small></div></div>
          <span class="tag ${!s.called ? 'neutral' : s.attended / s.called >= .75 ? 'ok' : s.attended / s.called >= .5 ? 'warn' : 'bad'}">${s.called ? Math.round(s.attended / s.called * 100) + ' %' : '—'}</span></div>`; }).join('')}</div>
    </div>`;
}

const evWhen = e => { const n = eventDays(e).length; return n > 1 ? `del ${fmtDT(e.start)} al ${fmtDT(e.end)} (${n} días)` : fmtDT(e.start); };
function eventRow(e) {
  const yes = Object.values(e.att || {}).filter(x => x === 'si').length;
  return `<button class="item" onclick="eventDetail('${e.id}')"><div><b>${esc(e.title || e.type)}</b>
    <small>${esc(e.type)} · ${evWhen(e)}${e.place ? ' · ' + esc(e.place) : ''}</small><small>${(e.people || []).length} convocados${yes ? ` · ${yes} asisten` : ''}</small></div>${ic('chev', 'i-sm')}</button>`;
}

function eventForm(id) {
  const e = get('events', id) || { start: (prefs.calDay || todayISO()) + 'T09:00', end: (prefs.calDay || todayISO()) + 'T13:00', people: operators().map(o => o.id) };
  openForm(id ? 'Editar evento' : 'Nuevo evento', [
    { k: 'type', label: 'Tipo', value: e.type, catalog: 'eventTypes', required: true, carry: 'evType' },
    { k: 'title', label: 'Título', value: e.title, placeholder: 'Ej: Apuntalamiento en T' },
    { k: 'start', label: 'Empieza', type: 'datetime-local', value: e.start },
    { k: 'end', label: 'Termina', type: 'datetime-local', value: e.end },
    { k: 'place', label: 'Lugar', value: e.place, wide: true, carry: 'evPlace' },
    { k: 'people', label: 'Convocados', type: 'checks', value: e.people, options: opChecks(), wide: true },
    { k: 'notes', label: 'Notas', type: 'textarea', rows: 2, value: e.notes, wide: true }
  ], v => {
    if (v.end && v.start && v.end < v.start) return toast('La fecha de fin es anterior a la de inicio', 'bad');
    const rec = { ...(e.id ? e : { id: uid('EV'), att: {} }), ...v };
    put('events', rec, `Calendario: ${rec.title || rec.type} ${fmtDT(rec.start)}`);
    setPref({ calMonth: rec.start.slice(0, 7) });
    eventDetail(rec.id);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="if (confirm('¿Eliminar este evento?')) { remove('events', '${id}', 'Evento eliminado'); closeModal(); }">${ic('trash')} Eliminar</button>` : '');
}

function eventDetail(id) {
  const e = get('events', id);
  if (!e) return closeModal();
  const people = (e.people || []).map(op => get('operators', op)).filter(Boolean);
  openModal(e.title || e.type, `
    <dl class="dl"><dt>Tipo</dt><dd>${esc(e.type)}</dd><dt>Cuándo</dt><dd>${eventDays(e).length > 1 ? evWhen(e) : `${fmtDT(e.start)} → ${e.end ? fmtHour(new Date(e.end)) : '—'}`} (${evHours(e).toLocaleString('es-ES', { maximumFractionDigits: 1 })} h)</dd>
      ${e.place ? `<dt>Lugar</dt><dd>${esc(e.place)}</dd>` : ''}${e.notes ? `<dt>Notas</dt><dd>${esc(e.notes)}</dd>` : ''}</dl>
    <div class="row" style="margin-bottom:14px">
      <button class="btn btn-g btn-sm" onclick="open('https://wa.me/?text=' + encodeURIComponent(eventText(get('events', '${id}'))), '_blank')">${ic('chat', 'i-sm')} Convocar</button>
      <button class="btn btn-g btn-sm" onclick="downloadIcs('${id}')">${ic('calendar', 'i-sm')} Añadir a mi calendario</button>
      ${/ejercicio/i.test(e.type) ? `<button class="btn btn-g btn-sm" onclick="eventToMission('${id}')">${ic('flag', 'i-sm')} Crear el ejercicio</button>` : ''}
      <button class="btn btn-g btn-sm" onclick="eventForm('${id}')">${ic('pencil', 'i-sm')} Editar</button>
    </div>
    <h3 class="sub" style="margin-top:0">Asistencia</h3>
    <div class="list">${people.map(o => `<div class="between att-row"><b>${esc(o.name)}</b>
      <div class="seg3">${Object.entries(ATT).map(([k, [l]]) => `<label><input type="radio" name="att-${o.id}" ${e.att?.[o.id] === k ? 'checked' : ''} onchange="setAttendance('${id}', '${o.id}', '${k}')"><span>${l}</span></label>`).join('')}</div></div>`).join('')}</div>
    <button class="btn btn-g full" style="margin-top:10px" onclick="const e = get('events', '${id}'); put('events', { ...e, att: Object.fromEntries(e.people.map(p => [p, 'si'])) }); eventDetail('${id}')">Asisten todos</button>`);
}
function setAttendance(id, op, k) {
  const e = get('events', id);
  put('events', { ...e, att: { ...(e.att || {}), [op]: k } });
}

function eventText(e) {
  const ps = names(e.people || []);
  return [...waHead('📣', `USAR 242 · ${e.type.toUpperCase()}`, e.title), `📅 *Cuándo:* ${eventDays(e).length > 1 ? evWhen(e) : fmtDT(e.start) + (e.end ? ' → ' + fmtHour(new Date(e.end)) : '')}`,
    e.place ? `📍 *Dónde:* ${e.place}` : null, ...(e.notes ? waSec('📝', 'Detalles').concat(e.notes) : []),
    ...(ps.length ? waSec('👥', `Convocados (${ps.length})`).concat(ps.map(n => '• ' + n)) : [])].filter(x => x !== null).join('\n');
}
function downloadIcs(id) {
  const e = get('events', id);
  const f = iso => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const clean = s => String(s || '').replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//USAR 242//ES', 'BEGIN:VEVENT', `UID:${e.id}@usar242`, `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(e.start)}`, `DTEND:${f(e.end || e.start)}`, `SUMMARY:${clean('USAR 242 · ' + (e.title || e.type))}`, `LOCATION:${clean(e.place)}`, `DESCRIPTION:${clean(e.notes)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:USAR 242', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  download(`usar242-${dayKey(e.start)}.ics`, ics, 'text/calendar');
}
function eventToMission(id) {
  const e = get('events', id);
  const rec = { id: uid('M'), status: 'prep', type: 'ejercicio', title: e.title || 'Ejercicio', date: e.start, location: e.place || '', meeting: '', channel: '',
    objective: e.notes || '', chief: e.people?.[0] || '', teams: [], vehicles: [], gear: [], roles: {}, safety: '', contacts: '', notes: '', summary: '', scope: 'usar' };
  put('missions', rec, `Ejercicio creado desde el calendario: ${rec.title}`);
  put('events', { ...e, mission: rec.id });
  closeModal(); openMission(rec.id);
}
