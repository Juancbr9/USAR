'use strict';
// USAR 242 · Apuntalamientos: todos los tipos de los temas de la UME (M6 «Apuntalamientos» y M8 «Técnicas específicas»),
// cada uno con su dibujo a escala (piezas numeradas con el nombre del manual), cuándo se usa, datos clave y montaje.
// El apuntalamiento de arcos tiene además su calculadora de cortes (js/views/arcos.js).

/* ==================== DIBUJO ==================== */
// Medidas en cm, con el suelo en y = 0 y la y hacia arriba. Cada pieza lleva su clase (madera, riostra, pletina, cuña…)
// y los números van encima de todo, con una línea hasta la pieza.
let APU_SEQ = 0;
// El tamaño (W, H) da la escala de trazos y números; el encuadre se ajusta solo a lo dibujado.
function apuFig(W, H, draw, alt) {
  const M = Math.max(W, H), pad = M * .035, s = M / 340, id = 'aph' + (++APU_SEQ);
  const bb = [Infinity, Infinity, -Infinity, -Infinity], fit = (x, y, r = 0) => { bb[0] = Math.min(bb[0], x - r); bb[1] = Math.min(bb[1], y - r); bb[2] = Math.max(bb[2], x + r); bb[3] = Math.max(bb[3], y + r); };
  const F = v => (+v).toFixed(1), Y = y => (H - y).toFixed(1), pt = ([x, y]) => { fit(x, y); return `${F(x)} ${Y(y)}`; };
  const out = [], top = [];
  const g = {
    W, H, s,
    poly(pts, c = 'aw') { out.push(`<path class="${c}" d="M${pts.map(pt).join('L')}Z"/>`); return g; },
    rect(x, y, w, h, c = 'aw') { return g.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], c); },
    // Pieza de sección t entre dos puntos (puntales inclinados, riostras…)
    bar(x1, y1, x2, y2, t = 10, c = 'aw') {
      const a = Math.atan2(y2 - y1, x2 - x1), nx = -Math.sin(a) * t / 2, ny = Math.cos(a) * t / 2;
      return g.poly([[x1 + nx, y1 + ny], [x2 + nx, y2 + ny], [x2 - nx, y2 - ny], [x1 - nx, y1 - ny]], c);
    },
    // Par de cuñas: dos triángulos que encajan formando un rectángulo (tumbadas, o de pie con v)
    cunas(x, y, w, h, v) {
      if (v) { g.poly([[x, y], [x + w, y], [x, y + h]], 'ac'); return g.poly([[x + w, y], [x + w, y + h], [x, y + h]], 'ac'); }
      g.poly([[x, y], [x + w, y], [x, y + h]], 'ac'); return g.poly([[x + w, y], [x + w, y + h], [x, y + h]], 'ac');
    },
    // Pletina o media pletina de contrachapado, con sus clavos
    plate(x, y, w, h, c = 'ap') {
      g.rect(x, y, w, h, c);
      const nx = Math.max(2, Math.round(w / 9)), ny = Math.max(2, Math.round(h / 9));
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) if ((i + j) % 2 === 0) out.push(`<circle class="anl" cx="${F(x + w * (i + .5) / nx)}" cy="${Y(y + h * (j + .5) / ny)}" r="${F(1.1 * s)}"/>`);
      return g;
    },
    tri(pts) { return g.poly(pts, 'ap'); },
    // Agrupa lo que dibuja fn (p. ej. lo ya montado, apagado, en el montaje paso a paso)
    grp(c, fn) { out.push(`<g class="${c}">`); fn(g); out.push('</g>'); return g; },
    line(x1, y1, x2, y2, c = 'aln') { fit(x1, y1); fit(x2, y2); out.push(`<line class="${c}" x1="${F(x1)}" y1="${Y(y1)}" x2="${F(x2)}" y2="${Y(y2)}"/>`); return g; },
    circle(x, y, r, c = 'am') { fit(x, y, r); out.push(`<circle class="${c}" cx="${F(x)}" cy="${Y(y)}" r="${F(r)}"/>`); return g; },
    wall(x, y, w, h) { return g.rect(x, y, w, h, 'awall').rect(x, y, w, h, `ahatch" fill="url(#${id})`); },
    ground(x1, x2, y = 0) {
      fit(x1, y); fit(x2, y - 6 * s);
      out.push(`<line class="agr" x1="${F(x1)}" y1="${Y(y)}" x2="${F(x2)}" y2="${Y(y)}"/>`);
      for (let x = x1 + 6 * s; x < x2; x += 12 * s) out.push(`<line class="aln" x1="${F(x)}" y1="${Y(y)}" x2="${F(x - 6 * s)}" y2="${Y(y - 6 * s)}"/>`);
      return g;
    },
    stake(x, y1, y2) { return g.rect(x - 1.5, y2, 3, y1 - y2, 'am'); },
    // Número de pieza: círculo en (tx, ty) y línea hasta (x, y)
    n(num, x, y, tx, ty) {
      const r = 8.5 * s;
      fit(tx, ty, r + 1.5 * s);
      top.push(`<line class="ald" x1="${F(x)}" y1="${Y(y)}" x2="${F(tx)}" y2="${Y(ty)}"/><circle class="anb" cx="${F(tx)}" cy="${Y(ty)}" r="${F(r)}"/>
        <text class="ant" x="${F(tx)}" y="${F(+Y(ty) + r * .42)}" font-size="${F(r * 1.15)}">${num}</text>`);
      return g;
    },
    text(x, y, t, size = 11, anchor = 'middle', c = 'atx') {
      const w = String(t).length * size * s * .56; fit(anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x, y - size * s * .3); fit(anchor === 'middle' ? x + w / 2 : anchor === 'end' ? x : x + w, y + size * s);
      top.push(`<text class="${c}" x="${F(x)}" y="${Y(y)}" font-size="${F(size * s)}" text-anchor="${anchor}">${esc(t)}</text>`); return g; },
    // Cota: línea con flechas y el texto en medio
    dim(x1, y1, x2, y2, t, left) {
      top.push(`<line class="adm" x1="${F(x1)}" y1="${Y(y1)}" x2="${F(x2)}" y2="${Y(y2)}" marker-start="url(#${id}m)" marker-end="url(#${id}m)"/>`);
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, vert = Math.abs(x2 - x1) < Math.abs(y2 - y1);
      fit(x1, y1); fit(x2, y2); fit(mx + (vert ? (left ? -1 : 1) * String(t).length * 6 * s : 0), my + 12 * s); fit(mx - (vert ? 0 : String(t).length * 3 * s), my);
      top.push(`<text class="adt" x="${F(mx + (vert ? (left ? -4 : 4) * s : 0))}" y="${F(+Y(my) - (vert ? 0 : 3 * s))}" font-size="${F(10 * s)}" text-anchor="${vert ? (left ? 'end' : 'start') : 'middle'}">${esc(t)}</text>`);
      return g;
    },
    // Arco del ángulo de una pieza con el suelo
    angle(x, y, r, a1, a2, t) {
      const p = a => [x + r * Math.cos(a * Math.PI / 180), y + r * Math.sin(a * Math.PI / 180)];
      const [ax, ay] = p(a1), [bx, by] = p(a2);
      top.push(`<path class="adm" d="M${F(ax)} ${Y(ay)}A${F(r)} ${F(r)} 0 0 ${a2 > a1 ? 0 : 1} ${F(bx)} ${Y(by)}"/>`);
      const [tx, ty] = p((a1 + a2) / 2);
      return g.text(tx + (tx >= x ? 6 : -6) * s, ty, t, 10, tx >= x ? 'start' : 'end', 'adt');
    }
  };
  draw(g);
  const vx = bb[0] - pad, vy = H - bb[3] - pad, vw = bb[2] - bb[0] + 2 * pad, vh = bb[3] - bb[1] + 2 * pad;
  return `<svg class="apu-svg" viewBox="${F(vx)} ${F(vy)} ${F(vw)} ${F(vh)}" role="img" aria-label="${esc(alt)}" style="--s:${s.toFixed(3)}">
    <defs><pattern id="${id}" width="${F(9 * s)}" height="${F(9 * s)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="${F(9 * s)}" class="ahl"/></pattern>
      <marker id="${id}m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="amk"/></marker></defs>
    ${out.join('')}<g class="apu-nums">${top.join('')}</g></svg>`;
}

// Piezas que se repiten
// Puntal de 10×10 con su par de cuñas debajo (sobre la solera) entre y0 (cara de la solera) y y1 (cara de la cumbrera)
const apuPost = (g, x, y0, y1, w = 10) => { g.cunas(x - 15, y0, 30, 4); g.rect(x - w / 2, y0 + 4, w, y1 - y0 - 4); };
// Puntal telescópico de obra entre y0 y y1: placas de asiento, tubo exterior, tuerca, pasador y tubo interior con agujeros
function apuProp(g, x, y0, y1, horiz) {
  if (horiz) return apuPropH(g, y0, x, y1);
  const L = y1 - y0, m = y0 + L * .5;
  g.rect(x - 9, y0, 18, 3, 'am').rect(x - 9, y1 - 3, 18, 3, 'am');
  g.rect(x - 5, y0 + 3, 10, m - y0 - 3, 'am').rect(x - 3.5, m + 4, 7, y1 - m - 7, 'am2');
  for (let y = m + 14; y < y1 - 10; y += 12) g.circle(x, y, 1.3, 'amh');
  g.rect(x - 8, m - 2, 16, 6, 'am3').line(x + 8, m + 1, x + 16, m + 4, 'amt').line(x - 11, m + 10, x + 11, m + 10, 'amt');
}
function apuPropH(g, y, x0, x1) {
  const L = x1 - x0, m = x0 + L * .5;
  g.rect(x0, y - 9, 3, 18, 'am').rect(x1 - 3, y - 9, 3, 18, 'am');
  g.rect(x0 + 3, y - 5, m - x0 - 3, 10, 'am').rect(m + 4, y - 3.5, x1 - m - 7, 7, 'am2');
  for (let x = m + 14; x < x1 - 10; x += 12) g.circle(x, y, 1.3, 'amh');
  g.rect(m - 2, y - 8, 6, 16, 'am3').line(m + 10, y - 11, m + 10, y + 11, 'amt');
}
// Losa o forjado de carga
const apuSlab = (g, x, y, w, h = 14) => g.rect(x, y, w, h, 'aload');
// Freno o carrera con su barra de anclaje y un par de cuñas contra la solera
function apuFreno(g, x, y, dir = 1) {
  const cx = dir > 0 ? x : x - 8, fx = dir > 0 ? x + 8 : x - 18;
  g.cunas(cx, y + 1, 8, 9, true).rect(fx, y, 10, 14, 'aw').stake(fx + 5, y + 20, y - 45);
  return fx + 5;
}

/* ==================== TIPOS ==================== */
// fam: familia · clase: 1, 2 o 3 (dimensiones en que trabaja) · mat: material · ref: tema y apartado de la UME
// figs: [[dibujo, pie]] · parts: [[nombre, qué es]] en el orden de los números · datos: [[dato, valor]] · pasos · ojo
const APU_FAMS = [['gen', 'Generalidades'], ['vert', 'Verticales'], ['zamp', 'Zampeados'], ['lat', 'Laterales'], ['incl', 'Inclinados'],
  ['hor', 'Horizontales'], ['hueco', 'Puertas y ventanas'], ['esp', 'Especiales'], ['pat', 'Patrimonio']];
const APU_CLASE = { 1: 'Clase 1 · una dimensión', 2: 'Clase 2 · dos dimensiones', 3: 'Clase 3 · tres dimensiones' };

