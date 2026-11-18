const { prisma } = require('../config/db');

const DASHBOARD_PAGE_SIZE = 50;

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.query.rangeStart || req.query.rangeEnd) {
      return await getDashboardRange(req, res, userId);
    }

    const allWallets = await prisma.wallet.findMany({
      where: { user_id: userId, is_active: true, deleted_at: null },
      orderBy: { id: 'asc' }
    });

    const liquidWallets = allWallets.filter(w => w.group_type !== 'System');
    const totalBalance = liquidWallets.reduce((acc, w) => acc + parseFloat(w.balance), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthLogs = await prisma.transactionLog.findMany({
      where: {
        user_id: userId,
        deleted_at: null,
        date: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: { type: true }
    });

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    monthLogs.forEach(log => {
      const amt = parseFloat(log.amount);
      if (log.type?.name === 'Income') monthlyIncome += amt;
      if (log.type?.name === 'Expense') monthlyExpense += amt;
    });

    const recentLogs = await prisma.transactionLog.findMany({
      where: { user_id: userId, deleted_at: null },
      include: {
        category: true,
        type: true,
        source_wallet: true,
        destination_wallet: true
      },
      orderBy: [
        { date: 'desc' },
        { created_at: 'desc' }
      ]
    });

    const formattedRecent = recentLogs.map(tl => ({
      ...tl,
      category_name: tl.category?.category_name,
      category_icon: tl.category?.icon,
      type_name: tl.type?.name,
      source_wallet_name: tl.source_wallet?.name,
      dest_wallet_name: tl.destination_wallet?.name
    }));

    res.json({
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      wallets: liquidWallets,
      recentTransactions: formattedRecent
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

async function getDashboardRange(req, res, userId) {
  const start = new Date(req.query.rangeStart);
  const end = new Date(req.query.rangeEnd);
  const offset = Number(req.query.offset ?? 0);
  const requestedLimit = Number(req.query.limit ?? DASHBOARD_PAGE_SIZE);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    !Number.isSafeInteger(requestedLimit) ||
    requestedLimit < 1
  ) {
    return res.status(400).json({ error: 'Rentang tanggal atau halaman dashboard tidak valid' });
  }

  const limit = Math.min(requestedLimit, DASHBOARD_PAGE_SIZE);
  const rangeWhere = {
    user_id: userId,
    deleted_at: null,
    date: { gte: start, lte: end }
  };
  const now = new Date();
  const monthWhere = {
    user_id: userId,
    deleted_at: null,
    date: {
      gte: new Date(now.getFullYear(), now.getMonth(), 1),
      lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    }
  };

  const [allWallets, recentLogs, rangeRows] = await Promise.all([
    prisma.wallet.findMany({
      where: { user_id: userId, is_active: true, deleted_at: null },
      orderBy: { id: 'asc' }
    }),
    prisma.transactionLog.findMany({
      where: rangeWhere,
      include: {
        category: true,
        type: true,
        source_wallet: true,
        destination_wallet: true
      },
      orderBy: [{ date: 'desc' }, { created_at: 'desc' }],
      skip: offset,
      take: limit
    }),
    prisma.$queryRaw`
      WITH range_daily AS (
        SELECT
          TO_CHAR(tl.date::date, 'YYYY-MM-DD') AS day,
          tt.name AS type_name,
          SUM(tl.amount)::text AS amount
        FROM transaction_logs tl
        JOIN transaction_types tt ON tt.id = tl.type_id
        WHERE tl.user_id = ${userId}
          AND tl.deleted_at IS NULL
          AND tl.date >= ${start}
          AND tl.date <= ${end}
        GROUP BY tl.date::date, tt.name
      ),
      range_stats AS (
        SELECT
          COALESCE(SUM(tl.amount) FILTER (WHERE tt.name = 'Income'), 0)::text AS income,
          COALESCE(SUM(tl.amount) FILTER (WHERE tt.name = 'Expense'), 0)::text AS expense,
          COUNT(*)::text AS transaction_count,
          EXISTS (
            SELECT 1 FROM transaction_logs previous
            WHERE previous.user_id = ${userId}
              AND previous.deleted_at IS NULL
              AND previous.date < ${start}
          ) AS has_previous_transactions,
          EXISTS (
            SELECT 1 FROM transaction_logs following
            WHERE following.user_id = ${userId}
              AND following.deleted_at IS NULL
              AND following.date > ${end}
          ) AS has_next_transactions
        FROM transaction_logs tl
        LEFT JOIN transaction_types tt ON tt.id = tl.type_id
        WHERE tl.user_id = ${userId}
          AND tl.deleted_at IS NULL
          AND tl.date >= ${start}
          AND tl.date <= ${end}
      ),
      month_stats AS (
        SELECT
          COALESCE(SUM(tl.amount) FILTER (WHERE tt.name = 'Income'), 0)::text AS monthly_income,
          COALESCE(SUM(tl.amount) FILTER (WHERE tt.name = 'Expense'), 0)::text AS monthly_expense
        FROM transaction_logs tl
        LEFT JOIN transaction_types tt ON tt.id = tl.type_id
        WHERE tl.user_id = ${userId}
          AND tl.deleted_at IS NULL
          AND tl.date >= ${monthWhere.date.gte}
          AND tl.date <= ${monthWhere.date.lte}
      )
      SELECT
        range_daily.day,
        range_daily.type_name,
        range_daily.amount,
        range_stats.income,
        range_stats.expense,
        range_stats.transaction_count,
        range_stats.has_previous_transactions,
        range_stats.has_next_transactions,
        month_stats.monthly_income,
        month_stats.monthly_expense
      FROM range_stats
      CROSS JOIN month_stats
      LEFT JOIN range_daily ON TRUE
      ORDER BY range_daily.day
    `
  ]);

  const liquidWallets = allWallets.filter(wallet => wallet.group_type !== 'System');
  const totalBalance = liquidWallets.reduce((sum, wallet) => sum + Number(wallet.balance), 0);
  const rangeStats = rangeRows[0];
  const dailyTotals = new Map();
  for (const row of rangeRows) {
    if (!row.day || (row.type_name !== 'Income' && row.type_name !== 'Expense')) continue;
    const amount = Number(row.amount || 0);

    dailyTotals.set(
      row.day,
      (dailyTotals.get(row.day) || 0) + (row.type_name === 'Income' ? amount : -amount)
    );
  }

  let trend = [...dailyTotals.keys()].sort().map(day => dailyTotals.get(day));
  if (trend.length === 0) trend = [0, 0];
  else if (trend.length === 1) trend.unshift(0);
  if (trend.length > 48) {
    trend = Array.from({ length: 48 }, (_, index) =>
      trend[Math.round(index * (trend.length - 1) / 47)]
    );
  }

  const formattedRecent = recentLogs.map(transaction => ({
    ...transaction,
    category_name: transaction.category?.category_name,
    category_icon: transaction.category?.icon,
    type_name: transaction.type?.name,
    source_wallet_name: transaction.source_wallet?.name,
    dest_wallet_name: transaction.destination_wallet?.name
  }));

  return res.json({
    totalBalance,
    monthlyIncome: Number(rangeStats.monthly_income),
    monthlyExpense: Number(rangeStats.monthly_expense),
    wallets: liquidWallets,
    recentTransactions: formattedRecent,
    rangeSummary: {
      income: Number(rangeStats.income),
      expense: Number(rangeStats.expense),
      trend,
      transactionCount: Number(rangeStats.transaction_count),
      hasPreviousTransactions: rangeStats.has_previous_transactions,
      hasNextTransactions: rangeStats.has_next_transactions
    }
  });
}
