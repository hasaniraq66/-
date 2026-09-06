import { describe, expect, it } from 'vitest';
import {
  backoffMs,
  dueWrites,
  enqueueWrite,
  isUnchanged,
  queueStatus,
  recordFailure,
  removeWrite,
  reviveAll,
  writeKey,
  type QueuedWrite,
} from './writeQueue';

const T0 = 1_000_000;

const save = (collection: string, docId: string, data: unknown) =>
  ({ kind: 'save', collection, docId, data }) as const;
const del = (collection: string, docId: string) => ({ kind: 'delete', collection, docId }) as const;

const start = (): QueuedWrite[] => [];

describe('writeKey', () => {
  it('يفصل المستندات ولو تشابهت المعرّفات عبر المجموعات', () => {
    expect(writeKey('debts', 'x')).not.toBe(writeKey('expenses', 'x'));
  });
});

describe('الدمج على المستند نفسه', () => {
  it('عشرة تعديلات على دَين واحد تصير كتابةً واحدة بآخر صورة', () => {
    let q = start();
    for (let i = 1; i <= 10; i++) q = enqueueWrite(q, save('debts', 'd1', { amount: i }), T0);
    expect(q).toHaveLength(1);
    expect(q[0].data).toEqual({ amount: 10 });
  });

  it('لا يدمج مستندين مختلفين', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    q = enqueueWrite(q, save('debts', 'd2', {}), T0);
    expect(q).toHaveLength(2);
  });

  /**
   * أخطر حالة في الطابور: لو بقي الحفظ القديم بعد الحذف، أعادت المحاولة سجلاً
   * حذفه صاحبه — بيانات تعود من القبر بلا أن يطلبها أحد.
   */
  it('الحذف يبتلع الحفظ السابق فلا يُبعث السجل بعد حذفه', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', { amount: 5 }), T0);
    q = enqueueWrite(q, del('debts', 'd1'), T0);
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe('delete');
    expect(q[0].data).toBeUndefined();
  });

  it('وحفظٌ بعد حذف يبتلع الحذف — إعادة إنشاء بالمعرّف نفسه تبقى', () => {
    let q = enqueueWrite(start(), del('debts', 'd1'), T0);
    q = enqueueWrite(q, save('debts', 'd1', { amount: 7 }), T0);
    expect(q).toHaveLength(1);
    expect(q[0].kind).toBe('save');
    expect(q[0].data).toEqual({ amount: 7 });
  });

  it('يحفظ موضع المدخل الأول فلا يتأخر مستند كلما مُسّ', () => {
    let q = enqueueWrite(start(), save('debts', 'first', {}), T0);
    q = enqueueWrite(q, save('debts', 'second', {}), T0);
    q = enqueueWrite(q, save('debts', 'first', { v: 2 }), T0);
    expect(q.map((w) => w.docId)).toEqual(['first', 'second']);
  });

  it('الإدخال الجديد يصفّر المحاولات فلا يرث مهلة كتابةٍ سابقة', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    q = recordFailure(q, writeKey('debts', 'd1'), 'unavailable', T0);
    q = enqueueWrite(q, save('debts', 'd1', { v: 2 }), T0);
    expect(q[0].attempts).toBe(0);
    expect(q[0].nextAttemptAt).toBe(T0);
  });
});

/**
 * التنفيذ غير متزامن: قد يُعدَّل السجل بينما نسخته السابقة في الطريق إلى
 * الخادم. لولا رقم المراجعة لأسقط نجاحُ النسخة القديمة المدخلَ ومعه التعديل
 * الأحدث — الفقدان الصامت نفسه الذي جاء الطابور ليمنعه.
 */
describe('رقم المراجعة يحرس التعديل الذي يقع أثناء الإرسال', () => {
  it('يتزايد عند كل إدخال على المستند نفسه', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', { v: 1 }), T0);
    const first = q[0].revision;
    q = enqueueWrite(q, save('debts', 'd1', { v: 2 }), T0);
    expect(q[0].revision).toBeGreaterThan(first);
  });

  it('يبدأ كل مستند من مراجعته لا من عدّاد مشترك', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    q = enqueueWrite(q, save('debts', 'd1', {}), T0);
    q = enqueueWrite(q, save('debts', 'd2', {}), T0);
    expect(q.find((w) => w.docId === 'd2')!.revision).toBe(1);
  });

  it('isUnchanged يصدُق ما لم يُكتب فوق المدخل', () => {
    const q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    expect(isUnchanged(q, writeKey('debts', 'd1'), q[0].revision)).toBe(true);
  });

  it('ويكذب بعد تعديل أحدث — فلا يُسقَط المدخل بنجاح نسخةٍ سبقته', () => {
    const q = enqueueWrite(start(), save('debts', 'd1', { v: 1 }), T0);
    const sent = q[0].revision;
    const after = enqueueWrite(q, save('debts', 'd1', { v: 2 }), T0);
    expect(isUnchanged(after, writeKey('debts', 'd1'), sent)).toBe(false);
  });

  it('ويكذب على مدخل أُسقط', () => {
    const q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    expect(isUnchanged(removeWrite(q, writeKey('debts', 'd1')), writeKey('debts', 'd1'), 1)).toBe(
      false,
    );
  });

  it('الإخفاق لا يغيّر المراجعة — فهو ليس تعديلاً من المستخدم', () => {
    const q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    const failed = recordFailure(q, writeKey('debts', 'd1'), 'unavailable', T0);
    expect(isUnchanged(failed, writeKey('debts', 'd1'), q[0].revision)).toBe(true);
  });
});

