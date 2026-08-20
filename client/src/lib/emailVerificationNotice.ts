export function maskEmailAddress(email: string): string {
  const [localPart, domain] = email.split('@');

  if (!localPart || !domain) {
    return email;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] ?? ''}•••@${domain}`;
  }

  return `${localPart.slice(0, 2)}•••@${domain}`;
}

export function getVerificationStatusMessage(isVerified: boolean): string {
  return isVerified
    ? 'تم تأكيد بريدك الإلكتروني. يجري فتح خزنتك المالية الآن.'
    : 'لم يظهر التأكيد بعد. افتح الرابط في رسالة البريد ثم اضغط «تحقق من الحالة».';
}
