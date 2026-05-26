// ===== BASE DE DATOS DE EJERCICIOS =====
// Basada en el contenido del canal Oscar Moves (@OscarMovesYt)
// Cada ejercicio incluye el ID del video de YouTube y el segundo de inicio

const EXERCISES = [
  {
    id: 'ex001',
    name: 'Rotación de cadera en el suelo',
    body: 'Cadera',
    emoji: '🦵',
    type: 'time', // 'time' | 'reps'
    defaultDuration: 30,
    defaultReps: null,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_1',
    videoStart: 45,
    description: 'Acostado boca arriba, lleva ambas rodillas al pecho y gíralas lentamente de lado a lado. Mantén los hombros en contacto con el suelo. Respira profundo con cada movimiento.',
    tips: 'No fuerces el rango. Deja que la gravedad haga el trabajo.',
    thumbnail: null
  },
  {
    id: 'ex002',
    name: 'Apertura de hombros en pared',
    body: 'Hombros',
    emoji: '🙆',
    type: 'time',
    defaultDuration: 40,
    defaultReps: null,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_2',
    videoStart: 0,
    description: 'Coloca un brazo extendido contra la pared a la altura del hombro. Gira lentamente el torso en dirección contraria hasta sentir el estiramiento en el pecho y el hombro. Mantén la posición.',
    tips: 'Mantén el codo ligeramente flexionado para proteger la articulación.',
    thumbnail: null
  },
  {
    id: 'ex003',
    name: 'Estiramiento de columna sentado',
    body: 'Columna',
    emoji: '🧘',
    type: 'time',
    defaultDuration: 45,
    defaultReps: null,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_3',
    videoStart: 20,
    description: 'Sentado en el suelo con las piernas cruzadas, alarga la columna hacia arriba y luego inclínate hacia adelante dejando las manos deslizarse sobre el suelo. Relaja el cuello.',
    tips: 'No curvas la espalda. El movimiento sale desde las caderas.',
    thumbnail: null
  },
  {
    id: 'ex004',
    name: 'Flexión lateral de tronco',
    body: 'Costados',
    emoji: '🤸',
    type: 'time',
    defaultDuration: 30,
    defaultReps: null,
    defaultSets: 3,
    videoId: 'EJEMPLO_VIDEO_ID_1',
    videoStart: 90,
    description: 'De pie con los pies a la anchura de los hombros, lleva un brazo por encima de la cabeza y dóblate lateralmente de forma controlada. Siente el estiramiento en toda la cadena lateral.',
    tips: 'No rotar el torso hacia adelante. El movimiento es puramente lateral.',
    thumbnail: null
  },
  {
    id: 'ex005',
    name: 'Rodilla al pecho activa',
    body: 'Cadera',
    emoji: '🦵',
    type: 'reps',
    defaultDuration: null,
    defaultReps: 10,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_4',
    videoStart: 10,
    description: 'De pie, lleva una rodilla hacia el pecho jalando con ambas manos. Mantén 2 segundos y alterna. Trabaja el flexor de cadera y mejora la movilidad de la articulación.',
    tips: 'Mantén la espalda recta y el pie de apoyo bien plantado.',
    thumbnail: null
  },
  {
    id: 'ex006',
    name: 'Gato-vaca en cuadrupedia',
    body: 'Columna',
    emoji: '🐱',
    type: 'reps',
    defaultDuration: null,
    defaultReps: 12,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_2',
    videoStart: 35,
    description: 'En cuatro puntos, alterna entre arquear la espalda hacia el techo (gato) y hundirla hacia el suelo (vaca). Coordina el movimiento con la respiración: inhala en vaca, exhala en gato.',
    tips: 'Movimiento lento y fluido. No hacerlo rápido.',
    thumbnail: null
  },
  {
    id: 'ex007',
    name: 'Estiramiento de glúteo en el suelo',
    body: 'Glúteos',
    emoji: '🍑',
    type: 'time',
    defaultDuration: 40,
    defaultReps: null,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_3',
    videoStart: 60,
    description: 'Acostado boca arriba, cruza un tobillo sobre la rodilla contraria en forma de "4". Con ambas manos, jala el muslo de la pierna base hacia el pecho hasta sentir el glúteo.',
    tips: 'Mantén el pie flexionado para proteger la rodilla.',
    thumbnail: null
  },
  {
    id: 'ex008',
    name: 'Rotación de cuello suave',
    body: 'Cuello',
    emoji: '😌',
    type: 'reps',
    defaultDuration: null,
    defaultReps: 8,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_5',
    videoStart: 0,
    description: 'Sentado o de pie, lleva la oreja hacia el hombro y rueda lentamente la cabeza hacia adelante y hacia el otro lado. Nunca hacia atrás. Muy lento y sin forzar.',
    tips: 'Nunca hagas círculos completos de cuello. Solo media luna de frente.',
    thumbnail: null
  },
  {
    id: 'ex009',
    name: 'Paloma en el suelo',
    body: 'Cadera',
    emoji: '🕊️',
    type: 'time',
    defaultDuration: 60,
    defaultReps: null,
    defaultSets: 1,
    videoId: 'EJEMPLO_VIDEO_ID_4',
    videoStart: 55,
    description: 'Desde cuadrupedia, lleva una rodilla detrás de la mano del mismo lado con el pie apuntando al otro lado. Extiende la pierna de atrás. Recuéstate sobre los antebrazos o extiende los brazos al frente.',
    tips: 'Es un estiramiento profundo. No lo hagas en frío.',
    thumbnail: null
  },
  {
    id: 'ex010',
    name: 'Círculos de cadera de pie',
    body: 'Cadera',
    emoji: '🔄',
    type: 'reps',
    defaultDuration: null,
    defaultReps: 10,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_5',
    videoStart: 30,
    description: 'De pie con manos en la cadera, dibuja círculos amplios con la pelvis. Mantén los pies fijos y rodillas ligeramente flexionadas. Alterna dirección.',
    tips: 'Trata de hacer los círculos lo más amplios posible.',
    thumbnail: null
  },
  {
    id: 'ex011',
    name: 'Estiramiento de isquiotibiales tumbado',
    body: 'Isquiotibiales',
    emoji: '🦵',
    type: 'time',
    defaultDuration: 40,
    defaultReps: null,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_1',
    videoStart: 120,
    description: 'Acostado boca arriba, lleva una pierna al pecho y extiéndela hacia el techo. Sostén el muslo o el tobillo. Mantén la otra pierna en el suelo. Siente el estiramiento en la parte trasera del muslo.',
    tips: 'No es necesario que la pierna quede completamente recta. Lo importante es sentir el estiramiento.',
    thumbnail: null
  },
  {
    id: 'ex012',
    name: 'Apertura de cadera en mariposa',
    body: 'Cadera',
    emoji: '🦋',
    type: 'time',
    defaultDuration: 60,
    defaultReps: null,
    defaultSets: 1,
    videoId: 'EJEMPLO_VIDEO_ID_6',
    videoStart: 0,
    description: 'Sentado, une las plantas de los pies frente a ti y acércalas a la cadera. Deja caer las rodillas hacia los lados. Puedes usar los codos para presionar suavemente las rodillas hacia el suelo.',
    tips: 'Siéntate sobre un cojín si tu espalda se curva mucho.',
    thumbnail: null
  },
  {
    id: 'ex013',
    name: 'Lunge con estiramiento de flexor',
    body: 'Cadera',
    emoji: '🏃',
    type: 'time',
    defaultDuration: 40,
    defaultReps: null,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_6',
    videoStart: 45,
    description: 'Desde una posición de zancada, baja la rodilla trasera al suelo. Empuja la cadera hacia adelante y abajo suavemente. Puedes llevar el brazo del mismo lado hacia arriba para mayor apertura.',
    tips: 'La rodilla delantera no debe pasar el nivel del pie.',
    thumbnail: null
  },
  {
    id: 'ex014',
    name: 'Movilidad de muñecas',
    body: 'Muñecas',
    emoji: '🤲',
    type: 'reps',
    defaultDuration: null,
    defaultReps: 10,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_7',
    videoStart: 5,
    description: 'Con las palmas juntas frente al pecho, separa los pulgares y rota las manos hacia adentro y afuera. Luego extiende los brazos y haz círculos completos con las muñecas en ambas direcciones.',
    tips: 'Ideal para hacer antes o después de apoyar mucho las manos en el suelo.',
    thumbnail: null
  },
  {
    id: 'ex015',
    name: 'Estiramiento de cuádriceps de pie',
    body: 'Cuádriceps',
    emoji: '🦵',
    type: 'time',
    defaultDuration: 35,
    defaultReps: null,
    defaultSets: 2,
    videoId: 'EJEMPLO_VIDEO_ID_7',
    videoStart: 40,
    description: 'De pie, dobla una rodilla llevando el talón hacia el glúteo. Sostén el tobillo con la mano. Mantén las rodillas juntas y el torso erguido. Para mayor intensidad, inclina ligeramente el torso hacia adelante.',
    tips: 'Si pierdes el equilibrio, apóyate en una pared.',
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

// Rutinas de ejemplo predefinidas
const DEFAULT_ROUTINES = [
  {
    id: 'routine_default_1',
    name: 'Movilidad matutina',
    exercises: [
      { exId: 'ex006', sets: 2, reps: 12, duration: null },
      { exId: 'ex001', sets: 2, reps: null, duration: 30 },
      { exId: 'ex010', sets: 2, reps: 10, duration: null },
      { exId: 'ex003', sets: 2, reps: null, duration: 45 },
    ],
    createdAt: Date.now()
  },
  {
    id: 'routine_default_2',
    name: 'Espalda y cuello',
    exercises: [
      { exId: 'ex008', sets: 2, reps: 8, duration: null },
      { exId: 'ex006', sets: 3, reps: 12, duration: null },
      { exId: 'ex003', sets: 2, reps: null, duration: 45 },
      { exId: 'ex004', sets: 2, reps: null, duration: 30 },
    ],
    createdAt: Date.now() - 86400000
  }
];
