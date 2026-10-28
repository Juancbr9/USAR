'use strict';
// USAR 242 · Inicio de sesión: cada persona elige su nombre y pone su PIN (el que le dio un jefe en Ajustes → Miembros y
// permisos). Sin correo: el móvil entra en Supabase como invitado y la base de datos comprueba el PIN (supabase.sql).
// Las cuentas con correo de antes siguen valiendo («Entrar con correo»).
// Cada vez que se abre la app (y tras LOCK_MIN minutos fuera de ella) se pide de nuevo el PIN (o la huella, si la
// activó en este móvil); al entrar se va siempre a Inicio. Para poder abrirla sin cobertura, el móvil guarda una huella
// del PIN (PBKDF2-SHA-256 con sal, en prefs.llave, no se comparte), nunca el PIN.

const PIN_ITER = 150000;
const bufB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64Buf = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function pinHash(pin, salt, iter = PIN_ITER) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return bufB64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
async function makePin(pin) { const s = crypto.getRandomValues(new Uint8Array(16)); return { s: bufB64(s), h: await pinHash(pin, s), i: PIN_ITER }; }
async function checkPin(o, pin) { return !!o?.h && (await pinHash(pin, b64Buf(o.s), o.i || PIN_ITER)) === o.h; }
const saveLlave = async (email, pass) => setPref({ llave: { email, ...(await makePin(pass)) } });

const me = () => { const o = get('operators', prefs.session); return o && o.active !== false ? o : null; };
// La sesión (prefs.session) se recuerda en el móvil, pero solo vale abierta en esta visita a la app (sessionStorage)
const LOCK_MIN = 5, UNLOCK_KEY = 'USAR_UNLOCK', HIDDEN_KEY = 'USAR_HIDDEN';
const ss = { get: k => { try { return sessionStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch {} } };
const loggedIn = () => !!me() && ss.get(UNLOCK_KEY) === '1';
function lockApp() {
  if (!loggedIn()) return;
  ss.set(UNLOCK_KEY, null); closeModal(); toggleDrawer(false); BIO_TRIED = false; render();
}
// Al volver a la app tras LOCK_MIN minutos fuera (o si el móvil la cerró entretanto), se vuelve a pedir
const hiddenTooLong = () => { const t = +ss.get(HIDDEN_KEY); return !!t && Date.now() - t > LOCK_MIN * 60000; };
if (hiddenTooLong()) ss.set(UNLOCK_KEY, null);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') return ss.set(HIDDEN_KEY, Date.now());
  const late = hiddenTooLong(); ss.set(HIDDEN_KEY, null);
  if (late) lockApp();
});

// Mantenimiento: mientras está activo solo ADMIN usa la app y el resto ve el aviso al entrar.
// Activo por defecto; ADMIN lo quita o lo vuelve a poner en Ajustes y llega a todos los móviles con los datos compartidos.
const isAdmin = () => me()?.name === ADMIN;
const enMantenimiento = () => (get('meta', 'mantenimiento')?.value ?? MANT_DEFECTO) !== false;
const bloqueado = () => enMantenimiento() && !isAdmin();
// Material, cajas, consumibles, vehículos y extras de las salidas: solo ADMIN (y a quien él dé el permiso de logística en su
// ficha) los añade, cambia o elimina. Con usuario de Supabase hace falta además que sea jefe (la base de datos solo deja
// crear o borrar material a los jefes): así ADMIN, con una segunda cuenta de miembro, ve la app como el resto.
// El resto del equipo sigue moviendo material, sacándolo, pasándolo a revisión y ajustando el stock.
const FLOTA_KINDS = ['gear', 'boxes', 'consumables', 'vehicles'];
const puedeFlota = () => (isAdmin() || !!me()?.logistica) && (!Sync.user || Sync.role === 'jefe');
const soloFlota = () => puedeFlota() || (toast(me()?.logistica ? `Tienes permiso de logística, pero en Miembros y permisos tienes que ser jefe: pídeselo a ${ADMIN}`
  : `Solo ${ADMIN} y quien tenga permiso de logística pueden añadir o cambiar material, vehículos y extras`, 'bad'), false);
