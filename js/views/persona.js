'use strict';
// USAR 242 · Base de datos del personal: ficha de cada persona con foto, teléfono, documentos escaneados con caducidad,
// cualificaciones, EPI, historial de operaciones y datos médicos. Y la vista de Vencimientos de todo.

const docsOf = op => list('docs').filter(d => d.op === op).sort((a, b) => (a.expires || '9999').localeCompare(b.expires || '9999'));
const docLead = type => /pasaporte/i.test(type || '') ? 183 : 60;   // días de antelación del aviso (pasaporte: 6 meses)
function docState(d) {
  if (!d.expires) return { cls: 'neutral', text: 'Sin caducidad' };
  const n = daysTo(d.expires);
  if (n < 0) return { cls: 'bad', text: `Caducado hace ${-n} d` };
  if (n <= docLead(d.type)) return { cls: 'warn', text: n <= 31 ? `Caduca en ${n} d` : `Caduca el ${fmtDate(d.expires)}` };
  return { cls: 'ok', text: `Vigente hasta ${fmtDate(d.expires)}` };
}
const maskNo = s => s && s.length > 4 ? '•••' + s.slice(-4) : (s || '');
const openPerson = id => { setPref({ tab: 'personal', person: id }); scrollTo(0, 0); };
const personPhoto = (o, cls = '') => o.photo ? `<img class="avatar-img ${cls}" data-img="op:${o.id}" alt="">` : avatar(o.name, cls);

function viewPersonal() {
  const o = prefs.person && get('operators', prefs.person);
  if (o) return viewPerson(o);
  const ops = operators(), cells = [...new Set(ops.map(x => x.cell || 'Sin célula'))];
  const epiBad = op => list('epis').filter(e => e.holder === op && epiState(e).cls !== 'ok').length;
  const spares = list('epis').filter(e => e.holder === RESERVA).sort((a, b) => epiLabel(a).localeCompare(epiLabel(b), 'es', { numeric: true }) || String(a.size).localeCompare(String(b.size), 'es', { numeric: true }));
  return `
    <div class="panel">
      <div class="between wrap-row sec-head"><div><h2>Personal</h2>
        </div>
        <div class="row"><button class="btn btn-a" onclick="newPersonForm()">${ic('plus')} Persona</button>
          <button class="btn btn-g" onclick="printPersonCards()">${ic('printer')} Tarjetas QR</button></div></div>
      <label class="lbl">Perfil de misión (reparte células y puestos de todos)
        <select class="input" onchange="applyPreset(this.value)">${Object.entries(PRESETS).map(([k, [label]]) => `<option value="${k}" ${mission() === k ? 'selected' : ''}>${esc(label)}</option>`).join('')}</select></label>
    </div>
    <div class="grid g3">${cells.map(cell => { const members = ops.filter(x => (x.cell || 'Sin célula') === cell); return `
      <div class="panel">
        <div class="between sec-head"><h3>${esc(cell)}</h3><span class="muted">${members.length}</span></div>
        <div class="list pers-list">${members.map(p => { const issues = readinessIssues(p.id), eb = epiBad(p.id), n = issues.length + (eb ? 1 : 0); return `
          <button class="item" onclick="openPerson('${p.id}')">
            <div class="who-row">${personPhoto(p)}<div><b>${esc(p.name)}</b><small>${esc([p.role, ...(p.funcs || [])].filter(Boolean).join(' · '))}</small>
              <small>${docsOf(p.id).length} documentos${eb ? ` · ${eb} EPI por revisar` : ''}</small></div></div>
            <span class="tag ${issues.some(i => i[0] === 'bad') ? 'bad' : n ? 'warn' : 'ok'}">${n ? n + ' avisos' : 'Al día'}</span>
          </button>`; }).join('')}</div>
      </div>`; }).join('')}</div>
    <details class="panel"><summary class="sec-title" style="cursor:pointer">${ic('hardhat')} EPI de reserva en almacén (${spares.reduce((s, e) => s + epiQty(e), 0)})</summary>
      <div class="list" style="margin-top:10px">${spares.map(e => `<button class="item" onclick="epiForm('${e.id}')"><div class="who-row"><span class="art art-sm">${toolArt(`${EPI_TYPES[e.type] || e.name} ${e.color || ''}`)}</span><div><b>${esc(epiLabel(e))}${epiQty(e) > 1 ? ` <span class="muted">×${epiQty(e)}</span>` : ''}</b><small>${esc([e.size && e.size !== 'Universal' ? 'Talla ' + e.size : 'Talla única', e.door ? placeShort({ door: +e.door }) : ''].filter(Boolean).join(' · '))}</small></div></div><span class="tag ${epiState(e).cls}">${epiState(e).text}</span></button>`).join('') || '<p class="muted">No hay EPI de reserva.</p>'}</div>
      <button class="btn btn-g btn-sm" style="margin-top:10px" onclick="epiForm(null, 'casco', '${RESERVA}')">${ic('plus')} EPI de reserva</button>
    </details>
    ${(() => { const gone = allOperators().filter(o => o.active === false); return gone.length ? `
    <details class="panel"><summary class="sec-title" style="cursor:pointer">De baja (${gone.length})</summary>
      <div class="list" style="margin-top:10px">${gone.map(o => `<button class="item" onclick="openPerson('${o.id}')"><div class="who-row">${avatar(o.name, 'sm')}<div><b>${esc(o.name)}</b><small>${esc(o.role || '')}</small></div></div><span class="tag neutral">Baja</span></button>`).join('')}</div>
    </details>` : ''; })()}`;
}

