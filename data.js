// ══════════════════════════════════
// FLOWLY — DATA
// ══════════════════════════════════

// Emoji por zona del cuerpo (respaldo cuando un ejercicio no tiene figura)
const ZONE_EMOJI = {
  'Cadera':          '🦵',
  'Isquiotibiales':  '🦵',
  'Cuádriceps':      '🦵',
  'Glúteos':         '🍑',
  'Aductores':       '🤼',
  'Pantorrillas':    '🦵',
  'Tobillos':        '🦶',
  'Abdomen':         '🧘',
  'Espalda':         '🧘',
  'Hombros':         '🙆',
  'Brazos':          '💪',
  'Cuello':          '😌',
  'Pies':            '🦶',
  'General':         '🌿',
};

const ZONES = Object.keys(ZONE_EMOJI);

// Tonos botánicos para el acento. Todos oscuros a propósito: el texto
// sobre ellos es papel (#FAFAF8) y tiene que leerse desde el piso.
const ACCENT_COLORS = [
  { name: 'Bosque',    value: '#2E7D32' },
  { name: 'Romero',    value: '#3F6B4A' },
  { name: 'Eucalipto', value: '#2F5D5A' },
  { name: 'Salvia',    value: '#55705A' },
  { name: 'Musgo',     value: '#56702C' },
  { name: 'Pizarra',   value: '#1B382B' },
  { name: 'Terracota', value: '#9A4E2E' },
  { name: 'Arcilla',   value: '#7A6048' },
];

// Ilustraciones: una figura por ejercicio en assets/, extraída de las
// láminas sin fondo ni texto (herramienta en ampliacion/herramientas/figuras).
const EX_IMG_BASE = 'assets/';
function exImageSrc(fig) { return `${EX_IMG_BASE}ej_${fig}.webp`; }

// Posiciones corporales: agrupan la sesión y marcan los cambios de bloque
const DE_PIE      = 'De pie';
const DE_RODILLAS = 'De rodillas en piso';
const SENTADO     = 'Sentado';
const BOCA_ARRIBA = 'Boca arriba';
const BOCA_ABAJO  = 'Boca abajo';
const DE_LADO     = 'De lado';
const CUADRUPEDIA = 'Manos y rodillas';
const COLGADO     = 'Colgado';
const POSITIONS = [DE_PIE, DE_RODILLAS, SENTADO, BOCA_ARRIBA, BOCA_ABAJO, DE_LADO, CUADRUPEDIA, COLGADO];

const LR = ['Izquierdo', 'Derecho'];

// ══════════════════════════════════
// MODELO DE EJERCICIO
//
// type          : 'time' → sostenimientos de `duration` s
//                 'reps' → repeticiones con cadencia
// sets / reps   : series, y repeticiones (o sostenimientos) por serie
// tempo         : s por repetición (si falta, el ajuste general de cadencia)
// hold          : s de sostén dentro de cada repetición
// alt           : alterna lados dentro de la serie; `reps` cuenta el total
// variants      : cada lado o variante que se hace por separado (null = una)
// variantOrder  : 'block'  → todas las series de una variante y luego la otra
//                 'cycle'  → alterna variantes en cada serie (el otro lado
//                            descansa mientras trabaja uno)
//                 'series' → una variante por serie (A, B, C…)
// pos           : posición corporal
// setup         : qué preparar (anclaje, liga, silla…); se anuncia al cambiar
// band          : usa liga; la resistencia sale de la tabla de progresión
// fig           : nombre de la figura en assets/
// rhythm        : movimiento continuo guiado por metrónomo (solo 'time'):
//                 { cycle: s de ida + vuelta, ida, vuelta }. Tono agudo al
//                 empezar la ida y grave al empezar la vuelta.
// rest          : s de descanso propio entre repeticiones, series y lados
//                 (si falta, el de la rutina)
// ══════════════════════════════════

// ── ESTIRAMIENTOS · 22 ejercicios · 1 serie · 3 × 10 s ──
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
  type:'time', duration:10, sets:1, reps:3, img:null,
  variantOrder:'block',
  ...e,
}));

