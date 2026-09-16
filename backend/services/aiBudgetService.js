const { prisma } = require('../config/db');

const EXPENSE_GROUPS = {
  fixed: 'Wajib (Fixed)',
  variable: 'Rutin (Variable)',
  sinking_fund: 'Tabungan Cadangan (Sinking Fund)',
  investment: 'Investasi & Aset (Investment)',
  discretionary: 'Gaya Hidup (Discretionary)'
};

// Main generator method
async function generateBudget(userId, month, year) {
  // Update status to processing
  await prisma.budgetGenerationStatus.updateMany({
    where: { user_id: userId, year, month },
    data: { status: 'processing', error_message: null }
  });

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User tidak ditemukan');

    // Retrieve categories of type 'Expense' (type_id = 2)
    const categories = await prisma.category.findMany({
      where: { user_id: userId, type_id: 2 }
    });

    if (categories.length === 0) {
      throw new Error('Tidak ada kategori pengeluaran (Expense) untuk user ini.');
    }

    // Past 3 months date boundaries
    const endDate = new Date(year, month - 1, 1);
    endDate.setDate(endDate.getDate() - 1); // Last day of previous month
    const startDate = new Date(year, month - 1, 1);
    startDate.setMonth(startDate.getMonth() - 3); // 3 months ago

    // Get all transactions in date range of type 'Expense'
    const transactions = await prisma.transactionLog.findMany({
      where: {
        user_id: userId,
        type_id: 2,
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    // Group spending by category ID
    const spendingByCategory = {};
    categories.forEach(c => { spendingByCategory[c.id] = 0; });
    transactions.forEach(tx => {
      const catId = tx.category_id;
      if (catId && spendingByCategory[catId] !== undefined) {
        spendingByCategory[catId] += parseFloat(tx.amount);
      }
    });

    // Build categories dataset for prompt
    const categoriesData = categories.map(c => ({
      id: c.id,
      name: c.category_name,
      icon: c.icon,
      spent_last_3_months: spendingByCategory[c.id]
    }));

    const taxonomy = [
      'fixed: Fixed expenses: same amount every month and mandatory — basic needs (rent/mortgage, basic electricity, water, neighborhood dues), connectivity & work (home internet, mobile data), routine subscriptions.',
      'variable: Variable expenses: amount changes monthly based on usage — daily consumption (groceries, dine-out, coffee), transportation (fuel, tolls, ride-hailing), fluctuating utilities.',
      'sinking_fund: Sinking funds: expenses that certainly happen but not every month — annual domain/hosting costs, vehicle tax & periodic service, health & care.',
      'investment: Savings & capital expenditure — emergency fund, investments (mutual funds, stocks, gold), hardware upgrade fund.',
      'discretionary: Discretionary expenses: fully optional, lifestyle — entertainment (cinema, streaming subscriptions, games), hobbies.'
    ].join(' / ');

    const prompt = `Based on the following expense categories and their spending for the last 3 months, create a monthly budget recommendation. Return only valid JSON. Preserve category IDs exactly and use non-negative numeric amounts. Classify EVERY category into exactly one expense group using this taxonomy: ${taxonomy}. As allocation guidance, follow the 50/20/30 rule: 50% to fixed & variable essentials, 20% to investment & sinking funds, 30% to discretionary. Format: { "notes": "...", "by_category": [{"id": 123, "amount": 123.45}], "expense_groups": [{"group": "fixed", "category_ids": [123, 456]}] }. Allowed groups: ${JSON.stringify(Object.keys(EXPENSE_GROUPS))}. Categories: ${JSON.stringify(categoriesData)}`;

    const openaiKey = process.env.OPENAI_COMPAT_API_KEY;
    let jsonText;

    if (openaiKey) {
      // panggil openai compatible api jika key tersedia
      const baseUrl = process.env.OPENAI_COMPAT_BASE_URL || 'https://api.openai.com/v1';
      const model = process.env.OPENAI_COMPAT_MODEL || 'gpt-4o-mini';

      // pastikan url memiliki /chat/completions tanpa duplikasi
      let targetUrl = baseUrl.replace(/\/$/, '');
      if (!targetUrl.endsWith('/chat/completions')) {
        targetUrl = `${targetUrl}/chat/completions`;
      }

      // siapkan header permintaan
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`
      };

      // tambahkan header rahasia kustom jika ada
      const secretHeaderName = process.env.OPENAI_COMPAT_SECRET_HEADER_NAME;
      const secretHeaderValue = process.env.OPENAI_COMPAT_SECRET_HEADER_VALUE;
      if (secretHeaderName && secretHeaderValue) {
        headers[secretHeaderName] = secretHeaderValue;
      }

      // log pemanggilan api
      console.log(`[AI Budget] Memanggil OpenAI kompatibel API (${targetUrl}) menggunakan model: ${model}`);

      const aiResponse = await fetch(targetUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        })
      });

      const contentType = aiResponse.headers.get('content-type') || '';
      if (!aiResponse.ok) {
        let errMsg = `HTTP Error ${aiResponse.status}`;
        if (contentType.includes('application/json')) {
          const aiData = await aiResponse.json();
          // log error
          console.error(`[AI Budget] Error dari OpenAI kompatibel API:`, aiData.error);
          errMsg = aiData.error?.message || errMsg;
        } else {
          const rawText = await aiResponse.text();
          // log error
          console.error(`[AI Budget] Error non-JSON dari OpenAI kompatibel API: ${rawText}`);
          errMsg = `${errMsg}: ${rawText.substring(0, 200)}`;
        }
        throw new Error(errMsg);
      }

      if (!contentType.includes('application/json')) {
        const rawText = await aiResponse.text();
        throw new Error(`Respon bukan JSON dari OpenAI kompatibel API: ${rawText.substring(0, 200)}`);
      }

      const aiData = await aiResponse.json();
      // log sukses
      console.log(`[AI Budget] Berhasil menerima respon dari OpenAI kompatibel API`);
      jsonText = aiData.choices?.[0]?.message?.content;
    } else {
      // panggil google gemini api sebagai fallback
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY atau OPENAI_COMPAT_API_KEY tidak ditemukan di environment backend/.env');
      }

      // log pemanggilan api
      console.log(`[AI Budget] Memanggil Google Gemini API menggunakan model: gemini-1.5-flash`);

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const aiResponse = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      const contentType = aiResponse.headers.get('content-type') || '';
      if (!aiResponse.ok) {
        let errMsg = `HTTP Error ${aiResponse.status}`;
        if (contentType.includes('application/json')) {
          const aiData = await aiResponse.json();
          // log error
          console.error(`[AI Budget] Error dari Google Gemini API:`, aiData.error);
          errMsg = aiData.error?.message || errMsg;
        } else {
          const rawText = await aiResponse.text();
          // log error
          console.error(`[AI Budget] Error non-JSON dari Google Gemini API: ${rawText}`);
          errMsg = `${errMsg}: ${rawText.substring(0, 200)}`;
        }
        throw new Error(errMsg);
      }

      if (!contentType.includes('application/json')) {
        const rawText = await aiResponse.text();
        throw new Error(`Respon bukan JSON dari Google Gemini API: ${rawText.substring(0, 200)}`);
      }

      const aiData = await aiResponse.json();
      // log sukses
      console.log(`[AI Budget] Berhasil menerima respon dari Google Gemini API`);
      jsonText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!jsonText) {
      throw new Error('Respon LLM kosong atau tidak terformat.');
    }

    const budgetData = JSON.parse(jsonText);
    if (!budgetData.notes || !Array.isArray(budgetData.by_category)) {
      throw new Error('Respon LLM tidak sesuai spesifikasi budget schema.');
    }

    const categoryIds = categories.map(c => c.id);
    const validCategories = budgetData.by_category.filter(item => 
      item.id && 
      item.amount !== undefined && 
      categoryIds.includes(parseInt(item.id)) && 
      parseFloat(item.amount) >= 0
    );

    if (validCategories.length === 0) {
      throw new Error('LLM tidak mengembalikan item budget kategori yang valid.');
    }

    const groupKeys = Object.keys(EXPENSE_GROUPS);
    const groupAssignments = {};
    if (Array.isArray(budgetData.expense_groups)) {
      budgetData.expense_groups.forEach(group => {
        if (group.group && Array.isArray(group.category_ids) && groupKeys.includes(group.group)) {
          const ids = group.category_ids.map(id => parseInt(id)).filter(id => categoryIds.includes(id));
          if (ids.length > 0) {
            groupAssignments[group.group] = ids;
          }
        }
      });
    }

    // Save into database inside transaction
    await prisma.$transaction(async (tx) => {
      const totalAmount = validCategories.reduce((sum, item) => sum + parseFloat(item.amount), 0);

      // Upsert BudgetGroup
      let budgetGroup = await tx.budgetGroup.findFirst({
        where: { user_id: userId, period_month: month, period_year: year }
      });

      if (budgetGroup) {
        budgetGroup = await tx.budgetGroup.update({
          where: { id: budgetGroup.id },
          data: {
            total_budget_amount: totalAmount,
            ai_notes: budgetData.notes,
            generated_by: 'ai'
          }
        });
      } else {
        budgetGroup = await tx.budgetGroup.create({
          data: {
            user_id: userId,
            period_month: month,
            period_year: year,
            total_budget_amount: totalAmount,
            ai_notes: budgetData.notes,
            generated_by: 'ai'
          }
        });
      }

      // Delete old items & groups
      await tx.budgetItem.deleteMany({ where: { budget_group_id: budgetGroup.id } });
      await tx.budgetExpenseGroup.deleteMany({ where: { budget_group_id: budgetGroup.id } });

      // Insert new items
      for (const item of validCategories) {
        await tx.budgetItem.create({
          data: {
            budget_group_id: budgetGroup.id,
            budgetable_id: parseInt(item.id),
            budgetable_type: 'Category',
            target_amount: parseFloat(item.amount)
          }
        });
      }

      // Insert new groups
      for (const key of Object.keys(groupAssignments)) {
        await tx.budgetExpenseGroup.create({
          data: {
            budget_group_id: budgetGroup.id,
            group_key: key,
            group_name: EXPENSE_GROUPS[key],
            category_ids: groupAssignments[key]
          }
        });
      }
    });

    // Update status to success
    await prisma.budgetGenerationStatus.updateMany({
      where: { user_id: userId, year, month },
      data: { status: 'success', error_message: null }
    });

  } catch (err) {
    console.error('generateBudget error:', err.message);
    await prisma.budgetGenerationStatus.updateMany({
      where: { user_id: userId, year, month },
      data: { status: 'failed', error_message: err.message }
    });
  }
}

// Get spending progress metrics for a budget group
async function getBudgetSummary(budgetGroupId, userId) {
  const budgetGroup = await prisma.budgetGroup.findFirst({
    where: { id: budgetGroupId, user_id: userId },
    include: { items: true }
  });

  if (!budgetGroup) return {};

  const startOfMonth = new Date(budgetGroup.period_year, budgetGroup.period_month - 1, 1);
  const endOfMonth = new Date(budgetGroup.period_year, budgetGroup.period_month, 0, 23, 59, 59);

  const summary = {};
  for (const item of budgetGroup.items) {
    let spent = 0;
    if (item.budgetable_type === 'Category') {
      const agg = await prisma.transactionLog.aggregate({
        _sum: { amount: true },
        where: {
          user_id: userId,
          category_id: item.budgetable_id,
          type_id: 2, // Expense
          date: { gte: startOfMonth, lte: endOfMonth }
        }
      });
      spent = parseFloat(agg._sum.amount || 0);
    }

    const target = parseFloat(item.target_amount);
    summary[item.id] = {
      target,
      spent,
      remaining: target - spent,
      percentage: target > 0 ? Math.min(100, Math.round((spent / target) * 100 * 10) / 10) : 0
    };
  }

  return summary;
}

module.exports = {
  EXPENSE_GROUPS,
  generateBudget,
  getBudgetSummary
};

