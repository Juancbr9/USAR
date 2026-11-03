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
// Cada tipo: in (medidas: clave, etiqueta, valor de serie, opciones o unidad) y calc(v, o), que con o.p() añade piezas
// de madera, o.x() lo demás, o.a() avisos y o.r() el resumen. Medidas en cm.
const AC_EQ = { k: 'eq', l: 'Equipo (va en el rótulo)', v: 'Equipo 1', t: 'text' };
const acIn = (k, l, v, extra = {}) => ({ k, l, v, ...extra });
// Pares de cuñas, pletinas y clavos: lo que se suma al final
const acPletinas = (o, n30, n15, ntri = 0) => {
  if (n30) o.x('Pletina de contrachapado 30×30×2', n30, '5 clavos de 6,5 al puntal y 8 a la otra pieza', n30 * 13);
  if (n15) o.x('Media pletina 15×30×2', n15, '4 clavos al puntal y 4 a la otra pieza', n15 * 8);
  if (ntri) o.x('Media pletina triangular (lados rectos de 30)', ntri, '13 clavos', ntri * 13);
};
const acCunas = (o, n, d = 'Bajo cada puntal; un clavo detrás tras el ajuste', med = '5×10×30') => n && o.x(`Pares de cuñas de ${med}`, n, d, n);

