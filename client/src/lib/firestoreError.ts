export type FirestoreErrorLike = {
  code?: unknown;
  message?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getFirestoreErrorCode(error: unknown): string | null {
  if (isRecord(error) && typeof error.code === 'string') return error.code;

  if (error instanceof Error) {
    try {
      const parsed = JSON.parse(error.message) as FirestoreErrorLike;
      if (typeof parsed.code === 'string') return parsed.code;
    } catch {
      // Continue to pattern match below
    }

    const match = error.message.match(/(?:auth|firestore)\/([a-z0-9-]+)/i);
    if (match) return match[0];
  }

  return null;
}

export function getFinancialDataLoadErrorMessage(error: unknown): string {
  const errorCode = getFirestoreErrorCode(error);

  if (errorCode === 'data-load-timeout') {
    return 'استغرق تحميل بياناتك وقتاً أطول من المعتاد. تحقق من اتصالك ثم أعد المحاولة.';
  }

  if (errorCode === 'permission-denied') {
    return 'تعذر تثبيت جلسة الوصول إلى بياناتك. تحقق من اتصالك ثم أعد المحاولة. إذا استمر الخطأ، سجّل الخروج ثم سجّل الدخول من جديد.';
  }

  if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/user-token-expired') {
    return 'انتهت صلاحية جلسة الدخول أو أصبحت غير صالحة. يرجى تسجيل الدخول من جديد.';
  }

  return 'تعذر تحديث البيانات المالية من السحابة. تحقق من اتصالك ثم أعد المحاولة.';
}
