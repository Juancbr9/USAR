'use strict';
// USAR 242 · Método de trabajo: fases, funciones, triajes, riesgos y umbrales
// Fuentes: Manual de Campo USAR UME 2023, Guías INSARAG Vol. III, módulos M1/M3/M4/M6/M7 y UA1–UA7 de la EMES.

/* ==================== FASES DE LA OPERACIÓN ==================== */
// Orden de trabajo de la UME en estructuras colapsadas. Cada fase tiene su lista de comprobación.
const PHASES = [
  { id: 'activacion', name: 'Activación y salida', short: 'Salida', checks: [
    'Personal convocado y asignado a equipos',
    'Vehículos asignados con conductor',
    'Material elegido, revisado y cargado',
    'EPI completo: casco, protección auditiva, mono, guantes, gafas, botas, mascarilla',
    'Canal de radio probado',
    'Orden de salida enviada al equipo'] },
  { id: 'informacion', name: 'Recogida de información', short: 'Información', checks: [
    'Contacto con el mando o autoridad local',
    'Número de edificios afectados y hora del siniestro',
    'Ocupación: personas, edades y dónde estaban',
    'Meteorología y riesgo de réplicas',
    'Peligros: gas, luz, agua, químicos',
    'Accesos, planos y acciones previas de otros servicios'] },
  { id: 'reconocimiento', name: 'Reconocimiento y evaluación', short: 'Reconocimiento', checks: [
    'Reconocimiento con jefe ByR, búsqueda e ingeniero de estructuras',
    'Evaluación estructural y tipo de colapso',
    'Worksites identificados y clasificados (triaje)',
    'Marcaje INSARAG aplicado',
    'Vehículos aparcados con salida libre'] },
  { id: 'zona', name: 'Organización de la zona de trabajo', short: 'Zona', checks: [
    'Zona balizada a la distancia de seguridad (2 × altura)',
    'Puerta única con hombre-puerta y control de entradas',
    'Suministros cortados: gas, electricidad, agua',
    'Atmósfera comprobada',
    'Zona de seguridad: lona de herramientas, agua y comida',
    'Punto de reunión y rutas de evacuación definidos',
    'Vigía y oficial de seguridad designados',
    'Briefing con croquis y señales acústicas'] },
  { id: 'busqueda', name: 'Búsqueda', short: 'Búsqueda', checks: [
    'Búsqueda en superficie por calles solapadas',
    'Llamada y escucha con silencio total',
    'Búsqueda canina (2 perros: uno marca, otro confirma)',
    'Búsqueda técnica: cámara y geófonos',
    'Víctimas localizadas y marcadas (V, L-n / D-n)'] },
  { id: 'rescate', name: 'Rescate', short: 'Rescate', checks: [
    'Plan de rescate decidido y explicado',
    'Acceso: corte o perforación',
    'Estabilización y apuntalamiento',
    'Contacto con la víctima: hidratación, mascarilla, gafas y manta',
    'Cadena sanitaria lista antes de liberar',
    'Extracción y entrega anotadas'] },
  { id: 'final', name: 'Control final y retirada', short: 'Retirada', checks: [
    'Retirada selectiva de arriba abajo y de fuera a dentro',
    'Recuento de todo el personal',
    'Material recogido, revisado y devuelto',
    'Marcaje final del worksite (línea horizontal)',
    'Informe y lecciones aprendidas'] }
];

/* ==================== FUNCIONES CLAVE EN ZONA ==================== */
const FUNCS = [
  ['seguridad', 'Oficial de seguridad', 'Vigila riesgos y puede parar el trabajo'],
  ['puerta', 'Hombre-puerta', 'Controla entradas, salidas, tiempos y el recuento'],
  ['vigia', 'Vigía', 'Observa la estructura y da la señal de evacuación'],
  ['byr', 'Jefe de búsqueda y rescate', 'Dirige el trabajo en el worksite'],
  ['busqueda', 'Jefe de búsqueda', 'Búsqueda técnica y canina'],
  ['estructuras', 'Evaluación de estructuras', 'Valora daños, colapso y apuntalamiento'],
  ['sanitario', 'Sanitario', 'Atención a víctimas y al equipo'],
  ['logistica', 'Logística', 'Material, agua, comida y relevos']
];

