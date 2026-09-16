const express = require('express');
const router = express.Router();
const loan = require('../controllers/loan');
const { authenticateToken } = require('../middlewares/auth');

router.get('/:type', authenticateToken, loan.getLoans);
router.get('/:type/subjects', authenticateToken, loan.getSubjects);

module.exports = router;
