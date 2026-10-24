'use strict';
// USAR 242 · Inicio de sesión: cada persona entra con su nombre y su contraseña.
// La contraseña se crea la primera vez que alguien entra (si no tiene una ya asignada).
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
const loggedIn = () => !!me();

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
  const sel = prefs.loginPick && get('operators', prefs.loginPick) ? prefs.loginPick : '';
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
          <p id="loginMsg" class="bad-text" role="alert"></p>` : ''}
      </form>
    </div>`;
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
  document.body.classList.remove('login-on');
  const after = prefs.afterLogin;
  setPref({ session: o.id, activeOperator: o.name, loginPick: null, afterLogin: null, tab: 'avisos' });
  toast(`Hola, ${o.name}`);
  if (after) { location.hash = after; }
}
function logout() {
  if (!confirm('¿Cerrar la sesión en este móvil?')) return;
  closeModal(); setPref({ session: null, loginPick: prefs.session });
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
