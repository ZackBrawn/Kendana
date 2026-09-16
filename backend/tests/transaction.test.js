const { getBalanceDelta } = require('../controllers/transaction');

describe('debt and receivable cash flow', () => {
  it('keeps liquid wallet movement consistent with business rules', () => {
    const liquid = { group_type: 'Liquid' };
    const system = { group_type: 'System' };

    expect(getBalanceDelta(4, 'LOAN', system, liquid, 100)).toEqual({
      sourceDelta: 100,
      destDelta: 100
    });

    expect(getBalanceDelta(4, 'DEBT_PAYMENT', liquid, system, 100)).toEqual({
      sourceDelta: -100,
      destDelta: -100
    });

    expect(getBalanceDelta(5, 'RECEIVABLE', liquid, system, 100)).toEqual({
      sourceDelta: -100,
      destDelta: 100
    });

    expect(getBalanceDelta(5, 'RECEIVABLE_PAYMENT', system, liquid, 100)).toEqual({
      sourceDelta: -100,
      destDelta: 100
    });
  });
});
