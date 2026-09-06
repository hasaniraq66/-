/**
 * تشغيل طابور الكتابات: ما يلمس Firestore والتخزين والوقت.
 *
 * المنطق كله في lib/writeQueue الخالصة؛ هنا الأثر الجانبي وحده — التنفيذ،
 * والاستمرار عبر الجلسات، والإخطار.
 *
 * الفكرة: لا تُستدعى saveDocument من الواجهة مباشرة أبداً. كل كتابة تدخل
 * الطابور أولاً وتُثبَّت في localStorage قبل أي محاولة، ثم تُحاول. فإن أخفقت
 * بقيت — وإن أُغلق التطبيق في تلك اللحظة وجدناها عند الإقلاع التالي.
 */

import { saveDocument, deleteDocument, saveUserProfile, type UserProfile } from './firebaseService';
import { getFirestoreErrorCode } from '../lib/firestoreError';
import {
  dueWrites,
  enqueueWrite,
  isUnchanged,
  queueStatus,
  recordFailure,
  removeWrite,
  reviveAll,
  writeKey,
  type QueuedWrite,
  type WriteQueueStatus,
} from '../lib/writeQueue';

const STORAGE_PREFIX = 'pending_writes_';
const FLUSH_INTERVAL_MS = 15_000;

let queue: QueuedWrite[] = [];
let ownerUid: string | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let flushing = false;

const listeners = new Set<(status: WriteQueueStatus) => void>();

const storageKey = (uid: string) => `${STORAGE_PREFIX}${uid}`;

let lastNotified: WriteQueueStatus = { pending: 0, failing: 0 };

/**
 * يُخطر عند تغيّر العدّ فقط.
 *
 * التفريغ يمرّ على كل كتابة ويُخطر بعدها؛ استعادةُ نسخة من مئات السجلات كانت
 * تُشعل مئات التحديثات في React عبر awaits متتابعة — لا تُجمَّع دفعةً واحدة،
 * فتُجمّد الواجهة بلا أن يتغير المعروض إلا رقماً.
 */
function notify() {
  const status = queueStatus(queue);
  if (status.pending === lastNotified.pending && status.failing === lastNotified.failing) return;
  lastNotified = status;
  listeners.forEach((listener) => listener(status));
}

/**
 * يُثبَّت الطابور بعد كل تغيير، لا عند الإغلاق.
 *
 * الإغلاق المفاجئ — إنهاء التبويب، انطفاء الهاتف — لا يمنح فرصة للحفظ، وطابورٌ
 * يعيش في الذاكرة وحدها يضيع معه وتضيع الكتابات التي كان يحرسها.
 */
function persistNow() {
  if (!ownerUid || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey(ownerUid), JSON.stringify(queue));
  } catch {
    // امتلاء الحصة أو تخزين محجوب: الطابور يبقى في الذاكرة ويعمل هذه الجلسة.
  }
}

let persistScheduled = false;

/**
 * يُجمّع تثبيتات الدفقة الواحدة في تثبيتٍ واحد.
 *
 * استعادةُ نسخة احتياطية تُدخل مئات السجلات في حلقة متزامنة؛ تثبيتُ الطابور عند
 * كل واحد يعني تسلسلَ الطابور كاملاً مئات المرات — عملٌ تربيعي يُجمّد الواجهة.
 * والمهمة الدقيقة (microtask) تعمل قبل أن يعود المتصفح إلى الرسم، فنافذة الخطر
 * لا تتسع لانهيارٍ بينهما.
 */
function persist() {
  if (persistScheduled) return;
  persistScheduled = true;
  queueMicrotask(() => {
    persistScheduled = false;
    persistNow();
  });
}

function load(uid: string): QueuedWrite[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // تُصفّى المداخل المشوَّهة بدل أن يُسقط الطابور كله عند أول مدخل تالف،
    // وتُضبط الحقول العددية بقيم صريحة: مدخلٌ بلا nextAttemptAt لا يَحين وقته
    // أبداً (undefined <= now كاذبة)، فيقف في الطابور صامتاً إلى الأبد — وهو
    // فقدانٌ صامت من الباب الذي جئنا نسدّه.
    return parsed
      .filter(
        (w): w is QueuedWrite =>
          typeof w === 'object' &&
          w !== null &&
          typeof (w as QueuedWrite).key === 'string' &&
          typeof (w as QueuedWrite).collection === 'string' &&
          typeof (w as QueuedWrite).docId === 'string' &&
          ((w as QueuedWrite).kind === 'save' || (w as QueuedWrite).kind === 'delete'),
      )
      .map((w) => ({
        ...w,
        attempts: Number.isFinite(w.attempts) ? w.attempts : 0,
        nextAttemptAt: Number.isFinite(w.nextAttemptAt) ? w.nextAttemptAt : 0,
        revision: Number.isFinite(w.revision) ? w.revision : 1,
      }));
  } catch {
    return [];
  }
}

/**
 * الملف الشخصي مسارٌ آخر بالمسافة نفسها من الخطر.
 *
 * يسكن `users/{uid}` لا مجموعةً فرعية، فلا تصلح له saveDocument. وكان يُكتب
 * بـ `void saveUserProfile(updated)` — بلا التقاطٍ كذلك. وهو يحمل الاسم والعملة
 * ورأس المال الأولي، أي أن إخفاقه الصامت يُعيد بالضبط عطلَ «الاسم لا يُحفظ».
 * فيدخل الطابور نفسه: يرث التثبيت وإعادة المحاولة والتنبيه بلا آلية ثانية.
 *
 * مسار المستند يُقرأ من الحمولة (`profile.userId`) لا من مالك الطابور، فيبقى
 * صحيحاً للمساعد الذي يكتب تحت uid نفسه بينما بياناته تحت uid مشرفه.
 */
