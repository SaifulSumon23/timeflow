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

  const { secret } = req.body;
  if (secret !== process.env.NOTIFY_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    initAdmin();
    const db  = getFirestore();

    // Get all scheduled reminders that are due now
    const now       = Date.now();
    const snapshot  = await db.collection('scheduled_reminders')
      .where('fireAt', '<=', now)
      .where('sent', '==', false)
      .get();

    if (snapshot.empty) {
      return res.json({ sent: 0, message: 'No reminders due' });
    }

    let sent = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const reminder = doc.data();

      // Get user subscription
      const subDoc = await db.collection('push_subscriptions')
        .doc(reminder.userId).get();

      if (!subDoc.exists) {
        batch.delete(doc.ref);
        continue;
      }

      const { subscription } = subDoc.data();

      const payload = JSON.stringify({
        title:  '⏰ TimeFlow Reminder',
        body:   `"${reminder.taskName}" starts in ${reminder.minutesBefore} minutes!`,
        icon:   '/icons/icon-192.png',
        badge:  '/icons/icon-192.png',
        tag:    `reminder-${reminder.taskId}-${reminder.minutesBefore}`,
        sound:  'default',
        data:   { url: '/' }
      });

      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
        // Mark as sent
        batch.update(doc.ref, { sent: true, sentAt: now });
      } catch(err) {
        console.error('[Push] Failed:', err.message);
        if (err.statusCode === 410) {
          // Expired subscription
          await db.collection('push_subscriptions').doc(reminder.userId).delete();
        }
        batch.delete(doc.ref);
      }
    }

    await batch.commit();
    console.log(`[Cron] Sent ${sent} reminders`);
    res.json({ sent });

  } catch(err) {
    console.error('[send-reminder]', err);
    res.status(500).json({ error: err.message });
  }
}