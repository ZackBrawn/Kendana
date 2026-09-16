const { prisma } = require('../config/db');
const { sendNotificationToUser } = require('../controllers/push');

let timer;
let running = false;

const getNextRun = (date, frequency) => {
  const next = new Date(date);
  if (frequency === 'daily') next.setDate(next.getDate() + 1);
  else if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  else return null;
  return next;
};

const processDueNotifications = async () => {
  if (running) return;
  running = true;
  try {
    const due = await prisma.customNotification.findMany({
      where: { active: true, scheduled_at: { lte: new Date() } },
      orderBy: { scheduled_at: 'asc' },
      take: 100
    });

    for (const notification of due) {
      const nextRun = getNextRun(notification.scheduled_at, notification.frequency);
      await prisma.customNotification.update({
        where: { id: notification.id },
        data: nextRun ? { scheduled_at: nextRun } : { active: false }
      });

      await sendNotificationToUser(notification.user_id, {
        title: notification.title,
        body: notification.body,
        url: '/other/notifikasi',
        tag: `kendana-custom-${notification.id}`
      }, { ignorePresence: true });
    }
  } catch (err) {
    console.error('Custom notification scheduler error:', err.message);
  } finally {
    running = false;
  }
};

exports.startCustomNotificationScheduler = () => {
  if (timer) return;
  processDueNotifications();
  timer = setInterval(processDueNotifications, 5000);
};
