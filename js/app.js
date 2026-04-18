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

  for (let h = 0; h < 24; h++) {
    const el = document.createElement('div');
    el.className   = 'tp-item';
    el.textContent = String(h).padStart(2, '0');
    el.dataset.val = h;
    el.addEventListener('click', () => {
      selectedHour = h;
      scrollToItem(el, hourCol);
      highlightCenter(hourCol);
      syncManualInput();
    });
    hourCol.appendChild(el);
  }

  for (let m = 0; m < 60; m++) {
    const el = document.createElement('div');
    el.className   = 'tp-item';
    el.textContent = String(m).padStart(2, '0');
    el.dataset.val = m;
    el.addEventListener('click', () => {
      selectedMin = m;
      scrollToItem(el, minCol);
      highlightCenter(minCol);
      syncManualInput();
    });
    minCol.appendChild(el);
  }

  [hourCol, minCol].forEach(col => {
    col.addEventListener('scroll', () => {
      highlightCenter(col);
      syncManualInput();
    });
  });
}

function highlightCenter(col) {
  const items  = col.querySelectorAll('.tp-item');
  const center = col.scrollTop + col.clientHeight / 2;
  let closest = null, minDist = Infinity;

  items.forEach(item => {
    const dist = Math.abs((item.offsetTop + item.clientHeight / 2) - center);
    item.classList.remove('selected');
    if (dist < minDist) { minDist = dist; closest = item; }
  });

  if (closest) {
    closest.classList.add('selected');
    const val = parseInt(closest.dataset.val);
    if (col.id === 'hourCol') selectedHour = val;
    else                      selectedMin  = val;
  }

  // Update live display in header
  const live = document.getElementById('tpLiveTime');
  if (live) {
    const h = selectedHour !== null ? String(selectedHour).padStart(2,'0') : '--';
    const m = selectedMin  !== null ? String(selectedMin).padStart(2,'0')  : '--';
    live.textContent = `${h}:${m}`;
  }
}

function scrollToItem(el, col) {
  const target = el.offsetTop - col.clientHeight / 2 + el.clientHeight / 2;
  col.scrollTo({ top: target, behavior: 'smooth' });
}

function syncManualInput() {
  const input = document.getElementById('taskTime');
  if (!input) return;
  if (selectedHour !== null && selectedMin !== null) {
    input.value = `${String(selectedHour).padStart(2,'0')}:${String(selectedMin).padStart(2,'0')}`;
  }
}

function toggleTimePicker() {
  const dd = document.getElementById('timePickerDropdown');
  if (!dd) return;

  if (dd.classList.contains('open')) {
    dd.classList.remove('open');
    return;
  }

  buildTimePicker();
  dd.classList.add('open');

  // Read from manual input if already typed
  const input = document.getElementById('taskTime');
  let hour = new Date().getHours();
  let min  = Math.floor(new Date().getMinutes() / 5) * 5;

  if (input && input.value && /^\d{1,2}:\d{2}$/.test(input.value)) {
    const parts = input.value.split(':');
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (h >= 0 && h <= 23) hour = h;
    if (m >= 0 && m <= 59) min  = m;
  }

  selectedHour = hour;
  selectedMin  = min;

  setTimeout(() => {
    const hourCol  = document.getElementById('hourCol');
    const minCol   = document.getElementById('minCol');
    const hourItem = hourCol.querySelectorAll('.tp-item')[hour];
    const minItem  = minCol.querySelectorAll('.tp-item')[min];
    if (hourItem) scrollToItem(hourItem, hourCol);
    if (minItem)  scrollToItem(minItem, minCol);
    setTimeout(() => {
      highlightCenter(hourCol);
      highlightCenter(minCol);
    }, 350);
  }, 60);
}

function confirmTime() {
  const dd = document.getElementById('timePickerDropdown');
  if (dd) dd.classList.remove('open');
  syncManualInput();
}

/* Manual typing handler */
function onManualTimeInput(input) {
  let val = input.value.replace(/[^0-9]/g, '');

  // Auto-insert colon after 2 digits
  if (val.length >= 2) {
    val = val.substring(0,2) + ':' + val.substring(2,4);
  }
  input.value = val;

  // Validate and highlight
  if (/^\d{2}:\d{2}$/.test(val)) {
    const h = parseInt(val.split(':')[0]);
    const m = parseInt(val.split(':')[1]);

    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      input.style.borderColor = '#43e97b'; // green = valid
      input.style.boxShadow   = '0 0 0 3px rgba(67,233,123,0.15)';
      selectedHour = h;
      selectedMin  = m;
    } else {
      input.style.borderColor = '#ff6584'; // red = invalid
      input.style.boxShadow   = '0 0 0 3px rgba(255,101,132,0.15)';
    }
  } else {
    input.style.borderColor = '';
    input.style.boxShadow   = '';
  }
}

