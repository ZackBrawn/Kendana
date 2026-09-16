const express = require('express');
const router = express.Router();
const chat = require('../controllers/chat');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, chat.index);
router.post('/message', authenticateToken, chat.sendMessage);
router.get('/message/:id/status', authenticateToken, chat.messageStatus);
router.get('/history', authenticateToken, chat.history);
router.get('/commands', authenticateToken, chat.commands);
router.get('/wallets', authenticateToken, chat.wallets);
router.patch('/transaction/:id/wallet', authenticateToken, chat.assignWallet);
router.post('/transaction/:id/confirm', authenticateToken, chat.confirmTransaction);
router.delete('/transaction/:id/cancel', authenticateToken, chat.cancelTransaction);

module.exports = router;

