'use strict';
// USAR 242 · Montaje paso a paso de cada apuntalamiento con las medidas de la calculadora: en cada paso, el dibujo a escala
// con lo ya montado en gris, lo nuevo en naranja y las cotas exactas (dónde va cada pieza y a qué distancia).
// Las medidas salen de las mismas fórmulas que la lista de cortes (js/views/apucortes.js).

const amCm = x => `${acF(x)} cm`;
// Madera de cada función y demás medidas, las mismas que en la lista de cortes (apucortes.js)
const amN = (v, k, def) => v['n_' + k] ?? def;
const amG = (v, k) => apuMad(v, k).g, amA = (v, k) => apuMad(v, k).a;
const amLista = xs => xs.map(x => acF(x)).join(', ') + ' cm';
// n puntos repartidos entre a y b (con los dos extremos)
const amRep = (a, b, n) => n < 2 ? [(a + b) / 2] : Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
// Cotas seguidas en vertical: del suelo a la primera altura y de cada una a la siguiente
const amCotasV = (G, x, ys, left) => ys.forEach((y, i) => G.dim(x, i ? ys[i - 1] : 0, x, y, amCm(y - (i ? ys[i - 1] : 0)), left));
// Puntal de pie entre y0 (cara de la solera) e y1 (cara de la cumbrera) con su par de cuñas de alto cu
const amPost = (G, x, y0, y1, cu, w = 10, cw = 30) => { G.cunas(x - cw / 2, y0, cw, cu); G.rect(x - w / 2, y0 + cu, w, y1 - y0 - cu); };
// Bridas: sobre una pieza vertical en x, o a lo largo de una pieza inclinada de p a q (fracciones fr)
const amBridasV = (G, x, ys, w) => ys.forEach((y, i) => G.bar(x - w, y - (i % 2 ? -6 : 6), x + w, y + (i % 2 ? -6 : 6), 3, 'am'));
function amBridasL(G, p, q, fr, w) {
  const a = Math.atan2(q[1] - p[1], q[0] - p[0]), nx = -Math.sin(a) * w, ny = Math.cos(a) * w, tx = Math.cos(a) * 6, ty = Math.sin(a) * 6;
  fr.forEach((f, i) => { const x = p[0] + (q[0] - p[0]) * f, y = p[1] + (q[1] - p[1]) * f, k = i % 2 ? 1 : -1; G.bar(x - nx + k * tx, y - ny + k * ty, x + nx - k * tx, y + ny - k * ty, 3, 'am'); });
}
// Puntal de obra inclinado entre dos puntos (tubo exterior, interior y tuerca)
function amPropL(G, a, b) {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], an = Math.atan2(b[1] - a[1], b[0] - a[0]), u = [Math.cos(an) * 4, Math.sin(an) * 4];
  G.bar(a[0], a[1], m[0], m[1], 12, 'am').bar(m[0], m[1], b[0], b[1], 8, 'am2').bar(m[0] - u[0], m[1] - u[1], m[0] + u[0], m[1] + u[1], 18, 'am3');
}
// HOLMATRO de pie: cabezal, puntal, recorrido, extensiones (las cortas al final) y cabezal. Devuelve dónde empieza y acaba el recorrido.
const AM_EXT_CLS = { roja: 'ahol', verde: 'axg', amarilla: 'aes', azul: 'axb', blanca: 'axw' };
function amHolmStack(G, x, y0, y1, c, h, cab) {
  const hc = cab > 0 ? cab / 2 : 0; let y = y0 + hc;
  const body = h[2] / 10, ext = c ? c.ext / 10 : 0;
  G.rect(x - 10, y, 20, body, 'am').rect(x - 14, y + body - 8, 28, 8, 'am3'); y += body;
  const e0 = y;
  if (ext > 0) { G.rect(x - 6, y, 12, ext, 'am2'); y += ext; }
  const e1 = y;
  (c?.list || []).forEach(e => { const l = e[1] / 10; G.rect(x - 8, y, 16, l, AM_EXT_CLS[e[2]] || 'am'); y += l; });
  return { e0, e1 };
}
const amCabezales = (G, xs, y0, y1, cab) => { const hc = cab > 0 ? cab / 2 : 3; xs.forEach(x => G.rect(x - 18, y0, 36, hc, 'am').rect(x - 18, y1 - hc, 36, hc, 'am')); };
const amHolmTxt = (c, h) => c ? `puntal ${h[1]} (cerrado ${acF(h[2] / 10, 1)} cm)${c.list.length ? ' + ' + c.list.map(e => `${e[0]} ${e[2]} (${acF(e[1] / 10, 1)} cm)`).join(' + ') : ''}, extendido ${acF(c.ext / 10, 1)} cm` : '';

/* ==================== CADA TIPO ==================== */
// Cada tipo devuelve { W, H (tamaño de la escena), base (lo que ya está: suelo, muros, carga), steps, fin (cotas del final) }.
// Cada paso: t (título), p (qué hacer, con las medidas), pz (códigos de la lista de cortes), d (piezas nuevas) y c (cotas del paso).
function amDosGeo(v) {
  const S = amG(v, 'S'), C = amG(v, 'C'), pa = amA(v, 'P'), cu = amN(v, 'cu', 4), vol = amN(v, 'vol', 30), H = v.H, sep = v.sep, L = sep + 2 * vol, P = H - S - C - cu, xs = [vol, vol + sep], nh = H > 335 ? 2 : 1;
  const hs = nh === 2 ? [H / 3, 2 * H / 3] : [H / 2], lv = [S + 2, ...hs, H - C - 2];
  return { cu, H, sep, L, P, xs, nh, hs, lv, S, C, pa, vol };
}
// Partes del sistema de dos puntales desplazadas (dx, dy): para la torre se dibuja también el par del fondo
const amDos = {
  cs: (G, D, dx = 0, dy = 0) => G.rect(dx, dy, D.L, D.S).rect(dx, D.H - D.C + dy, D.L, D.C),
  posts: (G, D, dx = 0, dy = 0) => D.xs.forEach(x => amPost(G, x + dx, D.S + dy, D.H - D.C + dy, D.cu, D.pa)),
  rh: (G, D, dx = 0, dy = 0) => D.hs.forEach(y => G.rect(D.xs[0] - D.pa / 2 + dx, y - 4.5 + dy, D.sep + D.pa, 9, 'aw2')),
  rd: (G, D, dx = 0, dy = 0) => D.lv.slice(1).forEach((y, i) => { const ya = D.lv[i]; G.bar(D.xs[0] + 6 + dx, (i % 2 ? y : ya) + dy, D.xs[1] - 6 + dx, (i % 2 ? ya : y) + dy, 7, 'aw2'); }),
  pl: (G, D, dx = 0, dy = 0) => D.xs.forEach(x => G.plate(x - 8 + dx, D.H - 30 + dy, 16, 30, 'ap2').plate(x - 8 + dx, dy, 16, 30, 'ap2'))
};
function amDosPasos(D, quien = '') {
  const rdL = Math.hypot(D.sep, (D.H - D.S - D.C) / (D.nh + 1)) + 10;
  return [
    { t: `Cumbrera y solera${quien}`, pz: ['C', 'S'], p: [`Cumbrera y solera de ${amCm(D.L)} (la separación + ${amCm(D.vol)} de voladizo a cada lado).`, 'Pon la solera en el suelo justo debajo de la cumbrera (con la plomada) y sujeta la cumbrera contra el techo.'],
      d: G => amDos.cs(G, D), c: G => G.dim(0, D.H + 24, D.L, D.H + 24, amCm(D.L)) },
    { t: `Puntales${quien}`, pz: ['P'], p: [`Dos puntales de ${amCm(D.P)} (${amCm(D.H)} − ${acF(D.S + D.C, 1)} de solera y cumbrera − ${acF(D.cu, 1)} de cuñas).`, `Ejes a ${amCm(D.vol)} de cada extremo: separados ${amCm(D.sep)} entre ejes. Un par de cuñas bajo cada uno; apriétalas a la vez.`],
      d: G => amDos.posts(G, D), c: G => G.dim(0, D.H - 40, D.xs[0], D.H - 40, acF(D.vol)).dim(D.xs[0], D.H - 70, D.xs[1], D.H - 70, amCm(D.sep)).dim(D.L + 14, D.S + D.cu, D.L + 14, D.H - D.C, amCm(D.P)) },
    { t: `Riostra${D.nh > 1 ? 's' : ''} horizontal${D.nh > 1 ? 'es' : ''}`, pz: ['RH'], p: [`${D.nh > 1 ? 'Dos riostras' : 'Una riostra'} de ${amCm(D.sep + D.pa)} de puntal a puntal, con el centro a ${amLista(D.hs)} del suelo.`, 'Clava cada extremo con 5 clavos.'],
      d: G => amDos.rh(G, D), c: G => amCotasV(G, D.L + 14, D.hs) },
    { t: 'Riostras diagonales', pz: ['RD'], p: [`${D.nh + 1} diagonales de unos ${amCm(rdL)} en zigzag entre los puntales: de la solera a la riostra horizontal y de ahí a la cumbrera.`, 'Preséntalas en su sitio, marca y corta; luego clávalas a cada puntal.'],
      d: G => amDos.rd(G, D) },
    { t: 'Medias pletinas', p: ['Una media pletina 15×30 en cada unión puntal–cumbrera y puntal–solera: 4 clavos al puntal y 4 a la otra pieza.', 'Clava un clavo detrás de cada par de cuñas.'], d: G => amDos.pl(G, D) }
  ];
}
const amMide = (W, H, x) => ({ t: 'Mide la altura', p: [`Limpia solo el escombro donde irá la solera. Mide del suelo al techo: ${amCm(H)}. Si el techo no es plano, mide en varios puntos y quédate con la más baja.`],
  c: G => G.line(x, 0, x, H, 'acab').dim(W + 14, 0, W + 14, H, amCm(H)) });