/* ==================== SEÑALES ACÚSTICAS ==================== */
// [id, nombre, descripción, secuencia de tonos [ms encendido, ms apagado]]
const SIGNALS = [
  ['evacuar', 'Evacuación', '3 pitadas cortas', [[900, 350], [900, 350], [900, 0]]],
  ['parar', 'Parar, todos quietos', '1 pitada larga de 3 s', [[3000, 0]]],
  ['seguir', 'Continuar', '1 larga y 1 corta', [[2000, 400], [700, 0]]]
];

/* ==================== ZONA DE TRABAJO ==================== */
const HAZARDS = ['Colapso secundario', 'Réplicas', 'Gas', 'Electricidad', 'Agua / inundación', 'Fuego', 'Químicos / MMPP',
  'Amianto', 'Polvo', 'Atmósfera peligrosa', 'Riesgo biológico', 'Tráfico / maquinaria'];
const SUPPLIES = ['Gas', 'Electricidad', 'Agua'];

/* ==================== EVALUACIÓN DE RIESGOS (probabilidad × consecuencias) ==================== */
const PROB = ['Baja', 'Media', 'Alta'];
const CONS = ['Leves', 'Graves', 'Muy graves'];
const RISK_LEVELS = [
  ['Trivial', 'ok', 'No requiere acción específica.'],
  ['Tolerable', 'ok', 'Sin medidas nuevas; comprobar que las actuales funcionan.'],
  ['Moderado', 'warn', 'Reducir el riesgo con medidas en un plazo concreto.'],
  ['Importante', 'bad', 'No empezar hasta reducir el riesgo. Si ya se trabaja, actuar de inmediato.'],
  ['Intolerable', 'bad', 'No empezar ni seguir hasta reducirlo. Si no se puede, prohibido trabajar.']
];
const riskLevel = (p, c) => RISK_LEVELS[[[0, 1, 2], [1, 2, 3], [2, 3, 4]][p][c]];
const RISK_CATALOG = ['Colapso secundario o derrumbe', 'Caída de objetos o escombros', 'Caída a distinto nivel', 'Caída al mismo nivel',
  'Cortes y golpes con herramientas', 'Proyección de partículas', 'Ruido', 'Vibraciones', 'Polvo e inhalación', 'Atmósfera deficiente en oxígeno',
  'Atmósfera explosiva', 'Atmósfera tóxica', 'Contacto eléctrico', 'Fuga de gas', 'Incendio o explosión', 'Inundación o ahogamiento',
  'Atrapamiento', 'Sobreesfuerzos', 'Estrés térmico', 'Fatiga y estrés', 'Riesgo biológico', 'Amianto', 'Materiales peligrosos (NRBQ)',
  'Réplicas', 'Tráfico y maquinaria pesada'];

