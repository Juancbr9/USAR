'use strict';
// USAR 242 · Manual de uso: cada apartado explicado a fondo, paso a paso, con capturas anotadas (números y flechas).
// Las capturas están en manual/ y se generan con tests/capturas_manual.py (datos de ejemplo). Los números de cada
// leyenda coinciden con los que aparecen dibujados sobre la imagen.

// Parte de una sección: { h: título, p: explicación, steps: [pasos], img: [archivo, pie, [[n, qué es], …]] }
const MANUAL = [
  { id: 'areas', area: 'help', icon: 'grid', title: 'Cómo está ordenada la app',
    what: 'La app se divide en cuatro áreas (Actividades, Logística, Equipo y Ajustes), cada una con su color, para que sepas siempre dónde estás. La cabecera toma el color del área. Todas las secciones están en el menú de tres rayas, arriba a la izquierda.',
    parts: [
      { h: 'La cabecera', p: 'Está siempre arriba, en todas las pantallas. Su color te dice en qué área estás.',
        img: ['cabecera', 'La cabecera', [[1, 'Menú de tres rayas: abre todas las secciones. El número rojo son los avisos pendientes.'], [2, 'Lupa: «¿Dónde está…?». Busca en todo y del material dice dónde está.']]] },
      { h: 'Debajo del nombre', p: 'Los datos del equipo se comparten solos. Solo si hay un problema sale un aviso debajo de «USAR 242»: sin conexión (con los cambios pendientes, que se envían solos al volver) o error al compartir.' },
      { h: 'El menú', p: 'Pulsa las tres rayas para abrir el menú. Va por niveles: arriba Inicio y las cuatro áreas, plegadas. Toca un área para desplegar sus secciones (al abrir otra, la anterior se pliega); dentro de Logística, toca «Material» para ver sus apartados. Un punto naranja o rojo indica que hay algo pendiente (una revista sin finalizar, documentos que caducan…). Para cerrarlo, toca fuera, la X, elige una sección o desliza desde el borde para volver atrás.',
        img: ['menu', 'El menú, con Logística y Material desplegados', [[1, 'Inicio, con el número de avisos.'], [2, 'Actividades (rojo): activación, ejercicios, maniobras y convoy.'], [3, 'Logística (azul): Material, revista, vehículos y despliegue.'], [4, 'Material: contenedor y almacén (contenedor, sin ubicar, pasillo, armarios, escalón y fungible), en revisión y entregas.'], [5, 'Punto de aviso: esa sección tiene algo que revisar.'], [6, 'Equipo (verde petróleo): personal, calendario y vencimientos.'], [7, 'Ajustes (gris): general, listas y opciones, este manual y la guía de campo.']]] },
      { h: 'Volver atrás', p: 'El gesto de atrás del móvil (deslizar desde el borde o el botón «atrás») vuelve a la pantalla anterior de la app: cierra primero la foto ampliada, la ventana o el menú que esté abierto y, si no hay nada abierto, va a la sección o pestaña de antes.' },
      { h: 'Zoom', p: 'La app no se amplía con dos dedos, para que no se descoloque al trabajar con guantes. Lo que sí se amplía: las fotos y dibujos (tócalos para verlos a pantalla completa; ahí se pellizca, se arrastra y doble toque para acercar) y los mapas. Si necesitas letra más grande, en Ajustes → General → Este móvil está «Botones y letra grandes».' },
      { h: 'Las cuatro áreas', steps: ['<b class="ac ac-ops">Actividades (rojo)</b>: la activación (salidas reales) y los ejercicios, por fases; y la logística de las maniobras y los convoyes.', '<b class="ac ac-log">Logística (azul)</b>: el material (contenedor y almacén con el pasillo, los armarios, el escalón y el fungible; en revisión y entregas), la revista, los vehículos y la preparación para desplegar.',
        '<b class="ac ac-team">Equipo (verde petróleo)</b>: las personas de la unidad, su puesto, documentación y EPI, el calendario y lo que caduca.', '<b class="ac ac-help">Ajustes (gris)</b>: los ajustes generales, las listas de opciones, este manual y la guía de campo.',
        'Con una operación en marcha aparece una franja a rayas bajo la cabecera, en todas las pantallas: roja si es una intervención real y ámbar si es un ejercicio. Tócala para volver a la operación.'] }
    ],
    example: 'Estás revisando el stock (cabecera azul) y llega una activación: al iniciarla, la franja roja «ACTIVACIÓN EN CURSO» te acompaña aunque vuelvas a Logística.',
    tips: ['En tablet en horizontal y en el PC no hay tres rayas: el menú está siempre abierto a la izquierda.', 'Escape (en el PC) cierra el menú y las ventanas.'] },

  { id: 'empezar', area: 'home', icon: 'home', title: 'Primeros pasos e Inicio', go: 'avisos',
    what: 'La app reúne el material del contenedor, los EPI, el personal y cada intervención o ejercicio. Funciona sin cobertura y comparte los datos entre todos los móviles del equipo.',
    parts: [
      { h: 'Entrar', steps: ['Toca tu nombre y pon tu PIN (de 4 a 8 cifras). El PIN te lo da RODRI, que es quien da acceso a cada uno (Ajustes → General → Equipo → Miembros y permisos). Sin correo ni nada que configurar.',
        'Cada vez que abres la app (o vuelves tras más de 5 minutos fuera) te pide solo el PIN (también sin cobertura), y al entrar vas siempre a Inicio. El PIN vale en cualquier móvil.',
        'Si fallas el PIN 5 veces seguidas, tu nombre queda bloqueado unos minutos. Si lo olvidas o se bloquea, RODRI te pone uno nuevo.',
        'Huella: la primera vez que entras te ofrece entrar con tu huella (o la cara) en ese móvil. Después se pide sola al abrir la app. Se activa o se quita en Ajustes → General.',
        'Todo lo que hagas queda apuntado con tu nombre. Para salir: Ajustes → General → «Cerrar sesión». Allí también cambias tu PIN. Quien tenía cuenta con correo puede seguir entrando con «Entrar con correo».'],
        img: ['entrar', 'Entrar con tu nombre y PIN', [[1, 'Toca tu nombre y luego pon tu PIN.'], [2, 'Quien entraba con correo puede seguir haciéndolo.']]] },
      { h: 'Instalar y compartir', steps: [ 'Instálala como una app: en Android, menú del navegador (⋮) → «Instalar aplicación»; en iPhone, botón Compartir → «Añadir a pantalla de inicio».',
        'Los datos del equipo se comparten solos en cuanto entras.'] },
      { h: 'La pantalla de Inicio', p: 'Es el cuadro de mando del día: la fecha y cuántas cosas hay que revisar, la operación en curso o la próxima, cuatro indicadores (material operativo, en revisión, personal con la documentación al día y vencimientos en 30 días; en verde si está bien, en ámbar o rojo si hay algo), los avisos, accesos rápidos a lo más usado y lo próximo del calendario. Toca un indicador para ir a su pantalla. Para todo lo demás, el menú de tres rayas.',
        img: ['inicio', 'Inicio', [[1, 'Saludo y cuántas cosas hay que revisar.'], [2, 'Operación en curso: tócala para abrirla; los números llevan a su pestaña.'], [3, 'Avisos, por tipo. Toca uno para ir a su ficha.']]] },
      { h: 'Avisos', p: 'En Inicio salen los avisos: equipos averiados o en revisión, material con novedad, mantenimientos y caducidades de los próximos 30 días, stock por debajo del mínimo, material fuera del contenedor y documentos de las personas. Toca cualquiera para ir a su ficha.' }
    ],
    example: 'Llegas al parque: entras como GRANADOS y en Inicio ves que la sierra de hormigón está en revisión y que el pasaporte de DORTA caduca en 4 meses.',
    tips: ['Tu PIN lo cambias en Ajustes → General → «Cambiar PIN» (hace falta conexión).', 'Abajo del todo, «Enviar estado» manda un resumen del material y los avisos (por WhatsApp o donde elijas).'] },

  { id: 'operacion', area: 'ops', icon: 'flag', title: 'Crear y llevar una intervención o ejercicio', go: 'intervenciones',
    what: 'Cada salida se prepara y se lleva desde Actividades → Activación (salidas reales) o Ejercicios (maniobras y simulacros): datos generales, equipos con su jefe, puestos, vehículos, material, seguridad, worksites, víctimas, diario e informes. Se trabaja por fases siguiendo el método de la UME.',
    parts: [
      { h: 'Crear la operación', p: 'Menú → Actividades → Activación o Ejercicios. Arriba, un botón grande para crear; debajo, las que están en curso, en preparación y las terminadas (plegadas), y las plantillas.', steps: ['Pulsa «Nueva intervención» o «Nuevo ejercicio».', 'Elige una plantilla (colapso estructural, búsqueda técnica, rescate vertical, salvaguarda de patrimonio o las vuestras) o «En blanco».',
        'Completa nombre, tipo de emergencia, ubicación, punto de reunión, jefe y canal de radio y pulsa Guardar.'],
        img: ['op-plantillas', 'Elegir plantilla al crear', [[1, 'Plantillas de serie y las que guardéis vosotros.'], [2, '«En blanco» para empezar de cero.']]] },
      { h: 'La ficha de la operación', p: 'Arriba están los datos y los botones principales; debajo, las pestañas. En el móvil las pestañas se deslizan de lado; en el PC van en una columna a la izquierda.',
        img: ['op-resumen', 'Resumen de una intervención en curso', [[1, 'Pestañas: Resumen, Personal, Material, Seguridad, Worksites, Víctimas, Diario e Informes.'], [2, 'Fase actual con su lista de comprobación.'], [3, 'Marca cada comprobación al hacerla.'], [4, 'Pasa a la siguiente fase cuando esté todo.']]] },
      { h: 'Personal y equipos', steps: ['Pestaña Personal → «Crear por células»: forma los equipos con sus jefes en un toque, según la célula de cada persona.', 'Toca un equipo para cambiar su jefe, función o sector; toca una persona para cambiar su puesto en esta operación.', '«Vehículo»: qué modelo sale (se puede repetir: tres SsangYong y un camión), su matrícula, quién conduce, quién va dentro y qué carga.'] },
      { h: 'Material', p: 'En una intervención sale el contenedor completo: viene marcado por defecto. También se puede llevar solo una parte (por ejemplo unas cosas sueltas en un vehículo pequeño) y material de fuera del contenedor. De cada cosa se elige dónde va: en el contenedor o en un vehículo de la salida.',
        steps: ['Pestaña Material → «Elegir material».', 'Arriba: «Contenedor completo» o «Solo lo que marque».', 'Marca lo que va (del contenedor, el pasillo, los armarios u otros) y, al lado, dónde va: en el contenedor o en uno de los vehículos que hayas añadido.', '«+ Extra» para lo que no está en la app: nombre, cantidad y dónde va. «Otra línea» añade más.', 'Al pulsar «Iniciar», todo ese material figura como fuera hasta que finalices la operación.'],
        img: ['op-material', 'Material de la operación', [[1, 'Sale el contenedor completo.'], [2, 'Material extra solo para esta salida.'], [3, 'Elegir a mano lo que sale.'], [4, 'Lo que va, agrupado por hueco y vehículo: toca un grupo para desplegarlo.']]] },
      { h: 'Material sugerido según la emergencia', p: 'Según el tipo de emergencia (colapso, búsqueda, rescate vertical, espacio confinado, inundación, accidente de vehículos o patrimonio), la app propone el material que suele hacer falta y aún no va: lo que está fuera del contenedor o, si sale solo una parte, lo que no has marcado. Al crear desde una plantilla, el tipo se pone solo.',
        steps: ['Pestaña Material → «Material sugerido».', 'Elige o cambia el tipo de emergencia.', 'Desmarca lo que no quieras y pulsa «Añadir lo marcado».', 'Después, en «Elegir material», indica si algo va en un vehículo.'],
        img: ['op-sugerido', 'Material sugerido', [[1, 'Tipo de emergencia.'], [2, 'Lo que se propone, ya marcado, y dónde está. Debajo, «Añadir lo marcado».']]] },
      { h: 'Orden de salida, iniciar y finalizar', steps: ['«Orden de salida» la envía por WhatsApp con personal, vehículos, material, seguridad y contactos.', '«Iniciar» al salir: arranca el reloj, aparece la franja de activación y el botón «+». La cabecera pasa a «modo misión»: oscura y con letra grande, con el tiempo transcurrido, la hora, quién está en zona, las víctimas pendientes y cuánto falta para el próximo recuento (toca una cifra para ir a su pestaña).', '«Finalizar» al terminar: pide el cierre y las lecciones aprendidas, cierra el fichaje y devuelve el material al contenedor.'] }
    ],
    example: 'Derrumbe de una vivienda en Telde: plantilla «Colapso estructural», ubicación «Calle Real 12», jefe GRANADOS, canal TETRA 2. Se envía la orden y se inicia a las 07:40. Sale el contenedor completo más «2 x Grupo electrógeno».',
    tips: ['El menú «···» de la operación permite duplicar, guardar como plantilla, imprimir el dosier completo o eliminar.', 'En un ejercicio, el Resumen incluye el plan de la sesión y en Informes, el juicio crítico.'] },

  { id: 'mas', area: 'ops', icon: 'plus', title: 'El botón «+» de la operación en curso',
    what: 'Mientras haya una operación en curso aparece un botón rojo «+» abajo a la derecha, en cualquier pantalla, con lo que más se usa en zona.',
    parts: [{ h: 'Acciones rápidas', steps: ['Pulsa el «+» rojo.', 'Elige: nota de voz, fichar con QR, recuento, señales, víctima, worksite, foto o salida de la base (en patrimonio, también «Bien cultural»).'],
      img: ['fab', 'Acciones rápidas', [[1, 'Nota de voz al diario: hablas y se escribe sola.'], [2, 'Fichar con QR escaneando la tarjeta de la persona.'], [3, 'Señales acústicas.']]] }],
    example: 'Con guantes y sin tiempo: «+» → «Nota de voz» y dictas «Grieta nueva en lado 2, se para el trabajo». Queda en el diario con hora y autor.',
    tips: ['El dictado necesita cobertura. Sin ella, escribe la nota.', 'Habla con normalidad y haz pausas: cada frase se escribe una vez. Toca otra vez el micrófono para terminar.'] },

  { id: 'personal-zona', area: 'ops', icon: 'users', title: 'Personal en zona: fichaje, recuento y salidas',
    what: 'El hombre-puerta controla quién entra y sale de la zona, cuánto lleva dentro (aviso de relevo) y hace los recuentos. También se anotan las salidas de la base.',
    parts: [{ h: 'Fichar', steps: ['Operación → Personal.', '«Entran todos» al empezar, o «Entra» / «Sale» persona a persona, o «Fichar con QR» escaneando su tarjeta.',
      'Cada 30 minutos (ajustable) la app pide un recuento; también tras cada señal o réplica.', '«Salida» en «Salidas de la base»: quién sale, adónde y cuándo vuelve. Si no vuelve a su hora, avisa.', '«Control diario» registra cómo está cada uno (bien / cansado / mal).'],
      img: ['op-personal', 'Control de personal en zona', [[1, 'Cuántos hay en zona, fuera y sin fichar.'], [2, 'Entran todos de una vez.'], [3, 'Cada persona con su tiempo en zona y su botón Entra / Sale.']]] }],
    example: 'A las 10:00 entran 8 personas. A las 11:05 DORTA aparece en rojo: «toca relevo». A las 10:30 la app avisa del recuento: faltan 0.',
    tips: ['Imprime las tarjetas QR en Menú → Equipo → Personal → «Tarjetas QR».'] },

  { id: 'seguridad', area: 'ops', icon: 'shield', title: 'Seguridad, señales y riesgos',
    what: 'Información inicial, zona de trabajo (distancia de seguridad, entrada única, punto de reunión, rutas), evaluación de riesgos, plan de radio, espacios confinados y señales acústicas.',
    parts: [
      { h: 'Zona de trabajo y riesgos', steps: ['Operación → Seguridad → «Zona de trabajo» → Editar: altura de lo que queda en pie, entrada, punto de reunión y ruta de evacuación. La app calcula la distancia de balizado.', 'Añade los riesgos: elige probabilidad y consecuencias y la app dice el nivel y qué hacer.', '«Enviar briefing de seguridad» lo manda por WhatsApp.'],
        img: ['op-seguridad', 'Zona de trabajo con la distancia de seguridad', [[1, 'Distancia de seguridad calculada (2 × altura).'], [2, 'Editar la zona.']]] },
      { h: 'Señales', steps: ['En Seguridad (o con el botón «+»), pulsa una señal (Evacuación, Parar, Continuar): el móvil pita fuerte y queda anotado.', 'Tras «Evacuación» se abre el recuento.', '«Ha habido una réplica»: para el trabajo, pide recuento y obliga a revisar testigos y apuntalamientos.'],
        img: ['senales', 'Señales acústicas desde el móvil', [[1, 'Evacuación: tres pitidos largos.']]] }
    ],
    example: 'Edificio de 9 m en pie: la app indica balizar a 18 m. Riesgo «Colapso secundario», probabilidad alta y consecuencias muy graves: Intolerable, no se trabaja hasta reducirlo.',
    tips: ['Sube el volumen para las señales.'] },

  { id: 'worksites', area: 'ops', icon: 'building', title: 'Worksites: triaje, marcaje y fotos',
    what: 'Cada edificio o zona con posibles víctimas es un worksite (A-1, A-2…). La app hace el triaje A–D, dibuja el marcaje INSARAG y guarda fotos, vigilancia estructural e informes por periodo.',
    parts: [
      { h: 'Lista y triaje', steps: ['Operación → Worksites → «Worksite».', 'Sector (letra), número y subdivisión se eligen de una lista: las letras van de la A a la Z sin la I ni la O; el número, si lo dejas en «Automático», es el siguiente libre.', 'Coordenadas: «Usar mi ubicación» o escríbelas en latitud/longitud, UTM o MGRS.', 'Riesgos para el marcaje: marca todos los que haya (amianto, gas…) o añade otros en «➕ Otra».', 'Responde al triaje (¿vivas confirmadas? ¿menos de 12 h?) y queda la categoría.'],
        img: ['ws-lista', 'Lista por prioridad', [[1, 'Cada worksite con su categoría y su nivel ASR.']]] },
      { h: 'Ficha y marcaje', steps: ['Añade cada nivel ASR: se pinta en el marcaje. Copia el dibujo en la fachada.', 'Haz fotos con «Foto» (con hora, autor y GPS).', 'Al terminar el periodo, «Informes por periodo» → «Informe»: es el documento de relevo.'],
        img: ['ws-ficha', 'Marcaje de fachada generado por la app', [[1, 'Marcaje para copiar en la fachada.']]] },
      { h: 'Triaje paso a paso', img: ['ws-triaje', 'Triaje paso a paso', []] }
    ],
    example: 'B-2: víctima viva confirmada que tardará más de 12 h → categoría B. ASR 3 hoy; riesgos «Amianto» encima de la caja.',
    tips: ['Las coordenadas se ven en el formato que elijas en Ajustes → Unidades (latitud/longitud, UTM o MGRS); en la ficha salen también los otros dos.', '«Mapa con calles» muestra todo sobre el mapa; lo visto con cobertura queda para después.', 'Los testigos de grieta avisan cuando toca revisarlos.'] },

  { id: 'victimas', area: 'ops', icon: 'heart', title: 'Víctimas: triaje START y trazabilidad',
    what: 'Cada víctima tiene una referencia (A-1-V1) y se sigue desde que se localiza hasta que se entrega. Incluye el triaje START y el aviso de síndrome de aplastamiento.',
    parts: [{ steps: ['Worksite o pestaña Víctimas → «Víctima». Indica planta, posición y cómo se localizó.', '«Triaje START»: responde las preguntas y queda el color.', '«Empezar rescate» → «Extraída» → «Entregar» (a quién y su contacto).', 'Si está atrapada por peso, la app avisa y permite anotar la hora del torniquete.'],
      img: ['victima', 'Ficha de una víctima', []] }],
    example: 'A-1-V1 localizada por llamada y escucha en planta 1, cocina. START: amarillo. Rescate de 2 h 10 min. Entregada a SVA 3.',
    tips: ['Los datos personales solo si los pide la autoridad; no salen en los mensajes.'] },

  { id: 'confinados', area: 'ops', icon: 'wind', title: 'Espacios confinados',
    what: 'Registro de mediciones (O₂, explosividad, CO, H₂S) con la decisión de entrada, quién entra y cuánto aire le queda al ERA.',
    parts: [{ steps: ['Seguridad → Espacios confinados → «Entrada»: lugar, botella y presión, quién entra, respaldo y vigilante.', 'Mide y guarda: la app dice si la entrada está permitida, limitada o prohibida.', '«Entran»: arranca la cuenta atrás hasta el silbato. «Salen todos» al terminar.'],
      img: ['confinado', 'Mediciones y decisión de entrada', []] }],
    example: 'Sótano: O₂ 18 %, LEL 6 % → limitada a emergencias, con ERA. Botella de 6 l a 300 bar: 30 min hasta el silbato.',
    tips: ['Mide siempre en este orden: oxígeno, explosividad y tóxicos; arriba, en medio y abajo.'] },

  { id: 'informes', area: 'ops', icon: 'file', title: 'Informes y exportación',
    what: 'Informe de situación, de worksite, fichas de víctimas, necesidades de la población, desmovilización y post-misión. También exporta a CSV, GeoJSON y KML.',
    parts: [{ steps: ['Operación → Informes → «Preparar y enviar» el informe de situación.', 'Toca un worksite o una víctima para enviar su ficha.', 'Exporta las posiciones para Google Earth, CalTopo o ATAK.'], img: ['informes', 'Informes de la operación', []] }],
    example: 'Cada 12 h se envía al mando el informe: 2 worksites en trabajo, 1 rescatada con vida, objetivos del siguiente periodo.', tips: [] },

  { id: 'bic', area: 'ops', icon: 'landmark', title: 'Patrimonio (BIC)',
    what: 'Para poner a salvo los bienes culturales de una iglesia, convento o museo ante incendio, lava, inundación o terremoto.',
    parts: [
      { h: 'Inventario y prioridades', steps: ['Crea la operación con la plantilla «Salvaguarda de patrimonio (BIC)».', 'Patrimonio → Inmueble y amenaza: responsable del bien, depósito y hora a la que llega la amenaza (cuenta atrás).', '«Bien»: nombre, tipo, dónde está, foto con la cámara, valor, riesgo y si se puede mover → prioridad P1, P2, P3 o in situ.'],
        img: ['bic', 'Inventario y recorrido de los bienes', [[1, 'Cuántos bienes hay en cada paso del recorrido.']]] },
      { h: 'Cadena de custodia', steps: ['Avanza cada bien: documentado → embalado → en traslado → en depósito. Queda quién y cuándo.', 'Imprime las etiquetas y el acta de entrega para firmar en el depósito.'],
        img: ['bic-bien', 'Ficha de un bien con su cadena de custodia', [[1, 'Cadena de custodia: cada paso con hora y persona.']]] }
    ],
    example: 'Convento de San Francisco, Garachico, lava en 2 h: la imagen del santo es P1 y sale primero; el retablo mayor se cubre in situ con manta ignífuga.',
    tips: ['Cada tipo de bien muestra cómo cogerlo y embalarlo.'] },

  { id: 'maniobras', area: 'ops', icon: 'tent', title: 'Maniobras y convoyes', go: 'maniobras',
    what: 'Actividades → Maniobras prepara la logística de unas maniobras: quién va, en qué vehículo, con qué material, dónde se duerme y qué se hace cada día. Actividades → Convoy organiza un movimiento de un sitio a otro, solo de ida o de ida y vuelta.',
    parts: [
      { h: 'Crear la maniobra', steps: ['«Nueva maniobra»: nombre, lugar, primer y último día, punto de reunión y responsable.', 'Alojamiento: «Siempre en el mismo sitio» (escribe dónde) o «Cambia según el día» (se pone en cada día del planning).', '«Cosas a tener en cuenta»: lo que cada uno debe llevar o saber.'] },
      { h: 'Quién va', p: 'En la ficha salen todos los nombres: toca cada uno para marcarlo o quitarlo, o pulsa «Todos» o «Nadie». No hace falta que cada persona entre a decir si va. Lo cambia quien lo creó.' },
      { h: 'Vehículos y material', steps: ['«Vehículo»: modelo, matrícula, conductor, ocupantes y lo que carga.', 'Como en las operaciones, nadie va en dos vehículos y la carga no se repite: solo sale lo que queda libre.', '«Otro material»: lo demás, una línea por cosa.'] },
      { h: 'Planning diario', p: 'Hay un día por cada fecha de la maniobra. Toca un día para escribir su horario (una línea por actividad) y, si cambia, dónde se duerme esa noche.' },
      { h: 'Convoy', steps: ['«Nuevo convoy»: origen, destino y hora de salida.', 'En «Trayecto» elige «Ida y vuelta» y aparece la hora de vuelta.', 'Personal, vehículos y material, igual que en la maniobra.'] }
    ],
    example: 'Maniobras de tres días en Lanzarote: marcas a los diez que van, pones dos SsangYong y la VPI con el contenedor, el alojamiento fijo en la residencia y el horario de cada día. «Enviar por WhatsApp» lo manda todo al grupo.',
    tips: ['Al pasar la fecha, la maniobra o el convoy queda en «Pasadas».'] },

  { id: 'contenedor', area: 'log', icon: 'box', title: 'Material: el contenedor', go: 'contenedor',
    what: 'En el menú, «Material» agrupa sus apartados: Contenedor y almacén, En revisión y Entregas. «Contenedor y almacén» es una sola página con todo lo guardado: arriba todo lo que se arrastra (el contenedor y, debajo, el pasillo, los armarios y el escalón) y, al final, el material fungible, plegado. Cada parte tiene su barra: tócala para plegarla o desplegarla (plegada se ve cuánto tiene), y arriba «Plegar todo» / «Desplegar todo». Para cambiar el orden, mantén pulsada una barra medio segundo (o arrástrala desde los puntitos ⋮⋮ de la izquierda) y llévala encima o debajo de otra: la raya amarilla marca dónde quedará; el orden y lo plegado se quedan guardados en tu móvil. La lupa despliega la parte donde está lo que buscas. El contenedor se ve igual que en las hojas pegadas en él: lateral izquierdo con los huecos B1 a B10 y lateral derecho con B11 a B20. Cada lateral tiene cuatro columnas: en los extremos, un hueco alto arriba (B1, B9 / B11, B19) y otro abajo (B2, B10 / B12, B20); en el centro, un hueco compartido arriba («B3 y B6», «B13 y B16») y dos más debajo. Las cajas H van en el lateral izquierdo y las U en el derecho. El material es común: no está asignado a nadie.',
    parts: [
      { h: 'Qué se ve en el dibujo', p: 'Arriba eliges el lateral. El dibujo es el lateral del contenedor abierto, con sus estanterías: cada hueco lleva su nombre en amarillo. Las cajas se pintan negras o amarillas, como son, con su código. Los cuadros blancos son equipos sueltos (fuera de caja), cada uno con un dibujo de lo que es: ventilador, garrafa, escalera, puntal, camilla, grupo electrógeno… El dibujo no crece: si en un hueco no cabe todo, sale «+3» (o los que falten); toca el hueco para verlo todo. En tablet y PC se ven también los nombres. Un punto rojo avisa de que algo está averiado o en revisión; un cuadrado amarillo, de que tiene una novedad (una nota). Lo prestado a alguien se ve más claro y tachado.',
        img: ['cont-dibujo', 'Lateral izquierdo del contenedor', [[1, 'Cambia de lateral: izquierdo (B1–B10) o derecho (B11–B20).'], [2, 'Hueco compartido de arriba: «B3 y B6».'], [3, 'Una caja: color real y código. Tócala para abrirla.'], [4, 'Equipo suelto (sin caja).'], [5, 'Un hueco: tócalo para ver todo lo que tiene.']]] },
      { h: 'Dibujo o lista', p: 'Junto al lateral eliges cómo verlo: «Dibujo» (el contenedor, para arrastrar) o «Lista» (un renglón por hueco con sus cajas y lo suelto, más fácil de leer en el móvil). Toca un renglón para ver el hueco entero, o una caja o un equipo para abrir su ficha. La lupa de arriba («¿Dónde está…?») marca lo que buscas en las dos vistas.' },
      { h: 'Sin ubicar', p: 'Debajo del dibujo, en «Sin ubicar», está lo que no aparece en las hojas del contenedor (por ejemplo la U-8 Electrobomba, el geófono o las botellas ERA). Arrástralo a su hueco, o ábrelo y pulsa «Mover». Cuando todo tenga sitio, este recuadro desaparece.' },
      { h: 'Reorganizar arrastrando', p: 'Para cambiar algo de sitio, arrástralo. En el móvil, mantén el dedo pulsado sobre la caja o el equipo medio segundo (notarás una vibración) y, sin soltar, llévalo al hueco nuevo. Con ratón, pincha y arrastra. El hueco de destino se ilumina en amarillo.',
        steps: ['Una caja se mueve con todo lo que lleva dentro.', 'Si sueltas un equipo encima de una caja, se mete dentro de ella.', 'Si sacas un equipo de una caja y lo sueltas en un hueco, queda suelto en ese hueco.', 'Cerca del borde de la pantalla, la página se desplaza sola mientras arrastras.', 'Se arrastra todo lo de la página: el contenedor, el pasillo, los armarios (también el EPI de reserva), el escalón y el fungible (con la lista desplegada). Para pasar algo al otro lateral del contenedor, llévalo encima del botón «Izquierdo» o «Derecho» y espera un momento: cambia de lateral y lo sueltas en su hueco.', 'Abajo sale una barra con Sin ubicar, Escalón y «Persona». Al soltar un equipo operativo en el Escalón se abre su ficha de revisión para apuntar qué le pasa. Si lo sueltas en «Persona» y eliges quién, le aparece en su ficha: el EPI como suyo (si es de la reserva, la reserva baja en uno) y el material o la caja en «Material que lleva», con un botón para devolverlo. Mientras lo tiene una persona no está en el almacén: no sale en su hueco, balda ni en la revista; al devolverlo vuelve a su sitio.'],
        img: ['cont-arrastrar', 'Arrastrando una caja a otro hueco', [[1, 'La caja que llevas con el dedo.'], [2, 'Hueco de destino iluminado: al soltar, la caja queda aquí.']]] },
      { h: 'Ver un hueco y añadir', p: 'Toca el nombre o el espacio libre de un hueco. Se abre la lista de todo lo que tiene: cada caja desplegada con su contenido y, debajo, lo suelto. Desde ahí, con «+ Material aquí», añades en ese hueco un equipo, una caja o material fungible, e imprimes las etiquetas de lo que hay. Arriba del dibujo están también «+ Material» y «Etiquetas» de todas las cajas.',
        img: ['cont-hueco', 'Lo que hay en un hueco', [[1, 'Cajas del hueco con lo que llevan dentro.'], [2, 'Equipos sueltos.'], [3, 'Añadir en este hueco un equipo, una caja o material fungible.']]] },
      { h: 'Mover sin arrastrar', p: 'Si prefieres no arrastrar, o quieres pasar algo de un lateral al otro, abre la caja o el equipo y pulsa «Mover»: eliges un hueco, «Sin ubicar», el pasillo, un armario o el escalón. Lo que va en un vehículo se elige al preparar cada salida.' }
    ],
    example: 'En la revista veis que la U-7 (grupo hidráulico) está en B18 y no en B14: la arrastráis de B18 a B14 y sus cuatro equipos (grupo PU-30, mangueras y llave) pasan con ella. El geófono, que estaba sin ubicar, se arrastra dentro de una caja de búsqueda.',
    tips: ['¿Prefieres la foto real? Abre el equipo → «Editar» → Foto (cámara o galería): en las listas y fichas se ve la foto en lugar del dibujo.', 'Si un móvil no deja arrastrar (algunos navegadores antiguos), usa «Mover».'] },

  { id: 'revision', area: 'log', icon: 'refresh', title: 'Notas, novedades y material en revisión', go: 'contenedor',
    what: 'A cualquier equipo o caja se le puede poner una nota: algo con un defecto que todavía funciona. La nota marca la novedad: sale en Inicio, en el dibujo y en «En revisión» hasta que se quita. Lo que no está bien va a revisión, con su ficha: dónde está, desde cuándo y por qué.',
    parts: [
      { h: 'Poner una nota (novedad)', steps: ['Abre el equipo o la caja → «Nota / novedad».', 'Escribe qué le pasa y guarda. Queda tu nombre y la hora.', 'Cuando se arregle, «Cambiar nota» → «Quitar la novedad».'],
        img: ['nota', 'Nota en un equipo', [[1, 'Qué le pasa: se ve en Inicio y en el dibujo.']]] },
      { h: 'Mandar a revisión', steps: ['Ficha del equipo → «A revisión».', 'Situación: en el taller, a la espera de revisión, inoperativo u operativo (con defecto, se puede usar).', 'Desde qué fecha, dónde está o quién lo tiene, el motivo y notas (presupuesto, nº de orden…).', 'Si es inoperativo, cuenta como averiado.'],
        img: ['rev-form', 'Ficha de revisión', [[1, 'Situación.'], [2, 'Desde cuándo.'], [3, 'Dónde está o quién lo tiene.'], [4, 'Motivo.']]] },
      { h: 'En revisión', p: 'Menú → Logística → Material → En revisión: todo lo que está en revisión, con su situación, desde cuándo, dónde y por qué; debajo, lo que tiene novedad, y las últimas revisiones terminadas. Un punto en el menú avisa de que hay algo en revisión.',
        img: ['revision', 'En revisión', [[1, 'Equipo en revisión: dónde, desde cuándo y situación.'], [2, 'Material con novedad.']]] },
      { h: 'Terminar la revisión', p: 'En la ficha, «Fin de revisión»: vuelve operativo (y se quita su novedad) o queda sin arreglo (averiado). Queda guardada en el historial con lo que se hizo.',
        img: ['rev-ficha', 'Equipo en revisión', [[1, 'Situación, desde cuándo, dónde y motivo. «Editar» para cambiarla.'], [2, 'Terminar la revisión.']]] }
    ],
    example: 'El separador pierde aceite: «A revisión», en el taller, desde el 5 de octubre, «Taller Holmatro Telde», motivo «Pierde aceite por el latiguillo». La escalera funciona pero un peldaño cruje: se le pone una nota y queda como novedad.',
    tips: ['En la revista, lo que falla pasa solo a revisión («a la espera») con el motivo que escribas.'] },

  { id: 'almacen', area: 'log', icon: 'case', title: 'Pasillo, armarios y otros', go: 'contenedor',
    what: 'No todo el material está en el contenedor. En Material → Contenedor y almacén, debajo del contenedor, están el pasillo (la estantería de palés: 5 módulos, con el suelo y una balda), los tres armarios con sus baldas (monos, botas, gafas, guantes, documentación…) y el escalón, donde se deja el material en revisión o arreglándose. Al final, el material fungible, plegado.',
    parts: [
      { h: 'Armarios', p: 'Menú → Logística → Material → Contenedor y almacén → Armarios (botón de arriba): los tres armarios abiertos, como están en la estantería, con sus cinco baldas (la 1 arriba). Debajo, «Delante de los armarios»: el suelo de la estantería (cascos, cajas de herramientas, la nevera…). Toca el nombre de un armario (arriba, en madera) para desplegar debajo la lista de lo que hay en cada una de sus baldas; tócalo otra vez para plegarla. Toca una balda para ver lo que tiene o añadir; mantén pulsado un equipo para arrastrarlo a otra balda. Debajo del dibujo, la lista de lo que hay en cada sitio.',
        img: ['armarios', 'Los tres armarios', [[1, 'Un armario abierto, con sus baldas.'], [2, 'Balda 1 (arriba) del armario 1, con lo que guarda.'], [3, 'Lista de lo que hay en cada balda.']]] },
      { h: 'Pasillo', steps: ['La estantería del pasillo se ve por módulos (M1, M2…) y dos alturas (suelo y balda 1). Toca un hueco para ver lo que tiene o añadir; arrastra el material de un hueco a otro.'] },
      { h: 'Escalón', steps: ['Es donde se deja el material en revisión o arreglándose.', 'Arrastra el equipo al Escalón (o a la barra de abajo): si estaba operativo, se abre su ficha de revisión para apuntar la situación y el motivo.', 'Desde la ficha, «A revisión» también ofrece dejarlo en el escalón.', 'Cuando esté arreglado, «Fin de revisión» y arrástralo a su sitio.'] }
    ],
    example: 'Los monos de repuesto van en el armario 2, puerta izquierda; la motosierra que pierde aceite, en el escalón hasta que vuelva del taller.',
    tips: ['Lo que está fuera del contenedor no sale con «el contenedor completo» de una intervención: añádelo a mano a la salida si hace falta.'] },

  { id: 'entregas', area: 'log', icon: 'out', title: 'Entregas a personal de fuera', go: 'entregas',
    what: 'Cuando personal de la UME de fuera del equipo USAR os pide material durante un tiempo, se hace una ficha de entrega: a quién va, qué se lleva, hasta cuándo, cómo está (fotos y notas) y la firma de quien lo recibe, hecha con el dedo en el móvil.',
    parts: [
      { h: 'Hacer una entrega', steps: ['Menú → Logística → Material → Entregas → «+ Entrega».', 'Quién lo recibe (empleo y nombre), unidad, DNI o TIP, teléfono y para qué.', 'Fecha de entrega y devolución prevista.', 'Marca el material (puedes filtrar escribiendo).', 'Estado al entregar: notas y hasta dos fotos.', 'Firma de quien lo recibe: con el dedo en el recuadro. «Borrar firma» si hay que repetirla.'],
        img: ['entrega', 'Ficha de entrega', [[1, 'Quién lo recibe.'], [2, 'Material que se entrega.'], [3, 'Firma con el dedo.']]] },
      { h: 'Seguimiento y devolución', p: 'El material entregado sale como fuera, a nombre de quien lo tiene, y avisa en Inicio. Si pasa la fecha, la entrega sale en rojo. Al volver, «Devolución»: fecha, cómo vuelve, foto y firma. «Enviar» la manda por WhatsApp.' },
      { h: 'Acta en PDF', p: '«Acta en PDF» crea el acta de entrega en un archivo PDF para imprimir o enviar: datos de quien recibe, tabla del material (con número de serie y de dónde sale), estado y fotos, y los recuadros de firma de quien entrega y quien recibe (con la firma hecha en el móvil, si la hay). Abajo lleva el apartado de devolución para firmarlo al volver. En el móvil se abre el menú de compartir; en el PC se descarga.',
        img: ['acta', 'Acta de entrega en PDF', []] }
    ],
    example: 'La Sección de Transmisiones del BIEM II pide 2 TETRA para un ejercicio: «+ Entrega», Cabo 1º Pérez, devolución el viernes, foto de las dos radios y firma en el móvil.',
    tips: ['Desde la ficha del equipo, «Ver entrega» abre la entrega en la que está.'] },

  { id: 'buscar', area: 'log', icon: 'search', title: '¿Dónde está? Buscar material', go: 'contenedor',
    what: 'Escribe lo que buscas y la app te dice dónde está: contenedor (lateral y hueco), pasillo, armario u otros; si va dentro de una caja (y cuál), o si está sin ubicar. Es la lupa de arriba, en cualquier pantalla.',
    parts: [{ steps: ['Pulsa la lupa y escribe parte del nombre: «tractel», «cialumenes», «U-6»… No hace falta poner tildes.', 'Cada resultado dice dónde está en azul y, debajo, si va en caja, suelto, prestado o en revisión.', 'Tócalo: se abre el dibujo en el lateral correcto y la caja o el equipo parpadea en amarillo.'],
      img: ['buscador', 'Buscando los cialúmenes', [[1, 'La lupa abre «¿Dónde está…?»: escribe lo que buscas.'], [2, 'Dónde está: lateral y hueco.'], [3, 'Si va dentro de una caja, cuál.']]] }],
    example: 'Te piden los cialúmenes: escribes «cialu» y sale «Lateral izquierdo · hueco B7 · dentro de la caja H-12». Lo tocas y la caja H-12 (amarilla) parpadea en el dibujo.',
    tips: ['Debajo del material salen también personas, documentos, operaciones, worksites y bienes que coincidan.'] },

  { id: 'material', area: 'log', icon: 'wrench', title: 'Material: añadir, cambiar, sacar y borrar', go: 'contenedor',
    what: 'Cada equipo tiene su ficha con nombre, sitio, cantidad, caja, estado, nº de serie, mantenimiento, peso, función, mercancía peligrosa y foto. Se puede añadir material nuevo, cambiarlo de sitio, prestarlo y borrarlo.',
    parts: [
      { h: 'Añadir material nuevo', steps: ['Solo RODRI añade, cambia o elimina material, cajas, consumibles, vehículos y el material extra de las salidas, y quien él marque con «Permiso de logística» en sus datos (Personal → la persona → «Editar datos»; en Miembros y permisos tiene que ser jefe). Al resto no le salen esos botones (sí mover, sacar, pasar a revisión y ajustar el stock).', 'Material → «+ Material» → «Equipo o herramienta» (o toca un hueco o una puerta → «Material aquí»).', 'Escribe el nombre y elige «Dónde va»: un hueco del contenedor (B1–B20), «Sin ubicar», el pasillo, un armario o el escalón.', 'Si va dentro de una caja, elígela en «Caja en la que va»: el sitio se toma de la caja.', 'Pon la cantidad (por ejemplo 10 cialúmenes), el peso de una unidad y, si tiene, nº de serie y próximo mantenimiento.', '«Dotación / descripción» es lo que lleva o cómo es; para un defecto usa la nota (novedad).', 'Guarda. Ya aparece en el dibujo, en la revista y en los manifiestos.'] },
      { h: 'La ficha de un equipo', img: ['cont-equipo', 'Ficha de un equipo', [[1, 'Dónde está, cantidad, caja y peso.'], [2, 'Poner una nota: marca la novedad.'], [3, 'Mandarlo a revisión.'], [4, 'Sacar: préstamo a una persona con destino o motivo. «Devolver» al volver.'], [5, 'Mover a otro sitio.'], [6, 'Ver su caja.'], [7, 'Eliminar el equipo.']]] },
      { h: 'Borrar', p: 'Ficha del equipo → «Eliminar» y confirma. Se borra en todos los móviles. Si solo está averiado, mejor mándalo a revisión como «inoperativo» para que conste.' }
    ],
    example: 'Llega una sierra de cadena nueva: «+ Material», «Sierra de cadena», caja U-3 (herramienta eléctrica, en B17), peso 11 kg, mantenimiento en marzo. Se imprime su QR y se pega en la sierra.',
    tips: ['Escanea el QR pegado a un equipo con la cámara del móvil para abrir su ficha.', 'La bomba eléctrica de la U-8 ya lleva su nº de serie (40073).'] },

  { id: 'cajas', area: 'log', icon: 'case', title: 'Cajas Peli: peso, medidas y etiquetas', go: 'contenedor',
    what: 'Casi todo el material va en cajas Peli (o de madera) ordenadas en el contenedor por tipo de material. Las cajas del equipo ya están en la app con su contenido, como en las hojas del contenedor: H-2, H-3, H-12, H-13 y H-30 en el lateral izquierdo, y U-1 a U-8 en el derecho. Cada caja tiene un código, su color, modelo, medidas y peso en vacío. El peso total se calcula sumando lo que lleva dentro, o se apunta pesándola llena.',
    parts: [
      { h: 'Crear una caja', steps: ['Material → «+ Material» → «Caja» (arriba del dibujo), o toca el hueco donde está → «Material aquí» → «Caja».', 'Código (lo que pone pintado en la caja; la app propone el siguiente H- o U- según el lateral), qué lleva, modelo, color (negra o amarilla) y sitio.', 'Peso de la caja vacía y medidas exteriores (largo, ancho y alto en cm).', 'Si la habéis pesado llena, pon el «Peso total pesada»: manda sobre el calculado.'],
        img: ['cont-caja-form', 'Datos de una caja', [[1, 'Código y contenido.'], [2, 'Modelo y color: negra o amarilla (se ve así en el dibujo).'], [3, 'Pesos: vacía y, si se ha pesado, llena.'], [4, 'Medidas exteriores.']]] },
      { h: 'Meter material y la ficha de la caja', steps: ['Abre la caja → «Meter material»: arriba salen los equipos sueltos del mismo hueco; marca los que van dentro.', 'Para sacar un equipo, pulsa la flecha de su fila: queda suelto en el mismo sitio.', '«Etiqueta» imprime una etiqueta para pegar en la tapa: código grande, peso, medidas, mercancías peligrosas y la lista de lo que lleva.', '«Nota / novedad»: como en los equipos, para un defecto de la caja (un cierre roto…).'],
        img: ['cont-caja', 'Ficha de una caja', [[1, 'Código y contenido, con el color de la caja.'], [2, 'Color: toca «Negra» o «Amarilla» para cambiarlo.'], [3, 'Sitio, modelo, medidas y peso.'], [4, 'Meter más material.'], [5, 'Lo que lleva dentro, con su estado. La flecha lo saca.'], [6, 'Mover, editar e imprimir la etiqueta.']]] }
    ],
    example: 'U-6, negra, «Excarcelación»: vacía 9 kg, 81 × 52 × 31 cm; dentro la cizalla hidráulica, 2 gatos, la bomba manual, el cilindro y dos mangueras. Al pesarla llena dio 46 kg y se apunta ese peso.',
    tips: ['Al borrar una caja, su material no se borra: queda suelto en el mismo sitio.', 'Las cajas salen también en el manifiesto de material (Alistamiento y despliegue).'] },

  { id: 'revista', area: 'log', icon: 'clipboard', title: 'Revista', go: 'revista',
    what: 'La revista comprueba el material que elijas: el contenedor entero, un lateral, el pasillo, los armarios… De cada equipo se marca si está bien, si falla, o si está en el taller, en otro sitio, de baja o no se revista. Queda guardado quién la hizo, cuándo y por qué.',
    parts: [
      { h: 'Empezar', steps: ['Menú → Logística → Revista → «Iniciar revista».', 'Motivo: mensual, antes de salir, tras una intervención o un ejercicio…', '«Qué se revista»: marca los sitios (laterales del contenedor, sin ubicar, pasillo, armarios, otros).', 'Lo que ya está en revisión o prestado no entra, salvo que lo marques en «Incluir también».'] },
      { h: 'Marcar cada equipo', steps: ['✓ correcto · ✗ con fallo (escribe qué le pasa).', '«···» para otras situaciones: en el taller, en otro sitio (eliges dónde está y se cambia su ubicación), de baja o no se revista.', 'En cada grupo: «Todo OK» o «No revistar».', '«Solo lo que falta» esconde lo ya marcado. Se puede dejar a medias: se guarda sola.', 'Más rápido con la cámara: «Escanear QR» y apunta a las etiquetas. Cada equipo leído queda correcto, y la etiqueta de una caja marca todo lo que lleva. Lo que tenga un fallo se marca después en la lista.'],
        img: ['revista', 'Revista en curso', [[1, 'Progreso, fallos y «Finalizar revista».'], [2, 'Correcto, con fallo u otra situación (···).'], [3, 'Qué le pasa.']]] },
      { h: 'Al finalizar', p: 'Lo que falla pasa a «En revisión» (a la espera) con el motivo; lo del taller, a «En revisión · en el taller»; lo de baja queda inoperativo, de baja; lo que está en otro sitio cambia de ubicación. Todo queda en el historial de revistas.' }
    ],
    example: 'Revista mensual del lateral izquierdo: el separador pierde aceite (✗ «Fuga de aceite»), la motosierra está en el taller (··· → en el taller) y las mesas están en el pasillo (··· → en otro sitio → Pasillo).',
    tips: ['Lo que esté «Sin ubicar» también se puede revistar.'] },

  { id: 'stock', area: 'log', icon: 'package', title: 'Material fungible', go: 'consumibles',
    what: 'Lo que se gasta, con su cantidad y su mínimo: discos, cadenas, hojas de sierra, gasolina… Cada uno va en su sitio (un hueco del contenedor, el pasillo, un armario u otros) y se ve en Contenedor y almacén junto al resto de lo que hay allí. Cuando algo baja del mínimo, avisa en Inicio.',
    parts: [{ steps: ['Menú → Logística → Material → Contenedor y almacén → «Fungible» (al final, plegado: tócalo para desplegarlo). Cada uno dice dónde está; también sale al tocar su hueco.', 'Usa −1, +1 y +5 para restar o sumar unidades al gastarlas o reponerlas.', '«+ Material» → «Material fungible» para añadir uno nuevo con unidad, mínimo y dónde va.', 'Pedido: cuando algo está bajo mínimo sale el botón «Pedido» (arriba del contenedor y en el aviso de Inicio). Propone pedir lo que falta para volver al doble del mínimo; cambia las cantidades si quieres y se envía por WhatsApp o correo.'], img: ['stock', 'Material fungible', [[1, 'Botones −1, +1 y +5 para gastar o reponer.'], [2, '«REPONER»: está en el mínimo o por debajo.']]] }],
    example: 'Se gastan 3 discos de diamante en el ejercicio: quedan 1 de mínimo 2 → aviso en Inicio para pedir más.', tips: [] },

  { id: 'vehiculos', area: 'log', icon: 'truck', title: 'Vehículos de cada salida', go: 'vehiculos',
    what: 'Los modelos de vehículo de la unidad (SsangYong, VPI, Amarok, ambulancia, guaguas, autobombas, camiones, remolques…), con su dibujo los que lo tienen. La autobomba Renault viene vacía detrás: al añadirla a una actividad se elige si lleva el contenedor pequeño, el contenedor pequeño 2 o el módulo LCIF, y su dibujo cambia con él; en Vehículos, al tocarla, se puede ver con cada módulo. No hay un número fijo: en cada actividad se añaden los que salen, repitiendo modelo si hace falta, con su matrícula y lo que carga.',
    parts: [
      { h: 'Los modelos', p: 'Menú → Logística → Vehículos. Cada modelo sale con su dibujo, sus plazas y cuántos hay ahora en una salida. Tócalo para cambiar el nombre, las plazas, las notas o la foto (los que no tienen dibujo pueden llevar una foto); «+ Modelo» añade otro (solo RODRI). El dibujo sale también en los vehículos de cada salida.',
        img: ['vehiculos', 'Modelos de vehículo', [[1, 'Añadir otro modelo.'], [2, 'Dibujo del modelo.']]] },
      { h: 'Añadirlos a una actividad', steps: ['Abre la operación o el ejercicio → pestaña Personal → «Vehículo».', 'Elige el modelo y, si quieres, la matrícula. Si es la autobomba Renault, toca el módulo que lleva detrás (vacía, contenedor pequeño, contenedor pequeño 2 o LCIF).', 'Conductor y ocupantes: quien conduce no sale entre los ocupantes, y quien ya va en otro vehículo no aparece.', '«Lo que carga»: marca las cajas o equipos que van en ese vehículo. Lo que ya va en otro vehículo no aparece; si hay varias unidades de un equipo, elige cuántas van en este y el resto queda para los demás.', 'Repite para cada vehículo que sale: puedes añadir el mismo modelo varias veces.'],
        img: ['op-vehiculo', 'Añadir un vehículo a la salida', [[1, 'Modelo.'], [2, 'Matrícula de este vehículo.'], [3, 'Lo que carga.']]] },
      { h: 'Revista de salida', steps: ['En Vehículos, toca el modelo: salen sus matrículas con la ITV y la última revista de salida.', '«Revista» en la matrícula: deja marcado lo que está bien (niveles, luces y rotativos, neumáticos, frenos, documentación, extintor y botiquín, emisora…), apunta los kilómetros y el combustible y, si algo falla, escribe qué.', 'Lo que falla sale en Inicio («Vehículos con fallos») y en la tarjeta del modelo hasta que otra revista salga bien. Toca la línea de la revista para ver su historial.'] }
    ],
    example: 'Salida con tres SsangYong y el camión rojo: se añaden cuatro vehículos; en uno de los SsangYong se marcan las TETRA y el botiquín. La orden de salida dice «En SsangYong · ET-12345: Transmisiones (TETRA), Botiquín».',
    tips: ['Lo que carga un vehículo se apunta en cada salida: no queda fijo en él.', 'Si un modelo deja de usarse, ábrelo y pulsa «Eliminar».'] },

  { id: 'personal', area: 'team', icon: 'users', title: 'Personal: altas, bajas y documentación', go: 'personal',
    what: 'Todo lo de cada persona en un solo sitio: puesto y célula, foto, teléfono, documentos escaneados con su caducidad, EPI asignado, cualificaciones e historial. Desde aquí se da de alta a gente nueva, se cambian sus datos y se da de baja.',
    parts: [
      { h: 'La lista del personal', img: ['personal-lista', 'Personal de la unidad', [[1, 'Dar de alta a una persona nueva.'], [2, 'Imprimir las tarjetas QR para fichar.'], [3, 'Perfil de misión: reparte células y puestos de todos de golpe.'], [4, 'Cada persona, agrupada por célula, con sus avisos (documentos, EPI…).']]] },
      { h: 'Dar de alta', steps: ['Menú → Equipo → Personal → «+ Persona».', 'Nombre (como se le conoce en el equipo), célula, puesto y teléfono.', 'Guarda: se le crean sus EPI para rellenar y ya aparece en su célula, en las operaciones nuevas y para entrar en la app (crea su contraseña la primera vez).'] },
      { h: 'La ficha de una persona', img: ['persona', 'Ficha de una persona', [[1, 'Llamar o escribir por WhatsApp.'], [2, '«Editar datos»: nombre, célula, puesto, otras funciones, teléfono, correo y foto.'], [3, 'Añadir un documento con fotos.']]] },
      { h: 'Cambiar datos, dar de baja o eliminar', p: '«Dar de baja» es lo normal cuando alguien deja la unidad: deja de salir en las listas y en las operaciones nuevas y ya no puede entrar, pero se conserva su historial y se puede volver a dar de alta (sale abajo, en «De baja»). «Eliminar» lo borra del todo junto con sus documentos; sus EPI pasan a «Reserva almacén».',
        img: ['persona-baja', 'Editar datos', [[1, 'Nombre, célula y puesto.'], [2, 'Foto de la persona. Arriba, «Otras funciones»: una persona puede tener varias (sanitario y búsqueda técnica, por ejemplo).'], [3, 'Dar de baja (se puede deshacer).'], [4, 'Eliminar definitivamente.']]] },
      { h: 'EPI asignado', p: 'En la ficha, «EPI asignado» lista su casco USAR (con su color), sus protectores auditivos y su mono. Toca uno para cambiar modelo, color, talla, estado o caducidad, o para asignarlo si falta. Lo que está «Revisar» o caduca avisa en Inicio. El EPI sin dueño está al final de la lista de Personal, en «EPI de reserva», con su cantidad y dónde está (el sobrante, en el armario de la derecha, donde también se ve dibujado). Al dar uno de la reserva a alguien, la reserva baja en uno.',
        img: ['persona-epi', 'EPI de una persona', [[1, 'Estado de su EPI.'], [2, 'Toca un elemento para cambiar talla, estado o caducidad.']]] },
      { h: 'Documentos', steps: ['«Documento»: tipo, número, caducidad y fotos de las dos caras con la cámara (o desde la galería).', 'Las caducidades avisan en Inicio y en Vencimientos (el pasaporte, 6 meses antes).'],
        img: ['documento', 'Añadir un documento con la cámara', [[1, 'Cámara o galería para las fotos del documento.']]] }
    ],
    example: 'Entra PÉREZ en la unidad: «+ Persona», célula «Corte y Penetración», puesto «Rescatador». Se le sube el DNI y el reconocimiento médico. Cuando NUÑEZ pasa a otra unidad, se le da de baja y su historial queda.',
    tips: ['Una persona puede tener varias funciones además de su puesto: AREVALO puede ser sanitario y trabajar también en búsqueda técnica. Se marcan en «Editar datos» y salen en su ficha y en la lista.', 'El número de los documentos se ve oculto (•••1234); tócalo para verlo entero.', 'Para un ejercicio de patrimonio, elige el perfil BIC arriba en Personal: aparecen las células de documentación, embalaje y traslado.'] },

  { id: 'calendario', area: 'team', icon: 'calendar', title: 'Calendario y asistencia', go: 'calendario',
    what: 'Ejercicios, formación, guardias y reuniones con convocatoria, asistencia y horas de formación de cada persona.',
    parts: [{ steps: ['Menú → Equipo → Calendario → «Evento». Si dura varios días, pon la fecha de fin: todos sus días quedan marcados en el mes.', '«Convocar» lo manda por WhatsApp; «Añadir a mi calendario» lo pone en el móvil con aviso 2 h antes.', 'Marca la asistencia de cada persona.', 'Un ejercicio se convierte en operación con «Crear el ejercicio».'], img: ['calendario', 'Calendario con asistencia y horas', []] }],
    example: 'Formación de apuntalamiento en T el sábado de 9 a 13: asisten 11 de 13 → 4 h de formación para cada uno.', tips: [] },

  { id: 'vencimientos', area: 'team', icon: 'clock', title: 'Vencimientos y alistamiento', go: 'vencimientos',
    what: 'Una sola lista con todo lo que caduca y la preparación para desplegar (pasaportes, cualificaciones, manifiestos de personal y material, con las cajas).',
    parts: [
      { steps: ['Menú → Equipo → Vencimientos: filtra a 30 días, 3 meses o 1 año.'], img: ['vencimientos', 'Todo lo que caduca, por fecha', []] },
      { h: 'Alistamiento y despliegue', steps: ['Menú → Logística → Alistamiento y despliegue: ficha del equipo y manifiestos para imprimir.', 'El manifiesto de material incluye cada equipo con su caja y una tabla de bultos con medidas, peso y si vuelan.'], img: ['alistamiento', 'Alistamiento y manifiestos', []] }
    ],
    example: 'Antes de una activación internacional: todos los pasaportes con más de 6 meses y el manifiesto de material con 1.240 kg.', tips: [] },

  { id: 'listas', area: 'help', icon: 'layers', title: 'Listas y opciones propias', go: 'listas',
    what: 'Todos los desplegables traen opciones de serie y podéis añadir las vuestras para todo el equipo (también los modelos de caja).',
    parts: [{ steps: ['En cualquier desplegable elige «➕ Otra…» y escríbela: queda guardada.', 'O en Menú → Ajustes → Listas y opciones: añade, borra las vuestras u oculta las de serie.'], img: ['listas', 'Editar una lista', []] }],
    example: 'Añadís «Licencia de piloto de dron» a los tipos de documento y «Peli 1615» a los modelos de caja.', tips: ['Los formularios recuerdan el último valor usado donde ahorra tiempo.'] },

  { id: 'guia', area: 'help', icon: 'book', title: 'Guía de campo', go: 'guia',
    what: 'Fichas del Manual de Campo USAR y de INSARAG sin conexión, con calculadoras.',
    parts: [{ steps: ['Menú → Ajustes → Guía de campo. Busca por palabra (apuntalar, O₂, START…).', 'Toca un apartado para abrirlo; al abrir otro, el anterior se cierra.', 'Calculadoras: peso de una carga o losa, distancia de seguridad, aire del ERA y anclajes.'], img: ['guia', 'Fichas y calculadoras', []] }],
    example: 'Losa de 20 cm y 6 m²: unos 3.000 kg → elige cojines de al menos 3 t.', tips: [] },

  { id: 'compartir', area: 'help', icon: 'cloud', title: 'Compartir datos, usuarios y copias', go: 'ajustes',
    what: 'La base de datos del equipo va integrada en la app: todos los móviles ven lo mismo en tiempo real, también fotos, documentos y cajas. Sin conexión se guarda y se envía al volver.',
    parts: [{ steps: ['Solo entra el personal dado de alta: RODRI añade el correo y el nombre de cada uno en Ajustes → Miembros y permisos.', 'Cada persona abre la app y crea su cuenta con ese correo; no hay que configurar nada.', 'RODRI exporta una copia de seguridad de vez en cuando (Ajustes → General → Administración; incluye las fotos).'], img: ['ajustes', 'Ajustes', []] }],
    example: 'RODRI da de alta los 13 correos y manda el enlace de la app al grupo: cada uno crea su cuenta y ya comparten datos.', tips: ['En Ajustes → General → Este móvil → Pantalla y avisos eliges el modo claro, noche o sol (alto contraste) y los botones grandes para usarla con guantes.', 'En Ajustes → General → Este móvil → Unidades eliges cómo se ven las coordenadas (latitud/longitud, UTM o MGRS) y las distancias (metros, kilómetros o centímetros).'] },

  { id: 'pantallas', area: 'help', icon: 'grid', title: 'Tablet y PC',
    what: 'En tablet en horizontal y en el ordenador, las secciones van en una barra fija a la izquierda y las pestañas de la operación en una columna, para ver más a la vez. En el PC se arrastra con el ratón.',
    parts: [{ steps: ['Abre la misma dirección en el navegador del PC o de la tablet.', 'Gira la tablet: en horizontal se usa la vista de escritorio.'], img: ['pc', 'Vista de PC o tablet en horizontal', []] }],
    example: 'En el puesto de mando, un portátil muestra el mapa y los worksites mientras los móviles fichan en la puerta.', tips: [] }
];

