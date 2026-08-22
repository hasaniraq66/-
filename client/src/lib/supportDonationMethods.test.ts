import { describe, expect, it } from 'vitest';
import { isDonationAccountNumber, supportDonationMethods } from './supportDonationMethods';

describe('support donation methods', () => {
  it('keeps the approved support methods and account values available to the page', () => {
    expect(supportDonationMethods).toEqual([
      expect.objectContaining({ id: 'zain-cash', label: 'زين كاش', account: '07812149176' }),
      expect.objectContaining({ id: 'master-alrafidain', label: 'ماستر الرافدين', account: '5543294713' }),
    ]);
  });

  it('accepts only numeric account references with a safe display length', () => {
    expect(supportDonationMethods.every((method) => isDonationAccountNumber(method.account))).toBe(true);
    expect(isDonationAccountNumber('07812-149176')).toBe(false);
    expect(isDonationAccountNumber('55432')).toBe(false);
  });
});
