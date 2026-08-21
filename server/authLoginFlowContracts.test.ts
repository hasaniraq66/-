import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const authScreenPath = resolve(process.cwd(), 'client/src/components/AuthScreen.tsx');
const authScreenSource = readFileSync(authScreenPath, 'utf8');
const appPath = resolve(process.cwd(), 'client/src/App.tsx');
const appSource = readFileSync(appPath, 'utf8');

describe('عقد تدفق تسجيل الدخول', () => {
  it('يترك تحميل ملف Firestore لمستمع المصادقة المركزي بعد تسجيل الدخول', () => {
    const loginBranch = authScreenSource.slice(
      authScreenSource.indexOf('if (isLogin) {'),
      authScreenSource.indexOf('} else {', authScreenSource.indexOf('if (isLogin) {')),
    );

    expect(loginBranch).not.toContain('fetchUserProfile');
    expect(loginBranch).toContain('onAuthSuccess(');
  });

  it('لا ينفذ تسجيل Google قراءة ملف موازية قبل انتقال التطبيق', () => {
    const googleBranch = authScreenSource.slice(
      authScreenSource.indexOf('const handleGoogleLogin'),
      authScreenSource.indexOf('// Helper to validate input'),
    );

    expect(googleBranch).not.toContain('fetchUserProfile');
    expect(googleBranch).toContain('onAuthSuccess(');
  });

  it('يستجيب لتحديث رمز الهوية ويحمّل بيانات أي حساب مصادق عليه مباشرةً', () => {
    expect(appSource).toContain('onIdTokenChanged(auth');
    expect(appSource).toContain('getIdToken(true)');
    expect(appSource).not.toContain('getAuthSessionGateResult');
    expect(appSource).not.toContain('EmailVerificationSuccess');
  });

  it('لا يرسل رسالة تأكيد ولا يعرض مساراً لحالة البريد غير المؤكد', () => {
    expect(authScreenSource).not.toContain('sendEmailVerification');
    expect(authScreenSource).not.toContain('requiresEmailVerification');
    expect(authScreenSource).not.toContain('EmailVerificationNotice');
    expect(authScreenSource).not.toContain('emailVerified');
  });
});