const manImg = (f, cap) => `onclick="openZoom(this.src, this.alt)"`;
function manFigure([f, cap, notes = []]) {
  return `<figure class="man-fig"><img src="manual/${f}.jpg" alt="${esc(cap)}" loading="lazy" ${manImg(f, cap)}>
    <figcaption>${cap}</figcaption>
    ${notes.length ? `<ol class="man-legend">${notes.map(([n, t]) => `<li><span class="man-num">${n}</span><span>${t}</span></li>`).join('')}</ol>` : ''}</figure>`;
}

function viewManual() {
  const q = (prefs.manQ || '').toLowerCase();
  const items = MANUAL.filter(s => !q || JSON.stringify(s).toLowerCase().includes(q));
  const groups = ['home', 'ops', 'log', 'team', 'help'].map(a => [a, items.filter(s => s.area === a)]).filter(([, l]) => l.length);
  return `
    <div class="panel">
      <h2>Manual de uso</h2>
      <p class="muted" style="margin:4px 0 12px">Todo lo que se puede hacer con la app, apartado por apartado. Las capturas llevan números: cada número se explica debajo de la imagen. Toca una imagen para verla grande.</p>
      <input class="input" type="search" aria-label="Buscar en el manual" placeholder="Buscar en el manual: arrastrar, caja, revisión, armarios, contraseña, baja…" value="${esc(prefs.manQ || '')}"
        oninput="prefs.manQ = this.value; clearTimeout(window._mq); window._mq = setTimeout(() => { const p = this.selectionStart; render(); const i = document.querySelector('#view input[type=search]'); i.focus(); i.setSelectionRange(p, p); }, 250)">
      <div class="man-index">${groups.map(([a, l]) => `
        <div class="man-group" data-area="${a}"><span class="menu-area">${AREAS[a].name}</span>
          <div class="row chips">${l.map(s => `<a class="chip" href="#" onclick="event.preventDefault(); document.getElementById('man-${s.id}').scrollIntoView({ behavior: 'smooth' })">${s.title}</a>`).join('')}</div></div>`).join('')}</div>
    </div>
    ${items.map(s => `
      <article class="panel man" id="man-${s.id}" data-area="${s.area}">
        <div class="between sec-head"><h3 class="sec-title" style="margin:0">${ic(s.icon in ICONS ? s.icon : 'book')} ${s.title}</h3>
          ${s.go ? `<button class="btn btn-g btn-sm" onclick="go('${s.go}')">Ir ${ic('chev', 'i-sm')}</button>` : ''}</div>
        <p class="man-what">${s.what}</p>
        ${(s.parts || []).map(p => `
          <section class="man-part ${p.img ? 'has-img' : ''}">
            <div>
              ${p.h ? `<h4>${p.h}</h4>` : ''}
              ${p.p ? `<p>${p.p}</p>` : ''}
              ${p.steps ? `<ol class="tips">${p.steps.map(x => `<li>${x}</li>`).join('')}</ol>` : ''}
            </div>
            ${p.img ? manFigure(p.img) : ''}
          </section>`).join('')}
        <div class="man-example"><b>Ejemplo</b><p>${s.example}</p></div>
        ${s.tips.length ? `<h4>Consejos</h4><ul class="tips">${s.tips.map(x => `<li>${x}</li>`).join('')}</ul>` : ''}
      </article>`).join('') || '<p class="muted">Sin resultados.</p>'}`;
}
