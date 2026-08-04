const { prisma } = require('../config/db');

// Helper to calculate the active period cycle of a budget
function calculateCurrentCycle(budget, today = new Date()) {
  const start = new Date(budget.start_date);
  start.setUTCHours(0, 0, 0, 0);

  const now = new Date(today);

  if (now < start) {
    return {
      active: false,
      start: start,
      end: budget.end_date ? new Date(budget.end_date) : null
    };
  }

  if (!budget.is_permanent && budget.end_date && now > new Date(budget.end_date)) {
    return {
      active: false,
      start: start,
      end: new Date(budget.end_date)
    };
  }

  let cycleStart = new Date(start);
  let cycleEnd = null;
  const mult = budget.period_multiplier || 1;

  if (budget.period_type === 'custom') {
    cycleEnd = budget.end_date ? new Date(budget.end_date) : null;
  } else {
    if (budget.period_type === 'daily') {
      cycleEnd = new Date(cycleStart);
      cycleEnd.setUTCDate(cycleEnd.getUTCDate() + mult);
      while (now >= cycleEnd) {
        cycleStart = new Date(cycleEnd);
        cycleEnd = new Date(cycleStart);
        cycleEnd.setUTCDate(cycleEnd.getUTCDate() + mult);
      }
    } else if (budget.period_type === 'weekly') {
      cycleEnd = new Date(cycleStart);
      cycleEnd.setUTCDate(cycleEnd.getUTCDate() + (mult * 7));
      while (now >= cycleEnd) {
        cycleStart = new Date(cycleEnd);
        cycleEnd = new Date(cycleStart);
        cycleEnd.setUTCDate(cycleEnd.getUTCDate() + (mult * 7));
      }
    } else if (budget.period_type === 'monthly') {
      cycleEnd = new Date(cycleStart);
      cycleEnd.setUTCMonth(cycleEnd.getUTCMonth() + mult);
      while (now >= cycleEnd) {
        cycleStart = new Date(cycleEnd);
        cycleEnd = new Date(cycleStart);
        cycleEnd.setUTCMonth(cycleEnd.getUTCMonth() + mult);
      }
    } else if (budget.period_type === 'yearly') {
      cycleEnd = new Date(cycleStart);
      cycleEnd.setUTCFullYear(cycleEnd.getUTCFullYear() + mult);
      while (now >= cycleEnd) {
        cycleStart = new Date(cycleEnd);
        cycleEnd = new Date(cycleStart);
        cycleEnd.setUTCFullYear(cycleEnd.getUTCFullYear() + mult);
      }
    }
  }

  // Cap cycleEnd at budget's overall end_date if not permanent
  if (!budget.is_permanent && budget.end_date && cycleEnd) {
    const overallEnd = new Date(budget.end_date);
    if (cycleEnd > overallEnd) {
      cycleEnd = overallEnd;
    }
  }

  cycleStart.setUTCHours(0, 0, 0, 0);
  if (cycleEnd) {
    cycleEnd.setUTCHours(23, 59, 59, 999);
  }

  return {
    active: true,
    start: cycleStart,
    end: cycleEnd
  };
}

