# SIER 242 (antes USAR 242) · Instrucciones para el agente

- Responder en español.
- La app es de toda la SIER 242 y es de logística: dónde está cada persona, qué material tiene y el material de cada
  especialidad y de cada vehículo. USAR es una parte (grupo «USAR» del menú). Ya no hay actividades (intervenciones,
  ejercicios, maniobras, convoyes, worksites, víctimas…): se quitaron a petición del usuario; no volver a añadirlas. El repositorio es **público**: nunca poner en el
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
- Apartados de especialidades y equipos: se definen en `APARTADOS` (`js/config.js`) y todos usan la misma pantalla
  (`js/views/apartados.js`: equipo, material, revista y notas). Para añadir uno nuevo basta una entrada más en `APARTADOS`
  (sale solo en el menú, en Inicio, en Logística y en los vencimientos). Su icono propio va en `img/esp/<apartado>.webp`
  y se apunta en `ESP_ART`. USAR conserva sus pantallas propias (contenedor, pasillo, armarios…).
- Material de apartados y vehículos: registros `matesp` con dueño (`ap` o `veh`), en `js/views/material.js`; el dueño se
  pasa como texto (`'ap:agua'`, `'veh:V-…'`).
  Cada material puede tener hueco en el pasillo dibujado de su especialidad (`mod`, `niv`; `js/views/pasillo.js`, con
  módulos y baldas configurables por apartado) y persona a la que está asignado (`holder`; sale en su ficha).
- Situación del personal: cada persona está «En base» o ausente con motivo, lugar y fechas (`aus`); se ve en Personal →
  «Situación», se cambia en su ficha o con «Pasar lista», y una ausencia con `desde` futuro es solo prevista.
