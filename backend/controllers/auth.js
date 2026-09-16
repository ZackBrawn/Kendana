const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');
const { JWT_SECRET } = require('../middlewares/auth');

/**
 * Seeds default wallets, categories, and notification for a newly registered user.
 */
async function seedDefaultUserData(userId) {
  // 1. System Wallets
  await prisma.wallet.createMany({
    data: [
      { user_id: userId, name: 'System Hutang', balance: 0, group_type: 'System', icon: 'PhArrowDownLeft', keyword: 'sistem hutang' },
      { user_id: userId, name: 'System Piutang', balance: 0, group_type: 'System', icon: 'PhArrowUpRight', keyword: 'sistem piutang' },
      { user_id: userId, name: 'External System', balance: 0, group_type: 'System', icon: 'PhGlobe', keyword: 'external' },
      { user_id: userId, name: 'Merchant System', balance: 0, group_type: 'System', icon: 'PhShoppingCart', keyword: 'merchant' }
    ]
  });

  // 2. User Wallets — Cash & Dana
  await prisma.wallet.createMany({
    data: [
      { user_id: userId, name: 'Cash', balance: 0, group_type: 'Liquid', icon: 'PhCoins', keyword: 'cash, tunai' },
      { user_id: userId, name: 'Dana', balance: 0, group_type: 'Liquid', icon: 'Phdana', keyword: 'dana' }
    ]
  });

  // 3. Expense Categories (15)
  await prisma.category.createMany({
    data: [
      { user_id: userId, type_id: 2, category_name: 'Makanan & Minuman', icon: 'PhForkKnife' },
      { user_id: userId, type_id: 2, category_name: 'Transportasi', icon: 'PhCar' },
      { user_id: userId, type_id: 2, category_name: 'Belanja Bulanan', icon: 'PhShoppingCart' },
      { user_id: userId, type_id: 2, category_name: 'Tagihan & Utilitas', icon: 'PhReceipt' },
      { user_id: userId, type_id: 2, category_name: 'Kesehatan', icon: 'PhFirstAid' },
      { user_id: userId, type_id: 2, category_name: 'Pendidikan', icon: 'PhGraduationCap' },
      { user_id: userId, type_id: 2, category_name: 'Hiburan & Rekreasi', icon: 'PhFilmStrip' },
      { user_id: userId, type_id: 2, category_name: 'Investasi', icon: 'PhTrendUp' },
      { user_id: userId, type_id: 2, category_name: 'Pulsa & Internet', icon: 'PhWifiHigh' },
      { user_id: userId, type_id: 2, category_name: 'Pakaian & Gaya Hidup', icon: 'PhTShirt' },
      { user_id: userId, type_id: 2, category_name: 'Sosial & Donasi', icon: 'PhHeart' },
      { user_id: userId, type_id: 2, category_name: 'Otomotif & Servis', icon: 'PhWrench' },
      { user_id: userId, type_id: 2, category_name: 'Olahraga & Hobi', icon: 'PhBicycle' },
      { user_id: userId, type_id: 2, category_name: 'Hadiah & Kado', icon: 'PhGift' },
      { user_id: userId, type_id: 2, category_name: 'Biaya Lain-lain', icon: 'PhDotsThreeCircle' }
    ]
  });

  // 4. Income Categories (2) — Gaji Utama & Pemasukan Lainnya
  await prisma.category.createMany({
    data: [
      { user_id: userId, type_id: 1, category_name: 'Gaji Utama', icon: 'PhCoins' },
      { user_id: userId, type_id: 1, category_name: 'Pemasukan Lainnya', icon: 'PhArrowDownLeft' }
    ]
  });

  // 5. Debt & Receivable System Categories
  await prisma.category.createMany({
    data: [
      { user_id: userId, type_id: 4, category_name: 'Terima Hutang', icon: 'PhArrowDownLeft', system_key: 'LOAN' },
      { user_id: userId, type_id: 4, category_name: 'Bayar Hutang', icon: 'PhArrowUpRight', system_key: 'DEBT_PAYMENT' },
      { user_id: userId, type_id: 5, category_name: 'Ngasih Piutang', icon: 'PhArrowUpRight', system_key: 'RECEIVABLE' },
      { user_id: userId, type_id: 5, category_name: 'Terima Bayar Piutang', icon: 'PhArrowDownLeft', system_key: 'RECEIVABLE_PAYMENT' }
    ]
  });

  // 6. Default daily notification — 9 PM reminder
  const today = new Date();
  today.setHours(21, 0, 0, 0);
  await prisma.customNotification.create({
    data: {
      user_id: userId,
      title: 'Pengingat Pencatatan',
      body: 'Jangan lupa catat transaksi hari ini! 📝',
      scheduled_at: today,
      frequency: 'daily',
      active: true
    }
  });
}

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Field wajib diisi' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        allow_negative_balance: false
      },
      select: {
        id: true,
        name: true,
        email: true
      }
    });

    // Seed default data for the new user
    await seedDefaultUserData(user.id);

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user, token });
  } catch (err) {
    res.status(400).json({ error: err.message || String(err) });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    });
    if (!user) return res.status(400).json({ error: 'Email atau password salah' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Email atau password salah' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      token
    });
  } catch (err) {
    res.status(500).json({ error: err.message || String(err) });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        whatsapp: true,
        telegram: true,
        avatar: true,
        google_id: true,
        timezone: true,
        date_format: true,
        locale: true,
        accent_color: true,
        theme: true,
        category_icon_colored: true,
        bot_name: true,
        bot_avatar: true,
        bot_display_name: true,
        auto_budget_enabled: true,
        email_notifications: true,
        push_notifications: true,
        allow_negative_balance: true,
        dashboard_show_budget: true,
        dashboard_budget_expanded: true,
        created_at: true
      }
    });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.redirectToGoogle = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID || 'dummy-client-id';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';
  const scope = 'profile email';
  
  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + 
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${encodeURIComponent(scope)}` +
    `&prompt=consent`;
    
  res.redirect(googleUrl);
};

exports.handleGoogleCallback = async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).send('OAuth authorization code is missing');
  }
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

  if (!clientId || !clientSecret || clientId === 'your-google-client-id') {
    console.error('Google client credentials are not configured in backend/.env');
    return res.status(500).send('Google Auth is not configured on this server (please check credentials in backend/.env)');
  }

  try {
    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code');
    }

    const { access_token } = tokenData;

    // Fetch user profile from Google UserInfo API
    const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const googleUser = await userinfoResponse.json();
    if (!userinfoResponse.ok) {
      throw new Error('Failed to retrieve user info from Google');
    }

    const { id: google_id, email, name, picture: avatar } = googleUser;

    // Find or create user in database
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { google_id },
          { email }
        ]
      }
    });

    if (user) {
      // Update existing user's google_id and avatar if missing
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          google_id,
          avatar: user.avatar || avatar
        }
      });
    } else {
      // Create a new user with a dummy hashed password
      const dummyPassword = Math.random().toString(36).substring(2, 15);
      const hashedPassword = await bcrypt.hash(dummyPassword, 10);

      user = await prisma.user.create({
        data: {
          name,
          email,
          google_id,
          avatar,
          password: hashedPassword,
          allow_negative_balance: false
        }
      });

      // Seed default data for the new user
      await seedDefaultUserData(user.id);
    }

    // Generate JWT token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    // Redirect user to the frontend login page with the token
    res.redirect(`/login?token=${token}`);
  } catch (err) {
    console.error('Google Callback Error:', err.message);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
};

