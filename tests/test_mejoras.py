"""Prueba de las mejoras de logística: cuadrante de vacaciones y permisos (varias ausencias por persona, mínimos por
especialidad), lista de necesidades, vida útil y caducidad del material, fotos e historial, «para dar de baja»,
inventario para imprimir y para Excel, etiquetas QR de material y de huecos (y sus enlaces), revistas con aviso y qué
especialidad hay en cada pasillo.
Uso: python3 tests/test_mejoras.py  (con la app servida en APP_URL)"""
import os, sys, pathlib, datetime
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []
# Personal inventado (nunca nombres reales: el repositorio es público)
LISTADO = """AGUA; SGT 1º; AGUA PRUEBA, SEIS; PIEN 1; Res. Acuático; 600000006;
BUZO; SDO; BUZO PRUEBA, SIETE; PIEN 2; Res. Acuático; 600000007;
RIO; CBO; RIO PRUEBA, NUEVE; PIEN 2; Res. Acuático; 600000009;
CUERDAS; CBO 1º; CUERDAS PRUEBA, CINCO; PIEN 1; Res. Terrestre; 600000005;
"""
dia = lambda n: (datetime.date.today() + datetime.timedelta(days=n)).isoformat()

with sync_playwright() as p:
    br = p.chromium.launch()
    a = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, accept_downloads=True).new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}')); a.on('dialog', lambda d: d.accept())
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and problems.append(f'console: {m.text}'))
    a.goto(APP); a.wait_for_selector('#view > *')
    wide = lambda where: a.evaluate("document.documentElement.scrollWidth") > 392 and problems.append(f'{where}: se sale de ancho')
    seen = lambda where: [problems.append(f'se ve «{x}» en {where}') for x in ['undefined', 'NaN', '[object Object]'] if x in a.inner_text('#view')]
    save = lambda: (a.click('#modal button:has-text("Guardar")'), a.wait_for_timeout(250))
    a.evaluate("window.print = () => { window._impreso = document.getElementById('print').innerHTML; }; window.open = () => null; navigator.share = undefined")
    a.evaluate("go('personal'); importPersonalForm()"); a.fill('#impTxt', LISTADO); a.click('#impGo'); a.wait_for_timeout(200)
    op = lambda n: a.evaluate(f"operators().find(o => o.name === '{n}').id")

    # ---------- Cuadrante de vacaciones y permisos ----------
    a.click('.pers-views .chip:has-text("Vacaciones")'); a.wait_for_selector('#view table.cq')
    hoy = datetime.date.today(); nd = a.locator('#view table.cq thead th').count() - 1
    assert nd in (28, 29, 30, 31) and a.locator('#view table.cq tbody tr').count() == 17 and a.locator('#view table.cq td.aus').count() == 0
    # Una ausencia con fechas: desde el botón «Ausencia» (se elige la persona)
    a.click('#view button:has-text("Ausencia")'); a.wait_for_selector('#modal [name=op]')
    a.select_option('[name=op]', op('BUZO')); assert a.input_value('[name=motivo]') == 'Vacaciones'
    a.fill('[name=desde]', dia(0)); a.fill('[name=hasta]', dia(2)); a.fill('[name=lugar]', 'La Palma'); save()
    plan = a.evaluate("operators().find(o => o.name === 'BUZO').plan"); assert len(plan) == 1 and plan[0]['motivo'] == 'Vacaciones' and plan[0]['hasta'] == dia(2), plan
    assert a.evaluate("esAusente(operators().find(o => o.name === 'BUZO'))") and a.evaluate("situacion(operators().find(o => o.name === 'BUZO'))") == 'Vacaciones'
    assert a.locator('#view table.cq td.aus.m-V').count() >= 1 and a.inner_text('#view table.cq td.aus >> nth=0') == 'V'
    assert 'Vacaciones' in a.inner_text('#view .cq-ley')
    # Otra ausencia de la misma persona, más adelante, desde su fila: cada persona puede tener varias
    a.click('#view table.cq .cq-nombre:has-text("BUZO")'); a.wait_for_selector('#modal .item:has-text("Vacaciones")')
    assert 'En curso' in a.inner_text('#modal .item') and '3 días' in a.inner_text('#modal')
    a.click('#modal button:has-text("Vacaciones o permiso")'); a.wait_for_selector('#modal [name=motivo]')
    a.select_option('[name=motivo]', 'Curso'); a.fill('[name=desde]', dia(20)); a.fill('[name=hasta]', dia(24)); save(); a.wait_for_selector('#modal .item:has-text("Curso")')
    assert a.locator('#modal .list .item').count() == 2 and 'Prevista' in a.inner_text('#modal .item:has-text("Curso")')
    assert a.evaluate(f"ausenteEl(operators().find(o => o.name === 'BUZO'), '{dia(22)}')") and not a.evaluate(f"ausenteEl(operators().find(o => o.name === 'BUZO'), '{dia(10)}')")
    a.evaluate("closeModal()"); a.wait_for_timeout(250)
    # Fechas al revés: no se guarda
    a.evaluate(f"planForm('{op('RIO')}')"); a.wait_for_selector('#modal [name=desde]'); a.fill('[name=desde]', dia(5)); a.fill('[name=hasta]', dia(3)); save()
    assert not a.evaluate("operators().find(o => o.name === 'RIO').plan"); a.evaluate("closeModal()"); a.wait_for_timeout(250)
    # Mínimos: Res. Acuático necesita 2; con BUZO fuera quedan 2 (bien); si falta otro, avisa y sale en rojo
    a.click('#view button:has-text("Mínimos")'); a.wait_for_selector('#modal [name=m_resacuatico]'); a.fill('[name=m_resacuatico]', '2'); save()
    assert a.evaluate("minimos()['Res. Acuático']") == 2 and a.locator('#view table.cq tfoot td.bajo').count() == 0 and 'mín. 2' in a.inner_text('#view table.cq tfoot')
    a.evaluate(f"planForm('{op('RIO')}')"); a.wait_for_selector('#modal [name=desde]'); a.select_option('[name=motivo]', 'Permiso'); a.fill('[name=desde]', dia(1)); a.fill('[name=hasta]', dia(1)); save()
    assert 'baja del mínimo' in a.inner_text('.toast') and a.evaluate("bajoMinimos(30).length") == 1 and a.evaluate("bajoMinimos(30)[0].n") == 1
    a.evaluate("closeModal()"); a.wait_for_timeout(250)
    if (hoy + datetime.timedelta(days=1)).month == hoy.month: assert a.locator('#view table.cq tfoot td.bajo').count() == 1
    seen('cuadrante'); wide('cuadrante'); a.screenshot(path=f'{OUT}/mejoras-cuadrante.png', full_page=True)
    # Mes siguiente y vuelta
    mes = a.inner_text('#view .cq-mes'); a.click('#view button[aria-label="Mes siguiente"]'); a.wait_for_timeout(150); assert a.inner_text('#view .cq-mes') != mes
    a.click('#view button[aria-label="Mes anterior"]'); a.wait_for_timeout(150); assert a.inner_text('#view .cq-mes') == mes
    # Sale en Logística (próximos cambios y aviso del mínimo), en el parte y en la ficha; «Marcar presente» corta las vacaciones
    a.evaluate("go('recursos')"); a.wait_for_timeout(200)
    prox = ' '.join(a.inner_text('#view .panel:has(h3:text-is("Próximos cambios"))').split()); assert 'Res. Acuático baja del mínimo' in prox and 'SDO BUZO' in prox and 'Curso' in prox, prox
    assert 'La Palma' in a.evaluate("sierParte()")
    a.evaluate(f"openPerson('{op('BUZO')}')"); a.wait_for_timeout(200)
    assert 'Ausente: Vacaciones en La Palma' in a.inner_text('#view .carne') and 'Vacaciones y permisos (2)' in a.inner_text('#view .carne')
    a.click('#view .carne button:has-text("Marcar presente")'); a.wait_for_timeout(200)
    plan = a.evaluate("operators().find(o => o.name === 'BUZO').plan"); assert len(plan) == 1 and plan[0]['motivo'] == 'Curso', 'las vacaciones que empezaban hoy se quitan; el curso sigue'
    assert not a.evaluate("esAusente(operators().find(o => o.name === 'BUZO'))")

    # ---------- Necesidades ----------
    a.evaluate("setPref({ tab: 'agua', aptab: 'necesidades', person: null })"); a.wait_for_timeout(200)
    assert 'Nada pendiente' in a.inner_text('#view')
    a.click('#view .panel button.btn-a:has-text("Necesidad")'); a.wait_for_selector('#modal [name=text]'); assert a.input_value('[name=ap]') == 'agua'
    a.fill('[name=text]', 'Chalecos talla L'); a.fill('[name=qty]', '4'); save()
    fila = a.inner_text('#view .need'); assert 'Chalecos talla L' in fila and '× 4' in fila and 'Falta' in fila and 'GRANADOS' in fila, fila
    assert a.locator('#view .ctab:has-text("Necesidades") .n').inner_text() == '1'
    a.click('#view .need-estado'); a.wait_for_timeout(150); assert a.inner_text('#view .need-estado') == 'Hay que pedir'
    a.click('#view .need-estado'); a.wait_for_timeout(150); assert a.inner_text('#view .need-estado') == 'Pedido'
    txt = a.evaluate("needsTexto('agua')"); assert 'NECESIDADES' in txt and 'PEDIDO' in txt and 'Chalecos talla L × 4' in txt, txt
    a.evaluate("put('needs', { id: 'NE-T2', ap: 'usar', text: 'Discos de diamante', qty: 1, state: 'falta', by: 'GRANADOS', ts: Date.now() })")
    a.evaluate("go('recursos')"); a.wait_for_timeout(200)
    nec = ' '.join(a.inner_text('#view .panel:has(h3:text-is("Necesidades"))').split()); assert 'Discos de diamante' in nec and 'USAR' in nec and 'Chalecos talla L' in nec and 'Agua' in nec, nec
    a.click('#view .need:has-text("Chalecos") .need-estado'); a.wait_for_timeout(150)
    assert a.evaluate("needsAbiertas().length") == 1 and 'Recibido (1)' in a.inner_text('#view .panel:has(h3:text-is("Necesidades"))')

    # ---------- Material: caducidad, baja, foto, historial ----------
    a.evaluate("matHabitual('ap:cuerdas'); setPref({ tab: 'cuerdas', aptab: 'material' })"); a.wait_for_timeout(250)
    n = a.evaluate("apMat('cuerdas').length")
    a.click('#view .list .item:has-text("Cuerdas dinámicas")'); a.wait_for_selector('#modal [name=caduca]')
    a.fill('[name=caduca]', dia(20)); a.fill('[name=fab]', '2017-03-01'); a.fill('[name=serial]', 'CD-11')
    a.evaluate("""(async () => { const b = await (await fetch('icon-192.png')).blob(), d = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(b); });
      document.querySelector('#modalForm [name=photo]').value = d; })()"""); a.wait_for_timeout(300); save(); a.wait_for_timeout(400)
    fila = a.inner_text('#view .list .item:has-text("Cuerdas dinámicas")'); assert 'Caduca en 20 d' in fila and 'CD-11' in fila, fila
    cid = a.evaluate("apMat('cuerdas').find(m => m.name === 'Cuerdas dinámicas').id")
    assert a.evaluate(f"get('matesp', '{cid}').photo") is True and a.evaluate(f"Img.get('mat:{cid}').then(x => (x || '').startsWith('data:image'))")
    assert a.locator('#view .list .item:has-text("Cuerdas dinámicas") img.mat-foto').count() == 1
    assert a.evaluate("expiries().some(x => x.what === 'Cuerdas dinámicas · Cuerdas' && x.kind === 'Caducidad')")
    # «Para dar de baja»: sigue en la lista, tachado, pero ya no cuenta ni entra en la revista
    a.click('#view .list .item:has-text("Trípode")'); a.wait_for_selector('#modal [name=status]'); a.select_option('[name=status]', 'BAJA'); save()
    assert a.locator('#view .list .item.mat-baja:has-text("Trípode")').count() == 1 and a.locator('#view .sier-kpi b').nth(1).inner_text().replace('\n', '') == f'{n - 1}/{n - 1}'
    assert a.evaluate("alerts().esp.length") == 0, 'lo que va a darse de baja no es un aviso'
    a.click('#view button:has-text("Pasar revista")'); a.wait_for_selector('#modal input[name=ok]'); assert a.locator('#modal input[name=ok]').count() == n - 1; a.evaluate("closeModal()"); a.wait_for_timeout(250)
    a.evaluate("window._txt = ''; window.shareText = t => { window._txt = t; }"); a.click('#view button:has-text("Lista de bajas (1)")'); a.wait_for_timeout(150)
    assert 'PARA DAR DE BAJA' in a.evaluate("window._txt") and 'Trípode' in a.evaluate("window._txt")
    # Historial de un material: lo que se le ha ido haciendo
    a.click('#view .list .item:has-text("Trípode")'); a.wait_for_selector('#modal .mat-hist'); h = a.evaluate("document.querySelector('#modal .mat-hist').textContent")
    assert 'para dar de baja' in h and 'GRANADOS' in h, h
    a.evaluate("closeModal()"); a.wait_for_timeout(250)

    # ---------- Inventario, Excel y etiquetas QR ----------
    a.click('#view button:has-text("Imprimir inventario")'); inv = a.evaluate("window._impreso")
    assert 'Inventario de Cuerdas' in inv and 'Cuerdas dinámicas' in inv and 'CD-11' in inv and 'Para dar de baja' in inv and inv.count('<tr>') == n + 1, inv[:300]
    with a.expect_download() as dl: a.click('#view button:has-text("Excel")')
    csv = open(dl.value.path(), encoding='utf-8-sig').read(); assert dl.value.suggested_filename == 'inventario-cuerdas.csv' and csv.startswith('Material;Cant.') and 'Cuerdas dinámicas;1;' in csv, csv[:200]
    a.click('#view .mat-mas button:text-is("Etiquetas QR")'); et = a.evaluate("window._impreso"); assert et.count('class="label"') == n - 1 and 'Cuerdas dinámicas' in et and '<svg' in et
    a.click('#view button:has-text("Etiquetas QR de los huecos")'); et = a.evaluate("window._impreso")
    assert et.count('class="label"') == 2 * 4 * 3 and 'Pasillo 5 · Izquierda' in et and 'Pasillo 5 · Derecha' in et and 'Cuerdas' in et
    # Leer la etiqueta de un material abre su ficha; la de un hueco, ese hueco
    a.evaluate(f"openScanner(); handleScan('', '{APP}#m={cid}')"); a.wait_for_selector('#modal [name=caduca]')
    assert a.input_value('#modal [name=name]') == 'Cuerdas dinámicas' and a.locator('#modal button:has-text("Me lo llevo yo")').count() == 1
    a.evaluate("closeModal()"); a.wait_for_timeout(250)
    a.evaluate("location.hash = '#h=cuerdas.5.D.2.1'"); a.wait_for_selector('#modal h3:has-text("Pasillo 5 · derecha · módulo 2 · balda 1")')
    assert a.evaluate("prefs.tab") == 'cuerdas' and a.evaluate("prefs.pasLado") == 'D'
    a.evaluate("closeModal(); setPref({ pasLado: 'I' })"); a.wait_for_timeout(250)

    # ---------- Revistas con aviso ----------
    assert a.evaluate("revPendientes().length") == 0 and 'Aún no se ha pasado revista' in a.inner_text('#view')
    a.select_option('#view .mat-cada select', '30'); a.wait_for_timeout(200)
    assert a.evaluate("revCada('ap:cuerdas')") == 30 and a.evaluate("revPendientes().map(r => r[0])") == ['ap:cuerdas'] and 'Toca pasar revista' in a.inner_text('#view .callout')
    a.evaluate("go('avisos')"); a.wait_for_timeout(200)
    assert 'Cuerdas' in a.inner_text('#view .area-panel:has(h3:has-text("Toca pasar revista"))')
    a.evaluate("go('recursos')"); a.wait_for_timeout(150); assert 'Cuerdas' in a.inner_text('#view .panel:has(h3:text-is("Revistas que tocan"))')
    a.evaluate("setPref({ tab: 'cuerdas', aptab: 'material' }); matRevista('ap:cuerdas')"); a.wait_for_selector('#modal input[name=ok]'); save()
    assert a.evaluate("revPendientes().length") == 0 and a.evaluate("revFalta('ap:cuerdas')") == 30 and 'La próxima, en 30 días' in a.inner_text('#view')
    # Pasada la fecha, vuelve a avisar
    a.evaluate("(() => { const r = get('meta', 'aprev-cuerdas'); put('meta', { ...r, value: [{ ...r.value[0], ts: Date.now() - 31 * 864e5 }] }); })()"); a.wait_for_timeout(150)
    assert a.evaluate("revPendientes().length") == 1

    # ---------- Qué especialidad hay en cada pasillo ----------
    a.evaluate("go('recursos')"); a.wait_for_timeout(200)
    pas = [' '.join(x.split()) for x in a.locator('#view .panel:has(h3:text-is("Pasillos del almacén")) .log-row').all_inner_texts()]
    assert pas[0].startswith('Pasillo 1') and pas[0].endswith('Parque') and pas[2].endswith('USAR') and pas[3].endswith('Agua') and pas[4].endswith('Cuerdas') and pas[5].endswith('Motosierras'), pas
    a.click('#view .panel:has(h3:text-is("Pasillos del almacén")) button:has-text("Cambiar")'); a.wait_for_selector('#modal [name=p1]')
    assert a.input_value('[name=p3]') == 'usar' and a.input_value('[name=p4]') == 'agua' and a.input_value('[name=p7]') == ''
    a.select_option('[name=p2]', 'sva'); a.select_option('[name=p7]', 'agua'); a.select_option('[name=p6]', ''); save()
    assert a.evaluate("apPasillos('parque')") == [1] and a.evaluate("apPasillos('sva')") == [2] and a.evaluate("apPasillos('agua')") == [4, 7] and a.evaluate("apPasillos('moto')") == [] and a.evaluate("apPasillos('cuerdas')") == [5]
    pas = [' '.join(x.split()) for x in a.locator('#view .panel:has(h3:text-is("Pasillos del almacén")) .log-row').all_inner_texts()]
    assert 'SVA' in pas[1] and pas[5].endswith('Libre') and 'Agua' in pas[6], pas
    a.click('#view .panel:has(h3:text-is("Pasillos del almacén")) .log-row:has-text("Pasillo 7")'); a.wait_for_timeout(200)
    assert a.evaluate("prefs.tab") == 'almacen' and a.inner_text('#view .panel:has(.px) h3') == 'Pasillo 7 · izquierda' and 'Agua' in a.inner_text('#view .panel:has(.px) .sec-head')
    # Y se puede cambiar también desde el Almacén
    a.click('#view button:has-text("De quién es cada pasillo")'); a.wait_for_selector('#modal [name=p7]'); assert a.input_value('[name=p7]') == 'agua'; a.evaluate("closeModal()"); a.wait_for_timeout(250)
    seen('pasillo cambiado'); wide('pasillo cambiado')

    # ---------- Modo noche: el cuadrante y Logística sin desbordes ----------
    a.evaluate("setPref({ theme: 'dark', tab: 'personal', person: null, pview: 'cuadrante' }); applyTheme()"); a.wait_for_timeout(200); seen('cuadrante de noche'); wide('cuadrante de noche')
    a.evaluate("go('recursos')"); a.wait_for_timeout(200); seen('logística de noche'); wide('logística de noche'); a.screenshot(path=f'{OUT}/mejoras-logistica.png', full_page=True)
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
