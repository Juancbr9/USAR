'use strict';
// USAR 242 · Plantillas a tamaño real (1:1) para imprimir en A4: camones del arco (piezas curvas) y extremos en ángulo de
// cualquier pieza de madera, con todas las medidas y ángulos. Lo que no cabe en una hoja se reparte en varias que se pegan
// por los solapes; cada hoja lleva una regla de 10 cm para comprobar que se ha impreso al 100 %.
// Las medidas del dibujo van en cm (1 unidad = 10 mm en el papel).

const PLT = { TW: 18, TH: 25, OV: 1.5, PAD: 1 };   // zona de dibujo de cada hoja (cm), solape entre hojas y margen
const pltF = (v, d = 1) => acF(v, d);
// Texto en el dibujo (tamaño en cm)
const pltT = (x, y, t, size = .5, anchor = 'start', extra = '') => `<text x="${(+x).toFixed(2)}" y="${(+y).toFixed(2)}" font-size="${size}" text-anchor="${anchor}" ${extra}>${esc(t)}</text>`;
const pltL = (x1, y1, x2, y2, cls = 'plt-fina') => `<line class="${cls}" x1="${(+x1).toFixed(2)}" y1="${(+y1).toFixed(2)}" x2="${(+x2).toFixed(2)}" y2="${(+y2).toFixed(2)}"/>`;
const pltPath = (pts, cls) => `<path class="${cls}" d="M${pts.map(p => `${(+p[0]).toFixed(2)} ${(+p[1]).toFixed(2)}`).join('L')}Z"/>`;
// Cota con flechas y su texto
function pltCota(x1, y1, x2, y2, t, off = .55) {
  const a = Math.atan2(y2 - y1, x2 - x1), mx = (x1 + x2) / 2, my = (y1 + y2) / 2, deg = a * 180 / Math.PI, up = Math.abs(deg) > 90 ? deg + 180 : deg;
  return `<line class="plt-cota" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" marker-start="url(#plt-m)" marker-end="url(#plt-m)"/>
    <text x="${mx.toFixed(2)}" y="${(my - off * Math.cos(a)).toFixed(2)}" font-size=".5" text-anchor="middle" transform="rotate(${up.toFixed(1)} ${mx.toFixed(2)} ${my.toFixed(2)})">${esc(t)}</text>`;
}
const PLT_DEFS = `<defs><marker id="plt-m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs>`;

