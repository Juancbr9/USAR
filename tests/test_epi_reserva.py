"""EPI: cada persona lleva casco USAR (blanco GRANADOS y CABRERA, el resto rojo), sus protectores auditivos y su mono; ya no
hay guantes, gafas, FFP ni botas. La reserva lleva cantidad: lo que sobra de cascos y protectores, y los 22 monos por talla,
en el armario de la derecha (armario 3), donde se ve dibujado. Al dar uno de la reserva a una persona, la reserva baja.
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
    n_ops = a.evaluate("operators().length")
    assert sorted(a.evaluate("Object.keys(EPI_TYPES)")) == ['auditivos', 'casco', 'mono']
    assert a.evaluate("list('epis').filter(e => ['guantes', 'gafas', 'respiratoria', 'botas'].includes(e.type)).length") == 0
    # Cascos: blanco GRANADOS y CABRERA, el resto rojo; todos con protectores auditivos
    cascos = dict(a.evaluate("operators().map(o => [o.name, (list('epis').find(e => e.holder === o.id && e.type === 'casco') || {}).color])"))
    assert cascos['GRANADOS'] == 'Blanco' and cascos['CABRERA'] == 'Blanco' and all(c == 'Rojo' for n, c in cascos.items() if n not in ('GRANADOS', 'CABRERA')), cascos
    assert a.evaluate("operators().every(o => list('epis').some(e => e.holder === o.id && e.type === 'auditivos'))")
    # Reserva: lo que sobra
    q = lambda id: a.evaluate(f"get('epis', '{id}') ? epiQty(get('epis', '{id}')) : 0")
    assert [q('EPI-RES-CASCO-ROJO'), q('EPI-RES-CASCO-BLANCO'), q('EPI-RES-CASCO-VERDE'), q('EPI-RES-AUDITIVOS')] == [17 - (n_ops - 2), 5, 1, 25 - n_ops]
    monos = dict(a.evaluate("list('epis').filter(e => e.holder === RESERVA && e.type === 'mono').map(e => [e.size, epiQty(e)])"))
    assert monos == {'44': 7, '46': 8, '48': 6, '52': 1}, monos
    total = a.evaluate("list('epis').filter(e => e.holder === RESERVA).reduce((s, e) => s + epiQty(e), 0)")
    a.reload(); a.wait_for_selector('#view > *')
    assert a.evaluate("list('epis').filter(e => e.holder === RESERVA).reduce((s, e) => s + epiQty(e), 0)") == total, 'no se duplica al reiniciar'
    # En Personal, la reserva suma las cantidades y dice dónde está
    a.evaluate("setPref({ tab: 'personal', person: null })"); a.wait_for_timeout(200)
    a.click('summary:has-text("EPI de reserva")'); a.wait_for_timeout(150)
    assert f'EPI de reserva en almacén ({total})' in a.text_content('#view') and 'Armario 3' in a.text_content('#view')
    a.screenshot(path=f'{OUT}/epi-reserva.png', full_page=True)
    # En el armario de la derecha se ve la reserva, con su cantidad; tocarla abre su ficha
    a.evaluate("go('armarios')"); a.wait_for_timeout(250)
    assert a.locator('.arm-shelf[data-door="231"] .tok-epi').count() == 4 and a.locator('.arm-shelf[data-door="232"] .tok-epi').count() == 4
    a.locator('#alm-armarios .arm').screenshot(path=f'{OUT}/armarios-epi.png')
    a.click('.arm-shelf[data-door="232"] .tok-epi >> nth=0'); a.wait_for_selector('#modalForm [name=holder]'); a.keyboard.press('Escape')
    # Dar un casco rojo de la reserva a GRANADOS (OP-01)
    rojos = q('EPI-RES-CASCO-ROJO')
    a.evaluate("epiForm('EPI-RES-CASCO-ROJO')"); a.wait_for_selector('#modalForm [name=holder]')
    a.select_option('#modalForm [name=holder]', 'OP-01'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert q('EPI-RES-CASCO-ROJO') == rojos - 1
    # Dibujos propios: casco, protectores auditivos y mono
    arts = a.evaluate("['Casco', 'Protectores auditivos', 'Mono USAR'].map(n => toolArt(n))")
    assert len(set(arts)) == 3 and 'd4f01e' in arts[1]
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
