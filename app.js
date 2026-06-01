// ══════════════════════════════════
// FLOWLY v2 — APP LOGIC
// ══════════════════════════════════

// ── STATE ──
let S = {
  exercises:    [],   // { id, name, zone, type, duration, sets, reps, notes, img }
  routines:     [],   // { id, name, desc, items: [{exId, sets, reps, duration}] }
  activeDays:   [],   // ['2025-05-01', ...]  días en que se hizo al menos un ejercicio
  accentIndex:  0,
  // ephemeral
  currentView:  'hoy',
  libTab:       'rutinas',
  editRoutineId: null,
  editExId:      null,
  draftItems:    [],   // [{exId, sets, reps, duration}]  while building routine
  pickerSel:     [],   // exIds selected in picker
  editExType:    'time',
  editExZone:    null,
  editExImg:     null,
  runRoutineId:  null,
  runChecked:    new Set(),
};

// ── PERSIST ──
function persist() {
  localStorage.setItem('flowly2', JSON.stringify({
    exercises:   S.exercises,
    routines:    S.routines,
    activeDays:  S.activeDays,
    accentIndex: S.accentIndex,
  }));
}

function hydrate() {
  try {
    const raw = localStorage.getItem('flowly2');
    if (!raw) return;
    const d = JSON.parse(raw);
    S.exercises   = d.exercises   || [];
    S.routines    = d.routines    || [];
    S.activeDays  = d.activeDays  || [];
    S.accentIndex = d.accentIndex ?? 0;
  } catch(e) { console.warn('hydrate error', e); }
}

// ── ACCENT ──
function applyAccent(idx) {
  const c = ACCENT_COLORS[idx] || ACCENT_COLORS[0];
  const r = document.documentElement.style;
  r.setProperty('--accent',       c.value);
  r.setProperty('--accent-light', c.light);
  r.setProperty('--accent-mid',   c.mid);
  r.setProperty('--accent-dim',   hexToRgba(c.value, .12));
  document.getElementById('theme-color-meta').content = c.value;
}

function hexToRgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;
}

// ── UTILS ──
function uid() { return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,7); }
function todayStr() { return new Date().toISOString().slice(0,10); }
function fmtDate(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' });
}
function getEmoji(zone) { return ZONE_EMOJI[zone] || '🌿'; }
function fmtParams(item, ex) {
  if (!ex) return '';
  const sets  = item.sets     ?? ex.sets     ?? 1;
  const dur   = item.duration ?? ex.duration ?? 0;
  const reps  = item.reps     ?? ex.reps     ?? 0;
  const parts = [];
  if (sets > 1) parts.push(`${sets} series`);
  if (ex.type === 'time')  parts.push(`${dur}s`);
  if (ex.type === 'reps')  parts.push(`${reps} reps`);
  return parts.join(' · ');
}

// ── STREAK ──
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

function prevDay(str) {
  const d = new Date(str + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0,10);
}

function markActiveToday() {
  const t = todayStr();
  if (!S.activeDays.includes(t)) {
    S.activeDays.push(t);
    persist();
  }
}

// ── INIT ──
window.addEventListener('DOMContentLoaded', () => {
  hydrate();
  applyAccent(S.accentIndex);

  setTimeout(() => {
    document.getElementById('splash').classList.add('out');
    setTimeout(() => {
      document.getElementById('splash').style.display = 'none';
      document.getElementById('app').classList.remove('hidden');
      initViews();
    }, 500);
  }, 1100);
});

function initViews() {
  setGreeting();
  renderHoy();
  renderLibrary();
  renderPerfil();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}

// ── GREETING ──
function setGreeting() {
  const h = new Date().getHours();
  const greet = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('hoy-greeting').textContent = greet;
  document.getElementById('hoy-date').textContent =
    new Date().toLocaleDateString('es-MX', { weekday:'long', day:'numeric', month:'long' });
}

