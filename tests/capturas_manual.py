"""Genera las capturas del Manual de uso (carpeta manual/) con datos de ejemplo, con números, recuadros y flechas
dibujados encima. Los números coinciden con la leyenda de cada imagen en js/views/manual.js.
Uso: python3 tests/capturas_manual.py  (con la app servida en APP_URL). Las imágenes se suben al repositorio."""
import os, re, pathlib, datetime, shutil, subprocess, tempfile
from playwright.sync_api import sync_playwright
import sesion  # noqa: F401  (entra con sesión iniciada)

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'manual'; OUT.mkdir(exist_ok=True)
APP = os.environ.get('APP_URL', 'http://127.0.0.1:8080/index.html')
today = datetime.date.today()
made = set()

# Dibuja recuadro, flecha y número sobre cada elemento (coordenadas de la pantalla)
ANN_JS = r"""(marks) => {
  document.getElementById('__ann')?.remove();
  const W = innerWidth, H = innerHeight, NS = 'http://www.w3.org/2000/svg', R = '#e0262c';
  const svg = document.createElementNS(NS, 'svg'); svg.id = '__ann'; svg.setAttribute('width', W); svg.setAttribute('height', H);
  Object.assign(svg.style, { position: 'fixed', left: 0, top: 0, zIndex: 99999, pointerEvents: 'none' });
  let html = `<defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${R}"/></marker>
    <filter id="sh"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity=".45"/></filter></defs>`;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  marks.forEach(m => {
    const { x, y, w, h, n, pos, d = 42, box = true } = m;
    if (box) html += `<rect x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${h + 8}" rx="9" fill="rgba(224,38,44,.07)" stroke="${R}" stroke-width="3" stroke-dasharray="${m.dash ? '7 5' : ''}"/>`;
    let ex, ey, bx, by;
    if (pos === 't') { ex = x + w * (m.fx ?? .5); ey = y - 5; bx = ex + (m.ox || 0); by = ey - d; }
    else if (pos === 'b') { ex = x + w * (m.fx ?? .5); ey = y + h + 5; bx = ex + (m.ox || 0); by = ey + d; }
    else if (pos === 'l') { ex = x - 5; ey = y + h * (m.fy ?? .5); bx = ex - d; by = ey + (m.oy || 0); }
    else if (pos === 'r') { ex = x + w + 5; ey = y + h * (m.fy ?? .5); bx = ex + d; by = ey + (m.oy || 0); }
    else { bx = x - 2; by = y - 2; }                           // 'i': en la esquina de arriba a la izquierda
    bx = clamp(bx, 17, W - 17); by = clamp(by, 17, H - 17);
    if (pos !== 'i') {
      const dx = ex - bx, dy = ey - by, L = Math.hypot(dx, dy) || 1;
      if (L > 22) html += `<line x1="${bx + dx / L * 16}" y1="${by + dy / L * 16}" x2="${ex}" y2="${ey}" stroke="${R}" stroke-width="3.5" marker-end="url(#ah)"/>`;
    }
    html += `<g filter="url(#sh)"><circle cx="${bx}" cy="${by}" r="15" fill="${R}" stroke="#fff" stroke-width="3"/>
      <text x="${bx}" y="${by + 5.5}" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="800" font-size="16" fill="#fff">${n}</text></g>`;
  });
  svg.innerHTML = html; document.body.appendChild(svg);
}"""

def prep(pg, name):
    pg.evaluate("$('toast').classList.remove('show')")
    pg.evaluate(f"document.getElementById('fab') && (document.getElementById('fab').style.display = '{'' if name in ('fab', 'inicio') else 'none'}')"); pg.wait_for_timeout(250)

def save_shot(pg, name):
    pg.screenshot(path=str(OUT / f'{name}.jpg'), type='jpeg', quality=74)
    pg.evaluate("document.getElementById('__ann')?.remove(); document.getElementById('fab') && (document.getElementById('fab').style.display = '')")
    made.add(name); print('✓', name)

def shot(pg, name, sel=None):
    prep(pg, name)
    if sel: pg.locator(sel).first.scroll_into_view_if_needed(); pg.evaluate("scrollBy(0, -80)"); pg.wait_for_timeout(150)
    save_shot(pg, name)

