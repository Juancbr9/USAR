"""Cada modelo de vehículo tiene su dibujo: img/veh/<id>.webp, 640 px de ancho, con transparencia, en VEH_ART y en la caché del sw.
Uso: python3 tests/test_dibujos_veh.py"""
import pathlib, re, sys
import cv2

ROOT = pathlib.Path(__file__).resolve().parent.parent
data, config, sw = [(ROOT / f).read_text() for f in ("js/data.js", "js/config.js", "sw.js")]
modelos = re.findall(r"veh\('(V-[A-Z0-9-]+)'", data)
art = re.findall(r"'(V-[A-Z0-9-]+)'", re.search(r'const VEH_ART = \[(.*?)\];', config, re.S).group(1))
problems = []
for m in modelos:
    f = ROOT / 'img' / 'veh' / f'{m.lower()}.webp'
    if m not in art: problems.append(f'{m} no está en VEH_ART')
    if f"'img/veh/{m.lower()}.webp'" not in sw: problems.append(f'{m} no está en FILES de sw.js')
    if not f.exists(): problems.append(f'falta {f.name}'); continue
    im = cv2.imread(str(f), cv2.IMREAD_UNCHANGED)
    if im is None or im.shape[1] != 640 or im.shape[2] != 4: problems.append(f'{f.name}: {None if im is None else im.shape}')
    elif min(im[0, 0, 3], im[0, -1, 3], im[-1, 0, 3], im[-1, -1, 3]) > 8: problems.append(f'{f.name}: el fondo no es transparente')
print(f'{len(modelos)} modelos, {len(art)} con dibujo')
print('PROBLEMAS:', problems or 'ninguno')
if problems: sys.exit(1)