/* ==================== WORKSITES ==================== */
const ASR = [
  [1, 'Evaluación extensa del área', 'Estudio previo para sectorizar, situar la BoO y hacer el plan de acción.'],
  [2, 'Evaluación del sector', 'Identificar y clasificar worksites viables dentro del sector.'],
  [3, 'Búsqueda y rescate rápido', 'ByR ligera, material no especializado y poco tiempo.'],
  [4, 'Búsqueda y rescate completo', 'ByR exhaustiva con material especializado y mucho tiempo.'],
  [5, 'Búsqueda y recuperación total', 'Desescombro y recuperación de fallecidos (normalmente autoridad local).']
];
// Triaje de worksites según el Manual de Campo USAR 2023 (INSARAG 2020)
const TRIAGE = {
  A: ['Vivas confirmadas, rescate de menos de 12 h', 'bad'],
  B: ['Vivas confirmadas, rescate de más de 12 h', 'warn'],
  C: ['Posibles víctimas vivas sin confirmar', 'info'],
  D: ['Solo víctimas fallecidas', 'neutral']
};
const WS_STATUS = { pending: ['Pendiente', 'warn'], active: ['En trabajo', 'bad'], done: ['Terminado', 'ok'] };
const COLLAPSE = ['Inclinado', 'Total (pancake)', 'Voladizo', 'En A', 'En V', 'Parcial', 'En pie con daños'];
const BUILD_USE = ['Vivienda', 'Edificio de viviendas', 'Oficinas', 'Comercial', 'Industrial', 'Escuela', 'Hospital', 'Residencia', 'Otro'];
const CONSTRUCTION = ['Hormigón armado', 'Estructura de acero', 'Ladrillo / mampostería', 'Madera', 'Mixta'];
const WS_OPS = [
  ['A', 'Perro / búsqueda técnica'], ['B', 'Apuntalamiento'], ['C', 'Rompimiento y corte'],
  ['D', 'Levantamiento y movimiento de cargas'], ['E', 'Cuerdas / trabajo en altura'], ['F', 'Necesidades médicas']
];
// Evaluación estructural: los diez factores de INSARAG
const STRUCT_EVAL = [
  ['edificio', 'Edificio original', 'Uso, ocupación, planta, altura, distribución, materiales'],
  ['colapso', 'Colapso', 'Por qué y cómo cayó, qué lo detuvo, reparto de escombros'],
  ['danos', 'Daños', 'Columnas, muros de carga, vigas, forjados y uniones'],
  ['huecos', 'Huecos de vida', 'Dónde están, de qué tamaño, qué los forma'],
  ['accesos', 'Accesos y salidas', 'Ruta a los huecos prioritarios, entrada y salida'],
  ['rutas', 'Rutas de búsqueda, rescate y escape', 'Por dónde se entra, se trabaja y se huye'],
  ['apuntalar', 'Apuntalamiento', 'Para entrar con seguridad y evitar asentamientos'],
  ['vigilancia', 'Vigilancia y alerta', 'Testigos, asentamiento de escombros, vigía'],
  ['evacuacion', 'Plan de evacuación', 'Señales, rutas, refugios y punto de reunión']
];

/* ==================== VÍCTIMAS ==================== */
const V_STATUS = { localizada: ['Localizada', 'warn'], rescate: ['En rescate', 'bad'], extraida: ['Extraída', 'ok'], entregada: ['Entregada', 'neutral'] };
const V_STATE = { viva: 'Viva', fallecida: 'Fallecida', desconocida: 'Sin confirmar' };
const V_COLORS = { rojo: ['Rojo · inmediato', '#c62828'], amarillo: ['Amarillo · urgente', '#d69a00'], verde: ['Verde · leve', '#2e7d32'], negro: ['Negro · fallecido o inviable', '#1b1b1b'] };
const V_METHODS = ['Visual / superficie', 'Llamada y escucha', 'Canina', 'Cámara', 'Geófono', 'Información de testigos'];
const V_HANDED = ['Ambulancia', 'Equipo médico', 'Hospital', 'Hospital de campaña', 'Helicóptero', 'Familia / vecinos', 'Morgue', 'Otro'];
const V_WORK = ['Solo asistencia', 'Retirada de escombro ligero', 'ByR rápido (ASR 3)', 'ByR completo (ASR 4)', 'Recuperación total (ASR 5)'];
const V_INJURY = { ninguna: 'Sin lesiones', estable: 'Estable', critico: 'Crítico' };