// ── NAVIGATE ──
function navigate(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('view-' + view);
  if (el) el.classList.add('active');
  const btn = document.querySelector(`[data-view="${view}"]`);
  if (btn) btn.classList.add('active');
  S.currentView = view;
  if (view === 'hoy')       renderHoy();
  if (view === 'biblioteca') renderLibrary();
  if (view === 'perfil')    renderPerfil();
}

// ══════════════════════════════════
// HOY VIEW
// ══════════════════════════════════
function renderHoy() {
  const streak = calcStreak();
  document.getElementById('streak-badge-count').textContent = streak;

  const list = document.getElementById('hoy-routines-list');
  const empty = document.getElementById('hoy-empty');

  if (S.routines.length === 0) {
    list.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  list.innerHTML = S.routines.map(r => {
    const preview = r.items.slice(0, 4).map(item => {
      const ex = S.exercises.find(e => e.id === item.exId);
      if (!ex) return '';
      return `<div class="hoy-preview-ex">
        <div class="hoy-preview-dot"></div>
        <span>${ex.name} <span style="color:var(--text-3)">${fmtParams(item, ex)}</span></span>
      </div>`;
    }).join('');
    const more = r.items.length > 4
      ? `<div class="hoy-preview-ex"><div class="hoy-preview-dot" style="background:var(--border2)"></div><span style="color:var(--text-3)">+${r.items.length - 4} más…</span></div>`
      : '';
    return `
      <div class="hoy-routine-card">
        <div class="hoy-routine-card-accent"></div>
        <div class="hoy-routine-card-body">
          <h2 class="hoy-routine-name">${r.name}</h2>
          <p class="hoy-routine-meta">${r.items.length} ejercicio${r.items.length !== 1 ? 's' : ''}</p>
          <div class="hoy-routine-preview">${preview}${more}</div>
          <button class="btn-primary" onclick="openRun('${r.id}')">Iniciar rutina</button>
        </div>
      </div>`;
  }).join('');
}

// ══════════════════════════════════
// RUN MODAL
// ══════════════════════════════════
function openRun(routineId) {
  const r = S.routines.find(x => x.id === routineId);
  if (!r) return;
  S.runRoutineId = routineId;
  S.runChecked   = new Set();
  document.getElementById('run-title').textContent = r.name;
  document.getElementById('modal-run').classList.remove('hidden');
  renderRunBody();
}

function renderRunBody() {
  const r = S.routines.find(x => x.id === S.runRoutineId);
  if (!r) return;
  const total   = r.items.length;
  const checked = S.runChecked.size;
  const pct     = total > 0 ? (checked / total) * 100 : 0;

  document.getElementById('run-progress-fill').style.width = pct + '%';
  document.getElementById('run-footer-count').textContent =
    checked === total && total > 0
      ? '¡Todos completados! 🎉'
      : `${checked} de ${total} completados`;

  const body = document.getElementById('run-body');
  body.innerHTML = r.items.map((item, i) => {
    const ex = S.exercises.find(e => e.id === item.exId);
    if (!ex) return '';
    const done = S.runChecked.has(i);
    const params = fmtParams(item, ex);
    return `
      <div class="run-ex-item ${done ? 'checked' : ''}" id="run-item-${i}" onclick="toggleRunItem(${i})">
        <div class="run-ex-emoji">${getEmoji(ex.zone)}</div>
        <div class="run-ex-body">
          <p class="run-ex-name">${ex.name}</p>
          <div class="run-ex-params">
            ${params ? `<span class="run-ex-param">${params}</span>` : ''}
          </div>
        </div>
        <div class="run-check-circle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <button class="run-ex-info-btn" onclick="openExDetail(event,'${ex.id}')">i</button>
      </div>`;
  }).join('');
}

function toggleRunItem(i) {
  if (S.runChecked.has(i)) S.runChecked.delete(i);
  else {
    S.runChecked.add(i);
    markActiveToday();
  }
  renderRunBody();
}

function completeRun() {
  markActiveToday();
  const r = S.routines.find(x => x.id === S.runRoutineId);
  const name = r ? r.name : 'rutina';
  const streak = calcStreak();
  const body = document.getElementById('run-body');
  body.innerHTML = `
    <div class="run-complete-screen">
      <p class="complete-emoji">🎉</p>
      <h2 class="complete-title">¡Sesión lista!</h2>
      <p class="complete-sub">${name} completada.<br>
        ${streak > 1 ? `🔥 Llevas <strong>${streak} días</strong> de racha.` : '¡Gran inicio de racha!'}</p>
      <button class="btn-primary" onclick="closeRun()">Volver al inicio</button>
    </div>`;
  document.getElementById('run-progress-fill').style.width = '100%';
  document.getElementById('run-footer-count').textContent = '';
  document.getElementById('run-complete-btn').style.display = 'none';
  launchConfetti();
  renderHoy();
  renderPerfil();
}

function closeRun() {
  document.getElementById('modal-run').classList.add('hidden');
  document.getElementById('run-complete-btn').style.display = '';
  renderHoy();
}

// ── EX DETAIL (from run) ──
function openExDetail(e, exId) {
  e.stopPropagation();
  const ex = S.exercises.find(x => x.id === exId);
  if (!ex) return;
  const sets = ex.sets || 1;
  const val  = ex.type === 'time' ? ex.duration : ex.reps;
  const unit = ex.type === 'time' ? 'seg' : 'reps';
  const content = document.getElementById('ex-detail-content');
  content.innerHTML = `
    ${ex.img ? `<img class="ex-detail-img" src="${ex.img}" alt="${ex.name}"/>` : `<div style="width:100%;aspect-ratio:16/9;background:var(--accent-dim);border-radius:var(--radius-sm) var(--radius-sm) 0 0;display:flex;align-items:center;justify-content:center;font-size:52px;margin-bottom:16px">${getEmoji(ex.zone)}</div>`}
    <h2 class="ex-detail-name">${ex.name}</h2>
    <div class="ex-detail-tags">
      <span class="ex-detail-tag">${ex.zone}</span>
      <span class="ex-detail-tag">${ex.type === 'time' ? 'Tiempo' : 'Repeticiones'}</span>
    </div>
    <div class="ex-detail-params">
      <div class="ex-detail-param">
        <p class="ex-detail-param-val">${val || '—'}</p>
        <p class="ex-detail-param-label">${unit}</p>
      </div>
      <div class="ex-detail-param">
        <p class="ex-detail-param-val">${sets}</p>
        <p class="ex-detail-param-label">series</p>
      </div>
    </div>
    ${ex.notes ? `<p class="ex-detail-notes">${ex.notes}</p>` : ''}`;
  document.getElementById('modal-ex-detail').classList.remove('hidden');
}

function closeExDetail(e) {
  if (e.target === document.getElementById('modal-ex-detail')) {
    document.getElementById('modal-ex-detail').classList.add('hidden');
  }
}

// ══════════════════════════════════
// BIBLIOTECA
// ══════════════════════════════════
function switchTab(tab) {
  S.libTab = tab;
  document.getElementById('tab-rutinas').classList.toggle('active',    tab === 'rutinas');
  document.getElementById('tab-ejercicios').classList.toggle('active', tab === 'ejercicios');
  document.getElementById('panel-rutinas').classList.toggle('hidden',    tab !== 'rutinas');
  document.getElementById('panel-ejercicios').classList.toggle('hidden', tab !== 'ejercicios');
}

function renderLibrary() {
  renderRoutineList();
  renderExerciseList();
}

// ── ROUTINE LIST ──
function renderRoutineList() {
  const el = document.getElementById('routine-list');
  if (S.routines.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text-3);text-align:center;padding:12px 0">Aún no hay rutinas.</p>';
    return;
  }
  el.innerHTML = S.routines.map(r => `
    <div class="routine-card">
      <div class="routine-card-body">
        <div class="routine-card-info">
          <p class="routine-card-name">${r.name}</p>
          <p class="routine-card-meta">${r.items.length} ejercicio${r.items.length !== 1 ? 's' : ''}${r.desc ? ' · ' + r.desc : ''}</p>
        </div>
        <div class="routine-card-actions">
          <button class="btn-ghost" onclick="openEditRoutine('${r.id}')">Editar</button>
          <button class="btn-ghost" style="color:#ef4444;border-color:#fecaca" onclick="deleteRoutine('${r.id}')">✕</button>
        </div>
      </div>
    </div>`).join('');
}

