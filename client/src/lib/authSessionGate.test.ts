import { describe, expect, it, vi } from 'vitest';
import { getAuthSessionGateResult, loadDataForEligibleSession } from './authSessionGate';

describe('auth session gate', () => {
  it('requires verification for an email account that is not verified', () => {
    expect(getAuthSessionGateResult({ email: 'user@example.com', emailVerified: false }))
      .toBe('email-verification-required');
  });

  it('does not invoke any profile or financial-data loader for an unverified email account', async () => {
    const loadData = vi.fn(async () => ({ profile: 'would-have-been-private' }));

    const result = await loadDataForEligibleSession(
      { email: 'user@example.com', emailVerified: false },
      loadData,
    );

    expect(result).toEqual({ status: 'email-verification-required' });
    expect(loadData).not.toHaveBeenCalled();
  });

  it('permits the single central loader for a verified account', async () => {
    const loadData = vi.fn(async () => ({ profile: 'available' }));

    const result = await loadDataForEligibleSession(
      { email: 'user@example.com', emailVerified: true },
      loadData,
    );

    expect(result).toEqual({ status: 'load-data', data: { profile: 'available' } });
    expect(loadData).toHaveBeenCalledTimes(1);
  });
});
