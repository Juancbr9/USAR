"""Prueba de: entregas a personal de fuera (firma con el dedo, fotos, devolución), revista eligiendo qué se revista
(correcto, fallo, taller, otro sitio, baja, no se revista), material de una salida con su destino (contenedor o vehículo),
coordenadas en lat/lon, UTM y MGRS, unidades en Ajustes, desplegables del worksite y menú de Material.
Uso: python3 tests/test_material2.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
PNG = str(ROOT / 'icon-512.png')
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'net::' not in m.text and 'Failed to load' not in m.text and problems.append(m.text))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *'); a.evaluate("window.print = () => {}")
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(400))

    # ---------- Menú: Material con sus subopciones ----------
    a.click('#menuBtn'); a.click('#drawer .dr-group-head:has-text("Logística")'); a.wait_for_timeout(100)
    assert a.locator('#drawer .dr-item.sub2').count() == 0, 'Material empieza plegado'
    a.click('#drawer .dr-group-head:has-text("Material")'); a.wait_for_timeout(100)
    assert [t.split('\n')[0].strip() for t in a.locator('#drawer .dr-item.sub2').all_inner_texts()] == ['Contenedor', 'En revisión', 'Fuera del contenedor', 'Material fungible', 'Entregas']
    assert a.locator('#drawer .dr-item:has-text("Revista")').count() == 1
    a.click('#drawer .dr-item:has-text("Material fungible")'); a.wait_for_timeout(150)
    assert 'material fungible' in a.inner_text('#view h2').lower()
    # Fuera del contenedor: una entrada del menú con Pasillo, Armarios y Otros en pestañas; recuerda la última
    a.click('#menuBtn'); a.click('#drawer .dr-item:has-text("Fuera del contenedor")'); a.wait_for_timeout(150)
    assert a.inner_text('#view h2').lower() == 'pasillo' and a.locator('#view .seg-row button').all_inner_texts() == ['Pasillo', 'Armarios', 'Otros']
    a.click('#view .seg-row button:has-text("Armarios")'); a.wait_for_timeout(150)
    assert a.inner_text('#view h2').lower() == 'armarios'
    a.evaluate("go('avisos')"); a.evaluate("go('fuera')"); a.wait_for_timeout(150)
    assert a.inner_text('#view h2').lower() == 'armarios', 'Fuera del contenedor vuelve a la última pestaña'
    a.click('#menuBtn'); assert a.locator('#drawer .dr-item.on:has-text("Fuera del contenedor")').count() == 1; a.click('#drawer [aria-label="Cerrar menú"]')

    # ---------- Entrega con firma ----------
    a.evaluate("go('entregas')"); a.wait_for_timeout(150); a.click('#view button:has-text("Entrega")')
    a.fill('[name=to]', 'Cabo 1º Pérez Gil'); a.fill('[name=unit]', 'BIEM II'); a.fill('[name=purpose]', 'Ejercicio en Lanzarote')
    a.fill('[name=due]', '2026-01-05')
    a.fill('#modalForm input[type=search]', 'tetra'); a.wait_for_timeout(100)
    assert a.locator('#modalForm .check-row:visible').count() == 1
    a.click('#modalForm .check-row:visible'); a.fill('#modalForm input[type=search]', ''); a.check('#modalForm input[name=gear][value=B-902]')
    a.fill('[name=notes]', 'Completo, con funda')
    a.locator('#modalForm [data-photo]').first.locator('input[type=file]').first.set_input_files(PNG); a.wait_for_timeout(500)
    box = a.locator('#modalForm .sig canvas').bounding_box()
    a.mouse.move(box['x'] + 20, box['y'] + 30); a.mouse.down()
    for i in range(12): a.mouse.move(box['x'] + 20 + i * 18, box['y'] + 30 + (i % 3) * 20, steps=2)
    a.mouse.up(); a.wait_for_timeout(100)
    assert a.locator('#modalForm .sig.signed').count() == 1
    save(); a.wait_for_timeout(500)
    l = a.evaluate("loans()[0]")
    assert l['to'] == 'Cabo 1º Pérez Gil' and set(l['gear']) == {'B-901', 'B-902'} and l['signed'] and len(l['photos']) == 1, l
    assert a.evaluate("get('gear', 'B-901').out.loan") == l['id'] and 'Pérez' in a.evaluate("get('gear', 'B-901').out.who")
    a.wait_for_selector('#modal img.sig-img[src^="data:image/png"]', timeout=5000)
    assert a.locator('#modal .tag:has-text("Fuera de plazo")').count() == 1
    a.screenshot(path=f'{OUT}/entrega.png', full_page=True)
    a.evaluate(f"printLoan('{l['id']}')"); a.wait_for_timeout(300); assert 'Recibí conforme' in a.inner_html('#print') and '<img' in a.inner_html('#print')
    assert 'Transmisiones' in a.evaluate(f"loanText(get('loans', '{l['id']}'))")
    # el material ya entregado no se puede volver a entregar
    assert 'B-901' not in [x[0] for x in a.evaluate("loanOptions()")]
    a.evaluate(f"loanDetail('{l['id']}')"); a.click('#modal button:has-text("Devolución")'); a.fill('[name=notes]', 'Vuelve bien'); save()
    assert a.evaluate("get('gear', 'B-901').out") is None and a.evaluate(f"get('loans', '{l['id']}').returned.notes") == 'Vuelve bien'

    # ---------- Revista eligiendo qué se revista ----------
    a.evaluate("closeModal(); go('revista')"); a.wait_for_timeout(150); a.click('button:has-text("Iniciar revista")')
    a.uncheck('#modalForm input[name=groups][value=der]'); a.uncheck('#modalForm input[name=groups][value=sin]'); save()
    ids = a.evaluate("prefs.draft.ids")
    assert ids and all(1 <= a.evaluate(f"get('gear', '{i}').door") <= 10 for i in ids[:20]), 'solo el lateral izquierdo'
    g1, g2, g3, g4 = ids[0], ids[1], ids[2], ids[3]
    a.evaluate(f"mark('{g1}', 'bad')"); a.fill(f'.check:has([onclick="mark(\'{g1}\', \'bad\')"]) input.input', 'No arranca')
    a.evaluate(f"markMore('{g2}')"); a.click('#modal .item:has-text("Está en el taller")')
    a.evaluate(f"markMore('{g3}')"); a.click('#modal .item:has-text("Está en otro sitio")'); a.select_option('[name=place]', '101'); save()
    a.evaluate(f"markMore('{g4}')"); a.click('#modal .item:has-text("De baja")')
    a.click('.check-row:has-text("Solo lo que falta")'); a.wait_for_timeout(150)
    assert a.locator(f'[onclick="mark(\'{g1}\', \'ok\')"]').count() == 0, '«Solo lo que falta» esconde lo marcado'
    a.screenshot(path=f'{OUT}/revista2.png', full_page=True)
    a.locator('.panel:not(.progress) button:has-text("Todo OK")').first.click(); a.wait_for_timeout(150)
    a.click('button:has-text("Finalizar revista")'); a.wait_for_timeout(400)
    st = a.evaluate(f"['{g1}', '{g2}', '{g3}', '{g4}'].map(id => {{ const g = get('gear', id); return [g.status, g.rev?.state || '', g.door]; }})")
    assert st[0][:2] == ['REVISIÓN', 'espera'] and st[1][:2] == ['REVISIÓN', 'taller'] and st[2][2] == 101 and st[3][:2] == ['AVERIADO', 'baja'], st
    r = a.evaluate("list('inspections').sort((a, b) => b.date - a.date)[0]")
    assert r['reason'] == 'Mensual' and len(r['fails']) == 1 and len(r['other']) == 3 and 'izquierdo' in r['scope'], r

    # ---------- Material de la salida con su destino ----------
    a.evaluate("""(() => { stamp('missions', { id: 'M-1', type: 'ejercicio', scope: 'usar', status: 'prep', date: localNow(), title: 'Maniobra', chief: 'OP-01', teams: [],
      vehicles: [{ key: 'MV-1', id: 'V-AMAROK', plate: '1234 ABC', driver: 'OP-02', crew: [], gear: [] }], container: true, gear: [] }); commit(); openMission('M-1', 'material'); })()""")
    a.wait_for_timeout(200); a.click('button:has-text("Elegir material")')
    a.click('#gearPickForm label:has-text("Solo lo que marque")')
    a.check('#gearPickForm input[name=gear][value=G-B19-5]'); a.select_option('#gearPickForm [name="dest-G-B19-5"]', 'MV-1')
    a.check('#gearPickForm input[name=gear][value=B-901]')
    a.click('#gearPickForm button:has-text("Guardar material")'); a.wait_for_timeout(200)
    m = a.evaluate("mget('M-1')")
    assert not m['container'] and m['gear'] == ['B-901'] and m['vehicles'][0]['gear'] == ['G-B19-5'], m
    a.click('button:has-text("Extra")')
    a.fill('#extraRows .extra-row >> nth=0 >> [name=name]', 'Puntales de madera'); a.fill('#extraRows .extra-row >> nth=0 >> [name=qty]', '4')
    a.select_option('#extraRows .extra-row >> nth=0 >> [name=in]', 'MV-1')
    a.click('#extrasForm button:has-text("Otra línea")'); a.fill('#extraRows .extra-row >> nth=1 >> [name=name]', 'Grupo electrógeno')
    a.click('#extrasForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate("mget('M-1').extras") == [{'name': 'Puntales de madera', 'qty': 4, 'in': 'MV-1'}, {'name': 'Grupo electrógeno', 'qty': 1}]
    assert a.locator('.mat-veh:has-text("Amarok"):has-text("4 × Puntales de madera"):has-text("Escalera plegable")').count() == 1
    txt = a.evaluate("missionText(mget('M-1'))"); assert 'En Amarok · 1234 ABC: Escalera plegable, 4 × Puntales de madera' in txt and 'Extra: Grupo electrógeno' in txt, txt

    # ---------- Operaciones: dos botones grandes, sin «+» ----------
    a.evaluate("go('operaciones')"); a.wait_for_timeout(150)
    assert a.locator('.op-tile').count() == 2 and a.locator('.op-tile svg').count() == 2 and 'En preparación' in a.inner_text('#view')

    # ---------- Coordenadas ----------
    mg = a.evaluate("toMGRS(28.1235, -15.4363)"); assert mg == '28R DS 57150 10960', mg
    back = a.evaluate("parseCoord('28R DS 57150 10960')"); assert abs(back[0] - 28.1235) < 1e-3 and abs(back[1] + 15.4363) < 1e-3, back
    back = a.evaluate("parseCoord('28R 457151 3110960')"); assert abs(back[0] - 28.1235) < 1e-4, back
    assert a.evaluate("parseCoord('28,1235; -15,4363')") == [28.1235, -15.4363]
    a.evaluate("go('ajustes')"); a.wait_for_timeout(150)
    a.select_option('.panel:has-text("Unidades") select >> nth=0', 'mgrs'); a.select_option('.panel:has-text("Unidades") select >> nth=1', 'km')
    assert a.evaluate("[prefs.coordFmt, prefs.distUnit, fmtDist(250)]") == ['mgrs', 'km', '0,25 km']
    # Worksite: desplegables, coordenadas en MGRS y varios riesgos
    a.evaluate("openMission('M-1', 'worksites')"); a.wait_for_timeout(150); a.click('button.btn-a:has-text("Worksite")')
    assert 'I' not in a.evaluate("[...document.querySelectorAll('#modalForm [name=sector] option')].map(o => o.value)")
    a.select_option('[name=sector]', 'B'); a.select_option('[name=sub]', 'a'); a.fill('[name=pos]', '28R DS 57150 10960')
    a.check('input[name=hazards][value="Gas"]'); a.check('input[name=hazards][value="Amianto"]'); a.fill('[name=hazards__new]', 'Perro suelto'); save()
    a.keyboard.press('Escape'); a.wait_for_timeout(300)
    w = a.evaluate("list('worksites').find(w => w.mission === 'M-1')")
    assert w['code'] == 'B-1a' and abs(float(w['lat']) - 28.1235) < 1e-3 and w['hazards'] == 'Gas, Amianto, Perro suelto', w
    a.evaluate(f"closeModal(); setPref({{ ws: '{w['id']}' }})"); a.wait_for_timeout(200)
    assert '28R DS 57150 10960' in a.inner_text('#view'), 'la ficha muestra las coordenadas en MGRS'
    a.evaluate("setPref({ coordFmt: 'latlon', distUnit: 'm' })")

    # ---------- Funciones avanzadas siempre activas e indicativo fijo: sin opción en Ajustes ----------
    a.evaluate("closeModal(); setPref({ ws: null }); openMission('M-1', 'seguridad')"); a.wait_for_timeout(200)
    assert 'espacios confinados' in a.inner_text('#view').lower(), 'confinados siempre visible'
    a.evaluate("openMission('M-1', 'informes')"); a.wait_for_timeout(200)
    assert 'posiciones (kml)' in a.inner_text('#view').lower(), 'exportar siempre visible'
    a.evaluate("missionForm(null, 'intervencion')"); a.wait_for_timeout(150)
    assert a.locator('#modalForm [name=scope]').count() == 1, 'ámbito BIC siempre disponible'
    a.evaluate("closeModal(); put('meta', { id: 'teamcode', value: 'ESP-9' }); go('ajustes')"); a.wait_for_timeout(200)
    txt = a.inner_text('#view').lower()
    assert 'funciones avanzadas' not in txt and 'indicativo' not in txt, 'sin opciones de avanzadas ni indicativo'
    assert a.evaluate("teamCode()") == 'USAR-242', 'el indicativo es fijo'
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