// ── EXERCISE LIST ──
function renderExerciseList() {
  const el = document.getElementById('exercise-list');
  if (S.exercises.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text-3);text-align:center;padding:12px 0">Aún no hay ejercicios.</p>';
    return;
  }
  el.innerHTML = S.exercises.map(ex => {
    const val  = ex.type === 'time' ? `${ex.duration}s` : `${ex.reps} reps`;
    return `
      <div class="exercise-card" onclick="openExerciseForm('${ex.id}')">
        <div class="ex-emoji-badge">${getEmoji(ex.zone)}</div>
        <div class="ex-card-info">
          <p class="ex-card-name">${ex.name}</p>
          <p class="ex-card-meta">
            <span class="ex-card-tag">${ex.zone}</span>
            &nbsp;${val} · ${ex.sets || 1} serie${(ex.sets||1)>1?'s':''}
          </p>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--border2)" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
      </div>`;
  }).join('');
}

// ══════════════════════════════════
// ROUTINE FORM
// ══════════════════════════════════
function openCreateRoutine() {
  S.editRoutineId = null;
  S.draftItems    = [];
  document.getElementById('routine-name').value = '';
  document.getElementById('routine-desc').value = '';
  document.getElementById('routine-form-title').textContent = 'Nueva rutina';
  renderDraftList();
  document.getElementById('modal-routine').classList.remove('hidden');
}

