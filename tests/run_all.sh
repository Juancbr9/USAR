#!/usr/bin/env bash
# Ejecuta todas las pruebas de USAR 242.
# Requisitos: python3 con playwright, opencv-python-headless y numpy; node; navegador chromium de playwright.
set -euo pipefail
cd "$(dirname "$0")/.."

PORT_APP=${PORT_APP:-8080}
PORT_MOCK=${PORT_MOCK:-54321}
export APP_URL="http://127.0.0.1:$PORT_APP/index.html"
export MOCK_URL="http://127.0.0.1:$PORT_MOCK"

echo "▶ Comprobando sintaxis"
for f in qr.js sw.js js/*.js js/views/*.js; do node --check "$f"; done

python3 -m http.server "$PORT_APP" --bind 127.0.0.1 >/dev/null 2>&1 &
APP_PID=$!
trap 'kill $APP_PID ${MOCK_PID:-} 2>/dev/null || true' EXIT

start_mock() {
  [ -n "${MOCK_PID:-}" ] && kill "$MOCK_PID" 2>/dev/null || true
  PORT_MOCK=$PORT_MOCK python3 tests/mock_supabase.py >/dev/null 2>&1 &
  MOCK_PID=$!
  sleep 1
}

sleep 1
status=0
run() {
  echo; echo "▶ $1"
  if ! python3 "tests/$1" 2>&1 | tee /tmp/usar-test.log; then
    echo "✗ FALLÓ: $1"; status=1
    # En GitHub, el final de la salida también como aviso (se ve en el resumen de la ejecución)
    if [ -n "${GITHUB_ACTIONS:-}" ]; then echo "::error title=$1::$(tail -n 25 /tmp/usar-test.log | cut -c1-300 | sed 's/%/%25/g' | tr '\n' '\r' | sed 's/\r/%0A/g')"; fi
  fi
}

run test_qr.py
start_mock; run test_sincronizacion.py
run test_operaciones.py
run test_fichaje_plantillas.py
run test_metodo.py
run test_mejoras.py
run test_patrimonio.py
run test_personal.py
start_mock; run test_campo.py
run test_contenedor.py
run test_manual.py
run test_sin_conexion.py
run test_seguridad.py
run test_accesibilidad.py
start_mock; run test_sesion.py
run test_bloqueo.py
run test_material2.py
run test_mantenimiento.py
start_mock; run test_flota.py
run test_actividades.py
run test_iphone.py
run test_matriculas.py

echo
if [ $status -eq 0 ]; then echo "✓ Todas las pruebas pasaron"; else echo "✗ Alguna prueba falló"; fi
exit $status