// Helper to compute spent amount, percentage, and list transactions in cycle
async function getBudgetSpentAndTransactions(budget, today = new Date()) {
  const cycle = calculateCurrentCycle(budget, today);
  if (!cycle.active) {
    return {
      spent_amount: 0,
      percentage_used: 0,
      current_cycle: cycle,
      remaining_days: 0,
      transactions: []
    };
  }

  // Determine wallet filter
  const walletFilter = budget.wallet_scope === 'single' && budget.wallet_id
    ? { source_wallet_id: budget.wallet_id }
    : {};

  // Determine category filter
  let categoryFilter = {};
  if (budget.category_scope === 'specific') {
    const relations = await prisma.budgetCategory.findMany({
      where: { budget_id: budget.id },
      select: { category_id: true }
    });
    const categoryIds = relations.map(r => r.category_id);
    categoryFilter = {
      category_id: { in: categoryIds }
    };
  }

  // Fetch transactions
  const transactions = await prisma.transactionLog.findMany({
    where: {
      user_id: budget.user_id,
      type_id: 2, // Expense
      date: {
        gte: cycle.start,
        lte: cycle.end
      },
      ...walletFilter,
      ...categoryFilter
    },
    include: {
      category: true,
      source_wallet: true,
      destination_wallet: true,
      type: true
    },
    orderBy: { date: 'desc' }
  });

  const spent_amount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
  const limit_amount = parseFloat(budget.limit_amount);
  const percentage_used = limit_amount > 0 ? (spent_amount / limit_amount) * 100 : 0;

  // Calculate remaining days
  let remaining_days = null;
  if (cycle.end) {
    const diffMs = cycle.end.getTime() - today.getTime();
    remaining_days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  return {
    spent_amount,
    percentage_used,
    current_cycle: cycle,
    remaining_days,
    transactions: transactions.map(tl => ({
      ...tl,
      category_name: tl.category?.category_name,
      category_icon: tl.category?.icon,
      type_name: tl.type?.name,
      source_wallet_name: tl.source_wallet?.name,
      dest_wallet_name: tl.destination_wallet?.name
    }))
  };
}

// Input validation
const validateBudgetInput = async (userId, body) => {
  const {
    name,
    limit_amount,
    wallet_scope,
    wallet_id,
    category_scope,
    category_ids,
    period_type,
    period_multiplier,
    start_date,
    is_permanent,
    end_date,
    show_on_dashboard,
    notify_on_threshold,
    notify_threshold_percent,
    notes
  } = body;

  if (!name || name.trim() === '') {
    throw new Error('Nama budget tidak boleh kosong');
  }

  const limit = parseFloat(limit_amount);
  if (isNaN(limit) || limit <= 0) {
    throw new Error('Nominal limit budget harus lebih besar dari 0');
  }

  if (wallet_scope !== 'single' && wallet_scope !== 'all') {
    throw new Error('Cakupan dompet tidak valid');
  }

  if (wallet_scope === 'single') {
    if (!wallet_id) {
      throw new Error('Dompet harus dipilih');
    }
    const wallet = await prisma.wallet.findFirst({
      where: { id: parseInt(wallet_id), user_id: userId }
    });
    if (!wallet) {
      throw new Error('Dompet tidak ditemukan atau bukan milik Anda');
    }
  }

  if (category_scope !== 'specific' && category_scope !== 'all') {
    throw new Error('Cakupan kategori tidak valid');
  }

  if (category_scope === 'specific') {
    if (!category_ids || !Array.isArray(category_ids) || category_ids.length === 0) {
      throw new Error('Minimal satu kategori harus dipilih');
    }
    // Verify categories belong to user and are expense type (type_id = 2)
    const dbCategories = await prisma.category.findMany({
      where: {
        id: { in: category_ids.map(id => parseInt(id)) },
        user_id: userId,
        type_id: 2 // Expense only
      }
    });
    if (dbCategories.length !== category_ids.length) {
      throw new Error('Ada kategori terpilih yang tidak valid atau bukan bertipe pengeluaran');
    }
  }

  const multiplier = parseInt(period_multiplier);
  if (isNaN(multiplier) || multiplier < 1) {
    throw new Error('Multiplier periode harus minimal 1');
  }

  if (!start_date) {
    throw new Error('Tanggal mulai wajib diisi');
  }

  const sDate = new Date(start_date);
  if (isNaN(sDate.getTime())) {
    throw new Error('Format tanggal mulai tidak valid');
  }

  let finalIsPermanent = is_permanent === true || is_permanent === 'true';
  let finalEndDate = null;

  if (period_type === 'custom') {
    finalIsPermanent = false;
    if (!end_date) {
      throw new Error('Tanggal berakhir wajib diisi untuk periode kustom');
    }
    finalEndDate = new Date(end_date);
    if (isNaN(finalEndDate.getTime())) {
      throw new Error('Format tanggal berakhir tidak valid');
    }
    if (finalEndDate <= sDate) {
      throw new Error('Tanggal berakhir harus setelah tanggal mulai');
    }
  } else {
    if (!finalIsPermanent) {
      if (!end_date) {
        throw new Error('Tanggal berakhir wajib diisi jika budget tidak permanen');
      }
      finalEndDate = new Date(end_date);
      if (isNaN(finalEndDate.getTime())) {
        throw new Error('Format tanggal berakhir tidak valid');
      }
      if (finalEndDate <= sDate) {
        throw new Error('Tanggal berakhir harus setelah tanggal mulai');
      }
    }
  }

  if (notify_on_threshold === true || notify_on_threshold === 'true') {
    const threshold = parseInt(notify_threshold_percent);
    if (isNaN(threshold) || threshold < 1 || threshold > 100) {
      throw new Error('Persentase threshold notifikasi harus bernilai antara 1–100');
    }
  }

  return {
    name: name.trim(),
    limit_amount: limit,
    wallet_scope,
    wallet_id: wallet_scope === 'single' ? parseInt(wallet_id) : null,
    category_scope,
    period_type,
    period_multiplier: multiplier,
    start_date: sDate,
    is_permanent: finalIsPermanent,
    end_date: finalEndDate,
    show_on_dashboard: show_on_dashboard === true || show_on_dashboard === 'true',
    notify_on_threshold: notify_on_threshold === true || notify_on_threshold === 'true',
    notify_threshold_percent: (notify_on_threshold === true || notify_on_threshold === 'true') ? parseInt(notify_threshold_percent) : null,
    notes: notes ? notes.trim() : null
  };
};

// Controllers
exports.getBudgets = async (req, res) => {
  try {
    const userId = req.user.id;
    const budgets = await prisma.budget.findMany({
      where: { user_id: userId },
      include: {
        wallet: true,
        categories: {
          include: { category: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const formatted = [];
    for (const b of budgets) {
      const stats = await getBudgetSpentAndTransactions(b, new Date());
      formatted.push({
        ...b,
        limit_amount: parseFloat(b.limit_amount),
        spent_amount: stats.spent_amount,
        percentage_used: stats.percentage_used,
        current_cycle: stats.current_cycle,
        remaining_days: stats.remaining_days,
        wallet_name: b.wallet?.name,
        categories: b.categories.map(c => ({
          id: c.category.id,
          name: c.category.category_name,
          icon: c.category.icon
        }))
      });
    }

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getBudgetDetail = async (req, res) => {
  const userId = req.user.id;
  const budgetId = parseInt(req.params.id);

  try {
    const budget = await prisma.budget.findFirst({
      where: { id: budgetId, user_id: userId },
      include: {
        wallet: true,
        categories: {
          include: { category: true }
        }
      }
    });

    if (!budget) {
      return res.status(404).json({ error: 'Budget tidak ditemukan' });
    }

    const stats = await getBudgetSpentAndTransactions(budget, new Date());

    res.json({
      ...budget,
      limit_amount: parseFloat(budget.limit_amount),
      spent_amount: stats.spent_amount,
      percentage_used: stats.percentage_used,
      current_cycle: stats.current_cycle,
      remaining_days: stats.remaining_days,
      transactions: stats.transactions,
      wallet_name: budget.wallet?.name,
      categories: budget.categories.map(c => ({
        id: c.category.id,
        name: c.category.category_name,
        icon: c.category.icon
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createBudget = async (req, res) => {
  const userId = req.user.id;
  try {
    const validated = await validateBudgetInput(userId, req.body);
    const { category_ids } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const budget = await tx.budget.create({
        data: {
          user_id: userId,
          name: validated.name,
          icon: req.body.icon || 'PhFolder',
          limit_amount: validated.limit_amount,
          wallet_scope: validated.wallet_scope,
          wallet_id: validated.wallet_id,
          category_scope: validated.category_scope,
          period_type: validated.period_type,
          period_multiplier: validated.period_multiplier,
          start_date: validated.start_date,
          is_permanent: validated.is_permanent,
          end_date: validated.end_date,
          show_on_dashboard: validated.show_on_dashboard,
          notify_on_threshold: validated.notify_on_threshold,
          notify_threshold_percent: validated.notify_threshold_percent,
          notes: validated.notes
        }
      });

      if (validated.category_scope === 'specific' && category_ids && category_ids.length > 0) {
        await tx.budgetCategory.createMany({
          data: category_ids.map(catId => ({
            budget_id: budget.id,
            category_id: parseInt(catId)
          }))
        });
      }

      return budget;
    });

    res.json({ success: true, budget: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateBudget = async (req, res) => {
  const userId = req.user.id;
  const budgetId = parseInt(req.params.id);

  try {
    const existing = await prisma.budget.findFirst({
      where: { id: budgetId, user_id: userId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Budget tidak ditemukan' });
    }

    const validated = await validateBudgetInput(userId, req.body);
    const { category_ids } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const budget = await tx.budget.update({
        where: { id: budgetId },
        data: {
          name: validated.name,
          icon: req.body.icon || existing.icon,
          limit_amount: validated.limit_amount,
          wallet_scope: validated.wallet_scope,
          wallet_id: validated.wallet_id,
          category_scope: validated.category_scope,
          period_type: validated.period_type,
          period_multiplier: validated.period_multiplier,
          start_date: validated.start_date,
          is_permanent: validated.is_permanent,
          end_date: validated.end_date,
          show_on_dashboard: validated.show_on_dashboard,
          notify_on_threshold: validated.notify_on_threshold,
          notify_threshold_percent: validated.notify_threshold_percent,
          notes: validated.notes
        }
      });

      // Clear existing pivot entries
      await tx.budgetCategory.deleteMany({
        where: { budget_id: budgetId }
      });

      // Write new ones if specific
      if (validated.category_scope === 'specific' && category_ids && category_ids.length > 0) {
        await tx.budgetCategory.createMany({
          data: category_ids.map(catId => ({
            budget_id: budget.id,
            category_id: parseInt(catId)
          }))
        });
      }

      return budget;
    });

    res.json({ success: true, budget: result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteBudget = async (req, res) => {
  const userId = req.user.id;
  const budgetId = parseInt(req.params.id);

  try {
    const existing = await prisma.budget.findFirst({
      where: { id: budgetId, user_id: userId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Budget tidak ditemukan' });
    }

    await prisma.budget.delete({
      where: { id: budgetId }
    });

    res.json({ success: true, message: 'Budget berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export helper for testing
exports.calculateCurrentCycle = calculateCurrentCycle;
