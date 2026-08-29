import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = resolve(__dirname, '..');

const clientConfig = JSON.parse(readFileSync(resolve(ROOT, 'client', 'firebase-applet-config.json'), 'utf8'));
const firebaseJson = JSON.parse(readFileSync(resolve(ROOT, 'firebase.json'), 'utf8'));
const workflow = readFileSync(resolve(ROOT, '.github', 'workflows', 'security.yml'), 'utf8');

/**
 * القواعد المدموجة ليست قواعد منشورة. هذه العقود تحرس الفجوة التي أوقعتنا
 * سابقاً: القواعد صحيحة في المستودع بينما الإنتاج يعمل بنسخة قديمة، أو
 * تُنشر — وهو الأخطر — إلى قاعدة بيانات غير التي يستخدمها التطبيق فتبدو
 * العملية ناجحة والمستخدم بلا حماية.
 */
describe('firebase.json يستهدف قاعدة البيانات التي يستخدمها التطبيق فعلاً', () => {
  it('يعرّف firestore كمصفوفة، فالشكل المفرد ينشر إلى (default) وحدها', () => {
    expect(Array.isArray(firebaseJson.firestore)).toBe(true);
    expect(firebaseJson.firestore.length).toBeGreaterThan(0);
  });

  it('يطابق database اسمَ قاعدة البيانات في إعداد العميل', () => {
    const databases = firebaseJson.firestore.map((entry: { database?: string }) => entry.database);
    expect(databases).toContain(clientConfig.firestoreDatabaseId);
  });

  it('يشير إلى ملفات قواعد موجودة على القرص', () => {
    for (const entry of firebaseJson.firestore as Array<{ rules: string }>) {
      expect(existsSync(resolve(ROOT, entry.rules))).toBe(true);
    }
    expect(existsSync(resolve(ROOT, firebaseJson.storage.rules))).toBe(true);
  });
});

describe('سير العمل ينشر القواعد عند الدمج في main', () => {
  it('يحتوي مهمة نشر مرتبطة بمشروع Firebase الصحيح', () => {
    expect(workflow).toContain('deploy-firebase-rules:');
    expect(workflow).toContain(`FIREBASE_PROJECT_ID: ${clientConfig.projectId}`);
  });

  it('ينشر قواعد Firestore وStorage معاً، فنشر إحداهما وحدها يترك ثغرة', () => {
    expect(workflow).toContain('--only firestore:rules,storage');
  });

  it('لا ينشر إلا بعد نجاح مهمة التحقق، فلا تصل قاعدة مكسورة إلى الإنتاج', () => {
    const job = workflow.slice(workflow.indexOf('deploy-firebase-rules:'));
    expect(job).toContain('needs: verify');
  });

  it('يقتصر على فرع main ولا يعمل على طلبات السحب', () => {
    const job = workflow.slice(workflow.indexOf('deploy-firebase-rules:'));
    const condition = job.slice(job.indexOf('if:'), job.indexOf('\n', job.indexOf('if:')));
    expect(condition).toContain("github.ref == 'refs/heads/main'");
    expect(condition).not.toContain('pull_request');
  });

  it('يقبل التشغيل اليدوي كي تُنشر القواعد فور إضافة السر', () => {
    expect(workflow).toContain('workflow_dispatch:');
    const job = workflow.slice(workflow.indexOf('deploy-firebase-rules:'));
    expect(job).toContain("github.event_name == 'workflow_dispatch'");
  });

  it('يمحو مفتاح الخدمة دائماً ولو أخفق النشر', () => {
    const job = workflow.slice(workflow.indexOf('deploy-firebase-rules:'));
    expect(job).toContain('rm -f "$RUNNER_TEMP/firebase-service-account.json"');
    expect(job).toMatch(/if: always\(\)/);
  });

  it('يرفض مفتاحاً يخصّ مشروعاً آخر بدل النشر في المكان الخطأ', () => {
    const job = workflow.slice(workflow.indexOf('deploy-firebase-rules:'));
    expect(job).toContain('node scripts/validateServiceAccount.mjs');
    const validator = readFileSync(resolve(ROOT, 'scripts/validateServiceAccount.mjs'), 'utf8');
    expect(validator).toContain('رُفض النشر بدل إرساله إلى المشروع الخطأ');
  });

  it('يتحقق من المفتاح قبل خطوة النشر لا بعدها', () => {
    const job = workflow.slice(workflow.indexOf('deploy-firebase-rules:'));
    expect(job.indexOf('node scripts/validateServiceAccount.mjs'))
      .toBeLessThan(job.indexOf('firebase deploy'));
  });

  it('يبقي المهمة الأخيرة في الملف فلا يبتلع القصّ خطواتٍ لاحقة', () => {
    // شرائح الاختبار أعلاه تقرأ حتى نهاية الملف؛ لو أُضيفت مهمة بعدها لزم
    // تحديدها بدقة. هذا الفحص يُنبّه عند تغيّر الترتيب.
    const remainder = workflow.slice(workflow.indexOf('deploy-firebase-rules:'));
    expect(remainder).not.toMatch(/^ {2}[a-z][a-z0-9-]*:\s*$/m);
  });
});
