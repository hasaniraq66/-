import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = resolve(__dirname, '..');

const service = readFileSync(resolve(ROOT, 'client/src/utils/firebaseService.ts'), 'utf8');
const app = readFileSync(resolve(ROOT, 'client/src/App.tsx'), 'utf8');
const rules = readFileSync(resolve(ROOT, 'firestore.rules'), 'utf8');

/** يقتطع جسم دالة مُصدَّرة من ملف الخدمة حتى نفحص ما تفعله هي لا ما يجاورها. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`export const ${name} =`);
  expect(start, `${name} غير مُصدَّرة`).toBeGreaterThan(-1);
  const next = source.indexOf('\nexport ', start + 1);
  return source.slice(start, next === -1 ? source.length : next);
}

/**
 * حسابٌ يحمل adminId بلا سجل subUsers مقابل كان محبوساً بلا مخرج: القواعد تمنع
 * صاحبه من إزالة الحقل، والمشرف الوهمي لا يملك سلطة عليه، والواجهة توجّه بياناته
 * إلى حساب لا يصل إليه. هذه العقود تحرس مسار الخروج بأجزائه الثلاثة.
 */
describe('القاعدة تسمح بفكّ الإشراف المعلّق وحده', () => {
  it('تشترط غياب سجل subUsers، فلا يفكّ المساعد الحقيقي ارتباطه', () => {
    expect(rules).toContain('function releasesDanglingSupervision(userId)');
    const fn = rules.slice(rules.indexOf('function releasesDanglingSupervision'));
    expect(fn.slice(0, fn.indexOf('\n    }'))).toContain('!exists(subUserRef(existing().adminId, userId))');
  });

  it('تسمح بالإزالة فقط لا بالإضافة ولا بالتحويل إلى مشرف آخر', () => {
    const fn = rules.slice(rules.indexOf('function releasesDanglingSupervision'));
    const body = fn.slice(0, fn.indexOf('\n    }'));
    expect(body).toContain("existing().get('adminId', null) != null");
    expect(body).toContain("incoming().get('adminId', null) == null");
  });
});

describe('الخدمة تكشف التعليق وتفكّه بالصيغة الصحيحة', () => {
  it('تميّز التعليق برفض الصلاحية وحده، فلا يُعرض الفكّ عند انقطاع الشبكة', () => {
    const fn = functionBody(service, 'isSupervisionLinkBroken');
    expect(fn).toContain("'permission-denied'");
    expect(fn).toContain('return false;');
  });

  it('تفحص ملف المشرف لا سجل subUsers الذي لا يقرأه إلا المالك', () => {
    const fn = functionBody(service, 'isSupervisionLinkBroken');
    expect(fn).toContain("doc(db, 'users', adminId)");
    expect(fn).not.toContain('subUsers');
  });

  it('تحذف الحقل بـ deleteField لا بكتابة دمج تُبقيه ثم تبدو ناجحة', () => {
    const fn = functionBody(service, 'releaseSupervision');
    expect(fn).toContain('deleteField()');
    expect(fn).toContain('adminId');
    expect(fn).not.toContain('merge');
    expect(fn).not.toContain('saveUserProfile');
  });
});

describe('التطبيق يعرض مخرجاً بدل واجهة فارغة', () => {
  it('يفحص الرابط قبل توجيه البيانات إلى حساب المشرف', () => {
    const check = app.indexOf('isSupervisionLinkBroken(profile.adminId)');
    const route = app.indexOf('finalUid = profile.adminId');
    expect(check).toBeGreaterThan(-1);
    expect(route).toBeGreaterThan(-1);
    expect(check).toBeLessThan(route);
  });

  it('يعرض شاشة الاستعادة قبل واجهة التطبيق', () => {
    expect(app).toContain('if (isSupervisionBroken) {');
    expect(app).toContain('<SupervisionRecovery');
    const gate = app.indexOf('if (isSupervisionBroken) {');
    expect(gate).toBeLessThan(app.indexOf('const hasTabPermission'));
  });

  it('يصفّر الحالة عند تسجيل الخروج وعند بدء جلسة جديدة', () => {
    const resets = app.match(/setIsSupervisionBroken\(false\)/g) ?? [];
    expect(resets.length).toBeGreaterThanOrEqual(2);
  });
});
