// ============================================================
//  firebase-config.js
//  STEP 1: Paste your Firebase project config here.
//  Get it from: Firebase Console → Project Settings → Your Apps
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDhZe_u6ZRUqgpjDELfrGN-tGZiE-FlTCU",
  authDomain: "timeflow-99313.firebaseapp.com",
  projectId: "timeflow-99313",
  storageBucket: "timeflow-99313.appspot.com",
  messagingSenderId: "342513941021",
  appId: "1:342513941021:web:19bea59034a629089ba4f4",
  measurementId: "G-3WNX601F2V"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export references used by other modules
const auth = firebase.auth();
const db   = firebase.firestore();

// Enable offline persistence (tasks work even without internet)
db.enablePersistence({ synchronizeTabs: true })
  .then(() => console.log('[Firebase] Offline persistence enabled'))
  .catch(err => {
    if (err.code === 'failed-precondition') {
      console.warn('[Firebase] Multiple tabs open — persistence disabled in this tab');
    } else if (err.code === 'unimplemented') {
      console.warn('[Firebase] Browser does not support offline persistence');
    }
  });

console.log('[Firebase] Initialized');
