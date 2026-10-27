"""Prueba de Material (contenedor, en revisión, pasillo 3, armarios y otros), las cajas Peli y el alta/baja de personal:
crear una caja desde un hueco, meter material, arrastrar con ratón y con el dedo (mantener pulsado), mover sin arrastrar,
notas que marcan novedad, ficha de revisión (situación, fecha, dónde, motivo), armarios, QR de caja y personas nuevas, de baja y eliminadas.
Uso: python3 tests/test_contenedor.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []

def watch(pg, tag=''):
    pg.on('pageerror', lambda e: problems.append(f'{tag}ERROR {e}'))
    pg.on('console', lambda m: m.type in ('warning', 'error') and 'ERR_TUNNEL' not in m.text and 'fonts.g' not in m.text and 'calls to print' not in m.text and problems.append(f'{tag}{m.type}: {m.text}'))
    pg.on('dialog', lambda d: d.accept())

with sync_playwright() as p:
    br = p.chromium.launch()
    # ---------- Móvil: menú, caja desde un hueco, meter material, arrastrar con el dedo ----------
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    a = c.new_page(); watch(a)
    a.goto(APP); a.wait_for_selector('#view > *')
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(250))
    sesion.menu(a, 'Contenedor', 200)
    assert a.locator('#drawer').is_hidden(), 'el menú se cierra al elegir'
    # El dibujo sigue la hoja del contenedor: 9 huecos por lateral (B3 y B6 comparten hueco arriba)
    assert a.locator('.cv-grid .cv-cell').count() == 9 and a.locator('.cv-cell[data-door="3"] .cv-tag').text_content() == 'B3 y B6'
    assert a.locator('.cv-cell[data-door="5"] .tok-box:has-text("H-2")').count() == 1 and a.locator('.cv-cell[data-door="5"] .tok-box:has-text("H-30")').count() == 1
    # Las cajas se dibujan como estancas a tamaño real, posadas en el suelo del hueco (dos Peli caben juntas en B5)
    assert a.locator('.cv-cell[data-door="5"] .cv-cases .tok-case svg').count() == 2 and a.locator('.cv-cell[data-door="5"] .cv-hide').count() == 0
    cb, kb = a.locator('.cv-cell[data-door="5"]').bounding_box(), a.locator('.tok-case[data-box="K-H2"]').bounding_box()
    assert abs((cb['y'] + cb['height']) - (kb['y'] + kb['height'])) < 2 and 1.1 < kb['width'] / kb['height'] < 1.3, (cb, kb)
    assert a.evaluate("[boxItems('K-H2').length, boxItems('K-H30').length, boxItems('K-U6').length, get('gear', 'G-U8-1').serial]") == [8, 9, 6, '40073']

    # Caja nueva en B1 desde el hueco (código siguiente del lateral izquierdo: H-31)
    a.locator('.cv-cell[data-door="1"]').click(position={'x': 30, 'y': 8}); a.wait_for_timeout(150)
    a.click('#modal button:has-text("Material aquí")'); a.click('#modal .add-mat [data-add=case]')
    assert a.input_value('[name=code]') == 'H-31' and a.input_value('[name=place]') == '1' and a.locator('[name=shelf]').count() == 0
    a.fill('[name=name]', 'Cizallas Holmatro'); a.select_option('[name=color]', 'amarillo'); a.fill('[name=tare]', '13')
    a.fill('[name=len]', '81'); a.fill('[name=wid]', '52'); a.fill('[name=hei]', '31'); save()
    bid = a.evaluate("boxes().find(b => b.code === 'H-31').id"); assert a.locator('#modalTitle:has-text("Caja H-31")').count() == 1
    a.click('#modal button:has-text("Meter material")')
    for n in ['Cizalla Holmatro eléctrica', 'Cizalla Holmatro manual']: a.click(f'#boxFillForm .check-row:has-text("{n}")')
    a.click('#boxFillForm button'); a.wait_for_timeout(200)
    assert a.locator('#modal .item:has-text("Cizalla Holmatro manual")').count() == 1
    assert a.evaluate("['B-101','B-102'].map(id => get('gear', id).box)") == [bid, bid]
    a.evaluate("put('gear', { ...get('gear', 'B-101'), weight: 20 }); put('gear', { ...get('gear', 'B-102'), weight: 12 })")
    assert a.evaluate(f"boxWeight(get('boxes', '{bid}')).kg") == 45
    a.keyboard.press('Escape'); a.wait_for_timeout(100)
    assert a.locator(f'.cv-cell[data-door="1"] .tok-box[data-box="{bid}"]').count() == 1
    a.screenshot(path=f'{OUT}/contenedor-dibujo.png', full_page=True)

    # Arrastrar con el dedo: mantener pulsado y llevar la caja a B4 (sus equipos van con ella)
    cdp = c.new_cdp_session(a)
    s = a.locator(f'.tok-box[data-box="{bid}"]').bounding_box(); d = a.locator('.cv-cell[data-door="4"]').bounding_box()
    x0, y0, x1, y1 = s['x'] + 15, s['y'] + 12, d['x'] + d['width'] / 2, d['y'] + 30
    touch = lambda t, x, y: cdp.send('Input.dispatchTouchEvent', {'type': t, 'touchPoints': [] if t == 'touchEnd' else [{'x': x, 'y': y}]})
    touch('touchStart', x0, y0); a.wait_for_timeout(420)
    for i in range(1, 11): touch('touchMove', x0 + (x1 - x0) * i / 10, y0 + (y1 - y0) * i / 10); a.wait_for_timeout(20)
    touch('touchEnd', x1, y1); a.wait_for_timeout(300)
    got = a.evaluate(f"[get('boxes', '{bid}').door, get('gear', 'B-101').door, get('gear', 'B-101').box === '{bid}']")
    print('Tras arrastrar con el dedo:', got); assert got == [4, 4, True], got
    assert a.locator('#modal').is_hidden(), 'soltar no debe abrir la ficha'

    # Un toque corto no arrastra: abre la caja
    a.locator(f'.tok-box[data-box="{bid}"]').tap(); a.wait_for_timeout(200)
    assert a.locator('#modalTitle:has-text("Caja H-31")').count() == 1
    # Color: negra o amarilla desde la ficha
    a.click('.color-pick button:has-text("Negra")'); a.wait_for_timeout(150)
    assert a.evaluate(f"get('boxes', '{bid}').color") == 'negro' and a.locator('.color-pick button.on:has-text("Negra")').count() == 1
    # Mover sin arrastrar (al otro lateral)
    a.click('#modal button:has-text("Mover")'); a.select_option('[name=place]', '18'); save()
    assert a.evaluate(f"[get('boxes', '{bid}').door, get('gear', 'B-102').door]") == [18, 18]
    a.keyboard.press('Escape'); a.click('.seg-row button:has-text("Derecho")'); a.wait_for_timeout(150)
    assert a.locator(f'.cv-cell[data-door="18"] .tok-box[data-box="{bid}"]').count() == 1

    # QR de la caja abre su ficha
    a.goto(APP.split('#')[0] + f'#k={bid}'); a.wait_for_timeout(500)
    assert a.locator('#modalTitle:has-text("Caja H-31")').count() == 1, 'el QR de la caja debe abrir su ficha'
    a.keyboard.press('Escape')

    # Buscador «¿Dónde está?»: sin tildes, dice lateral, puerta, altura y caja, y lleva al dibujo
    a.evaluate("go('avisos')"); a.wait_for_timeout(150)
    srch = lambda q: (a.fill('#search', q), a.dispatch_event('#search', 'input'), a.wait_for_timeout(150))
    a.click('[aria-label="Buscar"]'); srch('cizalla electrica')
    w = a.text_content('#results .find-item'); print('Buscador:', ' '.join(w.split()))
    assert 'lateral derecho' in w and 'B18' in w and 'H-31' in w, w
    a.click('#results .find-item'); a.wait_for_timeout(300)
    assert a.evaluate("[prefs.tab, prefs.cside]") == ['contenedor', 'der'] and a.locator(f'.tok-box.found[data-box="{bid}"]').count() == 1
    a.click('[aria-label="Buscar"]'); srch('tetra'); assert 'sin ubicar' in a.text_content('#results .find-res')
    srch('xyzzy'); assert 'Sin coincidencias' in a.text_content('#results')
    a.click('#results button.link')

    # Vehículos: modelos de la unidad, cada uno con sus matrículas (la carga se pone en cada salida)
    sesion.menu(a, 'Vehículos')
    assert a.locator('.veh-item').count() == 30 and a.locator('.veh-item:has-text("Autobomba Renault (módulo LCIF)")').count() == 1
    assert a.evaluate("vehicles().map(v => v.name).join('|') === vehicles().map(v => v.name).sort((x, y) => x.localeCompare(y, 'es', { numeric: true })).join('|')"), 'flota por orden alfabético'
    assert 'Amarok' in a.locator('.veh-item').first.text_content() and 'VPI' in a.locator('.veh-item').last.text_content()
    a.click('.veh-item:has-text("Amarok")'); a.fill('[name=seats]', '5'); save()
    assert a.evaluate("get('vehicles', 'V-AMAROK').seats") in (5, '5')

    # Migración: los 3 vehículos de ejemplo pasan a los reales y nada queda fijo en un vehículo
    m = c.new_page(); watch(m, 'MIG ')
    m.goto(APP); m.wait_for_selector('#view > *')
    m.evaluate("""(() => { const d = JSON.parse(localStorage.getItem(KEY.db)); const t = Date.now();
      Object.keys(d.vehicles).forEach(k => delete d.vehicles[k]);
      d.vehicles['V-1'] = { id: 'V-1', name: 'Camión portacontenedor', plate: '', seats: 3, _u: t }; d.vehicles['V-3'] = { id: 'V-3', name: 'Vehículo de mando', plate: '', seats: 5, _u: t };
      d.gear['B-901'].vehicle = 'V-3'; d.meta.vehbase = { id: 'vehbase', value: 1, _u: t }; localStorage.setItem(KEY.db, JSON.stringify(d)); })()""")
    m.reload(); m.wait_for_selector('#view > *')
    assert m.evaluate("[vehicles().length, get('gear', 'B-901').vehicle, !!get('vehicles', 'V-3')]") == [30, '', False]
    # v4: lo que estaba fijo en un vehículo pasa a «sin ubicar»; se carga en cada salida
    m.evaluate("""(() => { const d = JSON.parse(localStorage.getItem(KEY.db)); const t = Date.now();
      d.gear['B-901'].vehicle = 'V-SANGYONG'; d.vehicles['V-SANGYONG'].notes = 'Vehículo del jefe: lleva las transmisiones (TETRA) y el botiquín';
      d.meta.vehbase = { id: 'vehbase', value: 2, _u: t }; localStorage.setItem(KEY.db, JSON.stringify(d)); })()""")
    m.reload(); m.wait_for_selector('#view > *')
    assert m.evaluate("[get('gear', 'B-901').vehicle, get('gear', 'B-901').door, get('vehicles', 'V-SANGYONG').notes]") == ['', 0, '']
    # v5 y v6: llegan las ATB Iveco M1 y M2 y la segunda Renault de contenedor pequeño sin tocar los vehículos ya editados (ni repetir la v4)
    m.evaluate("""(() => { const d = JSON.parse(localStorage.getItem(KEY.db)); const t = Date.now();
      delete d.vehicles['V-ATB-M1']; delete d.vehicles['V-ATB-M2']; delete d.vehicles['V-AB-CONT2']; d.vehicles['V-SANGYONG'] = { ...d.vehicles['V-SANGYONG'], name: 'Sangyong del jefe', _u: t }; d.vehicles['V-AMAROK'] = { ...d.vehicles['V-AMAROK'], name: 'Amarok UME', plate: '1234-ABC', _u: t };
      d.gear['B-901'].vehicle = 'V-AMAROK'; d.meta.vehbase = { id: 'vehbase', value: 4, _u: t }; localStorage.setItem(KEY.db, JSON.stringify(d)); })()""")
    m.reload(); m.wait_for_selector('#view > *')
    assert m.evaluate("[get('vehicles', 'V-ATB-M1')?.name, get('vehicles', 'V-ATB-M2')?.name, get('vehicles', 'V-AB-CONT2')?.name, get('vehicles', 'V-AMAROK').name, get('vehicles', 'V-AMAROK').plate, get('vehicles', 'V-SANGYONG').name, get('gear', 'B-901').vehicle, get('meta', 'vehbase').value]") == ['ATB Iveco M1', 'ATB Iveco M2', 'Autobomba Renault (contenedor pequeño 2)', 'Amarok UME', '1234-ABC', 'SsangYong del jefe', 'V-AMAROK', 8]
    m.evaluate("(() => { const d = JSON.parse(localStorage.getItem(KEY.db)); d.gear['B-901'].vehicle = ''; localStorage.setItem(KEY.db, JSON.stringify(d)); })()")
    m.reload(); m.wait_for_selector('#view > *')
    # Base v3 (hojas del contenedor): lo de la base anterior repetido se borra, lo que no sale en las hojas y lo colocado
    # con el esquema de puertas P1–P8 pasa a «sin ubicar», y se crean las cajas H y U que falten
    m.evaluate("""(() => { const d = JSON.parse(localStorage.getItem(KEY.db)); const t = Date.now();
      d.gear['B-103'] = { id: 'B-103', name: 'Separador Holmatro', door: 1, shelf: 'B', status: 'OPERATIVO', _u: t };
      d.gear['B-105'] = { ...d.gear['B-105'], door: 1, shelf: 'C', _u: t };
      d.gear['G-MIO'] = { id: 'G-MIO', name: 'Radio vieja', door: 3, shelf: 'B', status: 'OPERATIVO', _u: t };
      delete d.boxes['K-H2']; d.meta.gearbase = { id: 'gearbase', value: 2, _u: t }; localStorage.setItem(KEY.db, JSON.stringify(d)); })()""")
    m.reload(); m.wait_for_selector('#view > *')
    assert m.evaluate("[!!get('gear', 'B-103'), get('gear', 'B-105').door, get('gear', 'G-MIO').door, !!get('boxes', 'K-H2')]") == [False, 0, 0, True]
    m.close()

    # ---------- PC: arrastrar con ratón a otra caja y a un armario; notas, revisión, pasillo y otros ----------
    d2 = br.new_context(viewport={'width': 1280, 'height': 1500}); b = d2.new_page(); watch(b, 'PC ')
    b.goto(APP); b.wait_for_selector('#view > *')
    b.evaluate("""(() => {
      const mk = (id, code, door, tare) => stamp('boxes', { id, code, name: 'Caja ' + code, color: 'negro', door, shelf: 'A', vehicle: '', tare, pos: 1, len: 60, wid: 40, hei: 30 });
      mk('K-1', 'C-01', 1, 300); mk('K-2', 'C-02', 2, 250); mk('K-3', 'C-03', 4, 200);
      commit(); go('contenedor');
    })()"""); b.wait_for_timeout(200)
    assert b.evaluate("MAT_TABS") == ['contenedor', 'revision', 'entregas']
    drag = lambda src, dst: (lambda s, t: (b.mouse.move(s['x'] + 8, s['y'] + 8), b.mouse.down(), b.mouse.move(s['x'] + 20, s['y'] + 20, steps=3),
                                          b.mouse.move(t['x'] + t['width'] / 2, t['y'] + t['height'] / 2, steps=10), b.mouse.up(), b.wait_for_timeout(250)))(b.locator(src).bounding_box(), b.locator(dst).bounding_box())
    drag('.tok-gear:has-text("Pistola de clavos")', '.tok-box[data-box="K-3"]')
    assert b.evaluate("get('gear', 'B-204').box") == 'K-3', 'soltar un equipo sobre una caja lo mete dentro'
    b.screenshot(path=f'{OUT}/contenedor-pc.png')

    # Nota en un equipo: queda marcada la novedad (dibujo, En revisión e Inicio)
    b.evaluate("gearDetail('G-B19-5')"); b.click('#modal button:has-text("Nota / novedad")')
    b.fill('[name=text]', 'Funciona, pero un peldaño cruje'); b.click('#modalForm button:has-text("Guardar")'); b.wait_for_timeout(200)
    assert b.locator('#modal .callout.nov:has-text("peldaño cruje")').count() == 1 and b.evaluate("get('gear', 'G-B19-5').nov.by") == 'GRANADOS'
    b.keyboard.press('Escape'); b.click('.seg-row button:has-text("Derecho")'); b.wait_for_timeout(150)
    assert b.locator('.tok-gear.has-nov[data-gear="G-B19-5"]').count() == 1
    assert 'Escalera plegable' in b.evaluate("alerts().nov.map(x => x.name).join()")
    # Nota en una caja
    b.evaluate("boxDetail('K-2')"); b.click('#modal button:has-text("Nota / novedad")'); b.fill('[name=text]', 'Cierre roto'); b.click('#modalForm button:has-text("Guardar")'); b.wait_for_timeout(200)
    assert b.evaluate("get('boxes', 'K-2').nov.text") == 'Cierre roto'

    # A revisión: situación, desde cuándo, dónde y por qué
    b.evaluate("closeModal(); gearDetail('G-B10-2')"); name = b.evaluate("get('gear', 'G-B10-2').name")
    b.click('#modal button:has-text("A revisión")')
    b.select_option('[name=state]', 'taller'); b.fill('[name=since]', '2026-10-01'); b.fill('[name=where]', 'Taller Holmatro Telde'); b.fill('[name=reason]', 'Pierde aceite')
    b.click('#modalForm button:has-text("Guardar")'); b.wait_for_timeout(200)
    g = b.evaluate("get('gear', 'G-B10-2')"); assert g['status'] == 'REVISIÓN' and g['rev']['state'] == 'taller' and g['rev']['where'] == 'Taller Holmatro Telde', g
    assert b.locator('#modal .callout.rev:has-text("En el taller"):has-text("Taller Holmatro Telde"):has-text("Pierde aceite")').count() == 1
    b.evaluate("closeModal(); go('revision')"); b.wait_for_timeout(150)
    assert b.locator(f'#view .item:has-text("{name}"):has-text("Taller Holmatro Telde")').count() == 1
    assert b.locator('#view .panel:has-text("Con novedad") .item').count() == 2
    b.screenshot(path=f'{OUT}/revision.png', full_page=True)
    # Inoperativo pasa a averiado; fin de revisión: vuelve operativo y queda en el historial
    b.evaluate("gearDetail('G-B10-2')"); b.click('#modal .callout.rev button:has-text("Editar")'); b.select_option('[name=state]', 'inoperativo'); b.click('#modalForm button:has-text("Guardar")'); b.wait_for_timeout(150)
    assert b.evaluate("get('gear', 'G-B10-2').status") == 'AVERIADO'
    b.click('#modal button:has-text("Fin de revisión")'); b.fill('[name=notes]', 'Cambiado el latiguillo'); b.click('#modalForm button:has-text("Guardar")'); b.wait_for_timeout(150)
    g = b.evaluate("get('gear', 'G-B10-2')"); assert g['status'] == 'OPERATIVO' and not g['rev'] and g['revHistory'][0]['where'] == 'Taller Holmatro Telde'
    b.evaluate("closeModal(); render()"); assert b.locator('#view details:has-text("Revisiones terminadas")').count() == 1

    # Armarios: tres armarios abiertos con 5 baldas y el suelo delante; se arrastra material de una balda a otra
    b.evaluate("go('armarios')"); b.wait_for_timeout(150)
    assert b.locator('.arm-cab').count() == 3 and b.locator('.arm-shelf').count() == 15 and b.locator('.arm-floor').count() == 1
    b.evaluate("go('contenedor'); setPref({ cside: 'izq' })"); b.wait_for_timeout(150)
    b.evaluate("moveGear('B-901', 212)"); b.evaluate("go('armarios')"); b.wait_for_timeout(150)
    assert b.locator('.arm-shelf[data-door="212"] .tok-gear').count() == 1
    drag('.arm-shelf[data-door="212"] .tok-gear', '.arm-shelf[data-door="235"]')
    assert b.evaluate("get('gear', 'B-901').door") == 235 and b.evaluate("whereIs(get('gear', 'B-901'))") == 'Armario 3 · balda 5'
    drag('.arm-shelf[data-door="235"] .tok-gear', '.arm-floor')
    assert b.evaluate("get('gear', 'B-901').door") == 290
    # Pasillo: estantería de 5 módulos × 2 alturas (suelo y balda 1); se arrastra de un hueco a otro
    b.evaluate("moveGear('B-901', 110)"); b.evaluate("go('pasillo')"); b.wait_for_timeout(150)
    assert b.locator('.pas .pas-cell').count() == 10 and b.locator('.pas-cell[data-door="110"] .tok-gear').count() == 1
    drag('.pas-cell[data-door="110"] .tok-gear', '.pas-cell[data-door="141"]')
    assert b.evaluate("get('gear', 'B-901').door") == 141 and b.evaluate("whereIs(get('gear', 'B-901'))") == 'Pasillo · módulo 4 · balda 1'
    b.screenshot(path=f'{OUT}/pasillo.png', full_page=True)
    b.evaluate("moveGear('B-901', 235)"); b.evaluate("go('armarios')"); b.wait_for_timeout(150)
    b.screenshot(path=f'{OUT}/armarios.png', full_page=True)
    # Pasillo 3 y Otros (con el sitio exacto)
    b.evaluate("go('otros')"); b.wait_for_timeout(150); b.click('#alm-otros button:has-text("Material")'); b.click('#modal .add-mat [data-add=plus]')
    b.fill('[name=name]', 'Grupo electrógeno'); assert b.input_value('[name=place]') == '301'; b.fill('[name=where]', 'Nave del parque'); b.click('#modalForm button:has-text("Guardar")'); b.wait_for_timeout(200)
    assert b.locator('#view .item:has-text("Grupo electrógeno"):has-text("Nave del parque")').count() == 1
    gid = b.evaluate("list('gear').find(g => g.name === 'Grupo electrógeno').id")
    b.evaluate(f"moveGear('{gid}', {101})"); b.evaluate("go('pasillo')"); b.wait_for_timeout(150)
    assert b.locator('#view .item:has-text("Grupo electrógeno")').count() == 1
    # Fuera del contenedor no sale con «el contenedor completo»
    assert gid not in b.evaluate("missionGearIds({ container: true })")
    # Borrar una caja deja su material suelto en el mismo sitio
    b.evaluate("boxDetail('K-3')"); b.click('#modal button:has-text("Editar")'); b.click('#modal button:has-text("Eliminar caja")'); b.wait_for_timeout(200)
    assert b.evaluate("[!!get('boxes', 'K-3'), get('gear', 'B-204').box, get('gear', 'B-204').door]") == [False, '', 4]

    # ---------- Personal: alta, edición, baja y eliminación ----------
    sesion.menu(a, 'Personal')
    a.click('#view button:has-text("Persona")'); a.fill('[name=name]', 'Pérez'); a.fill('[name=role]', 'Rescatador'); save()
    o = a.evaluate("operators().find(o => o.name === 'PÉREZ')"); assert o, 'no se creó la persona'
    assert len(a.evaluate("operators()")) == 14 and a.evaluate(f"list('epis').filter(e => e.holder === '{o['id']}').length") == 7
    a.click('button:has-text("Editar datos")'); a.fill('[name=name]', 'PÉREZ GIL'); save()
    a.click('button:has-text("Editar datos")'); a.click('#modal button:has-text("Dar de baja")'); a.wait_for_timeout(200)
    assert len(a.evaluate("operators()")) == 13
    a.click('button:has-text("Todo el personal")'); assert a.locator('details:has-text("De baja (1)")').count() == 1
    a.click('details summary:has-text("De baja")'); a.click('details .item:has-text("PÉREZ GIL")')
    a.click('button:has-text("Editar datos")'); a.click('#modal button:has-text("Eliminar")'); a.wait_for_timeout(200)
    assert not a.evaluate(f"get('operators', '{o['id']}')") and a.evaluate(f"list('epis').filter(e => e.holder === '{o['id']}').length") == 0
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
