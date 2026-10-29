'use strict';
// USAR 242 · Configuración del equipo: personas, puertas, EPI y perfiles de misión

/* ==================== CONFIGURACIÓN ==================== */
const TEAM = ['GRANADOS', 'CABRERA', 'IBAÑEZ', 'BRAYAN', 'AGUIAR', 'DORTA', 'CRISTOFER',
              'RODRI', 'AREVALO', 'NUÑEZ', 'LENIS', 'FERNANDEZ', 'MANOLO'];
const STATUS_TAG = { 'OPERATIVO': 'ok', 'REVISIÓN': 'warn', 'AVERIADO': 'bad' };
// Huecos del contenedor, como en las hojas pegadas en él. Cada lateral: 4 columnas; en las dos del centro hay tres huecos
// (el de arriba es compartido: «B3 y B6», «B13 y B16») y en las de los extremos, dos (arriba uno alto y abajo otro).
// c / r: columna y fila en el dibujo (formato de grid CSS).
const SIDE_L = [{ id: 1, c: '1', r: '1 / 3' }, { id: 2, c: '1', r: '3' }, { id: 3, c: '2 / 4', r: '1', label: 'B3 y B6' }, { id: 4, c: '2', r: '2' },
  { id: 7, c: '3', r: '2' }, { id: 5, c: '2', r: '3' }, { id: 8, c: '3', r: '3' }, { id: 9, c: '4', r: '1 / 3' }, { id: 10, c: '4', r: '3' }];
const HUECOS = [...SIDE_L.map(h => ({ ...h, label: h.label || 'B' + h.id })), ...SIDE_L.map(h => ({ ...h, id: h.id + 10, label: h.label ? 'B13 y B16' : 'B' + (h.id + 10) }))];
// Dibujos de los vehículos de la unidad (img/veh/<id>.webp); los demás usan su foto si se pone, o un icono
const VEH_ART = ['V-SANGYONG', 'V-GUAGUA-G', 'V-GUAGUA-P', 'V-VPI', 'V-AMB', 'V-AMAROK', 'V-CAM-VERDE', 'V-AB', 'V-CUPRA', 'V-ATB-M1', 'V-ATB-M2', 'V-AB-CHASIS', 'V-RQ-GE'];
// Autobomba Renault: siempre vacía detrás; el módulo se elige al llevarla a una actividad (o para verla), y con él el dibujo
const RENAULT = 'V-AB-CHASIS';
const RENAULT_MOD = { '': ['Vacía (sin módulo)', 'v-ab-chasis'], cont: ['Contenedor pequeño', 'v-ab-cont'], cont2: ['Contenedor pequeño 2', 'v-ab-cont2'], lcif: ['Módulo LCIF', 'v-ab-lcif'] };
// Posición de cada hueco sobre el dibujo del lateral (img/contenedor-lateral.webp): izquierda, arriba, ancho y alto en %
const HUECO_RECT = { 1: [5.73, 4.48, 19.56, 49.25], 2: [5.73, 56.72, 19.56, 35.82], 3: [27.75, 4.48, 45.11, 26.12], 4: [27.75, 37.01, 21.15, 26.42],
  7: [51.37, 37.01, 21.5, 26.42], 5: [27.75, 69.4, 21.15, 23.13], 8: [51.37, 69.4, 21.5, 23.13], 9: [75.33, 4.48, 18.94, 49.25], 10: [75.33, 56.72, 18.94, 35.82] };
// Otros sitios donde se guarda material, fuera del contenedor (mismo campo «door» que los huecos). ESCALON: el material
// en revisión o arreglándose. PASILLO («pasillo sin hueco») y OTROS ya no se usan: lo que hubiera pasa a «sin ubicar»
const PASILLO = 101, OTROS = 301, ESCALON = 302;
// Pasillo: estantería de palés (montantes azules, largueros naranjas) con PAS_MOD módulos y dos alturas: el suelo y la
// primera balda. id = 100 + módulo × 10 + nivel (nivel 0 = suelo); PASILLO (101) es «en el pasillo, sin sitio concreto».
const PAS_MOD = 5, PAS_NIV = ['Suelo', 'Balda 1'];
const PASILLO_SITIOS = Array.from({ length: PAS_MOD }, (_, m) => PAS_NIV.map((nv, n) => ({ id: 100 + (m + 1) * 10 + n, mod: m + 1, niv: n }))).flat();
// Armarios: tres armarios de dos puertas sobre la estantería; dentro, ARM_BALDAS baldas (1 arriba).
// id = 200 + armario × 10 + balda; ARM_SUELO es el suelo de la estantería, delante de los armarios (cascos, cajas, nevera…)
const ARM_BALDAS = 5, ARM_SUELO = 290;
const ARMARIOS = [1, 2, 3].flatMap(n => Array.from({ length: ARM_BALDAS }, (_, b) => ({ id: 200 + n * 10 + b + 1, n, balda: b + 1 })));
const enPasillo = d => PASILLO_SITIOS.some(p => p.id === d);
const enArmarios = d => d === ARM_SUELO || ARMARIOS.some(a => a.id === d);
const PLACES = [...PASILLO_SITIOS.map(p => ({ id: p.id, label: `Pasillo · módulo ${p.mod} · ${PAS_NIV[p.niv].toLowerCase()}`, short: `Pasillo M${p.mod} ${p.niv ? 'balda' : 'suelo'}`, area: 'pasillo' })),
  ...ARMARIOS.map(a => ({ id: a.id, label: `Armario ${a.n} · balda ${a.balda}`, short: `Armario ${a.n} b${a.balda}`, area: 'armarios' })),
  { id: ARM_SUELO, label: 'Delante de los armarios', short: 'Delante armarios', area: 'armarios' },
  { id: ESCALON, label: 'Escalón', short: 'Escalón', area: 'escalon' }];
