import { useState } from 'react';
import { AlertTriangle, Loader2, ShieldOff, LogOut } from 'lucide-react';

interface SupervisionRecoveryProps {
  /** يزيل الإشراف المعلّق. يرمي عند الإخفاق فتُعرض الرسالة للمستخدم. */
  onRelease: () => Promise<void>;
  onSignOut: () => void;
  userName: string;
}

/**
 * شاشة إنقاذ لحساب معلّق: ملفه يحمل adminId لمشرفٍ لا يملك سجل subUsers مقابلاً،
 * فتُوجَّه كل بياناته إلى حساب ذلك المشرف وتُرفض هناك. بلا هذه الشاشة يرى صاحبه
 * تطبيقاً فارغاً لا يعمل ولا يشرح سببه، ولا مخرج له من داخل التطبيق.
 */
export default function SupervisionRecovery({ onRelease, onSignOut, userName }: SupervisionRecoveryProps) {
  const [isReleasing, setIsReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const release = async () => {
    setIsReleasing(true);
    setError(null);
    try {
      await onRelease();
    } catch {
      setError('تعذّر فصل الحساب. تحقق من الاتصال ثم أعد المحاولة.');
      setIsReleasing(false);
    }
  };

  return (
    <main
      className="flex min-h-screen w-full items-center justify-center bg-gradient-to-b from-[#090d16] via-[#0f172a] to-[#1e293b] p-4 text-right text-slate-100"
      aria-label="استعادة حساب معلّق"
    >
      <section className="w-full max-w-md rounded-2xl border border-amber-500/25 bg-slate-900/70 p-6 shadow-xl">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300">
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        </span>

        <h1 className="mt-4 text-lg font-black">حسابك مرتبط بمشرف لم يعد قائماً</h1>

        <p className="mt-3 text-sm leading-7 text-slate-300">
          أهلاً {userName || 'بك'}. ملفك مُعلَّم كحساب مساعد تابع لمشرف، لكن ذلك المشرف
          لا يملك سجلاً لك عنده. لذلك تُوجَّه بياناتك إلى حسابه وتُرفض هناك، فيظهر
          التطبيق فارغاً.
        </p>

        <p className="mt-3 text-sm leading-7 text-slate-300">
          فصل الحساب يعيده إليك: تعمل في بياناتك أنت من جديد.
          <span className="mt-2 block text-xs text-slate-400">
            لا يُحذف شيء من بياناتك، ولا يمنحك هذا وصولاً إلى بيانات أحد آخر.
          </span>
        </p>

        {error && (
          <p className="mt-4 rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs font-bold text-rose-200" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={release}
          disabled={isReleasing}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 text-sm font-black text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          {isReleasing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
              جارٍ الفصل…
            </>
          ) : (
            <>
              <ShieldOff className="h-4 w-4" aria-hidden="true" />
              فصل الحساب واستعادته
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onSignOut}
          className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 text-xs font-bold text-slate-300 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          تسجيل الخروج
        </button>

        <p className="mt-4 text-[0.7rem] leading-6 text-slate-500">
          إن كنت مساعداً فعلياً لدى صاحب حساب، اطلب منه إعادة إضافتك من صفحة
          الصلاحيات بدل الفصل.
        </p>
      </section>
    </main>
  );
}
