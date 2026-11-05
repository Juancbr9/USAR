'use strict';
// USAR 242 · Lista de cortes de cada apuntalamiento: con las medidas tomadas en el sitio salen todas las piezas de madera
// (largo, cantidad, cómo se corta, dónde va y su rótulo), lo que hace falta además (pletinas, cuñas, clavos, bridas, anclajes),
// cuántas barras hay que cortar y los avisos de los temas de la UME (M6 «Apuntalamientos» y M8 «Técnicas específicas»).
// Las medidas de cada tipo se guardan en este móvil (prefs.apuIn) y las piezas cortadas se marcan (prefs.apuDone).

const ACR = Math.PI / 180;
const acDeg = r => r / ACR;
const acF = (v, d = 0) => (+v).toLocaleString('es-ES', { maximumFractionDigits: d });
const AC_CU = [['4', 'De 5×10 (restar 4 cm)'], ['8', 'De 10×10 (restar 8 cm)']];
const AC_SN = [['', 'No'], ['1', 'Sí']];
const AC_TAB = [['7', 'Tablón de 20×7'], ['5', 'Tablón de 20×5']];
const AC_ANG = [['30', '30°'], ['45', '45°'], ['60', '60°']];
// Puntales y extensiones HOLMATRO (M6 2.4): [clave, modelo, largo cerrado en mm, recorrido en mm]
const AC_HOLM = [['ml', 'Manual con contratuerca', 575, 250], ['mr', 'Manual roscado', 250, 127], ['as5', 'Neumático AS 3 L 5+', 575, 252], ['as10', 'Neumático AS 3L 10+', 1035, 252],
  ['aq5', 'Neumático AS 3Q 5 FL', 632, 252], ['aq10', 'Neumático AS 3Q 10 FL', 1092, 252], ['hl5', 'Hidráulico HS 1 L 5+', 575, 252], ['hl10', 'Hidráulico HS 1 L 10+', 1035, 252],
  ['hq5', 'Hidráulico HS 1Q 5 FL', 632, 252], ['hq10', 'Hidráulico HS 1Q 10 FL', 1035, 252]];
const AC_EXT = [['SX 15', 1500, 'roja'], ['SX 10', 1000, 'verde'], ['SX 5', 500, 'amarilla'], ['SX 2', 250, 'azul'], ['SX 1', 125, 'blanca']];

// Con qué extensiones llega un puntal HOLMATRO a T mm: las menos posibles y dejando recorrido para el ajuste
function acHolmCombo(T, closed, stroke) {
  let best = null;
  const rec = (i, cnt, sum, list) => {
    if (i === AC_EXT.length) {
      const ext = T - closed - sum;
      if (ext < 0 || ext > stroke) return;
      const score = cnt * 10000 + Math.abs(ext - stroke / 2);
      if (!best || score < best.score) best = { score, list: list.slice(), sum, ext };
      return;
    }
    for (let k = 0; k <= 3; k++) { for (let j = 0; j < k; j++) list.push(AC_EXT[i]); rec(i + 1, cnt + k, sum + k * AC_EXT[i][1], list); list.length -= k; }
  };
  rec(0, 0, 0, []);
  return best;
}

/* ==================== CÁLCULO DE CADA TIPO ==================== */
// Cada tipo: in (medidas del sitio: clave, etiqueta, valor de serie, opciones o unidad) y calc(v, o), que con o.p() añade piezas
// de madera, o.x() lo demás, o.a() avisos y o.r() el resumen. Medidas en cm.
// La madera de cada función (o.m: puntales, soleras, riostras…) y los demás valores (o.n: voladizos, cuñas…) se cambian
// centímetro a centímetro en «Maderas y medidas»; o.p recibe además la geometría de la pieza (ángulo y cómo apoya cada
// extremo) para dibujar cómo se corta y cómo encaja.
const AC_EQ = { k: 'eq', l: 'Equipo (va en el rótulo)', v: 'Equipo 1', t: 'text' };
const acIn = (k, l, v, extra = {}) => ({ k, l, v, ...extra });
// Madera de cada función: [nombre, ancho, grueso] en cm (las de siempre; en cada tipo se pueden cambiar)
const AC_MAD = { P: ['Puntales', 10, 10], C: ['Cumbreras', 10, 10], S: ['Soleras', 10, 10], Z: ['Zapatas murales', 10, 10], K: ['Codales', 10, 10],
  R: ['Riostras', 10, 5], E: ['Ejiones', 10, 5], F: ['Freno o carrera', 10, 10], T: ['Tablones', 20, 7], V: ['Viguetas', 10, 10],
  B: ['Percha y viga del balcón', 15, 15], M: ['Maderos', 10, 10], L: ['Largueros', 10, 10], X: ['Caja y tacos', 15, 5] };
const acNum = x => { const n = parseFloat(String(x ?? '').replace(',', '.')); return Number.isFinite(n) && n > 0 ? n : null; };
function apuMad(v, k) {
  const d = AC_MAD[k], g = prefs.apuMad?.[k] || {};
  const a = acNum(v['m' + k + 'a']) ?? acNum(g.a) ?? d[1], gr = acNum(v['m' + k + 'g']) ?? acNum(g.g) ?? d[2];
  return { k, a, g: gr, s: `${acF(a, 1)}×${acF(gr, 1)}` };
}
const acTab = m => `tablón ${m.s}`;
// Pares de cuñas, pletinas y clavos: lo que se suma al final
const acPletinas = (o, n30, n15, ntri = 0) => {
  if (n30) o.x('Pletina de contrachapado 30×30×2', n30, '5 clavos de 6,5 al puntal y 8 a la otra pieza', n30 * 13);
  if (n15) o.x('Media pletina 15×30×2', n15, '4 clavos al puntal y 4 a la otra pieza', n15 * 8);
  if (ntri) o.x('Media pletina triangular (lados rectos de 30)', ntri, '13 clavos', ntri * 13);
};
const acCunas = (o, n, d = 'Bajo cada puntal; un clavo detrás tras el ajuste', med) => n && o.x(`Pares de cuñas${med ? ' de ' + med : ''}`, n, d, n);
const acCu = o => o.n('cu', 'Grueso del par de cuñas (de 5×10: 4; de 10×10: 8)', 4);
// Geometría para el dibujo de corte. ang: ángulo de la pieza con el suelo (del extremo 0 al 1); en cada extremo, s es el ángulo
// de la cara en la que apoya (0 = horizontal, 90 = vertical) y on, qué pieza es; tope: tope a escuadra de esos cm (encuentros);
// s2: segunda cara (dos aguas o esquina).
const gV = (on0 = 'Solera (sobre las cuñas)', on1 = 'Cumbrera') => ({ ang: 90, ends: [{ s: 0, on: on0 }, { s: 0, on: on1 }] });
const gH = (on0 = '', on1 = '') => ({ ang: 0, ends: [{ s: 90, on: on0 }, { s: 90, on: on1 }] });
const gR = (ang, s0, s1, on0 = 'A ras de la pieza en la que se clava', on1 = on0) => ({ ang, ras: 1, ends: [{ s: s0, on: on0 }, { s: s1, on: on1 }] });

