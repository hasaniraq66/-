/**
 * تحديد محاولات فتح القفل.
 *
 * الرمز أربعة أرقام، أي عشرة آلاف احتمال. كانت شاشة القفل تكتفي بتأخير
 * تجميلي مقداره 600 مللي ثانية بين المحاولات ولا تعدّها، فسكربت يرسل أحداث
 * لوحة مفاتيح يستنفد المجال كله في ثوانٍ. والتأخير التجميلي لا يُحتسب أصلاً
 * لأنه لا يمنع محاولة تالية.
 *
 * الحالة تُحفظ في localStorage عمداً: لو بقيت في الذاكرة وحدها لكفى إعادة
 * تحميل الصفحة لتصفير العدّاد.
 */

const STATE_KEY = 'app_pin_attempts';

/** يبدأ التقييد بعد هذا العدد من الإخفاقات المتتالية. */
export const FREE_ATTEMPTS = 4;
/** الحد الأقصى للانتظار: دقيقتان، فلا يُقفل الحساب إلى الأبد بخطأ عابر. */
export const MAX_LOCK_MS = 120_000;

export type ThrottleState = { failures: number; lockedUntil: number };

const EMPTY: ThrottleState = { failures: 0, lockedUntil: 0 };

/**
 * الانتظار يتضاعف: 5 ثوانٍ، 10، 20، 40، 80، ثم يثبت عند دقيقتين.
 * أربع محاولات حرة تكفي للخطأ البشري العادي.
 */
export function lockDurationMs(failures: number): number {
  if (failures <= FREE_ATTEMPTS) return 0;
  const step = failures - FREE_ATTEMPTS - 1;
  return Math.min(5_000 * 2 ** step, MAX_LOCK_MS);
}

export function readState(now: number = Date.now()): ThrottleState {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<ThrottleState>;
    const failures = Number.isFinite(parsed.failures) ? Math.max(0, Number(parsed.failures)) : 0;
    const lockedUntil = Number.isFinite(parsed.lockedUntil) ? Number(parsed.lockedUntil) : 0;
    // ساعة كاملة بلا إخفاق تعيد العدّاد إلى الصفر.
    if (lockedUntil && now - lockedUntil > 3_600_000) return { ...EMPTY };
    return { failures, lockedUntil };
  } catch {
    return { ...EMPTY };
  }
}

function writeState(state: ThrottleState): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // التخزين غير متاح (تصفح خاص مثلاً) — يبقى التقييد داخل الجلسة فقط.
  }
}

/** ما تبقّى من زمن المنع بالمللي ثانية، أو صفر إن كان الإدخال مسموحاً. */
export function remainingLockMs(now: number = Date.now()): number {
  const { lockedUntil } = readState(now);
  return Math.max(0, lockedUntil - now);
}

export function registerFailure(now: number = Date.now()): ThrottleState {
  const previous = readState(now);
  const failures = previous.failures + 1;
  const wait = lockDurationMs(failures);
  const next: ThrottleState = { failures, lockedUntil: wait > 0 ? now + wait : 0 };
  writeState(next);
  return next;
}

export function registerSuccess(): void {
  try {
    localStorage.removeItem(STATE_KEY);
  } catch {
    // لا شيء يمكن فعله، والنجاح لا يجوز أن يفشل بسبب التخزين.
  }
}

/** صياغة عربية للمدة المتبقية تُعرض للمستخدم. */
export function describeRemaining(remainingMs: number): string {
  const seconds = Math.ceil(remainingMs / 1000);
  if (seconds >= 60) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} دقيقة`;
  }
  return `${seconds} ثانية`;
}
