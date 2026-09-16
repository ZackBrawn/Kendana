const { prisma } = require('../config/db');

exports.getLoans = async (req, res) => {
  const { type } = req.params; // 'debt' or 'receivable'
  const typeName = type === 'debt' ? 'Debt' : 'Receivable';
  try {
    const logs = await prisma.transactionLog.findMany({
      where: {
        user_id: req.user.id,
        type: { name: typeName }
      },
      include: {
        category: true,
        source_wallet: true,
        destination_wallet: true
      },
      orderBy: { date: 'desc' }
    });

    const formatted = logs.map(tl => ({
      ...tl,
      category_name: tl.category?.category_name,
      source_wallet_name: tl.source_wallet?.name,
      dest_wallet_name: tl.destination_wallet?.name
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSubjects = async (req, res) => {
  const { type } = req.params; // 'debt' or 'receivable'
  const typeName = type === 'debt' ? 'Debt' : 'Receivable';
  try {
    const subjects = await prisma.transactionLog.findMany({
      where: {
        user_id: req.user.id,
        type: { name: typeName },
        subject: { not: '-' }
      },
      select: {
        subject: true
      },
      distinct: ['subject']
    });

    res.json(subjects.map(s => s.subject));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