/* Close on outside click */
document.addEventListener('click', e => {
  const wrap = document.getElementById('timePickerWrap');
  if (wrap && !wrap.contains(e.target)) {
    const dd = document.getElementById('timePickerDropdown');
    if (dd) dd.classList.remove('open');
  }
});

/* Reset on modal close */
const _origClose = window.closeModal;
window.closeModal = function() {
  selectedHour = null;
  selectedMin  = null;
  const input = document.getElementById('taskTime');
  if (input) {
    input.value      = '';
    input.style.borderColor = '';
    input.style.boxShadow   = '';
  }
  const dd = document.getElementById('timePickerDropdown');
  if (dd) dd.classList.remove('open');
  if (_origClose) _origClose();
};

/* ═══════════════════════════════════════════
   NOTIFICATIONS, SOUNDS, PARTICLES, CHATBOT
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════
   WEB PUSH NOTIFICATION SYSTEM
═══════════════════════════════════════ */

/* ── PASTE YOUR 3 VALUES HERE ── */
const PUSH_SERVER   = 'https://timeflow-opal.vercel.app'; // ← your Vercel URL
const VAPID_PUB_KEY = 'BAqktYcGYjC4nzE9t8azPvTWLNGjDBulVe_Wwb5NoBABRYzwBjb01BEWsxw4yhehqjmBdue7ByGQSTwH-3wmP9Y'; // ← from vapidkeys.com
const NOTIFY_SECRET = 'timeflow2026';

/* Convert VAPID key */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64  = (base64String + padding).replace(/-/g,'+').replace(/_/g,'/');
  const rawData = window.atob(base64);
  const arr     = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr;
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    showToast('⚠️ Push not supported on this browser', 'error');
    return false;
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showToast('❌ Please allow notifications for task reminders', 'error');
      return false;
    }

    const reg = await navigator.serviceWorker.ready;
    let sub   = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUB_KEY)
      });
    }

    const userId = currentUser?.uid || 'anonymous';
    const res = await fetch(`${PUSH_SERVER}/api/subscribe`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ subscription: sub.toJSON(), userId })
    });

    if (res.ok) {
      localStorage.setItem('tf_push_subscribed', 'true');
      localStorage.setItem('tf_user_id', userId);
      showToast('🔔 Push notifications enabled!', 'success');
      playNotificationSound();
      return true;
    }
    return false;
  } catch(err) {
    console.error('[Push] Error:', err);
    showToast('❌ Notification error: ' + err.message, 'error');
    return false;
  }
}

async function requestNotificationPermission() {
  return subscribeToPush();
}

async function scheduleTaskReminders(taskList) {
  const userId = localStorage.getItem('tf_user_id') || currentUser?.uid;
  if (!userId || !localStorage.getItem('tf_push_subscribed')) return;

  const now = Date.now();
  for (const task of taskList) {
    if (task.done || !task.time || !task.date) continue;
    const taskDateTime = new Date(`${task.date}T${task.time}`);
    if (isNaN(taskDateTime)) continue;

    for (const mins of [18, 10]) {
      const fireAt = taskDateTime.getTime() - mins * 60 * 1000;
      const delay  = fireAt - now;
      if (delay < 0) continue;

      setTimeout(async () => {
        try {
          await fetch(`${PUSH_SERVER}/api/send-reminder`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              userId,
              taskName:      task.name || task.title || 'Task',
              minutesBefore: mins,
              secret:        NOTIFY_SECRET
            })
          });
        } catch(e) {
          console.warn('[Push] Reminder failed:', e);
        }
      }, delay);
    }
  }
}

function initReminders() {
  navigator.serviceWorker?.ready.then(() => {
    if (typeof tasks !== 'undefined') scheduleTaskReminders(tasks);
  });
}

setTimeout(initReminders, 2000);

/* ── 2. SOUND ENGINE ── */
function createAudioContext() {
  return new (window.AudioContext || window.webkitAudioContext)();
}

