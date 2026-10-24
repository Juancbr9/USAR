'use strict';
// USAR 242 · Inicio de sesión: cada persona entra con su nombre y su contraseña, o con su huella si la activó en este móvil.
// La contraseña se crea la primera vez que alguien entra (si no tiene una ya asignada).
// Cada vez que se abre la app (y tras LOCK_MIN minutos fuera de ella) se pide de nuevo; al entrar se va siempre a Inicio.
// Solo se guarda una huella (PBKDF2-SHA-256 con sal), nunca la contraseña. De momento todos pueden hacer de todo.

const PIN_ITER = 150000;
const bufB64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const b64Buf = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function pinHash(pin, salt, iter = PIN_ITER) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return bufB64(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
async function makePin(pin) { const s = crypto.getRandomValues(new Uint8Array(16)); return { s: bufB64(s), h: await pinHash(pin, s), i: PIN_ITER }; }
async function checkPin(o, pin) { return !!o.pin?.h && (await pinHash(pin, b64Buf(o.pin.s), o.pin.i || PIN_ITER)) === o.pin.h; }

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
// Material, cajas, consumibles, vehículos y extras de las salidas: solo ADMIN los añade, cambia o elimina. Con usuario de
// Supabase hace falta además que sea jefe: así ADMIN, con una segunda cuenta de miembro, ve la app como el resto.
// El resto del equipo sigue moviendo material, sacándolo, pasándolo a revisión y ajustando el stock.
const FLOTA_KINDS = ['gear', 'boxes', 'consumables', 'vehicles'];
const puedeFlota = () => isAdmin() && (!Sync.email || Sync.role === 'jefe');
const soloFlota = () => puedeFlota() || (toast(`Solo ${ADMIN} puede añadir o cambiar material, vehículos y extras`, 'bad'), false);
function renderMantenimiento() {
  document.body.classList.add('login-on');
  $('view').innerHTML = `
    <div class="login">
      <div class="login-brand"><span class="wordmark">USAR <span class="plate">242</span></span></div>
      <div class="panel login-card mant-card" role="status">
        <img class="mant-img" src="img/mantenimiento.webp" width="300" height="210" alt="RODRI trabajando en el ordenador">
        <h2>${ic('wrench')} En mantenimiento</h2>
        <p class="mant-msg">${esc(MANT_MSG)}</p>
        <p class="muted">Vuelve a entrar más tarde. Tus datos no se pierden.</p>
        <button class="btn btn-g full" onclick="logout()">${ic('out')} Cerrar sesión</button>
      </div>
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

// Pantalla de entrada (sustituye a toda la app hasta que alguien entra)
function renderLogin() {
  document.body.classList.add('login-on');
  const ops = operators().sort((a, b) => a.name.localeCompare(b.name, 'es'));
  const pick = prefs.loginPick || prefs.session, sel = pick && get('operators', pick) ? pick : '';
  const o = sel && get('operators', sel), first = o && !o.pin?.h;
  $('view').innerHTML = `
    <div class="login">
      <div class="login-brand"><span class="wordmark">USAR <span class="plate">242</span></span></div>
      <form class="panel login-card" onsubmit="event.preventDefault(); doLogin(this)">
        <h2>Entrar</h2>
        <label class="lbl">Nombre
          <select class="input" name="op" required onchange="prefs.loginPick = this.value; renderLogin(); document.querySelector('.login [name=pin]')?.focus()">
            <option value="">Elige tu nombre</option>${ops.map(x => `<option value="${x.id}" ${x.id === sel ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
          </select></label>
        ${o ? `
          ${first ? '<p class="muted">Es tu primera vez: crea tu contraseña (escríbela dos veces).</p>' : ''}
          <label class="lbl">Contraseña<input class="input" name="pin" type="password" inputmode="numeric" autocomplete="${first ? 'new-password' : 'current-password'}" minlength="4" maxlength="20" required></label>
          ${first ? '<label class="lbl">Repite la contraseña<input class="input" name="pin2" type="password" inputmode="numeric" autocomplete="new-password" minlength="4" maxlength="20" required></label>' : ''}
          <button class="btn btn-a full">${ic('in')} ${first ? 'Crear y entrar' : 'Entrar'}</button>
          ${!first && bioOf(o.id) ? `<button type="button" class="btn btn-g full bio-btn" onclick="bioLogin('${o.id}')">${ic('finger')} Entrar con huella</button>` : ''}
          <p id="loginMsg" class="bad-text" role="alert"></p>` : ''}
      </form>
    </div>`;
  // Con la huella activada, se pide nada más abrir la app (una vez; luego queda el botón)
  if (o && !first && bioOf(o.id) && !BIO_TRIED) { BIO_TRIED = true; bioLogin(o.id); }
}

let LOGIN_FAILS = 0, LOGIN_WAIT = 0;
async function doLogin(form) {
  const msg = t => { const el = $('loginMsg'); if (el) el.textContent = t; };
  const o = get('operators', form.op.value); if (!o) return;
  const pin = form.pin.value.trim();
  if (Date.now() < LOGIN_WAIT) return msg(`Demasiados intentos. Espera ${Math.ceil((LOGIN_WAIT - Date.now()) / 1000)} s.`);
  if (!o.pin?.h) {
    if (pin.length < 4) return msg('Mínimo 4 caracteres.');
    if (pin !== form.pin2.value.trim()) return msg('Las dos contraseñas no coinciden.');
    put('operators', { ...o, pin: await makePin(pin) }, `${o.name} crea su contraseña`);
  } else if (!(await checkPin(o, pin))) {
    LOGIN_FAILS++; if (LOGIN_FAILS >= 5) { LOGIN_WAIT = Date.now() + 30000; LOGIN_FAILS = 0; }
    form.pin.value = ''; return msg('Contraseña incorrecta.');
  }
  LOGIN_FAILS = 0;
  const after = enter(o);
  if (!after) bioOffer(o);
}
// Entrar: siempre a Inicio (salvo un enlace QR abierto antes de entrar, que se abre encima)
function enter(o) {
  document.body.classList.remove('login-on');
  const after = prefs.afterLogin;
  ss.set(UNLOCK_KEY, '1'); ss.set(HIDDEN_KEY, null);
  setPref({ session: o.id, activeOperator: o.name, loginPick: null, afterLogin: null, tab: 'avisos', menuOpen: null, mission: null, ws: null, person: null });
  scrollTo(0, 0); toast(`Hola, ${o.name}`);
  if (after) { location.hash = after; }
  return after;
}
function logout() {
  if (!confirm('¿Cerrar la sesión en este móvil?')) return;
  ss.set(UNLOCK_KEY, null); closeModal(); setPref({ session: null, loginPick: prefs.session });
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
    closeModal(); toast('Huella activada: la próxima vez entra con ella');
  } catch (e) { toast(e?.name === 'NotAllowedError' ? 'No se activó la huella' : 'Este móvil no permite entrar con huella', 'bad'); }
}
function bioRemove(id = me().id) {
  const bio = { ...prefs.bio }; delete bio[id]; setPref({ bio }); toast('Huella quitada en este móvil');
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
  const msg = t => { const el = $('loginMsg'); if (el) el.textContent = t; };
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  try {
    const cred = await navigator.credentials.get({ publicKey: { challenge, timeout: 60000, userVerification: 'required',
      allowCredentials: [{ type: 'public-key', id: b64Buf(b.id), transports: ['internal'] }] } });
    if (!(await bioVerify(b, challenge, cred.response))) return msg('La huella no es válida. Entra con la contraseña.');
    enter(o);
  } catch (e) { if (e?.name !== 'NotAllowedError' && e?.name !== 'AbortError') msg('No se pudo usar la huella. Entra con la contraseña.'); }
}
// Tras entrar con contraseña, se ofrece una vez activar la huella en este móvil
async function bioOffer(o) {
  if (prefs.bio?.[o.id] || prefs.bioAsked?.[o.id] || !(await bioAvailable())) return;
  setPref({ bioAsked: { ...prefs.bioAsked, [o.id]: true } });
  openModal('Entrar con huella', `
    <p>¿Quieres entrar con tu huella (o la cara) en este móvil? La contraseña seguirá valiendo.</p>
    <div class="row" style="margin-top:14px"><button class="btn btn-a" onclick="bioRegister()">${ic('finger')} Activar huella</button>
      <button class="btn btn-g" onclick="closeModal()">Ahora no</button></div>`);
}
function bioPanel() {
  if (!window.PublicKeyCredential) return '';
  const on = !!prefs.bio?.[me().id];
  return `<button class="btn btn-g" onclick="${on ? 'bioRemove()' : 'bioRegister()'}">${ic('finger')} ${on ? 'Quitar huella' : 'Activar huella'}</button>`;
}

// Cambiar la contraseña propia (Ajustes) o borrar la de otra persona para que la cree de nuevo (ficha de la persona)
function pinForm() {
  const o = me();
  openForm('Cambiar mi contraseña', [
    { k: 'old', label: 'Contraseña actual', type: 'password', required: true, wide: true },
    { k: 'pin', label: 'Contraseña nueva', type: 'password', required: true },
    { k: 'pin2', label: 'Repite la nueva', type: 'password', required: true }
  ], async v => {
    if (!(await checkPin(o, v.old))) return toast('La contraseña actual no es correcta', 'bad');
    if (v.pin.length < 4) return toast('Mínimo 4 caracteres', 'bad');
    if (v.pin !== v.pin2) return toast('Las dos contraseñas nuevas no coinciden', 'bad');
    put('operators', { ...get('operators', o.id), pin: await makePin(v.pin) }, `${o.name} cambia su contraseña`);
    toast('Contraseña cambiada');
  });
}
function resetPin(id) {
  const o = get('operators', id);
  if (!confirm(`¿Borrar la contraseña de ${o.name}? La creará de nuevo la próxima vez que entre.`)) return;
  put('operators', { ...o, pin: null }, `Contraseña de ${o.name} restablecida`);
  closeModal(); toast(`${o.name} creará su contraseña al entrar`);
}
