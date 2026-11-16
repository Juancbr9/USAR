"""Prueba de quién da de alta material, cajas, consumibles y vehículos: cualquiera del equipo (antes, solo RODRI y quien
tenía permiso de logística). Con usuario de la base de datos, el jefe siempre puede y un miembro solo cuando la base de
datos ya lo admite (registro «flotaabierta», que crea el cambio de supabase.sql); mientras tanto el servidor rechaza su
material nuevo sin atascar el resto de los cambios.
Uso: python3 tests/test_flota.py  (con la app en APP_URL y el servidor de prueba recién arrancado en MOCK_URL)"""
import os, sys, json, urllib.request
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada como GRANADOS)

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
MOCK = os.environ.get('MOCK_URL', 'http://127.0.0.1:54321')
problems = []
IGNORE = ('ERR_TUNNEL', 'Failed to load resource', 'ERR_CONNECTION', 'net::')

def dump(): return json.load(urllib.request.urlopen(MOCK + '/_dump'))
def watch(pg, name):
    pg.on('pageerror', lambda e: problems.append(f'{name} ERROR {e}'))
    pg.on('console', lambda m: m.type in ('warning', 'error') and not any(x in m.text for x in IGNORE) and problems.append(f'{name} {m.type}: {m.text}'))
    pg.on('dialog', lambda d: d.accept())

def go(pg, tab): pg.evaluate(f"setPref({{ tab: '{tab}' }})"); pg.wait_for_timeout(200)
def botones(pg):
    """Qué botones de alta y edición ve la persona con sesión en cada pantalla"""
    r = {}
    go(pg, 'contenedor'); r['material'] = pg.locator('#view button:has-text("Material")').count() > 0
    r['caja'] = r['consumible'] = False
    if r['material']:
        pg.click('#view button.btn-a:has-text("Material")'); pg.wait_for_timeout(100)
        r['caja'] = pg.locator('#modal .add-mat [data-add=case]').count() > 0
        r['consumible'] = pg.locator('#modal .add-mat [data-add=package]').count() > 0
        pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    gid = pg.evaluate("list('gear')[0].id")
    pg.evaluate(f"gearDetail('{gid}')"); pg.wait_for_timeout(100)
    r['editar'] = pg.locator('#modal button:has-text("Editar")').count() > 0
    r['eliminar'] = pg.locator('#modal button:has-text("Eliminar")').count() > 0
    r['mover'] = pg.locator('#modal button:has-text("Mover")').count() > 0
    pg.keyboard.press('Escape')
    go(pg, 'vehiculos'); r['vehiculo'] = pg.locator('#view button:has-text("Modelo")').count() > 0
    # Todos abren la ficha de un vehículo (matrículas y revista de salida); solo quien gestiona la flota la edita
    pg.locator('#view button.veh-item').first.click(); pg.wait_for_timeout(100)
    r['veh_editar'] = pg.locator('#modal button:has-text("Editar modelo")').count() > 0
    pg.keyboard.press('Escape'); pg.wait_for_timeout(100)
    return r

