import { CheckCircle2, Database, Loader2, ShieldCheck, Sparkles } from 'lucide-react';
import type { DataLoadingStage } from '../lib/loadingExperience';
import { getLoadingStageCopy } from '../lib/loadingExperience';

const loadingSteps = ['تأمين الجلسة', 'تجهيز الحساب', 'تحميل السجلات'];

export function AppDataLoadingExperience({ stage }: { stage: DataLoadingStage }) {
  const copy = getLoadingStageCopy(stage);

  return (
    <main className="auth-vault-background relative flex min-h-screen items-center justify-center overflow-hidden px-5 font-sans text-right text-slate-100" dir="rtl" aria-busy="true" aria-describedby="app-loading-status">
      <div aria-hidden="true" className="absolute -right-32 top-[-8rem] h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
      <section className="auth-vault-card relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 p-6 shadow-2xl shadow-sky-950/50 backdrop-blur sm:p-8" role="status">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-sky-300/80 to-transparent" />
        <div className="flex items-start gap-4">
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-500/15 ring-1 ring-sky-300/20">
            <span className="absolute inset-0 rounded-2xl border border-sky-300/30 animate-ping motion-reduce:animate-none" />
            <ShieldCheck className="h-7 w-7 text-sky-300" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[11px] font-black tracking-[0.18em] text-sky-300">ديوني وميزانيتي برو</p>
            <h1 className="mt-1 text-lg font-black text-white">{copy.title}</h1>
            <p className="mt-1 text-xs leading-6 text-slate-400">{copy.description}</p>
          </div>
        </div>

        <div className="mt-7 rounded-2xl border border-white/8 bg-slate-950/40 p-4">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
            <span>جاري التحميل</span>
            <span className="inline-flex items-center gap-1.5 text-sky-300"><Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> يرجى الانتظار</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-2/3 rounded-full bg-gradient-to-l from-cyan-300 via-sky-400 to-blue-500 animate-pulse motion-reduce:animate-none" />
          </div>
          <ol className="mt-4 grid grid-cols-3 gap-2">
            {loadingSteps.map((step, index) => {
              const isComplete = index < copy.completedSteps;
              const isCurrent = index === copy.completedSteps;
              return <li key={step} className={`min-w-0 text-center text-[9px] font-bold ${isComplete ? 'text-emerald-300' : isCurrent ? 'text-sky-200' : 'text-slate-500'}`}>
                <span className={`mx-auto mb-1 flex h-5 w-5 items-center justify-center rounded-full border ${isComplete ? 'border-emerald-300/40 bg-emerald-400/15' : isCurrent ? 'border-sky-300/50 bg-sky-400/15' : 'border-slate-700 bg-slate-800'}`}>
                  {isComplete ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : isCurrent ? <Sparkles className="h-3 w-3 animate-pulse motion-reduce:animate-none" aria-hidden="true" /> : <span>{index + 1}</span>}
                </span>
                <span className="block truncate">{step}</span>
              </li>;
            })}
          </ol>
        </div>
        <p id="app-loading-status" className="sr-only" aria-live="polite">{copy.liveMessage}</p>
      </section>
    </main>
  );
}

export function DeferredSectionLoadingExperience({ label }: { label: string }) {
  return (
    <section className="relative min-h-[300px] overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900" role="status" aria-busy="true" aria-live="polite">
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-transparent via-sky-400 to-transparent animate-pulse motion-reduce:animate-none" />
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300"><Database className="h-5 w-5 animate-pulse motion-reduce:animate-none" /></div>
        <div><p className="text-sm font-black text-slate-800 dark:text-slate-100">نجهّز {label}</p><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">تُرتّب البيانات لتظهر لك بصورة واضحة.</p></div>
      </div>
      <div aria-hidden="true" className="mt-6 grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => <div key={index} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40"><div className="h-3 w-2/5 rounded-full bg-slate-200 animate-pulse dark:bg-slate-800 motion-reduce:animate-none" /><div className="mt-4 h-7 w-4/5 rounded-lg bg-slate-200 animate-pulse dark:bg-slate-800 motion-reduce:animate-none" /><div className="mt-3 h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800" /></div>)}
      </div>
      <p className="sr-only">جاري تجهيز {label}.</p>
    </section>
  );
}
