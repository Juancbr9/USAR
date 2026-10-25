'use strict';
// USAR 242 · Ajustes: mi cuenta, este móvil, equipo, administración e historial

/* ==================== VISTA: AJUSTES ==================== */
let installPrompt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; if (prefs.tab === 'ajustes') render(); });

// Ordenado por a quién afecta: mi cuenta, este móvil, todo el equipo y, solo para ADMIN, administración
function viewAjustes() {
  const c = Sync.cfg();
  const standalone = instalada(), ios = IOS;
  const logs = list('logs').sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 150);
  const avisos = 'Notification' in window && Notification.permission === 'granted';
  const grupo = (titulo, desc) => `<div class="aj-group"><h2>${titulo}</h2><p class="muted">${desc}</p></div>`;

  return `
    ${grupo('Mi cuenta', 'Tu sesión en este móvil.')}
    <div class="panel">
      <div class="between wrap-row">
        <div class="who-row">${personPhoto(me())}<div><b>${esc(me().name)}</b><small>${Sync.email ? esc(Sync.email) : 'Sesión iniciada'}</small></div></div>
        <div class="row">${Sync.email ? `<button class="btn btn-g" onclick="pinForm()">${ic('pencil')} Cambiar contraseña</button>` : ''}${bioPanel()}<button class="btn btn-g" onclick="logout()">${ic('out')} Cerrar sesión</button></div>
      </div>
      ${Sync.email ? `<p class="muted" style="margin-top:10px">${ic('lock', 'i-sm')} ${rolTexto()}</p>` : ''}
    </div>

    ${grupo('Este móvil', 'Solo cambia cómo ves la app tú; no afecta al resto.')}
    <div class="grid g2">
      <div class="panel">
        <h3 class="sec-title">${ic('sun')} Pantalla y avisos</h3>
        <div class="seg-row" role="group" aria-label="Modo de pantalla" style="margin-bottom:10px">${[['light', 'Claro'], ['dark', 'Noche'], ['sun', 'Sol']].map(([k, l]) => `<button class="${currentTheme() === k ? 'on' : ''}" aria-pressed="${currentTheme() === k}" onclick="setPref({ theme: '${k}' }); applyTheme()">${l}</button>`).join('')}</div>
        <label class="check-row"><input type="checkbox" ${prefs.big ? 'checked' : ''} onchange="setPref({ big: this.checked }); applyTheme()"><span>Botones y letra grandes (con guantes)</span></label>
        <button class="btn btn-g full" style="margin-top:10px" onclick="enableNotifications()" ${avisos ? 'disabled' : ''}>${ic('bell')} ${avisos ? 'Avisos del sistema activados' : 'Activar avisos del sistema'}</button>
      </div>
      <div class="panel">
        <h3 class="sec-title">${ic('locate')} Unidades</h3>
        <label class="lbl">Coordenadas<select class="input" onchange="setPref({ coordFmt: this.value })">${[['latlon', 'Latitud y longitud (28.12350, -15.43630)'], ['utm', 'UTM (28R 457151 E 3110960 N)'], ['mgrs', 'MGRS (28R DS 57150 10960)']].map(([k, l]) => `<option value="${k}" ${coordFmt() === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="lbl" style="margin-top:10px">Distancias<select class="input" onchange="setPref({ distUnit: this.value })">${[['m', 'Metros'], ['km', 'Kilómetros'], ['cm', 'Centímetros']].map(([k, l]) => `<option value="${k}" ${distUnit() === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <p class="muted" style="margin-top:8px">Las coordenadas se pueden escribir en cualquiera de los tres formatos.</p>
      </div>
      <div class="panel span2">
        <h3 class="sec-title">${ic('phone')} Instalar en el móvil</h3>
        ${standalone ? '<p class="muted">Ya está instalada.</p>'
          : installPrompt ? `<p class="muted" style="margin-bottom:12px">Añádela a la pantalla de inicio.</p><button class="btn btn-a full" onclick="installPrompt.prompt(); installPrompt = null">${ic('download')} Instalar app</button>`
          : ios ? '<p class="muted">En Safari pulsa <b>Compartir</b> y luego <b>Añadir a pantalla de inicio</b>.</p>'
          : '<p class="muted">En el menú del navegador elige <b>Instalar aplicación</b> o <b>Añadir a pantalla de inicio</b>.</p>'}
      </div>
    </div>

    ${grupo('Equipo', 'Afecta a todo el equipo.')}
    <div class="panel">
      <h3 class="sec-title">${ic('cloud')} Datos compartidos</h3>
      ${!c ? '<p class="muted">Los datos se guardan solo en este móvil.</p>' : !Sync.email ? '<p class="muted">Entra con tu correo para ver y compartir los datos del equipo.</p>' : `
        ${Sync.error ? `<p class="note" style="color:var(--bad); margin-bottom:8px">${esc(Sync.error)}</p>` : ''}
        <div class="grid g2">
          <button class="btn btn-g" onclick="Sync.pull().then(() => toast('Sincronizado'))">${ic('refresh')} Sincronizar ahora</button>
          ${Sync.role === 'jefe' ? `<button class="btn btn-g" onclick="membersModal()">${ic('users')} Miembros y permisos</button>` : ''}
        </div>`}
    </div>

    ${isAdmin() ? `
    ${grupo('Administración', `Solo ${esc(ADMIN)}.`)}
    <div class="grid g2">
      ${mantenimientoPanel()}
      <div class="panel">
        <h3 class="sec-title">${ic('database')} Copias de seguridad</h3>
        <div class="list">
          <button class="btn btn-g" onclick="exportJSON()">${ic('download')} Exportar copia (.json)</button>
          <label class="btn btn-g" style="cursor:pointer">${ic('upload')} Importar copia (.json)<input type="file" accept=".json,application/json" class="hidden" onchange="importJSON(event)"></label>
        </div>
      </div>
      <div class="panel span2 aj-danger">
        <h3 class="sec-title">${ic('alert')} Zona peligrosa</h3>
        <p class="muted" style="margin-bottom:10px">Borra todo y deja los datos de serie${c ? ', en todos los móviles del equipo' : ''}.</p>
        <button class="btn btn-bad full" onclick="resetAll()">Restaurar datos iniciales</button>
      </div>
    </div>` : ''}

    <details class="panel aj-log">
      <summary class="between"><h3 class="sec-title" style="margin:0">${ic('history')} Historial</h3><span class="muted">${logs.length} registros</span></summary>
      <div class="list log" style="max-height:420px; overflow-y:auto; margin-top:12px">${logs.map(l => `
        <div class="well" style="padding:8px 10px"><span class="t">[${fmtWhen(l.ts)}]</span> <span class="w">${esc(l.operator)}:</span> ${esc(l.action)}</div>`).join('')
        || '<p class="muted">Sin actividad registrada.</p>'}</div>
    </details>`;
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
const rolTexto = () => Sync.role === 'jefe' ? 'Jefe: ve y edita todo y gestiona los miembros' : Sync.role === 'miembro' ? 'Miembro: ve y usa todo; el material y los vehículos los da de alta el jefe' : 'Sin rol en el equipo';
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
    <p class="muted" style="margin-top:10px">Después, la persona abre la app, pulsa «¿Primera vez? Crea tu cuenta» y usa este mismo correo. Entra con el nombre elegido aquí.</p>`);
  $('memberForm').onsubmit = e => {
    e.preventDefault();
    const f = e.target;
    Sync.setMember(f.email.value, f.role.value, f.name.value).then(() => { toast('Miembro guardado'); membersModal(); }).catch(err => toast(err.message, 'bad'));
  };
}
