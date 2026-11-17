"""Prueba de que ningún texto se sale de su recuadro ni se corta: recorre todas las pantallas y las ventanas principales
en un móvil pequeño con «Botones y letra grandes», en un móvil normal y en un PC, con nombres y textos largos, y mide
cada texto contra el recuadro que lo contiene (fila, botón, etiqueta, panel…) y contra el ancho de la pantalla.
Uso: python3 tests/test_desbordes.py  (con la app servida en APP_URL)"""
import os, sys, pathlib
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
problems = []
# Personal inventado (nunca nombres reales: el repositorio es público), con un nombre largo a propósito
LIST = """AGUA; SGT 1º; AGUA PRUEBA, SEIS; PIEN 1; Res. Acuático; 600000006; SVA, MOTO T 3/68
BUZONAVEGANTE; SDO; BUZO PRUEBA LARGUISIMO, SIETE; PIEN 2; Res. Acuático; 600000007; RPAS
RIO; CBO 1º; RIO PRUEBA, NUEVE; PIEN 2; Res. Acuático; 600000009; MOTO S 8/45
CUERDAS; BG; CUERDAS PRUEBA, CINCO; PLMSecc; Res. Terrestre; 600000005;
"""
JS = r"""() => {
  const out = [], vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0; };
  const root = document.querySelector('#modal:not(.hidden) .sheet') || document.querySelector('#drawer:not(.hidden) .drawer-panel') || document.getElementById('view');
  const caja = e => { for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) { const s = getComputedStyle(n);
      if (/(auto|scroll)/.test(s.overflowX)) return null;   // dentro de algo que se desplaza: no cuenta
      if (n.matches('.panel, .item, .btn, .tag, .chip, .sier-kpi, .esp-tile, .est-row, .log-row, .meter, .sheet, .hero, .tok, td, th, .dr-item, .ctab, .mv-op, .plano-p, .check-row, .callout, .lista-f, .well, .seg-row > *')) return n; } return null; };
  root.querySelectorAll('*').forEach(e => {
    if (!vis(e) || e.closest('.sr-only, svg, .px, .cv-grid, .cvi, .arm, .cq, .tok-ghost, canvas, .apu-svg, .login')) return;
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) return;
    const r = e.getBoundingClientRect(), s = getComputedStyle(e), t = e.textContent.trim().replace(/\s+/g, ' ').slice(0, 40), c = caja(e);
    const sel = (e.closest('[class]')?.className || e.tagName).toString().split(' ').slice(0, 2).join('.');
    // 1) se sale de su recuadro
    if (c) { const cr = c.getBoundingClientRect(); if (r.right > cr.right + 1.5 || r.left < cr.left - 1.5) out.push(['SALE', sel, t, Math.round(r.right - cr.right)]); }

    if (e.scrollHeight > e.clientHeight + 2 && /hidden|clip/.test(s.overflowY) && e.clientHeight > 0 && !e.matches('.sheet, textarea')) out.push(['CORTA-V', sel, t, e.scrollHeight - e.clientHeight]);
    // 2) se corta sin puntos suspensivos (letras partidas)
    if (e.scrollWidth > e.clientWidth + 1 && /hidden|clip/.test(s.overflowX) && s.textOverflow !== 'ellipsis' && s.display !== 'inline') out.push(['CORTA', sel, t, e.scrollWidth - e.clientWidth]);
    // 3) se sale de la pantalla
    if (r.right > innerWidth + 1.5 && !e.closest('.px-scroll, .cq-scroll, .ctabs, .chips, table')) out.push(['PANTALLA', sel, t, Math.round(r.right - innerWidth)]);
  });
  if (document.documentElement.scrollWidth > innerWidth + 1) out.push(['PAGINA', 'html', '', document.documentElement.scrollWidth - innerWidth]);
  return out; }"""
