# USAR 242

[![Pruebas](https://github.com/Juancbr9/USAR/actions/workflows/pruebas.yml/badge.svg)](https://github.com/Juancbr9/USAR/actions/workflows/pruebas.yml)

App web del equipo **USAR 242**: contenedor con sus huecos B1–B20 y sus cajas H (lateral izquierdo) y U (lateral derecho) tal como figuran en las hojas pegadas en él y los vehículos que salen en cada actividad con lo que carga cada uno, el personal (13 integrantes) con su puesto, documentación y EPI, consumibles, revistas y avisos. Funciona en el móvil, se puede instalar en la pantalla de inicio y sigue funcionando sin cobertura.

## Diseño

Colores inspirados en la UME (verde de uniformidad y amarillo señal), tipografía Barlow y una franja de chevrones como en los vehículos de emergencia. No se usa el escudo oficial de la UME. Cada herramienta tiene una ilustración propia, que se sustituye por la foto real si se añade una.

Navegación con el **menú de tres rayas** (arriba a la izquierda): todas las secciones agrupadas por área, con su color y un punto cuando tienen algo pendiente. En el móvil, además, una barra abajo con Inicio, Actividades, Material, Equipo y «Más» (el menú completo). En tablet horizontal y PC el menú queda fijo a la izquierda.

## Qué hace

La app está ordenada en **cuatro áreas, cada una con su color** (la cabecera toma el color del área; cada sección aparece una sola vez, en el menú):
**Activación** (rojo: intervenciones y ejercicios), **Logística** (azul: Material —contenedor, en revisión, pasillo, armarios, otros, fungible y entregas—, revista, vehículos y despliegue), **Equipo** (verde petróleo: personal, calendario y vencimientos) y **Ajustes** (gris: general, listas, manual y guía). El menú lateral va por niveles: cada área se despliega al tocarla. El gesto de atrás del móvil vuelve a la pantalla anterior de la app (cierra antes la foto, la ventana o el menú). La app no se amplía con dos dedos; solo las fotos (visor a pantalla completa) y los mapas. Con una operación en marcha, una barra a rayas aparece en todas las pantallas: roja si es real y ámbar si es un ejercicio.

- **Avisos**: averías, equipos en revisión, vencimientos en los próximos 30 días, stock bajo y material fuera del contenedor. Informe con un toque para **WhatsApp**.
- **Intervenciones y ejercicios** (listas separadas): cada uno con tipo de emergencia y **material sugerido** según ese tipo, fecha, ubicación (enlace a Maps), punto de reunión, jefe, canal de radio, equipos con su jefe/función/sector, puesto de cada persona, vehículos (los modelos se repiten: tres SsangYong y un camión) con matrícula, conductor, ocupantes y lo que carga cada uno, material: el contenedor completo o solo lo que se marque (de cualquier sitio), con lo que va en cada vehículo, y el material extra que se apunte (queda marcado como fuera mientras dura), seguridad, contactos, notas, diario con hora y cierre con lecciones aprendidas. Orden de salida por WhatsApp, ficha imprimible y duplicar para reutilizar.
- **Método UME / INSARAG** dentro de cada operación, por pestañas:
  - **Fases**: activación, información, reconocimiento, organización de la zona, búsqueda, rescate y retirada, cada una con su lista de comprobación; el cambio de fase queda en el diario.
  - **Funciones clave**: oficial de seguridad, hombre-puerta, vigía, jefe ByR, búsqueda, estructuras, sanitario y logística.
  - **Seguridad**: información inicial, zona de trabajo (distancia de seguridad = 2 × altura, entrada única, punto de reunión, rutas, suministros cortados, peligros), evaluación de riesgos probabilidad × consecuencias, briefing de seguridad para WhatsApp y **señales acústicas** que suenan en el móvil (evacuación, parar, continuar) con **recuento** en el punto de reunión.
  - **Worksites**: código INSARAG (A-1, A-2b), GPS, datos del edificio, **triaje A–D** paso a paso, niveles ASR, trabajos necesarios, evaluación estructural de 9 factores y **dibujo del marcaje** de fachada; marcaje rápido C/D de lugares despejados.
  - **Víctimas**: referencia única (A-1-V1), localización, **triaje START**, aviso de aplastamiento y hora del torniquete, rescate, extracción y entrega con contacto; la marca V con L-n/D-n se actualiza sola.
  - **Espacios confinados**: mediciones O₂ / LEL / CO / H₂S con decisión de entrada, roles, autonomía del ERA (litros × bar ÷ 50) y cuenta atrás hasta el silbato.
  - **Informes**: informe de situación, informe de worksite, fichas de víctimas, desmovilización, post-misión (o juicio crítico en ejercicios) y resumen de la misión. Dosier completo imprimible.
  - **Ejercicios**: plan de la sesión (objetivos, instructores, supuesto, seguridad) y juicio crítico.
- **Control de personal** (lista de verificación INSARAG): disponibilidad al activar (voy / con retraso / no puedo), recuento periódico con aviso (cada 30 min por defecto, tras cada señal y tras una réplica), salidas de la base con hora de regreso, control diario de bienestar, registro médico del equipo y aviso de hidratación con calor. Los datos de salud se comparten con el equipo (recomendable activar el modo seguro).
- **Informes INSARAG**: informe de worksite por periodo operativo (campos G1–G23, numerado, documento de relevo), ficha de extracción con códigos V y sin datos personales, sectores (ASR 1), necesidades humanitarias y ficha del equipo (Team Fact Sheet).
- **Vigilancia estructural**: testigos de grietas, apuntalamientos (cada 12 h) e inclinación, con aviso cuando toca revisar y botón «Ha habido una réplica».
- **Plan de comunicaciones** tipo ICS 205 dentro de la orden de salida y del dosier.
- **Croquis y exportación**: posiciones GPS de worksites, base y punto de reunión a escala sin cobertura; CSV con códigos INSARAG, GeoJSON y KML (Google Earth, CalTopo, ATAK).
- **Alistamiento y despliegue**: pasaporte (aviso si quedan menos de 6 meses), cualificaciones con caducidad, horas de formación, contacto de emergencia, manifiesto de personal y **manifiesto de material** por función con peso, volumen, valor, bulto y mercancías peligrosas.
- **Salvaguarda de patrimonio (BIC)**: intervenciones o ejercicios para poner a salvo los bienes culturales de una iglesia, convento o museo ante incendio, erupción, inundación o terremoto. Fases propias, inmueble y amenaza con tiempo disponible, inventario de bienes con número (BC-001), foto y prioridad (valor + riesgo + facilidad de traslado), recorrido documentar → embalar → trasladar → depósito con cadena de custodia, protección in situ de lo que no se mueve, consejos de manipulación por tipo de bien, acta de entrega, etiquetas y plantilla de serie.
- **Personal**: todo de cada persona en una sola ficha. Lista agrupada por célula con el perfil de misión (5 perfiles, incluido el equipo USAR UME) y el EPI de reserva; alta de personas nuevas, «Editar datos» (nombre, célula, puesto, contacto y foto), **baja** (conserva el historial y se puede deshacer) y eliminación; ficha de cada persona con foto, teléfono (llamar o WhatsApp), **documentos escaneados** (DNI, pasaporte, carné, reconocimiento médico, cursos…) con número oculto, fechas y avisos de caducidad (pasaporte con 6 meses), **varias funciones** además del puesto (por ejemplo sanitario y búsqueda técnica), cualificaciones, **EPI asignado** (el mínimo INSARAG con talla, estado y caducidad) e historial de operaciones con horas en zona. Las fotos se comparten con el equipo y entran en la copia de seguridad.
- **Vencimientos**: documentos, cursos, EPI y mantenimiento del material en una sola lista por fecha.
- **Listas y opciones**: todos los desplegables traen opciones de serie y se pueden añadir las vuestras («➕ Otra…» o desde Ajustes → Listas y opciones); las de serie se pueden ocultar. Los formularios recuerdan el último valor usado donde ahorra tiempo.
- **Búsqueda** de material, personas, documentos, operaciones, worksites y bienes.
- **Herramientas de campo**: botón «+» rojo con la operación en curso (nota de voz, fichar con QR, recuento, señales, víctima, worksite, foto…), **dictado por voz** en el diario y en los textos (frase a frase, sin palabras repetidas), **fotos por worksite** con hora, autor y GPS, **tarjetas QR del personal** (tamaño tarjeta) para fichar en la puerta escaneando con la cámara, y avisos del sistema cuando la app está en segundo plano.
- **Modo sol** (alto contraste) y **botones grandes** para guantes; el botón de arriba cambia entre claro, noche y sol.
- **Calendario** de ejercicios, formación, guardias y reuniones: convocatoria por WhatsApp, añadir al calendario del móvil (.ics), asistencia y horas de formación por persona; un ejercicio del calendario se convierte en operación con un toque.
- **Mapa con calles** (OpenStreetMap) con los worksites por categoría, la base, el punto de reunión y tu posición; lo que se ve con cobertura queda guardado para verlo sin conexión.
- **Usuarios y permisos (modo seguro)**: cada persona entra con su correo y contraseña y solo el personal dado de alta ve los datos; todos ven todo y los jefes dan de alta a los miembros (Ajustes → Miembros y permisos).
- **Manual de uso** (Ajustes → Manual de uso): cada apartado a fondo, paso a paso, con un ejemplo real y **capturas anotadas con números, recuadros y flechas** (leyenda debajo de cada imagen). Las capturas se regeneran con `python3 tests/capturas_manual.py`.
- **Tablet y PC**: en tablet horizontal y ordenador, barra lateral con todas las secciones y pestañas de la operación en columna.
- **Fotos con la cámara o la galería** en todos los campos de foto (bienes culturales, documentos, personas, material).
- **Guía de campo**: fichas sin conexión del Manual de Campo USAR 2023 (señales, marcaje, triaje, ASR, búsqueda, cargas, apuntalamiento, corte, zanjas, confinados, MMPP, sanidad, riesgos, BoO, ética, tráfico) y calculadoras (peso de cargas y losas, distancia de seguridad, ERA, anclajes).
- **Plantillas**: tres de serie (colapso estructural, búsqueda técnica, rescate vertical) que rellenan equipos, puestos, vehículos, material y seguridad; y las propias, guardadas desde cualquier operación.
- **Fichaje en zona (hombre-puerta)**: entrada y salida de cada persona, tiempo seguido en zona con aviso de relevo y recuento; al finalizar se cierra la salida de todos.
- **Material** (en el menú, con sus subopciones): **Contenedor** (el dibujo), **En revisión**, **Pasillo**, **Armarios** (dibujo de tres armarios de dos puertas para monos, botas, gafas, guantes, documentación…) **Escalón** (material en revisión o arreglándose), **Material fungible** (al final, plegado) y **Entregas** a personal de fuera del equipo USAR: a quién, qué, hasta cuándo, fotos y notas del estado y **firma con el dedo**; devolución con su estado y **acta de entrega en PDF** (material, estado, fotos y recuadros de firma de quien entrega y quien recibe, más la devolución) para imprimir o enviar. **Notas** en cualquier equipo o caja que marcan la **novedad** (Inicio, dibujo y En revisión). **Ficha de revisión**: situación (en el taller, a la espera, inoperativo u operativo con defecto), desde cuándo, dónde o quién lo tiene, motivo, notas e historial al terminar.
- **Contenedor**: **dibujo por laterales** sobre la imagen del lateral abierto (no crece hacia abajo: lo que no cabe en un hueco sale como «+N»), como en las hojas del contenedor (izquierdo B1–B10 y derecho B11–B20; «B3 y B6» y «B13 y B16» comparten hueco arriba) donde se ve cada caja con su color real y el material suelto; se reorganiza **arrastrando** (en el móvil, mantener pulsado y arrastrar) a otro hueco o dentro de una caja, o con «Mover». Material común (no asignado a nadie) con cantidad, foto, nº de serie, próximo mantenimiento, peso y estado; se añade, mueve y borra.
- **¿Dónde está?**: buscador en todas las pantallas; dice contenedor (lateral y hueco), pasillo, armario u otros y la caja, sin necesidad de tildes, y lleva al dibujo con la caja parpadeando.
- **Vehículos**: los 15 modelos de la unidad, con su dibujo (o una foto) (SsangYong, VPI, Amarok, Moto PM, Ambulancia, guaguas, Cupra, autobombas, camiones, Grúa y Minimáquina). No hay un número fijo: en cada actividad se añaden los que salen, con su matrícula y su carga.
- **Calendario**: los eventos de varios días quedan marcados en todos sus días.
- **Cajas Peli**: código, modelo, color (negra o amarilla, se cambia con un toque), medidas, peso en vacío, peso calculado con lo de dentro o pesado y mercancías peligrosas; etiqueta imprimible con QR y lista de contenido.
- **Revista**: se elige qué se revista (laterales, sin ubicar, pasillo, armarios, otros) y el motivo; de cada equipo: correcto, con fallo, en el taller, en otro sitio (cambia su ubicación), de baja o no se revista; «solo lo que falta».
- **Coordenadas** en latitud/longitud, UTM o MGRS (se escriben en cualquiera y se ven en la que elijas en Ajustes → Unidades) y distancias en m, km o cm.
- **Modo mantenimiento**: activo de serie. Solo **RODRI** usa la app; el resto, al entrar, ve «USAR 242 EN FASE DE MANTENIMIENTO» con la animación de RODRI y puede cerrar sesión. RODRI lo quita o lo vuelve a poner en **Ajustes → Mantenimiento** y el cambio llega a todos los móviles con los datos compartidos.
- **Inicio de sesión**: con el correo y la contraseña del usuario de Supabase; la primera vez cada uno crea su cuenta con el correo con el que le dio de alta el jefe y se le asocia su nombre del equipo. Al abrir la app solo se pide la contraseña (o la huella), también sin cobertura: el móvil guarda una huella cifrada (PBKDF2), nunca la contraseña; bloqueo de 30 s tras 5 intentos. Lo que hace cada uno queda con su nombre.
- **Guía de campo**: un apartado abierto a la vez.
- **Códigos QR**: cada equipo tiene su QR; al escanearlo con la cámara se abre su ficha. Se pueden imprimir las etiquetas de una puerta entera.
- **Préstamos**: registrar quién saca un equipo del contenedor y cuándo vuelve.
- **Revista**: checklist puerta por puerta; los fallos pasan a revisión y queda el historial.
- **Stock**: consumibles con aviso por debajo del mínimo.
- **Copias de seguridad** en JSON y manifiesto imprimible.

## Seguridad, accesibilidad y rendimiento

- **Seguridad**: todo lo que se pinta va escapado; los datos que llegan de la nube o de una copia pasan un filtro (identificadores, referencias, números y fotos con forma válida), así una fila manipulada no puede ejecutar código en los móviles del equipo. Política de seguridad de contenido (CSP) que solo permite scripts de la propia app. Los datos médicos se quedan en el móvil.
- **Accesibilidad**: pensada para usar con guantes y al sol: botones de al menos 44 px, contraste WCAG AA en los tres modos, foco visible, ventanas que guardan el foco, movimiento reducido si el móvil lo pide y campos de 16 px. Por decisión del equipo la página no se amplía con dos dedos (fotos y mapas sí).
- **Sin cobertura**: la app no espera a la red más de 3 s; si tarda, abre la copia guardada y se actualiza en segundo plano. Las tipografías y los mapas vistos también se guardan.

## Datos compartidos del equipo

La conexión con la base de datos del equipo (Supabase, proyecto `usar-242`, modo seguro) va integrada en la app (`SUPA` en
[`js/config.js`](js/config.js)): nadie tiene que configurar nada. Para dar acceso a alguien, un jefe añade su correo y su
nombre en **Ajustes → Miembros y permisos**; esa persona abre la app, pulsa «¿Primera vez? Crea tu cuenta» y entra.
El esquema de la base de datos está en [`supabase.sql`](supabase.sql).

Los cambios hechos sin cobertura se guardan en el móvil y se envían al recuperar la conexión.

## Publicarla

En GitHub: **Settings → Pages → Branch `main` / `(root)` → Save**. Quedará en `https://juancbr9.github.io/USAR/`.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html`, `styles.css` | Estructura y diseño |
| `js/config.js` | Equipo, puertas, EPI y perfiles de misión (lo primero que se edita) |
| `js/metodo.js` | Método de trabajo: fases, funciones, triajes, riesgos, umbrales de atmósfera |
| `js/marcaje.js` | Dibujos del marcaje INSARAG |
| `js/data.js`, `js/sync.js` | Datos iniciales, almacén local y sincronización con Supabase |
| `js/ui.js` | Navegación, Inicio, búsqueda, ventanas y formularios |
| `js/views/*.js` | Una pantalla por archivo: operaciones y su ficha (mision, seguridad, worksites, victimas, confinados, informes), guía de campo, contenedor, revista, EPI, fichaje, plantillas, puestos, stock y ajustes |
| `qr.js` | Generador de códigos QR sin dependencias |
| `vendor/jsQR.js` | Lector de códigos QR (jsQR, licencia Apache 2.0) para los móviles sin lector nativo |
| `sw.js`, `manifest.webmanifest`, `icon*` | Instalación y uso sin conexión |
| `supabase.sql` | Tabla de la base de datos compartida |
| `manual/` | Capturas del manual de uso |
| `tests/` | Pruebas automáticas (se ejecutan en GitHub en cada cambio) y `capturas_manual.py` para regenerar las capturas |

Al cambiar cualquier archivo, sube la versión de `CACHE` en `sw.js` para que los móviles reciban la actualización.

## Pruebas

`bash tests/run_all.sh` ejecuta todas las pruebas: generador de QR, sincronización entre dos móviles (con un servidor que imita Supabase), una operación completa, plantillas y fichaje, el método de trabajo (fases, señales y recuento, worksites, víctimas, confinados, informes y guía), las mejoras INSARAG (alistamiento, PAR, salidas, bienestar, informes por periodo, vigilancia, croquis y exportación) personal y listas, uso sin conexión, **seguridad** (código metido en todos los campos y datos manipulados de la nube: no se ejecuta nada ni se rompe ninguna pantalla) y **accesibilidad** (nombres para el lector de pantalla, contraste en claro, noche y sol, botones de 44 px para usar con guantes, letra de 16 px en los campos; en GitHub también con axe-core). GitHub las ejecuta solas en cada subida; el resultado aparece en la pestaña **Actions**.
