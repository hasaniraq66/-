import { describe, expect, it } from 'vitest';
import { describeGoogleAuthFailure, errorCode, isConsentScreenRefusal } from './googleAuthError';

const HOST = 'www.iqcma.com';

/**
 * الحادثة الثانية: شاشة Google تقول «تم حظر إمكانية الوصول… يتم اختبار التطبيق
 * ولا يمكن الوصول إليه إلا من قِبل مختبِرين» — وهذا رفضٌ دائم لا إلغاء عابر.
 */
describe('رفض شاشة الموافقة', () => {
  it('يلتقط access_denied من متن الرسالة لا من الرمز', () => {
    expect(isConsentScreenRefusal({ message: 'Error 403: access_denied' })).toBe(true);
    expect(isConsentScreenRefusal('access_denied')).toBe(true);
    expect(isConsentScreenRefusal({ customData: { message: 'admin_policy_enforced' } })).toBe(true);
  });

  it('لا يلتقط ما ليس رفضاً', () => {
    expect(isConsentScreenRefusal({ message: 'network error' })).toBe(false);
    expect(isConsentScreenRefusal(null)).toBe(false);
    expect(isConsentScreenRefusal(undefined)).toBe(false);
    expect(isConsentScreenRefusal({ message: 42 })).toBe(false);
  });

  it('يسبق فحصُه الرموزَ فلا يخفيه رمز عام', () => {
    const f = describeGoogleAuthFailure(
      { code: 'auth/internal-error', message: 'access_denied' },
      HOST,
    );
    expect(f.title).toContain('وضع الاختبار');
  });

  it('لا يدعو إلى إعادة المحاولة — فهي لا تنفع قبل النشر', () => {
    const f = describeGoogleAuthFailure({ message: 'access_denied' }, HOST);
    expect(f.retryable).toBe(false);
  });

  it('يذكر الحلّين: النشر الدائم وإضافة مختبِر فوراً', () => {
    const f = describeGoogleAuthFailure({ message: 'access_denied' }, HOST);
    expect(f.detail).toContain('نشر التطبيق');
    expect(f.detail).toContain('مستخدمو الاختبار');
  });

  it('يشير إلى صفحة الجمهور لا إلى صفحة مصادقة لا شأن لها', () => {
    expect(describeGoogleAuthFailure({ message: 'access_denied' }, HOST).consoleUrl).toBe(
      'https://console.cloud.google.com/auth/audience',
    );
  });
});

/**
 * المستخدم طلب صراحةً ألا يظهر اسم مشروع Firebase. الرسالة تُعرض لكل زائر،
 * فمعرّف المشروع داخل رابط وحدة التحكم يكشفه لمن ليس صاحب التطبيق.
 */
describe('لا يتسرّب معرّف المشروع إلى الواجهة', () => {
  const codes = [
    'auth/unauthorized-domain',
    'auth/operation-not-allowed',
    'auth/popup-closed-by-user',
    'auth/popup-blocked',
    'auth/network-request-failed',
    'auth/something-new',
  ];

  it.each(codes)('%s لا يذكر معرّف المشروع في الرابط ولا في النص', (code) => {
    const f = describeGoogleAuthFailure({ code }, HOST);
    const surface = `${f.title} ${f.detail} ${f.consoleUrl ?? ''}`;
    expect(surface).not.toContain('gen-lang-client');
    expect(surface).not.toContain('firebaseapp.com');
  });

  it('ولا في رسالة رفض شاشة الموافقة', () => {
    const f = describeGoogleAuthFailure({ message: 'access_denied' }, HOST);
    expect(`${f.title} ${f.detail} ${f.consoleUrl}`).not.toContain('gen-lang-client');
  });
});

describe('errorCode', () => {
  it('يقرأ رمز خطأ Firebase', () => {
    expect(errorCode({ code: 'auth/unauthorized-domain' })).toBe('auth/unauthorized-domain');
  });

  it('لا ينهار على أشكال أخرى', () => {
    expect(errorCode(null)).toBe('');
    expect(errorCode('نص')).toBe('');
    expect(errorCode(new Error('بلا رمز'))).toBe('');
    expect(errorCode({ code: 42 })).toBe('');
  });
});

