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

/**
 * المستخدم طلب صراحةً ألا تظهر معلومات حساسة مثل اسم مشروع Firebase.
 *
 * ورسائل الخطأ تُعرض لكل زائر لا لصاحب التطبيق وحده، فرابطٌ يحمل معرّف المشروع
 * يكشفه لمن ليس له به شأن. وحدة التحكم تفتح آخر مشروع مختار على الصفحة نفسها،
 * فالمسار يُذكر نصاً ولا يُفقد شيء.
 *
 * يُفحص المصدر نصّاً لأن الرابط قد يُكتب مباشرة في JSX بلا مرور بالمُشخِّص —
 * وهذا بالضبط ما وقع: رابطٌ ثالثٌ مكتوب بيده في شاشة الدخول نجا من التنقية.
 */
describe('لا يُكشف معرّف مشروع Firebase في الواجهة', () => {
  const uiSources: Array<[string, string]> = [
    ['شاشة الدخول', authScreen],
    ['شاشة النسخ الاحتياطي', backup],
    ['مُشخِّص أخطاء Google', read('client/src/lib/googleAuthError.ts')],
  ];

  it.each(uiSources)('%s لا تحمل رابطاً بمعرّف المشروع', (_name, source) => {
    expect(source).not.toMatch(/console\.firebase\.google\.com\/project\//);
    expect(source).not.toMatch(/console\.cloud\.google\.com\/[^"'\s]*project=/);
  });

  it('ولا تكتب معرّف المشروع نصاً صريحاً', () => {
    for (const [, source] of uiSources) {
      expect(source).not.toContain('gen-lang-client');
    }
  });
});

/**
 * شاشة Google تقول «تم حظر إمكانية الوصول… يتم اختبار التطبيق». هذا رفضٌ دائم
 * سببه أن التطبيق لم يُنشر بعد، ولا يصل إلى Firebase برمز خاص — فالتقاطه يجب
 * أن يكون من متن الرسالة، وإلا ظهر للمستخدم بوصفه إلغاءً منه.
 */
describe('رفض وضع الاختبار يُسمّى باسمه', () => {
  const diagnostics = read('client/src/lib/googleAuthError.ts');

  it('يُفحص متن الرسالة لا الرمز وحده', () => {
    expect(diagnostics).toContain('access_denied');
    expect(diagnostics).toContain('isConsentScreenRefusal');
  });

  it('يوجّه إلى صفحة الجمهور حيث يقع الإصلاح فعلاً', () => {
    expect(diagnostics).toContain('console.cloud.google.com/auth/audience');
  });
});