const APU_MONTAJE = {
  /* ---------- Generalidades ---------- */
  tablon(v) {
    const L = v.L, tg = amG(v, 'T'), ta = amA(v, 'T'), bx = amN(v, 'bx', 10), nb = Math.max(3, Math.ceil((L - 2 * bx) / amN(v, 'bmax', 95)) + 1), ys = amRep(bx, L - bx, nb), sep = (L - 2 * bx) / (nb - 1), x = 40;
    return { W: 160, H: L, steps: [
      { t: 'Corta los tablones', pz: ['T'], p: [`Dos tablones de ${acF(ta, 1)}×${acF(tg, 1)} de ${amCm(L)}, cortados a escuadra.`, 'Rotula cada uno: «TABLÓN PUNTAL» y su medida.'],
        d: G => G.rect(x - tg, 0, tg, L), c: G => G.dim(x - tg - 14, 0, x - tg - 14, L, amCm(L), true) },
      { t: 'Únelos cara con cara', p: ['Pon el segundo tablón pegado al primero, con los extremos enrasados: que no quede escalón arriba ni abajo.'], d: G => G.rect(x, 0, tg, L).line(x, 0, x, L, 'aln') },
      { t: 'Pon las bridas', p: [`${nb} bridas (o pernos con pletina): a ${amCm(bx)} de cada extremo y cada ${amCm(sep)} entre ellas (entre 40 y 95 cm).`, `Alturas desde abajo: ${amLista(ys)}. Alterna la inclinación de cada brida y apriétalas bien.`],
        d: G => amBridasV(G, x, ys, tg + 4), c: G => G.dim(x + tg + 18, 0, x + tg + 18, ys[0], acF(bx)).dim(x + tg + 18, ys[0], x + tg + 18, ys[1], amCm(sep)) }
    ], fin: G => G.dim(x - tg - 14, 0, x - tg - 14, L, amCm(L), true) };
  },
  holmatro: v => amHolm(v, 1),

  /* ---------- Verticales ---------- */
  t(v) {
    const H = v.H, C = v.C, cu = amN(v, 'cu', 4), Sg = amG(v, 'S'), Cg = amG(v, 'C'), pa = amA(v, 'P'), P = H - Sg - Cg - cu, x = C / 2;
    return { W: C + 60, H, base: G => { apuSlab(G, -25, H, C + 50); G.ground(-25, C + 25); }, steps: [
      amMide(C, H, x),
      { t: 'Une el puntal a la cumbrera', pz: ['C', 'P'], p: [`Cumbrera de ${amCm(C)} y puntal de ${amCm(P)} (${amCm(H)} − ${acF(Sg, 1)} de solera − ${acF(Cg, 1)} de cumbrera − ${acF(cu, 1)} de cuñas).`,
        `Clava el puntal centrado, a ${amCm(C / 2)} de cada extremo, con una pletina 30×30 por cada lado: 5 clavos al puntal y 8 a la cumbrera.`],
        d: G => G.rect(0, H - Cg, C, Cg).rect(x - pa / 2, Sg + cu, pa, P).plate(x - 15, H - Cg - 20, 30, 30),
        c: G => G.dim(0, H + 26, C, H + 26, amCm(C)).dim(0, H - 50, x, H - 50, amCm(C / 2)).dim(x + pa / 2 + 18, Sg + cu, x + pa / 2 + 18, H - Cg, amCm(P)) },
      { t: 'Solera y cuñas', pz: ['S'], p: [`Presenta puntal y cumbrera centrados bajo la carga. Mete debajo la solera de ${amCm(C)}, alineada con la cumbrera (usa la plomada).`,
        `Entre la solera y el puntal, el par de cuñas (${acF(cu, 1)} cm): golpéalas a la vez, una contra la otra, hasta que el puntal apriete.`],
        d: G => G.rect(0, 0, C, Sg).cunas(x - 15, Sg, 30, cu), c: G => G.dim(x - 30, Sg, x - 30, Sg + cu, `${acF(cu, 1)} cm`, true) },
      { t: 'Fija la base', p: ['Comprueba con el nivel que el puntal está a plomo.', 'Un clavo detrás de las cuñas para que no se suelten y una media pletina 15×30 entre la solera y el puntal (4 clavos a cada pieza).'],
        d: G => G.plate(x - 7.5, 0, 15, 30, 'ap2') }
    ], fin: G => G.dim(C + 14, 0, C + 14, H, amCm(H)) };
  },
  fila(v) {
    const cu = amN(v, 'cu', 4), vol = amN(v, 'vol', 30), Sg = amG(v, 'S'), Cg = amG(v, 'C'), pa = amA(v, 'P'), H = v.H, L = v.L, P = H - Sg - Cg - cu;
    const n = Math.max(2, Math.ceil((L - 2 * vol) / amN(v, 'smax', 120)) + 1), sep = (L - 2 * vol) / (n - 1), xs = amRep(vol, L - vol, n), hP = H - Sg - Cg;
    const dX = Math.hypot(L - 10, hP) + 10, entera = dX <= 300, dV = Math.hypot(sep + 10, hP) + 10, rh = H > 240;
    return { W: L + 40, H, base: G => { apuSlab(G, -25, H, L + 50); G.ground(-25, L + 25); }, steps: [
      { t: 'Asegura y mide', p: ['Antes, asegura la zona (HOLMATRO, puntal de obra o una T).', `Mide la altura en tres puntos a lo largo de la zona: la más baja manda. Aquí: ${amCm(H)}.`],
        c: G => { [L * .15, L / 2, L * .85].forEach(x => G.line(x, 0, x, H, 'acab')); G.dim(L + 14, 0, L + 14, H, amCm(H)); } },
      { t: 'Cumbrera y solera', pz: ['C', 'S'], p: [`Cumbrera y solera de ${amCm(L)}.`, 'Pon la solera alineada justo debajo de la cumbrera (con la plomada). Sujeta la cumbrera nivelada con el punto más bajo; los huecos, con cuñas.'],
        d: G => G.rect(0, H - Cg, L, Cg).rect(0, 0, L, Sg), c: G => G.dim(0, H + 26, L, H + 26, amCm(L)) },
      { t: 'Puntales', pz: ['P'], p: [`${n} puntales de ${amCm(P)} con un par de cuñas cada uno.`, `Ejes a ${amCm(vol)} de los extremos y cada ${amCm(sep)}: a ${amLista(xs)} del extremo izquierdo.`],
        d: G => xs.forEach(x => amPost(G, x, Sg, H - Cg, cu, pa)),
        c: G => { G.dim(0, H - 40, xs[0], H - 40, acF(vol)); for (let i = 1; i < n; i++) G.dim(xs[i - 1], H - 70, xs[i], H - 70, amCm(sep)); } },
      rh && { t: 'Riostra horizontal central', pz: ['RH'], p: [`Pasa de 2,4 m: riostra horizontal de lado a lado con el centro a ${amCm(H / 2)} del suelo, clavada a cada puntal.`],
        d: G => G.rect(0, H / 2 - 4.5, L, 9, 'aw2'), c: G => G.dim(L + 14, 0, L + 14, H / 2, amCm(H / 2)) },
      { t: 'Diagonales en cruz', pz: ['RD'], p: [entera ? `Una diagonal de unos ${amCm(dX)} por cada cara, en sentido contrario (cruz de San Andrés), de la solera a la cumbrera.` : `Entera pasaría de 3 m: una X en cada vano, de unos ${amCm(dV)}, una por cara.`, 'Clávalas a la cumbrera, a la solera y a cada puntal que crucen.'],
        d: G => entera ? G.bar(5, H - 14, L - 5, 14, 7, 'aw2 back').bar(5, 14, L - 5, H - 14, 7, 'aw2') : xs.slice(1).forEach((x, i) => G.bar(xs[i] + 6, H - 14, x - 6, 14, 7, 'aw2 back').bar(xs[i] + 6, 14, x - 6, H - 14, 7, 'aw2')) },
      { t: 'Medias pletinas', p: ['Arriba, una media pletina en cada unión puntal–cumbrera; abajo, en las dos caras si hay riesgo de réplicas (salvo donde vayan diagonales).', 'Un clavo detrás de cada par de cuñas.'],
        d: G => xs.forEach(x => G.plate(x - 8, H - 30, 16, 30, 'ap2').plate(x - 8, 0, 16, 30, 'ap2')) }
    ], fin: G => G.dim(L + 14, 0, L + 14, H, amCm(H)).dim(0, H + 26, L, H + 26, amCm(L)) };
  },
  dos(v) {
    const D = amDosGeo(v);
    return { W: D.L + 40, H: D.H, base: G => { apuSlab(G, -25, D.H, D.L + 50); G.ground(-25, D.L + 25); },
      steps: [amMide(D.L, D.H, D.L / 2), ...amDosPasos(D)], fin: G => G.dim(D.L + 14, 0, D.L + 14, D.H, amCm(D.H)) };
  },
  torre(v) {
    const D = amDosGeo(v), f = v.fondo, dx = f * .45, dy = f * .3, nd = v.H < 180 ? 1 : v.H <= 330 ? 2 : 3, lv = amRep(18, D.H - 18, nd + 1);
    const back = (G, k) => amDos[k](G, D, dx, dy), xr = D.xs[1] + 5, lat = (G, ya, yb) => G.bar(xr, ya, xr + dx - 10, yb + dy, 6, 'aw2');
    const pasosDos = amDosPasos(D);
    return { W: D.L + dx + 40, H: D.H + dy, base: G => G.ground(-20, D.L + dx + 20), steps: [
      amMide(D.L + dx, D.H, D.L / 2),
      { t: 'Primer par (al fondo)', pz: ['C', 'P', 'S', 'RH', 'RD'], p: [`Monta el primer par como un vertical de dos puntales: cumbrera y solera de ${amCm(D.L)}, dos puntales de ${amCm(D.P)} separados ${amCm(D.sep)} entre ejes (a ${amCm(D.vol)} de los extremos).`,
        `Riostra${D.nh > 1 ? 's' : ''} horizontal${D.nh > 1 ? 'es' : ''} a ${amLista(D.hs)} y diagonales en zigzag. Detalle en «Vertical de dos puntales».`],
        d: G => { G.grp('back', () => ['cs', 'posts', 'rh', 'rd'].forEach(k => back(G, k))); } },
      { t: 'Segundo par (delante)', p: [`Otro par igual a ${amCm(f)} del primero (entre 90 y 120 cm), con las cumbreras y soleras paralelas y a la misma altura.`, pasosDos[1].p[1]],
        d: G => ['cs', 'posts', 'rh', 'rd'].forEach(k => amDos[k](G, D)), c: G => G.dim(D.L + 8, -8, D.L + 8 + dx, dy - 8, amCm(f)) },
      { t: 'Riostras horizontales de los laterales', pz: ['LH'], p: [`Une los dos pares por los dos laterales con ${nd + 1} riostras horizontales de ${amCm(f + D.pa)} en cada uno, a ${amLista(lv)} del suelo.`],
        d: G => lv.forEach(y => lat(G, y, y)), c: G => amCotasV(G, D.L + dx + 20, lv) },
      { t: 'Diagonales de los laterales', pz: ['LD'], p: [nd === 1 ? 'Una diagonal por lateral (menos de 1,8 m).' : nd === 2 ? 'Dos diagonales en K por lateral (de 1,8 a 3,3 m): las dos llegan al centro del mismo puntal.' : 'Tres diagonales por lateral (de 3,3 a 5,1 m), en zigzag.',
        `Cada una de unos ${amCm(Math.hypot(f, (D.H - D.S - D.C) / nd) + 10)}: preséntala, marca y corta.`],
        d: G => { if (nd === 2) { lat(G, lv[0], lv[1]); lat(G, lv[2], lv[1]); } else for (let i = 0; i < nd; i++) lat(G, i % 2 ? lv[i + 1] : lv[i], i % 2 ? lv[i] : lv[i + 1]); } },
      { t: 'Medias pletinas', p: ['En las ocho uniones de puntal con cumbrera y solera; un clavo detrás de cada par de cuñas.'], d: G => { G.grp('back', () => back(G, 'pl')); amDos.pl(G, D); } }
    ], fin: G => G.dim(-14, 0, -14, D.H, amCm(D.H), true) };
  },
  vtablon(v) {
    const tg = amG(v, 'T'), ta = amA(v, 'T'), cu = amN(v, 'cu', 4), vol = amN(v, 'vol', 30), H = v.H, n = Math.max(1, Math.round(v.n)), sep = v.sep, P = H - 2 * tg - cu;
    const C = n === 1 ? amN(v, 'c1', 90) : (n - 1) * sep + 2 * vol, xs = n === 1 ? [C / 2] : amRep(vol, C - vol, n);
    const nb = Math.max(3, Math.ceil(P / 95) + 1), yb = amRep(tg + 14, H - tg - 10, nb), alto = H >= 180;
    const pie = (G, x) => { G.cunas(x - tg - 6, tg, tg + 6, cu).cunas(x, tg, tg + 6, cu); G.rect(x - tg, tg + cu, tg, P).rect(x, tg + cu, tg, P); };
    return { W: C + 40, H, base: G => { apuSlab(G, -25, H, C + 50); G.ground(-25, C + 25); }, steps: [
      amMide(C, H, C / 2),
      { t: 'Cumbrera y solera', pz: ['C', 'S'], p: [`Cumbrera y solera de tablón ${acF(ta, 1)}×${acF(tg, 1)} de ${amCm(C)}${n > 1 ? ` (alero de ${amCm(vol)} en cada extremo)` : ''}.`, 'Solera firme en el suelo, justo debajo de la cumbrera.'],
        d: G => G.rect(0, H - tg, C, tg).rect(0, 0, C, tg), c: G => G.dim(0, H + 26, C, H + 26, amCm(C)) },
      { t: 'Puntales de dos tablones', pz: ['P'], p: [`Cada puntal, dos tablones de ${amCm(P)} cara con cara (${amCm(H)} − ${acF(2 * tg, 1)} de solera y cumbrera − ${acF(cu, 1)} de cuñas), con un par de cuñas bajo cada tablón.`,
        n > 1 ? `Ejes a ${amLista(xs)} del extremo: ${amCm(sep)} entre ellos (máx. 1 m).` : 'Centrado bajo la carga.'],
        d: G => xs.forEach(x => pie(G, x)), c: G => { if (n > 1) G.dim(xs[0], H - 50, xs[1], H - 50, amCm(sep)); G.dim(C + 14, tg + cu, C + 14, H - tg, amCm(P)); } },
      { t: 'Bridas', p: [`${nb} bridas por puntal, a ${amLista(yb)} del suelo, alternando la inclinación.`], d: G => xs.forEach(x => amBridasV(G, x, yb, tg + 4)) },
      n > 1 && { t: 'Riostras', pz: alto ? ['RH', 'RD'] : ['RD'], p: [alto ? `Riostra horizontal a media altura (${amCm(H / 2)}) a cada lado, y cruces arriba y abajo en cada vano.` : 'Una diagonal por delante y otra por detrás en cada vano: cruz de San Andrés.'],
        d: G => xs.slice(1).forEach((x, i) => { const a = xs[i] + tg + 2, b = x - tg - 2;
          if (alto) G.bar(a, H / 2 - 6, b, tg + 10, 6, 'aw2 back').bar(a, H / 2 + 6, b, H - tg - 10, 6, 'aw2 back').rect(a - 15, H / 2 - 4.5, b - a + 30, 9, 'aw2').bar(a, tg + 10, b, H / 2 - 6, 6, 'aw2').bar(a, H - tg - 10, b, H / 2 + 6, 6, 'aw2');
          else G.bar(a, tg + 10, b, H - tg - 10, 6, 'aw2 back').bar(a, H - tg - 10, b, tg + 10, 6, 'aw2'); }) }
    ], fin: G => G.dim(C + 14, 0, C + 14, H, amCm(H)) };
  },
  vobra(v) {
    const Sg = amG(v, 'S'), Cg = amG(v, 'C'), mg = amN(v, 'mg', 20), H = v.H, n = Math.max(1, Math.round(v.n)), C = n === 1 ? amN(v, 'c1', 90) : (n - 1) * v.sep + 2 * mg, xs = n === 1 ? [C / 2] : amRep(mg, C - mg, n), L = H - Sg - Cg, X = n > 1 && !v.paso;
    return { W: C + 40, H, base: G => { apuSlab(G, -25, H, C + 50); G.ground(-25, C + 25); }, steps: [
      amMide(C, H, C / 2),
      { t: 'Cumbrera y solera', pz: ['C', 'S'], p: [`Cumbrera y solera de ${amCm(C)}.`, n > 1 ? `Marca el centro de cada placa a ${amLista(xs)} del extremo.` : 'Marca el centro de la cumbrera y de la solera.'],
        d: G => G.rect(0, H - Cg, C, Cg).rect(0, 0, C, Sg), c: G => { G.dim(0, H + 26, C, H + 26, amCm(C)); if (n > 1) G.dim(xs[0], H - 40, xs[1], H - 40, amCm(v.sep)); } },
      { t: 'Puntales de obra', p: [`Revisa rosca, pasador y tubos. Pon el pasador para que el puntal quede algo por debajo de ${amCm(L)} y ajusta con la tuerca hasta que apriete.`,
        'Clava las placas a la cumbrera y a la solera por sus agujeros (hasta algo más de la mitad) y dobla los clavos.'],
        d: G => xs.forEach(x => apuProp(G, x, Sg, H - Cg)), c: G => G.dim(C + 14, Sg, C + 14, H - Cg, amCm(L)) },
      X && { t: 'Riostras en X', pz: ['RD'], p: [`Dos riostras de unos ${amCm(Math.hypot(C - 10, L) + 10)} de solera a cumbrera, una por cara.`], d: G => G.bar(6, 14, C - 6, H - 14, 6, 'aw2 back').bar(6, H - 14, C - 6, 14, 6, 'aw2') }
    ], rev: ['Solo temporal: los puntales de obra no se arriostran entre sí.'], fin: G => G.dim(C + 14, 0, C + 14, H, amCm(H)) };
  },
  vholm: v => amHolm(v, Math.max(1, Math.round(v.n))),

  /* ---------- Zampeados ---------- */
  zampeado(v) {
    const a = amG(v, 'V'), va = amA(v, 'V'), nv = +v.nv, w = v.w, H = v.H, capas = Math.floor(H / a), resto = H - capas * a, solida = Math.max(nv, Math.ceil(w / va)), s0 = (w - solida * va) / 2;
    const cruz = amRep(10, w - 10 - va, nv);
    const capa = (G, i) => { const y = i * a, sol = i === 0 || (v.base && capas > 1 && i === capas - 1);
      if (i % 2 === 0) (sol ? Array.from({ length: solida }, (_, k) => s0 + k * va) : cruz).forEach(x => G.rect(x, y, va, a)); else G.rect(0, y, w, a).line(0, y + a / 2, w, y + a / 2, 'aln'); };
    const resto3 = Array.from({ length: Math.max(0, capas - 2) }, (_, k) => k + 2);
    return { W: w + 60, H, base: G => { apuSlab(G, -20, H, w + 40); G.ground(-20, w + 20); }, steps: [
      { t: 'Primera capa sólida', pz: ['V'], p: [`${solida} viguetas de ${amCm(w)} juntas, sin hueco entre ellas, sobre suelo firme y nivelado.`, `En total, ${capas} capas de ${acF(a, 1)} cm.`],
        d: G => capa(G, 0), c: G => G.dim(0, -14, w, -14, amCm(w)) },
      capas > 1 && { t: 'Segunda capa, cruzada', p: [`${nv} viguetas cruzadas encima: las de los lados con su cara exterior a 10 cm del borde (que las esquinas sobresalgan 10 cm)${nv === 3 ? ' y la tercera en el centro' : ''}.`],
        d: G => capa(G, 1), c: G => G.dim(w + 14, a, w + 14, 2 * a, `${acF(a, 1)} cm`) },
      resto3.length && { t: `Capas 3 a ${capas}`, p: [`Sigue cruzando cada capa con la de abajo hasta ${capas} capas (${amCm(capas * a)}).${v.base && capas > 1 ? ' La última, sólida como la primera (base de cojines o gatos).' : ''}`, H > 150 ? 'Más de 1,5 m: clava un listón fino en las esquinas.' : 'Comprueba con el nivel cada pocas capas.'],
        d: G => resto3.forEach(i => capa(G, i)), c: G => G.dim(w + 14, 0, w + 14, capas * a, amCm(capas * a)) },
      { t: resto > .5 ? 'Ajuste a la carga' : 'Contacto con la carga', p: [resto > .5 ? `Faltan ${acF(resto, 1)} cm hasta la carga: rellena con dos pares de cuñas de 5×30 y apriétalas a la vez.` : 'La última capa toca la carga: comprueba que apoya en toda su superficie.'],
        d: resto > .5 ? G => { G.cunas(w * .15, capas * a, w * .3, resto).cunas(w * .55, capas * a, w * .3, resto); } : null, c: resto > .5 ? G => G.dim(w + 14, capas * a, w + 14, H, `${acF(resto, 1)} cm`) : null }
    ], fin: G => G.dim(w + 14, 0, w + 14, H, amCm(H)).dim(0, -14, w, -14, amCm(w)) };
  },

  /* ---------- Laterales ---------- */
  volante(v, r) {
    const zg = amG(v, 'Z'), ej = amN(v, 'ej', 60), sob = amN(v, 'sob', 60), caja = amN(v, 'caja', 90);
    const I = v.I, zb = v.zb, t60 = Math.tan(60 * ACR), Lp = (I - 5) / Math.sin(60 * ACR), d = zg + (I - 5) / t60, Z = I + sob - zb, yr = zb + 10, xr = zg + (I - yr) / t60;
    return { W: d + 120, H: I + 60, base: G => { G.wall(-30, 0, 30, I + 90).poly([[0, 0], [Math.max(40, zb * 1.1), 0], [0, Math.max(20, zb - 2)]], 'adeb'); G.ground(-30, d + 110); }, steps: [
      { t: 'Zapata mural', pz: ['Z'], p: [`Zapata de ${amCm(Z)} de pie contra el muro, con el pie a ${amCm(zb)} del suelo (por encima de los escombros) y llegando ${amCm(sob)} por encima de la inserción.`, `Marca el punto de inserción a ${amCm(I)} del suelo.`],
        d: G => G.rect(0, zb, zg, Z), c: G => G.dim(-40, 0, -40, zb, amCm(zb), true).dim(-40, zb, -40, I + sob, amCm(Z), true).dim(24, 0, 24, I, amCm(I)) },
      { t: 'Caja de base y carrera', pz: ['BF', 'BL', 'F'], p: [`Caja de ${amCm(caja)} (fondo y laterales de ${apuMad(v, 'X').s}, con 7 clavos cada lateral) con el centro a ${amCm(d)} del muro.`, 'Detrás, la carrera de 90 cm anclada con dos barras de 2 cm de Ø y 1,5 m; deja hueco para las cuñas.'],
        d: G => { G.rect(d - caja / 2, 0, caja, 15, 'aw2 back').rect(d - caja / 2, 0, caja, 5, 'aw2'); apuFreno(G, d + caja / 2 + 2, 0, 1); }, c: G => G.dim(0, -16, d, -16, amCm(d)) },
      { t: 'Puntal a 60°', pz: ['P', 'E'], p: [`Puntal de ${amCm(Lp)} de vértice a vértice, con los encuentros a 60° (diagonal desde ${amCm(amA(v, 'P') / Math.tan(30 * ACR))} del lateral y tope perpendicular de 4 cm).`,
        `Arriba contra la zapata en la inserción y abajo dentro de la caja. Encima, el ejión de ${amCm(ej)} con 14 clavos y una pletina 30×30 a cada lado.`],
        d: G => G.bar(zg + 2, I, d, 8, amA(v, 'P')).rect(zg, I + 4, 5, ej, 'aw2').plate(-5, I - 26, 30, 30), c: G => G.angle(d, 8, 40, 180, 120, '60°') },
      { t: 'Riostras horizontales', pz: ['RH'], p: [`Del pie de la zapata al puntal, una a cada lado, a ${amCm(yr)} del suelo (unos ${amCm(r.pz.find(p => p.c === 'RH')?.l ?? xr + 5)}).`], d: G => G.bar(0, yr, xr + 4, yr, 8, 'aw2'), c: G => G.dim(xr + 30, 0, xr + 30, yr, amCm(yr)) },
      { t: 'Ajusta con las cuñas', p: ['Mete el par de cuñas entre la caja y la carrera y golpéalas a la vez hasta que el puntal apriete contra la zapata. No más: no empujes el muro.'] }
    ], fin: G => G.dim(-40, 0, -40, I, amCm(I), true).dim(0, -16, d, -16, amCm(d)) };
  },
  solerafija: v => amLateral(v, false),
  ltablon: v => amLateral(v, true),
  lobra(v) {
    const ej = amN(v, 'ej', 70), I = v.I, nt = Math.max(1, Math.round(v.nt)), Ls = I, Lp = I * Math.SQRT2, a = [26, I - 4], b = [Ls - 4, 26];
    return { W: Ls + 140, H: I + 70, base: G => { G.wall(-30, 0, 30, I + 100); G.ground(-30, Ls + 130); }, steps: [
      { t: 'Solera y zapata mural', pz: ['S', 'Z'], p: [`Solera de ${amCm(Ls + ej)} en el suelo, contra el muro, y zapata de ${amCm(I + ej)} de pie contra el muro, sobre la solera.`, `Marca la inserción a ${amCm(I)} del suelo y el pie del puntal a ${amCm(Ls)} del muro (45°).`],
        d: G => G.rect(0, 0, Ls + ej, amG(v, 'S')).rect(0, amG(v, 'S'), amG(v, 'Z'), I + ej - 10), c: G => G.dim(-40, 0, -40, I, amCm(I), true).dim(0, -16, Ls, -16, amCm(Ls)) },
      { t: 'Ejiones a 45°', pz: ['E'], p: [`Dos ejiones de ${amCm(ej)} con un extremo a 45°, para que la placa del puntal apoye recta: uno en la zapata justo encima de la inserción y otro en la solera justo detrás del pie.`, '14 clavos cada uno.'],
        d: G => G.poly([[10, I - 12], [34, I + 12], [34, I + 58], [10, I + 58]], 'aw2').poly([[Ls - 12, 10], [Ls + 58, 10], [Ls + 58, 34], [Ls + 12, 34]], 'aw2') },
      { t: 'Puntal de obra', p: [`Un puntal de obra de unos ${amCm(Lp - 30)} entre placas (${amCm(Lp)} de vértice a vértice): compruébalo en el sitio. Clava las placas a los ejiones y ajusta con la tuerca.`],
        d: G => amPropL(G, a, b), c: G => G.angle(Ls, 10, 40, 180, 135, '45°') },
      { t: 'Carrera y anclajes', pz: ['F'], p: [`Carrera tras las soleras, anclada con barras de 2 cm de Ø y 1,5 m, y un par de cuñas entre solera y carrera.`], d: G => apuFreno(G, Ls + 74, 0, 1) },
      nt > 1 && { t: 'Resto de sistemas', pz: ['RZ'], p: [`${nt} sistemas iguales cada ${amCm(v.sep)}. Arriostra entre sí las zapatas y las soleras (los puntales metálicos no se arriostran).`] }
    ], rev: ['Zona muy peligrosa: es un sistema temporal.'], fin: G => G.dim(-40, 0, -40, I, amCm(I), true).dim(0, -16, Ls, -16, amCm(Ls)) };
  },

  /* ---------- Inclinados ---------- */
  inclcarga: v => amIncl(v, 'carga'),
  inclsuelo: v => amIncl(v, 'suelo'),
  incltablon(v) {
    const th = v.th * ACR, tn = Math.tan(th), tg = amG(v, 'T'), cu = amN(v, 'cu', 4), xt = amN(v, 'xt', 70), vol = amN(v, 'vol', 30), cg = tg / Math.cos(th), h = v.h, D = v.D;
    const ld = x => h + x * tn, yc = x => ld(x) - cg, Pv = h - cg - tg - cu, yTop = yc(xt), Lt = Math.hypot(D - xt, yTop - tg), al = acDeg(Math.atan2(yTop - tg, D - xt));
    const S = vol + D + 60, C = (vol + xt + vol) / Math.cos(th), xr = x => xt + (D - xt) * (yTop - x) / (yTop - tg), hr = h / 2;
    return { W: D + 160, H: ld(D + 60), base: G => { G.bar(-60, ld(-60) + 8, D + 90, ld(D + 90) + 8, 16, 'aload'); G.ground(-60, D + 150); }, steps: [
      { t: 'Mide', p: [`Inclinación de la carga: ${acF(v.th)}°. Altura del suelo a la carga donde irá el puntal vertical: ${amCm(h)}.`, `El pie del tornapunta, a ${amCm(D)} del puntal vertical.`],
        c: G => G.line(0, 0, 0, h, 'acab').dim(-20, 0, -20, h, amCm(h), true).dim(0, -16, D, -16, amCm(D)) },
      { t: 'Cumbreras', pz: ['C'], p: [`Dos cumbreras de tablón de ${amCm(C)} (una por sistema) pegadas a la carga, con un alero de ${amCm(vol)} por delante del puntal vertical.`],
        d: G => G.bar(-vol, yc(-vol) + cg / 2, xt + vol, yc(xt + vol) + cg / 2, tg) },
      { t: 'Soleras', pz: ['S'], p: [`Dos soleras de ${amCm(S)}: empiezan ${amCm(vol)} por delante del puntal vertical y acaban 60 cm detrás del pie del tornapunta.`],
        d: G => G.rect(-vol, 0, S, tg), c: G => G.dim(-vol, -36, S - vol, -36, amCm(S)) },
      { t: 'Puntal vertical', pz: ['PV'], p: [`Dos tablones de ${amCm(Pv)} (por el lado largo) embridados, con la cabeza a bisel de ${acF(v.th)}° para que apoye entero en la cumbrera.`, 'Dos pares de cuñas debajo, uno por tablón.'],
        d: G => { G.cunas(-tg - 6, tg, tg + 6, cu).cunas(0, tg, tg + 6, cu); G.poly([[-tg, tg + cu], [tg, tg + cu], [tg, yc(tg)], [-tg, yc(-tg)]]).line(0, tg + cu, 0, yc(0), 'aln'); },
        c: G => G.dim(-40, tg + cu, -40, yc(0), amCm(Pv), true) },
      { t: 'Tornapunta', pz: ['PT'], p: [`Dos tablones de ${amCm(Lt)} embridados, a ${acF(al)}°: abajo a nivel y arriba contra la cumbrera, a ${amCm(xt)} del puntal vertical.`],
        d: G => { G.bar(D, tg + 2, xt, yTop - 2, 2 * tg); amBridasL(G, [D, tg], [xt, yTop], [.2, .5, .8], tg + 4); }, c: G => G.angle(D, tg, 44, 180, 180 - al, `${acF(al)}°`).dim(0, h + 40, xt, h + 40, amCm(xt)) },
      { t: 'Ejiones y cuñas', pz: ['E'], p: ['Un ejión de 60 cm tras el tornapunta en la cumbrera y otro en la solera, con 14 clavos cada uno.', 'Par de cuñas entre el pie del tornapunta y su ejión.'],
        d: G => { G.bar(xt - 66, yc(xt - 66) - 2.5, xt - 6, yc(xt - 6) - 2.5, 5, 'aw2'); G.cunas(D + tg + 1, tg, 5, 12, true).rect(D + tg + 6, tg, 60, 5, 'aw2'); } },
      { t: 'Riostras', pz: ['R', 'RS'], p: [`Riostra entre puntal vertical y tornapunta a media altura (${amCm(hr)}).`, 'Arriostra los dos sistemas entre sí (separados 1,2–1,5 m).'], d: G => G.bar(tg, hr, xr(hr) - tg, hr, 6, 'aw2'), c: G => G.dim(D + 30, 0, D + 30, hr, amCm(hr)) },
      { t: 'Carrera', pz: ['F'], p: ['Carrera tras las soleras con dos estacas de 2 cm de Ø y 0,5 m, y cuñas entre solera y carrera.'], d: G => apuFreno(G, S - vol + 4, 0, 1) }
    ], fin: G => G.dim(-20, 0, -20, h, amCm(h), true).dim(0, -16, D, -16, amCm(D)) };
  },

  /* ---------- Horizontales ---------- */
  horfema(v) {
    const zg = amG(v, 'Z'), kg = amG(v, 'K'), D = v.D, H = v.H, cu = amN(v, 'cu', 4), nc = Math.max(2, Math.ceil(H / amN(v, 'emax', 100)) - 1), esp = H / (nc + 1), ys = Array.from({ length: nc }, (_, k) => esp * (k + 1)), Lc = D - 2 * zg - 2 * cu;
    const taco = (G, y) => G.poly([[10, y - 5], [24, y - 5], [24, y - 9], [14, y - 9], [14, y - 19], [10, y - 19]], 'aw2').poly([[D - 10, y - 5], [D - 24, y - 5], [D - 24, y - 9], [D - 14, y - 9], [D - 14, y - 19], [D - 10, y - 19]], 'aw2');
    return { W: D + 60, H, base: G => { G.wall(-30, 0, 30, H + 30).wall(D, 0, 30, H + 30); G.ground(-30, D + 30); }, steps: [
      { t: 'Zapatas murales', pz: ['Z'], p: [`Dos zapatas de ${amCm(H)}, una de pie contra cada pared (${amCm(D)} entre paredes). Rellena los huecos con calzos y cuñas para que apoyen enteras.`],
        d: G => G.rect(0, 0, zg, H).rect(D - zg, 0, zg, H), c: G => G.dim(0, H + 16, D, H + 16, amCm(D)).dim(D + 40, 0, D + 40, H, amCm(H)) },
      { t: 'Tacos en L', pz: ['TL'], p: [`Un taco en L bajo cada extremo de codal, a ${amLista(ys.map(y => y - 5))} del suelo (cara de arriba), clavado a la zapata.`], d: G => ys.forEach(y => taco(G, y)) },
      { t: 'Codales', pz: ['P'], p: [`${nc} codales de ${amCm(Lc)} (${amCm(D)} − ${acF(2 * zg, 1)} de zapatas − ${acF(2 * cu, 1)} de cuñas), con el centro a ${amLista(ys)} del suelo: cada ${amCm(esp)}.`, 'Mete un par de cuñas en horizontal entre cada extremo y la zapata, y apriétalas a la vez por los dos lados.'],
        d: G => ys.forEach(y => G.cunas(zg, y - kg / 2, cu, kg).cunas(D - zg - cu, y - kg / 2, cu, kg).rect(zg + cu, y - kg / 2, Lc, kg)),
        c: G => { G.dim(zg + cu, ys[0] - 26, D - zg - cu, ys[0] - 26, amCm(Lc)); amCotasV(G, -44, ys, true); } },
      !v.paso && { t: 'Riostras en cruz', pz: ['RD'], p: [`Dos riostras de unos ${amCm(Math.hypot(D - 20, esp * (nc - 1)) + 20)} en cruz de San Andrés, del codal de abajo al de arriba.`],
        d: G => G.bar(16, ys[0], D - 16, ys[nc - 1], 6, 'aw2 back').bar(16, ys[nc - 1], D - 16, ys[0], 6, 'aw2') }
    ], fin: G => G.dim(0, H + 16, D, H + 16, amCm(D)) };
  },
  hortablon(v) {
    const D = v.D, H = v.H, tg = amG(v, 'T'), cu = amN(v, 'cu', 4), a = +v.ang * ACR, ej = amN(v, 'ej', +v.ang === 60 ? 75 : 60), cl = ej >= 75 ? 20 : 14, Lc = D - 2 * tg - 2 * cu, r = v.r, Lj = r / Math.cos(a), dy = r * Math.tan(a), yc = H / 2, tc = 12;
    const nb = Math.max(3, Math.ceil(Lc / 95) + 1), xb = amRep(tg + 20, D - tg - 20, nb), ejC = Math.max(10, Math.min(ej, D / 2 - tg - r - 12));
    const jab = (G, s, up) => { const x0 = s < 0 ? tg : D - tg, xf = x0 - s * r, yf = yc + (up ? tc / 2 : -tc / 2), yz = yf + (up ? dy : -dy); G.bar(xf, yf, x0, yz, 10); return [x0, yz, xf, yf]; };
    return { W: D + 60, H, base: G => { G.wall(-30, 0, 30, H + 30).wall(D, 0, 30, H + 30); G.ground(-30, D + 30); }, steps: [
      { t: 'Zapatas murales', pz: ['Z'], p: [`Un tablón de ${amCm(H)} de pie contra cada pared (${amCm(D)} entre paredes).`], d: G => G.rect(0, 0, tg, H).rect(D - tg, 0, tg, H), c: G => G.dim(0, H + 16, D, H + 16, amCm(D)) },
      { t: 'Codal de dos tablones', pz: ['P'], p: [`Dos tablones de ${amCm(Lc)} embridados (${nb} bridas), a media altura: centro a ${amCm(yc)} del suelo.`, 'Un par de cuñas entre cada extremo y la zapata, apretadas a la vez.'],
        d: G => { G.cunas(tg, yc - tc / 2, cu, tc).cunas(D - tg - cu, yc - tc / 2, cu, tc).rect(tg + cu, yc - tc / 2, Lc, tc).line(tg + cu, yc, D - tg - cu, yc, 'aln'); xb.forEach((x, i) => G.bar(x - 6 * (i % 2 ? -1 : 1), yc - tc / 2 - 3, x + 6 * (i % 2 ? -1 : 1), yc + tc / 2 + 3, 3, 'am')); },
        c: G => G.dim(tg + cu, yc + 30, D - tg - cu, yc + 30, amCm(Lc)).dim(D + 40, 0, D + 40, yc, amCm(yc)) },
      { t: 'Jabalcones y tornapuntas', pz: ['J', 'E'], p: [`Cuatro tablones de ${amCm(Lj)} con los dos extremos a ${v.ang}°: el pie en el codal a ${amCm(r)} de la zapata y la cabeza en la zapata a ${amCm(dy)} por encima (o por debajo) del codal.`,
        `Cada uno apoya en un ejión de ${acF(ej)} cm con ${cl} clavos: cuatro en las zapatas y cuatro en el codal. Cuñas entre jabalcón y ejión.`],
        d: G => [[-1, 1], [-1, 0], [1, 1], [1, 0]].forEach(([s, up]) => { const [x0, yz, xf, yf] = jab(G, s, up); G.rect(s < 0 ? x0 : x0 - 5, up ? yz + 6 : yz - 6 - ej, 5, ej, 'aw2').rect(s < 0 ? xf + 6 : xf - 6 - ejC, up ? yf : yf - 5, ejC, 5, 'aw2'); }),
        c: G => G.dim(tg, yc + tc / 2 + dy + 30, tg + r, yc + tc / 2 + dy + 30, amCm(r)).dim(-44, yc + tc / 2, -44, yc + tc / 2 + dy, amCm(dy), true) }
    ], fin: G => G.dim(0, H + 16, D, H + 16, amCm(D)) };
  },
  horpuntales(v) {
    const zg = amG(v, 'Z'), D = v.D, H = v.H, n = Math.max(2, Math.ceil(H / 100) - 1), esp = H / (n + 1), ys = Array.from({ length: n }, (_, k) => esp * (k + 1)), L = D - 2 * zg, holm = v.tipo === 'holm';
    const h = AC_HOLM.find(x => x[0] === v.mod) || AC_HOLM[0], c = holm ? acHolmCombo((L - +v.cab) * 10, h[2], h[3]) : null;
    return { W: D + 60, H, base: G => { G.wall(-30, 0, 30, H + 30).wall(D, 0, 30, H + 30); G.ground(-30, D + 30); }, steps: [
      { t: 'Zapatas murales', pz: ['Z'], p: [`Dos zapatas de ${amCm(H)}: una contra la pared sana y otra contra la dañada.`, `Marca en las dos las mismas alturas: ${amLista(ys)} del suelo.`], d: G => G.rect(0, 0, zg, H).rect(D - zg, 0, zg, H),
        c: G => { G.dim(0, H + 16, D, H + 16, amCm(D)); amCotasV(G, -44, ys, true); } },
      { t: holm ? 'Puntales HOLMATRO' : 'Puntales de obra', p: [holm ? (c ? `${n} de ${amCm(L)} entre zapatas: ${amHolmTxt(c, h)}.` : 'Con ese puntal no sale ninguna combinación: elige otro arriba.') : `${n} puntales de obra de ${amCm(L)} entre placas, a las alturas marcadas y bien horizontales.`, 'Clava las placas a las zapatas y aprieta los dos lados por igual.'],
        d: G => ys.forEach(y => apuProp(G, zg, y, D - zg, true)), c: G => G.dim(zg, ys[0] - 26, D - zg, ys[0] - 26, amCm(L)) }
    ], fin: G => G.dim(0, H + 16, D, H + 16, amCm(D)) };
  },

  /* ---------- Puertas y ventanas ---------- */
  hueco(v) {
    const Sg = amG(v, 'S'), Cg = amG(v, 'C'), pa = amA(v, 'P'), tc = amN(v, 'taco', 15), A = v.A, Hh = v.Hh, cu = amN(v, 'cu', 4), L = A - cu, P = Hh - Sg - Cg - cu, X = !v.paso;
    return { W: A + 80, H: Hh + 60, base: amHuecoBase(A, Hh), steps: [
      { t: 'Solera', pz: ['S'], p: [`Solera de ${amCm(L)} (${amCm(A)} − ${acF(cu, 1)} de cuñas) contra un lado del hueco y el par de cuñas en el otro extremo.`], d: G => G.rect(0, 0, L, Sg).cunas(L, 0, cu, Sg), c: G => G.dim(0, -16, A, -16, amCm(A)) },
      { t: 'Cumbrera', pz: ['C'], p: [`Cumbrera de ${amCm(L)} contra el dintel, con las cuñas en el extremo contrario al de la solera.`], d: G => G.cunas(0, Hh - Cg, cu, Cg).rect(cu, Hh - Cg, L, Cg), c: G => G.dim(A + 16, 0, A + 16, Hh, amCm(Hh)) },
      { t: 'Puntales', pz: ['P'], p: [`Dos puntales de ${amCm(P)} contra los laterales (el primero bajo las cuñas de la cumbrera), con un par de cuñas debajo de cada uno.`],
        d: G => [pa / 2, A - pa / 2].forEach(x => amPost(G, x, Sg, Hh - Cg, cu, pa, pa)), c: G => G.dim(pa + 20, Sg + cu, pa + 20, Hh - Cg, amCm(P)) },
      { t: 'Tacos y pletinas', pz: ['T'], p: [`Un taco de ${amCm(tc)} junto al pie de cada puntal encerrando las cuñas: 3 clavos al puntal y 2 a la solera.`, 'Arriba, una media pletina en cada unión puntal–cumbrera.'],
        d: G => G.rect(pa, Sg, tc, 10, 'aw2').rect(A - pa - tc, Sg, tc, 10, 'aw2').plate(0, Hh - 30, 22, 30, 'ap2').plate(A - 22, Hh - 30, 22, 30, 'ap2') },
      X && { t: 'Riostras en X', pz: ['RD'], p: [`No es un paso: dos riostras de unos ${amCm(Math.hypot(L - 20, P) + 10)} en X, una por cara.`], d: G => G.bar(14, 24, A - 14, Hh - 14, 6, 'aw2 back').bar(14, Hh - 14, A - 14, 24, 6, 'aw2') }
    ], fin: G => G.dim(0, -16, A, -16, amCm(A)).dim(A + 16, 0, A + 16, Hh, amCm(Hh)) };
  },
  huecoprefab(v) {
    const hol = amN(v, 'hol', 4), Sg = amG(v, 'S'), Cg = amG(v, 'C'), pa = amA(v, 'P'), A = v.A, Hh = v.Hh, nh = Math.max(1, Math.round(v.nh)), L = A - hol, Ho = Hh - hol, P = Ho - Sg - Cg, x0 = hol / 2, y0 = hol;
    const tri = (G, x, y, dx, dy) => G.tri([[x, y], [x + dx * 30, y], [x, y + dy * 30]]);
    return { W: A + 80, H: Hh + 60, base: amHuecoBase(A, Hh), steps: [
      { t: 'Arma el cuadro', pz: ['S', 'C', 'P'], p: [`Fuera del hueco (en lugar seguro): solera y cumbrera de ${amCm(L)} y dos puntales de ${amCm(P)} entre ellas. El cuadro queda de ${amCm(L)} × ${amCm(Ho)}, ${amCm(hol)} menor que el hueco.`],
        d: G => G.rect(x0, y0, L, Sg).rect(x0, y0 + Ho - Cg, L, Cg).rect(x0, y0 + Sg, pa, P).rect(x0 + L - pa, y0 + Sg, pa, P),
        c: G => G.dim(x0, Hh + 18, x0 + L, Hh + 18, amCm(L)).dim(A + 16, y0, A + 16, y0 + Ho, amCm(Ho)) },
      { t: 'Medias pletinas triangulares', p: ['En las cuatro esquinas por cada cara (8 por cuadro): triángulos de lados rectos de 30 cm con 13 clavos.'],
        d: G => { const xi = x0 + 10, xa = x0 + L - 10, yi = y0 + 10, ya = y0 + Ho - 10; tri(G, xi, yi, 1, 1); tri(G, xa, yi, -1, 1); tri(G, xi, ya, 1, -1); tri(G, xa, ya, -1, -1); } },
      { t: 'Mete el cuadro y acuña', p: ['Mete el cuadro en el hueco y ajústalo con cuñas: debajo y en un lateral, hasta que apriete contra el dintel.'], d: G => G.cunas(A / 2 - 15, 0, 30, y0).cunas(A - 2, Hh / 2 - 15, 2, 30, true) },
      !v.paso && { t: 'Riostras en X', pz: ['RD'], p: [`No es un paso: dos riostras de unos ${amCm(Math.hypot(L - 20, P) + 10)} en X.`], d: G => G.bar(x0 + 16, y0 + 18, x0 + L - 16, y0 + Ho - 18, 6, 'aw2 back').bar(x0 + 16, y0 + Ho - 18, x0 + L - 16, y0 + 18, 6, 'aw2') },
      nh > 1 && { t: 'Resto de huecos', p: [`Repite el cuadro para los ${nh} huecos: todos iguales, así se cortan a la vez.`] }
    ], fin: G => G.dim(0, -16, A, -16, amCm(A)).dim(A + 16, 0, A + 16, Hh, amCm(Hh)) };
  },
  recercado(v) {
    const A = v.A, Hh = v.Hh, tg = amG(v, 'T'), cu = amN(v, 'cu', 4), Lh = A - cu, J = Hh - 2 * tg - cu, iw = A - 2 * tg, ih = Hh - 2 * tg, ref = v.ref;
    return { W: A + 80, H: Hh + 60, base: amHuecoBase(A, Hh), steps: [
      { t: 'Peana', pz: ['CP'], p: [`Peana de ${amCm(Lh)} abajo, con un par de cuñas en un extremo.`], d: G => G.rect(0, 0, Lh, tg).cunas(Lh, 0, cu, tg), c: G => G.dim(0, -16, A, -16, amCm(A)) },
      { t: 'Cabecero', pz: ['CP'], p: [`Cabecero de ${amCm(Lh)} contra el dintel, con sus cuñas en el extremo contrario.`], d: G => G.cunas(0, Hh - tg, cu, tg).rect(cu, Hh - tg, Lh, tg) },
      { t: 'Jambas', pz: ['J'], p: [`Dos jambas de ${amCm(J)} a los lados, entre peana y cabecero; aprieta con cuñas arriba.`],
        d: G => [0, A - tg].forEach(x => G.rect(x, tg, tg, J).cunas(x, tg + J, tg, cu, true)), c: G => G.dim(A + 16, tg, A + 16, tg + J, amCm(J)) },
      ref === 'h' && { t: 'Puntal intermedio horizontal', pz: ['PI'], p: [`Tablón de ${amCm(iw - cu)} entre las jambas, a media altura (${amCm(Hh / 2)}), con cuñas.`], d: G => G.rect(tg, Hh / 2 - tg / 2, iw - cu, tg).cunas(A - tg - cu, Hh / 2 - tg / 2, cu, tg) },
      ref === 'v' && { t: 'Puntal intermedio vertical', pz: ['PI'], p: [`Tablón de ${amCm(ih - cu)} entre peana y cabecero, en el centro (a ${amCm(A / 2)} de un lado), con cuñas.`], d: G => G.rect(A / 2 - tg / 2, tg, tg, ih - cu).cunas(A / 2 - tg / 2, Hh - tg - cu, tg, cu, true) },
      ref === 'aspa' && { t: 'Aspa', pz: ['X'], p: [`Dos tablones de unos ${amCm(Math.hypot(iw, ih) + 20)} entre esquinas opuestas (cruz de San Andrés), con los encuentros a ${acF(acDeg(Math.atan2(ih, iw)))}° y ${acF(90 - acDeg(Math.atan2(ih, iw)))}°: preséntalos y marca.`],
        d: G => G.bar(tg + 4, tg + 6, A - tg - 4, Hh - tg - 6, 10, 'aw2 back').bar(tg + 4, Hh - tg - 6, A - tg - 4, tg + 6, 10) }
    ], fin: G => G.dim(0, -16, A, -16, amCm(A)).dim(A + 16, 0, A + 16, Hh, amCm(Hh)) };
  },
  huecopuntales(v) {
    const Sg = amG(v, 'S'), Cg = amG(v, 'C'), A = v.A, Hh = v.Hh, L = Hh - Sg - Cg, holm = v.tipo === 'holm', h = AC_HOLM.find(x => x[0] === v.mod) || AC_HOLM[0], cab = +v.cab || 0, c = holm ? acHolmCombo((L - cab) * 10, h[2], h[3]) : null, xs = [19, A - 19];
    return { W: A + 80, H: Hh + 60, base: amHuecoBase(A, Hh), steps: [
      { t: 'Cumbrera y solera', pz: ['C', 'S'], p: [`Cumbrera y solera de ${amCm(A)}. Marca el centro de cada puntal a ${amCm(19)} de los extremos (10 cm entre la placa y el extremo).`], d: G => G.rect(0, 0, A, Sg).rect(0, Hh - Cg, A, Cg), c: G => G.dim(0, -16, A, -16, amCm(A)) },
      { t: holm ? 'Puntales HOLMATRO' : 'Puntales de obra', p: [holm ? (c ? `Dos de ${amCm(L)}: ${amHolmTxt(c, h)}.` : 'Con ese puntal no sale ninguna combinación: elige otro arriba.') : `Dos puntales de obra de ${amCm(L)} entre placas.`, 'Clava las placas o los cabezales y aprieta.'],
        d: G => holm ? (amCabezales(G, xs, Sg, Hh - Cg, cab), xs.forEach(x => amHolmStack(G, x, Sg, Hh - Cg, c, h, cab))) : xs.forEach(x => apuProp(G, x, Sg, Hh - Cg)), c: G => G.dim(A + 16, Sg, A + 16, Hh - Cg, amCm(L)) },
      !v.paso && { t: 'Riostras en X', pz: ['RD'], p: [`No es un paso: riostras en X de unos ${amCm(Math.hypot(A - 10, L) + 10)}.`], d: G => G.bar(6, 14, A - 6, Hh - 14, 6, 'aw2 back').bar(6, Hh - 14, A - 6, 14, 6, 'aw2') }
    ], fin: G => G.dim(0, -16, A, -16, amCm(A)).dim(A + 16, 0, A + 16, Hh, amCm(Hh)) };
  },

  /* ---------- Especiales ---------- */
  percha(v) {
    const Sg = amG(v, 'S'), Cg = amG(v, 'C'), Bg = amG(v, 'B'), cu = amN(v, 'cu', 4), bi = amN(v, 'bi', v.V), bf = amN(v, 'bf', 20);
    const Hd = v.Hd, Ht = v.Ht, V = v.V, e = v.e, P = Hd - Sg - Bg - cu, Pc = Ht - Cg - Hd - cu, xp = e / 2, xc = [-bi + 12, -12], tip = e + V + bf;
    return { W: 2 * V + e + 80, H: Ht + 30, steps: [
      { t: 'Solera y puntal en el vano', pz: ['S', 'P'], p: [`Solera de ${amCm(v.Wv)} atravesada en el vano, en el centro del muro.`, `Puntal de ${amCm(P)} de pie sobre la solera, con un par de cuñas, hasta la percha (${amCm(Bg)} de canto) bajo el dintel (${amCm(Hd)}).`],
        d: G => { G.rect(xp - 5, 0, 10, Sg); amPost(G, xp, Sg, Hd - Bg, cu); }, c: G => G.dim(e + 14, 0, e + 14, Hd, amCm(Hd)) },
      { t: 'Percha', pz: ['PE'], p: [`Percha de ${amCm(V + bf + e + bi)} atravesando el vano bajo el dintel: ${amCm(V + bf)} hacia fuera (pasa el borde del balcón) y ${amCm(bi)} hacia dentro.`, 'Media pletina entre el puntal y la percha.'],
        d: G => G.rect(-bi, Hd - Bg, bi + e + V + bf, Bg).plate(xp - 8, Hd - Bg - 20, 16, 30, 'ap2'), c: G => G.dim(e, Hd + 22, tip, Hd + 22, amCm(V + bf)).dim(-bi, Hd + 22, 0, Hd + 22, amCm(bi)) },
      { t: 'Cumbrera y puntales cortos', pz: ['C', 'PC'], p: [`Dentro: cumbrera de ${amCm(bi)} contra el techo, sobre el brazo interior de la percha.`, `Dos puntales cortos de ${amCm(Pc)} de la percha a la cumbrera, con cuñas, cerca de cada extremo del brazo.`],
        d: G => { G.rect(-bi, Ht - Cg, bi, Cg); xc.forEach(x => amPost(G, x, Hd, Ht - Cg, cu)); }, c: G => G.dim(-bi - 16, Hd, -bi - 16, Ht - Cg, amCm(Pc + cu), true) },
      { t: 'Viga y cables', pz: ['VB'], p: [`Fuera: viga de ${amCm(v.B + 20)} atravesada bajo el balcón, cerca del borde.`, `Cuelga la viga de la punta de la percha con dos cables, cuerdas o eslingas (unos ${amCm(Hd + 60)} cada uno) y ténsalos.`],
        d: G => { G.rect(e + V - 16, -22, 10, 10); G.line(tip - 5, Hd - 10, e + V - 11, -12, 'acab'); } }
    ], base: G => {
      G.wall(0, Hd, e, Ht - Hd + 20).rect(-V - 30, Ht, V + 30, 20, 'aload').rect(-V - 30, -14, V + 30, 14, 'aload').rect(0, -14, e, 14, 'aload').rect(e, -12, V, 12, 'aload'); G.line(0, 0, 0, Hd, 'aln').line(e, 0, e, Hd, 'aln');
    }, rev: ['Medidas orientativas. Si el balcón es grande o pesado, dos o más perchas.'], fin: G => G.dim(e + 14, 0, e + 14, Hd, amCm(Hd)) };
  },
  voladizoinf(v) {
    const Sg = amG(v, 'S'), Cg = amG(v, 'C'), cu = amN(v, 'cu', 4), vol = amN(v, 'vol', 30), fr = amN(v, 'fr', 2);
    const Ht = v.Ht, V = v.V, sep = v.sep, dI = v.dI, e = v.e, P = Ht - Sg - Cg - cu, xa = -dI, xb = -dI - sep, xf = xb - vol, xt = e + fr * V / 3;
    const dx = xt - xf, dy = Ht - Sg - Cg, Li = Math.hypot(dx, dy), al = acDeg(Math.atan2(dy, dx));
    return { W: dx + 120, H: Ht + 20, base: G => { G.wall(0, Ht - 60, e, 60).rect(xb - 80, Ht, -xb + 80 + e + V, 18, 'aload'); G.line(0, 0, 0, Ht - 60, 'aln').line(e, 0, e, Ht - 60, 'aln'); G.ground(xb - 80, e + V + 30); }, steps: [
      { t: 'Apeo vertical dentro', pz: ['AV', 'AC', 'AR'], p: [`Un vertical de dos puntales de ${amCm(P)} bajo el forjado: el más cercano a ${amCm(dI)} de la fachada y el otro a ${amCm(sep)} de él.`, `Cumbrera y solera de ${amCm(sep + 2 * vol)} y sus riostras (una horizontal y dos diagonales).`],
        d: G => { G.rect(xb - vol, 0, sep + 2 * vol, Sg).rect(xb - vol, Ht - Cg, sep + 2 * vol, Cg); [xa, xb].forEach(x => amPost(G, x, Sg, Ht - Cg, cu)); G.rect(xb - 5, Ht / 2 - 4.5, sep + 10, 9, 'aw2'); },
        c: G => G.dim(xa, Ht - 40, 0, Ht - 40, amCm(dI)).dim(xb, Ht - 70, xa, Ht - 70, amCm(sep)) },
      { t: 'Cumbrera bajo el voladizo', pz: ['CV'], p: [`Fuera: cumbrera de 90 cm bajo el voladizo, centrada a ${acF(fr)}/3 del vuelo (${amCm(fr * V / 3)} de la fachada).`], d: G => G.rect(xt - 45, Ht - Cg, 90, Cg), c: G => G.dim(e, Ht + 30, xt, Ht + 30, amCm(fr * V / 3)) },
      { t: 'Puntales inclinados', pz: ['PI'], p: [`Par de puntales de ${amCm(Li)} a ${acF(al)}°: de la solera del apeo (su extremo, a ${amCm(-xf)} de la fachada) a la cumbrera del voladizo, pasando por el hueco.`, `Los dos extremos ${acF(90 - al)}° fuera de escuadra (apoyan a nivel).`],
        d: G => G.bar(xf + 6, Sg, xt - 6, Ht - Cg, 12), c: G => G.angle(xf + 6, Sg, 50, 0, al, `${acF(al)}°`) },
      { t: 'Ejiones y carrera', pz: ['E', 'F'], p: ['Ejiones de 60 cm arriba (en la cumbrera del voladizo) y abajo, tras cada puntal inclinado.', 'Carrera de 90 cm unida al apeo vertical y cuñas para apretar.'],
        d: G => G.rect(xt + 2, Ht - 15, 40, 5, 'aw2').rect(xf - 10, 0, 10, 16).rect(xf - 50, 10, 40, 6, 'aw2') }
    ], rev: ['Comprueba que el puntal inclinado pasa por el hueco de la fachada: medidas orientativas.'], fin: G => G.dim(e + V + 20, 0, e + V + 20, Ht, amCm(Ht)) };
  },
  asnillas(v) {
    const tg = amG(v, 'T'), cabs = amN(v, 'cab', 10), H = v.H, S = v.S, nt = +v.nt, ha = 3 * tg, hT = H - tg - ha, dx = S / 2 - cabs, Lt = Math.hypot(dx, hT), al = acDeg(Math.atan2(hT, dx)), Ag = S * .9, x0 = S / 2 + 30;
    return { W: S + 100, H: H + 30, base: G => { apuSlab(G, x0 - S / 2 + 10, H, S - 20, 30); G.ground(x0 - S / 2 - 50, x0 + S / 2 + 50); }, steps: [
      { t: 'Durmiente', pz: ['D'], p: [`Durmiente de ${amCm(S + 60)} bajo cada pareja, centrado bajo la carga.`], d: G => G.rect(x0 - S / 2 - 30, 0, S + 60, tg), c: G => G.dim(x0 - S / 2 - 30, -16, x0 + S / 2 + 30, -16, amCm(S + 60)) },
      { t: 'Tornapuntas', pz: ['T'], p: [`${nt} tablones por tornapunta de ${amCm(Lt)}, a ${acF(al)}°: los pies separados ${amCm(S)} y las cabezas juntas en el centro, embarbilladas contra la aguja.`],
        d: G => { G.bar(x0 - S / 2, tg, x0 - cabs, H - ha, 18).bar(x0 + S / 2, tg, x0 + cabs, H - ha, 18); }, c: G => G.dim(x0 - S / 2, 30, x0 + S / 2, 30, amCm(S)).angle(x0 - S / 2, tg, 44, 0, al, `${acF(al)}°`) },
      { t: 'Aguja', pz: ['A'], p: [`Aguja de ${nt} tablones de ${amCm(Ag)} sobre las cabezas, contra la carga; bridas en la cabeza contra el giro.`], d: G => G.rect(x0 - Ag / 2, H - ha, Ag, ha).line(x0 - Ag / 2, H - 2 * tg, x0 + Ag / 2, H - 2 * tg, 'aln').line(x0 - Ag / 2, H - tg, x0 + Ag / 2, H - tg, 'aln'),
        c: G => G.dim(x0 + S / 2 + 20, 0, x0 + S / 2 + 20, H, amCm(H)) },
      { t: v.tir === 'ej' ? 'Ejiones' : 'Tirante', pz: v.tir === 'ej' ? ['E'] : [], p: [v.tir === 'ej' ? 'Un ejión de 60 cm en el durmiente tras cada pie, para que no se abran.' : `Tirante metálico de unos ${amCm(S)} uniendo los pies de cada pareja.`],
        d: G => v.tir === 'ej' ? G.rect(x0 - S / 2 - 70, 7, 60, 5, 'aw2').rect(x0 + S / 2 + 10, 7, 60, 5, 'aw2') : G.line(x0 - S / 2 + 10, 20, x0 + S / 2 - 10, 20, 'acab') },
      { t: 'Segunda pareja', pz: ['R'], p: [`Otra pareja igual a ${amCm(v.sepA)} y dos riostras en X entre las dos.`] }
    ], fin: G => G.dim(x0 + S / 2 + 20, 0, x0 + S / 2 + 20, H, amCm(H)) };
  },
  puente(v) {
    const tg = amG(v, 'T'), ta = amA(v, 'T'), cu = amN(v, 'cu', 4), vol = amN(v, 'vol', 30), orj = amN(v, 'or', 40), jx = amN(v, 'jx', 70);
    const L = v.L, H = v.H, nt = +v.nt, Pd = H - tg - cu, hp = ta, x0 = 50, xs = [x0, x0 + L], jab = !!v.jab;
    return { W: L + 160, H: H + 80, base: G => G.ground(x0 - 70, x0 + L + 70), steps: [
      { t: 'Durmientes', pz: ['D'], p: [`Dos durmientes de 80 cm con los centros a ${amCm(L)} uno de otro.`], d: G => xs.forEach(x => G.rect(x - 40, 0, 80, tg)), c: G => G.dim(xs[0], -16, xs[1], -16, amCm(L)) },
      { t: 'Pies derechos', pz: ['PD'], p: [`Cada pie derecho, ${nt} tablones de ${amCm(Pd)} juntos, de pie sobre su durmiente, con un par de cuñas debajo.`],
        d: G => xs.forEach(x => { G.cunas(x - 15, tg, 30, cu); G.rect(x - tg, tg + cu, 2 * tg, Pd).line(x, tg + cu, x, tg + cu + Pd, 'aln'); }), c: G => G.dim(xs[1] + 30, tg + cu, xs[1] + 30, H, amCm(Pd)) },
      { t: 'Puente', pz: ['PU'], p: [`${nt} tablones de ${amCm(L + 2 * vol)} de canto (o un perfil IPN/HEB) sobre los pies derechos, con ${amCm(vol)} de vuelo a cada lado, contra la carga.`],
        d: G => G.rect(x0 - vol, H, L + 2 * vol, hp).line(x0 - vol, H + hp / 2, x0 + L + vol, H + hp / 2, 'aln'), c: G => G.dim(x0 - vol, H + hp + 16, x0 + L + vol, H + hp + 16, amCm(L + 2 * vol)).dim(x0 - 50, 0, x0 - 50, H, amCm(H), true) },
      { t: 'Orejas y bridas', pz: ['O'], p: [`Cuatro orejas de ${amCm(ta + 2 * orj)}, a los dos lados de cada pie derecho, de ${amCm(orj)} por debajo del puente a ${amCm(orj)} por encima.`, 'Ocho bridas de atado, lo más cerca posible de las caras de arriba y de abajo del puente.'],
        d: G => xs.forEach(x => { G.rect(x - tg - 6, H - orj, 6, hp + 2 * orj, 'aw2').rect(x + tg, H - orj, 6, hp + 2 * orj, 'aw2'); [H - 3, H + hp + 3].forEach(y => G.rect(x - 16, y - 2, 32, 4, 'am')); }) },
      jab && { t: 'Jabalcones y tirante', pz: ['J'], p: [`Dos jabalcones de ${amCm(jx * Math.SQRT2)} con los extremos a 45°, de cada pie derecho al puente (${amCm(jx)} en horizontal y en vertical).`, `Tirante metálico de unos ${amCm(L)} entre los pies derechos.`],
        d: G => { G.bar(xs[0] + tg, H - jx, xs[0] + tg + jx, H, 12).bar(xs[1] - tg, H - jx, xs[1] - tg - jx, H, 12); G.line(xs[0] + tg, H - jx - 10, xs[1] - tg, H - jx - 10, 'acab'); } }
    ], rev: ['Arriostra los pies derechos en las dos direcciones si se puede.'], fin: G => G.dim(xs[0], -16, xs[1], -16, amCm(L)).dim(x0 - 50, 0, x0 - 50, H, amCm(H), true) };
  },

  /* ---------- Patrimonio ---------- */
  columna(v) {
    const ma = amA(v, 'M'), Sg = amG(v, 'S'), Cg = amG(v, 'C'), D = v.D, H = v.H, t = amG(v, 'M'), n = Math.max(4, Math.round(Math.PI * (D + t) / (ma + 15))), L = H - Sg - Cg, ne = Math.ceil(L / v.ses) + 1, ys = amRep(25, H - 25, ne), x0 = 20;
    const R = D / 2 + t / 2, cx = x0 + D + 40 + 60 + R, cy = H / 2;
    return { W: D + 2 * R + 200, H: H + 20, base: G => { G.rect(x0 + 20, 10, D, H - 20, 'aload'); G.circle(cx, cy, D / 2, 'aload'); G.text(cx, cy + R + 22, 'En planta', 11); G.ground(0, x0 + D + 60); }, steps: [
      { t: 'Solera', pz: ['S'], p: [`Base de dos piezas de ${amCm(D + 40)}, una a cada lado de la columna.`], d: G => G.rect(x0, 0, D + 40, Sg), c: G => G.dim(x0, -16, x0 + D + 40, -16, amCm(D + 40)) },
      { t: 'Maderos alrededor', pz: ['M'], p: [`${n} maderos de ${amCm(L)} repartidos alrededor de la columna (unos ${amCm(Math.PI * (D + t) / n)} entre centros), de pie sobre la solera.`],
        d: G => { amRep(x0 + 20 + t / 2, x0 + 20 + D - t / 2, Math.max(2, Math.round(n / 2))).forEach(x => G.rect(x - t / 2, Sg, t, L)); for (let k = 0; k < n; k++) { const a = 2 * Math.PI * k / n, px = cx + R * Math.cos(a), py = cy + R * Math.sin(a); G.rect(px - t / 2, py - t / 2, t, t); } },
        c: G => G.dim(x0 + D + 50, Sg, x0 + D + 50, H - Cg, amCm(L)) },
      { t: 'Eslingas', p: [`${ne} eslingas o cintas con trinquete de unos ${amCm(Math.PI * (D + 2 * t) + 60)}, a ${amLista(ys)} del suelo (cada ${amCm(v.ses)}).`, 'Apriétalas poco a poco y por igual, de abajo arriba.'],
        d: G => { ys.forEach(y => G.rect(x0 + 14, y - 3, D + 12, 6, 'aes')); G.circle(cx, cy, R + t / 2 + 2, 'aring'); } },
      { t: 'Cumbrera cuajada', pz: ['C'], p: [`Arriba, dos piezas de ${amCm(D + 40)} contra la carga.`], d: G => G.rect(x0, H - Cg, D + 40, Cg) }
    ], rev: ['Cintas según el grado de daño (tablas 1 y 2 del M8). No vale para hormigón armado.'], fin: G => G.dim(x0 + D + 50, 0, x0 + D + 50, H, amCm(H)) };
  },
  fachada(v) {
    const tg = amG(v, 'T'), lg = amG(v, 'L'), e = v.e, Al = v.Al, sb = v.sb, fil = Math.max(2, Math.ceil(Al / sb) + 1), ys = amRep(15, Al - 15, fil), Lb = e + 2 * tg + 2 * lg + 16, diam = e < 50 ? 6 : 8, x0 = 40;
    return { W: e + 160, H: Al + 30, base: G => { G.wall(x0, 0, e, Al + 20); G.ground(x0 - 60, x0 + e + 60); G.text(x0 + e / 2, Al + 30, 'Sección del muro', 10); }, steps: [
      { t: 'Encofrado de tablones', pz: ['T'], p: [`Tablones de ${amCm(Al)} de pie, pegados por las dos caras del muro y uno junto a otro en todo el ancho (${amCm(v.An)}).`], d: G => G.rect(x0 - tg, 0, tg, Al).rect(x0 + e, 0, tg, Al), c: G => G.dim(x0 - 30, 0, x0 - 30, Al, amCm(Al), true) },
      { t: 'Largueros', pz: ['L'], p: [`Largueros de ${amCm(v.An)} en horizontal sobre los tablones, por las dos caras, a la altura de cada fila de barras: ${amLista(ys)}.`],
        d: G => ys.forEach(y => G.rect(x0 - 17, y - 5, 10, 10).rect(x0 + e + 7, y - 5, 10, 10)), c: G => amCotasV(G, x0 + e + 40, ys) },
      { t: 'Taladra y mete las barras', p: [`Taladra a través del muro en cada fila y cada ${amCm(sb)} a lo largo: ${fil} filas.`, `Barras de acero de Ø ${diam} mm de unos ${amCm(Lb)} (${amCm(e)} de muro + 50).`],
        d: G => ys.forEach(y => G.rect(x0 - 25, y - 1.5, e + 50, 3, 'am')), c: G => G.dim(x0 - 25, ys[fil - 1] + 18, x0 + e + 25, ys[fil - 1] + 18, amCm(Lb)) },
      { t: 'Placas y tensado', p: ['Placa y tuerca en cada extremo. Tensa desde el lado con mejor vía de escape, poco a poco y por igual.'], d: G => ys.forEach(y => G.rect(x0 - 23, y - 8, 4, 16, 'am3').rect(x0 + e + 19, y - 8, 4, 16, 'am3')) }
    ], rev: ['Solo con autorización de la autoridad que tutela el bien. Apuntala antes los forjados que cargan en el muro.'], fin: G => G.dim(x0 - 30, 0, x0 - 30, Al, amCm(Al), true) };
  }
};

