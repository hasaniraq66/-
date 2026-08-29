/**
 * اختبارات قواعد Firestore على المحاكي الرسمي.
 *
 * القواعد هي حدّ الأمان الحقيقي في هذا التطبيق: الواجهة تتصل بـ Firestore
 * مباشرة، فأي فحص في المتصفح يمكن تجاوزه. لذلك يغطي هذا الملف الهجمات
 * المعروفة والمسارات المشروعة معاً — فقاعدة تمنع المهاجم وتمنع المالك أيضاً
 * ليست إصلاحاً.
 *
 *   pnpm test:rules
 */
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, updateDoc, deleteField } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { after, before, describe, it } from 'node:test';

const OWNER = 'ownerUid0000000000000000001';
const HELPER = 'helperUid00000000000000002';
const OUTSIDER = 'outsiderUid000000000000003';
const VICTIM = 'victimUid00000000000000004';
const NEWCOMER = 'newcomerUid0000000000000005';

/** مساعد صلاحيته تبويب الميزانية فقط: يحرّر المصروفات ولا يرى الديون. */
const BUDGET_ONLY = ['budget'];
/** مساعد صلاحيته التقارير فقط: يقرأ كل شيء لرسم التحليلات ولا يكتب شيئاً. */
const REPORTS_ONLY = ['reports'];

let env;

const profile = (uid, extra = {}) => ({ userId: uid, displayName: 'اسم', currency: 'ر.س', ...extra });
const debt = (uid, id) => ({ id, userId: uid, type: 'to_me', personName: 'طرف', amount: 100, paidAmount: 0, status: 'unpaid' });
const expense = (uid, id) => ({ id, userId: uid, amount: 50, category: 'عام', date: '2026-01-01' });
const subUser = (uid, allowedTabs) => ({ id: uid, displayName: 'مساعد', email: 'h@example.com', allowedTabs });

const asUser = (uid) => env.authenticatedContext(uid).firestore();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'rules-test',
    firestore: {
      rules: readFileSync(new URL('./firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

after(async () => { await env.cleanup(); });

/** يهيّئ مالكاً ببيانات، ومساعداً بصلاحيات محددة، متجاوزاً القواعد. */
async function seed(allowedTabs) {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', OWNER), profile(OWNER));
    await setDoc(doc(db, 'users', HELPER), profile(HELPER, { adminId: OWNER, allowedTabs }));
    await setDoc(doc(db, 'users', OWNER, 'subUsers', HELPER), subUser(HELPER, allowedTabs));
    await setDoc(doc(db, 'users', OWNER, 'debts', 'debt1'), debt(OWNER, 'debt1'));
    await setDoc(doc(db, 'users', OWNER, 'expenses', 'exp1'), expense(OWNER, 'exp1'));
  });
}

describe('عزل الحسابات', () => {
  it('يمنع غريباً من قراءة ديون غيره', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(getDoc(doc(asUser(OUTSIDER), 'users', OWNER, 'debts', 'debt1')));
  });

  it('يمنع غريباً من الكتابة في ديون غيره', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(setDoc(doc(asUser(OUTSIDER), 'users', OWNER, 'debts', 'x'), debt(OWNER, 'x')));
  });

  it('يمنع تزوير userId داخل السجل', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(setDoc(doc(asUser(OWNER), 'users', OWNER, 'debts', 'x'), debt(OUTSIDER, 'x')));
  });
});

describe('اختطاف الحساب عبر adminId', () => {
  it('يمنع مهاجماً من إنشاء ملف تعريف لمستخدم آخر ويجعل نفسه مشرفاً', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(
      setDoc(doc(asUser(OUTSIDER), 'users', VICTIM), profile(VICTIM, { adminId: OUTSIDER })),
    );
  });

  it('يمنع مهاجماً من الكتابة في ملف ضحية زُرع فيه adminId مسبقاً', async () => {
    await seed(BUDGET_ONLY);
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', VICTIM), profile(VICTIM, { adminId: OUTSIDER }));
    });
    await assertFails(
      setDoc(doc(asUser(OUTSIDER), 'users', VICTIM), profile(VICTIM, { adminId: OUTSIDER, displayName: 'مُخترَق' })),
    );
  });

  it('يمنع المستخدم من ترقية نفسه بتعيين adminId لنفسه', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(
      setDoc(doc(asUser(HELPER), 'users', HELPER), profile(HELPER, { adminId: OUTSIDER, allowedTabs: BUDGET_ONLY })),
    );
  });

  it('يمنع المساعد من توسيع صلاحياته بنفسه', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(
      setDoc(doc(asUser(HELPER), 'users', HELPER), profile(HELPER, { adminId: OWNER, allowedTabs: ['projects', 'debts'] })),
    );
  });

  it('يسمح لمستخدم جديد بإنشاء ملفه الشخصي', async () => {
    await seed(BUDGET_ONLY);
    await assertSucceeds(setDoc(doc(asUser(NEWCOMER), 'users', NEWCOMER), profile(NEWCOMER)));
  });

  it('يسمح للمستخدم بتحديث بياناته مع بقاء حقول الإشراف كما هي', async () => {
    await seed(BUDGET_ONLY);
    await assertSucceeds(
      setDoc(doc(asUser(HELPER), 'users', HELPER), profile(HELPER, { adminId: OWNER, allowedTabs: BUDGET_ONLY, displayName: 'اسم جديد' })),
    );
  });

  it('يسمح لمستخدم بلا مشرف بتحديث ملفه (لا تنفجر مقارنة adminId)', async () => {
    await seed(BUDGET_ONLY);
    await assertSucceeds(
      setDoc(doc(asUser(OWNER), 'users', OWNER), profile(OWNER, { displayName: 'مالك جديد' })),
    );
  });
});

