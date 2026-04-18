// ===== tasks.js =====

const TAG_ICONS   = { work:'💼', personal:'🏡', health:'💪', study:'📚' };
const TAG_CLASSES = { work:'tag-work', personal:'tag-personal', health:'tag-health', study:'tag-study' };
const PRI_DOTS    = { high:'p-high', med:'p-med', low:'p-low' };
const TL_COLORS   = ['var(--accent)','var(--accent2)','var(--accent3)','var(--amber)','#43e9e9'];

// ---- PRIORITY SELECTOR ----
function setPri(p, el) {
  selectedPriority = p;
  document.querySelectorAll('.pri-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

// ---- TASK HTML ----
function taskHTML(t) {
  const tag = t.tag || 'work';
  const pri = t.priority || 'med';
  return `<div class="task-item ${t.done ? 'done' : ''}" id="task-${t.id}">
    <div class="pdot ${PRI_DOTS[pri] || 'p-med'}"></div>
    <div class="task-check ${t.done ? 'checked' : ''}" onclick="toggleTask('${t.id}')">
      ${t.done ? '✓' : ''}
    </div>
    <div class="task-body">
      <div class="task-name" title="${escHtml(t.name)}">${escHtml(t.name)}</div>
      <div class="task-meta">
        ${t.time     ? `<span class="task-time">🕐 ${t.time}</span>` : ''}
        ${t.duration ? `<span class="task-time">⏱ ${t.duration}min</span>` : ''}
        <span class="task-tag ${TAG_CLASSES[tag]}">${TAG_ICONS[tag]} ${tag}</span>
      </div>
    </div>
    <button class="task-del" onclick="deleteTask('${t.id}')" title="Delete">🗑</button>
  </div>`;
}

// ---- ACTIONS ----
function toggleTask(id) {
  const t = tasks.find(t => t.id === id);
  if (!t) return;
  updateTask(id, { done: !t.done });
  
  if (!t.done) {
    launchConfetti(); // ← fires confetti when task is marked complete
  }
  
  showToast(t.done ? 'Task reopened' : '🎉 Task completed!', t.done ? 'info' : 'success');
}

function deleteTask(id) {
  removeTask(id);
  showToast('Task deleted', 'error');
}

// ---- MODAL ----
function openModal(date) {
  document.getElementById('modalOverlay').classList.add('open');
  document.getElementById('taskDate').value     = date || todayKey();
  document.getElementById('taskName').value     = '';
  document.getElementById('taskTime').value     = '';
  document.getElementById('taskDuration').value = '';
  document.getElementById('taskNotes').value    = '';
  document.getElementById('taskTag').value      = 'work';
  selectedPriority = 'high';
  document.querySelectorAll('.pri-btn').forEach(b => b.classList.toggle('active', b.dataset.p === 'high'));
  setTimeout(() => document.getElementById('taskName').focus(), 300);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
}

async function saveTask() {
  const name = document.getElementById('taskName').value.trim();
  const date = document.getElementById('taskDate').value;
  if (!name) { showToast('Please enter a task name', 'error'); return; }
  if (!date) { showToast('Please select a date', 'error'); return; }

  const task = {
    name,
    date,
    time:     document.getElementById('taskTime').value,
    duration: document.getElementById('taskDuration').value,
    tag:      document.getElementById('taskTag').value,
    priority: selectedPriority,
    notes:    document.getElementById('taskNotes').value,
    done:     false,
    created:  new Date().toISOString(),
    uid:      currentUser.uid
  };

  const btn = document.querySelector('.modal .submit-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  await addTask(task);

  btn.textContent = '💾 Save Task';
  btn.disabled = false;
  closeModal();
  showToast('✅ Task saved!', 'success');
}

// ---- TIMELINE ----
function renderTimeline(todayTasks) {
  const el    = document.getElementById('timelineSlots');
  const timed = todayTasks.filter(t => t.time).sort((a,b) => a.time.localeCompare(b.time));
  if (!timed.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-text">Add tasks with times to see your smart timeline 📍</div></div>';
    return;
  }
  el.innerHTML = timed.map((t, i) => {
    const color  = TL_COLORS[i % TL_COLORS.length];
    const isLast = i === timed.length - 1;
    return `<div class="tl-slot">
      <div class="tl-time">${t.time}</div>
      <div class="tl-line">
        <div class="tl-dot" style="background:${color}"></div>
        ${!isLast ? '<div class="tl-conn"></div>' : ''}
      </div>
      <div class="tl-card" style="border-left-color:${color}">
        <div class="tl-name">${escHtml(t.name)}</div>
        <div class="tl-dur">${t.duration ? t.duration + ' min · ' : ''}${t.tag || 'work'}</div>
        <div class="tl-bar"><div class="tl-fill" style="width:${t.done ? 100 : 0}%;background:${color}"></div></div>
      </div>
    </div>`;
  }).join('');
}

// ---- AI OPTIMIZER ----
function aiOptimize() {
  const tKey    = todayKey();
  const pending = tasks.filter(t => t.date === tKey && !t.done);
  if (!pending.length) { showToast('No pending tasks to optimize!', 'info'); return; }

  const priOrder = { high:0, med:1, low:2 };
  const sorted = [...pending].sort((a,b) => {
    const pd = (priOrder[a.priority]||1) - (priOrder[b.priority]||1);
    return pd !== 0 ? pd : (parseInt(a.duration)||60) - (parseInt(b.duration)||60);
  });

  let hour = 9, minute = 0;
  sorted.forEach(t => {
    updateTask(t.id, { time: pad2(hour) + ':' + pad2(minute) });
    const dur = parseInt(t.duration) || 60;
    minute += dur;
    hour   += Math.floor(minute / 60);
    minute  = minute % 60;
    if (hour >= 20) { hour = 9; minute = 0; }
  });
  showToast('✨ Tasks optimized by priority!', 'success');
}

// ---- TODAY PAGE ----
function updateTodayPage() {
  const h        = new Date().getHours();
  const greet    = h < 12 ? 'Good Morning ☀️' : h < 17 ? 'Good Afternoon 🌤' : 'Good Evening 🌙';
  const name     = currentUser ? currentUser.name.split(' ')[0] : '';
  document.getElementById('todayTitle').textContent = `${greet}, ${name}`;
  document.getElementById('todayDate').textContent  = new Date().toLocaleDateString('en-US',{
    weekday:'long', year:'numeric', month:'long', day:'numeric'
  });

  const tKey    = todayKey();
  const today   = getTasksByDate(tKey);
  const done    = today.filter(t => t.done).length;
  const total   = today.length;
  const mins    = today.reduce((s,t) => s + (parseInt(t.duration)||0), 0);
  const hrs     = Math.floor(mins/60);
  const remMin  = mins % 60;

  document.getElementById('statsRow').innerHTML = `
    <div class="stat-card purple"><div class="stat-label">Today's Tasks</div><div class="stat-val">${total}</div><div class="stat-chg">📋 Planned</div></div>
    <div class="stat-card green"> <div class="stat-label">Completed</div>   <div class="stat-val">${done}</div> <div class="stat-chg">✅ Done</div></div>
    <div class="stat-card pink">  <div class="stat-label">Remaining</div>   <div class="stat-val">${total-done}</div><div class="stat-chg">⏳ Pending</div></div>
    <div class="stat-card amber"> <div class="stat-label">Time Planned</div><div class="stat-val">${hrs>0?hrs+'h':''}${remMin>0?remMin+'m':hrs===0?'0m':''}</div><div class="stat-chg">⏱ Total</div></div>
  `;

  document.getElementById('todayCount').textContent = `${total} task${total !== 1 ? 's' : ''}`;

  const listEl = document.getElementById('todayTaskList');
  if (!today.length) {
    listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">No tasks today.<br/>Tap "+ Task" to get started!</div></div>';
  } else {
    const priOrder = { high:0, med:1, low:2 };
    listEl.innerHTML = [...today]
      .sort((a,b) => (priOrder[a.priority]||1) - (priOrder[b.priority]||1))
      .map(t => taskHTML(t)).join('');
  }
  renderTimeline(today);
}

// ---- ALL TASKS ----
let currentFilter = 'all';

function filterByTag(tag) {
  currentFilter = tag;
  showPage('tasks');
}

function filterAllTasks(f, el) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderAllTasks();
}

function renderAllTasks() {
  let filtered = [...tasks];
  const f = currentFilter;
  if      (f === 'work')     filtered = filtered.filter(t => t.tag === 'work');
  else if (f === 'personal') filtered = filtered.filter(t => t.tag === 'personal');
  else if (f === 'health')   filtered = filtered.filter(t => t.tag === 'health');
  else if (f === 'study')    filtered = filtered.filter(t => t.tag === 'study');
  else if (f === 'pending')  filtered = filtered.filter(t => !t.done);
  else if (f === 'done')     filtered = filtered.filter(t => t.done);
  filtered.sort((a,b) => a.date.localeCompare(b.date) || (a.time||'').localeCompare(b.time||''));

  document.getElementById('tasksPageSub').textContent =
    `${filtered.length} task${filtered.length !== 1 ? 's' : ''} found`;

  const el = document.getElementById('allTasksList');
  if (!filtered.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">No tasks found.<br/>Add some tasks to get started!</div></div>';
    return;
  }
  const grouped = {};
  filtered.forEach(t => { if (!grouped[t.date]) grouped[t.date] = []; grouped[t.date].push(t); });

  el.innerHTML = Object.entries(grouped).map(([date, ts]) => {
    const d     = new Date(date + 'T00:00:00');
    const label = d.toLocaleDateString('en-US',{ weekday:'long', month:'long', day:'numeric', year:'numeric' });
    return `<div style="margin-bottom:20px">
      <div class="date-group-lbl">${label}</div>
      ${ts.map(t => taskHTML(t)).join('')}
    </div>`;
  }).join('');
}