/**
 * الحالة التي عطّلت الموقع فعلاً: النطاق غير مُدرَج، والرسالة القديمة كانت
 * تدعو إلى الانتظار. الانتظار هنا لا يُصلح شيئاً أبداً.
 */
describe('النطاق غير المصرَّح به', () => {
  const failure = describeGoogleAuthFailure({ code: 'auth/unauthorized-domain' }, HOST);

  it('يسمّي السبب ولا يدعو إلى الانتظار', () => {
    expect(failure.title).toContain('غير مُصرَّح');
    expect(failure.retryable).toBe(false);
  });

  it('يذكر النطاق الفعلي لا نطاقاً مفترضاً', () => {
    expect(failure.detail).toContain(HOST);
  });

  it('ينبّه إلى أن www ليست النطاق نفسه — وهي مصيدة هذه الحالة', () => {
    expect(failure.detail).toContain('www');
  });

  // الرابط بلا معرّف المشروع كي لا يُكشف لكل زائر؛ والمسار يُذكر نصاً بدلاً منه
  // فلا تُفقد الدلالة على الصفحة المقصودة.
  it('يعطي رابط وحدة التحكم ويسمّي المسار نصاً', () => {
    expect(failure.consoleUrl).toBe('https://console.firebase.google.com/');
    expect(failure.detail).toContain('Authorized domains');
  });
});

describe('بقية الحالات', () => {
  it('يميّز موفّر Google غير المفعّل ويشير إلى صفحته', () => {
    const f = describeGoogleAuthFailure({ code: 'auth/operation-not-allowed' }, HOST);
    expect(f.retryable).toBe(false);
    expect(f.consoleUrl).toBe('https://console.firebase.google.com/');
    expect(f.detail).toContain('Sign-in method');
  });

  it('يعتبر حجب النافذة قابلاً لإعادة المحاولة', () => {
    expect(describeGoogleAuthFailure({ code: 'auth/popup-blocked' }, HOST).retryable).toBe(true);
  });

  // الرفض في وضع الاختبار يقع على صفحة Google، فلا يصل Firebase إلا أن النافذة
  // أُغلقت. الجزم بأن «المستخدم ألغى» يُلبس عطلاً دائماً ثوب اختيارٍ عابر.
  it('لا يجزم بأن المستخدم ألغى، ويسمّي احتمال وضع الاختبار', () => {
    const f = describeGoogleAuthFailure({ code: 'auth/popup-closed-by-user' }, HOST);
    expect(f.title).not.toContain('أُلغيت');
    expect(f.detail).toContain('تم حظر إمكانية الوصول');
    expect(f.detail).toContain('وضع الاختبار');
    expect(f.retryable).toBe(true);
  });

  it('يميّز انقطاع الشبكة', () => {
    expect(describeGoogleAuthFailure({ code: 'auth/network-request-failed' }, HOST).title).toContain('الاتصال');
  });

  it('يوجّه صاحب بريد مسجَّل بطريقة أخرى إلى المسار الصحيح', () => {
    const f = describeGoogleAuthFailure({ code: 'auth/account-exists-with-different-credential' }, HOST);
    expect(f.retryable).toBe(false);
    expect(f.detail).toContain('كلمة المرور');
  });

  it('يعطي رسالة عامة لرمز مجهول بلا رابط إعداد مضلِّل', () => {
    const f = describeGoogleAuthFailure({ code: 'auth/something-new' }, HOST);
    expect(f.consoleUrl).toBeUndefined();
    expect(f.retryable).toBe(true);
  });

  it('لا ينهار على خطأ بلا رمز', () => {
    expect(describeGoogleAuthFailure(new Error('عطل'), HOST).title).toBeTruthy();
  });
});
