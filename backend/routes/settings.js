const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const settings = require('../controllers/settings');
const { authenticateToken } = require('../middlewares/auth');

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, callback) => {
    if (path.extname(file.originalname).toLowerCase() !== '.json') {
      return callback(new Error('File impor harus berformat .json.'));
    }
    callback(null, true);
  }
});

const handleImportUploadError = (err, req, res, next) => {
  if (!err) return next();
  const status = err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
  return res.status(status).json({ error: err.message || 'File impor tidak dapat dibaca.' });
};

router.patch('/profile', authenticateToken, settings.updateProfile);
router.patch('/password', authenticateToken, settings.updatePassword);
router.patch('/preferences', authenticateToken, settings.updatePreferences);
router.patch('/appearance', authenticateToken, settings.updateAppearance);
router.patch('/notifications', authenticateToken, settings.updateNotifications);
router.patch('/logic', authenticateToken, settings.updateFinanceLogic);
router.get('/recent-changes', authenticateToken, settings.getRecentChanges);
router.post('/cache/clear', authenticateToken, settings.clearCache);
router.post('/account/export', authenticateToken, settings.exportAccountData);
router.get('/account/import/bendaharaku/status', authenticateToken, settings.getBendaharakuImportStatus);
router.post(
  '/account/import/bendaharaku',
  authenticateToken,
  importUpload.single('file'),
  handleImportUploadError,
  settings.importBendaharakuData
);
router.post('/account/delete', authenticateToken, settings.deleteAccount);
router.get('/about', settings.getAbout);

module.exports = router;
