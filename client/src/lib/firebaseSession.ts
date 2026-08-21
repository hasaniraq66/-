export interface FirebaseSessionUser {
  uid: string;
  getIdToken(forceRefresh?: boolean): Promise<string>;
}

/**
 * Forces Firebase Auth to obtain a current ID token before a first Firestore
 * operation. This closes the short handoff window after a new sign-in, during
 * which Firestore could otherwise send a request before its credentials sync.
 */
export async function ensureFirebaseSessionReady(user: FirebaseSessionUser): Promise<void> {
  if (!user.uid) {
    throw new Error('تعذر التحقق من جلسة المستخدم قبل تحميل البيانات.');
  }

  const token = await user.getIdToken(true);
  if (!token) {
    throw new Error('تعذر تجديد جلسة المستخدم قبل تحميل البيانات.');
  }
}

function getErrorCode(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') {
    return error.code;
  }

  return null;
}

/**
 * Runs an idempotent, first-session Firestore operation only after obtaining a
 * current token. A single permission-denied response gets one forced refresh
 * and one retry, which protects the post-login credential handoff without
 * masking persistent authorization failures or retrying mutations repeatedly.
 */
export async function runWithFirebaseSessionRecovery<T>(
  user: FirebaseSessionUser,
  operation: () => Promise<T>,
): Promise<T> {
  await ensureFirebaseSessionReady(user);

  try {
    return await operation();
  } catch (error) {
    if (getErrorCode(error) !== 'permission-denied') {
      throw error;
    }

    await ensureFirebaseSessionReady(user);
    return operation();
  }
}
