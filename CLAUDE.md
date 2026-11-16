# SIER 242 (antes USAR 242) · Instrucciones para el agente

- Responder en español.
- La app es de toda la SIER 242; USAR es una parte (grupo «USAR» del menú). El repositorio es **público**: nunca poner en el
  código ni en las pruebas nombres completos ni teléfonos del personal (se cargan en la app con Personal → «Importar»).
- El usuario es RODRI (acceso completo; ver `ADMIN` en `js/config.js`).
- Antes de subir cambios: `bash tests/run_all.sh` (todas las pruebas en verde).
- **Publicar siempre**: al terminar un cambio, abrir la PR a `main` y, cuando la comprobación «pruebas» de GitHub
  pase y no haya conflictos, fusionarla sin preguntar (lo ha pedido el usuario). Si las pruebas fallan, arreglarlo
  antes; nunca fusionar en rojo.
- Al cambiar archivos de la app, subir la versión de `CACHE` en `sw.js` (y añadir a `FILES` los archivos nuevos). La app
  Android (`android/`) se actualiza sola con eso; solo necesita APK nuevo si cambia `android/` (ver `android/README.md`).
- Dibujos de vehículos: `img/veh/<id en minúsculas>.webp`, 640 px de ancho, fondo transparente y sin línea de suelo,
  mirando a la derecha; añadir el id a `VEH_ART` en `js/config.js`.
- Identidad visual (bloque «IDENTIDAD SIER 242» al final de `styles.css`): marco oscuro de basalto (`--frame`: cabecera, menú y
  barra lateral), hoja clara con esquinas redondeadas, naranja de rescate como único acento (la variable se sigue llamando
  `--yellow`), tipografía IBM Plex (Sans, Sans Condensed y Mono para cifras), títulos sin mayúsculas ni cursiva y sin sombras
  en reposo. Las capturas del manual se regeneran con `python3 tests/capturas_manual.py`.
