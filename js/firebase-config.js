// ============================================================
//  firebase-config.js
//  STEP 1: Paste your Firebase project config here.
//  Get it from: Firebase Console → Project Settings → Your Apps
// ============================================================

const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT_ID.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId:             "YOUR_APP_ID"
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
