"""Prueba del Almacén común: todos los pasillos juntos (también el de USAR, que ya no está en su página), lo que hay en
cada hueco sea de quien sea, y mover cualquier material a cualquier sitio (otro pasillo, el contenedor, un armario o un
vehículo) con la ventana «Mover» o arrastrándolo, con «Deshacer».
Uso: python3 tests/test_almacen.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []
D = lambda pas, lado, mod, niv: 100000 + pas * 10000 + (5000 if lado == 'D' else 0) + mod * 100 + niv   # pasDoor

with sync_playwright() as p:
    br = p.chromium.launch()
    a = br.new_context(viewport={'width': 1100, 'height': 900}).new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}')); a.on('dialog', lambda d: d.accept())
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and problems.append(f'console: {m.text}'))
    a.goto(APP); a.wait_for_selector('#view > *')
    seen = lambda where: [problems.append(f'se ve «{x}» en {where}') for x in ['undefined', 'NaN', '[object Object]'] if x in a.inner_text('#view')]
    mat = lambda k, name: a.evaluate(f"apMat('{k}').find(m => m.name === '{name}').id")
    sitio = lambda k, name: a.evaluate(f"matSitio(apMat('{k}').find(m => m.name === '{name}'))")
    assert a.evaluate("[pasDoor(4, 'D', 2, 1), JSON.stringify(pasDe(145201))]") == [D(4, 'D', 2, 1), '{"pas":4,"lado":"D","mod":2,"niv":1}']

    # ---------- El Almacén: un botón por pasillo con su dueño; el de USAR es uno más ----------
    a.evaluate("apHabitual('agua'); apHabitual('parque'); go('almacen')"); a.wait_for_timeout(250)
    chips = [' '.join(t.split()) for t in a.locator('#view .pas-chips .chip').all_inner_texts()]
    assert chips == ['1 Parque', '2 Parque', '3 USAR', '4 Agua', '5 Cuerdas', '6 Motosierras'], chips
    assert a.inner_text('#view .alm-rack h3') == 'Pasillo 1 · izquierda' and a.locator('#view .px .px-cell').count() == 4 * 3
    a.click('#view .pas-chips .chip:has-text("USAR")'); a.wait_for_timeout(150)
    assert a.locator('#view .px .px-cell').count() == 5 * 2, 'el pasillo de USAR: 5 módulos, suelo y una balda'
    # La página de USAR ya no tiene pasillo: solo un enlace que trae aquí
    a.evaluate("go('contenedor')"); a.wait_for_timeout(150)
    assert a.locator('#alm-pasillo').count() == 0 and a.locator('#view .pas').count() == 0 and 'Pasillo 3, en el Almacén' in a.inner_text('#view .alm-alpas')
    a.click('#view .alm-alpas'); a.wait_for_timeout(150); assert a.evaluate("[prefs.tab, prefs.almPas]") == ['almacen', 3]

    # ---------- En un hueco cabe lo de cualquiera: material de USAR y de un apartado, juntos ----------
    g = a.evaluate("const g = list('gear').find(g => !g.vehicle && !g.out && !g.box && g.door >= 1 && g.door <= 20 && g.status === 'OPERATIVO'); g.id")
    a.evaluate(f"moveGear('{g}', {D(3, 'I', 2, 1)}); matPoner('{mat('agua', 'Aletas')}', {D(3, 'I', 2, 1)})"); a.wait_for_timeout(150)
    cel = a.locator(f'#view .px-cell[data-door="{D(3, "I", 2, 1)}"]'); assert cel.locator('.tok-gear[data-gear]').count() == 1 and cel.locator('.tok-mat').count() == 1
    assert sitio('agua', 'Aletas') == 'Pasillo 3 · izquierda · módulo 2 · balda' and a.evaluate(f"whereIs(get('gear', '{g}'))") == 'Pasillo 3 · izquierda · módulo 2 · balda'
    cel.click(position={'x': 14, 'y': 10}); a.wait_for_selector('#modal h3:has-text("Pasillo 3 · izquierda · módulo 2 · balda")')
    txt = ' '.join(a.inner_text('#modal').split()); assert 'Aletas' in txt and 'Agua' in txt and a.evaluate(f"get('gear', '{g}').name") in txt, txt
    # «Material aquí» en el pasillo de USAR añade material de USAR en ese hueco
    a.click('#modal button:has-text("Material aquí")'); a.wait_for_selector('#modal .add-mat'); a.click('#modal .add-mat [data-add=plus]')
    a.wait_for_selector('#modal [name=place]'); assert a.input_value('[name=place]') == str(D(3, 'I', 2, 1)); a.evaluate("closeModal()"); a.wait_for_timeout(250)
    # En un pasillo sin dueño se pregunta de quién es
    a.evaluate("go('almacen'); (() => { const v = get('meta', 'appas-moto'); put('meta', { id: 'appas-moto', value: { nums: [] } }); })(); setPref({ almPas: 6 })"); a.wait_for_timeout(150)
    assert 'Libre' in a.inner_text('#view .alm-rack .sec-head') and 'Motosierras' in a.inner_text('#view .panel:has(h3:text-is("Otros sitios"))')
    a.locator(f'#view .px-cell[data-door="{D(6, "I", 1, 0)}"]').click(position={'x': 14, 'y': 10}); a.wait_for_selector('#modal button:has-text("Material aquí")')
    a.click('#modal button:has-text("Material aquí")'); a.wait_for_selector('#modal h3:has-text("¿De quién es el material?")')
    a.click('#modal .item:has-text("Cuerdas")'); a.wait_for_selector('#modal [name=name]'); assert a.input_value('[name=pas]') == '6' and a.input_value('[name=mod]') == '1'
    a.fill('[name=name]', 'Cuerda de reserva'); a.click('#modal button:has-text("Guardar")'); a.wait_for_timeout(250)
    assert sitio('cuerdas', 'Cuerda de reserva') == 'Pasillo 6 · izquierda · módulo 1 · suelo', 'material de Cuerdas en un pasillo que no es el suyo'
    assert 'Cuerda de reserva' in a.inner_text(f'#view .px-cell[data-door="{D(6, "I", 1, 0)}"]')

    # ---------- Mover (la ventana): a un pasillo, al contenedor, a un vehículo, a un armario y de vuelta ----------
    rid = mat('agua', 'Remos'); a.evaluate(f"moverA('mat', '{rid}')"); a.wait_for_selector('#modal .mv-tipos')
    assert 'sin colocar' in a.inner_text('#modal .mv-ahora') and a.locator('#modal .mv-tipos button.on').inner_text().strip() == 'Pasillo'
    assert a.locator('#modal .pas-chips .chip.on').inner_text().split()[0] == '4', 'propone su pasillo'
    a.click('#modal .pas-chips .chip:has-text("Parque") >> nth=1'); a.click('#modal .seg-row button:has-text("Derecha")'); a.wait_for_timeout(100)
    a.click(f'#modal .mv-hueco[aria-label^="Pasillo 2 · derecha · módulo 3 · balda 1"]'); a.wait_for_timeout(250)
    assert sitio('agua', 'Remos') == 'Pasillo 2 · derecha · módulo 3 · balda 1' and 'Deshacer' in a.inner_text('#toast') and a.evaluate("[prefs.almPas, prefs.pasLado]") == [2, 'D']
    assert 'Remos' in a.inner_text(f'#view .px-cell[data-door="{D(2, "D", 3, 1)}"]'), 'el Almacén enseña el hueco de destino'
    # sigue siendo de Agua (mover no cambia de quién es) y su ficha lo dice
    a.evaluate("setPref({ tab: 'agua', aptab: 'material', pasLado: 'I' })"); a.wait_for_timeout(150); assert 'Pasillo 2 · derecha · módulo 3 · balda 1' in a.inner_text('#view .list .item:has-text("Remos")')
    # al contenedor de USAR
    a.click('#view .list .item:has-text("Remos")'); a.wait_for_selector('#modal button:has-text("Mover a otro sitio")'); a.click('#modal button:has-text("Mover a otro sitio")')
    a.wait_for_selector('#modal .mv-tipos'); assert a.locator('#modal .mv-hueco.on').count() == 1 and 'Aquí' in a.inner_text('#modal .mv-hueco.on')
    a.click('#modal .mv-tipos button:has-text("Contenedor")'); a.click('#modal .mv-op:has(b:text-is("B5"))'); a.wait_for_timeout(250)
    assert sitio('agua', 'Remos') == 'USAR · B5 · lateral izquierdo' and a.evaluate(f"JSON.stringify(matLugar(get('matesp', '{rid}')))") == '{"door":5,"veh":""}'
    a.evaluate("go('contenedor'); setPref({ cside: 'izq' }); cellModal(5)"); a.wait_for_timeout(250); assert 'Remos' in a.inner_text('#modal') and 'Agua' in a.inner_text('#modal'); a.evaluate("closeModal()"); a.wait_for_timeout(250)
    # editar la ficha sin tocar el hueco no lo saca del contenedor
    a.evaluate(f"matForm('ap:agua', '{rid}')"); a.wait_for_selector('#modal [name=mod]'); assert a.input_value('[name=mod]') == '0' and 'No está en un pasillo' in a.inner_text('#modal [name=mod]')
    a.fill('[name=notes]', 'Dos pares'); a.click('#modal button:has-text("Guardar")'); a.wait_for_timeout(250); assert sitio('agua', 'Remos') == 'USAR · B5 · lateral izquierdo'
    # a un vehículo: sale en su ficha, en «También va en este vehículo»; y de ahí, a un armario
    vid = a.evaluate("vehicles()[0].id"); vn = a.evaluate("vehicles()[0].name")
    a.evaluate(f"moverA('mat', '{rid}')"); a.wait_for_selector('#modal .mv-tipos'); a.click('#modal .mv-tipos button:has-text("Vehículo")'); a.click(f'#modal .mv-op:has(b:text-is("{vn}"))'); a.wait_for_timeout(250)
    assert sitio('agua', 'Remos') == 'En ' + vn and a.evaluate(f"get('matesp', '{rid}').enveh") == vid
    a.evaluate(f"moverA('gear', '{g}', {{ paso: 'veh' }})"); a.wait_for_selector('#modal .mv-op'); a.click(f'#modal .mv-op:has(b:text-is("{vn}"))'); a.wait_for_timeout(250)
    assert a.evaluate(f"[get('gear', '{g}').vehicle, get('gear', '{g}').door]") == [vid, 0]
    a.evaluate(f"go('vehiculos'); vehicleView('{vid}')"); a.wait_for_selector('#modal .veh-otros')
    otros = ' '.join(a.inner_text('#modal .veh-otros').split()); assert 'Remos' in otros and 'Agua' in otros and a.evaluate(f"get('gear', '{g}').name") in otros and 'USAR' in otros, otros
    a.click('#modal .veh-otros .item:has-text("Remos") button:has-text("Mover")'); a.wait_for_selector('#modal .mv-tipos'); assert a.locator('#modal .mv-tipos button.on').inner_text().strip() == 'Vehículo'
    a.click('#modal .mv-tipos button:has-text("Armarios")'); a.click('#modal .mv-op:has-text("Delante de los armarios")'); a.wait_for_timeout(250)
    assert a.evaluate(f"matLugar(get('matesp', '{rid}')).door") == 290 and sitio('agua', 'Remos') == 'USAR · Delante de los armarios'
    # «Deshacer» lo deja donde estaba (en el vehículo)
    a.click('#toast .toast-act'); a.wait_for_timeout(250); assert sitio('agua', 'Remos') == 'En ' + vn and 'como estaba' in a.inner_text('#toast')
    # El material de un vehículo está en su vehículo; se saca a un pasillo y se devuelve con «A su vehículo»
    a.evaluate(f"matHabitual('veh:{vid}')"); a.wait_for_timeout(200); cal = a.evaluate(f"matDe({{ veh: '{vid}' }}).find(m => m.name === 'Calzos').id")
    assert a.evaluate(f"JSON.stringify(matLugar(get('matesp', '{cal}')))") == '{"door":0,"veh":"%s"}' % vid
    a.evaluate(f"moverA('mat', '{cal}')"); a.wait_for_selector('#modal .mv-tipos'); assert vn in a.inner_text('#modal .mv-ahora') and a.locator('#modal button:has-text("A su vehículo")').count() == 0
    a.click('#modal .mv-tipos button:has-text("Pasillo")'); a.click('#modal .pas-chips .chip >> nth=0'); a.click('#modal .mv-hueco[aria-label^="Pasillo 1 · izquierda · módulo 1 · suelo"]'); a.wait_for_timeout(250)
    assert a.evaluate(f"huecoTxt(get('matesp', '{cal}'))") == 'Pasillo 1 · izquierda · módulo 1 · suelo'
    a.evaluate(f"vehicleView('{vid}')"); a.wait_for_selector('#modal .veh-mat'); assert 'Pasillo 1 · izquierda · módulo 1 · suelo' in a.inner_text('#modal .veh-mat .item:has-text("Calzos")')
    a.evaluate(f"moverA('mat', '{cal}')"); a.wait_for_selector('#modal button:has-text("A su vehículo")'); a.click('#modal button:has-text("A su vehículo")'); a.wait_for_timeout(250)
    assert a.evaluate(f"huecoTxt(get('matesp', '{cal}'))") == '' and a.evaluate(f"matLugar(get('matesp', '{cal}')).veh") == vid

    # ---------- Arrastrar: a otro hueco, a otro pasillo pasando por su botón, y «Sin colocar» ----------
    a.evaluate(f"closeModal(); pasMover('{mat('agua', 'Aletas')}', 4, 'I', 1, 0); setPref({{ tab: 'almacen', almPas: 4, pasLado: 'I' }})"); a.wait_for_timeout(300)
    def arrastra(src, dst, via=None):
        s = a.locator(src).first; s.scroll_into_view_if_needed(); bb = s.bounding_box()
        a.mouse.move(bb['x'] + 8, bb['y'] + 8); a.mouse.down(); a.mouse.move(bb['x'] + 30, bb['y'] + 24, steps=4); assert a.locator('#dragDock').count() == 1
        if via: v = a.locator(via).first.bounding_box(); a.mouse.move(v['x'] + v['width'] / 2, v['y'] + v['height'] / 2, steps=6); a.wait_for_timeout(700)
        t = a.locator(dst).first.bounding_box(); a.mouse.move(t['x'] + t['width'] / 2, t['y'] + t['height'] / 2, steps=10); a.mouse.up(); a.wait_for_timeout(300)
    aid = mat('agua', 'Aletas')
    arrastra(f'.px .tok-mat[data-mat="{aid}"]', f'.px-cell[data-door="{D(4, "I", 3, 2)}"]')
    assert sitio('agua', 'Aletas') == 'Pasillo 4 · izquierda · módulo 3 · balda 2' and 'Deshacer' in a.inner_text('#toast')
    arrastra(f'.px .tok-mat[data-mat="{aid}"]', f'.px-cell[data-door="{D(5, "I", 1, 1)}"]', via='.pas-chips .chip:has-text("Cuerdas")')
    assert a.evaluate("prefs.almPas") == 5 and sitio('agua', 'Aletas') == 'Pasillo 5 · izquierda · módulo 1 · balda 1', 'al pasar por encima del botón de otro pasillo, se cambia a él'
    arrastra(f'.px .tok-mat[data-mat="{aid}"]', f'.px-cell[data-door="{D(5, "D", 2, 0)}"]', via='.alm-top .seg-row button:has-text("Derecha")')
    assert a.evaluate("prefs.pasLado") == 'D' and sitio('agua', 'Aletas') == 'Pasillo 5 · derecha · módulo 2 · suelo', sitio('agua', 'Aletas')
    arrastra(f'.px .tok-mat[data-mat="{aid}"]', '#dragDock .dock-zone[data-door="0"]'); assert sitio('agua', 'Aletas') == ''
    a.click('#toast .toast-act'); a.wait_for_timeout(250); assert sitio('agua', 'Aletas') == 'Pasillo 5 · derecha · módulo 2 · suelo'
    # lo de USAR se arrastra igual entre pasillos
    a.evaluate(f"moveGear('{g}', {D(5, 'D', 1, 0)})"); a.wait_for_timeout(200)
    arrastra(f'.px .tok[data-gear="{g}"]', f'.px-cell[data-door="{D(5, "D", 4, 2)}"]'); assert a.evaluate(f"get('gear', '{g}').door") == D(5, 'D', 4, 2)
    seen('almacén'); a.screenshot(path=f'{OUT}/almacen.png', full_page=True)

    # ---------- Módulos y baldas desde el Almacén; lo que deja de caber queda sin colocar ----------
    a.click('#view button:has-text("Módulos y baldas")'); a.wait_for_selector('#modal [name=mods]'); assert a.locator('#modal [name=nums]').count() == 0
    a.fill('[name=mods]', '3'); a.fill('[name=baldas]', '1'); a.click('#modal button:has-text("Guardar")'); a.wait_for_timeout(250)
    assert a.evaluate("[pasGeo(5, 'D'), pasGeo(5, 'I')]") == [{'mods': 3, 'baldas': 1}, {'mods': 4, 'baldas': 2}] and a.locator('#view .px .px-cell').count() == 3 * 2
    assert a.evaluate(f"get('gear', '{g}').door") == D(5, 'D', 4, 2) and a.evaluate(f"pasVale({D(5, 'D', 4, 2)})") is False

    # ---------- La etiqueta QR de un hueco abre ese hueco (en el Almacén si el pasillo no es de ese apartado) ----------
    a.evaluate("location.hash = '#h=almacen.2.D.3.1'"); a.wait_for_selector('#modal h3:has-text("Pasillo 2 · derecha · módulo 3 · balda 1")')
    assert a.evaluate("[prefs.tab, prefs.almPas, prefs.pasLado]") == ['almacen', 2, 'D']; a.evaluate("closeModal()"); a.wait_for_timeout(250)

    # ---------- En el móvil y de noche: sin desbordes ----------
    m = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True).new_page(); m.on('pageerror', lambda e: problems.append(f'ERROR móvil {e}')); m.on('dialog', lambda d: d.accept())
    m.goto(APP); m.wait_for_selector('#view > *'); m.evaluate("apHabitual('agua'); pasMover(apMat('agua')[0].id, 4, 'I', 1, 0); setPref({ theme: 'dark', tab: 'almacen', almPas: 4 }); applyTheme()"); m.wait_for_timeout(250)
    assert m.evaluate("document.documentElement.scrollWidth") <= 392, 'el Almacén no se sale de ancho en el móvil'
    m.evaluate("moverA('mat', apMat('agua')[0].id)"); m.wait_for_selector('#modal .mv-px'); assert m.evaluate("document.querySelector('.sheet').scrollWidth <= document.querySelector('.sheet').clientWidth + 1")
    m.screenshot(path=f'{OUT}/almacen-mover.png')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
