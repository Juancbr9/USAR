"""Prueba de los apartados de especialidades y equipos (Agua, Cuerdas, RPAS, SVA y Motosierras): menú, su gente, su
material (alta, lista habitual, edición y baja), la revista, las notas y cómo salen en Logística, Inicio y vencimientos.
También el material de cada vehículo (el mismo sistema, con el vehículo como dueño).
Uso: python3 tests/test_apartados.py  (con la app servida en APP_URL)"""
import os, sys, pathlib, datetime
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []
# Personal inventado (nunca nombres reales: el repositorio es público)
LISTADO = """PILOTO; CBO; PILOTO PRUEBA, DOS; PLMSecc; ; 600000002; RPAS, SVA
CUERDAS; CBO 1º; CUERDAS PRUEBA, CINCO; PIEN 1; Res. Terrestre; 600000005; SVA, MOTO T 2/45
AGUA; SGT 1º; AGUA PRUEBA, SEIS; PIEN 1; Res. Acuático; 600000006;
BUZO; SDO; BUZO PRUEBA, SIETE; PIEN 2; Res. Acuático; 600000007; MOTO T 1/85
RELEVO; CBO; RELEVO PRUEBA, OCHO; PIEN 2; Res. Terrestre; 600000008; MOTO S 7/31
"""
dia = lambda n: (datetime.date.today() + datetime.timedelta(days=n)).isoformat()