const APU = [
  /* ---------- Generalidades ---------- */
  { id: 'componentes', fam: 'gen', name: 'Componentes de un apuntalamiento', ref: 'M6 · 2.1.1',
    uso: 'Un apuntalamiento funciona como un doble embudo: la cumbrera recoge la carga, los puntales la transmiten y la solera la reparte sobre una zona segura. Si hay que apuntalar varias plantas se empieza por la baja y se sube, desde la puerta o el acceso hacia el fondo, haciendo coincidir cumbreras, puntales y soleras.',
    figs: [[g => {
      apuSlab(g, 0, 200, 205, 10);
      g.rect(0, 0, 200, 10).rect(0, 190, 200, 10);
      [20, 100, 180].forEach(x => apuPost(g, x, 10, 190));
      g.bar(6, 16, 194, 184, 7, 'aw2 back').bar(6, 184, 194, 16, 7, 'aw2').rect(0, 96, 200, 9, 'aw2');
      g.plate(85, 170, 30, 30).plate(92, 0, 16, 30, 'ap2').plate(12, 0, 16, 30, 'ap2').plate(172, 0, 16, 30, 'ap2');
      // Lateral: zapata mural, solera, puntal y ejiones
      g.rect(250, 10, 10, 200).rect(250, 0, 160, 10);
      const I = 160, fx = 260 + I - 10;
      g.rect(260, I + 4, 5, 46, 'aw2').bar(265, I, fx, 15, 10).rect(fx + 8, 10, 40, 5, 'aw2').cunas(fx + 4, 10, 4, 10, true);
      g.bar(265, 18, 262 + (fx - 262) / 2, I / 2 + 8, 6, 'aw2');
      g.plate(245, I - 22, 30, 30).plate(245, 0, 30, 30).plate(fx - 14, 0, 30, 30);
      g.ground(-5, 415);
      g.n(1, 160, 195, 160, 228).n(2, 150, 5, 150, -22).n(3, 50, 150, 36, 160).n(4, 100, 185, 70, 228).n(5, 180, 12, 205, -22)
        .n(6, 100, 120, 128, 130).n(7, 255, 120, 232, 130).n(8, 262, I + 30, 290, I + 45);
    }, 'Piezas habituales de un apuntalamiento: a la izquierda, un sistema vertical; a la derecha, uno lateral.']],
    parts: [['Cumbrera o sopanda', 'Bajo forjados, vigas o dinteles: recoge la carga.'], ['Solera o durmiente', 'Descansa en el suelo y reparte la carga de los puntales.'],
      ['Riostras', 'De menor sección (p. ej. 5×10): mantienen la forma y aguantan las cargas horizontales.'], ['Pletinas y medias pletinas', 'Contrachapado de 2–3 cm: pletina 30×30, media pletina 15×30.'],
      ['Pares de cuñas', 'Ajustan puntales y soleras; sueltas rellenan huecos.'], ['Puntales', 'Transmiten la carga a la solera. También pies derechos, codales (horizontales), jabalcones y tornapuntas (inclinados).'],
      ['Zapata mural', 'Apoyada o unida a un muro inestable; recibe su carga (laterales).'], ['Ejión', 'Evita que deslicen los puntales en sistemas laterales o inclinados.']],
    datos: [['Clase 1 (una dimensión)', 'Apuntalamiento en T'], ['Clase 2 (dos dimensiones)', 'Filas de puntales'], ['Clase 3 (tres dimensiones)', 'Par de pares o tipo torre'],
      ['Puntal de madera', 'Ancho/largo ≤ 1/25 para que avise antes de romper: un 10×10 hasta 2,50 m'], ['Riostras', 'Máx. 2,25 m si trabajan a tracción y compresión; en X (solo tensión) 3 m o más'],
      ['Cuñas', '5×10×30 (de un 10×5×30 cortado en diagonal). Unidas por todo el corte; sobrante entre cuñas, mín. 2,5 cm'],
      ['Revisión', 'Cada 12 h (con los relevos) y siempre tras una réplica o un derrumbe secundario'], ['Suelo blando', 'Zapatas bajo la solera, perpendiculares y alineadas con cada puntal'],
      ['Uniones de 10×10', 'Pletina en puntal vertical: 5 clavos al puntal y 8 a la pieza; media pletina: 4 y 4 (clavos de 6,5 cm)']],
    pasos: ['Equipo de colocación (5): jefe de equipo (con el especialista en estructuras decide dónde y qué), medidor (mide, pasa las medidas al equipo de corte y comprueba con el nivel) y tres apuntaladores.',
      'Equipo de corte (5): jefe de equipo (reparte el trabajo, comprueba los cortes y habla con el medidor), tres cortadores y el parquista (herramienta, madera e inventario).',
      'El jefe de corte rotula cada pieza: qué es, su medida y para qué equipo. Ej.: «PUNTAL 170 cm Equipo 1».',
      'Regla de oro: medir DOS veces, cortar UNA. Si hay varios iguales, cortar a la vez cada pieza de todos.'],
    ojo: ['Fibras de la madera en el sentido de la carga: paralelas en el puntal, perpendiculares en solera y cumbrera.', 'Cuanto más largo el puntal, menos carga aguanta.'] },

  { id: 'tablon', fam: 'gen', name: 'Tablón de obra: bridas y pernos', ref: 'M6 · 2.2', mat: 'Tablón de obra',
    uso: 'El tablón de 20×5 a 21×7 es la madera más fácil de conseguir en España. Por su poco grosor, para hacer un puntal se unen al menos dos tablones con bridas o pernos.',
    figs: [[g => {
      g.rect(20, 0, 10, 240).rect(30, 0, 10, 240).line(30, 0, 30, 240, 'aln');
      [30, 120, 210].forEach((y, i) => g.bar(17, y - (i % 2 ? -7 : 7), 43, y + (i % 2 ? -7 : 7), 3, 'am'));
      g.dim(55, 30, 55, 120, '40–95 cm').dim(55, 120, 55, 210, '40–95 cm');
      g.rect(130, 60, 40, 120).rect(170, 60, 40, 120).line(170, 60, 170, 180, 'aln');
      g.rect(158, 105, 24, 24, 'am').circle(170, 117, 4, 'am3');
      g.n(1, 25, 200, 0, 225).n(2, 30, 120, 2, 140).n(3, 170, 117, 230, 150).n(4, 150, 160, 120, 200);
    }, 'Puntal de dos tablones con tres bridas (de canto) y unión con perno (de frente).']],
    parts: [['Tablones', 'De 20×5 a 21×7, unidos cara con cara.'], ['Bridas', 'Dos pletinas metálicas con dos tornillos que abrazan los tablones por la cara grande; se alternan las inclinaciones.'],
      ['Perno', 'Tornillo pasante por un taladro, con pletina metálica para no clavarse en la madera.'], ['Tablón', 'Cada perno o brida suma resistencia.']],
    datos: [['Uniones mínimas', '3: una en cada extremo y otra en el centro'], ['Separación', 'Al menos 40 cm y no más de 95 cm'], ['Bridas', 'Alternando el sentido de su inclinación']],
    pasos: ['Cortar los tablones a medida (descontando solera, cumbrera y unos 4 cm de cuñas).', 'Embridar o empernar: mínimo tres uniones, entre 40 y 95 cm.', 'Un par de cuñas debajo de cada tablón del puntal.'],
    ojo: ['Solo se usan sueltos si las piezas son muy cortas.'] },

  { id: 'puntalobra', fam: 'gen', name: 'Puntal telescópico de obra', ref: 'M6 · 2.3', mat: 'Puntal de obra',
    uso: 'Apoyo provisional de acero que trabaja a compresión. Barato, fácil de conseguir, ligero y rápido de ajustar: para apuntalamientos puntuales y de emergencia y para daños ligeros o medios (en Lorca 2011 se usaron en masa).',
    figs: [[g => {
      apuSlab(g, 0, 262, 120, 12);
      g.rect(15, 252, 90, 10).rect(15, 0, 90, 10);
      apuProp(g, 60, 10, 252);
      g.ground(0, 120);
      g.n(1, 60, 250, 100, 235).n(2, 62, 200, 100, 195).n(3, 60, 140, 100, 160).n(4, 66, 131, 100, 125).n(5, 62, 70, 100, 80).n(6, 60, 12, 100, 32).n(7, 20, 257, 10, 235);
    }, 'Partes del puntal de obra, siempre con cumbrera y solera de madera.']],
    parts: [['Placa de asiento', 'En cada extremo, perpendicular al eje; se clava a la madera.'], ['Tubo interior', 'Más fino, con agujeros para el ajuste grueso.'],
      ['Pasador (prisionero)', 'Se mete por un agujero del tubo interior y marca la medida.'], ['Tuerca de ajuste', 'Con empuñadura: el ajuste fino.'], ['Tubo exterior', 'Más grueso, roscado en un extremo.'],
      ['Solera de madera', 'Reparte la carga en el suelo.'], ['Cumbrera de madera', 'Recoge la carga: la placa es muy pequeña.']],
    datos: [['Largo', 'De 1 a 6 m'], ['Ventajas', 'Precio, disponibilidad, ligereza, ajuste rápido'], ['Inconvenientes', 'Largo limitado, cabezales rectos, no se pueden arriostrar entre sí'],
      ['Inclinados', 'Siempre con calzos en cuña con la misma pendiente']],
    pasos: ['Revisar rosca, pasador, tuercas y seguro; tubos sin golpes, deformaciones ni corrosión.', 'Clavar las placas a la cumbrera y a la solera por sus agujeros, hasta algo más de la mitad, y doblar los clavos.', 'Colocar y extender hasta el ajuste. Comprobar con el nivel.'],
    ojo: ['Muy sensibles a cargas laterales: no valen si puede haber réplicas o movimientos, salvo de forma puntual.', 'No mezclar puntales de distintos tipos o fabricantes; si no hay más remedio, calcular con el más débil.'] },

  { id: 'holmatro', fam: 'gen', name: 'Puntales de rescate HOLMATRO', ref: 'M6 · 2.4', mat: 'HOLMATRO',
    uso: 'HOLMATRO POWERSHORE: puntales, extensiones y cabezales para apuntalamientos de emergencia, rápidos y seguros durante poco tiempo, hasta poner madera. También en zanjas, pozos y rescate en vehículos.',
    figs: [[g => {
      apuSlab(g, 0, 268, 140, 12);
      g.rect(25, 256, 90, 12);
      g.rect(52, 246, 36, 10, 'am').rect(52, 240, 6, 16, 'am').rect(82, 240, 6, 16, 'am');
      g.rect(62, 226, 16, 14, 'axw').rect(62, 126, 16, 100, 'axg');
      [150, 176, 202].forEach(y => g.line(62, y, 78, y, 'aln'));
      g.rect(60, 30, 20, 96, 'ahol').rect(56, 118, 28, 8, 'am3').line(84, 122, 96, 128, 'amt');
      g.circle(70, 22, 8, 'am').rect(50, 10, 40, 5, 'am');
      g.rect(25, 0, 90, 10);
      g.ground(0, 140);
      g.n(1, 40, 262, 12, 245).n(2, 70, 250, 112, 240).n(3, 70, 230, 112, 214).n(4, 70, 170, 112, 170).n(5, 70, 80, 112, 90).n(6, 70, 22, 112, 30).n(7, 40, 5, 12, 22);
    }, 'Apuntalamiento en T con HOLMATRO: puntal abajo, extensiones (la más corta, al final) y cabezales clavados a la madera.']],
    parts: [['Cumbrera', 'De madera, no más de 90 cm.'], ['Cabezal soporte de viga', 'Para vigas y columnas; el de 100 mm encaja en madera 10×10.'], ['Extensión corta', 'Las más cortas, siempre al final, nunca en medio.'],
      ['Extensión larga', 'Las menos posibles: mejor una SX 10 que dos SX 5.'], ['Puntal', 'Manual, neumático o hidráulico; mejor en la base para ajustarlo.'], ['Cabezal giratorio', 'Con rótula: suelos irregulares o inclinados; sus agujeros permiten clavarlo.'], ['Solera', 'De madera.']],
    datos: [['Carga', '10 t hasta 1.325 mm; baja según crece, hasta 4,5 m como máximo'], ['Seguridad', 'Factor 4:1'],
      ['Manual roscado', '250 mm cerrado · recorrido 127 mm · 3,5 kg'], ['Manual con contratuerca', '575 mm · 250 mm · 6,7 kg'],
      ['Neumático autobloqueo', 'AS 3Q 5 FL 632 mm · AS 3Q 10 FL 1.092 mm (recorrido 252 mm). Apuntalamiento remoto; a 8 bar'],
      ['Neumático contratuerca', 'AS 3 L 5+ 575 mm · AS 3L 10+ 1.035 mm. También manual; no remoto'],
      ['Hidráulico contratuerca', 'HS 1 L 5+ 575 mm · HS 1 L 10+ 1.035 mm'], ['Hidráulico autobloqueo', 'HS 1Q 5 FL 632 mm · HS 1Q 10 FL 1.035 mm. Eleva y apuntala a la vez (10 t)'],
      ['Bomba manual', '700 cc; un puntal necesita 346 cc: mejor una bomba por puntal'],
      ['Extensiones', 'SX 1 125 mm blanca · SX 2 250 azul · SX 5 500 amarilla · SX 10 1.000 verde · SX 15 1.500 roja · FX 1 125']],
    pasos: ['Elegir el puntal según la situación y los cabezales (no tienen que ser iguales arriba y abajo).', 'Calcular las extensiones: las menos posibles y las cortas al final.', 'Clavar los cabezales a la cumbrera y a la solera en lugar seguro.',
      'Llevarlo a su sitio, extender y ajustar. El último apriete de los hidráulicos y neumáticos, siempre a mano.', 'Comprobar con el nivel y recoger mangueras y bombas.'],
    ojo: ['No tienen arriostramiento entre sí: poca resistencia lateral. Uso puntual y temporal hasta poner madera.', 'La fuerza del hidráulico (10 t) o del neumático (400 kg) puede dañar una estructura colapsada.'] },

  /* ---------- Verticales ---------- */
  { id: 't', fam: 'vert', clase: 1, name: 'Apuntalamiento en T', ref: 'M6 · 3.2.1', mat: 'Madera 10×10 (FEMA)',
    uso: 'Para asegurar de inicio una zona peligrosa mientras se coloca un sistema que proteja más. Es unidimensional: poco estable y muy sensible a las cargas horizontales.',
    figs: [[g => {
      apuSlab(g, 0, 255, 120);
      g.rect(15, 245, 90, 10); apuPost(g, 60, 10, 245); g.rect(15, 0, 90, 10);
      g.plate(45, 225, 30, 30).plate(53, 2, 14, 28, 'ap2');
      g.ground(0, 120);
      g.n(1, 95, 250, 112, 232).n(2, 70, 232, 112, 205).n(3, 60, 140, 92, 140).n(4, 60, 22, 100, 52).n(5, 48, 12, 22, 34).n(6, 25, 5, 8, 26);
    }, 'Apuntalamiento en T con madera 10×10.']],
    parts: [['Cumbrera', 'No mayor de 90 cm; contacto total con la carga (rellenar huecos con cuñas o tacos).'], ['Pletina 30×30×2', 'En ambos lados: 5 clavos al puntal y 8 a la cumbrera.'], ['Puntal', '10×10, centrado bajo el punto a soportar.'],
      ['Media pletina 15×30×2', 'En un solo lado: 4 clavos al puntal y 4 a la solera.'], ['Cuñas', 'Con un clavo detrás tras el ajuste.'], ['Solera', 'Igual de larga que la cumbrera, firme sobre el suelo.']],
    datos: [['Altura máxima', '3,30 m (con cumbrera, solera y cuñas)'], ['Carga', 'De 1.800 a 450 kg: cuanto más alto, menos'], ['Inclinación de la carga', 'Máx. 3°; si es mayor, apuntalamiento inclinado'], ['Cuñas', 'Restar 4 cm al puntal si son de 5×10']],
    pasos: ['Decidir el sitio exacto y medir del suelo al techo, quitando el mínimo escombro.', 'Cortar cumbrera, solera y puntal (restando cumbrera, solera y cuñas).', 'Unir centrados puntal y cumbrera con una pletina por cada lado (prefabricado).',
      'Colocar puntal y cumbrera centrados bajo la carga, meter la solera y ajustar con las cuñas.', 'Comprobar con el nivel y clavar un clavo que inmovilice las cuñas.', 'Clavar la media pletina entre solera y puntal.'],
    ojo: ['Si el puntal no está centrado bajo la carga, es más inestable.'] },

  { id: 'fila', fam: 'vert', clase: 2, name: 'Filas de puntales', ref: 'M6 · 3.2.3', mat: 'Madera 10×10 (FEMA)',
    uso: 'Para sostener vigas horizontales dañadas, colocado de forma transversal bajo ellas. Más estable y resistente que la T.',
    figs: [[g => {
      apuSlab(g, 0, 275, 330);
      g.rect(15, 265, 300, 10).rect(15, 0, 300, 10);
      g.bar(22, 16, 308, 260, 7, 'aw2 back');
      [45, 165, 285].forEach(x => apuPost(g, x, 10, 265));
      g.bar(22, 260, 308, 16, 7, 'aw2').rect(15, 133, 300, 9, 'aw2');
      [45, 165, 285].forEach(x => g.plate(x - 8, 245, 16, 30, 'ap2').plate(x - 8, 0, 16, 30, 'ap2'));
      g.ground(0, 330).dim(45, 222, 165, 222, '≤ 1,20 m').dim(15, 244, 45, 244, '30');
      g.n(1, 230, 270, 240, 296).n(2, 285, 190, 318, 190).n(3, 110, 90, 92, 52).n(4, 230, 137, 238, 112).n(5, 165, 255, 140, 296).n(6, 165, 12, 190, -22).n(7, 80, 5, 70, -22);
    }, 'Fila de tres puntales con riostras en cruz de San Andrés y riostra central (más de 2,4 m).']],
    parts: [['Cumbrera', 'Alero de 30 cm entre el último puntal y el final de cumbrera y solera.'], ['Puntales', 'Mínimo dos, separados ≤ 1,2 m de centro a centro.'], ['Riostras diagonales', 'En sentido contrario a cada lado: cruz de San Andrés. Clavadas a cumbrera, solera y puntales.'],
      ['Riostra horizontal central', 'Si el sistema pasa de 2,4 m de altura.'], ['Medias pletinas', 'En la unión cumbrera–puntal y en las dos caras de solera–puntal.'], ['Pares de cuñas', 'Uno bajo cada puntal, asegurado con un clavo.'], ['Solera', 'Alineada con la cumbrera y lo más nivelada posible.']],
    datos: [['Separación de puntales', '≤ 1,2 m (menos si se quiere más capacidad)'], ['Riostra central', 'Si la altura > 2,4 m'], ['Medir', 'La altura en tres puntos y cortar con la más baja'], ['Uniones de riostras', '5 clavos de 6,25 o 3 de 8,8 cm']],
    pasos: ['Asegurar antes la zona (HOLMATRO, puntal de obra o T).', 'Cortar cumbrera y solera; poner la solera alineada con la cumbrera.', 'Medir la altura en tres puntos y cortar los puntales.',
      'Sujetar la cumbrera nivelada con el punto más bajo; los huecos, con cuñas.', 'Colocar los puntales bajo cada elemento a apuntalar (≤ 1,2 m, a 30 cm de los extremos) y ajustar las cuñas.',
      'Si pasa de 2,4 m, clavar la riostra horizontal central.', 'Clavar las diagonales en X por ambos lados.', 'Medias pletinas en la solera; si hay réplicas, en las dos caras (salvo donde vayan diagonales).'],
    ojo: [] },

  { id: 'dos', fam: 'vert', clase: 2, name: 'Vertical de dos puntales', ref: 'M6 · 3.2.5', mat: 'Madera 10×10 (FEMA)',
    uso: 'Conviene llevarlo prefabricado. Es el primer paso para construir un par de pares o tipo torre. La cumbrera va centrada en la zona dañada, transversal a las vigas.',
    figs: [[g => {
      apuSlab(g, 0, 305, 200);
      g.rect(10, 295, 180, 10).rect(10, 0, 180, 10);
      [40, 160].forEach(x => apuPost(g, x, 10, 295));
      g.rect(30, 146, 140, 9, 'aw2').bar(46, 288, 155, 158, 7, 'aw2').bar(155, 143, 46, 18, 7, 'aw2');
      [40, 160].forEach(x => g.plate(x - 8, 275, 16, 30, 'ap2').plate(x - 8, 0, 16, 30, 'ap2'));
      g.ground(0, 200).dim(40, 205, 160, 205, '0,9–1,2 m').dim(10, 316, 40, 316, '30');
      g.n(1, 110, 300, 120, 330).n(2, 160, 220, 190, 220).n(3, 100, 150, 110, 125).n(4, 100, 222, 80, 245).n(5, 40, 285, 15, 260).n(6, 160, 12, 190, 30).n(7, 100, 5, 100, -22);
    }, 'Sistema vertical de dos puntales: riostra horizontal y diagonales.']],
    parts: [['Cumbrera', 'Voladizo de 30 cm a cada lado.'], ['Puntales', 'Bajo las vigas, separados entre 0,9 y 1,2 m de centro a centro.'], ['Riostra horizontal', 'Si la altura > 3,35 m, dos: a 1/3 y 2/3.'],
      ['Riostras diagonales', 'Clavadas arriba y abajo a los puntales, con sobrante para clavarlas a solera y cumbrera.'], ['Medias pletinas', 'Cumbrera–puntal pegada al extremo del puntal; solera–puntal en una o las dos caras.'], ['Cuñas', 'Ajustadas con golpes cortos.'], ['Solera', '60 cm más larga que la distancia entre puntales.']],
    datos: [['Carga (10×10)', '7.200 kg hasta 2,4 m · 4.500 kg hasta 3 m · 3.100 kg hasta 3,6 m'], ['Altura máxima', '3,6 m (salvo que forme parte de una torre)'], ['Inclinación', 'Solera y cumbrera admiten 3°'], ['Cuñas', 'Restar 8 cm si son de 10×10 y 4 cm si son de 5×10']],
    pasos: ['Asegurar la zona; si se puede, llevarlo prefabricado en parte.', 'Cortar puntales, solera y cumbrera (60 cm más que la separación) y las riostras.', 'Unir los puntales con la riostra horizontal; las diagonales arriba y abajo.',
      'Unir los puntales a la cumbrera con media pletina. Colocar centrado bajo la carga.', 'Meter la solera alineada y ajustar las cuñas. Nivel y clavos en las cuñas.', 'Medias pletinas en la solera y clavar la diagonal.'],
    ojo: [] },

  { id: 'torre', fam: 'vert', clase: 3, name: 'Par de pares o tipo torre', ref: 'M6 · 3.2.7', mat: 'Madera 10×10 (FEMA)',
    uso: 'Gran capacidad de carga, estabilidad y resistencia lateral. Para forjados de hormigón o de madera con daños importantes. Se hace uniendo dos sistemas verticales de dos puntales; su interior puede servir de refugio.',
    figs: [[g => {
      const ox = 60, oy = 40, H = 330;
      const frame = (dx, dy, cls) => { g.rect(10 + dx, dy, 180, 10, cls).rect(10 + dx, H - 10 + dy, 180, 10, cls); [40, 160].forEach(x => g.rect(x - 5 + dx, 14 + dy, 10, H - 24, cls)); };
      frame(ox, oy, 'aw back');
      [[160, 18], [160, H / 2], [160, H - 22]].forEach(([x, y]) => g.bar(x, y, x + ox, y + oy, 7, 'aw2'));
      g.bar(163, 25, 160 + ox, H / 2 + oy - 6, 6, 'aw2').bar(163, H - 28, 160 + ox, H / 2 + oy + 6, 6, 'aw2');
      frame(0, 0, 'aw');
      [40, 160].forEach(x => g.cunas(x - 15, 10, 30, 4));
      g.rect(30, H / 2 - 4, 140, 9, 'aw2').bar(46, H - 18, 155, H / 2 + 8, 7, 'aw2').bar(155, H / 2 - 8, 46, 20, 7, 'aw2');
      g.ground(0, 270).dim(40, -16, 160, -16, '0,9–1,2 m');
      g.n(1, 100, H - 5, 90, H + 26).n(2, 40, 250, 12, 240).n(3, 190, H / 2 + 20, 245, H / 2 - 30).n(4, 195, 85, 248, 70).n(5, 100, H / 2, 110, H / 2 + 28).n(6, 40, 12, 10, 34).n(7, 120, 5, 120, -30);
    }, 'Torre de 3,3 m: dos pares de puntales unidos por riostras horizontales y diagonales en K.'],
    [g => {
      const pat = (x0, h, nd) => { g.rect(x0, 0, 110, 8, 'aw2').rect(x0, h - 8, 110, 8, 'aw2'); g.rect(x0 + 5, 8, 10, h - 16).rect(x0 + 95, 8, 10, h - 16);
        const seg = (h - 16) / nd; for (let i = 0; i < nd; i++) { const ya = 8 + seg * i, yb = ya + seg; if (i) g.rect(x0, ya - 4, 110, 8, 'aw2'); g.bar(x0 + 12, i % 2 ? ya + 4 : yb - 4, x0 + 98, i % 2 ? yb - 4 : ya + 4, 6, 'aw2'); }
        g.text(x0 + 55, -18, h < 180 ? '< 1,8 m: 1 diagonal' : h < 330 ? '1,8–3,3 m: 2 en K' : '3,3–5,1 m: 3', 10); };
      pat(0, 160, 1); pat(150, 300, 2); pat(300, 470, 3); g.ground(-5, 415);
    }, 'Diagonales de cada lateral según la altura.']],
    parts: [['Cumbreras', 'Voladizo de 30 cm. Puede ser más larga que la solera si sostiene hormigón muy dañado.'], ['Puntales', 'Longitud máxima del puntal 4,9 m.'], ['Riostras horizontales', 'En los laterales, por ambos lados, uniendo los dos pares.'],
      ['Diagonales', 'Sin que coincidan varias en el mismo punto. En cada par, hacia fuera y en sentido inverso al otro: al enfrentarse forman una X.'], ['Pletinas o medias pletinas', 'En la unión de los puntales con solera y cumbrera.'], ['Cuñas', 'Bajo cada puntal.'], ['Soleras', 'Una por par.']],
    datos: [['Carga de trabajo', 'Unos 15.000 kg (en pruebas FEMA rompió con 40–45 t)'], ['Ancho', 'Mín. 0,9 m y máx. 1,2 m de centro a centro de puntal'], ['Altura máxima', '5,1 m y no más de 4 veces la separación lateral'],
      ['Diagonales por lateral', '< 1,8 m: una · 1,8–3,3 m: dos en K · 3,3–5,1 m: tres']],
    pasos: ['Reconocer la carga, limpiar la zona y poner un apuntalamiento temporal (HOLMATRO o T).', 'Construir dos sistemas verticales de dos puntales iguales.', 'Preparar las riostras horizontales según el ancho (0,9–1,2 m).',
      'Colocar los dos pares y sus soleras enfrentados y alineados, con las diagonales hacia fuera y en sentido inverso. Ajustar las cuñas.', 'Clavar las riostras horizontales de los laterales por ambos lados.', 'Clavar las diagonales de los laterales según la altura.'],
    ojo: ['En las pruebas, antes de romper cruje mucho. Lo primero que falla son las cuñas y cumbreras/soleras; después los puntales en las uniones con riostras.'] },

  { id: 'vtablon', fam: 'vert', clase: 2, name: 'Vertical con tablón de obra', ref: 'M6 · 3.3', mat: 'Tablón de obra',
    uso: 'Con al menos dos tablones embridados o empernados por puntal. Un solo puntal (T) o varios arriostrados entre sí, según la zona.',
    figs: [[g => {
      apuSlab(g, 0, 195, 200);
      g.rect(10, 188, 180, 7).rect(10, 0, 180, 7);
      g.bar(16, 12, 184, 184, 6, 'aw2 back');
      [50, 150].forEach(x => { g.cunas(x - 10, 7, 10, 4).cunas(x, 7, 10, 4); g.rect(x - 5, 11, 5, 177).rect(x, 11, 5, 177);
        [45, 100, 155].forEach((y, i) => g.bar(x - 9, y - (i % 2 ? -6 : 6), x + 9, y + (i % 2 ? -6 : 6), 3, 'am')); });
      g.bar(16, 184, 184, 12, 6, 'aw2');
      g.ground(0, 200).dim(50, 172, 150, 172, '≤ 1 m');
      g.n(1, 120, 191, 125, 214).n(2, 150, 130, 178, 130).n(3, 50, 100, 22, 120).n(4, 100, 98, 100, 70).n(5, 150, 9, 178, 28).n(6, 30, 3, 20, -22);
    }, 'Dos puntales de dos tablones embridados, con riostras en cruz (altura < 1,8 m).']],
    parts: [['Cumbrera', 'Con un puntal, no más de 90 cm; con varios, alero de 30 cm en cada extremo.'], ['Puntal de dos tablones', 'Embridados o empernados.'], ['Bridas', 'Mínimo tres, entre 40 y 95 cm, alternando la inclinación.'],
      ['Riostras en cruz', 'Si la altura < 1,8 m: una diagonal por delante y otra por detrás. Si es mayor: riostras horizontales a cada lado y cruces arriba y abajo.'], ['Pares de cuñas', 'Uno bajo cada tablón.'], ['Solera', 'Tablón.']],
    datos: [['Separación de puntales', '≤ 1 m'], ['Hueco para cuñas', 'Unos 4 cm']],
    pasos: ['Limpiar y medir en varios puntos (suelo y techo cambian).', 'Cortar los tablones (restando solera, cumbrera y 4 cm de cuñas) y embridarlos o empernarlos.', 'Cortar solera y cumbrera.',
      'Preparar un par de cuñas por tablón. Se puede unir la cumbrera al puntal con dos cuñas clavadas a los lados para llevarlo.', 'Colocar y ajustar con las cuñas.', 'Si hay varios puntales, arriostrarlos.'],
    ojo: [] },

  { id: 'vobra', fam: 'vert', clase: 2, name: 'Vertical con puntales de obra', ref: 'M6 · 3.4', mat: 'Puntal de obra',
    uso: 'Transitorio hasta poner un sistema mejor. En T, de dos puntales (también para puertas y ventanas) o en filas de muchos puntales alrededor de columnas o bajo vigas.',
    figs: [[g => {
      apuSlab(g, 0, 255, 330);
      g.rect(10, 245, 90, 10).rect(10, 0, 90, 10); apuProp(g, 55, 10, 245);
      g.rect(150, 245, 170, 10).rect(150, 0, 170, 10);
      g.bar(156, 12, 314, 243, 6, 'aw2 back'); apuProp(g, 175, 10, 245); apuProp(g, 295, 10, 245); g.bar(156, 243, 314, 12, 6, 'aw2');
      g.ground(0, 330).dim(150, 225, 168, 225, '≥ 10');
      g.n(1, 30, 250, 20, 275).n(2, 55, 140, 22, 140).n(3, 30, 5, 22, -22).n(4, 260, 250, 270, 275).n(5, 235, 120, 235, 95);
    }, 'T con puntal de obra y sistema de dos puntales arriostrado (no es lugar de paso).']],
    parts: [['Cumbrera', 'Siempre de madera.'], ['Puntal de obra', 'Placas clavadas y clavos doblados.'], ['Solera', 'Siempre de madera.'], ['Cumbrera del sistema de dos', 'Si es un hueco, deja 10 cm entre el puntal y el extremo para cambiarlo luego por madera.'], ['Riostras en X', 'De solera a cumbrera, si no es lugar de paso.']],
    datos: [['Margen en huecos', '≥ 10 cm entre la base del puntal y el extremo de solera y cumbrera'], ['Filas', 'El especialista en estructuras indica el número y la colocación']],
    pasos: ['Medir la altura (y el ancho), quitando el mínimo escombro.', 'Cortar cumbrera y solera. Clavar la base del puntal centrada en la solera (clavos hasta algo más de la mitad y doblados).',
      'Dar la vuelta y clavar la cabeza a la cumbrera.', 'Colocar en su sitio y extender hasta el ajuste.', 'Si no es un paso, arriostrar de solera a cumbrera en X. Comprobar con el nivel.'],
    ojo: ['Solo puntual o temporal: no se pueden arriostrar los puntales entre sí.'] },

  { id: 'vholm', fam: 'vert', clase: 1, name: 'Vertical con puntales HOLMATRO', ref: 'M6 · 3.5', mat: 'HOLMATRO',
    uso: 'La T es ideal con puntales de rescate: no hay que hacer ni ajustar cuñas ni clavar pletinas. Varias T o una doble T sostienen una carga mientras se prepara la madera.',
    figs: [[g => {
      apuSlab(g, 0, 268, 300, 12);
      g.rect(20, 256, 260, 12).rect(20, 0, 260, 10);
      [70, 230].forEach(x => { g.rect(x - 18, 246, 36, 10, 'am').rect(x - 8, 226, 16, 20, 'axb').rect(x - 8, 126, 16, 100, 'axg').rect(x - 10, 30, 20, 96, 'ahol').rect(x - 14, 118, 28, 8, 'am3');
        g.circle(x, 22, 8, 'am').rect(x - 20, 10, 40, 5, 'am'); });
      g.ground(0, 300);
      g.n(1, 150, 262, 150, 240).n(2, 70, 250, 30, 225).n(3, 230, 176, 268, 176).n(4, 230, 80, 268, 80).n(5, 70, 22, 30, 40).n(6, 150, 5, 150, -22);
    }, 'Doble T con puntales HOLMATRO, cabezales soporte de viga arriba y giratorios abajo.']],
    parts: [['Cumbrera', 'En contacto perfecto con la carga.'], ['Cabezal soporte de viga', 'Clavado centrado en la cumbrera.'], ['Extensiones', 'Según la altura medida.'], ['Puntal', 'Mejor manual o de contratuerca.'], ['Cabezal giratorio o base triple', 'Mejor en suelos irregulares o inclinados.'], ['Solera', 'Firme sobre el suelo.']],
    datos: [['Puntal ideal', 'Bloqueo manual o por contratuerca'], ['Cumbrera (T)', '≤ 90 cm']],
    pasos: ['Medir del suelo al techo quitando el mínimo escombro.', 'Elegir puntal y extensiones (cuenta con su recorrido).', 'Clavar los cabezales centrados en cumbrera y solera.',
      'Llevar el sistema montado, o primero puntal y cumbrera y meter la solera debajo.', 'Extender hasta ajustar; el último apriete, a mano. Nivel y recoger mangueras.'],
    ojo: ['Con cabezales que no se clavan no se puede prefabricar en lugar seguro: más tiempo dentro.'] },

  /* ---------- Zampeados ---------- */
  { id: 'zampeado', fam: 'zamp', name: 'Zampeado', alias: 'Llave (minería y obra pública) o entarimado', ref: 'M6 · 3.6', mat: 'Madera 10×10 o 15×15',
    uso: 'Viguetas iguales en capas cruzadas. Fácil y rápido, avisa antes de romper (cruje) y es muy útil cuando no se sabe el peso. Necesita espacio y mucha madera. Sirve de base para cojines y gatos.',
    figs: [[g => {
      apuSlab(g, -5, 158, 150);
      for (let i = 0; i < 15; i++) {
        const y = i * 10;
        if (i === 0) { for (let x = 10; x < 130; x += 10) g.rect(x, 0, 10, 10); }
        else if (i % 2) g.rect(10, y, 120, 10); else { g.rect(20, y, 10, 10).rect(110, y, 10, 10); }
      }
      g.cunas(20, 150, 30, 8).cunas(90, 150, 30, 8);
      g.ground(-5, 145).dim(-12, 0, -12, 150, '≤ 3 × ancho').dim(10, -14, 20, -14, '10');
      g.n(1, 70, 75, 160, 90).n(2, 15, 115, -2, 125).n(3, 70, 5, 160, 10).n(4, 35, 154, 70, 185);
    }, 'Zampeado de dos viguetas por capa (de lado), con la primera capa sólida.'],
    [g => {
      const plan = (x0, n) => { const w = 120, c = Array.from({ length: n }, (_, i) => 10 + (w - 20) * i / (n - 1));
        c.forEach(x => g.rect(x0 + x - 5, 0, 10, w, 'aw back')); c.forEach(y => g.rect(x0, y - 5, w, 10, 'aw')); g.text(x0 + w / 2, -16, n === 2 ? '2 × 2' : '3 × 3', 11); };
      plan(0, 2); plan(170, 3);
    }, 'En planta: dos y tres viguetas por capa.']],
    parts: [['Viguetas', 'Del mismo tamaño y grosor, cruzadas en cada capa.'], ['Esquinas', 'Sobresalen al menos 10 cm: estabilidad y aplastamiento lento si se sobrecarga.'], ['Primera capa', 'Sólida, sin huecos (sobre todo en suelo blando o pavimento fino).'], ['Cuñas', 'De 5×30 para ajustar a la carga, con un clavo detrás.']],
    datos: [['2 × 2 de 10×10', '10.800 kg'], ['2 × 2 de 15×15', '27.200 kg'], ['3 × 3 de 10×10', '25.000 kg'], ['3 × 3 de 15×15', '61.200 kg'],
      ['Altura / ancho', 'Máx. 3/1. Si no es rectangular, 1/1'], ['Carga inclinada', 'Cuñas en cada capa: máx. 30° y 1,3 m de alto'], ['Alto > 1,5 m', 'Listón fino clavado en las esquinas: ayuda y avisa de descuadres']],
    pasos: ['Primera capa sólida.', 'Capas cruzadas con las esquinas sobresaliendo ≥ 10 cm.', 'Si es base de cojines o gatos, la primera y la última capa completas.', 'Ajustar a la carga con cuñas.',
      'Con réplicas o vibraciones, pletinas de contrachapado en las cuatro caras; dos o más zampeados se pueden unir con viguetas comunes.'],
    ojo: ['Si va a estar mucho tiempo, revisarlo cada día por desplazamientos tras réplicas o cargas laterales.'] },

  /* ---------- Laterales ---------- */
  { id: 'volante', fam: 'lat', clase: 2, name: 'Lateral volante o de fricción', ref: 'M6 · 4.2', mat: 'Madera 10×10 (FEMA)',
    uso: 'El único recurso para apuntalar una pared dañada cuando hay escombros u obstáculos pegados a ella; también como apuntalamiento inicial mientras se preparan sistemas de solera fija. Zona extremadamente peligrosa: uso temporal.',
    figs: [[g => {
      const G = 60, I = G + 290, fx = 40 + (I - G - 15) / Math.tan(Math.PI / 3);
      g.wall(0, G, 30, 380).poly([[30, G], [150, G], [30, G + 110]], 'adeb');
      g.rect(30, G + 130, 10, 250).rect(40, I + 4, 5, 60, 'aw2');
      g.bar(45, I, fx, G + 13, 10);
      const yr = G + 150, xr = 40 + (I - yr) / Math.tan(Math.PI / 3); g.bar(36, yr, xr + 4, yr, 8, 'aw2');
      g.rect(fx - 30, G, 60, 5, 'aw2').rect(fx - 30, G, 5, 15, 'aw2').rect(fx + 25, G, 5, 15, 'aw2');
      g.plate(25, I - 26, 30, 30);
      apuFreno(g, fx + 31, G, 1);
      g.ground(0, 280, G).angle(fx, G + 13, 34, 180, 120, '60°');
      g.n(1, 35, G + 220, 12, G + 225).n(2, 42, I + 40, 75, I + 55).n(3, 40, I - 10, 75, I - 5).n(4, 120, G + 160, 150, G + 175).n(5, 70, yr, 80, yr - 30)
        .n(6, fx + 5, G + 3, fx - 10, G - 25).n(7, fx + 35, G + 6, fx + 45, G + 40).n(8, fx + 44, G + 10, fx + 60, G + 45).n(9, fx + 44, G - 20, fx + 60, G - 30).n(10, 60, G + 40, 75, G + 15);
    }, 'Lateral volante: la base tipo caja apoya lejos de la pared, por encima de los escombros.']],
    parts: [['Zapata mural', 'Contra la pared; si apoya en un saliente, no hace falta anclarla.'], ['Ejión 5×10×60', 'Clavado a la zapata con 14 clavos, encima del puntal.'], ['Pletinas 30×30', 'A cada lado de la unión puntal–zapata.'], ['Puntal', 'A 60°, longitud máxima 3,3 m.'],
      ['Riostra horizontal', 'A cada lado, 5×10 o 5×15.'], ['Base tipo caja', 'Fondo de 5×10×90 y laterales de 5×15×90 con 7 clavos. En suelo blando, 3 tablones de 5×15×45 debajo.'], ['Cuñas', 'Entre la caja y la carrera.'], ['Freno o carrera', 'Madero que sujeta el sistema.'], ['Barras de anclaje', 'Estacas de 2 cm de Ø y 1,5 m; en hormigón, con martillo perforador.'], ['Escombros', 'Se pueden dejar contra la pared o servir de apoyo.']],
    datos: [['Ángulo', '60°'], ['Puntal', 'Máx. 3,3 m'], ['Uso', 'Puntual; también en pares con riostras horizontales y diagonales']],
    pasos: ['Decidir la zona de pared a asegurar y el punto de inserción; medir.', 'Cortar puntales, zapata mural y riostras inferiores; marcar los cortes a 60°.', 'Clavar el ejión de 5×10×60 a la zapata con 14 clavos.',
      'Colocar el puntal contra la zapata y clavar una pletina; dar la vuelta y repetir.', 'Clavar la riostra horizontal inferior.', 'Preparar la caja en el suelo y la carrera donde acaban las soleras, dejando hueco para cuñas de 5×10; anclarla con las barras.',
      'Meter el puntal en la caja y ajustar caja–carrera con cuñas.', 'Si hace falta, anclar la zapata a la pared con taladros.'],
    ojo: [] },

  { id: 'solerafija', fam: 'lat', clase: 3, name: 'Lateral de solera fija', ref: 'M6 · 4.3', mat: 'Madera 10×10 (FEMA)',
    uso: 'Para sostener muros y paredes en mal estado. Es un triángulo completo (zapata mural, solera y puntal) y se hace en grupos de dos o más arriostrados entre sí. Necesita el suelo junto a la pared limpio y lo más horizontal posible.',
    figs: [[g => apuLateral(g, apuLatParams()), 'Lateral de solera fija (las medidas cambian con la calculadora).']],
    parts: [['Zapata mural', 'Contra la pared; si está abombada, calzos y cuñas para que toque bien.'], ['Ejión superior', '5×10: 60 cm y 14 clavos (30° y 45°) o 75 cm y 20 clavos (60°).'], ['Pletinas 30×30×2', 'En las dos caras de cada unión.'],
      ['Puntal', 'Su longitud es de vértice a vértice (inserción en la zapata y en la solera).'], ['Riostra central', 'Mejor de 5×15, a cada lado.'], ['Solera', 'Sobresale ≥ 60 cm (30° y 45°) o 75 cm (60°) tras el puntal.'], ['Cuñas', 'Entre el puntal y el ejión de tope.'],
      ['Ejión de tope', 'En la solera, dejando sitio para las cuñas.'], ['Freno o carrera', 'Con un par de cuñas contra la solera; se puede clavar una pletina de 30×30 entre ambas.'], ['Barras de anclaje', '2 cm de Ø y 1,5 m.']],
    datos: [['Ángulo', 'Entre 30° y 60°. 30°: el que más carga aguanta pero más espacio y madera; 45°: el más usado; 60°: el de los volantes'],
      ['Proporciones (inserción = 1)', '30°: puntal 2 y solera 1,73 · 45°: puntal 1,41 y solera 1 · 60°: puntal 1,16 y solera 0,58'],
      ['Punto de inserción', 'A la altura del forjado o hasta 60 cm por debajo, nunca por encima'], ['Separación entre triángulos', 'Máx. 2,4 m'],
      ['Riostras', 'Horizontales arriba y abajo de los puntales, intermedia si la inserción > 2,4 m y diagonales en cruz de San Andrés'],
      ['Ancho libre', 'Mín. 90 cm por triángulo'], ['Pared muy deteriorada', 'Tablero de contrachapado de 2 cm bajo la zapata (120 de ancho × la altura, o 120×120)'], ['Suelo blando', 'Zapatas de 5×10×45 bajo la solera']],
    pasos: ['Asegurar la zona, limpiarla y fijar el punto de contacto puntal–pared.', 'Elegir el ángulo (espacio, carga y madera) y cortar puntales, zapatas y soleras; marcar los cortes del puntal.',
      'Prefabricar en zona segura: solera a 90° con la zapata con una pletina; puntal con su ángulo; ejión de arriba y pletina superior.', 'Pletina en la unión solera–puntal clavada solo al puntal (por si hay que ajustarlo).', 'Dar la vuelta y clavar las pletinas del otro lado.',
      'Llevarlo a la pared, a plomo, con la zapata en contacto total.', 'Clavar el ejión de tope en la solera dejando sitio para las cuñas.', 'Anclar la carrera tras las soleras con barras; cuñas entre carrera y solera.',
      'Cuñas entre el puntal y el ejión y clavar la pletina del todo. Riostras centrales.', 'Arriostrar los triángulos entre sí y colocar el freno.'],
    ojo: ['Corte del puntal en el encuentro: a 45°, diagonal desde 10 cm de la esquina; a 60°, desde 17 cm; el tope del ejión, una perpendicular de 4 cm. A 30°, como a 60° pero invertido.',
      'Truco: tres clavos iguales en triángulo dan 60° y 30°. Si se hacen muchos iguales, hacer una plantilla.'] },

  { id: 'ltablon', fam: 'lat', clase: 3, name: 'Lateral con tablón de obra', ref: 'M6 · 4.4', mat: 'Tablón de obra',
    uso: 'Para estabilizar paredes y muros. Cada sistema: dos tablones a 90° (solera y zapata mural) y un puntal inclinado o tornapunta de dos tablones embridados o empernados. Como mínimo dos sistemas arriostrados.',
    figs: [[g => {
      const G = 50, I = G + 190, L = I - G - 7;
      g.wall(0, G, 30, 280);
      g.rect(30, G + 7, 7, 260).rect(30, G, 300, 7);
      g.poly([[37, G + 7], [57, G + 7], [37, G + 27]], 'aw2');
      g.rect(37, I + 8, 5, 60, 'aw2');
      g.bar(44, I, 37 + L, G + 13, 12).line(44, I - 1, 37 + L, G + 12, 'aln');
      [.25, .5, .75].forEach((f, i) => { const x = 44 + (L - 7) * f, y = I - (I - G - 13) * f; g.bar(x - 7, y - (i % 2 ? 9 : -9), x + 7, y + (i % 2 ? 9 : -9), 3, 'am'); });
      g.cunas(37 + L + 6, G + 7, 5, 12, true).rect(37 + L + 11, G + 7, 60, 5, 'aw2');
      apuFreno(g, 334, G, 1);
      g.ground(0, 370, G).angle(37 + L, G + 13, 40, 180, 135, '45°');
      g.n(1, 33, G + 150, 12, G + 160).n(2, 150, G + 3, 150, G - 25).n(3, 45, G + 12, 70, G + 40).n(4, 40, I + 40, 70, I + 55).n(5, 140, G + 100, 170, G + 120)
        .n(6, 100, G + 140, 120, G + 165).n(7, 37 + L + 9, G + 12, 37 + L + 5, G + 45).n(8, 37 + L + 40, G + 10, 37 + L + 45, G + 40).n(9, 342, G + 8, 350, G + 40);
    }, 'Lateral a 45° con tablón de obra.']],
    parts: [['Zapata mural', 'Tablón contra la pared.'], ['Solera', 'Tablón; deja sitio tras el puntal para el ejión.'], ['Cuña clavada', 'Une solera y zapata a 90°.'], ['Ejión superior', '60 cm y 14 clavos a 45°; 75 cm y 20 clavos a 60°.'],
      ['Puntal inclinado o tornapunta', 'Dos tablones embridados o empernados.'], ['Bridas', 'Alternando la inclinación.'], ['Par de cuñas', 'Uno por sistema, bajo los tablones del tornapunta.'], ['Ejión de la solera', 'Mismo tamaño que el superior.'], ['Freno o carrera', 'Bien anclado: recibe los esfuerzos. Puede sustituirse por otra estructura sana cercana.']],
    datos: [['Ejiones', '45°: 60 cm y 14 clavos · 60°: 75 cm y 20 clavos'], ['Arriostrado', '< 2 m: dos diagonales en cruz entre puntales; más alto: horizontal en medio y cruces arriba y abajo']],
    pasos: ['Limpiar y medir: el punto más dañado será el de inserción.', 'Cortar solera y zapata mural con sitio para los ejiones.', 'Clavar los ejiones; unir solera y zapata a 90° con una cuña clavada.',
      'Colocar zapata y solera; situar el tornapunta y ajustar con su par de cuñas.', 'Arriostrar los sistemas entre sí y colocar el freno tras la solera.'],
    ojo: [] },

  { id: 'lobra', fam: 'lat', clase: 2, name: 'Lateral con puntales de obra', ref: 'M6 · 4.4 y 4.5', mat: 'Puntal de obra',
    uso: 'Ahorra tiempo de corte y ajuste, pero los puntales metálicos no se pueden arriostrar; se arriostran solo zapatas y soleras. Zona extremadamente peligrosa: temporal.',
    figs: [[g => {
      const G = 50, I = G + 190, L = I - G - 20;
      g.wall(0, G, 30, 270).rect(30, G + 10, 10, 250).rect(30, G, 290, 10);
      g.poly([[40, I + 30], [60, I + 10], [60, I - 2], [40, I + 18]], 'aw2');
      g.poly([[40 + L + 16, G + 10], [40 + L + 60, G + 10], [40 + L + 60, G + 40], [40 + L + 46, G + 40]], 'aw2');
      const ax = 56, ay = I + 3, bx = 40 + L + 28, by = G + 28, mx = (ax + bx) / 2, my = (ay + by) / 2;
      g.bar(mx, my, bx, by, 12, 'am').bar(ax, ay, mx, my, 8, 'am2').bar(mx - 4, my + 4, mx + 4, my - 4, 18, 'am3');
      apuFreno(g, 324, G, 1);
      g.ground(0, 360, G);
      g.n(1, 35, G + 130, 12, G + 140).n(2, 50, I + 15, 80, I + 35).n(3, 150, G + 135, 175, G + 160).n(4, 40 + L + 45, G + 25, 40 + L + 40, G + 70).n(5, 200, G + 5, 200, G - 25).n(6, 332, G + 10, 340, G + 45);
    }, 'Lateral a 45° con puntal telescópico.']],
    parts: [['Zapata mural', 'De madera.'], ['Ejión superior cortado a 45°', '60 cm más lo que pida el ángulo; 14 clavos.'], ['Puntal de obra', 'Clavado por los agujeros de su placa.'], ['Ejión inferior a 45°', 'En la solera.'], ['Solera', 'Una pieza de madera u otro puntal de obra con una pequeña solera.'], ['Freno o carrera', 'Anclado.']],
    datos: [['Ángulo', 'Normalmente 45°'], ['Riostras', 'Solo entre zapatas murales y entre soleras']],
    pasos: ['Decidir la zona y el punto de inserción; medir.', 'Cortar la zapata y los ejiones a 45° y clavarlos con 14 clavos.', 'Colocar el puntal y clavarlo por los agujeros de su placa.', 'Preparar y colocar el freno.', 'Anclar la zapata a la pared si hace falta.'],
    ojo: ['Con HOLMATRO también se hacen laterales (volante, solera fija o empotrada) y con cintas tensoras para triangular, como en un vehículo de costado: cintas lo más bajas y pegadas al suelo posible. Solo puntual y temporal.'] },

  /* ---------- Inclinados ---------- */
  { id: 'inclcarga', fam: 'incl', clase: 3, name: 'Inclinado perpendicular a la carga', ref: 'M6 · 4.7.1', mat: 'Madera 10×10 (FEMA)',
    uso: 'Para losas o forjados inclinados más de 3° (5 %) que están firmemente unidos al muro por arriba o anclados al suelo o escombros por abajo: la estructura aguanta la fuerza a lo largo de la carga y el apuntalamiento recoge la perpendicular.',
    figs: [[g => apuIncl(g, 'carga'), 'Sistema perpendicular a la carga: los puntales forman 90° con la losa.']],
    parts: [['Carga', 'Losa unida a la estructura.'], ['Cumbrera', 'Voladizo no mayor de 30 cm.'], ['Puntales', 'Perpendiculares a la carga, ≤ 1,2 m de centro a centro.'], ['Riostra diagonal', 'Une solera, pie y cabeza de los puntales y cumbrera.'],
      ['Medias pletinas', 'Cumbrera–puntal en un lado y opuestas; solera–puntal a cada lado.'], ['Ejiones 5×10×45', 'Tras cada puntal, 14 clavos.'], ['Cuñas', 'Opcionales bajo los puntales y entre estos y los ejiones.'], ['Solera', 'Sobresale 60 cm.'], ['Freno o carrera', 'Anclado con estacas de 2 cm de Ø y 0,5 m, con hueco para las cuñas.']],
    datos: [['Inclinada', 'Más de 3° o del 5 %'], ['Puntales', '≤ 1,2 m entre centros'], ['Entre sistemas', '≤ 1,5 m'], ['Siempre', 'Sistemas dobles arriostrados entre sí, como la torre']],
    pasos: ['Reconocer la carga y poner un apuntalamiento temporal si hace falta.', 'Medir el sistema y la posición de los puntales.', 'Clavar los puntales a la cumbrera con media pletina en un lado, opuestas entre sí.',
      'Clavar los puntales a la solera con media pletina a cada lado; la riostra diagonal une el resto.', 'Copiar el primero para hacer el segundo, igual.', 'Situarlos (≤ 1,5 m) y anclar la carrera con cuñas; se puede clavar una pletina de 30×30 entre solera y freno.', 'Arriostrarlos entre sí como una torre.'],
    ojo: ['Un sistema suelo solo vale como emergencia hasta poner el doble.'] },

  { id: 'inclsuelo', fam: 'incl', clase: 3, name: 'Inclinado perpendicular al suelo', ref: 'M6 · 4.7.2', mat: 'Madera 10×10 (FEMA)',
    uso: 'Cuando la carga no tiene una unión fiable en ninguno de sus extremos: los puntales verticales recogen la fuerza vertical y la fricción contra la carga aguanta la inclinada. Si hay réplicas o la inclinación pasa del 5 %, anclar la cumbrera a la carga o apoyarse en columnas o vigas sanas.',
    figs: [[g => apuIncl(g, 'suelo'), 'Sistema perpendicular al suelo: puntales verticales cortados con el ángulo de la carga.'],
      [g => { const s2 = (x0, z) => { g.rect(x0, 0, 120, 8, 'aw2').rect(x0, 112 + (z ? 0 : 40), 120, 8, 'aw2'); g.rect(x0 + 8, 8, 10, 104 + (z ? 0 : 40)).rect(x0 + 102, 8, 10, 104 + (z ? 0 : 40));
          if (z) g.bar(x0 + 16, 110, x0 + 104, 10, 6, 'aw2'); else { g.bar(x0 + 16, 150, x0 + 104, 10, 6, 'aw2').bar(x0 + 16, 10, x0 + 104, 150, 6, 'aw2'); }
          g.text(x0 + 60, -16, z ? 'Menos de 1,2 m: en Z' : 'Más alto: en X', 10); };
        s2(0, true); s2(170, false); g.ground(-5, 295); }, 'Arriostrado de los dos sistemas por su lado alto.']],
    parts: [['Carga', 'Sin unión fiable en sus extremos.'], ['Cumbrera', 'Voladizo de 30 cm en la parte baja y 60 cm en la alta.'], ['Puntales verticales', 'La cabeza con el ángulo de la carga (trasládalo con la cumbrera contra la estructura y el puntal a plomo).'], ['Riostra diagonal', 'Une solera, puntales y cumbrera.'],
      ['Medias pletinas', 'Cumbrera–puntal en un lado y opuestas; solera–puntal a cada lado.'], ['Ejiones de 45 cm', 'En la cumbrera, tras los puntales.'], ['Cuñas', 'Bajo los puntales, opcionales.'], ['Solera', 'Sobresale 30 cm a cada lado.'], ['Freno o carrera', 'Estacas de 2 cm de Ø y 0,5 m.']],
    datos: [['Puntales', '≤ 1,2 m entre centros'], ['Entre sistemas', '≤ 1,5 m arriostrados en Z o ≤ 2,4 m en X'], ['Arriostrado', 'En Z si la altura < 1,2 m; en X si es mayor']],
    pasos: ['Reconocer la carga y poner un apuntalamiento temporal si hace falta.', 'Medir: voladizos de cumbrera 30 y 60 cm, solera 30 cm a cada lado.', 'Cortar los puntales con el ángulo de la carga y clavarlos a la cumbrera con media pletina.',
      'Clavarlos a la solera con media pletina a cada lado; ejiones de 45 cm en la cumbrera tras los puntales.', 'Copiar el primero para el segundo.', 'Situarlos, anclar la carrera y arriostrarlos en Z o en X por su lado alto.'],
    ojo: [] },

  { id: 'incltablon', fam: 'incl', clase: 3, name: 'Inclinado con tablón de obra', ref: 'M6 · 4.8', mat: 'Tablón de obra',
    uso: 'Un puntal vertical y un puntal inclinado o tornapunta, de dos tablones embridados o empernados cada uno, arriostrados entre sí, con solera, cumbrera y ejiones tras el tornapunta. Siempre dobles, arriostrados y apoyados en otra estructura o en un freno.',
    figs: [[g => apuIncl(g, 'tablon'), 'Sistema inclinado con tablón de obra: puntal vertical y tornapunta.']],
    parts: [['Carga', 'Plano inclinado.'], ['Cumbrera', 'Alero de 30 cm delante del puntal vertical.'], ['Puntal vertical', 'Dos tablones embridados o empernados.'], ['Puntal inclinado o tornapunta', 'Dos tablones.'], ['Ejión en la cumbrera', '60 cm y 14 clavos.'],
      ['Riostra', 'Une puntal y tornapunta.'], ['Solera', 'Detrás del tornapunta, sitio para el ejión (60 cm).'], ['Ejión en la solera', '60 cm y 14 clavos.'], ['Cuñas', 'Tres pares: dos bajo el puntal vertical y uno tras el tornapunta.'], ['Freno o carrera', 'Tras la solera.']],
    datos: [['Pares de cuñas', '3 por sistema'], ['Hueco para cuñas', 'Unos 4 cm']],
    pasos: ['Limpiar y medir teniendo en cuenta la inclinación: decide dónde va el vertical y dónde el inclinado.', 'Cortar y embridar los tablones (restando solera, cumbrera y 4 cm).', 'Cortar solera y cumbrera; clavar los ejiones.',
      'Colocar cumbrera y solera; ajustar el puntal vertical y luego el inclinado con sus cuñas.', 'Comprobar el ajuste y el aplomado del vertical.', 'Colocar el freno tras la solera.'],
    ojo: [] },

  /* ---------- Horizontales ---------- */
  { id: 'horfema', fam: 'hor', clase: 2, name: 'Horizontal o acodalamiento', ref: 'M6 · 5.1', mat: 'Madera 10×10 (FEMA)',
    uso: 'Apeo que aprovecha una estructura resistente cercana: los puntales horizontales o codales trabajan a compresión entre la pared dañada y otra sana (pasillos, edificios contiguos).',
    figs: [[g => {
      g.wall(-30, 0, 30, 310).wall(240, 0, 30, 310);
      g.rect(0, 20, 10, 270).rect(230, 20, 10, 270);
      g.bar(16, 70, 224, 230, 6, 'aw2 back');
      [70, 150, 230].forEach(y => { g.cunas(10, y - 5, 4, 10).cunas(226, y - 5, 4, 10).rect(14, y - 5, 212, 10);
        g.poly([[10, y - 5], [24, y - 5], [24, y - 9], [14, y - 9], [14, y - 19], [10, y - 19]], 'aw2').poly([[230, y - 5], [216, y - 5], [216, y - 9], [226, y - 9], [226, y - 19], [230, y - 19]], 'aw2'); });
      g.bar(16, 230, 224, 70, 6, 'aw2').cunas(237, 100, 3, 16, true).cunas(237, 190, 3, 16, true);
      g.ground(-30, 270).dim(10, 290, 230, 290, '≤ 2,4 m');
      g.n(1, 5, 120, -16, 270).n(2, 120, 150, 120, 125).n(3, 18, 62, 40, 40).n(4, 227, 150, 252, 270).n(5, 70, 115, 60, 190).n(6, 238, 108, 256, 40);
    }, 'Apuntalamiento horizontal con madera 10×10.']],
    parts: [['Zapata mural', 'Vertical y nivelada contra cada pared.'], ['Puntal horizontal o codal', 'Perpendicular a las zapatas; longitud máxima 2,4 m.'], ['Tacos en L', 'Sostienen el codal; alternativa: cuñas de 10×10 o media pletina.'], ['Cuñas de 5×10', 'Entre puntal y zapata, en horizontal.'],
      ['Riostras diagonales', '5×10 o 5×15 en cruz de San Andrés (si no se usa como entrada).'], ['Calzos y cuñas', 'Rellenan huecos entre zapata y pared.']],
    datos: [['Codal', 'Máx. 2,4 m (más: lateral de triángulo)'], ['Entre sistemas', 'Máx. 2,4 m'], ['Entre codales', 'No más de 1 m entre ellos ni hasta el suelo o el techo']],
    pasos: ['Decidir el sitio, apuntalar temporalmente si hace falta y limpiar.', 'Cortar las zapatas, colocarlas y medir entre ellas (restando las cuñas). Cortar los puntales.', 'Clavar los tacos en L en las zapatas.',
      'Colocar las zapatas niveladas y verticales; rellenar con calzos, tacos o cuñas contra la pared.', 'Colocar los puntales perpendiculares a las zapatas y meter las cuñas en horizontal.', 'Riostras en cruz si no es un paso.'],
    ojo: ['Si el muro está muy dañado, tableros entre la pared y las zapatas.'] },

  { id: 'hortablon', fam: 'hor', clase: 2, name: 'Horizontal con tablón de obra', ref: 'M6 · 5.1.2', mat: 'Tablón de obra',
    uso: 'El codal (pieza horizontal que impide que se acerquen dos elementos) de al menos dos tablones embridados, con un tablón vertical como zapata mural a cada lado y tornapuntas y jabalcones apoyados en ejiones para darle estabilidad.',
    figs: [[g => {
      g.wall(-30, 0, 30, 300).wall(300, 0, 30, 300);
      g.rect(0, 10, 7, 280).rect(293, 10, 7, 280);
      const y = 150; g.cunas(7, y - 6, 4, 12).cunas(289, y - 6, 4, 12).rect(11, y - 6, 278, 12).line(11, y, 289, y, 'aln');
      [80, 220].forEach(x => g.bar(x - 6, y - 7, x + 6, y + 7, 3, 'am'));
      g.bar(70, y + 7, 7, y + 70, 10).bar(70, y - 7, 7, y - 70, 10).bar(230, y + 7, 293, y + 70, 10).bar(230, y - 7, 293, y - 70, 10);
      g.rect(7, y + 78, 5, 60, 'aw2').rect(7, y - 138, 5, 60, 'aw2').rect(288, y + 78, 5, 60, 'aw2').rect(288, y - 138, 5, 60, 'aw2');
      g.rect(78, y + 6, 60, 5, 'aw2').rect(78, y - 11, 60, 5, 'aw2').rect(162, y + 6, 60, 5, 'aw2').rect(162, y - 11, 60, 5, 'aw2');
      g.ground(-30, 330);
      g.n(1, 3, 260, -16, 278).n(2, 150, y, 150, y + 40).n(3, 40, y + 40, 60, y + 85).n(4, 10, y + 110, 30, y + 125).n(5, 9, y, 30, y - 20).n(6, 80, y, 95, y - 40).n(7, 100, y + 8, 110, y + 30);
    }, 'Codal de tablones embridados con tornapuntas y jabalcones.']],
    parts: [['Zapata mural', 'Un tablón vertical a cada lado.'], ['Puntal horizontal o codal', 'Dos o más tablones embridados o empernados; trabaja a compresión como un pie derecho.'], ['Tornapuntas y jabalcones', 'Apoyados en los ejiones y ajustados con cuñas.'],
      ['Ejiones de las zapatas', '60 cm y 14 clavos a 45°; 75 cm y 20 clavos a 60°. Imprescindibles: que la merma de la madera no deje caer el codal.'], ['Cuñas', 'Seis pares: cuatro para jabalcones y tornapuntas y dos para los tablones del codal.'], ['Bridas', 'Unen los tablones del codal.'], ['Ejiones del codal', 'Arriba y abajo.']],
    datos: [['Pares de cuñas', '6'], ['Ejiones', '45°: 60 cm/14 clavos · 60°: 75 cm/20 clavos'], ['Elevado', 'Se puede montar sobre calzos y retirarlos al final']],
    pasos: ['Limpiar y medir.', 'Cortar los tablones (restando cuñas, unos 4 cm) y embridarlos.', 'Cortar las zapatas con sitio para los ejiones.', 'Clavar los ejiones en las zapatas y arriba y abajo del codal.', 'Colocar zapatas y codal y ajustar con cuñas.', 'Colocar tornapuntas y jabalcones y ajustarlos con cuñas.'],
    ojo: [] },

  { id: 'horpuntales', fam: 'hor', clase: 2, name: 'Horizontal con puntales de obra o HOLMATRO', ref: 'M6 · 5.2 y 5.3', mat: 'Puntal de obra / HOLMATRO',
    uso: 'Para soportar un muro dañado llevando su carga a otro muro sano cercano. Se puede prefabricar fuera (placas clavadas a las zapatas, puntales recogidos) y extender en el sitio.',
    figs: [[g => {
      g.wall(-30, 0, 30, 300).wall(240, 0, 30, 300).rect(0, 10, 10, 280).rect(230, 10, 10, 280);
      [60, 150, 240].forEach(y => apuProp(g, 10, y, 230, true));
      g.ground(-30, 270).dim(110, 0, 110, 60, '≤ 1 m').dim(150, 60, 150, 150, '≤ 1 m');
      g.n(1, 5, 120, -16, 270).n(2, 60, 150, 50, 190).n(3, 12, 240, 40, 270);
    }, 'Puntales horizontales entre dos zapatas murales.']],
    parts: [['Zapata mural', 'En la pared sana y en la que se apuntala.'], ['Puntal horizontal', 'Perpendicular a las zapatas.'], ['Placa o cabezal', 'Clavado a la zapata (clavo doblado); en HOLMATRO, cabezales a la misma altura en ambas zapatas.']],
    datos: [['Distancia entre muros', 'Máx. 2,4 m (más: lateral de triángulo)'], ['Entre sistemas', 'Máx. 2,4 m'], ['Entre puntales', 'No más de 1 m, ni hasta el suelo o el techo']],
    pasos: ['Medir de muro a muro quitando el mínimo escombro.', 'Cortar las zapatas y decidir el número de puntales.', 'Clavar placas o cabezales en lugar seguro, a la misma altura en las dos zapatas.',
      'Colocar las zapatas, conectar y extender los puntales. El último apriete de hidráulicos y neumáticos, a mano.', 'Comprobar horizontalidad y aplomado; recoger mangueras.'],
    ojo: ['Si el muro está muy dañado, tableros entre la pared y las zapatas.'] },

  /* ---------- Puertas y ventanas ---------- */
  { id: 'hueco', fam: 'hueco', clase: 2, name: 'Puerta o ventana a medida', ref: 'M6 · 5.4.1', mat: 'Madera 10×10 (FEMA)',
    uso: 'El hueco es de lo primero que acusa los fallos del edificio. Se apuntala en los pasos obligados del rescate (también ventanas usadas como acceso). A medida si la estructura está muy dañada, es grande o son pocos huecos.',
    figs: [[g => {
      g.wall(0, 0, 200, 300).rect(40, 40, 120, 200, 'ahole');
      g.rect(40, 40, 116, 10).cunas(156, 40, 4, 10).rect(44, 230, 116, 10).cunas(40, 230, 4, 10);
      [45, 155].forEach(x => { g.cunas(x - 5, 50, 10, 4); g.rect(x - 5, 54, 10, 176); });
      g.rect(50, 50, 8, 8, 'aw2').rect(142, 50, 8, 8, 'aw2');
      g.bar(52, 60, 148, 226, 6, 'aw2 opt').bar(52, 226, 148, 60, 6, 'aw2 opt');
      g.plate(40, 210, 22, 30, 'ap2').plate(138, 210, 22, 30, 'ap2');
      g.rect(80, 240, 8, 3, 'ac').rect(115, 240, 8, 3, 'ac');
      g.ground(0, 200);
      g.n(1, 100, 45, 100, 18).n(2, 158, 45, 182, 30).n(3, 100, 235, 100, 262).n(4, 42, 235, 18, 262).n(5, 155, 140, 182, 140).n(6, 51, 225, 18, 212).n(7, 54, 54, 18, 70).n(8, 100, 143, 120, 168).n(9, 84, 242, 70, 280);
    }, 'Apuntalamiento de ventana a medida con madera 10×10.']],
    parts: [['Solera', 'Lo más nivelada posible (tacos y calzos si hace falta).'], ['Cuñas de 5×10×30 de la solera', 'En un extremo, metidas a la vez con golpes ligeros.'], ['Cumbrera', 'Ajustada; calzos y cuñas contra la estructura si hace falta.'], ['Cuñas de la cumbrera', 'En el lado opuesto a las de la solera.'],
      ['Puntales', 'Contra los laterales del hueco, a plomo. El primero, bajo las cuñas de la cumbrera.'], ['Media pletina', 'En un lado, o riostras, uniendo cumbrera y puntales.'], ['Tacos', 'Encierran las cuñas: tres clavos en horizontal al puntal y dos en diagonal a la solera.'],
      ['Riostras diagonales', 'En X a cada lado si no se va a usar como acceso.'], ['Calzos', 'Entre cumbrera y estructura si hace falta.']],
    datos: [['Cuñas', '5×10×30'], ['Tacos', '3 clavos al puntal y 2 a la solera']],
    pasos: ['Decidir dónde y medir; apuntalar temporalmente si hace falta, limpiar y quitar marcos y cerramientos.', 'Cortar solera, cumbrera y puntales restando las cuñas.', 'Instalar la solera con las cuñas en un extremo.',
      'Instalar la cumbrera con las cuñas en el lado opuesto.', 'Meter los puntales a los lados (el primero bajo las cuñas de la cumbrera) y calzarlos con cuñas, a plomo.', 'Clavar riostras o pletinas a cumbrera y puntales y los tacos que encierran las cuñas.', 'Riostras diagonales si no es un paso.'],
    ojo: ['Si no se sabe de dónde viene el esfuerzo, mejor en aspa (cruz de San Andrés). Si es un paso, marco completo con las esquinas de arriba reforzadas y sin riostras.'] },

  { id: 'huecoprefab', fam: 'hueco', clase: 2, name: 'Puerta o ventana prefabricado', ref: 'M6 · 5.4.2', mat: 'Madera 10×10 (FEMA)',
    uso: 'Con daños menores o muchos huecos iguales: se prefabrican todos con la misma medida (las puertas y ventanas de un edificio suelen ser iguales) y se ajustan en cada hueco con cuñas y calzos.',
    figs: [[g => {
      g.wall(0, 0, 200, 300).rect(40, 40, 120, 200, 'ahole');
      g.rect(42, 42, 116, 10).rect(42, 226, 116, 10).rect(42, 52, 10, 174).rect(148, 52, 10, 174);
      [[52, 52, 1, 1], [148, 52, -1, 1], [52, 226, 1, -1], [148, 226, -1, -1]].forEach(([x, y, dx, dy]) => g.tri([[x, y], [x + dx * 30, y], [x, y + dy * 30]]));
      g.cunas(80, 236, 30, 4).cunas(158, 120, 2, 30, true);
      g.bar(56, 58, 144, 220, 6, 'aw2 opt').bar(56, 220, 144, 58, 6, 'aw2 opt');
      g.ground(0, 200).dim(170, 42, 170, 236, '4 cm menos');
      g.n(1, 100, 47, 100, 20).n(2, 60, 231, 40, 262).n(3, 47, 140, 18, 140).n(4, 60, 60, 80, 85).n(5, 95, 238, 130, 268).n(6, 100, 140, 120, 165);
    }, 'Cuadro prefabricado 4 cm menor que el hueco, con medias pletinas triangulares.'],
    [g => {
      g.wall(0, 0, 200, 300).poly([[38, 40], [162, 46], [158, 244], [42, 236]], 'ahole');
      g.bar(40, 46, 160, 52, 10).bar(42, 231, 158, 239, 10);
      g.cunas(55, 52, 10, 4).rect(55, 56, 10, 172).cunas(135, 57, 10, 4).rect(135, 61, 10, 174);
      g.bar(66, 210, 92, 233, 6, 'aw2').bar(134, 210, 108, 236, 6, 'aw2');
      g.ground(0, 200);
    }, 'Hueco descuadrado: solera y cumbrera ajustadas y puntales calzados con cuñas.']],
    parts: [['Solera', 'Ajustada con cuñas, calzos o similares.'], ['Cumbrera', 'Ajustada igual.'], ['Puntales', 'Aprovechan el ancho, sin quedar en el extremo de cumbrera y solera.'], ['Medias pletinas triangulares', '30 cm cada lado recto, 13 clavos, en las cuatro esquinas y por las dos caras.'], ['Cuñas', 'Para ajustarlo al hueco.'], ['Riostras diagonales', 'En X a cada lado si no es vía de acceso.']],
    datos: [['Medida', '4 cm menos de ancho y de alto que el hueco'], ['Esquinas', 'Media pletina triangular de 30 cm, 13 clavos, por las dos caras']],
    pasos: ['Decidir la medida (la de los huecos de la estructura).', 'Cortar solera, cumbrera y puntales; montar el cuadro con medias pletinas triangulares.', 'Dar la vuelta y clavar las del otro lado.', 'Llevarlo al hueco y ajustarlo con calzos, cuñas o tacos.',
      'Si el hueco está descuadrado: solera y cumbrera ajustadas; puntales con cuñas; uniones cumbrera con medias pletinas o riostras y solera con riostras.'],
    ojo: [] },

  { id: 'recercado', fam: 'hueco', clase: 2, name: 'Huecos con tablón de obra: recercado y aspa', ref: 'M6 · 5.4.3', mat: 'Tablón de obra',
    uso: 'Se empieza por el recercado (forrar los lados con madera para recoger la carga). Con daños leves y sin empujes laterales puede bastar; si no, se refuerza con puntales intermedios o con el aspa.',
    figs: [[g => {
      const frame = x0 => { g.wall(x0, 0, 120, 260).rect(x0 + 15, 20, 90, 220, 'ahole'); g.rect(x0 + 15, 20, 90, 7).rect(x0 + 15, 233, 90, 7).rect(x0 + 15, 27, 7, 206).rect(x0 + 98, 27, 7, 206); };
      frame(0); frame(140); frame(280);
      g.rect(162, 126, 76, 8).cunas(158, 126, 4, 8);
      g.bar(302, 30, 378, 230, 10).bar(302, 230, 378, 30, 10, 'aw2');
      g.text(60, -16, 'Recercado', 10).text(200, -16, 'Con puntal intermedio', 10).text(340, -16, 'Aspa', 10);
      g.n(1, 60, 236, 60, 268).n(2, 18, 130, 2, 150).n(3, 200, 130, 200, 160).n(4, 340, 130, 340, 165);
    }, 'Recercado, recercado reforzado y aspa o cruz de San Andrés.']],
    parts: [['Cabecero y peana', 'Tablones arriba y abajo del recercado.'], ['Jambas o montantes', 'Los laterales trabajan como puntales verticales.'], ['Puntal intermedio', 'Horizontal o vertical, según de dónde venga la carga.'], ['Aspa o cruz de San Andrés', 'Dos tablones cruzados entre esquinas opuestas, con los encuentros cortados para encajar en el recercado. La solución más sólida.']],
    datos: [['Paso obligado', 'Marco completo con las esquinas superiores acarteladas y sin aspa']],
    pasos: ['Recercar el hueco: cabecero, peana y jambas ajustados con cuñas.', 'Si hay más carga, puntales intermedios horizontales o verticales.', 'Para la mayor solidez, el aspa con los encuentros cortados a medida.'],
    ojo: [] },

  { id: 'huecopuntales', fam: 'hueco', clase: 2, name: 'Huecos con puntales de obra o HOLMATRO', ref: 'M6 · 5.4.3 a y 5.6', mat: 'Puntal de obra / HOLMATRO',
    uso: 'Rápido para estabilizar un hueco mientras se prepara madera. Siempre con solera y cumbrera para recoger y repartir la carga.',
    figs: [[g => {
      g.wall(0, 0, 200, 300).rect(40, 40, 120, 200, 'ahole');
      g.rect(40, 40, 120, 10).rect(40, 230, 120, 10);
      g.bar(46, 54, 154, 226, 6, 'aw2 opt'); apuProp(g, 60, 50, 230); apuProp(g, 140, 50, 230); g.bar(46, 226, 154, 54, 6, 'aw2 opt');
      g.ground(0, 200).dim(40, 252, 51, 252, '≥ 10');
      g.n(1, 100, 235, 100, 268).n(2, 140, 160, 182, 160).n(3, 100, 45, 100, 18).n(4, 100, 140, 120, 175);
    }, 'Dos puntales con cumbrera y solera; en X si no es un paso.']],
    parts: [['Cumbrera', 'Madera 10×10 del ancho del hueco.'], ['Puntales', 'De obra (placas clavadas y clavos doblados) o HOLMATRO (cabezales clavados, paralelos).'], ['Solera', 'Madera 10×10.'], ['Riostras en X', 'De solera a cumbrera si no es un paso.']],
    datos: [['Margen', '≥ 10 cm a cada lado de los puntales, para cambiarlos luego por madera'], ['HOLMATRO', 'Descontar 20 cm de solera y cumbrera; conexiones hacia donde se accionan']],
    pasos: ['Medir ancho y alto del hueco.', 'Cortar cumbrera y solera; montar los puntales a la altura menos 20 cm.', 'Clavar placas o cabezales paralelos dejando 10 cm a cada lado.', 'Llevarlo, extender y ajustar (el último apriete a mano). Nivel y recoger.'],
    ojo: [] },

  /* ---------- Especiales ---------- */
  { id: 'percha', fam: 'esp', name: 'Apeo de voladizos y balcones: percha', ref: 'M6 · 6.1.1', mat: 'Madera',
    uso: 'Los puntales del voladizo no pueden apoyar en el forjado de abajo (le pasarían la carga): hay que llevar el esfuerzo al interior del edificio. La percha lo hace desde la misma planta; también sirve para izar o bajar cargas con una polea en su extremo.',
    figs: [[g => {
      g.wall(200, 0, 25, 300).rect(200, 0, 25, 222, 'ahole').wall(-10, 280, 235, 20);
      g.rect(225, -12, 125, 12, 'aload').rect(-10, -12, 210, 12, 'aload').rect(225, -12, 125, 12, 'aload');
      g.rect(150, 0, 100, 10);
      g.rect(205, 10, 10, 196).rect(60, 206, 300, 12);
      g.rect(50, 270, 110, 10).rect(75, 218, 10, 52).rect(135, 218, 10, 52);
      g.plate(198, 196, 24, 28, 'ap2').cunas(150, 10, 30, 3);
      g.rect(262, -36, 100, 12, 'aw2').line(355, 212, 355, -24, 'acab');
      g.n(1, 175, 5, 160, -32).n(2, 210, 120, 180, 120).n(3, 300, 212, 330, 240).n(4, 355, 100, 375, 120).n(5, 300, -30, 300, -60).n(6, 100, 275, 100, 296).n(7, 80, 240, 50, 240).n(8, 210, 210, 185, 240);
    }, 'Percha (corte): solera en el vano, puntal, percha, cables a una viga bajo el balcón y cumbrera contra el techo.']],
    parts: [['Solera', 'Ajustada al vano de la puerta o ventana del balcón.'], ['Puntal', 'Vertical y perpendicular a la solera.'], ['Percha', 'Transversal a la solera; recibe la carga.'], ['Cables metálicos, cuerdas o eslingas', 'De la percha a la viga.'], ['Viga', 'Colocada bajo el balcón.'],
      ['Cumbrera', 'Ajusta el sistema contra el techo del interior.'], ['Pequeños puntales', 'Unen la cumbrera con la percha.'], ['Cuñas y medias pletinas', 'Ajustan y unen el sistema.']],
    datos: [['Balcón grande o pesado', 'Dos o más perchas']],
    pasos: ['Colocar la solera en el vano y el puntal vertical.', 'Montar la percha transversal y la cumbrera contra el techo con dos puntales cortos.', 'Pasar la viga bajo el balcón y colgarla de la percha con cables, cuerdas o eslingas.', 'Ajustar con cuñas y unir con medias pletinas.'],
    ojo: [] },

  { id: 'voladizoinf', fam: 'esp', name: 'Voladizo desde el piso inferior', ref: 'M6 · 6.1.1', mat: 'Madera / puntal de obra',
    uso: 'Para apuntalar un balcón o voladizo desde el piso de abajo pero llevando su carga al interior del edificio. También se hace con puntales de obra (con durmiente de canto embridado).',
    figs: [[g => {
      g.wall(200, 0, 25, 260).rect(200, 0, 25, 200, 'ahole').rect(-10, 260, 360, 18, 'aload');
      g.rect(60, 0, 130, 10).rect(60, 250, 130, 10);
      [75, 175].forEach(x => apuPost(g, x, 10, 250));
      g.rect(70, 120, 110, 9, 'aw2').bar(80, 244, 170, 128, 6, 'aw2');
      g.rect(270, 250, 70, 10);
      const fx = 40, fy = 16; g.bar(fx + 6, fy, 300, 246, 12).rect(296, 236, 5, 14, 'aw2').rect(fx - 30, 10, 40, 6, 'aw2');
      g.rect(10, 0, 10, 16, 'aw').rect(20, 10, 40, 6, 'aw2');
      g.ground(-10, 350);
      g.n(1, 300, 270, 320, 296).n(2, 125, 180, 125, 205).n(3, 170, 140, 210, 210).n(4, 305, 255, 340, 240).n(5, 298, 243, 330, 225).n(6, 15, 8, 0, 40).n(7, 125, 5, 125, -24);
    }, 'Apeo vertical de doble puntal dentro y puntal inclinado bajo el voladizo.']],
    parts: [['Voladizo o balcón', 'Lo que hay que sostener.'], ['Apeo vertical de doble puntal', 'Dentro: refuerza el forjado del voladizo y ancla el freno del inclinado.'], ['Puntales inclinados', 'Un par, con ejiones arriba y abajo.'], ['Cumbrera bajo el voladizo', 'Recoge la carga.'],
      ['Ejiones', 'Arriba y abajo de los inclinados.'], ['Freno o carrera', 'Unido al apeo vertical.'], ['Solera', 'Del apeo vertical.']],
    datos: [['Uniones', 'Pletinas en el par inclinado y medias pletinas en el par vertical, todo arriostrado']],
    pasos: ['Montar dentro el apeo vertical de doble puntal bajo el forjado.', 'Colocar el freno anclado a ese apeo.', 'Colocar el par de puntales inclinados con sus ejiones hasta la cumbrera bajo el voladizo.', 'Unir con pletinas y arriostrar.'],
    ojo: [] },

  { id: 'asnillas', fam: 'esp', name: 'Apeo con asnillas', ref: 'M6 · 6.1', mat: 'Madera',
    uso: 'Apeo tradicional: «borriquetas» de dos parejas de tornapuntas contrapuestas con tirantes en la base (contra el empuje horizontal), unidas en cabeza por una aguja o marrano que recoge la carga, y arriostradas.',
    figs: [[g => {
      apuSlab(g, 40, 282, 220, 30);
      g.rect(0, 0, 300, 14);
      g.bar(40, 14, 140, 252, 18).bar(260, 14, 160, 252, 18);
      g.rect(60, 252, 180, 30).line(60, 262, 240, 262, 'aln').line(60, 272, 240, 272, 'aln');
      g.rect(132, 232, 36, 6, 'am').rect(132, 244, 36, 6, 'am');
      g.line(40, 30, 260, 30, 'acab').rect(4, 14, 26, 6, 'aw2').rect(270, 14, 26, 6, 'aw2');
      g.bar(70, 120, 230, 120, 6, 'aw2');
      g.ground(-5, 305);
      g.n(1, 220, 267, 270, 270).n(2, 80, 110, 50, 140).n(3, 150, 240, 190, 210).n(4, 150, 30, 150, 60).n(5, 150, 7, 150, -24).n(6, 120, 120, 120, 95).n(7, 15, 18, 0, 50);
    }, 'Asnilla: dos tornapuntas contrapuestas, aguja arriba y tirante abajo.']],
    parts: [['Aguja o marrano', 'Pieza horizontal (dos o tres tablones) que recoge la carga.'], ['Tornapuntas', 'De dos o tres tablones, contrapuestas.'], ['Brida en la cabeza', 'Impide el giro y el desplazamiento de la aguja.'], ['Tirante metálico', 'Contrarresta el empuje horizontal en la base.'],
      ['Durmiente', 'Puede trabajar como tirante si se clavan ejiones tras las tornapuntas.'], ['Riostras', 'De tabloncillo, arriostrado transversal.'], ['Ejiones', 'Alternativa al tirante.']],
    datos: [['Sistema', 'Dos pares de tornapuntas arriostrados y una aguja']],
    pasos: ['Asegurar el contrarresto horizontal con tirantes metálicos fiables (o ejiones en el durmiente).', 'Embarbillar las cabezas de las tornapuntas y poner la brida.', 'Arriostrar transversalmente los dos pares.'],
    ojo: ['El embarbillado no da esfuerzo a hienda (lo compensa la tornapunta simétrica), pero sí el giro de la aguja: por eso la brida.'] },

  { id: 'puente', fam: 'esp', name: 'Puente de apeo', ref: 'M6 · 6.1', mat: 'Madera / perfil metálico',
    uso: 'Una pieza horizontal resistente (puente) sobre dos verticales (pies derechos). Se usa cuando los elementos verticales no pueden estar en línea con la carga.',
    figs: [[g => {
      g.wall(70, 300, 160, 40);
      g.rect(0, 0, 60, 10).rect(240, 0, 60, 10);
      g.rect(20, 10, 10, 260).rect(30, 10, 10, 260).rect(260, 10, 10, 260).rect(270, 10, 10, 260);
      g.rect(0, 270, 300, 30).line(0, 280, 300, 280, 'aln').line(0, 290, 300, 290, 'aln');
      [[14, 240], [40, 240], [254, 240], [280, 240]].forEach(([x, y]) => g.rect(x, y, 6, 80, 'aw2'));
      [255, 310].forEach(y => { g.rect(12, y - 2, 36, 4, 'am').rect(252, y - 2, 36, 4, 'am'); });
      g.ground(-5, 305);
      g.n(1, 150, 285, 150, 325).n(2, 17, 300, -12, 312).n(3, 30, 255, -12, 255).n(4, 30, 140, -12, 140).n(5, 30, 5, 30, -24).n(6, 150, 320, 205, 345);
    }, 'Puente de apeo: puente sobre dos pies derechos, con orejas y bridas.'],
    [g => {
      g.rect(0, 0, 60, 10).rect(240, 0, 60, 10).rect(20, 10, 20, 290).rect(260, 10, 20, 290).rect(0, 270, 300, 30);
      g.bar(40, 200, 110, 270, 12).bar(260, 200, 190, 270, 12).line(40, 120, 260, 120, 'acab');
      g.ground(-5, 305).text(150, 128, 'tirante', 10).text(80, 220, 'jabalcón', 10, 'start');
    }, 'Puente con jabalcones (menos flexión del puente) y tirantes contra el empuje en los pies derechos.']],
    parts: [['Puente', 'Tablones embridados o perfil metálico IPN o HEB.'], ['Orejas', 'No escatimar su longitud: impiden que el puente se mueva o gire.'], ['Bridas de atado', 'Lo más cerca posible de las caras de arriba y abajo.'], ['Pies derechos', 'De dos o tres tablones, arriostrados en ambas direcciones si se puede.'], ['Durmiente', 'Según la carga.'], ['Carga', 'Fuera de la línea de los pies derechos.']],
    datos: [['Variante', 'Con jabalcones y tirantes metálicos']],
    pasos: ['Asentar los durmientes y levantar los pies derechos.', 'Apoyar bien el puente sobre la cabeza de los pies derechos con orejas largas.', 'Atar con bridas cerca de las caras superior e inferior.', 'Arriostrar los pies derechos.'],
    ojo: [] },

  /* ---------- Patrimonio (M8) ---------- */
  { id: 'arco', fam: 'pat', name: 'Apuntalamiento de arcos', ref: 'M8 · 2', mat: 'Madera / HOLMATRO', arcos: true,
    uso: 'Primero se ve si el arco está dañado o intacto. Si no lo está: se prepara el cuadro (solera, puntales y cumbrera bajo la parte recta) y sobre él la cercha (todo el arco de arriba, hecha de camones), a la medida del arco con una plantilla, sostenida por tres puntales.',
    figs: [[g => {
      const r = 100, cx = 150, ya = 200;
      g.wall(0, 0, 300, 330);
      const arc = []; for (let i = 0; i <= 40; i++) { const a = Math.PI * i / 40; arc.push([cx + r * Math.cos(a), ya + r * Math.sin(a)]); }
      g.poly([[cx + r, 0], ...arc, [cx - r, 0]], 'ahole');
      g.rect(54, 0, 192, 10);
      [60, 240].forEach(x => apuPost(g, x, 10, 190)); g.rect(50, 190, 200, 10);
      g.bar(66, 160, 90, 188, 9).bar(234, 160, 210, 188, 9);
      g.rect(145, 200, 10, 88);
      g.bar(150, 205, 90, 270, 9).bar(150, 205, 210, 270, 9);
      const cer = (a1, a2) => { const pts = []; for (let i = 0; i <= 10; i++) { const a = a1 + (a2 - a1) * i / 10; pts.push([cx + (r - 2) * Math.cos(a), ya + (r - 2) * Math.sin(a)]); }
        for (let i = 10; i >= 0; i--) { const a = a1 + (a2 - a1) * i / 10; pts.push([cx + (r - 18) * Math.cos(a), ya + (r - 18) * Math.sin(a)]); } g.poly(pts, 'aw2'); };
      cer(0.05, .75); cer(.8, 1.53); cer(1.61, 2.34); cer(2.39, 3.09);
      g.plate(140, 186, 20, 18, 'ap2').plate(45, 180, 22, 22, 'ap2').plate(233, 180, 22, 22, 'ap2');
      g.ground(0, 300);
      g.n(1, 150, 5, 150, -24).n(2, 60, 100, 30, 100).n(3, 150, 195, 110, 168).n(4, 78, 174, 30, 172).n(5, 150, 250, 112, 250).n(6, 190, 248, 225, 240).n(7, 230, 245, 268, 260).n(8, 245, 190, 270, 200).n(9, 240, 12, 268, 30);
    }, 'Arco de medio punto: el cuadro (de solera a cumbrera) y la cercha, formada por camones.']],
    parts: [['Solera', 'Base de todo, asentada y nivelada.'], ['Puntales o pies derechos', 'En los extremos; uno intermedio por cada 1,50 m de luz.'], ['Cumbrera', 'Cierra el cuadro; a partir de aquí, la cercha.'], ['Jabalcones', 'En cada puntal lateral.'],
      ['Pendolón', 'Pieza central de la cumbrera hacia la clave.'], ['Puntales de la cercha', 'Uno vertical y dos inclinados desde el centro de la cumbrera, ajustados con cuñas.'], ['Camones', 'Cada pieza curva de la cercha, con el perfil del arco, de tablón de 20×5 (se respeta un tercio del tablón).'], ['Pletinas de contrachapado', 'En las uniones (mejor con pistola de clavos, sin golpes).'], ['Cuñas', 'Bajo los puntales.']],
    datos: [['Puntal intermedio', 'Uno por cada 1,50 m de luz'], ['División', 'Lo ideal: ángulo central a 90° y los demás a 45°'], ['HOLMATRO', 'Solo urgente (rescate) y con solera y cumbrera; mejor mecánicos que hidráulicos. Retirarlo al poner madera']],
    pasos: ['Valorar el arco. Si está intacto, montar el cuadro: solera, puntales en los extremos y cumbrera, con jabalcones.', 'Dividir el arco: horizontal entre las bases y su mediatriz da el centro; las mediatrices de cada mitad, los cuartos.',
      'Copiar el perfil de cada tramo en cartón (plantilla) o con un peine copiador si está deformado, y pasarlo al tablón.', 'Cortar los camones con motosierra siguiendo el trazo despacio.', 'Colocar la cercha con sus tres puntales y ajustar con cuñas; rellenar todos los huecos (también junto al pendolón).'],
    ojo: ['Además de funcional, el apuntalamiento de un bien cultural tiene que ser estético.'] },

  { id: 'columna', fam: 'pat', name: 'Protección y estabilización de columnas', ref: 'M8 · 4.2 y 5', mat: 'Madera y eslingas',
    uso: 'Para columnas de mampostería (circulares o rectangulares, hasta 90 cm) aplastadas por compresión, con pandeo, hinchamiento o pérdida de material: las cintas tensoras aumentan su resistencia por retención lateral.',
    figs: [[g => {
      apuSlab(g, -10, 300, 200, 16);
      g.rect(40, 0, 100, 18).rect(40, 282, 100, 18);
      g.rect(55, 18, 70, 264, 'aload');
      [55, 75, 95, 115].forEach(x => g.rect(x - 1, 22, 12, 256, 'aw'));
      [50, 110, 170, 230].forEach(y => g.rect(48, y, 84, 6, 'aes'));
      g.rect(128, 112, 10, 8, 'am3');
      g.ground(-10, 200);
      g.n(1, 64, 150, 20, 150).n(2, 104, 200, 160, 200).n(3, 132, 113, 165, 110).n(4, 90, 9, 90, -24).n(5, 90, 291, 160, 290);
    }, 'Columna con maderos verticales y eslingas; solera y cumbrera cuajada.'],
    [g => {
      g.rect(55, 0, 70, 300, 'aload');
      for (let i = 0; i < 30; i++) { const y = i * 10; if (i % 2) g.rect(30, y, 120, 10); else g.rect(35, y, 10, 10).rect(135, y, 10, 10); }
      g.ground(0, 180).dim(160, 0, 160, 300, '≤ 3 × w').dim(30, -14, 150, -14, 'w');
    }, 'Zampeado alrededor de la columna: altura máxima 3 veces la base.']],
    parts: [['Columna dañada', 'Con pandeo, hinchamiento o expulsiones laterales de material.'], ['Maderos', '10×10 o tablón de 20×7 según la carga y el daño.'], ['Eslingas o cintas tensoras', 'Tensadas a mano con la palanca, hasta el máximo de un operador.'], ['Solera', 'Base.'], ['Cumbrera cuajada', 'Mayor apoyo y sujeción.']],
    datos: [['Columnas', 'Hasta 90 cm de diámetro; rectangulares con lados en relación < 2'], ['Cintas', 'De 5 o 7,5 cm; número y separación según el daño'], ['Esquinas', 'Piezas de madera redondeadas sobre tablas de ≥ 2,5 cm'],
      ['Zampeado', 'Altura ≤ 3 × base; largo del madero = altura/3 + 20 cm']],
    pasos: ['Limpiar salientes que puedan dañar las cintas sin quitar partes estructurales.', 'Esquinas protegidas con madera redondeada (o ángulos metálicos con antioxidante claro).', 'Tensar las cintas de forma gradual, con los cierres opuestos y en el orden de la ficha.',
      'Varias columnas: unirlas entre sí solapando (tablón de 20×7 y bridas). Una sola: frenarla con las cercanas para repartir la carga.'],
    ojo: ['No vale para pilares de hormigón armado.'] },

  { id: 'fachada', fam: 'pat', name: 'Estabilización de fachadas', ref: 'M8 · 3 y 4', mat: 'Barras pasantes / eslingas',
    uso: 'Revestimiento estructural de muros de carga de mampostería con pandeo: barras pasantes que sujetan un encofrado de madera por las dos caras. Con eslingas textiles y tablones se estabilizan fachadas, torres y espadañas (L’Aquila 2009).',
    figs: [[g => {
      g.wall(80, 0, 60, 320);
      [0, 1].forEach(k => { const x = k ? 140 : 72; [20, 120, 220].forEach(y => g.rect(x, y, 8, 80)); g.rect(k ? 148 : 62, 10, 10, 300, 'aw2'); });
      [60, 160, 260].forEach(y => { g.rect(52, y - 1.5, 116, 3, 'am'); g.rect(48, y - 8, 4, 16, 'am3').rect(168, y - 8, 4, 16, 'am3'); });
      g.ground(20, 200);
      g.n(1, 110, 300, 110, 335).n(2, 76, 100, 40, 100).n(3, 66, 200, 30, 220).n(4, 110, 160, 185, 180).n(5, 170, 60, 195, 40);
    }, 'Muro revestido: encofrado por las dos caras y barras pasantes tensadas.']],
    parts: [['Muro de mampostería', 'Hasta unos 80 cm (largo de la broca).'], ['Tablones del encofrado', 'Recogen el muro.'], ['Largueros', 'Reparten el apriete.'], ['Barras pasantes', 'Contienen el pandeo transversal.'], ['Placas y tuercas', 'Se tensan desde el lado con mejor escape.']],
    datos: [['Barras', 'Muro < 50 cm: Ø mín. 6 mm · 50–80 cm: Ø mín. 8 mm'], ['Eslingas', 'Tablones (20×5, 10×10 o tablilla) entre cinta y estructura; trozos de manguera clavados como pasacintas y bisagras en las esquinas'],
      ['Equipo de eslingas', 'Mín. dos con las eslingas y dos dando material, todos anclados con arnés']],
    pasos: ['Apuntalar antes los forjados que cargan en el muro.', 'Taladrar, pasar las barras y montar el encofrado por las dos caras.', 'Tensar desde el lado con mejor vía de escape.', 'Con eslingas: misma distancia entre cintas, menor cuanto peor esté o más pese.'],
    ojo: ['Solo con autorización expresa de la autoridad que tutela el bien.', 'No en muros muy inestables: las vibraciones del taladro podrían derrumbarlos.', 'En altura, técnicas de rescate vertical: todo el material atado.'] }
];
const apuGet = id => APU.find(t => t.id === id);