/* ==================== ESPACIOS CONFINADOS ==================== */
const GAS_LIMITS = { co: 20, h2s: 5 };   // ppm, valor límite de exposición diaria (VLA-ED)
function o2Status(v) {
  if (v === '' || v == null || isNaN(v)) return null;
  if (v > 23.5) return ['bad', 'Exceso de O₂: peligro de incendio'];
  if (v >= 19.5) return ['ok', 'Oxígeno normal'];
  if (v >= 16) return ['warn', 'Bajo: mínimo inocuo'];
  if (v >= 14) return ['bad', 'Desorientación, respiración acelerada'];
  if (v >= 10) return ['bad', 'Fatiga rápida, juicio alterado'];
  return ['bad', 'Mortal en pocos minutos'];
}
// Decisión de entrada: prima el peor valor (orden de medida: O₂ → explosividad → tóxicos)
function atmosphereVerdict(r) {
  const o2 = parseFloat(r.o2), lel = parseFloat(r.lel), co = parseFloat(r.co), h2s = parseFloat(r.h2s);
  const notes = [];
  let level = 0;   // 0 permitida, 1 solo emergencias con ERA, 2 prohibida
  if (!isNaN(lel)) {
    if (lel >= 10) { level = 2; notes.push(`LEL ${lel}%: ≥10 %, entrada prohibida`); }
    else if (lel >= 5) { level = Math.max(level, 1); notes.push(`LEL ${lel}%: entre 5 y 10 %, solo emergencias`); }
  }
  if (!isNaN(o2) && (o2 < 19.5 || o2 > 23.5)) { level = Math.max(level, 1); notes.push(`O₂ ${o2}%: ${o2Status(o2)[1].toLowerCase()}, ERA obligatorio`); }
  if (!isNaN(co) && co > GAS_LIMITS.co) { level = Math.max(level, 1); notes.push(`CO ${co} ppm: supera ${GAS_LIMITS.co} ppm, ERA obligatorio`); }
  if (!isNaN(h2s) && h2s > GAS_LIMITS.h2s) { level = Math.max(level, 1); notes.push(`H₂S ${h2s} ppm: supera ${GAS_LIMITS.h2s} ppm, ERA obligatorio`); }
  return [
    ['ok', 'Entrada permitida', 'Medición continua y ventilación si hay dudas.'],
    ['warn', 'Limitada a emergencias', 'Solo personal formado, con ERA, ventilación y evaluación continua.'],
    ['bad', 'Entrada prohibida', 'Ventilar y volver a medir. Solo personal especializado.']
  ][level].concat([notes]);
}
// Autonomía del ERA: litros × bar / 50 l/min (consumo medio). Silbato de alarma a 50 bar.
const eraMinutes = (litres, bar) => Math.max(0, Math.floor(litres * bar / 50));
const eraToAlarm = (litres, bar) => Math.max(0, Math.floor(litres * (bar - 50) / 50));
const ABORT = ['Orden del mando o del vigilante', 'Alarma del detector o cambio de atmósfera', 'Fallo de comunicaciones',
  'Problema físico o malestar de un rescatador', 'Silbato del ERA (50 bar)'];
const CONFINED_ROLES = [['entrants', 'Rescatadores que entran'], ['backup', 'Equipo de respaldo'], ['guard', 'Vigilante del acceso'], ['systems', 'Operador de sistemas (aire, ventilación, cuerdas)']];

/* ==================== SANIDAD: TRIAJE START ==================== */
// Devuelve el siguiente paso o el color final
const START_STEPS = {
  walk: ['¿Camina?', [['Sí', 'verde'], ['No', 'breath']]],
  breath: ['¿Respira?', [['Sí', 'rate'], ['No', 'airway']]],
  airway: ['Abre la vía aérea. ¿Respira ahora?', [['Sí', 'rojo'], ['No', 'negro']]],
  rate: ['¿Más de 30 respiraciones por minuto?', [['Sí', 'rojo'], ['No', 'pulse']]],
  pulse: ['¿Pulso radial presente (relleno capilar < 2 s)?', [['Sí', 'orders'], ['No', 'rojo']]],
  orders: ['¿Obedece órdenes sencillas?', [['Sí', 'amarillo'], ['No', 'rojo']]]
};
