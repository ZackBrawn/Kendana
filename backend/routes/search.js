const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search');
const { authenticateToken } = require('../middlewares/auth');

router.get('/', authenticateToken, searchController.search);

module.exports = router;

