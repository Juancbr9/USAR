'use strict';
// USAR 242 · Ajustes: datos compartidos, instalación y copias

/* ==================== VISTA: AJUSTES ==================== */
let installPrompt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (prefs.tab === 'ajustes') render(); });

function viewAjustes() {
  const c = Sync.cfg();
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const logs = list('logs').sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 150);

  const sync = c ? `
    <p class="muted">Conectado a <b style="color:var(--ink)">${esc(c.url.replace(/^https:\/\//, ''))}</b></p>
    ${Sync.error ? `<p class="note" style="color:var(--bad); margin-top:8px">${esc(Sync.error)}</p>` : ''}
    <div class="grid g2" style="margin-top:12px">
      <button class="btn btn-a" onclick="inviteModal()">${ic('users')} Invitar al equipo</button>
      <button class="btn btn-g" onclick="Sync.pull().then(() => toast('Sincronizado'))">${ic('refresh')} Sincronizar ahora</button>
      <button class="btn btn-bad span2" onclick="if (confirm('Este dispositivo dejará de compartir datos. Se conservan los datos actuales en el móvil.')) { Sync.disconnect(); render(); }">Desconectar este dispositivo</button>
    </div>
    ${accountPanel()}` : `
    <p class="muted" style="margin-bottom:12px">Para compartir los datos con todo el equipo:</p>
    <ol class="muted" style="margin:0 0 14px; padding-left:18px">
      <li>Crea un proyecto gratis en <b>supabase.com</b>.</li>
      <li>En <b>SQL Editor</b> pega y ejecuta el contenido de <a href="supabase.sql" target="_blank">supabase.sql</a>.</li>
      <li>En <b>Project Settings → API</b> copia la URL y la clave <b>anon public</b> aquí.</li>
    </ol>
    <form class="form" onsubmit="event.preventDefault(); connectSync(this)">
      <label class="lbl wide">URL del proyecto<input class="input" name="url" placeholder="https://xxxx.supabase.co" required></label>
      <label class="lbl wide">Clave anon public<input class="input" name="key" placeholder="eyJhbGciOi…" required></label>
      <button class="btn btn-a wide">${ic('cloud')} Conectar</button>
    </form>
    `;

  return `
    <div class="panel between wrap-row">
      <div class="who-row">${personPhoto(me())}<div><b>${esc(me().name)}</b><small>Sesión iniciada</small></div></div>
      <div class="row"><button class="btn btn-g" onclick="pinForm()">${ic('pencil')} Cambiar contraseña</button><button class="btn btn-g" onclick="logout()">${ic('out')} Cerrar sesión</button></div>
    </div>
    <div class="grid g2">
      <div class="panel">
        <h3 class="sec-title">${ic('cloud')} Datos compartidos del equipo</h3>
        ${sync}
      </div>
      <div class="stack">
        <div class="panel">
          <h3 class="sec-title">${ic('sun')} Pantalla y avisos</h3>
          <div class="seg-row" role="group" aria-label="Modo de pantalla" style="margin-bottom:10px">${[['light', 'Claro'], ['dark', 'Noche'], ['sun', 'Sol']].map(([k, l]) => `<button class="${currentTheme() === k ? 'on' : ''}" aria-pressed="${currentTheme() === k}" onclick="setPref({ theme: '${k}' }); applyTheme()">${l}</button>`).join('')}</div>
          <label class="check-row"><input type="checkbox" ${prefs.big ? 'checked' : ''} onchange="setPref({ big: this.checked }); applyTheme()"><span>Botones y letra grandes (con guantes)</span></label>
          <button class="btn btn-g full" style="margin-top:10px" onclick="enableNotifications()" ${'Notification' in window && Notification.permission === 'granted' ? 'disabled' : ''}>${ic('bell')} ${'Notification' in window && Notification.permission === 'granted' ? 'Avisos del sistema activados' : 'Activar avisos del sistema'}</button>
          
        </div>
        <div class="panel">
          <h3 class="sec-title">${ic('locate')} Unidades</h3>
          <label class="lbl">Coordenadas<select class="input" onchange="setPref({ coordFmt: this.value })">${[['latlon', 'Latitud y longitud (28.12350, -15.43630)'], ['utm', 'UTM (28R 457151 E 3110960 N)'], ['mgrs', 'MGRS (28R DS 57150 10960)']].map(([k, l]) => `<option value="${k}" ${coordFmt() === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <label class="lbl" style="margin-top:10px">Distancias<select class="input" onchange="setPref({ distUnit: this.value })">${[['m', 'Metros'], ['km', 'Kilómetros'], ['cm', 'Centímetros']].map(([k, l]) => `<option value="${k}" ${distUnit() === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <p class="muted" style="margin-top:8px">Las coordenadas se pueden escribir en cualquiera de los tres formatos.</p>
        </div>
        <div class="panel">
          <h3 class="sec-title">${ic('flag')} Indicativo del equipo</h3>
          <p class="muted" style="margin-bottom:10px">Sale en el marcaje y en los informes (ej. ESP-1).</p>
          <form class="row nowrap" onsubmit="event.preventDefault(); const v = this.code.value.trim().toUpperCase(); if (v) { put('meta', { id: 'teamcode', value: v }, 'Indicativo del equipo: ' + v); toast('Indicativo guardado'); }">
            <input class="input" name="code" aria-label="Indicativo del equipo" value="${esc(teamCode())}" maxlength="12" autocomplete="off">
            <button class="btn btn-a">Guardar</button>
          </form>
        </div>
        <div class="panel">
          <h3 class="sec-title">${ic('phone')} Instalar en el móvil</h3>
          ${standalone ? '<p class="muted">Ya está instalada.</p>'
            : installPrompt ? `<p class="muted" style="margin-bottom:12px">Añádela a la pantalla de inicio.</p><button class="btn btn-a full" onclick="installPrompt.prompt(); installPrompt = null">${ic('download')} Instalar app</button>`
            : ios ? '<p class="muted">En Safari pulsa <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.</p>'
            : '<p class="muted">En el menú del navegador elige <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.</p>'}
        </div>
        <div class="panel">
          <h3 class="sec-title">${ic('database')} Copias de seguridad</h3>
          <div class="list">
            <button class="btn btn-g" onclick="exportJSON()">${ic('download')} Exportar copia (.json)</button>
            <label class="btn btn-g" style="cursor:pointer">${ic('upload')} Importar copia (.json)<input type="file" accept=".json,application/json" class="hidden" onchange="importJSON(event)"></label>
            <button class="btn btn-bad" onclick="resetAll()">Restaurar datos iniciales</button>
          </div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('history')} Historial</h3><span class="muted">${logs.length} registros</span></div>
      <div class="list log" style="max-height:420px; overflow-y:auto">${logs.map(l => `
        <div class="well" style="padding:8px 10px"><span class="t">[${fmtWhen(l.ts)}]</span> <span class="w">${esc(l.operator)}:</span> ${esc(l.action)}</div>`).join('')
        || '<p class="muted">Sin actividad registrada.</p>'}</div>
    </div>`;
}

async function connectSync(form) {
  const btn = form.querySelector('button');
  btn.disabled = true; btn.textContent = 'Conectando…';
  try {
    await Sync.connect(form.url.value, form.key.value);
    toast('Conectado. Los datos se comparten con el equipo.');
  } catch (e) {
    toast(e.message, 'bad');
  }
  render();
}

function inviteModal() {
  const c = Sync.cfg();
  const link = appUrl() + '#join=' + b64(JSON.stringify({ url: c.url, key: c.key }));
  openModal('Invitar al equipo', `
    <p class="muted" style="margin-bottom:12px">Escanéalo o envía el enlace.</p>
    <div class="qr">${QR.svg(link)}</div>
    <div class="grid g2" style="grid-template-columns:1fr 1fr; margin-top:8px">
      <button class="btn btn-a" onclick="open('https://wa.me/?text=' + encodeURIComponent('USAR 242 · únete al equipo: ${link}'), '_blank')">${ic('chat')} WhatsApp</button>
      <button class="btn btn-g" onclick="navigator.clipboard.writeText(${jsq(link)}).then(() => toast('Enlace copiado'))">${ic('link')} Copiar enlace</button>
    </div>
    <p class="muted" style="margin-top:12px">Comparte este enlace solo con el equipo: quien lo tenga puede ver y editar los datos.</p>`);
}

async function exportJSON() {
  const data = Object.fromEntries(KINDS.map(k => [k, list(k)]));
  const images = await Img.all().catch(() => ({}));
  const blob = new Blob([JSON.stringify({ app: 'USAR_242', version: 6, exported: new Date().toISOString(), ...data, images }, null, 2)], { type: 'application/json' });
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `USAR242_${todayISO()}.json` });
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importJSON(event) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  file.text().then(text => {
    const data = JSON.parse(text);
    const incoming = data.gear && data.operators ? normalize(data) : null;
    if (!incoming) throw new Error();
    if (!confirm('Se sustituirán los datos actuales' + (Sync.cfg() ? ' de todo el equipo' : '') + ' por los de la copia. ¿Continuar?')) return;
    Object.entries(data.images || {}).filter(([k, v]) => SAFE_ID.test(k) && /^data:image\//.test(v)).forEach(([k, v]) => Img.put(k, v).catch(() => {}));
    replaceAll(incoming, 'Copia de seguridad importada');
  }).catch(() => toast('El archivo no es una copia válida de USAR 242', 'bad'));
}

function resetAll() {
  if (!confirm('¿Restaurar todos los datos a los valores iniciales?' + (Sync.cfg() ? ' Afectará a todo el equipo.' : ''))) return;
  replaceAll(defaultData(), 'Datos restaurados a valores iniciales');
}

function replaceAll(data, msg) {
  const fresh = toDb(data);
  for (const kind of KINDS) {
    Object.keys(db[kind]).forEach(id => { if (!fresh[kind][id]) stamp(kind, { id, _del: true }); });
    Object.values(fresh[kind]).forEach(r => stamp(kind, r));
  }
  addLog(msg);
  seedDefaults(!!Sync.cfg());
  commit();
  toast(msg);
}

/* ---------- Usuario y permisos (modo seguro) ---------- */
function accountPanel() {
  if (Sync.email) return `
    <div class="well" style="margin-top:14px">
      <div class="between"><div><b>${ic('lock', 'i-sm')} ${esc(Sync.email)}</b><small class="muted">${Sync.role === 'jefe' ? 'Jefe: ve y edita todo y gestiona los miembros' : Sync.role === 'miembro' ? 'Miembro: ve y edita todo' : 'Sin rol en el equipo'}</small></div>
        <button class="btn btn-g btn-sm" onclick="Sync.signOut(); render(); toast('Sesión cerrada')">Salir</button></div>
      ${Sync.role === 'jefe' ? `<button class="btn btn-g full" style="margin-top:10px" onclick="membersModal()">${ic('users')} Miembros y permisos</button>` : ''}
    </div>`;
  return `
    <details class="well" style="margin-top:14px"><summary><b>${ic('lock', 'i-sm')} Entrar con usuario (modo seguro)</b></summary>
      <p class="muted" style="margin:8px 0">Si el equipo ha activado el modo seguro en Supabase (ver supabase.sql), cada persona entra con su correo y contraseña y solo el personal dado de alta ve los datos. Todos ven todo; los jefes además dan de alta a los miembros.</p>
      <form class="form" onsubmit="event.preventDefault(); accountSubmit(this, event.submitter?.value)">
        <label class="lbl wide">Correo<input class="input" type="email" name="email" required autocomplete="username"></label>
        <label class="lbl wide">Contraseña<input class="input" type="password" name="password" required minlength="6" autocomplete="current-password"></label>
        <button class="btn btn-a" value="in">Entrar</button><button class="btn btn-g" value="up">Crear cuenta</button>
      </form></details>`;
}
async function accountSubmit(form, action) {
  const [email, pass] = [form.email.value, form.password.value];
  try {
    if (action === 'up') {
      const r = await Sync.signUp(email, pass);
      if (r === 'confirm') toast('Cuenta creada: confirma el correo que te ha llegado y después entra');
      else { const role = await Sync.signIn(email, pass); toast(`Cuenta creada. Has entrado como ${role}`); }
    } else {
      const role = await Sync.signIn(email, pass);
      toast(`Has entrado como ${role}`);
    }
  } catch (e) { toast(e.message, 'bad'); }
  render();
}
async function membersModal() {
  let ms = [];
  try { ms = await Sync.members(); } catch (e) { return toast(e.message, 'bad'); }
  openModal('Miembros y permisos', `
    <div class="list" style="margin-bottom:14px">${ms.map(m => `<div class="item"><div><b>${esc(m.name || m.email)}</b><small>${esc(m.email)}</small></div>
      <div class="row"><span class="tag ${m.role === 'jefe' ? 'warn' : 'neutral'}">${m.role}</span>${m.email !== Sync.email ? `<button class="link bad" onclick="Sync.removeMember(${jsq(m.email)}).then(membersModal).catch(e => toast(e.message, 'bad'))">Quitar</button>` : ''}</div></div>`).join('')}</div>
    <form id="memberForm" class="form">
      <label class="lbl wide">Correo<input class="input" type="email" name="email" required></label>
      <label class="lbl">Nombre<select class="input" name="name">${operators().map(o => `<option>${esc(o.name)}</option>`).join('')}</select></label>
      <label class="lbl">Permiso<select class="input" name="role"><option value="miembro">Miembro</option><option value="jefe">Jefe</option></select></label>
      <button class="btn btn-a wide">${ic('plus')} Añadir o cambiar</button>
    </form>
    <p class="muted" style="margin-top:10px">La persona crea su cuenta en Ajustes → Entrar con usuario → Crear cuenta, con el mismo correo.</p>`);
  $('memberForm').onsubmit = e => {
    e.preventDefault();
    const f = e.target;
    Sync.setMember(f.email.value, f.role.value, f.name.value).then(() => { toast('Miembro guardado'); membersModal(); }).catch(err => toast(err.message, 'bad'));
  };
}
