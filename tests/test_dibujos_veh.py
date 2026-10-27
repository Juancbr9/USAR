"""Dibujos de vehículos: cada id de VEH_ART (y cada módulo de la autobomba Renault) tiene su img/veh/<id>.webp, de 640 px
de ancho con fondo transparente, y está en la caché del service worker.
Uso: python3 tests/test_dibujos_veh.py"""
import pathlib, re, sys
import cv2

ROOT = pathlib.Path(__file__).resolve().parent.parent
config, sw = [(ROOT / f).read_text() for f in ('js/config.js', 'sw.js')]
art = [i.lower() for i in re.findall(r"'(V-[A-Z0-9-]+)'", re.search(r'const VEH_ART = \[(.*?)\];', config, re.S).group(1))]
mods = re.findall(r"'(v-[a-z0-9-]+)'\]", re.search(r'const RENAULT_MOD = \{(.*?)\};', config, re.S).group(1))
problems = []
for name in dict.fromkeys(art + mods):
    f = ROOT / 'img' / 'veh' / f'{name}.webp'
    if f"'img/veh/{name}.webp'" not in sw: problems.append(f'{name} no está en FILES de sw.js')
    if not f.exists(): problems.append(f'falta {f.name}'); continue
    im = cv2.imread(str(f), cv2.IMREAD_UNCHANGED)
    if im is None or im.shape[1] != 640 or im.shape[2] != 4: problems.append(f'{f.name}: {None if im is None else im.shape}')
    elif min(im[0, 0, 3], im[0, -1, 3], im[-1, 0, 3], im[-1, -1, 3]) > 8: problems.append(f'{f.name}: el fondo no es transparente')
# En la caché no sobra ningún dibujo que ya no exista
for name in re.findall(r"'img/veh/([a-z0-9-]+)\.webp'", sw):
    if not (ROOT / 'img' / 'veh' / f'{name}.webp').exists(): problems.append(f'sw.js pide img/veh/{name}.webp, que no existe')
print(f'{len(art)} modelos con dibujo y {len(mods)} vistas de la Renault')
print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
