import { describe, expect, it } from 'vitest';
import { describeGoogleAuthFailure, errorCode } from './googleAuthError';

const HOST = 'www.iqcma.com';

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

  it('يعطي رابط الإعداد الصحيح', () => {
    expect(failure.consoleUrl).toContain('/authentication/settings');
  });
});

describe('بقية الحالات', () => {
  it('يميّز موفّر Google غير المفعّل ويشير إلى صفحته', () => {
    const f = describeGoogleAuthFailure({ code: 'auth/operation-not-allowed' }, HOST);
    expect(f.retryable).toBe(false);
    expect(f.consoleUrl).toContain('/authentication/providers');
  });

  it('يعتبر حجب النافذة قابلاً لإعادة المحاولة', () => {
    expect(describeGoogleAuthFailure({ code: 'auth/popup-blocked' }, HOST).retryable).toBe(true);
  });

  it('لا يعامل إغلاق المستخدم للنافذة كعطل', () => {
    const f = describeGoogleAuthFailure({ code: 'auth/popup-closed-by-user' }, HOST);
    expect(f.title).toContain('أُلغيت');
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
