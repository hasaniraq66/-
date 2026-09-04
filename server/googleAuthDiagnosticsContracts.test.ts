import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = resolve(__dirname, '..');

const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');
const authScreen = read('client/src/components/AuthScreen.tsx');
const backup = read('client/src/components/BackupRestore.tsx');

/**
 * تعطّل دخول Google والنسخ الاحتياطي معاً لأن نطاق الموقع لم يكن مُدرَجاً في
 * النطاقات المصرَّح بها في Firebase. الكود كان يعرض «يرجى المحاولة لاحقاً»،
 * وهي دعوة إلى إنفاق الوقت في لا شيء: هذه الحالة لا يُصلحها الانتظار.
 *
 * هذه العقود تمنع الرجوع إلى تلك الرسالة، وتضمن أن المسارين يتشاركان
 * التشخيص — فالنسخ الاحتياطي يمرّ بدخول Google نفسه ويتعطّل بالسبب نفسه.
 */
describe('لا رسالة تدعو إلى الانتظار حين لا ينفع الانتظار', () => {
  it('لا تبقى «المحاولة لاحقاً» في شاشة الدخول', () => {
    expect(authScreen).not.toContain('يرجى المحاولة لاحقاً');
  });

  it('لا تبقى الرسالة العامة في شاشة النسخ الاحتياطي', () => {
    expect(backup).not.toContain('فشل تسجيل الدخول أو ربط حساب Google Drive.');
  });
});

describe('المساران يتشاركان التشخيص نفسه', () => {
  it('تستخدم شاشة الدخول المُشخِّص المشترك', () => {
    expect(authScreen).toContain('describeGoogleAuthFailure');
    expect(authScreen).toContain("from '../lib/googleAuthError'");
  });

  it('وتستخدمه شاشة النسخ الاحتياطي كذلك', () => {
    expect(backup).toContain('describeGoogleAuthFailure');
    expect(backup).toContain("from '../lib/googleAuthError'");
  });

  it('يذكران النطاق الفعلي لا نطاقاً مفترضاً', () => {
    expect(authScreen).toContain('currentHost()');
    expect(backup).toContain('currentHost()');
  });
});
