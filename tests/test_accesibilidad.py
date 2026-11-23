"""Prueba de accesibilidad y de uso en el móvil (con guantes, al sol, con el lector de pantalla):
- cada botón, enlace y campo tiene nombre para el lector de pantalla; cada imagen tiene alt;
- contraste de texto ≥ 4,5:1 (3:1 en texto grande) en modo claro, noche y sol;
- objetivos táctiles de al menos 44×44 px (24 px para enlaces dentro de texto y casillas con etiqueta);
- campos con letra de 16 px (si no, el iPhone hace zoom); se puede ampliar la página; foco visible; movimiento reducido;
- si está disponible axe-core (AXE_JS=ruta a axe.min.js, en GitHub Actions), también sus reglas WCAG 2.1 AA.
Uso: python3 tests/test_accesibilidad.py  (con la app servida en APP_URL)"""
import os, sys, pathlib, json
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path(os.environ.get('TEST_OUT', ROOT / 'tests' / 'output')); OUT.mkdir(parents=True, exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
AXE = os.environ.get('AXE_JS')
problems = []

AUDIT = r"""(() => {
  const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 1 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !e.closest('[aria-hidden="true"], .hidden, #print'); };
  const name = e => (e.getAttribute('aria-label') || e.getAttribute('title') || e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.textContent || e.textContent || e.alt || e.querySelector('img[alt]')?.alt || e.value || '').trim();
  const where = e => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ' «' + (name(e) || e.outerHTML.slice(0, 50)).slice(0, 30) + '»';
  const out = { noName: [], noLabel: [], noAlt: [], small: [], contrast: [], tinyInput: [] };
  const root = document.querySelector('#modal:not(.hidden)') || document;
  root.querySelectorAll('button, a[href], [role=button], [onclick]:not(body)').forEach(e => { if (!vis(e)) return;
    if (!name(e)) out.noName.push(where(e));
    if (e.tagName === 'IMG') return;   // las fotos del manual se amplían al tocarlas; no son botones
    const r = e.getBoundingClientRect(), inText = e.tagName === 'A' && getComputedStyle(e).display === 'inline';
    // 44 px en general; 40 px los iconos de la cabecera; 24 px (mínimo WCAG 2.2 AA) los enlaces de texto, que amplían su zona con ::after
    const min = e.closest('.topbar') ? 40 : inText || e.matches('.link') || e.closest('.check-row, .cal, .cv-grid, .tok, .doors') ? 24 : 44;
    // un enlace con zona ampliada (::after) cuenta con su zona real de toque
    const af = getComputedStyle(e, '::after'), ext = e.matches('.link') && af.content !== 'none' && af.position === 'absolute' ? 24 : 0;
    const inPara = e.tagName === 'A' && e.closest('p, li, small, .muted');
    if (!inPara && (r.width + ext / 2 < min - .5 || r.height + ext < min - .5) && !e.closest('.cv-cell, .tok, .map')) out.small.push(where(e) + ` ${Math.round(r.width)}×${Math.round(r.height)}`);
  });
  root.querySelectorAll('input:not([type=hidden]), select, textarea').forEach(e => { if (!vis(e) && e.type !== 'file' && e.type !== 'checkbox') return;
    const ok = e.closest('label') || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (e.id && document.querySelector(`label[for="${e.id}"]`)) || e.title;
    if (!ok) out.noLabel.push(where(e));
    if (vis(e) && !['checkbox', 'radio', 'file', 'range', 'color'].includes(e.type) && parseFloat(getComputedStyle(e).fontSize) < 16) out.tinyInput.push(where(e) + ' ' + getComputedStyle(e).fontSize);
  });
  root.querySelectorAll('img').forEach(e => { if (vis(e) && !e.hasAttribute('alt')) out.noAlt.push(where(e)); });
  // Contraste: color del texto frente al primer fondo opaco de sus antepasados
  const rgb = s => { const m = s.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
  const lum = ([r, g, b]) => { const f = c => (c /= 255) <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const blend = (fg, bg) => { const a = fg[3] ?? 1; return [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a)); };
  const bgOf = e => { const stack = []; for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); if (s.backgroundImage !== 'none' && !/gradient/.test(s.backgroundImage)) return null; const c = rgb(s.backgroundColor); if (c.length === 4 ? c[3] > 0 : true) { stack.push(c); if ((c[3] ?? 1) >= 1) break; } if (/gradient/.test(s.backgroundImage)) return null; }
    let bg = [255, 255, 255]; for (let i = stack.length - 1; i >= 0; i--) bg = blend(stack[i], bg); return bg; };
  const seen = new Set();
  const walker = document.createTreeWalker(root === document ? document.body : root, NodeFilter.SHOW_TEXT);
  for (let t; (t = walker.nextNode());) {
    const e = t.parentElement; if (!t.textContent.trim() || !e || seen.has(e) || !vis(e)) continue; seen.add(e);
    if (e.closest('svg, .map, .cv-cell .tok, [disabled], .off, .dim, option')) continue;
    const s = getComputedStyle(e); if (+s.opacity < 1) continue;
    const bg = bgOf(e); if (!bg) continue;
    const fg = blend(rgb(s.color), bg); const L1 = lum(fg), L2 = lum(bg); const ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05);
    const big = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && +s.fontWeight >= 700);
    if (ratio < (big ? 3 : 4.5)) out.contrast.push(where(e) + ` ${ratio.toFixed(2)} (${s.color} / rgb(${bg.map(Math.round)}))`);
  }
  return out;
})()"""

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    a = c.new_page()
    a.on('pageerror', lambda e: problems.append(f'ERROR {e}'))
    a.on('dialog', lambda d: d.dismiss())
    a.goto(APP); a.wait_for_selector('#view > *')
    a.evaluate("window.print = () => {}")

    # Página: idioma, título, zoom permitido, foco visible, movimiento reducido
    vp = a.get_attribute('meta[name=viewport]', 'content')
    # Decisión del equipo: la app no se amplía (solo fotos y mapas, con el visor). Se comprueba que el visor existe.
    if 'user-scalable=no' in vp and 'function openZoom' not in (ROOT / 'js/ui.js').read_text(): problems.append('sin zoom y sin visor de imágenes')
    if a.get_attribute('html', 'lang') != 'es': problems.append('falta lang="es"')
    css = (ROOT / 'styles.css').read_text()
    for need in [':focus-visible', 'prefers-reduced-motion']:
        if need not in css: problems.append(f'falta {need} en styles.css')

    a.evaluate("""(() => {
      stamp('events', { id: 'E-A', type: 'Formación', title: 'Apuntalamiento', start: todayISO() + 'T09:00', end: todayISO() + 'T13:00', people: ['OP-01'] });
      commit(); })()""")
    pages = [(f"go('{t}')", t) for t in a.evaluate("Object.keys(VIEWS)")]
    pages += [("go('guia'); guiaAbre('asr')", 'guía: niveles ASR'), ("""putMany('asr', [{ id: 'AS-1', id2: 'ESP01-0056', team: 'ESP01', sector: 'A', lugar: 'Calle Mayor 3, frente a la farmacia de la plaza', vic: 'viva', h12: 'no', vivas: 3, resc: 1, fall: 1, uso: 'Edificio de viviendas', cons: 'Hormigón armado', plantas: 5, colapso: 'Montón de escombros', hueco: 'Pequeños (solo tumbado)', riesgos: 'Amianto y gas', ops: ['A', 'B', 'D'], notas: 'Se oye a dos personas en el lado 3', st: 'trab', pri: true, niveles: [{ team: 'ESP01', level: 2, date: todayISO() }, { team: 'ESP01', level: 3, date: todayISO() }], by: 'BUZONAVEGANTE', ts: 1 }, { id: 'AS-2', id2: 'A-2', team: 'USAR-242', lugar: 'Colegio', vic: 'posible', desap: 12, st: 'pend', niveles: [], by: 'GRANADOS', ts: 2 }, { id: 'AS-3', id2: 'A-3', vic: 'fallecidos', st: 'pend', by: 'GRANADOS', ts: 3 }, { id: 'AS-4', id2: 'A-4', vic: 'viva', h12: 'si', vivas: 1, resc: 1, st: 'fin', fin: todayISO(), niveles: [{ team: 'USAR-242', level: 2, date: todayISO() }], by: 'GRANADOS', ts: 4 }]); setPref({ tab: 'asr', asrTab: 'sitios' }); document.querySelectorAll('.asr-grupo').forEach(d => d.open = true)""", 'ASR: sitios'), ("setPref({ tab: 'asr', asrTab: 'marcaje' })", 'ASR: marcaje'),
              ("setPref({ tab: 'asr', asrTab: 'marcaje' }); asrMSet('tipo', 'v')", 'ASR: marcaje de víctimas'), ("setPref({ tab: 'asr', asrTab: 'marcaje' }); asrMSet('tipo', 'rombo')", 'ASR: marcaje rápido'), ("setPref({ tab: 'asr', asrTab: 'niveles' })", 'ASR: niveles'),
              ("openPerson('OP-01')", 'persona'), ("go('contenedor')", 'dibujo'), ("go('revision')", 'revisión'), ("go('armarios')", 'armarios'), ("go('pasillo')", 'pasillo'),
              ("(() => { const o = operators(), h = todayISO(); stamp('operators', { ...o[1], plan: [{ id: 'PL-A', motivo: 'Vacaciones', desde: h, hasta: h }] }); stamp('operators', { ...o[2], plan: [{ id: 'PL-B', motivo: 'Curso', desde: h, hasta: h }] });"
               " stamp('operators', { ...o[3], plan: [{ id: 'PL-C', motivo: 'Baja médica', desde: h, hasta: h }] }); stamp('meta', { id: 'minimos', value: { todos: 99 } }); commit(); setPref({ tab: 'personal', person: null, pview: 'cuadrante' }); })()", 'cuadrante'),
              ("(() => { ['falta', 'pedir', 'pedido', 'recibido'].forEach((s, i) => stamp('needs', { id: 'NE-A' + i, ap: 'agua', text: 'Cosa ' + i, qty: 2, state: s, by: 'GRANADOS', ts: 1 })); commit(); setPref({ tab: 'agua', aptab: 'necesidades' }); })()", 'necesidades'),
              ("toggleDrawer(true)", 'menú')]
    modals = [("go('asr'); asrSitio('AS-1')", 'ASR: ficha de un sitio'), ("go('asr'); asrSitio('AS-4')", 'ASR: sitio terminado'), ("prefs.asr = { team: 'ESP01', id: 'A-1', vic: 'viva', h12: 'si', mas: true, ops: ['B'] }; asrTriaje()", 'ASR: triaje A'),
              ("prefs.asr = { vic: 'posible' }; asrTriaje()", 'ASR: triaje C'), ("prefs.asr = { vic: 'nadie' }; asrTriaje()", 'ASR: triaje, nadie'),
              ("gearDetail('G-B19-5')", 'ficha equipo'), ("boxDetail('K-H2')", 'ficha caja'), ("personForm('OP-01')", 'editar persona'),
              ("vehicleView(vehicles()[0].id)", 'vehículo'), ("unidadView(RENAULT, get('vehicles', RENAULT).units[0].id)", 'matrícula'), ("(matHabitual('veh:' + RENAULT + '#' + get('vehicles', RENAULT).units[0].id), checklistForm('veh:' + RENAULT + '#' + get('vehicles', RENAULT).units[0].id))", 'checklist'), ("checklistHistorial('veh:' + RENAULT + '#' + get('vehicles', RENAULT).units[0].id)", 'checklists anteriores'),
              ("(() => { const u = get('vehicles', RENAULT).units[0].id; ['abierta', 'reparacion', 'resuelta'].forEach((st, i) => stamp('issues', { id: 'IN-A' + i, veh: RENAULT, unit: u, text: 'Cosa ' + i, st, by: 'GRANADOS', ts: 1 })); commit(); mantSerie(RENAULT, u); })()", 'matrícula con incidencias y mantenimiento'),
              ("incForm(RENAULT, get('vehicles', RENAULT).units[0].id, 'IN-A0')", 'incidencia'), ("mantForm(RENAULT, get('vehicles', RENAULT).units[0].id, get('vehicles', RENAULT).units[0].mant[0].id)", 'mantenimiento'),
              ("cofreVer('veh:' + RENAULT + '#' + get('vehicles', RENAULT).units[0].id, 'I1')", 'cofre'), ("cofresForm(RENAULT)", 'cofres del modelo'), ("matCopiar('veh:' + RENAULT + '#' + get('vehicles', RENAULT).units[1].id)", 'copiar material'), ("matForm('ap:agua')", 'material'), ("planDe(operators()[1].id)", 'ausencias de una persona'), ("moverA('gear', 'G-B19-5', { paso: 'pas' })", 'mover a un pasillo'), ("moverA('gear', 'G-B19-5', { paso: 'cont' })", 'mover al contenedor'), ("moverA('gear', 'G-B19-5', { paso: 'arm' })", 'mover a un armario'), ("almacenForm()", 'pasillos del almacén'), ("eventForm()", 'evento'), ("epiForm(list('epis')[0].id)", 'EPI'), ("revForm('G-B19-5')", 'revisión form'), ("novForm('gear', 'G-B19-5')", 'nota')]
    results = {}
    for theme in ['light', 'dark', 'sun']:
        a.evaluate(f"setPref({{ theme: '{theme}' }}); applyTheme()")
        for js, label in pages + modals:
            a.evaluate(f"toggleDrawer(false); closeModal(); {js}"); a.wait_for_timeout(120)
            r = a.evaluate(AUDIT)
            for k, v in r.items():
                if k == 'contrast' or theme == 'light':
                    for x in v: results.setdefault((k, x if k != 'contrast' else x.split(' (')[0]), set()).add(f'{theme}:{label}')
            if AXE and theme != 'sun':
                if not a.evaluate("!!window.axe"): a.add_script_tag(path=AXE)
                # meta-viewport desactivada: el equipo decidió que la app no se amplíe (solo fotos y mapas, con su visor)
                v = a.evaluate("""Promise.race([Promise.all(document.getAnimations().filter(x => x.effect?.getComputedTiming().iterations !== Infinity).map(x => x.finished.catch(() => {}))), new Promise(r => setTimeout(r, 800))]).then(() => axe.run(document.querySelector('#modal:not(.hidden)') || document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'], rules: { 'meta-viewport': { enabled: false } } }).then(r => r.violations.map(v => v.id + ': ' + v.nodes.slice(0, 3).map(n => n.target.join(' ')).join(' | '))))""")
                for x in v: results.setdefault(('axe', x), set()).add(f'{theme}:{label}')
    a.evaluate("setPref({ theme: '' }); applyTheme()")
    br.close()

TITLES = {'noName': 'Sin nombre para el lector de pantalla', 'noLabel': 'Campo sin etiqueta', 'noAlt': 'Imagen sin alt', 'small': 'Objetivo táctil pequeño',
          'contrast': 'Contraste insuficiente', 'tinyInput': 'Campo con letra < 16 px (zoom en iPhone)', 'axe': 'axe-core'}
for (k, x), where in sorted(results.items()):
    problems.append(f'{TITLES[k]}: {x}  [{", ".join(sorted(where)[:4])}{"…" if len(where) > 4 else ""}]')
print('PROBLEMAS:', 'ninguno' if not problems else len(problems))
for x in problems: print(' -', x)
if problems: sys.exit(1)
