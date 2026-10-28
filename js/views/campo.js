'use strict';
// USAR 242 · Herramientas de campo: botón «+» de la operación en curso, dictado por voz, fotos por worksite con hora y GPS,
// tarjetas QR del personal con escáner para fichar en la puerta, y avisos del sistema cuando la app está en segundo plano.

/* ==================== BOTÓN «+» DE LA OPERACIÓN EN CURSO ==================== */
const activeMission = () => (prefs.mission && mget(prefs.mission)?.status === 'active' ? mget(prefs.mission) : list('missions').find(m => m.status === 'active')) || null;

function renderFab() {
  let fab = $('fab');
  const m = activeMission();
  if (!m) { fab?.remove(); return; }
  if (!fab) {
    fab = Object.assign(document.createElement('button'), { id: 'fab', className: 'fab' });
    fab.setAttribute('aria-label', 'Acciones rápidas de la operación en curso');
    document.body.appendChild(fab);
  }
  fab.innerHTML = ic('plus', 'i-lg');
  fab.onclick = () => quickActions(m.id);
}

function quickActions(mid) {
  const m = mget(mid);
  haptic(12);
  const a = (icon, label, action, cls = '') => `<button class="qa ${cls}" onclick="closeModal(); ${action}">${ic(icon, 'i-lg')}<span>${label}</span></button>`;
  openModal(m.title, `
    <div class="qa-grid">
      ${a('mic', 'Nota de voz', `quickNote('${mid}')`)}
      ${a('scan', 'Fichar (QR)', `openScanner('${mid}')`)}
      ${a('users', 'Recuento', `openRollCall('${mid}')`)}
      ${a('megaphone', 'Señales', `openSignals('${mid}')`, 'bad')}
      ${a('heart', 'Víctima', `openMission('${mid}', 'victimas'); victimForm('${mid}')`)}
      ${a('building', 'Worksite', `openMission('${mid}', 'worksites'); worksiteForm('${mid}')`)}
      ${a('camera', 'Foto', `quickPhoto('${mid}')`)}
      ${m.scope === 'bic' ? a('landmark', 'Bien cultural', `openMission('${mid}', 'patrimonio'); heritageForm('${mid}')`) : a('route', 'Salida de la base', `outingForm('${mid}')`)}
    </div>
    <button class="btn btn-g full" style="margin-top:12px" onclick="closeModal(); openMission('${mid}')">Abrir la operación</button>`);
}

function quickNote(mid) {
  openModal('Nota del diario', `
    <form id="noteForm" class="stack">
      <div class="dictate-wrap"><textarea class="input" name="t" rows="4" placeholder="Habla o escribe…" required></textarea>${micButton()}</div>
      <button class="btn btn-a full">${ic('check')} Guardar en el diario</button>
    </form>`);
  const f = $('noteForm');
  f.onsubmit = e => { e.preventDefault(); addEntry(mid, null, f.t.value); closeModal(); toast('Anotado en el diario'); };
  if (speechOk()) dictate(f.querySelector('.mic'));
  else f.t.focus();
}

