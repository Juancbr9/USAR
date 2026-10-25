"""Prueba completa en dos móviles simulados: material, QR, revista, EPI, puertas, sincronización, sin conexión y borrados.
Uso: python3 tests/test_sincronizacion.py  (con la app servida en APP_URL y, si aplica, el servidor de prueba en MOCK_URL)"""
import os, sys, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
MOCK = os.environ.get('MOCK_URL', 'http://127.0.0.1:54321')
import json, time, urllib.request, numpy as np, cv2
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)
problems = []
def watch(pg, tag):
    pg.on('pageerror', lambda e: problems.append(f'{tag} ERROR {e}'))
    pg.on('console', lambda m: m.type in ('warning', 'error') and 'ERR_TUNNEL' not in m.text and problems.append(f'{tag} {m.type}: {m.text}'))
    pg.on('dialog', lambda d: d.accept())
def dump(): return json.load(urllib.request.urlopen(MOCK + '/_dump'))
MAIN = {'Avisos': 'Inicio', 'Inicio': 'Inicio', 'Operaciones': 'Operaciones'}
def tab(pg, name):
    sesion.menu(pg, MAIN.get(name, name))

with sync_playwright() as p:
    br = p.chromium.launch()
    phone = dict(bypass_csp=True, viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    A = br.new_context(**phone); a = A.new_page(); watch(a, 'A')
    a.goto(APP); a.wait_for_selector('#view > *')

    a.screenshot(path=f'{OUT}/inicio.png', full_page=True)
    for name in ['Avisos', 'Contenedor', 'Revista', 'Personal', 'Stock', 'Ajustes']:
        tab(a, name); a.screenshot(path=f'{OUT}/tab-{name}.png', full_page=True)

    # Añadir material
    tab(a, 'Contenedor'); a.click('#view button.btn-a:has-text("Material")'); a.click('#modal .add-mat [data-add=plus]')
    a.fill('[name=name]', 'Radio Motorola DP4400'); a.select_option('[name=place]', '5'); a.fill('[name=service]', '2026-11-01')
    a.set_input_files('input[type=file]', files=[{'name': 'f.png', 'mimeType': 'image/png', 'buffer': open(ROOT / 'icon-512.png','rb').read()}])
    a.wait_for_timeout(400); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate("!!list('gear').find(g => /Radio Motorola/.test(g.name)).photo"), 'foto no guardada'

    # Ficha + QR y lectura del QR
    a.evaluate("gearDetail(list('gear').find(g => /Radio Motorola/.test(g.name)).id)"); a.screenshot(path=f'{OUT}/detalle.png')
    a.click('#modal button:has-text("Código QR")'); a.wait_for_timeout(200)
    a.locator('.qr').screenshot(path=f'{OUT}/qr.png')
    txt = cv2.QRCodeDetectorAruco().detectAndDecode(cv2.imread(f'{OUT}/qr.png'))[0]
    print('QR leído:', txt); assert '#g=G-' in txt
    a.click('#modal [aria-label=Cerrar]')

    # Sacar y devolver
    a.evaluate("gearDetail(list('gear').find(g => /Radio Motorola/.test(g.name)).id)"); a.click('#modal button:has-text("Sacar")')
    a.select_option('[name=who]', 'DORTA'); a.fill('[name=note]', 'Simulacro'); a.click('#modalForm button:has-text("Guardar")')
    a.keyboard.press('Escape'); assert a.locator('.tok-gear.is-out:has-text("Radio Motorola")').count() == 1, 'préstamo no visible'

    # Revista: puerta 1 todo OK, un fallo en puerta 2
    tab(a, 'Revista'); a.click('button:has-text("Iniciar revista")'); a.click('#modalForm button:has-text("Guardar")')
    a.locator('.panel:has-text("B1 ·") button:has-text("Todo OK")').click()
    a.locator('.check:has-text("Extractor")').locator('.seg.bad').click()
    a.fill('.check:has-text("Extractor") input', 'No arranca')
    a.screenshot(path=f'{OUT}/revista.png')
    a.click('button:has-text("Finalizar revista")'); a.wait_for_timeout(300)
    tab(a, 'Avisos'); a.screenshot(path=f'{OUT}/avisos-despues.png', full_page=True)
    assert a.locator('.item:has-text("Extractor")').count() >= 1, 'el fallo de revista no aparece en avisos'

    # EPI: mono de GRANADOS talla L para revisar
    # (todo el EPI de cada persona está en su ficha de Personal)
    tab(a, 'Personal'); a.click('.item:has-text("GRANADOS")'); a.screenshot(path=f'{OUT}/epi.png', full_page=True)
    a.locator('.panel:has-text("EPI asignado") .item:has-text("Mono")').click()
    a.fill('[name=size]', 'L'); a.select_option('[name=status]', 'REVISAR'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.locator('.panel:has-text("EPI asignado") .item:has-text("Talla L") .tag.warn').count() == 1, 'EPI no actualizado'
    tab(a, 'Avisos'); assert a.locator('.item:has-text("Mono de GRANADOS")').count() == 1, 'EPI no aparece en avisos'
    tab(a, 'Inicio')
    # Perfil de misión
    tab(a, 'Personal'); a.select_option('.panel select', 'vertical'); a.wait_for_timeout(150)
    assert a.locator('text=Jefe de Rescate en Altura').count() == 1

    # A se conecta al servidor de prueba (en la app de verdad va integrado: SUPA en js/config.js)
    a.evaluate(f"Sync.connect('{MOCK}', 'sb_publishable_prueba')")
    a.wait_for_function("document.querySelector('#syncBadge').textContent.includes('conectado')", timeout=15000)
    print('Filas en la nube tras conectar A:', len(dump()))
    tab(a, 'Ajustes'); assert a.locator('[name=url], [name=key], button:has-text("Invitar")').count() == 0, 'no se configura nada a mano'

    # B, un móvil nuevo, se conecta solo al abrir la app y recibe los datos del equipo (no los suyos de serie)
    B = br.new_context(**phone, supa=MOCK); b = B.new_page(); watch(b, 'B')
    b.goto(APP)
    b.wait_for_function("document.querySelector('#syncBadge').textContent.includes('conectado')", timeout=15000)
    b.wait_for_timeout(300)
    b.wait_for_function("list('gear').some(g => /Radio Motorola/.test(g.name))", timeout=15000)
    tab(b, 'Contenedor'); b.click('.cv-cell[data-door="5"] .cv-tag')
    assert b.locator('#modal .item:has-text("Radio Motorola")').count() == 1, 'B no recibió el material de A'; b.keyboard.press('Escape')
    tab(b, 'Personal'); assert b.locator('text=Jefe de Rescate en Altura').count() == 1, 'B no recibió los puestos'
    print('B recibe los datos de A: OK')

    # B cambia un estado; A lo ve en el siguiente sondeo
    gid = lambda pg, n: pg.evaluate(f"list('gear').find(g => g.name === '{n}').id")
    to_rev = lambda pg, n: (pg.evaluate(f"gearDetail('{gid(pg, n)}')"), pg.click('#modal button:has-text("A revisión")'), pg.click('#modalForm button:has-text("Guardar")'), pg.wait_for_timeout(200), pg.keyboard.press('Escape'))
    to_rev(b, 'Ingletadora')
    tab(a, 'Contenedor')
    t0 = time.time()
    a.wait_for_selector('.cv-cell[data-door="10"] .tok-gear.has-bad:has-text("Ingletadora")', timeout=20000)
    print(f'A ve el cambio de B en {time.time()-t0:.1f} s')

    # A sin conexión: el cambio se queda pendiente y se envía al volver
    A.set_offline(True); a.evaluate("dispatchEvent(new Event('offline'))")
    to_rev(a, 'Motor Hycon'); a.wait_for_timeout(300)
    badge = a.inner_text('#syncBadge'); print('Badge sin conexión:', badge); assert 'pendientes' in badge
    A.set_offline(False); a.evaluate("dispatchEvent(new Event('online'))")
    a.wait_for_function("document.querySelector('#syncBadge').textContent.includes('conectado')", timeout=15000)
    clavos = [r for r in dump() if r['kind'] == 'gear' and 'Motor Hycon' in r['data'].get('name', '')][0]
    print('Motor Hycon en la nube tras reconectar:', clavos['data']['status']); assert clavos['data']['status'] == 'REVISIÓN'

    # Borrado se propaga
    b.evaluate(f"gearDetail('{gid(b, 'Motor Hycon')}')"); b.click('#modal button:has-text("Eliminar")')
    a.wait_for_selector('.tok-gear:has-text("Motor Hycon")', state='detached', timeout=20000)
    print('Borrado propagado a A: OK')

    # Escritorio
    D = br.new_context(bypass_csp=True, viewport={'width': 1280, 'height': 900}); d = D.new_page(); watch(d, 'D')
    d.goto(APP); d.wait_for_selector('#view > *'); d.screenshot(path=f'{OUT}/escritorio.png')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