function openEditRoutine(id) {
  const r = S.routines.find(x => x.id === id);
  if (!r) return;
  S.editRoutineId = id;
  S.draftItems    = JSON.parse(JSON.stringify(r.items));
  document.getElementById('routine-name').value = r.name;
  document.getElementById('routine-desc').value = r.desc || '';
  document.getElementById('routine-form-title').textContent = 'Editar rutina';
  renderDraftList();
  document.getElementById('modal-routine').classList.remove('hidden');
}

function closeRoutineForm() {
  document.getElementById('modal-routine').classList.add('hidden');
}

function renderDraftList() {
  const el = document.getElementById('routine-ex-list');
  if (S.draftItems.length === 0) {
    el.innerHTML = '<p style="font-size:12px;color:var(--text-3);padding:8px 0">Sin ejercicios. Agrega desde el botón de arriba.</p>';
    return;
  }
  el.innerHTML = S.draftItems.map((item, i) => {
    const ex = S.exercises.find(e => e.id === item.exId);
    if (!ex) return '';
    return `
      <div class="routine-ex-drag-item" draggable="true"
           ondragstart="dragStart(event,${i})" ondragover="dragOver(event,${i})"
           ondrop="dragDrop(event,${i})" ondragend="dragEnd(event)">
        <div class="drag-handle">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/></svg>
        </div>
        <span style="font-size:18px">${getEmoji(ex.zone)}</span>
        <span class="routine-ex-name-sm">${ex.name}</span>
        <span class="routine-ex-param-sm">${fmtParams(item, ex)}</span>
        <button class="remove-btn" onclick="removeDraftItem(${i})">×</button>
      </div>`;
  }).join('');
}

function removeDraftItem(i) {
  S.draftItems.splice(i, 1);
  renderDraftList();
}