/* ---------- Montajes compartidos ---------- */
// Muro con el hueco (puerta o ventana) de A × Hh
const amHuecoBase = (A, Hh) => G => { G.wall(-40, 0, A + 80, Hh + 50).rect(0, 0, A, Hh, 'ahole'); G.ground(-40, A + 40); };
function amHolm(v, n) {
  const Sg = amG(v, 'S'), Cg = amG(v, 'C'), H = v.H, cab = +v.cab || 0, h = AC_HOLM.find(x => x[0] === v.mod) || AC_HOLM[0], L = H - Sg - Cg - cab, c = acHolmCombo(L * 10, h[2], h[3]), C = amN(v, 'c1', 90), xs = n > 1 ? [C * .27, C * .73] : [C / 2];
  let pos = null;
  return { W: C + 60, H, base: G => { apuSlab(G, -25, H, C + 50, 12); G.ground(-25, C + 25); }, steps: [
    { t: 'Mide y calcula', p: [`Del suelo al techo: ${amCm(H)}. Quita solera y cumbrera (${acF(Sg + Cg, 1)})${cab ? ` y los cabezales (${amCm(cab)})` : ' y el alto de tus cabezales (mételo arriba)'}: el puntal con sus extensiones mide ${amCm(L)}.`,
      c ? `Combinación: ${amHolmTxt(c, h)}.` : 'Con ese puntal no sale ninguna combinación: elige otro arriba.'], c: G => G.dim(C + 14, 0, C + 14, H, amCm(H)) },
    { t: 'Cumbrera, solera y cabezales', pz: ['C', 'S'], p: [`Cumbrera y solera de ${amCm(C)}.`, `Clava ${n > 1 ? `los cabezales soporte de viga con el centro a ${amCm(xs[0])} de cada extremo` : 'el cabezal soporte de viga centrado'} en la cumbrera, y ${n > 1 ? 'los giratorios' : 'el giratorio'} (o base triple) en la solera.`],
      d: G => { G.rect(0, H - Cg, C, Cg).rect(0, 0, C, Sg); amCabezales(G, xs, Sg, H - Cg, cab); } },
    { t: 'Monta el puntal', p: [c ? `De abajo arriba: ${amHolmTxt(c, h).replace(/, extendido.*/, '')}. Las extensiones cortas, siempre al final, nunca en medio.` : 'Elige otro puntal: con este no se llega.'],
      d: G => xs.forEach(x => { pos = amHolmStack(G, x, Sg, H - Cg, c, h, cab); }), c: G => G.dim(-14, Sg + cab / 2, -14, H - Cg - cab / 2, amCm(L), true) },
    { t: 'Coloca y aprieta', p: [c ? `Lleva el conjunto a su sitio y extiende ${acF(c.ext / 10, 1)} cm (de ${acF(h[3] / 10, 1)} cm de recorrido).` : '', 'El último apriete de hidráulicos y neumáticos, siempre a mano. Recoge mangueras y bombas.'].filter(Boolean),
      c: G => pos && pos.e1 - pos.e0 > 1 && G.dim(xs[xs.length - 1] + 26, pos.e0, xs[xs.length - 1] + 26, pos.e1, `${acF(c.ext / 10, 1)} cm`) }
  ], rev: ['Uso puntual y temporal: sin arriostramiento entre sí, hasta poner madera.'], fin: G => G.dim(C + 14, 0, C + 14, H, amCm(H)) };
}
// Laterales de triángulo con 10×10 (solera fija) o con tablón
function amLateral(v, tab) {
  const ang = +v.ang, a = ang * ACR, ej = amN(v, 'ej', ang === 60 ? 75 : 60), cl = ej >= 75 ? 20 : 14, tope = amN(v, 'tope', 4), nt = Math.max(1, Math.round(v.nt)), tg = tab ? amG(v, 'T') : amG(v, 'S'), I = v.I;
  const pa = tab ? amA(v, 'T') : amA(v, 'P'), Ls = I / Math.tan(a), Lp = I / Math.sin(a), top = [tg + 2, I], foot = [Ls, tg + 4], mid = [(top[0] + foot[0]) / 2, (top[1] + foot[1]) / 2], pw = tab ? 2 * tg : pa;
  const corte = `diagonal desde ${amCm(pa / Math.tan((90 - ang) * ACR))} de la esquina arriba y ${amCm(pa / Math.tan(a))} abajo, y tope perpendicular de ${amCm(tope)}`;
  const filas = 2 + (I > 240 ? 1 : 0);
  return { W: Ls + ej + 100, H: I + ej, base: G => { G.wall(-30, 0, 30, I + ej + 40); G.ground(-30, Ls + ej + 90); }, steps: [
    { t: 'Solera y zapata mural', pz: ['S', 'Z'], p: [`Solera de ${amCm(Ls + ej)} en el suelo, contra el muro y perpendicular a él.`, `Zapata mural de ${amCm(I + ej)} de pie contra el muro, sobre la solera. Marca la inserción a ${amCm(I)} del suelo (a la altura del forjado o hasta 60 cm por debajo, nunca por encima).`],
      d: G => G.rect(0, 0, Ls + ej, tg).rect(0, tg, tg, I + ej - tg), c: G => G.dim(0, -16, Ls + ej, -16, amCm(Ls + ej)).dim(-44, 0, -44, I, amCm(I), true) },
    { t: tab ? 'Tornapunta de dos tablones' : 'Puntal', pz: ['P'], p: [`${tab ? 'Dos tablones embridados' : 'Puntal'} de ${amCm(Lp)} de vértice a vértice, con los encuentros a ${ang}° (${corte}). Preséntalo antes de cortar.`,
      `Arriba contra la zapata en la inserción; abajo, el pie en la solera a ${amCm(Ls)} del muro.`],
      d: G => { G.bar(top[0], top[1], foot[0], foot[1], pw); if (tab) { G.line(top[0], top[1], foot[0], foot[1], 'aln'); amBridasL(G, top, foot, [.25, .5, .75], tg + 4); } },
      c: G => G.dim(0, -16, Ls, -16, amCm(Ls)).angle(foot[0], foot[1], 44, 180, 180 - ang, `${ang}°`) },
    { t: 'Ejiones', pz: ['E'], p: [`Ejión de ${ej} cm en la zapata, justo encima del puntal, y otro de tope en la solera, tras el pie: ${cl} clavos cada uno.`, 'Par de cuñas entre el pie del puntal y el ejión de tope: apriétalas hasta que el puntal entre en carga, sin empujar el muro.'],
      d: G => { G.rect(tg, I + 6, 5, ej - 8, 'aw2'); G.cunas(foot[0] + pw / 2 + 1, tg, 5, 12, true).rect(foot[0] + pw / 2 + 6, tg, ej, 5, 'aw2'); } },
    tab ? { t: 'Cuña en la esquina', p: ['Clava una cuña en la esquina entre zapata y solera para que no se cierren.'], d: G => G.poly([[tg, tg], [tg + 20, tg], [tg, tg + 20]], 'aw2') }
      : { t: 'Riostras centrales y pletinas', pz: ['RC'], p: [`Dos riostras de ${apuMad(v, 'R').s} de unos ${amCm(Lp / 2 + 10)}: de la esquina zapata–solera al centro del puntal, una a cada lado.`, 'Pletinas 30×30 en las uniones zapata–puntal, zapata–solera y solera–puntal, por las dos caras.'],
        d: G => { G.bar(tg + 3, tg + 3, mid[0], mid[1], 7, 'aw2'); G.plate(-5, I - 26, 30, 30).plate(-5, 0, 30, 30).plate(foot[0] - 18, 0, 30, 30); } },
    { t: 'Carrera y anclajes', pz: ['F'], p: [`Carrera de ${apuMad(v, 'F').s} tras las soleras, anclada con barras de 2 cm de Ø y 1,5 m (en hormigón, con martillo perforador), y un par de cuñas entre solera y carrera.`], d: G => apuFreno(G, Ls + ej + 4, 0, 1) },
    nt > 1 && { t: 'Resto de sistemas y riostras', pz: ['RH', 'RD'], p: [`${nt} sistemas iguales, cada ${amCm(v.sep)} (máx. 2,4 m), con la carrera común.`, `Entre cada dos: ${filas} riostras horizontales de ${amCm(v.sep + 20)} (${filas === 3 ? 'arriba, abajo y una intermedia' : 'arriba y abajo'} de los puntales) y dos diagonales en cruz.`] }
  ], fin: G => G.dim(-44, 0, -44, I, amCm(I), true).dim(0, -16, Ls + ej, -16, amCm(Ls + ej)) };
}
// Inclinados: perpendiculares a la carga o al suelo (se dibuja un sistema; el otro, igual al lado)
function amIncl(v, kind) {
  const th = v.th * ACR, n = Math.max(2, Math.round(v.n)), cs = Math.cos(th), sn = Math.sin(th), tn = Math.tan(th), h = v.h, sep = v.sep, ld = x => h + x * tn;
  const st = [], tops = [], feet = [], lens = [], cg = amG(v, 'C'), sg = amG(v, 'S'), pa = amA(v, 'P');
  if (kind === 'carga') {
    for (let i = 0; i < n; i++) { const d = i * sep, x = d * cs, y = h + d * sn, L = (y - cg * cs - sg) / cs; lens.push(L); tops.push([x + cg * sn, y - cg * cs]); feet.push([x + cg * sn + L * sn, sg]); }
    const s0 = feet[0][0] - 40, s1 = feet[n - 1][0] + 60, cum = d => [d * cs + 5 * sn, h + d * sn - 5 * cs];
    const ca = cum(-30), cb = cum((n - 1) * sep + 30), dF = feet.map(f => f[0] - feet[0][0]);
    return { W: s1 + 120, H: ld(s1), base: G => { G.bar(-80, ld(-80) + 8, s1 + 60, ld(s1 + 60) + 8, 16, 'aload'); G.ground(-80, s1 + 110); }, steps: [
      { t: 'Mide', p: [`Inclinación de la carga: ${acF(v.th)}°. Altura vertical del suelo a la cara de abajo de la carga donde irá el puntal más bajo: ${amCm(h)}.`], c: G => G.line(0, 0, 0, h, 'acab').dim(-20, 0, -20, h, amCm(h), true) },
      { t: 'Cumbrera contra la carga', pz: ['C'], p: [`Cumbrera de ${amCm((n - 1) * sep + 60)} pegada a la carga, con 30 cm de voladizo (máx.) más allá del primer y del último puntal.`], d: G => G.bar(ca[0], ca[1], cb[0], cb[1], 10) },
      { t: 'Solera', pz: ['S'], p: [`Solera de ${amCm(s1 - s0)} en el suelo: empieza 40 cm antes del pie del primer puntal y sobresale 60 cm por el lado de los ejiones.`], d: G => G.rect(s0, 0, s1 - s0, 10), c: G => G.dim(s0, -16, s1, -16, amCm(s1 - s0)) },
      { t: 'Puntales', pz: lens.map((_, i) => `P${i + 1}`), p: [`${n} puntales a 90° con la carga, cada ${amCm(sep)} a lo largo de ella: ${lens.map((L, i) => `P${i + 1} de ${amCm(L)}`).join(', ')}.`, `Arriba escuadra; abajo ${acF(v.th)}° fuera de escuadra para que apoye a nivel. Pies a ${amLista(dF)} del primero, en la solera.`],
        d: G => tops.forEach((p, i) => G.bar(p[0], p[1], feet[i][0], feet[i][1], 10)), c: G => { for (let i = 1; i < n; i++) G.dim(feet[i - 1][0], 40, feet[i][0], 40, amCm(dF[i] - dF[i - 1])); } },
      { t: 'Ejiones y cuñas', pz: ['E'], p: ['Tras el pie de cada puntal, un par de cuñas y un ejión de 45 cm con 14 clavos.', 'Aprieta las cuñas hasta que el puntal entre en carga.'], d: G => feet.forEach(f => G.cunas(f[0] + 7, 10, 4, 10, true).rect(f[0] + 11, 10, 45, 5, 'aw2')) },
      { t: 'Diagonal y medias pletinas', pz: ['RD'], p: [`Riostra diagonal de unos ${amCm(Math.hypot(feet[n - 1][0] - feet[0][0] + (lens[n - 1] - lens[0]) * sn + 20, lens[n - 1] * cs) + 20)} que une la solera, el pie y la cabeza de los puntales y la cumbrera.`, 'Medias pletinas en cada unión de puntal con cumbrera y solera.'],
        d: G => { G.bar(feet[0][0] - 20, 13, tops[n - 1][0] - 4, tops[n - 1][1] - 6, 6, 'aw2'); feet.forEach(f => G.plate(f[0] - 12, 0, 22, 22, 'ap2')); } },
      ...amInclFin(v, Math.max(...lens), s1 + 4, 1)
    ], fin: G => G.dim(-20, 0, -20, h, amCm(h), true) };
  }
  const xs = Array.from({ length: n }, (_, i) => i * sep), yb = x => ld(x) - cg / cs;
  xs.forEach(x => lens.push(yb(x) - sg));
  const ca = [-30 * cs, 0], cb = [xs[n - 1] + 60 * cs, 0], S0 = -35, S1 = xs[n - 1] + 35;
  return { W: S1 + 140, H: ld(S1 + 60), base: G => { G.bar(-80, ld(-80) + 8, S1 + 100, ld(S1 + 100) + 8, 16, 'aload'); G.ground(-120, S1 + 100); }, steps: [
    { t: 'Mide', p: [`Inclinación de la carga: ${acF(v.th)}°. Altura del suelo a la cara de abajo de la carga donde irá el puntal más bajo: ${amCm(h)}.`], c: G => G.line(0, 0, 0, h, 'acab').dim(-20, 0, -20, h, amCm(h), true) },
    { t: 'Cumbrera contra la carga', pz: ['C'], p: [`Cumbrera de ${amCm((n - 1) * sep / cs + pa / cs + 90)} pegada a la carga: 30 cm de voladizo por abajo y 60 cm por arriba.`], d: G => G.bar(ca[0], ld(ca[0]) - 5 / cs, cb[0], ld(cb[0]) - 5 / cs, 10) },
    { t: 'Solera', pz: ['S'], p: [`Solera de ${amCm(S1 - S0 + pa - 10)}: 30 cm más allá de cada puntal.`], d: G => G.rect(S0, 0, S1 - S0, 10), c: G => G.dim(S0, -16, S1, -16, amCm(S1 - S0)) },
    { t: 'Puntales verticales', pz: lens.map((_, i) => `P${i + 1}`), p: [`${n} puntales verticales cada ${amCm(sep)}: ${lens.map((L, i) => `P${i + 1} de ${amCm(L)}`).join(', ')} (por el lado largo).`, `Abajo escuadra; arriba bisel de ${acF(v.th)}° para que apoye entero en la cumbrera.`],
      d: G => xs.forEach(x => G.poly([[x - 5, 10], [x + 5, 10], [x + 5, yb(x + 5)], [x - 5, yb(x - 5)]])), c: G => { for (let i = 1; i < n; i++) G.dim(xs[i - 1], 40, xs[i], 40, amCm(sep)); } },
    { t: 'Ejiones', pz: ['E'], p: ['En la cumbrera, un ejión de 45 cm tras la cabeza de cada puntal (por el lado alto), con 14 clavos.'], d: G => xs.forEach(x => G.bar(x + 6, yb(x + 6) - 2.5, x + 6 + 42 * cs, yb(x + 6 + 42 * cs) - 2.5, 5, 'aw2')) },
    { t: 'Diagonal y medias pletinas', pz: ['RD'], p: [`Riostra diagonal de unos ${amCm(Math.hypot((n - 1) * sep + 20, lens[n - 1]) + 20)} que une solera, puntales y cumbrera.`, 'Medias pletinas en cada unión de puntal con cumbrera y solera.'],
      d: G => { G.bar(xs[0] - 22, 13, xs[n - 1] + 22, yb(xs[n - 1] + 22) - 6, 6, 'aw2'); xs.forEach(x => G.plate(x - 8, 0, 16, 24, 'ap2')); } },
    ...amInclFin(v, Math.max(...lens), S0 - 4, -1)
  ], fin: G => G.dim(-20, 0, -20, h, amCm(h), true) };
}
const amInclFin = (v, hm, fx, dir) => [
  { t: 'Segundo sistema', pz: ['RS', 'RH'], p: [`Otro sistema igual, a ${amCm(v.sepS)}. Únelos con riostras horizontales arriba y abajo de cada pareja de puntales y riostras ${hm < 120 ? 'en Z (menos de 1,2 m)' : 'en X'} entre ellos.`] },
  { t: 'Carrera', pz: ['F'], p: [`Carrera de ${amCm(v.sepS + 40)} tras las soleras, con dos estacas de 2 cm de Ø y 0,5 m, y un par de cuñas entre cada solera y la carrera.`], d: G => apuFreno(G, fx, 0, dir) }
];

