'use strict';
// SIER 242 · Herramientas del móvil: dictado por voz, tarjetas QR del personal, escáner de códigos y avisos del sistema

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

/* ==================== TARJETAS QR DEL PERSONAL Y ESCÁNER ==================== */
const personCode = id => 'USAR242-P:' + id;
function printPersonCards(ids) {
  const ops = (ids || operators().map(o => o.id)).map(id => get('operators', id)).filter(Boolean);
  $('print').innerHTML = `<div class="cards">${ops.map(o => `
    <div class="pcard"><div class="pcard-top"><b>${UNIDAD}</b><span>${esc(teamCode())}</span></div>
      <div class="pcard-body">${QR.svg(personCode(o.id), 2)}<div><b class="pcard-name">${esc(o.name)}</b><span>${esc(readiness(o.id).fullName || '')}</span><span>${esc(o.role || '')}</span></div></div></div>`).join('')}</div>`;
  print();
}

let scanStream = null, scanTimer = null;
// Escáner de códigos QR con la cámara. Sin más, lee tarjetas del personal (abre su ficha) y etiquetas de material;
// opts cambia el título, el texto y qué se hace con cada lectura (la revista, por ejemplo)
async function openScanner(mid, opts = {}) {
  openModal(opts.title || 'Escanear', `
    <div class="scan-box"><video id="scanVideo" playsinline muted></video><div class="scan-frame"></div></div>
    <div id="scanResult" class="scan-result">${esc(opts.hint || 'Apunta a la tarjeta QR de la persona')}</div>
    ${opts.note ? `<p class="muted" style="margin-top:8px">${esc(opts.note)}</p>` : ''}
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
  closeModal(); openPerson(op.id);
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
  try { (await navigator.serviceWorker?.ready)?.showNotification(UNIDAD, { body: msg, icon: 'icon-any-192.png', badge: 'icon-mono-512.png', tag: msg.slice(0, 40), vibrate: [200, 100, 200] }); }
  catch { try { new Notification(UNIDAD, { body: msg }); } catch {} }
}