// iPhone y iPad: la app de Android (APK) no sirve; la web se instala desde Safari en la pantalla de inicio y funciona igual
const IOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
// En iPhone el lector es Face ID (o Touch ID): se nombra así en los botones y avisos
const HUELLA = IOS ? 'Face ID' : 'huella';
const instalada = () => matchMedia('(display-mode: standalone)').matches || !!navigator.standalone;
function iosInstall() {
  if (!IOS || instalada()) return '';
  return `
    <div class="panel login-card ios-install">
      <h3 class="sec-title">${ic('phone')} ¿Tienes iPhone? Instálala así</h3>
      <ol>
        <li>Ábrela en <b>Safari</b>. Si vienes de WhatsApp u otra app, pulsa antes <b>«Abrir en Safari»</b>.</li>
        <li>Pulsa <b>Compartir</b> ${ic('upload', 'i-sm')} (abajo, el cuadrado con la flecha).</li>
        <li>Elige <b>«Añadir a pantalla de inicio»</b> y pulsa <b>Añadir</b>.</li>
      </ol>
      <p class="muted">Queda como una app más: a pantalla completa y funciona sin cobertura. La app de Android (APK) no se puede instalar en iPhone.</p>
    </div>`;
}

function renderMantenimiento() {
  document.body.classList.add('login-on');
  $('view').innerHTML = `
    <div class="login">
      <div class="login-brand"><img class="login-logo" src="img/logo.webp" width="240" height="240" alt="UIEM Canarias · USAR Sección 242"></div>
      <div class="panel login-card mant-card" role="status">
        <img class="mant-img" src="img/mantenimiento.webp" width="600" height="420" alt="RODRI trabajando en el ordenador">
        <h2>${ic('wrench')} En mantenimiento</h2>
        <p class="mant-msg">${esc(MANT_MSG)}</p>
        <p class="muted">Vuelve a entrar más tarde. Tus datos no se pierden.</p>
        <button class="btn btn-g full" onclick="logout()">${ic('out')} Cerrar sesión</button>
      </div>${iosInstall()}
    </div>`;
}
function setMantenimiento(on) { put('meta', { id: 'mantenimiento', value: on }, on ? 'Mantenimiento activado' : 'Mantenimiento terminado'); toast(on ? 'Solo tú tienes acceso' : 'Todo el equipo tiene acceso'); }
function mantenimientoPanel() {
  if (!isAdmin()) return '';
  const on = enMantenimiento();
  return `
    <div class="panel">
      <h3 class="sec-title">${ic('wrench')} Mantenimiento</h3>
      <p class="muted" style="margin-bottom:10px">${on ? `Activo: solo ${esc(ADMIN)} usa la app. El resto ve «${esc(MANT_MSG)}».` : 'Desactivado: todo el equipo usa la app.'}</p>
      <button class="btn ${on ? 'btn-a' : 'btn-bad'} full" onclick="setMantenimiento(${!on})">${on ? 'Dar acceso a todo el equipo' : 'Activar mantenimiento (solo yo)'}</button>
    </div>`;
}

