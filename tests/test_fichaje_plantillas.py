"""Prueba de plantillas de operación y del fichaje de personal en zona.
Uso: python3 tests/test_fichaje_plantillas.py  (con la app servida en APP_URL)"""
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
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(150))
    view = lambda: a.inner_text('#view').lower()
    mtab = lambda n: (a.click(f'.tab:has-text("{n}")'), a.wait_for_timeout(150))
    cur = lambda js: a.evaluate(f"(m => {js})(mget(prefs.mission))")

    # Plantillas de serie
    nav('Operaciones')
    n_tpl = a.locator('.item button[onclick^=newFromTemplate]').count(); print('Plantillas de serie:', n_tpl); assert n_tpl == 4
    a.screenshot(path=f'{OUT}/plantillas.png', full_page=True)
    a.click('button[onclick^=newFromTemplate]:has-text("Colapso estructural")')
    a.fill('[name=location]', 'Polígono de Arinaga, nave 4'); save()
    assert cur('[m.teams.length, m.vehicles.length, m.container, missionGearIds(m).length]') == [7, 3, True, a.evaluate("list('gear').length")], cur('[m.teams.length, m.vehicles.length, m.container, missionGearIds(m).length]')
    assert 'vigía estructural' in cur('m.safety').lower(), 'no se copiaron las medidas de seguridad'
    mtab('Personal'); assert a.locator('.panel:has-text("Control de personal")').count() == 0, 'el fichaje no debe salir en preparación'

    # Fichaje
    a.click('button:has-text("Iniciar")'); a.wait_for_timeout(200); mtab('Personal')
    panel = a.locator('.panel:has-text("Control de personal en zona")')
    assert 'sin fichar\n13' in panel.inner_text().lower(), 'deberían estar 13 sin fichar'
    a.click('button:has-text("Entran todos")'); a.wait_for_timeout(200)
    assert 'en zona\n13' in panel.inner_text().lower()
    panel.locator('.item:has-text("DORTA") button:has-text("Sale")').click(); a.wait_for_timeout(200)
    t = panel.inner_text().lower(); assert 'en zona\n12' in t and 'fuera\n1' in t, t[:200]
    a.screenshot(path=f'{OUT}/fichaje.png', full_page=True)
    order = a.evaluate("missionText(mget(prefs.mission))"); assert 'En zona (12)' in order, 'la orden de salida no incluye quién está en zona'
    nav('Inicio'); assert '12\nen zona' in a.inner_text('.live-stats').lower(), 'Inicio no muestra cuántos están en zona'
    a.click('.panel.live h2')

    # Guardar como plantilla propia y usarla para un ejercicio
    a.click('button[aria-label="Más acciones"]'); a.click('.menu-item:has-text("Guardar como plantilla")'); a.fill('[name=name]', 'Simulacro anual'); save()
    nav('Ejercicios'); a.click('#view button:has-text("Nuevo ejercicio")'); a.wait_for_timeout(150)
    opciones = a.locator('#modal .item').count(); print('Opciones al crear:', opciones); assert opciones == 6  # 5 plantillas + en blanco
    a.click('#modal .item:has-text("Simulacro anual")'); save()
    assert 'ejercicio' in view() and cur('m.container') is True, 'el ejercicio no copió la plantilla'

    # Finalizar la intervención: todos salen de zona y el material vuelve
    nav('Operaciones'); a.click('.item:has-text("Colapso estructural")')
    a.click('button:has-text("Finalizar")'); a.fill('[name=summary]', 'Bien'); save()
    state = a.evaluate("presence(mget(prefs.mission)).map(p => p.state)")
    assert all(s == 'out' for s in state), state
    assert a.evaluate("list('gear').filter(g => g.out).length") == 0, 'el material no volvió'
    print('Fichaje cerrado al finalizar: OK')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
