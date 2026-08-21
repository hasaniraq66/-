export interface AuthSessionIdentity {
  email: string | null;
  emailVerified: boolean;
}

export type AuthSessionGateResult = 'load-data' | 'email-verification-required';

export function getAuthSessionGateResult(user: AuthSessionIdentity): AuthSessionGateResult {
  const isPhoneLoginProxy = user.email?.endsWith('@phone.malyah.com') ?? false;

  if (user.email && !isPhoneLoginProxy && !user.emailVerified) {
    return 'email-verification-required';
  }

  return 'load-data';
}

/**
 * Executes the supplied data loader only for a session that may access
 * Firestore. Keeping this decision pure makes the no-read guarantee testable.
 */
export async function loadDataForEligibleSession<T>(
  user: AuthSessionIdentity,
  loadData: () => Promise<T>,
): Promise<{ status: AuthSessionGateResult; data?: T }> {
  const status = getAuthSessionGateResult(user);
  if (status === 'email-verification-required') {
    return { status };
  }

  return { status, data: await loadData() };
}
