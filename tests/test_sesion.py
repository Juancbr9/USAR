"""Prueba del inicio de sesión: la primera vez cada persona crea su contraseña; después entra con ella;
contraseña incorrecta, bloqueo tras 5 intentos, cerrar sesión, cambiar la contraseña y restablecer la de otra persona.
Solo se guarda una huella de la contraseña, nunca la contraseña.
Uso: python3 tests/test_sesion.py  (con la app servida en APP_URL)"""
import os, sys, pathlib, json
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, autologin=False)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('.login')
    assert a.locator('.topbar').is_hidden(), 'sin sesión no se ve la app'
    a.screenshot(path=f'{OUT}/sesion.png')
    # Contraseñas del equipo ya puestas (solo su huella): CABRERA entra con la suya
    assert a.evaluate("operators().filter(o => o.pin?.h).length") == 12 and not a.evaluate("get('operators', 'OP-12').pin"), 'todos menos FERNANDEZ'
    assert a.evaluate("JSON.stringify(list('operators').map(o => o.pin))").count('"h"') == 12
    # (la prueba usa contraseñas propias: las del equipo no se escriben en el código)
    a.evaluate("makePin('1357').then(pin => put('operators', { ...get('operators', 'OP-02'), pin }))"); a.wait_for_timeout(300)
    a.select_option('.login [name=op]', label='CABRERA'); a.wait_for_selector('[name=pin]')
    assert a.locator('[name=pin2]').count() == 0
    a.fill('[name=pin]', '1357'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    assert '1357' not in a.evaluate("localStorage.getItem(KEY.db)"), 'no se guarda la contraseña'
    assert a.evaluate("prefs.activeOperator") == 'CABRERA' and 'CABRERA' in a.inner_text('#view')
    assert a.locator('#operator, #themeBtn').count() == 0, 'ya no hay «Soy» ni botón de tema arriba'
    # FERNANDEZ no tiene: la crea la primera vez
    a.evaluate("setPref({ session: null })"); a.wait_for_selector('.login')
    a.select_option('.login [name=op]', label='FERNANDEZ'); a.wait_for_selector('[name=pin2]')
    a.fill('[name=pin]', '975310'); a.fill('[name=pin2]', '975311'); a.click('.login button.btn-a'); a.wait_for_timeout(300)
    assert 'no coinciden' in a.inner_text('#loginMsg')
    a.fill('[name=pin]', '975310'); a.fill('[name=pin2]', '975310'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    assert a.evaluate("checkPin(get('operators', 'OP-12'), '975310')")
    a.evaluate("setPref({ session: null })"); a.wait_for_selector('.login'); a.select_option('.login [name=op]', label='CABRERA')
    a.fill('[name=pin]', '1357'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    # Cerrar sesión y volver a entrar
    a.evaluate("go('ajustes')"); a.wait_for_timeout(150); a.click('#view button:has-text("Cerrar sesión")'); a.wait_for_selector('.login')
    assert a.evaluate("document.querySelector('.login [name=op]').value") == 'OP-02', 'recuerda quién era'
    a.fill('[name=pin]', '111111'); a.click('.login button.btn-a'); a.wait_for_timeout(500)
    assert 'incorrecta' in a.inner_text('#loginMsg') and a.locator('.login').count() == 1
    a.fill('[name=pin]', '1357'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    # Cambiar mi contraseña
    a.evaluate("go('ajustes')"); a.wait_for_timeout(150); a.click('#view button:has-text("Cambiar contraseña")')
    a.fill('[name=old]', '1357'); a.fill('[name=pin]', '2468'); a.fill('[name=pin2]', '2468'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(800)
    assert a.evaluate("checkPin(get('operators', 'OP-02'), '2468')")
    # Restablecer la de otra persona: la vuelve a crear al entrar
    a.evaluate("put('operators', { ...get('operators', 'OP-03'), pin: { s: 'AAAA', h: 'x', i: 1 } }); openPerson('OP-03')"); a.wait_for_timeout(200)
    a.click('#view button:has-text("Editar datos")'); a.click('#modal button:has-text("Restablecer contraseña")'); a.wait_for_timeout(200)
    assert not a.evaluate("get('operators', 'OP-03').pin")
    # Bloqueo tras 5 intentos
    a.evaluate("setPref({ session: null })"); a.wait_for_selector('.login')
    a.select_option('.login [name=op]', label='CABRERA')
    for _ in range(5): a.fill('[name=pin]', '0000'); a.click('.login button.btn-a'); a.wait_for_timeout(450)
    a.fill('[name=pin]', '2468'); a.click('.login button.btn-a'); a.wait_for_timeout(300)
    assert 'Espera' in a.inner_text('#loginMsg') and a.locator('.login').count() == 1
    # Un enlace QR abierto sin sesión se abre al entrar
    a.evaluate("LOGIN_WAIT = 0"); a.evaluate("location.hash = '#g=G-B19-5'"); a.wait_for_timeout(200)
    a.fill('[name=pin]', '2468'); a.click('.login button.btn-a'); a.wait_for_selector('#modal:not(.hidden)')
    a.wait_for_timeout(300); assert 'escalera' in a.inner_text('#modalTitle').lower(), a.inner_text('#modalTitle')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