/**
 * ملفٌ يحمل adminId بلا سجل subUsers مقابل يقع خارج كل قاعدة: مالكه مُلزَم
 * بإبقاء adminId، ومشرفه المزعوم يكذّبه isAdminOf. والواجهة توجّه بياناته إلى
 * حساب ذلك المشرف فتُرفض كل قراءة وكتابة — حساب معطّل بلا مخرج. تنشأ الحالة من
 * زرعٍ عبر الثغرة المغلقة، أو من إنشاء مساعد بالترتيب القديم.
 */
describe('فكّ حبس المستخدم المعلّق', () => {
  /** يزرع ملفاً معلّقاً: adminId موجود ولا سجل subUsers يقابله. */
  async function seedDangling() {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', VICTIM), profile(VICTIM, { adminId: OUTSIDER }));
    });
  }

  it('يسمح للضحية بإزالة الإشراف المعلّق عن نفسها', async () => {
    await seedDangling();
    await assertSucceeds(setDoc(doc(asUser(VICTIM), 'users', VICTIM), profile(VICTIM)));
  });

  it('ويعمل حسابها طبيعياً بعد الفكّ', async () => {
    await seedDangling();
    await assertSucceeds(setDoc(doc(asUser(VICTIM), 'users', VICTIM), profile(VICTIM)));
    await assertSucceeds(
      setDoc(doc(asUser(VICTIM), 'users', VICTIM, 'expenses', 'e1'), expense(VICTIM, 'e1')),
    );
  });

  // الواجهة تحذف الحقل بـ deleteField لا بكتابة ملف كامل، لأن saveUserProfile
  // يستخدم merge:true فلا يزيل شيئاً. تُختبر الصيغة التي ينفّذها التطبيق فعلاً.
  it('يقبل الحذف بصيغة deleteField التي تستخدمها الواجهة', async () => {
    await seedDangling();
    await assertSucceeds(
      updateDoc(doc(asUser(VICTIM), 'users', VICTIM), {
        adminId: deleteField(),
        allowedTabs: deleteField(),
      }),
    );
  });

  it('ويُرفض deleteField من غريب على ملف غيره', async () => {
    await seedDangling();
    await assertFails(
      updateDoc(doc(asUser(OUTSIDER), 'users', VICTIM), { adminId: deleteField() }),
    );
  });

  it('يمنع مساعداً حقيقياً من فكّ ارتباطه بنفسه', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(setDoc(doc(asUser(HELPER), 'users', HELPER), profile(HELPER)));
  });

  it('ويمنعه أيضاً بصيغة deleteField', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(
      updateDoc(doc(asUser(HELPER), 'users', HELPER), { adminId: deleteField() }),
    );
  });

  // العلامة التي يعتمد عليها العميل للتمييز: سجل subUsers لا يقرأه إلا المالك،
  // فلا يصلح للفحص. أما ملف المشرف فيقرأه المساعد الحقيقي وحده.
  it('يقرأ المساعد الحقيقي ملف مشرفه بينما يُرفض المعلَّق', async () => {
    await seed(BUDGET_ONLY);
    await assertSucceeds(getDoc(doc(asUser(HELPER), 'users', OWNER)));
    await seedDangling();
    await assertFails(getDoc(doc(asUser(VICTIM), 'users', OUTSIDER)));
  });

  it('لا يفتح الفكُّ باباً لتحويل الإشراف إلى مشرف آخر', async () => {
    await seedDangling();
    await assertFails(
      setDoc(doc(asUser(VICTIM), 'users', VICTIM), profile(VICTIM, { adminId: OWNER })),
    );
  });

  it('ولا يفكّ غريبٌ إشرافاً عن غيره', async () => {
    await seedDangling();
    await assertFails(setDoc(doc(asUser(OUTSIDER), 'users', VICTIM), profile(VICTIM)));
  });
});

