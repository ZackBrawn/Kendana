const bcrypt = require('bcryptjs');
const { prisma } = require('../config/db');
const { logChange } = require('../utils/settingsLogger');

// Update profile info
exports.updateProfile = async (req, res) => {
  const { name, email, whatsapp, telegram, avatar } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const updatedData = {};
    if (name !== undefined) updatedData.name = name;
    if (email !== undefined) updatedData.email = email;
    if (whatsapp !== undefined) updatedData.whatsapp = whatsapp;
    if (telegram !== undefined) updatedData.telegram = telegram;
    if (avatar !== undefined) updatedData.avatar = avatar;

    const original = { ...user };
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updatedData
    });

    // Log changes
    for (const key of Object.keys(updatedData)) {
      if (original[key] !== updated[key]) {
        await logChange(req.user.id, `profile:${key}`, 'settings.account.profile', original[key], updated[key]);
      }
    }

    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update password
exports.updatePassword = async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) {
    return res.status(400).json({ error: 'Password lama dan baru wajib diisi' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(400).json({ error: 'Password saat ini salah' });

    const hashedPassword = await bcrypt.hash(new_password, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    await logChange(req.user.id, 'password', 'settings.account.security', '*****', '*****');

    res.json({ success: true, message: 'Password berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update preferences
exports.updatePreferences = async (req, res) => {
  const { timezone, date_format, language, dashboard_show_budget, dashboard_budget_expanded } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const updatedData = {};
    if (timezone) updatedData.timezone = timezone;
    if (date_format) updatedData.date_format = date_format;
    if (language) updatedData.locale = language;
    if (dashboard_show_budget !== undefined) updatedData.dashboard_show_budget = dashboard_show_budget;
    if (dashboard_budget_expanded !== undefined) updatedData.dashboard_budget_expanded = dashboard_budget_expanded;

    const original = { ...user };
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updatedData
    });

    for (const key of Object.keys(updatedData)) {
      const dbKey = key === 'language' ? 'locale' : key;
      if (original[dbKey] !== updated[dbKey]) {
        await logChange(req.user.id, `preferences:${dbKey}`, 'settings.account.preferences', original[dbKey], updated[dbKey]);
      }
    }

    res.json({ success: true, user: updated, message: 'Preferensi berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update appearance
exports.updateAppearance = async (req, res) => {
  const { theme, accent_color, category_icon_colored } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const updatedData = {};
    if (theme) updatedData.theme = theme;
    if (accent_color) updatedData.accent_color = accent_color;
    if (category_icon_colored !== undefined) updatedData.category_icon_colored = category_icon_colored;

    const original = { ...user };
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updatedData
    });

    for (const key of Object.keys(updatedData)) {
      if (original[key] !== updated[key]) {
        await logChange(req.user.id, `appearance:${key}`, 'settings.application.appearance', original[key], updated[key]);
      }
    }

    res.json({ success: true, user: updated, message: 'Tampilan berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update notifications
exports.updateNotifications = async (req, res) => {
  const { email_notifications, push_notifications } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const updatedData = {};
    if (email_notifications !== undefined) updatedData.email_notifications = email_notifications;
    if (push_notifications !== undefined) updatedData.push_notifications = push_notifications;

    const original = { ...user };
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updatedData
    });

    for (const key of Object.keys(updatedData)) {
      if (original[key] !== updated[key]) {
        await logChange(req.user.id, `notifications:${key}`, 'settings.application.notifications', original[key], updated[key]);
      }
    }

    res.json({ success: true, user: updated, message: 'Notifikasi berhasil diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update finance logic (allow negative balance & auto budgeting)
exports.updateFinanceLogic = async (req, res) => {
  const { allow_negative_balance, auto_budget_enabled } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const updateData = {};
    if (allow_negative_balance !== undefined) {
      updateData.allow_negative_balance = allow_negative_balance === true || allow_negative_balance === 'true';
    }
    if (auto_budget_enabled !== undefined) {
      updateData.auto_budget_enabled = auto_budget_enabled === true || auto_budget_enabled === 'true';
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'Tidak ada data parameter yang dikirim' });
    }

    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData
    });

    if (updateData.allow_negative_balance !== undefined && user.allow_negative_balance !== updated.allow_negative_balance) {
      await logChange(req.user.id, 'allow_negative_balance', 'settings.finance.logic', user.allow_negative_balance, updated.allow_negative_balance);
    }
    if (updateData.auto_budget_enabled !== undefined && user.auto_budget_enabled !== updated.auto_budget_enabled) {
      await logChange(req.user.id, 'auto_budget_enabled', 'settings.finance.logic', user.auto_budget_enabled, updated.auto_budget_enabled);
    }

    res.json({ success: true, user: updated, message: 'Logika transaksi diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get settings change logs
exports.getRecentChanges = async (req, res) => {
  try {
    const logs = await prisma.userSettingsChange.findMany({
      where: { user_id: req.user.id },
      orderBy: { changed_at: 'desc' },
      take: 10
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export account data
exports.exportAccountData = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const wallets = await prisma.wallet.findMany({ where: { user_id: req.user.id } });
    const categories = await prisma.category.findMany({ where: { user_id: req.user.id } });
    const transactions = await prisma.transactionLog.findMany({
      where: { user_id: req.user.id },
      take: 1000
    });

    const exportData = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      },
      wallets,
      categories,
      transactions
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="kendana-export.json"');
    res.send(JSON.stringify(exportData, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete account
exports.deleteAccount = async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password verifikasi diperlukan' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Password verifikasi salah' });

    await prisma.user.delete({ where: { id: req.user.id } });
    res.json({ success: true, message: 'Akun berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Clear cache (stub)
exports.clearCache = async (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Cache clearing via web disabled. Run commands directly on the server.'
  });
};

// System About
exports.getAbout = async (req, res) => {
  res.json({
    appVersion: '0.3',
    service: 'express-prisma',
    status: 'ok',
    time: new Date().toISOString()
  });
};