// Situación del material en revisión
const REV_STATES = { taller: ['En el taller', 'warn'], espera: ['A la espera de revisión', 'warn'], inoperativo: ['Inoperativo', 'bad'], operativo: ['Operativo (con defecto)', 'ok'], baja: ['De baja', 'bad'] };
// EPI que lleva cada persona
const EPI_TYPES = { casco: 'Casco', auditivos: 'Protectores auditivos', mono: 'Mono' };
const EPI_SIZED = ['mono'];   // EPI con talla propia
const GEAR_FUNCS = ['Búsqueda', 'Rescate', 'Médico', 'Logística', 'Comunicaciones', 'Seguridad'];
// Tipos de emergencia y el material que suele hacer falta (palabras que se buscan en el nombre o la función de cada equipo)
const EMERGENCIES = {
  colapso: ['Colapso estructural', ['puntal', 'cojin', 'separador', 'cizalla', 'cilindro', 'combinada', 'motosierra', 'radial', 'motodisco', 'sierra', 'martillo', 'taladro', 'perfora', 'palanca', 'tractel', 'polea', 'cadena', 'camilla', 'foco', 'generador', 'grupo', 'geofono', 'busqueda', 'camara', 'botiquin', 'madera', 'cuna', 'escalera', 'transmisiones', 'tetra', 'detector']],
  busqueda: ['Búsqueda de víctimas', ['geofono', 'busqueda', 'camara', 'transmisiones', 'tetra', 'foco', 'linterna', 'cialumen', 'cinta', 'spray', 'botiquin', 'camilla', 'escalera', 'casco']],
  vertical: ['Rescate vertical o en altura', ['cuerda', 'arnes', 'polea', 'tractel', 'tripode', 'mosqueton', 'descensor', 'carrete', 'linea de vida', 'camilla', 'escalera', 'casco', 'botiquin', 'transmisiones']],
  confinado: ['Espacio confinado', ['detector', 'gases', 'era', 'botella', 'ventilador', 'extractor', 'mangote', 'tripode', 'arnes', 'cuerda', 'camilla', 'linterna', 'foco', 'transmisiones', 'tetra', 'polea']],
  inundacion: ['Inundación', ['bomba', 'electrobomba', 'motobomba', 'manguera', 'mangote', 'chaleco', 'cuerda', 'generador', 'grupo', 'foco', 'alargadera', 'botiquin']],
  vehiculos: ['Accidente con atrapados', ['separador', 'cizalla', 'combinada', 'cilindro', 'cojin', 'bateria', 'bomba', 'palanca', 'motodisco', 'radial', 'botiquin', 'camilla', 'foco', 'generador']],
  patrimonio: ['Salvaguarda de patrimonio (BIC)', ['caja', 'embalaje', 'lona', 'plastico', 'cinta', 'carretilla', 'carro', 'mesa', 'escalera', 'foco', 'linterna', 'camara', 'guantes', 'generador', 'toldo']]
};
const DANGEROUS = ['', 'Baterías de litio', 'Combustible', 'Gases a presión', 'Otro'];
const SOON_DAYS = 30;          // aviso de vencimiento con esta antelación
const RESERVA = 'RESERVA';     // EPI sin asignar
const KINDS = ['operators', 'gear', 'epis', 'consumables', 'logs', 'inspections', 'meta', 'missions', 'vehicles', 'mlog', 'checkins', 'templates', 'worksites', 'victims', 'confined', 'outings', 'availability', 'readiness', 'medical', 'medlog', 'heritage', 'docs', 'options', 'events', 'boxes', 'loans', 'moves', 'vchecks'];
// Quien tiene acceso completo y activa o quita el mantenimiento
const ADMIN = 'RODRI';
const MANT_DEFECTO = true;   // sin nada guardado, la app arranca en mantenimiento
const MANT_PASAN = [];   // quien entra también durante el mantenimiento (ADMIN lo elige en Ajustes)
const MANT_MSG = 'USAR 242 EN FASE DE MANTENIMIENTO';
// Base de datos compartida del equipo (Supabase, modo seguro). Va integrada en la app: nadie tiene que configurarla,
// cada persona solo entra con su correo (dado de alta antes por un jefe en Ajustes → Miembros y permisos).
const SUPA = { url: 'https://lxjkpgdvhzjwkmxnllqp.supabase.co', key: 'sb_publishable_boxlf-dFI3dd-tdSMd3SJg_otPOwFCq' };
const TEAM_CODE = 'USAR-242';   // indicativo del equipo: sale en el marcaje y en los informes
const KEY = { db: 'USAR_V5_DB', prefs: 'USAR_V4_PREFS', sync: 'USAR_V4_SYNC', outbox: 'USAR_V4_OUTBOX', base: 'USAR_V4_BASE' };