/* ==================== VISTA ==================== */
const APU_PASO = {};
function apuMontaje(id) {
  const b = APU_MONTAJE[id]; if (!b) return null;
  const r = apuCortes(id); if (r.err) return { err: r.err };
  const m = b(r.v, r);
  m.steps = m.steps.filter(Boolean);
  m.steps.push({ t: 'Comprueba y revisa', all: true, c: m.fin,
    p: [...(m.rev || []), 'Comprueba con el nivel que todo está a plomo y apretado, y que no queda ninguna pieza suelta.', 'Revisa el apuntalamiento cada 12 h (con los relevos) y siempre después de una réplica o un derrumbe.'] });
  m.r = r;
  return m;
}
// Paso k: lo anterior apagado, lo de este paso en naranja y sus cotas
function apuMontFig(m, k, alt) {
  const st = m.steps[k];
  return apuFig(m.W, m.H, G => {
    m.base?.(G);
    m.steps.forEach((s, i) => { if (s.d) G.grp(i > k ? 'apu-fut' : st.all ? 'apu-all' : i === k ? 'apu-new' : 'apu-old', () => s.d(G)); });
    st.c?.(G);
  }, alt);
}
// Las medidas del texto, en negrita
const amFmt = s => esc(s).replace(/(\d[\d.,]*\s?(?:cm|mm|°))/g, '<b>$1</b>');
function apuMontajePanel(t) {
  const m = apuMontaje(t.id); if (!m) return '';
  const head = `<h3 class="sec-title" style="margin:0">${ic('play')} Montaje con tus medidas</h3>`;
  if (m.err) return `<div class="panel apu-mont" id="apu-mont">${head}<p class="muted" style="margin-top:8px">Completa las medidas de arriba para ver el montaje.</p></div>`;
  const N = m.steps.length, k = Math.max(0, Math.min(APU_PASO[t.id] || 0, N - 1)), s = m.steps[k];
  const pz = (s.pz || []).map(c => m.r.pz.find(p => p.c === c)).filter(Boolean);
  return `
    <div class="panel apu-mont" id="apu-mont">
      <div class="between sec-head">${head}<span class="tag neutral">Paso ${k + 1} de ${N}</span></div>
      <div class="apu-dots">${m.steps.map((x, i) => `<button class="apu-dot ${i === k ? 'on' : i < k ? 'done' : ''}" onclick="apuPaso('${t.id}', ${i})" aria-label="Paso ${i + 1}: ${esc(x.t)}"${i === k ? ' aria-current="step"' : ''}>${i + 1}</button>`).join('')}</div>
      <h4 class="apu-step-t">${k + 1}. ${esc(s.t)}</h4>
      <figure class="apu-fig apu-mont-fig">${apuMontFig(m, k, `${t.name}, paso ${k + 1}: ${s.t}`)}</figure>
      ${pz.length ? `<div class="apu-pzs">${pz.map(p => `<span class="apu-pz"><span class="arc-code">${esc(p.c)}</span> ${p.q} × ${esc(p.n)} <b>${p.l} cm</b></span>`).join('')}</div>` : ''}
      <ul class="apu-mont-p">${s.p.map(x => `<li>${amFmt(x)}</li>`).join('')}</ul>
      <div class="row apu-mont-btns">
        <button class="btn btn-g" ${k ? '' : 'disabled'} onclick="apuPaso('${t.id}', ${k - 1})">${ic('back', 'i-sm')} Anterior</button>
        ${k < N - 1 ? `<button class="btn btn-a" onclick="apuPaso('${t.id}', ${k + 1})">Siguiente ${ic('chev', 'i-sm')}</button>` : `<button class="btn btn-g" onclick="apuPaso('${t.id}', 0)">${ic('refresh', 'i-sm')} Desde el principio</button>`}
        <button class="btn btn-g" onclick="apuMontPrint('${t.id}')">${ic('printer')} Imprimir</button>
      </div>
      <p class="muted" style="margin-top:10px;font-size:13px">Dibujo a escala con tus medidas: en naranja, lo que se pone en este paso; en gris, lo ya montado.</p>
    </div>`;
}
function apuPaso(id, k) {
  APU_PASO[id] = k;
  const el = $('apu-mont'); if (!el) return;
  el.outerHTML = apuMontajePanel(apuGet(id));
  const nu = $('apu-mont'), top = nu.getBoundingClientRect().top;
  if (top < 0) nu.scrollIntoView({ block: 'start' });
}
function apuMontPrint(id) {
  const t = apuGet(id), m = apuMontaje(id); if (!m || m.err) return;
  const v = m.r.v || {};
  $('print').innerHTML = `<div class="arc-print"><h1>Montaje · ${esc(t.name)}${v.eq ? ' · ' + esc(v.eq) : ''}</h1>
    <p>${APU_CORTES[id].in.filter(f => f.k !== 'eq').map(f => `${esc(f.l)}: <b>${esc(f.o ? (f.o.find(o => String(o[0]) === String(v[f.k]))?.[1] || '') : v[f.k] + (f.u ? ' ' + f.u : ''))}</b>`).join(' · ')}</p>
    ${m.steps.map((s, k) => `<section class="apu-print-step"><h2>Paso ${k + 1}. ${esc(s.t)}</h2><div class="arc-print-fig">${apuMontFig(m, k, s.t)}</div><ul>${s.p.map(x => `<li>${amFmt(x)}</li>`).join('')}</ul></section>`).join('')}</div>`;
  print();
}
