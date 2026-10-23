"""Prueba de la salvaguarda de patrimonio (BIC): plantilla, fases propias, inmueble y amenaza, prioridad de los bienes,
recorrido documentar → embalar → trasladar → depósito con cadena de custodia, protección in situ, acta y estado.
Uso: python3 tests/test_patrimonio.py  (con la app servida en APP_URL)"""
import os, sys, pathlib, datetime
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
    a.evaluate("window.print = () => {}")
    mtab = lambda n: (a.click(f'.tab:has-text("{n}")'), a.wait_for_timeout(150))
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(200))
    cur = lambda js: a.evaluate(f"(m => {js})(mget(prefs.mission))")
    modal = lambda: a.text_content('#modal')

    # Ejercicio desde la plantilla BIC
    sesion.menu(a, 'Ejercicios'); a.click('button:has-text("Nuevo ejercicio")')
    a.click('#modal .item:has-text("Salvaguarda de patrimonio")'); a.wait_for_timeout(200)
    a.fill('[name=title]', 'Simulacro Convento de San Francisco'); a.fill('[name=location]', 'Garachico, Tenerife'); save()
    assert cur('m.scope') == 'bic' and cur('m.teams.length') >= 6, cur('[m.scope, m.teams.length]')
    assert a.locator('.tab:has-text("Patrimonio")').count() == 1
    assert 'Evaluación del inmueble' in a.inner_text('.phases'), 'debe usar las fases de patrimonio'

    # Inmueble y amenaza con tiempo disponible
    mtab('Patrimonio'); a.locator('.panel:has-text("Inmueble y amenaza") button:has-text("Editar")').click()
    a.fill('[name=building]', 'Antiguo Convento de San Francisco, Garachico'); a.select_option('[name=threat]', 'Erupción volcánica (lava)')
    a.fill('[name=eta]', (datetime.datetime.now() + datetime.timedelta(hours=2)).strftime('%Y-%m-%dT%H:%M'))
    a.fill('[name=owner]', 'Párroco, 600 000 000'); a.fill('[name=depot]', 'Casa de la Cultura de Icod'); save()
    assert a.locator('.callout [data-until]').count() == 1

    # Bien P1: imagen → recorrido completo
    a.click('button.btn-a:has-text("Bien")'); a.fill('[name=name]', 'Imagen de San Francisco'); a.select_option('[name=type]', 'Escultura / imagen')
    a.fill('[name=place]', 'Altar mayor'); a.select_option('[name=val]', '3'); a.select_option('[name=risk]', '3'); save()
    h = a.evaluate("heritageOf(prefs.mission)[0]"); assert h['p'] == 'P1' and h['n'] == 1, h
    assert 'nunca por brazos' in modal(), 'debe mostrar cómo coger una escultura'
    for step, extra in [('Documentado', None), ('Embalado', ('box', 'Caja 1')), ('Sale hacia el depósito', None), ('Recibido en el depósito', None)]:
        a.click(f'#modal button:has-text("{step}")')
        if extra: a.fill(f'[name={extra[0]}]', extra[1])
        save()
    h = a.evaluate("heritageOf(prefs.mission)[0]"); assert h['status'] == 'deposito' and len(h['custody']) == 4 and h['box'] == 'Caja 1', h
    a.keyboard.press('Escape')

    # Retablo: no se puede mover → proteger in situ
    a.click('button.btn-a:has-text("Bien")'); a.fill('[name=name]', 'Retablo mayor'); a.select_option('[name=type]', 'Retablo / elemento fijo')
    a.select_option('[name=val]', '3'); a.select_option('[name=risk]', '3'); a.select_option('[name=move]', 'no'); save()
    assert a.evaluate("heritageOf(prefs.mission).find(h => h.n === 2).p") == 'IS'
    a.click('#modal button:has-text("Proteger in situ")'); a.fill('[name=insitu]', 'Cubierto con manta ignífuga y lámina'); save()
    a.keyboard.press('Escape')
    # Un tercer bien P1 sin poner a salvo aparece en el estado
    a.click('button.btn-a:has-text("Bien")'); a.fill('[name=name]', 'Cáliz de plata'); a.select_option('[name=type]', 'Orfebrería')
    a.select_option('[name=val]', '3'); a.select_option('[name=risk]', '2'); save(); a.keyboard.press('Escape')
    summary = a.evaluate("heritageSummary(mget(prefs.mission))"); print('--- Estado ---\n' + summary + '\n---')
    assert 'En depósito: 1' in summary and 'Protegidos in situ: 1' in summary and 'BC-003 Cáliz de plata' in summary
    a.evaluate("printHandover(prefs.mission)"); acta = a.inner_html('#print'); assert 'BC-001' in acta and 'Caja 1' in acta and 'Recibe' in acta
    assert 'Inmueble: Antiguo Convento' in a.evaluate("missionText(mget(prefs.mission))")
    a.click('.flow-step:has-text("Pendiente")'); assert a.locator('.item.her').count() == 1
    a.screenshot(path=f'{OUT}/patrimonio.png', full_page=True)
    mtab('Resumen'); a.screenshot(path=f'{OUT}/patrimonio-resumen.png', full_page=True)
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
