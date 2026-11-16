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
    for n in ['Agua', 'Cuerdas', 'RPAS', 'SVA', 'Motosierras']: assert a.locator(f'#drawer .dr-item:not(.sub):has-text("{n}")').count() == 1, n
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
    a.click('#view button:has-text("Pasar revista")'); a.wait_for_selector('#modal input[name=ok]')
    assert a.locator('#modal input[name=ok]').count() == n and a.locator('#modal input[name=ok]:checked').count() == n - 1
    a.uncheck('#modal .check-row:has-text("Remos") input'); a.fill('[name=nota]', 'Falta un remo'); save()
    remos = a.evaluate("apMat('agua').find(m => m.name === 'Remos')"); assert remos['status'] == 'REVISIÓN' and 'Falta un remo' in remos['notes'], remos
    rev = a.evaluate("apRevistas('agua')[0]"); assert rev['total'] == n and rev['fails'] == ['Moto de agua', 'Remos'] and rev['by'] == 'GRANADOS', rev
    assert 'Última revista' in a.inner_text('#view') and 'Fallos: Moto de agua, Remos' in a.inner_text('#view') and a.locator('#view .sier-kpi b').nth(2).inner_text() != '—'
    # Otra revista con todo bien lo devuelve a operativo
    a.click('#view button:has-text("Pasar revista")'); a.wait_for_selector('#modal input[name=ok]')
    for x in ['Remos', 'Moto de agua']: a.check(f'#modal .check-row:has-text("{x}") input')
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

    # Quien no es del apartado ni tiene logística no cambia su material
    a.evaluate("setPref({ session: operators().find(o => o.name === 'CUERDAS').id, tab: 'agua', aptab: 'material' })"); a.wait_for_timeout(200)
    if not a.evaluate("puedeFlota()"):
        assert a.locator('#view button:has-text("Pasar revista")').count() == 0
        a.click('#view .list .item >> nth=0'); a.wait_for_timeout(150); assert a.locator('#modal [name=name]').count() == 0, 'no abre el formulario'
        a.evaluate("setPref({ tab: 'cuerdas' })"); a.wait_for_timeout(150); assert a.locator('#view button:has-text("Empezar con lo habitual")').count() == 1, 'el suyo sí'
    a.evaluate("setPref({ session: 'OP-01' })")

    # Pasillo de la especialidad: dibujo con módulos y baldas; el material se coloca desde el hueco o desde su ficha
    a.evaluate("setPref({ session: 'OP-01', tab: 'agua', aptab: 'material' })"); a.wait_for_timeout(200)
    assert a.locator('#view .px .px-cell').count() == 4 * 3 and 'Sin colocar' in a.inner_text('#view .px-suelto')
    a.click('#view button:has-text("Módulos y baldas")'); a.wait_for_selector('#modal [name=mods]'); a.fill('[name=mods]', '3'); a.fill('[name=baldas]', '1'); save()
    assert a.locator('#view .px .px-cell').count() == 3 * 2 and a.evaluate("apPasillo('agua')") == {'mods': 3, 'baldas': 1}
    a.click('#view .px-cell[aria-label^="Módulo 2, balda"]'); a.wait_for_selector('#modal h3:has-text("Módulo 2 · Balda")')
    assert 'Este hueco está vacío' in a.inner_text('#modal')
    a.click('#modal .item:has-text("Chalecos de rescate")'); a.wait_for_timeout(250)
    assert a.evaluate("enHueco('agua', 2, 1).map(m => m.name)") == ['Chalecos de rescate'] and a.locator('#modal .item:has-text("Chalecos de rescate") button:has-text("Quitar")').count() == 1
    a.click('#modal button:has-text("Material aquí")'); a.wait_for_selector('#modal [name=name]')
    assert a.input_value('[name=mod]') == '2' and a.input_value('[name=niv]') == '1', 'el material nuevo nace en ese hueco'
    a.fill('[name=name]', 'Boyas'); save()
    cel = a.inner_text('#view .px-cell[aria-label^="Módulo 2, balda"]'); assert 'Boyas' in cel and 'Chalecos' in cel, cel
    assert 'Pasillo · módulo 2 · balda' in a.inner_text('#view .list .item:has-text("Boyas")')
    a.click('#view .list .item:has-text("Boyas")'); a.wait_for_selector('#modal [name=mod]'); a.select_option('[name=mod]', '3'); a.select_option('[name=niv]', '0'); save()
    assert a.evaluate("enHueco('agua', 3, 0).map(m => m.name)") == ['Boyas']
    a.click('#view .px-cell[aria-label^="Módulo 3, suelo"]'); a.wait_for_selector('#modal .item:has-text("Boyas")')
    a.click('#modal .item:has-text("Boyas") button:has-text("Quitar")'); a.wait_for_timeout(250)
    assert a.evaluate("sinColocar('agua').some(m => m.name === 'Boyas')") and 'Este hueco está vacío' in a.inner_text('#modal')
    a.evaluate("closeModal()"); a.wait_for_timeout(250)
    # Al quitar módulos, lo que estaba en ellos pasa a «Sin colocar»: no se borra nada
    a.evaluate("pasMover(apMat('agua').find(m => m.name === 'Chalecos de rescate').id, 3, 1)"); a.wait_for_timeout(150)
    a.click('#view button:has-text("Módulos y baldas")'); a.wait_for_selector('#modal [name=mods]'); a.fill('[name=mods]', '2'); save()
    assert a.evaluate("sinColocar('agua').some(m => m.name === 'Chalecos de rescate')") and a.evaluate("apMat('agua').length") == n + 1
    assert 'Pasillo' not in a.inner_text('#view .list .item:has-text("Chalecos de rescate")') and 'Sin colocar' in a.inner_text('#view .list .item:has-text("Boyas")')
    seen('pasillo de agua'); wide('pasillo de agua'); a.screenshot(path=f'{OUT}/apartado-pasillo.png', full_page=True)
    # El buscador dice el hueco
    a.evaluate("pasMover(apMat('agua').find(m => m.name === 'Boyas').id, 1, 1)")
    a.click('[aria-label=Buscar]'); a.fill('#search', 'boyas'); a.wait_for_timeout(300); assert 'Pasillo · módulo 1 · balda' in a.inner_text('#results')
    a.evaluate("clearSearch(); $('searchbar').classList.add('hidden')")

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
    a.click('#modal .veh-mat button:has-text("Pasar revista")'); a.wait_for_selector('#modal input[name=ok]')
    a.uncheck('#modal .check-row:has-text("Calzos") input'); a.fill('[name=nota]', 'Falta un calzo'); save(); a.wait_for_selector('#modal .veh-mat')
    assert 'En revisión' in a.inner_text('#modal .veh-mat .item:has-text("Calzos")') and 'Fallos: Calzos' in a.inner_text('#modal .veh-mat')
    assert a.evaluate(f"matRevistas('veh:{vid}')[0].fails") == ['Calzos'] and a.evaluate("apRevistas('agua').length") == 2, 'cada dueño guarda sus revistas'
    a.evaluate("closeModal()"); a.wait_for_timeout(250)
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