// Pantalla de entrada (sustituye a toda la app hasta que alguien entra). Con la sesión recordada en este móvil solo se
// pide el PIN (o la huella); si no, primero el nombre y luego el PIN.
const conCuenta = () => !SUPA.url || !!Sync.user;
let LOGIN_NAMES = null;   // nombres con PIN (los da el servidor; sin conexión, los del equipo en este móvil)
function loadNames() {
  if (LOGIN_NAMES) return;
  LOGIN_NAMES = 'cargando';
  Sync.names().then(ns => { LOGIN_NAMES = ns; }).catch(e => { LOGIN_NAMES = operators().map(o => o.name); loginMsg(e.message); })
    .finally(() => { if (!loggedIn()) renderLogin(); });
}
const pinInput = (label = 'PIN') => `<label class="lbl">${label}<input class="input pin-in" name="pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="8" autocomplete="current-password" required></label>`;
function renderLogin() {
  document.body.classList.add('login-on');
  const o = conCuenta() && me(), mail = !o && prefs.loginMail, up = mail && prefs.loginUp, pick = !o && !mail && prefs.loginPick;
  if (!o && !mail && !pick) loadNames();
  const names = Array.isArray(LOGIN_NAMES) ? [...LOGIN_NAMES].sort((a, b) => a.localeCompare(b, 'es')) : null;
  $('view').innerHTML = `
    <div class="login">
      <div class="login-brand"><img class="login-logo" src="img/logo.webp" width="240" height="240" alt="UIEM Canarias · USAR Sección 242"></div>
      ${o ? `
      <form class="panel login-card" onsubmit="event.preventDefault(); doLogin(this)">
        <h2>Hola, ${esc(o.name)}</h2>
        <input name="email" value="${esc(Sync.user)}" autocomplete="username" hidden>
        ${Sync.pinName || !Sync.email ? pinInput() : '<label class="lbl">Contraseña<input class="input" name="pin" type="password" autocomplete="current-password" required></label>'}
        <button class="btn btn-a full">${ic('in')} Entrar</button>
        ${bioOf(o.id) ? `<button type="button" class="btn btn-g full bio-btn" onclick="bioLogin('${o.id}')">${ic('finger')} Entrar con ${HUELLA}</button>` : ''}
        <p id="loginMsg" class="bad-text" role="alert">${esc(LOGIN_NOTE)}</p>
        <button type="button" class="link" onclick="otraCuenta()">No soy ${esc(o.name)}</button>
      </form>` : mail ? `
      <form class="panel login-card" onsubmit="event.preventDefault(); doAccount(this)">
        <h2>${up ? 'Crear mi cuenta' : 'Entrar con correo'}</h2>
        ${up ? `<p class="muted">Usa el correo con el que ${esc(ADMIN)} te ha dado de alta en el equipo.</p>` : ''}
        <label class="lbl">Correo<input class="input" name="email" type="email" autocomplete="username" required></label>
        <label class="lbl">Contraseña<input class="input" name="pin" type="password" autocomplete="${up ? 'new-password' : 'current-password'}" minlength="6" required></label>
        ${up ? '<label class="lbl">Repite la contraseña<input class="input" name="pin2" type="password" autocomplete="new-password" minlength="6" required></label>' : ''}
        <button class="btn btn-a full">${ic('in')} ${up ? 'Crear cuenta y entrar' : 'Entrar'}</button>
        <p id="loginMsg" class="bad-text" role="alert">${esc(LOGIN_NOTE)}</p>
        <button type="button" class="link" onclick="LOGIN_NOTE = ''; setPref({ loginUp: ${!up} })">${up ? 'Ya tengo cuenta: entrar' : '¿Primera vez con correo? Crea tu cuenta'}</button>
        <button type="button" class="link" onclick="LOGIN_NOTE = ''; setPref({ loginMail: null, loginUp: null })">Entrar con mi nombre y PIN</button>
      </form>` : pick ? `
      <form class="panel login-card" onsubmit="event.preventDefault(); doPin(this)">
        <h2>Hola, ${esc(pick)}</h2>
        ${pinInput()}
        <button class="btn btn-a full">${ic('in')} Entrar</button>
        <p id="loginMsg" class="bad-text" role="alert">${esc(LOGIN_NOTE)}</p>
        <button type="button" class="link" onclick="LOGIN_NOTE = ''; setPref({ loginPick: null })">No soy ${esc(pick)}</button>
      </form>` : `
      <div class="panel login-card">
        <h2>¿Quién eres?</h2>
        ${names ? (names.length ? `<div class="name-grid">${names.map(n => `<button type="button" class="btn btn-g" onclick="LOGIN_NOTE = ''; setPref({ loginPick: ${jsq(n)} }); document.querySelector('.login [name=pin]')?.focus()">${esc(n)}</button>`).join('')}</div>`
          : `<p class="muted">Aún no hay nadie con PIN. ${esc(ADMIN)} los pone en Ajustes → Miembros y permisos.</p>`) : '<p class="muted">Cargando…</p>'}
        <p id="loginMsg" class="bad-text" role="alert">${esc(LOGIN_NOTE)}</p>
        <button type="button" class="link login-admin" onclick="LOGIN_NOTE = ''; setPref({ loginMail: true })">Entrar con correo (administración)</button>
      </div>`}${iosInstall()}
    </div>`;
  // Con la huella activada, se pide nada más abrir la app (una vez; luego queda el botón)
  if (o && bioOf(o.id) && !BIO_TRIED) { BIO_TRIED = true; bioLogin(o.id); }
}
// El aviso se guarda para que no se pierda si la pantalla se vuelve a pintar (p. ej. al llegar los datos del equipo)
let LOGIN_NOTE = '';
const loginMsg = t => { LOGIN_NOTE = t; const el = $('loginMsg'); if (el) el.textContent = t; };
const opByName = n => operators().find(x => x.name.toUpperCase() === String(n || '').toUpperCase());

