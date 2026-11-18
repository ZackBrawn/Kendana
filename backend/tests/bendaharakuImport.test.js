const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');

jest.mock('../config/db', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    $transaction: jest.fn()
  }
}));

const { prisma } = require('../config/db');

const createApp = () => {
  const app = express();
  app.use('/api/settings', require('../routes/settings'));
  return app;
};

const makeExport = () => ({
  user: {
    id: 2,
    name: 'Test User',
    email: 'admin@example.com',
    created_at: '2026-04-24 16:17:02'
  },
  transaction_types: [{ id: 8, name: 'Expense' }],
  wallets: [{
    id: 24,
    user_id: 2,
    name: 'Cash',
    balance: '10.25',
    group_type: 'Liquid',
    icon: null,
    keyword: null,
    is_active: true,
    deleted_at: null,
    is_pinned: false,
    account_name: null,
    account_number: null,
    bank_code: null,
    created_at: '2026-04-24 16:17:02',
    updated_at: '2026-04-24 16:17:02'
  }],
  categories: [{
    id: 30,
    user_id: 2,
    type_id: 8,
    category_name: 'Makan',
    icon: null,
    keyword: null,
    is_active: true,
    deleted_at: null,
    system_key: null,
    custom_name: null,
    custom_icon: null,
    custom_keyword: null,
    created_at: '2026-04-24 16:17:02',
    updated_at: '2026-04-24 16:17:02'
  }],
  transactions: [{
    id: 3717,
    reference_number: 'BND-3717',
    user_id: 2,
    date: '2026-06-10',
    type_id: 8,
    category_id: 30,
    source_wallet_id: 24,
    destination_wallet_id: null,
    amount: '2.50',
    balance_before: '10.25',
    balance_after: '7.75',
    subject: 'Makan',
    notes: null,
    is_cleared: true,
    deleted_at: null,
    created_at: '2026-06-10 10:30:00',
    updated_at: '2026-06-10 10:30:00',
    due_date: null,
    due_date_type: null,
    due_date_interval: null
  }]
});

describe('Bendaharaku import settings route', () => {
  const app = createApp();
  const token = jwt.sign(
    { id: 17, email: 'admin@example.com' },
    process.env.JWT_SECRET || 'kendana-super-secret-key'
  );

  beforeEach(() => {
    process.env.KENDANA_DATA_IMPORT_ENABLED = 'true';
    process.env.KENDANA_DATA_IMPORT_ADMIN_EMAIL = 'admin@example.com';
    prisma.user.findUnique.mockResolvedValue({ id: 17, email: 'admin@example.com' });
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.KENDANA_DATA_IMPORT_ENABLED;
    delete process.env.KENDANA_DATA_IMPORT_ADMIN_EMAIL;
  });

  test('imports data with generated ID maps and nullable wallet destinations', async () => {
    const tx = {
      transactionLog: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: 303 })
      },
      transactionType: {
        findMany: jest.fn().mockResolvedValue([{ id: 2, name: 'Expense' }])
      },
      wallet: {
        create: jest.fn().mockResolvedValue({ id: 101 })
      },
      category: {
        create: jest.fn().mockResolvedValue({ id: 202 })
      }
    };
    prisma.$transaction.mockImplementation((callback) => callback(tx));

    const response = await request(app)
      .post('/api/settings/account/import/bendaharaku')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(JSON.stringify(makeExport())), {
        filename: 'bendaharaku.json',
        contentType: 'application/json'
      })
      .expect(200);

    expect(response.body.counts).toEqual({ wallets: 1, categories: 1, transactions: 1 });
    expect(response.body.id_map.wallets).toEqual({ 24: 101 });
    expect(response.body.id_map.categories).toEqual({ 30: 202 });
    expect(response.body.id_map.transactions).toEqual({ 3717: 303 });
    expect(tx.transactionLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ destination_wallet_id: null, category_id: 202 })
    }));
  });

  test('rejects exports without transaction type definitions before opening a transaction', async () => {
    const payload = makeExport();
    delete payload.transaction_types;

    const response = await request(app)
      .post('/api/settings/account/import/bendaharaku')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(JSON.stringify(payload)), {
        filename: 'incomplete.json',
        contentType: 'application/json'
      })
      .expect(400);

    expect(response.body.error).toContain('transaction_types');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('rejects a transaction whose wallet is absent from the source export', async () => {
    const payload = makeExport();
    payload.transactions[0].destination_wallet_id = 28;

    const response = await request(app)
      .post('/api/settings/account/import/bendaharaku')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(JSON.stringify(payload)), {
        filename: 'incomplete.json',
        contentType: 'application/json'
      })
      .expect(400);

    expect(response.body.error).toContain('Wallet tujuan 28');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('refuses import when the migration feature is disabled', async () => {
    process.env.KENDANA_DATA_IMPORT_ENABLED = 'false';

    const response = await request(app)
      .post('/api/settings/account/import/bendaharaku')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from(JSON.stringify(makeExport())), {
        filename: 'bendaharaku.json',
        contentType: 'application/json'
      })
      .expect(403);

    expect(response.body.error).toContain('belum diaktifkan');
  });
});
