"""Arrastrar material entre todos los sitios: del contenedor al pasillo, de pasillo a otros, a una caja del pasillo,
el fungible y a «En revisión» (abre la ficha de revisión). Mientras se arrastra, abajo sale una barra con los destinos.
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

    def arrastra(src, dst):
        s = a.locator(src).first; s.scroll_into_view_if_needed(); bb = s.bounding_box()
        a.mouse.move(bb['x'] + 10, bb['y'] + 10); a.mouse.down(); a.mouse.move(bb['x'] + 30, bb['y'] + 30, steps=4)
        assert a.locator('#dragDock').count() == 1, 'sale la barra de destinos'
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
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
