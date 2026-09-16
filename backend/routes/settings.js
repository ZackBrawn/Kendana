const express = require('express');
const router = express.Router();
const settings = require('../controllers/settings');
const { authenticateToken } = require('../middlewares/auth');

router.patch('/profile', authenticateToken, settings.updateProfile);
router.patch('/password', authenticateToken, settings.updatePassword);
router.patch('/preferences', authenticateToken, settings.updatePreferences);
router.patch('/appearance', authenticateToken, settings.updateAppearance);
router.patch('/notifications', authenticateToken, settings.updateNotifications);
router.patch('/logic', authenticateToken, settings.updateFinanceLogic);
router.get('/recent-changes', authenticateToken, settings.getRecentChanges);
router.post('/cache/clear', authenticateToken, settings.clearCache);
router.post('/account/export', authenticateToken, settings.exportAccountData);
router.post('/account/delete', authenticateToken, settings.deleteAccount);
router.get('/about', settings.getAbout);

module.exports = router;

