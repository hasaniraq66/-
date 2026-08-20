import React from 'react';
import { BadgeCheck, LogOut, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react';
import { maskEmailAddress } from '../lib/emailVerificationNotice';

interface EmailVerificationNoticeProps {
  email: string;
  feedback: string;
  error: string;
  busyAction: 'idle' | 'resending' | 'checking';
  onResend: () => void;
  onCheckStatus: () => void;
  onBackToLogin: () => void;
}

export default function EmailVerificationNotice({
  email,
  feedback,
  error,
  busyAction,
  onResend,
  onCheckStatus,
  onBackToLogin,
}: EmailVerificationNoticeProps) {
  const isBusy = busyAction !== 'idle';

  return (
    <main className="auth-vault-background min-h-screen p-4 font-sans" dir="rtl" aria-labelledby="verification-page-title">
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center py-8">
        <section className="auth-vault-card w-full rounded-3xl border border-sky-100/10 p-6 shadow-2xl md:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-slate-700/60 pb-4">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="rounded-xl bg-sky-500/15 p-2 text-sky-300">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-black">ديوني وميزانيتي برو</span>
            </div>
            <span className="rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[10px] font-black text-sky-200">خطوة أمان</span>
          </div>

          <div className="space-y-5 text-right">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400 to-sky-600 text-white shadow-lg shadow-sky-500/25">
              <MailCheck className="h-7 w-7" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black tracking-wide text-sky-300">تأكيد البريد الإلكتروني</p>
              <h1 id="verification-page-title" className="text-2xl font-black tracking-tight text-white md:text-3xl">افتح رابط التأكيد لإكمال الدخول</h1>
              <p className="text-sm font-medium leading-7 text-slate-300">
                أرسلنا رسالة تأكيد إلى <bdi className="font-black text-white">{maskEmailAddress(email)}</bdi>. افتح الرابط الوارد في البريد، ثم عد إلى هذه الصفحة للتحقق من الحالة.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-700/80 bg-[#090f1d]/80 p-4">
              <ol className="space-y-3 text-sm font-bold text-slate-300">
                <li className="flex items-start gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] text-sky-300">١</span><span>افتح صندوق الوارد أو مجلد البريد غير الهام.</span></li>
                <li className="flex items-start gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] text-sky-300">٢</span><span>اضغط رابط تأكيد البريد المرسل من Firebase.</span></li>
                <li className="flex items-start gap-3"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-[11px] text-sky-300">٣</span><span>ارجع هنا واضغط «تحقق من الحالة».</span></li>
              </ol>
            </div>

            {feedback && <p className="rounded-xl border border-sky-400/25 bg-sky-500/10 p-3 text-xs font-bold leading-relaxed text-sky-100" role="status" aria-live="polite">{feedback}</p>}
            {error && <p className="rounded-xl border border-red-400/25 bg-red-500/10 p-3 text-xs font-bold leading-relaxed text-red-100" role="alert">{error}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={onCheckStatus} disabled={isBusy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-sky-600/15 transition-all hover:bg-sky-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                {busyAction === 'checking' ? <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <BadgeCheck className="h-4 w-4" aria-hidden="true" />}
                تحقق من الحالة
              </button>
              <button type="button" onClick={onResend} disabled={isBusy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-600 bg-slate-900/70 px-4 py-3 text-xs font-black text-slate-200 transition-all hover:border-sky-400/60 hover:text-white active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                {busyAction === 'resending' ? <RefreshCw className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <MailCheck className="h-4 w-4" aria-hidden="true" />}
                إعادة إرسال الرسالة
              </button>
            </div>

            <button type="button" onClick={onBackToLogin} disabled={isBusy} className="inline-flex min-h-10 items-center gap-2 text-xs font-black text-slate-400 transition-colors hover:text-sky-300 disabled:cursor-not-allowed disabled:opacity-50">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              العودة إلى تسجيل الدخول
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
