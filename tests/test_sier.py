"""Prueba de la SIER 242: marca, menú con USAR como una parte, personal de toda la sección (pelotones, especialidades,
equipos, presentes y ausentes), importación del listado (con nombres inventados) y lo que sigue siendo solo de USAR
(perfiles de misión y EPI).
Uso: python3 tests/test_sier.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []
# Listado inventado, con el formato de «Importar personal»; GRANADOS y RODRI ya están en la app (se actualizan)
LISTADO = """# NOMBRE; EMPLEO; APELLIDOS, NOMBRE; PELOTÓN; ESPECIALIDAD; TELÉFONO; EQUIPOS
MANDO; TTE; MANDO PRUEBA, UNO; PLMSecc; ; 600000001;
PILOTO; CBO; PILOTO PRUEBA, DOS; PLMSecc; ; 600000002; RPAS, SVA
GRANADOS; BG; GRANADOS PRUEBA, TRES; PIEN 2; USAR; 600000003;
RODRI; CBO; RODRI PRUEBA, CUATRO; PIEN 2; USAR; 600000004; MOTO S 10/41
CUERDAS; CBO 1º; CUERDAS PRUEBA, CINCO; PIEN 1; Res. Terrestre; 600000005; SVA, MOTO T 2/45
AGUA; SGT 1º; AGUA PRUEBA, SEIS; PIEN 1; Res. Acuático; 600000006;
BUZO; SDO; BUZO PRUEBA, SIETE; PIEN 2; res acuatico; 600 000 007; MOTO T 1/85
"""

with sync_playwright() as p:
    br = p.chromium.launch()
    a = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True).new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and problems.append(f'console: {m.text}'))
    a.goto(APP); a.wait_for_selector('#view > *')
    wide = lambda where: a.evaluate("document.documentElement.scrollWidth") > 392 and problems.append(f'{where}: se sale de ancho')
    seen = lambda where: [problems.append(f'se ve «{x}» en {where}') for x in ['undefined', 'NaN', '[object Object]'] if x in a.inner_text('#view')]

    # Marca: la app es SIER 242
    assert a.title() == 'SIER 242' and 'SIER' in a.inner_text('.topbar .wordmark')
    # Menú: Inicio, Logística, Personal, Vehículos, Calendario, USAR (con lo suyo dentro), los apartados y Ajustes
    a.click('#menuBtn'); a.wait_for_timeout(150)
    tops = [x.strip().split('\n')[0] for x in a.locator('#drawer .dr-item:not(.sub) b, #drawer .dr-group-head b').all_inner_texts()]
    assert tops == ['Inicio', 'Logística', 'Personal', 'Vehículos', 'Almacén', 'Parque', 'Calendario', 'USAR', 'Agua', 'Cuerdas', 'RPAS', 'SVA', 'Motosierras', 'Ajustes'], tops
    a.click('#drawer .dr-group-head:has-text("USAR")'); a.wait_for_timeout(100)
    dentro = a.locator('#drawer .dr-group[data-area=usar] .dr-item.sub b').all_inner_texts()
    assert dentro == ['Contenedor', 'Fuera', 'Revisión', 'Revista', 'EPI', 'Guía de campo', 'Apuntalamientos'], dentro
    a.click('#drawer .dr-item.sub:has-text("Apuntalamientos")'); a.wait_for_timeout(150); assert a.evaluate("prefs.tab") == 'apuntalamientos'
    a.click('#menuBtn'); a.wait_for_timeout(150)
    assert a.locator('#drawer .dr-group[data-area=usar] .dr-group-head').get_attribute('aria-expanded') == 'true', 'el grupo USAR se abre solo estando dentro'
    a.click('#drawer .dr-item:has-text("Personal")'); a.wait_for_timeout(150); assert a.evaluate("prefs.tab") == 'personal'

    # Sin datos de la sección todavía: el personal de antes sale por puestos de USAR, con su perfil de misión
    n0 = a.evaluate("operators().length"); assert n0 == 13
    assert a.locator('.pers-views .chip.on').inner_text() == 'Puestos USAR' and a.locator('#view select[onchange^="applyPreset"]').count() == 1
    assert a.locator('.sier-kpi b').all_inner_texts() == ['13', '13', '0']

    # Importar el listado: 5 nuevas y 2 que se actualizan; avisa de lo que no entiende sin importar nada a medias
    a.click('#view button:has-text("Importar")'); a.wait_for_selector('#impTxt')
    a.fill('#impTxt', LISTADO + 'MAL; GENERAL; X, Y; PIEN 9; Buceo; 1; COHETES\n'); a.wait_for_timeout(100)
    t = a.inner_text('#impPrev'); assert '8 personas' in t and 'no conozco el empleo' in t and 'no conozco el pelotón' in t and 'no conozco la especialidad' in t and 'no conozco el equipo' in t, t
    a.fill('#impTxt', LISTADO); a.wait_for_timeout(100)
    t = a.inner_text('#impPrev'); assert '7 personas' in t and '5 nuevas' in t and '2 que se actualizan' in t, t
    a.click('#impGo'); a.wait_for_timeout(300)
    assert a.evaluate("operators().length") == n0 + 5
    g = a.evaluate("(o => ({ ...o, full: readiness(o.id).fullName }))(operators().find(o => o.name === 'GRANADOS'))")
    assert g['id'] == 'OP-01' and g['empleo'] == 'BG' and g['peloton'] == 'PIEN 2' and g['esp'] == 'USAR' and g['phone'] == '600000003' and g['full'] == 'GRANADOS PRUEBA, TRES', g
    b = a.evaluate("operators().find(o => o.name === 'BUZO')")
    assert b['esp'] == 'Res. Acuático' and b['phone'] == '600000007' and b['moto'] == {'tipo': 'T', 'eq': '1', 'aut': '85'} and b['empleo'] == 'SDO', b
    assert a.evaluate("operators().find(o => o.name === 'PILOTO').eq") == ['rpas', 'sva'] and a.evaluate("operators().find(o => o.name === 'MANDO').esp") == ''
    # El EPI es de USAR: los nuevos de otras especialidades no reciben casco ni mono
    assert a.evaluate("list('epis').filter(e => e.holder === operators().find(o => o.name === 'BUZO').id).length") == 0

    # Pelotones (vista por defecto ya con datos): orden de la hoja y cuentas
    a.wait_for_timeout(100); assert a.locator('.pers-views .chip.on').inner_text() == 'Pelotones'
    heads = a.locator('.pers-panel h3').all_inner_texts(); assert [h.upper() for h in heads[:3]] == ['PLMSECC', 'PIEN 1', 'PIEN 2'], heads
    assert a.locator('.sier-kpi b').all_inner_texts() == ['18', '18', '0']
    c = a.inner_text('.sier-cuenta >> nth=0'); assert 'PLMSecc 2' in c and 'PIEN 1 2' in c and 'PIEN 2 3' in c, c
    c = a.inner_text('.sier-cuenta >> nth=1'); assert 'USAR 13' in c and 'Res. Terrestre 1' in c and 'Res. Acuático 2' in c, c
    plm = a.locator('.pers-panel >> nth=0'); assert plm.locator('.item b').first.inner_text().replace('\n', ' ').startswith('TTE') and 'MANDO' in plm.inner_text()
    seen('pelotones'); wide('pelotones'); a.screenshot(path=f'{OUT}/sier-pelotones.png', full_page=True)
    # Especialidades
    a.click('.pers-views .chip:has-text("Especialidades")'); a.wait_for_timeout(100)
    heads = [h.upper() for h in a.locator('.pers-panel h3').all_inner_texts()]; assert heads == ['USAR', 'RES. TERRESTRE', 'RES. ACUÁTICO', 'SIN ESPECIALIDAD'], heads
    assert a.locator('.pers-panel:has(h3:text-is("Res. Acuático")) .item').count() == 2
    # Equipos: RPAS, SVA y motosierristas titulares (por número de equipo) y suplentes
    a.click('.pers-views .chip:has-text("Equipos")'); a.wait_for_timeout(100)
    assert a.locator('.pers-panel:has(h3:text-is("Equipo RPAS")) .item').count() == 1 and a.locator('.pers-panel:has(h3:text-is("Equipo SVA")) .item').count() == 2
    tit = a.locator('.pers-panel:has(h3:text-is("Motosierristas titulares")) .item'); assert tit.count() == 2
    assert 'BUZO' in tit.nth(0).inner_text() and 'equipo 1 (AUT. 85)' in tit.nth(0).inner_text() and 'CUERDAS' in tit.nth(1).inner_text(), tit.all_inner_texts()
    sup = a.inner_text('.pers-panel:has(h3:text-is("Motosierristas suplentes"))'); assert 'RODRI' in sup and 'equipo 10 (AUT. 41)' in sup, sup
    seen('equipos'); wide('equipos')
    # Buscador (sin perder el foco)
    a.click('.pers-views .chip:has-text("Pelotones")'); a.click('#view input[aria-label="Buscar una persona"]'); a.keyboard.type('acuat', delay=20); a.wait_for_timeout(150)
    assert a.evaluate("document.activeElement.type") == 'search' and a.locator('.pers-panel .item').count() == 2
    a.fill('#view input[aria-label="Buscar una persona"]', ''); a.wait_for_timeout(150)

    # Puestos USAR: el perfil de misión solo reparte a los de USAR
    a.click('.pers-views .chip:has-text("Puestos USAR")'); a.wait_for_timeout(100)
    a.select_option('#view select[onchange^="applyPreset"]', 'colapso'); a.wait_for_timeout(200)
    assert a.evaluate("operators().find(o => o.name === 'GRANADOS').role") == 'Jefe de Intervención'
    assert a.evaluate("operators().find(o => o.name === 'BUZO').role") == '' and a.locator('.pers-panel .item:has-text("BUZO")').count() == 0
    # EPI: solo el equipo USAR
    sesion.menu(a, 'EPI'); assert a.locator('.epi-who').count() == 13 and a.locator('.epi-who:has-text("BUZO")').count() == 0

    # Ficha de una persona de otra especialidad: empleo, pelotón, especialidad, equipos y teléfono
    a.evaluate("openPerson(operators().find(o => o.name === 'CUERDAS').id)"); a.wait_for_timeout(150)
    t = a.inner_text('#view'); assert 'CBO 1º' in t and 'CUERDAS PRUEBA, CINCO' in t and 'Res. Terrestre' in t and 'PIEN 1' in t and 'Titular · equipo 2 (AUT. 45)' in t and 'SVA' in t, t[:500]
    assert a.locator('#view a[href="tel:600000005"]').count() == 1
    seen('ficha'); wide('ficha'); a.screenshot(path=f'{OUT}/sier-ficha.png', full_page=True)
    # Ausente con motivo y vuelta a presente
    a.click('#view button:has-text("Marcar ausente")'); a.select_option('#modalForm [name=motivo]', 'Curso'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert 'Ausente: Curso' in a.inner_text('#view') and a.evaluate("esAusente(operators().find(o => o.name === 'CUERDAS'))")
    a.click('#view button.link:has-text("Todo el personal")'); a.wait_for_timeout(150)
    assert a.locator('.sier-kpi b').all_inner_texts() == ['18', '17', '1']
    parte = a.evaluate("sierParte()"); assert 'PARTE DE PERSONAL' in parte and 'Presentes: *17*' in parte and 'CBO 1º CUERDAS (PIEN 1): Curso' in parte and 'PIEN 1: 1/2' in parte, parte
    a.evaluate("marcarPresente(operators().find(o => o.name === 'CUERDAS').id)"); a.wait_for_timeout(150)
    assert a.locator('.sier-kpi b').all_inner_texts() == ['18', '18', '0'] and 'Sin ausencias' in a.evaluate("sierParte()")
    # Una ausencia con fecha de vuelta pasada ya no cuenta
    a.evaluate("(o => put('operators', { ...o, aus: { motivo: 'Permiso', hasta: '2020-01-01' } }))(operators().find(o => o.name === 'AGUA'))"); a.wait_for_timeout(100)
    assert a.locator('.sier-kpi b').all_inner_texts() == ['18', '18', '0']

    # Alta a mano de una persona de otra especialidad: sin EPI
    a.click('#view button:has-text("Persona")'); a.fill('#modalForm [name=name]', 'nueva'); a.select_option('#modalForm [name=empleo]', 'CBO')
    a.select_option('#modalForm [name=peloton]', 'PIEN 1'); a.select_option('#modalForm [name=esp]', 'Res. Terrestre'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    nv = a.evaluate("operators().find(o => o.name === 'NUEVA')"); assert nv['esp'] == 'Res. Terrestre' and nv['peloton'] == 'PIEN 1' and nv['role'] == '', nv
    assert a.evaluate(f"list('epis').filter(e => e.holder === '{nv['id']}').length") == 0
    # El buscador general encuentra por empleo o pelotón
    a.evaluate("toggleSearch(); $('search').value = 'buzo'; renderSearch()"); assert a.locator('#results .item:has-text("BUZO")').count() == 1
    a.evaluate("clearSearch()")

    # Modo oscuro
    a.evaluate("setPref({ theme: 'dark', person: null, pview: 'peloton' }); applyTheme()"); a.wait_for_timeout(200)
    a.screenshot(path=f'{OUT}/sier-noche.png', full_page=True)
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
