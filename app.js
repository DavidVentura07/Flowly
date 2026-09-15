// ══════════════════════════════════
// FLOWLY — APP LOGIC
// ══════════════════════════════════

const $ = id => document.getElementById(id);

// ── STATE ──
const CFG_VERSION = 3;

let S = {
  exercises:    [],   // ver el modelo en data.js
  routines:     [],   // { id, name, desc, kind, days, sheet, items: [{exId, sets, reps, duration, prog, band, variantOrder}] }
  activeDays:   [],   // ['2026-09-15', ...] días con al menos una rutina hecha
  doneLog:      {},   // { '2026-09-15': [routineId, ...] }
  accentIndex:  0,

  // Ajustes (persistidos)
  cfg: {
    // generales del reproductor
    sound:       true,
    voice:       true,
    vibrate:     true,
    autoAdvance: true,
    oneSide:     false, // solo el primer lado de cada ejercicio unilateral

    // estiramientos (y rutinas propias)
    restRep:     3,     // s entre sostenimientos del mismo lado
    restVariant: 5,     // s entre lados / variantes
    restEx:      10,    // s al cambiar de ejercicio
    restBlock:   20,    // s al cambiar de posición corporal o de rutina

    // fuerza
    repMode:     'cadence', // 'cadence' → cuenta en voz y avanza sola · 'manual' → tocas «Listo»
    countVoice:  true,
    repTempo:    3,     // s por repetición cuando el ejercicio no trae la suya
    fzaRestRep:  10,    // s entre sostenimientos (planchas)
    fzaRestSide: 8,     // s al cambiar de lado; el otro lado descansa mientras
    fzaRestSet:  30,    // s entre series de ejercicios de ambos lados
    fzaRestEx:   20,    // s al cambiar de ejercicio (incluye montar la liga)
    progEnabled: true,
    progStart:   null,  // 'YYYY-MM-DD' semana 1 de la tabla de progresión

    // bloques de 10 min
    blqMode:      'circuit', // 'circuit' → una vuelta = una serie · 'straight' → series seguidas
    blqRestRound: 120,  // s entre vueltas (circuito) o entre pasadas de la hoja
    blqPasses:    2,    // pasadas de la hoja en modo series seguidas
    blqRestEx:    10,
    blqRestSet:   15,
    blqSideReps:  'each',    // 'each' → 10 por lado · 'split' → 5 y 5

    // sesión de noche
    sessionOrder: 'fuerza',  // 'fuerza' → fuerza y luego estiramientos · 'estiramientos'
  },

  // ephemeral
  currentView:   'hoy',
  libTab:        'rutinas',
  exFilter:      'todos',
  editRoutineId: null,
  editRoutineKind: 'libre',
  editRoutineDays: [],
  editExId:      null,
  draftItems:    [],
  pickerSel:     [],
  editExType:    'time',
  editExZone:    null,
  editExPos:     null,
  editExImg:     null,
  editExVarMode: 'none',
  editExVarOrder: 'block',
  runRoutineId:  null,
  runChecked:    new Set(),

  pl: null,  // reproductor en curso
};

// ── PERSIST ──
function persist() {
  pruneDoneLog();
  try {
    localStorage.setItem('flowly2', JSON.stringify({
      exercises:   S.exercises,
      routines:    S.routines,
      activeDays:  S.activeDays,
      doneLog:     S.doneLog,
      accentIndex: S.accentIndex,
      cfg:         S.cfg,
      cfgVersion:  CFG_VERSION,
    }));
  } catch (e) { showToast('No se pudo guardar: almacenamiento lleno'); }
}

function hydrate() {
  try {
    const raw = localStorage.getItem('flowly2');
    if (!raw) return;
    const d = JSON.parse(raw);
    S.exercises   = d.exercises   || [];
    S.routines    = d.routines    || [];
    S.activeDays  = d.activeDays  || [];
    S.doneLog     = d.doneLog     || {};
    // rutinas sembradas antes de que existiera el tipo
    S.routines.forEach(r => {
      const seed = SEED_ROUTINES.find(s => s.id === r.id);
      if (!r.kind) r.kind = seed ? seed.kind : 'libre';
    });
    S.accentIndex = d.accentIndex ?? 0;
    if (S.accentIndex >= ACCENT_COLORS.length) S.accentIndex = 0;
    if (d.cfg) {
      // Los descansos de estiramiento bajaron de 5/10/15/30 a 3/5/10/20 s.
      // Solo se migran si seguían en los valores de fábrica anteriores.
      if ((d.cfgVersion || 0) < 3) {
        const old = { restRep:5, restVariant:10, restEx:15, restBlock:30 };
        Object.keys(old).forEach(k => { if (d.cfg[k] === old[k]) delete d.cfg[k]; });
      }
      S.cfg = { ...S.cfg, ...d.cfg };
    }
  } catch (e) { console.warn('hydrate error', e); }
}

function pruneDoneLog() {
  const limit = addDays(todayStr(), -400);
  Object.keys(S.doneLog).forEach(k => { if (k < limit) delete S.doneLog[k]; });
}