// Nombre y PIN: el servidor lo comprueba y este móvil queda con ese nombre y su permiso
async function doPin(form) {
  const name = prefs.loginPick, pin = form.pin.value, btn = form.querySelector('.btn-a');
  if (!/^[0-9]{4,8}$/.test(pin)) return loginMsg('El PIN son de 4 a 8 cifras.');
  if (!navigator.onLine) return loginMsg('La primera vez en este móvil hace falta conexión a internet.');
  btn.disabled = true; loginMsg('');
  try {
    await Sync.pinSignIn(name, pin);
    const o = opByName(name);
    if (!o) { Sync.signOut(); return loginMsg(`${name} no está en el personal del equipo de este móvil.`); }
    await saveLlave(Sync.user, pin);
    prefs.loginPick = null;
    if (!enter(o)) bioOffer(o);
  } catch (e) { form.pin.value = ''; loginMsg(e.message); }
  finally { btn.disabled = false; }
}

// Correo y contraseña (cuentas de antes): entra (o crea la cuenta) en Supabase y se le asocia su nombre del equipo
async function doAccount(form) {
  const email = form.email.value.trim().toLowerCase(), pass = form.pin.value, btn = form.querySelector('.btn-a');
  if (form.pin2 && pass !== form.pin2.value) return loginMsg('Las dos contraseñas no coinciden.');
  if (!navigator.onLine) return loginMsg('La primera vez hace falta conexión a internet.');
  btn.disabled = true; loginMsg('');
  try {
    if (form.pin2 && (await Sync.signUp(email, pass)) === 'confirm') {
      setPref({ loginUp: false });
      return toast('Te hemos enviado un correo: ábrelo, confirma la cuenta y vuelve aquí para entrar');
    }
    await Sync.signIn(email, pass);
    const o = opByName(Sync.name);
    if (!o) { Sync.signOut(); return loginMsg(`Tu correo está dado de alta, pero sin nombre del equipo: pide a ${ADMIN} que te lo ponga en Miembros y permisos.`); }
    await saveLlave(email, pass);
    prefs.loginUp = null; prefs.loginMail = null;
    if (!enter(o)) bioOffer(o);
  } catch (e) { loginMsg(e.message); }
  finally { btn.disabled = false; }
}

// Sesión recordada: el PIN (o la contraseña) se comprueba en el móvil (vale sin cobertura). Si no coincide (p. ej. lo
// cambió en otro móvil) o este móvil aún no lo conoce, se comprueba con el servidor.
let LOGIN_FAILS = 0, LOGIN_WAIT = 0;
async function doLogin(form) {
  const o = me(); if (!o) return;
  const pin = form.pin.value;
  if (Date.now() < LOGIN_WAIT) return loginMsg(`Demasiados intentos. Espera ${Math.ceil((LOGIN_WAIT - Date.now()) / 1000)} s.`);
  const llave = prefs.llave?.email === Sync.user ? prefs.llave : null;
  let ok = await checkPin(llave, pin), why = '';
  if (!ok && SUPA.url && navigator.onLine) {
    try { Sync.pinName ? await Sync.pinSignIn(Sync.pinName, pin) : await Sync.verify(Sync.email, pin); await saveLlave(Sync.user, pin); ok = true; }
    catch (e) { why = Sync.pinName ? e.message : ''; }
  }
  if (!ok) {
    LOGIN_FAILS++; if (LOGIN_FAILS >= 5) { LOGIN_WAIT = Date.now() + 30000; LOGIN_FAILS = 0; }
    form.pin.value = '';
    return loginMsg(why || (llave || navigator.onLine ? (Sync.pinName ? 'PIN incorrecto.' : 'Contraseña incorrecta.') : 'Sin conexión: este móvil aún no puede comprobar tu PIN.'));
  }
  LOGIN_FAILS = 0;
  if (!enter(o)) bioOffer(o);
}
function otraCuenta() { LOGIN_NOTE = ''; LOGIN_NAMES = null; Sync.signOut(); setPref({ session: null, llave: null, loginPick: null, loginMail: null }); }
// Entrar: siempre a Inicio (salvo un enlace QR abierto antes de entrar, que se abre encima)
function enter(o) {
  document.body.classList.remove('login-on');
  const after = prefs.afterLogin; LOGIN_NOTE = '';
  ss.set(UNLOCK_KEY, '1'); ss.set(HIDDEN_KEY, null);
  setPref({ session: o.id, activeOperator: o.name, loginUp: null, loginMail: null, loginPick: null, afterLogin: null, tab: 'avisos', menuOpen: null, mission: null, ws: null, person: null });
  scrollTo(0, 0); toast(`Hola, ${o.name}`);
  if (after) { location.hash = after; }
  return after;
}
function logout() {
  if (!confirm('¿Cerrar la sesión en este móvil?')) return;
  ss.set(UNLOCK_KEY, null); closeModal(); otraCuenta();
}