function saveRoutine() {
  const name = document.getElementById('routine-name').value.trim();
  const desc = document.getElementById('routine-desc').value.trim();
  if (!name) { showToast('Ponle un nombre a la rutina'); return; }
  if (S.draftItems.length === 0) { showToast('Agrega al menos un ejercicio'); return; }
  if (S.editRoutineId) {
    const idx = S.routines.findIndex(r => r.id === S.editRoutineId);
    if (idx !== -1) { S.routines[idx] = { ...S.routines[idx], name, desc, items: S.draftItems }; }
  } else {
    S.routines.push({ id: uid(), name, desc, items: S.draftItems });
  }
  persist();
  renderLibrary();
  renderHoy();
  closeRoutineForm();
  showToast(S.editRoutineId ? 'Rutina actualizada ✓' : 'Rutina creada ✓');
}

function deleteRoutine(id) {
  if (!confirm('¿Eliminar esta rutina?')) return;
  S.routines = S.routines.filter(r => r.id !== id);
  persist();
  renderLibrary();
  renderHoy();
  showToast('Rutina eliminada');
}

// ── DRAG & DROP ──
let dragSrcIdx = null;
function dragStart(e, i) { dragSrcIdx = i; e.currentTarget.classList.add('drag-ghost'); }
function dragOver(e, i)  { e.preventDefault(); }
function dragDrop(e, i)  {
  e.preventDefault();
  if (dragSrcIdx === null || dragSrcIdx === i) return;
  const moved = S.draftItems.splice(dragSrcIdx, 1)[0];
  S.draftItems.splice(i, 0, moved);
  dragSrcIdx = null;
  renderDraftList();
}
function dragEnd(e) {
  dragSrcIdx = null;
  document.querySelectorAll('.drag-ghost').forEach(el => el.classList.remove('drag-ghost'));
}

// ══════════════════════════════════
// EXERCISE PICKER
// ══════════════════════════════════
function openExPicker() {
  S.pickerSel = S.draftItems.map(x => x.exId);
  document.getElementById('picker-search').value = '';
  renderPicker();
  document.getElementById('modal-picker').classList.remove('hidden');
}

function closePicker() {
  document.getElementById('modal-picker').classList.add('hidden');
}

