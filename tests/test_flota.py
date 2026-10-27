"""Prueba del permiso de flota: solo RODRI (ADMIN) añade, cambia o elimina material, cajas, consumibles, vehículos y
extras de las salidas. El resto los usa (mover, sacar, revisión, stock) pero no ve los botones de alta ni de edición.
Con usuario de Supabase hace falta además el rol de jefe: con una cuenta de miembro, RODRI ve la app como el resto.
Y el servidor rechaza el material nuevo de un miembro sin atascar el resto de los cambios.
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

    # GRANADOS: sin botones de alta ni de edición, pero sí puede mover el material
    b = botones(a)
    assert not any(b[k] for k in ('material', 'caja', 'editar', 'eliminar', 'vehiculo', 'veh_editar', 'consumible')), b
    assert b['mover'], 'el resto sigue moviendo el material'
    # Aunque se llame a los formularios (QR, enlaces antiguos…), no se abren
    n = a.evaluate("list('gear').length")
    for f in ("gearForm()", "boxForm()", "consForm()", "vehicleForm()", f"extrasForm(list('missions')[0]?.id)", f"removeItem('gear', list('gear')[0].id)"):
        a.evaluate(f); a.wait_for_timeout(50)
        assert a.locator('#modalForm, #extrasForm').count() == 0, f'{f} no debe abrirse'
    assert a.evaluate("list('gear').length") == n, 'no se borra nada'
    assert 'Solo RODRI' in a.inner_text('#toasts, .toast, body')
    # El stock sí lo ajusta cualquiera
    go(a, 'consumibles')
    if a.evaluate("list('consumables').length"):
        c0 = a.evaluate("list('consumables').sort(byName)[0].stock")
        a.locator('#view button:has-text("+1")').first.click(); a.wait_for_timeout(100)
        assert a.evaluate("list('consumables').sort(byName)[0].stock") == c0 + 1

    # RODRI: todo
    como(a, rodri, 'RODRI')
    b = botones(a); assert all(b.values()), b
    go(a, 'contenedor'); a.click('#view button.btn-a:has-text("Material")'); a.click('#modal .add-mat [data-add=plus]')
    a.fill('#modalForm [name=name]', 'Taladro nuevo de RODRI'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate("list('gear').some(g => g.name === 'Taladro nuevo de RODRI')")

    # Con usuario de Supabase: RODRI con su cuenta de jefe edita; con su segunda cuenta (miembro) lo ve como el resto
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
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