function viewPerson(o) {
  const r = readiness(o.id), md = medical(o.id), docs = docsOf(o.id), issues = readinessIssues(o.id);
  const epis = list('epis').filter(e => e.holder === o.id), epiBad = epis.filter(e => epiState(e).cls !== 'ok');
  const ms = list('missions').filter(m => missionPeople(m).includes(o.id)).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const hours = ms.reduce((s, m) => s + (presence(m).find(p => p.op === o.id) ? presenceTotal(presence(m).find(p => p.op === o.id)) : 0), 0);
  const f = (k, v) => v ? `<dt>${k}</dt><dd>${v}</dd>` : '';
  return `
    <button class="link" onclick="setPref({ person: null })">${ic('back', 'i-sm')} Todo el personal</button>
    <div class="panel">
      <div class="person-head">
        ${o.photo ? `<img class="person-photo" data-img="op:${o.id}" alt="">` : `<span class="avatar xl">${esc(initials(o.name))}</span>`}
        <div class="grow"><h2>${esc(o.name)}${o.active === false ? ' <span class="tag neutral">De baja</span>' : ''}</h2><p class="muted">${esc(r.fullName || '')}</p><p class="muted">${esc([o.cell, o.role].filter(Boolean).join(' · '))}</p>
          ${(o.funcs || []).length ? `<div class="row tags" style="margin-top:6px">${o.funcs.map(f => `<span class="tag info">${esc(f)}</span>`).join('')}</div>` : ''}</div>
      </div>
      ${issues.length ? `<div class="stack" style="margin-top:12px">${issues.map(([cls, t]) => `<span class="tag ${cls}">${esc(t)}</span>`).join(' ')}</div>` : ''}
      <div class="row" style="margin-top:12px">
        ${o.phone ? `<a class="btn btn-a" href="tel:${esc(o.phone.replace(/\s/g, ''))}">${ic('phone')} Llamar</a>
          <a class="btn btn-g" target="_blank" rel="noopener" href="https://wa.me/${esc(o.phone.replace(/\D/g, '').replace(/^(?!34)(\d{9})$/, '34$1'))}">${ic('chat')} WhatsApp</a>` : ''}
        <button class="btn btn-g" onclick="personForm('${o.id}')">${ic('pencil')} Editar datos</button>
        <button class="btn btn-g" onclick="readinessForm('${o.id}')">${ic('flag')} Alistamiento</button>
      </div>
      <details style="margin-top:12px"><summary class="link">${ic('qr', 'i-sm')} Tarjeta QR para fichar</summary>
        <div class="qr" style="margin-top:10px">${QR.svg(personCode(o.id))}</div>
        <button class="btn btn-g full" onclick="printPersonCards(['${o.id}'])">${ic('printer')} Imprimir su tarjeta</button></details>
    </div>

    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('file')} Documentación (${docs.length})</h3>
        <p class="muted">Haz foto del documento por las dos caras. Las fotos y la caducidad se comparten con el equipo.</p></div>
        <button class="btn btn-a btn-sm" onclick="docForm('${o.id}')">${ic('camera')} Documento</button></div>
      ${docs.length ? `<div class="grid g2">${docs.map(d => { const st = docState(d); return `
        <button class="doc-card" onclick="docDetail('${d.id}')">
          ${(d.imgs || []).length ? `<img class="doc-thumb" data-img="${d.imgs[0]}" alt="">` : `<span class="doc-thumb empty">${ic('file', 'i-lg')}</span>`}
          <div class="grow"><b>${esc(d.type)}</b><small>${d.number ? 'Nº ' + esc(maskNo(d.number)) : 'Sin número'}</small><span class="tag ${st.cls}">${st.text}</span></div>
        </button>`; }).join('')}</div>` : '<p class="muted">Sin documentos.</p>'}
    </div>

    <div class="grid g2">
      <div class="panel">
        <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('book')} Cualificaciones</h3>
          <button class="btn btn-g btn-sm" onclick="qualsEditor('${o.id}')">${ic('pencil')} Editar</button></div>
        ${(r.quals || []).length ? `<div class="list">${r.quals.map(q => `<div class="item"><span>${esc(q.name)}</span>${q.expires ? dueTag(q.expires) : '<span class="tag neutral">Sin caducidad</span>'}</div>`).join('')}</div>` : '<p class="muted">Ninguna anotada.</p>'}
        ${(s => `<p class="muted" style="margin-top:8px">${s.hours.toLocaleString('es-ES', { maximumFractionDigits: 1 })} h de formación este año en el calendario${r.hours ? ` (+${esc(r.hours)} h anotadas)` : ''} · asistencia ${s.called ? Math.round(s.attended / s.called * 100) + ' %' : '—'}</p>`)(trainingStats(o.id))}
      </div>
      <div class="panel">
        <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('hardhat')} EPI asignado</h3>
          <span class="tag ${epiBad.length ? 'warn' : 'ok'}">${epiBad.length ? epiBad.length + ' por revisar' : 'Todo OK'}</span></div>
        <div class="list">${Object.keys(EPI_TYPES).map(t => { const e = epis.find(x => x.type === t), st = epiState(e); return `
          <button class="item" onclick="${e ? `epiForm('${e.id}')` : `epiForm(null, '${t}', '${o.id}')`}"><div class="who-row"><span class="art art-sm">${toolArt(EPI_TYPES[t])}</span><div><b>${esc(e ? epiLabel(e) : EPI_TYPES[t])}</b>
            <small>${esc(e ? [e.size && 'Talla ' + e.size, e.expires && 'Caduca ' + fmtDate(e.expires)].filter(Boolean).join(' · ') || 'Sin talla' : 'Toca para asignar')}</small></div></div><span class="tag ${st.cls}">${st.text}</span></button>`; }).join('')}
          ${epis.filter(e => !EPI_TYPES[e.type]).map(e => `<button class="item" onclick="epiForm('${e.id}')"><div><b>${esc(epiLabel(e))}</b><small>${esc(e.size ? 'Talla ' + e.size : '')}</small></div><span class="tag ${epiState(e).cls}">${epiState(e).text}</span></button>`).join('')}</div>
      </div>
    </div>

    ${((gs, bs) => gs.length || bs.length ? `<div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('box')} Material que lleva</h3><span class="tag info">${gs.length + bs.length}</span></div>
      <p class="muted" style="margin:-4px 0 10px">No está en el almacén: al devolverlo vuelve a su sitio.</p>
      <div class="list">${bs.map(b => `<div class="item"><button class="who-row grow link-row" onclick="boxDetail('${b.id}')"><span class="box-chip" style="--c:${colorOf(b)[1]}; --ink:${colorOf(b)[2]}">${esc(b.code)}</span><div><b>${esc(b.name || 'Caja')}</b>
        <small>${esc([boxItems(b.id).length + ' equipos', 'Desde ' + fmtWhen(b.out.since)].join(' · '))}</small></div></button>
        <button class="btn btn-g btn-sm" onclick="returnBox('${b.id}')">${ic('in', 'i-sm')} Devolver</button></div>`).join('')}${gs.map(g => `<div class="item"><button class="who-row grow link-row" onclick="gearDetail('${g.id}')">${artMini(g)}<div><b>${esc(g.name)}${qtyText(g)}</b>
        <small>${esc([boxCode(g) && 'Caja ' + boxCode(g), 'Desde ' + fmtWhen(g.out.since), g.out.note].filter(Boolean).join(' · '))}</small></div></button>
        <button class="btn btn-g btn-sm" onclick="checkin('${g.id}'); closeModal()">${ic('in', 'i-sm')} Devolver</button></div>`).join('')}</div></div>` : '')(gearWith(o), boxesWith(o))}

    <div class="grid g2">
      <div class="panel">
        <h3 class="sec-title">${ic('history')} Historial</h3>
        <p>${ms.length} operaciones · ${fmtDur(hours)} en zona</p>
        ${ms.length ? `<div class="list" style="margin-top:8px">${ms.slice(0, 6).map(m => `<button class="item" onclick="openMission('${m.id}')"><div><b>${esc(m.title)}</b><small>${mtypeName(m)} · ${fmtDT(m.date)} · ${esc(missionRole(m, o.id))}</small></div>${ic('chev', 'i-sm')}</button>`).join('')}</div>` : ''}
      </div>
      <div class="panel">
        <h3 class="sec-title">${ic('shield')} Datos personales</h3>
        <dl class="dl">${f('Teléfono', esc(o.phone))}${f('Correo', esc(o.email))}${f('Nacimiento', r.birth ? fmtDate(r.birth) : '')}
          ${f('Emergencias', esc([r.emergencyName, r.emergencyPhone].filter(Boolean).join(' · ')))}
          ${f('Grupo sanguíneo', esc(md.blood))}${f('Alergias', esc(md.allergies))}</dl>
        <p class="muted">Los datos de salud los ve todo el personal del equipo; no salen por WhatsApp.</p>
      </div>
    </div>`;
}

