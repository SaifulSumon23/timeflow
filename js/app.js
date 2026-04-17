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
