const express = require('express');
const router = express.Router();
const analytics = require('../controllers/analytics');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, analytics.getAnalytics);

module.exports = router;

