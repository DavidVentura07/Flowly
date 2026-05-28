// ===== FLOWLY APP.JS =====

// ---- STATE ----
let state = {
  currentView: 'home',
  filter: 'Todos',
  routines: [],
  completedDays: [],
  streak: 0,
  accentColor: null,
  notifEnabled: false,
  notifTime: '08:00',
  // Routine builder
  editingRoutineId: null,
  selectedExercises: [],   // [{exId, sets, reps, duration}]
  pickerSelection: [],     // exIds
  // Player
  playerRoutine: null,
  playerIndex: 0,
  playerSetIndex: 0,
  playerTimer: null,
  playerTimeLeft: 0,
  playerRepsCount: 0,
};

// ---- STORAGE ----
function save() {
  localStorage.setItem('flowly_data', JSON.stringify({
    routines: state.routines,
    completedDays: state.completedDays,
    streak: state.streak,
    accentColor: state.accentColor,
    notifEnabled: state.notifEnabled,
    notifTime: state.notifTime,
  }));
}

function load() {
  const raw = localStorage.getItem('flowly_data');
  if (raw) {
    const d = JSON.parse(raw);
    state.routines = d.routines || DEFAULT_ROUTINES;
    state.completedDays = d.completedDays || [];
    state.streak = d.streak || 0;
    state.accentColor = d.accentColor || null;
    state.notifEnabled = d.notifEnabled || false;
    state.notifTime = d.notifTime || '08:00';
  } else {
    state.routines = JSON.parse(JSON.stringify(DEFAULT_ROUTINES));
  }
}

// ---- ACCENT COLOR ----
function applyAccent(color) {
  const found = ACCENT_COLORS.find(c => c.value === color) || ACCENT_COLORS[0];
  document.documentElement.style.setProperty('--accent', found.value);
  document.documentElement.style.setProperty('--accent-light', found.light);
  document.documentElement.style.setProperty('--accent-mid', found.mid);
  // theme-color meta
  document.querySelector('meta[name="theme-color"]').setAttribute('content', found.value);
}

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  load();
  applyAccent(state.accentColor || ACCENT_COLORS[0].value);

  setTimeout(() => {
    document.getElementById('splash').classList.add('hide');
    setTimeout(() => {
      document.getElementById('splash').style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
      initApp();
    }, 400);
  }, 1200);
});

function initApp() {
  setGreeting();
  recalcStreak();
  renderHome();
  renderExercises();
  renderRoutines();
  renderProfile();
  renderFilterChips();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

// ---- GREETING ----
function setGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Buenos días ☀️' : h < 19 ? 'Buenas tardes 🌤' : 'Buenas noches 🌙';
  document.getElementById('greeting').textContent = greet;
}

