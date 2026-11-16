"""Prueba de Logística: lo disponible de personal (hoy y otro día, con ausencias previstas), capacidades, vehículos y
material; «Pasar lista»; y el Inicio (operatividad, una tarjeta por especialidad, fuerza de hoy y accesos).
Uso: python3 tests/test_logistica.py  (con la app servida en APP_URL)"""
import os, sys, pathlib, datetime
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []
# Personal inventado (nunca nombres reales: el repositorio es público)
LISTADO = """MANDO; TTE; MANDO PRUEBA, UNO; PLMSecc; ; 600000001;
PILOTO; CBO; PILOTO PRUEBA, DOS; PLMSecc; ; 600000002; RPAS, SVA
CUERDAS; CBO 1º; CUERDAS PRUEBA, CINCO; PIEN 1; Res. Terrestre; 600000005; SVA, MOTO T 2/45
AGUA; SGT 1º; AGUA PRUEBA, SEIS; PIEN 1; Res. Acuático; 600000006;
BUZO; SDO; BUZO PRUEBA, SIETE; PIEN 2; Res. Acuático; 600000007; MOTO T 1/85
RELEVO; CBO; RELEVO PRUEBA, OCHO; PIEN 2; Res. Terrestre; 600000008; MOTO S 7/31
"""
dia = lambda n: (datetime.date.today() + datetime.timedelta(days=n)).isoformat()

