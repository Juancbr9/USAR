'use strict';
// USAR 242 · Arranque de la app

/* ==================== ARRANQUE ==================== */
const VIEWS = {
  avisos: viewAvisos, contenedor: viewContenedor, revista: viewRevista,
  operaciones: viewOperaciones, consumibles: viewConsumibles, ajustes: viewAjustes, guia: viewGuia, despliegue: viewDespliegue, personal: viewPersonal, vencimientos: viewVencimientos, listas: viewListas, calendario: viewCalendario, manual: viewManual,
  vehiculos: viewVehiculos, intervenciones: () => viewMissionList('intervencion'), ejercicios: () => viewMissionList('ejercicio'), revision: viewRevision, pasillo: viewPasillo, armarios: viewArmarios, otros: viewOtros, entregas: viewEntregas,
  maniobras: () => viewActs('maniobra'), convoy: () => viewActs('convoy')
};

document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = ic(el.dataset.icon, el.dataset.cls || 'i'); });
applyTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (!prefs.theme) applyTheme(); });
navigator.storage?.persist?.().catch(() => {});   // pide al navegador que no borre los datos
addEventListener('keydown', e => { if (e.key === 'Escape') { if (closeZoom()) return; toggleDrawer(false); closeModal(); clearSearch(); } });
addEventListener('hashchange', handleHash);

const nuevo = Sync.ensure();   // móvil nuevo: se conecta solo a la base de datos del equipo
seedDefaults(!!Sync.cfg() && !nuevo);
render();
Sync.start();
handleHash();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // Cuando llega una versión nueva, la página se recarga sola una vez
  const hadController = !!navigator.serviceWorker.controller;
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController && !reloaded) { reloaded = true; location.reload(); }
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
    .then(reg => { reg.update(); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update(); }); })
    .catch(() => {});
}
