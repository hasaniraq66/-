import { useState } from 'react';
import { Check, Copy, HeartHandshake, Info, Landmark, ShieldCheck, Smartphone } from 'lucide-react';
import { supportDonationMethods, type SupportDonationMethod } from '../lib/supportDonationMethods';

const donationPresentation: Record<SupportDonationMethod['id'], {
  icon: typeof Smartphone;
  accentClass: string;
  iconClass: string;
}> = {
  'zain-cash': {
    icon: Smartphone,
    accentClass: 'border-amber-200 bg-amber-50/80 dark:border-amber-900/70 dark:bg-amber-950/20',
    iconClass: 'bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300',
  },
  'master-alrafidain': {
    icon: Landmark,
    accentClass: 'border-sky-200 bg-sky-50/80 dark:border-sky-900/70 dark:bg-sky-950/20',
    iconClass: 'bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300',
  },
};

/** صفحة دعم اختيارية؛ لا تنفذ أي تحويل مالي ولا تخزن بيانات وسائل الدفع. */
export default function SupportPage() {
  const [copiedMethod, setCopiedMethod] = useState<SupportDonationMethod['id'] | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const copyAccount = async (method: SupportDonationMethod) => {
    setCopyError(null);

    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(method.account);
      setCopiedMethod(method.id);
      window.setTimeout(() => setCopiedMethod((current) => (current === method.id ? null : current)), 2200);
    } catch {
      setCopyError('تعذر النسخ تلقائياً. حدّد الرقم وانسخه يدوياً من البطاقة.');
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6" id="support-page" dir="rtl" aria-labelledby="support-page-title">
      <header className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_52px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
        <div className="relative isolate overflow-hidden px-5 py-8 sm:px-8 sm:py-10">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(14,165,233,0.16),transparent_68%)]" aria-hidden="true" />
          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              دعم اختياري للتطبيق
            </span>
            <h2 id="support-page-title" className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl dark:text-white">
              ساهم في استمرار تطوير ديوني وميزانيتي برو
            </h2>
            <p className="mt-3 max-w-xl text-sm font-medium leading-7 text-slate-600 dark:text-slate-300">
              تقديرك ودعمك يساعدان على تحسين الأدوات المالية وتجربة الاستخدام. اختر الوسيلة المناسبة لك، ثم انسخ الرقم وأكمل التحويل من تطبيقك المالي.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 md:grid-cols-2" aria-label="وسائل الدعم المتاحة">
        {supportDonationMethods.map((method) => {
          const visual = donationPresentation[method.id];
          const Icon = visual.icon;
          const isCopied = copiedMethod === method.id;

          return (
            <article key={method.id} className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${visual.accentClass}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`rounded-2xl p-3 ${visual.iconClass}`}>
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{method.label}</h3>
                    <p className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">{method.subtitle}</p>
                  </div>
                </div>
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-label="بيانات معروضة للنسخ فقط" />
              </div>

              <div className="mt-6 rounded-2xl border border-white/80 bg-white/80 p-4 dark:border-slate-700/80 dark:bg-slate-950/40">
                <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">الرقم</span>
                <output dir="ltr" className="mt-2 block text-left font-mono text-xl font-black tracking-[0.12em] text-slate-900 dark:text-white" aria-label={`رقم ${method.label}`}>
                  {method.account}
                </output>
              </div>

              <button
                type="button"
                onClick={() => void copyAccount(method)}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 active:scale-[0.98] dark:bg-sky-600 dark:hover:bg-sky-500 dark:focus:ring-offset-slate-900"
                aria-live="polite"
              >
                {isCopied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
                {isCopied ? 'تم نسخ الرقم' : 'نسخ الرقم'}
              </button>
            </article>
          );
        })}
      </div>

      <aside className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-sky-50/70 p-4 text-sm leading-6 text-sky-950 dark:border-sky-900/70 dark:bg-sky-950/25 dark:text-sky-100" aria-label="ملاحظة مهمة عن الدعم">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600 dark:text-sky-400" aria-hidden="true" />
        <p>الدعم اختياري تماماً. راجع الرقم قبل إتمام التحويل، واحتفظ بإيصال العملية لدى مزود الخدمة. هذه الصفحة لا تعالج المدفوعات ولا تطلب أي معلومات شخصية أو مالية منك.</p>
      </aside>

      {copyError && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          {copyError}
        </p>
      )}
    </section>
  );
}
