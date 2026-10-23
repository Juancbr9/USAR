"""Comprueba que el generador de QR propio (qr.js) produce códigos legibles en todos los tamaños.
Genera ~95 códigos con Node y los lee con OpenCV."""
import json, pathlib, subprocess, sys
import numpy as np, cv2

ROOT = pathlib.Path(__file__).resolve().parent.parent
gen = f"""
const QR = require({json.dumps(str(ROOT / 'qr.js'))});
const base = 'https://juancbr9.github.io/USAR/#join=eyJ1cmwiOiJodHRwczovL' + 'ABCdef0123456789-_xyzQ'.repeat(40);
const out = [];
for (let n = 10; n <= 640; n += 7) out.push(base.slice(0, n));
['G-101', 'G-702', 'EPI-04', 'G-K3F9A2X'].forEach(id => out.push('https://juancbr9.github.io/USAR/#g=' + id));
console.log(JSON.stringify(out.map(text => ({{ text, m: QR.build(text).map(r => r.map(c => c ? 1 : 0)) }}))));
"""
data = json.loads(subprocess.run(['node', '-e', gen], check=True, capture_output=True, text=True).stdout)
detectors = [cv2.QRCodeDetector(), cv2.QRCodeDetectorAruco()]
fails = []
for d in data:
    m = np.array(d['m'], dtype=np.uint8)
    ok = False
    for det in detectors:
        for scale in (6, 8, 10):
            img = cv2.resize((np.pad(1 - m, 4, constant_values=1) * 255).astype(np.uint8), None, fx=scale, fy=scale, interpolation=cv2.INTER_NEAREST)
            if det.detectAndDecode(cv2.GaussianBlur(img, (3, 3), 0))[0] == d['text']:
                ok = True; break
        if ok: break
    if not ok: fails.append(((m.shape[0] - 17) // 4, len(d['text'])))
print(f'{len(data)} códigos QR generados; ilegibles: {fails or "ninguno"}')
sys.exit(1 if fails else 0)