function renderPicker() {
  const q = document.getElementById('picker-search').value.toLowerCase();
  const el = document.getElementById('picker-list');
  const filtered = S.exercises.filter(ex =>
    !q || ex.name.toLowerCase().includes(q) || ex.zone.toLowerCase().includes(q)
  );
  if (filtered.length === 0) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text-3);text-align:center;padding:20px 0">Sin ejercicios. Crea ejercicios primero.</p>';
    return;
  }
  el.innerHTML = filtered.map(ex => {
    const on = S.pickerSel.includes(ex.id);
    return `
      <div class="picker-item" onclick="togglePick('${ex.id}')">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:20px">${getEmoji(ex.zone)}</span>
          <div>
            <p style="font-size:13px;font-weight:500;color:var(--text-1)">${ex.name}</p>
            <p style="font-size:11px;color:var(--text-3)">${ex.zone} · ${ex.type === 'time' ? ex.duration+'s' : ex.reps+' reps'}</p>
          </div>
        </div>
        <div class="picker-check ${on ? 'on' : ''}" id="pc_${ex.id}"></div>
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
  // Remove unchecked
  S.draftItems = S.draftItems.filter(x => S.pickerSel.includes(x.exId));
  // Add newly checked
  const existing = S.draftItems.map(x => x.exId);
  S.pickerSel.forEach(exId => {
    if (!existing.includes(exId)) {
      const ex = S.exercises.find(e => e.id === exId);
      if (!ex) return;
      S.draftItems.push({
        exId,
        sets:     ex.sets     || 1,
        reps:     ex.reps     || null,
        duration: ex.duration || null,
      });
    }
  });
  renderDraftList();
  closePicker();
}

// ══════════════════════════════════
// EXERCISE FORM
// ══════════════════════════════════
function openExerciseForm(id) {
  S.editExId   = id || null;
  S.editExType = 'time';
  S.editExZone = null;
  S.editExImg  = null;

  document.getElementById('exercise-form-title').textContent = id ? 'Editar ejercicio' : 'Nuevo ejercicio';
  document.getElementById('ex-delete-btn').style.display = id ? 'block' : 'none';
  document.getElementById('ex-name').value    = '';
  document.getElementById('ex-duration').value = '';
  document.getElementById('ex-sets-time').value = '';
  document.getElementById('ex-reps').value     = '';
  document.getElementById('ex-sets-reps').value = '';
  document.getElementById('ex-notes').value    = '';
  selectType('time');
  resetImgPreview();
  renderZones();

  if (id) {
    const ex = S.exercises.find(e => e.id === id);
    if (!ex) return;
    document.getElementById('ex-name').value = ex.name;
    document.getElementById('ex-notes').value = ex.notes || '';
    selectType(ex.type);
    S.editExZone = ex.zone;
    renderZones();
    if (ex.type === 'time') {
      document.getElementById('ex-duration').value   = ex.duration || '';
      document.getElementById('ex-sets-time').value  = ex.sets || '';
    } else {
      document.getElementById('ex-reps').value       = ex.reps || '';
      document.getElementById('ex-sets-reps').value  = ex.sets || '';
    }
    if (ex.img) { S.editExImg = ex.img; showImgPreview(ex.img); }
  }

  document.getElementById('modal-exercise').classList.remove('hidden');
}

function closeExerciseForm() {
  document.getElementById('modal-exercise').classList.add('hidden');
}

function renderZones() {
  document.getElementById('body-zones').innerHTML = ZONES.map(z =>
    `<button class="zone-chip ${S.editExZone === z ? 'active' : ''}" onclick="selectZone('${z}')">${z}</button>`
  ).join('');
}

function selectZone(z) {
  S.editExZone = z;
  renderZones();
}

function selectType(t) {
  S.editExType = t;
  document.getElementById('type-btn-time').classList.toggle('active', t === 'time');
  document.getElementById('type-btn-reps').classList.toggle('active', t === 'reps');
  document.getElementById('type-time-fields').classList.toggle('hidden', t !== 'time');
  document.getElementById('type-reps-fields').classList.toggle('hidden', t !== 'reps');
}

function saveExercise() {
  const name = document.getElementById('ex-name').value.trim();
  if (!name) { showToast('El ejercicio necesita un nombre'); return; }
  if (!S.editExZone) { showToast('Selecciona una zona del cuerpo'); return; }

  const isTime = S.editExType === 'time';
  const sets   = parseInt(isTime ? document.getElementById('ex-sets-time').value : document.getElementById('ex-sets-reps').value) || 1;
  const dur    = parseInt(document.getElementById('ex-duration').value) || null;
  const reps   = parseInt(document.getElementById('ex-reps').value) || null;

  if (isTime && !dur)  { showToast('Ingresa la duración en segundos'); return; }
  if (!isTime && !reps){ showToast('Ingresa las repeticiones'); return; }

  const exData = {
    name,
    zone:     S.editExZone,
    type:     S.editExType,
    duration: isTime ? dur  : null,
    reps:     isTime ? null : reps,
    sets,
    notes:    document.getElementById('ex-notes').value.trim(),
    img:      S.editExImg || null,
  };

  if (S.editExId) {
    const idx = S.exercises.findIndex(e => e.id === S.editExId);
    if (idx !== -1) S.exercises[idx] = { ...S.exercises[idx], ...exData };
  } else {
    S.exercises.push({ id: uid(), ...exData });
  }
  persist();
  renderLibrary();
  closeExerciseForm();
  showToast(S.editExId ? 'Ejercicio actualizado ✓' : 'Ejercicio guardado ✓');
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

// ── IMAGE ──
function triggerImgUpload() { document.getElementById('img-input').click(); }

function handleImgUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 3 * 1024 * 1024) { showToast('Imagen muy grande (máx 3MB)'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    S.editExImg = ev.target.result;
    showImgPreview(ev.target.result);
  };
  reader.readAsDataURL(file);
}

function showImgPreview(src) {
  document.getElementById('img-preview-wrap').innerHTML =
    `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-sm)"/>`;
  document.getElementById('img-remove-btn').style.display = 'block';
}

