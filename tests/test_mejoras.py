"""Prueba de las mejoras basadas en INSARAG / ICMS: EPI completo, alistamiento con datos médicos solo locales,
manifiestos, disponibilidad, recuento periódico (PAR), salidas de la base, bienestar, plan de radio, sectores,
croquis con GPS, informes de worksite por periodo, vigilancia estructural con réplica, necesidades y exportación.
Uso: python3 tests/test_mejoras.py  (con la app servida en APP_URL)"""
import os, sys, pathlib, datetime
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type in ('warning', 'error') and 'ERR_TUNNEL' not in m.text and 'ERR_CONNECTION_REFUSED' not in m.text
         and 'Failed to load resource' not in m.text and problems.append(f'{m.type}: {m.text}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *')
    a.evaluate("window.print = () => {}")
    nav = lambda n: sesion.menu(a, n)
    more = lambda n: sesion.menu(a, n)
    mtab = lambda n: (a.click(f'.tab:has-text("{n}")'), a.wait_for_timeout(150))
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(200))
    cur = lambda js: a.evaluate(f"(m => {js})(mget(prefs.mission))")
    dlocal = lambda dt: dt.strftime('%Y-%m-%dT%H:%M')

    # EPI mínimo INSARAG: 7 por persona
    assert a.evaluate("list('epis').filter(e => e.holder === 'OP-01').length") == 7
    more('Personal'); a.click('.item:has-text("GRANADOS")'); assert a.locator('.panel:has-text("EPI asignado") .item:has-text("Botas")').count() == 1

    # Alistamiento: pasaporte que caduca en 3 meses → aviso; datos médicos solo locales
    more('Alistamiento')
    a.click('.item:has-text("GRANADOS")'); a.click('button:has-text("Alistamiento")')
    a.fill('[name=fullName]', 'Juan Granados Pérez'); a.fill('[name=passportNo]', 'PAA123456')
    a.fill('[name=passportExp]', (datetime.date.today() + datetime.timedelta(days=90)).isoformat())
    a.fill('[name=emergencyPhone]', '600000000'); a.select_option('[name=blood]', '0+'); save()
    assert a.evaluate("get('medical', 'OP-01').blood") == '0+' and a.evaluate("get('readiness', 'OP-01').blood") is None, 'el grupo sanguíneo va en su propio registro'
    a.click('button:has-text("Alistamiento")'); a.locator('#modal button.span2:has-text("Cualificaciones")').click()
    a.fill('#qualForm [name=name]', 'Espacios confinados'); a.fill('#qualForm [name=expires]', (datetime.date.today() - datetime.timedelta(days=3)).isoformat())
    a.click('#qualForm button'); a.wait_for_timeout(150); a.keyboard.press('Escape')
    issues = a.evaluate("readinessIssues('OP-01').map(i => i[1]).join(' | ')"); print('Alistamiento:', issues)
    assert 'menos de 6 meses' in issues and 'Espacios confinados' in issues
    # Ahora todo se comparte: los datos de salud también van a la nube
    a.evaluate("localStorage.setItem(KEY.sync, JSON.stringify({ url: 'http://127.0.0.1:9', key: 'x', joined: true }))")
    before = a.evaluate("Sync.pending"); a.evaluate("Sync.queue('medical', { id: 'OP-02' }); Sync.queue('medlog', { id: 'z' })")
    assert a.evaluate("Sync.pending") == before + 2, 'medical/medlog también se comparten'
    a.evaluate("Sync.disconnect()")
    nav('Inicio'); assert a.locator('.panel:has-text("Documentación del personal") .item:has-text("GRANADOS")').count() >= 1

    # Ficha del equipo y manifiesto de material
    more('Alistamiento'); a.click('button:has-text("Ficha del equipo")'); a.select_option('[name=status]', 'alerta'); a.fill('[name=dogs]', '2'); save()
    assert '*Perros:* 2' in a.evaluate("factsheetText()")
    a.evaluate("put('boxes', { id: 'K-C01', code: 'C-01', name: 'Holmatro', color: 'negro', door: 1, shelf: 'A', vehicle: '', heli: 'si', tare: 13 })")
    more('Material'); a.evaluate("gearDetail(list('gear').find(g => g.name.startsWith('Extractor')).id)"); a.click('#modal button:has-text("Editar")')
    a.select_option('[name=func]', 'Rescate'); a.fill('[name=weight]', '14.5'); a.select_option('[name=box]', 'K-C01'); a.select_option('[name=dg]', 'Baterías de litio'); save()
    more('Alistamiento'); kpis = a.inner_text('.status'); assert '15 kg' in kpis or '14,5' in kpis or '14 kg' in kpis, kpis
    a.evaluate("printGearManifest()"); assert 'Rescate' in a.inner_html('#print') and 'C-01' in a.inner_html('#print')
    a.evaluate("printPersonnelManifest()"); assert 'PAA123456' in a.inner_html('#print')
    a.screenshot(path=f'{OUT}/mejoras-despliegue.png', full_page=True)

    # Operación: disponibilidad, inicio, PAR, salidas, bienestar
    nav('Operaciones'); a.click('button:has-text("Intervención")'); a.click('#modal .item:has-text("En blanco")')
    a.fill('[name=title]', 'Colapso nave Arinaga'); save()
    mtab('Personal'); a.click('.panel:has-text("Disponibilidad") .btn:text-is("Voy")'); a.wait_for_timeout(150)
    assert a.evaluate("availOf(prefs.mission).length") == 1
    assert 'Responde en la app' in a.evaluate("activationText(mget(prefs.mission))")
    a.click('button:has-text("Crear por células")'); a.click('button:has-text("Iniciar")'); a.wait_for_timeout(200)
    mtab('Personal'); assert a.locator('.callout:has-text("Recuento cada 30 min")').count() == 1
    a.evaluate("const m = mget(prefs.mission); put('missions', { ...m, startedAt: Date.now() - 31 * 6e4 })"); a.wait_for_timeout(150)
    assert a.evaluate("parOverdue(mget(prefs.mission))") and a.locator('.callout.bad').count() == 1
    a.click('.callout button:has-text("Recuento")'); [a.locator('#rollForm .check-row').nth(i).click() for i in range(a.locator('#rollForm .check-row').count())]
    a.click('#rollForm button'); a.wait_for_timeout(200)
    assert not a.evaluate("parOverdue(mget(prefs.mission))") and cur('m.pars.length') == 1
    a.click('.panel:has-text("Salidas de la base") button.btn-a'); a.click('#modalForm .check-row:has-text("DORTA")'); a.fill('[name=dest]', 'Puesto de mando')
    a.fill('[name=eta]', dlocal(datetime.datetime.now() - datetime.timedelta(minutes=5))); save()
    assert a.locator('.panel:has-text("Salidas de la base") .item.over').count() == 1, 'la salida con regreso vencido debe avisar'
    a.click('button:has-text("Vuelven")'); a.wait_for_timeout(150)
    assert a.evaluate("outingsOf(prefs.mission)[0].back") is not None
    a.click('button:has-text("Control diario")'); a.locator('#wellForm .between:has-text("AGUIAR") label:has-text("Cansado")').click()
    a.click('#wellForm button'); a.wait_for_timeout(150)
    assert '1 a vigilar' in a.inner_text('.panel:has-text("Bienestar")')
    a.screenshot(path=f'{OUT}/mejoras-personal.png', full_page=True)

    # Plan de comunicaciones
    mtab('Seguridad'); a.click('.panel:has-text("Plan de comunicaciones") button:has-text("Canal")')
    a.fill('[name=func]', 'Mando'); a.fill('[name=channel]', 'TETRA TG 2'); save()
    assert 'Mando: TETRA TG 2' in a.evaluate("missionText(mget(prefs.mission))")

    # Sectores, worksites con GPS y croquis
    mtab('Worksites'); a.click('.panel:has-text("Sectores") button:has-text("Sector")'); a.fill('[name=name]', 'Polígono norte'); save()
    a.click('.panel:has-text("Sectores") button:has-text("Sector")'); a.fill('[name=letter]', 'I'); save()
    assert cur('m.sectors.length') == 1, 'la I no se usa como sector'
    for lat, lon in [('27.8601', '-15.3901'), ('27.8607', '-15.3893')]:
        a.click('button.btn-a:has-text("Worksite")'); a.fill('[name=pos]', f'{lat}, {lon}'); save(); a.wait_for_timeout(300)
        a.click('.tri-a:has-text("Sí")'); a.click('.tri-a:has-text("menos de 12")'); a.click('#modal button:has-text("Hecho")'); a.click('button:has-text("Todos los worksites")')
    assert a.locator('svg.croquis circle').count() == 2
    a.screenshot(path=f'{OUT}/mejoras-croquis.png', full_page=True)

    # Informe por periodo y vigilancia estructural
    a.click('.ws-card:has-text("A-1")'); a.click('.panel:has-text("Informes por periodo") button:has-text("Informe")')
    a.fill('[name=plan]', 'Seguir con ASR 4'); save()
    text = a.evaluate("periodText(get('worksites', prefs.ws), 1)"); print('--- Informe por periodo ---\n' + text + '\n---')
    assert 'G7' in text and '*G19* Plan: Seguir con ASR 4' in text and 'nº 1' in text
    a.click('.panel:has-text("Vigilancia estructural") button:has-text("Punto")'); a.select_option('[name=type]', 'Apuntalamiento'); a.fill('[name=place]', 'Puerta lado 1'); save()
    assert a.evaluate("monitorsDue(get('worksites', prefs.ws)).length") == 0
    mtab('Seguridad'); a.click('button:has-text("Ha habido una réplica")'); a.wait_for_timeout(800); a.keyboard.press('Escape')
    assert a.evaluate("monitorsDue(get('worksites', prefs.ws)).length") == 1, 'tras la réplica hay que revisar el apuntalamiento'
    mtab('Worksites'); a.click('.panel:has-text("Vigilancia") .item:has-text("Puerta lado 1")'); save()
    assert a.evaluate("monitorsDue(get('worksites', prefs.ws)).length") == 0

    # Necesidades y exportación
    a.click('button:has-text("Todos los worksites")'); mtab('Informes')
    a.click('.panel:has-text("Necesidades") button:has-text("Anotar")'); a.fill('[name=place]', 'Plaza'); a.click('#modalForm .check-row:has-text("Agua")'); save()
    assert 'Plaza' in a.evaluate("needsText(mget(prefs.mission))")
    with a.expect_download() as d: a.click('button:has-text("Worksites (CSV)")')
    csv = open(d.value.path(), encoding='utf-8-sig').read(); assert csv.startswith('E1 Worksite') and 'A-2' in csv, csv[:120]
    with a.expect_download() as d: a.click('button:has-text("Posiciones (KML)")')
    assert '<coordinates>-15.3901,27.8601,0</coordinates>' in open(d.value.path()).read()
    a.screenshot(path=f'{OUT}/mejoras-informes.png', full_page=True)
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
