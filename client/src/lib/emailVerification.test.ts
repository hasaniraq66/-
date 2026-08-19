import { describe, expect, it } from 'vitest';
import { getEmailVerificationErrorMessage, requiresEmailVerification } from './emailVerification.js';

describe('email verification guard', () => {
  it('requires a verified email only for the email and password flow', () => {
    expect(requiresEmailVerification('email', false)).toBe(true);
    expect(requiresEmailVerification('email', true)).toBe(false);
    expect(requiresEmailVerification('phone', false)).toBe(false);
  });

  it('maps resend failures to concise Arabic messages without provider details', () => {
    expect(getEmailVerificationErrorMessage('auth/too-many-requests')).toContain('طلبات كثيرة');
    expect(getEmailVerificationErrorMessage('auth/network-request-failed')).toContain('الاتصال');
    expect(getEmailVerificationErrorMessage('unexpected')).not.toContain('unexpected');
  });
});
