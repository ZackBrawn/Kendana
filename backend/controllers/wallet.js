const { prisma } = require('../config/db');
const { logChange } = require('../utils/settingsLogger');

// get all wallets for transaction routing and wallet management.
// Callers that only allow user wallets filter out System wallets themselves.
exports.getWallets = async (req, res) => {
  try {
    const wallets = await prisma.wallet.findMany({
      where: { user_id: req.user.id },
      orderBy: { id: 'asc' }
    });
    res.json(wallets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// create a new wallet
exports.createWallet = async (req, res) => {
  const { name, balance, group_type, icon, keyword } = req.body;
  if (!name) return res.status(400).json({ error: 'Nama dompet wajib diisi' });

  try {
    const wallet = await prisma.wallet.create({
      data: {
        user_id: req.user.id,
        name,
        balance: balance || 0,
        group_type: group_type || 'Liquid',
        icon: icon || '💵',
        keyword: keyword || null
      }
    });

    // log creation
    await logChange(req.user.id, 'wallet_created', 'settings.finance.wallets', null, { id: wallet.id, name: wallet.name });

    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// update an existing wallet (protect system wallets)
exports.updateWallet = async (req, res) => {
  const { id } = req.params;
  const { name, balance, group_type, icon, keyword } = req.body;

  try {
    const wallet = await prisma.wallet.findFirst({
      where: { id: parseInt(id), user_id: req.user.id }
    });

    if (!wallet) return res.status(404).json({ error: 'Dompet tidak ditemukan' });
    if (wallet.group_type === 'System') {
      return res.status(403).json({ error: 'Dompet Sistem tidak boleh diedit' });
    }

    const updatedData = {};
    if (name !== undefined) updatedData.name = name;
    if (balance !== undefined) updatedData.balance = parseFloat(balance);
    if (group_type !== undefined) updatedData.group_type = group_type;
    if (icon !== undefined) updatedData.icon = icon;
    if (keyword !== undefined) updatedData.keyword = keyword;

    const original = { ...wallet };
    const updatedWallet = await prisma.wallet.update({
      where: { id: parseInt(id) },
      data: updatedData
    });

    // log changes
    for (const key of Object.keys(updatedData)) {
      if (original[key] !== updatedWallet[key]) {
        await logChange(req.user.id, `wallet:${key}`, 'settings.finance.wallets', original[key], updatedWallet[key]);
      }
    }

    res.json(updatedWallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a wallet (protect system wallets)
exports.deleteWallet = async (req, res) => {
  const { id } = req.params;

  try {
    const wallet = await prisma.wallet.findFirst({
      where: { id: parseInt(id), user_id: req.user.id }
    });

    if (!wallet) return res.status(404).json({ error: 'Dompet tidak ditemukan' });
    if (wallet.group_type === 'System') {
      return res.status(403).json({ error: 'Dompet Sistem tidak boleh dihapus' });
    }

    // delete dependent transactions or let cascading fail.
    // for clean cleanup: delete logs referencing this wallet
    await prisma.transactionLog.deleteMany({
      where: {
        OR: [
          { source_wallet_id: parseInt(id) },
          { destination_wallet_id: parseInt(id) }
        ],
        user_id: req.user.id
      }
    });

    await prisma.wallet.delete({
      where: { id: parseInt(id) }
    });

    // log deletion
    await logChange(req.user.id, 'wallet_deleted', 'settings.finance.wallets', { id: wallet.id, name: wallet.name }, null);

    res.json({ message: 'Wallet deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// get wallet detail with paginated transactions
exports.getWalletDetail = async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date, page = 1 } = req.query;
  const limit = 20;
  const skip = (parseInt(page) - 1) * limit;

  try {
    const wallet = await prisma.wallet.findFirst({
      where: { id: parseInt(id), user_id: req.user.id }
    });

    if (!wallet) return res.status(404).json({ error: 'Dompet tidak ditemukan' });
    if (wallet.group_type === 'System') {
      return res.status(403).json({ error: 'Akses ke Dompet Sistem tidak diizinkan' });
    }

    // prepare date filter
    const dateFilter = {};
    if (start_date && end_date) {
      dateFilter.date = {
        gte: new Date(start_date),
        lte: new Date(end_date)
      };
    } else {
      // default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      dateFilter.date = {
        gte: startOfMonth,
        lte: endOfMonth
      };
    }

    // retrieve transactions where source_wallet or destination_wallet matches
    const transactions = await prisma.transactionLog.findMany({
      where: {
        user_id: req.user.id,
        OR: [
          { source_wallet_id: parseInt(id) },
          { destination_wallet_id: parseInt(id) }
        ],
        ...dateFilter
      },
      include: {
        category: true,
        type: true,
        source_wallet: true,
        destination_wallet: true
      },
      orderBy: [
        { date: 'desc' },
        { created_at: 'desc' }
      ],
      take: limit,
      skip: skip
    });

    const totalCount = await prisma.transactionLog.count({
      where: {
        user_id: req.user.id,
        OR: [
          { source_wallet_id: parseInt(id) },
          { destination_wallet_id: parseInt(id) }
        ],
        ...dateFilter
      }
    });

    const formatted = transactions.map(tl => ({
      ...tl,
      category_name: tl.category?.category_name,
      category_icon: tl.category?.icon,
      type_name: tl.type?.name,
      source_wallet_name: tl.source_wallet?.name,
      dest_wallet_name: tl.destination_wallet?.name
    }));

    res.json({
      wallet,
      transactions: formatted,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
