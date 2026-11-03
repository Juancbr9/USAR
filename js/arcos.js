'use strict';
/*
 * USAR 242 · Apuntalamiento de arcos con madera (cuadro + cerchas): geometría, lista de cortes y avisos.
 * Cálculo puro, sin pantalla: unidades en centímetros y grados. En el navegador queda como `ARCO`;
 * en Node se carga con require('../js/arcos.js') (pruebas en tests/arcos.test.js).
 *
 * Cada regla lleva su fuente en un comentario. Abreviaturas:
 *   MC  = Manual de Campo USAR (2023)
 *   M6  = UME, M6 UD3 UA3 "Apuntalamientos" (dic. 2024)
 *   M8  = UME, M8 UD1 UA1 "Técnicas específicas" (apuntalamiento de arcos)
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ARCO = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const r1 = v => Math.round(v * 10) / 10;
  const rUp = v => Math.ceil(v - 1e-6);   // piezas brutas: por exceso
  const rDn = v => Math.floor(v + 1e-6);  // piezas que encajan: por defecto
  const coma = v => String(v).replace('.', ',');
  const c1 = v => coma(r1(v));

  /* ---------------- constantes de los manuales ---------------- */
  const REGLAS = {
    luzPorPuntal: 150,        // M8 p.7: puntal intermedio por cada 1,50 m de luz
    sepMaxPorticos: 120,      // MC p.93 / M6 p.21: 1,2 m entre puntales
    riostraCompMax: 225,      // M6 p.4: riostras horizontales y diagonales ≤ 2,25 m
    riostraXMax: 300,         // M6 p.4: riostras en X (solo tracción) 3 m o más
    alturaRiostraH: 180,      // MC p.93/95: riostra horizontal central si h > 1,8 m
    alturaDosRiostrasH: 335,  // MC p.94: dos riostras horizontales por encima de 3,35 m
    alturaMax10x10: 330,      // MC p.91 / M6 p.20: 3,3 m con 10x10
    tercioTablon: 1 / 3,      // M8 p.8: respetar 1/3 del tablón en las cerchas
    holguraLateral: 4,        // MC p.111 / M6 p.68: 4 cm menor que el hueco
    huecoCunas: 4,            // M6 p.20-21: restar 4 cm con cuñas de 5x10
    cuerdaMaxCamon: 120,      // criterio propio: tramo sin apoyo ≤ separación de puntales
    revisionHoras: 12,        // MC p.86 / M6 p.5
    clavos: { pletina: 13, media: 8, triangular: 13, taco: 5, cuna: 1, riostraExtremo: 4, jabalcon: 8 } // M6 p.21, 68
  };

  const SECCIONES = {
    '10x10': { nombre: '10×10', a: 10, b: 10, ts: 10, tc: 10, solera: '10×10', cumbrera: '10×10' },
    '15x15': { nombre: '15×15', a: 15, b: 15, ts: 15, tc: 15, solera: '15×15', cumbrera: '15×15' },
    '20x7x2': { nombre: '2 tablones 20×7 embridados', a: 14, b: 20, ts: 7, tc: 20, solera: 'tablón 20×7 plano', cumbrera: '2 tablones 20×7 de canto' }
  };

  /* ---------------- geometría del arco ----------------
   * Origen: centro de la luz en la línea de arranque. y hacia arriba.
   * Se modela la semi-curva izquierda como arco de circunferencia:
   *   f <  L/2 → rebajado (un centro bajo el arranque)
   *   f ≈  L/2 → medio punto
   *   f >  L/2 → apuntado (dos centros sobre la línea de arranque)
   */
  function arco(L, f) {
    let tipo, cx = 0, cy = 0, R;
    if (Math.abs(f - L / 2) <= 0.5) tipo = 'medio punto';
    else tipo = f < L / 2 ? 'rebajado' : 'apuntado';
    if (f < L / 2) { R = (L * L / 4 + f * f) / (2 * f); cy = f - R; }
    else if (f > L / 2) { cx = (f * f - L * L / 4) / L; R = cx + L / 2; }
    else R = L / 2;
    const phiS = Math.atan2(0 - cy, -L / 2 - cx);
    const phiK = Math.atan2(f - cy, 0 - cx);
    return { tipo, cx, cy, R, phiS, phiK, span: phiS - phiK, L, f };
  }
  function yAt(A, r, x) { const dx = x - A.cx, v = r * r - dx * dx; return v < 0 ? NaN : A.cy + Math.sqrt(v); }
  const pt = (A, r, ang) => ({ x: A.cx + r * Math.cos(ang), y: A.cy + r * Math.sin(ang) });
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });

  /* Camón (M8 p.8-10): pieza de tablón de ancho W con el borde interior RECTO
   * (canto del tablón) y el exterior curvo (intradós reducido). Extremos:
   *  'r' radial (juntas), 'h' a nivel (arranque de arco rebajado), 'v' a plomo (clave de arco apuntado). */
  function camon(A, Ro, W, a1, a2, endS, endK) {
    const N = 40, outer = [];
    for (let i = 0; i <= N; i++) outer.push(pt(A, Ro, a1 + (a2 - a1) * i / N));
    const pS = outer[0], pK = outer[N], am = (a1 + a2) / 2, pA = pt(A, Ro, am);
    const nIn = { x: -Math.cos(am), y: -Math.sin(am) };     // hacia el interior, perpendicular a la cuerda
    const ul = Math.hypot(pK.x - pS.x, pK.y - pS.y), u = { x: (pK.x - pS.x) / ul, y: (pK.y - pS.y) / ul };
    const dirOf = (type, ang, isS) => type === 'h' ? { x: 1, y: 0 } : type === 'v' ? { x: 0, y: -1 } : { x: -Math.cos(ang), y: -Math.sin(ang) };
    const hit = (p, d) => { const t = (W - dot(sub(p, pA), nIn)) / dot(d, nIn); return { x: p.x + t * d.x, y: p.y + t * d.y }; };
    const dS = dirOf(endS, a1, true), dK = dirOf(endK, a2, false);
    const iS = hit(pS, dS), iK = hit(pK, dK);
    const flecha = Ro * (1 - Math.cos((a1 - a2) / 2));      // sagita del trasdós sobre la cuerda
    const cantoExtremo = Math.min(W - dot(sub(pS, pA), nIn), W - dot(sub(pK, pA), nIn));
    // coordenadas de tablón: s a lo largo, t desde el canto que se corta (arriba)
    const raw = outer.concat([iK, iS]).map(p => ({ s: dot(sub(p, pS), u), t: dot(sub(p, pA), nIn) }));
    const smin = Math.min(...raw.map(p => p.s)), smax = Math.max(...raw.map(p => p.s));
    const loc = p => ({ s: dot(sub(p, pS), u) - smin, t: dot(sub(p, pA), nIn) });
    const O = outer.map(loc);
    const offSq = d => Math.abs(90 - Math.acos(Math.min(1, Math.abs(dot(d, u)))) * R2D);
    const ord = [];
    const len = smax - smin;
    const tAt = s => { for (let i = 0; i < O.length - 1; i++) { const p = O[i], q = O[i + 1]; if (s >= Math.min(p.s, q.s) - 1e-6 && s <= Math.max(p.s, q.s) + 1e-6) return p.t + (s - p.s) / ((q.s - p.s) || 1e-9) * (q.t - p.t); } return null; };
    for (let s = 0; s <= len + 1e-6; s += 10) ord.push({ s: Math.round(s), ext: tAt(s) });
    if (len % 10 > 0.5) ord.push({ s: r1(len), ext: tAt(len) });
    return {
      a1, a2, endS, endK, outer, pS, pK, iS, iK, poly: outer.concat([iK, iS]),
      len, W, flecha, cantoExtremo, cutS: offSq(dS), cutK: offSq(dK), O, ord,
      esquinas: { extArr: loc(pS), intArr: loc(iS), extClave: loc(pK), intClave: loc(iK) }
    };
  }

  function calcular(inp) {
    const W = [], warn = (nivel, txt, ref) => W.push({ nivel, txt, ref });
    const sec = SECCIONES[inp.seccion] || SECCIONES['10x10'];
    const gArco = num(inp.holguraArco, 2);           // entre cercha e intradós (calzos)
    const gLat = num(inp.holguraLateral, REGLAS.holguraLateral);
    const gapW = num(inp.huecoCunas, REGLAS.huecoCunas);
    const Ha = (inp.Hizq + inp.Hder) / 2, Hmin = Math.min(inp.Hizq, inp.Hder);
    const L = inp.Larr, f = inp.Hclave - Ha;
    if (!(L > 30) || !(f > 5) || !(Hmin > 50) || !(inp.fondo > 0)) return { error: 'Revisa las medidas: la clave tiene que estar por encima del arranque y la luz, el arranque y el fondo tienen que ser mayores que cero.' };
    if (!(inp.tablonAncho >= 10 && inp.tablonAncho <= 60) || !(inp.tablonGrueso > 0) || !(inp.stockViga >= 100) || !(inp.stockTablon >= 100)) return { error: 'Revisa la madera: el tablón de las cerchas entre 10 y 60 cm de ancho, con grueso, y las barras de al menos 100 cm.' };
    const A = arco(L, f);
    const tCorr = inp.correas ? num(inp.grosorCorrea, 2.5) : 0;
    const Ro = A.R - gArco - tCorr;
    const Wb = inp.tablonAncho, cantoMin = Wb * REGLAS.tercioTablon;

    if (Math.abs(inp.Hizq - inp.Hder) > 3) warn('alto', `El arranque izquierdo y el derecho difieren ${c1(Math.abs(inp.Hizq - inp.Hder))} cm. La cumbrera va a nivel en el arranque más bajo; calza el camón del lado alto con esa diferencia.`);
    const Lw = Math.min(inp.Larr, inp.Lsuelo || inp.Larr);
    if (inp.Lsuelo && Math.abs(inp.Lsuelo - inp.Larr) > 3) warn('alto', `La luz en el suelo y en el arranque difieren ${c1(Math.abs(inp.Lsuelo - inp.Larr))} cm: jambas desplomadas. El cuadro se fabrica con la luz menor (${c1(Lw)} cm) y se ajusta con cuñas y calzos.`, 'M6 p.69');

    let checkQ = null;
    if (inp.hq) {
      const pred = Ha + yAt(A, A.R, -L / 4);
      checkQ = { medido: inp.hq, previsto: r1(pred), dif: r1(inp.hq - pred) };
      if (Math.abs(inp.hq - pred) > 3) warn('alto', `La altura a ¼ de la luz (${inp.hq} cm) no cuadra con un arco de circunferencia (saldría ${c1(pred)} cm). Puede ser carpanel, elíptico o estar deformado: el cuadro vale, pero saca las cerchas con plantilla de cartón o peine copiador.`, 'M8 p.9, 11');
    }

    /* ---- división del arco en cerchas (M8; «camones» en el MC) ---- */
    let sol = null;
    for (let n = 1; n <= 8 && !sol; n++) {
      const th = A.span / n; let ok = true, worst = 1e9, maxLen = 0;
      for (let k = 0; k < n; k++) {
        const a1 = A.phiS - k * th, a2 = a1 - th;
        const c = camon(A, Ro, Wb, a1, a2, k === 0 && A.tipo === 'rebajado' ? 'h' : 'r', k === n - 1 && A.tipo === 'apuntado' ? 'v' : 'r');
        worst = Math.min(worst, c.cantoExtremo); maxLen = Math.max(maxLen, c.len);
      }
      if (worst >= cantoMin - 0.05 && maxLen <= REGLAS.cuerdaMaxCamon + 5) sol = { n, th };
    }
    if (!sol) { sol = { n: 8, th: A.span / 8 }; warn('alto', `Con tablón de ${Wb} cm no se respeta el tercio del tablón en las cerchas. Usa tablón más ancho.`, 'M8 p.8'); }
    const n = sol.n, th = sol.th;
    const camones = [];
    for (let k = 0; k < n; k++) {
      const a1 = A.phiS - k * th, a2 = a1 - th;
      const c = camon(A, Ro, Wb, a1, a2, k === 0 && A.tipo === 'rebajado' ? 'h' : 'r', k === n - 1 && A.tipo === 'apuntado' ? 'v' : 'r');
      c.k = k; camones.push(c);
    }
    const sig = c => `${Math.round(c.len)}|${Math.round(c.cutS * 2)}|${Math.round(c.cutK * 2)}`;
    const tipos = [];
    camones.forEach(c => { let t = tipos.find(x => x.sig === sig(c)); if (!t) { t = { sig: sig(c), ref: c, ks: [] }; tipos.push(t); } t.ks.push(c.k); });
    tipos.forEach((t, i) => { t.code = 'CE' + (i + 1); t.ks.forEach(k => camones[k].code = t.code); });
    if (n > 2) warn('info', `Arco grande: salen ${2 * n} cerchas por pórtico y ${n - 1} jabalcones por lado. El manual pone como ideal 90° en el centro y 45° en los demás, pero admite más divisiones según la longitud del arco.`, 'M8 p.8');

    /* ---- cuadro ---- */
    const paso = !!inp.paso;
    const cumbreraDoble = inp.cumbreraDoble !== false;  // M8 p.14: "debería ser doble"
    const tcTot = cumbreraDoble ? sec.tc * 2 : sec.tc;
    const lCumb = rDn(Lw - gLat), lSol = rDn(Lw - gLat);
    const yCum = Hmin;                                // cara superior de la cumbrera (desde el suelo)
    const Hp = rDn(Hmin - sec.ts - gapW - tcTot);
    if (Hp < 30) return { error: 'La altura de arranque es demasiado baja para un cuadro con esta sección. Revisa las medidas.' };
    const yc = Hmin - Ha;

    // puntales: extremos + uno intermedio por cada 1,50 m de luz (M8 p.7)
    const nInterManual = Math.max(0, Math.ceil(Lw / REGLAS.luzPorPuntal) - 1);
    // si salen pares, se añade uno para que siempre haya puntal bajo el pendolón
    const nInter = paso ? 0 : (nInterManual > 0 && nInterManual % 2 === 0 ? nInterManual + 1 : nInterManual);
    if (paso && nInterManual > 0) warn('alto', `Con ${c1(Lw)} cm de luz el manual pide ${nInterManual} puntal(es) intermedio(s) (uno por cada 1,50 m). Al mantener el paso no se ponen: la cumbrera va doble y con jabalcones, pero consúltalo con el especialista de estructuras.`, 'M8 p.7');
    const xPosts = [];
    for (let i = 0; i <= nInter + 1; i++) xPosts.push(-lCumb / 2 + sec.a / 2 + i * (lCumb - sec.a) / (nInter + 1));
    const vano = (lCumb - sec.a) / (nInter + 1);      // entre ejes de puntales

    // jabalcones de cuadro (M8 p.7): de cada puntal lateral a la cumbrera, a 45°
    const kneeD = Math.max(25, Math.min(60, rDn((vano - sec.a) / 2.2)));

    // pendolón y jabalcones de cercha (M8 p.10: salen del centro de la cumbrera)
    const crownInner = camones[n - 1].iK;
    const yIc = crownInner.y;
    const lPend = rDn(yIc - yc);
    const jab = [];
    let xEdge = -sec.a / 2;
    for (let k = n - 1; k >= 1; k--) {
      const P = camones[k].iS;                         // esquina interior de la junta
      const ang = A.phiS - k * th;
      let xf = xEdge - sec.a, alpha = 0;
      for (let it = 0; it < 8; it++) { alpha = Math.PI - Math.atan2(P.y - yc, P.x - xf); const fp = sec.a / Math.max(0.2, Math.sin(alpha)); xf = xEdge - fp / 2; }
      const fp = sec.a / Math.max(0.2, Math.sin(alpha));
      const F = { x: xf, y: yc }, Lc = Math.hypot(P.x - F.x, P.y - F.y);
      const dir = { x: (P.x - F.x) / Lc, y: (P.y - F.y) / Lc }, nr = { x: Math.cos(ang), y: Math.sin(ang) };
      const offTop = Math.acos(Math.min(1, Math.abs(dot(dir, nr)))) * R2D, offBot = 90 - alpha * R2D;
      const bruto = Lc + (sec.a / 2) * Math.tan(offTop * D2R) + (sec.a / 2) * Math.tan(Math.abs(offBot) * D2R);
      jab.push({ k, P, F, Lc, alpha: alpha * R2D, offTop, offBot, bruto, foot: fp });
      xEdge -= fp;
      if (alpha * R2D < 30) warn('medio', `El jabalcón de cercha a la junta ${k} queda muy tumbado (${Math.round(alpha * R2D)}°). Considera un montante vertical bajo esa junta.`);
    }
    const footSpan = -2 * xEdge;
    if (footSpan / 2 > lCumb / 2 - sec.a) warn('alto', 'Los pies de los jabalcones de cercha no caben en la cumbrera. Usa tablón más ancho para tener menos juntas.');

    /* ---- pórticos a lo largo del fondo ---- */
    const inset = 2, e = inp.fondo, sepMax = num(inp.sepMax, REGLAS.sepMaxPorticos);
    let nf, sep = 0;
    if (e < 25) { nf = 1; warn('medio', 'Muro muy fino: un solo pórtico centrado. Comprueba que el arco no se mueve fuera de su plano.'); }
    else { nf = Math.max(2, Math.ceil((e - sec.b - 2 * inset) / sepMax) + 1); sep = (e - 2 * inset - sec.b) / (nf - 1); }
    const zs = []; for (let i = 0; i < nf; i++) zs.push(nf === 1 ? e / 2 : inset + sec.b / 2 + i * sep);
    if (nf >= 2 && sep < sec.b + 5) warn('medio', `Los pórticos quedan casi pegados (${c1(sep)} cm entre ejes). Puedes juntarlos y clavarlos entre sí.`);

    /* ---- avisos de altura ---- */
    if (inp.seccion === '10x10' && Hp > REGLAS.alturaMax10x10) warn('alto', `Puntales de ${Hp} cm con 10×10: pasa de 3,3 m. Usa 15×15 o tablones embridados.`, 'MC p.91, M6 p.20');
    if (Hp > REGLAS.alturaRiostraH) warn('info', 'Puntales de más de 1,8 m: lleva riostra horizontal a media altura.', 'MC p.93');
    if (lPend > 180) warn('medio', `Pendolón de ${lPend} cm: átalo a los jabalcones con una riostra horizontal clavada a media altura.`);
    if (inp.seccion === '20x7x2') warn('info', 'Puntales de tablón embridado: al menos tres bridas (extremos y centro), entre 40 y 95 cm, alternando la inclinación.', 'M6 p.9');

    /* ---- lista de cortes ---- */
    const piezas = [];
    const add = o => piezas.push(Object.assign({ fam: 'viga' }, o));
    add({ code: 'S', nombre: 'Solera', corto: 'SOLERA', seccion: sec.solera, largo: lSol, cant: nf, donde: 'En el suelo, entre jambas, asentada y a nivel. Par de cuñas en un extremo para ajustarla.', corte: 'Escuadra' });
    add({ code: 'P', nombre: 'Puntal lateral (pie derecho)', corto: 'PUNTAL', seccion: sec.nombre, largo: Hp, cant: nf * 2, donde: `Uno contra cada jamba, de solera a cumbrera, con un par de cuñas debajo (${gapW} cm restados).`, corte: 'Escuadra' });
    if (nInter) add({ code: 'PI', nombre: 'Puntal intermedio', corto: 'PUNTAL INT.', seccion: sec.nombre, largo: Hp, cant: nf * nInter, donde: nInter === 1 ? 'En el centro, bajo el pendolón. Cuñas debajo.' : `${nInter} puntales repartidos a ${c1(vano)} cm entre ejes. Cuñas debajo.`, corte: 'Escuadra' });
    add({ code: 'C', nombre: cumbreraDoble ? 'Cumbrera (doble)' : 'Cumbrera o sopanda', corto: 'CUMBRERA', seccion: sec.cumbrera, largo: lCumb, cant: nf * (cumbreraDoble ? 2 : 1), donde: `Sobre los puntales; su cara superior en la línea de arranque (${c1(yCum)} cm del suelo).${cumbreraDoble ? ' Dos piezas superpuestas y clavadas.' : ''} Par de cuñas en el extremo contrario al de la solera.`, corte: 'Escuadra' });
    add({ code: 'J', nombre: 'Jabalcón de cuadro', corto: 'JABALCÓN', seccion: sec.nombre, largo: rUp(kneeD * Math.SQRT2 + sec.a), cant: nf * 2, donde: `De cada puntal lateral a la cumbrera a 45°: arranca ${kneeD} cm por debajo de la cumbrera y llega ${kneeD} cm hacia el centro.`, corte: 'Inglete 45° en los dos extremos (medida en la arista larga)' });
    add({ code: 'PD', nombre: 'Pendolón', corto: 'PENDOLÓN', seccion: sec.nombre, largo: lPend, cant: nf, donde: 'Vertical, del centro de la cumbrera a la junta de clave de las cerchas.', corte: A.tipo === 'apuntado' ? 'Escuadra abajo; arriba recortar en V o calzar en la junta de clave' : 'Escuadra' });
    jab.forEach((j, i) => add({ code: 'JC' + (i + 1), nombre: 'Jabalcón de cercha', corto: 'JAB. CERCHA', seccion: sec.nombre, largo: rUp(j.bruto), cant: nf * 2, donde: `Del centro de la cumbrera (pie a ${c1(Math.abs(j.F.x))} cm del eje) a la junta ${j.k} de las cerchas. Inclinación ${Math.round(j.alpha)}°.`, corte: `Abajo ${c1(Math.abs(j.offBot))}° fuera de escuadra (apoya a nivel); arriba ${c1(j.offTop)}° fuera de escuadra. A eje: ${c1(j.Lc)} cm.`, extra: j }));
    add({ code: 'TA', nombre: 'Taco', corto: 'TACO', seccion: sec.nombre, largo: 15, cant: nf * 2, donde: 'Sobre la solera, por la cara interior de cada puntal lateral, encerrando las cuñas: 3 clavos en horizontal al puntal y 2 en diagonal a la solera.', corte: 'Escuadra', ref: 'M6 p.68' });
    tipos.forEach(t => {
      const c = t.ref;
      add({ fam: 'tablon', code: t.code, nombre: 'Cercha', corto: 'CERCHA', seccion: `tablón ${Wb}×${coma(inp.tablonGrueso)}`, largo: rUp(c.len + 4), cant: nf * t.ks.length * 2, donde: `Tramo curvo del arco (${t.ks.length * 2} por pórtico; «camón» en el Manual de Campo). Borde interior recto (canto del tablón), exterior curvo. Canto en los extremos ${c1(c.cantoExtremo)} cm (mínimo ⅓ = ${c1(cantoMin)}).`, corte: `Lado arranque: ${c.endS === 'h' ? 'a nivel, ' : ''}${c1(c.cutS)}° fuera de escuadra. Lado clave: ${c.endK === 'v' ? 'a plomo, ' : ''}${c1(c.cutK)}° fuera de escuadra. Curva con ordenadas o plantilla.`, camon: c });
    });
    const fr = inp.riostra || 'tabla 15×2,5';
    const hv = yCum - sec.ts / 2 - tcTot / 2;
    if (!paso) {
      const ld = Math.hypot(lCumb, hv);
      if (ld <= REGLAS.riostraXMax) add({ fam: 'riostra', code: 'RX', nombre: 'Riostra en X', corto: 'RIOSTRA X', seccion: fr, largo: rUp(ld + 10), cant: nf * 2, donde: 'Una por cada cara del pórtico, en sentidos contrarios (cruz de San Andrés). Clavar a solera, puntales y cumbrera.', corte: 'Presentar y marcar' });
      else add({ fam: 'riostra', code: 'RX', nombre: 'Riostra en X (por vanos)', corto: 'RIOSTRA X', seccion: fr, largo: rUp(Math.hypot(vano + sec.a, hv) + 10), cant: nf * 2 * (nInter + 1), donde: 'La diagonal entera pasaría de 3 m: una X en cada vano entre puntales, una riostra por cara en sentidos contrarios.', corte: 'Presentar y marcar' });
    }
    if (Hp > REGLAS.alturaRiostraH) {
      const filas = Hp > REGLAS.alturaDosRiostrasH ? 2 : 1, tramos = Math.ceil(lCumb / REGLAS.riostraCompMax);
      add({ fam: 'riostra', code: 'RH', nombre: 'Riostra horizontal', corto: 'RIOSTRA H', seccion: fr, largo: tramos > 1 ? rUp(lCumb / tramos + 15) : lCumb, cant: nf * filas * tramos, donde: (filas === 2 ? 'A 1/3 y 2/3 de la altura del puntal' : 'A media altura de los puntales') + (tramos > 1 ? `, en ${tramos} tramos empalmados sobre un puntal (máx. 2,25 m por tramo)` : '') + '.', corte: 'Escuadra' });
    }
    if (nf >= 2) {
      const largoFondo = rDn(e - 2 * inset);
      const filasRL = Hp > REGLAS.alturaRiostraH ? 2 : 1;
      add({ fam: 'riostra', code: 'RL', nombre: 'Riostra longitudinal', corto: 'RIOSTRA L', seccion: fr, largo: Math.min(largoFondo, REGLAS.riostraCompMax), cant: (filasRL * 2 + 1) * Math.ceil(largoFondo / REGLAS.riostraCompMax), donde: `Atando los pórticos en la cara interior de los puntales de cada lado (${filasRL === 2 ? 'arriba y a media altura' : 'arriba'}) y entre pendolones.`, corte: 'Escuadra' });
      const steep = Hp / sep > 2;
      let ldiag = steep ? Math.hypot(sep, Hp / 2) : Math.hypot(sep, Hp);
      let tramosD = steep ? 2 : 1;
      while (ldiag > REGLAS.riostraCompMax && tramosD < 6) { tramosD++; ldiag = Math.hypot(sep, Hp / tramosD); }
      add({ fam: 'riostra', code: 'RD', nombre: 'Riostra diagonal longitudinal', corto: 'RIOSTRA D', seccion: fr, largo: rUp(ldiag + 15), cant: (nf - 1) * 2 * tramosD, donde: `Entre pórticos, en la cara interior de los puntales de cada lado${tramosD > 1 ? `, en ${tramosD} tramos en zigzag por vano (máx. 2,25 m cada uno)` : ''}.`, corte: 'Presentar y marcar' });
    }
    add({ fam: 'riostra', code: 'AT', nombre: 'Tabla de atado de cercha', corto: 'ATADO CERCHA', seccion: fr, largo: rUp(footSpan + 20), cant: nf * 2, donde: 'Pieza bajo las cerchas, justo encima de la cumbrera, clavada por las dos caras a los pies de pendolón y jabalcones para que no se desplacen.', corte: 'Escuadra', ref: 'M8 p.10' });
    let nCorr = 0;
    if (inp.correas && nf >= 2) {
      nCorr = 4 * n - 1;
      add({ fam: 'riostra', code: 'CR', nombre: 'Correa (tabla de reparto)', corto: 'CORREA', seccion: `tabla ${num(inp.anchoCorrea, 15)}×${coma(tCorr)}`, largo: rDn(e - 2), cant: nCorr, donde: 'Atravesadas sobre las cerchas de todos los pórticos: en cada junta y en el centro de cada camón. Reparten la carga por todo el fondo del intradós.', corte: 'Escuadra' });
    }

    /* ---- pletinas, cuñas, calzos y clavos ---- */
    const postsPF = 2 + nInter;
    const pletinas = [
      { code: 'T1', nombre: 'Pletina 30×30', cant: nf * ((2 * n - 1) * 2 + 2), donde: 'Juntas entre cerchas y nudo pendolón-cumbrera, por las dos caras.', clavos: REGLAS.clavos.pletina },
      { code: 'T2', nombre: 'Media pletina 15×30', cant: nf * (postsPF * 2 + nInter * 2 + 4), donde: 'Unión solera/puntal por las dos caras (clavar después de acuñar), puntal intermedio/cumbrera y apoyo de las cerchas en la cumbrera.', clavos: REGLAS.clavos.media },
      { code: 'T3', nombre: 'Media pletina triangular (lados de 30)', cant: nf * 4, donde: 'Esquinas puntal lateral/cumbrera, por las dos caras.', clavos: REGLAS.clavos.triangular }
    ];
    const sq30 = pletinas[0].cant + pletinas[1].cant / 2 + pletinas[2].cant / 2;
    const tableros = Math.ceil(sq30 / 32);
    const cunas = { cant: nf * (postsPF + 2), medida: `5×${sec.a}×30` };
    const calzos = nCorr ? nCorr * 2 : (4 * n - 1) * nf;
    const nRiostras = piezas.filter(p => p.fam === 'riostra').reduce((a, p) => a + p.cant, 0);
    const nClavos = Math.ceil((pletinas.reduce((a, p) => a + p.cant * p.clavos, 0) + nf * 2 * REGLAS.clavos.taco + cunas.cant * REGLAS.clavos.cuna + nRiostras * 2 * REGLAS.clavos.riostraExtremo + nf * 2 * REGLAS.clavos.jabalcon) * 1.2 / 50) * 50;

    /* ---- plan de corte (primer ajuste decreciente) ---- */
    function planCorte(fam, stock) {
      const bySec = {};
      piezas.filter(p => p.fam === fam).forEach(p => { for (let i = 0; i < p.cant; i++) (bySec[p.seccion] = bySec[p.seccion] || []).push({ code: p.code, l: p.largo, sec: p.seccion }); });
      return Object.keys(bySec).map(s => {
        const bars = [], largas = [];
        bySec[s].sort((a, b) => b.l - a.l).forEach(it => {
          if (it.l > stock) { largas.push(it); return; }
          let bar = bars.find(b => b.rest >= it.l + (b.items.length ? 0.5 : 0));
          if (!bar) { bar = { rest: stock, items: [] }; bars.push(bar); }
          bar.rest -= it.l + (bar.items.length ? 0.5 : 0); bar.items.push(it);
        });
        return { sec: s, stock, bars, largas };
      });
    }
    const planes = [].concat(planCorte('viga', inp.stockViga), planCorte('tablon', inp.stockTablon), planCorte('riostra', inp.stockTablon));
    planes.forEach(p => {
      if (!p.largas.length) return;
      const cods = [...new Set(p.largas.map(x => x.code))];
      const estruct = cods.some(c => /^(S|C|P|PI|PD|JC\d*|J|CE\d+)$/.test(c));
      warn('alto', `Hay ${p.largas.length} pieza(s) de ${p.sec} más largas que vuestras barras de ${p.stock} cm (${cods.join(', ')}). ` + (estruct ? 'Soleras, cumbreras, puntales y cerchas no se empalman: consigue piezas más largas.' : 'Las riostras pueden ir en dos tramos solapados y clavados a un puntal.'));
    });

    // capacidad orientativa (M6 p.23: sistema de dos puntales 10x10, FEMA/USACE)
    let capacidad = null;
    if (inp.seccion === '10x10') {
      const H = Hp + sec.ts + gapW + tcTot;
      capacidad = H <= 240 ? 7200 : H <= 300 ? 4500 : H <= 360 ? 3100 : null;
    }

    return {
      A, sec, inp, REGLAS, gArco, gLat, tCorr, Ro, n, th, Ha, Hmin, Lw, f, yCum, Hp, tcTot, cumbreraDoble,
      lCumb, lSol, lPend, yIc, yc, jab, footSpan, kneeD, paso, xPosts, nInter, vano, cantoMin,
      camones, tipos, nf, sep, zs, e, piezas, pletinas, tableros, cunas, calzos, nClavos, nCorr, planes,
      warnings: W, checkQ, gapW, capacidad
    };
  }
  function num(v, d) { return v == null || v === '' || isNaN(v) ? d : +v; }

  return { calcular, arco, yAt, camon, SECCIONES, REGLAS };
});