PAGES = [("go('%s')" % t, t) for t in ['avisos', 'recursos', 'personal', 'vehiculos', 'almacen', 'parque', 'calendario', 'contenedor', 'fuera', 'revision', 'revista', 'epi', 'agua', 'cuerdas', 'moto', 'ajustes', 'listas', 'guia', 'apuntalamientos']] + [
  ("setPref({ tab: 'personal', person: null, pview: 'situacion' })", 'situación'), ("setPref({ pview: 'cuadrante' })", 'cuadrante'), ("setPref({ pview: 'esp' })", 'especialidades'), ("setPref({ pview: 'equipos' })", 'equipos'), ("setPref({ pview: 'puestos' })", 'puestos'),
  ("setPref({ pview: 'peloton' }); openPerson(operators().find(o => o.name === 'BUZONAVEGANTE').id)", 'persona'), ("setPref({ ptab: 'docs' })", 'persona docs'), ("setPref({ ptab: 'epi' })", 'persona epi'), ("setPref({ ptab: 'mat' })", 'persona material'),
  ("setPref({ tab: 'agua', aptab: 'material', person: null })", 'agua material'), ("setPref({ aptab: 'necesidades' })", 'agua necesidades'), ("setPref({ aptab: 'notas' })", 'agua notas'), ("setPref({ tab: 'vehiculos', vehVista: 'modelo' })", 'vehículos por modelo'), ("toggleDrawer(true)", 'menú')]
U = "get('vehicles', RENAULT).units[0].id"   # la primera matrícula de la autobomba
MODALS = [("toggleDrawer(false); gearDetail(list('gear')[3].id)", 'ficha equipo'), ("boxDetail(list('boxes')[0].id)", 'ficha caja'), ("personForm('OP-01')", 'editar persona'), ("unidadView(RENAULT, get('vehicles', RENAULT).units[0].id)", 'matrícula'),
  ("vehicleView('V-ATB-M1')", 'modelo'), ("vehicleView('V-RQ-TORRE')", 'torre de luz'), ("checklistForm('veh:' + RENAULT + '#' + get('vehicles', RENAULT).units[0].id)", 'checklist'), ("checklistHistorial('veh:' + RENAULT + '#' + get('vehicles', RENAULT).units[0].id)", 'historial'),
  ("matForm('ap:agua', apMat('agua')[0].id)", 'material'), ("moverA('mat', apMat('agua')[0].id)", 'mover'), ("moverA('gear', list('gear')[0].id, { paso: 'cont' })", 'mover contenedor'), ("moverA('gear', list('gear')[0].id, { paso: 'veh' })", 'mover vehículo'), ("moverA('gear', list('gear')[0].id, { paso: 'arm' })", 'mover armarios'),
  ("cellModal(3)", 'hueco'), ("pasarLista()", 'pasar lista'), ("planDe(operators()[1].id)", 'ausencias'), ("ausenciaForm(operators()[1].id)", 'ausencia'), ("almacenForm()", 'pasillos'), ("needForm('agua')", 'necesidad'), ("eventForm()", 'evento'), ("vehicleForm('V-ATB-M1')", 'editar modelo'),
  ("unitForm(RENAULT, get('vehicles', RENAULT).units[0].id)", 'editar matrícula'), ("itvHistory(RENAULT, get('vehicles', RENAULT).units[0].id)", 'itv'), ("pinForm()", 'cambiar pin'), ("importPersonalForm()", 'importar'), ("minimosForm()", 'mínimos'), ("consForm(list('consumables')[0].id)", 'fungible'), ("epiForm(list('epis')[0].id)", 'epi'),
  ("incForm(RENAULT, %s, 'IN-1')" % U, 'incidencia'), ("mantForm(RENAULT, %s, %s.mant[0].id)" % (U, U.replace('.id', '')), 'mantenimiento'), ("cofreVer('veh:' + RENAULT + '#' + %s, 'I1')" % U, 'cofre'),
  ("cofresForm(RENAULT, 'veh:' + RENAULT + '#' + %s)" % U, 'cofres del modelo'), ("matCopiar('veh:' + RENAULT + '#' + get('vehicles', RENAULT).units[1].id)", 'copiar material')]
