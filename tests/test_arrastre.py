"""Arrastrar material entre todos los sitios: del contenedor al pasillo, de pasillo a otros, a una caja del pasillo,
el fungible, el EPI de reserva, al otro lateral del contenedor, a «En revisión» (abre la ficha de revisión) y «A una
persona» (le aparece en su ficha). Mientras se arrastra, abajo sale una barra con los destinos.
Uso: python3 tests/test_arrastre.py  (con la app servida en APP_URL)"""
import os
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 1280, 'height': 3000})
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *')
    a.evaluate("setPref({ tab: 'contenedor' })"); a.wait_for_selector('.drop-zone')

    def arrastra(src, dst, via=None):
        s = a.locator(src).first; s.scroll_into_view_if_needed(); bb = s.bounding_box()
        a.mouse.move(bb['x'] + 10, bb['y'] + 10); a.mouse.down(); a.mouse.move(bb['x'] + 30, bb['y'] + 30, steps=4)
        assert a.locator('#dragDock').count() == 1, 'sale la barra de destinos'
        if via:   # parada encima de algo (el botón del otro lateral) antes de soltar
            v = a.locator(via).first.bounding_box(); a.mouse.move(v['x'] + v['width'] / 2, v['y'] + v['height'] / 2, steps=6); a.wait_for_timeout(700)
        t = a.locator(dst).first.bounding_box()
        a.mouse.move(t['x'] + t['width'] / 2, t['y'] + t['height'] / 2, steps=12); a.mouse.up(); a.wait_for_timeout(300)
        assert a.locator('#dragDock').count() == 0, 'la barra se va al soltar'

    # Un equipo suelto del contenedor (sin ubicar) → Pasillo, con la barra de abajo
    gid = a.evaluate("list('gear').find(g => !g.vehicle && (g.door || 0) === 0 && !get('boxes', g.box)).id")
    arrastra(f'.cv-unplaced .tok[data-gear="{gid}"]', f'#dragDock .dock-zone[data-door="101"]')
    assert a.evaluate(f"get('gear', '{gid}').door") == 101
    # Del pasillo a Otros (fila de la lista del pasillo)
    arrastra(f'#alm-pasillo [data-gear="{gid}"]', '#dragDock .dock-zone[data-door="301"]')
    assert a.evaluate(f"get('gear', '{gid}').door") == 301
    # De Otros a un hueco del contenedor (soltando en el dibujo)
    arrastra(f'#alm-otros [data-gear="{gid}"]', '.cvi .cv-cell[data-door="2"]')
    assert a.evaluate(f"get('gear', '{gid}').door") == 2
    # A «En revisión»: abre la ficha de revisión de ese equipo
    a.evaluate("setPref({ tab: 'contenedor' })"); a.wait_for_timeout(200)
    arrastra(f'.cvi .tok[data-gear="{gid}"]', '#dragDock .dock-zone[data-rev]')
    assert 'Revisión' in a.text_content('#modal') and a.locator('#modalForm [name=state]').count() == 1, 'se abre la ficha de revisión'
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate(f"get('gear', '{gid}').status") != 'OPERATIVO'
    a.keyboard.press('Escape'); a.wait_for_timeout(100)
    # Una caja del pasillo como destino: el equipo entra en ella
    bid = a.evaluate("const b = list('boxes').find(b => !b.vehicle && b.door >= 1 && b.door <= 20); moveBox(b.id, 101); b.id")
    a.wait_for_timeout(200)
    g2 = a.evaluate("list('gear').find(g => !g.vehicle && (g.door || 0) === 0 && !get('boxes', g.box)).id")
    arrastra(f'.cv-unplaced .tok[data-gear="{g2}"]', f'#alm-pasillo .place-box[data-box="{bid}"]')
    assert a.evaluate(f"get('gear', '{g2}').box") == bid
    # El fungible también se arrastra (los botones de + y − siguen funcionando)
    cid = a.evaluate("const c = list('consumables')[0]; put('consumables', { ...c, door: 101, location: '' }); c.id"); a.wait_for_timeout(200)
    arrastra(f'#alm-pasillo .cons-item[data-cons="{cid}"]', '#dragDock .dock-zone[data-door="301"]')
    assert a.evaluate(f"consDoor(get('consumables', '{cid}'))") == 301
    # Al otro lateral del contenedor: se para encima del botón «Derecho», cambia de lateral y se suelta en B15
    a.evaluate("setPref({ tab: 'contenedor', cside: 'izq' })"); a.wait_for_timeout(200)
    g3 = a.evaluate("const g = list('gear').find(g => !g.vehicle && !get('boxes', g.box) && g.status === 'OPERATIVO' && !g.out); moveGear(g.id, 3); g.id"); a.wait_for_timeout(200)
    arrastra(f'.cvi .tok[data-gear="{g3}"]', '.cvi .cv-cell[data-door="15"]', via='.seg-row [data-cside="der"]')
    assert a.evaluate(f"get('gear', '{g3}').door") == 15 and a.evaluate("prefs.cside") == 'der'
    # A una persona: se elige quién y le aparece en su ficha, en «Material que lleva»; se devuelve desde ahí
    arrastra(f'.cvi .tok[data-gear="{g3}"]', '#dragDock .dock-zone[data-person]')
    assert a.locator('#modal .give-list .item').count() == a.evaluate("operators().length")
    a.click('#modal .give-list .item:has-text("DORTA")'); a.wait_for_timeout(200)
    dorta = a.evaluate("operators().find(o => o.name === 'DORTA').id")
    assert a.evaluate(f"[get('gear', '{g3}').out?.who, get('gear', '{g3}').out?.op]") == ['DORTA', dorta]
    # Lo que tiene una persona ya no está en el almacén: no sale en su hueco ni en la revista, y su ubicación dice quién lo tiene
    assert a.locator(f'.cvi .tok[data-gear="{g3}"]').count() == 0, 'no sigue en su hueco'
    assert a.evaluate(f"revGroups().some(([, , f]) => f(get('gear', '{g3}')))") is False
    assert a.evaluate(f"whereIs(get('gear', '{g3}'))").startswith('Con DORTA')
    a.evaluate(f"setPref({{ tab: 'personal', person: '{dorta}' }})"); a.wait_for_timeout(300)
    nombre = a.evaluate(f"get('gear', '{g3}').name")
    assert a.locator(f'.panel:has-text("Material que lleva") .item:has-text("{nombre}")').count() == 1
    a.click(f'.panel:has-text("Material que lleva") .item:has-text("{nombre}") button:has-text("Devolver")'); a.wait_for_timeout(300)
    assert a.evaluate(f"get('gear', '{g3}').out") is None and a.locator('.panel:has-text("Material que lleva")').count() == 0
    a.evaluate("setPref({ tab: 'contenedor', person: null, cside: 'der' })"); a.wait_for_timeout(200)
    assert a.locator(f'.cvi .cv-cell[data-door="15"] .tok[data-gear="{g3}"]').count() == 1, 'al devolverlo vuelve a su hueco'
    # Una caja entera a una persona: sale del almacén con lo que lleva y se devuelve de una vez desde su ficha
    bx = a.evaluate("const b = boxes().find(b => !b.vehicle && boxItems(b.id).length && boxItems(b.id).every(g => !g.out)); b.id")
    a.evaluate(f"giveTo(JSON.stringify({{ box: '{bx}' }}), '{dorta}')"); a.wait_for_timeout(200)
    assert a.evaluate(f"[get('boxes', '{bx}').out?.op, boxItems('{bx}').every(g => g.out?.op === '{dorta}')]") == [dorta, True]
    assert a.locator(f'#view .tok[data-box="{bx}"], #view .place-box[data-box="{bx}"]').count() == 0, 'la caja no sigue en el almacén'
    a.evaluate(f"setPref({{ tab: 'personal', person: '{dorta}' }})"); a.wait_for_timeout(300)
    code = a.evaluate(f"get('boxes', '{bx}').code")
    a.click(f'.panel:has-text("Material que lleva") .item:has-text("{code}") button:has-text("Devolver")'); a.wait_for_timeout(300)
    assert a.evaluate(f"[get('boxes', '{bx}').out, boxItems('{bx}').some(g => g.out)]") == [None, False]
    # El EPI de reserva también se arrastra: de una balda a otra, y a una persona (sale uno de la reserva)
    a.evaluate("setPref({ tab: 'contenedor', person: null })"); a.wait_for_timeout(200)
    eid = 'EPI-RES-AUDITIVOS'; q0 = a.evaluate(f"epiQty(get('epis', '{eid}'))")
    a.evaluate("$('alm-armarios').scrollIntoView(); scrollBy(0, -300)"); a.wait_for_timeout(100); arrastra(f'.arm .tok[data-epi="{eid}"]', '.arm .cv-cell[data-door="233"]')
    assert a.evaluate(f"get('epis', '{eid}').door") == 233
    arrastra(f'.arm .tok[data-epi="{eid}"]', '#dragDock .dock-zone[data-person]')
    a.click('#modal .give-list .item:has-text("DORTA")'); a.wait_for_timeout(200)
    assert a.evaluate(f"epiQty(get('epis', '{eid}'))") == q0 - 1
    assert a.evaluate(f"list('epis').filter(e => e.holder === '{dorta}' && e.type === 'auditivos').length") == 2
    # Armarios de antes (dos puertas por armario): lo que había en una puerta pasa a la balda de abajo de ese armario
    a.evaluate("""(() => { const d = JSON.parse(localStorage.getItem(KEY.db)); const g = Object.values(d.gear)[0]; g.door = 204; g.vehicle = '';
      delete d.meta.armbase; localStorage.setItem(KEY.db, JSON.stringify(d)); window.__gid = g.id; sessionStorage.setItem('gid', g.id); })()""")
    a.reload(); a.wait_for_selector('#view > *')
    assert a.evaluate("get('gear', sessionStorage.getItem('gid')).door") == 225 and a.evaluate("get('meta', 'armbase').value") == 1
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
