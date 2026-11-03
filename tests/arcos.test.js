// Pruebas del cálculo de arcos (js/arcos.js). Uso: node --test tests/arcos.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const ENG = require('../js/arcos.js');

const BASE = {
  Larr: 210, Lsuelo: 210, Hizq: 230, Hder: 230, Hclave: 335, hq: 321, fondo: 50,
  seccion: '10x10', tablonAncho: 20, tablonGrueso: 7, riostra: 'tabla 15×2,5',
  stockViga: 400, stockTablon: 400, paso: false, correas: true, cumbreraDoble: true,
  holguraLateral: 4, holguraArco: 2, huecoCunas: 4, sepMax: 120, anchoCorrea: 15, grosorCorrea: 2.5
};
const calc = (over = {}) => ENG.calcular(Object.assign({}, BASE, over));
const pieza = (r, code) => r.piezas.find(p => p.code === code);

test('detecta el tipo de arco por la flecha', () => {
  assert.equal(calc().A.tipo, 'medio punto');
  assert.equal(calc({ Hclave: 300, hq: null }).A.tipo, 'rebajado');
  assert.equal(calc({ Hclave: 380, hq: null }).A.tipo, 'apuntado');
});

test('el arco pasa por arranque y clave', () => {
  for (const Hclave of [290, 335, 390]) {
    const r = calc({ Hclave, hq: null });
    const yClave = ENG.yAt(r.A, r.A.R, -1e-4);
    assert.ok(Math.abs(yClave - (Hclave - 230)) < 0.05, `clave ${Hclave}`);
    assert.ok(Math.abs(ENG.yAt(r.A, r.A.R, -105)) < 0.05, 'arranque');
  }
});

test('puntal = arranque − solera − cuñas − cumbrera (M6 p.20)', () => {
  const r = calc({ cumbreraDoble: false });
  assert.equal(pieza(r, 'P').largo, 230 - 10 - 4 - 10);
  const r2 = calc({ cumbreraDoble: true });
  assert.equal(pieza(r2, 'P').largo, 230 - 10 - 4 - 20);
});

test('solera y cumbrera 4 cm menores que el hueco más estrecho (MC p.111, M6 p.68)', () => {
  const r = calc({ Lsuelo: 206 });
  assert.equal(pieza(r, 'S').largo, 202);
  assert.equal(pieza(r, 'C').largo, 202);
  assert.ok(r.warnings.some(w => /desplomadas/.test(w.txt)));
});

test('un puntal intermedio por cada 1,50 m de luz y siempre uno bajo el pendolón (M8 p.7)', () => {
  assert.equal(calc({ Larr: 140, Lsuelo: 140, Hclave: 300, hq: null }).nInter, 0);
  assert.equal(calc().nInter, 1);
  const grande = calc({ Larr: 400, Lsuelo: 400, Hclave: 430, hq: null, fondo: 60 });
  assert.equal(grande.nInter, 3);
  assert.ok(grande.xPosts.some(x => Math.abs(x) < 0.01), 'hay puntal en el eje');
});

test('con paso libre no hay puntales intermedios ni X, y se avisa', () => {
  const r = calc({ paso: true });
  assert.equal(r.nInter, 0);
  assert.equal(pieza(r, 'RX'), undefined);
  assert.ok(r.warnings.some(w => w.nivel === 'alto' && /1,50/.test(w.txt)));
});

test('cerchas: respetan un tercio del tablón y su cuerda no pasa de 1,2 m (M8 p.8)', () => {
  for (const over of [{}, { Hclave: 300, hq: null }, { Hclave: 380, hq: null }, { Larr: 400, Lsuelo: 400, Hclave: 430, hq: null }]) {
    const r = calc(over);
    r.camones.forEach(c => {
      assert.ok(c.cantoExtremo >= 20 / 3 - 0.05, `canto ${c.cantoExtremo}`);
      assert.ok(c.len <= 125);
    });
  }
});

test('medio punto con tablón de 20: cuatro cerchas a 45° (M8 p.8)', () => {
  const r = calc();
  assert.equal(r.n, 2);
  assert.equal(r.camones.length * 2, 4);
  assert.ok(Math.abs(r.camones[0].cutS - 22.5) < 0.1);
  assert.equal(r.jab.length, 1);
});

test('número de pórticos según el fondo (separación ≤ 1,2 m)', () => {
  assert.equal(calc({ fondo: 20 }).nf, 1);
  assert.equal(calc({ fondo: 50 }).nf, 2);
  assert.equal(calc({ fondo: 150 }).nf, 3);
  const r = calc({ fondo: 300 });
  assert.ok(r.sep <= 120 + 1e-9);
});

test('riostras a compresión ≤ 2,25 m (M6 p.4)', () => {
  for (const over of [{}, { fondo: 150 }, { Larr: 400, Lsuelo: 400, Hclave: 430, hq: null, fondo: 150 }]) {
    const r = calc(over);
    for (const code of ['RH', 'RD', 'RL']) {
      const p = pieza(r, code);
      if (p) assert.ok(p.largo <= 225 + 15, `${code} ${p.largo}`);
    }
  }
});

test('cuñas: un par por puntal más los de solera y cumbrera (M6 p.67)', () => {
  const r = calc();
  assert.equal(r.cunas.cant, r.nf * (2 + r.nInter + 2));
});

test('avisa si la altura a 1/4 no cuadra con un arco de circunferencia', () => {
  const r = calc({ hq: 300 });
  assert.ok(r.warnings.some(w => /plantilla/.test(w.txt)));
});

test('devuelve error con medidas incoherentes o vacías', () => {
  assert.ok(calc({ Hclave: 200 }).error);
  assert.ok(calc({ Larr: NaN }).error);
  assert.ok(calc({ tablonAncho: NaN }).error);
  assert.ok(calc({ stockViga: '' }).error);
});

test('ningún texto lleva NaN ni undefined', () => {
  for (const over of [{}, { Hclave: 300, hq: null }, { Hclave: 380, hq: null, paso: true }, { Larr: 400, Lsuelo: 400, Hclave: 430, hq: null, fondo: 150 }, { fondo: 20, correas: false }]) {
    const r = calc(over), txt = JSON.stringify([r.piezas.map(p => [p.nombre, p.donde, p.corte, p.largo, p.cant]), r.pletinas, r.warnings, r.cunas, r.nClavos]);
    assert.ok(!/NaN|undefined|Infinity/.test(txt), txt.match(/.{40}(NaN|undefined|Infinity).{20}/)?.[0]);
  }
});

test('los números de los textos van con coma decimal', () => {
  const r = calc();
  assert.ok(!/\d\.\d/.test(r.piezas.map(p => p.donde + p.corte).join(' ')));
});

test('pendolón: cabeza a dos aguas con la pendiente del canto de las cerchas centrales (M8 p.7)', () => {
  const r = calc();                                  // medio punto, dos cerchas por lado
  const pd = pieza(r, 'PD');
  assert.ok(/dos aguas/.test(pd.corte), pd.corte);
  assert.ok(Math.abs(pd.extra.pendAng - 22.5) < 0.6, `pendiente ${pd.extra.pendAng}`);
  assert.ok(Math.abs(pd.extra.pendBaja - 5 * Math.tan(22.5 * Math.PI / 180)) < 0.2, `baja ${pd.extra.pendBaja}`);
  const ap = calc({ Hclave: 380, hq: null });        // apuntado: la punta es más aguda
  assert.ok(pieza(ap, 'PD').extra.pendAng > pd.extra.pendAng);
});
