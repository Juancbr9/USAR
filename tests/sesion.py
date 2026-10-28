"""Las pruebas entran ya con sesión iniciada (GRANADOS, OP-01) para no pasar por la pantalla de entrada en cada página
(ni por la que la pide de nuevo cada vez que se abre la app; para probarla: br.new_context(..., bloqueo=True)).
Para probar la propia pantalla de entrada: br.new_context(..., autologin=False).
La base de datos del equipo (SUPA en js/config.js) se sustituye: sin nada, cada móvil guarda los datos solo para sí;
con supa=MOCK_URL, la app se conecta sola al servidor de prueba (tests/mock_supabase.py). Nunca se usa la de verdad."""
import os
from playwright.sync_api import Browser
# Que context.route también vea lo que pide el service worker (si no, al recargar llega el config.js de verdad de su caché)
os.environ.setdefault('PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS', '1')

LOGIN = """try { const k = 'USAR_V4_PREFS', p = JSON.parse(localStorage.getItem(k) || '{}');
  if (!p.session && !sessionStorage.getItem('sin-sesion')) { p.session = 'OP-01'; localStorage.setItem(k, JSON.stringify(p)); }
  if (p.session && !sessionStorage.getItem('con-bloqueo')) sessionStorage.setItem('USAR_UNLOCK', '1'); } catch (e) {}"""
_new_context = Browser.new_context
# Las pruebas arrancan sin el modo mantenimiento (solo RODRI); test_mantenimiento.py lo prueba con mant=True (y RODRI de ADMIN).
# Además, GRANADOS (la sesión de las pruebas) hace de ADMIN para dar de alta material y vehículos; test_flota.py prueba
# el permiso de verdad (solo RODRI) con flota=True.
SUPA_REAL = "url: 'https://lxjkpgdvhzjwkmxnllqp.supabase.co', key: 'sb_publishable_boxlf-dFI3dd-tdSMd3SJg_otPOwFCq'"
def _config(mant, flota, supa):
    def route_(route):
        r = route.fetch(); body = r.text()
        assert SUPA_REAL in body, 'cambia SUPA_REAL en tests/sesion.py'
        body = body.replace(SUPA_REAL, f"url: '{supa}', key: 'sb_publishable_prueba'")
        if not mant: body = body.replace('const MANT_DEFECTO = true', 'const MANT_DEFECTO = false')
        if not mant and not flota: body = body.replace("const ADMIN = 'RODRI'", "const ADMIN = 'GRANADOS'")
        route.fulfill(response=r, body=body)
    return route_
def new_context(self, *args, autologin=True, mant=False, flota=False, bloqueo=False, supa='', **kw):
    c = _new_context(self, *args, **kw)
    if autologin: c.add_init_script(LOGIN.replace("!sessionStorage.getItem('con-bloqueo')", 'false') if bloqueo else LOGIN)
    c.route('**/js/config.js', _config(mant, flota, supa))
    # Por si acaso: nada llega a la base de datos de verdad (se contesta como una nube vacía)
    c.route('https://lxjkpgdvhzjwkmxnllqp.supabase.co/**', lambda r: r.fulfill(status=200 if r.request.method == 'GET' else 201,
            content_type='application/json', body='[]' if r.request.method == 'GET' else '', headers={'Access-Control-Allow-Origin': '*'}))
    return c
Browser.new_context = new_context

# Ir a una sección por el menú de tres rayas, desplegando sus grupos (Actividades, Material…)
LABELS = {'Operaciones': 'Todas las actividades', 'Intervenciones': 'Todas las actividades', 'Activación': 'Todas las actividades', 'Actividades': 'Todas las actividades', 'Ayuda': 'Manual de uso', 'Más': 'Manual de uso', 'Ajustes': 'General', 'Stock': 'Almacén', 'Material': 'Almacén', 'Contenedor': 'Almacén',
          'Avisos': 'Inicio'}
# Cada tipo de actividad está en «Todas las actividades», con su filtro
FILTRO = {'Activación': 'Intervenciones', 'Intervenciones': 'Intervenciones', 'Operaciones': 'Intervenciones', 'Ejercicios': 'Ejercicios', 'Maniobras': 'Maniobras', 'Convoy': 'Convoyes'}
def menu(pg, label, wait=150):
    if label in FILTRO:
        menu(pg, 'Todas las actividades', wait); pg.click(f'#view .act-chips .chip:has-text("{FILTRO[label]}")'); pg.wait_for_timeout(wait); return
    label = LABELS.get(label, label)
    root = '#nav' if pg.locator('#nav .nav-tree').count() and pg.locator('#nav .nav-tree').is_visible() else '#drawer'
    if root == '#drawer': pg.click('#menuBtn')
    if label == 'Inicio':
        pg.click(f'{root} .dr-item[data-area=home]'); pg.wait_for_timeout(wait); return
    tab = pg.evaluate("l => (SECTIONS.find(s => !s[6] && s[2] === l) || SECTIONS.find(s => !s[6] && s[2].startsWith(l)))?.[0]", label)
    assert tab, f'no hay sección «{label}» en el menú'
    for g in pg.evaluate("t => tabGroups(t)", tab):
        head = pg.locator(f'{root} .dr-group-head[onclick="toggleMenuGroup(\'{g}\')"]')
        if head.get_attribute('aria-expanded') != 'true': head.click()
    pg.click(f'{root} .dr-item[onclick="go(\'{tab}\')"]'); pg.wait_for_timeout(wait)
