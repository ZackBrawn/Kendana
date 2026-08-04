const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🌱 Starting database seeding with expanded test datasets...');

  // 1. Ensure Transaction Types exist
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

  // 2. Create or Reset Demo User
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

  console.log(`👤 User created/verified: ${user.email} (id: ${user.id})`);

  // Clear existing user data for clean seeding
  await prisma.transactionLog.deleteMany({ where: { user_id: user.id } });
  await prisma.category.deleteMany({ where: { user_id: user.id } });
  await prisma.wallet.deleteMany({ where: { user_id: user.id } });

  // 3. Create 10 Active Wallets (+ 3 System Wallets)
  const walletCash = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Uang Tunai / Cash', balance: 5000000, group_type: 'Liquid', icon: 'PhMoney', is_pinned: true }
  });
  const walletBca = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Bank BCA', balance: 45000000, group_type: 'Liquid', icon: 'PhBank', is_pinned: true }
  });
  const walletMandiri = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Bank Mandiri', balance: 30000000, group_type: 'Liquid', icon: 'PhBank', is_pinned: true }
  });
  const walletGopay = await prisma.wallet.create({
    data: { user_id: user.id, name: 'GoPay e-Wallet', balance: 4500000, group_type: 'Liquid', icon: 'PhDeviceMobile', is_pinned: true }
  });
  const walletOvo = await prisma.wallet.create({
    data: { user_id: user.id, name: 'OVO e-Wallet', balance: 2500000, group_type: 'Liquid', icon: 'PhSparkle', is_pinned: true }
  });
  const walletShopeePay = await prisma.wallet.create({
    data: { user_id: user.id, name: 'ShopeePay e-Wallet', balance: 2000000, group_type: 'Liquid', icon: 'PhBag', is_pinned: true }
  });
  const walletDana = await prisma.wallet.create({
    data: { user_id: user.id, name: 'DANA e-Wallet', balance: 3500000, group_type: 'Liquid', icon: 'PhCreditCard', is_pinned: true }
  });
  const walletCreditCard = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Kartu Kredit', balance: 0, group_type: 'Liquid', icon: 'PhCreditCard', is_pinned: true }
  });
  const walletBibit = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Investasi Bibit', balance: 15000000, group_type: 'Liquid', icon: 'PhTrendUp', is_pinned: true }
  });
  const walletCrypto = await prisma.wallet.create({
    data: { user_id: user.id, name: 'Crypto Wallet', balance: 10000000, group_type: 'Liquid', icon: 'PhCoins', is_pinned: true }
  });

  // System Wallets
  const walletMerchant = await prisma.wallet.create({
    data: { user_id: user.id, name: 'External Merchant', balance: 0, group_type: 'System', icon: 'PhShoppingCart' }
  });
  const walletHutang = await prisma.wallet.create({
    data: { user_id: user.id, name: 'System Hutang', balance: 0, group_type: 'System', icon: 'PhArrowDownLeft' }
  });
  const walletPiutang = await prisma.wallet.create({
    data: { user_id: user.id, name: 'System Piutang', balance: 0, group_type: 'System', icon: 'PhArrowUpRight' }
  });

  // Track balances locally for realistic sequence calculations
  const balances = {
    [walletCash.id]: 5000000,
    [walletBca.id]: 45000000,
    [walletMandiri.id]: 30000000,
    [walletGopay.id]: 4500000,
    [walletOvo.id]: 2500000,
    [walletShopeePay.id]: 2000000,
    [walletDana.id]: 3500000,
    [walletCreditCard.id]: 0,
    [walletBibit.id]: 15000000,
    [walletCrypto.id]: 10000000,
    [walletMerchant.id]: 0,
    [walletHutang.id]: 0,
    [walletPiutang.id]: 0
  };

  // 4. Create 30 Expense Categories (type_id = 2) using Phosphor Icons
  const expData = [
    { name: 'Makanan Utama', icon: 'PhHamburger' },
    { name: 'Kopi & Cafe', icon: 'PhCoffee' },
    { name: 'Camilan & Jajanan', icon: 'PhCookie' },
    { name: 'Bensin & Pertamax', icon: 'PhGasPump' },
    { name: 'Transportasi Online', icon: 'PhCar' },
    { name: 'Parkir & Tol', icon: 'PhTicket' },
    { name: 'Listrik & PLN', icon: 'PhLightning' },
    { name: 'Air PDAM', icon: 'PhDrop' },
    { name: 'Internet & Wi-Fi', icon: 'PhWifiHigh' },
    { name: 'Pulsa & Paket Data', icon: 'PhDeviceMobile' },
    { name: 'Streaming & Hiburan', icon: 'PhPlayCircle' },
    { name: 'Bioskop & Film', icon: 'PhFilmStrip' },
    { name: 'Game & Steam', icon: 'PhGameController' },
    { name: 'Belanja Bulanan', icon: 'PhShoppingCart' },
    { name: 'Pakaian & Fashion', icon: 'PhTShirt' },
    { name: 'Gadget & Elektronik', icon: 'PhLaptop' },
    { name: 'Perkakas Rumah', icon: 'PhHouse' },
    { name: 'Kesehatan & Dokter', icon: 'PhStethoscope' },
    { name: 'Obat & Vitamin', icon: 'PhPill' },
    { name: 'Gym & Olahraga', icon: 'PhBarbell' },
    { name: 'Salon & Barbershop', icon: 'PhScissors' },
    { name: 'Asuransi & Proteksi', icon: 'PhShieldCheck' },
    { name: 'Pajak Kendaraan', icon: 'PhFileText' },
    { name: 'Hewan Peliharaan', icon: 'PhPawPrint' },
    { name: 'Servis & Reparasi', icon: 'PhWrench' },
    { name: 'Kado & Hadiah', icon: 'PhGift' },
    { name: 'Donasi & Amal', icon: 'PhHeart' },
    { name: 'Edukasi & Buku', icon: 'PhBookOpen' },
    { name: 'Biaya Admin Bank', icon: 'PhCreditCard' },
    { name: 'Lain-lain', icon: 'PhDotsThreeCircle' }
  ];

  const expenseCats = [];
  for (const c of expData) {
    const created = await prisma.category.create({
      data: { user_id: user.id, type_id: 2, category_name: c.name, icon: c.icon }
    });
    expenseCats.push(created);
  }

  // 5. Create 10 Income Categories (type_id = 1) using Phosphor Icons
  const incData = [
    { name: 'Gaji Utama', icon: 'PhCoins' },
    { name: 'Gaji Lembur', icon: 'PhBriefcase' },
    { name: 'Bonus & THR', icon: 'PhConfetti' },
    { name: 'Freelance Project', icon: 'PhLaptop' },
    { name: 'Dividen Saham', icon: 'PhVault' },
    { name: 'Bunga Bank', icon: 'PhBank' },
    { name: 'Cashback Belanja', icon: 'PhPercent' },
    { name: 'Uang Saku / Jajan', icon: 'PhMoney' },
    { name: 'Hadiah & Give-away', icon: 'PhGift' },
    { name: 'Penjualan Barang', icon: 'PhStorefront' }
  ];

  const incomeCats = [];
  for (const c of incData) {
    const created = await prisma.category.create({
      data: { user_id: user.id, type_id: 1, category_name: c.name, icon: c.icon }
    });
    incomeCats.push(created);
  }

  // 6. Create Debt Categories (type_id = 4)
  const debtData = [
    { name: 'Pinjaman Bank', icon: 'PhBank' },
    { name: 'Hutang Teman', icon: 'PhUser' }
  ];
  const debtCats = [];
  for (const c of debtData) {
    const created = await prisma.category.create({
      data: { user_id: user.id, type_id: 4, category_name: c.name, icon: c.icon }
    });
    debtCats.push(created);
  }

  // 7. Create Receivable Categories (type_id = 5)
  const recData = [
    { name: 'Piutang Teman', icon: 'PhCoins' },
    { name: 'Piutang Keluarga', icon: 'PhUsers' }
  ];
  const receivableCats = [];
  for (const c of recData) {
    const created = await prisma.category.create({
      data: { user_id: user.id, type_id: 5, category_name: c.name, icon: c.icon }
    });
    receivableCats.push(created);
  }

  console.log(`🏷️ Created 30 Expense, 10 Income, and Debt/Receivable Categories successfully.`);

  // 8. Generate 90 Days of Transactions (3 Months) - Min 5 transactions per day
  console.log('📅 Simulating 90 Days of Transactions (minimum 5 per day)...');
  const now = new Date();
  let logCount = 0;

  for (let day = 90; day >= 1; day--) {
    const baseDate = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);

    // Generate exactly 5 to 7 transactions per day deterministically
    const dailyCount = 5 + (day % 3);

    for (let index = 0; index < dailyCount; index++) {
      logCount++;
      const txTime = new Date(baseDate.getTime());
      txTime.setHours(8 + (index * 2), 15 + ((index * 9) % 60), 0, 0);

      // Determine Transaction Type
      let typeId = 2; // Default to Expense

      if (index === 0 && day % 3 === 0) {
        typeId = 1; // Income
      } else if (index === 1 && day % 5 === 0) {
        typeId = 3; // Transfer
      } else if (index === 2 && day % 12 === 0) {
        typeId = 4; // Debt
      } else if (index === 3 && day % 15 === 0) {
        typeId = 5; // Receivable
      }

      let sourceWallet, destWallet, category, amount, subject;

      if (typeId === 1) {
        // Income
        const targets = [walletCash, walletBca, walletMandiri, walletGopay, walletDana];
        destWallet = targets[(day + index) % targets.length];
        sourceWallet = walletMerchant;

        const catIdx = (day * 3 + index) % incomeCats.length;
        category = incomeCats[catIdx];

        amount = 150000 + (day % 10) * 85000;
        if (category.category_name === 'Gaji Utama') {
          amount = 12500000;
          subject = 'Gaji Bulanan Utama';
        } else if (category.category_name === 'Freelance Project') {
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
        // Transfer
        const sourceList = [walletBca, walletMandiri, walletCash];
        sourceWallet = sourceList[day % sourceList.length];

        const destList = [walletGopay, walletOvo, walletShopeePay, walletDana, walletCash];
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
        // Debt
        const targets = [walletCash, walletBca, walletMandiri];
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
        // Receivable
        const sourceList = [walletCash, walletBca, walletGopay];
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
        // Expense
        const sourceList = [walletCash, walletBca, walletMandiri, walletGopay, walletOvo, walletShopeePay, walletDana, walletCreditCard];
        sourceWallet = sourceList[(day * 3 + index) % sourceList.length];
        destWallet = walletMerchant;

        const catIdx = (day * 7 + index * 13) % expenseCats.length;
        category = expenseCats[catIdx];

        amount = 15000 + (day % 8) * 12000;
        if (category.category_name === 'Makanan Utama') {
          subject = ['Nasi Padang Lauk Ayam', 'Ayam Geprek Sambal', 'Bakmi Goreng Spesial', 'Gado-Gado Betawi'][(day + index) % 4];
        } else if (category.category_name === 'Kopi & Cafe') {
          subject = 'Es Kopi Susu Aren & Donut';
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

  // 9. Write final simulated balances back to DB
  console.log('💾 Saving final simulated balances to DB...');
  for (const walletId of Object.keys(balances)) {
    await prisma.wallet.update({
      where: { id: parseInt(walletId) },
      data: { balance: balances[walletId] }
    });
  }

  console.log(`✅ Seeding complete! Generated ${logCount} transactions over 90 days.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
