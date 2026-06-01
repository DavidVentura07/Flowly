// ══════════════════════════════════
// FLOWLY v2 — DATA
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

const ACCENT_COLORS = [
  { name: 'Verde',    value: '#2e7d32', light: '#e8f5e9', mid: '#a5d6a7' },
  { name: 'Teal',     value: '#00695c', light: '#e0f2f1', mid: '#80cbc4' },
  { name: 'Índigo',   value: '#3949ab', light: '#e8eaf6', mid: '#9fa8da' },
  { name: 'Violeta',  value: '#6d4c96', light: '#f3e5f5', mid: '#ce93d8' },
  { name: 'Naranja',  value: '#d84315', light: '#fbe9e7', mid: '#ffab91' },
  { name: 'Rosa',     value: '#ad1457', light: '#fce4ec', mid: '#f48fb1' },
  { name: 'Azul',     value: '#0277bd', light: '#e1f5fe', mid: '#81d4fa' },
  { name: 'Oliva',    value: '#558b2f', light: '#f1f8e9', mid: '#c5e1a5' },
];
