const express = require('express');
const router = express.Router();
const transaction = require('../controllers/transaction');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, transaction.getTransactions);
router.post('/', authenticateToken, transaction.createTransaction);
router.put('/:id', authenticateToken, transaction.updateTransaction);
router.delete('/:id', authenticateToken, transaction.deleteTransaction);
router.patch('/:id/confirm', authenticateToken, transaction.confirmTransaction);

module.exports = router;

