"""Prueba de la base de datos del personal y de las listas personalizables:
ficha con foto y teléfono, documentos con fotos (IndexedDB) y caducidad, avisos, «➕ Otra…» en los desplegables,
editor de listas, recordar el último valor, vencimientos, búsqueda y copia de seguridad con imágenes.
Uso: python3 tests/test_personal.py  (con la app servida en APP_URL)"""
import os, sys, json, pathlib, datetime
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
PNG = str(ROOT / 'icon-512.png')
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, accept_downloads=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('console', lambda m: m.type in ('warning', 'error') and 'ERR_TUNNEL' not in m.text and problems.append(f'{m.type}: {m.text}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *')
    more = lambda n: sesion.menu(a, n)
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(400))
    soon = (datetime.date.today() + datetime.timedelta(days=100)).isoformat()

    # Ficha: teléfono y foto
    more('Personal'); a.click('.item:has-text("GRANADOS")')
    a.click('button:has-text("Editar datos")'); a.fill('[name=phone]', '600 111 222')
    a.set_input_files('#modalForm input[type=file]', PNG); a.wait_for_timeout(500); save()
    assert a.locator('a[href="tel:600111222"]').count() == 1
    a.wait_for_timeout(300); assert a.evaluate("document.querySelector('.person-photo')?.src?.startsWith('data:image')"), 'la foto de la persona no se ve'

    # Documento: pasaporte con foto, caduca en 100 días → aviso (6 meses)
    a.click('.ptabs .ctab:has-text("Documentos")'); a.wait_for_timeout(150)
    a.click('.btn:has-text("Documento")'); a.select_option('[name=type]', 'Pasaporte'); a.fill('[name=number]', 'PAB998877')
    a.fill('[name=expires]', soon); a.locator('#modalForm [data-photo]').first.locator('input[type=file]').first.set_input_files(PNG); a.wait_for_timeout(500); save()
    d = a.evaluate("list('docs')[0]"); assert d['type'] == 'Pasaporte' and len(d['imgs']) == 1, d
    assert a.evaluate(f"Img.get('{d['imgs'][0]}').then(x => !!x)"), 'la foto del documento no se guardó'
    assert a.evaluate("get('readiness', 'OP-01').passportNo") == 'PAB998877', 'el pasaporte debe pasar al alistamiento'
    assert 'Pasaporte' in a.evaluate("readinessIssues('OP-01').map(i => i[1]).join()"), 'debe avisar del pasaporte'
    assert a.locator('.doc-card .tag.warn').count() == 1
    a.click('.doc-card'); a.wait_for_timeout(300); assert a.evaluate("document.querySelector('.doc-full').src.startsWith('data:image')")
    assert '•••8877' in a.text_content('#modal'); a.click('.reveal'); assert 'PAB998877' in a.text_content('#modal')
    a.keyboard.press('Escape')

    # «➕ Otra…» en un desplegable: nuevo tipo de documento que queda en la lista
    a.click('.btn:has-text("Documento")'); a.select_option('[name=type]', '__new'); a.fill('#modalForm input[name=type]', 'Licencia de piloto de dron'); save()
    assert 'Licencia de piloto de dron' in a.evaluate("catalog('docTypes')")
    a.screenshot(path=f'{OUT}/personal-ficha.png', full_page=True)

    # Editor de listas: ocultar una de serie y añadir otra propia
    more('Listas'); a.click('.menu-item:has-text("Tipos de documento")')
    a.locator('#modal .item:has-text("Seguro de accidentes") button').click(); a.wait_for_timeout(150)
    assert 'Seguro de accidentes' not in a.evaluate("catalog('docTypes')")
    a.fill('#optForm [name=label]', 'Permiso de trabajo en altura'); a.click('#optForm button'); a.wait_for_timeout(150)
    assert 'Permiso de trabajo en altura' in a.evaluate("catalog('docTypes')")
    a.keyboard.press('Escape')

    # Recordar el último valor: el tipo de bien cultural y la frase rápida del diario editable
    a.evaluate("prefs.last = { herType: 'Orfebrería' }")
    assert a.evaluate("(() => { const f = [{ k: 'type', catalog: 'herTypes', carry: 'herType' }]; openForm('x', f, () => {}); const v = document.querySelector('#modalForm [name=type]').value; closeModal(); return v; })()") == 'Orfebrería'

    # Vencimientos y búsqueda
    more('Vencimientos'); a.click('.chip:has-text("1 año")'); a.wait_for_timeout(150)
    assert a.locator('.item:has-text("Pasaporte de GRANADOS")').count() == 1
    a.screenshot(path=f'{OUT}/vencimientos.png', full_page=True)
    a.click('[aria-label="Buscar"], #searchBtn, button[onclick="toggleSearch()"]'); a.fill('#search', 'PAB998877'); a.dispatch_event('#search', 'input'); a.wait_for_timeout(200)
    assert a.locator('#results .item:has-text("Pasaporte de GRANADOS")').count() == 1, 'la búsqueda debe encontrar documentos'

    # Copia de seguridad con las imágenes
    a.click('#results button.link'); more('Ajustes')
    with a.expect_download() as dl: a.click('button:has-text("Exportar copia")')
    data = json.load(open(dl.value.path()))
    assert any(k.startswith('doc:') for k in data.get('images', {})) and data['docs'], 'la copia debe incluir documentos e imágenes'
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
