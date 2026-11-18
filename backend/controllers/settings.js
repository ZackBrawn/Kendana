const bcrypt = require('bcryptjs');
const { prisma } = require('../config/db');
const { logChange } = require('../utils/settingsLogger');
const { ImportValidationError, prepareBendaharakuImport } = require('../services/bendaharakuImport');

const isBendaharakuImportEnabled = () => process.env.KENDANA_DATA_IMPORT_ENABLED === 'true';
const configuredImportAdminEmail = () => (process.env.KENDANA_DATA_IMPORT_ADMIN_EMAIL || '').trim().toLowerCase();

const isBendaharakuImportAdmin = (user) =>
  isBendaharakuImportEnabled() &&
  configuredImportAdminEmail() !== '' &&
  user.email.toLowerCase() === configuredImportAdminEmail();

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
  const { category_icon_colored } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    const updatedData = {};
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

exports.getBendaharakuImportStatus = async (req, res) => {
  try {
    if (!isBendaharakuImportEnabled() || !configuredImportAdminEmail()) {
      return res.json({ enabled: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true }
    });
    if (!user) return res.status(404).json({ error: 'User tidak ditemukan' });

    res.json({ enabled: isBendaharakuImportAdmin(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.importBendaharakuData = async (req, res) => {
  if (!isBendaharakuImportEnabled() || !configuredImportAdminEmail()) {
    return res.status(403).json({ error: 'Impor data belum diaktifkan di server.' });
  }
  if (!req.file) return res.status(400).json({ error: 'Pilih file ekspor JSON terlebih dahulu.' });

  try {
    const targetUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true }
    });
    if (!targetUser) return res.status(404).json({ error: 'User tidak ditemukan' });
    if (!isBendaharakuImportAdmin(targetUser)) {
      return res.status(403).json({ error: 'Akun ini tidak diizinkan mengimpor data.' });
    }

    let payload;
    try {
      payload = JSON.parse(req.file.buffer.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'File bukan JSON yang valid.' });
    }

    const plan = prepareBendaharakuImport(payload, targetUser);
    const sourceTransactionClientIds = plan.transactions.map(
      (transaction) => `bendaharaku:${plan.sourceUser.id}:${transaction.source_id}`
    );
    const references = plan.transactions.map((transaction) => transaction.reference_number);

    const result = await prisma.$transaction(async (tx) => {
      if (references.length > 0) {
        const collisions = await tx.transactionLog.findMany({
          where: {
            OR: [
              { reference_number: { in: references } },
              { client_id: { in: sourceTransactionClientIds } }
            ]
          },
          select: { reference_number: true, client_id: true },
          take: 10
        });
        if (collisions.length > 0) {
          const error = new Error(
            'Sebagian reference_number sudah ada di Kendana. Tidak ada data yang diimpor.'
          );
          error.statusCode = 409;
          throw error;
        }
      }

      const targetTypes = await tx.transactionType.findMany({
        where: { name: { in: plan.transactionTypeNames } },
        select: { id: true, name: true }
      });
      const targetTypeIdByName = new Map(
        targetTypes.map((type) => [type.name.toLowerCase(), type.id])
      );
      for (const name of plan.transactionTypeNames) {
        if (!targetTypeIdByName.has(name.toLowerCase())) {
          const createdType = await tx.transactionType.create({
            data: { name }
          });
          targetTypeIdByName.set(name.toLowerCase(), createdType.id);
        }
      }

      const sourceTypeIdToTarget = Object.fromEntries(
        [...plan.typeNameBySourceId.entries()].map(([sourceId, name]) => [
          sourceId,
          targetTypeIdByName.get(name.toLowerCase())
        ])
      );

      const walletIdMap = new Map();
      for (const wallet of plan.wallets) {
        const createdWallet = await tx.wallet.create({
          data: {
            user_id: targetUser.id,
            name: wallet.name,
            balance: wallet.balance,
            group_type: wallet.group_type,
            icon: wallet.icon,
            keyword: wallet.keyword,
            is_active: wallet.is_active,
            deleted_at: wallet.deleted_at,
            is_pinned: wallet.is_pinned,
            account_name: wallet.account_name,
            account_number: wallet.account_number,
            bank_code: wallet.bank_code,
            created_at: wallet.created_at,
            updated_at: wallet.updated_at
          },
          select: { id: true }
        });
        walletIdMap.set(wallet.source_id, createdWallet.id);
      }

      const categoryIdMap = new Map();
      for (const category of plan.categories) {
        const createdCategory = await tx.category.create({
          data: {
            user_id: targetUser.id,
            type_id: sourceTypeIdToTarget[category.type_source_id],
            category_name: category.category_name,
            icon: category.icon,
            keyword: category.keyword,
            is_active: category.is_active,
            deleted_at: category.deleted_at,
            system_key: category.system_key,
            custom_name: category.custom_name,
            custom_icon: category.custom_icon,
            custom_keyword: category.custom_keyword,
            created_at: category.created_at,
            updated_at: category.updated_at
          },
          select: { id: true }
        });
        categoryIdMap.set(category.source_id, createdCategory.id);
      }

      const transactionIdMap = {};
      for (const [index, transaction] of plan.transactions.entries()) {
        const createdTransaction = await tx.transactionLog.create({
          data: {
            reference_number: transaction.reference_number,
            user_id: targetUser.id,
            date: transaction.date,
            type_id: sourceTypeIdToTarget[transaction.type_source_id],
            category_id: transaction.category_source_id === null
              ? null
              : categoryIdMap.get(transaction.category_source_id),
            source_wallet_id: walletIdMap.get(transaction.source_wallet_source_id),
            destination_wallet_id: transaction.destination_wallet_source_id === null
              ? null
              : walletIdMap.get(transaction.destination_wallet_source_id),
            amount: transaction.amount,
            balance_before: transaction.balance_before,
            balance_after: transaction.balance_after,
            subject: transaction.subject,
            notes: transaction.notes,
            is_cleared: transaction.is_cleared,
            deleted_at: transaction.deleted_at,
            created_at: transaction.created_at,
            updated_at: transaction.updated_at,
            due_date: transaction.due_date,
            due_date_type: transaction.due_date_type,
            due_date_interval: transaction.due_date_interval,
            client_id: sourceTransactionClientIds[index]
          },
          select: { id: true }
        });
        transactionIdMap[transaction.source_id] = createdTransaction.id;
      }

      return {
        typeIdMap: sourceTypeIdToTarget,
        walletIdMap: Object.fromEntries(walletIdMap),
        categoryIdMap: Object.fromEntries(categoryIdMap),
        transactionIdMap
      };
    }, { maxWait: 10000, timeout: 120000 });

    res.json({
      success: true,
      counts: {
        wallets: plan.wallets.length,
        categories: plan.categories.length,
        transactions: plan.transactions.length
      },
      id_map: {
        user: { [plan.sourceUser.id]: targetUser.id },
        transaction_types: result.typeIdMap,
        wallets: result.walletIdMap,
        categories: result.categoryIdMap,
        transactions: result.transactionIdMap
      },
      message: 'Data Bendaharaku berhasil ditambahkan ke akun Kendana.'
    });
  } catch (err) {
    if (err instanceof ImportValidationError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    if (err.statusCode === 409) {
      return res.status(409).json({ error: err.message });
    }
    console.error('Bendaharaku import failed:', err);
    res.status(500).json({ error: 'Impor gagal dan seluruh perubahan telah dibatalkan.' });
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
    appVersion: '2.0',
    service: 'express-prisma',
    status: 'ok',
    time: new Date().toISOString()
  });
};