const PROFILE_COLLECTION = '__profile';

async function runOne(write: QueuedWrite): Promise<void> {
  if (!ownerUid) return;
  if (write.collection === PROFILE_COLLECTION) {
    await saveUserProfile(write.data as UserProfile);
    return;
  }
  if (write.kind === 'delete') {
    await deleteDocument(ownerUid, write.collection, write.docId);
    return;
  }
  await saveDocument(ownerUid, write.collection, write.docId, write.data as { id?: string });
}

/**
 * يُفرِّغ ما حان وقته، واحدةً بعد أخرى.
 *
 * التسلسل مقصود: الكتابات على مستندات مترابطة (دَين ومصروفه) تصل بترتيبها،
 * والخادم لا يُقصف بعشرات الطلبات عند عودة الاتصال بعد انقطاع طويل.
 */
export async function flushWrites(): Promise<void> {
  if (flushing || !ownerUid) return;
  flushing = true;
  try {
    for (const write of dueWrites(queue, Date.now())) {
      // قد يكون أُسقط أو استُبدل بين جدولته وتنفيذه.
      const current = queue.find((w) => w.key === write.key);
      if (!current || current.revision !== write.revision) continue;

      try {
        await runOne(current);
        // لا يُسقط إلا إن بقي على صورته: تعديلٌ وقع أثناء الإرسال يعني أن ما
        // نجح هو النسخة القديمة، وإسقاط المدخل حينها يمحو الأحدث.
        if (isUnchanged(queue, current.key, current.revision)) {
          queue = removeWrite(queue, current.key);
        }
      } catch (error) {
        if (isUnchanged(queue, current.key, current.revision)) {
          queue = recordFailure(
            queue,
            current.key,
            getFirestoreErrorCode(error) ?? 'unknown',
            Date.now(),
          );
        }
      }
      persist();
      notify();
    }
  } finally {
    flushing = false;
  }
}

function schedule() {
  if (timer || typeof window === 'undefined') return;
  timer = setInterval(() => void flushWrites(), FLUSH_INTERVAL_MS);
  window.addEventListener('online', handleOnline);
}

function handleOnline() {
  queue = reviveAll(queue, Date.now());
  persist();
  void flushWrites();
}

/**
 * يربط الطابور بمستخدم. يُستدعى عند الدخول وعند تبديل الحساب.
 *
 * الطابور مفصول بالمستخدم لأن كتابةً مؤجَّلة تحمل مسار مستند تحت uid صاحبها؛
 * تنفيذها باسم مستخدم آخر إمّا يُرفض من القواعد أو — وهو الأسوأ — يكتب بيانات
 * شخص في حساب غيره.
 */
export function attachWriteSync(uid: string | null): void {
  if (uid === ownerUid) return;
  // يُثبَّت طابور المالك السابق قبل تركه: تثبيتٌ مؤجَّل ينتظر مهمةً دقيقة، وتبديل
  // المالك قبلها يكتبه تحت المفتاح الخطأ أو يفقده.
  persistNow();
  ownerUid = uid;
  queue = uid ? load(uid) : [];
  // تبديل المالك يُبطل المقارنة: طابور المالك الجديد قد يوافق القديم عدداً
  // ويخالفه محتوى، فيُجبَر الإخطار بدل أن يبتلعه فحص التساوي.
  lastNotified = { pending: -1, failing: -1 };
  notify();
  if (uid) {
    schedule();
    void flushWrites();
  }
}

/** يُدخل حفظاً. لا ينتظر الشبكة: يُثبَّت أولاً ثم يُحاول. */
export function enqueueSave(collection: string, docId: string, data: unknown): void {
  if (!ownerUid) return;
  queue = enqueueWrite(queue, { kind: 'save', collection, docId, data }, Date.now());
  persist();
  notify();
  void flushWrites();
}

/** يُدخل حفظ الملف الشخصي. */
export function enqueueProfileSave(profile: UserProfile): void {
  if (!ownerUid) return;
  queue = enqueueWrite(
    queue,
    { kind: 'save', collection: PROFILE_COLLECTION, docId: profile.userId, data: profile },
    Date.now(),
  );
  persist();
  notify();
  void flushWrites();
}

/** يُدخل حذفاً. */
export function enqueueDelete(collection: string, docId: string): void {
  if (!ownerUid) return;
  queue = enqueueWrite(queue, { kind: 'delete', collection, docId }, Date.now());
  persist();
  notify();
  void flushWrites();
}

/** «أعد المحاولة الآن» — يُلغي الانتظار المتبقي على كل مؤجَّل. */
export function retryPendingWrites(): void {
  queue = reviveAll(queue, Date.now());
  persist();
  notify();
  void flushWrites();
}

export function subscribeWriteSync(listener: (status: WriteQueueStatus) => void): () => void {
  listeners.add(listener);
  listener(queueStatus(queue));
  return () => {
    listeners.delete(listener);
  };
}

export { writeKey };
export type { WriteQueueStatus };
