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
