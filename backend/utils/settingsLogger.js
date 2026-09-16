const { prisma } = require('../config/db');

async function logChange(userId, settingKey, settingPage, oldValue = null, newValue = null) {
  try {
    const oldStr = oldValue === null || oldValue === undefined 
      ? null 
      : (typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue));
      
    const newStr = newValue === null || newValue === undefined 
      ? null 
      : (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue));

    await prisma.userSettingsChange.create({
      data: {
        user_id: userId,
        setting_key: settingKey,
        setting_page: settingPage,
        old_value: oldStr,
        new_value: newStr,
        changed_at: new Date()
      }
    });
  } catch (err) {
    console.error('Failed to log settings change:', err.message || err);
  }
}

module.exports = { logChange };

