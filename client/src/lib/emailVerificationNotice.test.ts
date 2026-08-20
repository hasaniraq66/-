import { describe, expect, it } from 'vitest';
import { getVerificationStatusMessage, maskEmailAddress } from './emailVerificationNotice';

describe('email verification notice helpers', () => {
  it('masks the local part without exposing the entire email address', () => {
    expect(maskEmailAddress('hassan@example.com')).toBe('ha•••@example.com');
    expect(maskEmailAddress('a@example.com')).toBe('a•••@example.com');
  });

  it('returns a clear Arabic status message for both verification outcomes', () => {
    expect(getVerificationStatusMessage(true)).toContain('تم تأكيد بريدك الإلكتروني');
    expect(getVerificationStatusMessage(false)).toContain('لم يظهر التأكيد بعد');
  });
});