function playClapSound() {
  try {
    const ctx  = createAudioContext();
    const time = ctx.currentTime;

    // Multiple noise bursts for clap effect
    for (let i = 0; i < 3; i++) {
      const buf    = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
      const data   = buf.getChannelData(0);
      for (let j = 0; j < data.length; j++) data[j] = (Math.random() * 2 - 1);

      const src    = ctx.createBufferSource();
      const filter = ctx.createBiquadFilter();
      const gain   = ctx.createGain();

      src.buffer    = buf;
      filter.type   = 'bandpass';
      filter.frequency.value = 1200 + i * 300;
      filter.Q.value = 0.8;

      gain.gain.setValueAtTime(0.4 - i * 0.1, time + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.04 + 0.12);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      src.start(time + i * 0.04);
    }
  } catch(e) { /* silent fail */ }
}

function playNotificationSound() {
  try {
    const ctx  = createAudioContext();
    const time = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time + i * 0.15);
      gain.gain.setValueAtTime(0.3, time + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, time + i * 0.15 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(time + i * 0.15);
      osc.stop(time + i * 0.15 + 0.35);
    });
  } catch(e) { /* silent fail */ }
}

/* Patch toggleTask to play clap */
const _origToggleTask = window.toggleTask;
window.toggleTask = function(id) {
  const t = (typeof tasks !== 'undefined') ? tasks.find(t => t.id === id) : null;
  if (t && !t.done) {
    playClapSound();
    launchConfetti();
  }
  if (_origToggleTask) _origToggleTask(id);
};

