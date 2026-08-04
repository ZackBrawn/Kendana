const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { prisma } = require('./config/db');
const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Register API Routes
app.use('/api', routes);

// Helper for seeding demo user & initial wallets/categories
async function ensureDefaultData() {
  try {
    const existing = await prisma.user.findFirst();
    if (!existing) {
      const hashedPassword = await bcrypt.hash('password', 10);
      const user = await prisma.user.create({
        data: {
          name: 'Demo User',
          email: 'demo@kendana.com',
          password: hashedPassword,
          allow_negative_balance: false
        }
      });
      
      await prisma.wallet.createMany({
        data: [
          { user_id: user.id, name: 'System Hutang', balance: 0, group_type: 'System', icon: '🏦', keyword: 'sistem hutang' },
          { user_id: user.id, name: 'System Piutang', balance: 0, group_type: 'System', icon: '🏦', keyword: 'sistem piutang' },
          { user_id: user.id, name: 'External System', balance: 0, group_type: 'System', icon: '🌐', keyword: 'external' },
          { user_id: user.id, name: 'Merchant System', balance: 0, group_type: 'System', icon: '🏪', keyword: 'merchant' },
          { user_id: user.id, name: 'Dompet Cash', balance: 5000000, group_type: 'Liquid', icon: '💵', keyword: 'cash, tunai' }
        ]
      });

      await prisma.category.createMany({
        data: [
          { user_id: user.id, type_id: 1, category_name: 'Gaji / Pendapatan', icon: '💰', keyword: 'gaji, bonus' },
          { user_id: user.id, type_id: 1, category_name: 'Pendapatan Sampingan', icon: '🚀', keyword: 'freelance, bisnis' },
          { user_id: user.id, type_id: 2, category_name: 'Makan & Minum', icon: '🍔', keyword: 'makan, minum' },
          { user_id: user.id, type_id: 2, category_name: 'Transportasi', icon: '🚗', keyword: 'bensin, gojek' },
          { user_id: user.id, type_id: 2, category_name: 'Tagihan & Utilitas', icon: '⚡', keyword: 'listrik, wifi' },
          { user_id: user.id, type_id: 3, category_name: 'Pindah Saldo', icon: '🔄', keyword: 'transfer' },
          { user_id: user.id, type_id: 4, category_name: 'Dapat Hutangan', icon: '📥', keyword: 'ngutang' },
          { user_id: user.id, type_id: 4, category_name: 'Bayar Cicilan Hutang', icon: '💸', keyword: 'bayar utang' },
          { user_id: user.id, type_id: 5, category_name: 'Ngasih Piutang', icon: '📤', keyword: 'minjemin' },
          { user_id: user.id, type_id: 5, category_name: 'Terima Bayar Piutang', icon: '🤑', keyword: 'dibayar' }
        ]
      });
      console.log('Seeded initial demo data via Prisma.');
    }
  } catch (e) {
    console.error('Seed notice:', e.message);
  }
}

// Serve static frontend client in production
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/assets')) {
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Asset not found' });
  }
});

app.listen(PORT, async () => {
  console.log(`Kendana Backend API running on http://localhost:${PORT}`);
  await ensureDefaultData();
});
