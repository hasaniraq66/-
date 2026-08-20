import { describe, expect, it } from 'vitest';
import {
  buildEmailVerificationActionUrl,
  getCleanApplicationUrl,
  getEmailVerificationActionParams,
  isEmailVerificationAction,
} from './emailVerificationAction';

describe('email verification action links', () => {
  it('builds an in-app Firebase action URL without carrying untrusted query parameters', () => {
    expect(buildEmailVerificationActionUrl('https://budget.example.com/?next=https://unsafe.example')).toBe('https://budget.example.com/?mode=verifyEmail');
  });

  it('recognises Firebase verification links and the hosted-handler success fallback', () => {
    expect(isEmailVerificationAction('?mode=verifyEmail&oobCode=abc123')).toBe(true);
    expect(isEmailVerificationAction('?emailVerification=success')).toBe(true);
    expect(isEmailVerificationAction('?mode=resetPassword&oobCode=abc123')).toBe(false);
    expect(getEmailVerificationActionParams('?mode=verifyEmail&oobCode=abc123')).toMatchObject({ mode: 'verifyEmail', oobCode: 'abc123' });
  });

  it('returns the clean application URL without retaining Firebase action parameters', () => {
    expect(getCleanApplicationUrl({ origin: 'https://budget.example.com', pathname: '/', hash: '#top' })).toBe('https://budget.example.com/#top');
  });
});
