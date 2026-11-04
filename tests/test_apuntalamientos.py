"""Prueba de «Apuntalamientos»: todos los tipos de los temas de la UME con su dibujo (piezas numeradas y con nombre),
filtros y buscador, calculadoras (vertical, torre, lateral de solera fija, zampeado y horizontal), montaje paso a paso con las medidas
y el paso a la calculadora de arcos.
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

    # Lista de cortes en todos los tipos que se fabrican (menos los informativos y el arco, que tiene su calculadora)
    sin = a.evaluate("APU.filter(t => !APU_CORTES[t.id]).map(t => t.id)"); assert sorted(sin) == ['arco', 'componentes', 'puntalobra'], sin
    for tid in a.evaluate("Object.keys(APU_CORTES)"):
        r = a.evaluate(f"(r => ({{ err: r.err || '', n: r.pz.length + r.ex.length, mal: r.pz.filter(p => !(p.l > 0) || !(p.q > 0) || !Number.isInteger(p.q)).map(p => p.c) }}))(apuCortes('{tid}'))")
        if r['err'] or not r['n'] or r['mal']: problems.append(f'cortes de {tid}: {r}')
        a.evaluate(f"openApu('{tid}')"); a.wait_for_timeout(40); seen(f'cortes {tid}'); wide(f'cortes {tid}')
    # Marcar piezas cortadas
    a.evaluate("openApu('dos')"); a.wait_for_timeout(100)
    total = a.locator('.apu-calc .arc-cut').count(); assert total >= 5
    a.locator('.apu-calc .arc-cut input').first.check(); a.wait_for_timeout(100)
    assert a.evaluate("prefs.apuDone.dos.C") is True and a.locator('.apu-calc .arc-cut.done').count() == 1
    a.evaluate("window.shareText = t => { window._shared = t; }"); a.click('.apu-calc button:has-text("Enviar los cortes")')
    assert 'CORTES' in a.evaluate("window._shared") and 'Puntal' in a.evaluate("window._shared")
    a.click('.apu-calc button:has-text("Quitar las marcas")'); a.wait_for_timeout(100); assert a.locator('.apu-calc .arc-cut.done').count() == 0
    # HOLMATRO: combinación de extensiones (2,30 m − 20 de madera = 2.100 mm con el manual de 575 + 250 de recorrido)
    a.evaluate("openApu('vholm'); apuSetIn('vholm', 'H', '230')"); a.wait_for_timeout(100)
    assert 'SX 15' in a.inner_text('.apu-calc'), a.inner_text('.apu-calc')

    # T: medida del puntal con la altura
    a.evaluate("openApu('t')"); a.fill('.apu-calc input >> nth=0', '250'); a.dispatch_event('.apu-calc input >> nth=0', 'change'); a.wait_for_timeout(100)
    assert '226 cm' in a.inner_text('.apu-calc'), a.inner_text('.apu-calc')
    a.fill('.apu-calc input >> nth=0', '350'); a.dispatch_event('.apu-calc input >> nth=0', 'change'); a.wait_for_timeout(100)
    assert 'la T no vale' in a.inner_text('.apu-calc')
    # Torre: diagonales según la altura
    a.evaluate("openApu('torre'); apuSetIn('torre', 'H', '300')"); a.wait_for_timeout(100)
    assert 'Dos en K' in a.inner_text('.apu-calc')
    # Lateral de solera fija: el ejemplo del manual (inserción a 1,70 m y 30°: puntal 3,40 m y solera 2,94 m)
    a.evaluate("openApu('solerafija'); apuSetIn('solerafija', 'I', '170'); apuSetIn('solerafija', 'ang', '30')"); a.wait_for_timeout(100)
    t = a.inner_text('.apu-calc'); assert '340 cm' in t and '294 cm' in t and '230 cm' in t, t
    a.evaluate("apuSetIn('solerafija', 'ang', '60')"); a.wait_for_timeout(100)
    t = a.inner_text('.apu-calc'); assert '196 cm' in t and '75 cm con 20 clavos' in t, t
    a.screenshot(path=f'{OUT}/apuntalamientos-lateral.png', full_page=True)
    # Zampeado y horizontal
    a.evaluate("openApu('zampeado'); apuSetIn('zampeado', 'H', '90'); apuSetIn('zampeado', 'w', '20')"); a.wait_for_timeout(100)
    assert 'Demasiado alto' in a.inner_text('.apu-calc')
    a.evaluate("openApu('horfema'); apuSetIn('horfema', 'D', '300')"); a.wait_for_timeout(100)
    assert 'lateral de triángulo' in a.inner_text('.apu-calc')

    # Montaje con tus medidas: cada tipo con lista de cortes tiene su paso a paso con el dibujo a escala
    assert sorted(a.evaluate("Object.keys(APU_MONTAJE)")) == sorted(a.evaluate("Object.keys(APU_CORTES)"))
    for tid in a.evaluate("Object.keys(APU_MONTAJE)"):
        a.evaluate(f"openApu('{tid}')"); a.wait_for_timeout(40)
        n = a.locator('#apu-mont .apu-dot').count()
        if n < 3: problems.append(f'montaje de {tid}: solo {n} pasos')
        for k in range(n):
            a.evaluate(f"apuPaso('{tid}', {k})")
            box = a.evaluate("(() => { const s = document.querySelector('#apu-mont svg').viewBox.baseVal; return [s.width, s.height]; })()")
            if not (box[0] > 0 and box[1] > 0): problems.append(f'montaje {tid} paso {k + 1}: dibujo vacío')
            if a.locator('#apu-mont .apu-mont-p li').count() < 1: problems.append(f'montaje {tid} paso {k + 1}: sin texto')
            seen(f'montaje {tid} paso {k + 1}'); wide(f'montaje {tid} paso {k + 1}')
        a.evaluate(f"apuPaso('{tid}', 0)")
    # Con las medidas de la calculadora: T de 250 cm → puntal de 226 cm, centrado a 45 cm
    a.evaluate("openApu('t'); apuSetIn('t', 'H', '250'); apuSetIn('t', 'C', '90')"); a.wait_for_timeout(100)
    a.click('#apu-mont button:has-text("Siguiente")'); a.wait_for_timeout(80)
    t = a.inner_text('#apu-mont'); assert 'Paso 2 de' in t and '226 cm' in t and '45 cm' in t, t
    assert a.locator('#apu-mont svg .apu-new').count() == 1 and a.locator('#apu-mont .apu-pz').count() == 2
    a.click('#apu-mont button:has-text("Anterior")'); a.wait_for_timeout(80); assert 'Paso 1 de' in a.inner_text('#apu-mont')
    a.click('#apu-mont .apu-dot >> nth=-1'); a.wait_for_timeout(80); assert 'Comprueba y revisa' in a.inner_text('#apu-mont')
    assert a.locator('#apu-mont svg .apu-old').count() == 0 and a.locator('#apu-mont button:has-text("Desde el principio")').count() == 1
    # Fila de 3 m: tres puntales a 30, 150 y 270 cm del extremo
    a.evaluate("openApu('fila'); apuSetIn('fila', 'L', '300'); apuPaso('fila', 2)"); a.wait_for_timeout(100)
    assert '30, 150, 270 cm' in a.inner_text('#apu-mont'), a.inner_text('#apu-mont')
    # Las medidas cambian el dibujo y el texto al momento; el paso se mantiene
    a.evaluate("apuSetIn('fila', 'L', '420')"); a.wait_for_timeout(100)
    assert 'Paso 3 de' in a.inner_text('#apu-mont') and '30, 150, 270, 390 cm' in a.inner_text('#apu-mont'), a.inner_text('#apu-mont')
    a.screenshot(path=f'{OUT}/apuntalamientos-montaje.png', full_page=True)
    # Imprimir: todos los pasos con su dibujo
    a.evaluate("window.print = () => { window._printed = true; }; apuMontPrint('fila')")
    assert a.evaluate("window._printed") and a.locator('#print .apu-print-step').count() == a.locator('#apu-mont .apu-dot').count()
    assert a.locator('#print .apu-print-step svg').count() == a.locator('#print .apu-print-step').count()

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
