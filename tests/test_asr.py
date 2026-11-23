"""Prueba de la guía ASR (INSARAG 2026–2030) y del asistente de triaje de un worksite: los cinco niveles, las categorías
A, B, C y D según lo que se sabe de las víctimas, lo que hay que pintar (caja o rombo), el informe para enviar y «otro sitio».
Uso: python3 tests/test_asr.py  (con la app servida en APP_URL)"""
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
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}')); a.on('dialog', lambda d: d.accept())
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and problems.append(f'console: {m.text}'))
    a.goto(APP); a.wait_for_selector('#view > *')
    wide = lambda where: a.evaluate("document.documentElement.scrollWidth") > 392 and problems.append(f'{where}: se sale de ancho')
    seen = lambda where: [problems.append(f'se ve «{x}» en {where}') for x in ['undefined', 'NaN', '[object Object]'] if x in a.inner_text('#view')]
    a.evaluate("window._txt = ''; navigator.share = d => { window._txt = d.text; return Promise.resolve(); }; go('guia')"); a.wait_for_timeout(250)

    # Los cinco niveles, cada uno con su palabra, quién lo hace, qué hacemos y qué se entrega; y lo que nos toca a nosotros
    a.click('.guia-atajos button:has-text("Niveles ASR")'); a.wait_for_timeout(200)
    assert a.locator('#g-asr[open]').count() == 1 and a.locator('#g-asr .asr-niv').count() == 5
    assert [' '.join(t.split()) for t in a.locator('#g-asr .asr-lema span').all_inner_texts()] == ['1 Mirar', '2 Clasificar', '3 Rápido', '4 A fondo', '5 Recuperar']
    t = a.inner_text('#g-asr'); assert 'A nuestro nivel' in t and 'Triaje de worksites' in t and 'Equipos medios y pesados.' in t and t.count('Se entrega:') == 5, t[:300]
    seen('niveles'); wide('niveles'); a.screenshot(path=f'{OUT}/asr-niveles.png', full_page=True)

    # Asistente: sin contestar no hay categoría ni botón de enviar
    a.click('#g-asr button:has-text("Hacer el triaje de un sitio")'); a.wait_for_timeout(200)
    assert a.locator('#g-asrtool[open]').count() == 1 and a.locator('#g-asr[open]').count() == 0, 'al abrir una ficha se cierra la otra'
    assert a.locator('#asrTool .asr-op').count() == 4 and a.locator('#asrOut .asr-res').count() == 0 and a.locator('#asrTool button:has-text("Enviar")').count() == 0
    # Alguien vivo: pregunta las 12 horas; menos de 12 h es A y más, B. Se pinta la caja con el ID, el equipo, ASR 2 y la letra
    a.click('.asr-op:has-text("Hay alguien vivo")'); a.wait_for_timeout(100)
    assert 'Falta decir' in a.inner_text('#asrOut') and a.evaluate("asrCat()") == ''
    a.click('.asr-op:has-text("Sí, menos de 12 h")'); a.wait_for_timeout(100)
    assert a.evaluate("asrCat()") == 'A' and a.inner_text('#asrOut .asr-res b') == 'Categoría A' and 'asr-bad' in a.locator('#asrOut .asr-res').get_attribute('class')
    assert a.locator('#asrOut svg[aria-label^="Marcaje del worksite"]').count() == 1 and 'ASR 3' in a.inner_text('#asrOut')
    a.click('.asr-op:has-text("No, más de 12 h")'); a.wait_for_timeout(100)
    assert a.evaluate("asrCat()") == 'B' and 'ASR 4' in a.inner_text('#asrOut') and a.locator('.asr-op.on').count() == 2
    # Datos del sitio: salen en el dibujo y en el informe; lo escrito no se pierde al tocar otra cosa ni al recargar
    a.click('.asr-mas summary'); a.fill('[name=id]', 'ESP01-0056'); a.fill('[name=riesgos]', 'Gas'); a.fill('[name=lugar]', 'Calle Mayor 3')
    a.fill('[name=vivas]', '2'); a.fill('[name=plantas]', '4'); a.select_option('[name=colapso]', 'Pancake'); a.select_option('[name=uso]', 'Edificio de viviendas')
    a.click('.asr-chips .chip:has-text("Apuntalamiento")'); a.wait_for_timeout(150)
    svg = ' '.join(a.evaluate("document.querySelector('#asrOut svg').textContent").split()); assert 'ESP01-0056' in svg and 'GAS' in svg and 'ASR 2' in svg and svg.strip().endswith('B'), svg
    assert a.input_value('[name=id]') == 'ESP01-0056' and a.locator('.asr-chips .chip.on').count() == 1 and a.locator('.asr-mas[open]').count() == 1
    a.click('#asrTool button:has-text("Enviar el triaje")'); a.wait_for_timeout(200); txt = a.evaluate("window._txt")
    for x in ['TRIAJE DE WORKSITE (ASR 2)', 'Worksite ESP01-0056 · Categoría B', 'Lugar: Calle Mayor 3', 'Edificio: Edificio de viviendas, 4 plantas', 'Colapso: Pancake',
              'vivas confirmadas *2*', 'rescate en menos de 12 h: no', 'Hace falta: apuntalamiento', 'Riesgos: Gas', 'GRANADOS']:
        assert x in txt, (x, txt)
    seen('asistente'); wide('asistente'); a.screenshot(path=f'{OUT}/asr-asistente.png', full_page=True)
    a.reload(); a.wait_for_selector('#view > *'); a.evaluate("go('guia'); guiaAbre('asrtool')"); a.wait_for_timeout(250)
    assert a.evaluate("asrCat()") == 'B' and a.input_value('[name=id]') == 'ESP01-0056', 'lo escrito se queda en el móvil'
    # Otro sitio: se queda el equipo, propone el ID siguiente y empieza de cero
    a.click('#asrTool button:has-text("Otro sitio")'); a.wait_for_timeout(200)
    assert a.evaluate("[asrD().id, asrD().vic || '', asrD().lugar || '', asrCat()]") == ['ESP01-0057', '', '', ''] and a.locator('.asr-op.on').count() == 0
    # Posibles: C con caja. Solo fallecidos: D con rombo D. Nadie: no es worksite, rombo C (sin caja)
    for boton, cat, titulo, marca in [('Puede haber alguien vivo', 'C', 'Categoría C', 'Marcaje del worksite'), ('Solo fallecidos', 'D', 'Categoría D', 'Marcaje rápido: solo fallecidos'),
                                      ('No hay nadie', 'N', 'No es worksite', 'Marcaje rápido: despejado')]:
        a.click(f'.asr-op:has-text("{boton}")'); a.wait_for_timeout(100)
        assert a.evaluate("asrCat()") == cat and a.inner_text('#asrOut .asr-res b') == titulo and a.locator(f'#asrOut svg[aria-label^="{marca}"]').count() == 1, boton
        assert a.locator('#asrTool .asr-ops.dos').count() == 0, 'las 12 horas solo se preguntan con vivas confirmadas'
    a.fill('[name=id]', 'A-9'); a.click('#asrTool button:has-text("Otro sitio")'); a.wait_for_timeout(150); assert a.evaluate("asrD().id") == 'A-10'

    # Triaje, marcaje y novedades 2026–2030
    a.evaluate("guiaAbre('triaje')"); a.wait_for_timeout(150); t = a.inner_text('#g-triaje')
    assert a.locator('#g-triaje table.ref tr').count() == 5 and 'Menos de 12 h' in t and 'Montón de escombros' in t and 'Huecos grandes' in t
    a.evaluate("guiaAbre('marcaje')"); a.wait_for_timeout(150); t = a.inner_text('#g-marcaje')
    assert 'ESP01-0056' in t and 'A-1, A-2' in t and '1,2 × 1 m' in t and a.locator('#g-marcaje .mark svg').count() == 3
    a.evaluate("guiaAbre('insarag')"); a.wait_for_timeout(150); t = a.inner_text('#g-insarag')
    assert '1 de enero de 2027' in t and 'ESP01-1Z' in t and 'Lo que sigue igual' in t
    seen('fichas'); wide('fichas')
    # El buscador de la guía encuentra el asistente
    a.fill('#view input[type=search]', 'triaje'); a.wait_for_timeout(500)
    assert a.locator('#g-asrtool').count() == 1 and a.locator('#g-calc').count() == 0
    br.close()

print('PROBLEMAS:', len(problems) or 'ninguno')
for x in problems: print(' -', x)
sys.exit(1 if problems else 0)