// ── ACCENT ──
function applyAccent(idx) {
  const c = ACCENT_COLORS[idx] || ACCENT_COLORS[0];
  const r = document.documentElement.style;
  r.setProperty('--accent',      c.value);
  r.setProperty('--accent-soft', hexToRgba(c.value, .10));
  r.setProperty('--accent-mid',  hexToRgba(c.value, .32));
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

// ── UTILS ──
function uid() { return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }

// Fechas siempre en hora local: una sesión a las 22 h cuenta para hoy,
// no para el día UTC siguiente.
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function todayStr() { return localDateStr(new Date()); }
function addDays(str, n) {
  const d = new Date(str + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}
function prevDay(str) { return addDays(str, -1); }

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}

function getEmoji(zone) { return ZONE_EMOJI[zone] || '🌿'; }

const DAY_SHORT = ['D', 'L', 'Ma', 'Mi', 'J', 'V', 'S'];
const DAY_LONG  = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function fmtDays(days) {
  if (!days || !days.length || days.length === 7) return 'Todos los días';
  return WEEK_ORDER.filter(d => days.includes(d)).map(d => DAY_SHORT[d]).join(' · ');
}

const KIND_LABEL = { movilidad:'Estiramientos', fuerza:'Fuerza', bloque:'Bloque de 10 min', libre:'Rutina' };

function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtDuration(sec) {
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m/60)} h ${m%60} min`;
}

function fmtSecs(v) {
  return v >= 60 ? `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}` : `${v} s`;
}

function exById(id) { return S.exercises.find(e => e.id === id); }

// Variantes efectivas de un ejercicio (null si es una sola posición).
function exVariants(ex, applyOneSide) {
  const v = Array.isArray(ex.variants) && ex.variants.length ? ex.variants : null;
  if (!v) return null;
  if (applyOneSide && S.cfg.oneSide && v.length === 2) return [v[0]];
  return v;
}

// Ilustración: la foto propia tiene prioridad sobre la figura de la lámina.
function exIllustration(ex) {
  if (ex.img) return { kind:'img',   src: ex.img };
  if (ex.fig) return { kind:'sheet', src: exImageSrc(ex.fig) };
  return null;
}

// ══════════════════════════════════
// PRESCRIPCIÓN
// Lo que toca hoy de cada ejercicio dentro de una rutina: la rutina puede
// sobreescribir series y repeticiones, y la progresión manda sobre ambas.
// ══════════════════════════════════
function progWeek() {
  if (!S.cfg.progStart) return 1;
  const start = new Date(S.cfg.progStart + 'T12:00:00');
  const now   = new Date(todayStr() + 'T12:00:00');
  const days  = Math.round((now - start) / 86400000);
  return Math.max(1, Math.floor(days / 7) + 1);
}

function progStage(week) {
  return PROGRESSION.find(p => week <= p.to) || PROGRESSION[PROGRESSION.length - 1];
}

function rx(item, ex) {
  const time = ex.type === 'time';
  let sets = item.sets ?? ex.sets ?? 1;
  let reps = item.reps ?? ex.reps ?? null;
  // Datos anteriores: en los sostenimientos «series» contaba los sostenimientos.
  if (time && reps == null) { reps = sets; sets = 1; }
  if (reps == null) reps = 10;
  let band = item.band || null;
  if (item.prog && !time && S.cfg.progEnabled) {
    const st = progStage(progWeek());
    sets = st.sets;
    reps = st.reps;
    if (ex.band && !band) band = st.band;
  }
  return {
    sets, reps, band,
    duration: item.duration ?? ex.duration ?? 30,
    tempo:    ex.tempo || S.cfg.repTempo,
    hold:     ex.hold || 0,
    alt:      !!ex.alt,
    order:    item.variantOrder || ex.variantOrder || 'block',
  };
}

function fmtParams(item, ex) {
  if (!ex) return '';
  const r = rx(item, ex);
  const parts = [];
  if (ex.type === 'time') parts.push(r.sets > 1 ? `${r.sets} × ${r.reps} × ${r.duration} s` : `${r.reps} × ${r.duration} s`);
  else                    parts.push(`${r.sets} × ${r.reps}`);
  const v = exVariants(ex);
  if (v) parts.push(v.length === 2 && v[0] === 'Izquierdo' ? 'por lado' : `${v.length} variantes`);
  else if (r.alt) parts.push('alternando');
  if (r.hold) parts.push(`sostén ${r.hold} s`);
  return parts.join(' · ');
}

// ── RACHA Y REGISTRO ──
function calcStreak() {
  const days = [...new Set(S.activeDays)].sort().reverse();
  if (!days.length) return 0;
  const today  = todayStr();
  const yester = prevDay(today);
  if (days[0] !== today && days[0] !== yester) return 0;
  let streak = 0, check = days[0];
  for (const d of days) {
    if (d === check) { streak++; check = prevDay(check); }
    else break;
  }
  return streak;
}

function markActiveToday() {
  const t = todayStr();
  if (!S.activeDays.includes(t)) S.activeDays.push(t);
}

function isDone(routineId, day = todayStr()) {
  return (S.doneLog[day] || []).includes(routineId);
}

function markDone(ids) {
  const t = todayStr();
  const log = S.doneLog[t] || (S.doneLog[t] = []);
  ids.forEach(id => { if (!log.includes(id)) log.push(id); });
  markActiveToday();
  persist();
}

function toggleDone(id) {
  const t = todayStr();
  const log = S.doneLog[t] || (S.doneLog[t] = []);
  const i = log.indexOf(id);
  if (i === -1) { log.push(id); markActiveToday(); }
  else log.splice(i, 1);
  persist();
  renderHoy();
  renderPerfil();
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  hydrate();
  applyAccent(S.accentIndex);

  setTimeout(() => {
    $('splash').classList.add('out');
    setTimeout(() => {
      $('splash').style.display = 'none';
      $('app').classList.remove('hidden');
      initViews();
    }, 450);
  }, 900);
});

function initViews() {
  setGreeting();
  renderHoy();
  renderLibrary();
  renderPerfil();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ── GREETING ──
function setGreeting() {
  const h = new Date().getHours();
  $('hoy-greeting').textContent = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  $('hoy-date').textContent =
    new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' });
}

// ── NAVIGATE ──
function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const el = $('view-' + view);
  if (el) el.classList.add('active');
  const btn = document.querySelector(`[data-view="${view}"]`);
  if (btn) btn.classList.add('active');
  S.currentView = view;
  if (view === 'hoy')        { setGreeting(); renderHoy(); }
  if (view === 'biblioteca') renderLibrary();
  if (view === 'perfil')     renderPerfil();
}

// ══════════════════════════════════
// ICONOS (SVG en línea, sin fuentes externas)
// ══════════════════════════════════
const ICON = {
  play:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>',
  list:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="9" y1="7" x2="19" y2="7"/><line x1="9" y1="12" x2="19" y2="12"/><line x1="9" y1="17" x2="19" y2="17"/><circle cx="5" cy="7" r=".6" fill="currentColor"/><circle cx="5" cy="12" r=".6" fill="currentColor"/><circle cx="5" cy="17" r=".6" fill="currentColor"/></svg>',
  check: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>',
  flame: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3.5-1.5 5.3-2.6 7.2C8.2 11.3 8 13 9 14.5c-2-.3-3-2-3-3.8C4.2 12.3 3.5 14.3 3.5 16c0 3.9 3.8 6 8.5 6s8.5-2.4 8.5-6.6c0-4.8-4-6.4-4.9-10.4-1 1.8-1.4 3.2-1.2 4.6C12.8 8.3 13.8 5.2 12 2z"/></svg>',
  moon:  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  timer: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><polyline points="12 9 12 13 14.5 14.5"/><line x1="10" y1="2.5" x2="14" y2="2.5"/></svg>',
};

// ══════════════════════════════════
// HOY
// ══════════════════════════════════
function todayRoutines() {
  const dow = new Date().getDay();
  return S.routines.filter(r => !r.days || !r.days.length || r.days.includes(dow));
}

// La sesión de noche: la fuerza del día y los estiramientos, en una sola
// pasada. Estirar al final sirve de vuelta a la calma.
function nightSession() {
  const t = todayRoutines();
  const fza = t.filter(r => r.kind === 'fuerza');
  const mov = t.filter(r => r.kind === 'movilidad');
  return S.cfg.sessionOrder === 'estiramientos' ? [...mov, ...fza] : [...fza, ...mov];
}

function todayBlocks() {
  return todayRoutines().filter(r => r.kind === 'bloque')
    .sort((a, b) => (a.sheet || 0) - (b.sheet || 0));
}

function seedPending() {
  const seeded = S.routines.some(r => SEED_ROUTINES.some(s => s.id === r.id));
  return seeded && SEED_ROUTINES.some(s => !S.routines.some(r => r.id === s.id));
}

function renderHoy() {
  $('streak-badge-count').textContent = calcStreak();

  const empty = S.routines.length === 0;
  $('hoy-empty').classList.toggle('hidden', !empty);
  $('hoy-banner').innerHTML = seedPending() ? `
    <section class="card banner">
      <p class="eyebrow">Novedad</p>
      <p class="banner-text">Ya están la rutina de fuerza y los bloques de 10 minutos.</p>
      <button class="btn-primary btn-sm" onclick="seedRoutine()">Cargar rutinas</button>
    </section>` : '';

  renderHoySession();
  renderHoyBlocks();
  renderHoyOthers();
}

function renderHoySession() {
  const el = $('hoy-session');
  const parts = nightSession();
  if (!parts.length) { el.innerHTML = ''; return; }

  const sum   = routineSummary(parts);
  const done  = parts.every(r => isDone(r.id));
  const hasF  = parts.some(r => r.kind === 'fuerza');
  const hasM  = parts.some(r => r.kind === 'movilidad');
  const title = hasF && hasM
    ? (S.cfg.sessionOrder === 'estiramientos' ? 'Estiramientos y fuerza' : 'Fuerza y estiramientos')
    : parts[0].name;
  const week  = progWeek();
  const st    = progStage(week);
  const nEx   = parts.reduce((a, r) => a + r.items.length, 0);

  el.innerHTML = `
    <section class="card session-card ${done ? 'is-done' : ''}">
      <div class="card-top">
        <span class="tag">${ICON.moon} Sesión de hoy</span>
        ${done ? `<span class="tag tag-done">${ICON.check} Hecha</span>` : ''}
      </div>
      <h2 class="card-title">${esc(title)}</h2>
      <p class="card-meta">${nEx} ejercicios · ${DAY_LONG[new Date().getDay()]}</p>

      <div class="stat-row">
        <div class="stat">
          <p class="stat-val">${Math.round(sum.total / 60)}<span>min</span></p>
          <p class="stat-lbl">estimado</p>
        </div>
        ${hasF && S.cfg.progEnabled ? `
        <div class="stat">
          <p class="stat-val">${st.sets}×${st.reps}</p>
          <p class="stat-lbl">semana ${week} · liga ${st.band.toLowerCase()}</p>
        </div>` : `
        <div class="stat">
          <p class="stat-val">${Math.round(sum.work / 60)}<span>min</span></p>
          <p class="stat-lbl">de trabajo</p>
        </div>`}
      </div>

      <ul class="part-list">
        ${parts.map(r => {
          const s = routineSummary([r]);
          return `
          <li class="part-row">
            <button class="check-dot ${isDone(r.id) ? 'on' : ''}" onclick="toggleDone('${r.id}')" aria-label="Marcar como hecha">${ICON.check}</button>
            <div class="part-info">
              <p class="part-kind">${KIND_LABEL[r.kind] || 'Rutina'}</p>
              <p class="part-name">${esc(r.name.replace(/^Fuerza · /, ''))}</p>
              <p class="part-meta">${r.items.length} ejercicios · ~${fmtDuration(s.total)}</p>
            </div>
            <button class="icon-btn" onclick="openRun('${r.id}')" aria-label="Ver como lista">${ICON.list}</button>
            <button class="icon-btn" onclick="plOpen('${r.id}')" aria-label="Iniciar solo esta parte">${ICON.play}</button>
          </li>`;
        }).join('')}
      </ul>

      <button class="btn-primary" onclick="plOpen('${parts.map(r => r.id).join(',')}')">
        ${ICON.play} Iniciar sesión guiada
      </button>
    </section>`;
}

function renderHoyBlocks() {
  const el = $('hoy-blocks');
  const blocks = todayBlocks();
  if (!blocks.length) { el.innerHTML = ''; return; }
  const doneN = blocks.filter(r => isDone(r.id)).length;
  const next  = blocks.find(r => !isDone(r.id));
  const mode  = S.cfg.blqMode === 'circuit'
    ? `Circuito · ${fmtSecs(S.cfg.blqRestRound)} entre vueltas`
    : `Series seguidas · ${S.cfg.blqPasses} pasada${S.cfg.blqPasses !== 1 ? 's' : ''}`;

  el.innerHTML = `
    <section class="card">
      <div class="card-top">
        <span class="tag">${ICON.timer} Bloques de 10 min</span>
        <span class="tag tag-plain">${doneN} de ${blocks.length}</span>
      </div>
      <h2 class="card-title">${next ? `Sigue la ${esc(next.name.split(' · ')[0].toLowerCase())}` : 'Bloques completos'}</h2>
      <p class="card-meta">${mode}</p>
      <ul class="part-list">
        ${blocks.map(r => {
          const s = routineSummary([r]);
          const names = r.items.map(it => exById(it.exId)).filter(Boolean).map(e => e.name).join(' · ');
          return `
          <li class="part-row ${r === next ? 'is-next' : ''}">
            <button class="check-dot ${isDone(r.id) ? 'on' : ''}" onclick="toggleDone('${r.id}')" aria-label="Marcar como hecho">${ICON.check}</button>
            <div class="part-info">
              <p class="part-name">${esc(r.name.split(' · ')[0])} <span class="part-dur">~${fmtDuration(s.total)}</span></p>
              <p class="part-meta clamp">${esc(names)}</p>
            </div>
            <button class="icon-btn" onclick="plOpen('${r.id}')" aria-label="Iniciar ${esc(r.name)}">${ICON.play}</button>
          </li>`;
        }).join('')}
      </ul>
      ${next
        ? `<button class="btn-primary" onclick="plOpen('${next.id}')">${ICON.play} Iniciar ${esc(next.name.split(' · ')[0].toLowerCase())}</button>`
        : ''}
    </section>`;
}

function renderHoyOthers() {
  const el = $('hoy-others');
  const shown = new Set([...nightSession(), ...todayBlocks()].map(r => r.id));
  const others = S.routines.filter(r => !shown.has(r.id) && r.kind !== 'bloque');
  if (!others.length) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <h2 class="section-label">Otras rutinas</h2>
    <div class="card list-card">
      ${others.map(r => `
        <div class="list-row">
          <div class="part-info">
            <p class="part-name">${esc(r.name)}</p>
            <p class="part-meta">${r.items.length} ejercicios · ${fmtDays(r.days)}</p>
          </div>
          <button class="icon-btn" onclick="openRun('${r.id}')" aria-label="Ver como lista">${ICON.list}</button>
          <button class="icon-btn" onclick="plOpen('${r.id}')" aria-label="Iniciar">${ICON.play}</button>
        </div>`).join('')}
    </div>`;
}

// ══════════════════════════════════
// MODO LISTA
// ══════════════════════════════════
function openRun(routineId) {
  const r = S.routines.find(x => x.id === routineId);
  if (!r) return;
  S.runRoutineId = routineId;
  S.runChecked   = new Set();
  $('run-title').textContent = r.name;
  $('run-label').textContent = KIND_LABEL[r.kind] || 'Rutina';
  $('run-complete-btn').style.display = '';
  $('modal-run').classList.remove('hidden');
  renderRunBody();
}