// Datos de la persona en un solo formulario: nombre, célula, puesto, contacto y foto (y dar de baja o eliminar)
function personForm(op) {
  const o = get('operators', op), cells = [...new Set(allOperators().map(x => x.cell).filter(Boolean))];
  openForm(`Datos de ${o.name}`, [
    { k: 'name', label: 'Nombre', value: o.name, required: true, wide: true },
    { k: 'cell', label: 'Célula', value: o.cell, list: cells, required: true },
    { k: 'role', label: 'Puesto', value: o.role, required: true },
    { k: 'funcs', label: 'Otras funciones (puede tener varias)', type: 'checks', catalog: 'opFuncs', value: o.funcs || [], wide: true },
    { k: 'phone', label: 'Teléfono', type: 'tel', value: o.phone, placeholder: '600 000 000' },
    { k: 'email', label: 'Correo', type: 'email', value: o.email },
    { k: 'photo', label: 'Foto de la persona', type: 'photo', value: '', wide: true },
    // Solo ADMIN da (o quita) el permiso de logística: añadir y cambiar material, vehículos y extras como él
    ...(isAdmin() && o.name !== ADMIN ? [{ k: 'logi', label: 'Permisos', type: 'checks', wide: true, value: o.logistica ? ['logistica'] : [],
      options: [['logistica', 'Logística: añade y cambia material, vehículos y extras (en Miembros y permisos tiene que ser jefe)']] }] : [])
  ], async v => {
    if (v.name !== o.name && allOperators().some(x => x.id !== o.id && x.name === v.name)) return toast('Ya hay otra persona con ese nombre', 'bad');
    if (v.photo) await Img.put(`op:${op}`, v.photo);
    if (prefs.activeOperator === o.name) { prefs.activeOperator = v.name; writeJSON(KEY.prefs, prefs); }
    const { photo, logi, ...rest } = v, logistica = logi ? logi.includes('logistica') : !!o.logistica;
    put('operators', { ...o, ...rest, logistica, photo: photo ? true : o.photo || false },
      logistica !== !!o.logistica ? `${v.name}: ${logistica ? 'con' : 'sin'} permiso de logística` : `Datos de ${v.name} actualizados`);
  }, `<div class="row span2" style="gap:8px">
    ${o.active === false ? `<button type="button" class="btn btn-g" onclick="setActive('${o.id}', true)">${ic('check')} Volver a dar de alta</button>`
      : `<button type="button" class="btn btn-g" onclick="setActive('${o.id}', false)">${ic('out')} Dar de baja</button>`}
    <button type="button" class="btn btn-bad" onclick="deletePerson('${o.id}')">${ic('trash')} Eliminar</button></div>`);
}