DATOS = """(() => { apHabitual('agua'); apHabitual('parque'); const m = apMat('agua'); pasMover(m[0].id, 4, 'I', 1, 0); stamp('matesp', { ...get('matesp', m[1].id), status: 'AVERIADO', holder: operators().find(o => o.name === 'BUZONAVEGANTE').id, serial: 'SN-0000123456', place: 'En la caja roja del fondo, estante de arriba', caduca: todayISO(), review: todayISO() });
          const o = operators(); stamp('operators', { ...o.find(x => x.name === 'RIO'), aus: { motivo: 'Comisión de servicio', desde: todayISO(), hasta: todayISO(), lugar: 'Santa Cruz de Tenerife, Academia de Logística' } });
          put('needs', { id: 'NE-1', ap: 'agua', text: 'Chalecos de rescate de talla L con arnés integrado', qty: 4, state: 'falta', nota: 'Pedido a la compañía de abastecimiento', by: 'GRANADOS', ts: Date.now() });
          const u = get('vehicles', RENAULT).units[0].id; matHabitual('veh:' + RENAULT + '#' + u); const c = matDe({ veh: RENAULT, unit: u }); put('vchecks', { id: 'VC-1', vid: RENAULT, unit: u, plate: 'ET-1', date: Date.now(), by: 'BUZONAVEGANTE', km: 123456, fuel: '1/2', fails: ['Luces y rotativos', 'Documentación (permiso de circulación, ITV, seguro)'], notes: 'El rotativo trasero no funciona y falta la tarjeta de combustible', mat: [{ id: c[0].id, name: c[0].name, st: 'falta', nota: 'Se quedó en el ejercicio de Arinaga' }], total: c.length });
          c.forEach((m, i) => stamp('matesp', { ...m, cofre: ['CAB', 'I1', 'I1', 'D2', 'TRAS'][i % 5], precinto: i % 3 ? '' : 'P-00012345' }));
          put('issues', { id: 'IN-1', veh: RENAULT, unit: u, text: 'Golpe en la puerta del cofre derecho, no cierra bien y entra agua', st: 'reparacion', resp: o[2].id, nota: 'Llevado al taller del tercer escalón; lo devuelven la semana que viene', by: 'BUZONAVEGANTE', ts: Date.now() });
          put('issues', { id: 'IN-2', veh: RENAULT, unit: u, item: 'Luces y rotativos', text: 'Luces y rotativos', st: 'abierta', resp: '', nota: '', by: 'GRANADOS', ts: Date.now(), origen: 'checklist' });
          mantSerie(RENAULT, u);
          revCadaSet('veh:' + RENAULT + '#' + u, 7); closeModal(); $('toast').classList.remove('show'); })()"""
res = {}
with sync_playwright() as p:
    br = p.chromium.launch()
    for name, vp, mob, big in [('móvil pequeño con letra grande', {'width': 320, 'height': 640}, True, True), ('móvil', {'width': 390, 'height': 844}, True, False), ('PC', {'width': 1280, 'height': 860}, False, False)]:
        a = br.new_context(viewport=vp, is_mobile=mob, has_touch=mob).new_page(); a.on('dialog', lambda d: d.accept())
        a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
        a.goto(APP); a.wait_for_selector('#view > *')
        a.evaluate("go('personal'); importPersonalForm()"); a.fill('#impTxt', LIST); a.click('#impGo'); a.wait_for_timeout(200)
        a.evaluate(DATOS); a.wait_for_timeout(300)
        a.evaluate(f"document.documentElement.classList.toggle('big', {str(big).lower()})")
        for js, label in PAGES + MODALS:
            a.evaluate(js); a.wait_for_timeout(120); a.evaluate("$('toast').classList.remove('show')")
            for k in a.evaluate(JS): res.setdefault((k[0], label, k[1] + ' «' + k[2] + '»'), set()).add(name)
    br.close()
TXT = {'SALE': 'se sale de su recuadro', 'CORTA': 'se corta', 'CORTA-V': 'se corta por abajo', 'PANTALLA': 'se sale de la pantalla', 'PAGINA': 'la página se desplaza de lado'}
for (k, label, what), where in sorted(res.items()): problems.append(f'{label}: {what} {TXT.get(k, k)} [{", ".join(sorted(where))}]')
print('PROBLEMAS:', len(problems) or 'ninguno')
for x in problems: print(' -', x)
if problems: sys.exit(1)
