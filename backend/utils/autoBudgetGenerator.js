const { prisma } = require('../config/db');
const { generateBudget } = require('../services/aiBudgetService');

async function autoGenerateAll() {
  console.log('Starting monthly auto-budget generation job...');
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  try {
    const users = await prisma.user.findMany({
      where: { auto_budget_enabled: true }
    });

    console.log(`Found ${users.length} user(s) with auto-budget enabled.`);

    let successCount = 0;
    let failCount = 0;

    for (const user of users) {
      console.log(`Processing user: ${user.name} (${user.email})...`);
      
      // Upsert pending status
      await prisma.budgetGenerationStatus.upsert({
        where: {
          user_id_year_month: {
            user_id: user.id,
            year,
            month
          }
        },
        update: { status: 'pending', error_message: null },
        create: { user_id: user.id, year, month, status: 'pending' }
      });

      try {
        // Run generation synchronously in job runner
        await generateBudget(user.id, month, year);
        console.log(`Successfully generated budget for user ${user.name}`);
        successCount++;
      } catch (err) {
        console.error(`Failed to generate budget for user ${user.name}:`, err.message);
        failCount++;
      }
    }

    console.log(`Auto-budget runner complete: ${successCount} succeeded, ${failCount} failed.`);
    process.exit(0);
  } catch (err) {
    console.error('Fatal error in auto-budget generator:', err.message);
    process.exit(1);
  }
}

autoGenerateAll();

