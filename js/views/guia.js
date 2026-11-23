'use strict';
// USAR 242 · Guía de campo: fichas rápidas del Manual de Campo USAR UME 2023 y las guías INSARAG, con calculadoras

const ul = items => `<ul class="tips">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
const tbl = (head, rows) => `<table class="ref"><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;

const DENSITY = [['Hormigón armado', 2450], ['Acero', 7800], ['Ladrillo macizo', 1700], ['Ladrillo hueco', 1350], ['Piedra', 2500],
  ['Vidrio', 2550], ['Madera', 750], ['Mortero', 2000], ['Yeso', 1150], ['Tierra', 1700]];
const SLAB = [[12, 300], [16, 400], [20, 500], [25, 625], [30, 750], [35, 875]];   // losa maciza: canto (cm) → kp/m²

const GUIDE = [
  ['calc', 'calc', 'Calculadoras', () => `
    <div class="calc" id="calcLoad"><b>Peso de una carga</b>
      <div class="form four"><label class="lbl">Material<select class="input" name="d">${DENSITY.map(([n, d]) => `<option value="${d}">${n}</option>`).join('')}</select></label>
        <label class="lbl">Largo (m)<input class="input" name="l" inputmode="decimal" value="2"></label>
        <label class="lbl">Ancho (m)<input class="input" name="a" inputmode="decimal" value="1"></label>
        <label class="lbl">Grosor (m)<input class="input" name="e" inputmode="decimal" value="0.2"></label></div>
      <p class="calc-out" data-out></p></div>
    <div class="calc" id="calcSlab"><b>Peso de una losa maciza</b>
      <div class="form four"><label class="lbl">Canto<select class="input" name="c">${SLAB.map(([c, k]) => `<option value="${k}">${c} cm</option>`).join('')}</select></label>
        <label class="lbl">Superficie (m²)<input class="input" name="s" inputmode="decimal" value="6"></label></div>
      <p class="calc-out" data-out></p></div>
    <div class="calc" id="calcDist"><b>Distancia de seguridad</b>
      <div class="form four"><label class="lbl">Altura en pie (m)<input class="input" name="h" inputmode="decimal" value="9"></label></div>
      <p class="calc-out" data-out></p></div>
    <div class="calc" id="calcEra"><b>Aire del ERA</b>
      <div class="form four"><label class="lbl">Botella (l)<input class="input" name="l" inputmode="decimal" value="6"></label>
        <label class="lbl">Presión (bar)<input class="input" name="b" inputmode="decimal" value="300"></label></div>
      <p class="calc-out" data-out></p></div>
    <div class="calc" id="calcAnchor"><b>Anclaje con ángulo</b>
      <div class="form four"><label class="lbl">Tornillo<select class="input" name="t"><option value="400">M8</option><option value="600">M10</option><option value="900" selected>M12</option><option value="1300">M14</option></select></label>
        <label class="lbl">Ángulo (°)<input class="input" name="g" inputmode="decimal" value="0"></label></div>
      <p class="calc-out" data-out></p></div>`],

  ['fases', 'route', 'Fases de la operación', () => `<ol class="tips">${PHASES.map(p => `<li><b>${p.name}.</b> ${p.checks.slice(0, 3).join('; ')}…</li>`).join('')}</ol>
    <p class="muted">Siempre: vigía, solo el personal imprescindible, relevos, oficial de seguridad y asistencia sanitaria. Pensar <i>in advance</i>: tener preparado lo siguiente antes de pedirlo.</p>`],

  ['patrimonio', 'landmark', 'Salvaguarda de patrimonio (BIC)', () => `
    <b>Orden de trabajo</b>${ul(['Contactar desde el principio con el responsable del bien y un técnico de patrimonio: ellos dicen qué es lo más valioso.',
      'Evaluar el inmueble antes de entrar y vigilar el avance de la amenaza. Ningún bien vale más que una persona.',
      'Prioridad = valor + riesgo ante la amenaza + facilidad para moverlo. Lo que no se puede mover se protege donde está.',
      'Puestos: documentación (número, foto, ficha) → embalaje → traslado → depósito temporal (recibe, comprueba y firma).',
      'Cada bien lleva su número en la etiqueta y en el acta; nada se mueve sin documentar.'])}
    <b>Manipulación</b>${ul(['Guantes de nitrilo (metales) o algodón limpio; quitarse anillos y relojes.', 'Una pieza cada vez, por la parte más sólida y por la base; nunca por brazos, asas, marcos dorados o coronas.',
      'Piezas grandes entre dos o más; avisar antes de levantar. Pinturas con la cara hacia dentro, nunca enrolladas.', 'Las piezas que se sueltan van con el mismo número en una bolsa aparte.'])}
    <b>Según la amenaza</b>${ul(['Fuego: no limpiar el hollín; cubrir lo que queda con mantas ignífugas.', 'Lava y ceniza: cubrir y sellar huecos; la ceniza raya, no frotar.',
      'Agua: elevar del suelo; papel y libros mojados en bolsa y al frío (congelar en 48 h); no separar hojas.', 'Terremoto: apuntalar arcos y estabilizar columnas con eslingas antes de entrar.'])}
    <b>Estabilización en edificios históricos</b>${ul(['Arcos: apuntalar con una cercha de camones a la medida, con plantilla del contorno; solera bien asentada y nivelada.',
      'Columnas: cintas o eslingas tensoras con tablones, cierres opuestos y tensados en orden.', 'Siempre en binomios y con medidas de seguridad extremas.'])}`],

  ['senales', 'megaphone', 'Señales y luces', () => `${signalButtons('')}
    ${ul(['Todo el personal debe conocer las señales antes de entrar.', 'Luz química <b>roja</b>: riesgo. <b>Verde</b>: ruta y entrada a zona.', 'Tras la evacuación, recuento en el punto de reunión.'])}`],

  ['worksite', 'shield', 'Seguridad en el worksite', () => ul([
    'Acordonar y balizar la zona de trabajo y la zona de seguridad.', 'Control de entrada y salida: puerta única con hombre-puerta (tiempos, croquis, registro de víctimas y recuento).',
    'Medir la atmósfera. Valorar fuego, inundación y colapsos secundarios.', 'Cortar suministros: agua, luz y gas.',
    'Señales, zonas seguras, punto de reunión y rutas de evacuación conocidos por todos.', 'Coordinarse con otras unidades. Buscar información de estructuras, víctimas y riesgos.',
    'Distancia de seguridad: <b>2 × la altura</b> de lo que queda en pie.',
    'Tres círculos: jefe de equipo dentro (EPI específico), jefe de pelotón en la puerta (EPI general), jefe ByR fuera.'])],

  ['asr', 'layers', 'ASR: los cinco niveles', () => `
    <p class="asr-lema">${ASR.map(a => `<span><b>${a.n}</b> ${a.corto}</span>`).join('')}</p>
    <p><b>A nuestro nivel</b> (un pelotón o la sección USAR): lo nuestro es el <b>ASR 2 y el ASR 3</b> en el sector que nos asignen. El ASR 4, con relevos o con apoyo de otro equipo. El ASR 1 suele venir hecho y el ASR 5 solo se hace por orden.</p>
    <p class="muted">Van en orden, pero nos pueden mandar directamente a cualquiera, y en una misma catástrofe hay zonas en niveles distintos a la vez.</p>
    ${ASR.map(a => `<div class="asr-niv"><div class="asr-niv-h"><span class="asr-num">${a.n}</span><div><b>${a.name}</b><small>${a.quien}</small></div></div>
      <p>${a.que}</p>${ul(a.nos)}<p class="asr-sale"><b>Se entrega:</b> ${a.sale}</p></div>`).join('')}
    <button class="btn btn-g" onclick="guiaAbre('asrtool')">${ic('clipboard')} Hacer el triaje de un sitio</button>`],

  ['asrtool', 'clipboard', 'Asistente ASR: triaje y marcaje de un sitio', () => `
    <p class="muted" style="margin-bottom:10px">Para el ASR 2, delante de cada edificio o sitio. Dos preguntas y dice la categoría, qué se pinta y qué se hace después. Vale igual para un terremoto que para una explosión o un derrumbe aislado.</p>
    ${asrToolHtml()}`],

  ['triaje', 'building', 'Triaje de worksites: A, B, C, D', () => `
    ${tbl(['Cat.', 'Víctimas', 'Rescate'], Object.entries(TRIAGE).map(([k, [d, t]]) => [`<b>${k}</b>`, d, t]))}
    <b>Primero mandan las víctimas</b>${ul(['Todos los sitios con vivas confirmadas (A y B) van antes que los de posibles (C).', 'A igual categoría, primero donde haya más víctimas.',
      'Las 12 horas son una estimación a ojo: depende de dónde está la víctima, del material y tamaño del edificio y de nuestros medios.',
      'Sin víctimas no es worksite. Con solo fallecidos (D) se le da ID para que conste, pero no es prioridad.'])}
    <b>Si hay que desempatar, el edificio y los medios</b>${ul(['Uso: vivienda, oficina, colegio, hospital… dice cuánta gente puede haber dentro según la hora.', 'Tamaño y construcción: cuanto más grande y más pesado el material, más largo el trabajo.',
      'Huecos grandes (se puede gatear): más opciones de sobrevivir. Huecos pequeños (solo cabe tumbado): más riesgo para la víctima.', 'Medios disponibles y distancia al sitio: con pocos medios o lejos, todo tarda más.'])}
    <b>Tipos de colapso</b>${ul(ASR_COLAPSOS.map(([n, d]) => `<b>${n}:</b> ${d}.`))}`],

  ['marcaje', 'pencil', 'Marcaje INSARAG', () => `
    <div class="grid g2"><div class="mark">${worksiteMarkSvg({ code: 'A-2', hazards: 'Amianto', cat: 'A', status: 'active', asr: [{ team: 'ESP01', level: 2, date: todayISO() }, { team: 'ESP01', level: 3, date: todayISO() }] })}</div>
      <div class="grid g2"><div class="mark small">${victimMarkSvg([{ state: 'viva', status: 'entregada' }, { state: 'viva', status: 'localizada' }, { state: 'fallecida', status: 'localizada' }])}</div>
      <div class="mark small">${rcmSvg('C', 'ESP01', todayISO())}</div></div></div>
    <b>Caja del worksite (obligatoria)</b>${ul(['Se pinta en el ASR 2, cuando el sitio se clasifica como worksite, junto a la entrada y en un color que contraste.',
      'Caja de 1,2 × 1 m. Dentro: el ID (unos 40 cm de alto), el equipo, el nivel ASR terminado y la fecha. Encima, los riesgos (amianto, gas…). Debajo, la categoría. Una flecha si hace falta señalar la entrada.',
      'Cada equipo que termina un nivel añade su línea: equipo, ASR y fecha.', 'Cuando ya no queda nada por hacer: una raya horizontal que cruza toda la caja.'])}
    <b>ID del worksite</b>${ul(['Sectores con letra: A, B, C… (no se usan la I ni la O). Si la autoridad tiene los suyos, se usan los suyos.',
      'Intervención nacional o sin la aplicación de coordinación (ICMS): sector y número, A-1, A-2, A-3…',
      'Guías 2026–2030, con ICMS: código del equipo, guion y cuatro cifras (ESP01-0056); el sector se pone delante solo (A-ESP01-0056). El equipo reparte los números entre sus pelotones para no repetirlos.'])}
    <b>Víctimas: la V (obligatoria)</b>${ul(['V de unos 50 cm lo más cerca posible de donde está la víctima, cuando no se ve y el equipo se va del sitio. Una flecha si hace falta.',
      'Debajo, L y el número de vivas (L-2) y D y el número de fallecidos (D-1). Al sacar a alguien se tacha y se escribe lo que queda.', 'No se pone en la fachada junto a la caja, salvo que la víctima esté ahí.'])}
    <b>Marcaje rápido: el rombo (solo si lo decide la autoridad)</b>${ul(['Rombo de 20 × 20 cm con una C (despejado) o una D (solo fallecidos); debajo, el equipo y la fecha.',
      'Solo en sitios que se pueden registrar enteros deprisa o donde está claro que no queda nadie vivo. Vale también para coches, casetas o montones de escombro.'])}`],

  ['insarag', 'book', 'Guías INSARAG 2026–2030: qué cambia', () => `
    ${ul(['Se presentaron el 9 de julio en la reunión global de INSARAG y entran en vigor el <b>1 de enero de 2027</b>. Hasta entonces siguen valiendo las de 2020.',
      'Ahora son cinco volúmenes (Política, Capacitación nacional, Operaciones, Clasificación IEC/R y Guía de campo operativa) y se consultan en una web propia, enlazada desde insarag.org → Methodology → Guidelines.'])}
    <b>Lo que sigue igual</b>${ul(['Los cinco niveles ASR y sus nombres.', 'Las categorías de triaje A, B, C y D.', 'La caja del worksite, la V de víctimas y el rombo de marcaje rápido.',
      'Las señales: evacuar, tres cortas; silencio, una larga; reanudar, una larga y una corta.'])}
    <b>Lo nuevo para nosotros</b>${ul(['El ID del worksite lo da el equipo con la aplicación ICMS: código del equipo y cuatro cifras (ESP01-0056). Antes era sector y número (A-1).',
      'Zonas: si en un sector hay muchos más sitios que equipos, se reparte en zonas, una por equipo (ESP01-1Z), y se pasa a respuesta rápida. Las zonas no se pintan: solo van en los informes.',
      'Código de equipo: las tres letras olímpicas del país y dos cifras; del 01 al 09, equipos clasificados.',
      'Quién hace cada nivel: ASR 3, equipos ligeros, medios y pesados; ASR 4, medios y pesados; ASR 5, normalmente los medios locales.'])}`],

  ['estructuras', 'building', 'Lados, cuadrantes y colapsos', () => `
    <div class="mark small">${orientationSvg()}</div>
    ${tbl(['Colapso', 'Huecos de vida probables'], [['Inclinado', 'Bajo el forjado, junto al muro que aguanta'], ['Total (pancake)', 'Pocos y pequeños: entre forjados, junto a muebles'],
      ['Voladizo', 'Bajo el forjado que cuelga. Muy inestable'], ['En A', 'A ambos lados del apoyo central'], ['En V', 'Junto a los muros, a los dos lados']])}`],

  ['busqueda', 'search', 'Búsqueda', () => `
    <b>Superficie</b>${ul(['En hilera o binomios; cada uno con su calle solapada con la siguiente.', 'Mantener la línea, esperar al que se retrase. El jefe comprueba que no quedan zonas sin ver.', 'Mirar en huecos, bajo forjados y muebles grandes.'])}
    <b>Llamada y escucha</b>${ul(['Silencio total: máquinas paradas.', '«Equipo de rescate. Si puede oírme, grite o golpee tres veces».', 'Quien oye algo levanta la mano y señala; se triangula entre varios.', 'Si no hay respuesta, avanzar 1,5–2 m y repetir.'])}
    <b>Canina</b>${ul(['Mínimo dos perros: uno marca, el otro confirma.', 'Mejor al amanecer o anochecer, frío con viento suave, escombro estable y lluvia suave.', 'Peor con calor, viento fuerte o sin viento, humo y químicos.'])}
    <b>Técnica</b>${ul(['Cámara: ver por huecos y en cortes limpios. No usar con líneas eléctricas activas o atmósfera explosiva.', 'Geófono: sensor en la parte más sólida y amplia, sobre materiales parecidos y en el mismo sentido. Nada blando ni suelto. Cuidado con los cables.'])}`],

  ['cargas', 'package', 'Movimiento de cargas', () => `
    ${tbl(['Material', 'kg/m³'], DENSITY.map(([n, d]) => [n, d.toLocaleString('es-ES')]))}
    ${ul(['Cojines: botella con reductor a 8 bar y válvula de seguridad. Máximo dos apilados, el grande abajo. «Centímetro elevado, centímetro asegurado» (zampeado). Mangueras de colores y órdenes cortas: «sube rojo».',
      'Zampeado: viguetas de 10×10 o 15×15, alineadas y sobresaliendo 10 cm.', 'Cuña hidráulica: abre 50 mm en una ranura de 6 mm.',
      'Bípode Paratech: 2 t (factor 4:1), apertura máxima 60°, inclinación sobre la carga no menor de 45°.',
      'Tornillo para hormigón (broca 2 mm menor): M8 400/350 kg · M10 600/750 · M12 900/1250 · M14 1300/1500 (tracción/cizalla).',
      'Ángulo de tiro sobre el anclaje: 0° = 100 %, 45° = 30 %, 90° = 0 % (no usar).'])}`],

  ['apuntalamiento', 'wrench', 'Apuntalamiento', () => `
    ${tbl(['Sistema', 'Datos clave'], [['En T', 'Temporal. Hasta 3,3 m, 1.800 kg. Cumbrera ≤ 90 cm'], ['Fila de puntales', 'Separación ≤ 1,2 m. 3.600 kg/puntal hasta 2,4 m; 2.250 kg hasta 3 m; 1.500 kg hasta 3,6 m. Riostra central si > 2,4 m'],
      ['Doble T', '≈ 2.500 kg por puntal. 2 riostras si > 3,35 m'], ['Torre', 'Puntal ≤ 4,9 m, entre 0,9 y 1,2 m, hasta 15.000 kg'],
      ['Inclinado', 'Perpendicular a la carga si está unida al suelo; si no, al terreno. Ejiones con 14 clavos. Riostras en X si > 1,2 m, en Z si menos'],
      ['Lateral', 'Ángulo de 30° a 60°. Triángulos cada ≤ 2,4 m, con freno'], ['Horizontal', 'Puntal ≤ 2,4 m, sistemas cada ≤ 2,4 m, riostras en cruz'],
      ['Holmatro', '10 t por puntal. Extensiones: SX1 125 mm blanca · SX2 250 azul · SX5 500 amarilla · SX10 1000 verde · SX15 1500 roja']])}
    ${ul(['Prefabricar en zona segura. Medir dos veces, cortar una.', 'Revisar cada 12 h y siempre después de una réplica.', 'Holmatro: pocas extensiones, las cortas al final; dejar 10 cm para cambiar a madera.',
      'Arcos: cuadro (solera, puntales en los extremos y cumbrera) y cercha (camones) a la medida del arco; puntal intermedio por cada 1,50 m de luz.'])}
    <div class="row" style="margin-top:12px"><button class="btn btn-a" onclick="go('apuntalamientos')">${ic('wrench')} Todos los apuntalamientos, con dibujo</button>
      <button class="btn btn-g" onclick="go('arcos')">${ic('wrench')} Apuntalar un arco: cortes, cercha y camones</button></div>`],

  ['corte', 'wrench', 'Corte y perforación', () => ul([
    'Herramienta adecuada al material. Marca el corte con pintura. Protección auditiva y respiratoria.',
    '<b>Corte limpio</b> si la víctima está debajo: taladro y cámara primero; que no caiga nada. Con radial y placa grande: cuadrícula y tapón central.',
    '<b>Corte sucio</b> (perforación) si no importa lo que caiga: más rápido. En hormigón armado, martillo para el hormigón y corte para las varillas.',
    'Radial: cortar siempre en vertical, nunca en lateral, y no con la parte superior del disco.',
    'Oxicorte: acetileno rojo, oxígeno azul. Botellas de pie. Nunca grasa ni aceite en grifos.'])],

  ['zanjas', 'route', 'Zanjas y pozos', () => ul([
    'Acercarse con cuidado, sin vibraciones (máquinas, generadores).', 'Tableros en los bordes para repartir el peso.',
    'Medir atmósfera. ¿Dudas? Ventilar.', 'Escalera asegurada en la cabeza más cercana a la víctima.', 'Velas y puntales neumáticos, colocados de arriba abajo.'])],

  ['confinados', 'wind', 'Espacios confinados', () => `
    ${tbl(['O₂', 'Efecto'], [['> 23,5 %', 'Peligro de incendio'], ['21 %', 'Normal'], ['19,5–16 %', 'Mínimo inocuo'], ['16–14 %', 'Desorientación'], ['14–10 %', 'Fatiga rápida, juicio alterado'], ['< 10 %', 'Náuseas, pérdida de movimiento, muerte']])}
    ${tbl(['Explosividad', 'Entrada'], [['≥ 10 % LEL', 'Prohibida'], ['5–10 % LEL', 'Solo emergencias, con ERA'], ['< 5 % LEL', 'Permitida, medición continua']])}
    ${ul(['Medir en este orden: O₂ → explosividad → tóxicos (CO ≤ 20 ppm, H₂S ≤ 5 ppm). Arriba, en medio y abajo.',
      'ERA: minutos = litros × bar ÷ 50. Silbato a 50 bar. Regla rápida: 10 bar ≈ 1 min.',
      'Entra el menor número posible el menor tiempo. Control en puerta. Transmisiones imprescindibles. Arnés y línea de vida.',
      'Ventilación positiva: una boca para meter aire y otra para que salga. Negativa: aspirar, colocando bien la manga.'])}`],

  ['mmpp', 'alert', 'Materiales peligrosos', () => `
    ${tbl(['Caso', 'Zona de seguridad'], [['Gases licuados inflamables, explosivos, BLEVE, grandes nubes tóxicas', '250 m'], ['Líquidos inflamables', '100 m'], ['Resto de químicos', '50 m'], ['Radiactivos', '100 m caliente + 100 m templada']])}
    ${ul(['Situarse a favor del viento, o pendiente arriba si es un líquido.', 'Identificar el producto (nº ONU) y asumir el peor escenario.', 'Punto de descontaminación siempre listo. EPI contaminado en doble bolsa. Lejía al 5 % solo para contaminación biológica.'])}`],

  ['sanidad', 'heart', 'Sanidad', () => `
    ${ul(['El rescatador es el primer eslabón de la cadena sanitaria.', '<b>C-ABC</b>: consciencia (Alerta, Verbal, Dolor, No responde), vía aérea, respiración (ver, oír, sentir) y circulación.',
      'Hemorragia: presión directa al menos 10 min; si no basta, torniquete y anota la hora.', 'Inconsciente que respira: posición lateral de seguridad. Si no respira: RCP 30/2.',
      'Aplastamiento: liberar solo con la cadena sanitaria lista; torniquete tres dedos por encima; vendaje compresivo; no calentar.',
      'No dar de comer ni beber salvo consciente y si la ayuda tardará más de una hora.'])}
    <b>Triaje START</b>${tbl(['Color', 'Cuándo'], [['<span class="vdot" style="background:#2e7d32"></span> Verde', 'Camina'], ['<span class="vdot" style="background:#1b1b1b"></span> Negro', 'No respira ni tras abrir la vía aérea'],
      ['<span class="vdot" style="background:#c62828"></span> Rojo', 'Respira solo al abrir la vía aérea, > 30 rpm, sin pulso radial o no obedece'], ['<span class="vdot" style="background:#d69a00"></span> Amarillo', 'El resto']])}`],

  ['riesgos', 'alert', 'Evaluación de riesgos', () => `${riskMatrix()}${tbl(['Nivel', 'Qué hacer'], RISK_LEVELS.map(([n, , d]) => [`<b>${n}</b>`, d]))}`],

  ['boo', 'tent', 'Base de operaciones', () => ul([
    'Unos 50 × 40 m para un equipo pesado. Perímetro balizado, punto de encuentro, aviso (megáfono o sirena), zona de perros separada.',
    'Montaje: primero puesto de mando y tienda sucia, después perímetro y el resto.',
    'Entrada sucia: el mono y el EPI nunca dentro de la base. Se dejan en la tienda sucia; lavarse manos y cara al volver. Actualizar el estado del personal en el puesto de mando.'])],

  ['ume', 'users', 'Organización UME', () => `
    ${ul(['Elementos de reconocimiento: 15 min. Primera intervención: 1 h. Siguientes: 2,5 h desde la activación.',
      'Equipo USAR de la UME: mando y control, búsqueda y rescate (jefe ByR, pelotones de rescatadores, búsqueda técnica, guías caninos, materiales peligrosos), sanidad y logística.',
      'Un equipo medio trabaja 24 h durante 7 días con relevos. Unidad básica de trabajo: 5 personas.',
      'Ciclo: preparación, movilización, operaciones, desmovilización y post-misión (informe en 45 días).'])}`],

  ['etica', 'book', 'Ética', () => ul(['Respeto a la cultura, religión, género y costumbres locales.', 'Nada de fotos de víctimas ni recuerdos de la zona.',
    'Pintar solo el marcaje necesario en propiedades privadas.', 'Sin propinas para conseguir colaboración. Sin política.', 'Evitar comportamientos que aumenten el estrés de otros.'])],

  ['trafico', 'truck', 'Accidentes de tráfico', () => `<ol class="tips">${['Llegada y posicionamiento de vehículos', 'Valoración', 'Señalización', 'Control de riesgos inminentes y prevención de incendio', 'Estabilización',
    'Acceso inicial al vehículo', 'Atención sanitaria', 'Excarcelación', 'Extracción de la víctima', 'Despeje de la calzada', 'Recogida del material', 'Restitución del tráfico'].map(s => `<li>${s}</li>`).join('')}</ol>`]
];

