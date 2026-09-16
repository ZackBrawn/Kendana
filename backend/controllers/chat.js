const { prisma } = require('../config/db');
const { processChatMessage } = require('../services/chatService');

// Command registry matching Laravel's registry API
const AVAILABLE_COMMANDS = [
  { command: '/help', description: 'Tampilkan menu bantuan chatbot' },
  { command: '/saldo', description: 'Lihat ringkasan saldo seluruh dompet Anda' },
  { command: '/transaksi', description: 'Tampilkan daftar transaksi pengeluaran hari ini' },
  { command: '/anggaran', description: 'Lihat status anggaran belanja aktif saat ini' }
];

// Helper to resolve active conversation
async function resolveActiveConversation(userId, conversationId) {
  if (conversationId) {
    const conv = await prisma.conversation.findFirst({
      where: { id: parseInt(conversationId), user_id: userId, is_active: true }
    });
    if (conv) return conv;
  }

  let active = await prisma.conversation.findFirst({
    where: { user_id: userId, is_active: true },
    orderBy: { created_at: 'desc' }
  });

  if (!active) {
    active = await prisma.conversation.create({
      data: { user_id: userId, is_active: true }
    });
  }

  return active;
}

exports.index = async (req, res) => {
  const userId = req.user.id;

  try {
    const conversation = await resolveActiveConversation(userId);
    const messages = await prisma.chatMessage.findMany({
      where: { conversation_id: conversation.id },
      orderBy: { created_at: 'asc' },
      take: 50 // Limit to last 50 messages
    });

    res.json({
      conversation: {
        id: conversation.id,
        title: conversation.title || 'Asisten Keuangan'
      },
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        status: msg.status,
        content: msg.content,
        created_at: msg.created_at
      })),
      botProfile: {
        name: req.user.bot_display_name || req.user.bot_name || 'ZackBrawn',
        avatar: req.user.bot_avatar || '🤖'
      },
      commands: AVAILABLE_COMMANDS
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.sendMessage = async (req, res) => {
  const { message, conversation_id } = req.body;
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Pesan tidak boleh kosong' });
  }

  const userId = req.user.id;

  try {
    const conversation = await resolveActiveConversation(userId, conversation_id);

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        conversation_id: conversation.id,
        role: 'user',
        content: [{ type: 'text', text: message.trim() }],
        raw_text: message.trim(),
        status: 'completed'
      }
    });

    // Handle standard sync command shortcuts if typed
    const textLower = message.trim().toLowerCase();
    if (textLower === '/help') {
      const reply = 'Halo! Saya adalah ZackBrawn, asisten keuangan pribadi digital. Anda bisa mengetikkan perintah natural language seperti: "bayar kopi 25rb pakai cash" atau "gajian masuk 2jt ke bca"';
      const botMessage = await prisma.chatMessage.create({
        data: {
          conversation_id: conversation.id,
          role: 'assistant',
          content: [{ type: 'text', text: reply }],
          raw_text: reply,
          status: 'completed'
        }
      });
      return res.json({
        success: true,
        queued: false,
        conversation_id: conversation.id,
        user_message: userMessage,
        bot_message: botMessage
      });
    }

    if (textLower === '/saldo') {
      const wallets = await prisma.wallet.findMany({
        where: { user_id: userId, group_type: { not: 'System' } }
      });
      const lines = wallets.map(w => `- *${w.name}*: Rp ${Number(w.balance).toLocaleString('id-ID')}`);
      const reply = `Status saldo aktif:\n${lines.length > 0 ? lines.join('\n') : 'Belum ada dompet terdaftar.'}`;
      const botMessage = await prisma.chatMessage.create({
        data: {
          conversation_id: conversation.id,
          role: 'assistant',
          content: [{ type: 'text', text: reply }],
          raw_text: reply,
          status: 'completed'
        }
      });
      return res.json({
        success: true,
        queued: false,
        conversation_id: conversation.id,
        user_message: userMessage,
        bot_message: botMessage
      });
    }

    // Save bot shell and spawn background job
    const botMessage = await prisma.chatMessage.create({
      data: {
        conversation_id: conversation.id,
        role: 'assistant',
        content: [],
        status: 'pending'
      }
    });

    processChatMessage(conversation.id, userId, userMessage.id, botMessage.id)
      .catch(err => console.error('Background chat processing error:', err));

    res.status(202).json({
      success: true,
      queued: true,
      conversation_id: conversation.id,
      user_message: userMessage,
      bot_message: botMessage
    });

  } catch (err) {
    console.error('sendMessage controller error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.messageStatus = async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    const message = await prisma.chatMessage.findFirst({
      where: {
        id,
        role: 'assistant',
        conversation: { user_id: userId }
      }
    });

    if (!message) {
      return res.status(404).json({ error: 'Pesan tidak ditemukan' });
    }

    res.json({
      status: message.status,
      error_message: message.error_message,
      bot_message: {
        id: message.id,
        role: message.role,
        status: message.status,
        content: message.content,
        created_at: message.created_at
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.history = async (req, res) => {
  const { conversation_id, before } = req.query;
  const userId = req.user.id;

  try {
    const conversation = await resolveActiveConversation(userId, conversation_id);
    const filter = { conversation_id: conversation.id };
    if (before) {
      filter.id = { lt: parseInt(before) };
    }

    const messages = await prisma.chatMessage.findMany({
      where: filter,
      orderBy: { id: 'desc' },
      take: 20
    });

    res.json({
      messages: messages.reverse(),
      has_more: messages.length === 20
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.commands = (req, res) => {
  res.json({ commands: AVAILABLE_COMMANDS });
};

exports.wallets = async (req, res) => {
  const userId = req.user.id;
  try {
    const wallets = await prisma.wallet.findMany({
      where: { user_id: userId, group_type: { not: 'System' } },
      orderBy: { name: 'asc' }
    });
    res.json({
      wallets: wallets.map(w => ({ id: w.id, name: w.name }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.assignWallet = async (req, res) => {
  const id = parseInt(req.params.id); // draft ID
  const { wallet_id } = req.body;
  const userId = req.user.id;

  if (!wallet_id) {
    return res.status(400).json({ error: 'wallet_id wajib ditentukan' });
  }

  try {
    const draft = await prisma.transactionDraft.findFirst({
      where: { id, user_id: userId, status: 'pending' }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft tidak ditemukan' });
    }

    const wallet = await prisma.wallet.findFirst({
      where: { id: parseInt(wallet_id), user_id: userId }
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet tidak ditemukan' });
    }

    const payload = draft.payload;
    if (payload.type === 'Transfer') {
      payload.source_wallet_id = wallet.id;
      payload.source_wallet_name = wallet.name;
    } else if (payload.type === 'Income') {
      payload.destination_wallet_id = wallet.id;
      payload.destination_wallet_name = wallet.name;
    } else {
      payload.source_wallet_id = wallet.id;
      payload.source_wallet_name = wallet.name;
    }

    const updated = await prisma.transactionDraft.update({
      where: { id },
      data: { payload }
    });

    res.json({ success: true, draft: updated });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.confirmTransaction = async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    const draft = await prisma.transactionDraft.findFirst({
      where: { id, user_id: userId, status: 'pending' }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft tidak ditemukan atau sudah diproses' });
    }

    const payload = draft.payload;
    const amount = parseFloat(payload.amount);
    const typeId = payload.type === 'Income' ? 1 : (payload.type === 'Transfer' ? 3 : 2);
    const sourceWalletId = payload.source_wallet_id;
    const destWalletId = payload.destination_wallet_id;

    if (!sourceWalletId && !destWalletId) {
      return res.status(422).json({ error: 'Draf tidak memiliki dompet valid. Hubungkan dompet terlebih dahulu.' });
    }

    const refNumber = `TX-CHAT-${Date.now()}`;

    const transaction = await prisma.$transaction(async (tx) => {
      let balanceBefore = 0;
      let balanceAfter = 0;

      if (typeId === 2 && sourceWalletId) {
        const wallet = await tx.wallet.findUnique({ where: { id: sourceWalletId } });
        balanceBefore = parseFloat(wallet.balance);
        balanceAfter = balanceBefore - amount;
        await tx.wallet.update({
          where: { id: sourceWalletId },
          data: { balance: balanceAfter }
        });
      } else if (typeId === 1 && destWalletId) {
        const wallet = await tx.wallet.findUnique({ where: { id: destWalletId } });
        balanceBefore = parseFloat(wallet.balance);
        balanceAfter = balanceBefore + amount;
        await tx.wallet.update({
          where: { id: destWalletId },
          data: { balance: balanceAfter }
        });
      }

      const txLog = await tx.transactionLog.create({
        data: {
          reference_number: refNumber,
          user_id: userId,
          date: new Date(),
          type_id: typeId,
          category_id: payload.category_id,
          source_wallet_id: sourceWalletId || destWalletId,
          destination_wallet_id: destWalletId || sourceWalletId,
          amount,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          subject: payload.subject || 'Transaksi Chat',
          notes: draft.original_text || '',
          is_cleared: true
        }
      });

      // Update draft status
      await tx.transactionDraft.update({
        where: { id: draft.id },
        data: {
          status: 'confirmed',
          confirmed_transaction_ids: [txLog.id]
        }
      });

      return txLog;
    });

    res.json({
      success: true,
      message: 'Transaksi draf dikonfirmasi berhasil.',
      transaction
    });

  } catch (err) {
    res.status(422).json({ error: err.message });
  }
};

exports.cancelTransaction = async (req, res) => {
  const id = parseInt(req.params.id);
  const userId = req.user.id;

  try {
    const draft = await prisma.transactionDraft.findFirst({
      where: { id, user_id: userId }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Draft tidak ditemukan' });
    }

    await prisma.transactionDraft.update({
      where: { id: draft.id },
      data: { status: 'cancelled' }
    });

    res.json({ success: true, message: 'Draf transaksi dibatalkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