function renderRunBody() {
  const r = S.routines.find(x => x.id === S.runRoutineId);
  if (!r) return;
  const total   = r.items.length;
  const checked = S.runChecked.size;
  $('run-progress-fill').style.width = (total ? checked / total * 100 : 0) + '%';
  $('run-footer-count').textContent =
    checked === total && total > 0 ? 'Todos completados' : `${checked} de ${total} completados`;

  $('run-body').innerHTML = r.items.map((item, i) => {
    const ex = exById(item.exId);
    if (!ex) return '';
    const done = S.runChecked.has(i);
    return `
      <div class="run-ex-item ${done ? 'checked' : ''}" onclick="toggleRunItem(${i})">
        <span class="run-n">${String(i + 1).padStart(2, '0')}</span>
        <div class="run-ex-body">
          <p class="run-ex-name">${esc(ex.name)}</p>
          <p class="run-ex-param">${fmtParams(item, ex)}${ex.setup ? ' · ' + esc(ex.setup) : ''}</p>
        </div>
        <button class="run-ex-info-btn" onclick="openExDetail(event,'${ex.id}','${r.id}',${i})" aria-label="Detalle">i</button>
        <div class="run-check">${ICON.check}</div>
      </div>`;
  }).join('');
}

function toggleRunItem(i) {
  if (S.runChecked.has(i)) S.runChecked.delete(i);
  else S.runChecked.add(i);
  renderRunBody();
}

function completeRun() {
  const r = S.routines.find(x => x.id === S.runRoutineId);
  if (r) markDone([r.id]);
  const streak = calcStreak();
  $('run-body').innerHTML = `
    <div class="run-complete-screen">
      <p class="eyebrow">Rutina completada</p>
      <h2 class="complete-title">${esc(r ? r.name : 'Rutina')}</h2>
      <p class="complete-sub">${streak > 1 ? `Racha de <strong>${streak} días</strong>.` : 'Primer día de racha.'}</p>
      <button class="btn-primary" onclick="closeRun()">Volver al inicio</button>
    </div>`;
  $('run-progress-fill').style.width = '100%';
  $('run-footer-count').textContent = '';
  $('run-complete-btn').style.display = 'none';
  launchConfetti();
  renderHoy();
  renderPerfil();
}

function closeRun() {
  $('modal-run').classList.add('hidden');
  renderHoy();
}

// ── DETALLE DE EJERCICIO ──
function openExDetail(e, exId, routineId, itemIdx) {
  if (e) e.stopPropagation();
  const ex = exById(exId);
  if (!ex) return;
  const routine = routineId ? S.routines.find(r => r.id === routineId) : null;
  const item = routine && routine.items[itemIdx] ? routine.items[itemIdx] : {};
  const r = rx(item, ex);
  const ill  = exIllustration(ex);
  const vars = exVariants(ex);
  const params = ex.type === 'time'
    ? [[r.duration, 's sostén'], [r.reps, 'repeticiones'], [r.sets, 'series']]
    : [[r.reps, r.alt ? 'reps alternando' : vars ? 'reps por lado' : 'repeticiones'], [r.sets, 'series'], [r.tempo, 's por rep']];

  $('ex-detail-content').innerHTML = `
    ${!ill
      ? `<div class="ex-detail-fallback">${getEmoji(ex.zone)}</div>`
      : `<div class="ex-detail-figure ${ill.kind === 'img' ? 'photo' : ''}"><img src="${ill.src}" alt=""/></div>`}
    <div class="ex-detail-body">
      <h2 class="ex-detail-name">${esc(ex.name)}</h2>
      <div class="chip-row">
        <span class="chip">${esc(ex.zone)}</span>
        ${ex.pos ? `<span class="chip">${esc(ex.pos)}</span>` : ''}
        ${r.band ? `<span class="chip chip-accent">Liga ${r.band.toLowerCase()}</span>` : ''}
      </div>
      ${vars ? `<div class="chip-row">${vars.map(v => `<span class="chip chip-accent">${esc(v)}</span>`).join('')}</div>` : ''}
      <div class="stat-row">
        ${params.map(([v, l]) => `<div class="stat"><p class="stat-val">${v}</p><p class="stat-lbl">${l}</p></div>`).join('')}
      </div>
      ${ex.setup ? `<div class="setup-box"><p class="eyebrow">Preparación</p><p>${esc(ex.setup)}</p></div>` : ''}
      ${r.hold ? `<p class="ex-detail-extra">Sostén ${r.hold} s en cada repetición.</p>` : ''}
      ${ex.notes ? `<p class="ex-detail-notes">${esc(ex.notes)}</p>` : ''}
    </div>`;
  $('modal-ex-detail').classList.remove('hidden');
}

function closeExDetail(e) {
  if (!e || e.target === $('modal-ex-detail')) $('modal-ex-detail').classList.add('hidden');
}

// ══════════════════════════════════
// BIBLIOTECA
// ══════════════════════════════════
function switchTab(tab) {
  S.libTab = tab;
  $('tab-rutinas').classList.toggle('active',    tab === 'rutinas');
  $('tab-ejercicios').classList.toggle('active', tab === 'ejercicios');
  $('panel-rutinas').classList.toggle('hidden',    tab !== 'rutinas');
  $('panel-ejercicios').classList.toggle('hidden', tab !== 'ejercicios');
}

function renderLibrary() {
  $('tab-rutinas-count').textContent = S.routines.length;
  $('tab-ejercicios-count').textContent = S.exercises.length;
  renderRoutineList();
  renderExerciseList();
}

function renderRoutineList() {
  const el = $('routine-list');
  if (S.routines.length === 0) {
    el.innerHTML = '<p class="empty-note">Aún no hay rutinas.</p>';
    return;
  }
  const groups = ['movilidad', 'fuerza', 'bloque', 'libre'];
  el.innerHTML = groups.map(kind => {
    const list = S.routines.filter(r => (r.kind || 'libre') === kind);
    if (!list.length) return '';
    return `
      <h2 class="section-label">${kind === 'bloque' ? 'Bloques de 10 min' : kind === 'libre' ? 'Rutinas propias' : KIND_LABEL[kind]}</h2>
      <div class="card list-card">
        ${list.map(r => `
          <div class="list-row">
            <div class="part-info" onclick="openEditRoutine('${r.id}')">
              <p class="part-name">${esc(r.name)}</p>
              <p class="part-meta">${r.items.length} ejercicio${r.items.length !== 1 ? 's' : ''} · ${fmtDays(r.days)}</p>
            </div>
            <button class="icon-btn" onclick="plOpen('${r.id}')" aria-label="Iniciar">${ICON.play}</button>
            <button class="icon-btn" onclick="openEditRoutine('${r.id}')" aria-label="Editar">${ICON.chevron}</button>
          </div>`).join('')}
      </div>`;
  }).join('');
}

function exCategory(ex) {
  if (ex.id.startsWith('mov_')) return 'estiramientos';
  if (ex.id.startsWith('fza_')) return 'fuerza';
  if (ex.id.startsWith('blq_')) return 'bloques';
  return 'propios';
}

function setExFilter(f) {
  S.exFilter = f;
  renderExerciseList();
}

function renderExerciseList() {
  const filters = [['todos','Todos'], ['estiramientos','Estiramientos'], ['fuerza','Fuerza'], ['bloques','Bloques'], ['propios','Propios']];
  $('ex-filter').innerHTML = filters.map(([k, l]) =>
    `<button class="chip-btn ${S.exFilter === k ? 'active' : ''}" onclick="setExFilter('${k}')">${l}</button>`).join('');

  const el = $('exercise-list');
  const q = ($('ex-search').value || '').trim().toLowerCase();
  const list = S.exercises.filter(ex =>
    (S.exFilter === 'todos' || exCategory(ex) === S.exFilter) &&
    (!q || ex.name.toLowerCase().includes(q) || (ex.zone || '').toLowerCase().includes(q)));

  if (list.length === 0) {
    el.innerHTML = `<p class="empty-note">${S.exercises.length ? 'Nada coincide con la búsqueda.' : 'Aún no hay ejercicios.'}</p>`;
    return;
  }
  el.innerHTML = list.map(ex => {
    const ill = exIllustration(ex);
    const thumb = !ill
      ? `<div class="ex-thumb ex-thumb-emoji">${getEmoji(ex.zone)}</div>`
      : `<div class="ex-thumb ${ill.kind === 'img' ? 'photo' : ''}"><img src="${ill.src}" alt="" loading="lazy"/></div>`;
    return `
      <div class="exercise-card" onclick="openExerciseForm('${ex.id}')">
        ${thumb}
        <div class="ex-card-info">
          <p class="ex-card-zone">${esc(ex.zone)}${ex.pos ? ' · ' + esc(ex.pos) : ''}</p>
          <p class="ex-card-name">${esc(ex.name)}</p>
          <p class="ex-card-meta">${fmtParams({}, ex)}</p>
        </div>
        <span class="ex-card-chev">${ICON.chevron}</span>
      </div>`;
  }).join('');
}

// ══════════════════════════════════
// FORMULARIO DE RUTINA
// ══════════════════════════════════
function openCreateRoutine() {
  S.editRoutineId   = null;
  S.editRoutineKind = 'libre';
  S.editRoutineDays = [];
  S.draftItems      = [];
  $('routine-name').value = '';
  $('routine-desc').value = '';
  $('routine-form-title').textContent = 'Nueva rutina';
  $('routine-delete-btn').style.display = 'none';
  renderRoutineMeta();
  renderDraftList();
  $('modal-routine').classList.remove('hidden');
}

function openEditRoutine(id) {
  const r = S.routines.find(x => x.id === id);
  if (!r) return;
  S.editRoutineId   = id;
  S.editRoutineKind = r.kind || 'libre';
  S.editRoutineDays = [...(r.days || [])];
  S.draftItems      = JSON.parse(JSON.stringify(r.items));
  $('routine-name').value = r.name;
  $('routine-desc').value = r.desc || '';
  $('routine-form-title').textContent = 'Editar rutina';
  $('routine-delete-btn').style.display = 'block';
  renderRoutineMeta();
  renderDraftList();
  $('modal-routine').classList.remove('hidden');
}