/* ---------- Dibujos compartidos ---------- */
// Lateral de solera fija con las medidas de la calculadora
function apuLatParams() {
  const v = apuIn('solerafija'), h = Math.min(500, Math.max(80, +v.I || 200)), ang = [30, 45, 60].includes(+v.ang) ? +v.ang : 45;
  const a = ang * Math.PI / 180, ej = ang === 60 ? 75 : 60;
  return { h, ang, ej, puntal: h / Math.sin(a), solera: h / Math.tan(a) };
}
function apuLateral(g, p) {
  const G = 55, I = G + p.h, x0 = 40, fx = x0 + p.solera, end = fx + p.ej + 14;
  g.wall(0, G, 30, p.h + p.ej + 40);
  g.rect(30, G + 10, 10, p.h + p.ej - 2).rect(30, G, end - 30, 10);
  g.rect(40, I + 4, 5, p.ej, 'aw2');
  g.bar(45, I, fx, G + 15, 10);
  g.bar(46, G + 16, x0 + p.solera / 2, G + 10 + p.h / 2, 7, 'aw2');
  g.cunas(fx + 4, G + 10, 5, 14, true).rect(fx + 9, G + 10, p.ej, 5, 'aw2');
  g.plate(25, I - 26, 30, 30).plate(25, G, 30, 30).plate(fx - 18, G, 30, 30);
  const sx = apuFreno(g, end + 4, G, 1);
  g.ground(0, end + 40, G).angle(fx, G + 15, 36, 180, 180 - p.ang, `${p.ang}°`).dim(-8, G, -8, I, `${Math.round(p.h)} cm`, true);
  g.n(1, 35, G + p.h * .45, 64, G + p.h * .62).n(2, 42, I + p.ej * .6, 70, I + p.ej * .8).n(3, 40, I - 10, 75, I - 10).n(4, x0 + p.solera * .3, G + 15 + p.h * .7, x0 + p.solera * .3 + 30, G + p.h * .85)
    .n(5, x0 + p.solera * .3, G + p.h * .38, x0 + p.solera * .3 + 25, G + p.h * .22).n(6, x0 + p.solera * .5, G + 5, x0 + p.solera * .5, G - 25).n(7, fx + 7, G + 16, fx + 2, G + 45)
    .n(8, fx + p.ej * .6, G + 13, fx + p.ej * .6, G + 42).n(9, end + 16, G + 10, end + 26, G + 42).n(10, sx, G - 30, sx + 22, G - 36);
}
// Inclinados: losa inclinada y el sistema perpendicular a la carga, al suelo o con tablón de obra
function apuIncl(g, kind) {
  const G = 55, th = 22 * Math.PI / 180, t = Math.tan(th), sn = Math.sin(th), cs = Math.cos(th);
  const y0 = G + 150, cl = x => y0 + (x - 20) * t;             // línea media de la losa
  const wx = kind === 'tablon' ? 540 : 460;
  g.wall(wx, G, 30, 330).bar(20, cl(20), wx, cl(wx), 16, 'aload').poly([[0, G], [90, G], [20, cl(20) - 10], [0, cl(0) - 10]], 'adeb');
  const under = (x, d) => [x + d * sn, cl(x) - d * cs];       // punto a d cm por debajo de la línea media, en perpendicular
  g.ground(0, wx + 30, G);
  if (kind === 'carga') {
    const c1 = under(150, 13), c2 = under(335, 13); g.bar(c1[0], c1[1], c2[0], c2[1], 10);
    const tops = [190, 300].map(x => under(x, 18)), foot = p => { const k = (p[1] - (G + 10)) / cs; return [p[0] + k * sn, G + 10]; };
    const feet = tops.map(foot), s0 = feet[0][0] - 40, s1 = feet[1][0] + 70;
    g.rect(s0, G, s1 - s0, 10);
    g.bar(feet[0][0] - 20, G + 12, tops[1][0] - 4, tops[1][1] - 6, 6, 'aw2 back');
    tops.forEach((p, i) => { g.bar(p[0], p[1], feet[i][0], feet[i][1], 10); g.cunas(feet[i][0] + 7, G + 10, 4, 10, true).rect(feet[i][0] + 11, G + 10, 45, 5, 'aw2'); g.plate(feet[i][0] - 12, G, 22, 22, 'ap2'); });
    const fx = apuFreno(g, s1 + 4, G, 1);
    g.n(1, 120, cl(120), 100, cl(120) + 35).n(2, c2[0] - 10, c2[1] + 4, c2[0] + 10, c2[1] + 38).n(3, (tops[0][0] + feet[0][0]) / 2, (tops[0][1] + feet[0][1]) / 2, (tops[0][0] + feet[0][0]) / 2 - 30, (tops[0][1] + feet[0][1]) / 2 + 10)
      .n(4, (feet[0][0] + tops[1][0]) / 2, (G + tops[1][1]) / 2, (feet[0][0] + tops[1][0]) / 2 + 22, (G + tops[1][1]) / 2 - 25).n(5, feet[0][0] - 2, G + 18, feet[0][0] - 30, G + 40)
      .n(6, feet[1][0] + 30, G + 13, feet[1][0] + 30, G + 42).n(7, feet[1][0] + 9, G + 12, feet[1][0] - 6, G + 50).n(8, s0 + 15, G + 5, s0 + 15, G - 25).n(9, fx, G + 12, fx + 20, G + 45);
  } else if (kind === 'suelo') {
    const xs = [190, 300], c1 = under(160, 13), c2 = under(360, 13); g.bar(c1[0], c1[1], c2[0], c2[1], 10);
    const yb = x => cl(x - 18 * sn) - 18 * cs;                  // cara de abajo de la cumbrera sobre la vertical x
    g.rect(160, G, 170, 10).bar(178, G + 14, 312, yb(312) - 6, 6, 'aw2 back');
    xs.forEach(x => { g.cunas(x - 15, G + 10, 30, 4); g.poly([[x - 5, G + 14], [x + 5, G + 14], [x + 5, yb(x + 5)], [x - 5, yb(x - 5)]]); g.bar(x + 6, yb(x + 6) - 2.5, x + 6 + 42 * cs, yb(x + 6 + 42 * cs) - 2.5, 5, 'aw2'); g.plate(x - 8, G, 16, 24, 'ap2'); });
    const fx = apuFreno(g, 156, G, -1);
    g.n(1, 120, cl(120), 100, cl(120) + 35).n(2, c2[0] - 10, c2[1] + 4, c2[0] + 12, c2[1] + 38).n(3, 190, G + 70, 160, G + 80).n(4, 245, G + 110, 260, G + 80).n(5, 300, G + 14, 330, G + 40)
      .n(6, 300 + 25, yb(325) - 4, 345, yb(345) - 30).n(7, 190, G + 12, 215, G - 22).n(8, 245, G + 5, 255, G - 25).n(9, fx, G + 12, fx - 20, G + 45);
  } else {
    const c1 = under(140, 13), c2 = under(330, 13); g.bar(c1[0], c1[1], c2[0], c2[1], 12);
    const yb = x => cl(x - 19 * sn) - 19 * cs, xv = 170;
    g.rect(140, G, 330, 7);
    g.cunas(xv - 10, G + 7, 10, 4).cunas(xv, G + 7, 10, 4).poly([[xv - 6, G + 11], [xv + 6, G + 11], [xv + 6, yb(xv + 6)], [xv - 6, yb(xv - 6)]]).line(xv, G + 11, xv, yb(xv), 'aln');
    const top = [255, yb(255)], foot = [395, G + 9];
    g.bar(foot[0], foot[1] + 4, top[0], top[1] - 4, 12).bar(194, yb(194) - 3, 249, yb(249) - 3, 5, 'aw2');
    g.cunas(foot[0] + 6, G + 7, 4, 12, true).rect(foot[0] + 10, G + 7, 60, 5, 'aw2');
    g.bar(xv + 6, G + 60, 340, G + 60, 6, 'aw2');
    const fx = apuFreno(g, 474, G, 1);
    g.n(1, 110, cl(110), 90, cl(110) + 35).n(2, 145, yb(145) + 2, 128, yb(145) + 40).n(3, xv, G + 100, xv - 30, G + 110).n(4, 330, G + 80, 350, G + 120).n(5, 220, yb(220) - 3, 222, yb(222) - 36)
      .n(6, 280, G + 60, 290, G + 38).n(7, 200, G + 4, 200, G - 25).n(8, 430, G + 10, 430, G + 40).n(9, xv, G + 9, xv + 25, G + 35).n(10, fx, G + 12, fx + 18, G + 45);
  }
}

