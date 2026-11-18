"""Acceso con nombre y PIN (sin correo): el móvil entra en Supabase como invitado y el servidor comprueba el PIN.
Lista de nombres, PIN incorrecto, entrar, al volver a abrir solo el PIN (también sin cobertura), cambiar mi PIN, bloqueo
tras 5 fallos y PIN nuevo que pone un jefe desde Miembros y permisos; quitar el acceso. Solo se guarda una huella del PIN.
Uso: python3 tests/test_pin.py  (con la app en APP_URL y el servidor de prueba recién arrancado en MOCK_URL)"""
import os, sys, pathlib, urllib.request
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
MOCK = os.environ.get('MOCK_URL', 'http://127.0.0.1:54321')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
problems = []
urllib.request.urlopen(MOCK + '/_secure')
urllib.request.urlopen(MOCK + '/_pin?name=GRANADOS&role=jefe&pin=2468')   # el jefe (ADMIN en las pruebas)
urllib.request.urlopen(MOCK + '/_pin?name=CABRERA&role=miembro&pin=1357')
urllib.request.urlopen(MOCK + '/_pin?name=AGUIAR&role=miembro&pin=3456&usuario=5678&cambiar=1')   # con usuario (cifras del móvil) y contraseña de partida

def msg(a): a.wait_for_timeout(600); return a.inner_text('#loginMsg')
def nombre(a, n): a.wait_for_selector('.login [name=user]'); a.fill('.login [name=user]', n)   # el usuario se escribe: ya no hay lista de nombres
def pin(a, p): a.fill('.login [name=pin]', p); a.click('.login button.btn-a')

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, autologin=False, supa=MOCK)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('.login [name=user]')
    # Sin lista de nombres: un campo para el usuario y otro para la contraseña (nadie ve quién es del equipo antes de entrar)
    assert a.locator('.login .name-grid').count() == 0 and a.locator('.login .login-card button:not(.link)').count() == 1 and 'CABRERA' not in a.inner_text('.login')
    assert a.inner_text('.login h2') == 'Entrar' and a.locator('.login [name=email]:visible').count() == 0, 'sin correo'
    a.screenshot(path=f'{OUT}/pin-nombres.png')
    nombre(a, 'NADIE'); pin(a, '1357'); assert 'Usuario o contraseña incorrectos' in msg(a), 'el mismo aviso si el usuario no existe'
    assert a.input_value('.login [name=user]') == 'NADIE', 'el usuario escrito no se pierde al fallar'
    nombre(a, 'cabrera'); a.screenshot(path=f'{OUT}/pin.png')
    pin(a, '0000'); assert 'Usuario o contraseña incorrectos' in msg(a) and a.locator('.topbar').is_hidden()
    pin(a, '1357'); a.wait_for_selector('.topbar:visible')
    assert a.evaluate("[prefs.activeOperator, Sync.role, Sync.pinName, Sync.email]") == ['CABRERA', 'miembro', 'CABRERA', '']
    # El PIN no se guarda en ningún sitio como valor (se busca «1357» entre comillas o tras «:»; suelto podría salir por casualidad
    # dentro de una hora o de un identificador)
    _ls = a.evaluate("JSON.stringify(Object.fromEntries(Object.entries(localStorage)))").replace('\\"', '"')
    assert not any(x in _ls for x in ['"1357"', ':1357,', ':1357}']), 'no se guarda el PIN'
    a.wait_for_timeout(1500); assert a.evaluate("list('gear').length") > 0, 'descarga los datos del equipo'
    a.keyboard.press('Escape')
    # Al volver a abrir: solo el PIN, comprobado en el móvil (también sin cobertura)
    a.evaluate("lockApp()"); a.wait_for_selector('.login h2:has-text("Hola, CABRERA")')
    pin(a, '9999'); assert 'incorrect' in msg(a)
    c.set_offline(True); pin(a, '1357'); a.wait_for_selector('.topbar:visible'); c.set_offline(False)
    # Cambiar mi PIN
    a.wait_for_timeout(300); a.keyboard.press('Escape')
    a.evaluate("go('ajustes')"); a.wait_for_timeout(150); a.click('#view button:has-text("Cambiar PIN")')
    a.fill('[name=old]', '1357'); a.fill('[name=pin]', '8642'); a.fill('[name=pin2]', '8642'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(800)
    assert a.evaluate("checkPin(prefs.llave, '8642')")
    # Un miembro no ve Miembros y permisos
    assert a.locator('#view button:has-text("Miembros y permisos")').count() == 0
    # Cerrar sesión: vuelve a pedir usuario y contraseña
    a.click('#view button:has-text("Cerrar sesión")'); a.wait_for_selector('.login [name=user]')
    # 5 fallos: bloqueado (aunque luego ponga el bueno)
    nombre(a, 'CABRERA')
    for _ in range(5): pin(a, '1111'); a.wait_for_timeout(300)
    pin(a, '8642'); assert 'Demasiados intentos' in msg(a)
    # El jefe entra y le pone un PIN nuevo (eso lo desbloquea)
    nombre(a, 'GRANADOS'); pin(a, '2468'); a.wait_for_selector('.topbar:visible')
    a.wait_for_timeout(300); a.keyboard.press('Escape')
    a.evaluate("go('ajustes')"); a.wait_for_timeout(150); a.click('#view button:has-text("Miembros y permisos")'); a.wait_for_selector('#modal .item')
    assert 'Bloqueado' in a.inner_text('#modal')
    a.click('#modal .item:has-text("CABRERA") button:has-text("PIN / permiso")'); a.wait_for_selector('#modalForm [name=pin]')
    a.fill('#modalForm [name=pin]', '5555'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .item')
    a.screenshot(path=f'{OUT}/pin-miembros.png')
    # Dar acceso a otra persona
    a.click('#modal button:has-text("Dar acceso")'); a.wait_for_selector('#modalForm [name=name]')
    a.select_option('#modalForm [name=name]', 'DORTA'); a.fill('#modalForm [name=pin]', '4444'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .item:has-text("DORTA")')
    # Con su PIN nuevo, CABRERA vuelve a entrar en otro móvil
    b = c.browser.new_context(viewport={'width': 390, 'height': 844}, autologin=False, supa=MOCK).new_page()
    b.goto(APP); nombre(b, 'CABRERA'); pin(b, '5555'); b.wait_for_selector('.topbar:visible')
    # Con las cifras de su móvil como usuario y la contraseña de partida: entra y lo primero es elegir la suya
    d = c.browser.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, autologin=False, supa=MOCK).new_page(); d.on('dialog', lambda x: x.accept())
    d.goto(APP); nombre(d, '5678'); pin(d, '3456'); d.wait_for_selector('.topbar:visible'); d.wait_for_selector('#modal h3:has-text("Elige tu contraseña")')
    assert d.evaluate("[prefs.activeOperator, Sync.pinName]") == ['AGUIAR', 'AGUIAR']
    d.fill('#modalForm [name=pin]', '3456'); d.fill('#modalForm [name=pin2]', '3456'); d.click('#modalForm button:has-text("Guardar")'); d.wait_for_timeout(300)
    assert 'distinta' in d.inner_text('#toast') and d.locator('#modal h3:has-text("Elige tu contraseña")').count() == 1, 'no vale repetir la de partida'
    d.fill('#modalForm [name=pin]', '9753'); d.fill('#modalForm [name=pin2]', '9753'); d.click('#modalForm button:has-text("Guardar")'); d.wait_for_timeout(800)
    assert d.evaluate("checkPin(prefs.llave, '9753')") and 'Contraseña guardada' in d.inner_text('#toast')
    d.evaluate("closeModal(); otraCuenta()"); d.wait_for_selector('.login [name=user]'); nombre(d, '5678'); pin(d, '9753'); d.wait_for_selector('.topbar:visible'); d.wait_for_timeout(500)
    assert d.locator('#modal:not(.hidden) h3:has-text("Elige tu contraseña")').count() == 0, 'ya no se le vuelve a pedir'; d.close()
    # Quitar el acceso: ese móvil deja de ver los datos del servidor
    a.click('#modal .item:has-text("DORTA") button:has-text("Quitar")'); a.wait_for_timeout(500)
    assert a.locator('#modal .item:has-text("DORTA")').count() == 0
    # Importar personal de la sección siendo jefe: a los nuevos se les da acceso con el PIN 0000 (y entran con él)
    a.evaluate("closeModal(); go('personal')"); a.wait_for_timeout(150)
    a.click('#view button:has-text("Importar")'); a.wait_for_selector('#impTxt')
    assert a.locator('#impPin').is_checked()
    a.fill('#impTxt', 'NUEVOPIN; CBO; NUEVO PIN, PRUEBA; PIEN 1; Res. Terrestre; 600000009;'); a.wait_for_timeout(100); a.click('#impGo'); a.wait_for_timeout(900)
    assert a.evaluate("Sync.people().then(ps => ps.some(p => p.name === 'NUEVOPIN' && p.role === 'miembro'))"), 'el importado no tiene PIN'
    n = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, autologin=False, supa=MOCK).new_page()
    n.goto(APP); nombre(n, 'NUEVOPIN'); pin(n, '0000'); n.wait_for_selector('.topbar:visible')
    assert n.evaluate("me()?.name") == 'NUEVOPIN', 'en un móvil nuevo, la persona importada entra tras descargar el personal'
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