function closeRoutineForm() { $('modal-routine').classList.add('hidden'); }

function renderRoutineMeta() {
  const kinds = [['libre','Propia'], ['movilidad','Estiramientos'], ['fuerza','Fuerza'], ['bloque','Bloque']];
  $('routine-kind').innerHTML = kinds.map(([k, l]) =>
    `<button class="seg-btn ${S.editRoutineKind === k ? 'active' : ''}" onclick="setRoutineKind('${k}')">${l}</button>`).join('');
  $('routine-days').innerHTML = WEEK_ORDER.map(d =>
    `<button class="day-btn ${S.editRoutineDays.includes(d) ? 'active' : ''}" onclick="toggleRoutineDay(${d})" aria-label="${DAY_LONG[d]}">${DAY_SHORT[d]}</button>`).join('');
  $('routine-days-hint').textContent = S.editRoutineDays.length
    ? `Aparece en Hoy: ${WEEK_ORDER.filter(d => S.editRoutineDays.includes(d)).map(d => DAY_LONG[d]).join(', ')}.`
    : 'Sin días marcados: aparece todos los días.';
}

function setRoutineKind(k) { S.editRoutineKind = k; renderRoutineMeta(); }
function toggleRoutineDay(d) {
  const i = S.editRoutineDays.indexOf(d);
  if (i === -1) S.editRoutineDays.push(d); else S.editRoutineDays.splice(i, 1);
  renderRoutineMeta();
}

function renderDraftList() {
  const el = $('routine-ex-list');
  if (S.draftItems.length === 0) {
    el.innerHTML = '<p class="empty-note left">Sin ejercicios. Agrega desde el botón de arriba.</p>';
    return;
  }
  el.innerHTML = S.draftItems.map((item, i) => {
    const ex = exById(item.exId);
    if (!ex) return '';
    return `
      <div class="drag-item" draggable="true"
           ondragstart="dragStart(event,${i})" ondragover="dragOver(event,${i})"
           ondrop="dragDrop(event,${i})" ondragend="dragEnd(event)">
        <div class="drag-handle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg>
        </div>
        <div class="drag-info">
          <p class="drag-name">${esc(ex.name)}</p>
          <p class="drag-param">${fmtParams(item, ex)}${item.prog ? ' · progresión' : ''}</p>
        </div>
        <div class="move-btns">
          <button onclick="moveDraftItem(${i},-1)" aria-label="Subir">▲</button>
          <button onclick="moveDraftItem(${i},1)" aria-label="Bajar">▼</button>
        </div>
        <button class="remove-btn" onclick="removeDraftItem(${i})" aria-label="Quitar">×</button>
      </div>`;
  }).join('');
}

function moveDraftItem(i, d) {
  const j = i + d;
  if (j < 0 || j >= S.draftItems.length) return;
  [S.draftItems[i], S.draftItems[j]] = [S.draftItems[j], S.draftItems[i]];
  renderDraftList();
}

function removeDraftItem(i) {
  S.draftItems.splice(i, 1);
  renderDraftList();
}

function saveRoutine() {
  const name = $('routine-name').value.trim();
  const desc = $('routine-desc').value.trim();
  if (!name) { showToast('Ponle un nombre a la rutina'); return; }
  if (S.draftItems.length === 0) { showToast('Agrega al menos un ejercicio'); return; }
  const data = { name, desc, kind: S.editRoutineKind, days: S.editRoutineDays.length ? [...S.editRoutineDays] : null, items: S.draftItems };
  if (S.editRoutineId) {
    const idx = S.routines.findIndex(r => r.id === S.editRoutineId);
    if (idx !== -1) S.routines[idx] = { ...S.routines[idx], ...data };
  } else {
    S.routines.push({ id: uid(), ...data });
  }
  persist();
  renderLibrary();
  renderHoy();
  closeRoutineForm();
  showToast(S.editRoutineId ? 'Rutina actualizada' : 'Rutina creada');
}

function deleteRoutine() {
  if (!S.editRoutineId || !confirm('¿Eliminar esta rutina?')) return;
  S.routines = S.routines.filter(r => r.id !== S.editRoutineId);
  persist();
  renderLibrary();
  renderHoy();
  closeRoutineForm();
  showToast('Rutina eliminada');
}

// ── ARRASTRAR (escritorio) ──
let dragSrcIdx = null;
function dragStart(e, i) { dragSrcIdx = i; e.currentTarget.classList.add('drag-ghost'); }
function dragOver(e)     { e.preventDefault(); }
function dragDrop(e, i)  {
  e.preventDefault();
  if (dragSrcIdx === null || dragSrcIdx === i) return;
  const moved = S.draftItems.splice(dragSrcIdx, 1)[0];
  S.draftItems.splice(i, 0, moved);
  dragSrcIdx = null;
  renderDraftList();
}
function dragEnd() {
  dragSrcIdx = null;
  document.querySelectorAll('.drag-ghost').forEach(el => el.classList.remove('drag-ghost'));
}

// ══════════════════════════════════
// SELECTOR DE EJERCICIOS
// ══════════════════════════════════
function openExPicker() {
  S.pickerSel = S.draftItems.map(x => x.exId);
  $('picker-search').value = '';
  renderPicker();
  $('modal-picker').classList.remove('hidden');
}

function closePicker() { $('modal-picker').classList.add('hidden'); }

function renderPicker() {
  const q = $('picker-search').value.toLowerCase();
  const el = $('picker-list');
  const filtered = S.exercises.filter(ex =>
    !q || ex.name.toLowerCase().includes(q) || (ex.zone || '').toLowerCase().includes(q));
  if (filtered.length === 0) {
    el.innerHTML = '<p class="empty-note">Sin ejercicios. Crea ejercicios primero.</p>';
    return;
  }
  el.innerHTML = filtered.map(ex => {
    const on = S.pickerSel.includes(ex.id);
    return `
      <div class="picker-item ${on ? 'on' : ''}" onclick="togglePick('${ex.id}')">
        <div class="picker-info">
          <p class="picker-name">${esc(ex.name)}</p>
          <p class="picker-meta">${esc(ex.zone)} · ${fmtParams({}, ex)}</p>
        </div>
        <div class="picker-check">${ICON.check}</div>
      </div>`;
  }).join('');
}

function togglePick(id) {
  const idx = S.pickerSel.indexOf(id);
  if (idx === -1) S.pickerSel.push(id);
  else S.pickerSel.splice(idx, 1);
  renderPicker();
}

function confirmPicker() {
  S.draftItems = S.draftItems.filter(x => S.pickerSel.includes(x.exId));
  const existing = S.draftItems.map(x => x.exId);
  S.pickerSel.forEach(exId => {
    // null = hereda la prescripción del ejercicio (y sus cambios futuros)
    if (!existing.includes(exId) && exById(exId))
      S.draftItems.push({ exId, sets:null, reps:null, duration:null });
  });
  renderDraftList();
  closePicker();
}

// ══════════════════════════════════
// FORMULARIO DE EJERCICIO
// ══════════════════════════════════
function openExerciseForm(id) {
  S.editExId       = id || null;
  S.editExZone     = null;
  S.editExPos      = null;
  S.editExImg      = null;
  S.editExVarOrder = 'block';

  $('exercise-form-title').textContent = id ? 'Editar ejercicio' : 'Nuevo ejercicio';
  $('ex-delete-btn').style.display = id ? 'block' : 'none';
  ['ex-name','ex-duration','ex-sets-time','ex-holds','ex-reps','ex-sets-reps','ex-tempo','ex-hold','ex-setup','ex-notes','ex-variants']
    .forEach(k => { $(k).value = ''; });
  selectType('time');
  resetImgPreview();
  selectVarMode('none');
  selectVarOrder('block');

  if (id) {
    const ex = exById(id);
    if (!ex) return;
    $('ex-name').value  = ex.name;
    $('ex-notes').value = ex.notes || '';
    $('ex-setup').value = ex.setup || '';
    selectType(ex.type);
    S.editExZone = ex.zone;
    S.editExPos  = ex.pos || null;
    const v = Array.isArray(ex.variants) && ex.variants.length ? ex.variants : null;
    if (!v) selectVarMode('none');
    else if (v.length === 2 && v[0] === 'Izquierdo' && v[1] === 'Derecho') selectVarMode('lr');
    else { $('ex-variants').value = v.join(', '); selectVarMode('custom'); }
    selectVarOrder(ex.variantOrder || 'block');
    const r = rx({}, ex);
    if (ex.type === 'time') {
      $('ex-duration').value  = r.duration;
      $('ex-holds').value     = r.reps;
      $('ex-sets-time').value = r.sets;
    } else {
      $('ex-reps').value      = r.reps;
      $('ex-sets-reps').value = r.sets;
      $('ex-tempo').value     = ex.tempo || '';
      $('ex-hold').value      = ex.hold || '';
    }
    if (ex.img) { S.editExImg = ex.img; showImgPreview(ex.img); }
  }
  renderZones();
  renderPositions();
  $('modal-exercise').classList.remove('hidden');
}

function closeExerciseForm() { $('modal-exercise').classList.add('hidden'); }

function renderZones() {
  $('body-zones').innerHTML = ZONES.map(z =>
    `<button class="chip-btn ${S.editExZone === z ? 'active' : ''}" onclick="selectZone('${z}')">${z}</button>`).join('');
}
function selectZone(z) { S.editExZone = z; renderZones(); }

function renderPositions() {
  $('ex-positions').innerHTML = POSITIONS.map(p =>
    `<button class="chip-btn ${S.editExPos === p ? 'active' : ''}" onclick="selectPos('${p}')">${p}</button>`).join('');
}
function selectPos(p) { S.editExPos = S.editExPos === p ? null : p; renderPositions(); }

function selectVarMode(mode) {
  S.editExVarMode = mode;
  ['none','lr','custom'].forEach(m => $('var-btn-' + m).classList.toggle('active', m === mode));
  $('ex-variants').classList.toggle('hidden', mode !== 'custom');
  $('var-order-wrap').classList.toggle('hidden', mode === 'none');
}

function selectVarOrder(o) {
  S.editExVarOrder = o;
  ['block','cycle','series'].forEach(k => $('varord-btn-' + k).classList.toggle('active', o === k));
}

function readVariants() {
  if (S.editExVarMode === 'lr') return ['Izquierdo', 'Derecho'];
  if (S.editExVarMode !== 'custom') return null;
  const raw = $('ex-variants').value.split(',').map(s => s.trim()).filter(Boolean);
  return raw.length ? raw : null;
}

