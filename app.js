// ══════════════════════════════════
// FLOWLY v2 — APP LOGIC
// ══════════════════════════════════

// ── STATE ──
let S = {
  // { id, name, zone, type, duration, sets, reps, notes, img,
  //   variants, variantOrder, pos, fig }
  exercises:    [],
  routines:     [],   // { id, name, desc, items: [{exId, sets, reps, duration}] }
  activeDays:   [],   // ['2025-05-01', ...]  días en que se hizo al menos un ejercicio
  accentIndex:  0,

  // Ajustes del reproductor (persistidos)
  cfg: {
    restRep:     5,     // s entre repeticiones de la misma posición
    restVariant: 10,    // s entre lados / variantes
    restEx:      15,    // s al cambiar de ejercicio
    restBlock:   30,    // s al cambiar de bloque de posición corporal
    sound:       true,
    voice:       true,
    vibrate:     true,
    oneSide:     false, // solo el primer lado de cada ejercicio unilateral
    autoAdvance: true,
  },

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
  editExVariants: null,      // null | ['Izquierdo','Derecho'] | [...]
  editExVarOrder: 'block',
  runRoutineId:  null,
  runChecked:    new Set(),

  // reproductor
  pl: null,            // { routineId, steps, i, left, playing, elapsed, total, tickId }
};

