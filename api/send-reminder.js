import webpush from 'web-push';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

webpush.setVapidDetails(
  'mailto:beckham221b@gmail.com',
  process.env.VAPID_PUBLIC,
  process.env.VAPID_PRIVATE
);

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

  const { userId, taskName, minutesBefore, secret } = req.body;

  if (secret !== process.env.NOTIFY_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    initAdmin();
    const db  = getFirestore();
    const doc = await db.collection('push_subscriptions').doc(userId).get();

    if (!doc.exists) return res.status(404).json({ error: 'No subscription found' });

    const { subscription } = doc.data();
    const payload = JSON.stringify({
      title:  minutesBefore === 0 ? '✅ TimeFlow is working!' : '⏰ TimeFlow Reminder',
      body:   minutesBefore === 0
        ? 'Push notifications are active! You\'ll get task reminders.'
        : `"${taskName}" starts in ${minutesBefore} minutes!`,
      icon:   '/icons/icon-192.png',
      badge:  '/icons/icon-192.png',
      tag:    `reminder-${taskName}-${minutesBefore}`,
      data:   { url: '/' }
    });

    await webpush.sendNotification(subscription, payload);
    res.json({ success: true });

  } catch(err) {
    console.error('[send-reminder]', err.message);
    if (err.statusCode === 410) {
      /* Subscription expired — delete it */
      const db = getFirestore();
      await db.collection('push_subscriptions').doc(userId).delete();
    }
    res.status(500).json({ error: err.message });
  }
}
