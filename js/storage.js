// ===== storage.js =====
// Primary: Firestore (cloud, syncs across devices)
// Fallback: localStorage (works offline instantly)

let tasks = [];
let firestoreListener = null;

// ---- FIRESTORE PATH ----
function userTasksRef() {
  if (!currentUser) return null;
  return db.collection('users').doc(currentUser.uid).collection('tasks');
}

// ---- LOAD TASKS ----
// Uses real-time Firestore listener so tasks sync across devices instantly
function loadTasks() {
  const ref = userTasksRef();
  if (!ref) return;

  // Unsubscribe previous listener
  if (firestoreListener) firestoreListener();

  firestoreListener = ref.orderBy('created', 'asc').onSnapshot(
    snapshot => {
      tasks = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      // Also cache locally for offline access
      try { localStorage.setItem('tf_tasks_' + currentUser.uid, JSON.stringify(tasks)); } catch(e) {}
      refreshCurrentPage();
      document.dispatchEvent(new Event('tasks-updated'));
    },
    err => {
      console.warn('[Storage] Firestore error, using local cache:', err);
      loadFromLocalStorage();
    }
  );
}

function loadFromLocalStorage() {
  if (!currentUser) return;
  try {
    const raw = localStorage.getItem('tf_tasks_' + currentUser.uid);
    tasks = raw ? JSON.parse(raw) : [];
  } catch(e) { tasks = []; }
  refreshCurrentPage();
}

// ---- ADD TASK ----
async function addTask(task) {
  const ref = userTasksRef();
  if (!ref) return;
  try {
    const docRef = await ref.add(task);
    task.id = docRef.id;
    // Listener will update tasks array automatically
  } catch(err) {
    console.warn('[Storage] Add failed, saving locally:', err);
    tasks.push(task);
    saveToLocalStorage();
  }
}

// ---- UPDATE TASK ----
async function updateTask(id, changes) {
  const ref = userTasksRef();
  if (!ref) return;
  try {
    await ref.doc(id).update(changes);
  } catch(err) {
    console.warn('[Storage] Update failed, updating locally:', err);
    const idx = tasks.findIndex(t => t.id === id);
    if (idx >= 0) { tasks[idx] = { ...tasks[idx], ...changes }; saveToLocalStorage(); }
  }
}

// ---- DELETE TASK ----
async function removeTask(id) {
  const ref = userTasksRef();
  if (!ref) return;
  try {
    await ref.doc(id).delete();
  } catch(err) {
    console.warn('[Storage] Delete failed, removing locally:', err);
    tasks = tasks.filter(t => t.id !== id);
    saveToLocalStorage();
  }
}

// ---- HELPERS ----
function saveToLocalStorage() {
  if (!currentUser) return;
  try { localStorage.setItem('tf_tasks_' + currentUser.uid, JSON.stringify(tasks)); } catch(e) {}
  refreshCurrentPage();
}

function getTasksByDate(dateStr) {
  return tasks.filter(t => t.date === dateStr);
}

function todayKey() {
  return new Date().toISOString().split('T')[0];
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m =>
    ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[m])
  );
}
