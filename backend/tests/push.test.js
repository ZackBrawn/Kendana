const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../config/db', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    pushSubscription: {
      count: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn()
    }
  }
}));

jest.mock('web-push', () => ({
  generateVAPIDKeys: () => ({ publicKey: 'public-key', privateKey: 'private-key' }),
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn().mockResolvedValue(undefined)
}));

const { prisma } = require('../config/db');
const webpush = require('web-push');
const pushRoutes = require('../routes/push');
const { JWT_SECRET } = require('../middlewares/auth');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/notifications', pushRoutes);
  return app;
};

describe('Push notification routes', () => {
  const token = jwt.sign({ id: 7 }, JWT_SECRET);
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  test('GET /key returns the public VAPID key', async () => {
    const response = await request(app)
      .get('/api/notifications/key')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ publicKey: 'public-key' });
  });

  test('POST /test rejects users without a subscription', async () => {
    prisma.user.findUnique.mockResolvedValue({ push_notifications: true });
    prisma.pushSubscription.count.mockResolvedValue(0);
    prisma.pushSubscription.findMany.mockResolvedValue([]);

    const response = await request(app)
      .post('/api/notifications/test')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Belum ada perangkat/);
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  test('POST /test rejects users who disabled push notifications', async () => {
    prisma.user.findUnique.mockResolvedValue({ push_notifications: false });

    const response = await request(app)
      .post('/api/notifications/test')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/dinonaktifkan/);
    expect(prisma.pushSubscription.count).not.toHaveBeenCalled();
  });

  test('POST /test sends a notification to the authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValue({ push_notifications: true });
    prisma.pushSubscription.count.mockResolvedValue(1);
    prisma.pushSubscription.findMany.mockResolvedValue([{
      id: 1,
      endpoint: 'https://push.example/subscription',
      p256dh: 'p256dh-key',
      auth: 'auth-key'
    }]);

    const response = await request(app)
      .post('/api/notifications/test')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: 'https://push.example/subscription' }),
      expect.stringContaining('Notifikasi test berhasil diterima.')
    );
  });
});
