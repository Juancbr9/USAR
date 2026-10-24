'use strict';
// USAR 242 · Entregas de material a personal de fuera del equipo USAR (otras unidades de la UME…):
// a quién, qué, hasta cuándo, estado al entregar (fotos y notas) y firma de quien lo recibe. Al volver, devolución con su estado.

const loans = () => list('loans').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
const loanGear = l => (l.gear || []).map(id => get('gear', id)).filter(Boolean);
const loanLate = l => !l.returned && l.due && daysTo(l.due) < 0;
const loanWho = l => [l.to, l.unit].filter(Boolean).join(' · ');

function viewEntregas() {
  const all = loans(), open = all.filter(l => !l.returned), done = all.filter(l => l.returned);
  const row = l => `<button class="item" onclick="loanDetail('${l.id}')"><div><b>${esc(loanWho(l))}</b>
      <small>${loanGear(l).length} equipos · ${fmtDate(l.date)}${l.due ? ' → ' + fmtDate(l.due) : ''}${l.purpose ? ' · ' + esc(l.purpose) : ''}</small></div>
      <span class="tag ${l.returned ? 'ok' : loanLate(l) ? 'bad' : 'info'}">${l.returned ? 'Devuelto' : loanLate(l) ? 'Sin devolver' : 'Prestado'}</span></button>`;
  return `
    <div class="panel">
      <div class="between sec-head"><h2>Entregas</h2><button class="btn btn-a" onclick="loanForm()">${ic('plus')} Entrega</button></div>
      ${open.length ? `<div class="list">${open.map(row).join('')}</div>` : '<p class="muted">No hay material prestado.</p>'}
    </div>
    ${done.length ? `<details class="panel"><summary class="sec-title" style="cursor:pointer">${ic('history')} Devueltas (${done.length})</summary><div class="list" style="margin-top:10px">${done.slice(0, 30).map(row).join('')}</div></details>` : ''}`;
}

// Material que se puede entregar: todo lo que no está ya fuera
const loanOptions = cur => list('gear').filter(g => !g.out || g.out.loan === cur).sort((a, b) => placeShort(a).localeCompare(placeShort(b), 'es', { numeric: true }) || byName(a, b))
  .map(g => [g.id, `${g.name}${qtyText(g)} · ${placeShort(g)}${boxCode(g) ? ' · caja ' + boxCode(g) : ''}`]);

function loanForm(id) {
  const l = get('loans', id) || { date: todayISO() };
  openForm(id ? 'Editar entrega' : 'Nueva entrega', [
    { k: 'to', label: 'Quién lo recibe (empleo y nombre)', value: l.to, required: true, wide: true, placeholder: 'Ej: Cabo 1º Pérez Gil' },
    { k: 'unit', label: 'Unidad', value: l.unit, placeholder: 'Ej: BIEM II, Sección de Transmisiones' },
    { k: 'docId', label: 'DNI / TIP', value: l.docId },
    { k: 'phone', label: 'Teléfono', type: 'tel', value: l.phone },
    { k: 'purpose', label: 'Para qué', value: l.purpose, placeholder: 'Ej: Ejercicio en Lanzarote' },
    { k: 'date', label: 'Fecha de entrega', type: 'date', value: l.date, required: true },
    { k: 'due', label: 'Devolución prevista', type: 'date', value: l.due },
    { k: 'gear', label: 'Material que se entrega', type: 'checks', options: loanOptions(id), value: l.gear || [], wide: true, filter: true },
    { k: 'notes', label: 'Estado al entregar', type: 'textarea', value: l.notes, wide: true, placeholder: 'Ej: Completo, con batería cargada y funda' },
    ...(id ? [] : [
      { k: 'photo1', label: 'Foto del estado', type: 'photo', value: '', wide: true },
      { k: 'photo2', label: 'Otra foto', type: 'photo', value: '', wide: true },
      { k: 'sig', label: 'Firma de quien lo recibe', type: 'signature', wide: true }])
  ], async v => {
    if (!v.gear.length) return toast('Marca el material que se entrega', 'bad');
    const rec = { ...l, ...v, id: id || uid('EN'), by: l.by || prefs.activeOperator };
    delete rec.photo1; delete rec.photo2; delete rec.sig;
    if (!id) {
      rec.photos = [];
      for (const [i, p] of [v.photo1, v.photo2].filter(Boolean).entries()) { const key = `loan:${rec.id}:${i}`; await Img.put(key, p); rec.photos.push(key); }
      if (v.sig) { await Img.put(`loan:${rec.id}:firma`, v.sig); rec.signed = true; }
    }
    // El material queda fuera a su nombre; lo que se quita de la entrega vuelve
    (l.gear || []).filter(gid => !v.gear.includes(gid)).forEach(gid => { const g = get('gear', gid); if (g?.out?.loan === rec.id) stamp('gear', { ...g, out: null }); });
    v.gear.forEach(gid => { const g = get('gear', gid); if (g) stamp('gear', { ...g, out: { who: loanWho(rec), since: Date.now(), note: rec.purpose || 'Entrega', loan: rec.id } }); });
    put('loans', rec, `${id ? 'Editada la entrega' : 'Entrega'} a ${loanWho(rec)}: ${v.gear.length} equipos`);
    loanDetail(rec.id);
  });
}