function selectType(t) {
  S.editExType = t;
  $('type-btn-time').classList.toggle('active', t === 'time');
  $('type-btn-reps').classList.toggle('active', t === 'reps');
  $('type-time-fields').classList.toggle('hidden', t !== 'time');
  $('type-reps-fields').classList.toggle('hidden', t !== 'reps');
}

function saveExercise() {
  const name = $('ex-name').value.trim();
  if (!name) { showToast('El ejercicio necesita un nombre'); return; }
  if (!S.editExZone) { showToast('Selecciona una zona del cuerpo'); return; }

  const isTime = S.editExType === 'time';
  const num = (id, parse = parseFloat) => { const v = parse($(id).value); return isNaN(v) ? null : v; };
  const dur  = num('ex-duration', parseInt);
  const reps = num(isTime ? 'ex-holds' : 'ex-reps', parseInt);
  const sets = num(isTime ? 'ex-sets-time' : 'ex-sets-reps', parseInt) || 1;

  if (isTime && !dur)  { showToast('Ingresa la duración en segundos'); return; }
  if (!isTime && !reps){ showToast('Ingresa las repeticiones'); return; }

  const exData = {
    name,
    zone:     S.editExZone,
    pos:      S.editExPos,
    type:     S.editExType,
    duration: isTime ? dur : null,
    reps:     isTime ? (reps || 1) : reps,
    sets,
    tempo:    isTime ? null : num('ex-tempo'),
    hold:     isTime ? null : num('ex-hold'),
    setup:    $('ex-setup').value.trim() || null,
    notes:    $('ex-notes').value.trim(),
    img:      S.editExImg || null,
    variants:     readVariants(),
    variantOrder: S.editExVarOrder || 'block',
  };

  if (S.editExId) {
    const idx = S.exercises.findIndex(e => e.id === S.editExId);
    if (idx !== -1) S.exercises[idx] = { ...S.exercises[idx], ...exData };
  } else {
    S.exercises.push({ id: uid(), ...exData });
  }
  persist();
  renderLibrary();
  renderHoy();
  closeExerciseForm();
  showToast(S.editExId ? 'Ejercicio actualizado' : 'Ejercicio guardado');
}

function deleteExercise() {
  if (!confirm('¿Eliminar este ejercicio? También se quitará de las rutinas que lo usen.')) return;
  S.exercises = S.exercises.filter(e => e.id !== S.editExId);
  S.routines  = S.routines.map(r => ({ ...r, items: r.items.filter(i => i.exId !== S.editExId) }));
  persist();
  renderLibrary();
  renderHoy();
  closeExerciseForm();
  showToast('Ejercicio eliminado');
}

// ── IMAGEN ──
function triggerImgUpload() { $('img-input').click(); }

function handleImgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { showToast('Imagen muy grande (máx 3 MB)'); return; }
  const reader = new FileReader();
  reader.onload = ev => { S.editExImg = ev.target.result; showImgPreview(ev.target.result); };
  reader.readAsDataURL(file);
}

function showImgPreview(src) {
  $('img-preview-wrap').innerHTML = `<img src="${src}" class="img-preview"/>`;
  $('img-remove-btn').style.display = 'block';
}

function resetImgPreview() {
  $('img-preview-wrap').innerHTML =
    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
     <p class="img-hint">Toca para agregar foto</p>`;
  $('img-remove-btn').style.display = 'none';
  $('img-input').value = '';
}

function removeImg() { S.editExImg = null; resetImgPreview(); }

// ══════════════════════════════════
// PERFIL
// ══════════════════════════════════
function renderPerfil() {
  const streak = calcStreak();
  $('streak-hero-num').textContent = streak;
  $('streak-hero-label').textContent = streak === 1 ? 'día de racha' : 'días de racha';
  const total = S.activeDays.length;
  const week = localDateStr(new Date(Date.now() - 6 * 86400000));
  const last7 = S.activeDays.filter(d => d >= week).length;
  $('streak-meta').textContent =
    `${total} día${total !== 1 ? 's' : ''} con práctica · ${last7} en los últimos 7`;

  renderHeatmap();
  renderColorPalette();
  renderPlayerSettings();
}

function renderHeatmap() {
  const weeks = 12;
  const today = new Date(todayStr() + 'T12:00:00');
  // la última columna termina hoy; cada columna es una semana de lunes a domingo
  const dowMon = (today.getDay() + 6) % 7;
  const cols = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - dowMon - w * 7 + d);
      const str = localDateStr(dt);
      const future = dt > today;
      const n = (S.doneLog[str] || []).length;
      const active = S.activeDays.includes(str);
      const lvl = future ? 'future' : !active ? '' : n >= 4 ? 'l4' : n >= 3 ? 'l3' : n >= 2 ? 'l2' : 'l1';
      cells.push(`<div class="heat-cell ${lvl} ${str === todayStr() ? 'today' : ''}" title="${str}"></div>`);
    }
    cols.push(`<div class="heat-col">${cells.join('')}</div>`);
  }
  $('heatmap-grid').innerHTML =
    `<div class="heat-col heat-days">${['L','M','M','J','V','S','D'].map(d => `<span>${d}</span>`).join('')}</div>` + cols.join('');
}

function renderColorPalette() {
  $('color-palette').innerHTML = ACCENT_COLORS.map((c, i) => `
    <button class="swatch ${S.accentIndex === i ? 'selected' : ''}" onclick="selectAccent(${i})" aria-label="${c.name}">
      <span style="background:${c.value}">${S.accentIndex === i ? ICON.check : ''}</span>
      <em>${c.name}</em>
    </button>`).join('');
}

function selectAccent(i) {
  S.accentIndex = i;
  applyAccent(i);
  persist();
  renderColorPalette();
}

// ══════════════════════════════════
// EXPORTAR / IMPORTAR
// ══════════════════════════════════
function exportData() {
  const payload = {
    version:     3,
    exportedAt:  new Date().toISOString(),
    exercises:   S.exercises,
    routines:    S.routines,
    activeDays:  S.activeDays,
    doneLog:     S.doneLog,
    accentIndex: S.accentIndex,
    cfg:         S.cfg,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `flowly_backup_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exportado');
}

