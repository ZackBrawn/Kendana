const express = require('express');
const router = express.Router();

const auth = require('./auth');
const dashboard = require('./dashboard');
const wallet = require('./wallet');
const category = require('./category');
const transaction = require('./transaction');
const analytics = require('./analytics');
const loan = require('./loan');
const budget = require('./budget');

router.use('/auth', auth);
router.use('/dashboard', dashboard);
router.use('/wallets', wallet);
router.use('/categories', category);
router.use('/transactions', transaction);
router.use('/analytics', analytics);
router.use('/loans', loan);
router.use('/budgets', budget);

module.exports = router;