function loanDetail(id) {
  const l = get('loans', id); if (!l) return;
  const gs = loanGear(l);
  openModal(`Entrega · ${l.to}`, `
    <dl class="dl">
      <dt>Recibe</dt><dd>${esc(loanWho(l))}${l.docId ? ` · ${esc(l.docId)}` : ''}</dd>
      ${l.phone ? `<dt>Teléfono</dt><dd><a href="tel:${esc(l.phone.replace(/\s/g, ''))}">${esc(l.phone)}</a></dd>` : ''}
      ${l.purpose ? `<dt>Para qué</dt><dd>${esc(l.purpose)}</dd>` : ''}
      <dt>Entregado</dt><dd>${fmtDate(l.date)} · por ${esc(l.by || '')}</dd>
      <dt>Devolución</dt><dd>${l.returned ? `Devuelto el ${fmtDate(l.returned.date)} · ${esc(l.returned.by || '')}` : l.due ? `${fmtDate(l.due)}${loanLate(l) ? ' <span class="tag bad">Fuera de plazo</span>' : ''}` : 'Sin fecha'}</dd>
      ${l.notes ? `<dt>Estado</dt><dd class="pre">${esc(l.notes)}</dd>` : ''}
      ${l.returned?.notes ? `<dt>Al volver</dt><dd class="pre">${esc(l.returned.notes)}</dd>` : ''}
    </dl>
    <h4 class="sec-title" style="margin-top:12px">Material (${gs.length})</h4>
    <div class="list">${gs.map(g => `<button class="item" onclick="gearDetail('${g.id}')"><div class="who-row">${artMini(g)}<div><b>${esc(g.name)}${qtyText(g)}</b><small>${esc(placeShort(g))}${g.serial ? ' · S/N ' + esc(g.serial) : ''}</small></div></div></button>`).join('')}</div>
    ${(l.photos || []).length ? `<div class="grid g2" style="margin-top:12px">${l.photos.map(k => `<img class="doc-full" data-img="${esc(k)}" alt="Estado del material">`).join('')}</div>` : ''}
    ${l.signed ? `<h4 class="sec-title" style="margin-top:12px">Firma de quien lo recibe</h4><img class="sig-img" data-img="loan:${esc(l.id)}:firma" alt="Firma">` : ''}
    <div class="grid g2" style="grid-template-columns:1fr 1fr; margin-top:14px">
      ${l.returned ? '' : `<button class="btn btn-a" onclick="loanReturn('${id}')">${ic('in')} Devolución</button>`}
      <button class="btn btn-g" onclick="shareText(loanText(get('loans', '${id}')))">${ic('share')} Enviar</button>
      <button class="btn btn-g" onclick="loanPdf('${id}')">${ic('download')} Acta en PDF</button>
      ${l.returned ? '' : `<button class="btn btn-g" onclick="loanForm('${id}')">${ic('pencil')} Editar</button>`}
      <button class="btn btn-bad" onclick="deleteLoan('${id}')">${ic('trash')} Eliminar</button>
    </div>`);
}

function loanReturn(id) {
  const l = get('loans', id);
  openForm(`Devolución · ${l.to}`, [
    { k: 'date', label: 'Fecha', type: 'date', value: todayISO(), required: true },
    { k: 'notes', label: 'Cómo vuelve', type: 'textarea', wide: true, placeholder: 'Ej: Completo. La batería vuelve descargada' },
    { k: 'photo', label: 'Foto al volver', type: 'photo', value: '', wide: true },
    { k: 'sig', label: 'Firma de quien lo devuelve', type: 'signature', wide: true }
  ], async v => {
    const photos = [...(l.photos || [])];
    if (v.photo) { const key = `loan:${id}:vuelta`; await Img.put(key, v.photo); photos.push(key); }
    if (v.sig) await Img.put(`loan:${id}:firma-vuelta`, v.sig);
    loanGear(l).forEach(g => { if (g.out?.loan === id) stamp('gear', { ...g, out: null }); });
    put('loans', { ...l, photos, returned: { date: v.date, notes: v.notes, by: prefs.activeOperator, signed: !!v.sig } }, `Devuelto el material de ${loanWho(l)}`);
    loanDetail(id);
  });
}

