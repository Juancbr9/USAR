"""Matrículas de la flota (hoja de vehículos y pizarra de ITV): cada modelo guarda las suyas con ITV, cita, destino,
titular y suplente. Una matrícula se pasa a otro modelo (ATB M1/M2, módulo del Renault) y cambia su dibujo; la ITV sale
en Vencimientos y en una actividad se sugieren las matrículas del modelo elegido.
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
    # Renault sin módulo: tiene su dibujo; al elegir el módulo se ve el del módulo
    assert 'v-ab-chasis.webp' in a.evaluate("vehArt(get('vehicles', 'V-AB-CHASIS'))")
    a.evaluate("unitForm('V-AB-CHASIS', 'U-ET121931')"); a.wait_for_selector('#modalForm [name=vid]')
    a.select_option('#modalForm [name=vid]', 'V-AB-LCIF'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(300)
    assert n('V-AB-CHASIS') == 1 and a.evaluate("get('vehicles', 'V-AB-LCIF').units[0].plate") == 'ET-121931'
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
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
