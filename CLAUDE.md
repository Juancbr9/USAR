# USAR 242 · Instrucciones para el agente

- Responder en español.
- El usuario es RODRI (acceso completo; ver `ADMIN` en `js/config.js`).
- Antes de subir cambios: `bash tests/run_all.sh` (todas las pruebas en verde).
- **Publicar siempre**: al terminar un cambio, abrir la PR a `main` y, cuando la comprobación «pruebas» de GitHub
  pase y no haya conflictos, fusionarla sin preguntar (lo ha pedido el usuario). Si las pruebas fallan, arreglarlo
  antes; nunca fusionar en rojo.
- Al cambiar archivos de la app, subir la versión de `CACHE` en `sw.js` (y añadir a `FILES` los archivos nuevos). La app
  Android (`android/`) se actualiza sola con eso; solo necesita APK nuevo si cambia `android/` (ver `android/README.md`).
- Dibujos de vehículos: `img/veh/<id en minúsculas>.webp`, 640 px de ancho, fondo transparente y sin línea de suelo,
  mirando a la derecha; añadir el id a `VEH_ART` en `js/config.js`.
