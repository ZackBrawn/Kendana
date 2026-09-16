const express = require('express');
const router = express.Router();
const push = require('../controllers/push');
const { authenticateToken } = require('../middlewares/auth');

router.get('/key', authenticateToken, push.getPublicKey);
router.post('/subscribe', authenticateToken, push.subscribe);
router.post('/unsubscribe', authenticateToken, push.unsubscribe);
router.post('/presence', authenticateToken, push.presence);
router.post('/test', authenticateToken, push.sendTestNotification);

module.exports = router;
