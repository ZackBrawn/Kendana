const webpush = require('web-push');
const { prisma } = require('../config/db');

// Setup VAPID keys with auto-generation fallback
let publicKey = process.env.VAPID_PUBLIC_KEY;
let privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  const keys = webpush.generateVAPIDKeys();
  publicKey = keys.publicKey;
  privateKey = keys.privateKey;
  console.warn('Warning: VAPID keys are missing. Generated temporary development keys; configure VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY for persistent subscriptions.');
}

webpush.setVapidDetails(
  'mailto:support@kendana.com',
  publicKey,
  privateKey
);

// Presence tracker
const userPresence = new Map();

function markActive(userId) {
  userPresence.set(userId, { state: 'active', lastSeen: new Date() });
}

function markAway(userId) {
  userPresence.set(userId, { state: 'away', lastSeen: new Date() });
}

function isUserActive(userId) {
  const presence = userPresence.get(userId);
  if (!presence) return false;
  const isRecent = (new Date() - presence.lastSeen) < 30000; // 30 seconds threshold
  return presence.state === 'active' && isRecent;
}

// Controller actions
exports.subscribe = async (req, res) => {
  const { endpoint, p256dh, auth } = req.body;
  console.log('[DEBUG] subscribe payload:', { endpoint, p256dh: p256dh?.slice(0, 20), auth: auth?.slice(0, 20), userId: req.user?.id });
  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ error: 'Endpoint, p256dh, dan auth wajib disertakan' });
  }

  const userId = req.user.id;
  const userAgent = req.headers['user-agent'] ? req.headers['user-agent'].slice(0, 255) : null;

  try {
    const result = await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        user_id: userId,
        p256dh,
        auth,
        user_agent: userAgent
      },
      create: {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: userAgent
      }
    });
    console.log('[DEBUG] subscribe upsert result:', { id: result.id, endpoint: result.endpoint.slice(0, 50) });
    res.json({ success: true });
  } catch (err) {
    console.error('Push subscribe error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.unsubscribe = async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint wajib disertakan' });
  }

  const userId = req.user.id;

  try {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint, user_id: userId }
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Push unsubscribe error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.presence = async (req, res) => {
  const { state } = req.body;
  if (!state || !['active', 'away'].includes(state)) {
    return res.status(400).json({ error: 'Status presence tidak valid (harus active atau away)' });
  }

  const userId = req.user.id;

  if (state === 'active') {
    markActive(userId);
  } else {
    markAway(userId);
  }

  res.json({ success: true });
};

// Method to send notification to all registered subscriptions of a user
exports.sendNotificationToUser = async (userId, payload, options = {}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { push_notifications: true }
  });
  if (!user || !user.push_notifications) return;

  // If user is active in the browser, suppress push alert to avoid double notifications
  if (options.ignorePresence !== true && isUserActive(userId)) {
    console.log(`User ${userId} is currently active. Suppressing push notification.`);
    return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user_id: userId }
  });

  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);

  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await webpush.sendNotification(pushSubscription, payloadString);
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription has expired or is no longer valid, delete it
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        console.log(`Deleted expired subscription ID ${sub.id}`);
      } else {
        console.error(`Error sending push to subscription ID ${sub.id}:`, err.message);
      }
    }
  }
};

exports.sendTestNotification = async (req, res) => {
  try {
    console.log('[DEBUG] sendTestNotification userId:', req.user.id);
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { push_notifications: true }
    });
    console.log('[DEBUG] user push_notifications:', user?.push_notifications);

    if (!user || !user.push_notifications) {
      return res.status(400).json({ error: 'Notifikasi Web Push sedang dinonaktifkan' });
    }

    const subscriptions = await prisma.pushSubscription.count({
      where: { user_id: req.user.id }
    });
    console.log('[DEBUG] subscription count for user', req.user.id, ':', subscriptions);
    if (subscriptions === 0) {
      const allSubs = await prisma.pushSubscription.findMany();
      console.log('[DEBUG] Total subscriptions in DB:', allSubs.length);
      return res.status(400).json({ error: 'Belum ada perangkat yang terdaftar untuk notifikasi push' });
    }

    await exports.sendNotificationToUser(req.user.id, {
      title: 'Kendana',
      body: 'Notifikasi test berhasil diterima.',
      url: '/other/notifikasi',
      tag: 'kendana-test-notification'
    }, { ignorePresence: true });

    res.json({ success: true, message: 'Notifikasi test sedang dikirim' });
  } catch (err) {
    console.error('Test push error:', err);
    res.status(500).json({ error: 'Gagal mengirim notifikasi test' });
  }
};

// Export VAPID public key so client can register
exports.getPublicKey = (req, res) => {
  res.json({ publicKey });
};