/* ==================== DICTADO POR VOZ ==================== */
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechOk = () => !!SpeechRec;
const micButton = () => speechOk() ? `<button type="button" class="mic" aria-label="Dictar" onclick="dictate(this)">${ic('mic')}</button>` : '';
let recognizer = null;
// Dictado: cada frase es una sesión corta del reconocedor (así Android no repite las palabras, que en modo continuo
// devuelve el texto acumulado una y otra vez); al terminar una frase se vuelve a escuchar hasta que se pulsa otra vez el micro.
let dictStop = false;
function dictate(btn) {
  const field = btn.parentElement.querySelector('textarea, input');
  if (recognizer) { dictStop = true; recognizer.stop(); return; }
  if (!SpeechRec) return toast('Este navegador no permite dictar', 'bad');
  dictStop = false; btn.classList.add('on'); haptic(15);
  const listen = () => {
    let base = field.value ? field.value.replace(/\s*$/, ' ') : '';
    try {
      recognizer = new SpeechRec();
      recognizer.lang = 'es-ES'; recognizer.interimResults = true; recognizer.continuous = false; recognizer.maxAlternatives = 1;
      recognizer.onresult = e => {
        // solo el mejor texto de la frase en curso (sin sumar resultados repetidos)
        let text = '';
        for (const r of e.results) { const t = r[0].transcript.trim(); if (!t) continue; text = !text || t.toLowerCase().startsWith(text.toLowerCase()) ? t : text.toLowerCase().endsWith(t.toLowerCase()) ? text : text + ' ' + t; }
        field.value = (base + dedupeWords(text)).replace(/^\s+/, '');
        field.dispatchEvent(new Event('input', { bubbles: true }));
      };
      recognizer.onend = () => { recognizer = null; if (dictStop || !document.body.contains(field)) { btn.classList.remove('on'); return; } listen(); };
      recognizer.onerror = e => {
        if (['no-speech', 'aborted'].includes(e.error)) return;
        dictStop = true; toast(e.error === 'not-allowed' ? 'Permite el micrófono para dictar' : 'No se pudo dictar (¿sin conexión?)', 'bad');
      };
      recognizer.start();
    } catch { recognizer = null; btn.classList.remove('on'); toast('Este navegador no permite dictar', 'bad'); }
  };
  listen();
}
// Quita repeticiones seguidas de la misma palabra o del mismo grupo de palabras («hola hola qué tal qué tal» → «hola qué tal»)
function dedupeWords(t) {
  let w = t.split(/\s+/).filter(Boolean);
  for (let n = Math.floor(w.length / 2); n >= 1; n--)
    for (let i = 0; i + 2 * n <= w.length; i++)
      if (w.slice(i, i + n).join(' ').toLowerCase() === w.slice(i + n, i + 2 * n).join(' ').toLowerCase()) { w.splice(i + n, n); i--; }
  return w.join(' ');
}

/* ==================== FOTOS CON HORA Y GPS POR WORKSITE ==================== */
function quickPhoto(mid) {
  const ws = worksitesOf(mid);
  const cur = prefs.ws && get('worksites', prefs.ws)?.mission === mid ? prefs.ws : ws.find(w => w.status === 'active')?.id || ws[0]?.id;
  if (!ws.length) return takePhoto(mid, null);
  openForm('Foto', [{ k: 'ws', label: '¿De qué worksite?', value: cur, options: [['', 'General de la operación'], ...ws.map(w => [w.id, w.code + (w.address ? ' · ' + w.address : '')])], wide: true }],
    v => takePhoto(mid, v.ws || null));
}

function takePhoto(mid, wsId) {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
  input.setAttribute('capture', 'environment');
  input.onchange = () => input.files[0] && savePhoto(mid, wsId, input.files[0]);
  input.click();
}

const getPos = () => new Promise(res => {
  if (!navigator.geolocation) return res(null);
  navigator.geolocation.getCurrentPosition(p => res([+p.coords.latitude.toFixed(5), +p.coords.longitude.toFixed(5)]), () => res(null), { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 });
});
async function savePhoto(mid, wsId, file, note = '') {
  try {
    const [data, pos] = await Promise.all([compressImage(file, 1400), getPos()]);
    const key = `ph:${mid}:${Date.now()}`;
    await Img.put(key, data);
    const rec = { key, ts: Date.now(), by: prefs.activeOperator, lat: pos?.[0] ?? null, lon: pos?.[1] ?? null, note };
    if (wsId) { const w = get('worksites', wsId); put('worksites', { ...w, photos: [...(w.photos || []), rec] }); }
    else { const m = mget(mid); saveMission(m, { photos: [...(m.photos || []), rec] }); }
    addEntry(mid, null, `Foto${wsId ? ' de ' + get('worksites', wsId).code : ''}${pos ? ` (GPS ${pos[0]}, ${pos[1]})` : ''}`);
    toast('Foto guardada');
  } catch { toast('No se pudo guardar la foto', 'bad'); }
}

