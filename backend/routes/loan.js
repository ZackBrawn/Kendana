const express = require('express');
const router = express.Router();
const loan = require('../controllers/loan');
const { authenticateToken } = require('../middlewares/auth');

router.get('/:type', authenticateToken, loan.getLoans);

module.exports = router;
