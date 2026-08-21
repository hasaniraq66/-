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
      return null;
    }
  }

  return null;
}

export function getFinancialDataLoadErrorMessage(error: unknown): string {
  if (getFirestoreErrorCode(error) === 'permission-denied') {
    return 'تعذر تثبيت جلسة الوصول إلى بياناتك. تحقق من اتصالك ثم أعد المحاولة. إذا استمر الخطأ، سجّل الخروج ثم سجّل الدخول من جديد.';
  }

  return 'تعذر تحديث البيانات المالية من السحابة. تحقق من اتصالك ثم أعد المحاولة.';
}
