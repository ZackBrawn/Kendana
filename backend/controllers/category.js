const { prisma } = require('../config/db');

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

exports.createCategory = async (req, res) => {
  const { category_name, type_id, icon } = req.body;
  try {
    const category = await prisma.category.create({
      data: {
        user_id: req.user.id,
        type_id: parseInt(type_id),
        category_name,
        icon: icon || '📁'
      }
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { category_name, icon, type_id } = req.body;
  try {
    const category = await prisma.category.update({
      where: { id: parseInt(id), user_id: req.user.id },
      data: {
        category_name,
        icon,
        type_id: parseInt(type_id)
      }
    });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  const { id } = req.params;
  try {
    // Delete any dependent transaction logs referencing this category
    await prisma.transactionLog.deleteMany({
      where: {
        category_id: parseInt(id),
        user_id: req.user.id
      }
    });

    await prisma.category.delete({
      where: { id: parseInt(id), user_id: req.user.id }
    });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