function triggerImport() { $('import-input').click(); }

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (!d.exercises || !d.routines) throw new Error('formato inválido');
      if (!confirm('¿Importar backup? Se reemplazarán los datos actuales.')) return;
      S.exercises   = d.exercises  || [];
      S.routines    = d.routines   || [];
      S.activeDays  = d.activeDays || [];
      S.doneLog     = d.doneLog    || {};
      S.accentIndex = d.accentIndex ?? 0;
      if (d.cfg) S.cfg = { ...S.cfg, ...d.cfg };
      applyAccent(S.accentIndex);
      persist();
      renderHoy();
      renderLibrary();
      renderPerfil();
      showToast('Backup importado');
    } catch { showToast('Archivo inválido'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ══════════════════════════════════
// CONFETI (discreto: hojas que caen)
// ══════════════════════════════════
function launchConfetti() {
  const canvas = $('confetti-canvas');
  canvas.style.display = 'block';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const accent = (ACCENT_COLORS[S.accentIndex] || ACCENT_COLORS[0]).value;
  const colors = [accent, accent, '#A5D6A7', '#C9B79C', '#1B382B'];
  const leaves = Array.from({ length: 46 }, () => ({
    x: Math.random() * canvas.width, y: -20 - Math.random() * 120,
    s: 5 + Math.random() * 6, r: Math.random() * Math.PI * 2,
    rv: (Math.random() - .5) * .08, vx: (Math.random() - .5) * 1.2, vy: 1.4 + Math.random() * 1.8,
    sway: Math.random() * Math.PI * 2,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
  let frame = 0;
  const loop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    leaves.forEach(p => {
      p.sway += .05;
      p.x += p.vx + Math.sin(p.sway) * .6; p.y += p.vy; p.r += p.rv;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.s, p.s * .45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    frame++;
    if (frame < 150) requestAnimationFrame(loop);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
  };
  requestAnimationFrame(loop);
}

// ══════════════════════════════════
// TOAST
// ══════════════════════════════════
let _toastTimer;
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}

// ══════════════════════════════════
// MOTOR DE SECUENCIA
// Expande una o varias rutinas en la lista plana de pasos: sostenimientos
// ('hold'), series de repeticiones ('set') y descansos ('rest'). Cada
// descanso lleva `next`, el paso que prepara.
// ══════════════════════════════════
function restFor(kind, gap) {
  const c = S.cfg;
  const table = kind === 'fuerza'
    ? { rep:c.fzaRestRep, variant:c.fzaRestSide, set:c.fzaRestSet, ex:c.fzaRestEx }
    : kind === 'bloque'
      ? { rep:c.restRep, variant:c.restVariant, set:c.blqRestSet, ex:c.blqRestEx }
      : { rep:c.restRep, variant:c.restVariant, set:c.restVariant, ex:c.restEx };
  return table[gap] || 0;
}

// Unidades de un ejercicio completo, cada una con el tipo de pausa que la
// precede: 'ex' (primera), 'variant' (cambio de lado), 'set' o 'rep'.
function exerciseUnits(ex, r) {
  const vars = exVariants(ex, true) || [null];
  const n = vars.length;
  const H = ex.type === 'time' ? r.reps : 1;
  const time = ex.type === 'time';
  const units = [];
  const push = (variant, set, rep, gap) => units.push({ variant, set, rep, gap });

  if (r.order === 'series' && n > 1) {
    // una variante por serie: A, B, C
    for (let s = 1; s <= r.sets; s++)
      for (let h = 1; h <= H; h++) push(vars[(s - 1) % n], s, h, h > 1 ? 'rep' : 'set');
  } else if (r.order === 'cycle' && n > 1) {
    // alterna variantes; en fuerza el cambio de lado es el descanso
    for (let s = 1; s <= r.sets; s++)
      for (let h = 1; h <= H; h++)
        vars.forEach((v, vi) => push(v, s, h,
          vi > 0 ? 'variant' : h > 1 ? 'rep' : time ? 'set' : 'variant'));
  } else {
    // todas las series de una variante y luego la siguiente
    vars.forEach(v => {
      for (let s = 1; s <= r.sets; s++)
        for (let h = 1; h <= H; h++) push(v, s, h, h > 1 ? 'rep' : s > 1 ? 'set' : 'variant');
    });
  }
  if (units.length) units[0].gap = 'ex';
  return units;
}

// En circuito, lo que se hace de un ejercicio en una vuelta.
function roundUnits(ex, r, round) {
  const vars = exVariants(ex, true) || [null];
  const H = ex.type === 'time' ? r.reps : 1;
  const list = r.order === 'series' && vars.length > 1 ? [vars[(round - 1) % vars.length]] : vars;
  const units = [];
  list.forEach((v, vi) => {
    for (let h = 1; h <= H; h++) units.push({ variant: v, set: round, rep: h, gap: h > 1 ? 'rep' : vi > 0 ? 'variant' : 'ex' });
  });
  return units;
}

function makeStep(ex, r, u, meta) {
  const common = {
    ex, variant: u.variant, set: u.set, setTotal: meta.setTotal || r.sets,
    setLabel: meta.circuit ? 'Vuelta' : 'Serie',
    pos: ex.pos || null, band: r.band,
    routineId: meta.routine.id, routineName: meta.routine.name, rkind: meta.kind,
  };
  if (ex.type === 'time')
    return { ...common, kind: 'hold', seconds: r.duration, rep: u.rep, repTotal: r.reps };
  const perRep = r.tempo + r.hold;
  return { ...common, kind: 'set', seconds: r.reps * perRep, reps: r.reps, perRep,
           tempo: r.tempo, hold: r.hold, alt: r.alt };
}

function buildSteps(routines) {
  const c = S.cfg;
  const steps = [];
  let prev = null;

  const emit = (step, gap, meta, roundLabel) => {
    let secs, label;
    const sameEx = prev && prev.ex.id === step.ex.id;
    if (!prev) {
      secs = Math.max(restFor(meta.kind, 'ex'), 5); label = 'Prepárate'; gap = 'start';
    } else if (gap === 'routine') {
      secs = Math.max(restFor(meta.kind, 'ex'), c.restBlock); label = `Sigue: ${meta.routine.name}`;
    } else if (gap === 'round') {
      secs = c.blqRestRound; label = roundLabel;
    } else if (gap === 'ex') {
      const blockChange = !!(step.pos && prev.pos && step.pos !== prev.pos);
      secs  = blockChange ? Math.max(restFor(meta.kind, 'ex'), c.restBlock) : restFor(meta.kind, 'ex');
      label = blockChange ? `Cambio a: ${step.pos}` : 'Prepárate';
    } else if (gap === 'variant') {
      secs = restFor(meta.kind, 'variant'); label = step.variant ? `Cambia a: ${step.variant}` : 'Descanso';
    } else if (gap === 'set') {
      secs = restFor(meta.kind, 'set'); label = 'Descanso entre series';
    } else {
      secs = restFor(meta.kind, 'rep'); label = 'Descanso';
    }
    // el montaje se anuncia solo cuando cambia respecto al ejercicio anterior
    const setup = step.ex.setup && (!prev || (!sameEx && step.ex.setup !== prev.ex.setup)) ? step.ex.setup : null;
    if (secs > 0) steps.push({ kind: 'rest', seconds: secs, label, gap, next: step, setup });
    steps.push(step);
    prev = step;
  };

  routines.forEach((routine, ri) => {
    const kind = routine.kind || 'libre';
    const entries = routine.items
      .map(item => ({ item, ex: exById(item.exId) }))
      .filter(x => x.ex)
      .map(x => {
        const r = rx(x.item, x.ex);
        // Bloques: «10» puede ser por lado o repartido entre los dos lados.
        const v = exVariants(x.ex, true);
        if (kind === 'bloque' && c.blqSideReps === 'split' && v && v.length === 2 && r.order !== 'series')
          r.reps = Math.ceil(r.reps / 2);
        return { ...x, r };
      });
    if (!entries.length) return;

    let first = true;
    const circuit = kind === 'bloque' && c.blqMode === 'circuit';
    const meta = { routine, kind, circuit };
    const emitUnit = (e, u, setTotal, gap, roundLabel) => {
      const g = gap || (first && ri > 0 && steps.length ? 'routine' : u.gap);
      emit(makeStep(e.ex, e.r, u, { ...meta, setTotal }), g, meta, roundLabel);
      first = false;
    };

    if (circuit) {
      const R = Math.max(...entries.map(e => e.r.sets));
      for (let round = 1; round <= R; round++) {
        let firstInRound = true;
        entries.forEach(e => {
          if (round > e.r.sets) return;
          roundUnits(e.ex, e.r, round).forEach(u => {
            const g = firstInRound && round > 1 ? 'round' : null;
            emitUnit(e, u, R, g, `Descanso · vuelta ${round} de ${R}`);
            firstInRound = false;
          });
        });
      }
    } else {
      const passes = kind === 'bloque' ? Math.max(1, c.blqPasses) : 1;
      for (let pass = 1; pass <= passes; pass++) {
        entries.forEach((e, ei) => {
          exerciseUnits(e.ex, e.r).forEach((u, ui) => {
            const g = pass > 1 && ei === 0 && ui === 0 ? 'round' : null;
            emitUnit(e, u, null, g, `Descanso · repite la hoja (${pass} de ${passes})`);
          });
        });
      }
    }
  });

  return steps;
}

function isPerform(s) { return s.kind === 'hold' || s.kind === 'set'; }

// Resumen sin reproducir (para las tarjetas).
function routineSummary(routines) {
  const steps = buildSteps(Array.isArray(routines) ? routines : [routines]);
  const perf  = steps.filter(isPerform);
  return {
    steps,
    performs: perf.length,
    total: steps.reduce((a, s) => a + s.seconds, 0),
    work:  perf.reduce((a, s) => a + s.seconds, 0),
  };
}

// ══════════════════════════════════
// SEÑALES: sonido, voz, vibración, pantalla encendida
// ══════════════════════════════════
let _actx = null;
function beep(freq = 880, ms = 130, vol = .22) {
  if (!S.cfg.sound) return;
  try {
    _actx = _actx || new (window.AudioContext || window.webkitAudioContext)();
    if (_actx.state === 'suspended') _actx.resume();
    const o = _actx.createOscillator(), g = _actx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, _actx.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, _actx.currentTime + ms / 1000);
    o.connect(g); g.connect(_actx.destination);
    o.start(); o.stop(_actx.currentTime + ms / 1000);
  } catch (e) {}
}

function buzz(pattern) {
  if (!S.cfg.vibrate || !navigator.vibrate) return;
  try { navigator.vibrate(pattern); } catch (e) {}
}

function speak(text) {
  if (!S.cfg.voice || !text || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-MX';
    u.rate = 1.05;
    speechSynthesis.speak(u);
  } catch (e) {}
}

let _wakeLock = null;
async function acquireWakeLock() {
  try {
    if ('wakeLock' in navigator && !_wakeLock) {
      _wakeLock = await navigator.wakeLock.request('screen');
      _wakeLock.addEventListener('release', () => { _wakeLock = null; });
    }
  } catch (e) {}
}
function releaseWakeLock() {
  try { if (_wakeLock) _wakeLock.release(); } catch (e) {}
  _wakeLock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && S.pl && S.pl.playing) acquireWakeLock();
});

// ══════════════════════════════════
// REPRODUCTOR
// ══════════════════════════════════
const RING_C = 2 * Math.PI * 92;

function isManualSet(s) { return s && s.kind === 'set' && S.cfg.repMode === 'manual'; }

function plOpen(ids) {
  const list = (Array.isArray(ids) ? ids : String(ids).split(','))
    .map(id => S.routines.find(r => r.id === id)).filter(Boolean);
  if (!list.length) return;
  const steps = buildSteps(list);
  if (!steps.some(isPerform)) { showToast('Esta rutina no tiene ejercicios'); return; }

  let acc = 0;
  const offsets = steps.map(s => { const o = acc; acc += s.seconds; return o; });

  // Segmentos de la barra: por posición corporal; en los bloques, por vuelta.
  const keyOf = s => {
    const t = s.kind === 'rest' ? s.next : s;
    return t.rkind === 'bloque' ? `${t.routineId}#${t.set}` : `${t.routineId}|${t.pos || '—'}`;
  };
  const blocks = [];
  steps.forEach(s => {
    const key  = keyOf(s);
    const last = blocks[blocks.length - 1];
    if (last && last.key === key) last.seconds += s.seconds;
    else blocks.push({ key, seconds: s.seconds, offset: 0 });
  });
  let bo = 0;
  blocks.forEach(b => { b.offset = bo; bo += b.seconds; });

  S.pl = {
    routineIds: list.map(r => r.id),
    title: list.length > 1 ? 'Sesión de hoy' : list[0].name,
    steps, offsets, blocks, total: acc,
    performTotal: steps.filter(isPerform).length,
    i: 0, left: steps[0].seconds, playing: false,
    endAt: 0, tickId: null, lastSec: null, lastRep: null, inHold: false,
    skipFirstCount: false, finished: false,
  };

  $('pl-segments').innerHTML = blocks.map(b =>
    `<div class="pl-seg" style="flex:${b.seconds}"><div class="pl-seg-fill"></div></div>`).join('');

  $('modal-player').classList.remove('hidden');
  $('pl-done').classList.add('hidden');
  $('pl-stage').classList.remove('hidden');
  $('pl-controls').classList.remove('hidden');

  plRender();
  plAnnounce();
  plPlay();
}

function plClose() {
  plPause();
  releaseWakeLock();
  try { speechSynthesis.cancel(); } catch (e) {}
  S.pl = null;
  $('modal-player').classList.add('hidden');
  renderHoy();
}

function plPlay() {
  const p = S.pl; if (!p || p.finished) return;
  const s = p.steps[p.i];
  // Con avance manual el paso se queda en 0: reproducir pasa al siguiente.
  if (!isManualSet(s) && p.left <= 0.05) {
    plGo(p.i + 1);
    if (!S.pl || S.pl.finished) return;
  }
  p.playing = true;
  p.endAt   = Date.now() + p.left * 1000;
  clearInterval(p.tickId);
  p.tickId = setInterval(plTick, 100);
  acquireWakeLock();
  plPaintControls();
  beep(660, 90, .12);   // el primer gesto desbloquea el audio en móvil
}

function plPause() {
  const p = S.pl; if (!p) return;
  p.playing = false;
  clearInterval(p.tickId);
  p.tickId = null;
  releaseWakeLock();
  plPaintControls();
}

function plToggle() {
  const p = S.pl; if (!p) return;
  const s = p.steps[p.i];
  if (isManualSet(s)) {           // «Listo»: la serie se terminó
    beep(1040, 160, .24); buzz([120, 50, 120]);
    if (!p.playing) { p.playing = true; clearInterval(p.tickId); p.tickId = setInterval(plTick, 100); acquireWakeLock(); }
    return plGo(p.i + 1);
  }
  p.playing ? plPause() : plPlay();
}

function plTick() {
  const p = S.pl; if (!p || !p.playing) return;
  const s = p.steps[p.i];
  if (isManualSet(s)) return;
  p.left = (p.endAt - Date.now()) / 1000;

  if (p.left <= 0) {
    const worked = isPerform(s);
    beep(worked ? 1040 : 780, 200, .28);
    buzz(worked ? [140, 60, 140] : 90);
    if (S.cfg.autoAdvance) plGo(p.i + 1);
    else { p.left = 0; plPause(); plPaintTimer(); }
    return;
  }

  if (s.kind === 'set') {
    // cadencia: una cuenta por repetición, y un tono suave al empezar el sostén
    const el  = s.seconds - p.left;
    const rep = Math.min(s.reps, Math.floor(el / s.perRep) + 1);
    if (rep !== p.lastRep) {
      p.lastRep = rep;
      if (!(rep === 1 && p.skipFirstCount)) {
        if (S.cfg.voice && S.cfg.countVoice) speak(String(rep));
        else beep(620, 60, .14);
      }
    }
    if (s.hold) {
      const inHold = (el % s.perRep) >= s.tempo;
      if (inHold && !p.inHold) beep(990, 70, .1);
      p.inHold = inHold;
    }
  } else {
    const sec = Math.ceil(p.left);
    if (sec !== p.lastSec) {
      p.lastSec = sec;
      if (sec <= 3) { beep(760, 80, .16); buzz(45); }
    }
  }
  plPaintTimer();
}

function plGo(idx) {
  const p = S.pl; if (!p) return;
  if (idx >= p.steps.length) return plFinish();
  if (idx < 0) idx = 0;
  p.i       = idx;
  p.left    = p.steps[idx].seconds;
  p.lastSec = null;
  p.lastRep = null;
  p.inHold  = false;
  p.skipFirstCount = false;
  p.endAt   = Date.now() + p.left * 1000;
  plRender();
  plAnnounce();
}

function plNext() { const p = S.pl; if (p) plGo(p.i + 1); }
function plPrev() {
  const p = S.pl; if (!p) return;
  // si ya avanzó dentro del paso, el primer toque lo reinicia
  const step = p.steps[p.i];
  if (step && !isManualSet(step) && step.seconds - p.left > 2) plGo(p.i);
  else plGo(p.i - 1);
}

function lastPerformBefore(p, i) {
  for (let k = i - 1; k >= 0; k--) if (isPerform(p.steps[k])) return p.steps[k];
  return null;
}

function plAnnounce() {
  const p = S.pl, s = p.steps[p.i];
  if (!s) return;
  if (s.kind === 'rest') {
    const n = s.next;
    if (['variant', 'rep', 'set'].includes(s.gap)) return speak(s.label);
    return speak([s.label, n.ex.name, n.variant, s.setup ? `Prepara: ${s.setup}` : null].filter(Boolean).join('. '));
  }
  const prevStep = p.steps[p.i - 1];
  if (!prevStep || prevStep.kind !== 'rest') {
    // sin pausa previa: el nombre se dice aquí
    const pp = lastPerformBefore(p, p.i);
    if (!pp || pp.ex.id !== s.ex.id || pp.variant !== s.variant) {
      speak([s.ex.name, s.variant].filter(Boolean).join('. '));
      p.skipFirstCount = true;
      return;
    }
    if (s.kind === 'hold') speak(`Repetición ${s.rep}`);
    return;
  }
  if (s.kind === 'hold' && prevStep.gap === 'rep') speak(`Repetición ${s.rep}`);
  if (s.kind === 'hold' && prevStep.gap === 'set') speak(`Serie ${s.set}`);
}

function plRender() {
  const p = S.pl; if (!p) return;
  const s = p.steps[p.i];
  const resting = s.kind === 'rest';
  const t  = resting ? s.next : s;
  const ex = t.ex;
  $('player').classList.toggle('resting', resting);

  $('pl-routine').textContent = t.routineName;
  $('pl-block').textContent = t.setLabel === 'Vuelta' ? `Vuelta ${t.set} de ${t.setTotal}` : (t.pos || 'Sesión');

  // fase
  let phase;
  if (resting) phase = s.gap === 'round' ? 'Descanso largo' : s.gap === 'start' ? 'Preparación' : 'Descanso';
  else if (s.kind === 'hold') {
    phase = s.repTotal > 1 ? `Repetición ${s.rep} de ${s.repTotal}` : 'Sostén';
    if (s.setTotal > 1) phase += ` · ${s.setLabel} ${s.set} de ${s.setTotal}`;
  } else phase = `${s.setLabel} ${s.set} de ${s.setTotal}`;
  $('pl-phase').textContent = phase;

  // el bloque grande: lado, variante o qué hacer
  $('pl-side').textContent = resting ? s.label
    : t.variant || (t.kind === 'set' ? (t.alt ? 'Alternando lados' : `${t.reps} repeticiones`) : 'Sostén');

  $('pl-name-label').textContent = resting ? 'Sigue' : 'Ejercicio actual';
  $('pl-name').textContent = ex.name;

  const chips = [];
  if (ex.zone) chips.push(`<span class="chip">${esc(ex.zone)}</span>`);
  if (ex.pos)  chips.push(`<span class="chip">${esc(ex.pos)}</span>`);
  if (t.band)  chips.push(`<span class="chip chip-accent">Liga ${t.band.toLowerCase()}</span>`);
  if (t.kind === 'set') chips.push(`<span class="chip">${t.reps} reps${t.hold ? ` · sostén ${t.hold} s` : ''} · ${t.tempo} s c/u</span>`);
  if (resting && t.variant) chips.push(`<span class="chip chip-live">${esc(t.variant)}</span>`);
  $('pl-chips').innerHTML = chips.join('');

  const setupText = resting ? (s.setup || ex.setup) : ex.setup;
  $('pl-setup').classList.toggle('hidden', !setupText);
  $('pl-setup').classList.toggle('changed', !!(resting && s.setup));
  $('pl-setup').innerHTML = setupText ? `<p class="eyebrow">Preparación</p><p>${esc(setupText)}</p>` : '';

  const ill = exIllustration(ex);
  $('pl-figure').innerHTML = !ill
    ? `<div class="pl-figure-fallback">${getEmoji(ex.zone)}</div>`
    : `<img class="${ill.kind === 'img' ? 'photo' : ''}" src="${ill.src}" alt=""/>`;

  $('pl-note-label').textContent = resting ? 'Acomódate' : 'Indicación';
  $('pl-notes').textContent = ex.notes || '';
  $('pl-note-card').classList.toggle('hidden', !ex.notes);

  // Qué sigue: el próximo paso que cambie de ejercicio o de lado.
  const nx = resting ? null : p.steps.slice(p.i + 1).find(x =>
    isPerform(x) && (x.ex.id !== ex.id || x.variant !== t.variant));
  $('pl-next').innerHTML =
      resting ? `<button class="pl-plus" onclick="plAddTime(10)">+10 s</button>`
    : nx ? `<span class="pl-next-label">Sigue</span><span class="pl-next-name">${esc(nx.ex.name)}${nx.variant ? ' · ' + esc(nx.variant) : ''}</span>`
    : `<span class="pl-next-label">Último</span><span class="pl-next-name">ya casi terminas</span>`;

  plPaintTimer();
  plPaintControls();
}

// Alarga el paso actual (útil en los descansos, cuando la postura cuesta).
function plAddTime(sec) {
  const p = S.pl; if (!p) return;
  const b = p.blocks.find(x => p.offsets[p.i] >= x.offset && p.offsets[p.i] < x.offset + x.seconds);
  p.left += sec;
  p.steps[p.i].seconds += sec;
  p.total += sec;
  for (let k = p.i + 1; k < p.offsets.length; k++) p.offsets[k] += sec;
  if (b) {
    b.seconds += sec;
    p.blocks.forEach(x => { if (x.offset > b.offset) x.offset += sec; });
  }
  if (p.playing) p.endAt += sec * 1000;
  plPaintTimer();
}

function plPaintTimer() {
  const p = S.pl; if (!p) return;
  const s = p.steps[p.i];
  const left = Math.max(0, p.left);

  let big, unit, frac;
  if (isManualSet(s)) {
    big = s.reps; unit = s.alt ? 'repeticiones alternando' : 'repeticiones'; frac = 1;
  } else if (s.kind === 'set') {
    const el = s.seconds - left;
    big  = Math.min(s.reps, Math.floor(el / s.perRep) + 1);
    unit = `de ${s.reps}${s.hold && (el % s.perRep) >= s.tempo ? ' · sostén' : ''}`;
    frac = s.seconds ? left / s.seconds : 0;
  } else {
    big = Math.ceil(left); unit = 'segundos'; frac = s.seconds ? left / s.seconds : 0;
  }
  $('pl-timer').textContent = big;
  $('pl-unit').textContent  = unit;
  $('pl-ring-fill').style.strokeDashoffset = RING_C * (1 - frac);

  const elapsed = p.offsets[p.i] + (isManualSet(s) ? 0 : s.seconds - left);
  const segs = document.querySelectorAll('#pl-segments .pl-seg-fill');
  p.blocks.forEach((b, k) => {
    if (!segs[k]) return;
    const f = Math.max(0, Math.min(1, (elapsed - b.offset) / b.seconds));
    segs[k].style.width = (f * 100) + '%';
  });

  $('pl-elapsed').textContent = fmtClock(elapsed);
  $('pl-remain').textContent  = '−' + fmtClock(p.total - elapsed);
  const done = p.steps.slice(0, p.i + 1).filter(isPerform).length;
  $('pl-count').textContent = `${done} / ${p.performTotal}`;
}

function plPaintControls() {
  const p = S.pl; if (!p) return;
  const s = p.steps[p.i];
  const btn = $('pl-play');
  if (isManualSet(s)) {
    btn.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
    btn.setAttribute('aria-label', 'Listo');
  } else {
    btn.innerHTML = p.playing
      ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/></svg>`
      : `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l10.5-6.5z"/></svg>`;
    btn.setAttribute('aria-label', p.playing ? 'Pausar' : 'Reproducir');
  }
  $('pl-play-lbl').textContent = isManualSet(s) ? 'Listo' : p.playing ? 'Pausa' : 'Seguir';
}

function plFinish() {
  const p = S.pl; if (!p) return;
  plPause();
  p.finished = true;
  markDone(p.routineIds);
  const streak = calcStreak();
  const n = p.performTotal;

  $('pl-stage').classList.add('hidden');
  $('pl-controls').classList.add('hidden');
  $('pl-routine').textContent = p.title;
  $('pl-block').textContent = 'Completado';
  const done = $('pl-done');
  done.classList.remove('hidden');
  done.innerHTML = `
    <p class="eyebrow">Completado</p>
    <p class="pl-done-num">${n}</p>
    <p class="pl-done-lbl">${p.steps.some(x => x.kind === 'set') ? 'series y sostenimientos' : 'sostenimientos'}</p>
    <h2 class="complete-title">${esc(p.title)}</h2>
    <p class="complete-sub">Sesión cerrada en ${fmtDuration(p.total)}.<br>
      ${streak > 1 ? `Racha de <strong>${streak} días</strong>.` : 'Primer día de racha.'}</p>
    <button class="btn-primary" onclick="plClose()">Volver al inicio</button>`;
  document.querySelectorAll('#pl-segments .pl-seg-fill').forEach(el => el.style.width = '100%');
  $('player').classList.remove('resting');
  speak('Sesión completa. Buen trabajo.');
  buzz([200, 80, 200]);
  launchConfetti();
  renderPerfil();
}

// ══════════════════════════════════
// AJUSTES
// ══════════════════════════════════
function cfgRow(label, hint, control) {
  // los selectores de varias opciones van debajo del texto, a todo lo ancho
  const stack = control.includes('class="seg');
  return `
    <div class="cfg-row ${stack ? 'stack' : ''}">
      <div class="cfg-text"><p class="cfg-label">${label}</p>${hint ? `<p class="cfg-hint">${hint}</p>` : ''}</div>
      ${control}
    </div>`;
}
function cfgToggleCtl(key) {
  return `<button class="switch ${S.cfg[key] ? 'on' : ''}" onclick="cfgToggle('${key}')" role="switch" aria-checked="${!!S.cfg[key]}"><span></span></button>`;
}
function cfgStepCtl(key, min, max, step, fmt = fmtSecs) {
  return `
    <div class="stepper">
      <button onclick="cfgStep('${key}',${-step},${min},${max})" aria-label="Menos">−</button>
      <span>${fmt(S.cfg[key])}</span>
      <button onclick="cfgStep('${key}',${step},${min},${max})" aria-label="Más">+</button>
    </div>`;
}
function cfgChoiceCtl(key, options) {
  return `
    <div class="seg seg-sm">
      ${options.map(([v, l]) => `<button class="seg-btn ${S.cfg[key] === v ? 'active' : ''}" onclick="cfgSet('${key}','${v}')">${l}</button>`).join('')}
    </div>`;
}

function renderPlayerSettings() {
  const c = S.cfg;
  const week = progWeek(), st = progStage(week);

  $('cfg-session').innerHTML =
    cfgRow('Orden de la sesión de noche', 'Estirar al final funciona como vuelta a la calma',
      cfgChoiceCtl('sessionOrder', [['fuerza', 'Fuerza primero'], ['estiramientos', 'Estirar primero']])) +
    cfgRow('Avance automático', 'Pasa solo al terminar cada tiempo', cfgToggleCtl('autoAdvance')) +
    cfgRow('Sonido', 'Tonos al cambiar de paso y en los últimos 3 s', cfgToggleCtl('sound')) +
    cfgRow('Voz', 'Dice el ejercicio, el lado y qué preparar', cfgToggleCtl('voice')) +
    cfgRow('Vibración', 'Solo en teléfono', cfgToggleCtl('vibrate')) +
    cfgRow('Solo un lado', 'Salta el segundo lado de los ejercicios unilaterales', cfgToggleCtl('oneSide'));

  $('cfg-stretch').innerHTML =
    cfgRow('Entre repeticiones', 'Soltar y volver a la postura', cfgStepCtl('restRep', 0, 30, 1)) +
    cfgRow('Entre lados', 'Cambio de pierna o variante', cfgStepCtl('restVariant', 0, 60, 1)) +
    cfgRow('Entre ejercicios', 'Acomodarte en la nueva postura', cfgStepCtl('restEx', 0, 120, 5)) +
    cfgRow('Cambio de posición', 'De pie → piso, o entre rutinas', cfgStepCtl('restBlock', 0, 180, 5));

  $('cfg-strength').innerHTML =
    cfgRow('Progresión', c.progEnabled
        ? `Semana ${week}: ${st.sets} × ${st.reps} con liga ${st.band.toLowerCase()}`
        : 'Apagada: se usa la cantidad base de cada lámina',
      cfgToggleCtl('progEnabled')) +
    (c.progEnabled ? cfgRow('Semana actual', 'Ajusta si empezaste antes o quieres repetir una etapa', `
      <div class="stepper">
        <button onclick="progShift(-1)" aria-label="Semana anterior">−</button>
        <span>S${week}</span>
        <button onclick="progShift(1)" aria-label="Semana siguiente">+</button>
      </div>`) : '') +
    cfgRow('Repeticiones', c.repMode === 'manual' ? 'Tocas «Listo» al terminar cada serie' : 'Cuenta en voz alta y avanza sola',
      cfgChoiceCtl('repMode', [['cadence', 'Cadencia'], ['manual', 'Manual']])) +
    (c.repMode === 'cadence'
      ? cfgRow('Cadencia', 'Segundos por repetición (subir y bajar lento)', cfgStepCtl('repTempo', 1.5, 6, .5, v => `${v} s`)) +
        cfgRow('Contar en voz alta', 'Si está apagado, marca cada repetición con un tono', cfgToggleCtl('countVoice'))
      : '') +
    cfgRow('Entre lados', 'El otro lado descansa mientras trabajas', cfgStepCtl('fzaRestSide', 0, 60, 1)) +
    cfgRow('Entre series', 'En los ejercicios de ambos lados', cfgStepCtl('fzaRestSet', 0, 120, 5)) +
    cfgRow('Entre sostenimientos', 'Planchas', cfgStepCtl('fzaRestRep', 0, 60, 1)) +
    cfgRow('Entre ejercicios', 'Incluye montar la liga', cfgStepCtl('fzaRestEx', 0, 120, 5));

  $('cfg-blocks').innerHTML =
    cfgRow('Modo', c.blqMode === 'circuit'
        ? 'Una vuelta por los 4 ejercicios = una serie; descanso entre vueltas'
        : 'Todas las series de cada ejercicio; descanso y se repite la hoja',
      cfgChoiceCtl('blqMode', [['circuit', 'Circuito'], ['straight', 'Series seguidas']])) +
    cfgRow('Ejercicios de un lado', c.blqSideReps === 'each'
        ? 'Las 10 repeticiones con cada lado'
        : 'Las 10 repeticiones repartidas: 5 con cada lado',
      cfgChoiceCtl('blqSideReps', [['each', '10 por lado'], ['split', '5 y 5']])) +
    cfgRow(c.blqMode === 'circuit' ? 'Descanso entre vueltas' : 'Descanso antes de repetir', 'La indicación es de 2 min',
      cfgStepCtl('blqRestRound', 0, 300, 15)) +
    (c.blqMode === 'straight'
      ? cfgRow('Pasadas por la hoja', 'Cuántas veces se repite la hoja completa',
          cfgStepCtl('blqPasses', 1, 4, 1, v => `${v}`)) +
        cfgRow('Entre series', '', cfgStepCtl('blqRestSet', 0, 60, 5))
      : '') +
    cfgRow('Entre ejercicios', '', cfgStepCtl('blqRestEx', 0, 60, 5));
}

function cfgAfterChange() {
  persist();
  renderPlayerSettings();
  renderHoy();
}

function cfgToggle(key) { S.cfg[key] = !S.cfg[key]; cfgAfterChange(); }
function cfgSet(key, v) { S.cfg[key] = v; cfgAfterChange(); }
function cfgStep(key, delta, min, max) {
  const v = Math.round(((S.cfg[key] || 0) + delta) * 10) / 10;
  S.cfg[key] = Math.min(max, Math.max(min, v));
  cfgAfterChange();
}

// Mover la semana es mover la fecha de inicio de la progresión.
function progShift(delta) {
  const week = progWeek();
  if (week + delta < 1) return;
  S.cfg.progStart = addDays(S.cfg.progStart || todayStr(), -delta * 7);
  cfgAfterChange();
}

// ══════════════════════════════════
// SEMILLA: rutinas del plan
// Idempotente: refresca el contenido, respeta las fotos propias y los días
// que el usuario haya cambiado.
// ══════════════════════════════════
function seedRoutine() {
  let added = 0;
  ALL_SEED_EXERCISES.forEach(ex => {
    const i = S.exercises.findIndex(e => e.id === ex.id);
    if (i === -1) { S.exercises.push({ ...ex }); added++; }
    else S.exercises[i] = { ...ex, img: S.exercises[i].img };
  });

  SEED_ROUTINES.forEach(seed => {
    const copy = JSON.parse(JSON.stringify(seed));
    const i = S.routines.findIndex(r => r.id === seed.id);
    if (i === -1) S.routines.push(copy);
    else S.routines[i] = { ...copy, days: S.routines[i].days !== undefined ? S.routines[i].days : copy.days };
  });

  // las sembradas primero, en el orden del plan; después las propias
  const order = SEED_ROUTINES.map(r => r.id);
  S.routines.sort((a, b) => {
    const ia = order.indexOf(a.id), ib = order.indexOf(b.id);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });

  if (!S.cfg.progStart) S.cfg.progStart = todayStr();

  persist();
  renderHoy();
  renderLibrary();
  renderPerfil();
  showToast(added ? `Rutinas cargadas · ${added} ejercicios nuevos` : 'Rutinas actualizadas');
  navigate('hoy');
}
