'use strict';
// USAR 242 · Dibujos del marcaje INSARAG: caja de worksite, marca de víctimas y marcaje rápido (RCM)
// Se dibujan en naranja sobre un fondo de pared, igual que se pintan con spray.

const PAINT = '#ff6a13';
const MONTHS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const markDate = iso => { if (!iso) return ''; const d = new Date(iso + 'T00:00'); return String(d.getDate()).padStart(2, '0') + MONTHS[d.getMonth()]; };
const teamCode = () => TEAM_CODE;

function wallSvg(w, h, inner, label) {
  return `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" class="mark-svg" xmlns="http://www.w3.org/2000/svg">
    <defs><pattern id="brick" width="60" height="30" patternUnits="userSpaceOnUse">
      <rect width="60" height="30" fill="#b9bdb6"/><path d="M0 .5h60M0 15.5h60M30 0v15M.5 15v15" stroke="#a5aaa2" stroke-width="1.5"/></pattern></defs>
    <rect width="${w}" height="${h}" rx="8" fill="url(#brick)"/>
    <g fill="${PAINT}" stroke="${PAINT}" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800">${inner}</g>
  </svg>`;
}

// Caja de worksite: 1,2 × 1,0 m. Dentro: ID (40 cm), equipo, nivel ASR y fecha. Arriba: riesgos. Abajo: categoría.
function worksiteMarkSvg(ws) {
  const W = 420, H = 300, x = 50, y = 46, bw = 320, bh = 190;
  const rows = (ws.asr || []).slice(-4);
  const hazards = (ws.hazards || '').toUpperCase().slice(0, 32);
  const rowsSvg = rows.map((r, i) => {
    const ry = y + 128 + i * 17 - (rows.length > 3 ? (rows.length - 3) * 8 : 0);
    return `<text x="${x + 14}" y="${ry}" font-size="16" stroke="none">${esc(r.team)}  ASR ${r.level}</text>
            <text x="${x + bw - 14}" y="${ry}" font-size="16" stroke="none" text-anchor="end">${esc(markDate(r.date))}</text>`;
  }).join('');
  return wallSvg(W, H, `
    ${hazards ? `<text x="${W / 2}" y="32" font-size="20" stroke="none" text-anchor="middle">${esc(hazards)}</text>` : ''}
    <rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="none" stroke-width="6" stroke-linejoin="round"/>
    <text x="${W / 2}" y="${y + 92}" font-size="78" stroke="none" text-anchor="middle">${esc(ws.code || '?')}</text>
    ${rows.length ? `<path d="M${x} ${y + 108}h${bw}" stroke-width="3"/>` : ''}
    ${rowsSvg}
    ${ws.status === 'done' ? `<path d="M${x - 14} ${y + bh / 2}h${bw + 28}" stroke-width="7"/>` : ''}
    ${ws.cat ? `<text x="${W / 2}" y="${y + bh + 42}" font-size="38" stroke="none" text-anchor="middle">${esc(ws.cat)}</text>` : ''}
    <path d="M${x + 6} ${y + bh + 14}l-30 32m0 0h20m-20 0v-20" fill="none" stroke-width="6" stroke-linecap="round"/>`,
  `Marcaje del worksite ${ws.code}`);
}

// Marca de víctimas: V de 50 cm, debajo L-n (vivas) y D-n (fallecidas). Lo ya rescatado se tacha.
function victimMarkSvg(vs) {
  const lines = [];
  const add = (letter, all, left) => {
    if (!all) return;
    if (left < all) lines.push([`${letter}-${all}`, true]);
    if (left > 0) lines.push([`${letter}-${left}`, false]);
  };
  const live = vs.filter(v => v.state === 'viva'), dead = vs.filter(v => v.state === 'fallecida');
  const pending = v => !['extraida', 'entregada'].includes(v.status);
  add('L', live.length, live.filter(pending).length);
  add('D', dead.length, dead.filter(pending).length);
  const H = 150 + lines.length * 34;
  return wallSvg(220, H, `
    <path d="M60 24l50 100 50-100" fill="none" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>
    ${lines.map(([t, struck], i) => `<text x="110" y="${160 + i * 34}" font-size="32" stroke="none" text-anchor="middle">${t}</text>
      ${struck ? `<path d="M62 ${150 + i * 34}h96" stroke-width="5"/>` : ''}`).join('')}`,
  'Marca de víctimas');
}

// Marcaje rápido (RCM): rombo con C (despejado) o D (solo fallecidos), equipo y fecha debajo
function rcmSvg(letter, team, iso) {
  return wallSvg(200, 210, `
    <path d="M100 18l64 64-64 64-64-64z" fill="none" stroke-width="7" stroke-linejoin="round"/>
    <text x="100" y="100" font-size="54" stroke="none" text-anchor="middle">${letter}</text>
    <text x="100" y="172" font-size="20" stroke="none" text-anchor="middle">${esc(team)}</text>
    <text x="100" y="196" font-size="20" stroke="none" text-anchor="middle">${esc(markDate(iso))}</text>`,
  letter === 'C' ? 'Marcaje rápido: despejado' : 'Marcaje rápido: solo fallecidos');
}

// Orientación de la estructura: lados 1–4 en sentido horario desde la fachada y cuadrantes A–D (+E central)
function orientationSvg() {
  return `<svg viewBox="0 0 240 220" class="mark-svg" role="img" aria-label="Lados y cuadrantes de una estructura" xmlns="http://www.w3.org/2000/svg">
    <rect width="240" height="220" rx="8" fill="var(--sunk)"/>
    <g font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="800" fill="var(--ink)" text-anchor="middle">
      <rect x="50" y="40" width="140" height="130" fill="var(--surface)" stroke="var(--ink)" stroke-width="3"/>
      <path d="M120 40v130M50 105h140" stroke="var(--line-2)" stroke-width="2" stroke-dasharray="5 4"/>
      <rect x="102" y="88" width="36" height="34" fill="var(--yellow-soft)" stroke="var(--warn)" stroke-width="2"/>
      <text x="85" y="160" font-size="24">A</text><text x="85" y="78" font-size="24">B</text>
      <text x="155" y="78" font-size="24">C</text><text x="155" y="160" font-size="24">D</text><text x="120" y="112" font-size="20">E</text>
      <text x="120" y="200" font-size="17">LADO 1 · FACHADA</text>
      <text x="30" y="110" font-size="17">2</text><text x="120" y="28" font-size="17">LADO 3</text><text x="212" y="110" font-size="17">4</text>
    </g></svg>`;
}