/* ---------- Reparto en hojas ---------- */
// Una plantilla: { titulo, sub, W, H (cm), svg (contenido en cm, y hacia abajo, desde 0,0), datos: [[medida, valor]] }
function pltHojas(it) {
  const P = PLT.PAD, n = (w, h) => [Math.max(1, Math.ceil((w - PLT.OV) / (PLT.TW - PLT.OV))), Math.max(1, Math.ceil((h - PLT.OV) / (PLT.TH - PLT.OV)))];
  const W = it.W + 2 * P, H = it.H + 2 * P, a = n(W, H), b = n(H, W), rot = b[0] * b[1] < a[0] * a[1];
  const [nx, ny] = rot ? b : a, w = rot ? H : W, h = rot ? W : H;
  const g = rot ? `<g transform="translate(${(it.H + P).toFixed(2)} ${P}) rotate(90)">${it.svg}</g>` : `<g transform="translate(${P} ${P})">${it.svg}</g>`;
  return { ...it, rot, nx, ny, w, h, g, total: nx * ny };
}
function pltHoja(pl, ix, iy, k, N) {
  const x0 = ix * (PLT.TW - PLT.OV), y0 = iy * (PLT.TH - PLT.OV), marks = [];
  // Solapes: la franja de la izquierda y la de arriba se pegan encima de la hoja anterior
  if (ix > 0) marks.push(`<rect class="plt-solape" x="${x0}" y="${y0}" width="${PLT.OV}" height="${PLT.TH}"/>`, pltT(x0 + PLT.OV / 2, y0 + PLT.TH / 2, `Pega aquí la hoja ${k - 1}`, .4, 'middle', `transform="rotate(-90 ${x0 + PLT.OV / 2} ${y0 + PLT.TH / 2})"`));
  if (iy > 0) marks.push(`<rect class="plt-solape" x="${x0}" y="${y0}" width="${PLT.TW}" height="${PLT.OV}"/>`, pltT(x0 + PLT.TW / 2, y0 + PLT.OV / 2 + .15, `Pega aquí la hoja ${k - pl.nx}`, .4, 'middle'));
  // Cruces de registro en las esquinas
  [[x0, y0], [x0 + PLT.TW, y0], [x0, y0 + PLT.TH], [x0 + PLT.TW, y0 + PLT.TH]].forEach(([x, y]) => marks.push(pltL(x - .6, y, x + .6, y, 'plt-reg'), pltL(x, y - .6, x, y + .6, 'plt-reg')));
  return `<section class="plt-hoja">
    <div class="plt-cab"><b>${esc(pl.titulo)}</b> · hoja ${k} de ${N} (fila ${iy + 1}, columna ${ix + 1})${pl.rot ? ' · girada' : ''}
      <svg class="plt-regla" width="100mm" height="6mm" viewBox="0 0 10 .6"><line x1="0" y1=".05" x2="10" y2=".05" stroke="#000" stroke-width=".04"/>${Array.from({ length: 11 }, (_, i) => `<line x1="${i}" y1="0" x2="${i}" y2="${i % 5 ? .2 : .35}" stroke="#000" stroke-width=".03"/>`).join('')}<text x="5" y=".58" font-size=".22" text-anchor="middle">Esta regla tiene que medir 10 cm</text></svg></div>
    <svg class="plt-svg" width="${PLT.TW * 10}mm" height="${PLT.TH * 10}mm" viewBox="${x0} ${y0} ${PLT.TW} ${PLT.TH}">${PLT_DEFS}${pl.g}${marks.join('')}</svg>
  </section>`;
}
// Imprime una o varias plantillas: portada con instrucciones, medidas y reparto, y luego las hojas a tamaño real
function pltImprimir(titulo, items, nota = '') {
  const pls = items.map(pltHojas), N = pls.reduce((s, p) => s + p.total, 0);
  let k0 = 0;
  const mini = pl => { const s = Math.min(6 / pl.w, 4 / pl.h);
    return `<svg width="${(pl.w * s * 10).toFixed(0)}mm" height="${(pl.h * s * 10).toFixed(0)}mm" viewBox="0 0 ${pl.w.toFixed(1)} ${pl.h.toFixed(1)}">${PLT_DEFS}${pl.g}
      ${Array.from({ length: pl.ny }, (_, iy) => Array.from({ length: pl.nx }, (_, ix) => { const x = ix * (PLT.TW - PLT.OV), y = iy * (PLT.TH - PLT.OV);
        return `<rect x="${x}" y="${y}" width="${PLT.TW}" height="${PLT.TH}" fill="none" stroke="#c00" stroke-width="${(.4 / s).toFixed(2)}" stroke-dasharray="${(1 / s).toFixed(2)}"/>${pltT(x + .6 / s, y + 1.2 / s, String(k0 + iy * pl.nx + ix + 1), .9 / s, 'start', 'fill="#c00"')}`; }).join('')).join('')}</svg>`; };
  const portada = `<section class="plt-portada">
    <h1>Plantillas a tamaño real · ${esc(titulo)}</h1>
    <ol class="plt-pasos"><li>Imprime en A4 <b>al 100 %</b> («Tamaño real», sin «Ajustar a la página»). En cada hoja, la regla de arriba tiene que medir 10 cm: compruébala con el metro antes de cortar nada.</li>
      <li>Recorta cada hoja por el borde y pega las hojas por las franjas grises del solape, haciendo coincidir las cruces y las líneas.</li>
      <li>La línea gruesa es la línea de corte. Recorta la plantilla por ella, preséntala sobre la madera, calca y corta. Antes, comprueba las medidas de la tabla con el metro.</li>
      ${nota ? `<li>${esc(nota)}</li>` : ''}</ol>
    ${pls.map(pl => { const h = `<div class="plt-item"><h2>${esc(pl.titulo)}</h2>${pl.sub ? `<p>${esc(pl.sub)}</p>` : ''}
      <div class="plt-item-c"><div>${mini(pl)}<p class="plt-pq">Hojas ${k0 + 1}${pl.total > 1 ? `–${k0 + pl.total}` : ''} (${pl.nx} × ${pl.ny})</p></div>
      <table>${pl.datos.map(([kk, vv]) => `<tr><th>${esc(kk)}</th><td>${esc(vv)}</td></tr>`).join('')}</table></div></div>`; k0 += pl.total; return h; }).join('')}
  </section>`;
  let k = 0;
  const hojas = pls.map(pl => Array.from({ length: pl.ny }, (_, iy) => Array.from({ length: pl.nx }, (_, ix) => pltHoja(pl, ix, iy, ++k, N)).join('')).join('')).join('');
  $('print').innerHTML = `<div class="plt-print">${portada}${hojas}</div>`;
  print();
}

