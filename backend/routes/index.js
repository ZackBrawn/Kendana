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
const settings = require('./settings');
const evidence = require('./evidence');
const search = require('./search');
const push = require('./push');
const chat = require('./chat');
const customNotification = require('./customNotification');

router.use('/auth', auth);
router.use('/dashboard', dashboard);
router.use('/wallets', wallet);
router.use('/categories', category);
router.use('/transactions', transaction);
router.use('/analytics', analytics);
router.use('/loans', loan);
router.use('/budgets', budget);
router.use('/settings', settings);
router.use('/evidence', evidence);
router.use('/search', search);
router.use('/notifications', push);
router.use('/custom-notifications', customNotification);
router.use('/chat', chat);

module.exports = router;