// ---- STREAK CALCULATION ----
function recalcStreak() {
  const today = todayStr();
  const days = [...state.completedDays].sort();
  let streak = 0;
  let check = today;
  for (let i = 0; i < 365; i++) {
    if (days.includes(check)) {
      streak++;
      check = prevDay(check);
    } else { break; }
  }
  state.streak = streak;
  save();
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function prevDay(str) {
  const d = new Date(str + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function markTodayDone() {
  const today = todayStr();
  if (!state.completedDays.includes(today)) {
    state.completedDays.push(today);
    recalcStreak();
    save();
    renderHome();
    renderProfile();
  }
}

// ---- HOME ----
function renderHome() {
  document.getElementById('streak-display').textContent = state.streak;
  renderStreakDots();

  // Rutina rápida del día
  const section = document.getElementById('home-routine-section');
  const card = document.getElementById('home-routine-card');
  const todayDone = state.completedDays.includes(todayStr());
  if (state.routines.length > 0) {
    const r = state.routines[0];
    const exCount = r.exercises.length;
    const mins = estimateMinutes(r.exercises);
    card.innerHTML = `
      <div class="routine-hero">
        <div>
          <p class="routine-hero-title">${r.name}</p>
          <p class="routine-hero-meta">${exCount} ejercicios · ~${mins} min</p>
        </div>
        ${todayDone
          ? `<span style="background:rgba(255,255,255,.25);color:white;padding:8px 16px;border-radius:24px;font-size:12px;font-weight:600">✓ Completado hoy</span>`
          : `<button class="routine-hero-btn" onclick="startRoutine('${r.id}')">▶ Iniciar</button>`
        }
      </div>`;
  } else {
    card.innerHTML = `<div class="empty-state"><p>No tienes rutinas aún.</p><button class="btn-accent" style="margin-top:12px" onclick="navigate('rutinas')">Crear rutina</button></div>`;
  }

  // Mis rutinas mini-lista
  const myR = document.getElementById('home-my-routines');
  if (state.routines.length > 1) {
    myR.innerHTML = state.routines.slice(1).map(r => `
      <div class="routine-card" style="margin-bottom:10px">
        <div class="routine-card-info">
          <p class="routine-card-name">${r.name}</p>
          <p class="routine-card-meta">${r.exercises.length} ejercicios · ~${estimateMinutes(r.exercises)} min</p>
        </div>
        <button class="btn-accent" onclick="startRoutine('${r.id}')" style="padding:8px 14px;font-size:12px">▶</button>
      </div>`).join('');
  } else {
    myR.innerHTML = '';
  }
}

function renderStreakDots() {
  const container = document.getElementById('streak-dots');
  const today = new Date();
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const str = d.toISOString().slice(0, 10);
    const done = state.completedDays.includes(str);
    const isToday = i === 0;
    html += `<div class="streak-dot ${done ? 'done' : ''} ${isToday && !done ? 'today' : ''}"></div>`;
  }
  container.innerHTML = html;
}

function estimateMinutes(exercises) {
  let secs = 0;
  exercises.forEach(ex => {
    const data = EXERCISES.find(e => e.id === ex.exId);
    if (!data) return;
    const sets = ex.sets || data.defaultSets || 1;
    if (data.type === 'time') {
      secs += (ex.duration || data.defaultDuration) * sets + 10 * (sets - 1);
    } else {
      secs += (ex.reps || data.defaultReps) * 3 * sets + 15 * (sets - 1);
    }
    secs += 8;
  });
  return Math.max(1, Math.round(secs / 60));
}

// ---- EXERCISES VIEW ----
const BODIES = ['Todos', 'Cadera', 'Isquiotibiales', 'Hombros', 'Aductores', 'Glúteos', 'Columna', 'Costados', 'Cuello', 'Cuádriceps', 'Muñecas'];

function renderFilterChips() {
  const container = document.getElementById('filter-chips');
  container.innerHTML = BODIES.map(b =>
    `<button class="chip ${state.filter === b ? 'active' : ''}" onclick="setFilter('${b}')">${b}</button>`
  ).join('');
}

function setFilter(f) {
  state.filter = f;
  renderFilterChips();
  renderExercises();
}

function filterExercises() {
  renderExercises();
}

function toggleSearch() {
  const bar = document.getElementById('search-bar');
  bar.style.display = bar.style.display === 'none' ? 'block' : 'none';
  if (bar.style.display === 'block') document.getElementById('search-input').focus();
}

function renderExercises() {
  const query = (document.getElementById('search-input')?.value || '').toLowerCase();
  const list = document.getElementById('exercise-list');
  const filtered = EXERCISES.filter(ex => {
    const matchBody = state.filter === 'Todos' || ex.body === state.filter;
    const matchSearch = !query || ex.name.toLowerCase().includes(query) || ex.body.toLowerCase().includes(query);
    return matchBody && matchSearch;
  });
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><p>No hay ejercicios con ese filtro.</p></div>';
    return;
  }
  list.innerHTML = filtered.map(ex => exerciseCard(ex)).join('') + '<div style="height:16px"></div>';
}

function exerciseCard(ex) {
  const typeLabel = ex.type === 'time' ? `${ex.defaultDuration} seg` : `${ex.defaultReps} reps`;
  return `<div class="exercise-card" onclick="openExercise('${ex.id}')">
    <div class="exercise-thumb">${ex.thumbnail ? `<img src="${ex.thumbnail}" alt="${ex.name}"/>` : ex.emoji}</div>
    <div class="exercise-info">
      <p class="exercise-name">${ex.name}</p>
      <div class="exercise-meta">
        <span class="exercise-tag">${ex.body}</span>
        <span>${typeLabel}</span>
        <span>${ex.defaultSets} sets</span>
      </div>
    </div>
    <svg class="exercise-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
  </div>`;
}

// ---- EXERCISE DETAIL MODAL ----
function openExercise(id) {
  const ex = EXERCISES.find(e => e.id === id);
  if (!ex) return;
  const modal = document.getElementById('modal-exercise');
  const content = document.getElementById('exercise-modal-content');
  const typeLabel = ex.type === 'time' ? `${ex.defaultDuration}` : `${ex.defaultReps}`;
  const typeUnit = ex.type === 'time' ? 'seg' : 'reps';

  const videoBlock = ex.videoId
    ? `<div class="exercise-detail-video">
        <iframe src="https://www.youtube.com/embed/${ex.videoId}?start=${ex.videoStart}&rel=0&modestbranding=1"
          title="${ex.name}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
       </div>`
    : `<div class="video-placeholder">
        <span style="font-size:32px">${ex.emoji}</span>
        <p style="font-size:12px;color:var(--text-3);margin-top:8px">Video próximamente</p>
       </div>`;

  content.innerHTML = `
    ${videoBlock}
    <h2 class="exercise-detail-name">${ex.name}</h2>
    <div class="exercise-detail-tags">
      <span class="detail-tag">${ex.body}</span>
      <span class="detail-tag">${ex.type === 'time' ? 'Tiempo' : 'Repeticiones'}</span>
    </div>
    <p class="exercise-detail-desc">${ex.description}</p>
    <div class="exercise-detail-params">
      <div class="param-box">
        <p class="param-val">${typeLabel}</p>
        <p class="param-label">${typeUnit}</p>
      </div>
      <div class="param-box">
        <p class="param-val">${ex.defaultSets}</p>
        <p class="param-label">sets</p>
      </div>
    </div>
    ${ex.tips ? `<div style="background:var(--accent-light);border-radius:var(--radius-sm);padding:12px 14px;margin-bottom:20px"><p style="font-size:12px;font-weight:700;color:var(--accent);margin-bottom:4px">💡 Consejo</p><p style="font-size:13px;color:var(--text-2)">${ex.tips}</p></div>` : ''}
    <div style="height:16px"></div>`;
  modal.classList.remove('hidden');
}

function closeExerciseModal(e) {
  if (e.target === document.getElementById('modal-exercise') || !e) {
    document.getElementById('modal-exercise').classList.add('hidden');
  }
}

// ---- ROUTINE LIST ----
function renderRoutines() {
  const list = document.getElementById('routine-list');
  if (state.routines.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Aún no tienes rutinas.</p><p style="color:var(--text-3)">Crea tu primera rutina combinando los ejercicios que más te gusten.</p><button class="btn-accent" style="margin-top:16px" onclick="openCreateRoutine()">Crear rutina</button></div>`;
    return;
  }
  list.innerHTML = state.routines.map(r => `
    <div class="routine-card">
      <div class="routine-card-info">
        <p class="routine-card-name">${r.name}</p>
        <p class="routine-card-meta">${r.exercises.length} ejercicios · ~${estimateMinutes(r.exercises)} min</p>
      </div>
      <div class="routine-card-actions">
        <button class="btn-ghost" onclick="startRoutine('${r.id}')">▶ Iniciar</button>
        <button class="btn-ghost" onclick="editRoutine('${r.id}')">✎</button>
        <button class="btn-ghost" style="color:#ef4444;border-color:#fecaca" onclick="deleteRoutine('${r.id}')">✕</button>
      </div>
    </div>`).join('') + '<div style="height:16px"></div>';
}

function deleteRoutine(id) {
  if (!confirm('¿Eliminar esta rutina?')) return;
  state.routines = state.routines.filter(r => r.id !== id);
  save();
  renderRoutines();
  renderHome();
  showToast('Rutina eliminada');
}

// ---- CREATE / EDIT ROUTINE ----
function openCreateRoutine() {
  state.editingRoutineId = null;
  state.selectedExercises = [];
  document.getElementById('routine-name-input').value = '';
  document.getElementById('routine-modal-title').textContent = 'Nueva rutina';
  renderSelectedList();
  document.getElementById('modal-routine').classList.remove('hidden');
}

function editRoutine(id) {
  const r = state.routines.find(x => x.id === id);
  if (!r) return;
  state.editingRoutineId = id;
  state.selectedExercises = JSON.parse(JSON.stringify(r.exercises));
  document.getElementById('routine-name-input').value = r.name;
  document.getElementById('routine-modal-title').textContent = 'Editar rutina';
  renderSelectedList();
  document.getElementById('modal-routine').classList.remove('hidden');
}

function renderSelectedList() {
  const el = document.getElementById('routine-selected-list');
  if (state.selectedExercises.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text-3);text-align:center;padding:12px 0">Sin ejercicios aún</p>';
    return;
  }
  el.innerHTML = state.selectedExercises.map((item, i) => {
    const ex = EXERCISES.find(e => e.id === item.exId);
    if (!ex) return '';
    const isTime = ex.type === 'time';
    return `<div class="routine-ex-item">
      <span style="font-size:18px">${ex.emoji}</span>
      <span class="routine-ex-name">${ex.name}</span>
      <div class="routine-ex-params">
        <div style="text-align:center">
          <input class="param-input" type="number" min="1" value="${item.sets || ex.defaultSets}" onchange="updateExParam(${i},'sets',this.value)"/>
          <p class="param-mini-label">sets</p>
        </div>
        <div style="text-align:center">
          ${isTime
            ? `<input class="param-input" type="number" min="5" value="${item.duration || ex.defaultDuration}" onchange="updateExParam(${i},'duration',this.value)"/><p class="param-mini-label">seg</p>`
            : `<input class="param-input" type="number" min="1" value="${item.reps || ex.defaultReps}" onchange="updateExParam(${i},'reps',this.value)"/><p class="param-mini-label">reps</p>`
          }
        </div>
      </div>
      <button class="remove-ex-btn" onclick="removeFromRoutine(${i})">×</button>
    </div>`;
  }).join('');
}

function updateExParam(index, param, val) {
  state.selectedExercises[index][param] = parseInt(val) || 1;
}

function removeFromRoutine(index) {
  state.selectedExercises.splice(index, 1);
  renderSelectedList();
}

function saveRoutine() {
  const name = document.getElementById('routine-name-input').value.trim();
  if (!name) { showToast('Ponle un nombre a tu rutina'); return; }
  if (state.selectedExercises.length === 0) { showToast('Agrega al menos un ejercicio'); return; }
  if (state.editingRoutineId) {
    const idx = state.routines.findIndex(r => r.id === state.editingRoutineId);
    if (idx !== -1) {
      state.routines[idx].name = name;
      state.routines[idx].exercises = state.selectedExercises;
    }
  } else {
    state.routines.unshift({ id: 'r_' + Date.now(), name, exercises: state.selectedExercises, createdAt: Date.now() });
  }
  save();
  renderRoutines();
  renderHome();
  document.getElementById('modal-routine').classList.add('hidden');
  showToast(state.editingRoutineId ? 'Rutina actualizada' : 'Rutina creada ✓');
}

function closeRoutineModal(e) {
  if (e.target === document.getElementById('modal-routine')) {
    document.getElementById('modal-routine').classList.add('hidden');
  }
}

// ---- EXERCISE PICKER ----
function openExercisePicker() {
  state.pickerSelection = state.selectedExercises.map(x => x.exId);
  document.getElementById('picker-search').value = '';
  renderPicker();
  document.getElementById('modal-picker').classList.remove('hidden');
}

function renderPicker() {
  const query = document.getElementById('picker-search').value.toLowerCase();
  const list = document.getElementById('picker-list');
  const filtered = EXERCISES.filter(ex => !query || ex.name.toLowerCase().includes(query) || ex.body.toLowerCase().includes(query));
  list.innerHTML = filtered.map(ex => {
    const checked = state.pickerSelection.includes(ex.id);
    return `<div class="picker-item" onclick="togglePicker('${ex.id}')">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:20px">${ex.emoji}</span>
        <div>
          <p style="font-size:13px;font-weight:500">${ex.name}</p>
          <p style="font-size:11px;color:var(--text-3)">${ex.body} · ${ex.type === 'time' ? ex.defaultDuration + ' seg' : ex.defaultReps + ' reps'}</p>
        </div>
      </div>
      <div class="picker-check ${checked ? 'checked' : ''}" id="check_${ex.id}"></div>
    </div>`;
  }).join('');
}

function togglePicker(id) {
  const idx = state.pickerSelection.indexOf(id);
  if (idx === -1) state.pickerSelection.push(id);
  else state.pickerSelection.splice(idx, 1);
  renderPicker();
}

function confirmPicker() {
  const existing = state.selectedExercises.map(x => x.exId);
  state.pickerSelection.forEach(exId => {
    if (!existing.includes(exId)) {
      const ex = EXERCISES.find(e => e.id === exId);
      state.selectedExercises.push({
        exId,
        sets: ex.defaultSets,
        reps: ex.defaultReps,
        duration: ex.defaultDuration
      });
    }
  });
  // Remover los que se desmarcaron
  state.selectedExercises = state.selectedExercises.filter(x => state.pickerSelection.includes(x.exId));
  renderSelectedList();
  document.getElementById('modal-picker').classList.add('hidden');
}

function closePickerModal(e) {
  if (e.target === document.getElementById('modal-picker')) {
    document.getElementById('modal-picker').classList.add('hidden');
  }
}

// ---- PLAYER ----
function startRoutine(routineId) {
  const r = state.routines.find(x => x.id === routineId);
  if (!r || r.exercises.length === 0) { showToast('Esta rutina no tiene ejercicios'); return; }
  state.playerRoutine = r;
  state.playerIndex = 0;
  state.playerSetIndex = 0;
  stopTimer();
  document.getElementById('player-routine-name').textContent = r.name;
  document.getElementById('modal-player').classList.remove('hidden');
  renderPlayer();
}

function renderPlayer() {
  const r = state.playerRoutine;
  const item = r.exercises[state.playerIndex];
  const ex = EXERCISES.find(e => e.id === item.exId);
  const totalEx = r.exercises.length;
  const sets = item.sets || ex.defaultSets;
  const content = document.getElementById('player-content');

  const playerVideoBlock = ex.videoId
    ? `<div class="player-video">
        <iframe src="https://www.youtube.com/embed/${ex.videoId}?start=${ex.videoStart}&rel=0&modestbranding=1"
          title="${ex.name}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
       </div>`
    : `<div class="player-video" style="background:var(--bg);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px">
        <span style="font-size:48px">${ex.emoji}</span>
        <p style="font-size:12px;color:var(--text-3)">Video próximamente</p>
       </div>`;

  let progressDots = r.exercises.map((_, i) =>
    `<div class="prog-dot ${i < state.playerIndex ? 'done' : i === state.playerIndex ? 'current' : ''}"></div>`
  ).join('');

  let setTracker = '';
  for (let s = 0; s < sets; s++) {
    const cls = s < state.playerSetIndex ? 'done' : s === state.playerSetIndex ? 'current' : '';
    setTracker += `<div class="set-pill ${cls}">Set ${s + 1}</div>`;
  }

  let controlWidget = '';
  if (ex.type === 'time') {
    const dur = item.duration || ex.defaultDuration;
    const timeLeft = state.playerTimeLeft > 0 ? state.playerTimeLeft : dur;
    const pct = timeLeft / dur;
    const r_ = 60, circ = 2 * Math.PI * r_;
    const offset = circ * (1 - pct);
    controlWidget = `
      <div class="timer-circle-wrap">
        <div class="timer-circle">
          <svg viewBox="0 0 140 140" width="140" height="140">
            <circle class="timer-track" cx="70" cy="70" r="${r_}"/>
            <circle class="timer-fill" id="timer-fill-circle" cx="70" cy="70" r="${r_}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>
          </svg>
          <div class="timer-text">
            <span class="timer-seconds" id="timer-display">${timeLeft}</span>
            <span class="timer-label-sm">segundos</span>
          </div>
        </div>
      </div>`;
  } else {
    const reps = item.reps || ex.defaultReps;
    state.playerRepsCount = state.playerRepsCount || 0;
    controlWidget = `
      <div class="reps-counter">
        <p style="font-size:12px;color:var(--text-3);text-transform:uppercase;letter-spacing:.5px">Meta: ${reps} reps</p>
        <p class="reps-display" id="reps-display">${state.playerRepsCount}</p>
        <div class="reps-controls">
          <button class="reps-btn" onclick="changeReps(-1)">−</button>
          <button class="reps-btn" onclick="changeReps(1)">+</button>
        </div>
      </div>`;
  }

  content.innerHTML = `
    <div class="player-body">
      <div class="player-progress">${progressDots}</div>
      ${playerVideoBlock}
      <h2 class="player-ex-name">${ex.name}</h2>
      <p class="player-meta">${ex.body} · Ejercicio ${state.playerIndex + 1} de ${totalEx}</p>
      <div class="set-tracker">${setTracker}</div>
      ${controlWidget}
      <div class="player-controls">
        <button class="player-btn-skip" onclick="skipExercise()">Saltar</button>
        <button class="player-btn-next" onclick="nextSet()" id="player-next-btn">
          ${state.playerSetIndex < sets - 1 ? 'Siguiente set →' : state.playerIndex < totalEx - 1 ? 'Siguiente ejercicio →' : '¡Completar! ✓'}
        </button>
      </div>
    </div>`;

  if (ex.type === 'time') {
    startTimer(item.duration || ex.defaultDuration);
  }
}

// Timer
function startTimer(seconds) {
  stopTimer();
  if (state.playerTimeLeft <= 0) state.playerTimeLeft = seconds;
  const total = seconds;
  updateTimerDisplay(state.playerTimeLeft, total);
  state.playerTimer = setInterval(() => {
    state.playerTimeLeft--;
    updateTimerDisplay(state.playerTimeLeft, total);
    if (state.playerTimeLeft <= 0) {
      stopTimer();
      vibrate();
      nextSet();
    }
  }, 1000);
}

function stopTimer() {
  if (state.playerTimer) { clearInterval(state.playerTimer); state.playerTimer = null; }
}

function updateTimerDisplay(t, total) {
  const disp = document.getElementById('timer-display');
  const fill = document.getElementById('timer-fill-circle');
  if (disp) disp.textContent = Math.max(0, t);
  if (fill) {
    const r_ = 60, circ = 2 * Math.PI * r_;
    fill.style.strokeDashoffset = circ * (1 - t / total);
  }
}

function vibrate() {
  if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
}

function changeReps(delta) {
  state.playerRepsCount = Math.max(0, (state.playerRepsCount || 0) + delta);
  const el = document.getElementById('reps-display');
  if (el) el.textContent = state.playerRepsCount;
}

function nextSet() {
  stopTimer();
  const r = state.playerRoutine;
  const item = r.exercises[state.playerIndex];
  const ex = EXERCISES.find(e => e.id === item.exId);
  const sets = item.sets || ex.defaultSets;
  state.playerTimeLeft = 0;
  state.playerRepsCount = 0;

  if (state.playerSetIndex < sets - 1) {
    state.playerSetIndex++;
    renderPlayer();
  } else {
    state.playerSetIndex = 0;
    if (state.playerIndex < r.exercises.length - 1) {
      state.playerIndex++;
      renderPlayer();
    } else {
      showCompletion();
    }
  }
}

function skipExercise() {
  stopTimer();
  state.playerTimeLeft = 0;
  state.playerRepsCount = 0;
  state.playerSetIndex = 0;
  const r = state.playerRoutine;
  if (state.playerIndex < r.exercises.length - 1) {
    state.playerIndex++;
    renderPlayer();
  } else {
    showCompletion();
  }
}

function showCompletion() {
  markTodayDone();
  const content = document.getElementById('player-content');
  const streakMsg = state.streak > 1 ? `🔥 ¡Llevas <strong>${state.streak} días</strong> seguidos!` : '¡Sigue así mañana!';
  content.innerHTML = `
    <div class="completion-screen">
      <p class="completion-emoji">🎉</p>
      <h2 class="completion-title">¡Rutina completada!</h2>
      <p class="completion-sub">${streakMsg}</p>
      <button class="btn-accent full-btn" style="margin-bottom:12px" onclick="closePlayer()">Volver al inicio</button>
    </div>`;
}

function closePlayer() {
  stopTimer();
  state.playerTimeLeft = 0;
  state.playerRepsCount = 0;
  document.getElementById('modal-player').classList.add('hidden');
}

// ---- PROFILE ----
function renderProfile() {
  const total = state.completedDays.length;
  document.getElementById('profile-stats').innerHTML = `
    <div class="stat-item">
      <p class="stat-num">${state.streak}</p>
      <p class="stat-label">racha</p>
    </div>
    <div class="stat-item">
      <p class="stat-num">${total}</p>
      <p class="stat-label">sesiones</p>
    </div>
    <div class="stat-item">
      <p class="stat-num">${state.routines.length}</p>
      <p class="stat-label">rutinas</p>
    </div>`;
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayD = today.getDate();
  let html = '';
  for (let i = 0; i < firstDay; i++) html += '<div class="cal-day"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const str = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const done = state.completedDays.includes(str);
    const isToday = d === todayD;
    html += `<div class="cal-day ${done ? 'done' : ''} ${isToday && !done ? 'today' : ''}">${d}</div>`;
  }
  grid.innerHTML = html;
}

// ---- SETTINGS ----
function openSettings() {
  renderColorPalette();
  const notifToggle = document.getElementById('notif-toggle');
  notifToggle.checked = state.notifEnabled;
  document.getElementById('notif-time').value = state.notifTime;
  document.getElementById('notif-time-row').style.display = state.notifEnabled ? 'flex' : 'none';
  document.getElementById('modal-settings').classList.remove('hidden');
}

function closeSettings(e) {
  if (e.target === document.getElementById('modal-settings') || !e.target) {
    document.getElementById('modal-settings').classList.add('hidden');
  }
}

function renderColorPalette() {
  const container = document.getElementById('color-palette');
  const current = state.accentColor || ACCENT_COLORS[0].value;
  container.innerHTML = ACCENT_COLORS.map(c => `
    <div class="color-swatch ${current === c.value ? 'selected' : ''}"
      style="background:${c.value}" title="${c.name}"
      onclick="selectAccent('${c.value}')"></div>`).join('');
}

function selectAccent(value) {
  state.accentColor = value;
  applyAccent(value);
  save();
  renderColorPalette();
  showToast('Color actualizado');
}

// ---- NOTIFICATIONS ----
function toggleNotifications(el) {
  if (el.checked) {
    if ('Notification' in window) {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          state.notifEnabled = true;
          document.getElementById('notif-time-row').style.display = 'flex';
          scheduleNotification();
          save();
          showToast('Notificaciones activadas');
        } else {
          el.checked = false;
          showToast('Permiso denegado');
        }
      });
    }
  } else {
    state.notifEnabled = false;
    document.getElementById('notif-time-row').style.display = 'none';
    save();
    showToast('Notificaciones desactivadas');
  }
}

function saveNotifTime(val) {
  state.notifTime = val;
  save();
  if (state.notifEnabled) scheduleNotification();
}

function scheduleNotification() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const [h, m] = state.notifTime.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;
  setTimeout(() => {
    new Notification('¡Flowly te recuerda! 🧘', {
      body: 'Es hora de tu sesión de estiramiento.',
      icon: 'icons/icon-180.png'
    });
    if (state.notifEnabled) scheduleNotification();
  }, delay);
}

// ---- EXPORT / IMPORT ----
function exportData() {
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    routines: state.routines,
    completedDays: state.completedDays,
    streak: state.streak,
    accentColor: state.accentColor,
    notifTime: state.notifTime,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `flowly_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exportado ✓');
}

function importData() {
  document.getElementById('import-file').click();
}

function processImport(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.routines) throw new Error('Formato inválido');
      if (!confirm('¿Importar backup? Se reemplazarán tus datos actuales.')) return;
      state.routines = data.routines || [];
      state.completedDays = data.completedDays || [];
      state.streak = data.streak || 0;
      if (data.accentColor) { state.accentColor = data.accentColor; applyAccent(data.accentColor); }
      if (data.notifTime) state.notifTime = data.notifTime;
      save();
      recalcStreak();
      renderHome();
      renderRoutines();
      renderProfile();
      showToast('Backup importado ✓');
    } catch {
      showToast('Archivo inválido');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ---- NAVIGATION ----
function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const el = document.getElementById(`view-${view}`);
  if (el) el.classList.add('active');
  const btn = document.querySelector(`[data-view="${view}"]`);
  if (btn) btn.classList.add('active');
  state.currentView = view;
  // Refresh views on navigate
  if (view === 'home') renderHome();
  if (view === 'ejercicios') renderExercises();
  if (view === 'rutinas') renderRoutines();
  if (view === 'perfil') renderProfile();
}

// ---- TOAST ----
let toastTimeout;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.add('hidden'), 2500);
}
