import { getFirestoreErrorCode } from './firestoreError';

/**
 * تحميل المجموعات المالية صار جزئياً بعد أن صارت قواعد Firestore تطبّق صلاحيات
 * التبويبات: مساعد مقيّد بتبويب الميزانية يُرفض وصوله إلى الديون، وهذا رفض
 * متوقَّع لا عطل. كان `Promise.all` يُسقط التحميل كله عند أول رفض، فيرى المساعد
 * شاشة خطأ بدل التبويبات المسموح له بها.
 *
 * التمييز مهم أمنياً: الرفض لعدم الصلاحية يعني قائمة فارغة ولا يُسمح بالرجوع إلى
 * النسخة المخبّأة محلياً، وإلا عرضنا لمساعد بيانات لا يملك صلاحيتها من ذاكرة
 * متصفح شاركه إياها المالك. أما تعذّر الاتصال فيبقى محتفظاً بسلوك العمل دون
 * إنترنت.
 */
export function isPermissionDenied(error: unknown): boolean {
  return getFirestoreErrorCode(error) === 'permission-denied';
}

export function resolveCollection<T>(
  settled: PromiseSettledResult<T[]>,
  cached: T[] | null,
): T[] {
  if (settled.status === 'fulfilled') {
    return settled.value.length > 0 ? settled.value : (cached ?? []);
  }
  if (isPermissionDenied(settled.reason)) return [];
  return cached ?? [];
}

/**
 * يصحّ إظهار خطأ التحميل للمستخدم فقط إذا فشلت كل المجموعات لسبب غير الصلاحيات.
 * رفضٌ لعدم الصلاحية وحده هو الوضع الطبيعي لمساعد محدود الصلاحية.
 */
export function shouldReportLoadFailure(settledResults: PromiseSettledResult<unknown>[]): boolean {
  return settledResults.some(
    (result) => result.status === 'rejected' && !isPermissionDenied(result.reason),
  );
}
