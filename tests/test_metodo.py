"""Prueba del método de trabajo UME/INSARAG: fases, funciones, zona, riesgos, señales y recuento,
worksites con triaje y marcaje, víctimas con START y entrega, espacios confinados, informe de situación y guía de campo.
Uso: python3 tests/test_metodo.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type in ('warning', 'error') and 'ERR_TUNNEL' not in m.text and problems.append(f'{m.type}: {m.text}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *')
    nav = lambda n: sesion.menu(a, n)
    mtab = lambda n: (a.click(f'.tab:has-text("{n}")'), a.wait_for_timeout(150))
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(200))
    cur = lambda js: a.evaluate(f"(m => {js})(mget(prefs.mission))")
    diary = lambda: a.evaluate("list('mlog').map(e => e.text).join('\\n')")
    modal = lambda: a.text_content('#modal')

    # Operación con personal
    nav('Operaciones'); a.click('button:has-text("Intervención")'); a.click('#modal .item:has-text("En blanco")')
    a.fill('[name=title]', 'Colapso edificio Telde'); a.fill('[name=location]', 'Calle Real 12, Telde'); save()
    mtab('Personal'); a.click('button:has-text("Crear por células")'); a.wait_for_timeout(150)
    a.click('button:has-text("Iniciar")'); a.wait_for_timeout(200)
    assert cur('m.phase') == 1, 'al iniciar debe pasar a recogida de información'

    # Fases y funciones clave
    mtab('Resumen')
    a.locator('.phase.now .check-row').first.click(); a.wait_for_timeout(150)
    assert cur("Object.values(m.checks).filter(Boolean).length") == 1
    a.click('.phase.now button:has-text("Pasar a")'); a.wait_for_timeout(150)
    assert cur('m.phase') == 2 and 'Fase 3: Reconocimiento' in diary()
    a.click('button:has-text("Asignar")'); a.select_option('[name=seguridad]', label='AGUIAR'); a.select_option('[name=puerta]', label='MANOLO'); save()
    assert cur("m.func.puerta") == 'OP-13'
    a.screenshot(path=f'{OUT}/metodo-resumen.png', full_page=True)

    # Seguridad: información, zona (distancia), riesgos
    mtab('Seguridad')
    a.locator('.panel:has-text("Información inicial") button:has-text("Editar")').click()
    a.fill('[name=when]', '06:40'); a.fill('[name=people]', '4 personas, 2 niños, planta 1'); save()
    a.locator('.panel:has-text("Zona de trabajo") button:has-text("Editar")').click()
    a.fill('[name=height]', '9'); a.fill('[name=meeting]', 'Plaza de la iglesia'); a.click('#modalForm .check-row:has-text("Gas")'); save()
    assert '18 m' in a.inner_text('.callout'), 'distancia de seguridad = 2 × altura'
    a.click('button:has-text("Riesgo")'); a.fill('[name=name]', 'Colapso secundario o derrumbe')
    a.select_option('[name=p]', label='Alta'); a.select_option('[name=c]', label='Muy graves'); save()
    assert a.locator('.panel:has-text("Evaluación de riesgos") .tag:has-text("Intolerable")').count() == 1
    briefing = a.evaluate("briefingText(mget(prefs.mission))"); assert '18 m' in briefing and 'MANOLO' in briefing and 'Intolerable' in briefing

    # Señal de evacuación y recuento
    a.click('.signal.evacuar'); a.wait_for_timeout(700)
    assert 'Recuento' in a.text_content('#modalTitle')
    rows = a.locator('#rollForm .check-row'); n = rows.count()
    for i in range(n - 1): rows.nth(i).click()
    assert f'Faltan 1 de {n}' in a.inner_text('#rollCount')
    a.click('#rollForm button:has-text("Guardar recuento")'); a.wait_for_timeout(150)
    assert 'Señal acústica: EVACUACIÓN' in diary() and 'FALTAN' in diary()
    a.screenshot(path=f'{OUT}/metodo-seguridad.png', full_page=True)

    # Worksites: código, triaje y marcaje
    mtab('Worksites'); a.click('button.btn-a:has-text("Worksite")')
    a.fill('[name=address]', 'Calle Real 12'); a.select_option('[name=collapse]', label='Inclinado'); a.check('input[name=hazards][value="Gas"]'); save()
    a.wait_for_timeout(300); assert 'vivas confirmadas' in modal().lower()
    a.click('.tri-a:has-text("Sí")'); a.click('.tri-a:has-text("menos de 12")'); a.wait_for_timeout(150)
    assert 'Categoría A' in modal(); a.click('#modal button:has-text("Hecho")')
    w = a.evaluate("list('worksites')[0]"); assert w['code'] == 'A-1' and w['cat'] == 'A', w
    a.click('button:has-text("Nivel ASR")'); save()
    svg = a.inner_html('.mark'); assert 'A-1' in svg and 'ASR 2' in svg and 'GAS' in svg, 'el marcaje no refleja el worksite'
    a.click('button:has-text("Todos los worksites")'); a.click('button.btn-a:has-text("Worksite")'); save(); a.wait_for_timeout(300)
    a.click('.tri-a:has-text("No")'); a.click('.tri-a:has-text("Sí")'); a.click('#modal button:has-text("Hecho")')
    assert a.evaluate("list('worksites').map(w => w.code + w.cat).sort().join()") == 'A-1A,A-2C'
    a.click('button:has-text("Todos los worksites")'); a.wait_for_timeout(150)
    assert a.locator('.ws-card').first.inner_text().startswith('A-1'), 'la categoría A debe ir primero'
    a.screenshot(path=f'{OUT}/metodo-worksites.png', full_page=True)

    # Víctima: START, rescate, extracción y entrega
    a.click('.ws-card:has-text("A-1")'); a.click('.panel:has-text("Víctimas") button:has-text("Víctima")')
    a.fill('[name=floor]', 'Planta 1'); a.select_option('[name=crush]', label='Sí'); save()
    assert 'A-1-V1' in a.text_content('#modalTitle') and 'aplastamiento' in modal().lower()
    a.click('#modal button:has-text("Triaje START")')
    for ans in ['No', 'Sí', 'No', 'Sí', 'Sí']: a.click(f'.tri-a:text-is("{ans}")'); a.wait_for_timeout(80)
    v = a.evaluate("list('victims')[0]"); assert v['color'] == 'amarillo', v
    a.click('#modal button:has-text("Anotar torniquete")'); a.click('#modal button:has-text("Empezar rescate")')
    a.click('#modal button:has-text("Extraída")'); save()
    a.click('#modal button:has-text("Entregar")'); a.fill('[name=handedContact]', 'SVA 3'); save()
    v = a.evaluate("list('victims')[0]"); assert v['status'] == 'entregada' and v['tourniquet'] and v['extricated'], v
    a.keyboard.press('Escape')
    assert 'L-1' in a.inner_html('.mark.small'), 'la marca V debe mostrar L-1 tachado'
    text = a.evaluate("victimText(list('victims')[0])"); assert 'A-1-V1' in text and 'SVA 3' in text and 'AMARILLO' in text

    # Espacio confinado
    a.click('button:has-text("Todos los worksites")'); mtab('Seguridad')
    a.click('button.btn-a:has-text("Entrada")'); a.fill('[name=place]', 'Sótano 1, cuadrante B')
    a.locator('#modalForm .lbl:has-text("Rescatadores que entran") .check-row:has-text("DORTA")').click(); save()
    a.fill('[name=o2]', '18'); a.fill('[name=lel]', '6'); a.click('#readForm button'); a.wait_for_timeout(200)
    assert 'Limitada a emergencias' in modal(), modal()[:200]
    a.fill('[name=o2]', '12'); a.fill('[name=lel]', '12'); a.click('#readForm button'); a.wait_for_timeout(200)
    assert 'Entrada prohibida' in modal()
    a.click('#modal button:has-text("Entran")'); a.wait_for_timeout(200)
    assert a.locator('#modal [data-until]').count() == 1 and '30 min' in modal(), 'aire restante: 6 l a 300 bar = 30 min hasta el silbato'
    a.screenshot(path=f'{OUT}/metodo-confinado.png')
    a.click('#modal button:has-text("Salen todos")'); a.wait_for_timeout(150)
    assert a.evaluate("list('confined')[0].status") == 'out'
    a.keyboard.press('Escape')

    # Informe de situación y dosier
    mtab('Informes'); a.click('button:has-text("Preparar y enviar")'); a.fill('[name=objectives]', 'ASR 4 en A-2'); save()
    rep = cur('m.sitreps[0].text'); print('--- Sitrep ---\n' + rep + '\n---')
    assert 'Rescatadas vivas: 1 / 1' in rep and 'A-1 A' in rep and 'ASR 4 en A-2' in rep
    extra = a.evaluate("printExtra(mget(prefs.mission))"); assert 'A-1-V1' in extra and 'Sótano 1' in extra
    a.screenshot(path=f'{OUT}/metodo-informes.png', full_page=True)
    nav('Inicio'); a.screenshot(path=f'{OUT}/metodo-inicio.png', full_page=True)

    # Guía de campo
    nav('Guía de campo'); a.wait_for_timeout(200)
    a.fill('#calcDist [name=h]', '12'); assert '24 m' in a.inner_text('#calcDist')
    assert '30 min' in a.inner_text('#calcEra'), 'ERA 6 l a 300 bar: 30 min hasta el silbato'
    a.fill('#view input[type=search]', 'aplastamiento'); a.wait_for_timeout(500)
    assert a.locator('details.guide').count() >= 1 and a.locator('#g-apuntalamiento').count() == 0
    a.screenshot(path=f'{OUT}/metodo-guia.png', full_page=True)
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
