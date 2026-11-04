"""Prueba de «Apuntalar arcos»: crear un arco con las medidas A–G, ver el alzado, el fondo, la lista de cortes (marcar
piezas cortadas), las cerchas, el plan de corte y el montaje; madera y opciones; aviso de jambas desplomadas; unirlo a un
worksite y a su vigilancia estructural; enviar, imprimir, volver atrás y borrar. Todo en el móvil, sin salirse de ancho.
Uso: python3 tests/test_arcos.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'net::' not in m.text and problems.append(f'console: {m.text}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *')
    a.evaluate("window.print = () => { window._printed = document.getElementById('print').innerText; }; window.shareText = (t) => { window._shared = t; }")
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(250))
    wide = lambda where: a.evaluate("document.documentElement.scrollWidth") > 392 and problems.append(f'{where}: la página se sale de ancho')
    seen = lambda where: [problems.append(f'se ve «{x}» en {where}') for x in ['undefined', 'NaN', '[object Object]', 'Infinity'] if x in a.inner_text('#view')]

    # Menú → Apuntalamientos → «Apuntalamiento de arcos» → calculadora
    sesion.menu(a, 'Apuntalamientos'); a.click('.apu-card:has-text("Apuntalamiento de arcos")'); a.wait_for_timeout(150)
    a.click('#view button:has-text("Calcular un arco")'); a.wait_for_timeout(150)
    assert a.evaluate("prefs.tab") == 'arcos' and a.locator('#view h2:has-text("Apuntalar arcos")').count() == 1
    assert a.locator('.arc-guide svg').count() == 1, 'la lista explica qué medir'
    seen('lista vacía'); wide('lista vacía')

    # Nuevo arco con las medidas del ejemplo del manual
    a.click('#view button.btn-a:has-text("Arco")')
    a.fill('#modalForm [name=name]', 'Arco del pasillo')
    for k, v in {'Larr': '210', 'Lsuelo': '210', 'Hizq': '230', 'Hder': '230', 'Hclave': '335', 'hq': '321', 'fondo': '50'}.items():
        a.fill(f'#modalForm [name={k}]', v)
    a.fill('#modalForm [name=team]', 'Equipo 2')
    save()
    aid = a.evaluate("prefs.arc"); assert aid and a.evaluate(f"get('arcs', '{aid}').name") == 'Arco del pasillo'
    txt = a.inner_text('#view')
    assert 'Medio punto' in txt and 'La forma cuadra' in txt, txt[:400]
    kpis = a.locator('.arc-kpis .kpi b').all_inner_texts()
    assert kpis[:3] == ['2', '3', '4'], kpis   # 2 pórticos, 3 puntales (uno intermedio por 2,10 m de luz) y 4 cerchas
    assert a.locator('.arc-fig svg').count() == 1 and a.locator('.arc-fig svg text:has-text("CE1")').count() == 2
    seen('alzado'); wide('alzado'); a.screenshot(path=f'{OUT}/arcos-alzado.png', full_page=True)
    # El buscador también encuentra los arcos
    a.evaluate("toggleSearch(); $('search').value = 'pasillo'; renderSearch()")
    assert a.locator('#results .item:has-text("Arco del pasillo")').count() == 1
    a.evaluate("clearSearch()")

    # Pestañas
    for tab in ['Fondo', 'Cortes', 'Camones', 'Plan de corte', 'Montaje']:
        a.click(f'.arc-tabs .tab:has-text("{tab}")'); a.wait_for_timeout(150)
        assert a.evaluate("prefs.arcTab") == {'Fondo': 'fondo', 'Cortes': 'cortes', 'Camones': 'cerchas', 'Plan de corte': 'plan', 'Montaje': 'montaje'}[tab]
        seen(tab); wide(tab)
        a.screenshot(path=f'{OUT}/arcos-{tab.split()[0].lower()}.png', full_page=True)

    # Cortes: rótulos y marcar una pieza como cortada
    a.click('.arc-tabs .tab:has-text("Cortes")'); a.wait_for_timeout(150)
    assert a.locator('.arc-cut').count() >= 10
    p = a.locator('.arc-cut:has(.arc-code:text-is("P"))')
    assert '196 cm × 4' in p.inner_text() and 'PUNTAL 196 cm · Equipo 2' in p.inner_text(), p.inner_text()
    assert 'CAMÓN 81 cm · Equipo 2' in a.inner_text('#view')
    # Guía de corte de las piezas de escuadría: pendolón a dos aguas y jabalcones de cercha, con su dibujo
    assert a.locator('.arc-guia').count() >= 5 and a.locator('.arc-guia svg').count() >= 5
    a.evaluate("document.querySelectorAll('.arc-guia').forEach(d => d.open = true)"); a.wait_for_timeout(100)
    g = a.inner_text('#view'); assert 'dos cortes que se juntan' in g and 'fuera de escuadra' in g and 'Junta 1 de los camones'.lower() in g.lower(), g[:400]
    a.evaluate("document.querySelectorAll('.arc-guia').forEach(d => d.open = false)")
    pend = int(a.locator('.arc-kpis .kpi b').nth(3).inner_text().split('/')[0])
    p.locator('input').check(); a.wait_for_timeout(200)
    assert a.evaluate(f"get('arcs', '{aid}').done.P") is True
    assert int(a.locator('.arc-kpis .kpi b').nth(3).inner_text().split('/')[0]) == pend - 4
    assert a.locator('.arc-cut.done').count() == 1

    # Camones (las piezas de la cercha): borde recto, ⅓ del tablón y ordenadas cada 10 cm
    a.click('.arc-tabs .tab:has-text("Camones")'); a.wait_for_timeout(150)
    assert a.locator('.arc-cercha').count() == 1 and a.locator('.arc-ord tr').count() >= 9
    assert '22,5° fuera de escuadra' in a.inner_text('#view')

    # Madera y opciones: dejar paso → sin puntal intermedio ni X, con aviso del manual
    a.click('#view button:has-text("Madera y opciones")'); a.select_option('#modalForm [name=paso]', '1'); save()
    assert a.locator('.arc-kpis .kpi b').nth(1).inner_text() == '2'
    assert '1,50 m' in a.inner_text('.arc-warns')
    a.click('.arc-tabs .tab:has-text("Cortes")'); a.wait_for_timeout(150)
    assert a.locator('.arc-code:text-is("RX")').count() == 0 and a.locator('.arc-code:text-is("PI")').count() == 0

    # Jambas desplomadas: avisa y fabrica con la luz menor
    a.click('#view button:has-text("Medidas")'); a.fill('#modalForm [name=Lsuelo]', '204'); save()
    assert 'desplomadas' in a.inner_text('.arc-warns')
    assert '200 cm × 2' in a.locator('.arc-cut:has(.arc-code:text-is("S"))').inner_text()

    # Enviar e imprimir
    a.click('#view button:has-text("Enviar")'); sh = a.evaluate("window._shared")
    assert 'APUNTALAMIENTO DE ARCO' in sh and 'Arco del pasillo' in sh and 'CORTES' in sh, sh[:300]
    a.click('#view button:has-text("Hoja de corte")'); pr = a.evaluate("window._printed")
    assert 'Lista de cortes' in pr and 'Camón CE1' in pr, pr[:300]

    # Unirlo a un worksite y a su vigilancia estructural
    a.evaluate("""(() => { stamp('missions', { id: 'M-ARC', title: 'Sismo', type: 'ejercicio', status: 'active', startedAt: Date.now(), teams: [], vehicles: [], gear: [] });
      stamp('worksites', { id: 'W-ARC', mission: 'M-ARC', code: 'A-1', name: 'Iglesia', status: 'active', cat: 'B' }); commit(); })()""")
    a.click('#view button:has-text("Medidas")'); a.select_option('#modalForm [name=ws]', 'W-ARC'); save()
    a.click('#view .arc-ws button:has-text("Vigilar")'); a.wait_for_timeout(200)
    mon = a.evaluate("get('worksites', 'W-ARC').monitors")
    assert len(mon) == 1 and mon[0]['type'] == 'Apuntalamiento' and mon[0]['every'] == 12 and mon[0]['arc'] == aid, mon
    assert a.locator('#view .arc-ws button:has-text("Vigilar")').count() == 0
    a.click('#view .arc-ws button:has-text("Abrir")'); a.wait_for_timeout(250)
    assert a.evaluate("prefs.ws") == 'W-ARC'
    a.click('#view button:has-text("Arco apuntalado")'); a.wait_for_timeout(200)
    assert a.evaluate("prefs.tab") == 'arcos' and a.evaluate("prefs.arc") == aid, 'desde el worksite se abre el arco'

    # Atrás del móvil: vuelve al worksite; desde la guía también se llega
    a.go_back(); a.wait_for_timeout(250); assert a.evaluate("prefs.ws") == 'W-ARC', a.evaluate("prefs.tab")
    a.evaluate("go('guia')"); a.wait_for_timeout(150); a.click('#g-apuntalamiento summary'); a.click('#view button:has-text("Apuntalar un arco")'); a.wait_for_timeout(150)
    assert a.evaluate("prefs.tab") == 'arcos' and not a.evaluate("prefs.arc"), 'el menú y la guía abren la lista'
    assert a.locator('#view .list .item:has-text("Arco del pasillo")').count() == 1

    # Medidas incompletas: no se calcula y dice qué falta
    a.evaluate(f"put('arcs', {{ ...get('arcs', '{aid}'), Hclave: '' }})"); a.evaluate(f"openArc('{aid}')"); a.wait_for_timeout(150)
    assert 'Faltan medidas' in a.inner_text('#view') and 'altura de la clave' in a.inner_text('#view'); seen('sin medidas')
    # Ejemplo y borrar
    a.evaluate("setPref({ arc: null })"); a.evaluate("arcExample()"); a.wait_for_timeout(150)
    assert a.evaluate("get('arcs', prefs.arc).name") == 'Arco de ejemplo'
    a.click('#view button:has-text("Borrar")'); a.wait_for_timeout(150)
    assert not a.evaluate("prefs.arc") and a.locator('#view .list .item:has-text("Arco de ejemplo")').count() == 0

    # Arco grande y apuntado en modo noche: puntales intermedios, varias cerchas y nada se sale
    a.evaluate("setPref({ theme: 'dark' }); applyTheme()")
    a.evaluate("""put('arcs', { id: 'AR-GRANDE', name: 'Portada', Larr: 400, Lsuelo: 400, Hizq: 230, Hder: 230, Hclave: 470, fondo: 150, seccion: '15x15', tablonAncho: 20, tablonGrueso: 5,
      stockViga: 500, stockTablon: 400, correas: true, cumbreraDoble: true, created: Date.now(), done: {} })""")
    a.evaluate("openArc('AR-GRANDE')"); a.wait_for_timeout(200)
    for tab in ['Alzado', 'Fondo', 'Cortes', 'Camones', 'Plan de corte']:
        a.click(f'.arc-tabs .tab:has-text("{tab}")'); a.wait_for_timeout(120); seen('grande ' + tab); wide('grande ' + tab)
    assert 'Apuntado' in a.inner_text('#view') and a.locator('.arc-kpis .kpi b').nth(1).inner_text() == '5'
    a.click('.arc-tabs .tab:has-text("Alzado")'); a.screenshot(path=f'{OUT}/arcos-grande-noche.png', full_page=True)
    a.evaluate("setPref({ theme: '' }); applyTheme()")
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: [print(' -', x) for x in problems]; sys.exit(1)
