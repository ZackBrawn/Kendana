const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth');
const { authenticateToken } = require('../middlewares/auth');

router.post('/register', auth.register);
router.post('/login', auth.login);
router.get('/me', authenticateToken, auth.getMe);
router.get('/google', auth.redirectToGoogle);
router.get('/google/callback', auth.handleGoogleCallback);

module.exports = router;

