"""Prueba del inicio de sesión con correo (usuario de Supabase, servidor de prueba): la conexión va integrada y no se
configura nada; la primera vez cada persona crea su cuenta con el correo con el que la dio de alta el jefe y entra con su
nombre del equipo; correo no dado de alta o sin nombre; al volver a abrir solo pide la contraseña (comprobada en el móvil,
también sin cobertura); cerrar sesión, cambiar la contraseña, bloqueo tras 5 intentos y enlace QR abierto antes de entrar.
Solo se guarda una huella de la contraseña, nunca la contraseña.
Uso: python3 tests/test_sesion.py  (con la app servida en APP_URL y el servidor de prueba recién arrancado en MOCK_URL)"""
import os, sys, pathlib, json, urllib.request
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
MOCK = os.environ.get('MOCK_URL', 'http://127.0.0.1:54321')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
problems = []

urllib.request.urlopen(urllib.request.Request(MOCK + '/rest/v1/usar_members', method='POST', headers={'Content-Type': 'application/json'},
    data=json.dumps([{'email': 'cabrera@usar.es', 'role': 'miembro', 'name': 'CABRERA'}, {'email': 'sinnombre@usar.es', 'role': 'miembro', 'name': ''}]).encode()))
urllib.request.urlopen(MOCK + '/_secure')

def msg(a): a.wait_for_timeout(600); return a.inner_text('#loginMsg')
def entrar(a, email, pin):
    a.fill('.login [name=email]', email); a.fill('.login [name=pin]', pin); a.click('.login button.btn-a')

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, autologin=False, supa=MOCK)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('.login [name=email]')
    assert a.locator('.topbar').is_hidden(), 'sin sesión no se ve la app'
    assert a.evaluate("Sync.cfg().url") == MOCK, 'la conexión va integrada: no se configura nada'
    assert a.locator('[name=url], [name=key], [name=op]').count() == 0
    a.screenshot(path=f'{OUT}/sesion.png')
    # Crear la cuenta la primera vez
    a.click('.login button:has-text("Primera vez")'); a.wait_for_selector('.login [name=pin2]')
    a.fill('[name=pin2]', 'otra-cosa'); entrar(a, 'cabrera@usar.es', 'secreto1')
    assert 'no coinciden' in msg(a)
    a.fill('[name=pin2]', 'secreto1'); entrar(a, 'Cabrera@usar.es', 'secreto1'); a.wait_for_selector('.topbar:visible')
    assert a.evaluate("prefs.activeOperator") == 'CABRERA' and a.evaluate("Sync.role") == 'miembro'
    assert 'secreto1' not in a.evaluate("JSON.stringify(localStorage)"), 'no se guarda la contraseña'
    a.wait_for_timeout(300); a.keyboard.press('Escape')   # (ofrece la huella si el móvil la tiene)
    # Cerrar sesión: vuelve a pedir el correo
    a.evaluate("go('ajustes')"); a.wait_for_timeout(150)
    assert 'cabrera@usar.es' in a.inner_text('#view')
    a.click('#view button:has-text("Cerrar sesión")'); a.wait_for_selector('.login [name=email]')
    assert not a.evaluate("Sync.email")
    entrar(a, 'cabrera@usar.es', 'mala-clave'); assert 'incorrectos' in msg(a)
    # Correo sin dar de alta y correo sin nombre del equipo
    a.click('.login button:has-text("Primera vez")'); a.wait_for_selector('.login [name=pin2]')
    a.fill('[name=pin2]', 'secreto9'); entrar(a, 'nadie@usar.es', 'secreto9')
    assert 'no está dado de alta' in msg(a) and a.locator('.topbar').is_hidden()
    a.fill('[name=pin2]', 'secreto9'); entrar(a, 'sinnombre@usar.es', 'secreto9')
    t = msg(a); assert 'sin nombre del equipo' in t and not a.evaluate("Sync.email"), t
    a.click('.login button:has-text("Ya tengo cuenta")'); a.wait_for_selector('.login [name=pin2]', state='detached')
    entrar(a, 'cabrera@usar.es', 'secreto1'); a.wait_for_selector('.topbar:visible')
    # Al volver a abrir: solo la contraseña, también sin cobertura
    a.evaluate("lockApp()"); a.wait_for_selector('.login h2:has-text("Hola, CABRERA")')
    assert a.locator('.login [name=email]:visible').count() == 0
    a.fill('[name=pin]', 'mala-clave'); a.click('.login button.btn-a'); assert 'incorrecta' in msg(a)
    c.set_offline(True)
    a.fill('[name=pin]', 'secreto1'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    c.set_offline(False)
    # Cambiar mi contraseña (en el servidor) y entrar con la nueva
    a.wait_for_timeout(300); a.keyboard.press('Escape')
    a.evaluate("go('ajustes')"); a.wait_for_timeout(150); a.click('#view button:has-text("Cambiar contraseña")')
    a.fill('[name=old]', 'secreto1'); a.fill('[name=pin]', 'secreto2'); a.fill('[name=pin2]', 'secreto2'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(1000)
    assert a.evaluate("checkPin(prefs.llave, 'secreto2')")
    a.evaluate("lockApp()"); a.wait_for_selector('.login [name=pin]')
    a.fill('[name=pin]', 'secreto2'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    # Si este móvil no conoce la contraseña (p. ej. la cambió en otro), se comprueba con el servidor
    a.evaluate("setPref({ llave: null }); lockApp()"); a.wait_for_selector('.login [name=pin]')
    a.fill('[name=pin]', 'secreto2'); a.click('.login button.btn-a'); a.wait_for_selector('.topbar:visible')
    assert a.evaluate("checkPin(prefs.llave, 'secreto2')")
    # Bloqueo tras 5 intentos
    a.evaluate("lockApp()"); a.wait_for_selector('.login [name=pin]')
    for _ in range(5): a.fill('[name=pin]', '0000000'); a.click('.login button.btn-a'); a.wait_for_timeout(500)
    a.fill('[name=pin]', 'secreto2'); a.click('.login button.btn-a')
    assert 'Espera' in msg(a) and a.locator('.login').count() == 1
    # Un enlace QR abierto sin sesión se abre al entrar
    a.evaluate("LOGIN_WAIT = 0"); a.evaluate("location.hash = '#g=G-B19-5'"); a.wait_for_timeout(200)
    a.fill('[name=pin]', 'secreto2'); a.click('.login button.btn-a'); a.wait_for_selector('#modal:not(.hidden)')
    a.wait_for_timeout(300); assert 'escalera' in a.inner_text('#modalTitle').lower(), a.inner_text('#modalTitle')
    # «No soy yo»: vuelve a pedir el correo
    a.evaluate("closeModal(); lockApp()"); a.wait_for_selector('.login [name=pin]')
    a.click('.login button:has-text("No soy CABRERA")'); a.wait_for_selector('.login [name=email]')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