/* ---------- Documentos ---------- */
function docForm(op, id) {
  const d = get('docs', id) || { op };
  openForm(id ? `Editar ${d.type}` : `Nuevo documento de ${opName(op)}`, [
    { k: 'type', label: 'Documento', value: d.type, catalog: 'docTypes', required: true, wide: true },
    { k: 'number', label: 'Número', value: d.number, placeholder: 'Ej: 12345678Z' },
    { k: 'expires', label: 'Caduca', type: 'date', value: d.expires },
    { k: 'issued', label: 'Expedido', type: 'date', value: d.issued },
    { k: 'notes', label: 'Notas', value: d.notes, placeholder: 'Ej: Categorías B y C' },
    { k: 'front', label: id ? 'Cambiar foto (cara delantera)' : 'Foto (cara delantera)', type: 'photo', value: '', wide: true, max: 1600 },
    { k: 'back', label: id ? 'Cambiar foto (cara trasera)' : 'Foto (cara trasera)', type: 'photo', value: '', wide: true, max: 1600 }
  ], async v => {
    const rec = { ...(d.id ? d : { id: uid('DOC'), op, imgs: [], created: Date.now() }), type: v.type, number: v.number, expires: v.expires, issued: v.issued, notes: v.notes };
    const imgs = [...(rec.imgs || [])];
    for (const [i, k] of [[0, 'front'], [1, 'back']]) if (v[k]) { const key = `doc:${rec.id}:${i}`; await Img.put(key, v[k]); imgs[i] = key; }
    rec.imgs = imgs.filter(Boolean);
    if (rec.type === 'Pasaporte' && (rec.number || rec.expires)) {
      const r = readiness(op);
      stamp('readiness', { ...r, id: op, passportNo: rec.number || r.passportNo, passportExp: rec.expires || r.passportExp });
    }
    put('docs', rec, `${opName(op)}: ${rec.type} ${id ? 'actualizado' : 'añadido'}`);
    toast(`${rec.type} guardado`);
  }, id ? `<button type="button" class="btn btn-bad span2" onclick="deleteDoc('${id}')">${ic('trash')} Eliminar documento</button>` : '');
}

