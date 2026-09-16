const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('Starting database seeding with expanded test datasets...');

  // 1. ensure transaction types exist
  const typesData = [
    { id: 1, name: 'Income' },
    { id: 2, name: 'Expense' },
    { id: 3, name: 'Transfer' },
    { id: 4, name: 'Debt' },
    { id: 5, name: 'Receivable' }
  ];

  for (const t of typesData) {
    await prisma.transactionType.upsert({
      where: { id: t.id },
      update: { name: t.name },
      create: t
    });
  }

  // 2. create or reset demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const user = await prisma.user.upsert({
    where: { email: 'user@demo.com' },
    update: {
      password: hashedPassword,
      name: 'Demo User'
    },
    create: {
      name: 'Demo User',
      email: 'user@demo.com',
      password: hashedPassword,
      allow_negative_balance: true
    }
  });

  console.log(`User created/verified: ${user.email} (id: ${user.id})`);

  // 3. clear existing user data for clean seeding
  await prisma.transactionLog.deleteMany({ where: { user_id: user.id } });
  await prisma.budget.deleteMany({ where: { user_id: user.id } });
  await prisma.category.deleteMany({ where: { user_id: user.id } });
  await prisma.wallet.deleteMany({ where: { user_id: user.id } });
  await prisma.netWorthSnapshot.deleteMany({ where: { user_id: user.id } });

  // 4. create 10 active wallets using finlogos icons
  const walletBca = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Bank BCA', balance: 25000000, group_type: 'Liquid', icon: 'Phbca' }
  });
  const walletMandiri = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Bank Mandiri', balance: 15000000, group_type: 'Liquid', icon: 'Phmandiri' }
  });
  const walletBni = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Bank BNI', balance: 10000000, group_type: 'Liquid', icon: 'Phbni' }
  });
  const walletBri = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Bank BRI', balance: 8000000, group_type: 'Liquid', icon: 'Phbri' }
  });
  const walletJago = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Bank Jago', balance: 5000000, group_type: 'Liquid', icon: 'Phjago' }
  });
  const walletSeabank = await prisma.wallet.create({
    data: { user_id: user.id, name: 'SeaBank', balance: 3000000, group_type: 'Liquid', icon: 'Phseabank' }
  });
  const walletGopay = await prisma.wallet.create({
    data: { user_id: user.id, name: 'GoPay', balance: 2500000, group_type: 'Liquid', icon: 'Phgopay' }
  });
  const walletOvo = await prisma.wallet.create({
    data: { user_id: user.id, name: 'OVO', balance: 1500000, group_type: 'Liquid', icon: 'Phovo' }
  });
  const walletDana = await prisma.wallet.create({
    data: { user_id: user.id, name: 'DANA', balance: 2000000, group_type: 'Liquid', icon: 'Phdana' }
  });
  const walletLinkaja = await prisma.wallet.create({
    data: { user_id: user.id, name: 'LinkAja', balance: 1000000, group_type: 'Liquid', icon: 'Phlinkaja' }
  });

  // system wallets
  const walletMerchant = await prisma.wallet.create({
    data: { user_id: user.id, name: 'External Merchant', balance: 0, group_type: 'System', icon: 'PhShoppingCart' }
  });
  const walletHutang = await prisma.wallet.create({
    data: { user_id: user.id, name: 'System Hutang', balance: 0, group_type: 'System', icon: 'PhArrowDownLeft' }
  });
  const walletPiutang = await prisma.wallet.create({
    data: { user_id: user.id, name: 'System Piutang', balance: 0, group_type: 'System', icon: 'PhArrowUpRight' }
  });

  // track balances locally for realistic sequence calculations
  const balances = {
    [walletBca.id]: 25000000,
    [walletMandiri.id]: 15000000,
    [walletBni.id]: 10000000,
    [walletBri.id]: 8000000,
    [walletJago.id]: 5000000,
    [walletSeabank.id]: 3000000,
    [walletGopay.id]: 2500000,
    [walletOvo.id]: 1500000,
    [walletDana.id]: 2000000,
    [walletLinkaja.id]: 1000000,
    [walletMerchant.id]: 0,
    [walletHutang.id]: 0,
    [walletPiutang.id]: 0
  };

  // 5. create exactly 15 expense categories (type_id = 2) using phosphor icons
  const expData = [
    { name: 'Makanan & Minuman', icon: 'PhForkKnife' },
    { name: 'Transportasi', icon: 'PhCar' },
    { name: 'Belanja Bulanan', icon: 'PhShoppingCart' },
    { name: 'Tagihan & Utilitas', icon: 'PhReceipt' },
    { name: 'Kesehatan', icon: 'PhFirstAid' },
    { name: 'Pendidikan', icon: 'PhGraduationCap' },
    { name: 'Hiburan & Rekreasi', icon: 'PhFilmStrip' },
    { name: 'Investasi', icon: 'PhTrendUp' },
    { name: 'Pulsa & Internet', icon: 'PhWifiHigh' },
    { name: 'Pakaian & Gaya Hidup', icon: 'PhTShirt' },
    { name: 'Sosial & Donasi', icon: 'PhHeart' },
    { name: 'Otomotif & Servis', icon: 'PhWrench' },
    { name: 'Olahraga & Hobi', icon: 'PhBicycle' },
    { name: 'Hadiah & Kado', icon: 'PhGift' },
    { name: 'Biaya Lain-lain', icon: 'PhDotsThreeCircle' }
  ];

  const expenseCats = [];
  for (const c of expData) {
    const created = await prisma.category.create({
      data: { user_id: user.id, type_id: 2, category_name: c.name, icon: c.icon }
    });
    expenseCats.push(created);
  }

  // 6. create exactly 10 income categories (type_id = 1) using phosphor icons
  const incData = [
    { name: 'Gaji Utama', icon: 'PhCoins' },
    { name: 'Gaji Lembur', icon: 'PhBriefcase' },
    { name: 'Bonus & THR', icon: 'PhConfetti' },
    { name: 'Freelance', icon: 'PhLaptop' },
    { name: 'Investasi & Dividen', icon: 'PhChartLine' },
    { name: 'Bunga Bank', icon: 'PhBank' },
    { name: 'Uang Saku', icon: 'PhWallet' },
    { name: 'Cashback', icon: 'PhPercent' },
    { name: 'Penjualan Barang', icon: 'PhStorefront' },
    { name: 'Pemasukan Lain-lain', icon: 'PhArrowDownLeft' }
  ];

  const incomeCats = [];
  for (const c of incData) {
    const created = await prisma.category.create({
      data: { user_id: user.id, type_id: 1, category_name: c.name, icon: c.icon }
    });
    incomeCats.push(created);
  }

  // debt and receivable categories (fixed, system categories)
  const debtData = [
    { name: 'Terima Hutang', icon: 'PhArrowDownLeft', system_key: 'LOAN' },
    { name: 'Bayar Hutang', icon: 'PhArrowUpRight', system_key: 'DEBT_PAYMENT' }
  ];
  const debtCats = [];
  for (const c of debtData) {
    const created = await prisma.category.create({
      data: { user_id: user.id, type_id: 4, category_name: c.name, icon: c.icon, system_key: c.system_key }
    });
    debtCats.push(created);
  }

  const recData = [
    { name: 'Ngasih Piutang', icon: 'PhArrowUpRight', system_key: 'RECEIVABLE' },
    { name: 'Terima Bayar Piutang', icon: 'PhArrowDownLeft', system_key: 'RECEIVABLE_PAYMENT' }
  ];
  const receivableCats = [];
  for (const c of recData) {
    const created = await prisma.category.create({
      data: { user_id: user.id, type_id: 5, category_name: c.name, icon: c.icon, system_key: c.system_key }
    });
    receivableCats.push(created);
  }

  console.log(`Created 15 Expense, 10 Income, and Debt/Receivable Categories successfully.`);

  // 7. create 3 budgets
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const budgetMakan = await prisma.budget.create({
    data: {
      user_id: user.id,
      name: 'Anggaran Makan & Cafe',
      limit_amount: 3000000,
      wallet_scope: 'all',
      category_scope: 'specific',
      period_type: 'monthly',
      start_date: ninetyDaysAgo,
      is_permanent: true,
      show_on_dashboard: true,
      icon: 'PhForkKnife',
      categories: {
        create: [
          { category_id: expenseCats.find(c => c.category_name === 'Makanan & Minuman').id }
        ]
      }
    }
  });

  const budgetTrans = await prisma.budget.create({
    data: {
      user_id: user.id,
      name: 'Anggaran Transportasi',
      limit_amount: 1500000,
      wallet_scope: 'all',
      category_scope: 'specific',
      period_type: 'monthly',
      start_date: ninetyDaysAgo,
      is_permanent: true,
      show_on_dashboard: true,
      icon: 'PhCar',
      categories: {
        create: [
          { category_id: expenseCats.find(c => c.category_name === 'Transportasi').id }
        ]
      }
    }
  });

  const budgetBelanja = await prisma.budget.create({
    data: {
      user_id: user.id,
      name: 'Anggaran Belanja Bulanan',
      limit_amount: 4000000,
      wallet_scope: 'all',
      category_scope: 'specific',
      period_type: 'monthly',
      start_date: ninetyDaysAgo,
      is_permanent: true,
      show_on_dashboard: true,
      icon: 'PhShoppingCart',
      categories: {
        create: [
          { category_id: expenseCats.find(c => c.category_name === 'Belanja Bulanan').id }
        ]
      }
    }
  });

  console.log(`Created 3 budgets linked to Makanan & Minuman, Transportasi, and Belanja Bulanan.`);

  // 8. generate 90 days of transactions (3 months) - min 5 transactions per day
  console.log('Simulating 90 Days of Transactions (minimum 5 per day)...');
  let logCount = 0;

  for (let day = 90; day >= 1; day--) {
    const baseDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);

    // generate exactly 5 to 7 transactions per day deterministically
    const dailyCount = 5 + (day % 3);

    for (let index = 0; index < dailyCount; index++) {
      logCount++;
      const txTime = new Date(baseDate.getTime());
      txTime.setHours(8 + (index * 2), 15 + ((index * 9) % 60), 0, 0);

      // determine transaction type
      let typeId = 2; // default to expense

      if (index === 0 && day % 3 === 0) {
        typeId = 1; // income
      } else if (index === 1 && day % 5 === 0) {
        typeId = 3; // transfer
      } else if (index === 2 && day % 12 === 0) {
        typeId = 4; // debt
      } else if (index === 3 && day % 15 === 0) {
        typeId = 5; // receivable
      }

      let sourceWallet, destWallet, category, amount, subject;

      if (typeId === 1) {
        // income
        const targets = [walletBca, walletMandiri, walletBni, walletBri, walletJago, walletSeabank, walletGopay, walletOvo, walletDana, walletLinkaja];
        destWallet = targets[(day + index) % targets.length];
        sourceWallet = walletMerchant;

        const catIdx = (day * 3 + index) % incomeCats.length;
        category = incomeCats[catIdx];

        amount = 150000 + (day % 10) * 85000;
        if (category.category_name === 'Gaji Utama') {
          amount = 12500000;
          subject = 'Gaji Bulanan Utama';
        } else if (category.category_name === 'Freelance') {
          amount = 1500000 + (day % 4) * 500000;
          subject = 'Pembayaran Project Freelance';
        } else {
          subject = `Penerimaan ${category.category_name}`;
        }

        const balanceBefore = balances[destWallet.id];
        balances[destWallet.id] += amount;

        await prisma.transactionLog.create({
          data: {
            reference_number: `TRX-SEED-INC-${day}-${index}`,
            user_id: user.id,
            date: txTime,
            type_id: 1,
            category_id: category.id,
            source_wallet_id: sourceWallet.id,
            destination_wallet_id: destWallet.id,
            amount: amount,
            balance_before: balanceBefore,
            balance_after: balances[destWallet.id],
            subject: subject,
            notes: `Seeded ${subject} to ${destWallet.name}`
          }
        });

      } else if (typeId === 3) {
        // transfer
        const sourceList = [walletBca, walletMandiri, walletBni];
        sourceWallet = sourceList[day % sourceList.length];

        const destList = [walletJago, walletSeabank, walletGopay, walletOvo, walletDana, walletLinkaja];
        destWallet = destList[(day + index) % destList.length];

        if (sourceWallet.id === destWallet.id) {
          destWallet = walletDana;
        }

        amount = 50000 + (day % 5) * 50000;
        subject = `Top-Up / Transfer ke ${destWallet.name}`;

        const balanceBefore = balances[sourceWallet.id];
        balances[sourceWallet.id] -= amount;
        balances[destWallet.id] += amount;

        await prisma.transactionLog.create({
          data: {
            reference_number: `TRX-SEED-TRF-${day}-${index}`,
            user_id: user.id,
            date: txTime,
            type_id: 3,
            category_id: null,
            source_wallet_id: sourceWallet.id,
            destination_wallet_id: destWallet.id,
            amount: amount,
            balance_before: balanceBefore,
            balance_after: balances[sourceWallet.id],
            subject: subject,
            notes: `Transfer dari ${sourceWallet.name} ke ${destWallet.name}`
          }
        });

      } else if (typeId === 4) {
        // debt
        const targets = [walletBca, walletMandiri, walletBni];
        destWallet = targets[day % targets.length];
        sourceWallet = walletHutang;

        category = debtCats[day % debtCats.length];
        amount = 100000 + (day % 5) * 100000;
        subject = `Mengambil Pinjaman via ${category.category_name}`;

        const balanceBefore = balances[destWallet.id];
        balances[destWallet.id] += amount;
        balances[walletHutang.id] += amount;

        await prisma.transactionLog.create({
          data: {
            reference_number: `TRX-SEED-DEBT-${day}-${index}`,
            user_id: user.id,
            date: txTime,
            type_id: 4,
            category_id: category.id,
            source_wallet_id: sourceWallet.id,
            destination_wallet_id: destWallet.id,
            amount: amount,
            balance_before: balanceBefore,
            balance_after: balances[destWallet.id],
            subject: subject,
            notes: `Menerima pinjaman dan menambah hutang`
          }
        });

      } else if (typeId === 5) {
        // receivable
        const sourceList = [walletBca, walletGopay, walletDana];
        sourceWallet = sourceList[day % sourceList.length];
        destWallet = walletPiutang;

        category = receivableCats[day % receivableCats.length];
        amount = 50000 + (day % 5) * 50000;
        subject = `Meminjamkan ke Orang lain (${category.category_name})`;

        const balanceBefore = balances[sourceWallet.id];
        balances[sourceWallet.id] -= amount;
        balances[walletPiutang.id] += amount;

        await prisma.transactionLog.create({
          data: {
            reference_number: `TRX-SEED-REC-${day}-${index}`,
            user_id: user.id,
            date: txTime,
            type_id: 5,
            category_id: category.id,
            source_wallet_id: sourceWallet.id,
            destination_wallet_id: destWallet.id,
            amount: amount,
            balance_before: balanceBefore,
            balance_after: balances[sourceWallet.id],
            subject: subject,
            notes: `Meminjamkan dana tunai/e-Wallet`
          }
        });

      } else {
        // expense
        const sourceList = [walletBca, walletMandiri, walletBni, walletBri, walletJago, walletSeabank, walletGopay, walletOvo, walletDana, walletLinkaja];
        sourceWallet = sourceList[(day * 3 + index) % sourceList.length];
        destWallet = walletMerchant;

        const catIdx = (day * 7 + index * 13) % expenseCats.length;
        category = expenseCats[catIdx];

        amount = 15000 + (day % 8) * 12000;
        if (category.category_name === 'Makanan & Minuman') {
          subject = ['Nasi Padang Lauk Ayam', 'Ayam Geprek Sambal', 'Bakmi Goreng Spesial', 'Gado-Gado Betawi'][(day + index) % 4];
        } else if (category.category_name === 'Transportasi') {
          subject = 'Bensin Motor Harian';
        } else if (category.category_name === 'Belanja Bulanan') {
          amount = 150000 + (day % 4) * 75000;
          subject = 'Beli Sembako & Sayur Supermarket';
        } else {
          subject = `Pembelian ${category.category_name}`;
        }

        const balanceBefore = balances[sourceWallet.id];
        balances[sourceWallet.id] -= amount;

        await prisma.transactionLog.create({
          data: {
            reference_number: `TRX-SEED-EXP-${day}-${index}`,
            user_id: user.id,
            date: txTime,
            type_id: 2,
            category_id: category.id,
            source_wallet_id: sourceWallet.id,
            destination_wallet_id: destWallet.id,
            amount: amount,
            balance_before: balanceBefore,
            balance_after: balances[sourceWallet.id],
            subject: subject,
            notes: `Belanja ${subject} via ${sourceWallet.name}`
          }
        });
      }
    }
  }

  // 9. save final simulated balances to db
  console.log('Saving final simulated balances to DB...');
  for (const walletId of Object.keys(balances)) {
    await prisma.wallet.update({
      where: { id: parseInt(walletId) },
      data: { balance: balances[walletId] }
    });
  }

  console.log(`Seeding complete! Generated ${logCount} transactions over 90 days.`);
}

main()
  .catch((e) => {
    console.error('Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
