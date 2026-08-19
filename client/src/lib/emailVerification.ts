export type EmailVerificationAuthMethod = 'email' | 'phone';

export function requiresEmailVerification(
  authMethod: EmailVerificationAuthMethod,
  emailVerified: boolean,
): boolean {
  return authMethod === 'email' && !emailVerified;
}

export function getEmailVerificationErrorMessage(errorCode?: string): string {
  switch (errorCode) {
    case 'auth/too-many-requests':
      return 'تم إرسال طلبات كثيرة. انتظر قليلاً قبل طلب رسالة تحقق جديدة.';
    case 'auth/network-request-failed':
      return 'تعذر إرسال رسالة التحقق بسبب مشكلة في الاتصال. تحقق من الإنترنت ثم أعد المحاولة.';
    default:
      return 'تعذر إرسال رسالة التحقق حالياً. حاول مرة أخرى لاحقاً.';
  }
}
