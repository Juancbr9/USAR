"""Dos móviles que cambian lo mismo a la vez no se pisan: cada uno envía su cambio solo si el registro sigue como lo
conocía; si otro lo cambió entretanto, se combinan (lo cambiado por uno solo se queda, en las listas se suma lo de cada
uno y en el mismo dato gana el último en enviarse) y los dos móviles acaban igual. No depende de la hora de cada móvil.
Uso: python3 tests/test_conflictos.py  (con la app en APP_URL y el servidor de prueba, recién arrancado, en MOCK_URL)"""
import os, json, urllib.request
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
MOCK = os.environ.get('MOCK_URL', 'http://127.0.0.1:54321')
problems = []
def watch(pg, tag):
    pg.on('pageerror', lambda e: problems.append(f'{tag} ERROR {e}'))
    pg.on('console', lambda m: m.type == 'error' and 'ERR_INTERNET_DISCONNECTED' not in m.text and 'Failed to load resource' not in m.text and problems.append(f'{tag} {m.text}'))
    pg.on('dialog', lambda d: d.accept())
def get(path): return json.load(urllib.request.urlopen(MOCK + path))
def server(kind, id): return next(r for r in get('/_dump') if r['kind'] == kind and r['id'] == id)
def raw(row):   # otro móvil escribe directamente en el servidor
    urllib.request.urlopen(urllib.request.Request(MOCK + '/_raw', data=json.dumps(row).encode(), headers={'Content-Type': 'application/json'}, method='POST'))
def synced(pg): pg.wait_for_function("Sync.pending === 0 && Sync.status === 'online'", timeout=15000)
def offline(ctx, pg, off):
    ctx.set_offline(off); pg.evaluate(f"dispatchEvent(new Event('{'offline' if off else 'online'}'))")
M = "get('missions', 'M-T')"

with sync_playwright() as p:
    br = p.chromium.launch()
    phone = dict(bypass_csp=True, viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True, supa=MOCK)
    A = br.new_context(**phone); a = A.new_page(); watch(a, 'A'); a.goto(APP); a.wait_for_selector('#view > *'); synced(a)
    B = br.new_context(**phone); b = B.new_page(); watch(b, 'B'); b.goto(APP); b.wait_for_selector('#view > *'); synced(b)
    b.wait_for_function("list('gear').length > 100", timeout=15000)
    assert a.evaluate("Object.keys(JSON.parse(localStorage.getItem(KEY.base) || '{}')).length") > 100, 'A recuerda la versión del servidor de lo que envió'

    # Una operación que tienen los dos
    a.evaluate(f"put('missions', {{ id: 'M-T', type: 'ejercicio', title: 'Prueba', status: 'active', date: localNow(), pars: [], sectors: [], comms: [] }})"); synced(a)
    b.evaluate("Sync.pull()"); b.wait_for_function(f"!!{M}", timeout=10000)

    # 1) Sin conexión los dos: A anota un recuento y cambia el título; B añade un sector y también cambia el título.
    #    Al volver, los dos tienen el recuento y el sector, y el título del último que envía (B)
    offline(A, a, True); offline(B, b, True)
    a.evaluate(f"const m = {M}; put('missions', {{ ...m, title: 'Título A', pars: [...m.pars, {{ ts: 1, total: 5, here: 5, by: 'A' }}] }})")
    b.evaluate(f"const m = {M}; put('missions', {{ ...m, title: 'Título B', sectors: [...m.sectors, {{ letter: 'A', name: 'Norte' }}] }})")
    offline(A, a, False); synced(a)
    offline(B, b, False); synced(b)
    a.evaluate("Sync.pull()"); a.wait_for_function(f"{M}.sectors.length === 1", timeout=10000)
    for pg in (a, b):
        m = pg.evaluate(M)
        assert len(m['pars']) == 1 and len(m['sectors']) == 1 and m['title'] == 'Título B', m
    s = server('missions', 'M-T')['data']; assert len(s['pars']) == 1 and len(s['sectors']) == 1 and s['title'] == 'Título B', s
    print('Cambios a la vez sin conexión: se juntan')

    # 2) Otro móvil cambia la operación en el servidor justo antes de que A envíe el suyo: el envío de A no lo pisa
    before = get('/_stats')['conflictos']
    row = server('missions', 'M-T'); row['data'] = {**row['data'], 'comms': [{'func': 'Mando', 'channel': 'TETRA 2'}]}; raw(row)
    a.evaluate(f"const m = {M}; put('missions', {{ ...m, pars: [...m.pars, {{ ts: 2, total: 6, here: 6, by: 'A' }}] }})"); synced(a)
    s = server('missions', 'M-T')['data']
    assert len(s['pars']) == 2 and s['comms'] == [{'func': 'Mando', 'channel': 'TETRA 2'}], s
    assert get('/_stats')['conflictos'] > before, 'A tuvo que combinar con la versión nueva'
    assert a.evaluate(f"{M}.comms.length") == 1, 'A se queda también con lo del otro'
    print('Envío sobre una versión antigua: se combina, no se pisa')

    # 3) Borrar frente a cambiar: A borra un equipo mientras B (sin conexión) lo cambia de sitio → queda borrado en los dos
    gid = a.evaluate("list('gear').find(g => g.door === 2).id")
    offline(B, b, True)
    b.evaluate(f"moveGear('{gid}', 3)")
    a.evaluate(f"remove('gear', '{gid}')"); synced(a)
    offline(B, b, False); synced(b); a.evaluate("Sync.pull()"); a.wait_for_timeout(500)
    assert a.evaluate(f"get('gear', '{gid}')") is None and b.evaluate(f"get('gear', '{gid}')") is None and server('gear', gid)['deleted']
    print('Borrado frente a cambio: queda borrado')

    # 4) La hora del móvil no importa: B va una hora atrasado y aun así su cambio, posterior, llega a A
    b.evaluate("const now = Date.now; Date.now = () => now() - 3600e3")
    b.evaluate(f"const m = {M}; put('missions', {{ ...m, title: 'Desde B, con la hora mal' }})"); synced(b)
    a.evaluate("Sync.pull()"); a.wait_for_function(f"{M}.title === 'Desde B, con la hora mal'", timeout=10000)
    print('Hora del móvil atrasada: no importa')

    # merge3 por sí solo: listas con id, quitar lo que quitó uno, objetos campo a campo
    r = a.evaluate("""Sync.merge3(
      { id: 'x', a: 1, l: [{ id: 1, v: 'a' }, { id: 2, v: 'b' }], o: { p: 1, q: 1 } },
      { id: 'x', a: 2, l: [{ id: 1, v: 'a2' }, { id: 3, v: 'c' }], o: { p: 2, q: 1 } },
      { id: 'x', a: 1, l: [{ id: 1, v: 'a' }, { id: 2, v: 'b' }, { id: 4, v: 'd' }], o: { p: 1, q: 3 } })""")
    assert r['a'] == 2 and r['o'] == {'p': 2, 'q': 3} and sorted(x['id'] for x in r['l']) == [1, 3, 4] and r['l'][0]['v'] == 'a2', r
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
