"""iPhone: la pantalla de entrada explica cómo instalar la app desde Safari (el APK de Android no sirve en iPhone).
No sale en Android ni con la app ya instalada en la pantalla de inicio.
Uso: python3 tests/test_iphone.py  (con la app servida en APP_URL)"""
import os, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'
problems = []

def pagina(br, ua, standalone=False):
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, user_agent=ua, autologin=False)
    if standalone: c.add_init_script("Object.defineProperty(navigator, 'standalone', { value: true })")
    pg = c.new_page(); pg.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    pg.goto(APP); pg.wait_for_selector('.login')
    return pg

with sync_playwright() as p:
    br = p.chromium.launch()
    pg = pagina(br, IPHONE)
    box = pg.locator('.ios-install')
    assert box.count() == 1 and box.is_visible(), 'en iPhone se explica cómo instalarla'
    t = box.inner_text()
    assert 'Safari' in t and 'Añadir a pantalla de inicio' in t, t
    pg.screenshot(path=f'{OUT}/iphone-entrar.png', full_page=True)
    assert pagina(br, ANDROID).locator('.ios-install').count() == 0, 'en Android no sale'
    assert pagina(br, IPHONE, standalone=True).locator('.ios-install').count() == 0, 'ya instalada: no sale'
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
