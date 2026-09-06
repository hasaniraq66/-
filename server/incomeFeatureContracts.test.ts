import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = resolve(__dirname, '..');

const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');
const app = read('client/src/App.tsx');
const dashboard = read('client/src/components/Dashboard.tsx');
const rules = read('firestore.rules');
const permissions = read('client/src/components/PermissionsManager.tsx');

/**
 * ميزة الدخل تمسّ الأمان والمال معاً، وأسهل طريقة لإفسادها هي وصلٌ ناقص: تبويب
 * بلا قاعدة، أو دخل يُعرض ولا يدخل في الرصيد. هذه العقود تحرس الوصلات لا الشكل.
 */
describe('حدود الأمان', () => {
  it('تحرس القواعد مجموعتي الدخل بتبويب مستقل عن الميزانية', () => {
    expect(rules).toContain('match /incomes/{incomeId}');
    expect(rules).toContain('match /incomeSources/{sourceId}');
    const block = rules.slice(rules.indexOf('match /incomes/{incomeId}'));
    expect(block.slice(0, block.indexOf('\n      }'))).toContain("canWriteTab(userId, 'income')");
  });

  it('تُغلق تصنيفات الدخل على قائمة معروفة فلا يُحشى نص حر', () => {
    expect(rules).toContain('function isValidIncomeCategory');
    expect(rules).toContain("category in ['salary', 'daily', 'sale', 'rent', 'gift', 'other']");
  });

  it('تحصر يوم الاستحقاق بـ 28 فلا ينكسر المصدر في فبراير', () => {
    expect(rules).toContain('data.dayOfMonth >= 1 && data.dayOfMonth <= 28');
  });
});

describe('وصل الميزة بالتطبيق', () => {
  it('يحمّل مجموعتي الدخل ضمن allSettled فلا يُسقط رفضُها بقية التبويبات', () => {
    expect(app).toContain("fetchCollection<Income>(finalUid, 'incomes')");
    expect(app).toContain("fetchCollection<IncomeSource>(finalUid, 'incomeSources')");
    // الثابت مُعرَّف أعلى الملف أيضاً، فيُبحث عنه بعد موضع الاستدعاء لا من أوله
    const start = app.indexOf('Promise.allSettled([');
    expect(start).toBeGreaterThan(-1);
    const settledBlock = app.slice(start, app.indexOf(']),', start));
    expect(settledBlock).toContain("'incomes'");
    expect(settledBlock).toContain("'incomeSources'");
    expect(settledBlock).toContain("'expenses'");
  });

  // المسار صار يمرّ بطابور الكتابات بدل استدعاء firebaseService مباشرة: النية
  // نفسها — الدخل يُكتب في السحابة لا في الحالة وحدها — والطابور يضمن فوقها
  // ألا يضيع الإخفاق صامتاً.
  it('يكتب الدخل في Firestore لا في الحالة المحلية وحدها', () => {
    expect(app).toContain("enqueueSave('incomes'");
    expect(app).toContain("enqueueSave('incomeSources'");
    expect(app).toContain("enqueueDelete('incomes'");
  });

  it('يمسح الدخل عند تسجيل الخروج، فهو بيانات مالية حسّاسة', () => {
    expect((app.match(/setIncomes\(\[\]\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect((app.match(/setIncomeSources\(\[\]\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('يعرض تبويب الدخل ويحرسه بصلاحيته', () => {
    expect(app).toContain("activeTab === 'income'");
    expect(app).toContain("hasTabPermission('income')");
    expect(app).toContain('<IncomeManager');
  });

  it('يتيح للمالك منح صلاحية الدخل لمساعد', () => {
    expect(permissions).toContain("id: 'income'");
  });
});

describe('الدخل يدخل في رأس المال فعلاً', () => {
  it('يضيفه إلى المعادلة لا يعرضه وحده', () => {
    expect(dashboard).toContain('totalIncomeAllTime');
    const line = dashboard.split('\n').find((row) => row.includes('const currentCapital ='));
    expect(line).toBeDefined();
    expect(line).toContain('totalIncomeAllTime');
  });

  it('يمرّر التطبيق الدخل إلى لوحة التحكم', () => {
    expect(app).toContain('incomes={incomes}');
  });
});
