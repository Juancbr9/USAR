"""Matrículas de la flota (hoja de vehículos y pizarra de ITV): cada modelo guarda las suyas con ITV, cita, destino,
titular y suplente. Una matrícula se pasa a otro modelo (ATB M1/M2) y cambia su dibujo; la ITV sale en Vencimientos y en
una actividad se sugieren las matrículas del modelo elegido. La autobomba Renault viene vacía y el módulo se elige en cada
actividad (o se ve con cada módulo); los modelos con módulo de antes pasan a ella.
Uso: python3 tests/test_matriculas.py  (con la app servida en APP_URL)"""
import os, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *')
    n = lambda vid: a.evaluate(f"(get('vehicles', '{vid}')?.units || []).length")
    assert [n('V-AMAROK'), n('V-SANGYONG'), n('V-ATB-M1'), n('V-AB-CHASIS'), n('V-VPI'), n('V-RQ-GE')] == [3, 6, 9, 2, 1, 3]
    total = a.evaluate("list('vehicles').reduce((s, v) => s + (v.units || []).length, 0)")
    assert total == 47, total
    assert a.evaluate("get('vehicles', 'V-VPI').units[0].plate") == 'ET-121338'
    u = a.evaluate("get('vehicles', 'V-ATB-M1').units.find(u => u.plate === 'ET-110940')")
    assert u['itv'] == '2026-10-29' and u['cita'] == '28/10 11:00' and u['titular'] == 'CBO Cuñat', u
    # Al volver a arrancar no se duplica nada
    a.reload(); a.wait_for_selector('#view > *'); assert a.evaluate("list('vehicles').reduce((s, v) => s + (v.units || []).length, 0)") == 47

    # Vencimientos: las ITV, con la cita
    a.evaluate("setPref({ tab: 'vencimientos', vwin: 0 })"); a.wait_for_timeout(200)
    t = a.inner_text('#view'); assert 'ET-110940' in t and 'cita 28/10 11:00' in t and 'ITV' in t

    # ITV: al llegar la fecha, Inicio pregunta si la ha pasado; se apunta el resultado, los fallos y la próxima fecha
    a.evaluate("(() => { const v = get('vehicles', 'V-VPI'); put('vehicles', { ...v, units: v.units.map(u => ({ ...u, itv: todayISO() })) }); setPref({ tab: 'avisos' }); })()"); a.wait_for_timeout(200)
    assert a.locator('.item:has-text("ET-121338")').count() == 1 and 'ITV: ¿la han pasado?'.upper() in a.inner_text('#view').upper()
    a.click('.item:has-text("ET-121338")'); a.wait_for_selector('#modalForm [name=res]')
    a.select_option('#modalForm [name=res]', 'desfavorable'); a.fill('#modalForm [name=next]', '2026-12-01'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate("get('vehicles', 'V-VPI').units[0].itvs") is None, 'desfavorable sin fallos: pide apuntarlos'
    a.fill('#modalForm [name=defects]', 'Luz de matrícula fundida'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    u = a.evaluate("get('vehicles', 'V-VPI').units[0]")
    assert u['itv'] == '2026-12-01' and u['itvs'][0]['res'] == 'desfavorable' and u['itvs'][0]['defects'] == 'Luz de matrícula fundida', u
    assert 'ITV' in a.inner_text('#modal') and 'Luz de matrícula fundida' in a.inner_text('#modal'), 'la ficha del vehículo muestra la última ITV'
    a.keyboard.press('Escape'); a.evaluate("render()"); a.wait_for_timeout(150); assert a.locator('#view .item:has-text("ET-121338")').count() == 0, 'el aviso desaparece'
    # Editar la matrícula no borra su historial de ITV
    a.evaluate("unitForm('V-VPI', get('vehicles', 'V-VPI').units[0].id)"); a.wait_for_selector('#modalForm [name=plate]'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert len(a.evaluate("get('vehicles', 'V-VPI').units[0].itvs")) == 1
    a.keyboard.press('Escape')

    # Quien gestiona la flota (en las pruebas, GRANADOS) pasa la ATB 110940 a M2 desde su ficha: cambia de modelo y de dibujo
    a.evaluate("setPref({ tab: 'vehiculos' })"); a.wait_for_timeout(200)
    assert '9 matrículas' in a.inner_text('#view')
    a.screenshot(path=f'{OUT}/vehiculos-matriculas.png', full_page=True)
    a.evaluate("vehicleForm('V-ATB-M1')"); a.wait_for_selector('#modal .units-list')
    a.screenshot(path=f'{OUT}/vehiculo-matriculas-ficha.png')
    a.click('#modal .units-list button:has-text("ET-110940")'); a.wait_for_selector('#modalForm [name=vid]')
    a.select_option('#modalForm [name=vid]', 'V-ATB-M2'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(300)
    assert [n('V-ATB-M1'), n('V-ATB-M2')] == [8, 1]
    assert 'v-atb-m2.webp' in a.evaluate("vehArt(get('vehicles', 'V-ATB-M2'))")
    # Autobomba Renault: un solo modelo, vacía detrás (ya no hay modelos con módulo)
    assert a.evaluate("get('vehicles', 'V-AB-CHASIS').name") == 'Autobomba Renault'
    assert a.evaluate("['V-AB-CONT', 'V-AB-CONT2', 'V-AB-LCIF'].filter(id => get('vehicles', id)).length") == 0
    assert 'v-ab-chasis.webp' in a.evaluate("vehArt(get('vehicles', 'V-AB-CHASIS'))")
    assert 'v-ab-lcif.webp' in a.evaluate("vehArt(get('vehicles', 'V-AB-CHASIS'), '', 'lcif')")
    # En su ficha se ve con cada módulo
    a.keyboard.press('Escape'); a.evaluate("vehicleForm('V-AB-CHASIS')"); a.wait_for_selector('#modal .veh-mods')
    a.click('#modal .veh-mods button:has-text("Contenedor pequeño 2")')
    assert 'v-ab-cont2.webp' in a.get_attribute('#modal .veh-mods img', 'src')
    a.keyboard.press('Escape')
    # Matrícula repetida: no se admite
    a.keyboard.press('Escape')
    a.evaluate("unitForm('V-AMAROK')"); a.wait_for_selector('#modalForm [name=plate]')
    a.fill('#modalForm [name=plate]', 'et 124277'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(300)
    assert n('V-AMAROK') == 3 and n('V-SANGYONG') == 6

    # En una actividad se sugieren las matrículas del modelo elegido (las que ya van en otro vehículo, no)
    a.evaluate("vehicleEntryForm({}, '', [{ id: 'V-AMAROK', plate: 'ET-120111' }], () => {})"); a.wait_for_selector('#modalForm [name=plate]')
    a.select_option('#modalForm [name=id]', 'V-AMAROK'); a.wait_for_timeout(100)
    opts = a.evaluate("[...document.querySelectorAll('#dl-plate option')].map(o => o.value)")
    assert sorted(opts) == ['ET-120171', 'ET-120206'], opts
    a.select_option('#modalForm [name=id]', 'V-VPI'); a.wait_for_timeout(100)
    assert a.input_value('#modalForm [name=plate]') == 'ET-121338', 'con una sola matrícula se pone sola'
    assert not a.is_visible('#modalForm .veh-mods'), 'el módulo solo sale con la Renault'
    # Al llevar la Renault a una actividad se elige el módulo que lleva, y con él el dibujo
    a.keyboard.press('Escape')
    a.evaluate("window._ent = null; vehicleEntryForm({}, '', [], e => { window._ent = e; })"); a.wait_for_selector('#modalForm [name=id]')
    a.select_option('#modalForm [name=id]', 'V-AB-CHASIS'); a.wait_for_timeout(100)
    assert a.is_visible('#modalForm .veh-mods') and 'v-ab-chasis.webp' in a.get_attribute('#modalForm .veh-mods img', 'src'), 'viene vacía'
    a.click('#modalForm .veh-mods button:has-text("LCIF")')
    assert 'v-ab-lcif.webp' in a.get_attribute('#modalForm .veh-mods img', 'src')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    ent = a.evaluate("window._ent"); assert ent['id'] == 'V-AB-CHASIS' and ent['mod'] == 'lcif', ent
    assert a.evaluate("vehLabel(window._ent)").startswith('Autobomba Renault (módulo LCIF)')

    # Migración v9: las matrículas de los modelos con módulo pasan a la Renault y las actividades guardan el módulo
    a.evaluate("""(() => { const d = JSON.parse(localStorage.getItem(KEY.db)), t = Date.now();
      d.vehicles['V-AB-LCIF'] = { id: 'V-AB-LCIF', name: 'Autobomba Renault (módulo LCIF)', units: [{ id: 'U-ET999', plate: 'ET-999' }], _u: t };
      d.vehicles['V-AB-CHASIS'] = { ...d.vehicles['V-AB-CHASIS'], name: 'Autobomba Renault (sin módulo)', notes: 'Elige el módulo que lleva en cada matrícula', _u: t };
      d.moves['MV-T'] = { id: 'MV-T', title: 'Prueba', vehicles: [{ key: 'k1', id: 'V-AB-LCIF', plate: 'ET-999' }], _u: t };
      d.meta.vehbase = { id: 'vehbase', value: 8, _u: t }; localStorage.setItem(KEY.db, JSON.stringify(d)); })()""")
    a.reload(); a.wait_for_selector('#view > *')
    r = a.evaluate("[get('vehicles', 'V-AB-LCIF'), get('vehicles', 'V-AB-CHASIS').name, get('vehicles', 'V-AB-CHASIS').notes, get('vehicles', 'V-AB-CHASIS').units.some(u => u.plate === 'ET-999'), get('moves', 'MV-T').vehicles[0]]")
    assert r[:4] == [None, 'Autobomba Renault', '', True] and r[4]['id'] == 'V-AB-CHASIS' and r[4]['mod'] == 'lcif', r
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
