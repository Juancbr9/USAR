'use strict';
// USAR 242 · Sincronización con Supabase (la del equipo va integrada: SUPA en js/config.js)

/* ==================== SINCRONIZACIÓN (Supabase) ====================
   Cada registro es una fila (kind, id, data). Los cambios se guardan primero en el móvil y se envían cuando hay conexión.
   Para que dos móviles no se pisen, cada uno recuerda la versión del servidor sobre la que trabaja (base, con la hora del
   servidor). Un cambio solo se guarda si el registro sigue como estaba en esa versión; si otro lo cambió entretanto, se
   traen sus cambios y se combinan con los de este móvil (merge3) antes de volver a enviarlo. Así no depende de la hora de
   cada móvil y no se pierde lo que hizo el otro: lo que cambió solo uno se queda, en las listas se suma lo que añadió cada
   uno, y si los dos cambiaron el mismo dato gana el último en enviarse. */
const Sync = (() => {
  const TABLE = 'usar_records';
  let outbox = readJSON(KEY.outbox) || {};
  let base = readJSON(KEY.base) || {};   // 'kind|id' → { at: hora del servidor, data: el registro como está allí }
  const saveBase = () => writeJSON(KEY.base, base);
  let status = 'local', error = '', busy = false, poller = null, debounce = null;
  const cfg = () => readJSON(KEY.sync);
  const setStatus = s => { status = s; renderSyncBadge(); };
  const locked = () => !!(cfg()?.secure && !cfg().session);   // modo seguro y sin usuario: no se puede leer ni enviar

  // Con usuario (modo seguro) va su sesión en Authorization; sin usuario, solo la clave pública en «apikey»
  // (las claves nuevas «sb_publishable_…» no son JWT y Supabase las rechaza en Authorization)
  async function api(path, options = {}, retried = false) {
    const c = cfg();
    if (c.session && c.session.expires_at - Date.now() < 60000) await refresh();
    const token = cfg().session?.access_token;
    const res = await fetch(`${c.url}/rest/v1/${path}`, {
      ...options,
      headers: { apikey: c.key, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', ...options.headers }
    });
    if (res.status === 401 && c.session && !retried) { await refresh(); return api(path, options, true); }
    if (!res.ok) throw new Error(`Servidor ${res.status}: ${(await res.text()).slice(0, 140)}`);
    return options.method && options.method !== 'GET' && !options.json ? null : res.json();
  }

  /* ---------- Usuarios (Supabase Auth) y permisos ---------- */
  let role = cfg()?.role || null;
  async function auth(path, body) {
    const c = cfg();
    const res = await fetch(`${c.url}/auth/v1/${path}`, { method: 'POST', headers: { apikey: c.key, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    const m = data.error_description || data.msg || '';
    if (/anonymous/i.test(m)) throw new Error('El acceso con PIN no está activado en Supabase (Authentication → «Allow anonymous sign-ins»)');
    if (!res.ok) throw new Error(/invalid/i.test(m) ? 'Correo o contraseña incorrectos' : (m || `Error ${res.status}`));
    return data;
  }
  // keep: al renovar la sesión se conserva si es de invitado con PIN (y su nombre)
  function saveSession(d, keep = true) {
    const c = cfg(), prev = keep ? c.session || {} : {};
    c.session = { access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() + (d.expires_in || 3600) * 1000,
      email: (d.user?.email || prev.email || '').toLowerCase(), anon: !!(d.user?.is_anonymous ?? prev.anon), pinName: prev.pinName || '' };
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
    writeJSON(KEY.sync, { ...cfg(), role, name: rows[0]?.name || '' });
    if (!role) throw new Error(`Tu correo no está dado de alta en el equipo: pide a ${ADMIN} que te añada en Ajustes → Miembros y permisos.`);
    return role;
  }
  async function signIn(email, password) {
    saveSession(await auth('token?grant_type=password', { email: email.trim(), password }), false);
    try { await loadRole(); } catch (e) { signOut(); throw e; }
    const c = cfg(); c.joined = false; c.since = ''; writeJSON(KEY.sync, c);   // vuelve a descargar con sus permisos
    start();
    return role;
  }
  async function signUp(email, password) {
    const d = await auth('signup', { email: email.trim(), password });
    return d.access_token ? 'ok' : 'confirm';
  }
  function signOut() {
    const c = cfg(); if (!c) return;
    // Con PIN, el invitado de este móvil se conserva (para no crear otro) pero deja de tener nombre en el servidor
    if (c.session?.pinName) { rpc('usar_salir').catch(() => {}); c.session = { ...c.session, pinName: '' }; } else delete c.session;
    c.role = null; c.name = ''; role = null; writeJSON(KEY.sync, c);
  }

  /* ---------- Acceso con nombre y PIN (sin correo) ----------
     El móvil entra en Supabase como invitado y la base de datos comprueba el nombre y el PIN (supabase.sql); hasta
     entonces el invitado no ve nada. Los PIN los ponen los jefes. */
  async function rpc(fn, args = {}) {
    const c = cfg();
    if (!c) throw new Error('Este móvil no está conectado con la base de datos del equipo');
    if (c.session && c.session.expires_at - Date.now() < 60000) await refresh();
    const token = cfg().session?.access_token;
    const res = await fetch(`${c.url}/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args),
      headers: { apikey: c.key, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' } });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(res.status === 404 || /PGRST202/.test(JSON.stringify(data)) ? `El acceso con PIN todavía no está activado: entra con tu correo o pide a ${ADMIN} que lo active` : `Servidor ${res.status}`);
    if (data?.error) throw new Error(data.error);
    return data;
  }
  const names = () => rpc('usar_nombres').then(r => (r || []).map(x => x.name));
  async function pinSignIn(name, pin) {
    if (!cfg().session?.anon) saveSession(await auth('signup', {}), false);   // invitado de este móvil
    const r = await rpc('usar_entrar', { p_name: name, p_pin: pin });
    role = r.role;
    const c = cfg(); c.session.pinName = r.name; Object.assign(c, { role, name: r.name, joined: false, since: '' }); writeJSON(KEY.sync, c);
    start();
    return r;
  }
  const changePin = (oldPin, pin) => rpc('usar_cambiar_mi_pin', { p_old: oldPin, p_new: pin });
  const people = () => rpc('usar_personas');
  const setPin = (name, r, pin) => rpc('usar_poner_pin', { p_name: name, p_role: r, p_pin: pin });
  const setRole = (name, r) => rpc('usar_cambiar_permiso', { p_name: name, p_role: r });
  const removePerson = name => rpc('usar_quitar', { p_name: name });
  // Comprobar la contraseña con el servidor (al abrir la app si este móvil aún no la conoce) y cambiarla
  async function verify(email, password) { saveSession(await auth('token?grant_type=password', { email: email.trim(), password })); }
  async function setPassword(password) {
    const c = cfg();
    if (c.session.expires_at - Date.now() < 60000) await refresh();
    const res = await fetch(`${c.url}/auth/v1/user`, { method: 'PUT', headers: { apikey: c.key, Authorization: `Bearer ${cfg().session.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.msg || d.error_description || `Error ${res.status}`); }
  }
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
    if (!cfg()) return;
    outbox[kind + '|' + rec.id] = { kind, id: rec.id, data: rec, deleted: !!rec._del };
    writeJSON(KEY.outbox, outbox);
    clearTimeout(debounce);
    debounce = setTimeout(flush, 400);
  }

  /* ---------- Combinar versiones ---------- */
  // Horas del servidor comparables como texto (siempre con 6 decimales) y comparación de datos sin mirar _u
  const normTs = s => String(s || '').replace(/(\.\d+)?(?=(Z|[+-]\d\d:?\d\d)$)/, m => (m || '.').padEnd(7, '0'));
  const stable = x => JSON.stringify(x ?? null, (k, v) => k === '_u' ? undefined
    : v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(key => [key, v[key]])) : v);
  const same = (a, b) => stable(a) === stable(b);
  const isObj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const elKey = x => isObj(x) && (x.id != null || x.key != null) ? 'k:' + (x.id ?? x.key) : 'v:' + stable(x);
  // Listas: se queda lo que añadió cada uno y se quita lo que quitó alguno (salvo que el otro lo cambiara entretanto)
  function mergeList(b, mine, theirs) {
    const B = new Map(b.map(x => [elKey(x), x])), M = new Map(mine.map(x => [elKey(x), x])), out = [];
    for (const t of theirs) {
      const k = elKey(t);
      if (M.has(k)) out.push(merge3(B.get(k), M.get(k), t, B.has(k)));
      else if (!B.has(k) || !same(B.get(k), t)) out.push(t);
    }
    const T = new Set(theirs.map(elKey));
    for (const m of mine) { const k = elKey(m); if (!T.has(k) && (!B.has(k) || !same(B.get(k), m))) out.push(m); }
    return out;
  }
  // Tres versiones: la base (como estaba), la de este móvil y la que llega. Lo cambiado por uno solo se queda; si los dos
  // cambiaron lo mismo: objetos campo a campo, listas juntas y en lo demás gana este móvil (el último en enviarse).
  // known: se sabe cómo estaba (aunque ese dato no existiera: entonces lo añadió quien lo tiene)
  function merge3(b, mine, theirs, known = b != null) {
    if (same(mine, theirs)) return mine;
    if (known) { if (same(mine, b)) return theirs; if (same(theirs, b)) return mine; }
    if (Array.isArray(mine) && Array.isArray(theirs)) return mergeList(known && Array.isArray(b) ? b : [], mine, theirs);
    if (isObj(mine) && isObj(theirs)) {
      const bb = known && isObj(b) ? b : {}, kb = known && isObj(b), out = {};
      for (const k of new Set([...Object.keys(theirs), ...Object.keys(mine)])) {
        if (k === '_u') continue;
        const v = merge3(bb[k], mine[k], theirs[k], kb);
        if (v !== undefined) out[k] = v;
      }
      if (mine._u || theirs._u) out._u = Math.max(mine._u || 0, theirs._u || 0);
      return out;
    }
    return mine;
  }
  const rowRec = row => { const r = cleanRec({ ...(row.data || {}), id: row.id }); if (r && row.deleted) r._del = true; return r; };

  // Llega una fila del servidor: si este móvil no tiene cambios pendientes en ella, se toma tal cual; si los tiene, se
  // combinan con lo que llega y quedan pendientes de enviar sobre esta versión
  function merge(row) {
    if (row.kind === 'images') return mergeImage(row);
    if (!db[row.kind]) return false;
    const k = row.kind + '|' + row.id, b = base[k];
    if (b && row.updated_at && normTs(b.at) >= normTs(row.updated_at)) return false;   // ya la conocía
    const rec = rowRec(row);
    if (!rec) return false;
    base[k] = { at: row.updated_at || '', data: rec };   // se guarda en el móvil al terminar el lote (saveBase)
    const mine = db[row.kind][row.id], pending = outbox[k];
    if (!pending) {
      if (mine && same(mine, rec) && !!mine._del === !!rec._del) return false;
      db[row.kind][row.id] = rec;
      return true;
    }
    const merged = merge3(b ? b.data : null, mine || pending.data, rec);
    db[row.kind][row.id] = merged;
    outbox[k] = { ...pending, data: merged, deleted: !!merged._del };
    writeJSON(KEY.outbox, outbox);
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
    if (locked()) { error = 'Modo seguro: entra con tu usuario para ver y compartir los datos del equipo.'; return setStatus('error'); }
    try {
      if (!c.joined) {
        // Primera conexión: si la nube está vacía se suben los datos de este móvil;
        // si ya tiene datos del equipo, este móvil adopta esos datos.
        const rows = await fetchRows();
        if (rows.length && c.nuevo) { outbox = {}; writeJSON(KEY.outbox, outbox); }   // móvil nuevo: manda lo del equipo
        if (rows.length) { KINDS.forEach(k => { db[k] = {}; }); base = {}; rows.forEach(merge); saveBase(); seedDefaults(true); }
        else { KINDS.forEach(k => Object.values(db[k]).forEach(r => queue(k, r))); Object.keys(await Img.all().catch(() => ({}))).forEach(id => queueImage(id)); }
        // Sobre lo guardado ahora (no sobre «c»): entretanto se ha podido entrar o salir con otro usuario
        const cc = { ...cfg(), joined: true, since: newest(rows) }; delete cc.nuevo;
        writeJSON(KEY.sync, cc);
        persist(); render();
      } else {
        // Se repasan 30 s hacia atrás para no perder escrituras simultáneas. Un móvil que aún no tenía las versiones del
        // servidor (base) las trae todas una vez
        const since = c.since && Object.keys(base).length ? new Date(new Date(c.since).getTime() - 30000).toISOString() : '';
        const rows = await fetchRows(since);
        const changed = rows.filter(merge).length;
        if (rows.length) saveBase();
        if (changed) { persist(); render(); }
        if (rows.length) writeJSON(KEY.sync, { ...cfg(), since: newest(rows, c.since) });
      }
      error = '';
      await flush();
      if (!busy && !error) setStatus('online');
    } catch (e) {
      // Modo seguro: sin usuario el servidor no deja leer nada; hace falta entrar con el correo
      if (/42501|permission denied/.test(e.message) && !c.session) { writeJSON(KEY.sync, { ...cfg(), secure: true }); e.message = 'Modo seguro: entra con tu correo para ver y compartir los datos del equipo.'; }
      error = e.message;
      setStatus(navigator.onLine ? 'error' : 'offline');
    }
  }

  /* ---------- Envío ---------- */
  const SEC = /42501|row-level security/;
  const enc = encodeURIComponent;
  // Guardado en el servidor: se apunta su versión y sale de la cola (save = false: se guarda en el móvil al final del lote)
  const done = (k, r, row, save = true) => {
    if (row) base[k] = { at: row.updated_at, data: rowRec(row) || r.data };
    if (outbox[k] === r) delete outbox[k];
    if (save) { saveBase(); writeJSON(KEY.outbox, outbox); }
  };
  const fetchOne = (kind, id) => api(`${TABLE}?select=kind,id,data,deleted,updated_at&kind=eq.${enc(kind)}&id=eq.${enc(id)}`).then(rows => rows[0] || null);
  const asRow = r => ({ kind: r.kind, id: r.id, data: r.data, deleted: !!r.deleted });
  // Registros que el servidor aún no tiene (o este móvil no sabe en qué versión están): se insertan si no existen
  async function insertNew(entries) {
    let rows = null;
    try { rows = await api(`${TABLE}?on_conflict=kind,id`, { method: 'POST', json: true, headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify(entries.map(([, r]) => asRow(r))) }); }
    catch (e) {
      if (!SEC.test(e.message)) throw e;
      // Alguno no lo puede crear este usuario (p. ej. material nuevo si no es jefe): uno a uno, para que el resto sí se guarde
      if (entries.length > 1) { for (const en of entries) await insertNew([en]); return; }
    }
    const got = new Map((rows || []).map(x => [x.kind + '|' + x.id, x]));
    entries.filter(([k]) => got.has(k)).forEach(([k, r]) => done(k, r, got.get(k), false));
    saveBase(); writeJSON(KEY.outbox, outbox);
    for (const [k, r] of entries) {
      if (got.has(k)) continue;
      // Ya existía (otro móvil la creó con el mismo id) o no hay permiso para crearla: se mira cómo está en el servidor
      const cur = await fetchOne(r.kind, r.id);
      if (!cur) { if (outbox[k] === r) { delete outbox[k]; writeJSON(KEY.outbox, outbox); } continue; }   // rechazada: queda solo en este móvil
      if (merge(cur)) { persist(); render(); }
      saveBase();
      await updateOne(k);
    }
  }
  // Cambio sobre una versión conocida: solo se guarda si en el servidor sigue esa versión; si no, se combina y se reintenta
  async function updateOne(k) {
    for (let tries = 0; tries < 4 && outbox[k]; tries++) {
      const r = outbox[k], b = base[k];
      if (!b) return insertNew([[k, r]]);
      let rows;
      try { rows = await api(`${TABLE}?kind=eq.${enc(r.kind)}&id=eq.${enc(r.id)}&updated_at=eq.${enc(b.at)}`, { method: 'PATCH', json: true, headers: { Prefer: 'return=representation' }, body: JSON.stringify({ data: r.data, deleted: !!r.deleted }) }); }
      catch (e) { if (!SEC.test(e.message)) throw e; if (outbox[k] === r) { delete outbox[k]; writeJSON(KEY.outbox, outbox); } return; }   // sin permiso: queda solo en este móvil
      if (rows.length) return done(k, r, rows[0]);
      const cur = await fetchOne(r.kind, r.id);
      if (!cur) { delete base[k]; saveBase(); return insertNew([[k, r]]); }
      // Si nadie lo ha cambiado y aun así no se guarda, es que este usuario no puede cambiarlo: queda solo en este móvil
      if (normTs(cur.updated_at) === normTs(b.at)) { if (outbox[k] === r) { delete outbox[k]; writeJSON(KEY.outbox, outbox); } return; }
      if (merge(cur)) { persist(); render(); }
      saveBase();
    }
  }

  async function flush() {
    const items = Object.entries(outbox);
    if (!cfg() || busy || !items.length || locked()) return;
    if (!navigator.onLine) return setStatus('offline');
    busy = true; setStatus('syncing');
    try {
      const imgs = items.filter(([, r]) => r.img), rest = items.filter(([, r]) => !r.img);
      const fresh = rest.filter(([k]) => !base[k]);
      for (let i = 0; i < fresh.length; i += 200) await insertNew(fresh.slice(i, i + 200));
      for (const [k] of rest) if (outbox[k] && base[k]) await updateOne(k);
      const batches = [];
      for (let i = 0; i < imgs.length; i += 5) batches.push(imgs.slice(i, i + 5));   // las fotos, de pocas en pocas
      for (const batch of batches) {
        const body = await Promise.all(batch.map(async ([, r]) => ({ kind: 'images', id: r.id, deleted: r.deleted, data: r.deleted ? null : { data: await Img.get(r.id), _u: r._u } })));
        const send = rows => api(`${TABLE}?on_conflict=kind,id`, {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(rows.filter(r => r.deleted || r.kind !== 'images' || r.data.data))
        });
        try { await send(body); }
        catch (e) {
          // Lo que este usuario no puede guardar se queda solo en este móvil, para que no atasque el resto de la cola
          if (!SEC.test(e.message)) throw e;
          for (const r of body) await send([r]).catch(err => { if (!SEC.test(err.message)) throw err; });
        }
        batch.forEach(([, r]) => { imgU[r.id] = r._u; });
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

  // La base de datos del equipo va integrada (SUPA): cada móvil se conecta solo la primera vez que abre la app.
  // Devuelve true si este móvil se acaba de conectar (aún no tiene los datos del equipo).
  function ensure() {
    if (!SUPA.url || cfg()?.url === SUPA.url) return false;
    writeJSON(KEY.sync, { url: SUPA.url, key: SUPA.key, joined: false, since: '', nuevo: true });
    outbox = {}; writeJSON(KEY.outbox, outbox);
    return true;
  }

  async function connect(url, key) {
    url = url.trim().replace(/\/+$/, '');
    if (!/^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)[:/])[^\s]+$/.test(url)) throw new Error('La URL debe empezar por https://');
    if (!key.trim()) throw new Error('Falta la clave pública (publishable o anon)');
    writeJSON(KEY.sync, { url, key: key.trim(), joined: false, since: '' });
    outbox = {}; writeJSON(KEY.outbox, outbox);
    try { await api(`${TABLE}?select=id&limit=1`); }
    catch (e) {
      // Modo seguro: sin usuario el servidor no deja leer nada (42501). La conexión vale; falta entrar con usuario.
      if (/42501|permission denied/.test(e.message)) { writeJSON(KEY.sync, { ...cfg(), secure: true }); start(); return 'login'; }
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
    localStorage.removeItem(KEY.base);
    outbox = {}; base = {};
    setStatus('local');
  }

  addEventListener('online', () => cfg() && pull());
  addEventListener('offline', () => cfg() && setStatus('offline'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && cfg()) pull(); });

  return {
    start, ensure, connect, disconnect, queue, queueImage, pull, flush, merge3, cfg, signIn, signUp, signOut, verify, setPassword, members, setMember, removeMember,
    names, pinSignIn, changePin, people, setPin, setRole, removePerson,
    get pinName() { return cfg()?.session?.pinName || ''; }, get user() { return cfg()?.session?.email || cfg()?.session?.pinName || ''; },
    get status() { return status; }, get locked() { return locked(); }, get error() { return error; }, get pending() { return Object.keys(outbox).length; },
    get role() { return cfg()?.session ? role : null; }, get email() { return cfg()?.session?.email || ''; },
    get name() { return cfg()?.session ? cfg().name || '' : ''; }
  };
})();