describe('backoffMs', () => {
  it('يبدأ فوراً قبل أي إخفاق', () => {
    expect(backoffMs(0)).toBe(0);
  });

  it('يتصاعد مع تكرار الإخفاق', () => {
    expect(backoffMs(2)).toBeGreaterThan(backoffMs(1));
    expect(backoffMs(3)).toBeGreaterThan(backoffMs(2));
  });

  // بلا سقف يصير التأجيل انتظاراً لا ينتهي على إخفاق دائم.
  it('مسقوف عند خمس دقائق مهما طال الإخفاق', () => {
    expect(backoffMs(50)).toBe(5 * 60_000);
    expect(backoffMs(500)).toBe(5 * 60_000);
  });
});

describe('recordFailure', () => {
  const failed = recordFailure(
    enqueueWrite(start(), save('debts', 'd1', {}), T0),
    writeKey('debts', 'd1'),
    'permission-denied',
    T0,
  );

  /**
   * الإسقاط بعد عدد محاولات هو الفقدان الصامت نفسه في ثوب آخر: كتابةٌ عاندت
   * فحُذفت، والمستخدم يظنّ سجله محفوظاً.
   */
  it('لا يُسقط الكتابة مهما تكرر الإخفاق', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    for (let i = 0; i < 100; i++) q = recordFailure(q, writeKey('debts', 'd1'), 'unavailable', T0);
    expect(q).toHaveLength(1);
    expect(q[0].attempts).toBe(100);
  });

  it('يؤجّل المحاولة التالية ويحفظ رمز الإخفاق', () => {
    expect(failed[0].nextAttemptAt).toBeGreaterThan(T0);
    expect(failed[0].lastErrorCode).toBe('permission-denied');
  });

  it('لا يمسّ بقية الطابور', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    q = enqueueWrite(q, save('debts', 'd2', {}), T0);
    q = recordFailure(q, writeKey('debts', 'd1'), 'unavailable', T0);
    expect(q[1].attempts).toBe(0);
  });
});

describe('dueWrites', () => {
  it('يحجب المؤجَّل ويُطلق ما حان وقته', () => {
    const q = recordFailure(
      enqueueWrite(start(), save('debts', 'd1', {}), T0),
      writeKey('debts', 'd1'),
      'unavailable',
      T0,
    );
    expect(dueWrites(q, T0)).toHaveLength(0);
    expect(dueWrites(q, T0 + backoffMs(1))).toHaveLength(1);
  });

  it('الكتابة الجديدة مستحقّة فوراً', () => {
    expect(dueWrites(enqueueWrite(start(), save('debts', 'd1', {}), T0), T0)).toHaveLength(1);
  });
});

/** عودة الاتصال تُبطل سبب الانتظار، فإبقاؤه تأخيرٌ بلا معنى. */
describe('reviveAll', () => {
  it('يُقدّم المؤجَّلات إلى الآن', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    q = recordFailure(q, writeKey('debts', 'd1'), 'unavailable', T0);
    expect(dueWrites(reviveAll(q, T0), T0)).toHaveLength(1);
  });

  it('لا يُنقص عدّاد المحاولات — التاريخ يبقى', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    q = recordFailure(q, writeKey('debts', 'd1'), 'unavailable', T0);
    expect(reviveAll(q, T0)[0].attempts).toBe(1);
  });
});

describe('removeWrite و queueStatus', () => {
  it('يُسقط ما نجح وحده', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    q = enqueueWrite(q, save('debts', 'd2', {}), T0);
    expect(removeWrite(q, writeKey('debts', 'd1')).map((w) => w.docId)).toEqual(['d2']);
  });

  /**
   * التمييز مقصود: كتابةٌ في طريقها ليست عطلاً ولا تستحق إنذاراً، وكتابةٌ أخفقت
   * تستحقه. الخلط بينهما إمّا يُخفي العطل أو يُفزع بلا سبب.
   */
  it('يفصل ما في الطريق عمّا أخفق', () => {
    let q = enqueueWrite(start(), save('debts', 'd1', {}), T0);
    q = enqueueWrite(q, save('debts', 'd2', {}), T0);
    q = recordFailure(q, writeKey('debts', 'd1'), 'unavailable', T0);
    expect(queueStatus(q)).toEqual({ pending: 2, failing: 1 });
  });

  it('الطابور الفارغ لا يُنذر', () => {
    expect(queueStatus([])).toEqual({ pending: 0, failing: 0 });
  });
});
