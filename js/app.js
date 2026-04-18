// ===== app.js =====

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(r => console.log('[SW] Registered:', r.scope))
      .catch(e => console.warn('[SW] Failed:', e));
  });
}

// ---- INIT ----
function initApp() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appShell').classList.remove('hidden');

  // User avatar & name
  const avatarEl = document.getElementById('userAvatarTop');
  if (currentUser.picture) {
    avatarEl.innerHTML = `<img src="${currentUser.picture}" alt="avatar"/>`;
  } else {
    avatarEl.textContent = currentUser.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  }
  document.getElementById('userNameTop').textContent = currentUser.name.split(' ')[0];

  // Set today in modal
  document.getElementById('taskDate').value = todayKey();

  // Init calendar
  initCalendar();

  // Load tasks (starts Firestore real-time listener)
  loadTasks();

  // Show today page
  showPage('today');

  // Handle URL shortcuts
  const p = new URLSearchParams(location.search);
  if (p.get('action') === 'add') openModal();
  if (p.get('page')) showPage(p.get('page'));
}

// ---- PAGE NAVIGATION ----
let currentPage = 'today';

function showPage(name, el) {
  currentPage = name;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + name);
  if (pageEl) pageEl.classList.add('active');

  const navEl = el || document.querySelector(`.nav-item[data-page="${name}"]`);
  if (navEl) navEl.classList.add('active');

  if (name === 'today')     updateTodayPage();
  if (name === 'calendar')  renderCalendar();
  if (name === 'tasks')     renderAllTasks();
  if (name === 'analytics') renderAnalytics();

  closeSidebar();
}

function refreshCurrentPage() {
  if (currentPage === 'today')     updateTodayPage();
  if (currentPage === 'calendar')  renderCalendar();
  if (currentPage === 'tasks')     renderAllTasks();
  if (currentPage === 'analytics') renderAnalytics();
}

// ---- SIDEBAR ----
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ---- TOAST ----
function showToast(msg, type = 'success') {
  const icons = { success:'✅', error:'❌', info:'ℹ️', warning:'⚠️' };
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${icons[type]||'✅'}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(t);
  setTimeout(() => {
    t.style.transition = 'all .3s';
    t.style.opacity    = '0';
    t.style.transform  = 'translateY(12px)';
    setTimeout(() => t.remove(), 300);
  }, 3000);
}

// ---- KEYBOARD SHORTCUTS ----
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openModal(); }
});

// ---- PWA INSTALL ----
let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredPrompt = e;
});
window.addEventListener('appinstalled', () => showToast('TimeFlow installed! 🎉', 'success'));