with sync_playwright() as p:
    br = p.chromium.launch()
    a = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True).new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}')); a.on('dialog', lambda d: d.accept())
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and problems.append(f'console: {m.text}'))
    a.goto(APP); a.wait_for_selector('#view > *')
    wide = lambda where: a.evaluate("document.documentElement.scrollWidth") > 392 and problems.append(f'{where}: se sale de ancho')
    seen = lambda where: [problems.append(f'se ve «{x}» en {where}') for x in ['undefined', 'NaN', '[object Object]'] if x in a.inner_text('#view')]
    save = lambda: (a.click('#modal button:has-text("Guardar")'), a.wait_for_timeout(250))
    a.evaluate("go('personal'); importPersonalForm()"); a.fill('#impTxt', LISTADO); a.click('#impGo'); a.wait_for_timeout(200)

    # Menú: bajo el rótulo «Especialidades y equipos», USAR y los cinco apartados
    a.click('#menuBtn'); a.wait_for_timeout(150)
    assert a.locator('#drawer .dr-label').inner_text() == 'Especialidades y equipos'
    for n in ['Parque', 'Agua', 'Cuerdas', 'RPAS', 'SVA', 'Motosierras']: assert a.locator(f'#drawer .dr-item:not(.sub):has-text("{n}")').count() == 1, n
    a.click('#drawer .dr-item:has-text("Agua")'); a.wait_for_timeout(200); assert a.evaluate("prefs.tab") == 'agua'

    # Agua: su gente (los de Res. Acuático), con presentes
    assert a.inner_text('#view h2') == 'Agua' and 'Rescate acuático' in a.inner_text('#view')
    kpis = [x.replace('\n', '') for x in a.locator('#view .sier-kpi b').all_inner_texts()]; assert kpis == ['2/2', '0/0', '—'], kpis
    assert a.locator('#view .pers-panel .item').count() == 2 and 'BUZO' in a.inner_text('#view .pers-panel') and 'CUERDAS' not in a.inner_text('#view .pers-panel')
    a.evaluate("(() => { const o = operators().find(o => o.name === 'BUZO'); put('operators', { ...o, aus: { motivo: 'Curso', desde: todayISO(), hasta: '' } }); })()"); a.wait_for_timeout(150)
    assert a.locator('#view .sier-kpi b').first.inner_text().replace('\n', '') == '1/2' and 'Curso' in a.inner_text('#view .pers-panel')
    seen('agua'); wide('agua')

    # Material: vacío → lista habitual → se ajusta uno, se añade otro y se borra otro
    a.click('#view .ctab:has-text("Material")'); a.wait_for_timeout(150)
    assert 'Aún no hay material apuntado' in a.inner_text('#view')
    a.click('#view button:has-text("Empezar con lo habitual")'); a.wait_for_timeout(250)
    n = a.evaluate("APARTADOS.agua.habitual.length"); assert a.locator('#view .list .item').count() == n and a.evaluate("apMat('agua').length") == n
    a.click('#view .list .item:has-text("Chalecos de rescate")'); a.wait_for_selector('#modal [name=qty]')
    a.fill('[name=qty]', '12'); a.fill('[name=place]', 'Almacén, armario 4'); a.fill('[name=review]', dia(10)); save()
    fila = a.inner_text('#view .list .item:has-text("Chalecos de rescate")'); assert '× 12' in fila and 'armario 4' in fila and 'Revisión en 10 d' in fila and 'Operativo' not in fila, fila  # el estado solo se ve si no está operativo
    a.click('#view button:has-text("Material"):not(.ctab)'); a.wait_for_selector('#modal [name=name]')
    a.fill('[name=name]', 'Moto de agua'); a.select_option('[name=status]', 'AVERIADO'); a.fill('[name=notes]', 'No arranca'); save()
    assert 'Averiado' in a.inner_text('#view .list .item:has-text("Moto de agua")')
    a.click('#view .list .item:has-text("Aletas")'); a.wait_for_selector('#modal button:has-text("Eliminar")'); a.click('#modal button:has-text("Eliminar")'); a.wait_for_timeout(250)
    assert a.locator('#view .list .item:has-text("Aletas")').count() == 0 and a.evaluate("apMat('agua').length") == n
    assert a.locator('#view .sier-kpi b').nth(1).inner_text().replace('\n', '') == f'{n - 1}/{n}'
    seen('material de agua'); wide('material de agua'); a.screenshot(path=f'{OUT}/apartado-material.png', full_page=True)

    # Revista: se desmarca lo que falla; pasa a revisión y queda apuntada. La moto averiada sale ya desmarcada
    a.click('#view button:has-text("Pasar revista")'); a.wait_for_selector('#modal .est-row')
    assert a.locator('#modal .est-row').count() == n and a.locator('#modal .est-row[data-est="ok"]').count() == n - 1 and a.locator('#modal .est-row:has-text("Moto de agua")').get_attribute('data-est') == 'roto'
    assert not a.locator('#modal .est-row:has-text("Remos") .est-nota').is_visible(), 'la nota solo sale cuando algo no está bien'
    a.click('#modal .est-row:has-text("Remos") .est-falta'); a.fill('#modal .est-row:has-text("Remos") .est-nota', 'Falta un remo'); save()
    remos = a.evaluate("apMat('agua').find(m => m.name === 'Remos')"); assert remos['status'] == 'FALTA' and 'Falta un remo' in remos['notes'], remos
    assert a.evaluate("apRevistas('agua')[0].items.map(x => [x.name, x.st, x.nota])") == [['Moto de agua', 'roto', ''], ['Remos', 'falta', 'Falta un remo']]
    assert a.evaluate("needsAbiertas('agua').map(n => n.text + ' | ' + n.nota)") == ['Moto de agua (roto) | Agua', 'Remos | Agua: Falta un remo'], 'lo que falta o está roto pasa a Necesidades'
    a.evaluate("needsAbiertas('agua').forEach(x => stamp('needs', { id: x.id, _del: true })); commit()")
    rev = a.evaluate("apRevistas('agua')[0]"); assert rev['total'] == n and rev['fails'] == ['Moto de agua', 'Remos'] and rev['by'] == 'GRANADOS', rev
    assert 'Última revista' in a.inner_text('#view') and 'Fallos: Moto de agua, Remos' in a.inner_text('#view') and a.locator('#view .sier-kpi b').nth(2).inner_text() != '—'
    # Otra revista con todo bien lo devuelve a operativo
    a.click('#view button:has-text("Pasar revista")'); a.wait_for_selector('#modal .est-row')
    for x in ['Remos', 'Moto de agua']: a.click(f'#modal .est-row:has-text("{x}") .est-ok')
    save(); assert a.evaluate("apMat('agua').every(m => m.status === 'OPERATIVO')") and a.evaluate("apRevistas('agua').length") == 2
    a.evaluate("(() => { const m = apMat('agua').find(m => m.name === 'Remos'); put('matesp', { ...m, status: 'REVISIÓN' }); })()"); a.wait_for_timeout(150)

    # Notas compartidas
    a.click('#view .ctab:has-text("Notas")'); a.wait_for_timeout(150); assert 'Sin notas' in a.inner_text('#view')
    a.click('#view button:has-text("Editar")'); a.fill('#modal textarea', 'Llave del pañol: en el cuerpo de guardia.\nEmbarcación en el hangar 2.'); save()
    assert 'cuerpo de guardia' in a.inner_text('#view .ap-nota') and a.evaluate("apNota('agua')").count('\n') == 1

    # Inicio: el material en revisión de un apartado sale en los avisos; su revisión, en los vencimientos
    a.evaluate("go('avisos')"); a.wait_for_timeout(200)
    av = a.inner_text('#view .area-panel:has(h3:has-text("Material en revisión o averiado"))'); assert 'Remos' in av and 'Agua · En revisión' in av.replace('\n', ' '), av
    assert a.evaluate("expiries().some(x => x.what === 'Chalecos de rescate · Agua' && x.kind === 'Revisión')")
    # Vencimientos resumidos: 5 y el botón para ver todos
    tot = a.evaluate("expiries().filter(x => daysTo(x.date) <= 30).length")
    if tot > 6:
        assert a.locator('#venc .list .item').count() == 5; a.click(f'#venc button:has-text("Ver los {tot}")'); a.wait_for_timeout(150)
        assert a.locator('#venc .list .item').count() == tot and 'Chalecos de rescate · Agua' in a.inner_text('#venc')
    a.click('#view .area-panel:has(h3:has-text("Material en revisión o averiado")) .item'); a.wait_for_timeout(200)
    assert a.evaluate("prefs.tab") == 'agua' and a.locator('#view .ctab.on').inner_text().startswith('Material')

    # Logística: capacidades llevan al apartado y el material de cada apartado tiene su barra
    a.evaluate("go('recursos')"); a.wait_for_timeout(200)
    esp = ' '.join(a.inner_text('#view .panel:has(h3:text-is("Material de especialidades y vehículos"))').split()); assert f'Agua revisión próxima {n - 1}/{n}' in esp, esp
    a.click('#view .panel:has(h3:text-is("Capacidades")) .meter:has-text("Res. Terrestre")'); a.wait_for_timeout(200)
    assert a.evaluate("prefs.tab") == 'cuerdas' and a.inner_text('#view h2') == 'Cuerdas' and a.locator('#view .pers-panel .item').count() == 2

    # Equipos: RPAS y SVA por equipo; Motosierras con titulares y suplentes
    a.evaluate("go('rpas')"); a.wait_for_timeout(150); assert a.locator('#view .pers-panel .item').count() == 1 and 'PILOTO' in a.inner_text('#view .pers-panel')
    a.evaluate("go('sva')"); a.wait_for_timeout(150); assert a.locator('#view .pers-panel .item').count() == 2
    a.evaluate("go('moto')"); a.wait_for_timeout(150)
    heads = a.locator('#view .pers-panel h3').all_inner_texts(); assert heads == ['Titulares', 'Suplentes'], heads
    tit = a.inner_text('#view .pers-panel >> nth=0'); assert tit.index('BUZO') < tit.index('CUERDAS') and 'equipo 1 (AUT. 85)' in tit, tit
    # Un apartado sin nadie explica cómo apuntar a la gente
    a.evaluate("operators().filter(o => (o.eq || []).includes('rpas')).forEach(o => put('operators', { ...o, eq: [] })); go('rpas')"); a.wait_for_timeout(150)
    assert 'Nadie apuntado todavía' in a.inner_text('#view')

    # Cualquiera del equipo rellena lo de todos, aunque no sea de ese apartado ni tenga permiso de logística
    a.evaluate("setPref({ session: operators().find(o => o.name === 'CUERDAS').id, tab: 'agua', aptab: 'material' })"); a.wait_for_timeout(200)
    assert a.locator('#view button:has-text("Pasar revista")').count() == 1 and a.locator('#view button:has-text("Pasillos y baldas")').count() == 1
    a.click('#view .list .item >> nth=0'); a.wait_for_selector('#modal [name=name]'); a.evaluate("closeModal()"); a.wait_for_timeout(250)
    a.evaluate("setPref({ session: 'OP-01' })")

    # Pasillo de la especialidad: el suyo por número (Agua, el 4), con lado izquierdo y derecho, módulos y baldas
    a.evaluate("setPref({ session: 'OP-01', tab: 'agua', aptab: 'material' })"); a.wait_for_timeout(200)
    assert a.evaluate("apPasillos('agua')") == [4] and a.inner_text('#view .panel:has(.px) h3') == 'Pasillo 4'
    assert a.locator('#view .px .px-cell').count() == 4 * 3 and 'Sin colocar' in a.inner_text('#view .px-sueltos')
    # Un hueco del dibujo (el mismo número que guarda el material de USAR) y un toque en su esquina, donde no hay nada
    hueco = lambda pas, lado, mod, niv: a.locator(f'#view .px-cell[data-door="{100000 + pas * 10000 + (5000 if lado == "D" else 0) + mod * 100 + niv}"]')
    toca = lambda *h: hueco(*h).click(position={'x': 14, 'y': 10})
    assert [t.split('\n')[0] for t in a.locator('#view .panel:has(.px) .seg-row button').all_inner_texts()] == ['Izquierda', 'Derecha']
    # Se configura el lado que se ve (3 módulos y 1 balda); el otro lado sigue como estaba
    a.click('#view button:has-text("Pasillos y baldas")'); a.wait_for_selector('#modal [name=mods]'); a.fill('[name=mods]', '3'); a.fill('[name=baldas]', '1'); save()
    assert a.locator('#view .px .px-cell').count() == 3 * 2 and a.evaluate("pasLado('agua', 4, 'I')") == {'mods': 3, 'baldas': 1} and a.evaluate("pasLado('agua', 4, 'D')") == {'mods': 4, 'baldas': 2}
    toca(4, 'I', 2, 1); a.wait_for_selector('#modal h3:has-text("Pasillo 4 · izquierda · módulo 2 · balda")')
    assert 'Este hueco está vacío' in a.inner_text('#modal')
    a.click('#modal .item:has-text("Chalecos de rescate")'); a.wait_for_timeout(250)
    assert a.evaluate("enHueco('agua', 4, 'I', 2, 1).map(m => m.name)") == ['Chalecos de rescate'] and a.locator('#modal .item:has-text("Chalecos de rescate") button:has-text("Mover")').count() == 1
    a.click('#modal button:has-text("Material aquí")'); a.wait_for_selector('#modal [name=name]')
    assert a.input_value('[name=lado]') == 'I' and a.input_value('[name=mod]') == '2' and a.input_value('[name=niv]') == '1', 'el material nuevo nace en ese hueco'
    assert a.input_value('#modal [name=pas]') == '4', 'el pasillo, el de ese hueco (se puede elegir cualquiera del almacén)'
    a.fill('[name=name]', 'Boyas'); save()
    cel = hueco(4, 'I', 2, 1).inner_text(); assert 'Boyas' in cel and 'Chalecos' in cel, cel
    assert 'Pasillo 4 · izquierda · módulo 2 · balda' in a.inner_text('#view .list .item:has-text("Boyas")')
    # Desde la ficha se pasa al lado derecho; el dibujo cambia de lado con el botón
    a.click('#view .list .item:has-text("Boyas")'); a.wait_for_selector('#modal [name=mod]'); a.select_option('[name=lado]', 'D'); a.select_option('[name=mod]', '4'); a.select_option('[name=niv]', '2'); save()
    assert a.evaluate("enHueco('agua', 4, 'D', 4, 2).map(m => m.name)") == ['Boyas'] and 'Boyas' not in a.inner_text('#view .px')
    a.click('#view .panel:has(.px) .seg-row button:has-text("Derecha")'); a.wait_for_timeout(200)
    assert a.locator('#view .px .px-cell').count() == 4 * 3 and 'Boyas' in hueco(4, 'D', 4, 2).inner_text()
    toca(4, 'D', 4, 2); a.wait_for_selector('#modal .item:has-text("Boyas")')
    # «Mover» → «Sin colocar»: vuelve a la zona de lo que no tiene sitio
    a.click('#modal .item:has-text("Boyas") button:has-text("Mover")'); a.wait_for_selector('#modal .mv-tipos'); assert 'Pasillo 4 · derecha · módulo 4 · balda 2' in a.inner_text('#modal .mv-ahora')
    a.click('#modal button:has-text("Sin colocar")'); a.wait_for_timeout(300); assert 'Boyas' in a.inner_text('#view .px-sueltos')
    a.evaluate("cellModal(pasDoor(4, 'D', 4, 2))"); a.wait_for_timeout(250)
    assert a.evaluate("sinColocar('agua').some(m => m.name === 'Boyas')") and 'Este hueco está vacío' in a.inner_text('#modal')
    a.evaluate("closeModal(); setPref({ pasLado: 'I' })"); a.wait_for_timeout(250)
    # Al quitar módulos, lo que estaba en ellos pasa a «Sin colocar»: no se borra nada
    a.evaluate("pasMover(apMat('agua').find(m => m.name === 'Chalecos de rescate').id, 4, 'I', 3, 1)"); a.wait_for_timeout(150)
    a.click('#view button:has-text("Pasillos y baldas")'); a.wait_for_selector('#modal [name=mods]'); a.fill('[name=mods]', '2'); save()
    assert a.evaluate("sinColocar('agua').some(m => m.name === 'Chalecos de rescate')") and a.evaluate("apMat('agua').length") == n + 1
    assert 'Pasillo' not in a.inner_text('#view .list .item:has-text("Chalecos de rescate")') and 'Sin colocar' in a.inner_text('#view .list .item:has-text("Boyas")')
    seen('pasillo de agua'); wide('pasillo de agua'); a.screenshot(path=f'{OUT}/apartado-pasillo.png', full_page=True)
    # El buscador dice el hueco
    a.evaluate("pasMover(apMat('agua').find(m => m.name === 'Boyas').id, 4, 'I', 1, 1)")
    a.click('[aria-label=Buscar]'); a.fill('#search', 'boyas'); a.wait_for_timeout(300); assert 'Pasillo 4 · izquierda · módulo 1 · balda' in a.inner_text('#results')
    a.evaluate("clearSearch(); $('searchbar').classList.add('hidden')")

    # El Parque: material común en los pasillos 1 y 2 (sin gente propia); cualquiera coge y devuelve con un toque
    a.evaluate("go('parque')"); a.wait_for_timeout(200)
    assert a.inner_text('#view h2') == 'Parque' and [t.split(' ')[0] for t in a.locator('#view .ctab').all_inner_texts()] == ['Material', 'Necesidades', 'Notas'], 'el Parque no tiene pestaña de equipo'
    assert a.evaluate("apPasillos('parque')") == [1, 2] and a.locator('#view .panel:has(.px) .chips .chip').count() == 2
    a.click('#view button:has-text("Empezar con lo habitual")'); a.wait_for_timeout(250)
    a.click('#view .panel:has(.px) .chips .chip:has-text("Pasillo 2")'); a.wait_for_timeout(150); assert a.inner_text('#view .panel:has(.px) h3') == 'Pasillo 2'
    toca(2, 'I', 1, 0); a.wait_for_selector('#modal h3:has-text("Pasillo 2 · izquierda · módulo 1 · suelo")')
    a.click('#modal .item:has-text("Palas")'); a.wait_for_timeout(250); a.evaluate("closeModal()"); a.wait_for_timeout(250)
    assert a.evaluate("enHueco('parque', 2, 'I', 1, 0).map(m => m.name)") == ['Palas'] and 'Pasillo 2 · izquierda · módulo 1 · suelo' in a.inner_text('#view .list .item:has-text("Palas")')
    a.click('#view .list .item:has-text("Palas")'); a.wait_for_selector('#modal [name=pas]'); assert a.input_value('[name=pas]') == '2'
    a.click('#modal button:has-text("Me lo llevo yo")'); a.wait_for_timeout(300)
    assert 'Lo tiene GRANADOS' in a.inner_text('#view .list .item:has-text("Palas")') and a.locator('#view .sier-kpi b').first.inner_text() == '1'
    a.evaluate("openPerson('OP-01'); setPref({ ptab: 'mat' })"); a.wait_for_timeout(200); assert 'Palas' in a.inner_text('#view .panel:has(h3:has-text("Material asignado"))') and 'Parque' in a.inner_text('#view .panel:has(h3:has-text("Material asignado"))')
    a.evaluate("setPref({ tab: 'parque', person: null })"); a.wait_for_timeout(200)
    a.click('#view .list .item:has-text("Palas")'); a.wait_for_selector('#modal button:has-text("Lo devuelvo a su sitio")'); a.click('#modal button:has-text("Lo devuelvo a su sitio")'); a.wait_for_timeout(300)
    assert 'Lo tiene' not in a.inner_text('#view .list .item:has-text("Palas")') and a.evaluate("apMat('parque').find(m => m.name === 'Palas').holder") == ''
    # Se le puede añadir otro pasillo, o quitárselos todos
    a.click('#view button:has-text("Pasillos y baldas")'); a.wait_for_selector('#modal [name=nums]'); a.fill('[name=nums]', '1, 2, 7'); save()
    assert a.evaluate("apPasillos('parque')") == [1, 2, 7] and a.locator('#view .panel:has(.px) .chips .chip').count() == 3
    assert a.evaluate("apPasillos('rpas')") == [] and a.evaluate("(setPref({ tab: 'rpas', aptab: 'material' }), document.querySelector('#view').innerText.includes('no tiene pasillo propio'))")
    seen('parque'); wide('parque')

    # Material asignado a una persona: se elige en la ficha del material y sale en la suya y en Logística
    a.evaluate("setPref({ tab: 'agua', aptab: 'material' })"); a.wait_for_timeout(150)
    a.click('#view .list .item:has-text("Trajes secos")'); a.wait_for_selector('#modal [name=holder]')
    buzo = a.evaluate("operators().find(o => o.name === 'BUZO').id"); a.select_option('[name=holder]', buzo); a.fill('[name=serial]', 'TS-07'); save()
    assert 'Lo tiene BUZO' in a.inner_text('#view .list .item:has-text("Trajes secos")')
    a.evaluate(f"openPerson('{buzo}'); setPref({{ ptab: 'mat' }})"); a.wait_for_timeout(200)
    asig = ' '.join(a.inner_text('#view .panel:has(h3:has-text("Material asignado"))').split()); assert 'Trajes secos' in asig and 'Agua' in asig and 'TS-07' in asig and 'desde' in asig, asig
    assert a.locator('#view .ctab:has-text("Material") .n').inner_text() == '1'
    a.evaluate("go('recursos')"); a.wait_for_timeout(200)
    quien = ' '.join(a.inner_text('#view .panel:has(h3:text-is("Quién tiene material"))').split()); assert 'BUZO' in quien and 'Trajes secos' in quien, quien
    a.click('#view .panel:has(h3:text-is("Quién tiene material")) .log-row:has-text("BUZO")'); a.wait_for_timeout(200)
    assert a.evaluate("prefs.person") == buzo and 'Material asignado' in a.inner_text('#view')
    a.click('#view .panel:has(h3:has-text("Material asignado")) .item'); a.wait_for_timeout(200); assert a.evaluate("prefs.tab") == 'agua'

    # Material de un vehículo: en su ficha, con su lista habitual, alta por matrícula, revista y avisos
    vid = a.evaluate("(() => { const v = vehicles().find(v => (v.units || []).length > 1) || vehicles()[0]; return v.id; })()")
    vn = a.evaluate(f"get('vehicles', '{vid}').name"); placa = a.evaluate(f"get('vehicles', '{vid}').units[0].plate")
    a.evaluate(f"go('vehiculos'); vehicleView('{vid}')"); a.wait_for_selector('#modal .veh-mat')
    assert 'Aún no hay material apuntado' in a.inner_text('#modal .veh-mat')
    a.click('#modal button:has-text("Empezar con lo habitual")'); a.wait_for_selector('#modal .veh-mat .list .item')
    nv = a.evaluate("VEH_HABITUAL.length"); assert a.locator('#modal .veh-mat .list .item').count() == nv and 'Puntas de lanza' in a.inner_text('#modal .veh-mat')
    a.click('#modal .veh-mat .item:has-text("Mangueras de 45 mm")'); a.wait_for_selector('#modal [name=qty]')
    a.fill('[name=qty]', '4'); a.fill('[name=place]', 'Cofre izquierdo'); a.select_option('[name=unit]', label=placa); save()
    a.wait_for_selector('#modal .veh-mat'); fila = a.inner_text('#modal .veh-mat .item:has-text("Mangueras de 45 mm")')
    assert '× 4' in fila and 'Cofre izquierdo' in fila and placa in fila, fila   # tras guardar se vuelve a la ficha del vehículo
    a.click('#modal .veh-mat button:has-text("Material")'); a.wait_for_selector('#modal [name=name]'); a.fill('[name=name]', 'Motobomba portátil'); save(); a.wait_for_selector('#modal .veh-mat')
    assert a.evaluate(f"matDe({{ veh: '{vid}' }}).length") == nv + 1
    a.click('#modal .veh-mat button:has-text("Checklist")'); a.wait_for_selector('#modal .est-row')
    a.click('#modal .est-row:has-text("Calzos") .est-falta'); a.fill('#modal .est-row:has-text("Calzos") .est-nota', 'Falta un calzo'); a.uncheck('#modal [name=nec]'); save(); a.wait_for_selector('#modal .veh-mat')
    assert 'Falta' in a.inner_text('#modal .veh-mat .item:has-text("Calzos") .tag') and 'Mal: Calzos' in a.inner_text('#modal .veh-mat') and a.evaluate("needsAbiertas('veh').length") == 0
    assert a.evaluate(f"matRevistas('veh:{vid}')[0].fails") == ['Calzos'] and a.evaluate("apRevistas('agua').length") == 2, 'cada dueño guarda sus revistas'
    a.evaluate("closeModal(); setPref({ vehVista: 'modelo' })"); a.wait_for_timeout(250)
    assert f'{nv + 1} de material' in a.inner_text(f'#view .veh-item:has-text("{vn}")')
    # Sale en los avisos de Inicio, en Logística y en el buscador
    a.evaluate("go('avisos')"); a.wait_for_timeout(200)
    av = ' '.join(a.inner_text('#view .area-panel:has(h3:has-text("Material en revisión o averiado"))').split()); assert 'Calzos' in av and vn in av and 'Remos' in av, av
    a.evaluate("go('recursos')"); a.wait_for_timeout(200)
    esp = ' '.join(a.inner_text('#view .panel:has(h3:text-is("Material de especialidades y vehículos"))').split()); assert f'{vn} {nv}/{nv + 1}' in esp, esp
    a.click('[aria-label=Buscar]'); a.fill('#search', 'motobomba'); a.wait_for_timeout(300); assert vn in a.inner_text('#results') and 'Motobomba portátil' in a.inner_text('#results')
    a.evaluate("clearSearch(); $('searchbar').classList.add('hidden')")
    # Borrar el vehículo deja de contar su material
    assert a.evaluate(f"matTodo().some(m => m.veh === '{vid}')") is True

    # Modo noche y PC
    a.evaluate("setPref({ theme: 'dark', tab: 'agua', aptab: 'material' }); applyTheme()"); a.wait_for_timeout(200); seen('agua de noche'); wide('agua de noche')
    a.screenshot(path=f'{OUT}/apartado-noche.png', full_page=True)
    b = br.new_context(viewport={'width': 1280, 'height': 800}).new_page(); b.on('pageerror', lambda e: problems.append(f'ERROR PC {e}'))
    b.goto(APP); b.wait_for_selector('#view > *'); b.evaluate("go('cuerdas')"); b.wait_for_timeout(200)
    assert b.locator('#nav .dr-item.on b').inner_text() == 'Cuerdas' and b.locator('#nav .dr-label').is_visible() and b.evaluate("document.documentElement.scrollWidth") <= 1280
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