// ── FORTALECIMIENTO CON LIGAS · 31 ejercicios · base 2 × 8 ──
// La cantidad de cada lámina manda sobre el texto cuando no coinciden
// (ver ampliacion/contexto_fortalecimiento.md).
const STRENGTH_EXERCISES = [
  // Hombro — lunes y jueves
  { id:'fza_h1_1', fig:'f_h1_1', pos:DE_PIE, zone:'Hombros', band:true,
    name:'Rotación interna con liga',
    setup:'Liga anclada a la altura del codo, a un costado',
    notes:'Con la liga sostenida de algún soporte. Tomarla por un extremo y con el codo flexionado, sin despegar el codo del tórax, girar hacia adentro. Inicia con liga de menor resistencia.',
    variants:LR },
  { id:'fza_h1_2', fig:'f_h1_2', pos:DE_PIE, zone:'Hombros', band:true,
    name:'Rotación externa con liga',
    setup:'Liga anclada a la altura del codo, a un costado',
    notes:'Con la liga sostenida de algún soporte. Tomarla por un extremo y con el codo flexionado, sin despegar el codo del tórax, girar hacia afuera a tolerancia. Inicia con liga de menor resistencia.',
    variants:LR },
  { id:'fza_h1_3', fig:'f_h1_3', pos:DE_PIE, zone:'Hombros', band:true,
    name:'Empuje del brazo hacia adelante',
    setup:'Liga anclada a la altura del codo, detrás de ti',
    notes:'Con la liga sostenida de algún soporte. Tomarla por un extremo y con el codo flexionado, realizar extensión del brazo hacia adelante (evitar subirlo). Inicia con liga de menor resistencia.',
    variants:LR },
  { id:'fza_h1_4', fig:'f_h1_4', pos:DE_PIE, zone:'Brazos', band:true,
    name:'Flexión de codo pisando la liga',
    setup:'Liga pisada con un pie',
    notes:'Con la liga pisándola de un extremo, tomar el otro extremo y tensarla teniendo los codos estirados. Realizar flexión de brazo hasta llevar la palma de la mano al hombro y bajar el brazo hasta la posición original. Inicia con liga de menor resistencia.',
    variants:LR },
  { id:'fza_h2_1', fig:'f_h2_1', pos:DE_PIE, zone:'Hombros', band:true,
    name:'Elevación frontal pisando la liga',
    setup:'Liga pisada con un pie',
    notes:'Pisar un extremo de la liga, tomar con la mano el otro extremo. Parado con espalda recta, llevar el brazo hacia el frente tensando la liga.',
    variants:LR },
  { id:'fza_h2_2', fig:'f_h2_2', pos:DE_PIE, zone:'Hombros', band:true,
    name:'Elevación en diagonal pisando la liga',
    setup:'Liga pisada con el pie contrario a la mano',
    notes:'Pisar la liga con un pie y con la mano contraria tomar la liga, extender y elevar el brazo que sostiene la liga, y tensar la liga, formando una diagonal.',
    variants:LR },
  { id:'fza_h2_3', fig:'f_h2_3', pos:DE_PIE, zone:'Hombros', band:true,
    name:'Apertura de brazos con liga',
    setup:'Liga plana en las manos, brazos al frente',
    notes:'Con una liga plana, colocar los brazos al frente a la altura de los hombros. Abrir los brazos contra la resistencia de la liga.',
    variants:null },
  { id:'fza_h2_4', fig:'f_h2_4', pos:DE_PIE, zone:'Brazos', band:true,
    name:'Extensión de brazos con liga anclada',
    setup:'Liga anclada detrás de ti, a la altura del hombro',
    notes:'Con liga agarrada de algún soporte, realizar extensión de los brazos. Posición inicial: codos flexionados agarrando la liga. Posición final: extender el codo hasta que el brazo quede totalmente estirado, venciendo la resistencia de la liga. Mantener a la altura de los hombros, no por arriba de ellos.',
    variants:null },

  // Pantorrilla y tobillo — miércoles
  { id:'fza_tb_1', fig:'f_tb_1', pos:SENTADO, zone:'Tobillos', band:true,
    name:'Tobillo: empujar la punta contra la liga',
    setup:'Liga en la base de los dedos, extremos en las manos',
    notes:'Poner la liga en la base de los dedos y «pisar» contra la resistencia de la liga, moviendo la punta del pie hacia adelante.',
    variants:LR },
  { id:'fza_tb_2', fig:'f_tb_2', pos:SENTADO, zone:'Tobillos', band:true,
    name:'Tobillo: punta hacia arriba',
    setup:'Liga en el dorso del pie, anclada al frente',
    notes:'Poner liga en el dorso del pie, donde empieza la base de los dedos. Realizar movimiento de punta hacia arriba. Cuidar de no flexionar la rodilla.',
    variants:LR },
  { id:'fza_tb_3', fig:'f_tb_3', pos:SENTADO, zone:'Tobillos', band:true,
    name:'Tobillo: punta hacia adentro',
    setup:'Liga en el dorso del pie, anclada hacia afuera',
    notes:'Poner liga en el dorso del pie, donde empieza la base de los dedos. Realizar movimiento de punta hacia adentro (hacia donde está el dedo gordo del pie). Cuidar que no se mueva todo el muslo y pierna. Solo debe moverse el tobillo.',
    variants:LR },
  { id:'fza_tb_4', fig:'f_tb_4', pos:SENTADO, zone:'Tobillos', band:true,
    name:'Tobillo: punta hacia afuera',
    setup:'Liga en el dorso del pie, anclada hacia adentro',
    notes:'Poner liga en el dorso del pie, donde empieza la base de los dedos. Realizar movimiento de punta hacia afuera (hacia donde está el dedo pequeño del pie). Cuidar que no se mueva todo el muslo y pierna. Solo debe moverse el tobillo.',
    variants:LR },

  // Tronco y abdomen — miércoles
  { id:'fza_tr1_1', fig:'f_tr1_1', pos:CUADRUPEDIA, zone:'Abdomen', alt:true,
    name:'Brazo y pierna contraria en cuadrupedia',
    notes:'Apoyado sobre manos y rodillas. Manos a la altura de los hombros, rodillas a la altura de la cadera (pelvis). Extender brazo izquierdo y pierna derecha. Bajar y alternar. Cuidar que hombros y pelvis queden paralelos al piso (no basculados).',
    variants:null },
  { id:'fza_tr1_2', fig:'f_tr1_2', pos:CUADRUPEDIA, zone:'Glúteos', alt:true, hold:3,
    name:'Extensión de pierna en cuadrupedia',
    notes:'Apoyado sobre manos y rodillas. Manos a la altura de los hombros, rodillas a la altura de la cadera (pelvis). Extender pierna recta manteniendo manos apoyadas, sostener 3 segundos en la posición y bajar lentamente. Alternar lados.',
    variants:null },
  { id:'fza_tr1_3', fig:'f_tr1_3', pos:BOCA_ARRIBA, zone:'Glúteos', hold:3,
    name:'Puente de glúteo',
    notes:'Acostado boca arriba. Plantas de los pies apoyadas con flexión de rodillas a 45º. Elevar la pelvis. Apretar abdomen y glúteos al estar arriba. Sostener 3 segundos y bajar lentamente. Relajar al bajar.',
    variants:null },
  { id:'fza_tr1_4', fig:'f_tr1_4', pos:BOCA_ARRIBA, zone:'Glúteos', hold:3,
    name:'Puente con una pierna extendida',
    notes:'Acostado boca arriba. Plantas de los pies apoyadas con flexión de rodillas a 45º. Elevar la pelvis y una pierna extendida. Apretar abdomen y glúteos al estar arriba y relajar al bajar. Sostener 3 segundos y bajar lentamente.',
    variants:LR },
  { id:'fza_tr2_1', fig:'f_tr2_1', pos:BOCA_ABAJO, zone:'Abdomen', type:'time', sets:2, reps:5, duration:10,
    name:'Plancha alta',
    notes:'Colocarse boca abajo. Manos a la altura de los hombros. Extender brazos y colocarse en plancha alta. Sostener 10 segundos en la posición contando 1001, 1002, 1003… hasta 1010.',
    variants:null },
  { id:'fza_tr2_2', fig:'f_tr2_2', pos:BOCA_ABAJO, zone:'Abdomen', alt:true, tempo:1.5,
    name:'Escaladores',
    notes:'Colocarse boca abajo. Manos a la altura de los hombros. Extender brazos y colocarse en plancha alta. Realizar flexión de rodilla a la altura de la pelvis, regresar a extensión y alternar.',
    variants:null },
  { id:'fza_tr2_3', fig:'f_tr2_3', pos:BOCA_ABAJO, zone:'Glúteos', alt:true, tempo:2,
    name:'Nadadores',
    notes:'Acostado boca abajo, realizar extensión de cadera, alternando piernas.',
    variants:null },
  { id:'fza_tr2_4', fig:'f_tr2_4', pos:DE_LADO, zone:'Abdomen', type:'time', sets:2, reps:5, duration:5,
    name:'Plancha lateral',
    notes:'Acostado de lado, sobre codo-antebrazo y parte lateral de la pierna y pie. Realizar elevación de cadera. Sostener 5 segundos en esa posición y cambiar de lado. Alternar cada lado.',
    variants:LR, variantOrder:'cycle' },

  // Miembros pélvicos — martes y viernes
  { id:'fza_mp1_1', fig:'f_mp1_1', pos:DE_PIE, zone:'Cadera', band:true,
    name:'Desplazamientos con liga en la cintura',
    setup:'Liga en la cintura, anclada a un punto fijo',
    notes:'Con la liga a la altura de la cintura. Realizar desplazamiento lateral quedando sobre un pie en la punta, evitar inclinarse demasiado. Tratar de mantener tensa la liga. Igual hacer desplazamiento hacia adelante y hacia atrás.',
    variants:['Lateral', 'Hacia adelante', 'Hacia atrás'], variantOrder:'block' },
  { id:'fza_mp1_2', fig:'f_mp1_2', pos:DE_PIE, zone:'Cadera', band:true,
    name:'Flexión de cadera con liga en el tobillo',
    setup:'Liga en el tobillo, anclada detrás a ras de piso · manos en un banco',
    notes:'Con la liga amarrada a la altura del tobillo y el otro extremo en algún punto fijo. Realizar flexión de cadera contra la resistencia. Regresar lentamente.',
    variants:LR },
  { id:'fza_mp1_3', fig:'f_mp1_3', pos:DE_PIE, zone:'Glúteos', band:true,
    name:'Extensión de cadera con liga en el tobillo',
    setup:'Liga en tobillo y planta, anclada al frente a ras de piso · manos en un banco',
    notes:'Con la liga amarrada a la altura del tobillo y planta del pie y el otro extremo en algún punto fijo. Realizar extensión de cadera contra la resistencia. Regresar lentamente.',
    variants:LR },
  { id:'fza_mp1_4', fig:'f_mp1_4', pos:DE_PIE, zone:'Cuádriceps', band:true,
    name:'Sentadilla con liga anclada',
    setup:'Liga anclada al frente, tomada con las manos',
    notes:'Con la liga amarrada en un punto fijo, realizar sentadilla. Al bajar, deberás quedar a 90º (como si estuvieras sentado en una silla). O incluso puedes poner una silla o banco para sentarte y levantarte.',
    variants:null },
  { id:'fza_mp2_1', fig:'f_mp2_1', pos:DE_PIE, zone:'Cadera', band:true,
    name:'Caminata en semisentadilla con liga en los muslos',
    setup:'Liga circular en los muslos',
    notes:'Con la liga a la altura de los muslos, flexionar ligeramente las rodillas, bajar la cadera. Realizar desplazamiento hacia atrás. Igual hacerlo en desplazamiento lateral y hacia adelante.',
    variants:['Hacia atrás', 'Lateral', 'Hacia adelante'], variantOrder:'block' },
  { id:'fza_mp2_2', fig:'f_mp2_2', pos:DE_PIE, zone:'Cadera', band:true,
    name:'Elevar la rodilla con liga circular',
    setup:'Liga circular a la altura de las agujetas',
    notes:'Con una liga circular, a la altura de las agujetas, elevar la cadera y flexionar la rodilla a 90º (como se muestra en la imagen).',
    variants:LR },
  { id:'fza_mp2_3', fig:'f_mp2_3', pos:BOCA_ABAJO, zone:'Isquiotibiales', band:true,
    name:'Flexión de rodilla boca abajo',
    setup:'Liga del tobillo al otro tobillo o a un punto fijo',
    notes:'Acostado boca abajo, con la liga amarrada al tobillo y el otro extremo al otro tobillo o a alguna estructura. Realizar flexión de rodilla (talón al glúteo).',
    variants:LR },
  { id:'fza_mp2_4', fig:'f_mp2_4', pos:BOCA_ARRIBA, zone:'Cuádriceps', band:true,
    name:'Empuje de pierna con liga, boca arriba',
    setup:'Liga en la planta del pie, extremos en las manos',
    notes:'Acostado boca arriba, colocar la liga en la planta del pie con la rodilla flexionada, mantener la tensión y estirar contra la resistencia. Alternar: primero una pierna y después la otra. (La lámina indica 2–3 series de 8–12.)',
    variants:LR, variantOrder:'block' },
  { id:'fza_mp3_1', fig:'f_mp3_1', pos:SENTADO, zone:'Cuádriceps', band:true,
    name:'Extensión de rodilla sentado con liga',
    setup:'En silla: liga pisada con un pie y en el tobillo del otro',
    notes:'Sentado en una silla, con la liga pisando con un pie y con la resistencia en la otra pierna. Realizar extensión de la pierna contra la liga. Cuidar que la liga no se recorra hacia arriba.',
    variants:LR },
  { id:'fza_mp3_2', fig:'f_mp3_2', pos:DE_LADO, zone:'Glúteos', band:true,
    name:'Apertura de rodillas acostado de lado',
    setup:'Liga circular arriba de las rodillas',
    notes:'Acostado de lado, con la liga circular alrededor del muslo por arriba de la rodilla, abrir y cerrar contra la resistencia.',
    variants:LR },
  { id:'fza_mp3_3', fig:'f_mp3_3', pos:SENTADO, zone:'Aductores', band:true,
    name:'Aducción de cadera con liga',
    setup:'Liga anclada a un punto fijo, a la altura del muslo',
    notes:'Con la liga amarrada a un soporte o alguien la sostiene del otro lado, poner la liga a la altura del muslo arriba de la rodilla. Realizar aducción de cadera (cerrar las piernas).',
    variants:LR },
].map(e => ({
  type:'reps', sets:2, reps:8, img:null,
  variantOrder:'cycle',
  ...e,
}));

