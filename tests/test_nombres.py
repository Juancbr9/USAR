"""Ningún nombre global (función, const o let de primer nivel) se declara en dos archivos: el navegador no cargaría el
segundo archivo entero («Identifier … has already been declared»).
Uso: python3 tests/test_nombres.py"""
import re, glob, collections, pathlib, sys
ROOT = pathlib.Path(__file__).resolve().parent.parent
decl = collections.defaultdict(list)
for f in sorted(glob.glob(str(ROOT / 'js' / '*.js')) + glob.glob(str(ROOT / 'js' / 'views' / '*.js'))):
    for i, line in enumerate(open(f, encoding='utf-8'), 1):
        m = re.match(r'^(?:async\s+)?(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var|class)\s+([A-Za-z_$][\w$]*))', line)
        if m: decl[m.group(1) or m.group(2)].append(f'{pathlib.Path(f).relative_to(ROOT)}:{i}')
dups = {k: v for k, v in decl.items() if len(v) > 1}
print(f'{len(decl)} nombres globales')
print('PROBLEMAS:', dups or 'ninguno')
if dups: sys.exit(1)