const APU_CORTES = {
  /* ---------- Generalidades ---------- */
  tablon: { in: [acIn('L', 'Largo del puntal de tablones', 250, { u: 'cm' })],
    calc(v, o) {
      const T = o.m('T'), bmax = o.n('bmax', 'Separación máxima entre bridas', 95), bx = o.n('bx', 'Brida a esta distancia de cada extremo', 10);
      const nb = Math.max(3, Math.ceil((v.L - 2 * bx) / bmax) + 1), sepB = (v.L - 2 * bx) / (nb - 1);
      o.p('T', 'Tablón del puntal', acTab(T), v.L, 2, 'Escuadra', 'Dos tablones cara con cara', 'TABLÓN PUNTAL', 0, gV('Solera', 'Cumbrera'));
      o.x('Bridas (o pernos con pletina)', nb, `A ${acF(bx)} cm de cada extremo y repartidas cada ${acF(sepB)} cm (entre 40 y 95), alternando la inclinación`);
      o.r('Bridas', `${nb}, cada ${acF(sepB)} cm`);
      if (sepB < 40) o.a('warn', 'Puntal muy corto: con piezas cortas se pueden usar sueltas.');
    } },
  holmatro: { in: [acIn('H', 'Altura del suelo al techo', 250, { u: 'cm' }), acIn('cab', 'Alto de los dos cabezales juntos (mide los tuyos)', 0, { u: 'cm' }), acIn('mod', 'Puntal', 'ml', { o: AC_HOLM.map(h => [h[0], h[1]]) })],
    calc(v, o) { acHolm(v, o, 1); } },

  /* ---------- Verticales ---------- */
  t: { in: [acIn('H', 'Altura del suelo al techo (la más baja de las medidas)', 250, { u: 'cm' }), acIn('C', 'Largo de cumbrera y solera (máx. 90)', 90, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const P_ = o.m('P'), C_ = o.m('C'), S_ = o.m('S'), cu = acCu(o), P = v.H - S_.g - C_.g - cu;
      o.p('C', 'Cumbrera', C_.s, v.C, 1, 'Escuadra', 'Centrada bajo la carga, contacto total', 'CUMBRERA', 0, gH());
      o.p('P', 'Puntal', P_.s, P, 1, 'Escuadra en los dos extremos', `Centrado. Se resta solera (${acF(S_.g, 1)}), cumbrera (${acF(C_.g, 1)}) y cuñas (${acF(cu, 1)})`, 'PUNTAL', 0, gV());
      o.p('S', 'Solera', S_.s, v.C, 1, 'Escuadra', 'Firme en el suelo; igual que la cumbrera', 'SOLERA', 0, gH());
      acPletinas(o, 2, 1); acCunas(o, 1);
      o.r('Puntal', `${acF(P)} cm`); o.r('Carga', 'De 1.800 a 450 kg (cuanto más alto, menos)');
      if (v.H > 330) o.a('bad', `Pasa de 3,30 m: la T no vale con 10×10. Haz un sistema de dos puntales o una torre.`);
      if (v.C > 90) o.a('bad', 'La cumbrera de la T no puede pasar de 90 cm.');
      if (P > 25 * Math.min(P_.a, P_.g)) o.a('warn', `Puntal de ${P_.s} de más de ${acF(25 * Math.min(P_.a, P_.g))} cm: puede romper sin avisar (relación 1/25).`);
    } },
  fila: { in: [acIn('H', 'Altura del suelo al techo (la más baja de tres medidas)', 250, { u: 'cm' }), acIn('L', 'Largo de la cumbrera (zona a apuntalar)', 300, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const P_ = o.m('P'), C_ = o.m('C'), S_ = o.m('S'), R_ = o.m('R'), cu = acCu(o), vol = o.n('vol', 'Alero: del último puntal al extremo', 30), smax = o.n('smax', 'Separación máxima entre puntales', 120);
      const P = v.H - S_.g - C_.g - cu, n = Math.max(2, Math.ceil((v.L - 2 * vol) / smax) + 1), sep = (v.L - 2 * vol) / (n - 1), hP = v.H - S_.g - C_.g;
      o.p('C', 'Cumbrera', C_.s, v.L, 1, 'Escuadra', 'Nivelada con el punto más bajo; huecos con cuñas', 'CUMBRERA', 0, gH());
      o.p('P', 'Puntal', P_.s, P, n, 'Escuadra', `A ${acF(vol)} cm de los extremos y cada ${acF(sep)} cm entre ejes`, 'PUNTAL', 0, gV());
      o.p('S', 'Solera', S_.s, v.L, 1, 'Escuadra', 'Alineada con la cumbrera y nivelada', 'SOLERA', 0, gH());
      const dX = Math.hypot(v.L - 10, hP) + 10;
      if (dX <= 300) o.p('RD', 'Riostra diagonal', R_.s, dX, 2, 'A ras de solera y cumbrera', 'Una por cada cara en sentido contrario (cruz de San Andrés); clavada a cumbrera, solera y puntales', 'RIOSTRA D', 3, gR(acDeg(Math.atan2(hP, v.L - 10)), 0, 0, 'Solera', 'Cumbrera'));
      else o.p('RD', 'Riostra diagonal (por vanos)', R_.s, Math.hypot(sep + 10, hP) + 10, 2 * (n - 1), 'A ras de solera y cumbrera', 'Entera pasaría de 3 m: una X en cada vano, una por cara', 'RIOSTRA D', 3, gR(acDeg(Math.atan2(hP, sep + 10)), 0, 0, 'Solera', 'Cumbrera'));
      if (v.H > 240) acHoriz(o, R_, v.L, 1, 'Riostra horizontal central (más de 2,4 m)');
      acPletinas(o, 0, n + 2 * n); acCunas(o, n);
      o.r('Puntales', `${n} de ${acF(P)} cm, cada ${acF(sep)} cm`);
      if (sep > 120) o.a('bad', 'Más de 1,2 m entre puntales.');
      o.a('info', 'Medias pletinas: arriba una por puntal; abajo, en las dos caras si hay riesgo de réplicas (salvo donde vayan diagonales).');
    } },
  dos: { in: [acIn('H', 'Altura del suelo al techo', 250, { u: 'cm' }), acIn('sep', 'Separación entre puntales (ejes, 90–120)', 120, { u: 'cm' }), AC_EQ],
    calc(v, o) { acDos(v, o, 1); } },
  torre: { in: [acIn('H', 'Altura del suelo al techo', 300, { u: 'cm' }), acIn('sep', 'Separación de los puntales de cada par (90–120)', 120, { u: 'cm' }),
    acIn('fondo', 'Separación entre los dos pares (90–120)', 120, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const D = acDos(v, o, 2), R_ = o.m('R'), P = D.P, hP = D.hP, nd = v.H < 180 ? 1 : v.H <= 330 ? 2 : 3;
      o.p('LH', 'Riostra horizontal de lateral', R_.s, v.fondo + D.Pa, 2 * (nd + 1), 'Escuadra', `Uniendo los dos pares, por ambos laterales: ${nd + 1} alturas`, 'RIOSTRA LAT. H', 2, gR(0, 90, 90, 'A ras del puntal'));
      o.p('LD', 'Diagonal de lateral', R_.s, Math.hypot(v.fondo, hP / nd) + 10, 2 * nd, 'A ras de los puntales', nd === 1 ? 'Una por lateral' : nd === 2 ? 'Dos en K por lateral' : 'Tres por lateral', 'DIAGONAL LAT.', 3, gR(acDeg(Math.atan2(hP / nd, v.fondo)), 90, 90, 'A ras del puntal'));
      o.r('Diagonales por lateral', nd === 1 ? 'Una (< 1,8 m)' : nd === 2 ? 'Dos en K (1,8–3,3 m)' : 'Tres (3,3–5,1 m)');
      const hmax = Math.min(510, 4 * Math.min(v.sep, v.fondo));
      if (v.H > hmax) o.a('bad', `Demasiado alta: máximo ${acF(hmax)} cm (4 veces la separación y nunca más de 5,1 m).`);
      if (P > 490) o.a('bad', 'El puntal pasa de 4,9 m.');
      if (v.fondo < 90 || v.fondo > 120) o.a('bad', 'Los pares, entre 90 y 120 cm.');
      o.r('Carga de trabajo', 'Unos 15.000 kg');
    } },
  vtablon: { in: [acIn('H', 'Altura del suelo al techo', 220, { u: 'cm' }), acIn('n', 'Número de puntales', 2), acIn('sep', 'Separación entre puntales (máx. 100)', 100, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const T = o.m('T'), R_ = o.m('R'), g = T.g, cu = acCu(o), vol = o.n('vol', 'Alero: del último puntal al extremo', 30), n = Math.max(1, Math.round(v.n));
      const P = v.H - 2 * g - cu, C = n === 1 ? o.n('c1', 'Cumbrera con un solo puntal', 90) : (n - 1) * v.sep + 2 * vol, nb = Math.max(3, Math.ceil(P / 95) + 1);
      o.p('C', 'Cumbrera', acTab(T), C, 1, 'Escuadra', n === 1 ? 'Máx. 90 cm' : `Alero de ${acF(vol)} cm en cada extremo`, 'CUMBRERA', 0, gH());
      o.p('P', 'Tablón de puntal', acTab(T), P, 2 * n, 'Escuadra', `Dos por puntal, embridados. Se resta solera y cumbrera (${acF(g, 1)} + ${acF(g, 1)}) y ${acF(cu, 1)} de cuñas`, 'TABLÓN PUNTAL', 0, gV());
      o.p('S', 'Solera', acTab(T), C, 1, 'Escuadra', 'Firme en el suelo', 'SOLERA', 0, gH());
      if (n > 1) {
        if (v.H < 180) o.p('RD', 'Riostra diagonal', R_.s, Math.hypot(v.sep, P) + 10, 2 * (n - 1), 'A ras de los puntales', 'Una por delante y otra por detrás: cruz de San Andrés', 'RIOSTRA D', 3, gR(acDeg(Math.atan2(P, v.sep)), 90, 90, 'A ras del puntal'));
        else { o.p('RH', 'Riostra horizontal', R_.s, v.sep + 30, 2 * (n - 1), 'Escuadra', 'En medio, a cada lado', 'RIOSTRA H', 2, gR(0, 90, 90, 'Sobresale 15 cm de cada puntal'));
          o.p('RD', 'Riostra diagonal', R_.s, Math.hypot(v.sep, P / 2) + 10, 4 * (n - 1), 'A ras de los puntales', 'Cruces arriba y abajo', 'RIOSTRA D', 3, gR(acDeg(Math.atan2(P / 2, v.sep)), 90, 90, 'A ras del puntal')); }
      }
      o.x('Bridas (o pernos)', nb * n, `${nb} por puntal: extremos y centro, entre 40 y 95 cm, alternando la inclinación`);
      acCunas(o, 2 * n, 'Uno bajo cada tablón');
      o.r('Tablones de puntal', `${2 * n} de ${acF(P)} cm`);
      if (n > 1 && v.sep > 100) o.a('bad', 'Más de 1 m entre puntales.');
    } },
  vobra: { in: [acIn('H', 'Altura del suelo al techo', 250, { u: 'cm' }), acIn('n', 'Número de puntales', 2), acIn('sep', 'Separación entre puntales', 100, { u: 'cm' }), acIn('paso', '¿Es un lugar de paso?', '', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const C_ = o.m('C'), S_ = o.m('S'), R_ = o.m('R'), n = Math.max(1, Math.round(v.n)), mg = o.n('mg', 'Del eje de la placa al extremo', 20);
      const C = n === 1 ? o.n('c1', 'Cumbrera con un solo puntal', 90) : (n - 1) * v.sep + 2 * mg, L = v.H - S_.g - C_.g;
      o.p('C', 'Cumbrera', C_.s, C, 1, 'Escuadra', n === 1 ? 'La placa centrada y clavada' : `Eje de cada placa a ${acF(mg)} cm del extremo`, 'CUMBRERA', 0, gH());
      o.p('S', 'Solera', S_.s, C, 1, 'Escuadra', 'Igual que la cumbrera', 'SOLERA', 0, gH());
      if (n > 1 && !v.paso) o.p('RD', 'Riostra en X', R_.s, Math.hypot(C - 10, L) + 10, 2, 'A ras de solera y cumbrera', 'De solera a cumbrera, una por cara', 'RIOSTRA X', 2, gR(acDeg(Math.atan2(L, C - 10)), 0, 0, 'Solera', 'Cumbrera'));
      o.x('Puntal de obra', n, `Que cierre por debajo de ${acF(L)} cm y llegue a ${acF(L)} cm (suelo a techo menos solera y cumbrera)`);
      o.x('Clavos para las placas', 8 * n, 'Por los agujeros de cada placa, hasta algo más de la mitad, y doblados', 8 * n);
      o.r('Puntales de obra', `${n} de ${acF(L)} cm`);
      o.a('warn', 'Solo temporal: los puntales de obra no se arriostran entre sí.');
    } },
  vholm: { in: [acIn('H', 'Altura del suelo al techo', 250, { u: 'cm' }), acIn('n', 'Número de puntales (T: 1, doble T: 2)', 1), acIn('cab', 'Alto de los dos cabezales juntos (mide los tuyos)', 0, { u: 'cm' }),
    acIn('mod', 'Puntal', 'ml', { o: AC_HOLM.map(h => [h[0], h[1]]) })],
    calc(v, o) { acHolm(v, o, Math.max(1, Math.round(v.n))); } },

  /* ---------- Zampeados ---------- */
  zampeado: { in: [acIn('H', 'Altura a sostener', 90, { u: 'cm' }), acIn('w', 'Largo de las viguetas (ancho del zampeado)', 60, { u: 'cm' }),
    acIn('nv', 'Viguetas por capa', '2', { o: [['2', '2 × 2'], ['3', '3 × 3']] }), acIn('base', '¿Base de cojines o gatos?', '', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const V = o.m('V'), a = V.g, nv = +v.nv, capas = Math.floor(v.H / a), resto = v.H - capas * a, solida = Math.max(nv, Math.ceil(v.w / V.a));
      const total = solida + (capas - 1) * nv + (v.base && capas > 1 ? solida - nv : 0);
      o.p('V', 'Vigueta', V.s, v.w, total, 'Escuadra', `${capas} capas cruzadas de ${acF(a, 1)} cm; la primera sólida (${solida} viguetas)${v.base ? ' y la última también' : ''}; las esquinas sobresalen 10 cm`, 'VIGUETA', 0, gH());
      if (resto > 0.5) acCunas(o, 2, `Ajuste a la carga: faltan ${acF(resto, 1)} cm`, '5×30');
      const cap = V.a === V.g ? { '2-10': 10800, '2-15': 27200, '3-10': 25000, '3-15': 61200 }[`${nv}-${V.a}`] : null;
      o.r('Capas', `${capas} de ${acF(a, 1)} cm`); o.r('Viguetas', `${total} de ${acF(v.w)} cm`); o.r('Carga máxima', cap ? `${acF(cap)} kg` : 'Según la madera (la tabla es para 10×10 y 15×15)');
      o.r('Ancho mínimo', `${acF(Math.ceil(v.H / 3))} cm (alto/ancho ≤ 3)`);
      if (v.H / v.w > 3) o.a('bad', 'Demasiado alto para ese ancho: el alto no puede pasar de 3 veces el ancho.');
      if (v.H > 150) o.a('info', 'Más de 1,5 m: clava un listón fino en las esquinas (ayuda y avisa de descuadres).');
    } },

  /* ---------- Laterales ---------- */
  volante: { in: [acIn('I', 'Altura del punto de inserción', 250, { u: 'cm' }), acIn('zb', 'Altura del pie de la zapata mural (por encima de los escombros)', 120, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const Z_ = o.m('Z'), P_ = o.m('P'), E_ = o.m('E'), R_ = o.m('R'), F_ = o.m('F'), X_ = o.m('X');
      const ej = o.n('ej', 'Largo del ejión', 60), sob = o.n('sob', 'Zapata por encima de la inserción', 60), caja = o.n('caja', 'Largo de la caja de base', 90);
      const a = 60 * ACR, Lp = (v.I - 5) / Math.sin(a), d = Z_.g + (v.I - 5) / Math.tan(a), Z = v.I + sob - v.zb, yr = v.zb + 10, rh = (v.I - yr) / Math.tan(a) + 15;
      o.p('Z', 'Zapata mural', Z_.s, Z, 1, 'Escuadra', `Del pie (a ${acF(v.zb)} cm) hasta ${acF(sob)} cm por encima de la inserción`, 'ZAPATA MURAL', 0, { ang: 90, ends: [{ s: 0, on: 'Escombros' }, { s: 0, on: '' }] });
      o.p('P', 'Puntal', P_.s, Lp, 1, `Encuentros a 60° (diagonal desde ${acF(P_.a / Math.tan(30 * ACR))} cm del lateral y tope perpendicular de 4 cm)`, 'De vértice a vértice: de la inserción al fondo de la caja', 'PUNTAL 60°', 0,
        { ang: 120, ends: [{ s: 0, on: 'Fondo de la caja' }, { s: 90, on: 'Zapata mural', tope: 4, topeOn: 'Ejión' }] });
      o.p('E', 'Ejión', E_.s, ej, 1, 'Escuadra', 'En la zapata, encima del puntal, con 14 clavos', 'EJIÓN', 0, gV('Sobre el puntal', ''));
      o.p('RH', 'Riostra horizontal', R_.s, rh, 2, 'A ras de zapata y puntal', 'Del pie de la zapata al puntal, a cada lado', 'RIOSTRA H', 2, gR(0, 90, 60, 'Zapata', 'Puntal'));
      o.p('BF', 'Fondo de la caja', `${acF(X_.a, 1)}×${acF(X_.g, 1)}`, caja, 1, 'Escuadra', 'Base tipo caja', 'FONDO CAJA', 0, gH());
      o.p('BL', 'Lateral de la caja', X_.s, caja, 2, 'Escuadra', 'Con 7 clavos cada uno', 'LATERAL CAJA', 0, gH());
      o.p('F', 'Freno o carrera', F_.s, 90, 1, 'Escuadra', 'Tras la caja, con hueco para cuñas', 'CARRERA', 0, gH());
      acPletinas(o, 2, 0); o.x('Clavos del ejión', 14, '', 14); o.x('Clavos de la caja', 14, '7 por lateral', 14); acCunas(o, 1, 'Entre la caja y la carrera');
      o.x('Barras de anclaje de 2 cm de Ø y 1,5 m', 2, 'En hormigón, con martillo perforador');
      o.r('Puntal', `${acF(Lp)} cm a 60°`); o.r('El pie queda a', `${acF(d)} cm de la pared`);
      if (Lp > 330) o.a('bad', 'El puntal pasa de 3,3 m.');
      if (v.zb >= v.I - 30) o.a('bad', 'El pie de la zapata tiene que quedar bastante por debajo de la inserción.');
    } },
  solerafija: { in: [acIn('I', 'Altura del punto de inserción', 200, { u: 'cm' }), acIn('ang', 'Ángulo del puntal con el suelo', '45', { o: AC_ANG }),
    acIn('nt', 'Número de triángulos (mín. 2)', 2), acIn('sep', 'Separación entre triángulos (máx. 240)', 200, { u: 'cm' }), AC_EQ],
    calc(v, o) { acLateral(v, o, 'fema'); } },
  ltablon: { in: [acIn('I', 'Altura del punto de inserción', 180, { u: 'cm' }), acIn('ang', 'Ángulo', '45', { o: AC_ANG.slice(1) }), acIn('nt', 'Número de sistemas (mín. 2)', 2),
    acIn('sep', 'Separación entre sistemas', 200, { u: 'cm' }), AC_EQ],
    calc(v, o) { acLateral(v, o, 'tablon'); } },
  lobra: { in: [acIn('I', 'Altura del punto de inserción', 180, { u: 'cm' }), acIn('nt', 'Número de sistemas', 2), acIn('sep', 'Separación entre sistemas', 200, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const Z_ = o.m('Z'), S_ = o.m('S'), E_ = o.m('E'), F_ = o.m('F'), R_ = o.m('R'), ej = o.n('ej', 'Largo de los ejiones', 70);
      const Ls = v.I, Lp = v.I * Math.SQRT2, nt = Math.max(1, Math.round(v.nt));
      o.p('Z', 'Zapata mural', Z_.s, v.I + ej, nt, 'Escuadra', 'Contra la pared', 'ZAPATA MURAL', 0, gV('Solera', ''));
      o.p('S', 'Solera', S_.s, Ls + ej, nt, 'Escuadra', 'O un puntal de obra con una pequeña solera', 'SOLERA', 0, gH('Muro', ''));
      o.p('E', 'Ejión cortado a 45°', E_.s, ej, 2 * nt, 'Un extremo a 45° para la placa del puntal', 'Arriba en la zapata y abajo en la solera, 14 clavos', 'EJIÓN 45°', 0,
        { ang: 90, ends: [{ s: 135, on: 'Placa del puntal de obra' }, { s: 0, on: '' }] });
      o.p('F', 'Freno o carrera', F_.s, nt > 1 ? (nt - 1) * v.sep + 40 : 90, 1, 'Escuadra', 'Tras las soleras, anclado', 'CARRERA', 0, gH());
      if (nt > 1) o.p('RZ', 'Riostra entre zapatas y entre soleras', R_.s, v.sep + 20, 2 * (nt - 1), 'Escuadra', 'Los puntales metálicos no se arriostran', 'RIOSTRA', 2, gR(0, 90, 90, 'Sobresale 10 cm de cada zapata o solera'));
      o.x('Puntal de obra', nt, `De unos ${acF(Lp - 30)} cm entre placas (vértice a vértice ${acF(Lp)} cm); comprobar en el sitio`);
      o.x('Clavos de los ejiones', 28 * nt, '14 por ejión', 28 * nt); acCunas(o, nt, 'Entre la solera y la carrera');
      o.x('Barras de anclaje de 2 cm de Ø y 1,5 m', 2 * nt, '');
      o.r('Puntal de obra', `${acF(Lp)} cm de vértice a vértice (45°)`);
      o.a('warn', 'Zona extremadamente peligrosa: sistema temporal.');
    } },

  /* ---------- Inclinados ---------- */
  inclcarga: { in: [acIn('th', 'Inclinación de la carga', 20, { u: '°' }), acIn('h', 'Altura vertical del suelo a la cara de abajo de la carga, en el puntal más bajo', 170, { u: 'cm' }),
    acIn('n', 'Puntales por sistema', 2), acIn('sep', 'Separación entre puntales, a lo largo de la carga (máx. 120)', 110, { u: 'cm' }), acIn('sepS', 'Separación entre los dos sistemas (máx. 150)', 120, { u: 'cm' }), AC_EQ],
    calc(v, o) { acIncl(v, o, 'carga'); } },
  inclsuelo: { in: [acIn('th', 'Inclinación de la carga', 20, { u: '°' }), acIn('h', 'Altura del suelo a la cara de abajo de la carga, en el puntal más bajo', 170, { u: 'cm' }),
    acIn('n', 'Puntales por sistema', 2), acIn('sep', 'Separación entre puntales, en horizontal (máx. 120)', 110, { u: 'cm' }), acIn('sepS', 'Separación entre los dos sistemas', 120, { u: 'cm' }), AC_EQ],
    calc(v, o) { acIncl(v, o, 'suelo'); } },
  incltablon: { in: [acIn('th', 'Inclinación de la carga', 20, { u: '°' }), acIn('h', 'Altura del suelo a la carga en el puntal vertical', 170, { u: 'cm' }),
    acIn('D', 'Distancia del puntal vertical al pie del tornapunta', 150, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const T = o.m('T'), R_ = o.m('R'), E_ = o.m('E'), F_ = o.m('F'), g = T.g, cu = acCu(o), xt = o.n('xt', 'Del puntal vertical a la cabeza del tornapunta', 70), vol = o.n('vol', 'Alero de cumbrera y solera', 30);
      const th = v.th * ACR, cg = g / Math.cos(th);
      const Pv = v.h - cg - g - cu, yTop = v.h + xt * Math.tan(th) - cg, Lt = Math.hypot(v.D - xt, yTop - g), al = acDeg(Math.atan2(yTop - g, v.D - xt));
      const C = (vol + xt + vol) / Math.cos(th), S = vol + v.D + 60, nb = Math.max(3, Math.ceil(Math.max(Pv, Lt) / 95) + 1);
      o.p('C', 'Cumbrera', acTab(T), C, 2, 'Escuadra', `Alero de ${acF(vol)} cm delante del puntal vertical`, 'CUMBRERA', 0, { ang: v.th, ends: [{ s: 90 + v.th, on: '' }, { s: 90 + v.th, on: '' }] });
      o.p('PV', 'Tablón de puntal vertical', acTab(T), Pv, 4, `Arriba a bisel de ${acF(v.th)}° (la pendiente de la carga); medida por el lado largo`, 'Dos por sistema, embridados', 'PUNTAL V', 0,
        { ang: 90, w: T.a, ends: [{ s: 0, on: 'Solera (sobre las cuñas)' }, { s: v.th, on: 'Cumbrera inclinada' }] });
      o.p('PT', 'Tablón de tornapunta', acTab(T), Lt, 4, `Abajo a nivel (${acF(90 - al)}° fuera de escuadra); arriba ${acF(Math.abs(90 - al - v.th))}° fuera de escuadra contra la cumbrera`, `Dos por sistema; inclinación ${acF(al)}°`, 'TORNAPUNTA', 0,
        { ang: 180 - al, w: T.a, ends: [{ s: 0, on: 'Solera (ejión detrás)' }, { s: v.th, on: 'Cumbrera inclinada' }] });
      o.p('S', 'Solera', acTab(T), S, 2, 'Escuadra', `${acF(vol)} cm delante del vertical y 60 tras el tornapunta`, 'SOLERA', 0, gH());
      o.p('E', 'Ejión', E_.s, 60, 4, 'Escuadra', 'Tras el tornapunta en cumbrera y solera, 14 clavos', 'EJIÓN', 0, gH());
      o.p('R', 'Riostra', R_.s, v.D - 20, 2, 'A ras del puntal y del tornapunta', 'Entre puntal vertical y tornapunta, a media altura', 'RIOSTRA', 2, gR(0, 90, 180 - al, 'Puntal vertical', 'Tornapunta'));
      o.p('RS', 'Riostra entre sistemas', R_.s, 170, 4, 'Presentar y marcar', 'Los dos sistemas arriostrados entre sí (separación orientativa 1,2–1,5 m)', 'RIOSTRA S', 2, gR(45, 90, 90, 'A ras del puntal'));
      o.p('F', 'Freno o carrera', F_.s, 170, 1, 'Escuadra', 'Tras las soleras, anclado', 'CARRERA', 0, gH());
      o.x('Bridas', 2 * 2 * nb, `${nb} por puntal y tornapunta`); o.x('Clavos de los ejiones', 56, '', 56); acCunas(o, 6, 'Tres por sistema: dos bajo el vertical y uno tras el tornapunta');
      o.x('Estacas de 2 cm de Ø y 0,5 m', 2, 'Para la carrera');
      o.r('Puntal vertical', `${acF(Pv)} cm (por el lado largo)`); o.r('Tornapunta', `${acF(Lt)} cm a ${acF(al)}°`);
    } },

  /* ---------- Horizontales ---------- */
  horfema: { in: [acIn('D', 'Distancia de pared a pared', 200, { u: 'cm' }), acIn('H', 'Alto de las zapatas murales', 250, { u: 'cm' }),
    acIn('paso', '¿Se usa como entrada?', '', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const Z_ = o.m('Z'), K_ = o.m('K'), X_ = o.m('X'), R_ = o.m('R'), cu = acCu(o), emax = o.n('emax', 'Separación máxima entre codales', 100);
      const nc = Math.max(2, Math.ceil(v.H / emax) - 1), esp = v.H / (nc + 1), Lc = v.D - 2 * Z_.g - 2 * cu;
      o.p('Z', 'Zapata mural', Z_.s, v.H, 2, 'Escuadra', 'Una contra cada pared, vertical; calzos y cuñas en los huecos', 'ZAPATA MURAL', 0, gV('Suelo', ''));
      o.p('P', 'Puntal horizontal o codal', K_.s, Lc, nc, 'Escuadra', `Cada ${acF(esp)} cm de alto; se restan las zapatas (${acF(2 * Z_.g, 1)}) y las cuñas de los dos lados`, 'CODAL', 0, gH('Zapata (cuñas)', 'Zapata (cuñas)'));
      o.p('TL', 'Taco en L', X_.s, 25, 2 * nc, 'Escuadra', 'Bajo cada extremo de codal (o media pletina)', 'TACO L', 0, gH());
      if (!v.paso) o.p('RD', 'Riostra diagonal', R_.s, Math.hypot(v.D - 20, esp * (nc - 1)) + 20, 2, 'A ras de las zapatas', 'En cruz de San Andrés', 'RIOSTRA D', 4, gR(acDeg(Math.atan2(esp * (nc - 1), v.D - 20)), 90, 90, 'Zapata'));
      acCunas(o, 2 * nc, 'Entre codal y zapata, en horizontal'); o.x('Clavos de los tacos', 2 * nc * 4, '', 2 * nc * 4);
      o.r('Codales', `${nc} de ${acF(Lc)} cm`);
      if (Lc > 240) o.a('bad', 'El codal pasa de 2,4 m: haz un lateral de triángulo.');
    } },
  hortablon: { in: [acIn('D', 'Distancia de pared a pared', 260, { u: 'cm' }), acIn('H', 'Alto de las zapatas murales', 280, { u: 'cm' }), acIn('ang', 'Ángulo de tornapuntas y jabalcones', '45', { o: AC_ANG.slice(1) }),
    acIn('r', 'Distancia de la zapata al pie del jabalcón en el codal', 60, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const T = o.m('T'), E_ = o.m('E'), g = T.g, cu = acCu(o), A = +v.ang, a = A * ACR, ej = o.n('ej', 'Largo de los ejiones', A === 60 ? 75 : 60), Lc = v.D - 2 * g - 2 * cu, Lj = v.r / Math.cos(a), nb = Math.max(3, Math.ceil(Lc / 95) + 1);
      o.p('Z', 'Zapata mural', acTab(T), v.H, 2, 'Escuadra', 'Un tablón vertical a cada lado', 'ZAPATA MURAL', 0, gV('Suelo', ''));
      o.p('P', 'Tablón de codal', acTab(T), Lc, 2, 'Escuadra', `Dos tablones embridados; se restan las zapatas y ${acF(cu, 1)} cm de cuñas a cada lado`, 'CODAL', 0, gH('Zapata (cuñas)', 'Zapata (cuñas)'));
      o.p('J', 'Tornapunta / jabalcón', acTab(T), Lj, 4, `Los dos extremos a ${A}° (${90 - A}° fuera de escuadra)`, 'Dos arriba y dos abajo, apoyados en ejiones', 'JABALCÓN', 0,
        { ang: 180 - A, w: T.a, ends: [{ s: 0, on: 'Codal (ejión detrás)' }, { s: 90, on: 'Zapata mural (ejión encima)' }] });
      o.p('E', 'Ejión', E_.s, ej, 8, 'Escuadra', `Cuatro en las zapatas y cuatro en el codal, ${ej >= 75 ? 20 : 14} clavos`, 'EJIÓN', 0, gH());
      o.x('Bridas', nb, 'En el codal'); acCunas(o, 6, 'Cuatro para jabalcones y tornapuntas y dos para los tablones del codal');
      o.x('Clavos de los ejiones', 8 * (ej >= 75 ? 20 : 14), '', 8 * (ej >= 75 ? 20 : 14));
      o.r('Codal', `2 tablones de ${acF(Lc)} cm`); o.r('Jabalcones', `4 de ${acF(Lj)} cm`);
      if (Lc > 240) o.a('warn', 'Codal de más de 2,4 m: valóralo con el especialista o haz un lateral.');
    } },
  horpuntales: { in: [acIn('D', 'Distancia de pared a pared', 200, { u: 'cm' }), acIn('H', 'Alto de las zapatas murales', 280, { u: 'cm' }),
    acIn('tipo', 'Puntales', 'obra', { o: [['obra', 'De obra'], ['holm', 'HOLMATRO']] }), acIn('cab', 'HOLMATRO: alto de los dos cabezales juntos', 0, { u: 'cm' }), acIn('mod', 'HOLMATRO: puntal', 'ml', { o: AC_HOLM.map(h => [h[0], h[1]]) }), AC_EQ],
    calc(v, o) {
      const Z_ = o.m('Z'), n = Math.max(2, Math.ceil(v.H / 100) - 1), L = v.D - 2 * Z_.g;
      o.p('Z', 'Zapata mural', Z_.s, v.H, 2, 'Escuadra', 'En la pared sana y en la dañada', 'ZAPATA MURAL', 0, gV('Suelo', ''));
      if (v.tipo === 'holm') acHolmPuntal(L - +v.cab, v.mod, n, o); else o.x('Puntal de obra', n, `De ${acF(L)} cm entre placas`);
      o.r('Puntales', `${n}, a la misma altura en las dos zapatas, cada ${acF(v.H / (n + 1))} cm`);
      if (L > 240) o.a('bad', 'Más de 2,4 m entre muros: haz un lateral de triángulo.');
    } },

  /* ---------- Puertas y ventanas ---------- */
  hueco: { in: [acIn('A', 'Ancho del hueco', 100, { u: 'cm' }), acIn('Hh', 'Alto del hueco', 210, { u: 'cm' }), acIn('paso', '¿Es un paso?', '1', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const P_ = o.m('P'), C_ = o.m('C'), S_ = o.m('S'), R_ = o.m('R'), cu = acCu(o), L = v.A - cu, P = v.Hh - S_.g - C_.g - cu, tc = o.n('taco', 'Largo de los tacos', 15);
      o.p('S', 'Solera', S_.s, L, 1, 'Escuadra', 'Cuñas en un extremo', 'SOLERA', 0, gH('Lateral del hueco', 'Cuñas'));
      o.p('C', 'Cumbrera', C_.s, L, 1, 'Escuadra', 'Cuñas en el extremo contrario al de la solera', 'CUMBRERA', 0, gH('Cuñas', 'Lateral del hueco'));
      o.p('P', 'Puntal', P_.s, P, 2, 'Escuadra', 'Contra los laterales; el primero bajo las cuñas de la cumbrera', 'PUNTAL', 0, gV());
      o.p('T', 'Taco', P_.s, tc, 2, 'Escuadra', 'Encierran las cuñas: 3 clavos al puntal y 2 a la solera', 'TACO', 0, gH());
      if (!v.paso) o.p('RD', 'Riostra diagonal', R_.s, Math.hypot(L - 20, P) + 10, 2, 'A ras de los puntales', 'En X, una por cara', 'RIOSTRA D', 2, gR(acDeg(Math.atan2(P, L - 20)), 90, 90, 'Puntal'));
      acPletinas(o, 0, 2); acCunas(o, 4, 'Una en solera, una en cumbrera y una bajo cada puntal'); o.x('Clavos de los tacos', 10, '', 10);
      o.r('Puntales', `2 de ${acF(P)} cm`); o.r('Solera y cumbrera', `${acF(L)} cm`);
    } },
  huecoprefab: { in: [acIn('A', 'Ancho de los huecos', 100, { u: 'cm' }), acIn('Hh', 'Alto de los huecos', 210, { u: 'cm' }), acIn('nh', 'Número de huecos iguales', 1), acIn('paso', '¿Son pasos?', '1', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const P_ = o.m('P'), C_ = o.m('C'), S_ = o.m('S'), R_ = o.m('R'), hol = o.n('hol', 'Holgura del cuadro con el hueco (ancho y alto)', 4);
      const nh = Math.max(1, Math.round(v.nh)), L = v.A - hol, P = v.Hh - hol - S_.g - C_.g;
      o.p('S', 'Solera', S_.s, L, nh, 'Escuadra', `Cuadro ${acF(hol)} cm menor que el hueco`, 'SOLERA', 0, gH());
      o.p('C', 'Cumbrera', C_.s, L, nh, 'Escuadra', 'Igual que la solera', 'CUMBRERA', 0, gH());
      o.p('P', 'Puntal', P_.s, P, 2 * nh, 'Escuadra', 'Entre solera y cumbrera', 'PUNTAL', 0, gV('Solera', 'Cumbrera'));
      if (!v.paso) o.p('RD', 'Riostra diagonal', R_.s, Math.hypot(L - 20, P) + 10, 2 * nh, 'A ras de los puntales', 'En X', 'RIOSTRA D', 2, gR(acDeg(Math.atan2(P, L - 20)), 90, 90, 'Puntal'));
      acPletinas(o, 0, 0, 8 * nh); acCunas(o, 2 * nh, 'Para ajustar cada cuadro al hueco');
      o.r('Cuadro', `${acF(L)} × ${acF(v.Hh - hol)} cm`);
    } },
  recercado: { in: [acIn('A', 'Ancho del hueco', 90, { u: 'cm' }), acIn('Hh', 'Alto del hueco', 210, { u: 'cm' }),
    acIn('ref', 'Refuerzo', 'aspa', { o: [['', 'Solo recercado'], ['h', 'Puntal intermedio horizontal'], ['v', 'Puntal intermedio vertical'], ['aspa', 'Aspa (cruz de San Andrés)']] }), AC_EQ],
    calc(v, o) {
      const T = o.m('T'), g = T.g, cu = acCu(o), Lh = v.A - cu, J = v.Hh - 2 * g - cu, iw = v.A - 2 * g, ih = v.Hh - 2 * g;
      o.p('CP', 'Cabecero y peana', acTab(T), Lh, 2, 'Escuadra', 'Arriba y abajo, con cuñas', 'CABECERO/PEANA', 0, gH('Lateral del hueco', 'Cuñas'));
      o.p('J', 'Jamba o montante', acTab(T), J, 2, 'Escuadra', 'A los lados, entre cabecero y peana', 'JAMBA', 0, gV('Peana', 'Cabecero (cuñas)'));
      if (v.ref === 'h') o.p('PI', 'Puntal intermedio horizontal', acTab(T), iw - cu, 1, 'Escuadra', 'Entre jambas, con cuñas', 'PUNTAL H', 0, gH('Jamba', 'Cuñas y jamba'));
      if (v.ref === 'v') o.p('PI', 'Puntal intermedio vertical', acTab(T), ih - cu, 1, 'Escuadra', 'Entre cabecero y peana, con cuñas', 'PUNTAL V', 0, gV('Peana', 'Cuñas y cabecero'));
      if (v.ref === 'aspa') { const an = acDeg(Math.atan2(ih, iw)); o.p('X', 'Tablón del aspa', acTab(T), Math.hypot(iw, ih) + 20, 2, `Encuentros a ${acF(an)}° y ${acF(90 - an)}° para encajar en las esquinas (presentar y marcar)`, 'Entre esquinas opuestas', 'ASPA', 0,
        { ang: an, w: T.a, ends: [{ s: 0, s2: 90, on: 'Esquina peana–jamba' }, { s: 0, s2: 90, on: 'Esquina cabecero–jamba' }] }); }
      acCunas(o, 2 + (v.ref === 'h' || v.ref === 'v' ? 1 : 0), 'Para ajustar el recercado');
      o.r('Recercado', `cabecero y peana de ${acF(Lh)} cm, jambas de ${acF(J)} cm`);
    } },
  huecopuntales: { in: [acIn('A', 'Ancho del hueco', 100, { u: 'cm' }), acIn('Hh', 'Alto del hueco', 210, { u: 'cm' }), acIn('tipo', 'Puntales', 'obra', { o: [['obra', 'De obra'], ['holm', 'HOLMATRO']] }),
    acIn('cab', 'HOLMATRO: alto de los dos cabezales juntos', 0, { u: 'cm' }), acIn('mod', 'HOLMATRO: puntal', 'ml', { o: AC_HOLM.map(h => [h[0], h[1]]) }), acIn('paso', '¿Es un paso?', '1', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const C_ = o.m('C'), S_ = o.m('S'), R_ = o.m('R'), L = v.Hh - S_.g - C_.g;
      o.p('C', 'Cumbrera', C_.s, v.A, 1, 'Escuadra', 'Deja 10 cm entre cada puntal y el extremo', 'CUMBRERA', 0, gH());
      o.p('S', 'Solera', S_.s, v.A, 1, 'Escuadra', 'Igual que la cumbrera', 'SOLERA', 0, gH());
      if (!v.paso) o.p('RD', 'Riostra en X', R_.s, Math.hypot(v.A - 10, L) + 10, 2, 'A ras de solera y cumbrera', 'De solera a cumbrera', 'RIOSTRA X', 2, gR(acDeg(Math.atan2(L, v.A - 10)), 0, 0, 'Solera', 'Cumbrera'));
      if (v.tipo === 'holm') acHolmPuntal(L - +v.cab, v.mod, 2, o); else o.x('Puntal de obra', 2, `De ${acF(L)} cm entre placas`);
      o.r('Puntales', `2 de ${acF(L)} cm`);
    } },

  /* ---------- Especiales ---------- */
  percha: { in: [acIn('Wv', 'Ancho del vano del balcón', 90, { u: 'cm' }), acIn('Hd', 'Altura del suelo al dintel', 210, { u: 'cm' }), acIn('Ht', 'Altura del suelo al techo, dentro', 280, { u: 'cm' }),
    acIn('V', 'Vuelo del balcón', 100, { u: 'cm' }), acIn('B', 'Ancho del balcón', 150, { u: 'cm' }), acIn('e', 'Grueso del muro', 25, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const P_ = o.m('P'), C_ = o.m('C'), S_ = o.m('S'), B_ = o.m('B'), cu = acCu(o), dentro = o.n('bi', 'Brazo interior de la percha', v.V), fuera = o.n('bf', 'La percha pasa del borde del balcón', 20);
      const P = v.Hd - S_.g - B_.g - cu, Lpe = v.V + fuera + v.e + dentro, Pc = v.Ht - C_.g - v.Hd - cu;
      o.p('S', 'Solera', S_.s, v.Wv, 1, 'Escuadra', 'Ajustada al vano', 'SOLERA', 0, gH());
      o.p('P', 'Puntal', P_.s, P, 1, 'Escuadra', 'Vertical, de la solera a la percha (con cuñas)', 'PUNTAL', 0, gV('Solera (sobre las cuñas)', 'Percha'));
      o.p('PE', 'Percha', B_.s, Lpe, 1, 'Escuadra', `Transversal: ${acF(v.V + fuera)} cm fuera (hasta pasar el borde) y ${acF(dentro)} cm dentro`, 'PERCHA', 0, gH());
      o.p('C', 'Cumbrera', C_.s, dentro, 1, 'Escuadra', 'Contra el techo, sobre el brazo interior de la percha', 'CUMBRERA', 0, gH());
      o.p('PC', 'Puntal corto', P_.s, Pc, 2, 'Escuadra', 'De la percha a la cumbrera', 'PUNTAL CORTO', 0, gV('Percha (sobre las cuñas)', 'Cumbrera'));
      o.p('VB', 'Viga bajo el balcón', B_.s, v.B + 20, 1, 'Escuadra', 'Transversal, bajo el balcón', 'VIGA BALCÓN', 0, gH());
      o.x('Cables, cuerdas o eslingas', 2, `De la punta de la percha a la viga: unos ${acF(v.Hd + 60)} cm cada uno`);
      acPletinas(o, 0, 6); acCunas(o, 3);
      o.a('warn', 'Medidas orientativas: compruébalas con el especialista; si el balcón es grande o pesado, dos o más perchas.');
    } },
  voladizoinf: { in: [acIn('Ht', 'Altura del piso de abajo (suelo a forjado)', 270, { u: 'cm' }), acIn('V', 'Vuelo del voladizo', 120, { u: 'cm' }), acIn('sep', 'Separación de los puntales del apeo vertical', 100, { u: 'cm' }),
    acIn('dI', 'Distancia del apeo vertical a la fachada', 30, { u: 'cm' }), acIn('e', 'Grueso del muro', 25, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const P_ = o.m('P'), C_ = o.m('C'), S_ = o.m('S'), R_ = o.m('R'), E_ = o.m('E'), F_ = o.m('F'), cu = acCu(o), vol = o.n('vol', 'Alero de cumbrera y solera del apeo', 30), fr = o.n('fr', 'Fracción del vuelo donde apoya (en tercios)', 2);
      const P = v.Ht - S_.g - C_.g - cu, dx = v.dI + v.sep + vol + v.e + (fr * v.V) / 3, dy = v.Ht - S_.g - C_.g, Li = Math.hypot(dx, dy), al = acDeg(Math.atan2(dy, dx));
      o.p('AV', 'Puntal del apeo vertical', P_.s, P, 2, 'Escuadra', 'Dentro, bajo el forjado', 'PUNTAL V', 0, gV());
      o.p('AC', 'Cumbrera y solera del apeo', C_.s, v.sep + 2 * vol, 2, 'Escuadra', `Alero de ${acF(vol)} cm`, 'CUMBRERA/SOLERA', 0, gH());
      o.p('AR', 'Riostras del apeo', R_.s, Math.hypot(v.sep, P / 2) + 10, 3, 'A ras de los puntales', 'Una horizontal y dos diagonales', 'RIOSTRA', 0, gR(acDeg(Math.atan2(P / 2, v.sep)), 90, 90, 'Puntal'));
      o.p('PI', 'Puntal inclinado', P_.s, Li, 2, `Abajo ${acF(90 - al)}° fuera de escuadra (a nivel); arriba ${acF(90 - al)}° (a nivel contra la cumbrera)`, `Par de puntales, ${acF(al)}°, hasta ${acF(fr)}/3 del vuelo`, 'PUNTAL INCL.', 0,
        { ang: al, ends: [{ s: 0, on: 'Solera del apeo (carrera detrás)' }, { s: 0, on: 'Cumbrera bajo el voladizo' }] });
      o.p('CV', 'Cumbrera bajo el voladizo', C_.s, 90, 1, 'Escuadra', 'Recoge la carga', 'CUMBRERA VOL.', 0, gH());
      o.p('E', 'Ejión', E_.s, 60, 4, 'Escuadra', 'Arriba y abajo de los inclinados', 'EJIÓN', 0, gH());
      o.p('F', 'Freno o carrera', F_.s, 90, 1, 'Escuadra', 'Unido al apeo vertical', 'CARRERA', 0, gH());
      acPletinas(o, 4, 4); acCunas(o, 4);
      o.a('warn', 'Comprueba que el puntal inclinado pasa por el hueco de la fachada; medidas orientativas.');
    } },
  asnillas: { in: [acIn('H', 'Altura del suelo a la carga', 250, { u: 'cm' }), acIn('S', 'Separación entre los pies de las tornapuntas', 200, { u: 'cm' }),
    acIn('sepA', 'Separación entre las dos parejas', 120, { u: 'cm' }), acIn('nt', 'Tablones por pieza', '2', { o: [['2', '2'], ['3', '3']] }), acIn('tir', 'Contrarresto', 'tir', { o: [['tir', 'Tirante metálico'], ['ej', 'Ejiones en el durmiente']] }), AC_EQ],
    calc(v, o) {
      const T = o.m('T'), R_ = o.m('R'), E_ = o.m('E'), g = T.g, nt = +v.nt, cab = o.n('cab', 'Separación de las cabezas al centro', 10);
      const hT = v.H - g - 3 * g, dx = v.S / 2 - cab, Lt = Math.hypot(dx, hT), al = acDeg(Math.atan2(hT, dx));
      o.p('T', 'Tablón de tornapunta', acTab(T), Lt, 4 * nt, `Abajo a nivel (${acF(90 - al)}° fuera de escuadra); cabeza embarbillada contra la aguja`, `Dos parejas contrapuestas, ${acF(al)}°`, 'TORNAPUNTA', 0,
        { ang: al, w: T.a, ends: [{ s: 0, on: 'Durmiente' }, { s: 0, on: 'Aguja', tope: 4, topeOn: 'Barbilla' }] });
      o.p('A', 'Tablón de aguja o marrano', acTab(T), v.S * .9, nt, 'Escuadra', 'Recoge la carga en la cabeza', 'AGUJA', 0, gH());
      o.p('D', 'Durmiente', acTab(T), v.S + 60, 2, 'Escuadra', 'Bajo cada pareja', 'DURMIENTE', 0, gH());
      o.p('R', 'Riostra transversal', R_.s, Math.hypot(v.sepA, hT * .6) + 10, 2, 'A ras de las tornapuntas', 'En X entre las dos parejas', 'RIOSTRA', 0, gR(acDeg(Math.atan2(hT * .6, v.sepA)), 90, 90, 'Tornapunta'));
      if (v.tir === 'ej') o.p('E', 'Ejión', E_.s, 60, 4, 'Escuadra', 'En el durmiente, tras cada pie', 'EJIÓN', 0, gH());
      else o.x('Tirante metálico', 2, `Uniendo los pies de cada pareja: unos ${acF(v.S)} cm`);
      o.x('Bridas', 2, 'En la cabeza, contra el giro de la aguja');
    } },
  puente: { in: [acIn('L', 'Luz entre pies derechos (ejes)', 250, { u: 'cm' }), acIn('H', 'Altura del suelo a la cara de abajo del puente', 270, { u: 'cm' }),
    acIn('nt', 'Tablones por pieza', '3', { o: [['2', '2'], ['3', '3']] }), acIn('jab', '¿Con jabalcones?', '', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const T = o.m('T'), cu = acCu(o), nt = +v.nt, vol = o.n('vol', 'Vuelo del puente sobre cada pie derecho', 30), or_ = o.n('or', 'Oreja: por encima y por debajo del puente', 40);
      const Pd = v.H - T.g - cu, jx = o.n('jx', 'Jabalcón: de largo en horizontal y vertical', 70);
      o.p('PU', 'Tablón del puente (de canto)', acTab(T), v.L + 2 * vol, nt, 'Escuadra', `Vuelo de ${acF(vol)} cm sobre cada pie derecho (o perfil IPN/HEB)`, 'PUENTE', 0, gH());
      o.p('PD', 'Tablón de pie derecho', acTab(T), Pd, 2 * nt, 'Escuadra', 'Dos pies derechos, con cuñas', 'PIE DERECHO', 0, gV('Durmiente (sobre las cuñas)', 'Puente'));
      o.p('O', 'Oreja', acTab(T), T.a + 2 * or_, 4, 'Escuadra', `${acF(or_)} cm por encima y por debajo del puente: no escatimar`, 'OREJA', 0, gV('', ''));
      o.p('D', 'Durmiente', acTab(T), 80, 2, 'Escuadra', 'Según la carga', 'DURMIENTE', 0, gH());
      if (v.jab) { const lj = jx * Math.SQRT2; o.p('J', 'Jabalcón', acTab(T), lj, 2, 'Los dos extremos a 45°', 'Del pie derecho al puente', 'JABALCÓN', 0,
        { ang: 45, w: T.a, ends: [{ s: 90, on: 'Pie derecho' }, { s: 0, on: 'Puente' }] }); o.x('Tirante metálico', 1, `Entre los pies derechos: unos ${acF(v.L)} cm`); }
      o.x('Bridas de atado', 8, 'Lo más cerca posible de las caras de arriba y de abajo del puente'); acCunas(o, 2, 'Bajo los pies derechos');
      o.a('info', 'Arriostrar los pies derechos en las dos direcciones si se puede.');
    } },

  /* ---------- Patrimonio ---------- */
  columna: { in: [acIn('D', 'Diámetro (o lado mayor) de la columna', 60, { u: 'cm' }), acIn('H', 'Altura de solera a cumbrera', 300, { u: 'cm' }),
    acIn('ses', 'Separación entre eslingas (según el daño)', 60, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const M_ = o.m('M'), S_ = o.m('S'), C_ = o.m('C'), t = M_.g, n = Math.max(4, Math.round(Math.PI * (v.D + t) / (M_.a + 15))), L = v.H - S_.g - C_.g, ne = Math.ceil(L / v.ses) + 1, le = Math.PI * (v.D + 2 * t) + 60;
      o.p('M', 'Madero vertical', M_.s, L, n, 'Escuadra', 'Repartidos alrededor de la columna', 'MADERO', 0, gV('Solera', 'Cumbrera'));
      o.p('S', 'Solera (base)', S_.s, v.D + 40, 2, 'Escuadra', 'Dos piezas, una a cada lado', 'SOLERA', 0, gH());
      o.p('C', 'Cumbrera cuajada', C_.s, v.D + 40, 2, 'Escuadra', 'Dos piezas, una a cada lado', 'CUMBRERA', 0, gH());
      o.x('Eslingas o cintas tensoras con trinquete', ne, `De unos ${acF(le)} cm, cada ${acF(v.ses)} cm`);
      o.r('Maderos', `${n} de ${acF(L)} cm`);
      o.a('warn', 'Número y separación de cintas según el grado de daño y las tablas 1 y 2 del M8 (cintas de 5 o 7,5 cm). No vale para hormigón armado.');
    } },
  fachada: { in: [acIn('e', 'Espesor del muro', 50, { u: 'cm' }), acIn('Al', 'Alto a revestir', 250, { u: 'cm' }), acIn('An', 'Ancho a revestir', 300, { u: 'cm' }), acIn('sb', 'Separación entre barras', 100, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const T = o.m('T'), L_ = o.m('L'), fil = Math.max(2, Math.ceil(v.Al / v.sb) + 1), col = Math.max(2, Math.ceil(v.An / v.sb) + 1), nb = fil * col, diam = v.e < 50 ? 6 : 8, Lb = v.e + 2 * T.g + 2 * L_.g + 16, nt = Math.ceil(v.An / T.a);
      o.p('T', 'Tablón del encofrado', acTab(T), v.Al, 2 * nt, 'Escuadra', 'En vertical, por las dos caras', 'ENCOFRADO', 0, gV('Suelo', ''));
      o.p('L', 'Larguero', L_.s, v.An, 2 * fil, 'Escuadra', 'En horizontal sobre los tablones, a la altura de cada fila de barras', 'LARGUERO', 0, gH());
      o.x(`Barra de acero de Ø ${diam} mm (mínimo)`, nb, `De unos ${acF(Lb)} cm: ${fil} filas × ${col} columnas`);
      o.x('Placas y tuercas', 2 * nb, 'Se tensa desde el lado con mejor escape');
      if (v.e > 80) o.a('bad', 'Más de 80 cm: pasa del largo de las brocas.');
      o.a('warn', 'Solo con autorización de la autoridad que tutela el bien. No en muros muy inestables. Apuntalar antes los forjados que cargan en el muro.');
    } }
};

/* ---------- Cálculos compartidos ---------- */
function acHoriz(o, R_, L, q, n) {
  const tr = Math.ceil(L / 225);
  o.p('RH', n, R_.s, tr > 1 ? L / tr + 15 : L, q * tr, 'Escuadra', tr > 1 ? `En ${tr} tramos empalmados sobre un puntal (máx. 2,25 m por tramo)` : 'De lado a lado', 'RIOSTRA H', 2, gR(0, 90, 90, 'A ras de cumbrera y solera'));
}
// Sistema vertical de dos puntales (veces: 1, o 2 para la torre). Devuelve los datos del par.
function acDos(v, o, veces) {
  const P_ = o.m('P'), C_ = o.m('C'), S_ = o.m('S'), R_ = o.m('R'), cu = acCu(o), vol = o.n('vol', 'Voladizo de cumbrera y solera a cada lado', 30);
  const P = v.H - S_.g - C_.g - cu, L = v.sep + 2 * vol, hP = v.H - S_.g - C_.g, nh = v.H > 335 ? 2 : 1, dA = acDeg(Math.atan2(hP / (nh + 1), v.sep));
  o.p('C', 'Cumbrera', C_.s, L, veces, 'Escuadra', `Voladizo de ${acF(vol)} cm a cada lado`, 'CUMBRERA', 0, gH());
  o.p('P', 'Puntal', P_.s, P, 2 * veces, 'Escuadra', `Separados ${acF(v.sep)} cm entre ejes`, 'PUNTAL', 0, gV());
  o.p('S', 'Solera', S_.s, L, veces, 'Escuadra', `${acF(2 * vol)} cm más larga que la separación`, 'SOLERA', 0, gH());
  o.p('RH', 'Riostra horizontal', R_.s, v.sep + P_.a, nh * veces, 'Escuadra', nh === 2 ? 'Dos, a 1/3 y 2/3 de la altura' : 'A media altura', 'RIOSTRA H', 2, gR(0, 90, 90, 'A ras del puntal'));
  o.p('RD', 'Riostra diagonal', R_.s, Math.hypot(v.sep, hP / (nh + 1)) + 10, (nh + 1) * veces, `A ras de los puntales: los dos extremos ${acF(dA)}° fuera de escuadra`, 'Entre los puntales, en zigzag', 'RIOSTRA D', 2, gR(dA, 90, 90, 'A ras del puntal'));
  acPletinas(o, 0, 4 * veces); acCunas(o, 2 * veces);
  o.r('Puntales', `${2 * veces} de ${acF(P)} cm`);
  if (veces === 1) { o.r('Carga (10×10)', v.H <= 240 ? '7.200 kg' : v.H <= 300 ? '4.500 kg' : v.H <= 360 ? '3.100 kg' : '—');
    if (v.H > 360) o.a('bad', 'Pasa de 3,6 m: solo como parte de una torre.'); }
  if (v.sep < 90 || v.sep > 120) o.a('bad', 'Los puntales, entre 90 y 120 cm entre ejes.');
  return { P, hP, Pa: P_.a };
}
// Laterales de triángulo (solera fija con 10×10 o con tablón)
function acLateral(v, o, kind) {
  const tab = kind === 'tablon', T = tab ? o.m('T') : null, Z_ = tab ? T : o.m('Z'), S_ = tab ? T : o.m('S'), P_ = tab ? T : o.m('P'), E_ = o.m('E'), R_ = tab ? null : o.m('R'), F_ = o.m('F'), RH_ = o.m('R');
  const ang = +v.ang, a = ang * ACR, ej = o.n('ej', 'Largo de los ejiones', ang === 60 ? 75 : 60), cl = ej >= 75 ? 20 : 14, tope = o.n('tope', 'Tope a escuadra de los encuentros', 4), nt = Math.max(1, Math.round(v.nt));
  const Ls = v.I / Math.tan(a), Lp = v.I / Math.sin(a), sec = tab ? acTab(T) : null, w = P_.a;
  const dTop = w / Math.tan((90 - ang) * ACR), dBot = w / Math.tan(a);
  const corte = `Encuentros a ${ang}°: arriba, diagonal desde ${acF(dTop)} cm de la esquina; abajo, desde ${acF(dBot)} cm; tope perpendicular de ${acF(tope)} cm en los dos`;
  const geoP = { ang: 180 - ang, w, ends: [{ s: 0, on: 'Solera', tope, topeOn: 'Ejión de tope (cuñas)' }, { s: 90, on: 'Zapata mural', tope, topeOn: 'Ejión' }] };
  o.p('Z', 'Zapata mural', sec || Z_.s, v.I + ej, nt, 'Escuadra', `Inserción a ${acF(v.I)} cm + ${acF(ej)} del ejión`, 'ZAPATA MURAL', 0, gV('Solera', ''));
  o.p('S', 'Solera', sec || S_.s, Ls + ej, nt, 'Escuadra', `${acF(Ls)} cm hasta el puntal + ${acF(ej)} del ejión`, 'SOLERA', 0, gH('Muro', ''));
  if (tab) o.p('P', 'Tablón de tornapunta', sec, Lp, 2 * nt, corte, 'Dos tablones embridados por sistema; medida de vértice a vértice', 'TORNAPUNTA', 0, geoP);
  else o.p('P', 'Puntal', P_.s, Lp, nt, corte, 'Medida de vértice a vértice (inserción en zapata y solera); presentar antes de cortar', 'PUNTAL', 0, geoP);
  o.p('E', 'Ejión', E_.s, ej, 2 * nt, 'Escuadra', `Uno sobre el puntal en la zapata y otro de tope en la solera, ${cl} clavos`, 'EJIÓN', 0, gH());
  if (!tab) o.p('RC', 'Riostra central', R_.s, Lp / 2 + 10, 2 * nt, 'A ras de la solera y del puntal', 'De la esquina zapata–solera al centro del puntal, a cada lado', 'RIOSTRA C', 2,
    gR(acDeg(Math.atan2(v.I / 2, Ls / 2)), 0, 180 - ang, 'Solera', 'Puntal'));
  if (nt > 1) {
    const filas = 2 + (v.I > 240 ? 1 : 0);
    o.p('RH', 'Riostra horizontal entre sistemas', RH_.s, v.sep + 20, filas * (nt - 1), 'Escuadra', `Arriba y abajo de los puntales${filas === 3 ? ' y una intermedia (inserción > 2,4 m)' : ''}`, 'RIOSTRA H', 2, gR(0, 90, 90, 'Sobresale 10 cm de cada puntal'));
    o.p('RD', 'Riostra diagonal entre sistemas', RH_.s, Math.hypot(v.sep, Lp * .7) + 10, 2 * (nt - 1), 'A ras de los puntales', 'En cruz de San Andrés', 'RIOSTRA D', 2, gR(acDeg(Math.atan2(Lp * .7, v.sep)), 90, 90, 'Puntal'));
  }
  o.p('F', 'Freno o carrera', F_.s, nt > 1 ? (nt - 1) * v.sep + 40 : 90, 1, 'Escuadra', 'Tras las soleras, con hueco para cuñas de 5×10', 'CARRERA', 0, gH());
  if (tab) { o.x('Bridas', 3 * nt, 'Tres por tornapunta'); o.x('Cuña clavada en la esquina zapata–solera', nt, ''); }
  else acPletinas(o, 6 * nt, 0);
  acCunas(o, 2 * nt, 'Una entre puntal y ejión de tope y otra entre solera y carrera por sistema');
  o.x('Clavos de los ejiones', 2 * nt * cl, '', 2 * nt * cl);
  o.x('Barras de anclaje de 2 cm de Ø y 1,5 m', 2 * nt, 'En hormigón, con martillo perforador');
  o.r(tab ? 'Tornapunta' : 'Puntal (de vértice a vértice)', `${acF(Lp)} cm`);
  o.r('Solera', `${acF(Ls + ej)} cm (${acF(Ls)} cm + ${acF(ej)} del ejión)`);
  o.r('Zapata mural', `${acF(v.I + ej)} cm (${acF(v.I)} cm + ${acF(ej)} del ejión)`);
  o.r(`Ejiones ${E_.s}`, `${acF(ej)} cm con ${cl} clavos`);
  if (nt < 2) o.a('bad', 'Como mínimo dos sistemas arriostrados entre sí.');
  if (v.sep > 240) o.a('bad', 'Más de 2,4 m entre triángulos.');
  o.a('info', 'El punto de inserción, a la altura del forjado o hasta 60 cm por debajo, nunca por encima.');
}
// Inclinados perpendiculares a la carga o al suelo (dos sistemas iguales arriostrados entre sí)
function acIncl(v, o, kind) {
  const P_ = o.m('P'), C_ = o.m('C'), S_ = o.m('S'), E_ = o.m('E'), R_ = o.m('R'), F_ = o.m('F'), cg = C_.g, sg = S_.g, ejL = o.n('ej', 'Largo de los ejiones', 45);
  const th = v.th * ACR, n = Math.max(2, Math.round(v.n)), cs = Math.cos(th), sn = Math.sin(th), tops = [], lens = [];
  if (kind === 'carga') {
    for (let i = 0; i < n; i++) { const d = i * v.sep, y = v.h + d * sn, x = d * cs; const L = (y - cg * cs - sg) / cs; lens.push(L); tops.push([x + cg * sn, y - cg * cs, x + cg * sn + L * sn]); }
    lens.forEach((L, i) => o.p(`P${i + 1}`, `Puntal ${i + 1}`, P_.s, L, 2, `Arriba escuadra (90° con la carga); abajo ${acF(v.th)}° fuera de escuadra (apoya a nivel)`, i ? `A ${acF(i * v.sep)} cm del primero, medidos a lo largo de la carga` : 'El más bajo', `PUNTAL ${i + 1}`, 0,
      { ang: 90 + v.th, ends: [{ s: 0, on: 'Solera (ejión detrás)' }, { s: v.th, on: 'Cumbrera inclinada' }] }));
    const span = tops[n - 1][2] - tops[0][2];
    o.p('C', 'Cumbrera', C_.s, (n - 1) * v.sep + 60, 2, 'Escuadra', 'Voladizo de 30 cm como máximo', 'CUMBRERA', 0, { ang: v.th, ends: [{ s: 90 + v.th, on: '' }, { s: 90 + v.th, on: '' }] });
    o.p('S', 'Solera', S_.s, span + 100, 2, 'Escuadra', 'Sobresale 60 cm por el lado de los ejiones', 'SOLERA', 0, gH());
    o.p('E', 'Ejión', E_.s, ejL, 2 * n, 'Escuadra', 'Tras cada pie de puntal, 14 clavos', 'EJIÓN', 0, gH());
    const rdA = acDeg(Math.atan2(lens[n - 1] * cs, span + (lens[n - 1] - lens[0]) * sn + 20));
    o.p('RD', 'Riostra diagonal', R_.s, Math.hypot(span + (lens[n - 1] - lens[0]) * sn + 20, lens[n - 1] * cs) + 20, 2, 'A ras de solera y cumbrera', 'Une solera, pie y cabeza de los puntales y cumbrera', 'RIOSTRA D', 4, gR(rdA, 0, v.th, 'Solera', 'Cumbrera'));
  } else {
    for (let i = 0; i < n; i++) { const x = i * v.sep; lens.push(v.h + x * Math.tan(th) - cg / cs - sg); }
    lens.forEach((L, i) => o.p(`P${i + 1}`, `Puntal ${i + 1}`, P_.s, L, 2, `Abajo escuadra; arriba bisel de ${acF(v.th)}° (la pendiente de la carga), medido por el lado largo`, i ? `A ${acF(i * v.sep)} cm del primero` : 'El más bajo', `PUNTAL ${i + 1}`, 0,
      { ang: 90, ends: [{ s: 0, on: 'Solera' }, { s: v.th, on: 'Cumbrera inclinada (ejión detrás)' }] }));
    o.p('C', 'Cumbrera', C_.s, (n - 1) * v.sep / cs + P_.a / cs + 90, 2, 'Escuadra', 'Voladizo de 30 cm abajo y 60 cm arriba', 'CUMBRERA', 0, { ang: v.th, ends: [{ s: 90 + v.th, on: '' }, { s: 90 + v.th, on: '' }] });
    o.p('S', 'Solera', S_.s, (n - 1) * v.sep + 60 + P_.a, 2, 'Escuadra', '30 cm a cada lado de los puntales', 'SOLERA', 0, gH());
    o.p('E', 'Ejión', E_.s, ejL, 2 * n, 'Escuadra', 'En la cumbrera, tras cada puntal', 'EJIÓN', 0, gH());
    const rdA = acDeg(Math.atan2(lens[n - 1], (n - 1) * v.sep + 20));
    o.p('RD', 'Riostra diagonal', R_.s, Math.hypot((n - 1) * v.sep + 20, lens[n - 1]) + 20, 2, 'A ras de solera y cumbrera', 'Une solera, puntales y cumbrera', 'RIOSTRA D', 4, gR(rdA, 0, v.th, 'Solera', 'Cumbrera'));
  }
  const hm = Math.max(...lens), zeta = hm < 120;
  o.p('RS', 'Riostra entre sistemas', R_.s, Math.hypot(v.sepS, hm * .8) + 10, (zeta ? 1 : 2) * n, 'A ras de los puntales', zeta ? 'En Z (menos de 1,2 m)' : 'En X', 'RIOSTRA S', 2, gR(acDeg(Math.atan2(hm * .8, v.sepS)), 90, 90, 'Puntal'));
  o.p('RH', 'Riostra horizontal entre sistemas', R_.s, v.sepS + 20, 2 * n, 'Escuadra', 'Arriba y abajo de cada pareja de puntales', 'RIOSTRA H', 2, gR(0, 90, 90, 'Sobresale 10 cm de cada puntal'));
  o.p('F', 'Freno o carrera', F_.s, v.sepS + 40, 1, 'Escuadra', 'Tras las soleras, con hueco para cuñas', 'CARRERA', 0, gH());
  acPletinas(o, 0, 2 * 3 * n); acCunas(o, 2, 'Entre las soleras y la carrera');
  o.x('Clavos de los ejiones', 2 * n * 14, '', 2 * n * 14); o.x('Estacas de 2 cm de Ø y 0,5 m', 2, 'Para la carrera');
  o.r('Puntales', lens.map(L => `${acF(L)} cm`).join(' · '));
  if (v.sep > 120) o.a('bad', 'Más de 1,2 m entre puntales.');
  if (kind === 'carga' && v.sepS > 150) o.a('bad', 'Más de 1,5 m entre sistemas.');
  if (kind === 'suelo' && v.sepS > (zeta ? 150 : 240)) o.a('bad', `Entre sistemas, máximo ${zeta ? '1,5 m en Z' : '2,4 m en X'}.`);
  if (v.th <= 3) o.a('info', 'Con 3° o menos vale un apuntalamiento vertical.');
}
// HOLMATRO: madera, puntal y extensiones
function acHolmPuntal(Lcm, mod, n, o) {
  const h = AC_HOLM.find(x => x[0] === mod) || AC_HOLM[0], T = Lcm * 10, c = acHolmCombo(T, h[2], h[3]);
  if (!c) { o.x(`Puntal ${h[1]}`, n, `No llega o se pasa para ${acF(Lcm)} cm (cerrado ${acF(h[2] / 10)} cm, recorrido ${acF(h[3] / 10)} cm). Prueba otro puntal`); o.a('bad', 'Con ese puntal no sale ninguna combinación de extensiones.'); return null; }
  const ext = c.list.map(e => `${e[0]} (${e[2]})`);
  o.x(`Puntal ${h[1]}`, n, `Cerrado ${acF(h[2] / 10, 1)} cm; extender ${acF(c.ext / 10, 1)} cm de ${acF(h[3] / 10, 1)}`);
  c.list.forEach(e => o.x(`Extensión ${e[0]} de ${e[1]} mm (${e[2]})`, n, ''));
  o.r('Montaje', `Puntal abajo${ext.length ? ' + ' + ext.join(' + ') : ''} (la más corta, al final)`);
  if (T > 4500) o.a('bad', 'Pasa de 4,5 m: no se puede con HOLMATRO.');
  else if (T > 1325) o.a('info', 'Más de 1.325 mm: la carga baja de 10 t; mira el gráfico del puntal.');
  return c;
}
function acHolm(v, o, n) {
  const C_ = o.m('C'), S_ = o.m('S'), C = o.n('c1', 'Largo de cumbrera y solera', 90), L = v.H - S_.g - C_.g - +v.cab;
  o.p('C', 'Cumbrera', C_.s, C, 1, 'Escuadra', 'Cabezal soporte de viga clavado centrado', 'CUMBRERA', 0, gH());
  o.p('S', 'Solera', S_.s, C, 1, 'Escuadra', 'Cabezal giratorio o base triple', 'SOLERA', 0, gH());
  acHolmPuntal(L, v.mod, n, o);
  o.x('Clavos de los cabezales', 8 * n, '', 8 * n);
  if (!+v.cab) o.a('warn', 'Mete el alto de vuestros cabezales para que la combinación sea exacta.');
  o.a('info', 'El último apriete de hidráulicos y neumáticos, siempre a mano.');
}

/* ==================== VISTA ==================== */
const apuIn = id => {
  const d = APU_CORTES[id]; if (!d) return {};
  const saved = prefs.apuIn?.[id] || {}, out = {};
  d.in.forEach(f => { const raw = saved[f.k] ?? f.v; out[f.k] = f.o || f.t === 'text' ? String(raw ?? '') : (Number.isFinite(parseFloat(String(raw).replace(',', '.'))) ? parseFloat(String(raw).replace(',', '.')) : +f.v); });
  // Maderas (mPa, mPg…) y demás valores (n_vol…) cambiados en «Maderas y medidas»
  Object.keys(saved).filter(k => /^(m[A-Z][ag]|n_\w+)$/.test(k)).forEach(k => { const n = acNum(saved[k]); if (n != null) out[k] = n; });
  return out;
};
function apuSetIn(id, k, val) { setPref({ apuIn: { ...(prefs.apuIn || {}), [id]: { ...(prefs.apuIn?.[id] || {}), [k]: val } } }); }
function apuDone(id, code, on) { setPref({ apuDone: { ...(prefs.apuDone || {}), [id]: { ...(prefs.apuDone?.[id] || {}), [code]: on } } }); }
function apuDoneReset(id) { setPref({ apuDone: { ...(prefs.apuDone || {}), [id]: {} } }); }
// Las maderas de este tipo pasan a ser las de siempre (para todos los tipos), o este tipo vuelve a las de siempre
function apuMadGuardar(id) {
  const r = apuCortes(id), m = { ...(prefs.apuMad || {}) };
  (r.mad || []).forEach(k => { const x = apuMad(r.v || {}, k); m[k] = { a: x.a, g: x.g }; });
  setPref({ apuMad: m }); toast('Guardadas como las maderas de siempre');
}
function apuMadReset(id) {
  const cur = { ...(prefs.apuIn?.[id] || {}) };
  Object.keys(cur).filter(k => /^(m[A-Z][ag]|n_\w+)$/.test(k)).forEach(k => delete cur[k]);
  setPref({ apuIn: { ...(prefs.apuIn || {}), [id]: cur } });
}

function apuCortes(id) {
  const d = APU_CORTES[id], v = apuIn(id), r = { pz: [], ex: [], av: [], rs: [], clavos: 0, mad: [], par: [] };
  const o = {
    p: (c, n, s, l, q, cut, d, corto, uniones = 0, geo = null) => { if (!(q > 0) || !Number.isFinite(l)) return; r.pz.push({ c, n, s, l: Math.round(l), q, cut, d, corto, geo }); if (uniones) r.clavos += uniones * 5 * q; },
    m: k => { if (!r.mad.includes(k)) r.mad.push(k); return apuMad(v, k); },
    n: (k, l, def, u = 'cm') => { if (!r.par.some(x => x.k === k)) r.par.push({ k, l, def, u }); return v['n_' + k] ?? def; },
    x: (n, q, d, clavos = 0) => { if (q > 0) r.ex.push({ n, q, d }); r.clavos += clavos; },
    a: (cls, t) => r.av.push([cls, t]), r: (k, val) => r.rs.push([k, val])
  };
  const bad = d.in.filter(f => !f.o && f.t !== 'text').find(f => !(v[f.k] > 0) && !['cab'].includes(f.k));
  if (bad) { r.err = `Falta «${bad.l}».`; return r; }
  d.calc(v, o);
  r.v = v;
  return r;
}
// Barras necesarias por sección (primero las piezas más largas; 0,5 cm por corte)
function apuBarras(pz, stock) {
  const by = {};
  pz.forEach(p => { for (let i = 0; i < p.q; i++) (by[p.s] = by[p.s] || []).push(p.l); });
  return Object.entries(by).map(([s, ls]) => {
    ls.sort((a, b) => b - a); const bars = [], largas = ls.filter(l => l > stock);
    ls.filter(l => l <= stock).forEach(l => { const b = bars.find(x => x + l + .5 <= stock); if (b != null) bars[bars.indexOf(b)] += l + .5; else bars.push(l); });
    return { s, metros: ls.reduce((a, b) => a + b, 0) / 100, barras: bars.length, largas };
  });
}

function apuCortesPanel(t) {
  const d = APU_CORTES[t.id], v = apuIn(t.id), r = apuCortes(t.id), done = prefs.apuDone?.[t.id] || {}, stock = +prefs.apuStock || 400;
  const field = f => f.o
    ? `<label class="lbl">${esc(f.l)}<select class="input" onchange="apuSetIn('${t.id}', '${f.k}', this.value)">${f.o.map(([k, l]) => `<option value="${esc(k)}" ${String(v[f.k]) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>`
    : `<label class="lbl">${esc(f.l)}${f.u ? ` (${f.u})` : ''}<input class="input" ${f.t === 'text' ? 'type="text"' : 'type="number" inputmode="decimal"'} value="${esc(v[f.k])}" autocomplete="off" onchange="apuSetIn('${t.id}', '${f.k}', this.value)"></label>`;
  const num = (k, val, lbl) => `<input class="input" type="number" inputmode="decimal" min="0.5" step="0.5" value="${esc(acF(val, 1).replace('.', ''))}" aria-label="${esc(lbl)}" autocomplete="off" onchange="apuSetIn('${t.id}', '${k}', this.value)">`;
  const madRow = k => { const m = apuMad(v, k), cambiada = v['m' + k + 'a'] != null || v['m' + k + 'g'] != null;
    return `<div class="apu-mad-row"><span class="apu-mad-n">${esc(AC_MAD[k][0])}${cambiada ? ' <span class="tag info">cambiada</span>' : ''}</span>
      <span class="apu-mad-in">${num('m' + k + 'a', m.a, AC_MAD[k][0] + ': ancho en cm')}<span aria-hidden="true">×</span>${num('m' + k + 'g', m.g, AC_MAD[k][0] + ': grueso en cm')}</span></div>`; };
  const parRow = x => `<label class="lbl">${esc(x.l)}${x.u ? ` (${x.u})` : ''}<input class="input" type="number" inputmode="decimal" value="${esc(acF(v['n_' + x.k] ?? x.def, 1).replace('.', ''))}" autocomplete="off" onchange="apuSetIn('${t.id}', 'n_${x.k}', this.value)"></label>`;
  const eq = v.eq ? ` · ${v.eq}` : '';
  const pend = r.pz.filter(p => !done[p.c]).reduce((s, p) => s + p.q, 0);
  const abierto = prefs.apuMadOpen?.[t.id];
  return `
    <div class="panel apu-calc">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('calc')} Medidas y cortes</h3>${r.pz.length ? `<span class="tag ${pend ? 'info' : 'ok'}">${pend ? `${pend} por cortar` : 'Todo cortado'}</span>` : ''}</div>
      <div class="grid g2">${d.in.map(field).join('')}</div>
      ${r.mad.length || r.par.length ? `<details class="apu-more" ${abierto ? 'open' : ''} ontoggle="prefs.apuMadOpen = { ...(prefs.apuMadOpen || {}), '${t.id}': this.open }; writeJSON(KEY.prefs, prefs)">
        <summary>${ic('sliders', 'i-sm')} Maderas y medidas <small class="muted">${r.mad.map(k => `${AC_MAD[k][0].toLowerCase()} ${apuMad(v, k).s}`).join(' · ')}</small></summary>
        ${r.mad.length ? `<p class="muted apu-more-p">Ancho × grueso de la madera que tenéis, en cm (de medio en medio centímetro). Todas las medidas y los cortes se recalculan con ella.</p>
        <div class="apu-mad"><div class="apu-mad-h" aria-hidden="true"><span></span><span><span>ancho</span><span>grueso</span></span></div>${r.mad.map(madRow).join('')}</div>` : ''}
        ${r.par.length ? `<h4 class="arc-fam">Otras medidas</h4><div class="grid g2">${r.par.map(parRow).join('')}</div>` : ''}
        <div class="row" style="margin-top:12px"><button class="btn btn-g btn-sm" onclick="apuMadGuardar('${t.id}')">${ic('check', 'i-sm')} Usar estas maderas en todos los tipos</button>
          <button class="btn btn-g btn-sm" onclick="apuMadReset('${t.id}')">${ic('refresh', 'i-sm')} Volver a las de siempre</button></div>
      </details>` : ''}
      ${r.err ? `<p class="muted" style="margin-top:10px">${esc(r.err)}</p>` : `
      ${r.rs.length ? `<dl class="dl apu-dl" style="margin-top:12px">${r.rs.map(([k, val]) => `<dt>${esc(k)}</dt><dd><b>${esc(val)}</b></dd>`).join('')}</dl>` : ''}
      ${r.av.map(([c, txt]) => `<div class="callout ${c === 'bad' ? 'bad' : c === 'warn' ? 'warn' : 'info'}" style="margin-top:8px"><p>${ic(c === 'info' ? 'book' : 'alert', 'i-sm')} ${esc(txt)}</p></div>`).join('')}
      ${r.pz.length ? `<h4 class="arc-fam">Lista de cortes</h4>
      <div class="list">${r.pz.map(p => `<div class="item arc-cut apu-pieza ${done[p.c] ? 'done' : ''}"><label class="apu-pieza-l"><input type="checkbox" ${done[p.c] ? 'checked' : ''} onchange="apuDone('${t.id}', '${esc(p.c)}', this.checked)">
        <div class="grow"><div class="arc-cut-head"><span class="arc-code">${esc(p.c)}</span><b>${esc(p.n)}</b><span class="arc-len">${p.q} × ${p.l} cm</span></div>
          <small>${esc(p.s)} · ${esc(p.d)}</small><small class="arc-cut-how">${esc(p.cut)}</small>
          <span class="arc-label">${esc(p.corto)} ${p.l} cm${esc(eq)}</span></div></label>
        <details class="apu-guia"><summary>${ic('wrench', 'i-sm')} Cómo se corta y cómo encaja</summary>${apuGuiaPieza(p)}
          ${pltExtremos(p) ? `<button class="btn btn-g btn-sm" onclick="apuPlantillas('${t.id}', '${esc(p.c)}')">${ic('printer', 'i-sm')} Plantilla del corte a tamaño real</button>` : ''}</details></div>`).join('')}</div>` : ''}
      ${r.ex.length || r.clavos ? `<h4 class="arc-fam">Además</h4><div class="list">${r.ex.map(x => `<div class="item arc-extra"><div class="grow"><b>${esc(x.n)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}</div><span class="arc-num"><b>${x.q}</b></span></div>`).join('')}
        ${r.clavos ? `<div class="item arc-extra"><div class="grow"><b>Clavos (aprox.)</b><small>Pletinas, ejiones, tacos y unos 5 por unión de riostra; lleva de sobra</small></div><span class="arc-num"><b>${Math.ceil(r.clavos * 1.2 / 10) * 10}</b></span></div>` : ''}</div>` : ''}
      ${r.pz.length ? `<h4 class="arc-fam">Madera</h4>
        <label class="lbl" style="max-width:260px">Largo de vuestras barras (cm)<input class="input" type="number" value="${stock}" autocomplete="off" onchange="setPref({ apuStock: this.value })"></label>
        <div class="list" style="margin-top:8px">${apuBarras(r.pz, stock).map(b => `<div class="item arc-extra"><div class="grow"><b>${esc(b.s)}</b><small>${acF(b.metros, 1)} m en total${b.largas.length ? ` · ${b.largas.length} pieza(s) más larga(s) que la barra: pedir más larga o empalmar si es riostra` : ''}</small></div><span class="arc-num"><b>${b.barras}</b> barras</span></div>`).join('')}</div>
        <div class="row" style="margin-top:12px"><button class="btn btn-g" onclick="shareText(apuCortesText('${t.id}'), 'Cortes')">${ic('chat')} Enviar los cortes</button>
          <button class="btn btn-g" onclick="apuPrint('${t.id}')">${ic('printer')} Hoja de corte</button>
          ${apuTienePlantillas(r) ? `<button class="btn btn-g" onclick="apuPlantillas('${t.id}')">${ic('printer')} Plantillas a tamaño real</button>` : ''}
          ${Object.values(done).some(Boolean) ? `<button class="btn btn-g" onclick="apuDoneReset('${t.id}')">${ic('refresh')} Quitar las marcas</button>` : ''}</div>` : ''}`}
      <p class="muted" style="margin-top:10px;font-size:13px">Medir dos veces y cortar una. Las medidas salen de los temas de la UME; compruébalas en el sitio antes de cortar.</p>
    </div>`;
}
function apuCortesText(id) {
  const t = apuGet(id), r = apuCortes(id), v = r.v || {};
  return [...waHead('🪵', 'CORTES · ' + t.name.toUpperCase(), v.eq || ''),
    ...APU_CORTES[id].in.filter(f => f.k !== 'eq').map(f => `• ${f.l}: ${f.o ? (f.o.find(o => String(o[0]) === String(v[f.k]))?.[1] || '') : v[f.k] + (f.u ? ' ' + f.u : '')}`),
    '', ...r.rs.map(([k, val]) => `*${k}:* ${val}`), '', '*Cortes*', ...r.pz.map(p => `☐ ${p.c} · ${p.q} × ${p.n} ${p.s}: *${p.l} cm* (${p.cut})`),
    '', '*Además*', ...r.ex.map(x => `• ${x.q} × ${x.n}${x.d ? ' (' + x.d + ')' : ''}`), ...r.av.map(([, txt]) => `⚠️ ${txt}`)].join('\n');
}
function apuPrint(id) {
  const t = apuGet(id), r = apuCortes(id), v = r.v || {};
  $('print').innerHTML = `<div class="arc-print"><h1>Hoja de corte · ${esc(t.name)}${v.eq ? ' · ' + esc(v.eq) : ''}</h1>
    <p>${APU_CORTES[id].in.filter(f => f.k !== 'eq').map(f => `${esc(f.l)}: <b>${esc(f.o ? (f.o.find(o => String(o[0]) === String(v[f.k]))?.[1] || '') : v[f.k] + (f.u ? ' ' + f.u : ''))}</b>`).join(' · ')}</p>
    <table><tr><th></th><th>Código</th><th>Pieza</th><th>Sección</th><th>Largo</th><th>Cant.</th><th>Corte</th><th>Rótulo</th></tr>
    ${r.pz.map(p => `<tr><td>☐</td><td><b>${esc(p.c)}</b></td><td>${esc(p.n)}</td><td>${esc(p.s)}</td><td>${p.l} cm</td><td>${p.q}</td><td>${esc(p.cut)}</td><td>${esc(p.corto)} ${p.l} cm${v.eq ? ' · ' + esc(v.eq) : ''}</td></tr>`).join('')}</table>
    <h2>Guía de corte de cada pieza</h2>
    <div class="apu-print-guias">${r.pz.map(p => `<section class="apu-print-step"><h3>${esc(p.c)} · ${esc(p.n)} · ${p.q} × ${p.l} cm (${esc(p.s)})</h3>${apuGuiaPieza(p)}</section>`).join('')}</div>
    <h2>Además</h2><ul>${r.ex.map(x => `<li>${x.q} × ${esc(x.n)}${x.d ? ' — ' + esc(x.d) : ''}</li>`).join('')}</ul>
    ${r.av.length ? `<h2>Avisos</h2><ul>${r.av.map(([, txt]) => `<li>${esc(txt)}</li>`).join('')}</ul>` : ''}</div>`;
  print();
}