/* ---------- Camón del arco (pieza curva) ---------- */
function pltCamon(c, r, cant) {
  const Wb = r.inp.tablonAncho, len = c.len, ox = 3, oy = 2.4, X = s => ox + s, Y = t => oy + t, e = c.esquinas;
  const pts = c.O.concat([e.intClave, e.intArr]).map(p => [X(p.s), Y(p.t)]);
  const ords = c.ord.filter(o => o.ext != null);
  const svg = [
    // tablón entero (discontinuo) y el tercio mínimo
    `<rect class="plt-tablon" x="${X(-1)}" y="${Y(0)}" width="${len + 2}" height="${Wb}"/>`,
    pltL(X(-1), Y(Wb * 2 / 3), X(len + 1), Y(Wb * 2 / 3), 'plt-tercio'), pltT(X(len + 1.2), Y(Wb * 2 / 3) + .18, `⅓ del tablón (mín. ${pltF(r.cantoMin)} cm)`, .4),
    // ordenadas cada 10 cm desde el canto de arriba hasta la curva, con su medida
    ...ords.map(o => pltL(X(o.s), Y(0), X(o.s), Y(o.ext), 'plt-ord') + pltT(X(o.s) + .15, Y(o.ext) + .6, pltF(o.ext), .42) + pltT(X(o.s), Y(-.25), pltF(o.s, 0), .38, 'middle')),
    // la pieza: línea de corte
    pltPath(pts, 'plt-corte'),
    // escuadra de referencia en cada extremo y el ángulo
    pltL(X(e.extArr.s), Y(-.6), X(e.extArr.s), Y(Wb + .6), 'plt-esc'), pltL(X(e.extClave.s), Y(-.6), X(e.extClave.s), Y(Wb + .6), 'plt-esc'),
    pltT(X(Math.min(e.extArr.s, e.intArr.s)) - .3, Y(Wb / 2), `${pltF(c.cutS)}°`, .7, 'end', 'font-weight="700"'),
    pltT(X(Math.max(e.extClave.s, e.intClave.s)) + .3, Y(Wb / 2), `${pltF(c.cutK)}°`, .7, 'start', 'font-weight="700"'),
    pltT(X(Math.min(e.extArr.s, e.intArr.s)) - .3, Y(Wb / 2) + .7, 'arranque', .4, 'end'), pltT(X(Math.max(e.extClave.s, e.intClave.s)) + .3, Y(Wb / 2) + .7, 'clave', .4, 'start'),
    // cotas: largo total y canto recto, y dónde caen las esquinas del canto recto
    pltCota(X(0), Y(Wb + 1.4), X(len), Y(Wb + 1.4), `Largo ${pltF(len)} cm`),
    pltCota(X(e.intArr.s), Y(Wb + .6), X(e.intClave.s), Y(Wb + .6), `Canto recto ${pltF(Math.abs(e.intClave.s - e.intArr.s))} cm`, -.55),
    pltT(X(len / 2), Y(Wb / 2) + .25, `${c.code} · CAMÓN · ${cant} piezas`, .9, 'middle', 'font-weight="800" opacity=".55"')
  ].join('');
  return { titulo: `Camón ${c.code}`, sub: `Tablón de ${pltF(Wb)}×${pltF(r.inp.tablonGrueso)} · ${cant} piezas iguales · curva de radio ${pltF(r.Ro)} cm`,
    W: len + ox + 9, H: Wb + oy + 2.6, svg,
    datos: [['Largo', `${pltF(len)} cm (tablón de ${pltF(Math.ceil(len + 4), 0)} cm)`], ['Canto recto entre esquinas', `${pltF(Math.abs(e.intClave.s - e.intArr.s))} cm`],
      ['Esquinas del canto recto', `a ${pltF(e.intArr.s)} cm y ${pltF(e.intClave.s)} cm del extremo`], ['Flecha de la curva', `${pltF(c.flecha)} cm`], ['Radio de la curva', `${pltF(r.Ro)} cm`],
      ['Corte lado arranque', `${pltF(c.cutS)}° fuera de escuadra${c.endS === 'h' ? ' (a nivel)' : ''}`], ['Corte lado clave', `${pltF(c.cutK)}° fuera de escuadra${c.endK === 'v' ? ' (a plomo)' : ''}`],
      ['Canto en los extremos', `${pltF(c.cantoExtremo)} cm (mín. ⅓: ${pltF(r.cantoMin)} cm)`], ['Ordenadas', 'Cada 10 cm desde el canto de arriba, con su medida']] };
}

