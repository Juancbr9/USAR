"""Prueba del ASR de USAR (guías INSARAG 2026–2030): el triaje de un sitio en dos preguntas (categorías A, B, C y D), los
sitios guardados y ordenados por prioridad, la ficha de cada sitio (estado, niveles terminados, víctimas y lo que hay que
tener pintado), el parte del sector y el informe de un worksite, el generador de marcaje y las fichas de la guía.
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
    # Lo que se «comparte» se guarda para mirarlo (también después de recargar)
    a.add_init_script("window._txt = ''; navigator.share = d => { window._txt = d.text; return Promise.resolve(); };")
    a.goto(APP); a.wait_for_selector('#view > *')
    wide = lambda where: a.evaluate("document.documentElement.scrollWidth") > 392 and problems.append(f'{where}: se sale de ancho')
    seen = lambda where: [problems.append(f'se ve «{x}» en {where}') for x in ['undefined', 'NaN', '[object Object]'] if x in a.inner_text('body')]
    svgtxt = lambda sel: ' '.join(a.evaluate("s => document.querySelector(s).textContent", sel).split())

    # ASR está en el menú de USAR; sin sitios, explica cómo empezar
    sesion.menu(a, 'ASR'); a.wait_for_timeout(200)
    assert a.evaluate("prefs.tab") == 'asr' and 'Aún no hay ningún sitio' in a.inner_text('#view') and a.locator('#view .sier-kpi b').all_inner_texts() == ['0', '0', '0', '0']

    # Triaje de un sitio: sin contestar no hay categoría ni se puede guardar
    a.click('#view button:has-text("Triaje de un sitio")'); a.wait_for_selector('#modal #asrTool')
    assert a.locator('#asrTool .asr-op').count() == 4 and a.locator('#asrOut .asr-res').count() == 0 and a.locator('#asrTool button:has-text("Guardar")').count() == 0
    # Alguien vivo: pregunta las 12 horas; menos de 12 h es A y más, B. Se dibuja la caja con el ID, el equipo, ASR 2 y la letra
    a.click('.asr-op:has-text("Hay alguien vivo")'); a.wait_for_timeout(100)
    assert 'Falta decir' in a.inner_text('#asrOut') and a.evaluate("asrCat()") == ''
    a.click('.asr-op:has-text("Sí, menos de 12 h")'); a.wait_for_timeout(100)
    assert a.evaluate("asrCat()") == 'A' and a.inner_text('#asrOut .asr-res b') == 'Categoría A' and 'ASR 3' in a.inner_text('#asrOut')
    a.click('.asr-op:has-text("No, más de 12 h")'); a.wait_for_timeout(100)
    assert a.evaluate("asrCat()") == 'B' and 'ASR 4' in a.inner_text('#asrOut') and a.locator('.asr-op.on').count() == 2
    a.click('.asr-mas summary'); a.fill('[name=id]', 'A-1'); a.fill('[name=sector]', 'A'); a.fill('[name=riesgos]', 'Gas'); a.fill('[name=lugar]', 'Calle Mayor 3')
    a.fill('[name=vivas]', '2'); a.fill('[name=plantas]', '4'); a.select_option('[name=colapso]', 'Pancake'); a.select_option('[name=uso]', 'Edificio de viviendas')
    a.click('.asr-chips .chip:has-text("Apuntalamiento")'); a.wait_for_timeout(150)
    t = svgtxt('#asrOut svg'); assert 'A-1' in t and 'GAS' in t and 'ASR 2' in t and t.endswith('B'), t
    a.click('#asrTool button:has-text("Enviar el triaje")'); a.wait_for_timeout(200); txt = a.evaluate("window._txt")
    for x in ['TRIAJE DE WORKSITE (ASR 2)', 'Worksite A-1 · Categoría B', 'Lugar: sector A · Calle Mayor 3', 'Edificio: Edificio de viviendas, 4 plantas', 'Colapso: Pancake',
              'vivas confirmadas *2*', 'rescate en menos de 12 h: no', 'Hace falta: apuntalamiento', 'Riesgos: Gas', 'GRANADOS']:
        assert x in txt, (x, txt)
    seen('triaje'); a.screenshot(path=f'{OUT}/asr-triaje.png')
    # El borrador no se pierde al recargar; al guardarlo queda como sitio, con el ASR 2 ya hecho, y propone el ID siguiente
    a.reload(); a.wait_for_selector('#view > *'); a.evaluate("go('asr'); asrTriaje()"); a.wait_for_selector('#modal #asrTool')
    assert a.evaluate("asrCat()") == 'B' and a.input_value('[name=id]') == 'A-1', 'lo escrito se queda en el móvil'
    a.click('#asrTool button:has-text("Guardar el sitio")'); a.wait_for_timeout(300)
    s = a.evaluate("asrSitios()[0]"); assert a.locator('#modal:not(.hidden)').count() == 0 and s['id2'] == 'A-1' and s['cat'] == 'B' and s['st'] == 'pend' and [n['level'] for n in s['niveles']] == [2] and s['by'] == 'GRANADOS', s
    assert a.evaluate("asrD().id") == 'A-2' and a.evaluate("asrD().vic || ''") == ''
    # Más sitios: posibles (C), solo fallecidos (D), nadie (no es worksite) y un A con tres vivas
    for boton, idw, extra in [('Puede haber alguien vivo', 'A-2', "a.fill('[name=desap]', '4')"), ('Solo fallecidos', 'A-3', ''), ('No hay nadie', 'A-4', '')]:
        a.click('#view button.btn-a:has-text("Sitio")'); a.wait_for_selector('#modal #asrTool'); a.click(f'.asr-op:has-text("{boton}")'); a.wait_for_timeout(100)
        assert a.locator('#asrTool .asr-ops.dos').count() == 0, 'las 12 horas solo se preguntan con vivas confirmadas'
        if extra: a.click('.asr-mas:not([open]) summary') if a.locator('.asr-mas:not([open])').count() else None; exec(extra)
        assert a.evaluate("asrD().id") == idw; a.click('#asrTool button:has-text("Guardar el sitio")'); a.wait_for_timeout(250)
    a.click('#view button.btn-a:has-text("Sitio")'); a.wait_for_selector('#modal #asrTool'); a.click('.asr-op:has-text("Hay alguien vivo")'); a.click('.asr-op:has-text("Sí, menos de 12 h")')
    if a.locator('.asr-mas:not([open])').count(): a.click('.asr-mas summary')
    a.fill('[name=vivas]', '3'); a.fill('[name=lugar]', 'Colegio'); a.click('#asrTool button:has-text("Guardar el sitio")'); a.wait_for_timeout(300)

    # Prioridad: A antes que B y antes que C; lo que no es de rescate, aparte. Cada fila con su número, su letra y por qué
    filas = [' '.join(t.split()) for t in a.locator('#view .asr-list >> nth=0 >> .asr-sitio').all_inner_texts()]
    assert [f.split()[0:3] for f in filas] == [['1', 'A', 'A-5'], ['2', 'B', 'A-1'], ['3', 'C', 'A-2']], filas
    assert '3 vivas por rescatar · menos de 12 h' in filas[0] and '4 posibles víctimas sin confirmar' in filas[2] and 'Pendiente' in filas[0] and 'ASR 2' in filas[0]
    assert a.locator('#view .sier-kpi b').all_inner_texts() == ['3', '5', '0', '0'] and 'solo fallecidos o despejados (2)' in a.inner_text('#view')
    seen('sitios'); wide('sitios'); a.screenshot(path=f'{OUT}/asr-sitios.png', full_page=True)

    # Ficha de un sitio: se pone en trabajo, se termina el ASR 3 y sale una persona: cambian el dibujo, las cuentas y el orden
    a.click('#view .asr-sitio:has-text("A-1")'); a.wait_for_selector('#modal .asr-steps')
    assert 'Categoría B · prioridad 2' in a.inner_text('#modal .asr-res') and 'Calle Mayor 3' in a.inner_text('#modal .asr-dl')
    a.click('#modal .asr-op:has-text("En trabajo")'); a.wait_for_timeout(150); a.click('#modal .chip:has-text("ASR 3")'); a.wait_for_timeout(150)
    a.click('#modal [aria-label="Rescatadas vivas: uno más"]'); a.wait_for_timeout(150)
    s = a.evaluate("asrSitios().find(x => x.id2 === 'A-1')"); assert s['st'] == 'trab' and [n['level'] for n in s['niveles']] == [2, 3] and s['resc'] == 1, s
    t = svgtxt('#modal svg[aria-label^="Marcaje del worksite"]'); assert 'ASR 2' in t and 'ASR 3' in t and 'GAS' in t, t
    v = svgtxt('#modal svg[aria-label="Marca de víctimas"]'); assert 'L-2' in v and 'L-1' in v, v
    assert 'Mando y control del sitio' in a.inner_text('#modal') and a.inner_text('#modal .asr-res p').startswith('1 viva por rescatar')
    # No se puede rescatar a más de las vivas confirmadas: al pasarse, suben las dos cuentas
    a.click('#modal [aria-label="Rescatadas vivas: uno más"]'); a.wait_for_timeout(120); a.click('#modal [aria-label="Rescatadas vivas: uno más"]'); a.wait_for_timeout(120)
    s = a.evaluate("asrSitios().find(x => x.id2 === 'A-1')"); assert [s['vivas'], s['resc']] == [3, 3], s
    assert 'Ya no quedan vivas confirmadas' in a.inner_text('#modal')
    # Informe del worksite y terminarlo: la caja lleva la raya y el sitio baja a «Terminados»
    a.click('#modal button:has-text("Enviar el informe")'); a.wait_for_timeout(200); txt = a.evaluate("window._txt")
    for x in ['INFORME DE WORKSITE', 'A-1 · Categoría B · En trabajo', 'Vivas confirmadas ahora (con rescates en curso): *0*', 'Rescatadas vivas: *3*', 'ASR terminado: 2, 3']: assert x in txt, (x, txt)
    a.click('#modal .asr-op:has-text("Terminado")'); a.wait_for_timeout(200)
    assert a.evaluate("asrSitios().find(x => x.id2 === 'A-1').st") == 'fin' and 'Raya horizontal' in a.inner_text('#modal')
    seen('ficha'); a.screenshot(path=f'{OUT}/asr-ficha.png')
    # Primero por orden del mando: el C pasa por delante del A
    a.evaluate("closeModal()"); a.wait_for_timeout(250); a.click('#view .asr-sitio:has-text("A-2")'); a.wait_for_selector('#modal .asr-steps')
    a.click('#modal button:has-text("Poner primero por orden")'); a.wait_for_timeout(200); a.evaluate("closeModal()"); a.wait_for_timeout(250)
    filas = [' '.join(t.split()) for t in a.locator('#view .asr-list >> nth=0 >> .asr-sitio').all_inner_texts()]
    assert [f.split()[2] for f in filas] == ['A-2', 'A-5'] and 'Primero por orden del mando' in filas[0], filas
    assert a.locator('#view .sier-kpi b').all_inner_texts() == ['2', '3', '3', '1'] and 'Terminados (1)' in a.inner_text('#view')
    # Cambiar el triaje de un sitio guardado: el posible pasa a confirmado (A) y conserva lo demás
    a.click('#view .asr-sitio:has-text("A-2")'); a.wait_for_selector('#modal .asr-steps'); a.click('#modal button:has-text("Cambiar el triaje")'); a.wait_for_selector('#modal #asrTool')
    a.click('.asr-op:has-text("Hay alguien vivo")'); a.click('.asr-op:has-text("Sí, menos de 12 h")'); a.click('#asrTool button:has-text("Guardar los cambios")'); a.wait_for_timeout(350)
    s = a.evaluate("asrSitios().find(x => x.id2 === 'A-2')"); assert s['cat'] == 'A' and s['pri'] is True and s['desap'] == '4' and a.evaluate("asrSitios().length") == 5, s
    a.evaluate("closeModal()"); a.wait_for_timeout(250)
    # Parte del sector, en orden de prioridad
    a.click('#view button:has-text("Enviar el parte del sector")'); a.wait_for_timeout(200); txt = a.evaluate("window._txt")
    for x in ['ASR · PARTE DEL SECTOR', 'Sitios con rescate: *2* abiertos · *1* terminados', 'Rescatadas: *3*', '1. *A* A-2', '2. *A* A-5 · Colegio', 'SIN RESCATE', 'A-3: solo fallecidos', 'TERMINADOS', 'A-1']:
        assert x in txt, (x, txt)

    # Marcaje libre: caja con sus líneas y la raya, V con lo tachado, rombo y lados
    a.click('.ctab:has-text("Marcaje")'); a.wait_for_selector('#asrMarc')
    a.fill('#asrMarc [name=id]', 'ESP01-0056'); a.click('#asrMarc .chip:has-text("ASR 3")'); a.click('#asrMarc .chip:text-is("C")'); a.click('#asrMarc .chip:has-text("Trabajo terminado")'); a.wait_for_timeout(150)
    t = svgtxt('#asrMDib svg'); assert 'ESP01-0056' in t and 'ASR 2' in t and 'ASR 3' in t and t.endswith('C') and a.input_value('#asrMarc [name=id]') == 'ESP01-0056', t
    a.click('#asrMarc .asr-op:has-text("Víctimas")'); a.wait_for_timeout(100)
    for lbl in ['Vivas localizadas: uno más', 'Vivas localizadas: uno más', 'Vivas ya fuera: uno más', 'Fallecidos localizados: uno más']: a.click(f'#asrMarc [aria-label="{lbl}"]'); a.wait_for_timeout(80)
    v = svgtxt('#asrMDib svg'); assert 'L-2' in v and 'L-1' in v and 'D-1' in v and 'V de unos 50 cm' in a.inner_text('#asrMarc'), v
    a.click('#asrMarc .asr-op:has-text("Marcaje rápido")'); a.click('#asrMarc .asr-op:has-text("Solo fallecidos")'); a.wait_for_timeout(100)
    assert a.locator('#asrMDib svg[aria-label="Marcaje rápido: solo fallecidos"]').count() == 1
    a.click('#asrMarc .asr-op:has-text("Lados y plantas")'); a.wait_for_timeout(100); assert 'Lado 1: la fachada' in a.inner_text('#asrMarc')
    seen('marcaje'); wide('marcaje'); a.screenshot(path=f'{OUT}/asr-marcaje.png', full_page=True)

    # Niveles: los cinco, con su palabra, y de ahí a la Guía
    a.click('.ctab:has-text("Niveles")'); a.wait_for_timeout(200)
    assert a.locator('#view .asr-niv').count() == 5 and [' '.join(t.split()) for t in a.locator('#view .asr-lema span').all_inner_texts()] == ['1 Mirar', '2 Clasificar', '3 Rápido', '4 A fondo', '5 Recuperar']
    t = a.inner_text('#view'); assert 'A nuestro nivel' in t and 'Equipos medios y pesados.' in t and t.count('Se entrega:') == 5
    a.click('#view button:has-text("Triaje, en la Guía")'); a.wait_for_timeout(300)
    assert a.evaluate("prefs.tab") == 'guia' and a.locator('#g-triaje[open]').count() == 1 and 'Montón de escombros' in a.inner_text('#g-triaje')
    a.evaluate("guiaAbre('marcaje')"); a.wait_for_timeout(150); t = a.inner_text('#g-marcaje')
    assert 'ESP01-0056' in t and 'A-1, A-2' in t and '1,2 × 1 m' in t and a.locator('#g-marcaje .mark svg').count() == 3
    a.evaluate("guiaAbre('insarag')"); a.wait_for_timeout(150); t = a.inner_text('#g-insarag'); assert '1 de enero de 2027' in t and 'ESP01-1Z' in t
    a.evaluate("guiaAbre('asr')"); a.wait_for_timeout(150); assert a.locator('#g-asr .asr-niv').count() == 5
    a.click('.guia-atajos button:has-text("ASR: sitios y marcaje")'); a.wait_for_timeout(200); assert a.evaluate("prefs.tab") == 'asr'

    # Borrar un sitio y borrarlos todos (otra intervención)
    a.evaluate("setPref({ asrTab: 'sitios' })"); a.wait_for_timeout(200); a.click('#view .asr-sitio:has-text("A-5")'); a.wait_for_selector('#modal .asr-steps')
    a.click('#modal button:has-text("Borrar")'); a.wait_for_timeout(300); assert a.evaluate("asrSitios().length") == 4
    a.click('#view button:has-text("Borrar todos los sitios")'); a.wait_for_timeout(300)
    assert a.evaluate("asrSitios().length") == 0 and 'Aún no hay ningún sitio' in a.inner_text('#view')
    seen('fin'); wide('fin')
    br.close()

print('PROBLEMAS:', len(problems) or 'ninguno')
for x in problems: print(' -', x)
sys.exit(1 if problems else 0)
