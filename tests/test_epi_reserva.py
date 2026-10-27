"""EPI de reserva en almacén con cantidad: cascos USAR con orejeras por color y monos USAR por talla. Al dar uno de la
reserva a una persona, la reserva baja en uno y esa persona lo lleva.
Uso: python3 tests/test_epi_reserva.py  (con la app servida en APP_URL)"""
import os, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    a = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True).new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.goto(APP); a.wait_for_selector('#view > *')
    res = a.evaluate("list('epis').filter(e => e.holder === RESERVA).map(e => [epiLabel(e), e.size, epiQty(e)]).sort()")
    cascos = {l: n for l, s, n in res if l.startswith('Casco USAR')}
    monos = {s: n for l, s, n in res if l == 'Mono USAR'}
    assert cascos == {'Casco USAR con orejeras · Rojo': 17, 'Casco USAR con orejeras · Blanco': 7, 'Casco USAR con orejeras · Verde': 1}, cascos
    assert monos == {'44': 7, '46': 8, '48': 6, '52': 1} and sum(monos.values()) == 22, monos
    a.reload(); a.wait_for_selector('#view > *')
    assert a.evaluate("list('epis').filter(e => e.id.startsWith('EPI-RES-')).length") == 7, 'no se duplican'
    # En Personal, la reserva suma las cantidades
    a.evaluate("setPref({ tab: 'personal', person: null })"); a.wait_for_timeout(200)
    a.click('summary:has-text("EPI de reserva")'); a.wait_for_timeout(150)
    assert 'EPI de reserva en almacén (47)' in a.text_content('#view')
    a.screenshot(path=f'{OUT}/epi-reserva.png', full_page=True)
    # Dar un casco rojo de la reserva a GRANADOS (OP-01)
    a.evaluate("epiForm('EPI-RES-CASCO-ROJO')"); a.wait_for_selector('#modalForm [name=holder]')
    a.select_option('#modalForm [name=holder]', 'OP-01'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate("epiQty(get('epis', 'EPI-RES-CASCO-ROJO'))") == 16
    assert a.evaluate("list('epis').some(e => e.holder === 'OP-01' && e.color === 'Rojo' && e.desc === 'Casco USAR con orejeras')")
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
