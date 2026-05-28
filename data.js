// ===== BASE DE DATOS DE EJERCICIOS =====
// Basada en el contenido del canal Oscar Moves (@OscarMovesYt)
// Cada ejercicio incluye el ID del video de YouTube y el segundo de inicio

const EXERCISES = [

  // ── VIDEO: 8dJud0OyC2E ──────────────────────────────────────────────
  {
    id: 'ex001',
    name: 'Deslizamientos nerviosos',
    body: 'Isquiotibiales',
    emoji: '🦵',
    type: 'time',
    defaultDuration: 60,
    defaultReps: null,
    defaultSets: 2,
    videoId: '8dJud0OyC2E',
    videoStart: 59,
    description: 'Sentado o acostado, endereza lentamente una pierna hasta sentir un tirón suave en la parte posterior del muslo, sin llegar al dolor. Haz una pausa breve y flexiona la pierna para volver. Puedes añadir una progresión flexionando y apuntando los tobillos en la parte superior del movimiento para mayor efecto.',
    tips: 'La sensación debe ser de tirón suave, nunca dolor intenso. Trabaja dentro de un rango cómodo.',
    thumbnail: null
  },
  {
    id: 'ex002',
    name: 'Sostenimiento en RDL',
    body: 'Isquiotibiales',
    emoji: '🏋️',
    type: 'reps',
    defaultDuration: null,
    defaultReps: 5,
    defaultSets: 3,
    videoId: '8dJud0OyC2E',
    videoStart: 135,
    description: 'De pie junto a una silla con rodillas ligeramente flexionadas, realiza una bisagra de cadera hasta que las palmas toquen la silla. Desde ahí, levanta las manos manteniendo una contracción activa en glúteos e isquiotibiales durante 5 segundos. Puedes progresar sin silla, añadir peso o usar una superficie elevada.',
    tips: 'Mantén la espalda neutral durante toda la bisagra. No redondees la zona lumbar.',
    thumbnail: null
  },

  // ── VIDEO: WL6VSc5XQ-8 ──────────────────────────────────────────────
  {
    id: 'ex003',
    name: 'Sentadilla profunda',
    body: 'Cadera',
    emoji: '🦵',
    type: 'time',
    defaultDuration: 30,
    defaultReps: null,
    defaultSets: 3,
    videoId: 'WL6VSc5XQ-8',
    videoStart: 107,
    description: 'Con los pies un poco más anchos que las caderas, baja lo más profundo posible usando apoyo si es necesario. Una vez abajo, muévete de lado a lado para abrir las caderas y mejorar la movilidad de los tobillos.',
    tips: 'Usa una silla o poste de apoyo si no llegas al fondo. Con el tiempo el rango irá aumentando.',
    thumbnail: null
  },
  {
    id: 'ex004',
    name: 'Estiramiento en sofá',
    body: 'Cadera',
    emoji: '🛋️',
    type: 'time',
    defaultDuration: 90,
    defaultReps: null,
    defaultSets: 2,
    videoId: 'WL6VSc5XQ-8',
    videoStart: 165,
    description: 'Colócate en posición de estocada con la rodilla trasera elevada contra un sofá o pared y mantén el torso erguido. Alivia la rigidez de la espalda baja causada por los flexores de la cadera. Empuja las caderas ligeramente hacia atrás para mayor intensidad.',
    tips: 'Mantén el torso recto durante todo el ejercicio. No te inclines hacia adelante.',
    thumbnail: null
  },
  {
    id: 'ex005',
    name: 'Rotaciones con palo sobre cabeza',
    body: 'Hombros',
    emoji: '🏑',
    type: 'time',
    defaultDuration: 90,
    defaultReps: null,
    defaultSets: 2,
    videoId: 'WL6VSc5XQ-8',
    videoStart: 229,
    description: 'Sujeta un palo, toalla o banda elástica con un agarre más ancho que los hombros. Llévalo lentamente por encima de la cabeza y hacia atrás de forma controlada. Trabaja la movilidad de hombros y cuello.',
    tips: 'Cuanto más ancho el agarre, más fácil. Ve cerrando el agarre gradualmente conforme mejore tu movilidad.',
    thumbnail: null
  },
  {
    id: 'ex006',
    name: 'Sentadilla Kazak',
    body: 'Aductores',
    emoji: '🤼',
    type: 'reps',
    defaultDuration: null,
    defaultReps: 5,
    defaultSets: 2,
    videoId: 'WL6VSc5XQ-8',
    videoStart: 280,
    description: 'En una posición con los pies bien separados, desplaza el peso de lado a lado bajando profundamente hacia cada pierna de forma controlada. Trabaja los aductores y la movilidad de caderas.',
    tips: 'Baja lento y controlado hacia cada lado. No rebotes en el punto más bajo.',
    thumbnail: null
  },

  // ── EJERCICIOS SIN VIDEO REAL (pendientes de curaduría) ─────────────
  {
    id: 'ex007',
    name: 'Gato-vaca en cuadrupedia',
    body: 'Columna',
    emoji: '🐱',
    type: 'reps',
    defaultDuration: null,
    defaultReps: 12,
    defaultSets: 2,
    videoId: '',
    videoStart: 0,
    description: 'En cuatro puntos, alterna entre arquear la espalda hacia el techo (gato) y hundirla hacia el suelo (vaca). Coordina el movimiento con la respiración: inhala en vaca, exhala en gato.',
    tips: 'Movimiento lento y fluido. No lo hagas rápido.',
    thumbnail: null
  },
  {
    id: 'ex008',
    name: 'Apertura de cadera en mariposa',
    body: 'Cadera',
    emoji: '🦋',
    type: 'time',
    defaultDuration: 60,
    defaultReps: null,
    defaultSets: 1,
    videoId: '',
    videoStart: 0,
    description: 'Sentado, une las plantas de los pies frente a ti y acércalas a la cadera. Deja caer las rodillas hacia los lados. Puedes usar los codos para presionar suavemente las rodillas hacia el suelo.',
    tips: 'Siéntate sobre un cojín si tu espalda se curva mucho.',
    thumbnail: null
  },
  {
    id: 'ex009',
    name: 'Rotación de cuello suave',
    body: 'Cuello',
    emoji: '😌',
    type: 'reps',
    defaultDuration: null,
    defaultReps: 8,
    defaultSets: 2,
    videoId: '',
    videoStart: 0,
    description: 'Sentado o de pie, lleva la oreja hacia el hombro y rueda lentamente la cabeza hacia adelante y hacia el otro lado. Nunca hacia atrás. Muy lento y sin forzar.',
    tips: 'Nunca hagas círculos completos de cuello. Solo media luna de frente.',
    thumbnail: null
  },
  {
    id: 'ex010',
    name: 'Flexión lateral de tronco',
    body: 'Costados',
    emoji: '🤸',
    type: 'time',
    defaultDuration: 30,
    defaultReps: null,
    defaultSets: 3,
    videoId: '',
    videoStart: 0,
    description: 'De pie con los pies a la anchura de los hombros, lleva un brazo por encima de la cabeza y dóblate lateralmente de forma controlada. Siente el estiramiento en toda la cadena lateral.',
    tips: 'No rotar el torso hacia adelante. El movimiento es puramente lateral.',
    thumbnail: null
  },
  {
    id: 'ex011',
    name: 'Estiramiento de glúteo en el suelo',
    body: 'Glúteos',
    emoji: '🍑',
    type: 'time',
    defaultDuration: 40,
    defaultReps: null,
    defaultSets: 2,
    videoId: '',
    videoStart: 0,
    description: 'Acostado boca arriba, cruza un tobillo sobre la rodilla contraria en forma de "4". Con ambas manos, jala el muslo de la pierna base hacia el pecho hasta sentir el glúteo.',
    tips: 'Mantén el pie flexionado para proteger la rodilla.',
    thumbnail: null
  },
  {
    id: 'ex012',
    name: 'Círculos de cadera de pie',
    body: 'Cadera',
    emoji: '🔄',
    type: 'reps',
    defaultDuration: null,
    defaultReps: 10,
    defaultSets: 2,
    videoId: '',
    videoStart: 0,
    description: 'De pie con manos en la cadera, dibuja círculos amplios con la pelvis. Mantén los pies fijos y rodillas ligeramente flexionadas. Alterna la dirección.',
    tips: 'Trata de hacer los círculos lo más amplios posible.',
    thumbnail: null
  }
];

