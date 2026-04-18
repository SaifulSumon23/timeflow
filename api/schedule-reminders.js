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

  const { userId, tasks, secret } = req.body;

  if (secret !== process.env.NOTIFY_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!userId || !tasks) {
    return res.status(400).json({ error: 'Missing userId or tasks' });
  }

  try {
    initAdmin();
    const db  = getFirestore();
    const now = Date.now();

    // Delete old pending reminders for this user
    const oldSnap = await db.collection('scheduled_reminders')
      .where('userId', '==', userId)
      .where('sent', '==', false)
      .get();

    const deleteBatch = db.batch();
    oldSnap.docs.forEach(d => deleteBatch.delete(d.ref));
    await deleteBatch.commit();

    // Schedule new reminders
    const addBatch = db.batch();
    let count = 0;

    for (const task of tasks) {
      if (task.done || !task.time || !task.date) continue;

      const taskDateTime = new Date(`${task.date}T${task.time}`);
      if (isNaN(taskDateTime)) continue;

      for (const mins of [18, 10]) {
        const fireAt = taskDateTime.getTime() - mins * 60 * 1000;
        if (fireAt <= now) continue; // already passed

        const reminderId = `${userId}-${task.id}-${mins}`;
        const ref = db.collection('scheduled_reminders').doc(reminderId);
        addBatch.set(ref, {
          userId,
          taskId:        task.id,
          taskName:      task.name || task.title || 'Task',
          minutesBefore: mins,
          fireAt,
          sent:          false,
          createdAt:     now
        });
        count++;
      }
    }

    await addBatch.commit();
    console.log(`[Schedule] ${count} reminders for user ${userId}`);
    res.json({ success: true, scheduled: count });

  } catch(err) {
    console.error('[schedule-reminders]', err);
    res.status(500).json({ error: err.message });
  }
}