function docDetail(id) {
  const d = get('docs', id);
  if (!d) return;
  const st = docState(d);
  openModal(`${d.type} · ${opName(d.op)}`, `
    <div class="row" style="margin-bottom:10px"><span class="tag ${st.cls}">${st.text}</span></div>
    ${(d.imgs || []).map(k => `<img class="doc-full" data-img="${k}" alt="Foto del documento" onclick="openZoom(this.src, this.alt)">`).join('') || '<p class="muted">Sin fotos.</p>'}
    <p class="muted missing-note" style="margin:6px 0">La foto aún no ha llegado a este móvil (se hizo en otro y se está sincronizando).</p>
    <dl class="dl">${d.number ? `<dt>Número</dt><dd><span class="reveal" data-n="${esc(d.number)}" onclick="this.textContent = this.dataset.n">${esc(maskNo(d.number))} · ver</span></dd>` : ''}
      ${d.issued ? `<dt>Expedido</dt><dd>${fmtDate(d.issued)}</dd>` : ''}${d.expires ? `<dt>Caduca</dt><dd>${fmtDate(d.expires)}</dd>` : ''}${d.notes ? `<dt>Notas</dt><dd>${esc(d.notes)}</dd>` : ''}</dl>
    <div class="row"><button class="btn btn-g" onclick="docForm('${d.op}', '${id}')">${ic('pencil')} Editar</button>
      ${(d.imgs || []).length ? `<button class="btn btn-g" onclick="shareDocImages('${id}')">${ic('share')} Enviar fotos</button>` : ''}</div>`);
}

async function shareDocImages(id) {
  const d = get('docs', id);
  try {
    const files = [];
    for (const k of d.imgs) { const src = await Img.get(k); if (src) files.push(new File([await (await fetch(src)).blob()], `${d.type}-${opName(d.op)}-${files.length + 1}.jpg`, { type: 'image/jpeg' })); }
    if (files.length && navigator.canShare?.({ files })) return navigator.share({ files, title: `${d.type} de ${opName(d.op)}` });
    toast('Este móvil no permite compartir imágenes desde la app', 'bad');
  } catch (e) { if (e.name !== 'AbortError') toast('No se pudieron compartir', 'bad'); }
}

