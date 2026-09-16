const { prisma } = require('../config/db');

exports.getAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch expense logs
    const expenseLogs = await prisma.transactionLog.findMany({
      where: {
        user_id: userId,
        type: { name: 'Expense' },
        category_id: { not: null }
      },
      include: { category: true }
    });

    const categoryMap = {};
    expenseLogs.forEach(log => {
      const catName = log.category?.category_name || 'Lainnya';
      const icon = log.category?.icon || '📁';
      if (!categoryMap[catName]) {
        categoryMap[catName] = { category_name: catName, icon, total: 0 };
      }
      categoryMap[catName].total += parseFloat(log.amount);
    });

    const categoryBreakdown = Object.values(categoryMap).sort((a, b) => b.total - a.total);

    // Fetch monthly trends
    const allLogs = await prisma.transactionLog.findMany({
      where: { user_id: userId },
      include: { type: true },
      orderBy: { date: 'asc' }
    });

    const monthMap = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    allLogs.forEach(log => {
      const d = new Date(log.date);
      const mKey = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      if (!monthMap[mKey]) {
        monthMap[mKey] = { month: mKey, income: 0, expense: 0, rawDate: d };
      }
      const amt = parseFloat(log.amount);
      if (log.type?.name === 'Income') monthMap[mKey].income += amt;
      if (log.type?.name === 'Expense') monthMap[mKey].expense += amt;
    });

    const monthlyTrends = Object.values(monthMap)
      .sort((a, b) => a.rawDate - b.rawDate)
      .slice(-6)
      .map(({ month, income, expense }) => ({ month, income, expense }));

    res.json({
      categoryBreakdown,
      monthlyTrends
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