// ── BLOQUES DE 10 MINUTOS · 3 × 10 ──
// Las casillas que repiten una lámina de fortalecimiento reutilizan ese
// ejercicio desde la rutina (hoja 3 L-M-V y hoja 1 Ma-J-S).
const BLOCK_EXERCISES = [
  // Hoja 1 · L-M-V
  { id:'blq_a1_1', fig:'b_a1_1', pos:DE_PIE, zone:'General', alt:true, tempo:1,
    name:'Marcha en su lugar',
    notes:'Hacer movimiento de marcha en su lugar: subiendo rodillas, como si estuviera marchando.' },
  { id:'blq_a1_2', fig:'b_a1_2', pos:DE_PIE, zone:'Hombros', alt:true, tempo:1.5,
    name:'Brazos de adelante hacia atrás',
    notes:'Mover brazos de adelante hacia atrás, alternados.' },
  { id:'blq_a1_3', fig:'b_a1_3', pos:DE_PIE, zone:'General', alt:true, tempo:2,
    name:'Brazo y rodilla contraria arriba',
    notes:'Subir brazo derecho y pierna izquierda con la rodilla flexionada. Subir brazo izquierdo y pierna derecha con la rodilla flexionada.' },
  { id:'blq_a1_4', fig:'b_a1_4', pos:DE_PIE, zone:'Hombros', tempo:2,
    name:'Abrir y cerrar brazos',
    notes:'Abrir y cerrar brazos.' },

  // Hoja 2 · L-M-V
  { id:'blq_a2_1', fig:'b_a2_1', pos:DE_PIE, zone:'Cadera', tempo:1.5,
    name:'Desplazamientos laterales',
    notes:'Ligera flexión de rodillas, hacer desplazamientos laterales. 5 a la derecha y 5 a la izquierda.' },
  { id:'blq_a2_2', fig:'b_a2_2', pos:DE_PIE, zone:'Isquiotibiales', tempo:2.5,
    name:'Flexión de rodilla a 90° con apoyo',
    setup:'Apoyo en el respaldo de una silla o mesa',
    notes:'Parado recargado en respaldo de silla o mesa, realizar flexión de rodilla hasta 90º (como se muestra en la imagen).',
    variants:LR },
  { id:'blq_a2_3', fig:'b_a2_3', pos:DE_PIE, zone:'Glúteos', tempo:2.5,
    name:'Pierna estirada hacia atrás con apoyo',
    setup:'Apoyo en el respaldo de una silla o mesa',
    notes:'Parado recargado en respaldo de silla o mesa, llevar la pierna estirada hacia atrás (como se muestra en la imagen).',
    variants:LR },
  { id:'blq_a2_4', fig:'b_a2_4', pos:SENTADO, zone:'Aductores', tempo:3,
    name:'Apretar pelota con las rodillas, sentado',
    setup:'Sentado, pelota entre las rodillas',
    notes:'Sentado con la rodilla flexionada a 90º, apretar pelota con las rodillas.' },

  // Hoja 3 · L-M-V (las otras tres casillas son de fortalecimiento)
  { id:'blq_a3_3', fig:'b_a3_3', pos:DE_PIE, zone:'General', alt:true, tempo:2.5,
    name:'Zancada lateral con brazos arriba',
    notes:'Parado, abrir zancada al lado y llevar brazos hacia arriba elevándolos por los costados.' },

  // Hoja 4 · L-M-V
  { id:'blq_a4_1', fig:'b_a4_1', pos:BOCA_ARRIBA, zone:'Cadera', tempo:4,
    name:'Pierna estirada arriba y en T',
    notes:'Acostado boca arriba, elevar la pierna estirada. Elevación y mover en forma de T, hacia los lados.',
    variants:LR },
  { id:'blq_a4_2', fig:'b_a4_2', pos:SENTADO, zone:'Cuádriceps', tempo:3,
    name:'Presionar la toalla bajo la rodilla',
    setup:'Toalla enrollada bajo la rodilla',
    notes:'Sentado, poner una toalla enrollada debajo de la rodilla y presionar hacia abajo.',
    variants:LR },
  { id:'blq_a4_3', fig:'b_a4_3', pos:BOCA_ARRIBA, zone:'Aductores', tempo:3,
    name:'Apretar pelota entre las rodillas, boca arriba',
    setup:'Pelota entre las rodillas',
    notes:'Boca arriba, apretar una pelota entre las rodillas. La pelota puede ser una de papelería, no necesita ser pesada.' },
  { id:'blq_a4_4', fig:'b_a4_4', pos:BOCA_ARRIBA, zone:'Glúteos', tempo:2, hold:3,
    name:'Puente con apoyo de manos y hombros',
    notes:'Apoyados planta de los pies, palmas de las manos y hombros. Elevar la pelvis apretando abdomen y glúteos cuando están arriba. Evitar pujar al apretar el abdomen. Sostener 3 segundos y bajar.' },

  // Hoja 1 · Ma-J-S (las casillas 3 y 4 son de fortalecimiento)
  { id:'blq_b1_1', fig:'b_b1_1', pos:DE_PIE, zone:'Hombros', tempo:2,
    name:'Abrir y cerrar brazos con codos arriba',
    notes:'Codos flexionados a la altura de los hombros, abrir y cerrar brazos. Sin peso.' },
  { id:'blq_b1_2', fig:'b_b1_2', pos:DE_PIE, zone:'Hombros', tempo:2,
    name:'Brazos hacia arriba hasta extenderlos',
    notes:'Brazos hacia arriba hasta extenderlos por completo. Sin peso.' },

  // Hoja 2 · Ma-J-S
  { id:'blq_b2_1', fig:'b_b2_1', pos:DE_PIE, zone:'General', alt:true, tempo:2,
    name:'Brazo arriba y pie contrario adelante',
    notes:'Mover un brazo hacia arriba y el pie contrario hacia adelante, regresar y alternar.' },
  { id:'blq_b2_2', fig:'b_b2_2', pos:DE_PIE, zone:'Brazos', tempo:2.5,
    name:'Flexiones de brazos en la pared',
    setup:'Frente a una pared',
    notes:'Brazos apoyados en la pared, codos flexionados y hacer extensión de los codos hasta quedar estirados los brazos.' },
  { id:'blq_b2_3', fig:'b_b2_3', pos:DE_PIE, zone:'Cuádriceps', tempo:3,
    name:'Sentarse y levantarse de la silla',
    setup:'Silla detrás de ti',
    notes:'Sentarse en una silla y ponerse de pie, sin que el cuerpo vaya hacia delante y sin que la punta de las rodillas rebase la punta de los pies.' },
  { id:'blq_b2_4', fig:'b_b2_4', pos:DE_PIE, zone:'Pantorrillas', tempo:2,
    name:'Elevación de talones en tres posiciones',
    notes:'Subir y bajar sobre la punta de los pies. Pies abiertos a la altura de los hombros, con las siguientes posiciones: A) puntas de los pies al frente, B) puntas hacia afuera, C) puntas hacia adentro.',
    variants:['A · puntas al frente', 'B · puntas hacia afuera', 'C · puntas hacia adentro'], variantOrder:'series' },

  // Hoja 3 · Ma-J-S
  { id:'blq_b3_1', fig:'b_b3_1', pos:DE_PIE, zone:'Cuádriceps', tempo:3,
    name:'Subir y bajar escalón de lado',
    setup:'Escalón',
    notes:'Subir y bajar escalón de lado. La punta de la rodilla no debe rebasar la punta del pie que está arriba.',
    variants:LR },
  { id:'blq_b3_2', fig:'b_b3_2', pos:SENTADO, zone:'Aductores', tempo:2,
    name:'Mariposa en movimiento',
    notes:'Sentado, hacer movimiento de abrir y cerrar muslos como mariposa.' },
  { id:'blq_b3_3', fig:'b_b3_3', pos:DE_PIE, zone:'Isquiotibiales', tempo:2.5,
    name:'Flexión de rodilla con liga pisada',
    setup:'Liga plana pisada y en las agujetas del otro pie · apoyo en silla',
    notes:'Con una liga plana a la altura de las agujetas, pisar y con el otro pie flexionar la rodilla mientras tensa la liga (como se muestra en la imagen).',
    variants:LR },
  { id:'blq_b3_4', fig:'b_b3_4', pos:DE_PIE, zone:'Pantorrillas', tempo:2.5,
    name:'Elevación de talón a un pie',
    notes:'Subir y bajar sobre un solo pie. Realizar trabajo con cada pie.',
    variants:LR },

  // Hoja 4 · Ma-J-S
  { id:'blq_b4_1', fig:'b_b4_1', pos:SENTADO, zone:'Isquiotibiales', tempo:3,
    name:'Apretar pelota con el talón contra la silla',
    setup:'Sentado, pelota entre el talón y la pata de la silla',
    notes:'Sentado, apretar una pelota con el talón hacia la pata de la silla (así como está en la imagen).',
    variants:LR },
  { id:'blq_b4_2', fig:'b_b4_2', pos:SENTADO, zone:'Cuádriceps', tempo:2.5,
    name:'Extensión de rodilla sin llegar al tope',
    notes:'Sentado con la rodilla flexionada a 90º, realizar extensión de rodilla hasta casi la extensión completa (no llegar al tope máximo).',
    variants:LR },
  { id:'blq_b4_3', fig:'b_b4_3', pos:CUADRUPEDIA, zone:'Espalda', tempo:4,
    name:'Gato y postura del niño',
    notes:'Desde manos y rodillas, llevar la cadera hacia los talones con los brazos estirados al frente y volver. ⚠️ La lámina repite aquí el texto del ejercicio siguiente (brazo y pierna contraria), pero la imagen muestra esta secuencia: pendiente confirmar.' },
  { id:'blq_b4_4', fig:'b_b4_4', pos:CUADRUPEDIA, zone:'Abdomen', alt:true, tempo:3,
    name:'Brazo y pierna contraria, posición de gato',
    notes:'Sobre manos y rodillas en posición de gato: realizar extensión de brazo izquierdo y extensión de pierna derecha. Bajar y alternar. Se hace 5 de cada lado.' },
].map(e => ({
  type:'reps', sets:3, reps:10, img:null,
  variants:null, variantOrder:'cycle',
  ...e,
}));

