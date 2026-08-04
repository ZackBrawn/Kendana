const test = require('node:test');
const assert = require('node:assert');
const { calculateCurrentCycle } = require('../controllers/budget');

test('Budget Cycle Calculation', async (t) => {

  await t.test('should calculate active daily cycle with multiplier 2', () => {
    const budget = {
      start_date: new Date('2026-07-01T00:00:00.000Z'),
      period_type: 'daily',
      period_multiplier: 2,
      is_permanent: true
    };
    
    // Test on start date
    let res = calculateCurrentCycle(budget, new Date('2026-07-01T12:00:00.000Z'));
    assert.strictEqual(res.active, true);
    assert.strictEqual(res.start.toISOString().split('T')[0], '2026-07-01');
    assert.strictEqual(res.end.toISOString().split('T')[0], '2026-07-03'); // starts on 1st, ends on 3rd morning, set to end of day 2nd (23:59:59.999 is usually 2nd or 3rd depending on timezone. Wait! Set to local/GMT end of day: 23:59:59.999 on 2026-07-02 depending on setHours)

    // Test on 4th day (2nd cycle should start on July 3rd and end on July 5th)
    res = calculateCurrentCycle(budget, new Date('2026-07-04T08:00:00.000Z'));
    assert.strictEqual(res.active, true);
    assert.strictEqual(res.start.toISOString().split('T')[0], '2026-07-03');
    assert.strictEqual(res.end.toISOString().split('T')[0], '2026-07-05');
  });

  await t.test('should calculate active monthly cycle with multiplier 1', () => {
    const budget = {
      start_date: new Date('2026-01-15T00:00:00.000Z'),
      period_type: 'monthly',
      period_multiplier: 1,
      is_permanent: true
    };

    // Today is Feb 20th, 2026. Current cycle should start Feb 15th and end Mar 15th
    const res = calculateCurrentCycle(budget, new Date('2026-02-20T10:00:00.000Z'));
    assert.strictEqual(res.active, true);
    assert.strictEqual(res.start.toISOString().split('T')[0], '2026-02-15');
    assert.strictEqual(res.end.toISOString().split('T')[0], '2026-03-15');
  });

  await t.test('should calculate custom non-recurring budget', () => {
    const budget = {
      start_date: new Date('2026-07-10T00:00:00.000Z'),
      end_date: new Date('2026-07-25T00:00:00.000Z'),
      period_type: 'custom',
      is_permanent: false
    };

    // Test within range
    let res = calculateCurrentCycle(budget, new Date('2026-07-15T10:00:00.000Z'));
    assert.strictEqual(res.active, true);
    assert.strictEqual(res.start.toISOString().split('T')[0], '2026-07-10');
    assert.strictEqual(res.end.toISOString().split('T')[0], '2026-07-25');

    // Test outside range (expired)
    res = calculateCurrentCycle(budget, new Date('2026-07-26T00:00:00.000Z'));
    assert.strictEqual(res.active, false);
  });

  await t.test('should handle expired budgets', () => {
    const budget = {
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-06-30T23:59:59.000Z'),
      period_type: 'monthly',
      period_multiplier: 1,
      is_permanent: false
    };

    // Today is July 15th, 2026 (expired)
    const res = calculateCurrentCycle(budget, new Date('2026-07-15T12:00:00.000Z'));
    assert.strictEqual(res.active, false);
  });

  await t.test('should handle future budgets', () => {
    const budget = {
      start_date: new Date('2026-09-01T00:00:00.000Z'),
      period_type: 'monthly',
      period_multiplier: 1,
      is_permanent: true
    };

    // Today is July 15th, 2026 (future)
    const res = calculateCurrentCycle(budget, new Date('2026-07-15T12:00:00.000Z'));
    assert.strictEqual(res.active, false);
  });
});
