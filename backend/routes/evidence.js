const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const evidence = require('../controllers/evidence');
const { authenticateToken } = require('../middlewares/auth');

// Ensure upload directory exists
const uploadDir = path.resolve(__dirname, '../uploads/evidence');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({ dest: uploadDir });

router.post('/', authenticateToken, upload.single('image'), evidence.store);
router.get('/stats', authenticateToken, evidence.stats);
router.get('/health', authenticateToken, evidence.health);
router.get('/:uuid/draft', authenticateToken, evidence.showDraft);
router.patch('/:uuid/draft', authenticateToken, evidence.updateDraft);
router.post('/:uuid/commit', authenticateToken, evidence.commit);
router.get('/:uuid/timeline', authenticateToken, evidence.timeline);

module.exports = router;