const ALL_SEED_EXERCISES = [...MOBILITY_EXERCISES, ...STRENGTH_EXERCISES, ...BLOCK_EXERCISES];

// ── PROPIOS · 14 ejercicios que ya se hacían antes del plan ──
// No son prescritos ni van en ninguna rutina: aparecen en Biblioteca ›
// Propios y se agregan a mano a las rutinas. Entran una sola vez
// (seedOwnExercises); si después se editan o se borran, se respeta.
// Sin figura: las fotos se cargan en el teléfono y no se publican.
// Lo que va por lado alterna lados; lo que se mueve no pasa de 2 min.
const OWN_EXERCISES = [
  { id:'prp_sl_rdl', pos:DE_PIE, zone:'Isquiotibiales', type:'reps', sets:2, reps:8, tempo:4.5,
    name:'Peso muerto rumano a una pierna (Single Leg RDL)',
    setup:'Silla o pared (opcional, para el equilibrio)',
    notes:'Rodilla de apoyo ligeramente flexionada y bisagra de cadera hacia atrás. La pierna libre se extiende alineada con el torso. Bajar lento (3 s) hasta sentir la carga en el isquiotibial, sin redondear la zona lumbar.',
    variants:LR },
  { id:'prp_couch', pos:DE_RODILLAS, zone:'Cuádriceps', type:'time', sets:2, reps:1, duration:45,
    name:'Estiramiento de sofá (Couch stretch)',
    setup:'Pared o sofá · tapete bajo la rodilla',
    notes:'Rodilla de atrás pegada a la pared o al sofá, con la tibia vertical. Pierna de adelante a 90°, en zancada. Apretar el glúteo de atrás para bascular la pelvis hacia atrás y erguir el torso poco a poco, sin arquear la zona lumbar.',
    variants:LR },
  { id:'prp_toracica', pos:DE_PIE, zone:'Espalda', type:'time', sets:1, reps:1, duration:80,
    name:'Rotación torácica activa (Thoracic rotation)',
    setup:'Palo',
    notes:'Palo sobre la espalda alta y el torso ligeramente inclinado hacia adelante. Girar lento y controlado hacia un lado y hacia el otro: 10 por lado.',
    rhythm:{ cycle:8, ida:'Gira a la derecha', vuelta:'Gira a la izquierda' } },
  { id:'prp_ankle', pos:DE_RODILLAS, zone:'Tobillos', type:'time', sets:2, reps:1, duration:30,
    name:'Balanceo de tobillo (Ankle rocks)',
    notes:'Pie de adelante plano. Llevar la rodilla hacia adelante sobre los dedos, cargando la pantorrilla, y regresar sin despegar el talón. Las manos pueden empujar la rodilla.',
    variants:LR, rhythm:{ cycle:3, ida:'Rodilla al frente', vuelta:'Regresa' } },
  { id:'prp_9090_lift', pos:SENTADO, zone:'Cadera', type:'reps', sets:2, reps:8, tempo:4,
    name:'90-90 con levantamiento de tobillo (90-90 ankle lift)',
    notes:'En la posición 90-90, con las manos apoyadas a los lados, elevar el tobillo de la pierna de adelante lo más alto posible sin despegar la rodilla, con control, y bajar.',
    variants:LR },
  { id:'prp_deep_squat', pos:DE_PIE, zone:'Cadera', type:'time', sets:1, reps:3, duration:30,
    name:'Sentadilla profunda (Deep squat)',
    notes:'Pies un poco más anchos que la cadera, puntas ligeramente afuera. Bajar lento y empujar las rodillas hacia afuera, alineadas con los pies. Pecho erguido y abdomen activo. Puedes apoyarte para el equilibrio.' },
  { id:'prp_cossack', pos:DE_PIE, zone:'Aductores', type:'time', sets:1, reps:1, duration:90,
    name:'Sentadilla cosaca (Cossack squat)',
    notes:'Postura amplia. Bajar sobre una pierna mientras la otra se queda estirada, y pasar al otro lado. Girar la punta del pie estirado hacia arriba suma a los isquiotibiales.',
    rhythm:{ cycle:6, ida:'Baja a la derecha', vuelta:'Baja a la izquierda' } },
  { id:'prp_dead_hang', pos:COLGADO, zone:'Hombros', type:'time', sets:1, reps:3, duration:20,
    name:'Colgado de barra (Dead hang)',
    setup:'Barra',
    notes:'Colgarse de la barra con los brazos estirados y las manos a la anchura de los hombros. Abre los hombros y descomprime la columna. Se puede subir a 30 s.' },
  { id:'prp_lunge', pos:DE_PIE, zone:'Cadera', type:'reps', sets:2, reps:8, tempo:4,
    name:'Estocada profunda (Deep lunge)',
    setup:'Silla (opcional, para el equilibrio)',
    notes:'Zancada larga, rodilla de adelante sobre el pie y la de atrás sin tocar el piso. Bajar y subir lento. Abre los flexores de la cadera y fortalece glúteos y cuádriceps.',
    variants:LR },
  { id:'prp_nerve', pos:BOCA_ARRIBA, zone:'Isquiotibiales', type:'time', sets:1, reps:1, duration:60,
    name:'Deslizamientos nerviosos (Nerve glides)',
    notes:'Boca arriba (o sentado), sujetar el muslo con la cadera a 90° y estirar lento la rodilla hasta sentir un estiramiento suave atrás del muslo. Pausa breve y regresar. Si es fácil: en el punto máximo, flexionar y extender el tobillo.',
    variants:LR, rhythm:{ cycle:4, ida:'Estira la rodilla', vuelta:'Dobla' } },
  { id:'prp_rdl_hold', pos:DE_PIE, zone:'Isquiotibiales', type:'reps', sets:3, reps:5, tempo:3, hold:5,
    name:'Flexión hacia adelante sostenida (RDL hold)',
    setup:'Silla',
    notes:'De pie junto a una silla, flexionar la cadera con las rodillas suavemente dobladas hasta tocarla con las manos. Levantar las manos sin perder la posición y sostener 5 s activando glúteos e isquiotibiales. Variantes: sin silla, con peso o sobre una superficie elevada.' },
  { id:'prp_stick', pos:DE_PIE, zone:'Hombros', type:'time', sets:1, reps:1, duration:90,
    name:'Rotaciones de hombro con palo (Stick pass-through)',
    setup:'Palo, toalla o liga',
    notes:'Agarre más ancho que los hombros. Pasar el palo por encima de la cabeza hasta atrás de la espalda y regresar lento. Conforme ganes movilidad, acerca las manos.',
    rhythm:{ cycle:4, ida:'Palo por encima, hasta atrás', vuelta:'Regresa al frente' } },
  { id:'prp_9090', pos:SENTADO, zone:'Cadera', type:'time', sets:1, reps:1, duration:60,
    name:'Estiramiento 90-90 (90-90 stretch)',
    notes:'Ambas piernas a 90°. Con la espalda recta, inclinarse sobre la pierna de adelante. Opcional: empujar la pierna contra la mano al 50–60 % unos segundos, relajar y profundizar.',
    variants:LR },
  { id:'prp_wipers', pos:SENTADO, zone:'Cadera', type:'time', sets:1, reps:1, duration:120,
    name:'Limpiaparabrisas (Windshield wipers)',
    notes:'Sentado, piernas un poco más abiertas que la cadera y apoyado hacia atrás en las manos. Llevar las rodillas de un lado al otro, tocando el suelo al final del rango.',
    rhythm:{ cycle:6, ida:'Rodillas a la derecha', vuelta:'Rodillas a la izquierda' } },
].map(e => ({
  img:null, variants:null, variantOrder:'cycle', duration:null, tempo:null, hold:null, setup:null,
  ...e,
}));

