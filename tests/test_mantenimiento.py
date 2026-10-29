"""Prueba del modo mantenimiento: activo de serie, solo RODRI usa la app y el resto ve el aviso al entrar.
RODRI lo quita o lo vuelve a poner desde Ajustes, y el cambio se guarda con los datos del equipo.
Uso: python3 tests/test_mantenimiento.py  (con la app servida en APP_URL)"""
import os, pathlib
from playwright.sync_api import sync_playwright
import sesion

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, mant=True, bypass_csp=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('dialog', lambda d: d.accept())
    # GRANADOS (sesión de las pruebas): ve el aviso y nada de la app
    a.goto(APP); a.wait_for_selector('.mant-card')
    assert 'USAR 242 EN FASE DE MANTENIMIENTO' in a.inner_text('#view')
    a.wait_for_function("document.querySelector('.mant-img').naturalWidth > 0")  # se ve el muñequito
    assert a.locator('.topbar').is_hidden() and a.locator('#drawer').is_hidden(), 'sin menú ni cabecera'
    a.screenshot(path=f'{OUT}/mantenimiento.png')
    # Un enlace QR tampoco abre nada
    gid = a.evaluate("list('gear')[0].id")
    a.evaluate(f"location.hash = 'g={gid}'"); a.wait_for_timeout(300)
    assert a.locator('.modal:visible, dialog[open]').count() == 0 and a.locator('.mant-card').count() == 1
    # Cerrar sesión desde el aviso lleva a la pantalla de entrada
    a.click('.mant-card button'); a.wait_for_selector('.login h2')
    # RODRI: la app completa y el interruptor en Ajustes
    rodri = a.evaluate("operators().find(o => o.name === 'RODRI').id")
    a.evaluate(f"ss.set(UNLOCK_KEY, '1'); setPref({{ session: '{rodri}', activeOperator: 'RODRI' }})"); a.wait_for_selector('.topbar:visible')
    assert a.locator('.mant-card').count() == 0
    a.evaluate("setPref({ tab: 'ajustes' })"); a.wait_for_timeout(200)
    assert a.locator('text=Dar acceso a todo el equipo').count() == 1
    assert 'administración' in a.inner_text('#view').lower() and a.locator('text=Restaurar datos iniciales').count() == 1
    a.click('text=Dar acceso a todo el equipo'); a.wait_for_timeout(200)
    assert a.evaluate("get('meta', 'mantenimiento').value") is False
    assert 'Mantenimiento terminado' in a.evaluate("JSON.stringify(list('logs').map(l => l.action))")
    # Sin mantenimiento, GRANADOS entra con normalidad y no ve el interruptor
    a.evaluate("setPref({ session: 'OP-01', activeOperator: 'GRANADOS', tab: 'ajustes' })"); a.wait_for_selector('.topbar:visible')
    assert a.locator('.mant-card').count() == 0 and a.locator('text=Activar mantenimiento').count() == 0
    # Ajustes en bloques: GRANADOS (sin ser jefe) ve su cuenta y su móvil, pero no Administración, copias ni historial,
    # ni nada de sincronizar a mano
    t = a.inner_text('#view').lower()
    assert all(g in t for g in ['mi cuenta', 'este móvil']) and 'historial' not in t and 'sincronizar' not in t, t
    assert 'administración' not in t and a.locator('text=Restaurar datos iniciales').count() == 0
    # Sigue igual al recargar (se guarda con los datos)
    a.reload(); a.wait_for_selector('.topbar:visible'); assert a.locator('.mant-card').count() == 0
    # RODRI lo vuelve a activar y GRANADOS vuelve a ver el aviso
    a.evaluate(f"setPref({{ session: '{rodri}', activeOperator: 'RODRI', tab: 'ajustes' }})"); a.wait_for_timeout(200)
    a.click('text=Activar mantenimiento'); a.wait_for_timeout(200)
    a.evaluate("setPref({ session: 'OP-01', activeOperator: 'GRANADOS' })"); a.wait_for_selector('.mant-card')
    a.wait_for_function("document.querySelector('.mant-img').naturalWidth > 0")  # se ve el muñequito
    # RODRI deja entrar a GRANADOS durante el mantenimiento (y a nadie más)
    a.evaluate(f"setPref({{ session: '{rodri}', activeOperator: 'RODRI', tab: 'ajustes' }})"); a.wait_for_timeout(200)
    a.click('.mant-pasan .chip:has-text("GRANADOS")'); a.wait_for_timeout(200)
    assert a.evaluate("get('meta', 'mantenimiento')") == {'id': 'mantenimiento', 'value': True, 'allow': ['GRANADOS']} or a.evaluate("get('meta', 'mantenimiento').allow") == ['GRANADOS']
    a.evaluate("setPref({ session: 'OP-01', activeOperator: 'GRANADOS' })"); a.wait_for_selector('.topbar:visible')
    assert a.locator('.mant-card').count() == 0, 'GRANADOS entra durante el mantenimiento'
    dorta = a.evaluate("operators().find(o => o.name === 'DORTA').id")
    a.evaluate(f"setPref({{ session: '{dorta}', activeOperator: 'DORTA' }})"); a.wait_for_selector('.mant-card')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