function deleteLoan(id) {
  const l = get('loans', id);
  if (!confirm(`¿Eliminar la entrega a ${l.to}?` + (l.returned ? '' : '\n\nEl material vuelve a estar disponible.'))) return;
  loanGear(l).forEach(g => { if (g.out?.loan === id) stamp('gear', { ...g, out: null }); });
  closeModal(); remove('loans', id, `Eliminada la entrega a ${l.to}`);
}

function loanText(l) {
  const gs = loanGear(l);
  return [...waHead('📦', `${teamCode()} · Entrega de material`), `👤 *Recibe:* ${loanWho(l)}${l.docId ? ' (' + l.docId + ')' : ''}`, `📅 *Fecha:* ${fmtDate(l.date)}${l.due ? ' · ↩️ devolución prevista ' + fmtDate(l.due) : ''}`,
    l.purpose ? `🎯 *Para:* ${l.purpose}` : '', ...waSec('🧰', `Material (${gs.length})`), ...gs.map(g => `• ${g.name}${qtyText(g)}${g.serial ? ' (S/N ' + g.serial + ')' : ''}`), '',
    l.notes ? `📝 *Estado:* ${l.notes}` : '', `✍️ *Entrega:* ${l.by || ''}${l.signed ? ' · firmado por quien recibe' : ''}`,
    l.returned ? `✅ *Devuelto el ${fmtDate(l.returned.date)}*${l.returned.notes ? ': ' + l.returned.notes : ''}` : ''].join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

async function printLoan(id) {
  const l = get('loans', id), sig = l.signed ? await Img.get(`loan:${id}:firma`).catch(() => '') : '';
  $('print').innerHTML = `
    <h1>${esc(teamCode())} · Acta de entrega de material</h1>
    <p>Entrega: ${esc(l.by || '')} · Fecha: ${fmtDate(l.date)}${l.due ? ' · Devolución prevista: ' + fmtDate(l.due) : ''}</p>
    <p>Recibe: <b>${esc(loanWho(l))}</b>${l.docId ? ' · ' + esc(l.docId) : ''}${l.phone ? ' · ' + esc(l.phone) : ''}${l.purpose ? ' · Para: ' + esc(l.purpose) : ''}</p>
    <table><tr><th>Material</th><th>Cantidad</th><th>Nº serie</th><th>Procede de</th></tr>
      ${loanGear(l).map(g => `<tr><td>${esc(g.name)}</td><td>${g.qty || 1}</td><td>${esc(g.serial || '')}</td><td>${esc(placeShort(g))}${boxCode(g) ? ' · ' + esc(boxCode(g)) : ''}</td></tr>`).join('')}</table>
    ${l.notes ? `<p>Estado al entregar: ${esc(l.notes)}</p>` : ''}
    <p>Recibí conforme:</p>${sig ? `<img src="${sig}" style="max-width:320px; border:1px solid #999">` : '<p>____________________</p>'}
    ${l.returned ? `<p>Devuelto el ${fmtDate(l.returned.date)} · recibe ${esc(l.returned.by || '')}${l.returned.notes ? ' · ' + esc(l.returned.notes) : ''}</p>` : ''}`;
  print();
}

// Acta de entrega en PDF: datos, material, estado, fotos y recuadros de firma de quien entrega y de quien recibe
async function loanPdf(id) {
  const l = get('loans', id); if (!l) return;
  toast('Preparando el acta…');
  const imgs = async k => pdfImage(await Img.get(k).catch(() => ''), 1000);
  const sig = l.signed ? await imgs(`loan:${id}:firma`) : null, sigBack = l.returned?.signed ? await imgs(`loan:${id}:firma-vuelta`) : null;
  const photos = (await Promise.all((l.photos || []).slice(0, 4).map(imgs))).filter(Boolean);
  const d = new MiniPDF(), L = 18, R = 192, W = R - L;
  let y = 20;
  const need = h => { if (y + h > 280) { d.addPage(); y = 20; } };
  d.rect(L, 12, W, 14, { fill: [0.13, 0.22, 0.16], stroke: false });
  d.text(L + 4, 21.5, `${teamCode()} · ACTA DE ENTREGA DE MATERIAL`, { size: 14, bold: true, color: [1, 1, 1] });
  d.text(R - 40, 21.5, `Nº ${l.id}`, { size: 9, color: [1, 0.85, 0.3] });
  y = 36;
  const row = (k, v) => { if (!v) return; need(7); d.text(L, y, k, { size: 9.5, bold: true }); y = d.para(L + 42, y, v, W - 42, { size: 9.5 }) + 1.2; };
  row('Fecha de entrega', fmtDate(l.date)); row('Devolución prevista', l.due ? fmtDate(l.due) : 'Sin fecha');
  row('Entrega', `${l.by || ''} (${teamCode()})`); row('Recibe', loanWho(l)); row('DNI / TIP', l.docId); row('Teléfono', l.phone); row('Para qué', l.purpose);
  y += 3; need(14);
  d.text(L, y, 'MATERIAL', { size: 11, bold: true }); y += 3;
  const cols = [[L, 8, 'Nº'], [L + 8, 78, 'Material'], [L + 86, 18, 'Cant.'], [L + 104, 34, 'Nº de serie'], [L + 138, W - 138, 'Procede de']];
  d.rect(L, y, W, 7, { fill: [0.92, 0.93, 0.92] }); cols.forEach(([x, , t]) => d.text(x + 1.5, y + 4.8, t, { size: 8.5, bold: true })); y += 7;
  loanGear(l).forEach((g, i) => {
    const name = MiniPDF.wrap(g.name, 9, 75), h = Math.max(7, name.length * 4.3 + 2.6); need(h);
    d.rect(L, y, W, h);
    d.text(L + 1.5, y + 4.8, String(i + 1), { size: 9 }); name.forEach((t, j) => d.text(L + 9.5, y + 4.8 + j * 4.3, t, { size: 9 }));
    d.text(L + 87.5, y + 4.8, String(g.qty || 1), { size: 9 }); d.text(L + 105.5, y + 4.8, g.serial || '', { size: 9 });
    d.text(L + 139.5, y + 4.8, `${placeShort(g)}${boxCode(g) ? ' · ' + boxCode(g) : ''}`.slice(0, 30), { size: 8.5 }); y += h;
  });
  y += 5;
  if (l.notes) { need(14); d.text(L, y, 'ESTADO AL ENTREGAR', { size: 11, bold: true }); y = d.para(L, y + 5, l.notes, W, { size: 9.5 }) + 3; }
  if (photos.length) {
    need(52); d.text(L, y, 'FOTOS', { size: 11, bold: true }); y += 3;
    const pw = (W - 6 * (photos.length - 1)) / photos.length;
    photos.forEach((im, i) => { d.rect(L + i * (pw + 6), y, pw, 45, { lw: 0.2 }); d.image(im, L + i * (pw + 6) + 1, y + 1, pw - 2, 43); }); y += 51;
  }
  need(60);
  y = d.para(L, y, 'Quien recibe declara recibir el material arriba indicado en el estado descrito y se compromete a devolverlo en la fecha prevista.', W, { size: 9 }) + 5;
  const box = (x, title, name, im) => {
    d.text(x, y, title, { size: 10, bold: true }); d.rect(x, y + 3, 82, 32, { lw: 0.3 });
    if (im) d.image(im, x + 2, y + 5, 78, 28);
    d.text(x, y + 41, `Nombre: ${name || '______________________'}`, { size: 9 }); d.text(x, y + 47, 'Fecha: ' + fmtDate(l.date), { size: 9 });
  };
  box(L, 'ENTREGA (firma)', l.by, null); box(L + 92, 'RECIBE (firma)', l.to, sig);
  y += 56;
  {  // Devolución: con sus datos si ya volvió; si no, en blanco para rellenar y firmar al volver
    need(64); d.line(L, y, R, y, 0.4); y += 7;
    d.text(L, y, 'DEVOLUCIÓN', { size: 11, bold: true }); y += 6;
    const blank = '______________________________';
    row('Fecha', l.returned ? fmtDate(l.returned.date) : blank); row('Recibe', l.returned?.by || blank); row('Cómo vuelve', l.returned?.notes || blank);
    y += 3; d.text(L, y, 'DEVUELVE (firma)', { size: 10, bold: true }); d.rect(L, y + 3, 82, 32); if (sigBack) d.image(sigBack, L + 2, y + 5, 78, 28);
    d.text(L + 92, y, 'RECIBE EN EL EQUIPO (firma)', { size: 10, bold: true }); d.rect(L + 92, y + 3, 82, 32); y += 40;
  }
  d.pages.forEach((p, i) => { d.cur = p; d.text(L, 290, `${teamCode()} · Acta ${l.id} · generada el ${new Date().toLocaleString('es-ES')} · página ${i + 1} de ${d.pages.length}`, { size: 7.5, color: [0.4, 0.4, 0.4] }); });
  await savePdf(d.output(), `Acta-entrega-${fold(l.to).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${l.date}.pdf`);
}
