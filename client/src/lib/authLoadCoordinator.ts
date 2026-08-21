/**
 * يمنع اكتمال عملية تحميل قديمة من تغيير واجهة جلسة أحدث بعد الخروج أو الدخول
 * بحساب آخر. لا يحتفظ بأي بيانات مستخدم أو رموز مصادقة.
 */
export function createAuthLoadCoordinator() {
  let currentRequest = 0;

  return {
    begin() {
      currentRequest += 1;
      return currentRequest;
    },
    isCurrent(requestId: number) {
      return requestId === currentRequest;
    },
    invalidate() {
      currentRequest += 1;
    },
  };
}