function viewGuia() {
  const q = (prefs.guideQ || '').toLowerCase();
  const cards = GUIDE.map(([id, icon, title, html]) => [id, icon, title, html()]).filter(([, , t, h]) => !q || (t + h).toLowerCase().includes(q));
  setTimeout(bindCalcs, 0);
  return `
    <div class="panel">
      <h2>Guía de campo</h2>
      <p class="muted" style="margin:4px 0 12px">Fichas rápidas del Manual de Campo USAR UME 2023 y de las guías INSARAG (2026–2030). Funcionan sin conexión.</p>
      <div class="row guia-atajos"><button class="btn btn-a" onclick="guiaAbre('asrtool')">${ic('clipboard')} Triaje de un sitio (ASR 2)</button>
        <button class="btn btn-g" onclick="guiaAbre('asr')">${ic('layers')} Niveles ASR</button></div>
      <input class="input" type="search" aria-label="Buscar en la guía" placeholder="Buscar: ASR, triaje, marcaje, apuntalar, O₂…" value="${esc(prefs.guideQ || '')}"
        oninput="prefs.guideQ = this.value; clearTimeout(window._gq); window._gq = setTimeout(() => { const p = this.selectionStart; render(); const i = document.querySelector('#view input[type=search]'); i.focus(); i.setSelectionRange(p, p); }, 250)">
    </div>
    <div class="guide-grid">${cards.map(([id, icon, title, html]) => `
      <details class="panel guide" id="g-${id}" ${q || id === 'calc' ? 'open' : ''}>
        <summary class="between"><h3 class="sec-title" style="margin:0">${ic(icon in ICONS ? icon : 'book')} ${title}</h3>${ic('chev', 'i-sm')}</summary>
        <div class="guide-body">${html}</div>
      </details>`).join('') || '<p class="muted">Sin resultados.</p>'}</div>`;
}