def ann(pg, name, marks, scroll=None, top=200):
    """marks: lista de (selector, posición t/b/l/r/i, opciones) en el orden de la leyenda (1, 2, 3…)."""
    prep(pg, name)
    if scroll: pg.locator(scroll).first.scroll_into_view_if_needed(); pg.evaluate(f"scrollBy(0, -{top})"); pg.wait_for_timeout(200)
    data = []
    for i, mk in enumerate(marks, 1):
        sel, pos, opt = (mk + ({},))[:3]
        loc = pg.locator(sel)
        if not loc.count(): raise SystemExit(f'✗ {name}: no encuentro {sel}')
        bb = loc.first.bounding_box()
        data.append({'x': bb['x'], 'y': bb['y'], 'w': bb['width'], 'h': bb['height'], 'n': i, 'pos': pos, **opt})
    pg.evaluate(ANN_JS, data); pg.wait_for_timeout(80)
    save_shot(pg, name)

with sync_playwright() as p:
    br = p.chromium.launch()
    c = br.new_context(viewport={'width': 390, 'height': 760}, device_scale_factor=1.5, is_mobile=True, has_touch=True, locale='es-ES')
    a = c.new_page(); a.on('dialog', lambda d: d.accept())
    a.goto(APP); a.wait_for_selector('#view > *'); a.evaluate("setPref({ guide: false })")
    a.evaluate("window.print = () => {}")
    esc = lambda: (a.keyboard.press('Escape'), a.wait_for_timeout(150))
    save = lambda: (a.click('#modalForm button:has-text("Guardar")'), a.wait_for_timeout(300))
    menu = lambda n: sesion.menu(a, n, 200)
    tall = lambda h: (a.set_viewport_size({'width': 390, 'height': h}), a.wait_for_timeout(150))

    # ---------- Datos de ejemplo ----------
    a.evaluate(f"""(() => {{
      const g = list('gear').find(x => /hormigón/i.test(x.name)); put('gear', {{ ...g, status: 'REVISIÓN', notes: 'Vibra al acelerar' }});
      const ops = operators();
      put('operators', {{ ...ops[0], phone: '600 111 222' }});
      put('readiness', {{ id: ops[0].id, fullName: 'Juan Granados Pérez', nationality: 'Española', passportNo: 'PAA112233', passportExp: '{(today + datetime.timedelta(days=120)).isoformat()}',
        emergencyName: 'María (esposa)', emergencyPhone: '600 333 444', quals: [{{ name: 'Rescatador USAR', expires: '2028-05-01' }}, {{ name: 'Espacios confinados', expires: '{(today + datetime.timedelta(days=20)).isoformat()}' }}] }});
      put('docs', {{ id: 'DOC-EJ1', op: ops[0].id, type: 'Pasaporte', number: 'PAA112233', expires: '{(today + datetime.timedelta(days=120)).isoformat()}', imgs: [] }});
      put('docs', {{ id: 'DOC-EJ2', op: ops[0].id, type: 'Carné de conducir', number: '12345678Z', expires: '2031-03-10', imgs: [] }});
      put('docs', {{ id: 'DOC-EJ3', op: ops[5].id, type: 'Reconocimiento médico', expires: '{(today + datetime.timedelta(days=12)).isoformat()}', imgs: [] }});
      const e = list('epis').find(x => x.holder === ops[0].id && x.type === 'mono'); put('epis', {{ ...e, size: 'L', status: 'REVISAR' }});
      const cs = list('consumables').find(x => /diamante/i.test(x.name)); put('consumables', {{ ...cs, stock: 1 }});
      const d = new Date(); const iso = (o, h) => {{ const t = new Date(d.getFullYear(), d.getMonth(), d.getDate() + o, h); return new Date(t - t.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); }};
      put('events', {{ id: 'EV-1', type: 'Formación', title: 'Apuntalamiento en T', start: iso(-6, 9), end: iso(-6, 13), place: 'Parque', people: ops.map(o => o.id), att: Object.fromEntries(ops.slice(0, 11).map(o => [o.id, 'si'])) }});
      put('events', {{ id: 'EV-2', type: 'Ejercicio', title: 'Simulacro colapso nave', start: iso(5, 8), end: iso(5, 14), place: 'Polígono de Arinaga', people: ops.map(o => o.id), att: {{}} }});
      put('events', {{ id: 'EV-3', type: 'Guardia', title: 'Guardia semanal', start: iso(2, 8), end: iso(2, 20), place: 'Base', people: ops.slice(0, 5).map(o => o.id), att: {{}} }});
      // Pesos y medidas de ejemplo en las cajas reales (inventados para el manual)
      const T = {{ 'K-H2': [11, 38], 'K-H3': [8, 0], 'K-H12': [8, 0], 'K-H13': [8, 0], 'K-H30': [14, 52], 'K-U1': [12, 0], 'K-U2': [14, 0], 'K-U3': [12, 0], 'K-U4': [8, 0], 'K-U5': [12, 0], 'K-U6': [12, 46], 'K-U7': [10, 0], 'K-U8': [12, 0] }};
      Object.entries(T).forEach(([id, [tare, measured]]) => {{ const b = get('boxes', id); stamp('boxes', {{ ...b, tare, measured: measured || '', model: 'Peli 1650', len: 81, wid: 52, hei: 31 }}); }});
      const W = {{ 'G-H3-1': 3, 'G-H3-2': 4, 'G-H3-3': 3, 'G-H3-4': 4, 'G-H12-1': 1, 'G-H12-7': 6, 'G-H13-1': 5, 'G-U1-1': 15, 'G-U1-2': 22, 'G-U3-1': 5, 'G-U3-2': 5, 'G-U3-3': 3, 'G-U3-4': 5, 'G-U4-1': 3, 'G-U5-1': 18, 'G-U7-1': 30 }};
      Object.entries(W).forEach(([id, kg]) => {{ const x = get('gear', id); stamp('gear', {{ ...x, weight: kg }}); }});
      commit();
    }})()""")
    a.evaluate("""(async () => { const c = Object.assign(document.createElement('canvas'), { width: 640, height: 400 }); const x = c.getContext('2d');
      x.fillStyle = '#dfe7f2'; x.fillRect(0, 0, 640, 400); x.fillStyle = '#22382a'; x.fillRect(0, 0, 640, 70); x.fillStyle = '#fff'; x.font = 'bold 34px sans-serif'; x.fillText('DOCUMENTO DE EJEMPLO', 24, 48);
      x.fillStyle = '#b8c4d4'; x.fillRect(30, 100, 170, 220); x.fillStyle = '#1b2a20'; x.font = '24px sans-serif'; ['GRANADOS PÉREZ, JUAN', 'Nº PAA112233', 'Caduca: 2027'].forEach((t, i) => x.fillText(t, 230, 140 + i * 50));
      await Img.put('doc:DOC-EJ1:0', c.toDataURL('image/jpeg', .8)); const d = get('docs', 'DOC-EJ1'); put('docs', { ...d, imgs: ['doc:DOC-EJ1:0'] }); })()""")
    a.wait_for_timeout(300)

    # ---------- Cabecera y menú ----------
    a.evaluate("go('consumibles')"); a.wait_for_timeout(200)
    ann(a, 'cabecera', [('#menuBtn', 'b', {'d': 40}), ('[aria-label=Buscar]', 'b', {'d': 40})])
    a.evaluate("setPref({ session: null, loginPick: null })"); a.wait_for_timeout(600)
    ann(a, 'entrar', [('.login [name=user]', 'i'), ('.login [name=pin]', 'i'), ('.login button.btn-a', 'r', {'d': 20})])
    a.evaluate("setPref({ session: 'OP-01', tab: 'consumibles' })"); a.wait_for_timeout(250)
    ann(a, 'stock', [('#view .cons-item .row.nowrap >> nth=0', 'b', {'d': 30}), ('#view .tag.bad', 'l', {'d': 30})])
    a.click('#menuBtn'); a.wait_for_timeout(250)
    a.evaluate("prefs.menuOpen = ['usar']; renderDrawer()"); tall(1270); a.wait_for_timeout(200)
    ann(a, 'menu', [('#drawer .dr-item[data-area=home]', 'r', {'d': 20}), ('#drawer .dr-item:has-text("Logística")', 'r', {'d': 60}), ('#drawer .dr-item:has-text("Personal")', 'r', {'d': 60}),
                    ('#drawer .dr-item:has-text("Almacén")', 'r', {'d': 60}), ('#drawer .dr-item:has-text("Vehículos")', 'r', {'d': 60}), ('#drawer .dr-group-head:has-text("USAR")', 'r', {'d': 60}),
                    ('#drawer .dr-item:has-text("Revisión") .dr-dot', 'r', {'d': 30}), ('#drawer .dr-item:has-text("Agua")', 'r', {'d': 60}), ('#drawer .dr-group-head:has-text("Ajustes")', 'r', {'d': 60})]); tall(760)
    a.click('#drawer button:has-text("Inicio")'); a.wait_for_timeout(200)
    a.evaluate("scrollTo(0, 0)"); ann(a, 'barra', [('#tabbar button:has-text("Personal")', 't', {'d': 40}), ('#tabbar button:has-text("Más")', 't', {'d': 40})])

    # ---------- Inicio ----------
    a.evaluate("scrollTo(0, 0)"); tall(1150); a.evaluate("scrollTo(0, 0)")
    ann(a, 'inicio', [('.hero', 'i'), ('.esp-tiles', 'i'), ('#view .area-panel >> nth=0', 'i')])
    tall(760)

    # ---------- Contenedor ----------
    a.evaluate("go('contenedor'); setPref({ cside: 'izq' })"); a.wait_for_timeout(250)
    tall(1300)
    ann(a, 'cont-dibujo', [('.seg-row', 'r', {'d': 14}), ('.cv-cell[data-door="3"] .cv-tag', 'r', {'d': 16}),
                           ('.tok-box[data-box="K-H12"]', 'r', {'d': 14}), ('.cv-cell[data-door="1"] .tok-gear >> nth=0', 'r', {'d': 14}), ('.cv-cell[data-door="10"]', 'l', {'d': 20})], scroll='.cvi', top=260)
    # Arrastrando: se captura a mitad de camino y luego se deshace
    a.evaluate("document.querySelector('.cv').scrollIntoView({ block: 'center' })"); a.wait_for_timeout(200)
    # Una caja que se vea en el dibujo y un hueco distinto del suyo
    bid = a.evaluate("[...document.querySelectorAll('.cv .tok-box')].find(e => e.getBoundingClientRect().width > 0).dataset.box")
    door0 = a.evaluate(f"get('boxes', '{bid}').door")
    dest = a.evaluate(f"[...document.querySelectorAll('.cv .cv-cell[data-door]')].map(e => +e.dataset.door).filter(d => d && d !== {door0} && document.querySelector(`.cv .cv-cell[data-door='${{d}}']`).getBoundingClientRect().width > 0).pop()")
    s = a.locator(f'.cv .tok-box[data-box="{bid}"]').first.bounding_box(); t = a.locator(f'.cv .cv-cell[data-door="{dest}"]').first.bounding_box()
    a.mouse.move(s['x'] + 12, s['y'] + 12); a.mouse.down(); a.mouse.move(s['x'] + 30, s['y'] + 30, steps=4)
    a.mouse.move(t['x'] + t['width'] / 2, t['y'] + t['height'] / 2 + 10, steps=12); a.wait_for_timeout(150)
    ann(a, 'cont-arrastrar', [('.tok-ghost', 't', {'d': 34, 'box': False}), ('.drop-on', 'b', {'d': 30, 'box': False})])
    a.mouse.up(); a.wait_for_timeout(200); a.evaluate(f"moveBox('{bid}', {door0})"); a.wait_for_timeout(200)
    a.locator('.cv-cell[data-door="7"]').click(position={'x': 30, 'y': 8}); a.wait_for_timeout(250)
    ann(a, 'cont-hueco', [('#modal .cell-box >> nth=0', 'i'), ('#modal .list', 'i'), ('#modal button:has-text("Material aquí")', 't', {'d': 26})])
    esc()
    a.evaluate("boxDetail('K-H12')"); a.wait_for_timeout(250)
    ann(a, 'cont-caja', [('.box-hero', 'i'), ('.color-pick', 'r', {'d': 14}), ('#modal .dl', 'i'), ('#modal button:has-text("Meter material")', 't', {'d': 22}), ('#modal .list .item >> nth=0', 'i'), ('#modal button:has-text("Mover")', 't', {'d': 22, 'ox': 120})])
    a.click('#modal button:has-text("Editar")'); a.wait_for_timeout(250)
    tall(1250)
    ann(a, 'cont-caja-form', [('#modalForm .lbl:has([name=code])', 'i'), ('#modalForm .lbl:has([name=model])', 'i'), ('#modalForm .lbl:has([name=tare])', 'i'), ('#modalForm .lbl:has([name=len])', 'i')])
    esc(); tall(1000)
    # Revisión y novedades
    a.evaluate("""(() => { const t = Date.now();
      stamp('gear', { ...get('gear', 'G-B10-2'), status: 'REVISIÓN', rev: { state: 'taller', since: '2026-10-05', where: 'Taller Holmatro Telde', reason: 'Pierde aceite por el latiguillo' } });
      stamp('gear', { ...get('gear', 'G-B19-5'), nov: { text: 'Funciona, pero un peldaño cruje', ts: t, by: 'GRANADOS' } });
      commit(); go('revision'); })()"""); a.wait_for_timeout(250)
    ann(a, 'revision', [('#view .panel .item >> nth=0', 'i'), ('#view .panel:has-text("Con novedad") .item >> nth=0', 'i')])
    a.evaluate("gearDetail('G-B10-2')"); a.wait_for_timeout(250)
    ann(a, 'rev-ficha', [('#modal .callout.rev', 'i'), ('#modal button:has-text("Fin de revisión")', 'i')])
    a.evaluate("revForm('G-B10-2')"); a.wait_for_timeout(250); tall(1000)
    ann(a, 'rev-form', [('#modalForm .lbl:has([name=state])', 'i'), ('#modalForm .lbl:has([name=since])', 'i'), ('#modalForm .lbl:has([name=where])', 'i'), ('#modalForm .lbl:has([name=reason])', 'i')])
    esc(); a.evaluate("novForm('gear', 'G-B19-5')"); a.wait_for_timeout(250)
    ann(a, 'nota', [('#modalForm .lbl:has([name=text])', 'i')]); esc(); tall(760)
    # Armarios
    a.evaluate("['B-901', 'B-902'].forEach((id, i) => stamp('gear', { ...get('gear', id), door: 211 + i * 12 })); commit(); go('armarios')"); a.wait_for_timeout(250); tall(1100)
    a.evaluate("[1, 2, 3].forEach(n => document.querySelector(`.arm-list[data-arm='${n}'] .item`) || document.querySelector('.arm-list .item') || armToggle(n))"); a.wait_for_timeout(250)
    ann(a, 'armarios', [('.arm-cab >> nth=0', 'i'), ('.arm-shelf[data-door="211"]', 'r', {'d': 14}), ('.arm-list .item >> nth=0', 'i')])
    # Entrega con firma
    a.evaluate("go('entregas'); loanForm()"); a.wait_for_timeout(250); tall(1300)
    a.fill('[name=to]', 'Cabo 1º Pérez Gil'); a.fill('[name=unit]', 'BIEM II'); a.fill('#modalForm input[type=search]', 'botiq'); a.wait_for_timeout(100); a.click('#modalForm .check-row:visible >> nth=0')
    a.locator('#modalForm .sig').scroll_into_view_if_needed(); bx = a.locator('#modalForm .sig canvas').bounding_box()
    a.mouse.move(bx['x'] + 30, bx['y'] + 60); a.mouse.down()
    for i in range(14): a.mouse.move(bx['x'] + 30 + i * 16, bx['y'] + 60 + (i % 4) * 14, steps=2)
    a.mouse.up(); a.evaluate("document.querySelector('#modal .sheet').scrollTop = 0"); a.wait_for_timeout(150)
    ann(a, 'entrega', [('#modalForm .lbl:has([name=to])', 'i'), ('#modalForm .lbl:has(input[name=gear])', 'i'), ('#modalForm .sig', 'i')], scroll='#modalForm .lbl:has(input[name=gear])', top=260)
    save(); tall(760)
    # Acta en PDF: se genera y se pasa a imagen (si está pdftoppm)
    pdf = a.evaluate("""(async () => { let out; const sv = savePdf; savePdf = async b => { out = Array.from(b); }; await loanPdf(list('loans')[0].id); savePdf = sv; return out; })()""")
    if shutil.which('pdftoppm'):
        tmp = pathlib.Path(tempfile.mkdtemp()); (tmp / 'a.pdf').write_bytes(bytes(pdf))
        subprocess.run(['pdftoppm', '-jpeg', '-r', '70', '-f', '1', '-l', '1', '-singlefile', str(tmp / 'a.pdf'), str(OUT / 'acta')], check=True); made.add('acta'); print('✓ acta')
    a.evaluate("go('contenedor')"); a.wait_for_timeout(200)
    a.evaluate("gearDetail('G-H2-1')"); a.wait_for_timeout(250); tall(1000)
    ann(a, 'cont-equipo', [('#modal .dl', 'i'), ('#modal button:has-text("Nota / novedad")', 'i'), ('#modal :is(button:has-text("A revisión"), button:has-text("Fin de revisión"))', 'i'), ('#modal button:has-text("Sacar"), #modal button:has-text("Devolver")', 'i'), ('#modal button:has-text("Mover")', 'i'), ('#modal button:has-text("Caja H")', 'i'), ('#modal button:has-text("Eliminar")', 'i')])
    esc(); tall(760)

    # ---------- Resto de Logística ----------
    a.evaluate("go('revista')"); a.click('button:has-text("Iniciar revista")'); a.click('#modalForm button:has-text("Guardar")'); a.wait_for_timeout(200)
    a.locator('.panel:has-text("B1 ·") button:has-text("Todo OK")').click(); a.locator('.check:has-text("Extractor")').locator('.seg.bad').click(); a.wait_for_timeout(200)
    a.fill('.check:has-text("Extractor") input', 'No arranca')
    ann(a, 'revista', [('.panel.progress', 'i'), ('.check:has-text("Extractor") .row.nowrap', 'l', {'d': 24}), ('.check:has-text("Extractor") input', 'l', {'d': 0})], scroll='.check:has-text("Extractor")', top=60)
    a.evaluate("go('vehiculos')"); a.wait_for_timeout(200)
    ann(a, 'vehiculos', [('#view button.btn-a:has-text("Modelo")', 'l', {'d': 24}), ('#view .veh-u >> nth=0 >> .veh-art', 'r', {'d': 22})], scroll='#view .panel', top=160)
    # El checklist de una matrícula, con su material (se quita después)
    a.evaluate("(() => { const u = get('vehicles', RENAULT).units[0].id, o = 'veh:' + RENAULT + '#' + u; putMany('matesp', ['Mangueras de 45 mm', 'Puntas de lanza', 'Calzos', 'Extintor'].map((name, i) => ({ id: 'ME-CHK' + i, veh: RENAULT, unit: u, name, qty: 1, status: 'OPERATIVO' }))); checklistForm(o); })()"); a.wait_for_timeout(400)
    a.evaluate("document.querySelector('#modal .est-list').scrollIntoView({ block: 'start' }); document.querySelector('.sheet').scrollTop -= 90"); a.click('#modal .est-row:has-text("Puntas de lanza") .est-falta'); a.fill('#modal .est-row:has-text("Puntas de lanza") .est-nota', 'Falta una'); a.wait_for_timeout(200)
    ann(a, 'checklist', [('#modal .est-row:has-text("Puntas de lanza") .est-ops', 'l', {'d': 18}), ('#modal .est-row:has-text("Puntas de lanza") .est-nota', 'i')])
    # Los cofres de esa matrícula, con el material repartido
    a.evaluate("(() => { closeModal(); const u = get('vehicles', RENAULT).units[0].id; ['I1', 'I1', 'TRAS', ''].forEach((cofre, i) => stamp('matesp', { ...get('matesp', 'ME-CHK' + i), cofre })); commit(); unidadView(RENAULT, u); })()"); a.wait_for_timeout(400)
    a.evaluate("document.querySelector('#modal .cofres').scrollIntoView({ block: 'center' })"); a.wait_for_timeout(200)
    ann(a, 'matricula', [('#modal .cofres .cof:has-text("Izq. 1")', 't', {'d': 34, 'fx': .78}), ('#modal .cof-pie', 'b', {'d': 26})])
    a.evaluate("closeModal(); [0, 1, 2, 3].forEach(i => stamp('matesp', { id: 'ME-CHK' + i, _del: true })); commit()"); a.wait_for_timeout(250)
    a.evaluate("go('avisos')"); a.wait_for_timeout(200); a.click('[aria-label=Buscar]'); a.fill('#search', 'cialumenes'); a.dispatch_event('#search', 'input'); a.wait_for_timeout(250); a.evaluate("scrollTo(0, 0)")
    ann(a, 'buscador', [('#search', 'i'), ('#results .find-item >> nth=0 >> .find-where', 'r', {'d': 10}), ('#results .find-item >> nth=0 >> small', 'r', {'d': 10})])
    a.evaluate('clearSearch()')

    # ---------- Equipo ----------
    a.evaluate("go('personal')"); a.wait_for_timeout(250)
    ann(a, 'personal-lista', [('#view button.btn-a:has-text("Persona")', 'r', {'d': 24}), ('#view button:has-text("Tarjetas QR")', 'r', {'d': 24}), ('#view .sier-res', 'i'), ('#view .pers-views', 'i')])
    # El cuadrante de vacaciones, con unas ausencias de ejemplo en el mes (se quitan después)
    a.evaluate("""(() => { const ym = todayISO().slice(0, 7), o = operators();
      [[1, 'Vacaciones', '03', '12'], [3, 'Curso', '08', '10'], [4, 'Permiso', '19', '20'], [6, 'Vacaciones', '21', '28']].forEach(([i, motivo, d, h]) => o[i] && stamp('operators', { ...o[i], plan: [{ id: 'PL-M' + i, motivo, desde: ym + '-' + d, hasta: ym + '-' + h }] }));
      commit(); setPref({ pview: 'cuadrante' }); })()"""); a.wait_for_timeout(300)
    ann(a, 'cuadrante', [('#view button.btn-a:has-text("Ausencia")', 'b', {'d': 30}), ('#view table.cq tbody tr >> nth=1 >> .cq-nombre', 'i'), ('#view button:has-text("Mínimos")', 'r', {'d': 24})], scroll='#view .cq-panel', top=150)
    a.evaluate("operators().filter(o => (o.plan || []).length).forEach(o => stamp('operators', { ...o, plan: [] })); commit(); setPref({ pview: 'peloton' }); scrollTo(0, 0)"); a.wait_for_timeout(200)
    a.evaluate("""(() => { go('agua'); apHabitual('agua'); const m = apMat('agua'); [[0, 1, 0], [1, 1, 1], [2, 1, 1], [3, 2, 2], [4, 3, 0], [5, 3, 0], [6, 2, 1], [7, 4, 2]].forEach(([i, mod, niv]) => stamp('matesp', { ...m[i], pas: 4, lado: 'I', mod, niv }));
      stamp('matesp', { ...apMat('agua')[6], status: 'REVISIÓN' }); commit(); setPref({ aptab: 'material' }); })()"""); a.wait_for_timeout(2600); tall(1000)
    ann(a, 'apartado', [('#view .sier-res', 'i'), ('#view .ctabs', 'b', {'d': 30}), ('#view .px', 'i')]); tall(760)
    # El Almacén (todos los pasillos) y la ventana de mover, con el material de Agua ya colocado en el pasillo 4
    a.evaluate("setPref({ tab: 'almacen', almPas: 4, pasLado: 'I' }); scrollTo(0, 0)"); a.wait_for_timeout(300); tall(900)
    ann(a, 'almacen', [('#view .pas-chips', 'i'), ('#view .alm-top .seg-row', 'r', {'d': 24}), ('#view .px', 'i')]); tall(760)
    a.evaluate("moverA('mat', apMat('agua')[0].id)"); a.wait_for_timeout(400)
    ann(a, 'mover', [('#modal .mv-ahora', 'i'), ('#modal .mv-tipos', 'i'), ('#modal .mv-px', 'i')]); a.evaluate("closeModal()"); a.wait_for_timeout(250)
    a.evaluate("apMat('agua').forEach(m => stamp('matesp', { id: m.id, _del: true })); commit(); go('recursos')"); a.wait_for_timeout(250)
    ann(a, 'logistica', [('#view input[type=date]', 'b', {'d': 30}), ('#view .log-fig >> nth=0', 'i'), ('#view button:has-text("Pasar lista")', 'r', {'d': 24})])
    a.evaluate("go('personal')"); a.wait_for_timeout(250)
    a.evaluate("openPerson('OP-01')"); a.wait_for_timeout(500); tall(1000)
    ann(a, 'persona', [('#view a:has-text("Llamar")', 'i'), ('#view button:has-text("Editar datos")', 'r', {'d': 20}), ('#view .ctab:has-text("Documentos")', 'b', {'d': 30})], scroll='#view a:has-text("Llamar")', top=200)
    a.evaluate("setPref({ ptab: 'epi' })"); a.wait_for_timeout(250)
    ann(a, 'persona-epi', [('.panel:has-text("EPI asignado") .sec-head .tag', 'l', {'d': 20}), ('.panel:has-text("EPI asignado") .item >> nth=0', 'i')], scroll='.panel:has-text("EPI asignado")', top=150)
    tall(760); a.click('#view button:has-text("Editar datos")'); a.wait_for_timeout(250)
    ann(a, 'persona-baja', [('#modalForm .lbl:has([name=name])', 'i'), ('#modalForm [data-photo], #modalForm .photo-field', 'i'), ('#modal button:has-text("Dar de baja")', 'i'), ('#modal button:has-text("Eliminar")', 'i')], scroll='#modal button:has-text("Dar de baja")', top=400); esc()
    a.evaluate("setPref({ ptab: 'docs' })"); a.wait_for_timeout(250)
    a.click('#view button.btn-a:has-text("Documento")'); a.wait_for_timeout(200); a.select_option('[name=type]', 'Carné de conducir')
    ann(a, 'documento', [('#modalForm .photo-field >> nth=0', 'i')], scroll='#modalForm .photo-field', top=200); esc()
    a.evaluate("setPref({ tab: 'calendario' })"); a.wait_for_timeout(200); shot(a, 'calendario')
    a.evaluate("setPref({ tab: 'avisos', vwin: 365 })"); a.wait_for_timeout(200); shot(a, 'vencimientos', '#venc')
    a.evaluate("setPref({ tab: 'listas' }); catalogEditor('docTypes')"); a.wait_for_timeout(200); shot(a, 'listas'); esc()
    a.evaluate("setPref({ tab: 'guia' })"); a.wait_for_timeout(300); shot(a, 'guia')
    a.evaluate("setPref({ tab: 'arcos', arc: null, arcTab: 'alzado' }); arcExample()"); a.wait_for_timeout(300)
    ann(a, 'arcos', [('#view .panel .row:has(button:has-text("Medidas"))', 'i'), ('#view .arc-kpis', 'i'), ('#view .arc-tabs', 'b', {'d': 30})], scroll='#view .arc-kpis', top=330)
    a.evaluate("remove('arcs', prefs.arc); setPref({ arc: null })")
    a.evaluate("setPref({ tab: 'ajustes' })"); a.wait_for_timeout(200); shot(a, 'ajustes', '.panel:has-text("Pantalla y avisos")')
    # PC
    d = br.new_context(viewport={'width': 1280, 'height': 800}, device_scale_factor=1, locale='es-ES')
    b = d.new_page(); b.goto(APP); b.wait_for_selector('#view > *')
    b.evaluate("(data => { localStorage.setItem(KEY.db, data); })", a.evaluate("localStorage.getItem(KEY.db)"))
    b.evaluate("localStorage.setItem(KEY.prefs, JSON.stringify({ tab: 'avisos', guide: false }))")
    b.reload(); b.wait_for_selector('#view > *'); b.wait_for_timeout(400)
    b.screenshot(path=str(OUT / 'pc.jpg'), type='jpeg', quality=74); made.add('pc'); print('✓ pc')
    br.close()

# Las imágenes que el manual usa deben existir; las que ya no usa, se borran
src = (ROOT / 'js/views/manual.js').read_text()
used = set(re.findall(r"img: \['([\w-]+)'", src))
missing = used - made
if missing: raise SystemExit(f'Faltan capturas: {sorted(missing)}')
for f in OUT.glob('*.jpg'):
    if f.stem not in used: f.unlink(); print('· borrada', f.name)
