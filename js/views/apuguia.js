'use strict';
// USAR 242 · Guía de corte de cada pieza de madera: la forma exacta de cada extremo según la cara en la que apoya
// (escuadra, bisel, encuentro con tope, dos aguas o esquina), con las medidas para marcarla y un dibujo de cómo encaja.
// La geometría la da cada tipo en apucortes.js (o.p(..., geo)): ángulo de la pieza y, en cada extremo, el ángulo de la cara
// contra la que apoya (0 = horizontal, 90 = vertical), qué pieza es y si lleva tope a escuadra.

const AG_R = Math.PI / 180;
// Recorta un polígono con el semiplano a·x + b·y ≤ c (Sutherland–Hodgman)
function agClip(poly, a, b, c) {
  const out = [], f = p => a * p[0] + b * p[1] - c;
  poly.forEach((p, i) => {
    const q = poly[(i + 1) % poly.length], fp = f(p), fq = f(q);
    if (fp <= 1e-9) out.push(p);
    if ((fp < -1e-9 && fq > 1e-9) || (fp > 1e-9 && fq < -1e-9)) { const t = fp / (fp - fq); out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]); }
  });
  return out;
}
// Semiplano que contiene el punto de dentro, limitado por la recta que pasa por Q con ángulo phi (grados, en la pieza)
function agHalf(poly, Q, phi, inside) {
  const dx = Math.cos(phi * AG_R), dy = Math.sin(phi * AG_R), a = -dy, b = dx, c = a * Q[0] + b * Q[1];
  return a * inside[0] + b * inside[1] <= c ? agClip(poly, a, b, c) : agClip(poly, -a, -b, -c);
}
const agNorm = phi => ((phi % 180) + 180) % 180;          // 0..180
const agDev = phi => Math.abs(90 - agNorm(phi));          // grados fuera de escuadra

// Forma de la pieza en sus coordenadas: x a lo largo (de 0 a L), y a lo ancho (de 0 a w)
function agPieza(L, w, geo) {
  const ends = geo.ends || [{}, {}], alpha = geo.ang || 0, mid = [L / 2, w / 2], info = [];
  let poly = [[-2 * L - 50, 0], [3 * L + 50, 0], [3 * L + 50, w], [-2 * L - 50, w]];
  ends.forEach((e, k) => {
    const X = k ? L : 0, sgn = k ? 1 : -1, it = { k, on: e.on || '', topeOn: e.topeOn || '', tipo: 'esc', dev: 0, d: 0, tope: 0 };
    if (e.s2 != null) {                                     // dos caras: dos aguas o esquina, con la punta en el eje
      const Q = [X, w / 2], p1 = e.s - alpha, p2 = e.s2 - alpha;
      poly = agHalf(poly, Q, p1, mid); poly = agHalf(poly, Q, p2, mid);
      it.tipo = 'dos'; it.dev = agDev(p1); it.dev2 = agDev(p2);
    } else {
      const phi = (e.s ?? alpha + 90) - alpha, sn = Math.sin(phi * AG_R);
      if (Math.abs(sn) < 0.02 || agDev(phi) < 0.3) poly = agClip(poly, sgn, 0, sgn * X);
      else {
        const D = w * Math.cos(phi * AG_R) / sn;               // lo que avanza el corte de un canto al otro
        const Q = k ? [X, D >= 0 ? w : 0] : [X, D >= 0 ? 0 : w];
        poly = agHalf(poly, Q, phi, mid);
        it.tipo = 'bis'; it.dev = agDev(phi); it.d = Math.abs(D); it.lado = (k ? D >= 0 : D < 0) ? 'w' : '0';   // canto donde queda la punta
        if (e.tope) {
          const t = Math.min(e.tope, w - 1), xt = X - sgn * Math.abs(D) * t / w;
          poly = agClip(poly, sgn, 0, sgn * xt);
          it.tope = t; it.xt = xt;
        }
      }
    }
    info.push(it);
  });
  const ys = [0, w].map(y => poly.filter(p => Math.abs(p[1] - y) < 1e-6).map(p => p[0]));
  const largo = ys.map(xs => xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0);
  return { poly, info, largo, w, L, alpha };
}

// Nombre de cada extremo según hacia dónde queda en la obra
function agNombres(geo, L) {
  const a = (geo.ang || 0) * AG_R, y1 = Math.sin(a) * L;
  if (Math.abs(Math.sin(a)) < 0.15) return Math.cos(a) >= 0 ? ['Extremo izquierdo', 'Extremo derecho'] : ['Extremo derecho', 'Extremo izquierdo'];
  return y1 >= 0 ? ['Abajo (pie)', 'Arriba (cabeza)'] : ['Arriba (cabeza)', 'Abajo (pie)'];
}