// ══════════════════════════════════
// PROGRESIÓN DEL FORTALECIMIENTO
// Cambia cada 2 semanas; después de la semana 22 se queda en la última.
// ══════════════════════════════════
const PROGRESSION = [
  { to:2,  sets:2, reps:8,  band:'Baja'  },
  { to:4,  sets:2, reps:10, band:'Baja'  },
  { to:6,  sets:3, reps:8,  band:'Baja'  },
  { to:8,  sets:3, reps:10, band:'Baja'  },
  { to:10, sets:3, reps:8,  band:'Media' },
  { to:12, sets:3, reps:10, band:'Media' },
  { to:14, sets:3, reps:12, band:'Media' },
  { to:16, sets:3, reps:8,  band:'Alta'  },
  { to:18, sets:3, reps:10, band:'Alta'  },
  { to:20, sets:3, reps:12, band:'Alta'  },
  { to:22, sets:3, reps:15, band:'Alta'  },
];

// ══════════════════════════════════
// RUTINAS
// kind : 'movilidad' | 'fuerza' | 'bloque' | 'libre'
// days : días de la semana (0 = domingo); null = todos los días
// ══════════════════════════════════
const items = (ids, extra) => ids.map(exId => ({ exId, sets:null, reps:null, duration:null, ...extra }));