const APU_CORTES = {
  /* ---------- Generalidades ---------- */
  tablon: { in: [acIn('L', 'Largo del puntal de tablones', 250, { u: 'cm' }), acIn('g', 'Tablón', '7', { o: AC_TAB })],
    calc(v, o) {
      const nb = Math.max(3, Math.ceil(v.L / 95) + 1), sepB = (v.L - 20) / (nb - 1);
      o.p('T', 'Tablón del puntal', `tablón 20×${v.g}`, v.L, 2, 'Escuadra', 'Dos tablones cara con cara', 'TABLÓN PUNTAL');
      o.x('Bridas (o pernos con pletina)', nb, `Una en cada extremo y repartidas cada ${acF(sepB)} cm (entre 40 y 95), alternando la inclinación`);
      o.r('Bridas', `${nb}, cada ${acF(sepB)} cm`);
      if (sepB < 40) o.a('warn', 'Puntal muy corto: con piezas cortas se pueden usar sueltas.');
    } },
  holmatro: { in: [acIn('H', 'Altura del suelo al techo', 250, { u: 'cm' }), acIn('cab', 'Alto de los dos cabezales juntos (mide los tuyos)', 0, { u: 'cm' }), acIn('mod', 'Puntal', 'ml', { o: AC_HOLM.map(h => [h[0], h[1]]) })],
    calc(v, o) { acHolm(v, o, 1, 90); } },

  /* ---------- Verticales ---------- */
  t: { in: [acIn('H', 'Altura del suelo al techo (la más baja de las medidas)', 250, { u: 'cm' }), acIn('C', 'Largo de cumbrera y solera (máx. 90)', 90, { u: 'cm' }), acIn('cu', 'Cuñas', '4', { o: AC_CU }), AC_EQ],
    calc(v, o) {
      const P = v.H - 20 - +v.cu;
      o.p('C', 'Cumbrera', '10×10', v.C, 1, 'Escuadra', 'Centrada bajo la carga, contacto total', 'CUMBRERA');
      o.p('P', 'Puntal', '10×10', P, 1, 'Escuadra en los dos extremos', `Centrado. Se resta solera (10), cumbrera (10) y cuñas (${v.cu})`, 'PUNTAL');
      o.p('S', 'Solera', '10×10', v.C, 1, 'Escuadra', 'Firme en el suelo; igual que la cumbrera', 'SOLERA');
      acPletinas(o, 2, 1); acCunas(o, 1);
      o.r('Puntal', `${acF(P)} cm`); o.r('Carga', 'De 1.800 a 450 kg (cuanto más alto, menos)');
      if (v.H > 330) o.a('bad', `Pasa de 3,30 m: la T no vale con 10×10. Haz un sistema de dos puntales o una torre.`);
      if (v.C > 90) o.a('bad', 'La cumbrera de la T no puede pasar de 90 cm.');
      if (P > 250) o.a('warn', 'Puntal de 10×10 de más de 2,50 m: puede romper sin avisar (relación 1/25).');
    } },
  fila: { in: [acIn('H', 'Altura del suelo al techo (la más baja de tres medidas)', 250, { u: 'cm' }), acIn('L', 'Largo de la cumbrera (zona a apuntalar)', 300, { u: 'cm' }), acIn('cu', 'Cuñas', '4', { o: AC_CU }), AC_EQ],
    calc(v, o) {
      const P = v.H - 20 - +v.cu, n = Math.max(2, Math.ceil((v.L - 60) / 120) + 1), sep = (v.L - 60) / (n - 1), hP = v.H - 20;
      o.p('C', 'Cumbrera', '10×10', v.L, 1, 'Escuadra', 'Nivelada con el punto más bajo; huecos con cuñas', 'CUMBRERA');
      o.p('P', 'Puntal', '10×10', P, n, 'Escuadra', `A 30 cm de los extremos y cada ${acF(sep)} cm entre ejes`, 'PUNTAL');
      o.p('S', 'Solera', '10×10', v.L, 1, 'Escuadra', 'Alineada con la cumbrera y nivelada', 'SOLERA');
      const dX = Math.hypot(v.L - 10, hP) + 10;
      if (dX <= 300) o.p('RD', 'Riostra diagonal', '5×10', dX, 2, 'Presentar y marcar', 'Una por cada cara en sentido contrario (cruz de San Andrés); clavada a cumbrera, solera y puntales', 'RIOSTRA D', 3);
      else o.p('RD', 'Riostra diagonal (por vanos)', '5×10', Math.hypot(sep + 10, hP) + 10, 2 * (n - 1), 'Presentar y marcar', 'Entera pasaría de 3 m: una X en cada vano, una por cara', 'RIOSTRA D', 3);
      if (v.H > 240) acHoriz(o, v.L, 1, 'Riostra horizontal central (más de 2,4 m)');
      acPletinas(o, 0, n + 2 * n); acCunas(o, n);
      o.r('Puntales', `${n} de ${acF(P)} cm, cada ${acF(sep)} cm`);
      if (sep > 120) o.a('bad', 'Más de 1,2 m entre puntales.');
      o.a('info', 'Medias pletinas: arriba una por puntal; abajo, en las dos caras si hay riesgo de réplicas (salvo donde vayan diagonales).');
    } },
  dos: { in: [acIn('H', 'Altura del suelo al techo', 250, { u: 'cm' }), acIn('sep', 'Separación entre puntales (ejes, 90–120)', 120, { u: 'cm' }), acIn('cu', 'Cuñas', '4', { o: AC_CU }), AC_EQ],
    calc(v, o) { acDos(v, o, 1); } },
  torre: { in: [acIn('H', 'Altura del suelo al techo', 300, { u: 'cm' }), acIn('sep', 'Separación de los puntales de cada par (90–120)', 120, { u: 'cm' }),
    acIn('fondo', 'Separación entre los dos pares (90–120)', 120, { u: 'cm' }), acIn('cu', 'Cuñas', '4', { o: AC_CU }), AC_EQ],
    calc(v, o) {
      const P = acDos(v, o, 2), hP = v.H - 20, nd = v.H < 180 ? 1 : v.H <= 330 ? 2 : 3;
      o.p('LH', 'Riostra horizontal de lateral', '5×10', v.fondo + 10, 2 * (nd + 1), 'Escuadra', `Uniendo los dos pares, por ambos laterales: ${nd + 1} alturas`, 'RIOSTRA LAT. H', 2);
      o.p('LD', 'Diagonal de lateral', '5×10', Math.hypot(v.fondo, hP / nd) + 10, 2 * nd, 'Presentar y marcar', nd === 1 ? 'Una por lateral' : nd === 2 ? 'Dos en K por lateral' : 'Tres por lateral', 'DIAGONAL LAT.', 3);
      o.r('Diagonales por lateral', nd === 1 ? 'Una (< 1,8 m)' : nd === 2 ? 'Dos en K (1,8–3,3 m)' : 'Tres (3,3–5,1 m)');
      const hmax = Math.min(510, 4 * Math.min(v.sep, v.fondo));
      if (v.H > hmax) o.a('bad', `Demasiado alta: máximo ${acF(hmax)} cm (4 veces la separación y nunca más de 5,1 m).`);
      if (P > 490) o.a('bad', 'El puntal pasa de 4,9 m.');
      if (v.fondo < 90 || v.fondo > 120) o.a('bad', 'Los pares, entre 90 y 120 cm.');
      o.r('Carga de trabajo', 'Unos 15.000 kg');
    } },
  vtablon: { in: [acIn('H', 'Altura del suelo al techo', 220, { u: 'cm' }), acIn('n', 'Número de puntales', 2), acIn('sep', 'Separación entre puntales (máx. 100)', 100, { u: 'cm' }), acIn('g', 'Tablón', '7', { o: AC_TAB }), AC_EQ],
    calc(v, o) {
      const g = +v.g, n = Math.max(1, Math.round(v.n)), P = v.H - 2 * g - 4, C = n === 1 ? 90 : (n - 1) * v.sep + 60, nb = Math.max(3, Math.ceil(P / 95) + 1);
      o.p('C', 'Cumbrera', `tablón 20×${g}`, C, 1, 'Escuadra', n === 1 ? 'Máx. 90 cm' : 'Alero de 30 cm en cada extremo', 'CUMBRERA');
      o.p('P', 'Tablón de puntal', `tablón 20×${g}`, P, 2 * n, 'Escuadra', `Dos por puntal, embridados. Se resta solera y cumbrera (${g} + ${g}) y 4 de cuñas`, 'TABLÓN PUNTAL');
      o.p('S', 'Solera', `tablón 20×${g}`, C, 1, 'Escuadra', 'Firme en el suelo', 'SOLERA');
      if (n > 1) {
        if (v.H < 180) o.p('RD', 'Riostra diagonal', '5×10 o tabla', Math.hypot(v.sep, P) + 10, 2 * (n - 1), 'Presentar y marcar', 'Una por delante y otra por detrás: cruz de San Andrés', 'RIOSTRA D', 3);
        else { o.p('RH', 'Riostra horizontal', '5×10 o tabla', v.sep + 30, 2 * (n - 1), 'Escuadra', 'En medio, a cada lado', 'RIOSTRA H', 2);
          o.p('RD', 'Riostra diagonal', '5×10 o tabla', Math.hypot(v.sep, P / 2) + 10, 4 * (n - 1), 'Presentar y marcar', 'Cruces arriba y abajo', 'RIOSTRA D', 3); }
      }
      o.x('Bridas (o pernos)', nb * n, `${nb} por puntal: extremos y centro, entre 40 y 95 cm, alternando la inclinación`);
      acCunas(o, 2 * n, 'Uno bajo cada tablón');
      o.r('Tablones de puntal', `${2 * n} de ${acF(P)} cm`);
      if (n > 1 && v.sep > 100) o.a('bad', 'Más de 1 m entre puntales.');
    } },
  vobra: { in: [acIn('H', 'Altura del suelo al techo', 250, { u: 'cm' }), acIn('n', 'Número de puntales', 2), acIn('sep', 'Separación entre puntales', 100, { u: 'cm' }), acIn('paso', '¿Es un lugar de paso?', '', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const n = Math.max(1, Math.round(v.n)), C = n === 1 ? 90 : (n - 1) * v.sep + 40, L = v.H - 20;
      o.p('C', 'Cumbrera', '10×10', C, 1, 'Escuadra', n === 1 ? 'La placa centrada y clavada' : 'Deja 10 cm entre cada placa y el extremo', 'CUMBRERA');
      o.p('S', 'Solera', '10×10', C, 1, 'Escuadra', 'Igual que la cumbrera', 'SOLERA');
      if (n > 1 && !v.paso) o.p('RD', 'Riostra en X', '5×10', Math.hypot(C - 10, L) + 10, 2, 'Presentar y marcar', 'De solera a cumbrera, una por cara', 'RIOSTRA X', 2);
      o.x('Puntal de obra', n, `Que cierre por debajo de ${acF(L)} cm y llegue a ${acF(L)} cm (suelo a techo menos 20 de solera y cumbrera)`);
      o.x('Clavos para las placas', 8 * n, 'Por los agujeros de cada placa, hasta algo más de la mitad, y doblados', 8 * n);
      o.r('Puntales de obra', `${n} de ${acF(L)} cm`);
      o.a('warn', 'Solo temporal: los puntales de obra no se arriostran entre sí.');
    } },
  vholm: { in: [acIn('H', 'Altura del suelo al techo', 250, { u: 'cm' }), acIn('n', 'Número de puntales (T: 1, doble T: 2)', 1), acIn('cab', 'Alto de los dos cabezales juntos (mide los tuyos)', 0, { u: 'cm' }),
    acIn('mod', 'Puntal', 'ml', { o: AC_HOLM.map(h => [h[0], h[1]]) })],
    calc(v, o) { acHolm(v, o, Math.max(1, Math.round(v.n)), Math.round(v.n) > 1 ? null : 90); } },

  /* ---------- Zampeados ---------- */
  zampeado: { in: [acIn('H', 'Altura a sostener', 90, { u: 'cm' }), acIn('w', 'Largo de las viguetas (ancho del zampeado)', 60, { u: 'cm' }),
    acIn('a', 'Madera', '10', { o: [['10', '10×10'], ['15', '15×15']] }), acIn('nv', 'Viguetas por capa', '2', { o: [['2', '2 × 2'], ['3', '3 × 3']] }), acIn('base', '¿Base de cojines o gatos?', '', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const a = +v.a, nv = +v.nv, capas = Math.floor(v.H / a), resto = v.H - capas * a, solida = Math.max(nv, Math.ceil(v.w / a));
      const total = solida + (capas - 1) * nv + (v.base && capas > 1 ? solida - nv : 0);
      o.p('V', 'Vigueta', `${a}×${a}`, v.w, total, 'Escuadra', `${capas} capas cruzadas; la primera sólida (${solida} viguetas)${v.base ? ' y la última también' : ''}; las esquinas sobresalen 10 cm`, 'VIGUETA');
      if (resto > 0.5) acCunas(o, 2, `Ajuste a la carga: faltan ${acF(resto, 1)} cm`, '5×30');
      const cap = { '2-10': 10800, '2-15': 27200, '3-10': 25000, '3-15': 61200 }[`${nv}-${a}`];
      o.r('Capas', `${capas} de ${a} cm`); o.r('Viguetas', `${total} de ${acF(v.w)} cm`); o.r('Carga máxima', `${acF(cap)} kg`); o.r('Ancho mínimo', `${acF(Math.ceil(v.H / 3))} cm (alto/ancho ≤ 3)`);
      if (v.H / v.w > 3) o.a('bad', 'Demasiado alto para ese ancho: el alto no puede pasar de 3 veces el ancho.');
      if (v.H > 150) o.a('info', 'Más de 1,5 m: clava un listón fino en las esquinas (ayuda y avisa de descuadres).');
    } },

  /* ---------- Laterales ---------- */
  volante: { in: [acIn('I', 'Altura del punto de inserción', 250, { u: 'cm' }), acIn('zb', 'Altura del pie de la zapata mural (por encima de los escombros)', 120, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const a = 60 * ACR, Lp = (v.I - 5) / Math.sin(a), d = 10 + (v.I - 5) / Math.tan(a), Z = v.I + 60 - v.zb, yr = v.zb + 10, rh = (v.I - yr) / Math.tan(a) + 15;
      o.p('Z', 'Zapata mural', '10×10', Z, 1, 'Escuadra', `Del pie (a ${acF(v.zb)} cm) hasta 60 cm por encima de la inserción`, 'ZAPATA MURAL');
      o.p('P', 'Puntal', '10×10', Lp, 1, 'Encuentros a 60° (diagonal desde 17 cm del lateral y tope perpendicular de 4 cm)', 'De vértice a vértice: de la inserción al fondo de la caja', 'PUNTAL 60°');
      o.p('E', 'Ejión', '5×10', 60, 1, 'Escuadra', 'En la zapata, encima del puntal, con 14 clavos', 'EJIÓN');
      o.p('RH', 'Riostra horizontal', '5×10', rh, 2, 'Presentar y marcar', 'Del pie de la zapata al puntal, a cada lado', 'RIOSTRA H', 2);
      o.p('BF', 'Fondo de la caja', '5×10', 90, 1, 'Escuadra', 'Base tipo caja', 'FONDO CAJA');
      o.p('BL', 'Lateral de la caja', '5×15', 90, 2, 'Escuadra', 'Con 7 clavos cada uno', 'LATERAL CAJA');
      o.p('F', 'Freno o carrera', '10×10', 90, 1, 'Escuadra', 'Tras la caja, con hueco para cuñas de 5×10', 'CARRERA');
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
    acIn('sep', 'Separación entre sistemas', 200, { u: 'cm' }), acIn('g', 'Tablón', '7', { o: AC_TAB }), AC_EQ],
    calc(v, o) { acLateral(v, o, 'tablon'); } },
  lobra: { in: [acIn('I', 'Altura del punto de inserción', 180, { u: 'cm' }), acIn('nt', 'Número de sistemas', 2), acIn('sep', 'Separación entre sistemas', 200, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const Ls = v.I, Lp = v.I * Math.SQRT2, nt = Math.max(1, Math.round(v.nt));
      o.p('Z', 'Zapata mural', '10×10', v.I + 70, nt, 'Escuadra', 'Contra la pared', 'ZAPATA MURAL');
      o.p('S', 'Solera', '10×10', Ls + 70, nt, 'Escuadra', 'O un puntal de obra con una pequeña solera', 'SOLERA');
      o.p('E', 'Ejión cortado a 45°', '10×10', 70, 2 * nt, 'Un extremo a 45° para la placa del puntal', 'Arriba en la zapata y abajo en la solera, 14 clavos', 'EJIÓN 45°');
      o.p('F', 'Freno o carrera', '10×10', nt > 1 ? (nt - 1) * v.sep + 40 : 90, 1, 'Escuadra', 'Tras las soleras, anclado', 'CARRERA');
      if (nt > 1) o.p('RZ', 'Riostra entre zapatas y entre soleras', '5×10', v.sep + 20, 2 * (nt - 1), 'Escuadra', 'Los puntales metálicos no se arriostran', 'RIOSTRA', 2);
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
    acIn('D', 'Distancia del puntal vertical al pie del tornapunta', 150, { u: 'cm' }), acIn('g', 'Tablón', '7', { o: AC_TAB }), AC_EQ],
    calc(v, o) {
      const th = v.th * ACR, g = +v.g, xt = 70, cg = g / Math.cos(th);
      const Pv = v.h - cg - g - 4, yTop = v.h + xt * Math.tan(th) - cg, Lt = Math.hypot(v.D - xt, yTop - g), al = acDeg(Math.atan2(yTop - g, v.D - xt));
      const C = (30 + xt + 30) / Math.cos(th), S = 30 + v.D + 60, nb = Math.max(3, Math.ceil(Math.max(Pv, Lt) / 95) + 1);
      o.p('C', 'Cumbrera', `tablón 20×${g}`, C, 2, 'Escuadra', 'Alero de 30 cm delante del puntal vertical', 'CUMBRERA');
      o.p('PV', 'Tablón de puntal vertical', `tablón 20×${g}`, Pv, 4, `Arriba a bisel de ${acF(v.th)}° (la pendiente de la carga); medida por el lado largo`, 'Dos por sistema, embridados', 'PUNTAL V');
      o.p('PT', 'Tablón de tornapunta', `tablón 20×${g}`, Lt, 4, `Abajo a nivel (${acF(90 - al)}° fuera de escuadra); arriba ${acF(Math.abs(90 - al - v.th))}° fuera de escuadra contra la cumbrera`, `Dos por sistema; inclinación ${acF(al)}°`, 'TORNAPUNTA');
      o.p('S', 'Solera', `tablón 20×${g}`, S, 2, 'Escuadra', '30 cm delante del vertical y 60 tras el tornapunta', 'SOLERA');
      o.p('E', 'Ejión', '5×10', 60, 4, 'Escuadra', 'Tras el tornapunta en cumbrera y solera, 14 clavos', 'EJIÓN');
      o.p('R', 'Riostra', '5×10', v.D - 20, 2, 'Presentar y marcar', 'Entre puntal vertical y tornapunta, a media altura', 'RIOSTRA', 2);
      o.p('RS', 'Riostra entre sistemas', '5×10', 170, 4, 'Presentar y marcar', 'Los dos sistemas arriostrados entre sí (separación orientativa 1,2–1,5 m)', 'RIOSTRA S', 2);
      o.p('F', 'Freno o carrera', '10×10', 170, 1, 'Escuadra', 'Tras las soleras, anclado', 'CARRERA');
      o.x('Bridas', 2 * 2 * nb, `${nb} por puntal y tornapunta`); o.x('Clavos de los ejiones', 56, '', 56); acCunas(o, 6, 'Tres por sistema: dos bajo el vertical y uno tras el tornapunta');
      o.x('Estacas de 2 cm de Ø y 0,5 m', 2, 'Para la carrera');
      o.r('Puntal vertical', `${acF(Pv)} cm (por el lado largo)`); o.r('Tornapunta', `${acF(Lt)} cm a ${acF(al)}°`);
    } },

  /* ---------- Horizontales ---------- */
  horfema: { in: [acIn('D', 'Distancia de pared a pared', 200, { u: 'cm' }), acIn('H', 'Alto de las zapatas murales', 250, { u: 'cm' }), acIn('cu', 'Cuñas', '4', { o: AC_CU }),
    acIn('paso', '¿Se usa como entrada?', '', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const cu = +v.cu, nc = Math.max(2, Math.ceil(v.H / 100) - 1), esp = v.H / (nc + 1), Lc = v.D - 20 - 2 * cu;
      o.p('Z', 'Zapata mural', '10×10', v.H, 2, 'Escuadra', 'Una contra cada pared, vertical; calzos y cuñas en los huecos', 'ZAPATA MURAL');
      o.p('P', 'Puntal horizontal o codal', '10×10', Lc, nc, 'Escuadra', `Cada ${acF(esp)} cm de alto; se restan las zapatas (20) y las cuñas de los dos lados`, 'CODAL');
      o.p('TL', 'Taco en L', '5×10', 25, 2 * nc, 'Escuadra', 'Bajo cada extremo de codal (o media pletina)', 'TACO L');
      if (!v.paso) o.p('RD', 'Riostra diagonal', '5×10 o 5×15', Math.hypot(v.D - 20, esp * (nc - 1)) + 20, 2, 'Presentar y marcar', 'En cruz de San Andrés', 'RIOSTRA D', 4);
      acCunas(o, 2 * nc, 'Entre codal y zapata, en horizontal'); o.x('Clavos de los tacos', 2 * nc * 4, '', 2 * nc * 4);
      o.r('Codales', `${nc} de ${acF(Lc)} cm`);
      if (Lc > 240) o.a('bad', 'El codal pasa de 2,4 m: haz un lateral de triángulo.');
    } },
  hortablon: { in: [acIn('D', 'Distancia de pared a pared', 260, { u: 'cm' }), acIn('H', 'Alto de las zapatas murales', 280, { u: 'cm' }), acIn('ang', 'Ángulo de tornapuntas y jabalcones', '45', { o: AC_ANG.slice(1) }),
    acIn('r', 'Distancia de la zapata al pie del jabalcón en el codal', 60, { u: 'cm' }), acIn('g', 'Tablón', '7', { o: AC_TAB }), AC_EQ],
    calc(v, o) {
      const g = +v.g, a = +v.ang * ACR, ej = +v.ang === 60 ? 75 : 60, Lc = v.D - 2 * g - 8, Lj = v.r / Math.cos(a), nb = Math.max(3, Math.ceil(Lc / 95) + 1);
      o.p('Z', 'Zapata mural', `tablón 20×${g}`, v.H, 2, 'Escuadra', 'Un tablón vertical a cada lado', 'ZAPATA MURAL');
      o.p('P', 'Tablón de codal', `tablón 20×${g}`, Lc, 2, 'Escuadra', 'Dos tablones embridados; se restan las zapatas y 4 cm de cuñas a cada lado', 'CODAL');
      o.p('J', 'Tornapunta / jabalcón', `tablón 20×${g}`, Lj, 4, `Los dos extremos a ${v.ang}° (${90 - v.ang}° fuera de escuadra)`, 'Dos arriba y dos abajo, apoyados en ejiones', 'JABALCÓN');
      o.p('E', 'Ejión', '5×10', ej, 8, 'Escuadra', `Cuatro en las zapatas y cuatro en el codal, ${ej === 75 ? 20 : 14} clavos`, 'EJIÓN');
      o.x('Bridas', nb, 'En el codal'); acCunas(o, 6, 'Cuatro para jabalcones y tornapuntas y dos para los tablones del codal');
      o.x('Clavos de los ejiones', 8 * (ej === 75 ? 20 : 14), '', 8 * (ej === 75 ? 20 : 14));
      o.r('Codal', `2 tablones de ${acF(Lc)} cm`); o.r('Jabalcones', `4 de ${acF(Lj)} cm`);
      if (Lc > 240) o.a('warn', 'Codal de más de 2,4 m: valóralo con el especialista o haz un lateral.');
    } },
  horpuntales: { in: [acIn('D', 'Distancia de pared a pared', 200, { u: 'cm' }), acIn('H', 'Alto de las zapatas murales', 280, { u: 'cm' }),
    acIn('tipo', 'Puntales', 'obra', { o: [['obra', 'De obra'], ['holm', 'HOLMATRO']] }), acIn('cab', 'HOLMATRO: alto de los dos cabezales juntos', 0, { u: 'cm' }), acIn('mod', 'HOLMATRO: puntal', 'ml', { o: AC_HOLM.map(h => [h[0], h[1]]) }), AC_EQ],
    calc(v, o) {
      const n = Math.max(2, Math.ceil(v.H / 100) - 1), L = v.D - 20;
      o.p('Z', 'Zapata mural', '10×10', v.H, 2, 'Escuadra', 'En la pared sana y en la dañada', 'ZAPATA MURAL');
      if (v.tipo === 'holm') acHolmPuntal(L - +v.cab, v.mod, n, o); else o.x('Puntal de obra', n, `De ${acF(L)} cm entre placas`);
      o.r('Puntales', `${n}, a la misma altura en las dos zapatas, cada ${acF(v.H / (n + 1))} cm`);
      if (L > 240) o.a('bad', 'Más de 2,4 m entre muros: haz un lateral de triángulo.');
    } },

  /* ---------- Puertas y ventanas ---------- */
  hueco: { in: [acIn('A', 'Ancho del hueco', 100, { u: 'cm' }), acIn('Hh', 'Alto del hueco', 210, { u: 'cm' }), acIn('cu', 'Cuñas', '4', { o: AC_CU }), acIn('paso', '¿Es un paso?', '1', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const cu = +v.cu, L = v.A - cu, P = v.Hh - 20 - cu;
      o.p('S', 'Solera', '10×10', L, 1, 'Escuadra', 'Cuñas en un extremo', 'SOLERA');
      o.p('C', 'Cumbrera', '10×10', L, 1, 'Escuadra', 'Cuñas en el extremo contrario al de la solera', 'CUMBRERA');
      o.p('P', 'Puntal', '10×10', P, 2, 'Escuadra', 'Contra los laterales; el primero bajo las cuñas de la cumbrera', 'PUNTAL');
      o.p('T', 'Taco', '10×10', 15, 2, 'Escuadra', 'Encierran las cuñas: 3 clavos al puntal y 2 a la solera', 'TACO');
      if (!v.paso) o.p('RD', 'Riostra diagonal', '5×10', Math.hypot(L - 20, P) + 10, 2, 'Presentar y marcar', 'En X, una por cara', 'RIOSTRA D', 2);
      acPletinas(o, 0, 2); acCunas(o, 4, 'Una en solera, una en cumbrera y una bajo cada puntal'); o.x('Clavos de los tacos', 10, '', 10);
      o.r('Puntales', `2 de ${acF(P)} cm`); o.r('Solera y cumbrera', `${acF(L)} cm`);
    } },
  huecoprefab: { in: [acIn('A', 'Ancho de los huecos', 100, { u: 'cm' }), acIn('Hh', 'Alto de los huecos', 210, { u: 'cm' }), acIn('nh', 'Número de huecos iguales', 1), acIn('paso', '¿Son pasos?', '1', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const nh = Math.max(1, Math.round(v.nh)), L = v.A - 4, P = v.Hh - 4 - 20;
      o.p('S', 'Solera', '10×10', L, nh, 'Escuadra', 'Cuadro 4 cm menor que el hueco', 'SOLERA');
      o.p('C', 'Cumbrera', '10×10', L, nh, 'Escuadra', 'Igual que la solera', 'CUMBRERA');
      o.p('P', 'Puntal', '10×10', P, 2 * nh, 'Escuadra', 'Entre solera y cumbrera', 'PUNTAL');
      if (!v.paso) o.p('RD', 'Riostra diagonal', '5×10', Math.hypot(L - 20, P) + 10, 2 * nh, 'Presentar y marcar', 'En X', 'RIOSTRA D', 2);
      acPletinas(o, 0, 0, 8 * nh); acCunas(o, 2 * nh, 'Para ajustar cada cuadro al hueco');
      o.r('Cuadro', `${acF(L)} × ${acF(v.Hh - 4)} cm`);
    } },
  recercado: { in: [acIn('A', 'Ancho del hueco', 90, { u: 'cm' }), acIn('Hh', 'Alto del hueco', 210, { u: 'cm' }), acIn('g', 'Tablón', '7', { o: AC_TAB }),
    acIn('ref', 'Refuerzo', 'aspa', { o: [['', 'Solo recercado'], ['h', 'Puntal intermedio horizontal'], ['v', 'Puntal intermedio vertical'], ['aspa', 'Aspa (cruz de San Andrés)']] }), AC_EQ],
    calc(v, o) {
      const g = +v.g, Lh = v.A - 4, J = v.Hh - 2 * g - 4, iw = v.A - 2 * g, ih = v.Hh - 2 * g;
      o.p('CP', 'Cabecero y peana', `tablón 20×${g}`, Lh, 2, 'Escuadra', 'Arriba y abajo, con cuñas', 'CABECERO/PEANA');
      o.p('J', 'Jamba o montante', `tablón 20×${g}`, J, 2, 'Escuadra', 'A los lados, entre cabecero y peana', 'JAMBA');
      if (v.ref === 'h') o.p('PI', 'Puntal intermedio horizontal', `tablón 20×${g}`, iw - 4, 1, 'Escuadra', 'Entre jambas, con cuñas', 'PUNTAL H');
      if (v.ref === 'v') o.p('PI', 'Puntal intermedio vertical', `tablón 20×${g}`, ih - 4, 1, 'Escuadra', 'Entre cabecero y peana, con cuñas', 'PUNTAL V');
      if (v.ref === 'aspa') { const an = acDeg(Math.atan2(ih, iw)); o.p('X', 'Tablón del aspa', `tablón 20×${g}`, Math.hypot(iw, ih) + 20, 2, `Encuentros a ${acF(an)}° y ${acF(90 - an)}° para encajar en las esquinas (presentar y marcar)`, 'Entre esquinas opuestas', 'ASPA'); }
      acCunas(o, 2 + (v.ref === 'h' || v.ref === 'v' ? 1 : 0), 'Para ajustar el recercado');
      o.r('Recercado', `cabecero y peana de ${acF(Lh)} cm, jambas de ${acF(J)} cm`);
    } },
  huecopuntales: { in: [acIn('A', 'Ancho del hueco', 100, { u: 'cm' }), acIn('Hh', 'Alto del hueco', 210, { u: 'cm' }), acIn('tipo', 'Puntales', 'obra', { o: [['obra', 'De obra'], ['holm', 'HOLMATRO']] }),
    acIn('cab', 'HOLMATRO: alto de los dos cabezales juntos', 0, { u: 'cm' }), acIn('mod', 'HOLMATRO: puntal', 'ml', { o: AC_HOLM.map(h => [h[0], h[1]]) }), acIn('paso', '¿Es un paso?', '1', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const L = v.Hh - 20;
      o.p('C', 'Cumbrera', '10×10', v.A, 1, 'Escuadra', 'Deja 10 cm entre cada puntal y el extremo', 'CUMBRERA');
      o.p('S', 'Solera', '10×10', v.A, 1, 'Escuadra', 'Igual que la cumbrera', 'SOLERA');
      if (!v.paso) o.p('RD', 'Riostra en X', '5×10', Math.hypot(v.A - 10, L) + 10, 2, 'Presentar y marcar', 'De solera a cumbrera', 'RIOSTRA X', 2);
      if (v.tipo === 'holm') acHolmPuntal(L - +v.cab, v.mod, 2, o); else o.x('Puntal de obra', 2, `De ${acF(L)} cm entre placas`);
      o.r('Puntales', `2 de ${acF(L)} cm`);
    } },

  /* ---------- Especiales ---------- */
  percha: { in: [acIn('Wv', 'Ancho del vano del balcón', 90, { u: 'cm' }), acIn('Hd', 'Altura del suelo al dintel', 210, { u: 'cm' }), acIn('Ht', 'Altura del suelo al techo, dentro', 280, { u: 'cm' }),
    acIn('V', 'Vuelo del balcón', 100, { u: 'cm' }), acIn('B', 'Ancho del balcón', 150, { u: 'cm' }), acIn('e', 'Grueso del muro', 25, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const P = v.Hd - 10 - 10 - 4, Lpe = v.V + 20 + v.e + v.V, Pc = v.Ht - 10 - v.Hd - 4;
      o.p('S', 'Solera', '10×10', v.Wv, 1, 'Escuadra', 'Ajustada al vano', 'SOLERA');
      o.p('P', 'Puntal', '10×10', P, 1, 'Escuadra', 'Vertical, de la solera a la percha (con cuñas)', 'PUNTAL');
      o.p('PE', 'Percha', '10×10 o 15×15', Lpe, 1, 'Escuadra', `Transversal: ${acF(v.V + 20)} cm fuera (hasta pasar el borde) y ${acF(v.V)} cm dentro`, 'PERCHA');
      o.p('C', 'Cumbrera', '10×10', v.V, 1, 'Escuadra', 'Contra el techo, sobre el brazo interior de la percha', 'CUMBRERA');
      o.p('PC', 'Puntal corto', '10×10', Pc, 2, 'Escuadra', 'De la percha a la cumbrera', 'PUNTAL CORTO');
      o.p('VB', 'Viga bajo el balcón', '10×10 o 15×15', v.B + 20, 1, 'Escuadra', 'Transversal, bajo el balcón', 'VIGA BALCÓN');
      o.x('Cables, cuerdas o eslingas', 2, `De la punta de la percha a la viga: unos ${acF(v.Hd + 60)} cm cada uno`);
      acPletinas(o, 0, 6); acCunas(o, 3);
      o.a('warn', 'Medidas orientativas: el brazo interior se ha tomado igual al vuelo. Compruébalo con el especialista; si el balcón es grande o pesado, dos o más perchas.');
    } },
  voladizoinf: { in: [acIn('Ht', 'Altura del piso de abajo (suelo a forjado)', 270, { u: 'cm' }), acIn('V', 'Vuelo del voladizo', 120, { u: 'cm' }), acIn('sep', 'Separación de los puntales del apeo vertical', 100, { u: 'cm' }),
    acIn('dI', 'Distancia del apeo vertical a la fachada', 30, { u: 'cm' }), acIn('e', 'Grueso del muro', 25, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const P = v.Ht - 24, dx = v.dI + v.sep + 30 + v.e + (2 * v.V) / 3, dy = v.Ht - 20, Li = Math.hypot(dx, dy), al = acDeg(Math.atan2(dy, dx));
      o.p('AV', 'Puntal del apeo vertical', '10×10', P, 2, 'Escuadra', 'Dentro, bajo el forjado', 'PUNTAL V');
      o.p('AC', 'Cumbrera y solera del apeo', '10×10', v.sep + 60, 2, 'Escuadra', 'Voladizo de 30 cm', 'CUMBRERA/SOLERA');
      o.p('AR', 'Riostras del apeo', '5×10', Math.hypot(v.sep, P / 2) + 10, 3, 'Presentar y marcar', 'Una horizontal y dos diagonales', 'RIOSTRA');
      o.p('PI', 'Puntal inclinado', '10×10', Li, 2, `Abajo ${acF(90 - al)}° fuera de escuadra (a nivel); arriba ${acF(90 - al)}° (a nivel contra la cumbrera)`, `Par de puntales, ${acF(al)}°, hasta 2/3 del vuelo`, 'PUNTAL INCL.');
      o.p('CV', 'Cumbrera bajo el voladizo', '10×10', 90, 1, 'Escuadra', 'Recoge la carga', 'CUMBRERA VOL.');
      o.p('E', 'Ejión', '5×10', 60, 4, 'Escuadra', 'Arriba y abajo de los inclinados', 'EJIÓN');
      o.p('F', 'Freno o carrera', '10×10', 90, 1, 'Escuadra', 'Unido al apeo vertical', 'CARRERA');
      acPletinas(o, 4, 4); acCunas(o, 4);
      o.a('warn', 'Comprueba que el puntal inclinado pasa por el hueco de la fachada; medidas orientativas.');
    } },
  asnillas: { in: [acIn('H', 'Altura del suelo a la carga', 250, { u: 'cm' }), acIn('S', 'Separación entre los pies de las tornapuntas', 200, { u: 'cm' }),
    acIn('sepA', 'Separación entre las dos parejas', 120, { u: 'cm' }), acIn('nt', 'Tablones por pieza', '2', { o: [['2', '2'], ['3', '3']] }), acIn('tir', 'Contrarresto', 'tir', { o: [['tir', 'Tirante metálico'], ['ej', 'Ejiones en el durmiente']] }), AC_EQ],
    calc(v, o) {
      const nt = +v.nt, hT = v.H - 7 - 3 * 7, dx = v.S / 2 - 10, Lt = Math.hypot(dx, hT), al = acDeg(Math.atan2(hT, dx));
      o.p('T', 'Tablón de tornapunta', 'tablón 20×7', Lt, 4 * nt, `Abajo a nivel (${acF(90 - al)}° fuera de escuadra); cabeza embarbillada contra la aguja`, `Dos parejas contrapuestas, ${acF(al)}°`, 'TORNAPUNTA');
      o.p('A', 'Tablón de aguja o marrano', 'tablón 20×7', v.S * .9, nt, 'Escuadra', 'Recoge la carga en la cabeza', 'AGUJA');
      o.p('D', 'Durmiente', 'tablón 20×7', v.S + 60, 2, 'Escuadra', 'Bajo cada pareja', 'DURMIENTE');
      o.p('R', 'Riostra transversal', 'tabloncillo', Math.hypot(v.sepA, hT * .6) + 10, 2, 'Presentar y marcar', 'En X entre las dos parejas', 'RIOSTRA');
      if (v.tir === 'ej') o.p('E', 'Ejión', '5×10', 60, 4, 'Escuadra', 'En el durmiente, tras cada pie', 'EJIÓN');
      else o.x('Tirante metálico', 2, `Uniendo los pies de cada pareja: unos ${acF(v.S)} cm`);
      o.x('Bridas', 2, 'En la cabeza, contra el giro de la aguja');
    } },
  puente: { in: [acIn('L', 'Luz entre pies derechos (ejes)', 250, { u: 'cm' }), acIn('H', 'Altura del suelo a la cara de abajo del puente', 270, { u: 'cm' }),
    acIn('nt', 'Tablones por pieza', '3', { o: [['2', '2'], ['3', '3']] }), acIn('jab', '¿Con jabalcones?', '', { o: AC_SN }), AC_EQ],
    calc(v, o) {
      const nt = +v.nt, Pd = v.H - 7 - 4;
      o.p('PU', 'Tablón del puente (de canto)', 'tablón 20×7', v.L + 60, nt, 'Escuadra', 'Vuelo de 30 cm sobre cada pie derecho (o perfil IPN/HEB)', 'PUENTE');
      o.p('PD', 'Tablón de pie derecho', 'tablón 20×7', Pd, 2 * nt, 'Escuadra', 'Dos pies derechos, con cuñas', 'PIE DERECHO');
      o.p('O', 'Oreja', 'tablón 20×7', 20 + 80, 4, 'Escuadra', '40 cm por encima y por debajo del puente: no escatimar', 'OREJA');
      o.p('D', 'Durmiente', 'tablón 20×7', 80, 2, 'Escuadra', 'Según la carga', 'DURMIENTE');
      if (v.jab) { const lj = 70 * Math.SQRT2; o.p('J', 'Jabalcón', 'tablón 20×7', lj, 2, 'Los dos extremos a 45°', 'Del pie derecho al puente', 'JABALCÓN'); o.x('Tirante metálico', 1, `Entre los pies derechos: unos ${acF(v.L)} cm`); }
      o.x('Bridas de atado', 8, 'Lo más cerca posible de las caras de arriba y de abajo del puente'); acCunas(o, 2, 'Bajo los pies derechos');
      o.a('info', 'Arriostrar los pies derechos en las dos direcciones si se puede.');
    } },

  /* ---------- Patrimonio ---------- */
  columna: { in: [acIn('D', 'Diámetro (o lado mayor) de la columna', 60, { u: 'cm' }), acIn('H', 'Altura de solera a cumbrera', 300, { u: 'cm' }),
    acIn('sec', 'Maderos', '10', { o: [['10', '10×10'], ['20', 'Tablón 20×7']] }), acIn('ses', 'Separación entre eslingas (según el daño)', 60, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const t = v.sec === '20' ? 7 : 10, n = Math.max(4, Math.round(Math.PI * (v.D + t) / 25)), L = v.H - 20, ne = Math.ceil(L / v.ses) + 1, le = Math.PI * (v.D + 2 * t) + 60;
      o.p('M', 'Madero vertical', v.sec === '20' ? 'tablón 20×7' : '10×10', L, n, 'Escuadra', 'Repartidos alrededor de la columna', 'MADERO');
      o.p('S', 'Solera (base)', '10×10', v.D + 40, 2, 'Escuadra', 'Dos piezas, una a cada lado', 'SOLERA');
      o.p('C', 'Cumbrera cuajada', '10×10', v.D + 40, 2, 'Escuadra', 'Dos piezas, una a cada lado', 'CUMBRERA');
      o.x('Eslingas o cintas tensoras con trinquete', ne, `De unos ${acF(le)} cm, cada ${acF(v.ses)} cm`);
      o.r('Maderos', `${n} de ${acF(L)} cm`);
      o.a('warn', 'Número y separación de cintas según el grado de daño y las tablas 1 y 2 del M8 (cintas de 5 o 7,5 cm). No vale para hormigón armado.');
    } },
  fachada: { in: [acIn('e', 'Espesor del muro', 50, { u: 'cm' }), acIn('Al', 'Alto a revestir', 250, { u: 'cm' }), acIn('An', 'Ancho a revestir', 300, { u: 'cm' }), acIn('sb', 'Separación entre barras', 100, { u: 'cm' }), AC_EQ],
    calc(v, o) {
      const fil = Math.max(2, Math.ceil(v.Al / v.sb) + 1), col = Math.max(2, Math.ceil(v.An / v.sb) + 1), nb = fil * col, diam = v.e < 50 ? 6 : 8, Lb = v.e + 50, nt = Math.ceil(v.An / 20);
      o.p('T', 'Tablón del encofrado', 'tablón 20×7', v.Al, 2 * nt, 'Escuadra', 'En vertical, por las dos caras', 'ENCOFRADO');
      o.p('L', 'Larguero', '10×10', v.An, 2 * fil, 'Escuadra', 'En horizontal sobre los tablones, a la altura de cada fila de barras', 'LARGUERO');
      o.x(`Barra de acero de Ø ${diam} mm (mínimo)`, nb, `De unos ${acF(Lb)} cm: ${fil} filas × ${col} columnas`);
      o.x('Placas y tuercas', 2 * nb, 'Se tensa desde el lado con mejor escape');
      if (v.e > 80) o.a('bad', 'Más de 80 cm: pasa del largo de las brocas.');
      o.a('warn', 'Solo con autorización de la autoridad que tutela el bien. No en muros muy inestables. Apuntalar antes los forjados que cargan en el muro.');
    } }
};

/* ---------- Cálculos compartidos ---------- */
function acHoriz(o, L, q, n) {
  const tr = Math.ceil(L / 225);
  o.p('RH', n, '5×10', tr > 1 ? L / tr + 15 : L, q * tr, 'Escuadra', tr > 1 ? `En ${tr} tramos empalmados sobre un puntal (máx. 2,25 m por tramo)` : 'De lado a lado', 'RIOSTRA H', 2);
}
// Sistema vertical de dos puntales (veces: 1, o 2 para la torre). Devuelve el largo del puntal.
function acDos(v, o, veces) {
  const P = v.H - 20 - +v.cu, L = v.sep + 60, hP = v.H - 20, nh = v.H > 335 ? 2 : 1;
  o.p('C', 'Cumbrera', '10×10', L, veces, 'Escuadra', 'Voladizo de 30 cm a cada lado', 'CUMBRERA');
  o.p('P', 'Puntal', '10×10', P, 2 * veces, 'Escuadra', `Separados ${acF(v.sep)} cm entre ejes`, 'PUNTAL');
  o.p('S', 'Solera', '10×10', L, veces, 'Escuadra', '60 cm más larga que la separación', 'SOLERA');
  o.p('RH', 'Riostra horizontal', '5×10', v.sep + 10, nh * veces, 'Escuadra', nh === 2 ? 'Dos, a 1/3 y 2/3 de la altura' : 'A media altura', 'RIOSTRA H', 2);
  o.p('RD', 'Riostra diagonal', '5×10', Math.hypot(v.sep, hP / (nh + 1)) + 10, (nh + 1) * veces, 'Presentar y marcar', 'Entre los puntales, en zigzag', 'RIOSTRA D', 2);
  acPletinas(o, 0, 4 * veces); acCunas(o, 2 * veces);
  o.r('Puntales', `${2 * veces} de ${acF(P)} cm`);
  if (veces === 1) { o.r('Carga (10×10)', v.H <= 240 ? '7.200 kg' : v.H <= 300 ? '4.500 kg' : v.H <= 360 ? '3.100 kg' : '—');
    if (v.H > 360) o.a('bad', 'Pasa de 3,6 m: solo como parte de una torre.'); }
  if (v.sep < 90 || v.sep > 120) o.a('bad', 'Los puntales, entre 90 y 120 cm entre ejes.');
  return P;
}
// Laterales de triángulo (solera fija con 10×10 o con tablón)
function acLateral(v, o, kind) {
  const ang = +v.ang, a = ang * ACR, ej = ang === 60 ? 75 : 60, cl = ang === 60 ? 20 : 14, nt = Math.max(1, Math.round(v.nt)), tab = kind === 'tablon', g = +v.g || 7;
  const Ls = v.I / Math.tan(a), Lp = v.I / Math.sin(a), sec = tab ? `tablón 20×${g}` : '10×10';
  const corte = ang === 45 ? 'Encuentros a 45°: diagonal desde 10 cm de la esquina y tope perpendicular de 4 cm' : ang === 60 ? 'Encuentros a 60°: diagonal desde 17 cm del lateral y tope perpendicular de 4 cm' : 'Encuentros a 30°: como a 60° pero con arriba y abajo cambiados';
  o.p('Z', 'Zapata mural', sec, v.I + ej, nt, 'Escuadra', `Inserción a ${acF(v.I)} cm + ${ej} del ejión`, 'ZAPATA MURAL');
  o.p('S', 'Solera', sec, Ls + ej, nt, 'Escuadra', `${acF(Ls)} cm hasta el puntal + ${ej} del ejión`, 'SOLERA');
  if (tab) o.p('P', 'Tablón de tornapunta', sec, Lp, 2 * nt, corte, 'Dos tablones embridados por sistema; medida de vértice a vértice', 'TORNAPUNTA');
  else o.p('P', 'Puntal', '10×10', Lp, nt, corte, 'Medida de vértice a vértice (inserción en zapata y solera); presentar antes de cortar', 'PUNTAL');
  o.p('E', 'Ejión', '5×10', ej, 2 * nt, 'Escuadra', `Uno sobre el puntal en la zapata y otro de tope en la solera, ${cl} clavos`, 'EJIÓN');
  if (!tab) o.p('RC', 'Riostra central', '5×15', Lp / 2 + 10, 2 * nt, 'Presentar y marcar', 'De la esquina zapata–solera al centro del puntal, a cada lado', 'RIOSTRA C', 2);
  if (nt > 1) {
    const filas = 2 + (v.I > 240 ? 1 : 0);
    o.p('RH', 'Riostra horizontal entre sistemas', '5×10', v.sep + 20, filas * (nt - 1), 'Escuadra', `Arriba y abajo de los puntales${filas === 3 ? ' y una intermedia (inserción > 2,4 m)' : ''}`, 'RIOSTRA H', 2);
    o.p('RD', 'Riostra diagonal entre sistemas', '5×10', Math.hypot(v.sep, Lp * .7) + 10, 2 * (nt - 1), 'Presentar y marcar', 'En cruz de San Andrés', 'RIOSTRA D', 2);
  }
  o.p('F', 'Freno o carrera', '10×10', nt > 1 ? (nt - 1) * v.sep + 40 : 90, 1, 'Escuadra', 'Tras las soleras, con hueco para cuñas de 5×10', 'CARRERA');
  if (tab) { o.x('Bridas', 3 * nt, 'Tres por tornapunta'); o.x('Cuña clavada en la esquina zapata–solera', nt, ''); }
  else acPletinas(o, 6 * nt, 0);
  acCunas(o, 2 * nt, 'Una entre puntal y ejión de tope y otra entre solera y carrera por sistema');
  o.x('Clavos de los ejiones', 2 * nt * cl, '', 2 * nt * cl);
  o.x('Barras de anclaje de 2 cm de Ø y 1,5 m', 2 * nt, 'En hormigón, con martillo perforador');
  o.r(tab ? 'Tornapunta' : 'Puntal (de vértice a vértice)', `${acF(Lp)} cm`);
  o.r('Solera', `${acF(Ls + ej)} cm (${acF(Ls)} cm + ${ej} del ejión)`);
  o.r('Zapata mural', `${acF(v.I + ej)} cm (${acF(v.I)} cm + ${ej} del ejión)`);
  o.r('Ejiones 5×10', `${ej} cm con ${cl} clavos`);
  if (nt < 2) o.a('bad', 'Como mínimo dos sistemas arriostrados entre sí.');
  if (v.sep > 240) o.a('bad', 'Más de 2,4 m entre triángulos.');
  o.a('info', 'El punto de inserción, a la altura del forjado o hasta 60 cm por debajo, nunca por encima.');
}
// Inclinados perpendiculares a la carga o al suelo (dos sistemas iguales arriostrados entre sí)
function acIncl(v, o, kind) {
  const th = v.th * ACR, n = Math.max(2, Math.round(v.n)), cs = Math.cos(th), sn = Math.sin(th), tops = [], lens = [];
  if (kind === 'carga') {
    for (let i = 0; i < n; i++) { const d = i * v.sep, y = v.h + d * sn, x = d * cs; const L = (y - 10 * cs - 10) / cs; lens.push(L); tops.push([x + 10 * sn, y - 10 * cs, x + 10 * sn + L * sn]); }
    lens.forEach((L, i) => o.p(`P${i + 1}`, `Puntal ${i + 1}`, '10×10', L, 2, `Arriba escuadra (90° con la carga); abajo ${acF(v.th)}° fuera de escuadra (apoya a nivel)`, i ? `A ${acF(i * v.sep)} cm del primero, medidos a lo largo de la carga` : 'El más bajo', `PUNTAL ${i + 1}`));
    const span = tops[n - 1][2] - tops[0][2];
    o.p('C', 'Cumbrera', '10×10', (n - 1) * v.sep + 60, 2, 'Escuadra', 'Voladizo de 30 cm como máximo', 'CUMBRERA');
    o.p('S', 'Solera', '10×10', span + 100, 2, 'Escuadra', 'Sobresale 60 cm por el lado de los ejiones', 'SOLERA');
    o.p('E', 'Ejión', '5×10', 45, 2 * n, 'Escuadra', 'Tras cada pie de puntal, 14 clavos', 'EJIÓN');
    o.p('RD', 'Riostra diagonal', '5×10', Math.hypot(span + (lens[n - 1] - lens[0]) * sn + 20, lens[n - 1] * cs) + 20, 2, 'Presentar y marcar', 'Une solera, pie y cabeza de los puntales y cumbrera', 'RIOSTRA D', 4);
  } else {
    for (let i = 0; i < n; i++) { const x = i * v.sep; lens.push(v.h + x * Math.tan(th) - 10 / cs - 10); }
    lens.forEach((L, i) => o.p(`P${i + 1}`, `Puntal ${i + 1}`, '10×10', L, 2, `Abajo escuadra; arriba bisel de ${acF(v.th)}° (la pendiente de la carga), medido por el lado largo`, i ? `A ${acF(i * v.sep)} cm del primero` : 'El más bajo', `PUNTAL ${i + 1}`));
    o.p('C', 'Cumbrera', '10×10', (n - 1) * v.sep / cs + 10 / cs + 90, 2, 'Escuadra', 'Voladizo de 30 cm abajo y 60 cm arriba', 'CUMBRERA');
    o.p('S', 'Solera', '10×10', (n - 1) * v.sep + 70, 2, 'Escuadra', '30 cm a cada lado de los puntales', 'SOLERA');
    o.p('E', 'Ejión', '5×10', 45, 2 * n, 'Escuadra', 'En la cumbrera, tras cada puntal', 'EJIÓN');
    o.p('RD', 'Riostra diagonal', '5×10', Math.hypot((n - 1) * v.sep + 20, lens[n - 1]) + 20, 2, 'Presentar y marcar', 'Une solera, puntales y cumbrera', 'RIOSTRA D', 4);
  }
  const hm = Math.max(...lens), zeta = hm < 120;
  o.p('RS', 'Riostra entre sistemas', '5×10', Math.hypot(v.sepS, hm * .8) + 10, (zeta ? 1 : 2) * n, 'Presentar y marcar', zeta ? 'En Z (menos de 1,2 m)' : 'En X', 'RIOSTRA S', 2);
  o.p('RH', 'Riostra horizontal entre sistemas', '5×10', v.sepS + 20, 2 * n, 'Escuadra', 'Arriba y abajo de cada pareja de puntales', 'RIOSTRA H', 2);
  o.p('F', 'Freno o carrera', '10×10', v.sepS + 40, 1, 'Escuadra', 'Tras las soleras, con hueco para cuñas', 'CARRERA');
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
function acHolm(v, o, n, cmax) {
  const C = cmax || 90, L = v.H - 20 - +v.cab;
  o.p('C', 'Cumbrera', '10×10', C, 1, 'Escuadra', 'Cabezal soporte de viga clavado centrado', 'CUMBRERA');
  o.p('S', 'Solera', '10×10', C, 1, 'Escuadra', 'Cabezal giratorio o base triple', 'SOLERA');
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
  return out;
};
function apuSetIn(id, k, val) { setPref({ apuIn: { ...(prefs.apuIn || {}), [id]: { ...(prefs.apuIn?.[id] || {}), [k]: val } } }); }
function apuDone(id, code, on) { setPref({ apuDone: { ...(prefs.apuDone || {}), [id]: { ...(prefs.apuDone?.[id] || {}), [code]: on } } }); }
function apuDoneReset(id) { setPref({ apuDone: { ...(prefs.apuDone || {}), [id]: {} } }); }

function apuCortes(id) {
  const d = APU_CORTES[id], v = apuIn(id), r = { pz: [], ex: [], av: [], rs: [], clavos: 0 };
  const o = {
    p: (c, n, s, l, q, cut, d, corto, uniones = 0) => { if (!(q > 0) || !Number.isFinite(l)) return; r.pz.push({ c, n, s, l: Math.round(l), q, cut, d, corto }); if (uniones) r.clavos += uniones * 5 * q; },
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
    : `<label class="lbl">${esc(f.l)}${f.u ? ` (${f.u})` : ''}<input class="input" ${f.t === 'text' ? 'type="text"' : 'type="number" inputmode="decimal"'} value="${esc(v[f.k])}" onchange="apuSetIn('${t.id}', '${f.k}', this.value)"></label>`;
  const eq = v.eq ? ` · ${v.eq}` : '';
  const pend = r.pz.filter(p => !done[p.c]).reduce((s, p) => s + p.q, 0);
  return `
    <div class="panel apu-calc">
      <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic('calc')} Medidas y cortes</h3>${r.pz.length ? `<span class="tag ${pend ? 'info' : 'ok'}">${pend ? `${pend} por cortar` : 'Todo cortado'}</span>` : ''}</div>
      <div class="grid g2">${d.in.map(field).join('')}</div>
      ${r.err ? `<p class="muted" style="margin-top:10px">${esc(r.err)}</p>` : `
      ${r.rs.length ? `<dl class="dl apu-dl" style="margin-top:12px">${r.rs.map(([k, val]) => `<dt>${esc(k)}</dt><dd><b>${esc(val)}</b></dd>`).join('')}</dl>` : ''}
      ${r.av.map(([c, txt]) => `<div class="callout ${c === 'bad' ? 'bad' : c === 'warn' ? 'warn' : 'info'}" style="margin-top:8px"><p>${ic(c === 'info' ? 'book' : 'alert', 'i-sm')} ${esc(txt)}</p></div>`).join('')}
      ${r.pz.length ? `<h4 class="arc-fam">Lista de cortes</h4>
      <div class="list">${r.pz.map(p => `<label class="item arc-cut ${done[p.c] ? 'done' : ''}"><input type="checkbox" ${done[p.c] ? 'checked' : ''} onchange="apuDone('${t.id}', '${esc(p.c)}', this.checked)">
        <div class="grow"><div class="arc-cut-head"><span class="arc-code">${esc(p.c)}</span><b>${esc(p.n)}</b><span class="arc-len">${p.q} × ${p.l} cm</span></div>
          <small>${esc(p.s)} · ${esc(p.d)}</small><small class="arc-cut-how">${esc(p.cut)}</small>
          <span class="arc-label">${esc(p.corto)} ${p.l} cm${esc(eq)}</span></div></label>`).join('')}</div>` : ''}
      ${r.ex.length || r.clavos ? `<h4 class="arc-fam">Además</h4><div class="list">${r.ex.map(x => `<div class="item arc-extra"><div class="grow"><b>${esc(x.n)}</b>${x.d ? `<small>${esc(x.d)}</small>` : ''}</div><span class="arc-num"><b>${x.q}</b></span></div>`).join('')}
        ${r.clavos ? `<div class="item arc-extra"><div class="grow"><b>Clavos (aprox.)</b><small>Pletinas, ejiones, tacos y unos 5 por unión de riostra; lleva de sobra</small></div><span class="arc-num"><b>${Math.ceil(r.clavos * 1.2 / 10) * 10}</b></span></div>` : ''}</div>` : ''}
      ${r.pz.length ? `<h4 class="arc-fam">Madera</h4>
        <label class="lbl" style="max-width:260px">Largo de vuestras barras (cm)<input class="input" type="number" value="${stock}" onchange="setPref({ apuStock: this.value })"></label>
        <div class="list" style="margin-top:8px">${apuBarras(r.pz, stock).map(b => `<div class="item arc-extra"><div class="grow"><b>${esc(b.s)}</b><small>${acF(b.metros, 1)} m en total${b.largas.length ? ` · ${b.largas.length} pieza(s) más larga(s) que la barra: pedir más larga o empalmar si es riostra` : ''}</small></div><span class="arc-num"><b>${b.barras}</b> barras</span></div>`).join('')}</div>
        <div class="row" style="margin-top:12px"><button class="btn btn-g" onclick="shareText(apuCortesText('${t.id}'), 'Cortes')">${ic('chat')} Enviar los cortes</button>
          <button class="btn btn-g" onclick="apuPrint('${t.id}')">${ic('printer')} Hoja de corte</button>
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
  $('print').innerHTML = `<h1>Hoja de corte · ${esc(t.name)}${v.eq ? ' · ' + esc(v.eq) : ''}</h1>
    <p>${APU_CORTES[id].in.filter(f => f.k !== 'eq').map(f => `${esc(f.l)}: <b>${esc(f.o ? (f.o.find(o => String(o[0]) === String(v[f.k]))?.[1] || '') : v[f.k] + (f.u ? ' ' + f.u : ''))}</b>`).join(' · ')}</p>
    <table><tr><th></th><th>Código</th><th>Pieza</th><th>Sección</th><th>Largo</th><th>Cant.</th><th>Corte</th><th>Rótulo</th></tr>
    ${r.pz.map(p => `<tr><td>☐</td><td><b>${esc(p.c)}</b></td><td>${esc(p.n)}</td><td>${esc(p.s)}</td><td>${p.l} cm</td><td>${p.q}</td><td>${esc(p.cut)}</td><td>${esc(p.corto)} ${p.l} cm${v.eq ? ' · ' + esc(v.eq) : ''}</td></tr>`).join('')}</table>
    <h2>Además</h2><ul>${r.ex.map(x => `<li>${x.q} × ${esc(x.n)}${x.d ? ' — ' + esc(x.d) : ''}</li>`).join('')}</ul>
    ${r.av.length ? `<h2>Avisos</h2><ul>${r.av.map(([, txt]) => `<li>${esc(txt)}</li>`).join('')}</ul>` : ''}`;
  print();
}
