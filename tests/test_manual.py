"""Prueba del manual de uso (con sus capturas), de la corrección de nombres con Ñ, de los botones Cámara/Galería
y de la vista de tablet/PC (barra lateral y pestañas en columna).
Uso: python3 tests/test_manual.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type in ('warning', 'error') and 'ERR_TUNNEL' not in m.text and problems.append(f'{m.type}: {m.text}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *')

    # Nombres con Ñ, también al venir de datos antiguos guardados con L
    assert 'IBAÑEZ' in a.evaluate("operators().map(o => o.name)") and 'NUÑEZ' in a.evaluate("operators().map(o => o.name)")
    a.evaluate("const d = JSON.parse(localStorage.getItem(KEY.db)); d.operators['OP-03'].name = 'IBALEZ'; d.operators['OP-10'].name = 'NULEZ'; localStorage.setItem(KEY.db, JSON.stringify(d)); setPref({ session: 'OP-03' })")
    a.reload(); a.wait_for_selector('#view > *')
    names = a.evaluate("operators().map(o => o.name)"); assert 'IBAÑEZ' in names and 'NUÑEZ' in names and 'IBALEZ' not in names, names
    assert a.evaluate("prefs.activeOperator") == 'IBAÑEZ'

    # Cámara y galería en los campos de foto (p. ej. al añadir un bien cultural)
    a.evaluate("openForm('x', [{ k: 'photo', label: 'Foto', type: 'photo' }], () => {})")
    assert a.locator('#modalForm input[type=file][capture=environment]').count() == 1 and a.locator('#modalForm input[type=file]:not([capture])').count() == 1
    a.keyboard.press('Escape')

    # Áreas: color de cabecera, menú sin repeticiones y franja de activación
    sesion.menu(a, 'En revisión')
    assert a.evaluate("document.documentElement.dataset.area") == 'log' and a.locator('.crumb').count() == 0
    assert not a.locator('#nav').is_visible() and a.locator('#drawer').is_hidden()
    # Menú por niveles: al abrirlo se ve desplegado solo el camino de la sección actual (Logística › Material)
    a.click('#menuBtn'); assert a.locator('#drawer').is_visible()
    assert a.locator('#drawer .dr-group-head').all_inner_texts()[:4] == ['Actividades', 'Logística', 'Material', 'Equipo'], a.locator('#drawer .dr-group-head').all_inner_texts()
    assert a.locator('#drawer .dr-group-head[aria-expanded=true]').count() == 2 and a.locator('#drawer .dr-item.on:has-text("En revisión")').count() == 1
    assert a.locator('#drawer .dr-item:has-text("Activación")').count() == 0, 'Actividades está plegada'
    a.click('#drawer .dr-group-head:has-text("Actividades")')
    assert a.locator('#drawer .dr-item').all_inner_texts()[1:5] == ['Activación', 'Ejercicios', 'Maniobras', 'Convoy'] and a.locator('#drawer .dr-item:has-text("Contenedor")').count() == 0, 'un grupo abierto a la vez'
    a.click('#drawer .dr-group-head:has-text("Ajustes")')
    assert [t.split('\n')[0] for t in a.locator('#drawer .dr-item').all_inner_texts()[1:]] == ['General', 'Listas y opciones', 'Manual de uso', 'Guía de campo']
    a.keyboard.press('Escape'); assert a.locator('#drawer').is_hidden()
    a.evaluate("go('logistica')"); assert a.evaluate("prefs.tab") == 'contenedor', 'las antiguas portadas llevan a su primera sección'
    sesion.menu(a, 'Personal'); assert a.evaluate("document.documentElement.dataset.area") == 'team'
    # Gesto atrás del móvil: vuelve a la pantalla anterior de la app (y antes cierra la ventana o el menú abiertos)
    a.evaluate("gearDetail('G-B19-5')"); a.go_back(); a.wait_for_timeout(200)
    assert a.locator('#modal').is_hidden() and a.evaluate("prefs.tab") == 'personal', 'atrás cierra la ventana'
    a.go_back(); a.wait_for_timeout(200); assert a.evaluate("prefs.tab") == 'contenedor', a.evaluate("prefs.tab")
    a.go_back(); a.wait_for_timeout(200); assert a.evaluate("prefs.tab") == 'revision', a.evaluate("prefs.tab")
    a.click('#menuBtn'); a.go_back(); a.wait_for_timeout(200); assert a.locator('#drawer').is_hidden() and a.evaluate("prefs.tab") == 'revision'
    a.go_forward(); a.wait_for_timeout(200)
    assert a.locator('#actbar').count() == 0
    a.evaluate("put('missions', { id: 'M-T', title: 'Simulacro', type: 'ejercicio', status: 'active', startedAt: Date.now(), teams: [], vehicles: [], gear: [] })"); a.wait_for_timeout(150)
    assert a.locator('#actbar.ex').count() == 1 and 'EJERCICIO EN CURSO' in a.inner_text('#actbar')
    a.click('#actbar button'); a.wait_for_timeout(150); assert a.evaluate("prefs.mission") == 'M-T'
    assert a.locator('#actbar').count() == 0, 'dentro de la propia operación la franja no se repite'
    a.evaluate("go('avisos')"); a.wait_for_timeout(100); assert a.locator('#actbar').count() == 0 and a.locator('.panel.live').count() == 1
    a.evaluate("remove('missions', 'M-T')"); a.wait_for_timeout(100); assert a.locator('#actbar').count() == 0

    # Manual con capturas
    sesion.menu(a, 'Manual de uso', 300)
    n = a.locator('article.man').count(); print('Secciones del manual:', n); assert n >= 18
    imgs = a.evaluate("[...document.querySelectorAll('.man-fig img')].map(i => i.getAttribute('src'))")
    missing = [s for s in imgs if not (ROOT / s).exists()]; assert not missing, missing
    a.locator('.man-fig img').first.scroll_into_view_if_needed(); a.wait_for_timeout(400)
    assert a.evaluate("document.querySelector('.man-fig img').naturalWidth") > 0
    a.fill('#view input[type=search]', 'cadena de custodia'); a.wait_for_timeout(500)
    assert a.locator('article.man').count() >= 1 and a.locator('#man-bic').count() == 1
    a.screenshot(path=f'{OUT}/manual.png')

    # Tablet en horizontal / PC: barra lateral y pestañas en columna
    d = br.new_context(viewport={'width': 1280, 'height': 800}); b = d.new_page()
    b.on('pageerror', lambda e: problems.append(f'PC ERROR {e}')); b.on('dialog', lambda x: x.accept())
    b.goto(APP); b.wait_for_selector('#view > *')
    assert b.evaluate("getComputedStyle(document.getElementById('nav')).position") == 'fixed'
    for g in ['Actividades', 'Logística', 'Equipo', 'Ajustes']:
        assert b.locator(f'#nav .dr-group-head:has-text("{g}")').is_visible(), 'la barra lateral va por áreas desplegables'
    b.click('#nav .dr-group-head:has-text("Equipo")'); b.wait_for_timeout(150)
    assert b.locator('#nav .dr-item:has-text("Calendario")').is_visible(), 'al tocar un área se ven sus secciones'
    sesion.menu(b, 'Intervenciones'); b.click('button:has-text("Nueva intervención")'); b.click('#modal .item:has-text("En blanco")')
    b.fill('[name=title]', 'Prueba PC'); b.click('#modalForm button:has-text("Guardar")'); b.wait_for_timeout(300)
    assert b.evaluate("getComputedStyle(document.querySelector('.mlayout')).display") == 'grid'
    assert b.evaluate("document.documentElement.scrollWidth <= innerWidth"), 'no debe haber scroll horizontal'
    b.screenshot(path=f'{OUT}/pc.png')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