/* ── 3. FLOATING PARTICLES ── */
function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.id = 'particleCanvas';
  canvas.style.cssText = `
    position:fixed; top:0; left:0; width:100%; height:100%;
    pointer-events:none; z-index:0; opacity:0.55;
  `;
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const COLORS = ['#6c63ff','#ff6584','#43e97b','#f6c90e','#00d4ff'];
  const pts = Array.from({ length: 55 }, () => ({
    x:  Math.random() * canvas.width,
    y:  Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: (Math.random() - 0.5) * 0.35,
    r:  Math.random() * 1.6 + 0.5,
    c:  COLORS[Math.floor(Math.random() * COLORS.length)],
    o:  Math.random() * 0.5 + 0.2
  }));

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* Connections */
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 110) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(108,99,255,${0.12 * (1 - d/110)})`;
          ctx.lineWidth = 0.6;
          ctx.stroke();
        }
      }
    }

    /* Dots */
    pts.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = p.c;
      ctx.globalAlpha = p.o;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    requestAnimationFrame(draw);
  }
  draw();
}
initParticles();

/* ── 4. AI CHATBOT ── */
function initChatbot() {
  /* Button */
  const btn = document.createElement('div');
  btn.id = 'chatbotBtn';
  btn.innerHTML = '🤖';
  btn.title = 'AI Assistant';
  btn.style.cssText = `
    position:fixed; bottom:24px; left:24px;
    width:52px; height:52px; border-radius:50%;
    background:linear-gradient(135deg,#6c63ff,#ff6584);
    display:flex; align-items:center; justify-content:center;
    font-size:22px; cursor:pointer; z-index:400;
    box-shadow:0 4px 20px rgba(108,99,255,0.5);
    animation:mascotFloat 3s ease-in-out infinite;
    transition:transform 0.2s;
  `;
  btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.15)');
  btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
  btn.addEventListener('click', toggleChatbot);
  document.body.appendChild(btn);

  /* Panel */
  const panel = document.createElement('div');
  panel.id = 'chatbotPanel';
  panel.style.cssText = `
    position:fixed; bottom:88px; left:24px;
    width:320px; max-height:460px;
    background:#0e0e2a; border:1px solid rgba(108,99,255,0.3);
    border-radius:20px; z-index:400; display:none; flex-direction:column;
    box-shadow:0 20px 60px rgba(0,0,0,0.6);
    animation:dropIn 0.3s ease;
    overflow:hidden;
  `;
  panel.innerHTML = `
    <div style="padding:14px 18px;background:linear-gradient(135deg,rgba(108,99,255,0.2),rgba(255,101,132,0.1));
      border-bottom:1px solid rgba(108,99,255,0.2);display:flex;align-items:center;gap:10px;">
      <span style="font-size:20px;">🤖</span>
      <div>
        <div style="font-weight:700;font-size:14px;color:#e8e8ff;">TimeFlow Assistant</div>
        <div style="font-size:11px;color:#9090b8;">Always here to help</div>
      </div>
      <button onclick="toggleChatbot()" style="margin-left:auto;background:none;border:none;
        color:#9090b8;font-size:16px;cursor:pointer;">✕</button>
    </div>
    <div id="chatMessages" style="flex:1;overflow-y:auto;padding:14px;display:flex;
      flex-direction:column;gap:10px;max-height:300px;
      scrollbar-width:thin;scrollbar-color:#6c63ff #1c1c3a;">
    </div>
    <div style="padding:10px 14px;border-top:1px solid rgba(108,99,255,0.15);display:flex;gap:8px;">
      <input id="chatInput" placeholder="Ask me anything..." style="flex:1;background:#13132f;
        border:1px solid rgba(108,99,255,0.2);color:#e8e8ff;border-radius:10px;
        padding:9px 12px;font-size:13px;outline:none;font-family:'DM Sans',sans-serif;"
        onkeydown="if(event.key==='Enter')sendChat()"/>
      <button onclick="sendChat()" style="background:linear-gradient(135deg,#6c63ff,#8b7cf8);
        border:none;color:#fff;border-radius:10px;padding:9px 14px;
        font-size:14px;cursor:pointer;font-weight:700;">➤</button>
    </div>
  `;
  document.body.appendChild(panel);

  /* Welcome message */
  addBotMessage('👋 Hi! I\'m your TimeFlow assistant. Ask me anything about managing your tasks, productivity tips, or how to use the app!');
}

function toggleChatbot() {
  const panel = document.getElementById('chatbotPanel');
  if (!panel) return;
  const isOpen = panel.style.display === 'flex';
  panel.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) document.getElementById('chatInput')?.focus();
}

function addBotMessage(text) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.style.cssText = `
    background:rgba(108,99,255,0.12); border:1px solid rgba(108,99,255,0.2);
    border-radius:14px 14px 14px 4px; padding:10px 14px;
    font-size:13px; color:#e8e8ff; line-height:1.5; max-width:90%;
  `;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function addUserMessage(text) {
  const msgs = document.getElementById('chatMessages');
  if (!msgs) return;
  const div = document.createElement('div');
  div.style.cssText = `
    background:rgba(255,101,132,0.12); border:1px solid rgba(255,101,132,0.2);
    border-radius:14px 14px 4px 14px; padding:10px 14px;
    font-size:13px; color:#e8e8ff; line-height:1.5;
    max-width:90%; align-self:flex-end; margin-left:auto;
  `;
  div.textContent = text;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
}

function sendChat() {
  const input = document.getElementById('chatInput');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addUserMessage(text);

  // Typing indicator
  const msgs = document.getElementById('chatMessages');
  const typing = document.createElement('div');
  typing.style.cssText = `
    background:rgba(108,99,255,0.08);border:1px solid rgba(108,99,255,0.15);
    border-radius:14px 14px 14px 4px;padding:10px 14px;
    font-size:13px;color:#9090b8;
  `;
  typing.textContent = '🤖 Typing...';
  msgs.appendChild(typing);
  msgs.scrollTop = msgs.scrollHeight;

  setTimeout(() => {
    typing.remove();
    addBotMessage(getBotReply(text.toLowerCase()));
  }, 800);
}

function getBotReply(q) {
  const replies = [
    { keys: ['add','task','create','new'],
      ans: '➕ To add a task, click the "+ Task" button in the top bar or the "Add Task" button in the sidebar. Fill in the name, date, time, and priority!' },
    { keys: ['delete','remove','trash'],
      ans: '🗑️ Hover over any task and click the red × button that appears on the right to delete it.' },
    { keys: ['complete','done','finish','check'],
      ans: '✅ Click the checkbox circle on the left of any task to mark it as complete. You\'ll get a confetti celebration! 🎉' },
    { keys: ['reminder','notification','alert'],
      ans: '🔔 TimeFlow automatically reminds you 18 and 10 minutes before each task — even when you\'re not in the app! Make sure notifications are allowed.' },
    { keys: ['offline','internet','connection'],
      ans: '📶 TimeFlow works fully offline! Your tasks are saved locally and will sync to the cloud automatically when you reconnect.' },
    { keys: ['install','apk','phone','app','home'],
      ans: '📱 Click the "Install App" button in the top bar to install TimeFlow on your phone or desktop. It works just like a native app!' },
    { keys: ['priority','high','medium','low'],
      ans: '🎯 When adding a task, choose High 🔴, Medium 🟡, or Low 🟢 priority. High priority tasks appear first in your timeline!' },
    { keys: ['category','tag','work','study','health','personal'],
      ans: '🏷️ You can tag tasks as Work 💼, Personal 🏡, Health 💪, or Study 📚. Filter tasks by category using the sidebar!' },
    { keys: ['ai','optimize','smart'],
      ans: '🤖 Click "✨ Optimize" on the Today page to let AI automatically arrange your tasks by priority and time for maximum productivity!' },
    { keys: ['calendar'],
      ans: '📅 The Calendar view shows all your tasks by date. Click any day to see tasks for that day or add a new one!' },
    { keys: ['analytics','stats','chart'],
      ans: '📊 Visit the Analytics page to see your task completion rate, category breakdown, and 7-day productivity trends!' },
    { keys: ['sound','clap','music'],
      ans: '👏 You\'ll hear a satisfying clap sound whenever you complete a task! Enjoy the dopamine hit! 🎊' },
    { keys: ['hello','hi','hey','help'],
      ans: '👋 Hello! I\'m here to help you get the most out of TimeFlow. Ask me about adding tasks, notifications, offline mode, or any feature!' },
    { keys: ['time','duration','long'],
      ans: '⏱️ When adding a task, set the start time and duration (in minutes). The Smart Timeline on the Today page shows all tasks laid out by time!' },
  ];

  for (const r of replies) {
    if (r.keys.some(k => q.includes(k))) return r.ans;
  }

  return '🤔 I\'m not sure about that. Try asking about: adding tasks, notifications, offline mode, priorities, categories, the calendar, or analytics!';
}

/* ── 5. INSTALL PWA BUTTON ── */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  showInstallButton();
});

function showInstallButton() {
  if (document.getElementById('installBtn')) return;
  const btn = document.createElement('button');
  btn.id = 'installBtn';
  btn.innerHTML = '📲 Install App';
  btn.style.cssText = `
    background:linear-gradient(135deg,#43e97b,#38f9d7);
    color:#07071a; border:none; padding:7px 14px;
    border-radius:8px; font-size:12px; font-weight:700;
    cursor:pointer; font-family:'DM Sans',sans-serif;
    transition:all 0.2s;
  `;
  btn.addEventListener('mouseenter', () => {
    btn.style.transform = 'translateY(-2px)';
    btn.style.boxShadow = '0 4px 16px rgba(67,233,123,0.5)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = '';
    btn.style.boxShadow = '';
  });
  btn.addEventListener('click', installApp);

  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight) topbarRight.prepend(btn);
}

async function installApp() {
  if (!deferredInstallPrompt) {
    showToast('📱 Open in Chrome and use "Add to Home Screen" to install!', 'info');
    return;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('🎉 TimeFlow installed successfully!', 'success');
    document.getElementById('installBtn')?.remove();
  }
  deferredInstallPrompt = null;
}

window.addEventListener('appinstalled', () => {
  showToast('✅ App installed! Find it on your home screen.', 'success');
  document.getElementById('installBtn')?.remove();
});

/* ── 6. ONLINE/OFFLINE SYNC ── */
function initOfflineSync() {
  window.addEventListener('online', () => {
    showToast('🌐 Back online! Syncing your data...', 'success');
    playNotificationSound();
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        if (reg.sync) reg.sync.register('sync-tasks');
      });
    }
  });

  window.addEventListener('offline', () => {
    showToast('📶 You\'re offline. Tasks saved locally!', 'info');
  });

  /* Listen for sync message from SW */
  navigator.serviceWorker?.addEventListener('message', e => {
    if (e.data?.type === 'SYNC_TASKS') {
      if (typeof loadTasks === 'function') loadTasks();
    }
  });
}
initOfflineSync();

/* ── 7. NOTIFICATION BELL IN TOPBAR ── */
function addNotificationBell() {
  const existing = document.getElementById('notifBell');
  if (existing) existing.remove();

  const bell = document.createElement('button');
  bell.id = 'notifBell';
  const isOn = localStorage.getItem('tf_push_subscribed') === 'true';
  bell.innerHTML = isOn ? '🔔' : '🔕';
  bell.title     = isOn ? 'Notifications ON — click to test' : 'Enable task reminders';
  bell.style.cssText = `
    background:${isOn ? 'rgba(67,233,123,0.15)' : 'none'};
    border:1px solid ${isOn ? '#43e97b' : 'rgba(108,99,255,0.3)'};
    color:#e8e8ff; border-radius:8px; width:36px; height:36px;
    font-size:15px; cursor:pointer; transition:all 0.2s;
    display:flex; align-items:center; justify-content:center;
  `;

  bell.addEventListener('click', async () => {
    const ok = await subscribeToPush();
    if (ok) {
      bell.innerHTML = '🔔';
      bell.style.background   = 'rgba(67,233,123,0.15)';
      bell.style.borderColor  = '#43e97b';
      bell.title = 'Notifications ON — click to send test';
      if (typeof tasks !== 'undefined') scheduleTaskReminders(tasks);

      /* Send test notification after 5s so user can see it works */
      showToast('⏳ Test notification coming in 5 seconds...', 'info');
      setTimeout(async () => {
        try {
          const userId = localStorage.getItem('tf_user_id');
          await fetch(`${PUSH_SERVER}/api/send-reminder`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
              userId,
              taskName:      'TimeFlow is working!',
              minutesBefore: 0,
              secret:        NOTIFY_SECRET
            })
          });
          showToast('🔔 Check your notification bar!', 'success');
        } catch(e) {
          showToast('⚠️ Could not reach server. Check Vercel deployment.', 'error');
        }
      }, 5000);
    }
  });

  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight) topbarRight.prepend(bell);
}

/* Init everything once app loads */
const _origInitApp = window.initApp;
window.initApp = function() {
  if (_origInitApp) _origInitApp();
  setTimeout(() => {
    addNotificationBell();
    initChatbot();
  }, 500);
};

/* ═══════════════════════════
   GAMIFICATION SYSTEM
═══════════════════════════ */

const GAME = {
  xp:        parseInt(localStorage.getItem('tf_xp')        || '0'),
  streak:    parseInt(localStorage.getItem('tf_streak')    || '0'),
  lastDate:       localStorage.getItem('tf_lastDate')      || '',
  badges:    JSON.parse(localStorage.getItem('tf_badges')  || '[]'),
  totalDone: parseInt(localStorage.getItem('tf_totalDone') || '0'),
};

const LEVELS = [
  { min:0,    name:'Beginner',    icon:'🌱', color:'#43e97b' },
  { min:100,  name:'Planner',     icon:'📋', color:'#6c63ff' },
  { min:300,  name:'Achiever',    icon:'⚡', color:'#f6c90e' },
  { min:600,  name:'Optimizer',   icon:'🚀', color:'#ff6584' },
  { min:1000, name:'Master',      icon:'🏆', color:'#ff6584' },
  { min:2000, name:'Legend',      icon:'👑', color:'#f6c90e' },
];

const BADGES_DEF = [
  { id:'first_task',  name:'First Step',     icon:'🎯', desc:'Complete your first task',         check: g => g.totalDone >= 1   },
  { id:'five_tasks',  name:'On a Roll',      icon:'🔥', desc:'Complete 5 tasks',                 check: g => g.totalDone >= 5   },
  { id:'ten_tasks',   name:'Task Ninja',     icon:'⚡', desc:'Complete 10 tasks',                check: g => g.totalDone >= 10  },
  { id:'fifty_tasks', name:'Productivity God',icon:'👑',desc:'Complete 50 tasks',               check: g => g.totalDone >= 50  },
  { id:'streak3',     name:'3-Day Streak',   icon:'🔥', desc:'Complete tasks 3 days in a row',  check: g => g.streak >= 3      },
  { id:'streak7',     name:'Week Warrior',   icon:'⚔️', desc:'Complete tasks 7 days in a row',  check: g => g.streak >= 7      },
  { id:'early_bird',  name:'Early Bird',     icon:'🌅', desc:'Complete a task before 9am',      check: () => new Date().getHours() < 9 },
  { id:'night_owl',   name:'Night Owl',      icon:'🦉', desc:'Complete a task after 10pm',      check: () => new Date().getHours() >= 22 },
];

function getLevel() {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (GAME.xp >= LEVELS[i].min) return LEVELS[i];
  }
  return LEVELS[0];
}

function getNextLevel() {
  for (let i = 0; i < LEVELS.length; i++) {
    if (GAME.xp < LEVELS[i].min) return LEVELS[i];
  }
  return null;
}

function saveGame() {
  localStorage.setItem('tf_xp',        GAME.xp);
  localStorage.setItem('tf_streak',    GAME.streak);
  localStorage.setItem('tf_lastDate',  GAME.lastDate);
  localStorage.setItem('tf_badges',    JSON.stringify(GAME.badges));
  localStorage.setItem('tf_totalDone', GAME.totalDone);
}

function addXP(amount, reason) {
  GAME.xp += amount;
  saveGame();
  showXPPopup(amount, reason);
  updateStreakAndBadges();
  updateGameUI();
}

function showXPPopup(amount, reason) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; top:80px; right:24px; z-index:500;
    background:linear-gradient(135deg,#6c63ff,#ff6584);
    color:#fff; padding:12px 20px; border-radius:14px;
    font-weight:700; font-size:14px;
    box-shadow:0 8px 24px rgba(108,99,255,0.5);
    animation:xpPop 0.4s cubic-bezier(0.34,1.56,0.64,1);
    pointer-events:none;
  `;
  el.innerHTML = `+${amount} XP ⚡ <span style="font-size:11px;opacity:0.85;">${reason}</span>`;
  document.body.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'all 0.4s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateY(-20px)';
    setTimeout(() => el.remove(), 400);
  }, 1800);
}

