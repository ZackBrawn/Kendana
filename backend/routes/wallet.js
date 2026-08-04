const express = require('express');
const router = express.Router();
const wallet = require('../controllers/wallet');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, wallet.getWallets);
router.post('/', authenticateToken, wallet.createWallet);
router.put('/:id', authenticateToken, wallet.updateWallet);
router.delete('/:id', authenticateToken, wallet.deleteWallet);

module.exports = router;
