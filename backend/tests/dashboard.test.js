jest.mock('../config/db', () => ({
  prisma: {
    wallet: { findMany: jest.fn() },
    transactionLog: { findMany: jest.fn() },
    $queryRaw: jest.fn()
  }
}));

const { prisma } = require('../config/db');
const { getDashboard } = require('../controllers/dashboard');

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

describe('Dashboard date range', () => {
  afterEach(() => jest.clearAllMocks());

  test('rejects invalid date ranges before querying data', async () => {
    const res = createResponse();

    await getDashboard({
      user: { id: 1 },
      query: { rangeStart: 'invalid', rangeEnd: '2026-11-30T23:59:59.999Z' }
    }, res);

    expect(res.statusCode).toBe(400);
    expect(prisma.wallet.findMany).not.toHaveBeenCalled();
  });

  test('aggregates the selected range and fetches only the requested transaction page', async () => {
    prisma.wallet.findMany.mockResolvedValue([
      { id: 1, group_type: 'Liquid', balance: '200.00' },
      { id: 2, group_type: 'System', balance: '500.00' }
    ]);
    prisma.transactionLog.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([
      {
        day: '2026-11-02',
        type_name: 'Income',
        amount: '100.00',
        income: '120.00',
        expense: '30.00',
        transaction_count: '101',
        has_previous_transactions: true,
        has_next_transactions: false,
        monthly_income: '80.00',
        monthly_expense: '25.00'
      },
      {
        day: '2026-11-02',
        type_name: 'Expense',
        amount: '30.00'
      },
      {
        day: '2026-11-03',
        type_name: 'Income',
        amount: '20.00'
      }
    ]);

    const res = createResponse();
    await getDashboard({
      user: { id: 7 },
      query: {
        rangeStart: '2026-11-01T00:00:00.000Z',
        rangeEnd: '2026-11-30T23:59:59.999Z',
        offset: '50',
        limit: '100'
      }
    }, res);

    expect(res.statusCode).toBe(200);
    expect(prisma.transactionLog.findMany).toHaveBeenCalledWith(expect.objectContaining({
      skip: 50,
      take: 50,
      where: expect.objectContaining({ user_id: 7, deleted_at: null })
    }));
    expect(res.body.wallets).toHaveLength(1);
    expect(res.body.totalBalance).toBe(200);
    expect(res.body.monthlyIncome).toBe(80);
    expect(res.body.monthlyExpense).toBe(25);
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    expect(res.body.rangeSummary).toMatchObject({
      income: 120,
      expense: 30,
      trend: [70, 20],
      transactionCount: 101,
      hasPreviousTransactions: true,
      hasNextTransactions: false
    });
  });
});