function updateStreakAndBadges() {
  const today = new Date().toDateString();
  if (GAME.lastDate !== today) {
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    GAME.streak    = (GAME.lastDate === yesterday) ? GAME.streak + 1 : 1;
    GAME.lastDate  = today;
    saveGame();
  }

  // Check for new badges
  BADGES_DEF.forEach(b => {
    if (!GAME.badges.includes(b.id) && b.check(GAME)) {
      GAME.badges.push(b.id);
      saveGame();
      setTimeout(() => showBadgeUnlock(b), 1000);
    }
  });
}

function showBadgeUnlock(badge) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed; bottom:100px; left:50%; transform:translateX(-50%);
    background:#0e0e2a; border:2px solid #f6c90e;
    border-radius:20px; padding:20px 28px; z-index:500;
    text-align:center; box-shadow:0 20px 50px rgba(0,0,0,0.7);
    animation:xpPop 0.5s cubic-bezier(0.34,1.56,0.64,1);
    min-width:240px;
  `;
  el.innerHTML = `
    <div style="font-size:2.5rem;margin-bottom:8px;">${badge.icon}</div>
    <div style="color:#f6c90e;font-weight:800;font-size:13px;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">Badge Unlocked!</div>
    <div style="color:#e8e8ff;font-weight:700;font-size:16px;margin-bottom:4px;">${badge.name}</div>
    <div style="color:#9090b8;font-size:12px;">${badge.desc}</div>
  `;
  document.body.appendChild(el);
  playNotificationSound();
  setTimeout(() => {
    el.style.transition = 'all 0.4s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => el.remove(), 400);
  }, 3500);
}

function buildGamePanel() {
  const panel = document.createElement('div');
  panel.id = 'gamePanel';
  panel.style.cssText = `
    position:fixed; top:70px; right:16px; z-index:300;
    background:#0e0e2a; border:1px solid rgba(108,99,255,0.3);
    border-radius:16px; padding:16px; min-width:200px;
    box-shadow:0 16px 40px rgba(0,0,0,0.6);
    display:none; flex-direction:column; gap:12px;
    animation:dropIn 0.3s ease;
  `;
  document.body.appendChild(panel);
  updateGameUI();
}

function updateGameUI() {
  const panel = document.getElementById('gamePanel');
  if (!panel) return;
  const lvl  = getLevel();
  const next = getNextLevel();
  const pct  = next ? Math.round(((GAME.xp - lvl.min) / (next.min - lvl.min)) * 100) : 100;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:28px;">${lvl.icon}</span>
      <div>
        <div style="font-weight:800;font-size:14px;color:${lvl.color};">${lvl.name}</div>
        <div style="font-size:11px;color:#9090b8;">${GAME.xp} XP total</div>
      </div>
    </div>

    <!-- XP Progress bar -->
    <div>
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#9090b8;margin-bottom:5px;">
        <span>${lvl.name}</span>
        <span>${next ? next.name : 'MAX'}</span>
      </div>
      <div style="background:#1c1c3a;border-radius:999px;height:8px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:linear-gradient(to right,#6c63ff,#ff6584);border-radius:999px;transition:width 0.5s ease;"></div>
      </div>
      <div style="text-align:right;font-size:10px;color:#6c63ff;margin-top:3px;">${pct}%${next ? ` → ${next.min - GAME.xp} XP to go` : ' Max level!'}</div>
    </div>

    <!-- Streak -->
    <div style="display:flex;align-items:center;gap:8px;background:rgba(246,201,14,0.08);
      border:1px solid rgba(246,201,14,0.2);border-radius:10px;padding:8px 12px;">
      <span style="font-size:18px;">🔥</span>
      <div>
        <div style="font-weight:700;font-size:13px;color:#f6c90e;">${GAME.streak} Day Streak</div>
        <div style="font-size:10px;color:#9090b8;">Keep it going!</div>
      </div>
    </div>

    <!-- Badges -->
    <div>
      <div style="font-size:10px;color:#9090b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Badges (${GAME.badges.length}/${BADGES_DEF.length})</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;">
        ${BADGES_DEF.map(b => `
          <span title="${b.name}: ${b.desc}" style="font-size:18px;opacity:${GAME.badges.includes(b.id) ? '1' : '0.2'};
            cursor:default;filter:${GAME.badges.includes(b.id) ? 'none' : 'grayscale(1)'};">
            ${b.icon}
          </span>`).join('')}
      </div>
    </div>

    <!-- Stats -->
    <div style="border-top:1px solid rgba(108,99,255,0.15);padding-top:10px;font-size:12px;color:#9090b8;">
      ✅ ${GAME.totalDone} tasks completed
    </div>
  `;
}

