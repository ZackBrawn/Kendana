const express = require('express');
const router = express.Router();
const category = require('../controllers/category');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, category.getCategories);
router.post('/', authenticateToken, category.createCategory);
router.put('/:id', authenticateToken, category.updateCategory);
router.delete('/:id', authenticateToken, category.deleteCategory);

module.exports = router;
