const { prisma } = require('../config/db');

exports.getTransactions = async (req, res) => {
  try {
    const logs = await prisma.transactionLog.findMany({
      where: { user_id: req.user.id },
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

    const formatted = logs.map(tl => ({
      ...tl,
      category_name: tl.category?.category_name,
      category_icon: tl.category?.icon,
      type_name: tl.type?.name,
      source_wallet_name: tl.source_wallet?.name,
      dest_wallet_name: tl.destination_wallet?.name
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTransaction = async (req, res) => {
  const { date, type_id, category_id, source_wallet_id, destination_wallet_id, amount, subject, notes } = req.body;
  const userId = req.user.id;

  if (!amount || amount <= 0 || !source_wallet_id || !destination_wallet_id) {
    return res.status(400).json({ error: 'Informasi transaksi tidak lengkap' });
  }

  try {
    const numAmount = parseFloat(amount);

    const transaction = await prisma.$transaction(async (tx) => {
      const sourceWallet = await tx.wallet.findFirst({
        where: { id: parseInt(source_wallet_id), user_id: userId }
      });
      const destWallet = await tx.wallet.findFirst({
        where: { id: parseInt(destination_wallet_id), user_id: userId }
      });

      if (!sourceWallet || !destWallet) {
        throw new Error('Dompet tidak ditemukan');
      }

      const balanceBefore = parseFloat(sourceWallet.group_type !== 'System' ? sourceWallet.balance : destWallet.balance);

      // Mutate source & dest balances
      await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: numAmount } }
      });

      await tx.wallet.update({
        where: { id: destWallet.id },
        data: { balance: { increment: numAmount } }
      });

      const balanceAfter = balanceBefore + (sourceWallet.group_type !== 'System' ? -numAmount : numAmount);
      const refNo = 'TRX-' + Math.random().toString(36).substring(2, 10).toUpperCase();

      const log = await tx.transactionLog.create({
        data: {
          reference_number: refNo,
          user_id: userId,
          date: date ? new Date(date) : new Date(),
          type_id: parseInt(type_id),
          category_id: category_id ? parseInt(category_id) : null,
          source_wallet_id: parseInt(source_wallet_id),
          destination_wallet_id: parseInt(destination_wallet_id),
          amount: numAmount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          subject: subject || '-',
          notes: notes || null
        }
      });

      return log;
    });

    res.json({ success: true, transaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateTransaction = async (req, res) => {
  const transactionId = parseInt(req.params.id);
  const { date, type_id, category_id, source_wallet_id, destination_wallet_id, amount, subject, notes } = req.body;
  const userId = req.user.id;

  if (!amount || amount <= 0 || !source_wallet_id || !destination_wallet_id) {
    return res.status(400).json({ error: 'Informasi transaksi tidak lengkap' });
  }

  try {
    const numAmount = parseFloat(amount);

    const transaction = await prisma.$transaction(async (tx) => {
      // Find original transaction
      const oldTx = await tx.transactionLog.findFirst({
        where: { id: transactionId, user_id: userId }
      });

      if (!oldTx) {
        throw new Error('Transaksi tidak ditemukan');
      }

      const oldAmount = parseFloat(oldTx.amount);
      const oldSrcId = parseInt(oldTx.source_wallet_id);
      const oldDestId = parseInt(oldTx.destination_wallet_id);

      const newSrcId = parseInt(source_wallet_id);
      const newDestId = parseInt(destination_wallet_id);

      // Gather all unique wallet IDs involved to fetch them and update them properly
      const walletIds = [...new Set([oldSrcId, oldDestId, newSrcId, newDestId])];

      const wallets = await tx.wallet.findMany({
        where: { id: { in: walletIds }, user_id: userId }
      });

      if (wallets.length !== walletIds.length) {
        throw new Error('Beberapa dompet tidak ditemukan');
      }

      // Map wallet details for quick lookup
      const walletMap = {};
      wallets.forEach(w => {
        walletMap[w.id] = {
          ...w,
          balance: parseFloat(w.balance)
        };
      });

      // Compute balance deltas
      const balanceDeltas = {};
      walletIds.forEach(id => {
        balanceDeltas[id] = 0;
      });

      // Revert old transaction's impact
      balanceDeltas[oldSrcId] += oldAmount;
      balanceDeltas[oldDestId] -= oldAmount;

      // Apply new transaction's impact
      balanceDeltas[newSrcId] -= numAmount;
      balanceDeltas[newDestId] += numAmount;

      // Update wallets' balances in database
      for (const id of walletIds) {
        const newBalance = walletMap[id].balance + balanceDeltas[id];
        await tx.wallet.update({
          where: { id },
          data: { balance: newBalance }
        });
      }

      // Calculate balance_before and balance_after for the transaction log based on the new details.
      const revertedSrcBalance = walletMap[newSrcId].balance + (newSrcId === oldSrcId ? oldAmount : 0) - (newSrcId === oldDestId ? oldAmount : 0);
      const revertedDestBalance = walletMap[newDestId].balance + (newDestId === oldSrcId ? oldAmount : 0) - (newDestId === oldDestId ? oldAmount : 0);

      const sourceWallet = walletMap[newSrcId];
      const balanceBefore = parseFloat(sourceWallet.group_type !== 'System' ? revertedSrcBalance : revertedDestBalance);
      const balanceAfter = balanceBefore + (sourceWallet.group_type !== 'System' ? -numAmount : numAmount);

      // Update transaction log
      const updatedLog = await tx.transactionLog.update({
        where: { id: transactionId },
        data: {
          date: date ? new Date(date) : new Date(),
          type_id: parseInt(type_id),
          category_id: category_id ? parseInt(category_id) : null,
          source_wallet_id: newSrcId,
          destination_wallet_id: newDestId,
          amount: numAmount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          subject: subject || '-',
          notes: notes || null
        }
      });

      return updatedLog;
    });

    res.json({ success: true, transaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  const transactionId = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    await prisma.$transaction(async (tx) => {
      const oldTx = await tx.transactionLog.findFirst({
        where: { id: transactionId, user_id: userId }
      });

      if (!oldTx) {
        throw new Error('Transaksi tidak ditemukan');
      }

      const oldAmount = parseFloat(oldTx.amount);
      const oldSrcId = parseInt(oldTx.source_wallet_id);
      const oldDestId = parseInt(oldTx.destination_wallet_id);

      // Revert old: source wallet balance increments, dest wallet balance decrements
      const sourceWallet = await tx.wallet.findFirst({
        where: { id: oldSrcId, user_id: userId }
      });
      const destWallet = await tx.wallet.findFirst({
        where: { id: oldDestId, user_id: userId }
      });

      if (!sourceWallet || !destWallet) {
        throw new Error('Dompet tidak ditemukan');
      }

      await tx.wallet.update({
        where: { id: oldSrcId },
        data: { balance: { increment: oldAmount } }
      });

      await tx.wallet.update({
        where: { id: oldDestId },
        data: { balance: { decrement: oldAmount } }
      });

      // Delete the transaction log
      await tx.transactionLog.delete({
        where: { id: transactionId }
      });
    });

    res.json({ success: true, message: 'Transaksi berhasil dihapus' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

