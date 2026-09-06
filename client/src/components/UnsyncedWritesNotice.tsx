import { AlertTriangle, CloudOff, RefreshCw } from 'lucide-react';
import type { WriteQueueStatus } from '../lib/writeQueue';

interface UnsyncedWritesNoticeProps {
  status: WriteQueueStatus;
  onRetry: () => void;
}

/**
 * تنبيه الكتابات التي لم تصل إلى Firebase.
 *
 * قبل هذا كانت الكتابة المخفقة صامتة تماماً: السجل يظهر في الشاشة ويُحفظ في
 * localStorage، فيبدو كل شيء ناجحاً — ولا يُكتشف الأمر إلا عند فتح التطبيق على
 * جهاز آخر ولا يجد المستخدم ما أدخله.
 *
 * يفرّق التنبيه بين حالين: كتابةٌ في طريقها ليست عطلاً وتُعرض بهدوء، وكتابةٌ
 * أخفقت تستحق لوناً يوقف العين. الخلط بينهما يُفزع بلا سبب أو يُخفي العطل.
 */
export default function UnsyncedWritesNotice({ status, onRetry }: UnsyncedWritesNoticeProps) {
  if (status.pending === 0) return null;

  const failing = status.failing > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-right ${
        failing
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
          : 'border-sky-500/30 bg-sky-500/10 text-sky-200'
      }`}
    >
      {failing ? (
        <AlertTriangle className="w-5 h-5 shrink-0" />
      ) : (
        <CloudOff className="w-5 h-5 shrink-0" />
      )}

      <div className="flex-1 min-w-0 leading-relaxed">
        <p className="font-extrabold text-[13px]">
          {failing
            ? `${status.failing} من تغييراتك لم تصل إلى السحابة بعد`
            : `${status.pending} تغيير قيد الحفظ في السحابة`}
        </p>
        <p className="text-[11px] opacity-90">
          {failing
            ? 'محفوظة على هذا الجهاز وسنعيد المحاولة تلقائياً. لا تمسح بيانات التطبيق قبل وصولها.'
            : 'محفوظة على هذا الجهاز، ويجري رفعها الآن.'}
        </p>
      </div>

      {failing && (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 text-[11px] font-extrabold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          أعد المحاولة الآن
        </button>
      )}
    </div>
  );
}