describe('إدارة المساعدين', () => {
  it('يسمح للمالك بإنشاء سجل مساعد ثم ملف تعريفه (بالترتيب الصحيح)', async () => {
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', OWNER), profile(OWNER));
    });
    const db = asUser(OWNER);
    await assertSucceeds(setDoc(doc(db, 'users', OWNER, 'subUsers', HELPER), subUser(HELPER, BUDGET_ONLY)));
    await assertSucceeds(setDoc(doc(db, 'users', HELPER), profile(HELPER, { adminId: OWNER, allowedTabs: BUDGET_ONLY })));
  });

  it('يسمح للمالك بتعديل صلاحيات مساعده', async () => {
    await seed(BUDGET_ONLY);
    await assertSucceeds(
      setDoc(doc(asUser(OWNER), 'users', HELPER), profile(HELPER, { adminId: OWNER, allowedTabs: ['projects'] })),
    );
  });

  it('يسمح للمالك بفصل المساعد عنه', async () => {
    await seed(BUDGET_ONLY);
    const db = asUser(OWNER);
    await assertSucceeds(setDoc(doc(db, 'users', HELPER), profile(HELPER, { adminId: '', allowedTabs: [] })));
    await assertSucceeds(deleteDoc(doc(db, 'users', OWNER, 'subUsers', HELPER)));
  });

  it('يمنع المشرف من تحويل مساعده إلى مشرف ثالث', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(
      setDoc(doc(asUser(OWNER), 'users', HELPER), profile(HELPER, { adminId: OUTSIDER, allowedTabs: BUDGET_ONLY })),
    );
  });

  it('يمنع غير المالك من قراءة قائمة المساعدين', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(getDoc(doc(asUser(HELPER), 'users', OWNER, 'subUsers', HELPER)));
  });

  it('يمنع المساعد من إضافة نفسه إلى مجموعة مساعدي غريب', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(
      setDoc(doc(asUser(HELPER), 'users', OUTSIDER, 'subUsers', HELPER), subUser(HELPER, ['projects'])),
    );
  });
});

describe('تطبيق صلاحيات التبويبات', () => {
  it('يمنع مساعد الميزانية من قراءة الديون', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(getDoc(doc(asUser(HELPER), 'users', OWNER, 'debts', 'debt1')));
  });

  it('يمنع مساعد الميزانية من كتابة الديون', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(setDoc(doc(asUser(HELPER), 'users', OWNER, 'debts', 'x'), debt(OWNER, 'x')));
  });

  it('يمنع مساعد الميزانية من حذف الديون', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(deleteDoc(doc(asUser(HELPER), 'users', OWNER, 'debts', 'debt1')));
  });

  it('يسمح لمساعد الميزانية بقراءة المصروفات وكتابتها', async () => {
    await seed(BUDGET_ONLY);
    const db = asUser(HELPER);
    await assertSucceeds(getDoc(doc(db, 'users', OWNER, 'expenses', 'exp1')));
    await assertSucceeds(setDoc(doc(db, 'users', OWNER, 'expenses', 'exp2'), expense(OWNER, 'exp2')));
  });

  it('يسمح لمساعد التقارير بقراءة الديون والمصروفات', async () => {
    await seed(REPORTS_ONLY);
    const db = asUser(HELPER);
    await assertSucceeds(getDoc(doc(db, 'users', OWNER, 'debts', 'debt1')));
    await assertSucceeds(getDoc(doc(db, 'users', OWNER, 'expenses', 'exp1')));
  });

  it('يمنع مساعد التقارير من الكتابة (قراءة فقط)', async () => {
    await seed(REPORTS_ONLY);
    const db = asUser(HELPER);
    await assertFails(setDoc(doc(db, 'users', OWNER, 'debts', 'x'), debt(OWNER, 'x')));
    await assertFails(setDoc(doc(db, 'users', OWNER, 'expenses', 'x'), expense(OWNER, 'x')));
  });
});

describe('الحذف', () => {
  it('يسمح للمالك بحذف سجلاته', async () => {
    await seed(BUDGET_ONLY);
    const db = asUser(OWNER);
    await assertSucceeds(deleteDoc(doc(db, 'users', OWNER, 'debts', 'debt1')));
    await assertSucceeds(deleteDoc(doc(db, 'users', OWNER, 'expenses', 'exp1')));
  });

  it('يمنع غريباً من حذف سجلات غيره', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(deleteDoc(doc(asUser(OUTSIDER), 'users', OWNER, 'debts', 'debt1')));
  });
});

describe('التحقق من صحة البيانات', () => {
  it('يرفض المبالغ السالبة', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(
      setDoc(doc(asUser(OWNER), 'users', OWNER, 'debts', 'neg'), { ...debt(OWNER, 'neg'), amount: -5 }),
    );
  });

  it('يرفض حالة دين غير معروفة', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(
      setDoc(doc(asUser(OWNER), 'users', OWNER, 'debts', 'bad'), { ...debt(OWNER, 'bad'), status: 'anything' }),
    );
  });

  it('يرفض معرّف مستند خارج النمط المسموح', async () => {
    await seed(BUDGET_ONLY);
    await assertFails(
      setDoc(doc(asUser(OWNER), 'users', OWNER, 'debts', 'bad id!'), debt(OWNER, 'bad id!')),
    );
  });
});

describe('المستخدم غير المسجَّل', () => {
  it('لا يقرأ ولا يكتب شيئاً', async () => {
    await seed(BUDGET_ONLY);
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users', OWNER, 'debts', 'debt1')));
    await assertFails(setDoc(doc(db, 'users', OWNER, 'debts', 'x'), debt(OWNER, 'x')));
    await assertFails(getDoc(doc(db, 'users', OWNER)));
  });
});
