/**
 * طابور الكتابات غير المؤكَّدة.
 *
 * الحادثة: الكتابة إلى Firestore كانت تجري بلا await وبلا catch —
 * `saveDocument(uid, 'debts', id, debt);` وحدها في سطر. فإن أخفقت لانقطاع شبكة
 * أو رفضٍ من القواعد أو انتهاء جلسة، ضاع الإخفاق في وعدٍ مرفوض لا يلتقطه أحد.
 * والسجل يبقى ظاهراً أمام المستخدم لأنه في الحالة وفي localStorage، بينما لم
 * يصل إلى Firebase قط. لا يكتشف ذلك إلا حين يفتح التطبيق على جهاز آخر.
 *
 * هذه الوحدة خالصة عمداً: لا تعرف Firestore ولا الوقت ولا التخزين. تأخذ الطابور
 * والوقت وسيطين وتعيد طابوراً جديداً. ما يلمس الشبكة يعيش في writeSync.
 */

export type WriteKind = 'save' | 'delete';

export interface QueuedWrite {
  /** مفتاح الهدف: المجموعة والمستند. الكتابتان على المستند نفسه تندمجان. */
  key: string;
  kind: WriteKind;
  collection: string;
  docId: string;
  /** الحمولة في الحفظ، وتُسقط في الحذف. */
  data?: unknown;
  /** كم مرة أُخفقت. يحدّد المهلة قبل المحاولة التالية. */
  attempts: number;
  /** أبكر لحظة تجوز فيها محاولة جديدة (epoch ms). */
  nextAttemptAt: number;
  /** رمز آخر إخفاق، لعرضه لا لتفريعٍ عليه. */
  lastErrorCode?: string;
  /**
   * يتزايد عند كل إدخال جديد على المستند نفسه.
   *
   * التنفيذ غير متزامن: قد يُعدَّل السجل بينما نسخته السابقة في الطريق. فلو
   * أُسقط المدخل لمجرد نجاح ما أُرسل، ضاع التعديل الأحدث بلا أثر — وهو الفقدان
   * الصامت نفسه الذي جاء الطابور ليمنعه. فيُقارَن الرقم قبل الإسقاط.
   */
  revision: number;
}

/** مستندٌ واحد = مدخلٌ واحد. المجموعة والمعرّف معاً يحدّدانه. */
export function writeKey(collection: string, docId: string): string {
  return `${collection}/${docId}`;
}

const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 5 * 60_000;

/**
 * مهلة تصاعدية مسقوفة. السقف مقصود: الإخفاق قد يكون دائماً (قاعدة ترفض)، ولا
 * يجوز أن يتحول إلى انتظارٍ لا ينتهي ولا إلى قصفٍ للخادم. تبقى المحاولة تتكرر
 * ببطء إلى الأبد بدل إسقاط كتابةٍ لم تصل — إسقاطها فقدان بيانات صامت، وهو
 * بالضبط ما جئنا نعالجه.
 */
export function backoffMs(attempts: number): number {
  if (attempts <= 0) return 0;
  const grown = BASE_DELAY_MS * 2 ** (attempts - 1);
  return Math.min(grown, MAX_DELAY_MS);
}

/**
 * يُدخل كتابة جديدة، مُدمِجاً ما يقع على المستند نفسه.
 *
 * الدمج ليس تحسيناً بل صحة: عشرُ تعديلات على دَينٍ واحد بلا اتصال يجب أن تنتهي
 * إلى كتابةٍ واحدة تحمل آخر صورة. والأهم أن الحذف يبتلع الحفظ السابق — إعادةُ
 * تشغيل حفظٍ قديم بعد حذفٍ تُحيي سجلاً حذفه صاحبه.
 *
 * ويُحتفظ بموضع المدخل الأول فلا يقفز المستند إلى ذيل الطابور كلما مُسّ.
 */
export function enqueueWrite(
  queue: QueuedWrite[],
  entry: { kind: WriteKind; collection: string; docId: string; data?: unknown },
  now: number,
): QueuedWrite[] {
  const key = writeKey(entry.collection, entry.docId);
  const at = queue.findIndex((w) => w.key === key);
  const fresh: QueuedWrite = {
    key,
    kind: entry.kind,
    collection: entry.collection,
    docId: entry.docId,
    data: entry.kind === 'save' ? entry.data : undefined,
    attempts: 0,
    nextAttemptAt: now,
    revision: at === -1 ? 1 : queue[at].revision + 1,
  };

  if (at === -1) return [...queue, fresh];

  const next = [...queue];
  next[at] = fresh;
  return next;
}

/**
 * هل ما زال المدخل على الصورة التي أُرسلت؟
 *
 * تُسأل بعد انتهاء الطلب وقبل إسقاط المدخل أو تسجيل إخفاقه: إن تغيّر رقمه فقد
 * كُتب فوقه تعديلٌ أحدث أثناء الانتظار، ولا يجوز أن يمحوه نجاحُ ما سبقه.
 */
export function isUnchanged(queue: QueuedWrite[], key: string, revision: number): boolean {
  const current = queue.find((w) => w.key === key);
  return current !== undefined && current.revision === revision;
}

/** يُسقط المدخل بعد نجاحه. */
export function removeWrite(queue: QueuedWrite[], key: string): QueuedWrite[] {
  return queue.filter((w) => w.key !== key);
}

/**
 * يسجّل إخفاقاً: يزيد العدّاد ويؤجّل المحاولة التالية.
 *
 * لا يُسقط المدخل مهما تكرر الإخفاق. الكتابة التي لم تصل بيانات المستخدم، وحذفها
 * لأنها عاندت هو الفقدان الصامت نفسه في ثوب آخر.
 */
export function recordFailure(
  queue: QueuedWrite[],
  key: string,
  errorCode: string,
  now: number,
): QueuedWrite[] {
  return queue.map((w) => {
    if (w.key !== key) return w;
    const attempts = w.attempts + 1;
    return { ...w, attempts, lastErrorCode: errorCode, nextAttemptAt: now + backoffMs(attempts) };
  });
}

/** ما حان وقته من الكتابات، بترتيب إدخالها. */
export function dueWrites(queue: QueuedWrite[], now: number): QueuedWrite[] {
  return queue.filter((w) => w.nextAttemptAt <= now);
}

/**
 * يُقدّم كل المؤجَّلات إلى الآن.
 *
 * يُستدعى حين يتغيّر الظرف تغيّراً يُبطل الانتظار: عودة الاتصال، أو ضغط
 * المستخدم «أعد المحاولة». الانتظار حينها تأخيرٌ بلا سبب.
 */
export function reviveAll(queue: QueuedWrite[], now: number): QueuedWrite[] {
  return queue.map((w) => (w.nextAttemptAt <= now ? w : { ...w, nextAttemptAt: now }));
}

export interface WriteQueueStatus {
  /** كل ما لم يصل بعد. */
  pending: number;
  /** ما أخفق مرة على الأقل — هذا ما يستحق تنبيه المستخدم. */
  failing: number;
}

export function queueStatus(queue: QueuedWrite[]): WriteQueueStatus {
  return {
    pending: queue.length,
    failing: queue.filter((w) => w.attempts > 0).length,
  };
}
