"""Matrículas de la flota (hoja de vehículos y pizarra de ITV): cada modelo guarda las suyas con ITV, cita, destino,
titular y suplente. Una matrícula se pasa a otro modelo (ATB M1/M2) y cambia su dibujo; la ITV sale en Vencimientos.
La autobomba Renault viene vacía y en su ficha se ve con cada módulo; los modelos con módulo de antes pasan a ella.
Uso: python3 tests/test_matriculas.py  (con la app servida en APP_URL)"""
import os, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
OUT = pathlib.Path(os.environ.get('TEST_OUT', pathlib.Path(__file__).resolve().parent / 'output')); OUT.mkdir(parents=True, exist_ok=True)
problems = []

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *')
    n = lambda vid: a.evaluate(f"(get('vehicles', '{vid}')?.units || []).length")
    assert [n('V-AMAROK'), n('V-SANGYONG'), n('V-ATB-M1'), n('V-AB-CHASIS'), n('V-VPI'), n('V-RQ-GE')] == [3, 6, 9, 2, 1, 3]
    total = a.evaluate("list('vehicles').reduce((s, v) => s + (v.units || []).length, 0)")
    assert total == 47, total
    assert a.evaluate("get('vehicles', 'V-VPI').units[0].plate") == 'ET-121338'
    u = a.evaluate("get('vehicles', 'V-ATB-M1').units.find(u => u.plate === 'ET-110940')")
    assert u['itv'] == '2026-10-29' and u['cita'] == '28/10 11:00' and u['titular'] == 'CBO Cuñat', u
    # Al volver a arrancar no se duplica nada
    a.reload(); a.wait_for_selector('#view > *'); assert a.evaluate("list('vehicles').reduce((s, v) => s + (v.units || []).length, 0)") == 47

    # Vencimientos: las ITV, con la cita
    a.evaluate("setPref({ tab: 'avisos', vwin: 0 })"); a.wait_for_timeout(200)
    t = a.inner_text('#view'); assert 'ET-110940' in t and 'cita 28/10 11:00' in t and 'ITV' in t

    # ITV: al llegar la fecha, Inicio pregunta si la ha pasado; se apunta el resultado, los fallos y la próxima fecha
    a.evaluate("(() => { const v = get('vehicles', 'V-VPI'); put('vehicles', { ...v, units: v.units.map(u => ({ ...u, itv: todayISO() })) }); setPref({ tab: 'avisos' }); })()"); a.wait_for_timeout(200)
    itv = '.area-panel:has-text("ITV: ¿la han pasado?") .item:has-text("ET-121338")'
    assert a.locator(itv).count() == 1
    a.click(itv); a.wait_for_selector('#modalForm [name=res]')
    a.select_option('#modalForm [name=res]', 'desfavorable'); a.fill('#modalForm [name=next]', '2026-12-01'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert a.evaluate("get('vehicles', 'V-VPI').units[0].itvs") is None, 'desfavorable sin fallos: pide apuntarlos'
    a.fill('#modalForm [name=defects]', 'Luz de matrícula fundida'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    u = a.evaluate("get('vehicles', 'V-VPI').units[0]")
    assert u['itv'] == '2026-12-01' and u['itvs'][0]['res'] == 'desfavorable' and u['itvs'][0]['defects'] == 'Luz de matrícula fundida', u
    assert 'ITV' in a.inner_text('#modal') and 'Luz de matrícula fundida' in a.inner_text('#modal'), 'la ficha del vehículo muestra la última ITV'
    a.keyboard.press('Escape'); a.evaluate("render()"); a.wait_for_timeout(150); assert a.locator(itv).count() == 0, 'el aviso desaparece'
    # Editar la matrícula no borra su historial de ITV
    a.evaluate("unitForm('V-VPI', get('vehicles', 'V-VPI').units[0].id)"); a.wait_for_selector('#modalForm [name=plate]'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    assert len(a.evaluate("get('vehicles', 'V-VPI').units[0].itvs")) == 1
    a.keyboard.press('Escape')

    # Quien gestiona la flota (en las pruebas, GRANADOS) pasa la ATB 110940 a M2 desde su ficha: cambia de modelo y de dibujo
    a.evaluate("setPref({ tab: 'vehiculos' })"); a.wait_for_timeout(200)
    assert '9 matrículas' in a.inner_text('#view')
    a.screenshot(path=f'{OUT}/vehiculos-matriculas.png', full_page=True)
    a.evaluate("vehicleForm('V-ATB-M1')"); a.wait_for_selector('#modal .units-list')
    a.screenshot(path=f'{OUT}/vehiculo-matriculas-ficha.png')
    a.click('#modal .units-list button:has-text("ET-110940")'); a.wait_for_selector('#modalForm [name=vid]')
    a.select_option('#modalForm [name=vid]', 'V-ATB-M2'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(300)
    assert [n('V-ATB-M1'), n('V-ATB-M2')] == [8, 1]
    assert 'v-atb-m2.webp' in a.evaluate("vehArt(get('vehicles', 'V-ATB-M2'))")
    # Autobomba Renault: un solo modelo, vacía detrás (ya no hay modelos con módulo)
    assert a.evaluate("get('vehicles', 'V-AB-CHASIS').name") == 'Autobomba Renault'
    assert a.evaluate("['V-AB-CONT', 'V-AB-CONT2', 'V-AB-LCIF'].filter(id => get('vehicles', id)).length") == 0
    assert 'v-ab-lcif.webp' in a.evaluate("vehArt(get('vehicles', 'V-AB-CHASIS'))"), 'de serie, con el módulo LCIF'
    assert 'v-ab-chasis.webp' in a.evaluate("vehArt(get('vehicles', 'V-AB-CHASIS'), '', '')")
    a.keyboard.press('Escape')
    # Matrícula repetida: no se admite
    a.keyboard.press('Escape')
    a.evaluate("unitForm('V-AMAROK')"); a.wait_for_selector('#modalForm [name=plate]')
    a.fill('#modalForm [name=plate]', 'et 124277'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(300)
    assert n('V-AMAROK') == 3 and n('V-SANGYONG') == 6

    # Cada matrícula de la Renault tiene su configuración (de serie, el módulo LCIF), su pelotón y su material
    ren = a.evaluate("unitsOf_(get('vehicles', 'V-AB-CHASIS')).map(u => [u.id, u.plate, unitPel(u), unitMod(u)])")
    assert [r[2:] for r in ren] == [['PIEN 1', 'lcif'], ['PIEN 2', 'lcif']], ren
    a.evaluate("vehicleView('V-AB-CHASIS')"); a.wait_for_selector('#modal .veh-u'); assert a.locator('#modal .veh-u').count() == 2
    a.click(f'#modal .veh-u:has-text("{ren[0][1]}")'); a.wait_for_selector('#modal .uni-datos')
    dat = ' '.join(a.inner_text('#modal .uni-datos').split()); assert 'Asignado a PIEN 1' in dat and 'Configuración Módulo LCIF' in dat, dat
    assert 'v-ab-lcif.webp' in a.get_attribute('#modal .veh-hero img', 'src')
    a.click('#modal button:has-text("Editar matrícula")'); a.wait_for_selector('#modalForm [name=mod]'); assert a.input_value('[name=mod]') == 'lcif' and a.input_value('[name=pel]') == 'PIEN 1'
    a.select_option('[name=mod]', 'cont2'); a.select_option('[name=pel]', 'Común'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .uni-datos')
    assert 'v-ab-cont2.webp' in a.get_attribute('#modal .veh-hero img', 'src') and a.evaluate(f"unitPel(get('vehicles', 'V-AB-CHASIS').units.find(u => u.id === '{ren[0][0]}'))") == 'Común'
    assert a.evaluate(f"unitMod(get('vehicles', 'V-AB-CHASIS').units.find(u => u.id === '{ren[1][0]}'))") == 'lcif', 'la otra matrícula sigue con la suya'
    # El material es de cada matrícula: lo de una no sale en la otra
    a.click('#modal .veh-mat button:has-text("Material")'); a.wait_for_selector('#modal [name=name]'); assert a.input_value('[name=unit]') == ren[0][0]
    a.fill('[name=name]', 'Mangotes'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .veh-mat .list .item')
    assert a.evaluate(f"[matDe({{ veh: 'V-AB-CHASIS', unit: '{ren[0][0]}' }}).length, matDe({{ veh: 'V-AB-CHASIS', unit: '{ren[1][0]}' }}).length, matDe({{ veh: 'V-AB-CHASIS' }}).length]") == [1, 0, 1]
    # Checklist de la matrícula: el vehículo y su material, con lo que falta o está roto, quién lo hizo, y aviso cada cierto tiempo
    a.click('#modal .veh-mat button:has-text("Checklist")'); a.wait_for_selector('#modal .est-row'); assert a.locator('#modal .est-row').count() == 1 and a.locator('#modalForm [name=km]').count() == 1
    a.click('#modal .est-row:has-text("Mangotes") .est-roto'); a.fill('#modal .est-row:has-text("Mangotes") .est-nota', 'Junta rajada'); a.fill('#modalForm [name=km]', '1200')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .uni-datos')
    vc = a.evaluate("list('vchecks').sort((x, y) => y.date - x.date)[0]"); assert vc['unit'] == ren[0][0] and vc['by'] == 'GRANADOS' and vc['mat'] == [{'id': vc['mat'][0]['id'], 'name': 'Mangotes', 'st': 'roto', 'nota': 'Junta rajada'}] and vc['km'] == 1200, vc
    assert a.evaluate(f"matDe({{ veh: 'V-AB-CHASIS', unit: '{ren[0][0]}' }})[0].status") == 'AVERIADO' and 'Mal: Mangotes' in a.inner_text('#modal .chk-ult')
    assert a.evaluate("needsAbiertas('veh').map(n => n.text + ' | ' + n.nota)") == [f'Mangotes (roto) | Autobomba Renault {ren[0][1]}: Junta rajada'], 'lo roto pasa a Necesidades'
    a.click('#modal .chk-ult .link'); a.wait_for_selector('#modal .chk-hist'); h = ' '.join(a.inner_text('#modal .chk-hist').split()); assert 'GRANADOS' in h and 'Roto: Mangotes (Junta rajada)' in h and '1200 km' in h, h
    a.click('#modal button:has-text("Volver al vehículo")'); a.wait_for_selector('#modal .mat-cada select'); a.select_option('#modal .mat-cada select', '7'); a.wait_for_selector('#modal .uni-datos')
    assert a.evaluate(f"revFalta('veh:V-AB-CHASIS#{ren[0][0]}')") == 7 and a.evaluate(f"revFalta('veh:V-AB-CHASIS#{ren[1][0]}')") is None
    a.evaluate(f"revCadaSet('veh:V-AB-CHASIS#{ren[1][0]}', 7)"); a.wait_for_timeout(200)
    assert a.evaluate("revPendientes().map(r => r[0])") == [f'veh:V-AB-CHASIS#{ren[1][0]}'], 'a la que nunca se le ha hecho, ya le toca'
    a.evaluate("closeModal(); setPref({ tab: 'vehiculos', vehVista: 'pel', vehGrupo: 'todos' })"); a.wait_for_timeout(250)
    assert a.locator(f'#view .veh-u:has-text("{ren[1][1]}") .tag:has-text("Toca checklist")').count() == 1 and a.locator(f'#view .veh-u:has-text("{ren[0][1]}") .tag.bad:has-text("falta o está roto")').count() == 1
    assert ' '.join(a.inner_text('#view .veh-res').split()).endswith('Toca checklist 1')
    # Cofres: el modelo tiene su reparto (de serie en las autobombas) y cada material dice en cuál va; el dibujo cuenta lo de cada uno
    o0 = f'veh:V-AB-CHASIS#{ren[0][0]}'; o1 = f'veh:V-AB-CHASIS#{ren[1][0]}'
    assert a.evaluate("cofresDe(get('vehicles', RENAULT)).map(c => c[0]).join()") == 'CAB,I1,I2,I3,TECHO,D1,D2,D3,TRAS' and a.evaluate("cofresDe(get('vehicles', 'V-AMAROK')).length") == 0
    a.evaluate(f"unidadView(RENAULT, '{ren[0][0]}')"); a.wait_for_selector('#modal .cofres'); assert a.locator('#modal .cofres .cof').count() == 9
    a.click('#modal .cofres .cof:has-text("Izq. 2")'); a.wait_for_selector('#modal h3:has-text("Cofre izquierdo 2")'); assert 'Este cofre está vacío' in a.inner_text('#modal')
    a.click('#modal button:has-text("Material aquí")'); a.wait_for_selector('#modal [name=cofre]'); assert a.input_value('[name=cofre]') == 'I2'
    a.fill('[name=name]', 'Botiquín'); a.fill('[name=precinto]', 'P-0412'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .cofres')
    fila = a.inner_text('#modal .veh-mat .list .item:has-text("Botiquín")'); assert a.inner_text('#modal .cofres .cof:has-text("Izq. 2") b') == '1' and 'Cofre izquierdo 2' in fila and 'Precinto P-0412' in fila, fila
    a.evaluate(f"putMany('matesp', [['Extintor', 'CAB'], ['Calzos', 'TRAS'], ['Sin cofre', '']].map(([name, cofre], i) => ({{ id: 'ME-C' + i, veh: RENAULT, unit: '{ren[0][0]}', name, cofre, qty: 2, status: 'OPERATIVO' }}))); unidadView(RENAULT, '{ren[0][0]}')"); a.wait_for_selector('#modal .cofres')
    assert [' '.join(t.split('\n')[0].split()) for t in a.locator('#modal .veh-mat .list .item').all_inner_texts()][:4] == ['Extintor × 2', 'Botiquín', 'Calzos × 2', 'Mangotes'], 'la lista va por cofres: cabina, lados, techo y trasera; lo sin cofre, al final'
    assert 'Sin cofre: 2' in a.inner_text('#modal .cof-pie')
    # El checklist sale en ese mismo orden y lo precintado se da por bueno sin abrir; si se cambia el precinto, queda apuntado
    a.click('#modal .veh-mat button:has-text("Checklist")'); a.wait_for_selector('#modal .est-row')
    assert [' '.join(t.split('\n')[0].split()) for t in a.locator('#modal .est-row .est-t').all_inner_texts()][:3] == ['Extintor × 2', 'Botiquín', 'Calzos × 2'] and a.input_value('#modal .est-row:has-text("Botiquín") .est-pre input') == 'P-0412'
    a.fill('#modal .est-row:has-text("Botiquín") .est-pre input', 'P-0999'); a.locator('#modalForm .check-row:has-text("Neumáticos") input').uncheck(); a.fill('#modalForm [name=km]', '15200')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .uni-datos')
    assert a.evaluate(f"matDe(duenoDe('{o0}')).find(m => m.name === 'Botiquín').precinto") == 'P-0999' and a.evaluate("list('logs').some(l => l.action.includes('precinto P-0999 (antes P-0412)'))")
    # Incidencias: el fallo del checklist abre una; pasa a «en reparación» y a «resuelta» con un toque, con responsable y notas
    inc = a.evaluate(f"incAbiertas(RENAULT, '{ren[0][0]}')"); assert [i['text'] for i in inc] == ['Neumáticos'] and inc[0]['origen'] == 'checklist', inc
    assert a.locator('#modal .uni-tags .tag.bad:has-text("1 incidencia")').count() == 1 and a.evaluate("flotaEstado().filter(x => x.fallo).length") == 1
    a.click('#modal .veh-inc .item:has-text("Neumáticos") .link-row'); a.wait_for_selector('#modalForm [name=resp]'); a.select_option('[name=resp]', 'OP-02'); a.fill('[name=nota]', 'Pedido el cambio al taller')
    a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .veh-inc'); fila = a.inner_text('#modal .veh-inc .item:has-text("Neumáticos")'); assert 'La lleva' in fila and 'Pedido el cambio al taller' in fila, fila
    a.click('#modal .veh-inc .item:has-text("Neumáticos") .need-estado'); a.wait_for_timeout(250); assert a.evaluate(f"incAbiertas(RENAULT, '{ren[0][0]}')[0].st") == 'reparacion'
    a.click('#modal .veh-inc .sec-head button'); a.wait_for_selector('#modalForm [name=text]'); a.fill('[name=text]', 'Golpe en el cofre derecho'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .veh-inc')
    assert a.evaluate(f"incAbiertas(RENAULT, '{ren[0][0]}').length") == 2 and 'Incidencias (2)' in a.inner_text('#modal .veh-inc h3')
    a.evaluate("closeModal(); go('avisos')"); a.wait_for_timeout(350); av = ' '.join(a.inner_text('#view .area-panel:has(h3:has-text("Vehículos con fallos"))').split()); assert 'Neumáticos' in av and 'Golpe en el cofre derecho' in av, av
    # Otro checklist con los neumáticos bien cierra esa incidencia sola; la puesta a mano sigue abierta hasta que se resuelva
    a.evaluate(f"go('vehiculos'); checklistForm('{o0}')"); a.wait_for_selector('#modalForm [name=km]'); a.fill('#modalForm [name=km]', '15300'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .uni-datos')
    assert a.evaluate(f"incAbiertas(RENAULT, '{ren[0][0]}').map(i => i.text)") == ['Golpe en el cofre derecho'] and a.evaluate(f"incidencias(RENAULT, '{ren[0][0]}').find(i => i.text === 'Neumáticos').cierre.by") == 'GRANADOS'
    a.click('#modal .veh-inc .item:has-text("Golpe") .need-estado'); a.wait_for_timeout(250); a.click('#modal .veh-inc .item:has-text("Golpe") .need-estado'); a.wait_for_timeout(250)
    assert a.evaluate(f"incAbiertas(RENAULT, '{ren[0][0]}').length") == 0 and a.evaluate("flotaEstado().filter(x => x.fallo).length") == 0 and 'Resueltas (2)' in a.inner_text('#modal .veh-inc')
    # Mantenimiento: cada tantos kilómetros o meses; los kilómetros salen del último checklist; «Hecho hoy» lo pone al día
    a.click('#modal .veh-mant button:has-text("Empezar con lo habitual")'); a.wait_for_selector('#modal .veh-mant .log-row'); assert a.locator('#modal .veh-mant .log-row').count() == 4 and 'Kilómetros actuales: 15.300' in a.inner_text('#modal .veh-mant')
    a.click('#modal .veh-mant .log-row:has-text("Aceite y filtros")'); a.wait_for_selector('#modalForm [name=ultKm]'); assert a.input_value('[name=km]') == '15000' and a.input_value('[name=meses]') == '12'
    a.fill('[name=ult]', a.evaluate("todayISO()")); a.fill('[name=ultKm]', '800'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .veh-mant .log-row')
    assert 'faltan 500 km' in a.inner_text('#modal .veh-mant .log-row:has-text("Aceite y filtros")') and a.locator('#modal .veh-mant .log-row.warn:has-text("Aceite")').count() == 1 and a.locator('#modal .uni-tags .tag.warn:has-text("Mantenimiento")').count() == 1
    a.evaluate(f"(() => {{ const v = get('vehicles', RENAULT); put('vehicles', {{ ...v, units: v.units.map(u => u.id === '{ren[0][0]}' ? {{ ...u, mant: u.mant.map(m => m.name === 'Neumáticos' ? {{ ...m, ult: '2025-01-10' }} : m) }} : u) }}); unidadView(RENAULT, '{ren[0][0]}'); }})()"); a.wait_for_selector('#modal .veh-mant .log-row.bad')
    assert 'Toca' in a.inner_text('#modal .veh-mant .log-row:has-text("Neumáticos")') and a.evaluate("expiries().some(x => x.kind === 'Mantenimiento' && /Neumáticos/.test(x.what) && daysTo(x.date) < 0)")
    a.click('#modal .veh-mant .log-row:has-text("Neumáticos")'); a.wait_for_selector('#modal button:has-text("Hecho hoy")'); a.click('#modal button:has-text("Hecho hoy")'); a.wait_for_timeout(400)
    assert a.locator('#modal .veh-mant .log-row.bad').count() == 0 and a.evaluate(f"get('vehicles', RENAULT).units.find(u => u.id === '{ren[0][0]}').mant.find(m => m.name === 'Neumáticos').ultKm") == 15300
    # Copiar el material de una matrícula a la otra: nombres, cantidades y cofres; sin precintos; lo que ya tiene no se repite
    a.evaluate(f"unidadView(RENAULT, '{ren[1][0]}')"); a.wait_for_selector('#modal .veh-mat'); a.click('#modal .veh-mat button:has-text("Copiar de otra matrícula")'); a.wait_for_selector('#modalForm [name=de]')
    assert a.input_value('[name=de]') == o0; a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .veh-mat .list .item')
    cop = a.evaluate(f"matDe(duenoDe('{o1}')).filter(m => m.unit === '{ren[1][0]}').map(m => [m.name, m.qty, m.cofre, m.precinto || '', m.status])")
    assert sorted(cop) == sorted([['Botiquín', 1, 'I2', '', 'OPERATIVO'], ['Calzos', 2, 'TRAS', '', 'OPERATIVO'], ['Extintor', 2, 'CAB', '', 'OPERATIVO'], ['Mangotes', 1, '', '', 'OPERATIVO'], ['Sin cofre', 2, '', '', 'OPERATIVO']]), cop
    a.evaluate(f"matCopiar('{o1}')"); a.wait_for_selector('#modalForm [name=de]'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(300); assert 'Ya tenía todo' in a.inner_text('#toast')
    # Los cofres se cambian por modelo; lo de un cofre que desaparece queda sin cofre, no se borra
    a.evaluate(f"cofresForm(RENAULT, '{o0}')"); a.wait_for_selector('#modalForm [name=izq]'); a.fill('[name=izq]', '1'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_selector('#modal .cofres')
    assert a.locator('#modal .cofres .cof').count() == 7 and 'Sin cofre: 3' in a.inner_text('#modal .cof-pie')
    a.evaluate("closeModal(); list('issues').forEach(x => stamp('issues', { id: x.id, _del: true })); commit()"); a.wait_for_timeout(250)
    # Por pelotón: un botón por grupo con sus matrículas; los contenedores pequeños van aparte, como módulos con su material
    grupos = [' '.join(t.split()) for t in a.locator('#view .veh-grupos .chip').all_inner_texts()]; assert grupos[0].startswith('Todos') and any(g.startswith('PIEN 1') for g in grupos) and any(g.startswith('Común') for g in grupos), grupos
    a.click('#view .veh-grupos .chip:has-text("PIEN 2")'); a.wait_for_timeout(150)
    assert a.locator('#view .veh-grupo').count() == 1 and a.inner_text('#view .veh-grupo h3') == 'PIEN 2' and a.locator(f'#view .veh-u:has-text("{ren[1][1]}")').count() == 1 and a.locator(f'#view .veh-u:has-text("{ren[0][1]}")').count() == 0
    assert a.evaluate("['V-MOD-CONT', 'V-MOD-CONT2'].map(id => get('vehicles', id).tipo)") == ['modulo', 'modulo'] and a.evaluate("flotaEstado().some(x => esModulo(x.v))") is False
    a.click('#view .veh-mods-p .veh-item:has-text("Contenedor pequeño") >> nth=0'); a.wait_for_selector('#modal .veh-mat'); assert 'Dónde está' in a.inner_text('#modal') and a.locator('#modal [name=km]').count() == 0
    a.click('#modal button:has-text("Empezar con lo habitual")'); a.wait_for_selector('#modal .veh-mat .list .item'); a.click('#modal .veh-mat button:has-text("Checklist")'); a.wait_for_selector('#modal .est-row')
    assert a.locator('#modalForm [name=km]').count() == 0, 'un módulo no lleva lo del vehículo: solo su material'
    a.keyboard.press('Escape'); a.wait_for_timeout(250)
    a.evaluate("matDe({ veh: 'V-MOD-CONT' }).forEach(m => stamp('matesp', { id: m.id, _del: true })); matDe({ veh: 'V-AB-CHASIS' }).forEach(m => stamp('matesp', { id: m.id, _del: true })); needsAbiertas('veh').forEach(n => stamp('needs', { id: n.id, _del: true })); put('meta', { id: 'revcada', value: {} }); setPref({ vehGrupo: 'todos' })"); a.wait_for_timeout(200)

    # Migración v9: las matrículas de los modelos con módulo pasan a la Renault y las actividades guardan el módulo
    a.evaluate("""(() => { const d = JSON.parse(localStorage.getItem(KEY.db)), t = Date.now();
      d.vehicles['V-AB-LCIF'] = { id: 'V-AB-LCIF', name: 'Autobomba Renault (módulo LCIF)', units: [{ id: 'U-ET999', plate: 'ET-999' }], _u: t };
      d.vehicles['V-AB-CHASIS'] = { ...d.vehicles['V-AB-CHASIS'], name: 'Autobomba Renault (sin módulo)', notes: 'Elige el módulo que lleva en cada matrícula', _u: t };
      d.moves['MV-T'] = { id: 'MV-T', title: 'Prueba', vehicles: [{ key: 'k1', id: 'V-AB-LCIF', plate: 'ET-999' }], _u: t };
      d.meta.vehbase = { id: 'vehbase', value: 8, _u: t }; localStorage.setItem(KEY.db, JSON.stringify(d)); })()""")
    a.reload(); a.wait_for_selector('#view > *')
    r = a.evaluate("[get('vehicles', 'V-AB-LCIF'), get('vehicles', 'V-AB-CHASIS').name, get('vehicles', 'V-AB-CHASIS').notes, get('vehicles', 'V-AB-CHASIS').units.some(u => u.plate === 'ET-999'), get('moves', 'MV-T').vehicles[0]]")
    assert r[:4] == [None, 'Autobomba Renault', '', True] and r[4]['id'] == 'V-AB-CHASIS' and r[4]['mod'] == 'lcif', r
    br.close()

print('PROBLEMAS:', problems or 'ninguno')
if problems: raise SystemExit(1)