// ── PERSIST ──
function persist() {
  localStorage.setItem('flowly2', JSON.stringify({
    exercises:   S.exercises,
    routines:    S.routines,
    activeDays:  S.activeDays,
    accentIndex: S.accentIndex,
    cfg:         S.cfg,
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
    if (d.cfg) S.cfg = { ...S.cfg, ...d.cfg };
  } catch(e) { console.warn('hydrate error', e); }
}

// ── ACCENT ──
function applyAccent(idx) {
  const c = ACCENT_COLORS[idx] || ACCENT_COLORS[0];
  const r = document.documentElement.style;
  r.setProperty('--accent',       c.value);
  // Sobre fondo casi negro los tintes se construyen con alfa, no con
  // versiones pálidas del color: cualquier pastel se vería lechoso.
  r.setProperty('--accent-light', hexToRgba(c.value, .14));
  r.setProperty('--accent-mid',   hexToRgba(c.value, .45));
  r.setProperty('--accent-dim',   hexToRgba(c.value, .09));
  // La barra de estado se queda con el fondo del sistema, no con el acento.
  document.getElementById('theme-color-meta').content = '#111416';
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
  if (ex.type === 'time') parts.push(sets > 1 ? `${sets} × ${dur} s` : `${dur} s`);
  else                    parts.push(sets > 1 ? `${sets} × ${reps} reps` : `${reps} reps`);
  const v = exVariants(ex);
  if (v) parts.push(v.length === 2 && v[0] === 'Izquierdo' ? 'ambos lados' : `${v.length} variantes`);
  return parts.join(' · ');
}

// Variantes efectivas de un ejercicio (null si es una sola posición).
// Respeta el ajuste "solo un lado".
function exVariants(ex, applyOneSide) {
  const v = Array.isArray(ex.variants) && ex.variants.length ? ex.variants : null;
  if (!v) return null;
  if (applyOneSide && S.cfg.oneSide && v.length === 2) return [v[0]];
  return v;
}

// Ilustración del ejercicio: la foto que haya subido el usuario tiene
// prioridad sobre la lámina que trae la rutina.
function exIllustration(ex) {
  if (ex.img) return { kind:'img',   src: ex.img };
  if (ex.fig) return { kind:'sheet', src: exImageSrc(ex.fig) };
  return null;
}

function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtDuration(sec) {
  const m = Math.round(sec / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m/60)} h ${m%60} min`;
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
    const preview = r.items.slice(0, 4).map((item, i) => {
      const ex = S.exercises.find(e => e.id === item.exId);
      if (!ex) return '';
      return `<div class="hoy-preview-ex">
        <span class="hoy-preview-n">${String(i + 1).padStart(2, '0')}</span>
        <span class="hoy-preview-name">${ex.name}</span>
        <span class="hoy-preview-param">${fmtParams(item, ex)}</span>
      </div>`;
    }).join('');
    const more = r.items.length > 4
      ? `<div class="hoy-preview-ex"><span class="hoy-preview-n">··</span>
           <span class="hoy-preview-name" style="color:var(--text-3)">+${r.items.length - 4} más</span></div>`
      : '';
    const sum = routineSummary(r);
    return `
      <div class="hoy-routine-card">
        <div class="hoy-routine-card-accent"></div>
        <div class="hoy-routine-card-body">
          <p class="micro-label">Protocolo</p>
          <h2 class="hoy-routine-name">${r.name}</h2>
          <p class="hoy-routine-meta">${r.items.length} ejercicios · ${sum.holds} sostenimientos</p>
          <div class="hoy-routine-stats">
            <div class="hoy-stat">
              <p class="hoy-stat-val">${Math.round(sum.total / 60)}</p>
              <p class="hoy-stat-lbl">min estimado</p>
            </div>
            <div class="hoy-stat on">
              <p class="hoy-stat-val">${Math.round(sum.hold / 60)}</p>
              <p class="hoy-stat-lbl">min estiramiento</p>
            </div>
            <div class="hoy-stat">
              <p class="hoy-stat-val">${sum.blocks || 1}</p>
              <p class="hoy-stat-lbl">bloques</p>
            </div>
          </div>
          <div class="hoy-routine-preview">${preview}${more}</div>
          <button class="btn-primary" onclick="plOpen('${r.id}')">Iniciar rutina guiada</button>
          <button class="btn-ghost full-btn" style="margin-top:8px" onclick="openRun('${r.id}')">Ver como lista</button>
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
  const ill  = exIllustration(ex);
  const vars = exVariants(ex);
  content.innerHTML = `
    ${!ill
      ? `<div style="width:100%;aspect-ratio:16/9;background:var(--accent-dim);border-radius:var(--radius-sm) var(--radius-sm) 0 0;display:flex;align-items:center;justify-content:center;font-size:52px;margin-bottom:16px">${getEmoji(ex.zone)}</div>`
      : ill.kind === 'img'
        ? `<img class="ex-detail-img" src="${ill.src}" alt="${ex.name}"/>`
        : `<img class="ex-detail-sheet" src="${ill.src}" alt=""/>`}
    <h2 class="ex-detail-name">${ex.name}</h2>
    <div class="ex-detail-tags">
      <span class="ex-detail-tag">${ex.zone}</span>
      ${ex.pos ? `<span class="ex-detail-tag">${ex.pos}</span>` : ''}
      <span class="ex-detail-tag">${ex.type === 'time' ? 'Tiempo' : 'Repeticiones'}</span>
    </div>
    ${vars ? `<div class="ex-detail-tags" style="margin-top:-6px">
      ${vars.map(v => `<span class="ex-detail-tag accent">${v}</span>`).join('')}
    </div>` : ''}
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
    const ill = exIllustration(ex);
    const thumb = !ill
      ? `<div class="ex-emoji-badge">${getEmoji(ex.zone)}</div>`
      : ill.kind === 'img'
        ? `<div class="ex-card-thumb"><img src="${ill.src}" style="display:block;width:100%"/></div>`
        : `<div class="ex-card-thumb"><img class="pl-figure-sheet" src="${ill.src}" alt=""/></div>`;
    return `
      <div class="exercise-card" onclick="openExerciseForm('${ex.id}')">
        <div class="ex-card-info">
          <p class="ex-card-zone">${ex.zone}${ex.pos ? ' · ' + ex.pos : ''}</p>
          <p class="ex-card-name">${ex.name}</p>
          <p class="ex-card-meta">${fmtParams({}, ex)}</p>
        </div>
        ${thumb}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
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
  S.editExVariants = null;
  S.editExVarOrder = 'block';

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
  selectVarMode('none');

  if (id) {
    const ex = S.exercises.find(e => e.id === id);
    if (!ex) return;
    document.getElementById('ex-name').value = ex.name;
    document.getElementById('ex-notes').value = ex.notes || '';
    selectType(ex.type);
    S.editExZone = ex.zone;
    renderZones();
    const v = Array.isArray(ex.variants) && ex.variants.length ? ex.variants : null;
    S.editExVarOrder = ex.variantOrder || 'block';
    if (!v) selectVarMode('none');
    else if (v.length === 2 && v[0] === 'Izquierdo' && v[1] === 'Derecho') selectVarMode('lr');
    else {
      document.getElementById('ex-variants').value = v.join(', ');
      selectVarMode('custom');
    }
    selectVarOrder(S.editExVarOrder);
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

function selectVarMode(mode) {
  S.editExVarMode = mode;
  ['none','lr','custom'].forEach(m =>
    document.getElementById('var-btn-' + m).classList.toggle('active', m === mode));
  document.getElementById('ex-variants').classList.toggle('hidden', mode !== 'custom');
  document.getElementById('var-order-wrap').classList.toggle('hidden', mode === 'none');
}

function selectVarOrder(o) {
  S.editExVarOrder = o;
  document.getElementById('varord-btn-block').classList.toggle('active', o === 'block');
  document.getElementById('varord-btn-cycle').classList.toggle('active', o === 'cycle');
}

// Lee el editor de variantes y devuelve el array (o null).
function readVariants() {
  if (S.editExVarMode === 'lr')   return ['Izquierdo', 'Derecho'];
  if (S.editExVarMode !== 'custom') return null;
  const raw = document.getElementById('ex-variants').value
    .split(',').map(s => s.trim()).filter(Boolean);
  return raw.length ? raw : null;
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
  renderPlayerSettings();
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
    color: [accent, accent, '#ffbd58', '#e1e2e5', '#6e7c85'][Math.floor(Math.random()*5)],
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

// ══════════════════════════════════
// MOTOR DE SECUENCIA
// Expande una rutina en la lista plana de sostenimientos y descansos
// que hay que recorrer. Aquí es donde viven los lados y las variantes.
// ══════════════════════════════════
function buildSteps(routine) {
  const c = S.cfg;
  const steps = [];
  let prevPos = null;

  const rest = (seconds, label, extra) => {
    if (seconds > 0) steps.push({ kind:'rest', seconds, label, ...extra });
  };

  routine.items
    .map(item => ({ item, ex: S.exercises.find(e => e.id === item.exId) }))
    .filter(x => x.ex)
    .forEach(({ item, ex }) => {
      const reps = item.sets     ?? ex.sets     ?? 1;
      const dur  = item.duration ?? ex.duration ?? 30;
      const vars = exVariants(ex, true) || [null];
      const pos  = ex.pos || null;

      // Preparación antes del ejercicio (más larga si cambia la postura base)
      if (steps.length) {
        const blockChange = !!(pos && prevPos && pos !== prevPos);
        rest(blockChange ? c.restBlock : c.restEx,
             blockChange ? `Cambio a: ${pos}` : 'Prepárate',
             { blockChange, nextEx: ex, nextVariant: vars[0], nextRep: 1, nextRepTotal: reps });
      }

      const hold = (variant, rep) =>
        steps.push({ kind:'hold', ex, seconds: dur, variant, rep, repTotal: reps, pos });

      if (ex.variantOrder === 'cycle' && vars.length > 1) {
        // Una pasada por todas las variantes, repetida N veces.
        // Es como lo describen las hojas 2-1 y 2-4: derecha, izquierda, centro.
        for (let r = 1; r <= reps; r++) {
          vars.forEach((v, vi) => {
            hold(v, r);
            if (vi < vars.length - 1)
              rest(c.restVariant, `Cambia a: ${vars[vi + 1]}`,
                   { nextEx: ex, nextVariant: vars[vi + 1], nextRep: r, nextRepTotal: reps });
          });
          if (r < reps)
            rest(c.restRep, 'Descanso',
                 { nextEx: ex, nextVariant: vars[0], nextRep: r + 1, nextRepTotal: reps });
        }
      } else {
        // Todas las repeticiones de un lado y después el otro:
        // se arma la postura una sola vez por lado.
        vars.forEach((v, vi) => {
          for (let r = 1; r <= reps; r++) {
            hold(v, r);
            if (r < reps)
              rest(c.restRep, 'Descanso',
                   { nextEx: ex, nextVariant: v, nextRep: r + 1, nextRepTotal: reps });
          }
          if (vi < vars.length - 1)
            rest(c.restVariant, `Cambia a: ${vars[vi + 1]}`,
                 { nextEx: ex, nextVariant: vars[vi + 1], nextRep: 1, nextRepTotal: reps });
        });
      }
      prevPos = pos;
    });

  return steps;
}

// Resumen de una rutina sin llegar a reproducirla (para las tarjetas de Hoy).
function routineSummary(routine) {
  const steps  = buildSteps(routine);
  const holds  = steps.filter(s => s.kind === 'hold');
  const total  = steps.reduce((a, s) => a + s.seconds, 0);
  const hold   = holds.reduce((a, s) => a + s.seconds, 0);
  const blocks = new Set(holds.map(s => s.pos).filter(Boolean)).size;
  return { steps, holds: holds.length, total, hold, blocks, exercises: routine.items.length };
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
    if ('wakeLock' in navigator) {
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
function plOpen(routineId) {
  const r = S.routines.find(x => x.id === routineId);
  if (!r) return;
  const steps = buildSteps(r);
  if (!steps.length) { showToast('Esta rutina no tiene ejercicios'); return; }

  // offsets acumulados para calcular el progreso en O(1)
  let acc = 0;
  const offsets = steps.map(s => { const o = acc; acc += s.seconds; return o; });

  // Un segmento de la barra por bloque de posición corporal. Los descansos
  // de cambio de bloque cuentan para el bloque nuevo, que es lo que preparan.
  const blocks = [];
  steps.forEach(s => {
    const pos  = (s.kind === 'hold' ? s.pos : s.nextEx && s.nextEx.pos) || '—';
    const last = blocks[blocks.length - 1];
    if (last && last.pos === pos) last.seconds += s.seconds;
    else blocks.push({ pos, seconds: s.seconds, offset: 0 });
  });
  let bo = 0;
  blocks.forEach(b => { b.offset = bo; bo += b.seconds; });

  S.pl = {
    routineId, steps, offsets, blocks, total: acc,
    i: 0, left: steps[0].seconds, playing: false,
    endAt: 0, tickId: null, lastSec: null, finished: false,
  };

  document.getElementById('pl-segments').innerHTML =
    blocks.map(b => `<div class="pl-seg" style="flex:${b.seconds}">
      <div class="pl-seg-fill"></div></div>`).join('');

  document.getElementById('pl-routine').textContent = r.name;
  document.getElementById('modal-player').classList.remove('hidden');
  document.getElementById('pl-done').classList.add('hidden');
  document.getElementById('pl-stage').classList.remove('hidden');
  document.getElementById('pl-controls').classList.remove('hidden');

  plRender();
  plPlay();
}

function plClose() {
  plPause();
  releaseWakeLock();
  try { speechSynthesis.cancel(); } catch (e) {}
  S.pl = null;
  document.getElementById('modal-player').classList.add('hidden');
  renderHoy();
}

function plPlay() {
  const p = S.pl; if (!p || p.finished) return;
  // Con avance manual el paso se queda en 0: reproducir avanza al siguiente.
  if (p.left <= 0.05) {
    plGo(p.i + 1);
    if (!S.pl || S.pl.finished) return;
  }
  p.playing = true;
  p.endAt   = Date.now() + p.left * 1000;
  clearInterval(p.tickId);
  p.tickId = setInterval(plTick, 100);
  acquireWakeLock();
  plPaintControls();
  // el primer arranque necesita un gesto para desbloquear el audio en móvil
  beep(660, 90, .12);
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
  p.playing ? plPause() : plPlay();
}

function plTick() {
  const p = S.pl; if (!p || !p.playing) return;
  p.left = (p.endAt - Date.now()) / 1000;

  if (p.left <= 0) {
    const wasHold = p.steps[p.i].kind === 'hold';
    beep(wasHold ? 1040 : 780, 200, .28);
    buzz(wasHold ? [140, 60, 140] : 90);
    if (S.cfg.autoAdvance) { plGo(p.i + 1); }
    else { p.left = 0; plPause(); plPaintTimer(); }
    return;
  }

  const sec = Math.ceil(p.left);
  if (sec !== p.lastSec) {
    p.lastSec = sec;
    if (sec <= 3) { beep(760, 80, .16); buzz(45); }
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
  p.endAt   = Date.now() + p.left * 1000;
  plRender();
  plAnnounce();
}

function plNext() { const p = S.pl; if (p) plGo(p.i + 1); }
function plPrev() {
  const p = S.pl; if (!p) return;
  // si ya avanzó dentro del paso, el primer toque lo reinicia
  const step = p.steps[p.i];
  if (step && step.seconds - p.left > 2) plGo(p.i);
  else plGo(p.i - 1);
}

function plAnnounce() {
  const p = S.pl, s = p.steps[p.i];
  if (!s) return;
  if (s.kind === 'hold') {
    speak(s.rep === 1 && s.variant ? `${s.ex.name}. ${s.variant}`
        : s.rep === 1              ? s.ex.name
        : `Repetición ${s.rep}`);
  } else {
    speak(s.label);
  }
}

function plRender() {
  const p = S.pl; if (!p) return;
  const s = p.steps[p.i];
  const resting = s.kind === 'rest';
  document.getElementById('player').classList.toggle('resting', resting);

  const ex      = resting ? s.nextEx      : s.ex;
  const variant = resting ? s.nextVariant : s.variant;
  const rep     = resting ? s.nextRep     : s.rep;
  const repTot  = resting ? s.nextRepTotal: s.repTotal;

  document.getElementById('pl-block').textContent = (ex && ex.pos) || 'Sesión';

  // ilustración
  const fig = document.getElementById('pl-figure');
  const ill = ex ? exIllustration(ex) : null;
  fig.innerHTML = !ill
    ? `<div class="pl-figure-fallback">${ex ? getEmoji(ex.zone) : '🌿'}</div>`
    : ill.kind === 'img'
      ? `<img src="${ill.src}" alt=""/>`
      : `<img class="pl-figure-sheet" src="${ill.src}" alt=""/>`;

  // núcleo: repetición, y el bloque grande con el lado o el cambio de postura
  document.getElementById('pl-rep').innerHTML = resting
    ? `<span class="pl-rep-lbl">Fase de descanso</span> <span class="pl-rep-n">${s.seconds}</span><span class="pl-rep-tot">s totales</span>`
    : repTot > 1
      ? `<span class="pl-rep-lbl">Repetición</span> <span class="pl-rep-n">${String(rep).padStart(2,'0')}</span><span class="pl-rep-tot">/ ${String(repTot).padStart(2,'0')}</span>`
      : `<span class="pl-rep-lbl">Sostén</span>`;

  document.getElementById('pl-side').textContent =
    resting ? s.label : (variant || 'Sostén');

  document.getElementById('pl-name').textContent = ex ? ex.name : '';

  const chips = [];
  if (ex && ex.zone) chips.push(`<span class="pl-chip">${ex.zone}</span>`);
  if (ex && ex.pos)  chips.push(`<span class="pl-chip">${ex.pos}</span>`);
  if (resting && variant) chips.push(`<span class="pl-chip pl-chip-accent">${variant}</span>`);
  document.getElementById('pl-chips').innerHTML = chips.join('');

  document.getElementById('pl-note-label').textContent = resting ? 'Acomódate' : 'Indicación';
  document.getElementById('pl-notes').textContent = ex && ex.notes ? ex.notes : '';

  // Qué sigue: el próximo sostenimiento que realmente cambie algo
  // (no la siguiente repetición del mismo lado, que no aporta nada).
  // En los descansos el escenario ya es la vista previa, así que ahí va
  // el botón de alargar en su lugar.
  const curId = ex ? ex.id : null;
  const nx = resting ? null : p.steps.slice(p.i + 1).find(x =>
    x.kind === 'hold' && (x.ex.id !== curId || x.variant !== variant));
  document.getElementById('pl-next').innerHTML =
      resting ? `<button class="pl-plus" onclick="plAddTime(10)">+10 s</button>`
    : nx ? `<span class="pl-next-label">Sigue</span><span class="pl-next-name">${nx.ex.name}${nx.variant ? ' · ' + nx.variant : ''}</span>`
    : `<span class="pl-next-label">Último</span><span class="pl-next-name">¡ya casi!</span>`;

  plPaintTimer();
  plPaintControls();
}

// Alarga el paso actual (útil en los descansos, cuando la postura cuesta).
function plAddTime(sec) {
  const p = S.pl; if (!p) return;
  p.left += sec;
  p.steps[p.i].seconds += sec;
  p.total += sec;
  for (let k = p.i + 1; k < p.offsets.length; k++) p.offsets[k] += sec;
  const b = p.blocks.find(x => p.offsets[p.i] >= x.offset && p.offsets[p.i] < x.offset + x.seconds);
  if (b) b.seconds += sec;
  if (p.playing) p.endAt += sec * 1000;
  document.getElementById('pl-rep').innerHTML =
    `<span class="pl-rep-lbl">Fase de descanso</span> <span class="pl-rep-n">${p.steps[p.i].seconds}</span><span class="pl-rep-tot">s totales</span>`;
  plPaintTimer();
}

function plPaintTimer() {
  const p = S.pl; if (!p) return;
  const s = p.steps[p.i];
  const left = Math.max(0, p.left);

  document.getElementById('pl-timer').textContent = Math.ceil(left);

  const frac = s.seconds ? left / s.seconds : 0;
  document.getElementById('pl-gauge-fill').style.width = (frac * 100) + '%';

  const elapsed = p.offsets[p.i] + (s.seconds - left);

  // barra segmentada: cada bloque se llena por separado
  const segs = document.querySelectorAll('#pl-segments .pl-seg-fill');
  p.blocks.forEach((b, k) => {
    if (!segs[k]) return;
    const f = Math.max(0, Math.min(1, (elapsed - b.offset) / b.seconds));
    segs[k].style.width = (f * 100) + '%';
  });

  document.getElementById('pl-elapsed').textContent = fmtClock(elapsed);
  document.getElementById('pl-remain').textContent  = '−' + fmtClock(p.total - elapsed);

  const holdsTotal = p.steps.filter(x => x.kind === 'hold').length;
  const holdsDone  = p.steps.slice(0, p.i + 1).filter(x => x.kind === 'hold').length;
  document.getElementById('pl-count').textContent = `${holdsDone} / ${holdsTotal}`;
}

function plPaintControls() {
  const p = S.pl; if (!p) return;
  document.getElementById('pl-play').innerHTML = p.playing
    ? `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`
    : `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5l11 7-11 7z"/></svg>`;
}

function plFinish() {
  const p = S.pl; if (!p) return;
  plPause();
  p.finished = true;
  markActiveToday();
  const r = S.routines.find(x => x.id === p.routineId);
  const streak = calcStreak();

  document.getElementById('pl-stage').classList.add('hidden');
  document.getElementById('pl-controls').classList.add('hidden');
  const done = document.getElementById('pl-done');
  done.classList.remove('hidden');
  done.innerHTML = `
    <p class="micro-label">Protocolo completado</p>
    <p class="pl-done-num">${p.steps.filter(x => x.kind === 'hold').length}</p>
    <p class="pl-done-lbl">sostenimientos</p>
    <h2 class="complete-title">${r ? r.name : 'Rutina'}</h2>
    <p class="complete-sub">Sesión cerrada en ${fmtDuration(p.total)}.<br>
      ${streak > 1 ? `Racha de <strong>${streak} días</strong>.` : 'Primer día de racha.'}</p>
    <button class="btn-primary full-btn" onclick="plClose()">Volver al inicio</button>`;
  document.querySelectorAll('#pl-segments .pl-seg-fill').forEach(el => el.style.width = '100%');
  document.getElementById('player').classList.remove('resting');
  speak('Sesión completa. Buen trabajo.');
  buzz([200, 80, 200]);
  launchConfetti();
  renderPerfil();
}

// ══════════════════════════════════
// AJUSTES DEL REPRODUCTOR
// ══════════════════════════════════
function renderPlayerSettings() {
  const c = S.cfg;
  const toggle = (key, label, hint) => `
    <div class="cfg-row">
      <div><p class="cfg-label">${label}</p>${hint ? `<p class="cfg-hint">${hint}</p>` : ''}</div>
      <button class="cfg-switch ${c[key] ? 'on' : ''}" onclick="cfgToggle('${key}')"><span></span></button>
    </div>`;
  const num = (key, label, hint, min, max) => `
    <div class="cfg-row">
      <div><p class="cfg-label">${label}</p>${hint ? `<p class="cfg-hint">${hint}</p>` : ''}</div>
      <div class="cfg-stepper">
        <button onclick="cfgStep('${key}',-5,${min},${max})">−</button>
        <span id="cfg-${key}">${c[key]}s</span>
        <button onclick="cfgStep('${key}',5,${min},${max})">+</button>
      </div>
    </div>`;

  document.getElementById('player-settings').innerHTML =
    num('restRep',     'Entre repeticiones', 'Soltar y volver a la postura', 0, 60) +
    num('restVariant', 'Entre lados',        'Cambio de pierna o variante',  0, 60) +
    num('restEx',      'Entre ejercicios',   'Acomodarte en la nueva postura', 0, 120) +
    num('restBlock',   'Al cambiar de bloque', 'De pie → piso, etc.',        0, 180) +
    toggle('autoAdvance', 'Avance automático', 'Pasa solo al terminar cada tiempo') +
    toggle('sound',       'Sonido',            'Pitido en los últimos 3 s y al terminar') +
    toggle('voice',       'Voz',               'Dice el ejercicio y el lado en voz alta') +
    toggle('vibrate',     'Vibración',         'Solo en móvil') +
    toggle('oneSide',     'Solo un lado',      'Salta el segundo lado de los ejercicios unilaterales');
}

function cfgToggle(key) {
  S.cfg[key] = !S.cfg[key];
  persist();
  renderPlayerSettings();
  renderHoy();
}

function cfgStep(key, delta, min, max) {
  S.cfg[key] = Math.min(max, Math.max(min, (S.cfg[key] || 0) + delta));
  persist();
  renderPlayerSettings();
  renderHoy();
}

// ══════════════════════════════════
// SEMILLA: rutina de movilidad
// ══════════════════════════════════
function seedRoutine() {
  const existing = new Set(S.exercises.map(e => e.id));
  let added = 0;
  MOBILITY_EXERCISES.forEach(ex => {
    if (!existing.has(ex.id)) { S.exercises.push({ ...ex }); added++; }
    else {
      // refresca contenido pero respeta la foto que el usuario haya puesto
      const i = S.exercises.findIndex(e => e.id === ex.id);
      S.exercises[i] = { ...ex, img: S.exercises[i].img };
    }
  });

  const ri = S.routines.findIndex(r => r.id === MOBILITY_ROUTINE.id);
  if (ri === -1) S.routines.unshift(JSON.parse(JSON.stringify(MOBILITY_ROUTINE)));
  else           S.routines[ri] = { ...S.routines[ri], items: JSON.parse(JSON.stringify(MOBILITY_ROUTINE.items)) };

  persist();
  renderHoy();
  renderLibrary();
  showToast(added ? `Rutina cargada · ${added} ejercicios` : 'Rutina actualizada ✓');
  navigate('hoy');
}
