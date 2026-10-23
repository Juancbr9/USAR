"""Prueba de las herramientas de campo: modo sol y botones grandes, botón «+», nota rápida, fotos por worksite,
tarjetas QR y fichaje por lectura, escáner con cámara simulada, calendario con asistencia y .ics, mapa con calles,
y acceso con usuario y permisos (jefe / miembro) contra el servidor de prueba.
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
    mtab = lambda n: (a.click(f'.tab:has-text("{n}")'), a.wait_for_timeout(150))
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

    # Operación en curso con worksite: botón «+», nota, foto
    sesion.menu(a, 'Intervenciones'); a.click('button:has-text("Nueva intervención")'); a.click('#modal .item:has-text("En blanco")')
    a.fill('[name=title]', 'Derrumbe Puerto de la Cruz'); save()
    mtab('Personal'); a.click('button:has-text("Crear por células")'); a.click('button:has-text("Iniciar")'); a.wait_for_timeout(200)
    mtab('Worksites'); a.click('button.btn-a:has-text("Worksite")'); a.fill('[name=pos]', '28.4136, -16.5480'); save(); a.wait_for_timeout(300)
    a.click('.tri-a:has-text("Sí")'); a.click('.tri-a:has-text("menos de 12")'); a.click('#modal button:has-text("Hecho")')
    assert a.locator('#fab').count() == 1, 'debe aparecer el botón «+» con la operación en curso'
    a.click('#fab'); assert a.locator('.qa').count() == 8
    a.click('.qa:has-text("Nota")'); a.fill('#noteForm [name=t]', 'Grieta nueva en lado 2'); a.click('#noteForm button.btn-a'); a.wait_for_timeout(200)
    assert 'Grieta nueva en lado 2' in a.evaluate("list('mlog').map(e => e.text).join()")
    a.evaluate("""(async () => { const b = await (await fetch('icon-512.png')).blob();
      await savePhoto(prefs.mission, prefs.ws, new File([b], 'f.png', { type: 'image/png' })); })()"""); a.wait_for_timeout(800)
    w = a.evaluate("get('worksites', prefs.ws)"); assert len(w['photos']) == 1 and w['photos'][0]['lat'] == 28.3725, w.get('photos')
    a.wait_for_timeout(300); assert a.evaluate("document.querySelector('.gal img')?.src?.startsWith('data:image')"), 'la foto no aparece en la galería'
    a.screenshot(path=f'{OUT}/campo-fotos.png', full_page=True)

    # Mapa con calles
    a.click('button:has-text("Todos los worksites")'); a.click('button:has-text("Mapa con calles")'); a.wait_for_timeout(300)
    assert a.locator('#map .map-tiles img').count() > 0 and a.locator('#map .pin').count() == 1
    src = a.get_attribute('#map .map-tiles img', 'src'); assert src.startswith('https://tile.openstreetmap.org/'), src
    a.click('.map-ctl button[aria-label=Acercar]'); a.keyboard.press('Escape')

    # Tarjetas QR y fichaje por lectura
    a.evaluate("printPersonCards()"); assert a.locator('#print .pcard svg').count() == 13
    a.evaluate("openScanner(prefs.mission)"); a.wait_for_timeout(1200)
    assert a.evaluate("!!document.querySelector('#scanVideo')?.srcObject"), 'la cámara (simulada) no arrancó'
    a.evaluate("handleScan(prefs.mission, 'USAR242-P:OP-02')"); a.wait_for_timeout(200)
    assert 'ENTRA' in a.text_content('#scanResult')
    a.evaluate("handleScan(prefs.mission, 'USAR242-P:OP-02')"); a.wait_for_timeout(200)
    assert 'SALE' in a.text_content('#scanResult')
    a.keyboard.press('Escape'); a.wait_for_timeout(200)
    assert a.evaluate("!scanStream"), 'la cámara debe apagarse al cerrar'

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
    more('Ajustes'); a.fill('[name=url]', MOCK); a.fill('[name=key]', 'clave-prueba'); a.click('button:has-text("Conectar")'); a.wait_for_timeout(2500)
    a.click('summary:has-text("Entrar con usuario")'); a.fill('[name=email]', 'jefe@usar.es'); a.fill('[name=password]', 'secreto1')
    a.click('button:has-text("Crear cuenta")'); a.wait_for_timeout(1500)
    assert a.evaluate("Sync.role") == 'jefe', a.evaluate("Sync.error")
    a.evaluate("put('readiness', { id: 'OP-03', passportNo: 'X1' })"); a.wait_for_timeout(1500)
    a.click('button:has-text("Miembros y permisos")'); a.wait_for_timeout(500)
    assert a.locator('#modal .item:has-text("rescate@usar.es")').count() == 1
    a.keyboard.press('Escape')
    # Miembro en otro móvil: también recibe la documentación del personal (de momento todos acceden a todo)
    B = br.new_context(**phone); b = B.new_page(); watch(b, 'B'); b.goto(APP); b.wait_for_selector('#view > *')
    b.evaluate(f"Sync.connect('{MOCK}', 'clave-prueba')"); b.wait_for_timeout(1000)
    b.evaluate("Sync.signUp('rescate@usar.es', 'secreto2')"); b.wait_for_timeout(300)
    b.evaluate("Sync.signIn('rescate@usar.es', 'secreto2')"); b.wait_for_timeout(2500)
    assert b.evaluate("Sync.role") == 'miembro'
    assert b.evaluate("get('readiness', 'OP-03')?.passportNo") == 'X1', 'el miembro debe recibir la documentación'
    assert b.evaluate("list('missions').length") >= 1, 'el miembro sí recibe las operaciones'
    # Las fotos también viajan: la de un worksite hecha en A llega a B
    key = a.evaluate("list('worksites').find(w => (w.photos || []).length).photos[0].key")
    for _ in range(20):
        b.wait_for_timeout(1000); b.evaluate("Sync.pull()")
        if b.evaluate(f"Img.get('{key}').then(x => !!x)"): break
    assert b.evaluate(f"Img.get('{key}').then(x => (x || '').startsWith('data:image'))"), 'la foto no llegó al otro móvil'
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