function bindCalcs() {
  const num = (el, n) => parseFloat(String(el.querySelector(`[name=${n}]`)?.value || '').replace(',', '.')) || 0;
  const kg = n => Math.round(n).toLocaleString('es-ES');
  const calcs = {
    calcLoad: el => { const w = num(el, 'd') * num(el, 'l') * num(el, 'a') * num(el, 'e'); return `≈ <b>${kg(w)} kg</b> · cojín o gato de al menos ${(w / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} t`; },
    calcSlab: el => `≈ <b>${kg(num(el, 'c') * num(el, 's'))} kg</b> de peso propio (${num(el, 'c')} kp/m², sin escombro ni muebles encima)`,
    calcDist: el => `Balizar a <b>${Math.ceil(num(el, 'h') * 2)} m</b> como mínimo`,
    calcEra: el => `<b>${eraToAlarm(num(el, 'l'), num(el, 'b'))} min</b> hasta el silbato · ${eraMinutes(num(el, 'l'), num(el, 'b'))} min en total`,
    calcAnchor: el => { const g = Math.min(90, Math.max(0, num(el, 'g'))); const f = g >= 90 ? 0 : g <= 0 ? 1 : g <= 45 ? 1 - g / 45 * .7 : .3 * (90 - g) / 45;
      return g >= 90 ? '<b>No usar</b> a 90°' : `Resiste ≈ <b>${kg(num(el, 't') * f)} kg</b> (${Math.round(f * 100)} % de ${kg(num(el, 't'))} kg a tracción; interpolado entre 0°, 45° y 90°)`; }
  };
  Object.entries(calcs).forEach(([id, fn]) => {
    const el = $(id);
    if (!el) return;
    const out = el.querySelector('[data-out]');
    const run = () => { out.innerHTML = fn(el); };
    el.oninput = run; el.onchange = run; run();
  });
}

