const express = require('express');
const router = express.Router();
const budget = require('../controllers/budget');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, budget.getBudgets);
router.post('/', authenticateToken, budget.createBudget);
router.get('/settings', authenticateToken, budget.getSettings);
router.post('/settings', authenticateToken, budget.updateSettings);
router.post('/generate', authenticateToken, budget.generate);
router.get('/generate/status', authenticateToken, budget.generationStatus);
router.get('/group/:year/:month', authenticateToken, budget.showBudgetGroup);
router.put('/group/:budgetGroupId', authenticateToken, budget.updateBudgetGroup);
router.get('/:id', authenticateToken, budget.getBudgetDetail);
router.put('/:id', authenticateToken, budget.updateBudget);
router.delete('/:id', authenticateToken, budget.deleteBudget);

module.exports = router;

