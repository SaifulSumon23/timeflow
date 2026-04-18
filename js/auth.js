// ===== auth.js — Firebase Authentication =====
// Supports: Google Sign-In + Email/Password Sign-Up/Sign-In


// Handle redirect result when page loads back after Google sign-in
auth.getRedirectResult()
  .then(result => {
    if (result && result.user) {
      // User signed in via redirect — onAuthStateChanged will handle the rest
      console.log('[Auth] Redirect sign-in successful:', result.user.email);
    }
  })
  .catch(err => {
    if (err.code !== 'auth/no-current-user') {
      handleAuthError(err);
    }
  });

let currentUser = null;
let selectedPriority = 'high';

// ---- UI HELPERS ----
function switchAuthTab(tab) {
  document.getElementById('formLogin').style.display    = tab === 'login'    ? 'block' : 'none';
  document.getElementById('formRegister').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tabLogin').classList.toggle('active',    tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
}

function toggleEye(inputId, btn) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

function setAuthLoading(on, msg) {
  ['formLogin','formRegister'].forEach(id => {
    document.getElementById(id).style.display = on ? 'none' : 'block';
  });
  const ld = document.getElementById('authLoading');
  ld.style.display = on ? 'block' : 'none';
  if (msg) document.getElementById('authLoadingMsg').textContent = msg;
  // Re-show the correct form when turning off
  if (!on) {
    const activeTab = document.getElementById('tabLogin').classList.contains('active') ? 'login' : 'register';
    switchAuthTab(activeTab);
  }
}

// ---- GOOGLE SIGN-IN ----
function signInWithGoogle() {
  setAuthLoading(true, 'Redirecting to Google Sign-In...');
  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  // Use redirect instead of popup — works on all browsers and domains
  auth.signInWithRedirect(provider)
    .catch(err => {
      setAuthLoading(false);
      handleAuthError(err);
    });
}
// ---- EMAIL SIGN-IN ----
function signInWithEmail() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showToast('Please fill in all fields', 'error'); return; }
  setAuthLoading(true, 'Signing in...');
  auth.signInWithEmailAndPassword(email, password)
    .catch(err => {
      setAuthLoading(false);
      handleAuthError(err);
    });
}

// ---- EMAIL REGISTER ----
function registerWithEmail() {
  const name     = document.getElementById('regName').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm  = document.getElementById('regConfirm').value;

  if (!name)                          { showToast('Please enter your name', 'error'); return; }
  if (!email)                         { showToast('Please enter your email', 'error'); return; }
  if (password.length < 6)            { showToast('Password must be at least 6 characters', 'error'); return; }
  if (password !== confirm)           { showToast('Passwords do not match', 'error'); return; }

  setAuthLoading(true, 'Creating your account...');
  auth.createUserWithEmailAndPassword(email, password)
    .then(result => result.user.updateProfile({ displayName: name }))
    .catch(err => {
      setAuthLoading(false);
      handleAuthError(err);
    });
}

// ---- FORGOT PASSWORD ----
function forgotPassword() {
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) { showToast('Enter your email above first', 'error'); return; }
  auth.sendPasswordResetEmail(email)
    .then(() => showToast('Password reset email sent! Check your inbox 📧', 'success'))
    .catch(err => handleAuthError(err));
}

// ---- LOGOUT ----
function handleLogout() {
  auth.signOut()
    .then(() => {
      currentUser = null;
      location.reload();
    })
    .catch(err => console.error('[Auth] Logout error:', err));
}

// ---- ERROR HANDLER ----
function handleAuthError(err) {
  const messages = {
    'auth/invalid-email':            'Invalid email address.',
    'auth/user-disabled':            'This account has been disabled.',
    'auth/user-not-found':           'No account found with this email.',
    'auth/wrong-password':           'Incorrect password. Try again.',
    'auth/email-already-in-use':     'An account already exists with this email.',
    'auth/weak-password':            'Password is too weak (min 6 characters).',
    'auth/network-request-failed':   'Network error. Check your connection.',
    'auth/popup-closed-by-user':     'Sign-in popup was closed.',
    'auth/cancelled-popup-request':  'Sign-in cancelled.',
    'auth/too-many-requests':        'Too many attempts. Please wait a moment.',
    'auth/invalid-credential':       'Incorrect email or password.',
  };
  const msg = messages[err.code] || err.message || 'Authentication failed.';
  showToast(msg, 'error');
  console.error('[Auth] Error:', err.code, err.message);
}

// ---- AUTH STATE LISTENER ----
// This fires automatically when sign-in succeeds or user is already logged in
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = {
      uid:     user.uid,
      name:    user.displayName || user.email.split('@')[0],
      email:   user.email,
      picture: user.photoURL || null
    };
    setAuthLoading(false);
    initApp();
  } else {
    // Not logged in — show auth screen
    document.getElementById('authScreen').style.display  = 'flex';
    document.getElementById('appShell').classList.add('hidden');
    setAuthLoading(false);
  }
});

// Enter key support on login form
document.addEventListener('DOMContentLoaded', () => {
  ['loginEmail','loginPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') signInWithEmail(); });
  });
  ['regName','regEmail','regPassword','regConfirm'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') registerWithEmail(); });
  });
});
