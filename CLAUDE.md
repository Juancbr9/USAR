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
  Cada material puede tener persona a la que está asignado (`holder`; sale en su ficha).
- Almacén (`js/views/pasillo.js`, pestaña `almacen` del menú): todos los pasillos juntos, por número y con estantería a
  izquierda y derecha: Parque 1 y 2, USAR 3, Agua 4, Cuerdas 5, Motosierras 6; todo configurable en la app. El pasillo de
  USAR ya no está en su página (lo pidió el usuario): es uno más del Almacén. Un hueco de pasillo es un número (`pasDoor`,
  `pasDe` en `js/config.js`) en el mismo campo `door` que el contenedor y los armarios, así que lo de USAR (`gear`, `boxes`,
  `consumables`, `epis`) va a cualquier pasillo sin campos nuevos. El material `matesp` guarda `pas`, `lado`, `mod`, `niv`
  (hueco de pasillo), `door` (contenedor o armario) o `enveh` (un vehículo que no es el suyo); usar siempre `matLugar`,
  `matPoner` y `huecoTxt`. Cualquier cosa se mueve a cualquier sitio con `moverA(kind, id)` («Mover») o arrastrándola
  (`moverCon`, con «Deshacer»); mover no cambia de quién es.
- Entrada (`js/sesion.js`): usuario y contraseña, sin lista de nombres (lo pidió el usuario; no volver a enseñarla). El
  usuario es el nombre en la app; cuando se aplique en la base de datos el cambio de `supabase.sql` (columna `usuario`
  de `private.usar_pins`), también las últimas cifras del móvil: entonces poner `LOGIN_CIFRAS = true` en `js/config.js`.
  Una contraseña de partida (`cambiar`) obliga a elegir una propia al entrar (`pinPropio`).
- Tipografía: IBM Plex va dentro de la app (`fonts/*.woff2`, `@font-face` al principio de `styles.css`, en `FILES` de
  `sw.js`); no volver a cargarla de internet. Ningún texto puede salirse de su recuadro ni cortarse: lo comprueba
  `tests/test_desbordes.py` en todas las pantallas y ventanas (al añadir una pantalla o ventana, añadirla a su lista).
- Vehículos (`js/views/vehiculos.js`): lo que importa es cada matrícula (`units` de cada modelo), no el modelo. Cada una
  tiene su ficha (`unidadView`), su pelotón (`unitPel`: campo `pel`, o se saca de `use`), su material (dueño
  `'veh:<id>#<unidad>'`; `duenoDe` da `{ veh, unit }`) y su checklist. La autobomba Renault lleva por matrícula su
  configuración (`unitMod`, de serie `lcif`); los contenedores pequeños ya no son configuraciones: son «módulos»
  (registros `vehicles` con `tipo: 'modulo'`, sin matrículas; `esModulo`), aparte, con su material.
- Revista o checklist (`checklistForm` en `js/views/material.js`): de cada cosa, «Bien», «Falta» (estado `FALTA`) o «Roto»
  (`AVERIADO`), con nota; en una matrícula lleva además lo del vehículo, kilómetros y combustible (registros `vchecks`,
  con `mat`). Queda quién lo hizo y qué estaba mal (`matRevistas`, `checklistHistorial`); lo que falta pasa a Necesidades.
- Confianza: cualquiera del equipo rellena todo (material de cualquier apartado, vehículo o USAR, modelos y matrículas);
  lo pidió el usuario, no volver a restringirlo. Con usuario de la base de datos, `puedeFlota` espera al registro
  `meta/flotaabierta`, que crea el cambio de políticas de `supabase.sql` (hasta entonces el servidor solo deja al jefe).
- Material (`matesp`): además de estado, hueco y persona, lleva `caduca` (fin de vida útil), `fab`, foto (`Img`, clave
  `mat:<id>`) e historial (registro de cambios con ref `matesp:<id>`). El estado `BAJA` («Para dar de baja») no cuenta
  como material (`matVivo`). Cada dueño tiene inventario imprimible y CSV, etiquetas QR (`#m=<id>` abre la ficha;
  `#h=<apartado>.<pas>.<lado>.<mod>.<niv>` abre un hueco) y aviso de revista cada N días (`meta/revcada`).
- Qué especialidad hay en cada pasillo: Almacén → «De quién es cada pasillo» (`almacenForm`); lo que mide cada lado,
  «Módulos y baldas» (`pasConfig`, meta `pasgeo`).
- Movimiento y acabados: bloque «ACABADOS» al final de `styles.css` (respuesta al toque, indicadores que se deslizan,
  barras que crecen, destello del hueco de destino, asa de las ventanas). Las animaciones solo corren con `html.motion`
  (`motion()` en `js/ui.js`: nunca con movimiento reducido ni en las pruebas). Sin degradados, cristal ni sombras en reposo.
- Ver cómo está todo de un vistazo (bloque «ORGANIZACIÓN» al final de `styles.css`): Inicio lleva una tabla con una fila
  por especialidad y cuatro datos alineados (gente, material, revista y lo que falta; `espTiles` en `js/ui.js`), con color
  solo en lo que hay que atender; Logística, un resumen de cuatro cifras que lleva a sus tres bloques (Personal, Vehículos
  y almacén, Material); y el Almacén, un plano de los pasillos con lo llena que está cada estantería (`pasSelector`).
- Necesidades (`js/views/necesidades.js`, registros `needs`): lo que falta o hay que pedir, por apartado, USAR, vehículos
  o general; pestaña en cada apartado y panel en Logística.
- Situación del personal: cada persona está «En base» o ausente con motivo, lugar y fechas (`aus`); se ve en Personal →
  «Situación», se cambia en su ficha o con «Pasar lista», y una ausencia con `desde` futuro es solo prevista.
  Además, cada persona guarda en `plan` todas sus ausencias con fechas (vacaciones, permisos, cursos…); se ven y se
  apuntan en Personal → «Vacaciones» (`js/views/cuadrante.js`), con mínimos por especialidad (`meta/minimos`). Para saber
  si alguien falta un día, usar siempre `ausDe`/`ausenteEl`/`ausHoy` (`js/data.js`), que miran `aus` y `plan`.
