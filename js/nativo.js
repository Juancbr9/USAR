// Dentro de la app de Android (existe USARNative): imprimir, compartir, descargas, avisos, vibración y pantalla encendida
// van por Android, que es lo que la ventana de la app no hace sola. En el navegador no cambia nada.
(() => {
  const N = window.USARNative;
  if (!N) return;
  const b64 = blob => new Promise((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1] || '');
    r.onerror = ko;
    r.readAsDataURL(blob);
  });
  const enviar = async (files, title = '') => {
    for (const f of files) N.prepararArchivo(await b64(f), f.name || 'archivo', f.type || 'application/octet-stream');
    N.compartirArchivos(title, files.length === 1 ? files[0].type : '*/*');
  };

  Object.defineProperty(navigator, 'standalone', { value: true });

  // Pantalla completa: la cabecera llega hasta arriba y Android dice cuánto ocupan la barra de estado, la cámara y la de gestos
  const margenes = m => { for (const k of 'tblr') if (m[k] != null) document.documentElement.style.setProperty(`--sa-${k}`, `${m[k]}px`); };
  window.__usarMargenes = margenes;
  if (N.margenes) try { margenes(JSON.parse(N.margenes())); } catch (e) {}
  window.print = () => N.imprimir(document.title);
  navigator.canShare = () => true;
  navigator.share = async ({ files, text, title, url } = {}) => {
    if (files?.length) return enviar([...files], title);
    N.compartirTexto([text, url].filter(Boolean).join('\n'), title || '');
  };

  // Descargas (<a download>) y enlaces que salen de la app
  // La política de seguridad no deja leer blob: con fetch: se guardan al crearlos
  const blobs = new Map(), crear = URL.createObjectURL, quitar = URL.revokeObjectURL;
  URL.createObjectURL = o => { const u = crear(o); if (o instanceof Blob) blobs.set(u, o); return u; };
  URL.revokeObjectURL = u => { setTimeout(() => blobs.delete(u), 60000); quitar(u); };
  const deData = u => {
    const i = u.indexOf(','), cab = u.slice(5, i), d = u.slice(i + 1), type = cab.split(';')[0];
    return new Blob([/;base64/.test(cab) ? Uint8Array.from(atob(d), c => c.charCodeAt(0)) : decodeURIComponent(d)], { type });
  };
  const descargar = a => {
    const b = a.href.startsWith('data:') ? deData(a.href) : blobs.get(a.href);
    if (b) enviar([new File([b], a.download, { type: b.type })]);
  };
  const fuera = a => a.href && !a.href.startsWith(location.origin) && !a.href.startsWith('blob:') && !a.href.startsWith('data:');
  const clic = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (this.download && /^(blob|data):/.test(this.href)) return void descargar(this);
    if (fuera(this) || this.target === '_blank') return N.abrir(this.href);
    clic.call(this);
  };
  addEventListener('click', e => {
    const a = e.target.closest?.('a[href]');
    if (!a || e.defaultPrevented) return;
    if (a.download && /^(blob|data):/.test(a.href)) { e.preventDefault(); descargar(a); }
    else if (fuera(a) || a.target === '_blank') { e.preventDefault(); N.abrir(a.href); }
  });
  window.open = url => (N.abrir(new URL(url, location.href).href), null);

  // Avisos
  let permiso = N.permisoAvisos();
  window.Notification = class {
    constructor(title, o = {}) { N.aviso(String(title), String(o.body || '')); }
    static get permission() { return permiso; }
    static requestPermission() { return new Promise(ok => { window.__usarAvisos = p => { permiso = p; ok(p); }; N.pedirAvisos(); }); }
  };
  if (window.ServiceWorkerRegistration) ServiceWorkerRegistration.prototype.showNotification = async (title, o) => { new Notification(title, o); };

  navigator.vibrate = p => (N.vibrar(JSON.stringify([].concat(p))), true);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: async t => N.copiar(String(t)) } });
  Object.defineProperty(navigator, 'wakeLock', { value: { request: async () => {
    N.pantallaEncendida(true);
    const w = new EventTarget();
    w.release = async () => { N.pantallaEncendida(false); w.dispatchEvent(new Event('release')); };
    return w;
  } } });
})();
