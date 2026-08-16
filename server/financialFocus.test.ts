import { describe, expect, it } from 'vitest';
import { getFinancialFocusItems } from '../client/src/utils/financialFocus.js';

const today = new Date(2026, 7, 14);

describe('getFinancialFocusItems', () => {
  it('prioritizes overdue balances and sums their remaining value', () => {
    const items = getFinancialFocusItems({
      debts: [{ id: 'd1', type: 'to_me', amount: 500, paidAmount: 125, status: 'partial', dueDate: '2026-08-10' } as any],
      expenses: [],
      budget: null,
      now: today,
    });

    expect(items[0]).toMatchObject({ id: 'overdue', tone: 'danger', amount: 375, targetTab: 'debts' });
  });

  it('signals a missing monthly budget when expenses exist', () => {
    const items = getFinancialFocusItems({
      debts: [],
      expenses: [{ id: 'e1', amount: 70, date: '2026-08-12' } as any],
      budget: null,
      now: today,
    });

    expect(items).toContainEqual(expect.objectContaining({ id: 'budget-not-set', targetTab: 'budget' }));
  });

  it('reports a stable state when no active follow-up is needed', () => {
    const items = getFinancialFocusItems({ debts: [], expenses: [], budget: { monthlyLimit: 1000 } as any, now: today });
    expect(items).toEqual([expect.objectContaining({ id: 'stable', tone: 'success' })]);
  });
});
