"""Prueba de una intervención completa: equipos, vehículos, material, diario, inicio, fin y duplicado.
Uso: python3 tests/test_operaciones.py  (con la app servida en APP_URL y, si aplica, el servidor de prueba en MOCK_URL)"""
import os, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
MOCK = os.environ.get('MOCK_URL', 'http://127.0.0.1:54321')
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)
problems = []
with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type in ('warning', 'error') and 'ERR_TUNNEL' not in m.text and problems.append(f'{m.type}: {m.text}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *')
    MAIN = {'Avisos': 'Inicio', 'Operaciones': 'Operaciones'}
    def tab(n):
        n = {'Stock': 'Almacén'}.get(n, n)
        sesion.menu(a, MAIN.get(n, n))
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(150))
    mtab = lambda n: (a.click(f'.tab:has-text("{n}")'), a.wait_for_timeout(150))

    tab('Operaciones'); a.screenshot(path=f'{OUT}/ops-lista.png', full_page=True)
    a.click('button:has-text("Intervención")'); a.click('#modal .item:has-text("En blanco")')
    a.fill('[name=title]', 'Derrumbe vivienda C/ Real'); a.fill('[name=location]', 'Calle Real 12, Telde')
    a.fill('[name=meeting]', 'Parque de bomberos, 07:30'); a.select_option('[name=chief]', label='GRANADOS'); a.fill('[name=channel]', 'TETRA 2')
    a.fill('[name=objective]', 'Vivienda de 2 plantas colapsada, posible víctima atrapada.'); save()
    assert a.locator('h2:text-is("Derrumbe vivienda C/ Real")').count() == 1

    mtab('Personal'); a.click('button:has-text("Crear por células")'); a.wait_for_timeout(150)
    n_teams = a.locator('.item:has-text("Jefe:")').count(); print('Equipos creados:', n_teams)
    a.locator('button[onclick^=teamForm]:has-text("Corte y Penetración")').click()
    a.fill('[name=func]', 'Apertura de huecos'); a.fill('[name=zone]', 'A'); a.select_option('[name=leader]', label='DORTA'); save()
    assert a.locator('button[onclick^=teamForm]:has-text("Corte y Penetración"):has-text("Jefe: DORTA")').count() == 1

    a.click('button.btn[onclick^=missionVehicleForm]')
    a.select_option('[name=id]', label='Guagua pequeña'); a.select_option('[name=driver]', label='MANOLO')
    for n in ['AGUIAR', 'DORTA', 'CRISTOFER']: a.click(f'.check-row:has-text("{n}")')
    save(); assert a.locator('.item:has-text("Conductor: MANOLO")').count() == 1

    mtab('Material'); assert 'contenedor completo' in a.inner_text('#view').lower(), 'una intervención sale con el contenedor completo'
    full = a.evaluate("missionGearIds(mget(prefs.mission)).length"); assert full == a.evaluate("list('gear').length"), full
    a.click('button:has-text("Elegir material")'); a.click('#gearPickForm label:has-text("Solo lo que marque")')
    a.locator('fieldset:has-text("B5 ·") button:has-text("Todo")').click()
    a.locator('fieldset:has-text("B4 ·") .check-row:has-text("Máscara de soldadura")').click()
    a.click('button:has-text("Guardar material")'); a.wait_for_timeout(150)
    assert 'material (18)' in a.inner_text('#view').lower(), a.inner_text('#view')[:300]
    a.click('button:has-text("Extra")'); a.fill('#extraRows .extra-row >> nth=0 >> [name=name]', 'Puntales de madera'); a.fill('#extraRows .extra-row >> nth=0 >> [name=qty]', '4')
    a.click('#extrasForm button:has-text("Otra línea")'); a.fill('#extraRows .extra-row >> nth=1 >> [name=name]', 'Grupo electrógeno'); a.click('#extrasForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate("mget(prefs.mission).extras") == [{'name': 'Puntales de madera', 'qty': 4}, {'name': 'Grupo electrógeno', 'qty': 1}]
    assert 'Puntales de madera' in a.inner_text('#view')
    # Cualquier vehículo puede llevar material; los modelos se repiten (dos Amarok con matrícula distinta)
    ids = a.evaluate("missionGearIds(mget(prefs.mission))"); n0 = len(ids); assert 'B-901' not in ids, ids
    mtab('Personal'); a.click('button.btn[onclick^=missionVehicleForm]'); a.select_option('[name=id]', label='Amarok'); assert a.input_value('[name=plate]') == 'ET-'; a.fill('[name=plate]', '12345')
    a.check('input[name=gear][value=B-901]'); a.check('input[name=gear][value=B-902]'); save()
    a.click('button.btn[onclick^=missionVehicleForm]'); a.select_option('[name=id]', label='Amarok'); a.fill('[name=plate]', '5678 DEF'); save()
    vs = a.evaluate("mget(prefs.mission).vehicles"); assert len(vs) == 3 and len({v['key'] for v in vs}) == 3, vs
    ids = a.evaluate("missionGearIds(mget(prefs.mission))"); assert 'B-901' in ids and 'B-902' in ids and len(ids) == n0 + 2, ids
    txt = a.evaluate("missionText(mget(prefs.mission))"); assert 'Amarok · ET-12345' in txt and 'Transmisiones (TETRA)' in txt, txt
    assert a.locator('.item:has-text("5678 DEF")').count() == 1
    # Sin repetir: quien conduce no sale entre los ocupantes, quien ya va en un vehículo no sale en otro y el material no se duplica
    a.click('button.btn[onclick^=missionVehicleForm]'); a.select_option('[name=id]', label='Amarok')
    drv = a.evaluate("[...$('modalForm').elements.driver.options].map(o => o.text)")
    assert not {'MANOLO', 'AGUIAR', 'DORTA', 'CRISTOFER'} & set(drv), drv
    crew = a.evaluate("[...document.querySelectorAll('input[name=crew]')].map(c => c.closest('.check-row').textContent.trim())")
    assert 'AGUIAR' not in crew and 'MANOLO' not in crew and 'GRANADOS' in crew, crew
    gid = a.evaluate("operators().find(o => o.name === 'GRANADOS').id")
    a.check(f'input[name=crew][value="{gid}"]'); a.select_option('[name=driver]', label='GRANADOS')
    assert a.locator(f'.check-row:has(input[name=crew][value="{gid}"])').is_hidden() and not a.is_checked(f'input[name=crew][value="{gid}"]')
    assert a.locator('input[name=gear][value=B-901]').count() == 0, 'la caja ya va en otro Amarok'
    multi = a.evaluate("list('gear').find(g => !get('boxes', g.box) && +g.qty >= 3 && !vehGearIds(mget(prefs.mission)).has(g.id))")
    assert multi, 'hace falta un equipo suelto con varias unidades'
    a.check(f'input[name=gear][value="{multi["id"]}"]'); a.fill(f'[name="gear__q_{multi["id"]}"]', '2'); save()
    v4 = a.evaluate("mget(prefs.mission).vehicles")[-1]
    assert v4['driver'] == gid and v4['crew'] == [] and v4['gearQty'] == {multi['id']: 2}, v4
    assert f'{multi["name"]} ×2' in a.evaluate("missionText(mget(prefs.mission))")
    a.click('button.btn[onclick^=missionVehicleForm]'); a.select_option('[name=id]', label='Amarok')
    assert a.locator(f'input[name=crew][value="{gid}"]').count() == 0
    left = int(multi['qty']) - 2
    row = a.locator(f'.check-row:has(input[name=gear][value="{multi["id"]}"])')
    assert f'quedan {left} de {multi["qty"]}' in row.inner_text(), row.inner_text()
    if left > 1: assert a.get_attribute(f'[name="gear__q_{multi["id"]}"]', 'max') == str(left)
    a.evaluate('closeModal()'); a.wait_for_timeout(100)
    # Elegir material no mueve lo repartido por unidades
    mtab('Material'); a.click('button:has-text("Elegir material")'); a.click('button:has-text("Guardar material")'); a.wait_for_timeout(150)
    assert a.evaluate("mget(prefs.mission).vehicles")[-1]['gearQty'] == {multi['id']: 2}
    mtab('Personal')

    mtab('Seguridad'); a.locator('.panel:has-text("Seguridad, contactos") button:has-text("Editar")').click()
    a.fill('[name=safety]', 'Riesgo de colapso secundario. Vigía en acceso norte.'); a.fill('[name=contacts]', 'Sala 112'); save()
    mtab('Diario'); a.fill('[name=t]', 'Llegada a zona, valoración inicial'); a.press('[name=t]', 'Enter'); a.wait_for_timeout(150)
    assert a.locator('.log:has-text("valoración inicial")').count() == 1
    mtab('Personal'); a.locator('.item:has-text("DORTA"):has-text("Jefe de equipo")').first.click()
    a.fill('[name=role]', 'Jefe equipo corte'); save()
    a.screenshot(path=f'{OUT}/ops-detalle.png', full_page=True)

    a.click('button:has-text("Iniciar")'); a.wait_for_timeout(200)
    # Modo misión: consola oscura con el reloj corriendo, las cifras y Finalizar
    assert a.locator('#view .mc').count() == 1 and a.evaluate("document.body.classList.contains('mision')")
    t0 = a.inner_text('.mc-clock b'); a.wait_for_timeout(2200); assert a.inner_text('.mc-clock b') != t0, 'el reloj corre'
    assert a.locator('.mc-stat').count() == 3 and a.locator('.mc button:has-text("Finalizar")').count() == 1
    tab('Contenedor')
    assert not a.evaluate("document.body.classList.contains('mision')")
    assert a.locator('.tok.is-out').count() == 0, 'lo que sale con la operación no se tacha (solo los préstamos)'
    assert a.evaluate("list('gear').filter(g => g.door === 5 && g.out?.who?.includes('Derrumbe')).length") == 17
    tab('Avisos'); assert a.locator('.panel.live').count() == 1
    a.screenshot(path=f'{OUT}/ops-avisos.png')
    text = a.evaluate("missionText(list('missions')[0])"); print('--- Orden de salida ---\n' + text + '\n---')

    a.click('.panel.live h2'); a.click('button:has-text("Finalizar")')
    a.fill('[name=summary]', 'Bien la coordinación; faltó un disco de repuesto.'); save()
    tab('Contenedor')
    assert a.locator('.tok.is-out').count() == 0 and a.evaluate("list('gear').filter(g => g.out).length") == 0, 'material no devuelto'
    tab('Operaciones'); a.click('summary:has-text("Terminadas")'); a.click('.item:has-text("Derrumbe")'); a.screenshot(path=f'{OUT}/ops-cerrada.png', full_page=True); a.click('button[aria-label="Más acciones"]'); a.click('.menu-item:has-text("Duplicar")')
    a.wait_for_timeout(200); a.click('#view button.link:has-text("Todas las intervenciones")'); n = a.locator('.list .item[onclick^=openMission]').count(); print('Operaciones en la lista:', n); assert n == 2
    a.screenshot(path=f'{OUT}/ops-lista2.png', full_page=True)
    br.close()
print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
