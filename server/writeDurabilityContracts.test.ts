import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = resolve(__dirname, '..');

const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');
const app = read('client/src/App.tsx');
const writeSync = read('client/src/utils/writeSync.ts');

/**
 * العيب: كل كتابة إلى Firestore كانت سطراً وحده بلا await وبلا catch —
 *
 *   setDebts((prev) => [newDebt, ...prev]);
 *   saveDocument(targetUid, 'debts', newDebt.id, newDebt);
 *
 * فإن أخفقت — انقطاع شبكة، رفض من القواعد، انتهاء جلسة — ضاع الإخفاق في وعدٍ
 * مرفوض لا يلتقطه أحد. والسجل يبقى ظاهراً للمستخدم لأنه في الحالة وفي
 * localStorage، فيبدو محفوظاً وهو لم يبلغ Firebase قط. لا يُكتشف ذلك إلا على
 * جهاز آخر.
 */
describe('لا كتابة مباشرة تتجاوز الطابور', () => {
  it('لم تبقَ في App استدعاءات مباشرة لـ saveDocument/deleteDocument', () => {
    expect(app).not.toMatch(/\bsaveDocument\s*\(/);
    expect(app).not.toMatch(/\bdeleteDocument\s*\(/);
  });

  it('وكل الكتابات تمرّ بـ enqueueSave/enqueueDelete', () => {
    expect(app).toContain('enqueueSave(');
    expect(app).toContain('enqueueDelete(');
    expect(app).toContain("from './utils/writeSync'");
  });

  // الطابور بلا مالك لا يعرف تحت أي uid يكتب.
  it('يُربط الطابور بصاحب البيانات', () => {
    expect(app).toContain('attachWriteSync(');
  });
});

/**
 * الإخفاق الصامت هو أصل الحادثة، فعرضُه ليس تحسيناً بل تمام الإصلاح: طابورٌ
 * يعيد المحاولة بلا أن يخبر أحداً يترك المستخدم على الوهم نفسه.
 */
describe('الإخفاق يُعرض ولا يُبتلع', () => {
  it('تعرض App حالة الكتابات غير المؤكَّدة', () => {
    expect(app).toContain('UnsyncedWritesNotice');
    expect(app).toContain('subscribeWriteSync(');
  });

  it('ويملك المستخدم إعادة المحاولة يدوياً', () => {
    expect(app).toContain('retryPendingWrites');
  });
});

/**
 * الملف الشخصي كان يُكتب بـ `void saveUserProfile(updated)` — بلا التقاط كذلك.
 * وهو يحمل الاسم والعملة، فإخفاقه الصامت يُعيد بالضبط عطلَ «الاسم لا يُحفظ عند
 * إغلاق التطبيق» الذي عولج قبل قليل.
 */
describe('الملف الشخصي يمرّ بالطابور كذلك', () => {
  it('لم يبقَ حفظٌ مُطلَق بلا انتظار ولا التقاط', () => {
    expect(app).not.toContain('void saveUserProfile(');
    expect(app).toContain('enqueueProfileSave(');
  });

  it('ويُنفَّذ على مساره الخاص لأنه ليس في مجموعة فرعية', () => {
    expect(writeSync).toContain('saveUserProfile(');
    expect(writeSync).toContain('PROFILE_COLLECTION');
  });

  // ما بقي من نداءات saveUserProfile في App مُنتظَرٌ داخل try/catch، فليس صامتاً.
  it('وما بقي منه مُنتظَر', () => {
    for (const call of app.match(/^.*saveUserProfile\(.*$/gm) ?? []) {
      if (call.includes('import') || call.includes('//')) continue;
      expect(call).toContain('await ');
    }
  });
});

/**
 * الدخل كان يُمسح من الحالة وحدها عند التصفير، فيعود من السحابة عند الفتح
 * التالي — سهوٌ رافق إضافة الميزة: الحذف لم يلحق التحميل.
 */
describe('التصفير يبلغ السحابة لا الحالة وحدها', () => {
  const reset = app.slice(app.indexOf('handleResetAllData'));

  it.each(['debts', 'expenses', 'budgets', 'projects', 'employees', 'salaryPayments', 'incomes', 'incomeSources'])(
    'يحذف %s من Firestore',
    (collection) => {
      expect(reset).toContain(`enqueueDelete('${collection}'`);
    },
  );
});

describe('الطابور يعيش أطول من الجلسة', () => {
  // إغلاق مفاجئ — تبويب يُنهى، هاتف ينطفئ — لا يمنح فرصة حفظٍ عند الخروج.
  it('يُثبَّت في التخزين لا في الذاكرة وحدها', () => {
    expect(writeSync).toContain('localStorage.setItem');
    expect(writeSync).toContain('localStorage.getItem');
  });

  it('ويُفصل بصاحبه فلا تُكتب بيانات شخص في حساب غيره', () => {
    expect(writeSync).toContain('pending_writes_');
    expect(writeSync).toMatch(/storageKey\s*=\s*\(uid/);
  });

  it('ويستأنف عند عودة الاتصال بدل انتظار المهلة', () => {
    expect(writeSync).toContain("addEventListener('online'");
  });
});
