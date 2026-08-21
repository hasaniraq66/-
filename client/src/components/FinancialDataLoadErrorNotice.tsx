import { RefreshCw } from 'lucide-react';

interface FinancialDataLoadErrorNoticeProps {
  message: string;
  onRetry: () => void;
}

export default function FinancialDataLoadErrorNotice({ message, onRetry }: FinancialDataLoadErrorNoticeProps) {
  return (
    <section id="financial-data-load-error" className="flex w-full min-w-0 flex-col gap-3 overflow-hidden rounded-2xl border border-amber-200 bg-amber-50 p-4 text-right shadow-sm sm:flex-row sm:items-center sm:justify-between" role="alert" aria-live="assertive">
      <div className="min-w-0">
        <p className="text-sm font-black text-amber-950">تعذر تحديث آخر البيانات</p>
        <p className="mt-1 text-xs font-medium leading-6 text-amber-800">{message} لم يتم حذف أي بيانات محلية. تحقق من الاتصال ثم أعد المحاولة.</p>
      </div>
      <button type="button" onClick={onRetry} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-700 px-4 text-xs font-black text-white transition hover:bg-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2">
        <RefreshCw className="h-4 w-4" aria-hidden="true" /> إعادة المحاولة
      </button>
    </section>
  );
}