// Colores de acento disponibles
const ACCENT_COLORS = [
  { name: 'Verde bosque',   value: '#2e7d32', light: '#e8f5e9', mid: '#a5d6a7' },
  { name: 'Teal',          value: '#00695c', light: '#e0f2f1', mid: '#80cbc4' },
  { name: 'Índigo',        value: '#3949ab', light: '#e8eaf6', mid: '#9fa8da' },
  { name: 'Violeta',       value: '#6d4c96', light: '#f3e5f5', mid: '#ce93d8' },
  { name: 'Naranja',       value: '#e65100', light: '#fff3e0', mid: '#ffcc80' },
  { name: 'Rosa coral',    value: '#c2185b', light: '#fce4ec', mid: '#f48fb1' },
  { name: 'Azul acero',    value: '#0277bd', light: '#e1f5fe', mid: '#81d4fa' },
  { name: 'Caqui oliva',   value: '#558b2f', light: '#f1f8e9', mid: '#c5e1a5' },
];

// Rutinas predefinidas — usan ejercicios con video real
const DEFAULT_ROUTINES = [
  {
    id: 'routine_default_1',
    name: 'Movilidad de caderas',
    exercises: [
      { exId: 'ex003', sets: 3, reps: null, duration: 30 },
      { exId: 'ex004', sets: 2, reps: null, duration: 90 },
      { exId: 'ex006', sets: 2, reps: 5,    duration: null },
      { exId: 'ex008', sets: 1, reps: null, duration: 60 },
    ],
    createdAt: Date.now()
  },
  {
    id: 'routine_default_2',
    name: 'Isquiotibiales y espalda',
    exercises: [
      { exId: 'ex001', sets: 2, reps: null, duration: 60 },
      { exId: 'ex002', sets: 3, reps: 5,    duration: null },
      { exId: 'ex007', sets: 2, reps: 12,   duration: null },
      { exId: 'ex005', sets: 2, reps: null, duration: 90 },
    ],
    createdAt: Date.now() - 86400000
  }
];
