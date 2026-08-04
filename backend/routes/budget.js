const express = require('express');
const router = express.Router();
const budget = require('../controllers/budget');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, budget.getBudgets);
router.post('/', authenticateToken, budget.createBudget);
router.get('/:id', authenticateToken, budget.getBudgetDetail);
router.put('/:id', authenticateToken, budget.updateBudget);
router.delete('/:id', authenticateToken, budget.deleteBudget);

module.exports = router;
