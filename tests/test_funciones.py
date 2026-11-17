"""Funciones nuevas de logística: pedido del fungible bajo mínimo, permiso de logística para otras personas, revista de
salida de cada vehículo (por matrícula, con historial y aviso de fallos) y revista del material leyendo las etiquetas QR.
Uso: python3 tests/test_funciones.py  (con la app servida en APP_URL)"""
import os, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *')
    a.evaluate("window.shareText = (t, title) => { window._shared = t; }")
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(250))

    # ---------- Pedido del fungible ----------
    cid = a.evaluate("const c = list('consumables')[0]; put('consumables', { ...c, stock: 1, min: 4 }); c.id")
    a.evaluate("setPref({ tab: 'contenedor' })"); a.wait_for_timeout(300)
    assert a.locator('#view button:has-text("Pedido")').count() == 1, 'con algo bajo mínimo sale «Pedido»'
    a.click('#view button:has-text("Pedido")'); a.wait_for_selector('#modalForm')
    assert a.input_value(f'#modalForm [name=q_{cid}]') == '7', 'propone llegar al doble del mínimo (8 − 1)'
    a.fill(f'#modalForm [name=q_{cid}]', '10'); a.fill('#modalForm [name=notes]', 'Para el jueves'); save()
    txt = a.evaluate("window._shared"); name = a.evaluate(f"get('consumables', '{cid}').name")
    assert 'Pedido de material fungible' in txt and f'*{name}*: 10' in txt and 'Para el jueves' in txt, txt
    a.evaluate(f"const c = get('consumables', '{cid}'); put('consumables', {{ ...c, stock: 9 }})"); a.wait_for_timeout(200)
    assert a.locator('#view button:has-text("Pedido")').count() == 0, 'sin nada bajo mínimo no sale'

    # ---------- Escanear material: una etiqueta abre su ficha ----------
    gid = a.evaluate("list('gear').find(g => g.box && get('boxes', g.box)).id"); bid = a.evaluate(f"get('gear', '{gid}').box")
    a.click('#view button:has-text("Escanear")'); a.wait_for_selector('#scanResult')
    assert 'etiqueta QR' in a.inner_text('#scanResult')
    a.evaluate(f"handleScan(null, appUrl() + '#k={bid}')"); a.wait_for_timeout(200)
    assert a.evaluate(f"get('boxes', '{bid}').code") in a.inner_text('#modal'), 'la etiqueta de una caja abre la caja'
    a.keyboard.press('Escape')

    # ---------- Revista leyendo las etiquetas QR ----------
    a.evaluate("setPref({ tab: 'revista' })"); a.wait_for_timeout(200)
    a.click('button:has-text("Iniciar revista")'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(300)
    assert a.locator('button:has-text("Escanear QR")').count() == 1
    a.click('button:has-text("Escanear QR")'); a.wait_for_selector('#scanResult')
    ids = a.evaluate("prefs.draft.ids")
    g1 = a.evaluate("prefs.draft.ids.find(id => !get('gear', id).box)") or ids[0]
    a.evaluate(f"revScanText(appUrl() + '#g={g1}')"); a.wait_for_timeout(150)
    assert a.evaluate(f"markOf(prefs.draft.res['{g1}'])") == 'ok' and 'Correcto' in a.inner_text('#scanResult')
    a.evaluate(f"revScanText(appUrl() + '#g={g1}')"); assert 'Ya estaba marcado' in a.inner_text('#scanResult')
    b2 = a.evaluate("const ids = new Set(prefs.draft.ids); boxes().find(b => boxItems(b.id).filter(g => ids.has(g.id)).length > 1).id")
    a.evaluate(f"revScanText(appUrl() + '#k={b2}')"); a.wait_for_timeout(150)
    assert a.evaluate(f"boxItems('{b2}').filter(g => prefs.draft.ids.includes(g.id)).every(g => markOf(prefs.draft.res[g.id]) === 'ok')"), 'la caja marca todo lo que lleva'
    assert 'equipos correctos' in a.inner_text('#scanResult')
    a.evaluate("revScanText('hola')"); assert 'No es una etiqueta' in a.inner_text('#scanResult')
    a.click('#modal button:has-text("Terminar")'); a.wait_for_timeout(150)
    a.evaluate("setPref({ draft: null })")

    # ---------- Checklist de un vehículo (el modelo enseña sus matrículas; cada una abre su ficha) ----------
    a.evaluate("setPref({ tab: 'vehiculos', vehVista: 'modelo' })"); a.wait_for_timeout(200)
    a.click('.veh-item:has-text("Amarok")'); a.wait_for_selector('#modal .veh-u')
    assert a.locator('#modal .veh-u').count() == 3
    plate = a.inner_text('#modal .veh-u >> nth=0 >> b')
    a.click('#modal .veh-u >> nth=0'); a.wait_for_selector('#modal .uni-datos'); assert 'Aún no se ha hecho ningún checklist' in a.inner_text('#modal')
    a.click('#modal .veh-mat button:has-text("Checklist")'); a.wait_for_selector('#modalForm [name=km]')
    a.locator('#modalForm .check-row:has-text("Luces y rotativos") input').uncheck()
    a.fill('#modalForm [name=km]', '45210'); a.select_option('#modalForm [name=fuel]', '1/2'); a.fill('#modalForm [name=notes]', 'Rotativo trasero roto'); save()
    vc = a.evaluate("list('vchecks')[0]")
    assert vc['plate'] == plate and vc['fails'] == ['Luces y rotativos'] and vc['km'] == 45210 and vc['fuel'] == '1/2', vc
    a.wait_for_selector('#modal .uni-datos')
    assert 'Mal: Luces y rotativos' in a.inner_text('#modal .chk-ult') and 'GRANADOS' in a.inner_text('#modal .chk-ult') and a.locator('#modal .uni-tags .tag.bad:has-text("1 incidencia")').count() == 1, 'la ficha enseña el último checklist'
    # El fallo abre una incidencia de esa matrícula (con quién lo vio)
    inc = a.evaluate("list('issues')"); assert len(inc) == 1 and inc[0]['text'] == 'Luces y rotativos' and inc[0]['st'] == 'abierta' and inc[0]['by'] == 'GRANADOS' and 'Luces y rotativos' in a.inner_text('#modal .veh-inc'), inc
    a.click('#modal .chk-ult .link'); a.wait_for_timeout(150)
    assert 'Rotativo trasero roto' in a.inner_text('#modal') and '45.210 km' in a.inner_text('#modal'), 'historial de la matrícula'
    a.keyboard.press('Escape'); a.wait_for_timeout(150)
    assert a.locator('.veh-item:has-text("Amarok") .tag:has-text("Con incidencias")').count() == 1
    a.evaluate("setPref({ tab: 'avisos' })"); a.wait_for_timeout(200)
    assert a.locator(f'.panel:has-text("Vehículos con fallos") .item:has-text("{plate}")').count() == 1, 'el fallo sale en Inicio'
    # Una revista nueva sin fallos quita el aviso
    a.evaluate(f"const v = get('vehicles', 'V-AMAROK'), u = v.units.find(u => u.plate === '{plate}'); vcheckForm('V-AMAROK', u.id)"); a.wait_for_selector('#modalForm [name=km]')
    a.fill('#modalForm [name=km]', '45300'); save()
    a.keyboard.press('Escape'); a.evaluate("setPref({ tab: 'avisos' })"); a.wait_for_timeout(200)
    assert a.locator('.panel:has-text("Vehículos con fallos")').count() == 0
    a.screenshot(path=f'{OUT}/funciones-inicio.png', full_page=True)

    # ---------- Cualquiera del equipo gestiona el material (ya no hay permiso de logística) ----------
    dorta = a.evaluate("operators().find(o => o.name === 'DORTA').id")
    a.evaluate(f"setPref({{ session: '{dorta}', activeOperator: 'DORTA' }})"); a.wait_for_timeout(150)
    assert a.evaluate("puedeFlota()"), 'cualquiera gestiona el material'
    a.evaluate("setPref({ tab: 'contenedor' })"); a.wait_for_timeout(200)
    assert a.locator('#view button.btn-a:has-text("Material")').count() == 1
    a.evaluate(f"personForm('{dorta}')"); a.wait_for_selector('#modalForm')
    assert a.locator('#modalForm input[name=logi]').count() == 0, 'ya no se pregunta el permiso de logística'
    a.keyboard.press('Escape')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
