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

  it('يترك تحميل البيانات للحسابات ذات البريد المؤكد فقط ويستجيب لتحديث رمز الهوية', () => {
    expect(appSource).toContain('onIdTokenChanged(auth');
    expect(appSource).toContain("getAuthSessionGateResult(firebaseUser) === 'email-verification-required'");
    expect(appSource).toContain('getIdToken(true)');
  });

  it('يرسل رسالة التحقق بإعداد Firebase الافتراضي الآمن دون رابط معاينة مخصص', () => {
    expect(authScreenSource).not.toContain('buildEmailVerificationActionUrl');
    expect(authScreenSource).toContain('sendEmailVerification(userCredential.user)');
    expect(authScreenSource).toContain('sendEmailVerification(user)');
  });
});
