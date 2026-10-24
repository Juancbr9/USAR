"""Prueba de Actividades: el menú (Activación, Ejercicios, Maniobras y Convoy), una maniobra con alojamiento, planning
diario y quién va marcado de una vez, el reparto de vehículos sin duplicados y un convoy de ida y vuelta.
Uso: python3 tests/test_actividades.py  (con la app en APP_URL)"""
import os, sys
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada como GRANADOS)

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []

def watch(pg, name):
    pg.on('pageerror', lambda e: problems.append(f'{name} ERROR {e}'))
    pg.on('console', lambda m: m.type == 'error' and 'Failed to load resource' not in m.text and problems.append(f'{name} {m.type}: {m.text}'))
    pg.on('dialog', lambda d: d.accept())

with sync_playwright() as p:
    br = p.chromium.launch()
    a = br.new_context(viewport={'width': 400, 'height': 860}).new_page(); watch(a, 'MOVIL')
    a.goto(APP); a.wait_for_selector('#view > *')

    # Menú: el área se llama Actividades y dentro están los cuatro apartados
    a.click('#menuBtn'); a.click('#drawer .dr-group-head:has-text("Actividades")')
    assert a.locator('#drawer .dr-item').all_inner_texts()[1:5] == ['Activación', 'Ejercicios', 'Maniobras', 'Convoy'], a.locator('#drawer .dr-item').all_inner_texts()
    a.keyboard.press('Escape')
    sesion.menu(a, 'Activación'); assert a.locator('button:has-text("Nueva intervención")').count() == 1
    assert a.evaluate("document.documentElement.dataset.area") == 'ops'

    # Maniobra de tres días con alojamiento que cambia
    sesion.menu(a, 'Maniobras'); a.click('button:has-text("Nueva maniobra")')
    a.fill('[name=title]', 'Maniobras Lanzarote'); a.fill('[name=place]', 'Arrecife')
    a.fill('[name=start]', '2030-05-10'); a.fill('[name=end]', '2030-05-12')
    assert a.locator('[name=lodging]').is_visible(), 'con alojamiento fijo se pide dónde'
    a.select_option('[name=lodgingMode]', 'variable'); assert not a.locator('[name=lodging]').is_visible()
    a.fill('[name=notes]', 'Llevar saco de dormir')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(300)
    mid = a.evaluate("prefs.move"); assert mid and a.evaluate("prefs.tab") == 'maniobras'
    assert a.evaluate(f"actGet('{mid}').days.map(d => d.date)") == ['2030-05-10', '2030-05-11', '2030-05-12'], 'un día de planning por fecha'
    assert a.evaluate(f"actGet('{mid}').by") == 'OP-01'

    # Quién va: se marca tocando nombres, o todos de una vez
    a.click('.move-people .chip:has-text("DORTA")'); a.click('.move-people .chip:has-text("AGUIAR")'); a.wait_for_timeout(100)
    assert sorted(a.evaluate(f"names(actGet('{mid}').people)")) == ['AGUIAR', 'DORTA']
    a.click('.move-people .chip:has-text("DORTA")'); a.wait_for_timeout(100)
    assert a.evaluate(f"names(actGet('{mid}').people)") == ['AGUIAR']
    a.click('button:has-text("Todos")'); a.wait_for_timeout(100)
    n = a.evaluate("operators().length"); assert a.evaluate(f"actGet('{mid}').people.length") == n
    assert f'Quién va ({n} de {n})'.lower() in a.inner_text('#view').lower()

    # Vehículos: quien ya va en uno no sale para el siguiente, ni la caja ya cargada
    a.click('#view button:has-text("Vehículo")'); a.select_option('[name=id]', 'V-SANGYONG')
    a.select_option('[name=driver]', 'OP-05'); a.check('#modalForm input[name=crew][value="OP-06"]')
    box = a.evaluate("boxes()[0].id"); a.check(f'#modalForm input[name=gear][value="{box}"]')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    a.click('#view button:has-text("Vehículo")')
    assert a.locator('#modalForm [name=driver] option[value="OP-05"]').count() == 0 and a.locator('#modalForm input[name=crew][value="OP-06"]').count() == 0, 'nadie va en dos vehículos'
    assert a.locator(f'#modalForm input[name=gear][value="{box}"]').count() == 0, 'la carga no se repite'
    a.select_option('[name=id]', 'V-AMAROK'); a.select_option('[name=driver]', 'OP-07')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert len(a.evaluate(f"actGet('{mid}').vehicles")) == 2
    # Quien deja de ir sale de su vehículo
    a.click('.move-people .chip:has-text("DORTA")'); a.wait_for_timeout(100)
    assert a.evaluate(f"actGet('{mid}').vehicles.find(v => v.id === 'V-SANGYONG').crew") == []

    # Planning del segundo día con su alojamiento
    a.click('#view .item:has-text("Día 2")'); a.fill('[name=lodging]', 'Albergue de Teguise'); a.fill('[name=plan]', '08:00 Desayuno\n09:00 Colapso')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert 'Albergue de Teguise' in a.inner_text('#view') and '09:00 Colapso' in a.inner_text('#view')
    txt = a.evaluate(f"actText(actGet('{mid}'))")
    assert 'MANIOBRA' in txt and 'Albergue de Teguise' in txt and 'SsangYong' in txt and 'Llevar saco de dormir' in txt, txt
    a.screenshot(path='/tmp/actividades-maniobra.png', full_page=True)

    # Convoy de ida y vuelta: la hora de vuelta solo se pide si hay vuelta
    sesion.menu(a, 'Convoy'); assert a.evaluate("prefs.move") is None
    a.click('button:has-text("Nuevo convoy")')
    a.fill('[name=title]', 'Contenedor al puerto'); a.fill('[name=origin]', 'Base'); a.fill('[name=destination]', 'Puerto')
    assert not a.locator('[name=back]').is_visible()
    a.select_option('[name=round]', '1'); assert a.locator('[name=back]').is_visible()
    a.fill('[name=start]', '2030-06-01T08:00'); a.fill('[name=back]', '2030-06-01T18:00')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(300)
    cid = a.evaluate("prefs.move"); c = a.evaluate(f"actGet('{cid}')")
    assert c['type'] == 'convoy' and c['round'] is True and c['back'] == '2030-06-01T18:00'
    assert 'Base → Puerto' in a.inner_text('#view')
    a.click('#view button:has-text("Vehículo")'); a.select_option('[name=id]', 'V-VPI'); a.select_option('[name=driver]', 'OP-02')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate(f"names(actGet('{cid}').people)") == ['CABRERA'], 'quien conduce queda marcado como que va'
    a.evaluate("go('convoy')"); a.wait_for_timeout(100)
    assert a.locator('#view .item:has-text("Contenedor al puerto")').count() == 1
    a.evaluate("history.back()"); a.wait_for_timeout(200); assert a.evaluate("prefs.move") == cid, 'atrás vuelve a la ficha'

    # Lo creado por otra persona se ve, pero no se cambia
    b = br.new_context(viewport={'width': 400, 'height': 860}, flota=True).new_page(); watch(b, 'OTRO')
    b.goto(APP); b.wait_for_selector('#view > *')
    b.evaluate("put('moves', { id: 'AC-OTRO', type: 'maniobra', title: 'De otro', by: 'OP-09', start: '2030-07-01', end: '2030-07-01', people: ['OP-09'], vehicles: [], days: [] }); openAct('AC-OTRO')"); b.wait_for_timeout(200)
    assert b.locator('.move-people').count() == 0 and b.locator('#view button:has-text("Editar")').count() == 0 and 'AREVALO' in b.inner_text('#view')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