// Estiramientos agrupados por posición: ahorra levantarse y volver al piso.
const MOBILITY_ROUTINE_ORDER = [
  // De pie (9)
  'mov_2_2','mov_1_2','mov_1_3','mov_1_4','mov_2_1',
  'mov_4_1','mov_4_2','mov_5_4','mov_5_3',
  // De rodillas en piso (3)
  'mov_1_1','mov_3_3','mov_3_1',
  // Sentado (7)
  'mov_3_2','mov_2_3','mov_5_2','mov_5_1','mov_2_4','mov_4_4','mov_6_2',
  // Boca arriba (3)
  'mov_6_1','mov_3_4','mov_4_3',
];

const SEED_ROUTINES = [
  { id:'rutina_movilidad_pelvica', kind:'movilidad', days:null,
    name:'Estiramientos', desc:'22 ejercicios agrupados por posición',
    items: items(MOBILITY_ROUTINE_ORDER) },

  // Fuerza: ordenada por montaje de la liga y por postura, terminando de
  // pie para enlazar con los estiramientos, que empiezan de pie.
  { id:'fza_hombro', kind:'fuerza', days:[1,4],
    name:'Fuerza · Hombro', desc:'Lunes y jueves',
    items: items([
      'fza_h1_4','fza_h2_1','fza_h2_2',   // pisando la liga
      'fza_h2_3',                         // liga en las manos
      'fza_h1_1','fza_h1_2','fza_h1_3',   // ancla a la altura del codo
      'fza_h2_4',                         // ancla a la altura del hombro
    ], { prog:true }) },
  { id:'fza_pelvicos', kind:'fuerza', days:[2,5],
    name:'Fuerza · Miembros pélvicos', desc:'Martes y viernes',
    items: items([
      'fza_mp2_3',                        // boca abajo
      'fza_mp2_4',                        // boca arriba
      'fza_mp3_2',                        // de lado
      'fza_mp3_3',                        // sentado en piso, ancla baja
      'fza_mp3_1',                        // silla
      'fza_mp2_2','fza_mp2_1',            // de pie, ligas circulares
      'fza_mp1_2','fza_mp1_3',            // ancla al tobillo
      'fza_mp1_1',                        // ancla a la cintura
      'fza_mp1_4',                        // ancla al frente, sentadilla
    ], { prog:true }) },
  { id:'fza_miercoles', kind:'fuerza', days:[3],
    name:'Fuerza · Tobillo y tronco', desc:'Miércoles',
    items: [
      ...items(['fza_tb_1','fza_tb_2','fza_tb_3','fza_tb_4',
                'fza_tr1_1','fza_tr1_2'], { prog:true }),
      ...items(['fza_tr2_1'], { prog:false }),
      ...items(['fza_tr2_2','fza_tr2_3'], { prog:true }),
      ...items(['fza_tr2_4'], { prog:false }),
      ...items(['fza_tr1_3','fza_tr1_4'], { prog:true }),
    ] },

  // Bloques de 10 minutos: una hoja por bloque.
  { id:'blq_lmv_1', kind:'bloque', days:[1,3,5], sheet:1, name:'Hoja 1 · L-M-V', desc:'Bloque de 10 min',
    items: items(['blq_a1_1','blq_a1_2','blq_a1_3','blq_a1_4']) },
  { id:'blq_lmv_2', kind:'bloque', days:[1,3,5], sheet:2, name:'Hoja 2 · L-M-V', desc:'Bloque de 10 min',
    items: items(['blq_a2_1','blq_a2_2','blq_a2_3','blq_a2_4']) },
  { id:'blq_lmv_3', kind:'bloque', days:[1,3,5], sheet:3, name:'Hoja 3 · L-M-V', desc:'Bloque de 10 min',
    items: [
      { exId:'fza_mp2_1', sets:3, reps:10, duration:null, variantOrder:'series' },
      { exId:'fza_mp2_2', sets:3, reps:10, duration:null },
      { exId:'blq_a3_3',  sets:null, reps:null, duration:null },
      { exId:'fza_mp2_4', sets:3, reps:10, duration:null },
    ] },
  { id:'blq_lmv_4', kind:'bloque', days:[1,3,5], sheet:4, name:'Hoja 4 · L-M-V', desc:'Bloque de 10 min',
    items: items(['blq_a4_2','blq_a4_1','blq_a4_3','blq_a4_4']) },
  { id:'blq_mjs_1', kind:'bloque', days:[2,4,6], sheet:1, name:'Hoja 1 · Ma-J-S', desc:'Bloque de 10 min',
    items: [
      { exId:'blq_b1_1',  sets:null, reps:null, duration:null },
      { exId:'blq_b1_2',  sets:null, reps:null, duration:null },
      { exId:'fza_h2_3',  sets:3, reps:10, duration:null },
      { exId:'fza_h2_4',  sets:3, reps:10, duration:null, band:'Media' },
    ] },
  { id:'blq_mjs_2', kind:'bloque', days:[2,4,6], sheet:2, name:'Hoja 2 · Ma-J-S', desc:'Bloque de 10 min',
    items: items(['blq_b2_1','blq_b2_4','blq_b2_2','blq_b2_3']) },
  { id:'blq_mjs_3', kind:'bloque', days:[2,4,6], sheet:3, name:'Hoja 3 · Ma-J-S', desc:'Bloque de 10 min',
    items: items(['blq_b3_1','blq_b3_4','blq_b3_3','blq_b3_2']) },
  { id:'blq_mjs_4', kind:'bloque', days:[2,4,6], sheet:4, name:'Hoja 4 · Ma-J-S', desc:'Bloque de 10 min',
    items: items(['blq_b4_1','blq_b4_2','blq_b4_3','blq_b4_4']) },
];

