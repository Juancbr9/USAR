"""Las pruebas entran ya con sesión iniciada (GRANADOS, OP-01) para no pasar por la pantalla de entrada en cada página
(ni por la que la pide de nuevo cada vez que se abre la app; para probarla: br.new_context(..., bloqueo=True)).
Para probar la propia pantalla de entrada: br.new_context(..., autologin=False)."""
from playwright.sync_api import Browser

LOGIN = """try { const k = 'USAR_V4_PREFS', p = JSON.parse(localStorage.getItem(k) || '{}');
  if (!p.session && !sessionStorage.getItem('sin-sesion')) { p.session = 'OP-01'; p.avanzado ??= true; localStorage.setItem(k, JSON.stringify(p)); }
  if (p.session && !sessionStorage.getItem('con-bloqueo')) sessionStorage.setItem('USAR_UNLOCK', '1'); } catch (e) {}"""
_new_context = Browser.new_context
# Las pruebas arrancan sin el modo mantenimiento (solo RODRI); test_mantenimiento.py lo prueba con mant=True (y RODRI de ADMIN).
# Además, GRANADOS (la sesión de las pruebas) hace de ADMIN para dar de alta material y vehículos; test_flota.py prueba
# el permiso de verdad (solo RODRI) con flota=True.
def _config(mant, flota):
    def route_(route):
        r = route.fetch(); body = r.text()
        if not mant: body = body.replace('const MANT_DEFECTO = true', 'const MANT_DEFECTO = false')
        if not flota: body = body.replace("const ADMIN = 'RODRI'", "const ADMIN = 'GRANADOS'")
        route.fulfill(response=r, body=body)
    return route_
def new_context(self, *args, autologin=True, mant=False, flota=False, bloqueo=False, **kw):
    c = _new_context(self, *args, **kw)
    if autologin: c.add_init_script(LOGIN.replace("!sessionStorage.getItem('con-bloqueo')", 'false') if bloqueo else LOGIN)
    if not mant: c.route('**/js/config.js', _config(mant, flota))
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
