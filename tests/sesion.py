"""Las pruebas entran ya con sesión iniciada (GRANADOS, OP-01) para no pasar por la pantalla de entrada en cada página.
Para probar la propia pantalla de entrada: br.new_context(..., autologin=False)."""
from playwright.sync_api import Browser

LOGIN = """try { const k = 'USAR_V4_PREFS', p = JSON.parse(localStorage.getItem(k) || '{}');
  if (!p.session && !sessionStorage.getItem('sin-sesion')) { p.session = 'OP-01'; localStorage.setItem(k, JSON.stringify(p)); } } catch (e) {}"""
_new_context = Browser.new_context
# Las pruebas arrancan sin el modo mantenimiento (solo RODRI); test_mantenimiento.py lo prueba con mant=True
def _sin_mant(route):
    r = route.fetch()
    route.fulfill(response=r, body=r.text().replace('const MANT_DEFECTO = true', 'const MANT_DEFECTO = false'))
def new_context(self, *args, autologin=True, mant=False, **kw):
    c = _new_context(self, *args, **kw)
    if autologin: c.add_init_script(LOGIN)
    if not mant: c.route('**/js/config.js', _sin_mant)
    return c
Browser.new_context = new_context

# Ir a una sección por el menú de tres rayas, desplegando sus grupos (Activación, Logística › Material…)
LABELS = {'Operaciones': 'Intervenciones', 'Ayuda': 'Manual de uso', 'Más': 'Manual de uso', 'Ajustes': 'General', 'Stock': 'Material fungible',
          'Alistamiento': 'Alistamiento y despliegue', 'Avisos': 'Inicio'}
def menu(pg, label, wait=150):
    label = LABELS.get(label, label)
    root = '#nav' if pg.locator('#nav .nav-tree').count() and pg.locator('#nav .nav-tree').is_visible() else '#drawer'
    if root == '#drawer': pg.click('#menuBtn')
    if label == 'Inicio':
        pg.click(f'{root} .dr-item[data-area=home]'); pg.wait_for_timeout(wait); return
    tab = pg.evaluate("l => (SECTIONS.find(s => s[2] === l) || SECTIONS.find(s => s[2].startsWith(l)))?.[0]", label)
    assert tab, f'no hay sección «{label}» en el menú'
    for g in pg.evaluate("t => tabGroups(t)", tab):
        head = pg.locator(f'{root} .dr-group-head[onclick="toggleMenuGroup(\'{g}\')"]')
        if head.get_attribute('aria-expanded') != 'true': head.click()
    pg.click(f'{root} .dr-item[onclick="go(\'{tab}\')"]'); pg.wait_for_timeout(wait)
