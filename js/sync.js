'use strict';
// USAR 242 · Sincronización con Supabase (opcional)

/* ==================== SINCRONIZACIÓN (Supabase, opcional) ====================
   Cada registro es una fila (kind, id, data). Gana el cambio más reciente (_u).
   Los cambios se guardan primero en el móvil y se envían cuando hay conexión. */
const Sync = (() => {
  const TABLE = 'usar_records';
  let outbox = readJSON(KEY.outbox) || {};
  let status = 'local', error = '', busy = false, poller = null, debounce = null;
  const cfg = () => readJSON(KEY.sync);
  const setStatus = s => { status = s; renderSyncBadge(); };

  // Con usuario (modo seguro) se usa su sesión; sin usuario, la clave pública del proyecto
  async function api(path, options = {}, retried = false) {
    const c = cfg();
    if (c.session && c.session.expires_at - Date.now() < 60000) await refresh();
    const token = cfg().session?.access_token || c.key;
    const res = await fetch(`${c.url}/rest/v1/${path}`, {
      ...options,
      headers: { apikey: c.key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers }
    });
    if (res.status === 401 && c.session && !retried) { await refresh(); return api(path, options, true); }
    if (!res.ok) throw new Error(`Servidor ${res.status}: ${(await res.text()).slice(0, 140)}`);
    return options.method && options.method !== 'GET' ? null : res.json();
  }

  /* ---------- Usuarios (Supabase Auth) y permisos ---------- */
  let role = cfg()?.role || null;
  async function auth(path, body) {
    const c = cfg();
    const res = await fetch(`${c.url}/auth/v1/${path}`, { method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(/invalid/i.test(data.error_description || data.msg || '') ? 'Correo o contraseña incorrectos' : (data.error_description || data.msg || `Error ${res.status}`));
    return data;
  }
  function saveSession(d) {
    const c = cfg();
    c.session = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000, email: (d.user?.email || c.session?.email || '').toLowerCase() };
    writeJSON(KEY.sync, c);
  }
  async function refresh() {
    const c = cfg();
    try { saveSession(await auth('token?grant_type=refresh_token', { refresh_token: c.session.refresh_token })); }
    catch { const cc = cfg(); delete cc.session; cc.role = null; role = null; writeJSON(KEY.sync, cc); throw new Error('La sesión ha caducado: vuelve a entrar con tu usuario.'); }
  }
  async function loadRole() {
    const c = cfg();
    const rows = await api(`usar_members?select=email,role,name&email=eq.${encodeURIComponent(c.session.email)}`);
    role = rows[0]?.role || null;
    writeJSON(KEY.sync, { ...cfg(), role });
    if (!role) throw new Error('Tu usuario no está dado de alta en el equipo: pide a un jefe que te añada.');
    return role;
  }
  async function signIn(email, password) {
    saveSession(await auth('token?grant_type=password', { email: email.trim(), password }));
    try { await loadRole(); } catch (e) { signOut(); throw e; }
    const c = cfg(); c.joined = false; c.since = ''; writeJSON(KEY.sync, c);   // vuelve a descargar con sus permisos
    start();
    return role;
  }
  async function signUp(email, password) {
    const d = await auth('signup', { email: email.trim(), password });
    return d.access_token ? 'ok' : 'confirm';
  }
  function signOut() { const c = cfg(); if (!c) return; delete c.session; c.role = null; role = null; writeJSON(KEY.sync, c); }
  const members = () => api('usar_members?select=email,role,name&order=role.asc,email.asc');
  const setMember = (email, r, name = '') => api('usar_members?on_conflict=email', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify([{ email: email.trim().toLowerCase(), role: r, name }]) });
  const removeMember = email => api(`usar_members?email=eq.${encodeURIComponent(email)}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });

  // Imágenes (fotos de documentos, worksites, personas): en la cola solo va la referencia; los datos se leen al enviar
  function queueImage(id, deleted = false) {
    if (!cfg()) return;
    outbox['images|' + id] = { kind: 'images', id, img: true, deleted, _u: Date.now() };
    writeJSON(KEY.outbox, outbox);
    clearTimeout(debounce);
    debounce = setTimeout(flush, 400);
  }
  const imgU = readJSON('USAR_IMG_U') || {};
  function mergeImage(row) {
    const u = row.data?._u || 0;
    if (outbox['images|' + row.id] || (imgU[row.id] || 0) >= u && !row.deleted) return false;
    imgU[row.id] = u; writeJSON('USAR_IMG_U', imgU);
    if (!row.deleted && row.data?.data && !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(row.data.data)) return false;   // solo fotos
    if (row.deleted || !row.data?.data) Img.del(row.id, true).catch(() => {});
    else Img.put(row.id, row.data.data, true).catch(() => {});
    return true;
  }

  function queue(kind, rec) {
    if (!cfg() || LOCAL_KINDS.includes(kind)) return;
    if (role === 'miembro' && JEFE_KINDS.includes(kind)) return;   // la documentación del personal solo la comparten los jefes
    outbox[kind + '|' + rec.id] = { kind, id: rec.id, data: rec, deleted: !!rec._del };
    writeJSON(KEY.outbox, outbox);
    clearTimeout(debounce);
    debounce = setTimeout(flush, 400);
  }

  function merge(row) {
    if (row.kind === 'images') return mergeImage(row);
    if (!db[row.kind] || LOCAL_KINDS.includes(row.kind)) return false;
    const rec = cleanRec({ ...(row.data || {}), id: row.id });
    if (!rec) return false;
    if (row.deleted) rec._del = true;
    const mine = db[row.kind][row.id];
    const pending = outbox[row.kind + '|' + row.id];
    if (pending && (pending.data._u || 0) > (rec._u || 0)) return false;
    if (mine && (mine._u || 0) >= (rec._u || 0)) return false;
    db[row.kind][row.id] = rec;
    return true;
  }

  async function fetchRows(since) {
    const rows = [], page = 1000;
    for (let offset = 0; ; offset += page) {
      const filter = since ? `&updated_at=gte.${encodeURIComponent(since)}` : '';
      const chunk = await api(`${TABLE}?select=kind,id,data,deleted,updated_at&order=updated_at.asc&limit=${page}&offset=${offset}${filter}`);
      rows.push(...chunk);
      if (chunk.length < page) return rows;
    }
  }
  const newest = (rows, prev) => rows.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), prev || '');

  async function pull() {
    const c = cfg();
    if (!c) return;
    if (!navigator.onLine) return setStatus('offline');
    try {
      if (!c.joined) {
        // Primera conexión: si la nube está vacía se suben los datos de este móvil;
        // si ya tiene datos del equipo, este móvil adopta esos datos.
        const rows = await fetchRows();
        if (rows.length) { KINDS.filter(k => !LOCAL_KINDS.includes(k)).forEach(k => { db[k] = {}; }); rows.forEach(merge); seedDefaults(true); }
        else { KINDS.forEach(k => Object.values(db[k]).forEach(r => queue(k, r))); Object.keys(await Img.all().catch(() => ({}))).forEach(id => queueImage(id)); }
        Object.assign(c, { joined: true, since: newest(rows) });
        writeJSON(KEY.sync, c);
        persist(); render();
      } else {
        // Se repasan 30 s hacia atrás para no perder escrituras simultáneas
        const since = c.since ? new Date(new Date(c.since).getTime() - 30000).toISOString() : '';
        const rows = await fetchRows(since);
        if (rows.filter(merge).length) { persist(); render(); }
        if (rows.length) { c.since = newest(rows, c.since); writeJSON(KEY.sync, c); }
      }
      error = '';
      await flush();
      if (!busy && !error) setStatus('online');
    } catch (e) {
      error = e.message;
      setStatus(navigator.onLine ? 'error' : 'offline');
    }
  }

  async function flush() {
    const items = Object.entries(outbox);
    if (!cfg() || busy || !items.length) return;
    if (!navigator.onLine) return setStatus('offline');
    busy = true; setStatus('syncing');
    try {
      const imgs = items.filter(([, r]) => r.img), rest = items.filter(([, r]) => !r.img);
      const batches = [];
      for (let i = 0; i < rest.length; i += 200) batches.push(rest.slice(i, i + 200));
      for (let i = 0; i < imgs.length; i += 5) batches.push(imgs.slice(i, i + 5));   // las fotos, de pocas en pocas
      for (const batch of batches) {
        const body = await Promise.all(batch.map(async ([, r]) => r.img
          ? { kind: 'images', id: r.id, deleted: r.deleted, data: r.deleted ? null : { data: await Img.get(r.id), _u: r._u } }
          : r));
        await api(`${TABLE}?on_conflict=kind,id`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(body.filter(r => r.deleted || r.kind !== 'images' || r.data.data))
        });
        batch.filter(([, r]) => r.img).forEach(([, r]) => { imgU[r.id] = r._u; });
        writeJSON('USAR_IMG_U', imgU);
        batch.forEach(([k, r]) => { if (outbox[k] === r) delete outbox[k]; });
        writeJSON(KEY.outbox, outbox);
      }
      error = '';
      setStatus('online');
    } catch (e) {
      error = e.message;
      setStatus(navigator.onLine ? 'error' : 'offline');
    }
    busy = false;
    if (Object.keys(outbox).length && status === 'online') flush();
  }

  function start() {
    clearInterval(poller);
    if (!cfg()) return setStatus('local');
    pull();
    poller = setInterval(() => { if (document.visibilityState === 'visible') pull(); }, 8000);
  }

  async function connect(url, key) {
    url = url.trim().replace(/\/+$/, '');
    if (!/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])[^\s]+$/.test(url)) throw new Error('La URL debe empezar por https://');
    if (!key.trim()) throw new Error('Falta la clave pública (anon key)');
    writeJSON(KEY.sync, { url, key: key.trim(), joined: false, since: '' });
    outbox = {}; writeJSON(KEY.outbox, outbox);
    try { await api(`${TABLE}?select=id&limit=1`); }
    catch (e) {
      localStorage.removeItem(KEY.sync);
      throw new Error(/404|PGRST205|relation/.test(e.message)
        ? 'Conecta, pero falta la tabla: ejecuta supabase.sql en el SQL Editor de Supabase.'
        : 'No se pudo conectar. Revisa la URL y la clave. ' + e.message);
    }
    start();
  }

  function disconnect() {
    clearInterval(poller);
    localStorage.removeItem(KEY.sync);
    localStorage.removeItem(KEY.outbox);
    outbox = {};
    setStatus('local');
  }

  addEventListener('online', () => cfg() && pull());
  addEventListener('offline', () => cfg() && setStatus('offline'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cfg()) pull(); });

  return {
    start, connect, disconnect, queue, queueImage, pull, cfg, signIn, signUp, signOut, members, setMember, removeMember,
    get status() { return status; }, get error() { return error; }, get pending() { return Object.keys(outbox).length; },
    get role() { return cfg()?.session ? role : null; }, get email() { return cfg()?.session?.email || ''; }
  };
})();
