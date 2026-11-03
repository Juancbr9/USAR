"""Prueba de «Apuntalamientos»: todos los tipos de los temas de la UME con su dibujo (piezas numeradas y con nombre),
filtros y buscador, calculadoras (vertical, torre, lateral de solera fija, zampeado y horizontal) y el paso a la calculadora de arcos.
Uso: python3 tests/test_apuntalamientos.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    a = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True).new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and problems.append(f'console: {m.text}'))
    a.goto(APP); a.wait_for_selector('#view > *')
    wide = lambda where: a.evaluate("document.documentElement.scrollWidth") > 392 and problems.append(f'{where}: se sale de ancho')
    seen = lambda where: [problems.append(f'se ve «{x}» en {where}') for x in ['undefined', 'NaN', '[object Object]', 'Infinity'] if x in a.inner_text('#view')]

    # Menú → Apuntalamientos: todos los tipos, cada uno con su dibujo
    sesion.menu(a, 'Apuntalamientos')
    assert a.evaluate("prefs.tab") == 'apuntalamientos' and a.locator('#view h2:has-text("Apuntalamientos")').count() == 1
    n = a.evaluate("APU.length"); assert n >= 30, n
    assert a.locator('.apu-card').count() == n and a.locator('.apu-card svg').count() == n
    for name in ['Apuntalamiento en T', 'Filas de puntales', 'Vertical de dos puntales', 'Par de pares o tipo torre', 'Zampeado', 'Lateral volante o de fricción',
                 'Lateral de solera fija', 'Inclinado perpendicular a la carga', 'Inclinado perpendicular al suelo', 'Horizontal o acodalamiento',
                 'Puerta o ventana a medida', 'Apeo con asnillas', 'Puente de apeo', 'Apuntalamiento de arcos', 'Protección y estabilización de columnas']:
        assert a.locator(f'.apu-card:has-text("{name}")').count() >= 1, name
    seen('lista'); wide('lista'); a.screenshot(path=f'{OUT}/apuntalamientos.png', full_page=True)

    # Filtro y buscador (sin perder el foco al escribir)
    a.click('.apu-fams .chip:has-text("Laterales")'); a.wait_for_timeout(100)
    assert a.evaluate("[...new Set(APU.filter(t => t.fam === 'lat').map(t => t.id))].length") == a.locator('.apu-card').count()
    a.click('.apu-fams .chip:has-text("Todos")'); a.wait_for_timeout(100)
    a.click('#view input[type=search]'); a.keyboard.type('codal', delay=20); a.wait_for_timeout(150)
    assert a.evaluate("document.activeElement.type") == 'search' and a.input_value('#view input[type=search]') == 'codal'
    assert 1 <= a.locator('.apu-card').count() < n and a.locator('.apu-card:has-text("Horizontal")').count() >= 1
    a.fill('#view input[type=search]', ''); a.wait_for_timeout(150)

    # Cada ficha: dibujo, lista de piezas igual a los números del dibujo, sin textos rotos ni scroll lateral
    for tid in a.evaluate("APU.map(t => t.id)"):
        a.evaluate(f"openApu('{tid}')"); a.wait_for_timeout(60)
        nums = a.locator('.apu-fig').first.locator('.apu-nums text.ant').count(); parts = a.locator('.apu-parts li').count()
        if nums != parts: problems.append(f'{tid}: {nums} números en el dibujo y {parts} piezas en la lista')
        box = a.evaluate("(() => { const s = document.querySelector('.apu-fig svg').viewBox.baseVal; return [s.width, s.height]; })()")
        if not (box[0] > 0 and box[1] > 0): problems.append(f'{tid}: dibujo vacío')
        seen(tid); wide(tid)

    # T: medida del puntal con la altura
    a.evaluate("openApu('t')"); a.fill('.apu-calc input', '250'); a.dispatch_event('.apu-calc input', 'change'); a.wait_for_timeout(100)
    assert '226 cm' in a.inner_text('.apu-calc'), a.inner_text('.apu-calc')
    a.fill('.apu-calc input', '350'); a.dispatch_event('.apu-calc input', 'change'); a.wait_for_timeout(100)
    assert 'la T no vale' in a.inner_text('.apu-calc')
    # Torre: diagonales según la altura
    a.evaluate("openApu('torre'); setPref({ apuAlt: '300', apuSep: '120' })"); a.wait_for_timeout(100)
    assert 'Dos en K' in a.inner_text('.apu-calc')
    # Lateral de solera fija: el ejemplo del manual (inserción a 1,70 m y 30°: puntal 3,40 m y solera 2,94 m)
    a.evaluate("openApu('solerafija'); setPref({ apuH: '170', apuAng: '30' })"); a.wait_for_timeout(100)
    t = a.inner_text('.apu-calc'); assert '340 cm' in t and '294 cm' in t and '230 cm' in t, t
    a.evaluate("setPref({ apuAng: '60' })"); a.wait_for_timeout(100)
    t = a.inner_text('.apu-calc'); assert '196 cm' in t and '75 cm con 20 clavos' in t, t
    a.screenshot(path=f'{OUT}/apuntalamientos-lateral.png', full_page=True)
    # Zampeado y horizontal
    a.evaluate("openApu('zampeado'); setPref({ apuAlt: '90', apuAncho: '20' })"); a.wait_for_timeout(100)
    assert 'Demasiado alto' in a.inner_text('.apu-calc')
    a.evaluate("openApu('horfema'); setPref({ apuDist: '300' })"); a.wait_for_timeout(100)
    assert 'lateral de triángulo' in a.inner_text('.apu-calc')

    # Siguiente y anterior; volver a la lista
    a.evaluate("openApu('t')"); a.click('.apu-nav button:has-text("Filas de puntales")'); a.wait_for_timeout(100)
    assert a.evaluate("prefs.apu") == 'fila'
    a.click('#view button.link:has-text("Apuntalamientos")'); a.wait_for_timeout(100); assert not a.evaluate("prefs.apu")

    # Arcos: de la ficha a la calculadora y vuelta; la guía de campo también lleva aquí
    a.evaluate("openApu('arco')"); a.click('#view button:has-text("Calcular un arco")'); a.wait_for_timeout(150)
    assert a.evaluate("prefs.tab") == 'arcos'
    a.click('#view button.link:has-text("Apuntalamiento de arcos")'); a.wait_for_timeout(150); assert a.evaluate("prefs.apu") == 'arco'
    a.evaluate("go('guia')"); a.wait_for_timeout(150); a.click('#g-apuntalamiento summary'); a.click('#view button:has-text("Todos los apuntalamientos")'); a.wait_for_timeout(150)
    assert a.evaluate("prefs.tab") == 'apuntalamientos' and not a.evaluate("prefs.apu")

    # Modo oscuro: los dibujos se siguen viendo
    a.evaluate("setPref({ theme: 'dark' }); applyTheme(); openApu('torre')"); a.wait_for_timeout(200)
    a.screenshot(path=f'{OUT}/apuntalamientos-noche.png', full_page=True)
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
