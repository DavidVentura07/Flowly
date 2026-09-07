// ══════════════════════════════════
// FLOWLY — DATA
// ══════════════════════════════════

// Emoji automático por zona del cuerpo
const ZONE_EMOJI = {
  'Cadera':          '🦵',
  'Isquiotibiales':  '🦵',
  'Cuádriceps':      '🦵',
  'Glúteos':         '🍑',
  'Columna':         '🧘',
  'Espalda':         '🧘',
  'Hombros':         '🙆',
  'Cuello':          '😌',
  'Costados':        '🤸',
  'Aductores':       '🤼',
  'Pantorrillas':    '🦵',
  'Muñecas':         '🤲',
  'Pies':            '🦶',
  'General':         '🌿',
};

const ZONES = Object.keys(ZONE_EMOJI);

// Acentos de telemetría. Todos elegidos para cortar sobre el fondo casi
// negro sin deslumbrar en un cuarto oscuro; el texto sobre ellos siempre
// es --on-accent, nunca blanco.
const ACCENT_COLORS = [
  { name: 'Lima',     value: '#b1f734' },
  { name: 'Ámbar',    value: '#ffbd58' },
  { name: 'Cian',     value: '#4ee1ff' },
  { name: 'Verde',    value: '#46e88a' },
  { name: 'Naranja',  value: '#ff8a3d' },
  { name: 'Magenta',  value: '#ff5cc8' },
  { name: 'Violeta',  value: '#b18cff' },
  { name: 'Hueso',    value: '#e1e2e5' },
];

// Ilustraciones: un PNG por ejercicio en assets/, recortado de la lámina
// original para que contenga únicamente la figura.
const EX_IMG_BASE = 'assets/';
function exImageSrc(fig) { return `${EX_IMG_BASE}ej_${fig}.png`; }

// ══════════════════════════════════
// RUTINA DE MOVILIDAD — MIEMBROS PÉLVICOS
// 22 ejercicios · 1 vez al día · 1 serie · 3 repeticiones · 10 s cada una
//
// variants      : cada sostenimiento distinto dentro del ejercicio.
//                 null = una sola posición.
// variantOrder  : 'block' → 3 reps de un lado y luego el otro (menos cambios de postura)
//                 'cycle' → una pasada por todas las variantes, repetida 3 veces
// pos           : bloque de posición corporal, para agrupar y ahorrar transiciones
// fig           : nombre del PNG en assets/
// ══════════════════════════════════
const LR = ['Izquierdo', 'Derecho'];

const DE_PIE      = 'De pie';
const DE_RODILLAS = 'De rodillas en piso';
const SENTADO     = 'Sentado';
const BOCA_ARRIBA = 'Boca arriba';

