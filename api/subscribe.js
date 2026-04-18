import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:beckham221b@gmail.com',
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

/* In-memory won't persist on Vercel — we use Firebase Firestore to store subs */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length) return;
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    })
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  const { subscription, userId } = req.body;
  if (!subscription || !userId)  return res.status(400).json({ error: 'Missing fields' });

  try {
    initAdmin();
    const db = getFirestore();
    await db.collection('push_subscriptions').doc(userId).set({
      subscription,
      userId,
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true });
  } catch(err) {
    console.error('[subscribe]', err);
    res.status(500).json({ error: err.message });
  }
}