with sync_playwright() as p:
    br = p.chromium.launch()
    a = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True).new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and problems.append(f'console: {m.text}'))
    a.goto(APP); a.wait_for_selector('#view > *')
    wide = lambda where: a.evaluate("document.documentElement.scrollWidth") > 392 and problems.append(f'{where}: se sale de ancho')
    seen = lambda where: [problems.append(f'se ve «{x}» en {where}') for x in ['undefined', 'NaN', '[object Object]'] if x in a.inner_text('#view')]
    a.evaluate("window.open = () => null; navigator.share = undefined")

    # Se importa el personal de la sección (los 13 de USAR ya están; quedan sin pelotón)
    a.evaluate("go('personal'); importPersonalForm()"); a.fill('#impTxt', LISTADO); a.click('#impGo'); a.wait_for_timeout(200)
    total = a.evaluate("operators().length"); assert total == 19, total

    # Inicio: saludo con el nombre, operatividad con sus tres barras, fuerza de hoy y accesos
    a.evaluate("go('avisos')"); a.wait_for_timeout(200)
    assert 'Granados' in a.inner_text('.hero .hello') and a.locator('.hero-bar').count() == 3 and a.locator('.hero-pct b').inner_text().endswith('%')
    # Una tarjeta por especialidad o equipo: USAR con su emblema y sus 13; el resto con los suyos
    assert a.locator('.esp-tiles .esp-tile').count() == 6 and a.locator('.esp-tile >> nth=0').locator('img.esp-art').count() == 1
    t = ' '.join(a.inner_text('.esp-tile >> nth=0').split()); assert t.startswith('USAR') and '13/13 presentes' in t and 'material' in t, t
    t = ' '.join(a.inner_text('.esp-tile:has-text("Agua")').split()); assert '2/2 presentes' in t and '0/0 material' in t, t
    f = a.inner_text('.panel:has(h3:text-is("Fuerza de hoy"))'); assert f'de {total} presentes' in f and 'PIEN 1' in f and '2/2' in f.replace('\n', ''), f
    assert a.locator('.dash-quick .dash-q').all_inner_texts() == ['Pasar lista', 'Parte', 'Logística', 'Revista']
    seen('inicio'); wide('inicio'); a.screenshot(path=f'{OUT}/logistica-inicio.png', full_page=True)

    # Menú: Logística justo debajo de Inicio
    a.click('.dash-q:has-text("Logística")'); a.wait_for_timeout(150); assert a.evaluate("prefs.tab") == 'recursos'
    a.click('#menuBtn'); a.wait_for_timeout(150)
    assert a.locator('#drawer .dr-item.on b').inner_text() == 'Logística'; a.evaluate("toggleDrawer(false)"); a.wait_for_timeout(250)

    # Logística hoy: todos presentes
    panel = lambda t: a.inner_text(f'#view .panel:has(h3:text-is("{t}"))').replace('\n', ' ')
    assert f'{total} de {total} presentes hoy' in panel('Personal'), panel('Personal')
    caps = panel('Capacidades')
    for x in ['USAR 13/13', 'Res. Terrestre 2/2', 'Res. Acuático 2/2', 'RPAS 1/1', 'SVA 2/2', 'Motosierristas + 1 de 1 suplentes 2/2']:
        assert x in ' '.join(caps.split()), (x, caps)
    assert 'matrículas disponibles' in panel('Vehículos') or 'Aún no hay matrículas' in panel('Vehículos')
    assert 'equipos operativos' in panel('Material de USAR') and 'Fungible bajo mínimo' in panel('Material de USAR')
    seen('logística'); wide('logística')

    # Pasar lista: se toca a quien falta (con su motivo) y vuelve a tocarse para marcarlo presente
    a.click('#view button:has-text("Pasar lista")'); a.wait_for_selector('#listaBody')
    assert a.locator('#listaBody .lista-f').count() == total and a.inner_text('.lista-res b') .replace('\n', '') == f'{total}/{total}'
    a.select_option('#listaBody select', 'Curso'); a.fill('#listaLugar', 'Academia de Logística'); a.click('.lista-f:has-text("BUZO")'); a.wait_for_timeout(120)
    assert a.evaluate("operators().find(o => o.name === 'BUZO').aus.lugar") == 'Academia de Logística' and a.input_value('#listaLugar') == 'Academia de Logística'
    a.fill('#listaLugar', '')
    a.select_option('#listaBody select', 'Baja médica'); a.click('.lista-f:has-text("CUERDAS")'); a.click('.lista-f:has-text("MANDO")'); a.wait_for_timeout(120)
    assert a.locator('.lista-f.aus').count() == 3 and a.inner_text('.lista-res b').replace('\n', '') == f'{total - 3}/{total}'
    assert a.get_attribute('.lista-f:has-text("BUZO")', 'aria-label') == 'BUZO: ausente' and 'Curso' in a.inner_text('.lista-f:has-text("BUZO")')
    assert a.evaluate("document.activeElement.textContent.trim()").startswith('MANDO'), 'el foco sigue en la ficha tocada'
    a.click('.lista-f:has-text("MANDO")'); a.wait_for_timeout(120); assert a.locator('.lista-f.aus').count() == 2
    assert a.evaluate("operators().find(o => o.name === 'CUERDAS').aus.motivo") == 'Baja médica' and a.evaluate("operators().find(o => o.name === 'MANDO').aus") is None
    a.screenshot(path=f'{OUT}/logistica-lista.png')
    a.click('#listaBody button:has-text("Hecho")'); a.wait_for_timeout(250)

    # Logística con dos ausentes: totales, pelotones, capacidades (falta un motosierrista titular) y la lista de ausentes
    per = ' '.join(panel('Personal').split()); assert f'{total - 2} de {total} presentes hoy' in per and 'PIEN 1 1/2' in per and 'PIEN 2 1/2' in per and 'PLMSecc 2/2' in per, per
    assert 'CBO 1º CUERDAS' in per and 'Baja médica' in per and 'SDO BUZO' in per and 'Curso' in per, per
    caps = ' '.join(panel('Capacidades').split())
    for x in ['Res. Terrestre 1/2', 'Res. Acuático 1/2', 'SVA 1/2', 'Motosierristas + 1 de 1 suplentes 0/2', 'USAR 13/13']: assert x in caps, (x, caps)
    assert a.locator('#view .meter.bad').count() >= 3 and a.locator('#view .log-fig.warn, #view .log-fig.bad').count() >= 1
    # Tablero de situación (Personal → «Situación»): en base y cada motivo, con dónde está cada uno
    a.evaluate("setPref({ tab: 'personal', person: null, pview: 'situacion' })"); a.wait_for_timeout(200)
    heads = a.locator('.pers-panel h3').all_inner_texts(); assert heads == ['En base', 'Baja médica', 'Curso'], heads
    assert a.locator('.pers-panel >> nth=0').locator('.item').count() == total - 2
    cur = ' '.join(a.inner_text('.pers-panel:has(h3:text-is("Curso"))').split()); assert 'BUZO' in cur and 'Academia de Logística' in cur and 'sin fecha de vuelta' in cur, cur
    assert 'en Academia de Logística' in a.evaluate("sierParte()")
    a.evaluate("setPref({ pview: 'peloton' }); go('recursos')"); a.wait_for_timeout(200)
    assert 'Academia de Logística' in panel('Personal')
    # El parte sale con los ausentes
    parte = a.evaluate("sierParte()"); assert 'CUERDAS' in parte and 'Baja médica' in parte and f'Presentes: *{total - 2}*' in parte, parte

    # Ausencia prevista: hoy sigue presente; el día elegido ya no. La vuelta de BUZO sale en «Próximos cambios»
    a.evaluate(f"""(() => {{ const o = operators().find(o => o.name === 'PILOTO'); put('operators', {{ ...o, aus: {{ motivo: 'Permiso', desde: '{dia(3)}', hasta: '{dia(5)}', nota: '' }} }});
      const b = operators().find(o => o.name === 'BUZO'); put('operators', {{ ...b, aus: {{ ...b.aus, hasta: '{dia(1)}' }} }}); }})()"""); a.wait_for_timeout(150)
    assert a.evaluate("esAusente(operators().find(o => o.name === 'PILOTO'))") is False and a.evaluate("ausPrevista(operators().find(o => o.name === 'PILOTO'))") is True
    assert 'RPAS 1/1' in ' '.join(panel('Capacidades').split())
    prox = ' '.join(panel('Próximos cambios').split()); assert 'SDO BUZO' in prox and 'vuelve el' in prox and 'CBO PILOTO' in prox and 'desde el' in prox, prox
    a.fill('#view input[type=date]', dia(4)); a.dispatch_event('#view input[type=date]', 'change'); a.wait_for_timeout(200)
    assert a.evaluate("prefs.logDia") == dia(4) and a.locator('#view button:has-text("Pasar lista")').count() == 0, 'la lista solo se pasa hoy'
    caps = ' '.join(panel('Capacidades').split()); assert 'RPAS 0/1' in caps and 'Res. Acuático 2/2' in caps and 'Res. Terrestre 1/2' in caps, caps
    per = ' '.join(panel('Personal').split()); assert f'{total - 2} de {total} presentes' in per and 'CBO PILOTO' in per and 'BUZO' not in per, per
    seen('logística otro día'); wide('logística otro día'); a.screenshot(path=f'{OUT}/logistica-dia.png', full_page=True)
    a.click('#view button:has-text("Hoy")'); a.wait_for_timeout(150); assert a.evaluate("prefs.logDia") == ''
    # En la ficha: la ausencia prevista se ve y se anula
    a.evaluate("openPerson(operators().find(o => o.name === 'PILOTO').id)"); a.wait_for_timeout(150)
    assert 'Ausencia prevista' in a.inner_text('#view .carne') and a.locator('#view .carne button:has-text("Marcar ausente")').count() == 1
    a.click('#view .carne button:has-text("Anular")'); a.wait_for_timeout(150); assert a.evaluate("operators().find(o => o.name === 'PILOTO').aus") is None
    # «Marcar ausente» con fecha de inicio futura queda como prevista
    a.click('#view .carne button:has-text("Marcar ausente")'); a.wait_for_selector('#modal [name=desde]')
    assert a.input_value('[name=desde]') == dia(0); a.fill('[name=desde]', dia(2)); a.click('#modal button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate("ausPrevista(operators().find(o => o.name === 'PILOTO'))") is True and 'Ausencia prevista' in a.inner_text('#view .carne')

    # Material y vehículos: una matrícula con la ITV caducada deja de estar disponible; lo prestado sale por persona
    a.evaluate(f"""(() => {{ const v = vehicles()[0]; put('vehicles', {{ ...v, seats: 5, units: [{{ id: 'U-T1', plate: 'ET-000001', itv: '{dia(-3)}' }}, {{ id: 'U-T2', plate: 'ET-000002', itv: '{dia(200)}' }}] }});
      const g = list('gear')[0]; put('gear', {{ ...g, out: {{ who: 'DORTA', since: Date.now() }} }}); }})()""")
    a.evaluate("go('recursos')"); a.wait_for_timeout(200)
    n_itv = a.evaluate("flotaEstado().filter(x => x.itv).length"); assert n_itv >= 1
    veh = ' '.join(panel('Vehículos').split()); assert f'ITV caducada {n_itv}' in veh and 'plazas' in veh, veh
    assert f"{a.evaluate('flotaEstado().filter(x => x.libre).length')} de {a.evaluate('flotaEstado().length')} matrículas disponibles" in veh, veh
    antes = a.evaluate("flotaEstado().filter(x => x.libre).length"); assert a.evaluate("flotaEstado().find(x => x.u.id === 'U-T1').libre") is False and antes >= 1
    mat = ' '.join(panel('Material de USAR').split()); assert 'Prestado a personas 1' in mat, mat
    quien = ' '.join(panel('Quién tiene material').split()); assert 'DORTA' in quien and '1 equipo' in quien, quien
    a.click('#view .panel:has(h3:text-is("Material de USAR")) .log-row:has-text("En revisión")'); a.wait_for_timeout(150); assert a.evaluate("prefs.tab") == 'revision'

    # Modo noche y escritorio: sin desbordes
    a.evaluate("setPref({ theme: 'dark' }); applyTheme(); go('recursos')"); a.wait_for_timeout(200); seen('logística de noche'); wide('logística de noche')
    a.screenshot(path=f'{OUT}/logistica-noche.png', full_page=True)
    b = br.new_context(viewport={'width': 1280, 'height': 800}).new_page(); b.on('pageerror', lambda e: problems.append(f'ERROR PC {e}'))
    b.goto(APP); b.wait_for_selector('#view > *'); b.evaluate("go('recursos')"); b.wait_for_timeout(200)
    assert b.locator('#nav .dr-item.on b').inner_text() == 'Logística' and b.evaluate("document.documentElement.scrollWidth") <= 1280
    b.evaluate("go('avisos')"); b.wait_for_timeout(200); assert b.locator('.hero').is_visible() and b.evaluate("document.documentElement.scrollWidth") <= 1280
    b.screenshot(path=f'{OUT}/logistica-pc.png')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
