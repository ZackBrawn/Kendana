const { prisma } = require('../config/db');

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

exports.createWallet = async (req, res) => {
  const { name, balance, group_type, icon } = req.body;
  try {
    const wallet = await prisma.wallet.create({
      data: {
        user_id: req.user.id,
        name,
        balance: balance || 0,
        group_type: group_type || 'Liquid',
        icon: icon || '💵'
      }
    });
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateWallet = async (req, res) => {
  const { id } = req.params;
  const { name, balance, group_type, icon } = req.body;
  try {
    const wallet = await prisma.wallet.update({
      where: { id: parseInt(id), user_id: req.user.id },
      data: {
        name,
        balance: parseFloat(balance),
        group_type: group_type || 'Liquid',
        icon: icon || '💵'
      }
    });
    res.json(wallet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteWallet = async (req, res) => {
  const { id } = req.params;
  try {
    // Delete any dependent transaction logs first or let Prisma fail/cascade.
    // For safety, let's delete logs that reference this wallet as source or destination
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
      where: { id: parseInt(id), user_id: req.user.id }
    });
    res.json({ message: 'Wallet deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