/* ── 3D Card Tilt ── */
function apply3DTilt() {
    document.querySelectorAll('.task-card, .stat-card, .card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const x = ((e.clientX - r.left) / r.width  - 0.5) * 16;
            const y = ((e.clientY - r.top)  / r.height - 0.5) * -16;
            card.style.transform = `perspective(600px) rotateX(${y}deg) rotateY(${x}deg) translateZ(6px)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateZ(0)';
        });
    });
}

/* ── Floating Mascot ── */
function addMascot() {
    const mascot = document.createElement('div');
    mascot.className = 'mascot';
    mascot.textContent = '🚀';
    mascot.title = 'Keep going! You got this!';

    const messages = [
        '🌟 You\'re doing great!',
        '🔥 Stay focused!',
        '💪 Keep it up!',
        '✅ Task master!',
        '🚀 To the moon!',
        '🎯 On target!'
    ];

    mascot.addEventListener('click', () => {
        mascot.textContent = ['🚀','⭐','🎯','💡','🏆','✨'][Math.floor(Math.random()*6)];
        const tip = document.createElement('div');
        tip.textContent = messages[Math.floor(Math.random() * messages.length)];
        tip.style.cssText = `
            position:fixed; bottom:160px; right:20px;
            background:linear-gradient(135deg,#4f46e5,#7c3aed);
            color:#fff; padding:10px 16px; border-radius:12px;
            font-size:0.85rem; font-weight:600;
            animation:fadeUp 0.3s ease;
            z-index:300; pointer-events:none;
            box-shadow:0 4px 20px rgba(108,99,255,0.4);
        `;
        document.body.appendChild(tip);
        setTimeout(() => tip.remove(), 2000);
    });
    document.body.appendChild(mascot);
}

/* ── Section Reveal on Scroll ── */
function initReveal() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) e.target.classList.add('visible');
        });
    }, { threshold: 0.1 });
    document.querySelectorAll('.section-reveal').forEach(el => obs.observe(el));
}

/* ── Confetti on task complete ── */
function launchConfetti() {
    const colors = ['#6c63ff','#10b981','#f59e0b','#ef4444','#3b82f6'];
    for (let i = 0; i < 30; i++) {
        const dot = document.createElement('div');
        const size = Math.random() * 8 + 4;
        dot.style.cssText = `
            position:fixed;
            left:${Math.random()*100}vw;
            top:-10px;
            width:${size}px; height:${size}px;
            background:${colors[Math.floor(Math.random()*colors.length)]};
            border-radius:${Math.random()>0.5?'50%':'2px'};
            pointer-events:none; z-index:9999;
            animation:confettiFall ${1.5+Math.random()}s ease forwards;
        `;
        document.body.appendChild(dot);
        setTimeout(() => dot.remove(), 2500);
    }
}

/* Add confetti CSS */
const confettiStyle = document.createElement('style');
confettiStyle.textContent = `
@keyframes confettiFall {
    0%   { transform: translateY(0) rotate(0deg);   opacity:1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity:0; }
}`;
document.head.appendChild(confettiStyle);

/* ── Init all ── */
document.addEventListener('DOMContentLoaded', () => {
    apply3DTilt();
    addMascot();
    initReveal();
});

/* ===== CUSTOM TIME PICKER ===== */
let selectedHour = null;
let selectedMin  = null;

function buildTimePicker() {
  const hourCol = document.getElementById('hourCol');
  const minCol  = document.getElementById('minCol');
  if (!hourCol || !minCol) return;

  hourCol.innerHTML = '';
  minCol.innerHTML  = '';

  // Build hours 00–23
  for (let h = 0; h < 24; h++) {
    const el = document.createElement('div');
    el.className = 'tp-item';
    el.textContent = String(h).padStart(2, '0');
    el.dataset.val = h;
    el.addEventListener('click', () => selectHour(h, el));
    hourCol.appendChild(el);
  }

  // Build minutes 00–59
  for (let m = 0; m < 60; m++) {
    const el = document.createElement('div');
    el.className = 'tp-item';
    el.textContent = String(m).padStart(2, '0');
    el.dataset.val = m;
    el.addEventListener('click', () => selectMin(m, el));
    minCol.appendChild(el);
  }

  // Highlight on scroll
  [hourCol, minCol].forEach(col => {
    col.addEventListener('scroll', () => highlightCenter(col));
  });
}

function highlightCenter(col) {
  const items    = col.querySelectorAll('.tp-item');
  const center   = col.scrollTop + col.clientHeight / 2;
  let   closest  = null;
  let   minDist  = Infinity;

  items.forEach(item => {
    const itemCenter = item.offsetTop + item.clientHeight / 2;
    const dist = Math.abs(center - itemCenter);
    if (dist < minDist) { minDist = dist; closest = item; }
    item.classList.remove('selected');
  });

  if (closest) {
    closest.classList.add('selected');
    // update selected values silently
    const val = parseInt(closest.dataset.val);
    if (col.id === 'hourCol') selectedHour = val;
    else                      selectedMin  = val;
    updateDisplay();
  }
}

function selectHour(h, el) {
  selectedHour = h;
  scrollToItem(el, document.getElementById('hourCol'));
  updateDisplay();
}

function selectMin(m, el) {
  selectedMin = m;
  scrollToItem(el, document.getElementById('minCol'));
  updateDisplay();
}

function scrollToItem(el, col) {
  const targetScroll = el.offsetTop - col.clientHeight / 2 + el.clientHeight / 2;
  col.scrollTo({ top: targetScroll, behavior: 'smooth' });
}

function updateDisplay() {
  const h = selectedHour !== null ? String(selectedHour).padStart(2,'0') : '--';
  const m = selectedMin  !== null ? String(selectedMin).padStart(2,'0')  : '--';
  const txt = document.getElementById('timeDisplayText');
  if (txt) txt.textContent = `${h}:${m}`;
}

function toggleTimePicker() {
  const dd = document.getElementById('timePickerDropdown');
  if (!dd) return;
  const isOpen = dd.classList.contains('open');
  if (isOpen) {
    dd.classList.remove('open');
  } else {
    buildTimePicker();
    dd.classList.add('open');

    // Scroll to current time by default
    const now  = new Date();
    const hour = selectedHour !== null ? selectedHour : now.getHours();
    const min  = selectedMin  !== null ? selectedMin  : Math.floor(now.getMinutes() / 5) * 5;

    setTimeout(() => {
      const hourCol  = document.getElementById('hourCol');
      const minCol   = document.getElementById('minCol');
      const hourItem = hourCol.querySelectorAll('.tp-item')[hour];
      const minItem  = minCol.querySelectorAll('.tp-item')[min];
      if (hourItem) scrollToItem(hourItem, hourCol);
      if (minItem)  scrollToItem(minItem, minCol);
      selectedHour = hour;
      selectedMin  = min;
      updateDisplay();
    }, 50);
  }
}

function confirmTime() {
  const dd = document.getElementById('timePickerDropdown');
  if (dd) dd.classList.remove('open');

  if (selectedHour !== null && selectedMin !== null) {
    const val = `${String(selectedHour).padStart(2,'0')}:${String(selectedMin).padStart(2,'0')}`;
    document.getElementById('taskTime').value = val;
    updateDisplay();
  }
}

// Close picker when clicking outside
document.addEventListener('click', e => {
  const wrap = document.getElementById('timePickerWrap');
  if (wrap && !wrap.contains(e.target)) {
    const dd = document.getElementById('timePickerDropdown');
    if (dd) dd.classList.remove('open');
  }
});

// Reset picker when modal closes
const origCloseModal = window.closeModal;
window.closeModal = function() {
  selectedHour = null;
  selectedMin  = null;
  const txt = document.getElementById('timeDisplayText');
  if (txt) txt.textContent = '--:--';
  const dd = document.getElementById('timePickerDropdown');
  if (dd) dd.classList.remove('open');
  if (origCloseModal) origCloseModal();
};