// Guía: al abrir un apartado se cierra el que estaba abierto (solo uno a la vez)
document.addEventListener('click', e => {
  const sum = e.target.closest('details.guide > summary'); if (!sum) return;
  const d = sum.parentElement;
  if (!d.open) document.querySelectorAll('details.guide[open]').forEach(x => { if (x !== d) x.open = false; });
});

/* ---------- Señales acústicas (el móvil hace de bocina) y matriz de riesgos ---------- */
let audioCtx = null;
function playSignal(seq) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    audioCtx.resume?.();
    let t = audioCtx.currentTime + .05;
    seq.forEach(([on, off]) => {
      const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
      osc.type = 'square'; osc.frequency.value = 2400;
      gain.gain.setValueAtTime(0, t); gain.gain.linearRampToValueAtTime(.5, t + .02);
      gain.gain.setValueAtTime(.5, t + on / 1000 - .03); gain.gain.linearRampToValueAtTime(0, t + on / 1000);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t); osc.stop(t + on / 1000 + .02);
      t += (on + off) / 1000;
    });
  } catch {}
  haptic(seq.flat());
}

function signalButtons(mid) {
  return `<div class="signals">${SIGNALS.map(([id, name, desc]) => `
    <button class="signal ${id}" onclick="emitSignal('${mid}', '${id}')">
      <span class="sig-name">${name}</span><span class="sig-desc">${desc}</span>
      <span class="sig-pat">${SIGNALS.find(s => s[0] === id)[3].map(([on]) => `<i style="width:${Math.round(on / 60)}px"></i>`).join('')}</span>
    </button>`).join('')}</div>`;
}

function emitSignal(mid, id) { playSignal(SIGNALS.find(s => s[0] === id)[3]); }
function riskMatrix() {
  return `<table class="matrix"><tr><th></th>${CONS.map(c => `<th>${c}</th>`).join('')}</tr>
    ${PROB.map((p, i) => `<tr><th>${p}</th>${CONS.map((_, j) => { const lv = riskLevel(i, j); return `<td class="${lv[1]}">${lv[0]}</td>`; }).join('')}</tr>`).join('')}</table>`;
}
