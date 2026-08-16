import { describe, expect, it } from 'vitest';
import { isPaymentWithinRemainingBalance, isPositiveFinancialAmount, isValidBudgetLimit } from '../client/src/utils/financialInputValidation.js';

describe('financial input validation', () => {
  it('accepts only positive amounts for debts, expenses, and templates', () => {
    expect(isPositiveFinancialAmount(0.01)).toBe(true);
    expect(isPositiveFinancialAmount('')).toBe(false);
    expect(isPositiveFinancialAmount(0)).toBe(false);
    expect(isPositiveFinancialAmount(-5)).toBe(false);
  });

  it('allows a zero budget but rejects empty and negative values', () => {
    expect(isValidBudgetLimit(0)).toBe(true);
    expect(isValidBudgetLimit(1500)).toBe(true);
    expect(isValidBudgetLimit('')).toBe(false);
    expect(isValidBudgetLimit(-1)).toBe(false);
  });

  it('prevents a payment from exceeding the remaining balance', () => {
    expect(isPaymentWithinRemainingBalance(250, 250)).toBe(true);
    expect(isPaymentWithinRemainingBalance(251, 250)).toBe(false);
    expect(isPaymentWithinRemainingBalance(0, 250)).toBe(false);
  });
});