with sync_playwright() as p:
    br = p.chromium.launch()
    A = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, bypass_csp=True, flota=True)
    a = A.new_page(); watch(a, 'A')
    a.goto(APP); a.wait_for_selector('#view > *')
    rodri = a.evaluate("operators().find(o => o.name === 'RODRI').id")
    como = lambda pg, op, name: (pg.evaluate(f"setPref({{ session: '{op}', activeOperator: '{name}' }})"), pg.wait_for_timeout(200))

    # Sin usuario de la base de datos, cualquiera del equipo (GRANADOS no es ADMIN) da de alta, edita y elimina
    b = botones(a); assert all(b.values()), b
    go(a, 'contenedor'); a.click('#view button.btn-a:has-text("Material")'); a.click('#modal .add-mat [data-add=plus]')
    a.fill('#modalForm [name=name]', 'Taladro nuevo de GRANADOS'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate("list('gear').some(g => g.name === 'Taladro nuevo de GRANADOS')") and a.evaluate("puedeFlota()")
    # El permiso de logística ya no existe (no se pregunta en la ficha de nadie)
    a.evaluate(f"setPref({{ session: '{rodri}', activeOperator: 'RODRI' }}); personForm(operators().find(o => o.name === 'DORTA').id)"); a.wait_for_selector('#modalForm')
    assert a.locator('#modalForm input[name=logi]').count() == 0; a.keyboard.press('Escape'); a.wait_for_timeout(150)
    go(a, 'contenedor'); a.click('#view button.btn-a:has-text("Material")'); a.click('#modal .add-mat [data-add=plus]')
    a.fill('#modalForm [name=name]', 'Taladro nuevo de RODRI'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate("list('gear').some(g => g.name === 'Taladro nuevo de RODRI')")

    # Con usuario de Supabase y la base de datos aún sin abrir: el jefe edita; un miembro lo ve sin botones de alta
    req = urllib.request.Request(MOCK + '/rest/v1/usar_members', method='POST', headers={'Content-Type': 'application/json'},
                                 data=json.dumps([{'email': 'juan@usar.es', 'role': 'jefe'}, {'email': 'juan+prueba@usar.es', 'role': 'miembro'}]).encode())
    urllib.request.urlopen(req)
    a.evaluate(f"Sync.connect('{MOCK}', 'sb_publishable_prueba')"); a.wait_for_timeout(1500)
    a.evaluate("Sync.signUp('juan@usar.es', 'secreto1').then(() => Sync.signIn('juan@usar.es', 'secreto1'))"); a.wait_for_timeout(1500)
    assert a.evaluate("Sync.role") == 'jefe' and a.evaluate("puedeFlota()")
    a.wait_for_function("!Sync.pending", timeout=15000)
    assert any(r['kind'] == 'gear' and r['data'].get('name') == 'Taladro nuevo de RODRI' for r in dump()), 'el jefe sí da de alta material en la nube'
    a.evaluate("Sync.signOut()")
    a.evaluate("Sync.signUp('juan+prueba@usar.es', 'secreto2').then(() => Sync.signIn('juan+prueba@usar.es', 'secreto2'))"); a.wait_for_timeout(1500)
    assert a.evaluate("Sync.role") == 'miembro' and not a.evaluate("puedeFlota()")
    b = botones(a)
    assert not any(b[k] for k in ('material', 'caja', 'editar', 'eliminar', 'vehiculo', 'veh_editar', 'consumible')), b
    go(a, 'ajustes'); assert a.locator('text=el material y los vehículos los da de alta el jefe').count() == 1
    # Ajustes sigue con el mantenimiento (ADMIN en este móvil) para no quedarse fuera
    assert a.locator('text=Activar mantenimiento').count() + a.locator('text=Dar acceso a todo el equipo').count() == 1

    # El servidor: material nuevo de un miembro (saltándose la app) se rechaza; el resto de cambios del lote sí se guardan
    a.wait_for_function("!Sync.pending", timeout=15000)
    gid = a.evaluate("list('gear').find(g => g.name !== 'Taladro nuevo de RODRI').id")
    a.evaluate(f"put('gear', {{ ...get('gear', '{gid}'), status: 'REVISIÓN' }}); put('gear', {{ id: 'G-COLADO', name: 'Colado', door: 1, status: 'OPERATIVO' }})")
    a.wait_for_function("!Sync.pending", timeout=15000); a.wait_for_timeout(300)
    rows = {(r['kind'], r['id']): r for r in dump()}
    assert ('gear', 'G-COLADO') not in rows, 'el servidor no debe aceptar material nuevo de un miembro'
    assert rows[('gear', gid)]['data']['status'] == 'REVISIÓN', 'el cambio de estado del miembro sí llega'
    assert a.evaluate("Sync.status") == 'online', a.evaluate("Sync.error")

    # Base de datos abierta (el cambio de supabase.sql): llega el registro «flotaabierta» y el miembro ya da de alta material
    urllib.request.urlopen(MOCK + '/_abierto')
    raw = urllib.request.Request(MOCK + '/_raw', method='POST', headers={'Content-Type': 'application/json'},
                                 data=json.dumps({'kind': 'meta', 'id': 'flotaabierta', 'data': {'id': 'flotaabierta', 'value': True, '_u': 1}, 'deleted': False}).encode())
    urllib.request.urlopen(raw)
    a.evaluate("Sync.pull()"); a.wait_for_function("flotaAbierta()", timeout=15000)
    assert a.evaluate("Sync.role") == 'miembro' and a.evaluate("puedeFlota()")
    b = botones(a); assert all(b.values()), b
    a.evaluate("put('gear', { id: 'G-MIEMBRO', name: 'Del miembro', door: 1, status: 'OPERATIVO' })")
    a.wait_for_function("!Sync.pending", timeout=15000); a.wait_for_timeout(300)
    assert ('gear', 'G-MIEMBRO') in {(r['kind'], r['id']) for r in dump()} and a.evaluate("Sync.status") == 'online', a.evaluate("Sync.error")
    go(a, 'ajustes'); assert a.locator('text=los miembros y los PIN los lleva el jefe').count() == 1
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
