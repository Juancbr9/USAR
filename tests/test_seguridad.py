"""Prueba de seguridad y de datos extremos: mete texto con código (<img onerror>, comillas, etiquetas) en todos los campos de
texto de todos los registros, recorre todas las pantallas, pestañas, fichas y documentos imprimibles y comprueba que nada se
ejecuta (XSS) y que nada se rompe. También usa nombres larguísimos, emojis y cantidades enormes (datos del peor caso).
Uso: python3 tests/test_seguridad.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []

SEED = r"""(() => {
  const P = `"'><img src=x onerror=__xss('h')><svg onload=__xss('s')>{{7*7}}\${__xss('t')}`;
  const LONG = 'Aleksandra Wiśniewska-Kowalczyk de la Santísima Trinidad 🚒🧯 bartholomew.fitzgerald@northwind-industries-holdings.example.com';
  const t = Date.now();
  const mk = (kind, rec) => stamp(kind, { _u: t, ...rec });
  mk('matesp', { id: 'ME-XSS', ap: 'agua', name: P + LONG, qty: 99999, place: P, serial: P, notes: P, status: 'REVISIÓN', review: todayISO() });
  mk('matesp', { id: 'ME-XSS2', veh: 'V-XSS', unit: P, name: P, qty: 2, place: P, serial: P, notes: P, status: 'AVERIADO', review: todayISO() });
  mk('meta', { id: 'apnota-agua', value: P + LONG });
  mk('meta', { id: 'aprev-agua', value: [{ ts: t, by: P, total: 1, fails: [P], nota: P }] });
  mk('meta', { id: 'vehrev-V-XSS', value: [{ ts: t, by: P, total: 1, fails: [P], nota: P }] });
  mk('events', { id: 'E-XSS', type: 'Formación', title: P + LONG, place: P, notes: P, start: todayISO() + 'T09:00', end: todayISO() + 'T13:00', people: ['OP-01'] });
  mk('docs', { id: 'D-XSS', op: 'OP-01', type: P, number: P, notes: P, expires: todayISO() });
  mk('vehicles', { id: 'V-XSS', name: P + LONG, seats: 99999, notes: P });
  mk('boxes', { id: 'K-XSS', code: P.slice(0, 40), name: P, color: 'amarillo', door: 3, shelf: 'A', vehicle: '', heli: 'si', tare: 99999, pos: 1 });
  mk('gear', { id: 'G-XSS', name: P + LONG, door: 3, shelf: 'A', box: 'K-XSS', status: 'OPERATIVO', qty: 99999, serial: P, notes: P, cat: P, weight: 99999 });
  mk('gear', { id: 'G-XSS3', name: P, door: 302, where: P, shelf: 'A', status: 'REVISIÓN', rev: { state: 'taller', since: todayISO(), where: P, reason: P }, nov: { text: P, ts: t, by: P } });
  mk('gear', { id: 'G-XSS2', name: P, door: 0, shelf: 'A', status: 'OPERATIVO', out: { who: P, since: t, note: P } });
  mk('consumables', { id: 'CO-XSS', name: P + LONG, stock: 0, min: 99999, unit: P, place: P });
  ['OP-01', 'OP-02'].forEach(id => { const o = get('operators', id); mk('operators', { ...o, name: id === 'OP-02' ? P : o.name, role: P, cell: id === 'OP-02' ? P : o.cell, phone: '"><img src=x onerror=__xss(\'tel\')>', email: P,
    empleo: P, peloton: id === 'OP-02' ? P : 'PIEN 1', esp: 'Res. Acuático', eq: ['sva'], moto: { tipo: 'T', eq: P, aut: P }, aus: { motivo: P, nota: P, desde: todayISO(), hasta: '' } }); });
  mk('readiness', { id: 'OP-01', fullName: P, passportNo: P, passportExp: todayISO(), emergencyName: P, emergencyPhone: P });
  mk('epis', { id: 'EPI-XSS', type: 'otro', name: P, holder: 'OP-01', size: P, status: 'REVISAR', notes: P });
  addLog(P); commit(); setPref({ activeOperator: get('operators', 'OP-01').name });
})()"""

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    c.add_init_script("window.__hits = []; window.__xss = k => window.__hits.push(k + ' @ ' + (window.__where || '?'));")
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR [{a.evaluate("window.__where") if not a.is_closed() else ""}] {e}'))
    a.on('console', lambda m: m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'net::' not in m.text and problems.append(f'console: {m.text}'))
    a.on('dialog', lambda d: d.dismiss())
    a.goto(APP); a.wait_for_selector('#view > *')
    a.evaluate("window.print = () => {}; window.open = () => null;")
    a.evaluate(SEED); a.wait_for_timeout(300)

    def at(where, js):
        a.evaluate(f"window.__where = {where!r}")
        try: a.evaluate(js); a.wait_for_timeout(120)
        except Exception as e: problems.append(f'FALLO en {where}: {str(e).splitlines()[0]}'); return
        txt = a.evaluate("(document.querySelector('#view')?.innerText || '') + ' ' + (document.querySelector('#modal:not(.hidden)')?.innerText || '')")
        for bad in ['undefined', 'NaN', '[object Object]']:
            if bad in txt: problems.append(f'se ve «{bad}» en {where}')

    for tab in a.evaluate("Object.keys(VIEWS)"):
        at(f'pantalla {tab}', f"go('{tab}')")
    for ap in a.evaluate("Object.keys(APARTADOS)"):
        for pt in ['equipo', 'material', 'notas']:
            at(f'{ap}/{pt}', f"setPref({{ tab: '{ap}', aptab: '{pt}' }})")
    for pt in ['datos', 'docs', 'epi', 'mat']: at(f'persona OP-01/{pt}', f"openPerson('OP-01'); setPref({{ ptab: '{pt}' }})")
    at('persona OP-01', "openPerson('OP-01')"); at('persona OP-02', "openPerson('OP-02')")
    calls = ["gearDetail('G-XSS')", "gearDetail('G-XSS3')", "revForm('G-XSS3')", "novForm('gear', 'G-XSS3')", "cellModal(302)", "gearDetail('G-XSS2')", "boxDetail('K-XSS')", "eventDetail('E-XSS')", "docDetail('D-XSS')",
             "vehicleView('V-XSS')", "vehicleForm('V-XSS')", "matForm('veh:V-XSS', 'ME-XSS2')", "matRevista('veh:V-XSS')", "matForm('ap:agua', 'ME-XSS')", "matRevista('ap:agua')", "apNotaForm('agua')",
             "personForm('OP-02')", "ausenciaForm('OP-02')", "pasarLista()", "sierParte()", "epiForm('EPI-XSS')", "eventForm('E-XSS')",
             "printBoxLabels()", "printPersonCards()", "printManifest()", "printLabels(3)",
             "go('contenedor'); setPref({ cside: 'izq' })", "go('revision')", "go('armarios')", "go('pasillo')", "go('otros')"]
    for js in calls:
        at(js, f"closeModal(); {js}")
    # Buscador con código
    at('buscador', "closeModal(); toggleSearch(); $('search').value = '<img src=x onerror=__xss(1)>'; renderSearch()")
    at('buscador 2', "$('search').value = 'aleksandra'; renderSearch()")
    # Enlaces con código en el hash (#g= de los QR)
    at('hash', "location.hash = '#g=' + encodeURIComponent('\"><img src=x onerror=__xss(2)>')"); a.wait_for_timeout(300)
    a.screenshot(path=f'{OUT}/seguridad.png', full_page=True)

    # Datos manipulados en la nube o en una copia: números con código, identificadores con comillas, fotos que no son fotos.
    # Entran por el mismo filtro que la sincronización (cleanRec) y no deben ejecutar nada.
    a.evaluate("""(() => { const P = `'"><img src=x onerror=__xss('num')>`; const d = Object.fromEntries(KINDS.map(k => [k, list(k)]));
      const NUM = /^(qty|stock|min|weight|seats|tare|n|num|bar|litres|floors|pos|len|wid|hei|volume|priority|phase|door)$/;
      KINDS.forEach(k => d[k].forEach(r => Object.keys(r).forEach(f => { if (NUM.test(f)) r[f] = P; })));
      d.gear.push({ id: "G-1');__xss('id');//", name: 'Malo', door: 1, shelf: 'A', status: 'OPERATIVO' });
      d.gear.forEach(g => { if (g.id === 'G-XSS') g.box = "K-1');__xss('ref');//"; });
      d.docs.forEach(x => { x.imgs = ['x" onerror=__xss(5) x="']; });
      replaceAll(normalize(d), 'prueba'); })()"""); a.wait_for_timeout(300)
    assert not a.evaluate("get('gear', \"G-1');__xss('id');//\")"), 'un identificador con comillas no debe entrar'
    for tab in a.evaluate("Object.keys(VIEWS)"):
        at(f'manipulado {tab}', f"go('{tab}')")
    for js in calls: at('manipulado ' + js, f"closeModal(); {js}")
    at('manipulado persona', "closeModal(); openPerson('OP-01')")

    hits = a.evaluate("window.__hits")
    if hits: problems.append(f'XSS ejecutado: {sorted(set(hits))}')
    # Ningún enlace o imagen con javascript:
    bad = a.evaluate("[...document.querySelectorAll('[href^=\"javascript\"], [src^=\"javascript\"]')].length")
    if bad: problems.append(f'{bad} enlaces javascript:')

    # Peor caso visual: nada se sale del ancho del móvil
    for tab in ['personal', 'contenedor', 'vehiculos', 'consumibles', 'calendario']:
        a.evaluate(f"closeModal(); clearSearch(); go('{tab}')"); a.wait_for_timeout(150)
        w = a.evaluate("document.documentElement.scrollWidth")
        if w > 392: problems.append(f'{tab}: la página se sale de ancho ({w}px)')
    for js, nombre in [("openPerson('OP-02')", 'ficha de persona'), ("setPref({ tab: 'agua', aptab: 'material' })", 'material de un apartado')]:
        a.evaluate(js); a.wait_for_timeout(150)
        if a.evaluate("document.documentElement.scrollWidth") > 392: problems.append(f'{nombre}: la página se sale de ancho')
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: [print(' -', x) for x in problems]; sys.exit(1)
