const { prisma } = require('../config/db');
const { logChange } = require('../utils/settingsLogger');

// Get all categories for user
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { user_id: req.user.id },
      include: { type: true },
      orderBy: { id: 'asc' }
    });
    
    // Format to include type_name for frontend compatibility
    const formatted = categories.map(c => ({
      ...c,
      type_name: c.type?.name
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  const { category_name, type_id, icon, keyword } = req.body;
  if (!category_name || !type_id) {
    return res.status(400).json({ error: 'Nama kategori dan tipe transaksi wajib diisi' });
  }

  // Prevent creating new categories for Debt (4) and Receivable (5) - fixed system categories only
  if (parseInt(type_id) === 4 || parseInt(type_id) === 5) {
    return res.status(403).json({ error: 'Kategori Hutang/Piutang bersifat sistem dan tidak bisa ditambah' });
  }

  try {
    const category = await prisma.category.create({
      data: {
        user_id: req.user.id,
        type_id: parseInt(type_id),
        category_name,
        icon: icon || '📁',
        keyword: keyword || null
      }
    });

    await logChange(req.user.id, 'category_created', 'settings.finance.categories', null, { id: category.id, name: category.category_name });

    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update an existing category
exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { category_name, icon, type_id, keyword } = req.body;

  try {
    const category = await prisma.category.findFirst({
      where: { id: parseInt(id), user_id: req.user.id }
    });

    if (!category) return res.status(404).json({ error: 'Kategori tidak ditemukan' });

    // Prevent editing system categories for Debt (4) and Receivable (5)
    if (category.type_id === 4 || category.type_id === 5) {
      return res.status(403).json({ error: 'Kategori Hutang/Piutang bersifat sistem dan tidak bisa diubah' });
    }

    const updatedData = {};
    if (category_name !== undefined) updatedData.category_name = category_name;
    if (icon !== undefined) updatedData.icon = icon;
    if (keyword !== undefined) updatedData.keyword = keyword;

    // System category type protection
    if (type_id !== undefined && parseInt(type_id) !== category.type_id) {
      if (category.system_key !== null) {
        return res.status(400).json({ error: 'Tipe transaksi pada Kategori Sistem tidak boleh diubah' });
      }
      updatedData.type_id = parseInt(type_id);
    }

    const original = { ...category };
    const updatedCategory = await prisma.category.update({
      where: { id: parseInt(id) },
      data: updatedData
    });

    // Log changes
    for (const key of Object.keys(updatedData)) {
      if (original[key] !== updatedCategory[key]) {
        await logChange(req.user.id, `category:${key}`, 'settings.finance.categories', original[key], updatedCategory[key]);
      }
    }

    res.json(updatedCategory);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a category
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await prisma.category.findFirst({
      where: { id: parseInt(id), user_id: req.user.id },
      include: { type: true }
    });

    if (!category) return res.status(404).json({ error: 'Kategori tidak ditemukan' });

    // Protect system categories and specific types
    if (category.system_key !== null || ['Transfer', 'Debt', 'Receivable'].includes(category.type?.name)) {
      return res.status(403).json({ error: 'Kategori Sistem tidak boleh dihapus' });
    }

    // Delete dependent transaction logs
    await prisma.transactionLog.deleteMany({
      where: {
        category_id: parseInt(id),
        user_id: req.user.id
      }
    });

    await prisma.category.delete({
      where: { id: parseInt(id) }
    });

    await logChange(req.user.id, 'category_deleted', 'settings.finance.categories', { id: category.id, name: category.category_name }, null);

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get category details along with related transactions
exports.getCategoryDetail = async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.query;

  try {
    const category = await prisma.category.findFirst({
      where: { id: parseInt(id), user_id: req.user.id },
      include: { type: true }
    });

    if (!category) return res.status(404).json({ error: 'Kategori tidak ditemukan' });

    // Date range filter
    const dateFilter = {};
    if (start_date && end_date) {
      dateFilter.date = {
        gte: new Date(start_date),
        lte: new Date(end_date)
      };
    } else {
      // Default to current month
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      dateFilter.date = {
        gte: startOfMonth,
        lte: endOfMonth
      };
    }

    const transactions = await prisma.transactionLog.findMany({
      where: {
        user_id: req.user.id,
        category_id: parseInt(id),
        ...dateFilter
      },
      include: {
        type: true,
        source_wallet: true,
        destination_wallet: true
      },
      orderBy: [
        { date: 'desc' },
        { created_at: 'desc' }
      ]
    });

    const totalUsage = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);
    const isSystem = category.system_key !== null;

    const formatted = transactions.map(tl => ({
      ...tl,
      category_name: category.category_name,
      category_icon: category.icon,
      type_name: tl.type?.name,
      source_wallet_name: tl.source_wallet?.name,
      dest_wallet_name: tl.destination_wallet?.name
    }));

    res.json({
      category: {
        ...category,
        type_name: category.type?.name
      },
      transactions: formatted,
      totalUsage,
      isSystem
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