function apuGuiaPieza(p) {
  const m = String(p.s).match(/([\d.,]+)\s*×\s*([\d.,]+)/), a = m ? +m[1].replace(',', '.') : 10, g = m ? +m[2].replace(',', '.') : 10;
  const geo = p.geo || { ang: 0, ends: [{ s: 90 }, { s: 90 }] }, alpha = geo.ang || 0;
  const horiz = Math.abs(Math.sin(alpha * AG_R)) < 0.02;
  const w = geo.w || (geo.ras ? a : horiz ? g : a), L = Math.max(p.l, 2 * w + 2);
  const P = agPieza(L, w, geo), names = agNombres(geo, L);
  const allSq = P.info.every(i => i.tipo === 'esc');
  const svg = agDibujo(P, p, geo, names, a, g);
  const lado = P.largo[0] && P.largo[1] && Math.abs(P.largo[0] - P.largo[1]) >= 0.5;
  const pasos = [
    `Largo: ${acF(p.l)} cm${lado ? ` por el lado largo; el otro canto mide ${acF(Math.min(...P.largo))} cm` : ''}. Sección ${p.s}${w !== a ? ` (de canto: ${acF(w, 1)} cm)` : ''}.`,
    ...P.info.map(i => {
      const n = names[i.k];
      const apoyo = on => /^(a ras|sobresale)/i.test(on) ? `queda ${on.toLowerCase()}` : `apoya en ${on.toLowerCase()}`;
      if (i.tipo === 'esc') return `${n}: a escuadra${i.on ? `; ${apoyo(i.on)}` : ''}.`;
      if (i.tipo === 'dos') return `${n}: dos cortes que se juntan en el centro de la cara, a ${acF(i.dev)}° y ${acF(i.dev2)}° fuera de escuadra${i.on ? `; encaja en ${i.on.toLowerCase()}` : ''}.`;
      return `${n}: ${acF(i.dev)}° fuera de escuadra. En el canto corto, marca ${acF(i.d, 1)} cm hacia dentro desde la esquina y traza la línea hasta la punta del canto largo${i.tope ? `; después corta a escuadra los últimos ${acF(i.tope, 1)} cm de canto (tope${i.topeOn ? ' contra ' + i.topeOn.toLowerCase() : ''})` : ''}${i.on ? `. ${apoyo(i.on).replace(/^./, c => c.toUpperCase())}` : ''}.`;
    }),
    geo.ras ? 'Se clava por la cara: los extremos quedan a ras de la pieza en la que se clavan (preséntala en su sitio y marca si hace falta).' : ''
  ].filter(Boolean);
  return `<figure class="apu-fig apu-guia-fig">${svg}<figcaption>${allSq ? 'Pieza recta: los dos extremos a escuadra.' : 'Arriba, la pieza para marcarla; abajo, cómo encaja cada extremo.'}</figcaption></figure>
    <ul class="apu-mont-p">${pasos.map(x => `<li>${typeof amFmt === 'function' ? amFmt(x) : esc(x)}</li>`).join('')}</ul>`;
}

