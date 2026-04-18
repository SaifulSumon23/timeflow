export default async function handler(req, res) {
  // Allow both GET (from cron) and POST
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Security — only allow cron service or internal calls
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET || 'timeflow-cron-2026';

  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    // Call send-reminder internally
    const baseUrl = `https://${req.headers.host}`;
    const response = await fetch(`${baseUrl}/api/send-reminder`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ secret: process.env.NOTIFY_SECRET })
    });

    const data = await response.json();
    res.json({ success: true, ...data, timestamp: new Date().toISOString() });

  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}