function photosPanel(owner, photos, addAction) {
  return `
    <div class="panel">
      <div class="between sec-head"><div><h3 class="sec-title" style="margin:0">${ic('camera')} Fotos (${photos.length})</h3>
        </div>
        <button class="btn btn-a btn-sm" onclick="${addAction}">${ic('camera')} Foto</button></div>
      ${photos.length ? `<div class="gallery">${[...photos].reverse().map((p, i) => `
        <button class="gal" onclick="photoView('${owner}', '${p.key}')"><img data-img="${p.key}" alt=""><small>${fmtHour(p.ts)} · ${esc(p.by)}</small></button>`).join('')}</div>`
        : ''}
    </div>`;
}
function photoView(owner, key) {
  const [kind, id] = owner.split(':');
  const rec = kind === 'ws' ? get('worksites', id) : mget(id);
  const p = (rec.photos || []).find(x => x.key === key);
  openModal(`Foto · ${fmtWhen(p.ts)}`, `
    <img class="doc-full" data-img="${key}" alt="">
    <dl class="dl"><dt>Autor</dt><dd>${esc(p.by)}</dd>${p.lat ? `<dt>GPS</dt><dd><a class="ext" target="_blank" rel="noopener" href="${mapsUrl(p.lat + ',' + p.lon)}">${esc(fmtCoord(p.lat, p.lon))} ↗</a></dd>` : ''}${p.note ? `<dt>Nota</dt><dd>${esc(p.note)}</dd>` : ''}</dl>
    <div class="row"><button class="btn btn-g" onclick="sharePhoto('${key}')">${ic('share')} Enviar</button>
      <button class="btn btn-bad" onclick="deletePhoto('${owner}', '${key}')">${ic('trash')} Borrar</button></div>`);
}
async function sharePhoto(key) {
  try {
    const src = await Img.get(key);
    const file = new File([await (await fetch(src)).blob()], key.replace(/:/g, '-') + '.jpg', { type: 'image/jpeg' });
    if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file] });
    toast('Este móvil no permite compartir la foto desde la app', 'bad');
  } catch (e) { if (e.name !== 'AbortError') toast('No se pudo compartir', 'bad'); }
}
function deletePhoto(owner, key) {
  if (!confirm('¿Borrar esta foto?')) return;
  const [kind, id] = owner.split(':');
  Img.del(key).catch(() => {});
  if (kind === 'ws') { const w = get('worksites', id); put('worksites', { ...w, photos: w.photos.filter(p => p.key !== key) }); }
  else { const m = mget(id); saveMission(m, { photos: m.photos.filter(p => p.key !== key) }); }
  closeModal();
}

/* ==================== TARJETAS QR DEL PERSONAL Y ESCÁNER ==================== */
const personCode = id => 'USAR242-P:' + id;
function printPersonCards(ids) {
  const ops = (ids || operators().map(o => o.id)).map(id => get('operators', id)).filter(Boolean);
  $('print').innerHTML = `<div class="cards">${ops.map(o => `
    <div class="pcard"><div class="pcard-top"><b>USAR 242</b><span>${esc(teamCode())}</span></div>
      <div class="pcard-body">${QR.svg(personCode(o.id), 2)}<div><b class="pcard-name">${esc(o.name)}</b><span>${esc(readiness(o.id).fullName || '')}</span><span>${esc(o.role || '')}</span></div></div></div>`).join('')}</div>`;
  print();
}