/* ==================== VISTAS ==================== */
const openApu = id => { toggleDrawer(false); closeModal(); setPref({ tab: 'apuntalamientos', apu: id }); scrollTo(0, 0); };
function viewApuntalamientos() {
  const t = prefs.apu && apuGet(prefs.apu);
  if (t) return apuDetail(t);
  const fam = APU_FAMS.some(f => f[0] === prefs.apuFam) ? prefs.apuFam : '';
  const q = (prefs.apuQ || '').trim().toLowerCase(), norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const shown = APU.filter(x => (!fam || x.fam === fam) && (!q || norm([x.name, x.alias, x.uso, x.mat, ...(x.parts || []).map(p => p[0])].join(' ')).includes(norm(q))));
  const card = x => `<button class="apu-card" onclick="openApu('${x.id}')">
      <span class="apu-thumb">${apuFig(...apuFigArgs(x, 0))}</span>
      <span class="apu-card-t"><b>${esc(x.name)}</b><small>${[x.clase ? 'Clase ' + x.clase : '', x.mat].filter(Boolean).map(esc).join(' · ')}</small></span></button>`;
  return `
    <div class="panel">
      <div class="sec-head"><h2>Apuntalamientos</h2>
        <p class="muted">Todos los tipos de los temas de la UME (M6 «Apuntalamientos» y M8 «Técnicas específicas»): dibujo con el nombre de cada pieza, cuándo se usa, datos y montaje.</p></div>
      <input class="input" type="search" aria-label="Buscar un apuntalamiento" placeholder="Buscar: torre, ejión, ventana, codal…" value="${esc(prefs.apuQ || '')}"
        oninput="APU_Q_POS = this.selectionStart; setPref({ apuQ: this.value })">
      <div class="row chips apu-fams" style="margin-top:10px">${[['', 'Todos'], ...APU_FAMS].map(([k, l]) => `<button class="chip ${fam === k ? 'on' : ''}" onclick="setPref({ apuFam: '${k}' })">${l}</button>`).join('')}</div>
    </div>
    ${APU_FAMS.filter(([k]) => shown.some(x => x.fam === k)).map(([k, l]) => `
      <h3 class="apu-fam-h">${l}</h3>
      <div class="apu-grid">${shown.filter(x => x.fam === k).map(card).join('')}</div>`).join('') || `<div class="panel">${emptyState('wrench', 'Nada con esa búsqueda', 'Prueba con otra palabra o quita el filtro.')}</div>`}`;
}
let APU_Q_POS = null;
// El buscador conserva el foco al volver a pintar la lista
function apuKeepFocus() { if (APU_Q_POS == null) return; const i = document.querySelector('#view input[aria-label="Buscar un apuntalamiento"]'); if (i) { i.focus(); i.setSelectionRange(APU_Q_POS, APU_Q_POS); } APU_Q_POS = null; }
const apuFigArgs = (t, i) => { const f = t.figs[i]; const sz = APU_SIZE[t.id + (i ? i : '')] || APU_SIZE[t.id] || [300, 300]; return [sz[0], sz[1], f[0], `${t.name}: ${f[1]}`]; };
// Tamaño de cada dibujo (ancho y alto de la escena, en cm)
const APU_SIZE = { componentes: [410, 215], tablon: [240, 240], puntalobra: [120, 274], holmatro: [140, 280], t: [120, 255], fila: [330, 290], dos: [200, 320], torre: [270, 370], torre1: [410, 470],
  vtablon: [200, 210], vobra: [330, 270], vholm: [300, 290], zampeado: [145, 175], zampeado1: [290, 120], volante: [290, 440], ltablon: [370, 320], lobra: [360, 320],
  inclcarga: [430, 385], inclsuelo: [430, 385], inclsuelo1: [290, 160], incltablon: [500, 385], horfema: [270, 310], hortablon: [330, 300], horpuntales: [270, 300],
  hueco: [200, 300], huecoprefab: [200, 300], huecoprefab1: [200, 300], recercado: [400, 260], huecopuntales: [200, 300], percha: [360, 300], voladizoinf: [350, 278],
  asnillas: [305, 315], puente: [305, 345], puente1: [305, 305], arco: [300, 330], columna: [190, 316], columna1: [180, 300], fachada: [210, 320] };