function toggleGamePanel() {
  const p = document.getElementById('gamePanel');
  if (!p) return;
  p.style.display = p.style.display === 'flex' ? 'none' : 'flex';
}

function addGameButton() {
  const btn = document.createElement('button');
  btn.id = 'gameBtn';
  const lvl = getLevel();
  btn.innerHTML = `${lvl.icon} ${GAME.xp} XP`;
  btn.title = 'Your progress & badges';
  btn.style.cssText = `
    background:linear-gradient(135deg,rgba(108,99,255,0.2),rgba(255,101,132,0.1));
    border:1px solid rgba(108,99,255,0.35);
    color:#e8e8ff; border-radius:8px; padding:6px 12px;
    font-size:12px; font-weight:700; cursor:pointer;
    font-family:'DM Sans',sans-serif; transition:all 0.2s;
    display:flex; align-items:center; gap:5px;
  `;
  btn.addEventListener('mouseenter', () => btn.style.borderColor = '#6c63ff');
  btn.addEventListener('mouseleave', () => btn.style.borderColor = 'rgba(108,99,255,0.35)');
  btn.addEventListener('click', toggleGamePanel);

  const topbarRight = document.querySelector('.topbar-right');
  if (topbarRight) topbarRight.prepend(btn);
}

/* Hook into task completion */
const _origToggle = window.toggleTask;
window.toggleTask = function(id) {
  const t = (typeof tasks !== 'undefined') ? tasks.find(x => x.id === id) : null;
  const wasNotDone = t && !t.done;

  if (_origToggle) _origToggle(id);

  if (wasNotDone) {
    GAME.totalDone++;
    saveGame();

    // XP based on priority
    const xpMap = { high: 30, med: 20, low: 10 };
    const xp    = xpMap[t?.priority] || 15;
    const label = t?.priority === 'high' ? '🔴 High priority!' :
                  t?.priority === 'med'  ? '🟡 Medium task'    : '🟢 Task done';
    addXP(xp, label);

    // Update game button
    const btn = document.getElementById('gameBtn');
    const lvl = getLevel();
    if (btn) btn.innerHTML = `${lvl.icon} ${GAME.xp} XP`;

    playClapSound();
    launchConfetti();
  }
};

/* Add XP CSS animation */
const xpStyle = document.createElement('style');
xpStyle.textContent = `
@keyframes xpPop {
  from { opacity:0; transform:scale(0.6) translateY(10px); }
  to   { opacity:1; transform:scale(1) translateY(0); }
}`;
document.head.appendChild(xpStyle);

/* Init gamification */
const _origInit2 = window.initApp;
window.initApp = function() {
  if (_origInit2) _origInit2();
  setTimeout(() => {
    addGameButton();
    buildGamePanel();
    updateStreakAndBadges();
  }, 600);
};
