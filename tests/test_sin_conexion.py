"""Comprueba que la app abre sin conexión y que con conexión carga siempre la última versión.
Uso: python3 tests/test_sin_conexion.py  (con la app servida en APP_URL y, si aplica, el servidor de prueba en MOCK_URL)"""
import os, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
MOCK = os.environ.get('MOCK_URL', 'http://127.0.0.1:54321')
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)
with sync_playwright() as p:
    br=p.chromium.launch(); c=br.new_context(bypass_csp=True); a=c.new_page(); errs=[]
    a.on('pageerror', lambda e: errs.append(str(e)))
    a.goto(APP); a.wait_for_selector('#view > *')
    a.wait_for_function("navigator.serviceWorker.controller !== null", timeout=10000)
    c.set_offline(True); a.reload(); a.wait_for_selector('#view > *', timeout=10000); print('Sin conexión carga la app:', a.title())
    c.set_offline(False)
    html=open(str(ROOT / 'index.html')).read()
    open(str(ROOT / 'index.html'),'w').write(html.replace('<title>USAR 242</title>','<title>USAR 242 NUEVA</title>'))
    try:
        a.reload(); a.wait_for_selector('#view > *'); titulo = a.title(); print('Con conexión, versión nueva al recargar:', titulo)
    finally:
        open(str(ROOT / 'index.html'),'w').write(html)
    print('errores:', errs or 'ninguno'); br.close()
assert 'NUEVA' in titulo, 'no se cargó la versión nueva'
if errs: sys.exit(1)
