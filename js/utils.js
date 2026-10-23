'use strict';
// USAR 242 · Utilidades: fechas, avisos breves, tema, vibración, pantalla encendida y compartir

/* ==================== UTILIDADES ==================== */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Texto dentro de un onclick="...": literal de JavaScript seguro (comillas, barras y etiquetas escapadas)
const jsq = s => esc(JSON.stringify(String(s ?? '')));
const uid = prefix => prefix + '-' + (Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 5)).toUpperCase();
const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
const daysTo = iso => Math.round((new Date(iso + 'T00:00') - new Date(todayISO() + 'T00:00')) / 864e5);
const fmtDate = iso => iso ? new Date(iso + 'T00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
const fmtWhen = ts => new Date(ts).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const byName = (a, b) => a.name.localeCompare(b.name, 'es');
const appUrl = () => location.href.split('#')[0];
const b64 = s => btoa(String.fromCharCode(...new TextEncoder().encode(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64 = s => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));

function readJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { toast('La memoria del dispositivo está llena. Quita alguna foto.', 'bad'); return false; }
}

function due(iso) {
  if (!iso) return null;
  const n = daysTo(iso);
  if (n < 0) return { n, cls: 'bad', text: `Vencido hace ${-n} d` };
  if (n === 0) return { n, cls: 'bad', text: 'Vence hoy' };
  if (n <= SOON_DAYS) return { n, cls: 'warn', text: `Vence en ${n} d` };
  return { n, cls: 'neutral', text: fmtDate(iso) };
}
const isDueSoon = iso => !!iso && daysTo(iso) <= SOON_DAYS;
const dueTag = (iso, prefix = '') => { const d = due(iso); return d ? `<span class="tag ${d.cls}">${ic('clock', 'i-sm')} ${prefix}${d.text}</span>` : ''; };

let toastTimer;
function toast(msg, kind = 'ok') {
  const el = $('toast');
  el.innerHTML = ic(kind === 'bad' ? 'x' : 'checkc') + `<span>${esc(msg)}</span>`;
  el.className = 'toast ' + kind;
  requestAnimationFrame(() => el.classList.add('show'));
  haptic(kind === 'bad' ? [30, 40, 30] : 12);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// Respuesta al tacto en las acciones importantes (como en PadelMetric)
function haptic(pattern = 12) {
  if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  try { navigator.vibrate?.(pattern); } catch {}
}

// Modo claro / noche
// Modos de pantalla: claro, noche y sol (alto contraste para trabajar a pleno sol). «Botones grandes» se suma a cualquiera.
const currentTheme = () => prefs.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
function applyTheme() {
  const theme = currentTheme(), root = document.documentElement;
  root.dataset.theme = theme === 'sun' ? 'light' : theme;
  if (theme === 'sun') root.dataset.sun = '1'; else delete root.dataset.sun;
  root.classList.toggle('big', !!prefs.big);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', theme === 'dark' ? '#0E1611' : theme === 'sun' ? '#000000' : '#22382A');
  const btn = $('themeBtn');
  if (btn) btn.innerHTML = ic(theme === 'light' ? 'moon' : theme === 'dark' ? 'sunbright' : 'sun', 'i-lg');
}
function toggleTheme() {
  haptic(10);
  const next = { light: 'dark', dark: 'sun', sun: 'light' }[currentTheme()];
  setPref({ theme: next });
  applyTheme();
  toast({ light: 'Modo claro', dark: 'Modo noche', sun: 'Modo sol: alto contraste' }[next]);
}

// Mantiene la pantalla encendida durante una operación en curso o una revista
let wakeLock = null;
async function updateWakeLock() {
  const needed = document.visibilityState === 'visible' && (
    !!prefs.draft || (prefs.tab === 'operaciones' && get('missions', prefs.mission)?.status === 'active'));
  try {
    if (needed && !wakeLock && 'wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!needed && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { wakeLock = null; }
}
document.addEventListener('visibilitychange', updateWakeLock);

// Compartir con el menú del sistema; si no existe, se copia el texto
async function shareText(text, title = 'USAR 242') {
  haptic(12);
  if (navigator.share) { try { await navigator.share({ title, text }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(text); toast('Texto copiado: pégalo donde quieras'); }
  catch { toast('No se pudo compartir', 'bad'); }
}

const initials = name => (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const avatar = (name, cls = '') => `<span class="avatar ${cls}" aria-hidden="true">${esc(initials(name))}</span>`;
