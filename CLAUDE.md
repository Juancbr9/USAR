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
  Cada material puede tener hueco en un pasillo (`pas` n.º de pasillo, `lado` I/D, `mod`, `niv`; `js/views/pasillo.js`) y
  persona a la que está asignado (`holder`; sale en su ficha). Los pasillos del almacén van por número y tienen estantería
  a izquierda y derecha: Parque 1 y 2, USAR 3 (su propio dibujo), Agua 4, Cuerdas 5, Motosierras 6; todo configurable en la app.
- Confianza: cualquiera del equipo rellena todo (material de cualquier apartado, vehículo o USAR, modelos y matrículas);
  lo pidió el usuario, no volver a restringirlo. Con usuario de la base de datos, `puedeFlota` espera al registro
  `meta/flotaabierta`, que crea el cambio de políticas de `supabase.sql` (hasta entonces el servidor solo deja al jefe).
- Material (`matesp`): además de estado, hueco y persona, lleva `caduca` (fin de vida útil), `fab`, foto (`Img`, clave
  `mat:<id>`) e historial (registro de cambios con ref `matesp:<id>`). El estado `BAJA` («Para dar de baja») no cuenta
  como material (`matVivo`). Cada dueño tiene inventario imprimible y CSV, etiquetas QR (`#m=<id>` abre la ficha;
  `#h=<apartado>.<pas>.<lado>.<mod>.<niv>` abre un hueco) y aviso de revista cada N días (`meta/revcada`).
- Qué especialidad hay en cada pasillo: Logística → «Pasillos del almacén» (`almacenForm`, en `js/views/pasillo.js`).
- Necesidades (`js/views/necesidades.js`, registros `needs`): lo que falta o hay que pedir, por apartado, USAR, vehículos
  o general; pestaña en cada apartado y panel en Logística.
- Situación del personal: cada persona está «En base» o ausente con motivo, lugar y fechas (`aus`); se ve en Personal →
  «Situación», se cambia en su ficha o con «Pasar lista», y una ausencia con `desde` futuro es solo prevista.
  Además, cada persona guarda en `plan` todas sus ausencias con fechas (vacaciones, permisos, cursos…); se ven y se
  apuntan en Personal → «Vacaciones» (`js/views/cuadrante.js`), con mínimos por especialidad (`meta/minimos`). Para saber
  si alguien falta un día, usar siempre `ausDe`/`ausenteEl`/`ausHoy` (`js/data.js`), que miran `aus` y `plan`.