// Dibujo: la pieza tumbada (con corte en el centro si es larga) y, debajo, cada extremo en su sitio con la pieza en la que apoya
function agDibujo(P, p, geo, names, a, g) {
  const { poly, info, w } = P, xs = poly.map(q => q[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), span = x1 - x0;
  const e = Math.max(3.2 * w, 40), gap = 26, larga = span > 2 * e + gap + 10;
  const parts = [];
  if (larga) {
    const left = agClip(poly, 1, 0, x0 + e), right = agClip(poly, -1, 0, -(x1 - e)).map(q => [q[0] - (span - 2 * e) + gap, q[1]]);
    parts.push(left, right);
  } else parts.push(poly);
  const mapX = x => larga && x > x0 + e + 1e-6 ? x - (span - 2 * e) + gap : x;
  const shopW = larga ? 2 * e + gap : span;
  // Encajes: cada extremo con lo que tiene al lado, girado como queda en la obra
  const R = Math.max(4 * w, 45), views = [];
  info.forEach(it => {
    const k = it.k, cut = k ? agClip(poly, -1, 0, -(x1 - R)) : agClip(poly, 1, 0, x0 + R);
    const ca = Math.cos(P.alpha * AG_R), sa = Math.sin(P.alpha * AG_R), rot = q => [q[0] * ca - q[1] * sa, q[0] * sa + q[1] * ca];
    const tip = k ? x1 : x0, piece = cut.map(rot), blocks = [];
    const end = geo.ends?.[k] || {};
    const surf = (s, Q, label, cls) => {          // bloque de 14 de grueso a lo largo de la cara, por fuera de la pieza
      const u = [Math.cos(s * AG_R), Math.sin(s * AG_R)], nrm = [-u[1], u[0]], cen = rot([k ? tip - R / 2 : tip + R / 2, w / 2]);
      const side = ((cen[0] - Q[0]) * nrm[0] + (cen[1] - Q[1]) * nrm[1]) > 0 ? -1 : 1, Lb = R * 1.5, T = 14;
      const A = [Q[0] - u[0] * Lb / 2, Q[1] - u[1] * Lb / 2], B = [Q[0] + u[0] * Lb / 2, Q[1] + u[1] * Lb / 2];
      blocks.push({ pts: [A, B, [B[0] + nrm[0] * side * T, B[1] + nrm[1] * side * T], [A[0] + nrm[0] * side * T, A[1] + nrm[1] * side * T]], label, lp: [Q[0] + nrm[0] * side * (T + 10), Q[1] + nrm[1] * side * (T + 10)], cls });
    };
    if (it.tipo === 'dos') { const Q = rot([tip, w / 2]); surf(end.s, Q, end.on || '', geo.ras ? 'aw2 back' : 'awall'); surf(end.s2, Q, '', geo.ras ? 'aw2 back' : 'awall'); }
    else {
      const sAng = end.s ?? P.alpha + 90;
      // centro de la cara de corte: media de los puntos del corte en el extremo
      const ptsEnd = poly.filter(q => k ? q[0] > x1 - (it.d || 0) - 0.6 : q[0] < x0 + (it.d || 0) + 0.6).filter(q => !(it.tope && Math.abs(q[0] - it.xt) < 1e-6 && Math.abs(q[1] - (it.lado === 'w' ? w : 0)) < 1e-6));
      const cx = ptsEnd.reduce((s2, q) => s2 + q[0], 0) / ptsEnd.length, cy = ptsEnd.reduce((s2, q) => s2 + q[1], 0) / ptsEnd.length;
      surf(sAng, rot([cx, cy]), end.on || '', geo.ras ? 'aw2 back' : 'awall');
      if (it.tope) {
        const yT = it.lado === 'w' ? [w - it.tope, w] : [0, it.tope], d2 = k ? 1 : -1;
        const tb = [[it.xt, yT[0] - 4], [it.xt + d2 * 12, yT[0] - 4], [it.xt + d2 * 12, yT[1] + 4], [it.xt, yT[1] + 4]].map(rot);
        blocks.push({ pts: tb, label: end.topeOn || 'Tope', lp: rot([it.xt + d2 * 22, (yT[0] + yT[1]) / 2]), cls: 'aw2' });
      }
    }
    views.push({ piece, blocks, it });
  });
  // Colocar: la pieza arriba; los encajes debajo, uno al lado del otro
  const bb = pts => { const X = pts.map(q => q[0]), Y = pts.map(q => q[1]); return [Math.min(...X), Math.min(...Y), Math.max(...X), Math.max(...Y)]; };
  let cursor = 0; const placed = [];
  views.forEach(v => {
    const all = [...v.piece, ...v.blocks.flatMap(b => b.pts)], b = bb(all), dx = cursor - b[0], dy = -40 - b[3];
    placed.push({ ...v, dx, dy, b });
    cursor += b[2] - b[0] + 40;
  });
  const fitW = Math.max(cursor - 40, 1), fitH = Math.max(...placed.map(v => v.b[3] - v.b[1]), 1);
  const W = Math.max(shopW, fitW), H = w + 40 + fitH + 40;
  return apuFig(W, H, G => {
    const off = (W - shopW) / 2 - x0;
    parts.forEach(pp => G.poly(pp.map(q => [q[0] + off, q[1]]), geo.ras ? 'aw2' : 'aw'));
    if (larga) { const xb = x0 + e + gap / 2 + off; G.line(xb - 6, -6, xb + 2, w / 2, 'aln').line(xb + 2, w / 2, xb - 4, w + 6, 'aln'); }
    // Cotas: largo total arriba y los cantos
    G.dim(mapX(x0) + off, w + 14, mapX(x1) + off, w + 14, `${acF(p.l)} cm`);
    info.forEach(it => {
      if (it.tipo === 'bis' && it.d >= 0.8) {
        const tip = it.k ? x1 : x0, yE = it.lado === 'w' ? 0 : w, xs2 = it.k ? [tip - it.d, tip] : [tip, tip + it.d], yy = it.lado === 'w' ? -10 : w + 26;
        G.dim(mapX(xs2[0]) + off, yy, mapX(xs2[1]) + off, yy, `${acF(it.d, 1)}`);
        void yE;
      }
      const tx = mapX(it.k ? x1 : x0) + off + (it.k ? 6 : -6);
      G.text(tx, w / 2 - 4, it.tipo === 'esc' ? 'escuadra' : it.tipo === 'dos' ? `${acF(it.dev)}° / ${acF(it.dev2)}°` : `${acF(it.dev)}°${it.tope ? ` · tope ${acF(it.tope, 1)}` : ''}`, 10, it.k ? 'start' : 'end', 'adt');
    });
    // Encajes
    placed.forEach((v, i) => {
      const T = q => [q[0] + v.dx + (W - fitW) / 2, q[1] + v.dy];
      v.blocks.forEach(b => G.poly(b.pts.map(T), b.cls === 'awall' ? 'aload' : b.cls));
      G.poly(v.piece.map(T), geo.ras ? 'aw2' : 'aw');
      v.blocks.forEach(b => b.label && G.text(...T(b.lp), b.label, 9, 'middle', 'adt'));
      const c = bb(v.piece.map(T));
      G.text((c[0] + c[2]) / 2, Math.max(c[3], ...v.blocks.flatMap(b => b.pts.map(T).map(q => q[1]))) + 10, names[v.it.k], 11, 'middle', 'atx');
      void i;
    });
  }, `${p.n}: cómo se corta y cómo encaja`);
}
