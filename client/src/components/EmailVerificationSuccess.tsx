import React, { useEffect, useState } from 'react';
import { applyActionCode } from 'firebase/auth';
import { ArrowLeft, BadgeCheck, Loader2, LogIn, ShieldCheck, TriangleAlert } from 'lucide-react';
import { auth } from '../utils/firebaseService';

type VerificationState = 'processing' | 'success' | 'error';

interface EmailVerificationSuccessProps {
  oobCode: string | null;
  fallbackSuccess: boolean;
  hasVerifiedSession: boolean;
  onContinue: () => void;
}

function getActionErrorMessage(errorCode?: string): string {
  if (errorCode === 'auth/expired-action-code') {
    return 'انتهت صلاحية رابط التأكيد. سجّل الدخول مجدداً لطلب رسالة تحقق جديدة.';
  }

  if (errorCode === 'auth/invalid-action-code') {
    return 'رابط التأكيد غير صالح أو تم استخدامه من قبل. سجّل الدخول للتحقق من حالة بريدك.';
  }

  return 'تعذر تأكيد البريد الإلكتروني الآن. حاول فتح الرابط مجدداً أو اطلب رسالة تحقق جديدة.';
}

export default function EmailVerificationSuccess({
  oobCode,
  fallbackSuccess,
  hasVerifiedSession,
  onContinue,
}: EmailVerificationSuccessProps) {
  const [state, setState] = useState<VerificationState>(fallbackSuccess ? 'success' : 'processing');
  const [error, setError] = useState('');

  useEffect(() => {
    if (fallbackSuccess || !oobCode) return;

    let active = true;
    void applyActionCode(auth, oobCode)
      .then(() => {
        if (active) setState('success');
      })
      .catch((actionError: { code?: string }) => {
        if (!active) return;
        setError(getActionErrorMessage(actionError?.code));
        setState('error');
      });

    return () => {
      active = false;
    };
  }, [fallbackSuccess, oobCode]);

  const isProcessing = state === 'processing';
  const isSuccess = state === 'success';

  return (
    <main className="auth-vault-background min-h-screen p-4 font-sans" dir="rtl" aria-labelledby="verification-result-title">
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center justify-center py-8">
        <section className="auth-vault-card w-full rounded-3xl border border-sky-100/10 p-6 shadow-2xl md:p-8">
          <div className="mb-6 flex items-center justify-between border-b border-slate-700/60 pb-4">
            <div className="flex items-center gap-2 text-slate-300">
              <div className="rounded-xl bg-sky-500/15 p-2 text-sky-300">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <span className="text-xs font-black">ديوني وميزانيتي برو</span>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black text-emerald-200">أمان الحساب</span>
          </div>

          <div className="space-y-5 text-right">
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg ${isSuccess ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/25' : state === 'error' ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-500/25' : 'bg-gradient-to-br from-sky-400 to-sky-600 shadow-sky-500/25'}`}>
              {isProcessing ? <Loader2 className="h-7 w-7 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : isSuccess ? <BadgeCheck className="h-7 w-7" aria-hidden="true" /> : <TriangleAlert className="h-7 w-7" aria-hidden="true" />}
            </div>

            {isProcessing && (
              <div className="space-y-2" aria-live="polite">
                <p className="text-xs font-black tracking-wide text-sky-300">تأكيد البريد الإلكتروني</p>
                <h1 id="verification-result-title" className="text-2xl font-black tracking-tight text-white md:text-3xl">جارٍ تأكيد بريدك الإلكتروني</h1>
                <p className="text-sm font-medium leading-7 text-slate-300">نراجع رابط التأكيد بأمان. لا تغلق هذه الصفحة.</p>
              </div>
            )}

            {isSuccess && (
              <div className="space-y-2" role="status" aria-live="polite">
                <p className="text-xs font-black tracking-wide text-emerald-300">تم بنجاح</p>
                <h1 id="verification-result-title" className="text-2xl font-black tracking-tight text-white md:text-3xl">تم تأكيد بريدك الإلكتروني</h1>
                <p className="text-sm font-medium leading-7 text-slate-300">
                  {hasVerifiedSession ? 'أصبح حسابك جاهزاً الآن. يمكنك المتابعة مباشرة إلى لوحة التحكم.' : 'أصبح بريدك موثقاً. سجّل الدخول ببريدك وكلمة المرور للانتقال الآمن إلى لوحة التحكم.'}
                </p>
              </div>
            )}

            {state === 'error' && (
              <div className="space-y-2" role="alert">
                <p className="text-xs font-black tracking-wide text-amber-300">تعذر إتمام التأكيد</p>
                <h1 id="verification-result-title" className="text-2xl font-black tracking-tight text-white md:text-3xl">تحقق من رابط البريد</h1>
                <p className="text-sm font-medium leading-7 text-slate-300">{error}</p>
              </div>
            )}

            <div className="rounded-2xl border border-slate-700/80 bg-[#090f1d]/80 p-4 text-sm font-bold leading-7 text-slate-300">
              {isSuccess ? 'يمكنك الآن إدارة الديون والميزانية والمصروفات من مساحة عملك المحمية.' : 'لا تشارك رابط التأكيد مع أي شخص. يُستخدم الرابط لتأمين ملكية البريد المرتبط بحسابك فقط.'}
            </div>

            {!isProcessing && (
              <button type="button" onClick={onContinue} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-xs font-black text-white shadow-lg shadow-sky-600/15 transition-all hover:bg-sky-500 active:scale-[0.98]">
                {isSuccess && hasVerifiedSession ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <LogIn className="h-4 w-4" aria-hidden="true" />}
                {isSuccess && hasVerifiedSession ? 'الانتقال إلى لوحة التحكم' : 'العودة إلى تسجيل الدخول'}
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