let scanStream = null, scanTimer = null;
// Escáner de códigos QR con la cámara. Sin más, lee tarjetas del personal (y en una operación, ficha) y etiquetas de material;
// opts cambia el título, el texto y qué se hace con cada lectura (la revista, por ejemplo)
async function openScanner(mid, opts = {}) {
  const m = mid && mget(mid);
  openModal(opts.title || (m ? 'Fichar con la tarjeta' : 'Escanear tarjeta'), `
    <div class="scan-box"><video id="scanVideo" playsinline muted></video><div class="scan-frame"></div></div>
    <div id="scanResult" class="scan-result">${esc(opts.hint || 'Apunta a la tarjeta QR de la persona')}</div>
    ${opts.note ? `<p class="muted" style="margin-top:8px">${esc(opts.note)}</p>` : m ? `<p class="muted" style="margin-top:8px">Cada lectura cambia su estado: si estaba fuera, entra; si estaba dentro, sale. Puedes escanear a varios seguidos.</p>` : ''}
    <button class="btn btn-g full" style="margin-top:10px" onclick="closeModal()">Terminar</button>`);
  const stop = () => { clearInterval(scanTimer); scanStream?.getTracks().forEach(t => t.stop()); scanStream = null; };
  const modal = $('modal'), obs = new MutationObserver(() => { if (modal.classList.contains('hidden') || !$('scanVideo')) { stop(); obs.disconnect(); } });
  obs.observe(modal, { attributes: true, childList: true, subtree: true });
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
  } catch { if ($('scanResult')) $('scanResult').textContent = 'No hay acceso a la cámara. Permítelo en el navegador.'; return; }
  const video = $('scanVideo');
  if (!video) return stop();   // se cerró mientras se abría la cámara
  video.srcObject = scanStream; await video.play().catch(() => {});
  const detector = 'BarcodeDetector' in window ? new BarcodeDetector({ formats: ['qr_code'] }) : null;
  if (!detector && !window.jsQR) await loadScript('vendor/jsQR.js').catch(() => {});
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { willReadFrequently: true });
  const seen = {};
  scanTimer = setInterval(async () => {
    if (video.readyState < 2) return;
    let text = null;
    try {
      if (detector) text = (await detector.detect(video))[0]?.rawValue;
      else if (window.jsQR) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight; ctx.drawImage(video, 0, 0);
        text = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data;
      }
    } catch {}
    if (!text) return;
    if (seen[text] && Date.now() - seen[text] < 4000) return;
    seen[text] = Date.now();
    (opts.onText || (t => handleScan(mid, t)))(text);
  }, 300);
}
function loadScript(src) {
  return new Promise((res, rej) => { const s = Object.assign(document.createElement('script'), { src, onload: res, onerror: rej }); document.head.appendChild(s); });
}
// Procesa el texto leído: tarjeta de persona o QR de material
function handleScan(mid, text) {
  const out = $('scanResult');
  const op = text.startsWith('USAR242-P:') ? get('operators', text.slice(10)) : null;
  if (!op) {
    const g = text.match(/#g=([^&]+)/), k = text.match(/#k=([^&]+)/);
    if (g && get('gear', decodeURIComponent(g[1]))) { closeModal(); gearDetail(decodeURIComponent(g[1])); return; }
    if (k && get('boxes', decodeURIComponent(k[1]))) { closeModal(); boxDetail(decodeURIComponent(k[1])); return; }
    if (out) out.innerHTML = '<span class="tag bad">No es una tarjeta del equipo</span>';
    return;
  }
  const m = mid && mget(mid);
  if (!m || m.status !== 'active') { closeModal(); openPerson(op.id); return; }
  const st = presence(m).find(p => p.op === op.id);
  if (!st) {   // no estaba en la operación: se añade como personal suelto
    saveMission(m, { extra: [...new Set([...(m.extra || []), op.id])] }, `${op.name} se incorpora`);
  }
  const type = st?.state === 'in' ? 'out' : 'in';
  punch(mid, [op.id], type);
  try { playSignal([[type === 'in' ? 150 : 90, 80], [type === 'in' ? 0 : 90, 0]].filter(x => x[0])); } catch {}
  if (out) out.innerHTML = `<div class="scan-ok ${type}"><b>${esc(op.name)}</b><span>${type === 'in' ? 'ENTRA en zona' : 'SALE de zona'} · ${fmtHour(Date.now())}</span></div>`;
}

/* ==================== AVISOS DEL SISTEMA ==================== */
async function enableNotifications() {
  if (!('Notification' in window)) return toast('Este navegador no permite avisos', 'bad');
  const p = await Notification.requestPermission();
  toast(p === 'granted' ? 'Avisos activados' : 'Avisos no permitidos', p === 'granted' ? 'ok' : 'bad');
  render();
}
// Si la app está en segundo plano, el aviso sale también como notificación del sistema
async function systemNotify(msg) {
  if (document.visibilityState === 'visible' || !('Notification' in window) || Notification.permission !== 'granted') return;
  try { (await navigator.serviceWorker?.ready)?.showNotification('USAR 242', { body: msg, icon: 'icon-any-192.png', badge: 'icon-mono-512.png', tag: msg.slice(0, 40), vibrate: [200, 100, 200] }); }
  catch { try { new Notification('USAR 242', { body: msg }); } catch {} }
}