/* ---------- Extremos en ángulo de una pieza recta ---------- */
// Cada extremo que no va a escuadra, a tamaño real, para calcarlo: la línea de corte, el canto largo y el corto, el ángulo y el tope
function pltExtremos(p) {
  const m = String(p.s).match(/([\d.,]+)\s*×\s*([\d.,]+)/), a = m ? +m[1].replace(',', '.') : 10, g = m ? +m[2].replace(',', '.') : 10;
  const geo = p.geo; if (!geo) return null;
  const horiz = Math.abs(Math.sin((geo.ang || 0) * AG_R)) < 0.02, w = geo.w || (geo.ras ? a : horiz ? g : a), L = Math.max(p.l, 2 * w + 2);
  const P = agPieza(L, w, geo), names = agNombres(geo, L), xs = P.poly.map(q => q[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
  const ends = P.info.filter(i => i.tipo !== 'esc'); if (!ends.length) return null;
  const lado = P.largo[0] && P.largo[1] && Math.abs(P.largo[0] - P.largo[1]) >= .5;
  // Una hoja por extremo: lo justo para ver el corte entero y calcarlo
  return ends.map(it => {
    const k = it.k, E = Math.min(Math.max((it.d || 0) + 5, 10), L / 2), ox = 1.2, oy = 2.4, tip = ox + E;
    const reg = k ? agClip(P.poly, -1, 0, -(x1 - E)) : agClip(P.poly, 1, 0, x0 + E);
    // el extremo siempre a la derecha: el de arriba como en la guía; el otro, girado media vuelta
    const tx = q => k ? ox + (q[0] - (x1 - E)) : ox + (x0 + E - q[0]), ty = q => k ? oy + (w - q[1]) : oy + q[1];
    const parts = [
      pltL(ox - .8, oy, tip + 1.5, oy, 'plt-tablon-l'), pltL(ox - .8, oy + w, tip + 1.5, oy + w, 'plt-tablon-l'),
      pltPath(reg.map(q => [tx(q), ty(q)]), 'plt-corte'),
      pltL(ox, oy - .4, ox, oy + w + .4, 'plt-esc'),
      pltT(ox, oy - 1.4, `${p.c} · ${names[k]}`, .55, 'start', 'font-weight="800"'),
      pltT(ox, oy + w + 2.2, it.tipo === 'dos' ? `${pltF(it.dev)}° y ${pltF(it.dev2)}° fuera de escuadra` : `${pltF(it.dev)}° fuera de escuadra${it.tope ? ` · tope ${pltF(it.tope)} cm` : ''}`, .5, 'start', 'font-weight="700"'),
      pltT(ox, oy + w + 2.9, '← sigue la pieza', .38)
    ];
    if (it.tipo === 'bis' && it.d >= .5) {
      const yS = ty([0, it.lado === 'w' ? 0 : w]), arriba = yS < oy + w / 2, yE = arriba ? oy - .5 : oy + w + .6;
      parts.push(pltCota(tip - it.d, yE, tip, yE, `${pltF(it.d)}`, arriba ? .3 : -.45));
    }
    return { titulo: `${p.c} · ${p.n} · ${names[k].toLowerCase()}`, sub: `${p.s} · ${p.q ? p.q + ' piezas · ' : ''}largo ${pltF(p.l, 0)} cm`, W: E + 2.8, H: w + 6, svg: parts.join(''),
      datos: [['Largo', `${pltF(p.l, 0)} cm${lado ? ` por el lado largo; el otro canto ${pltF(Math.min(...P.largo))} cm` : ''}`], ['Sección', `${p.s} (de canto en el dibujo: ${pltF(w)} cm)`],
        ['Corte', it.tipo === 'dos' ? `dos cortes a ${pltF(it.dev)}° y ${pltF(it.dev2)}° fuera de escuadra, en punta en el centro de la cara`
          : `${pltF(it.dev)}° fuera de escuadra; en el canto corto, marca ${pltF(it.d)} cm desde la esquina${it.tope ? `; tope de ${pltF(it.tope)} cm a escuadra` : ''}`],
        ...(it.on ? [['Apoya en', it.on]] : [])] };
  });
}

/* ---------- Botones ---------- */
// Apuntalamientos: todas las piezas con extremos en ángulo de un tipo, o una sola
function apuPlantillas(id, code) {
  const t = apuGet(id), r = apuCortes(id), v = r.v || {};
  const items = r.pz.filter(p => !code || p.c === code).flatMap(p => pltExtremos(p) || []);
  if (!items.length) { toast('Todas las piezas van a escuadra: no hace falta plantilla'); return; }
  pltImprimir(`${t.name}${v.eq ? ' · ' + v.eq : ''}`, items);
}
const apuTienePlantillas = r => r.pz.some(p => pltExtremos(p));
// Arcos: camones (uno por tipo) y extremos en ángulo de las piezas de escuadría
function arcPlantillas(id, code) {
  const a = get('arcs', id), r = a && arcCalc(a); if (!r || r.error) return;
  const cam = r.tipos.filter(tp => !code || tp.code === code).map(tp => pltCamon({ ...tp.ref, code: tp.code }, r, r.piezas.find(p => p.code === tp.code)?.cant || 0));
  const rect = code && !code.startsWith('CE') ? r.piezas.filter(p => p.code === code) : code ? [] : r.piezas.filter(p => p.geo);
  const ext = rect.flatMap(p => pltExtremos({ c: p.code, n: p.nombre, s: p.seccion, l: p.largo, q: p.cant, geo: p.geo }) || []);
  pltImprimir(`${a.name}`, [...cam, ...ext], 'Cada camón es una pieza de la cercha (la cercha es todo el arco de arriba). Si el arco está deformado, presenta la plantilla en el arco antes de cortar y corrígela.');
}
