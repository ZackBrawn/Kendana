const { calculateCurrentCycle } = require('../controllers/budget');

describe('Budget Cycle Calculation', () => {

  test('should calculate active daily cycle with multiplier 2', () => {
    const budget = {
      start_date: new Date('2026-07-01T00:00:00.000Z'),
      period_type: 'daily',
      period_multiplier: 2,
      is_permanent: true
    };
    
    let res = calculateCurrentCycle(budget, new Date('2026-07-01T12:00:00.000Z'));
    expect(res.active).toBe(true);
    expect(res.start.toISOString().split('T')[0]).toBe('2026-07-01');
    expect(res.end.toISOString().split('T')[0]).toBe('2026-07-03');

    res = calculateCurrentCycle(budget, new Date('2026-07-04T08:00:00.000Z'));
    expect(res.active).toBe(true);
    expect(res.start.toISOString().split('T')[0]).toBe('2026-07-03');
    expect(res.end.toISOString().split('T')[0]).toBe('2026-07-05');
  });

  test('should calculate active monthly cycle with multiplier 1', () => {
    const budget = {
      start_date: new Date('2026-01-15T00:00:00.000Z'),
      period_type: 'monthly',
      period_multiplier: 1,
      is_permanent: true
    };

    const res = calculateCurrentCycle(budget, new Date('2026-02-20T10:00:00.000Z'));
    expect(res.active).toBe(true);
    expect(res.start.toISOString().split('T')[0]).toBe('2026-02-15');
    expect(res.end.toISOString().split('T')[0]).toBe('2026-03-15');
  });

  test('should calculate custom non-recurring budget', () => {
    const budget = {
      start_date: new Date('2026-07-10T00:00:00.000Z'),
      end_date: new Date('2026-07-25T00:00:00.000Z'),
      period_type: 'custom',
      is_permanent: false
    };

    let res = calculateCurrentCycle(budget, new Date('2026-07-15T10:00:00.000Z'));
    expect(res.active).toBe(true);
    expect(res.start.toISOString().split('T')[0]).toBe('2026-07-10');
    expect(res.end.toISOString().split('T')[0]).toBe('2026-07-25');

    res = calculateCurrentCycle(budget, new Date('2026-07-26T00:00:00.000Z'));
    expect(res.active).toBe(false);
  });

  test('should handle expired budgets', () => {
    const budget = {
      start_date: new Date('2026-01-01T00:00:00.000Z'),
      end_date: new Date('2026-06-30T23:59:59.000Z'),
      period_type: 'monthly',
      period_multiplier: 1,
      is_permanent: false
    };

    const res = calculateCurrentCycle(budget, new Date('2026-07-15T12:00:00.000Z'));
    expect(res.active).toBe(false);
  });

  test('should handle future budgets', () => {
    const budget = {
      start_date: new Date('2026-09-01T00:00:00.000Z'),
      period_type: 'monthly',
      period_multiplier: 1,
      is_permanent: true
    };

    const res = calculateCurrentCycle(budget, new Date('2026-07-15T12:00:00.000Z'));
    expect(res.active).toBe(false);
  });
});
