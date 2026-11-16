"""Prueba de las herramientas del móvil: modo sol y botones grandes, tarjetas QR del personal, escáner con cámara
simulada (tarjetas y etiquetas de material), calendario con asistencia y .ics, y acceso con usuario y permisos
(jefe / miembro) contra el servidor de prueba, con fotos que viajan de un móvil a otro.
Uso: python3 tests/test_campo.py  (con la app en APP_URL y el servidor de prueba en MOCK_URL)"""
import os, sys, json, pathlib, urllib.request
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
MOCK = os.environ.get('MOCK_URL', 'http://127.0.0.1:54321')
problems = []
IGNORE = ('ERR_TUNNEL', 'tile.openstreetmap', 'Failed to load resource', 'ERR_CONNECTION', 'net::')

def watch(pg, name):
    pg.on('pageerror', lambda e: problems.append(f'{name} ERROR {e}'))
    pg.on('console', lambda m: m.type in ('warning', 'error') and not any(x in m.text for x in IGNORE) and problems.append(f'{name} {m.type}: {m.text}'))
    pg.on('dialog', lambda d: d.accept())

with sync_playwright() as p:
    br = p.chromium.launch(args=['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'])
    phone = dict(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    c = br.new_context(**phone, permissions=['camera', 'geolocation'], geolocation={'latitude': 28.3725, 'longitude': -16.7633})
    a = c.new_page(); watch(a, 'A')
    a.goto(APP); a.wait_for_selector('#view > *')
    a.evaluate("window.print = () => {}")
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(300))
    more = lambda n: sesion.menu(a, n)

    # Modo sol y botones grandes
    # (el modo se cambia en Ajustes; en la cabecera ya no hay botón)
    assert a.locator('#themeBtn, #operator').count() == 0
    more('Ajustes'); a.click('.seg-row button:has-text("Sol")')
    assert a.evaluate("document.documentElement.dataset.sun") == '1' and a.evaluate("document.documentElement.dataset.theme") == 'light'
    a.click('.check-row:has-text("Botones y letra grandes")')
    assert a.evaluate("document.documentElement.classList.contains('big')")
    a.screenshot(path=f'{OUT}/campo-sol.png')
    a.click('.seg-row button:has-text("Claro")'); assert a.evaluate("!document.documentElement.dataset.sun")

    # Ya no hay operación en curso: ni botón «+» ni franja
    assert a.locator('#fab, #actbar').count() == 0

    # Tarjetas QR del personal y escáner: leer la tarjeta de alguien abre su ficha; la etiqueta de un equipo, la suya
    a.evaluate("printPersonCards()"); assert a.locator('#print .pcard svg').count() == 13 and 'SIER 242' in a.inner_text('#print .pcard >> nth=0')
    a.evaluate("openScanner()"); a.wait_for_timeout(1200)
    assert a.evaluate("!!document.querySelector('#scanVideo')?.srcObject"), 'la cámara (simulada) no arrancó'
    a.evaluate("handleScan('', 'no es de la app')"); a.wait_for_timeout(150); assert 'No es una tarjeta del equipo' in a.text_content('#scanResult')
    a.evaluate("handleScan('', 'USAR242-P:OP-02')"); a.wait_for_timeout(300)
    assert a.evaluate("prefs.tab") == 'personal' and a.evaluate("prefs.person") == 'OP-02' and a.locator('#modal').is_hidden()
    assert a.evaluate("!scanStream"), 'la cámara debe apagarse al cerrar'
    gid = a.evaluate("list('gear')[0].id"); a.evaluate(f"openScanner(); handleScan('', location.origin + '/#g={gid}')"); a.wait_for_timeout(300)
    assert a.locator('#modal .fx-hero').count() == 1, 'la etiqueta de un equipo abre su ficha'
    a.keyboard.press('Escape'); a.wait_for_timeout(200)

    # Calendario: evento, asistencia, horas y .ics
    more('Calendario'); a.click('button:has-text("Evento")'); a.select_option('[name=type]', 'Formación'); a.fill('[name=title]', 'Apuntalamiento en T')
    a.fill('[name=start]', '2026-01-10T09:00'); a.fill('[name=end]', '2026-01-10T13:00'); save()
    a.locator('#modal .att-row:has-text("GRANADOS") label:nth-child(1)').click(); a.wait_for_timeout(150)
    s = a.evaluate("trainingStats('OP-01', 2026)"); assert s['hours'] == 4 and s['attended'] == 1, s
    with a.expect_download() as dl: a.click('#modal button:has-text("Añadir a mi calendario")')
    assert 'BEGIN:VCALENDAR' in open(dl.value.path()).read()
    a.keyboard.press('Escape')
    # Un evento de varios días marca todos sus días en el mes
    a.click('button:has-text("Evento")'); a.select_option('[name=type]', 'Ejercicio'); a.fill('[name=title]', 'Simulacro 3 días')
    a.fill('[name=start]', '2026-01-20T08:00'); a.fill('[name=end]', '2026-01-22T18:00'); save(); a.keyboard.press('Escape')
    a.evaluate("setPref({ calMonth: '2026-01', calDay: null })"); a.wait_for_timeout(150)
    for d in (20, 21, 22): assert a.locator(f'.cal-d.has[aria-label^="{d}:"]').count() == 1, d
    assert a.locator('.cal-d.has[aria-label^="23:"]').count() == 0 and a.locator('.cal-bar').count() == 0
    a.click('.cal-d[aria-label^="21:"]'); assert a.locator('.item:has-text("Simulacro 3 días")').count() == 1
    a.screenshot(path=f'{OUT}/calendario.png', full_page=True)

    # Acceso con usuario: jefe y miembro (servidor de prueba)
    req = urllib.request.Request(MOCK + '/rest/v1/usar_members', data=json.dumps([{'email': 'jefe@usar.es', 'role': 'jefe'}, {'email': 'rescate@usar.es', 'role': 'miembro'}]).encode(), method='POST', headers={'Content-Type': 'application/json'})
    urllib.request.urlopen(req)
    urllib.request.urlopen(MOCK + '/_secure')   # modo seguro: sin usuario no se puede leer, pero la conexión vale
    a.evaluate(f"Sync.connect('{MOCK}', 'sb_publishable_prueba')"); a.wait_for_timeout(2500)
    assert a.evaluate("!!Sync.cfg() && Sync.locked"), 'en modo seguro debe quedar conectado a falta de entrar con usuario'
    a.evaluate("Sync.signUp('jefe@usar.es', 'secreto1').then(() => Sync.signIn('jefe@usar.es', 'secreto1'))"); a.wait_for_timeout(1500)
    assert a.evaluate("Sync.role") == 'jefe', a.evaluate("Sync.error")
    more('Ajustes')
    a.evaluate("put('readiness', { id: 'OP-03', passportNo: 'X1' })"); a.wait_for_timeout(1500)
    a.click('button:has-text("Miembros y permisos")'); a.wait_for_timeout(500)
    assert a.locator('#modal .item:has-text("rescate@usar.es")').count() == 1
    a.keyboard.press('Escape')
    # Miembro en otro móvil: también recibe la documentación del personal (de momento todos acceden a todo)
    B = br.new_context(**phone); b = B.new_page(); watch(b, 'B'); b.goto(APP); b.wait_for_selector('#view > *')
    b.evaluate(f"Sync.connect('{MOCK}', 'sb_publishable_prueba')"); b.wait_for_timeout(1000)
    b.evaluate("Sync.signUp('rescate@usar.es', 'secreto2')"); b.wait_for_timeout(300)
    b.evaluate("Sync.signIn('rescate@usar.es', 'secreto2')"); b.wait_for_timeout(2500)
    assert b.evaluate("Sync.role") == 'miembro'
    assert b.evaluate("get('readiness', 'OP-03')?.passportNo") == 'X1', 'el miembro debe recibir la documentación'
    # Las fotos también viajan: la de una persona puesta en A llega a B
    key = 'op:OP-03'
    a.evaluate("""(async () => { const b = await (await fetch('icon-192.png')).blob(), d = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
      await Img.put('op:OP-03', d); put('operators', { ...get('operators', 'OP-03'), photo: true }); })()"""); a.wait_for_timeout(1200)
    for _ in range(20):
        b.wait_for_timeout(1000); b.evaluate("Sync.pull()")
        if b.evaluate(f"Img.get('{key}').then(x => !!x)"): break
    assert b.evaluate(f"Img.get('{key}').then(x => (x || '').startsWith('data:image'))"), 'la foto no llegó al otro móvil'
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