Object.defineProperty(APU_SIZE, 'solerafija', { get: () => { const p = apuLatParams(); return [40 + p.solera + p.ej + 70, 55 + p.h + p.ej + 40]; }, enumerable: true });

function apuDetail(t) {
  const i = APU.indexOf(t), prev = APU[i - 1], next = APU[i + 1], fam = APU_FAMS.find(f => f[0] === t.fam)[1];
  return `
    <div class="panel apu-detail">
      <button class="link" onclick="setPref({ apu: null })">${ic('back', 'i-sm')} Apuntalamientos</button>
      <div class="sec-head" style="margin-top:6px"><h2>${esc(t.name)}</h2>
        <div class="row" style="margin-top:6px"><span class="tag neutral">${esc(fam)}</span>${t.clase ? `<span class="tag info">${APU_CLASE[t.clase]}</span>` : ''}${t.mat ? `<span class="tag neutral">${esc(t.mat)}</span>` : ''}</div>
        ${t.alias ? `<p class="muted" style="margin-top:6px">También: ${esc(t.alias)}</p>` : ''}</div>
      <p>${esc(t.uso)}</p>
      ${t.figs.map((f, k) => `<figure class="apu-fig">${apuFig(...apuFigArgs(t, k))}<figcaption>${esc(f[1])}</figcaption></figure>`).join('')}
      ${t.parts ? `<ol class="apu-parts">${t.parts.map(([n, d]) => `<li><b>${esc(n)}</b>${d ? ` <span class="muted">${esc(d)}</span>` : ''}</li>`).join('')}</ol>` : ''}
      ${t.arcos ? `<button class="btn btn-a full" style="margin-top:12px" onclick="go('arcos')">${ic('wrench')} Calcular un arco: cuadro, cercha, camones y lista de cortes</button>` : ''}
    </div>
    ${APU_CORTES[t.id] ? apuCortesPanel(t) : ''}
    ${APU_MONTAJE[t.id] ? apuMontajePanel(t) : ''}
    ${t.datos?.length ? `<div class="panel"><h3 class="sec-title">${ic('list')} Datos clave</h3><dl class="dl apu-dl">${t.datos.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>` : ''}
    ${t.pasos?.length ? `<div class="panel"><h3 class="sec-title">${ic('check')} ${t.id === 'componentes' ? 'Equipos de apuntalamiento' : APU_MONTAJE[t.id] ? 'Pasos del manual' : 'Montaje paso a paso'}</h3><ol class="apu-steps">${t.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>` : ''}
    ${t.ojo?.length ? `<div class="callout warn">${t.ojo.map(o => `<p>${ic('alert', 'i-sm')} ${esc(o)}</p>`).join('')}</div>` : ''}
    <p class="muted apu-ref">Tema UME: ${esc(t.ref)}. Revisar todo apuntalamiento cada 12 h y siempre tras una réplica.</p>
    <div class="row apu-nav">${prev ? `<button class="btn btn-g" onclick="openApu('${prev.id}')">${ic('back', 'i-sm')} ${esc(prev.name)}</button>` : ''}
      ${next ? `<button class="btn btn-g" onclick="openApu('${next.id}')">${esc(next.name)} ${ic('chev', 'i-sm')}</button>` : ''}</div>`;
}