function resetImgPreview() {
  document.getElementById('img-preview-wrap').innerHTML =
    `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
     <p style="font-size:12px;color:var(--text-3);margin-top:6px">Toca para agregar foto</p>`;
  document.getElementById('img-remove-btn').style.display = 'none';
  document.getElementById('img-input').value = '';
}

function removeImg() {
  S.editExImg = null;
  resetImgPreview();
}

// ══════════════════════════════════
// PERFIL
// ══════════════════════════════════
function renderPerfil() {
  const streak = calcStreak();
  document.getElementById('streak-hero-num').textContent = streak;

  const total = S.activeDays.length;
  document.getElementById('streak-meta').innerHTML =
    `<p style="color:rgba(255,255,255,.75);font-size:12px;text-align:right">${total} sesión${total !== 1 ? 'es' : ''} totales</p>`;

  renderHeatmap();
  renderColorPalette();
}

function renderHeatmap() {
  const grid = document.getElementById('heatmap-grid');
  const today = new Date();
  // 12 weeks × 7 days = 84 days back
  const weeks = 12;
  const cols  = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const colDivs = [];
    for (let d = 6; d >= 0; d--) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - (w * 7 + d));
      const str = dt.toISOString().slice(0, 10);
      const active = S.activeDays.includes(str);
      const isToday = str === todayStr();
      const cls = active ? 'heatmap-cell active' : isToday ? 'heatmap-cell dim1' : 'heatmap-cell';
      colDivs.push(`<div class="${cls}" title="${str}"></div>`);
    }
    cols.push(`<div class="heatmap-col">${colDivs.join('')}</div>`);
  }
  grid.innerHTML = cols.join('');
}

function renderColorPalette() {
  document.getElementById('color-palette').innerHTML = ACCENT_COLORS.map((c, i) =>
    `<div class="color-swatch ${S.accentIndex === i ? 'selected' : ''}"
       style="background:${c.value}" title="${c.name}"
       onclick="selectAccent(${i})"></div>`
  ).join('');
}

function selectAccent(i) {
  S.accentIndex = i;
  applyAccent(i);
  persist();
  renderColorPalette();
  showToast('Color actualizado');
}

// ══════════════════════════════════
// EXPORT / IMPORT
// ══════════════════════════════════
function exportData() {
  const payload = {
    version:    2,
    exportedAt: new Date().toISOString(),
    exercises:  S.exercises,
    routines:   S.routines,
    activeDays: S.activeDays,
    accentIndex: S.accentIndex,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `flowly_backup_${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup exportado ✓');
}

function triggerImport() { document.getElementById('import-input').click(); }

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
      S.accentIndex = d.accentIndex ?? 0;
      applyAccent(S.accentIndex);
      persist();
      renderHoy();
      renderLibrary();
      renderPerfil();
      showToast('Backup importado ✓');
    } catch { showToast('Archivo inválido'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ══════════════════════════════════
// CONFETTI
// ══════════════════════════════════
function launchConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  canvas.style.display = 'block';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');
  const accent = ACCENT_COLORS[S.accentIndex].value;
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: -10,
    w: 6 + Math.random() * 8,
    h: 8 + Math.random() * 6,
    r: Math.random() * Math.PI * 2,
    rv: (Math.random() - .5) * .15,
    vx: (Math.random() - .5) * 3,
    vy: 2 + Math.random() * 3,
    color: [accent, '#fff', '#a5d6a7', '#ffd54f', '#ff8a65'][Math.floor(Math.random()*5)],
  }));
  let frame = 0;
  const loop = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.r += p.rv;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
    });
    frame++;
    if (frame < 90) requestAnimationFrame(loop);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
  };
  requestAnimationFrame(loop);
}

// ══════════════════════════════════
// TOAST
// ══════════════════════════════════
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.add('hidden'), 2600);
}
