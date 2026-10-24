"""Prueba de la entrada al abrir la app: aunque el móvil recuerde la sesión, cada vez que se abre la app (y tras 5 minutos
fuera de ella) pide la contraseña o la huella, y al entrar va siempre a Inicio. La huella se prueba con un lector virtual
de Chromium; la app comprueba la firma con la llave guardada al activarla.
Uso: python3 tests/test_bloqueo.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

# WebAuthn no admite direcciones IP: se abre la app por «localhost»
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html').replace('127.0.0.1', 'localhost')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
problems = []

def page(c):
    pg = c.new_page()
    pg.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    pg.on('dialog', lambda d: d.accept())
    return pg

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, bloqueo=True)
    a = page(c)
    a.goto(APP); a.wait_for_selector('.login')
    assert a.locator('.topbar').is_hidden(), 'con la sesión recordada también pide entrar'
    assert a.evaluate("document.querySelector('.login [name=op]').value") == 'OP-01', 'ya sale el nombre de quien estaba'
    assert a.locator('.bio-btn').count() == 0, 'sin huella activada no hay botón de huella'
    a.evaluate("makePin('1357').then(pin => put('operators', { ...get('operators', 'OP-01'), pin }))"); a.wait_for_timeout(300)
    a.evaluate("prefs.tab = 'ajustes'; writeJSON(KEY.prefs, prefs)")
    a.screenshot(path=f'{OUT}/bloqueo.png')
    a.fill('[name=pin]', '0000'); a.click('.login button.btn-a'); a.wait_for_timeout(500)
    assert 'incorrecta' in a.inner_text('#loginMsg') and a.locator('.login').count() == 1
    a.fill('[name=pin]', '1357'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    assert a.evaluate("prefs.tab") == 'avisos', 'al entrar va a Inicio'
    # Recargar (p. ej. al llegar una versión nueva) no vuelve a pedirla
    a.evaluate("go('ajustes')"); a.reload(); a.wait_for_selector('#view > *')
    estado = a.evaluate("({ dentro: loggedIn(), sesion: prefs.session, ss: { ...sessionStorage }, vista: $('view').innerText.slice(0, 120) })")
    assert estado['dentro'], f'al recargar sigue dentro: {estado} {problems}'
    a.wait_for_selector('.topbar:visible')
    assert a.evaluate("prefs.tab") == 'ajustes'
    # Abrir la app de nuevo (otra pestaña): la pide y después va a Inicio
    b = page(c); b.goto(APP); b.wait_for_selector('.login')
    b.fill('[name=pin]', '1357'); b.click('.login button.btn-a'); b.wait_for_selector('.topbar:visible')
    assert b.evaluate("prefs.tab") == 'avisos'
    b.close()
    # Más de 5 minutos fuera de la app: la vuelve a pedir
    a.evaluate("go('ajustes')"); a.wait_for_timeout(150)
    a.evaluate("sessionStorage.setItem('USAR_HIDDEN', Date.now() - 6 * 60000); document.dispatchEvent(new Event('visibilitychange'))")
    a.wait_for_selector('.login'); assert a.locator('.topbar').is_hidden()
    # Poco tiempo fuera: sigue dentro
    a.fill('[name=pin]', '1357'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    a.evaluate("sessionStorage.setItem('USAR_HIDDEN', Date.now() - 60000); document.dispatchEvent(new Event('visibilitychange'))")
    a.wait_for_timeout(200); assert a.locator('.login').count() == 0

    # Huella: lector virtual del móvil
    cdp = c.new_cdp_session(a); cdp.send('WebAuthn.enable')
    cdp.send('WebAuthn.addVirtualAuthenticator', {'options': {'protocol': 'ctap2', 'transport': 'internal', 'hasResidentKey': True,
        'hasUserVerification': True, 'isUserVerified': True, 'automaticPresenceSimulation': True}})
    a.evaluate("lockApp()"); a.wait_for_selector('.login')
    a.fill('[name=pin]', '1357'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    a.wait_for_selector('#modal:not(.hidden)'); assert 'huella' in a.inner_text('#modalTitle').lower(), 'tras entrar ofrece activar la huella'
    a.click('#modal button:has-text("Activar huella")'); a.wait_for_timeout(800)
    bio = a.evaluate("prefs.bio['OP-01']"); assert bio and bio['pk'] and bio['alg'] == -7, bio
    # Al volver a abrir, la huella se pide sola y entra en Inicio
    a.evaluate("go('ajustes')"); a.wait_for_timeout(150)
    assert a.locator('#view button:has-text("Quitar huella")').count() == 1
    a.evaluate("lockApp()"); a.wait_for_selector('.topbar:visible', timeout=5000)
    assert a.evaluate("prefs.tab") == 'avisos' and a.evaluate("loggedIn()")
    # Una llave que no es la suya no vale
    a.evaluate("""crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
      .then(k => crypto.subtle.exportKey('spki', k.publicKey)).then(pk => { prefs.bio['OP-01'].pk = bufB64(pk); writeJSON(KEY.prefs, prefs); })""")
    a.evaluate("lockApp()"); a.wait_for_timeout(1500)
    assert a.locator('.login').count() == 1 and 'no es válida' in a.inner_text('#loginMsg'), a.inner_text('#view')
    assert a.locator('.bio-btn').count() == 1
    # Quitar la huella en Ajustes
    a.fill('[name=pin]', '1357'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    a.evaluate("go('ajustes')"); a.wait_for_timeout(150); a.click('#view button:has-text("Quitar huella")'); a.wait_for_timeout(200)
    assert not a.evaluate("prefs.bio['OP-01']")
    a.evaluate("lockApp()"); a.wait_for_selector('.login'); assert a.locator('.bio-btn').count() == 0
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