// ── RUTINAS PROPIAS · noche alterna ──
// Los 14 ejercicios propios y 7 estiramientos del plan, repartidos por
// cadena muscular: L-Mi-V lo de atrás de la pierna y la rotación de cadera;
// Ma-J-S lo de adelante, el tobillo y los hombros. El palo va en las dos.
// Tipo «movilidad»: entran solas a la sesión de noche después de la fuerza.
// No son prescritas: se crean una sola vez (seedOwnExercises) y después son
// del usuario.
const OWN_ROUTINES = [
  { id:'rut_posterior', kind:'movilidad', days:[1,3,5],
    name:'Posterior y cadera', desc:'Lunes, miércoles y viernes',
    items: items([
      'prp_stick','prp_toracica',               // de pie, con el palo
      'prp_sl_rdl','prp_rdl_hold','mov_4_1',    // bisagra de cadera
      'mov_3_2',                                // silla
      'mov_2_4','prp_wipers','prp_9090','prp_9090_lift',   // sentado en piso
      'prp_nerve',                              // boca arriba
    ]) },
  { id:'rut_anterior', kind:'movilidad', days:[2,4,6],
    name:'Anterior, tobillo y hombros', desc:'Martes, jueves y sábado',
    items: items([
      'prp_dead_hang',                          // barra
      'prp_stick','prp_deep_squat','prp_cossack','prp_lunge',
      'mov_1_2','mov_5_4',                      // de pie, apoyo y pared
      'prp_couch','prp_ankle',                  // de rodillas, pared
      'mov_6_2','mov_4_4',                      // sentado
    ]) },
];
