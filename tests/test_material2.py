"""Prueba de: entregas a personal de fuera (firma con el dedo, fotos, devolución), revista eligiendo qué se revista
(correcto, fallo, taller, otro sitio, baja, no se revista) y menú de Material.
Uso: python3 tests/test_material2.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
PNG = str(ROOT / 'icon-512.png')
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'net::' not in m.text and 'Failed to load' not in m.text and problems.append(m.text))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *'); a.evaluate("window.print = () => {}")
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(400))

    # ---------- Menú: el material está dentro de USAR, con sus subopciones ----------
    a.click('#menuBtn'); assert a.locator('#drawer .dr-item.sub').count() == 0, 'USAR empieza plegado'
    a.click('#drawer .dr-group-head:has-text("USAR")'); a.wait_for_timeout(100)
    assert [t.split('\n')[0].strip() for t in a.locator('#drawer .dr-item.sub').all_inner_texts()][:4] == ['Almacén', 'Fuera', 'Revisión', 'Revista']
    assert a.locator('#drawer .dr-item:has-text("Revista")').count() == 1
    # Contenedor y almacén: arriba lo que se arrastra (contenedor, pasillo, armarios, escalón) y el fungible al final, plegado
    a.click('#drawer .dr-item:has-text("Almacén")'); a.wait_for_timeout(150)
    secs = lambda: a.evaluate("[...document.querySelectorAll('#view .alm-sec')].map(s => s.dataset.sec)")
    assert [s for s in secs() if s != 'sinubicar'] == ['contenedor', 'pasillo', 'armarios', 'escalon', 'fungible'], secs()
    assert a.locator('#view .alm-jump').count() == 0, 'sin barra «Ir a»'
    assert a.locator('#alm-fungible.folded').count() == 1 and a.locator('#view .cons-item').count() == 0, 'el fungible, plegado'
    # Cada parte se pliega tocando su barra (y se ve cuánto tiene); «Plegar todo» / «Desplegar todo»
    a.click('#alm-contenedor .alm-tog'); a.wait_for_timeout(100)
    assert a.locator('#alm-contenedor.folded').count() == 1 and a.locator('.cvi').count() == 0 and 'cajas' in a.inner_text('#alm-contenedor .alm-tog small')
    a.click('.alm-tools .link:has-text("Plegar todo")'); a.wait_for_timeout(100)
    assert a.locator('#view .alm-sec:not(.folded)').count() == 0 and a.locator('.alm-tools .link:has-text("Desplegar todo")').count() == 1
    # Se ordenan arrastrando el asa: el escalón, encima del contenedor (se recuerda)
    g = a.locator('#alm-escalon .alm-grip').bounding_box(); t = a.locator('#alm-contenedor').bounding_box()
    a.mouse.move(g['x'] + 20, g['y'] + 20); a.mouse.down(); a.mouse.move(t['x'] + 100, t['y'] + 6, steps=10); a.mouse.up(); a.wait_for_timeout(200)
    assert secs()[:2] == ['escalon', 'contenedor']
    a.reload(); a.wait_for_selector('#view .alm-sec'); assert secs()[:2] == ['escalon', 'contenedor']
    # Con el dedo: se mantiene pulsada la barra (no hace falta el asa) y se lleva encima de otra; un toque corto solo pliega
    cdp = c.new_cdp_session(a)
    tch = lambda tp, x=0, y=0: cdp.send('Input.dispatchTouchEvent', {'type': tp, 'touchPoints': [] if tp == 'touchEnd' else [{'x': x, 'y': y}]})
    f = a.locator('#alm-fungible .alm-tog b').bounding_box(); t = a.locator('#alm-escalon').bounding_box(); x, y = f['x'] + 10, f['y'] + 8
    tch('touchStart', x, y); a.wait_for_timeout(500)
    for i in range(1, 13): tch('touchMove', x, y + (t['y'] + 6 - y) * i / 12); a.wait_for_timeout(30)
    tch('touchEnd'); a.wait_for_timeout(200)
    assert secs()[0] == 'fungible' and a.locator('#alm-fungible.folded').count() == 1, secs()
    a.click('.alm-tools .link:has-text("Desplegar todo")'); a.wait_for_timeout(100)
    # Armarios: la lista de las baldas se despliega tocando el nombre de cada armario
    assert a.locator('.arm-list').count() == 0
    a.click('.arm-top:has-text("Armario 2")'); a.wait_for_timeout(100)
    assert a.locator('.arm-list[data-arm="2"] .item').count() == 5 and a.locator('.arm-list').count() == 1
    a.click('.arm-top:has-text("Armario 2")'); a.wait_for_timeout(100); assert a.locator('.arm-list').count() == 0
    # Buscar algo de una parte plegada la despliega
    a.click('#alm-pasillo .alm-tog'); a.wait_for_timeout(100); assert a.locator('#alm-pasillo.folded').count() == 1
    gp = a.evaluate("const g = list('gear').find(g => !g.vehicle && !g.out && !g.box && g.door >= 1 && g.door <= 20); moveGear(g.id, 131); g.id")
    a.evaluate(f"findGo('gear', '{gp}')"); a.wait_for_timeout(100); assert a.locator('#alm-pasillo.folded').count() == 0
    a.evaluate("setPref({ almOrder: null, almFold: null })"); a.wait_for_timeout(100)
    assert a.locator('#view .arm-cab').count() == 3 and a.locator('#view .cvi').count() == 1
    # Sin botón «Caja» suelto: «+ Material» deja elegir equipo, caja o fungible
    assert a.locator('#view button:text-is("Caja")').count() == 0
    a.click('#view button.btn-a:has-text("Material")'); a.wait_for_timeout(100)
    assert [t.split('\n')[0] for t in a.locator('#modal .add-mat button').all_inner_texts()] == ['Equipo o herramienta', 'Caja', 'Material fungible']
    # Fungible nuevo en el pasillo: sale en la lista del fungible (con su sitio) y al ir a «Fungible» se despliega
    a.click('#modal .add-mat [data-add=package]'); a.fill('#modalForm [name=name]', 'Bridas grandes'); a.select_option('#modalForm [name=place]', '110')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    cid = a.evaluate("list('consumables').find(c => c.name === 'Bridas grandes').id")
    a.evaluate("go('consumibles')"); a.wait_for_timeout(300)
    assert a.locator(f'#alm-fungible [data-cons="{cid}"]').is_visible() and 'Pasillo M1 suelo' in a.inner_text(f'#alm-fungible [data-cons="{cid}"]')
    a.click(f'#alm-fungible [data-cons="{cid}"] button:has-text("+5")'); a.wait_for_timeout(100)
    assert a.locator(f'#alm-fungible [data-cons="{cid}"]').is_visible(), 'sigue desplegado al cambiar el stock'
    assert a.evaluate(f"get('consumables', '{cid}').stock") == 15
    # Los antiguos (solo con el texto «Ubicación») salen en su sitio: «Caja H-2» → el hueco de esa caja
    assert a.evaluate("consDoor({ location: 'Caja H-2' })") == a.evaluate("boxes().find(b => b.code === 'H-2')?.door || 0")
    assert a.evaluate("consDoor({ location: 'Escalón' })") == 302 and a.evaluate("consDoor({ location: 'B11' })") == 11
    # Los nombres antiguos (pasillo, armarios, otros, fungible, fuera) llevan a esta página
    for t in ['pasillo', 'armarios', 'escalon', 'otros', 'consumibles']:
        a.evaluate(f"go('avisos'); go('{t}')"); a.wait_for_timeout(100); assert a.evaluate("prefs.tab") == 'contenedor', t
    # Fuera: lo que lleva cada persona (se devuelve desde aquí) y lo prestado con firma, en una lista
    gf = a.evaluate("const g = list('gear').find(g => !g.out && !g.box && g.door >= 1 && g.door <= 20); giveTo(JSON.stringify({ gear: g.id }), 'OP-02'); g.id")
    a.evaluate("go('fuera')"); a.wait_for_timeout(150)
    assert a.locator('.fuera-grp:has-text("CABRERA")').count() == 1 and a.inner_text('.fuera-kpis span >> nth=0').startswith('1')
    a.click(f'.fuera-grp .item:has([onclick="gearDetail(\'{gf}\')"]) button:has-text("Devolver")'); a.wait_for_timeout(150)
    assert a.evaluate(f"get('gear', '{gf}').out") is None
    # Historial del equipo: se apunta quién lo llevó y cuándo volvió
    a.evaluate(f"itemHistory('gear', '{gf}')"); a.wait_for_timeout(100)
    assert a.locator('#modal .timeline li').count() >= 2 and 'CABRERA' in a.inner_text('#modal .timeline'); a.keyboard.press('Escape')
    a.evaluate("go('contenedor')"); a.wait_for_timeout(100)
    a.click('#menuBtn'); assert a.locator('#drawer .dr-item.on:has-text("Almacén")').count() == 1; a.click('#drawer [aria-label="Cerrar menú"]')

    # ---------- Entrega con firma ----------
    a.evaluate("go('entregas')"); a.wait_for_timeout(150); a.click('#view button:has-text("Entrega")')
    a.fill('[name=to]', 'Cabo 1º Pérez Gil'); a.fill('[name=unit]', 'BIEM II'); a.fill('[name=purpose]', 'Ejercicio en Lanzarote')
    a.fill('[name=due]', '2026-01-05')
    a.fill('#modalForm input[type=search]', 'tetra'); a.wait_for_timeout(100)
    assert a.locator('#modalForm .check-row:visible').count() == 1
    a.click('#modalForm .check-row:visible'); a.fill('#modalForm input[type=search]', ''); a.check('#modalForm input[name=gear][value=B-902]')
    a.fill('[name=notes]', 'Completo, con funda')
    a.locator('#modalForm [data-photo]').first.locator('input[type=file]').first.set_input_files(PNG); a.wait_for_timeout(500)
    box = a.locator('#modalForm .sig canvas').bounding_box()
    a.mouse.move(box['x'] + 20, box['y'] + 30); a.mouse.down()
    for i in range(12): a.mouse.move(box['x'] + 20 + i * 18, box['y'] + 30 + (i % 3) * 20, steps=2)
    a.mouse.up(); a.wait_for_timeout(100)
    assert a.locator('#modalForm .sig.signed').count() == 1
    save(); a.wait_for_timeout(500)
    l = a.evaluate("loans()[0]")
    assert l['to'] == 'Cabo 1º Pérez Gil' and set(l['gear']) == {'B-901', 'B-902'} and l['signed'] and len(l['photos']) == 1, l
    assert a.evaluate("get('gear', 'B-901').out.loan") == l['id'] and 'Pérez' in a.evaluate("get('gear', 'B-901').out.who")
    a.wait_for_selector('#modal img.sig-img[src^="data:image/png"]', timeout=5000)
    assert a.locator('#modal .tag:has-text("Fuera de plazo")').count() == 1
    a.screenshot(path=f'{OUT}/entrega.png', full_page=True)
    a.evaluate(f"printLoan('{l['id']}')"); a.wait_for_timeout(300); assert 'Recibí conforme' in a.inner_html('#print') and '<img' in a.inner_html('#print')
    assert 'Transmisiones' in a.evaluate(f"loanText(get('loans', '{l['id']}'))")
    # el material ya entregado no se puede volver a entregar
    assert 'B-901' not in [x[0] for x in a.evaluate("loanOptions()")]
    a.evaluate(f"loanDetail('{l['id']}')"); a.click('#modal button:has-text("Devolución")'); a.fill('[name=notes]', 'Vuelve bien'); save()
    assert a.evaluate("get('gear', 'B-901').out") is None and a.evaluate(f"get('loans', '{l['id']}').returned.notes") == 'Vuelve bien'

    # ---------- Revista eligiendo qué se revista ----------
    a.evaluate("closeModal(); go('revista')"); a.wait_for_timeout(150); a.click('button:has-text("Iniciar revista")')
    a.uncheck('#modalForm input[name=groups][value=der]'); a.uncheck('#modalForm input[name=groups][value=sin]'); save()
    ids = a.evaluate("prefs.draft.ids")
    assert ids and all(1 <= a.evaluate(f"get('gear', '{i}').door") <= 10 for i in ids[:20]), 'solo el lateral izquierdo'
    g1, g2, g3, g4 = ids[0], ids[1], ids[2], ids[3]
    a.evaluate(f"mark('{g1}', 'bad')"); a.fill(f'.check:has([onclick="mark(\'{g1}\', \'bad\')"]) input.input', 'No arranca')
    a.evaluate(f"markMore('{g2}')"); a.click('#modal .item:has-text("Está en el taller")')
    a.evaluate(f"markMore('{g3}')"); a.click('#modal .item:has-text("Está en otro sitio")'); a.select_option('[name=place]', '121'); save()
    a.evaluate(f"markMore('{g4}')"); a.click('#modal .item:has-text("De baja")')
    a.click('.check-row:has-text("Solo lo que falta")'); a.wait_for_timeout(150)
    assert a.locator(f'[onclick="mark(\'{g1}\', \'ok\')"]').count() == 0, '«Solo lo que falta» esconde lo marcado'
    a.screenshot(path=f'{OUT}/revista2.png', full_page=True)
    a.locator('.panel:not(.progress) button:has-text("Todo OK")').first.click(); a.wait_for_timeout(150)
    a.click('button:has-text("Finalizar revista")'); a.wait_for_timeout(400)
    st = a.evaluate(f"['{g1}', '{g2}', '{g3}', '{g4}'].map(id => {{ const g = get('gear', id); return [g.status, g.rev?.state || '', g.door]; }})")
    assert st[0][:2] == ['REVISIÓN', 'espera'] and st[1][:2] == ['REVISIÓN', 'taller'] and st[2][2] == 121 and st[3][:2] == ['AVERIADO', 'baja'], st
    r = a.evaluate("list('inspections').sort((a, b) => b.date - a.date)[0]")
    assert r['reason'] == 'Mensual' and len(r['fails']) == 1 and len(r['other']) == 3 and 'izquierdo' in r['scope'], r

    # ---------- Indicativo fijo y sin opciones de funciones avanzadas ni de unidades en Ajustes ----------
    a.evaluate("closeModal(); put('meta', { id: 'teamcode', value: 'ESP-9' }); go('ajustes')"); a.wait_for_timeout(200)
    txt = a.inner_text('#view').lower()
    assert 'funciones avanzadas' not in txt and 'indicativo' not in txt and 'coordenadas' not in txt, 'sin opciones de avanzadas, indicativo ni unidades'
    assert a.evaluate("teamCode()") == 'USAR-242', 'el indicativo es fijo'
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
