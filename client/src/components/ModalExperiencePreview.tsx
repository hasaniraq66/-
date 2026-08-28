import { CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import ConfirmModal from './ConfirmModal';

/** معاينة تطويرية معزولة للتحقق البصري من النوافذ؛ لا تتصل بالبيانات ولا تظهر في الإنتاج. */
export default function ModalExperiencePreview() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <main className="auth-vault-background min-h-screen p-4 font-sans md:p-8" dir="rtl" id="modal-experience-preview">
      <section className="mx-auto max-w-3xl rounded-3xl border border-sky-300/20 bg-slate-950/80 p-6 text-right text-slate-100 shadow-2xl shadow-slate-950/30 backdrop-blur">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-400/15 text-sky-300 ring-1 ring-sky-300/20"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <p className="text-[11px] font-black tracking-[0.16em] text-sky-300">معاينة تطويرية آمنة</p>
            <h1 className="mt-1 text-xl font-black text-white">نظام النوافذ المنبثقة</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">تظهر النوافذ كمربعات حوار واضحة على الحاسوب وكسطح سفلي منظم على الهاتف.</p>
          </div>
        </div>
        <button type="button" onClick={() => setIsOpen(true)} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-sky-500 px-4 text-sm font-black text-white transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
          <CreditCard className="h-4 w-4" aria-hidden="true" /> فتح نافذة تأكيد
        </button>
      </section>

      <ConfirmModal
        isOpen={isOpen}
        title="تأكيد الإجراء المالي"
        message="راجع تفاصيل العملية قبل المتابعة. يمكنك الإلغاء أو إغلاق النافذة بالضغط خارجها دون أي تغيير على البيانات."
        confirmText="متابعة بأمان"
        cancelText="عودة"
        variant="info"
        onConfirm={() => setIsOpen(false)}
        onCancel={() => setIsOpen(false)}
      />

      {!isOpen && (
        <div className="mx-auto mt-6 flex max-w-3xl items-center gap-2 rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-200">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> أُغلقت نافذة المعاينة دون تنفيذ أي عملية.
        </div>
      )}
    </main>
  );
}