// Un puesto por integrante, en el mismo orden que TEAM ("Célula|Puesto")
const PRESETS = {
  bic: ['Salvaguarda de patrimonio (BIC)', [
    'Mando|Jefe de la operación', 'Mando|Enlace con el responsable del bien', 'Seguridad|Evaluación del inmueble y seguridad',
    'Documentación|Numeración y ficha', 'Documentación|Fotografía',
    'Embalaje|Embalaje 1', 'Embalaje|Embalaje 2',
    'Traslado|Porteador 1', 'Traslado|Porteador 2', 'Traslado|Porteador 3',
    'Depósito|Recepción y control en el depósito', 'Protección in situ|Cubrición y apuntalamiento', 'Logística|Material de embalaje y vehículo']],
  ume: ['Equipo USAR UME', [
    'Mando y control|Jefe de equipo USAR', 'Mando y control|Oficial de seguridad', 'Mando y control|Evaluación de estructuras',
    'Búsqueda|Búsqueda técnica (cámara y geófono)', 'Búsqueda|Guía canino',
    'Pelotón 1|Jefe de pelotón', 'Pelotón 1|Rescatador · corte y perforación', 'Pelotón 1|Rescatador · apuntalamiento',
    'Pelotón 2|Jefe de pelotón', 'Pelotón 2|Rescatador · cargas (Holmatro)', 'Pelotón 2|Rescatador · cuerdas',
    'Sanidad|Sanitario', 'Logística|Logística y hombre-puerta']],
  estandar: ['Estándar', [
    'Mando|Jefe de Equipo USAR', 'Mando|Subjefe · Seguridad y Transmisiones',
    'Búsqueda Técnica|Especialista Acústico (Delsar)', 'Búsqueda Técnica|Cámara Pértiga / Gases',
    'Corte y Penetración|Motodisco / Hormigón', 'Corte y Penetración|Martillo / Perforación', 'Corte y Penetración|Hidráulico (Holmatro)',
    'Apuntalamiento|Jefe Célula Apuntalamiento', 'Apuntalamiento|Puntales Paratech / Carpintería',
    'Rescate Vertical|Cuerdas / Trípode', 'Rescate Vertical|Camilla / Evacuación',
    'Sanitario|Sanitario Táctico USAR', 'Logística y Energía|Contenedor y Grupos']],
  colapso: ['Colapso estructural', [
    'Mando y Seguridad|Jefe de Intervención', 'Mando y Seguridad|Oficial de Seguridad / Gases',
    'Breaching 1|Motodisco / Motosierra Hormigón', 'Breaching 1|Martillo TE-3000',
    'Breaching 2|Corte Acero / Hormigón', 'Breaching 2|Cojines Neumáticos Vetter',
    'Apuntalamiento|Jefe Shoring / Medición', 'Apuntalamiento|Estación de Corte Madera', 'Apuntalamiento|Montaje Puntales Paratech',
    'Extracción|Especialista Extracción', 'Extracción|Camilla y Evacuación',
    'Sanitario|Sanitario Interior', 'Logística|Consumibles y Energía']],
  busqueda: ['Búsqueda técnica', [
    'Puesto de Mando|Coordinador de Sectores', 'Puesto de Mando|Marcaje INSARAG',
    'Binomio Acústico|Geófonos Delsar', 'Binomio Acústico|Colocación de Sensores',
    'Binomio Visual|SearchCam Pértiga', 'Binomio Visual|Cámara Térmica / Atmósferas',
    'Apertura Rápida|Perforación para Cámara', 'Seguridad|Control Estructural', 'Seguridad|Apuntalamiento de Emergencia',
    'Acceso Vertical|Aseguramiento en Altura 1', 'Acceso Vertical|Aseguramiento en Altura 2',
    'Sanitario|Soporte Vital Avanzado', 'Logística|Baterías y Transmisiones']],
  vertical: ['Rescate vertical / confinados', [
    'Mando Vertical|Jefe de Rescate en Altura', 'Mando Vertical|Seguridad de Anclajes',
    'Cabecera|Descensor Principal (ID)', 'Cabecera|Cuerda de Seguridad (ASAP)', 'Cabecera|Tracción y Polipastos',
    'Equipo de Punta|Rescatador en Suspensión 1', 'Equipo de Punta|Rescatador en Suspensión 2',
    'Atmósfera|Multigás y Ventilación', 'Apoyo|Bordes e Iluminación',
    'Camilla|Camilla Kong / STEF', 'Camilla|Guiado de Camilla (Vientos)',
    'Sanitario|Sanitario en Camilla', 'Logística|Material Textil y Relevo']]
};