/* ==================== HUELLA (WebAuthn con el lector del propio móvil) ==================== */
// Cada móvil guarda en sus preferencias (prefs.bio, no se comparte) la llave pública de la huella de quien la activó.
// Al entrar, el móvil comprueba la huella y firma un reto al azar; la app verifica esa firma con la llave guardada.
let BIO_TRIED = false;
const bioOf = id => window.PublicKeyCredential && prefs.bio?.[id];
const b64u = buf => bufB64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function bioAvailable() {
  try { return !!window.PublicKeyCredential && await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; }
}
async function bioRegister(o = me()) {
  try {
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'USAR 242' },
      user: { id: new TextEncoder().encode(o.id), name: o.name, displayName: o.name },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
      timeout: 60000, attestation: 'none' } });
    const r = cred.response, pk = r.getPublicKey?.();
    setPref({ bio: { ...prefs.bio, [o.id]: { id: bufB64(cred.rawId), pk: pk ? bufB64(pk) : null, alg: r.getPublicKeyAlgorithm?.() ?? -7 } } });
    closeModal(); toast(IOS ? 'Face ID activado: la próxima vez entra con él' : 'Huella activada: la próxima vez entra con ella');
  } catch (e) { toast(e?.name === 'NotAllowedError' ? `No se activó ${IOS ? '' : 'la '}${HUELLA}` : `Este móvil no permite entrar con ${HUELLA}`, 'bad'); }
}
function bioRemove(id = me().id) {
  const bio = { ...prefs.bio }; delete bio[id]; setPref({ bio }); toast(IOS ? 'Face ID quitado en este móvil' : 'Huella quitada en este móvil');
}
// Firma ECDSA en DER (la que da WebAuthn) → r‖s de 32 bytes cada uno (la que entiende WebCrypto)
function derToRaw(der) {
  const int = at => { const len = der[at + 1]; let v = der.slice(at + 2, at + 2 + len); while (v.length > 32 && v[0] === 0) v = v.slice(1); const out = new Uint8Array(32); out.set(v, 32 - v.length); return [out, at + 2 + len]; };
  const [r, next] = int(2), [s] = int(next);
  const raw = new Uint8Array(64); raw.set(r); raw.set(s, 32); return raw;
}
async function bioVerify(b, challenge, r) {
  const client = JSON.parse(new TextDecoder().decode(r.clientDataJSON));
  const auth = new Uint8Array(r.authenticatorData);
  if (client.type !== 'webauthn.get' || client.challenge !== b64u(challenge) || client.origin !== location.origin) return false;
  if ((auth[32] & 0x05) !== 0x05) return false;   // la persona estaba y se comprobó su huella
  if (!b.pk) return true;   // navegadores antiguos no dan la llave al activarla: basta con que el móvil comprobase la huella
  const data = new Uint8Array([...auth, ...new Uint8Array(await crypto.subtle.digest('SHA-256', r.clientDataJSON))]);
  const rsa = b.alg === -257, algo = rsa ? { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } : { name: 'ECDSA', namedCurve: 'P-256' };
  const key = await crypto.subtle.importKey('spki', b64Buf(b.pk), algo, false, ['verify']);
  const sig = new Uint8Array(r.signature);
  return crypto.subtle.verify(rsa ? algo : { name: 'ECDSA', hash: 'SHA-256' }, key, rsa ? sig : derToRaw(sig), data);
}
async function bioLogin(id) {
  const o = get('operators', id), b = bioOf(id); if (!o || !b) return;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  try {
    const cred = await navigator.credentials.get({ publicKey: { challenge, timeout: 60000, userVerification: 'required',
      allowCredentials: [{ type: 'public-key', id: b64Buf(b.id), transports: ['internal'] }] } });
    if (!(await bioVerify(b, challenge, cred.response))) return loginMsg(`${IOS ? 'Face ID no es válido' : 'La huella no es válida'}. Entra con la contraseña.`);
    enter(o);
  } catch (e) { if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') loginMsg(`No se pudo usar ${IOS ? '' : 'la '}${HUELLA}. Entra con la contraseña.`); }
}
// Tras entrar con contraseña, se ofrece una vez activar la huella en este móvil
async function bioOffer(o) {
  if (prefs.bio?.[o.id] || prefs.bioAsked?.[o.id] || !(await bioAvailable())) return;
  setPref({ bioAsked: { ...prefs.bioAsked, [o.id]: true } });
  openModal(`Entrar con ${HUELLA}`, `
    <p>¿Quieres entrar con ${IOS ? 'Face ID' : 'tu huella (o la cara)'} en este móvil? La contraseña seguirá valiendo.</p>
    <div class="row" style="margin-top:14px"><button class="btn btn-a" onclick="bioRegister()">${ic('finger')} Activar ${HUELLA}</button>
      <button class="btn btn-g" onclick="closeModal()">Ahora no</button></div>`);
}
function bioPanel() {
  if (!window.PublicKeyCredential) return '';
  const on = !!prefs.bio?.[me().id];
  return `<button class="btn btn-g" onclick="${on ? 'bioRemove()' : 'bioRegister()'}">${ic('finger')} ${on ? 'Quitar' : 'Activar'} ${HUELLA}</button>`;
}

// Cambiar el PIN (o la contraseña) propio (Ajustes): se cambia en el servidor, para entrar con él en cualquier móvil
function pinForm() {
  if (Sync.pinName || !Sync.email) return openForm('Cambiar mi PIN', [
    { k: 'old', label: 'PIN actual', type: 'password', required: true, wide: true },
    { k: 'pin', label: 'PIN nuevo (4 a 8 cifras)', type: 'password', required: true },
    { k: 'pin2', label: 'Repite el nuevo', type: 'password', required: true }
  ], async v => {
    if (!/^[0-9]{4,8}$/.test(v.pin)) return toast('El PIN son de 4 a 8 cifras', 'bad');
    if (v.pin !== v.pin2) return toast('Los dos PIN nuevos no coinciden', 'bad');
    try { await Sync.changePin(v.old, v.pin); await saveLlave(Sync.user, v.pin); toast('PIN cambiado'); }
    catch (e) { toast(navigator.onLine ? e.message : 'Hace falta conexión para cambiar el PIN', 'bad'); }
  });
  openForm('Cambiar mi contraseña', [
    { k: 'old', label: 'Contraseña actual', type: 'password', required: true, wide: true },
    { k: 'pin', label: 'Contraseña nueva', type: 'password', required: true },
    { k: 'pin2', label: 'Repite la nueva', type: 'password', required: true }
  ], async v => {
    if (v.pin.length < 6) return toast('Mínimo 6 caracteres', 'bad');
    if (v.pin !== v.pin2) return toast('Las dos contraseñas nuevas no coinciden', 'bad');
    try {
      await Sync.verify(Sync.email, v.old).catch(() => { throw new Error('La contraseña actual no es correcta'); });
      await Sync.setPassword(v.pin);
      await saveLlave(Sync.email, v.pin);
      toast('Contraseña cambiada');
    } catch (e) { toast(navigator.onLine ? e.message : 'Hace falta conexión para cambiar la contraseña', 'bad'); }
  });
}
