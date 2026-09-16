const { prisma } = require('../config/db');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    const allWallets = await prisma.wallet.findMany({
      where: { user_id: userId },
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
      where: { user_id: userId },
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