const MOBILITY_EXERCISES = [
  { id:'mov_1_1', fig:'1_1', pos:DE_RODILLAS, zone:'Cadera',
    name:'Desplante con rodilla apoyada',
    notes:'Pierna de adelante flexionada a 90º, la de atrás queda apoyada sobre la rodilla, haciendo estiramiento del muslo de atrás.',
    variants:LR },
  { id:'mov_1_2', fig:'1_2', pos:DE_PIE, zone:'Cuádriceps',
    name:'Desplante con apoyo a la altura de la cadera',
    notes:'De pie, apoyado en una superficie que esté a la altura de la cadera, apoyar el pie y realizar movimiento hacia adelante como si fuera un desplante.',
    variants:LR },
  { id:'mov_1_3', fig:'1_3', pos:DE_PIE, zone:'Cuádriceps',
    name:'Talón al glúteo, de pie',
    notes:'De pie, talón al glúteo, rodilla apuntando hacia el suelo. Estirar bien el muslo.',
    variants:LR },
  { id:'mov_1_4', fig:'1_4', pos:DE_PIE, zone:'Isquiotibiales',
    name:'Talón en la silla, pecho a la rodilla',
    notes:'De pie, talón de un pie apoyado en una silla, con ambas rodillas bien estiradas, llevar el pecho hacia la rodilla que está elevada, sin que se doblen las rodillas. Llevarlo hasta una sensación tolerable.',
    variants:LR },

  { id:'mov_2_1', fig:'2_1', pos:DE_PIE, zone:'Isquiotibiales',
    name:'Piernas abiertas, bajar espalda recta',
    notes:'Piernas abiertas, rodillas estiradas, bajar espalda recta tratando de tocar las rodillas con el pecho. Sin flexionar las rodillas.',
    variants:['Rodilla derecha', 'Rodilla izquierda', 'Centro'], variantOrder:'cycle' },
  { id:'mov_2_2', fig:'2_2', pos:DE_PIE, zone:'Aductores',
    name:'Desplazamiento lateral con base abierta',
    notes:'De pie, abrir la base, flexionar una rodilla y desplazar el cuerpo hacia el lado de la rodilla flexionada. La rodilla no debe rebasar la punta del pie.',
    variants:LR },
  { id:'mov_2_3', fig:'2_3', pos:SENTADO, zone:'Glúteos',
    name:'Sentado, cruzar la pierna y empujar con el codo',
    notes:'Sentado, cruzar la pierna, empujar con el codo hacia fuera la rodilla. Sentir estiramiento en muslo.',
    variants:LR },
  { id:'mov_2_4', fig:'2_4', pos:SENTADO, zone:'Isquiotibiales',
    name:'Sentado, piernas abiertas: rodilla · centro · rodilla',
    notes:'Sentado, piernas abiertas, rodillas bien estiradas. Llevar el pecho hacia la rodilla izquierda (A), al centro (B) y a la rodilla derecha (C).',
    variants:['A · rodilla izquierda', 'B · centro', 'C · rodilla derecha'], variantOrder:'cycle' },

  { id:'mov_3_1', fig:'3_1', pos:DE_RODILLAS, zone:'Cadera',
    name:'Rodilla al frente, pierna de atrás estirada',
    notes:'Flexionar una rodilla por delante, la pierna de atrás queda estirada, llevar el pecho hacia el suelo, a tolerancia.',
    variants:LR },
  { id:'mov_3_2', fig:'3_2', pos:SENTADO, zone:'Glúteos',
    name:'En silla, pierna cruzada, pecho al tobillo',
    notes:'En una silla, sentado, flexionar pierna sobre la otra. Bajar pecho hacia el tobillo. A tolerancia.',
    variants:LR },
  { id:'mov_3_3', fig:'3_3', pos:DE_RODILLAS, zone:'Cadera',
    name:'Desplante de frente apoyado',
    notes:'Pierna de adelante flexionada a 90º, la de atrás queda apoyada sobre la rodilla, haciendo estiramiento del muslo de atrás. ⚠️ La indicación es idéntica a la del primer ejercicio: pendiente confirmar si la repetición es intencional.',
    variants:LR },
  { id:'mov_3_4', fig:'3_4', pos:BOCA_ARRIBA, zone:'Glúteos',
    name:'Boca arriba, cruzar la pierna completa',
    notes:'Acostado boca arriba, cruzar pierna completa, hasta sentir el estiramiento en glúteo. Mantener a tolerancia.',
    variants:LR },

  { id:'mov_4_1', fig:'4_1', pos:DE_PIE, zone:'Isquiotibiales',
    name:'Base abierta, manos al piso',
    notes:'Base abierta lo más posible, llevar manos al piso, manteniendo las rodillas estiradas.',
    variants:null },
  { id:'mov_4_2', fig:'4_2', pos:DE_PIE, zone:'Aductores',
    name:'Sentadilla con base abierta',
    notes:'Bajar en sentadilla con base abierta y con los codos empujar hacia afuera las rodillas.',
    variants:null },
  { id:'mov_4_3', fig:'4_3', pos:BOCA_ARRIBA, zone:'Glúteos',
    name:'Boca arriba, figura 4 al pecho',
    notes:'Acostado boca arriba, cruzar una pierna por encima de la otra, flexionar rodillas, entrelazar las manos por debajo del muslo y llevar rodilla hacia el pecho.',
    variants:LR },
  { id:'mov_4_4', fig:'4_4', pos:SENTADO, zone:'Aductores',
    name:'Mariposa',
    notes:'Sentado, flexionar ambas rodillas y juntar plantas de los pies. Con los codos ayudar a bajar las rodillas.',
    variants:null },

  { id:'mov_5_1', fig:'5_1', pos:SENTADO, zone:'Isquiotibiales',
    name:'Sentado, tocar la punta del pie',
    notes:'Sentado, una rodilla flexionada, la otra pierna estirada, y tocar la punta del pie.',
    variants:LR },
  { id:'mov_5_2', fig:'5_2', pos:SENTADO, zone:'Cadera',
    name:'Sentado, rotación de cadera',
    notes:'Sentado, una rodilla flexionada y el pie hacia atrás; la otra rodilla se flexiona y la planta del pie toca la rodilla de atrás. Girar la cadera hacia el lado de la rodilla de adelante.',
    variants:LR },
  { id:'mov_5_3', fig:'5_3', pos:DE_PIE, zone:'Pantorrillas',
    name:'Pantorrilla en escalón',
    notes:'Parado en un escalón sobre la punta de los pies, permitir que baje el cuerpo hasta sentir el estiramiento de las pantorrillas. Se puede hacer con los dos pies o con uno a la vez. Otra opción: pie apoyado en la pared, rodilla estirada y pegar la pelvis a la pared.',
    variants:null },
  { id:'mov_5_4', fig:'5_4', pos:DE_PIE, zone:'Pantorrillas',
    name:'Pantorrilla contra la pared',
    notes:'Parado, recargado en una pared, una pierna que va atrás estirada y la de adelante flexiona la rodilla, llevando la cadera hacia adelante. Cuidar que el talón de la pierna de atrás no se despegue del piso.',
    variants:LR },

  { id:'mov_6_1', fig:'6_1', pos:BOCA_ARRIBA, zone:'Isquiotibiales',
    name:'Liga en el pie, pierna estirada',
    notes:'Colocar una liga o toalla en la planta del pie, a la altura de la base de los dedos. Rodilla bien estirada y acostarse lentamente hasta quedar en la posición de la imagen o en una tolerable.',
    variants:LR },
  { id:'mov_6_2', fig:'6_2', pos:SENTADO, zone:'Pantorrillas',
    name:'Liga en los dedos, sentado contra la pared',
    notes:'Sentado, una rodilla flexionada y la otra pierna estirada; colocar una liga o toalla en la base de los dedos de los pies y llevar la resistencia hacia el cuerpo, para estirar pantorrilla.',
    variants:LR },
].map(e => ({
  type:'time', duration:10, sets:3, reps:null, img:null,
  variantOrder:'block',
  ...e,
}));

// Orden de la rutina: agrupado por posición corporal para no levantarse
// y volver al piso 20 veces. Ahorra ~10 min frente al orden original.
const MOBILITY_ROUTINE_ORDER = [
  // Bloque 1 — De pie (9)
  'mov_2_2','mov_1_2','mov_1_3','mov_1_4','mov_2_1',
  'mov_4_1','mov_4_2','mov_5_4','mov_5_3',
  // Bloque 2 — De rodillas en piso (3)
  'mov_1_1','mov_3_3','mov_3_1',
  // Bloque 3 — Sentado (7)
  'mov_3_2','mov_2_3','mov_5_2','mov_5_1','mov_2_4','mov_4_4','mov_6_2',
  // Bloque 4 — Boca arriba (3)
  'mov_6_1','mov_3_4','mov_4_3',
];

const MOBILITY_ROUTINE = {
  id:   'rutina_movilidad_pelvica',
  name: 'Movilidad pélvica — completa',
  desc: '22 ejercicios agrupados por posición',
  items: MOBILITY_ROUTINE_ORDER.map(exId => ({ exId, sets:null, reps:null, duration:null })),
};
