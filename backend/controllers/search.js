const { prisma } = require('../config/db');

exports.search = async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === '') {
    return res.json({ results: [], total: 0 });
  }

  const userId = req.user.id;
  const term = q.trim().toLowerCase();

  try {
    const results = [];

    // 1. Wallets
    const wallets = await prisma.wallet.findMany({
      where: {
        user_id: userId,
        group_type: { not: 'System' },
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { keyword: { contains: term, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    wallets.forEach(w => {
      results.push({
        type: 'Wallet',
        label: w.name,
        description: 'Buka dompet',
        route: `/wallets?openDetail=${w.id}`,
        icon: w.icon || 'wallet',
        id: `wallet-${w.id}`,
        color: 'blue'
      });
    });

    // 2. Categories
    const categories = await prisma.category.findMany({
      where: {
        user_id: userId,
        OR: [
          { category_name: { contains: term, mode: 'insensitive' } },
          { keyword: { contains: term, mode: 'insensitive' } }
        ]
      },
      take: 5
    });

    categories.forEach(c => {
      results.push({
        type: 'Kategori',
        label: c.category_name,
        description: 'Lihat transaksi kategori ini',
        route: `/categories/${c.id}`,
        icon: c.icon || 'folder',
        id: `category-${c.id}`,
        color: 'emerald'
      });
    });

    // 3. Transactions
    const transactions = await prisma.transactionLog.findMany({
      where: {
        user_id: userId,
        OR: [
          { subject: { contains: term, mode: 'insensitive' } },
          { notes: { contains: term, mode: 'insensitive' } },
          { reference_number: { contains: term, mode: 'insensitive' } }
        ]
      },
      include: {
        type: true,
        category: true,
        source_wallet: true,
        destination_wallet: true
      },
      orderBy: { date: 'desc' },
      take: 10
    });

    transactions.forEach(t => {
      results.push({
        type: 'Transaksi',
        id: `transaction-${t.id}`,
        transaction_id: t.id,
        label: t.subject || 'Transaksi',
        amount: parseFloat(t.amount),
        date: t.date,
        is_cleared: !!t.is_cleared,
        transaction_type: t.type ? { id: t.type.id, name: t.type.name } : null,
        category: t.category ? { id: t.category.id, category_name: t.category.category_name, icon: t.category.icon } : null,
        source_wallet: t.source_wallet ? { id: t.source_wallet.id, name: t.source_wallet.name, group_type: t.source_wallet.group_type } : null,
        destination_wallet: t.destination_wallet ? { id: t.destination_wallet.id, name: t.destination_wallet.name, group_type: t.destination_wallet.group_type } : null,
        notes: t.notes,
        description: `Rp ${Number(t.amount).toLocaleString('id-ID')} — ${new Date(t.date).toLocaleDateString('id-ID')}`,
        route: `/transactions?editId=${t.id}`,
        icon: t.category?.icon || 'receipt',
        color: 'purple'
      });
    });

    res.json({
      results,
      total: results.length
    });

  } catch (err) {
    console.error('Search controller error:', err);
    res.status(500).json({ error: err.message });
  }
};

