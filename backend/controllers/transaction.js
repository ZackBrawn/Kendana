const { prisma } = require('../config/db');
const { notifyOverbudgetForUser } = require('./budget');

const getBalanceDelta = (typeId, systemKey, sourceWallet, destWallet, amount) => {
  if ((typeId === 4 || typeId === 5) && systemKey) {
    const liquidDelta = {
      LOAN: amount,
      DEBT_PAYMENT: -amount,
      RECEIVABLE: -amount,
      RECEIVABLE_PAYMENT: amount
    }[systemKey];

    if (liquidDelta !== undefined) {
      const systemDelta = ['LOAN', 'RECEIVABLE'].includes(systemKey) ? amount : -amount;
      return {
        sourceDelta: sourceWallet.group_type === 'System' ? systemDelta : liquidDelta,
        destDelta: destWallet.group_type === 'System' ? systemDelta : liquidDelta
      };
    }
  }

  return { sourceDelta: -amount, destDelta: amount };
};

exports.getBalanceDelta = getBalanceDelta;

// Get transactions with search, type, and date range filters
exports.getTransactions = async (req, res) => {
  const { start_date, end_date, type, search } = req.query;
  const userId = req.user.id;
  
  const whereClause = { user_id: userId };
  
  // Date range filter
  if (start_date && end_date) {
    whereClause.date = {
      gte: new Date(start_date),
      lte: new Date(end_date)
    };
  }
  
  // Type filter (can be ID or Name)
  if (type) {
    if (!isNaN(type)) {
      whereClause.type_id = parseInt(type);
    } else {
      whereClause.type = {
        name: { equals: type, mode: 'insensitive' }
      };
    }
  }
  
  // Search term matching notes, subject, or category name case-insensitively
  if (search) {
    whereClause.OR = [
      { notes: { contains: search, mode: 'insensitive' } },
      { subject: { contains: search, mode: 'insensitive' } },
      { category: { category_name: { contains: search, mode: 'insensitive' } } }
    ];
  }
  
  try {
    const logs = await prisma.transactionLog.findMany({
      where: whereClause,
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

// Create a transaction (supports uncleared state)
exports.createTransaction = async (req, res) => {
  const { date, type_id, category_id, source_wallet_id, destination_wallet_id, amount, subject, notes, is_cleared, client_id } = req.body;
  const userId = req.user.id;

  if (client_id) {
    const existing = await prisma.transactionLog.findFirst({ where: { client_id, user_id: userId } });
    if (existing) return res.json({ success: true, transaction: existing, duplicate: true });
  }

  if (!amount || amount <= 0 || !source_wallet_id || !destination_wallet_id) {
    return res.status(400).json({ error: 'Informasi transaksi tidak lengkap' });
  }
  if (parseInt(source_wallet_id) === parseInt(destination_wallet_id)) {
    return res.status(400).json({ error: 'Dompet asal dan tujuan harus berbeda' });
  }

  const shouldClear = is_cleared === undefined ? true : (is_cleared === true || is_cleared === 'true');

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

      const category = category_id ? await tx.category.findFirst({
        where: { id: parseInt(category_id), user_id: userId }
      }) : null;

      const mainWallet = sourceWallet.group_type !== 'System' ? sourceWallet : destWallet;
      const balanceBefore = parseFloat(mainWallet.balance);

      const { sourceDelta, destDelta } = getBalanceDelta(
        parseInt(type_id),
        category?.system_key || null,
        sourceWallet,
        destWallet,
        numAmount
      );

      if (shouldClear) {
        await tx.wallet.update({
          where: { id: sourceWallet.id },
          data: { balance: { increment: sourceDelta } }
        });

        await tx.wallet.update({
          where: { id: destWallet.id },
          data: { balance: { increment: destDelta } }
        });
      }

      const balanceAfter = shouldClear
        ? balanceBefore + (mainWallet.id === sourceWallet.id ? sourceDelta : destDelta)
        : balanceBefore;
         
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
          notes: notes || null,
          client_id: client_id || null,
          is_cleared: shouldClear
        }
      });

      return log;
    });

    notifyOverbudgetForUser(userId).catch((err) => console.error('Overbudget push error:', err.message));
    res.json({ success: true, transaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Update a transaction (supports transitions between cleared/uncleared states)
exports.updateTransaction = async (req, res) => {
  const transactionId = parseInt(req.params.id);
  const { date, type_id, category_id, source_wallet_id, destination_wallet_id, amount, subject, notes, is_cleared } = req.body;
  const userId = req.user.id;

  if (!amount || amount <= 0 || !source_wallet_id || !destination_wallet_id) {
    return res.status(400).json({ error: 'Informasi transaksi tidak lengkap' });
  }
  if (parseInt(source_wallet_id) === parseInt(destination_wallet_id)) {
    return res.status(400).json({ error: 'Dompet asal dan tujuan harus berbeda' });
  }

  try {
    const numAmount = parseFloat(amount);

    const transaction = await prisma.$transaction(async (tx) => {
      const oldTx = await tx.transactionLog.findFirst({
        where: { id: transactionId, user_id: userId }
      });

      if (!oldTx) {
        throw new Error('Transaksi tidak ditemukan');
      }

      const oldWasCleared = oldTx.is_cleared;
      const newShouldClear = is_cleared === undefined ? oldWasCleared : (is_cleared === true || is_cleared === 'true');

      const oldAmount = parseFloat(oldTx.amount);
      const oldSrcId = parseInt(oldTx.source_wallet_id);
      const oldDestId = parseInt(oldTx.destination_wallet_id);

      const newSrcId = parseInt(source_wallet_id);
      const newDestId = parseInt(destination_wallet_id);

      const walletIds = [...new Set([oldSrcId, oldDestId, newSrcId, newDestId])];

      const wallets = await tx.wallet.findMany({
        where: { id: { in: walletIds }, user_id: userId }
      });

      if (wallets.length !== walletIds.length) {
        throw new Error('Beberapa dompet tidak ditemukan');
      }

      const walletMap = {};
      wallets.forEach(w => {
        walletMap[w.id] = {
          ...w,
          balance: parseFloat(w.balance)
        };
      });

      const balanceDeltas = {};
      walletIds.forEach(id => {
        balanceDeltas[id] = 0;
      });

      const oldCategory = oldTx.category_id ? await tx.category.findFirst({
        where: { id: parseInt(oldTx.category_id), user_id: userId }
      }) : null;
      const newCategory = category_id ? await tx.category.findFirst({
        where: { id: parseInt(category_id), user_id: userId }
      }) : null;

      const oldSourceWallet = walletMap[oldSrcId];
      const oldDestWallet = walletMap[oldDestId];
      const oldAdjust = getBalanceDelta(
        parseInt(oldTx.type_id),
        oldCategory?.system_key || null,
        oldSourceWallet,
        oldDestWallet,
        oldAmount
      );
      const newAdjust = getBalanceDelta(
        parseInt(type_id),
        newCategory?.system_key || null,
        walletMap[newSrcId],
        walletMap[newDestId],
        numAmount
      );

      // 1. Revert old transaction's impact if it was cleared
      if (oldWasCleared) {
        balanceDeltas[oldSrcId] -= oldAdjust.sourceDelta;
        balanceDeltas[oldDestId] -= oldAdjust.destDelta;
      }

      // 2. Apply new transaction's impact if it should be cleared
      if (newShouldClear) {
        balanceDeltas[newSrcId] += newAdjust.sourceDelta;
        balanceDeltas[newDestId] += newAdjust.destDelta;
      }

      // Update balances
      for (const id of walletIds) {
        const newBalance = walletMap[id].balance + balanceDeltas[id];
        await tx.wallet.update({
          where: { id },
          data: { balance: newBalance }
        });
      }

      // Recalculate balance_before and balance_after
      const sourceWallet = walletMap[newSrcId];
      const mainWallet = sourceWallet.group_type !== 'System' ? sourceWallet : walletMap[newDestId];
      
      // Balance before this transaction takes place
      let balanceBefore = walletMap[mainWallet.id].balance;
      if (oldWasCleared && mainWallet.id === oldSrcId) balanceBefore += oldAmount;
      if (oldWasCleared && mainWallet.id === oldDestId) balanceBefore -= oldAmount;

      const balanceAfter = newShouldClear
        ? balanceBefore + (sourceWallet.group_type !== 'System' ? -numAmount : numAmount)
        : balanceBefore;

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
          notes: notes || null,
          is_cleared: newShouldClear
        }
      });

      return updatedLog;
    });

    notifyOverbudgetForUser(userId).catch((err) => console.error('Overbudget push error:', err.message));
    res.json({ success: true, transaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a transaction (reverts balance updates only if it was cleared)
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

      if (oldTx.is_cleared) {
        const oldAmount = parseFloat(oldTx.amount);
        const oldSrcId = parseInt(oldTx.source_wallet_id);
        const oldDestId = parseInt(oldTx.destination_wallet_id);

        const sourceWallet = await tx.wallet.findFirst({
          where: { id: oldSrcId, user_id: userId }
        });
        const destWallet = await tx.wallet.findFirst({
          where: { id: oldDestId, user_id: userId }
        });

        if (!sourceWallet || !destWallet) {
          throw new Error('Dompet tidak ditemukan');
        }

        const oldCategory = oldTx.category_id ? await tx.category.findFirst({
          where: { id: parseInt(oldTx.category_id), user_id: userId }
        }) : null;
        const oldAdjust = getBalanceDelta(parseInt(oldTx.type_id), oldCategory?.system_key || null, sourceWallet, destWallet, oldAmount);

        await tx.wallet.update({
          where: { id: oldSrcId },
          data: { balance: { increment: -oldAdjust.sourceDelta } }
        });

        await tx.wallet.update({
          where: { id: oldDestId },
          data: { balance: { increment: -oldAdjust.destDelta } }
        });
      }

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

// Confirm an uncleared transaction (recalculates balance and clears it)
exports.confirmTransaction = async (req, res) => {
  const transactionId = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    const transaction = await prisma.$transaction(async (tx) => {
      const log = await tx.transactionLog.findFirst({
        where: { id: transactionId, user_id: userId }
      });

      if (!log) {
        throw new Error('Transaksi tidak ditemukan');
      }

      if (log.is_cleared) {
        throw new Error('Transaksi ini sudah terkonfirmasi');
      }

      const numAmount = parseFloat(log.amount);
      const srcId = parseInt(log.source_wallet_id);
      const destId = parseInt(log.destination_wallet_id);

      const sourceWallet = await tx.wallet.findFirst({
        where: { id: srcId, user_id: userId }
      });
      const destWallet = await tx.wallet.findFirst({
        where: { id: destId, user_id: userId }
      });

      if (!sourceWallet || !destWallet) {
        throw new Error('Dompet tidak ditemukan');
      }

      const category = log.category_id ? await tx.category.findFirst({
        where: { id: parseInt(log.category_id), user_id: userId }
      }) : null;
      const adjust = getBalanceDelta(parseInt(log.type_id), category?.system_key || null, sourceWallet, destWallet, numAmount);

      await tx.wallet.update({
        where: { id: srcId },
        data: { balance: { increment: adjust.sourceDelta } }
      });

      await tx.wallet.update({
        where: { id: destId },
        data: { balance: { increment: adjust.destDelta } }
      });

      const mainWallet = sourceWallet.group_type !== 'System' ? sourceWallet : destWallet;
      // Get the freshly mutated balance of the main wallet
      const dbMainWallet = await tx.wallet.findFirst({
        where: { id: mainWallet.id }
      });
      const finalBalance = parseFloat(dbMainWallet.balance);

      const updated = await tx.transactionLog.update({
        where: { id: transactionId },
        data: {
          is_cleared: true,
          balance_after: finalBalance
        }
      });

      return updated;
    });

    res.json({ success: true, transaction });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