function deleteDoc(id) {
  const d = get('docs', id);
  if (!confirm(`¿Eliminar ${d.type} de ${opName(d.op)} y sus fotos?`)) return;
  (d.imgs || []).forEach(k => Img.del(k).catch(() => {}));
  closeModal();
  remove('docs', id, `${opName(d.op)}: ${d.type} eliminado`);
}

/* ==================== VENCIMIENTOS DE TODO ==================== */
function expiries() {
  const out = [];
  operators().forEach(o => {
    docsOf(o.id).filter(d => d.expires).forEach(d => out.push({ date: d.expires, what: `${d.type} de ${o.name}`, kind: 'Documento', go: `openPerson('${o.id}'); docDetail('${d.id}')` }));
    const r = readiness(o.id);
    if (r.passportExp && !docsOf(o.id).some(d => /pasaporte/i.test(d.type))) out.push({ date: r.passportExp, what: `Pasaporte de ${o.name}`, kind: 'Documento', go: `openPerson('${o.id}')` });
    (r.quals || []).filter(q => q.expires).forEach(q => out.push({ date: q.expires, what: `${q.name} · ${o.name}`, kind: 'Cualificación', go: `openPerson('${o.id}')` }));
  });
  list('epis').filter(e => e.expires).forEach(e => out.push({ date: e.expires, what: `${epiLabel(e)} de ${opName(e.holder)}`, kind: 'EPI', go: `epiForm('${e.id}')` }));
  list('gear').filter(g => g.service).forEach(g => out.push({ date: g.service, what: g.name, kind: 'Mantenimiento', go: `gearDetail('${g.id}')` }));
  list('vehicles').forEach(v => (v.units || []).filter(u => u.itv).forEach(u => out.push({ date: u.itv, what: `${v.name} ${u.plate}${u.cita ? ' · cita ' + u.cita : ''}`, kind: 'ITV', go: `vehicleForm('${v.id}'); unitForm('${v.id}', '${u.id}')` })));
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

function viewVencimientos() {
  const win = prefs.vwin ?? 90;
  const all = expiries(), shown = all.filter(x => win === 0 || daysTo(x.date) <= win);
  return `
    <div class="panel"><h2>Vencimientos</h2>
      <div class="row chips">${[[30, '30 días'], [90, '3 meses'], [365, '1 año'], [0, 'Todo']].map(([d, l]) => `<button class="chip ${win === d ? 'on' : ''}" onclick="setPref({ vwin: ${d} })">${l}</button>`).join('')}</div>
    </div>
    <div class="status" style="grid-template-columns:repeat(2, 1fr)">
      <div class="kpi ${all.some(x => daysTo(x.date) < 0) ? 'bad' : 'ok'}"><div><small>Caducados</small><b>${all.filter(x => daysTo(x.date) < 0).length}</b></div></div>
      <div class="kpi ${all.some(x => daysTo(x.date) >= 0 && daysTo(x.date) <= 30) ? 'warn' : 'ok'}"><div><small>En 30 días</small><b>${all.filter(x => daysTo(x.date) >= 0 && daysTo(x.date) <= 30).length}</b></div></div>
    </div>
    <div class="panel">${shown.length ? `<div class="list">${shown.map(x => {
      const n = daysTo(x.date), cls = n < 0 ? 'bad' : n <= 30 ? 'warn' : 'neutral';
      return `<button class="item" onclick="${x.go}"><div><b>${esc(x.what).replace(/\b([A-Z]{2}-\d{4,}(?: [A-Z]{2})?)/g, '<span class="nw">$1</span>')}</b><small>${x.kind} · ${fmtDate(x.date)}</small></div>
        <span class="tag ${cls}">${n < 0 ? `Caducado hace ${-n} d` : n === 0 ? 'Hoy' : `En ${n} d`}</span></button>`; }).join('')}</div>`
      : emptyState('checkc', 'Nada vence en este plazo', 'Documentos, cualificaciones, EPI, mantenimientos e ITV al día.')}</div>`;
}
