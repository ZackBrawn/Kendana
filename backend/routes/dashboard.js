const express = require('express');
const router = express.Router();
const dashboard = require('../controllers/dashboard');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, dashboard.getDashboard);

module.exports = router;

