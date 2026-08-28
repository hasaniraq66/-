import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Lock, Delete, ShieldAlert, KeyRound, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { PIN_LENGTH } from '../lib/appLockCredential';
import { describeRemaining, registerFailure, registerSuccess, remainingLockMs } from '../lib/appLockThrottle';

interface LockScreenProps {
  /**
   * تتحقق من الرمز من دون أن تسلّمه للمكوّن. سابقاً كان الرمز يُمرَّر نصاً
   * صريحاً كخاصية، فيظهر في شجرة React لمن يفتح أدوات المطوّر.
   */
  verifyPin: (pin: string) => Promise<boolean>;
  userName: string;
  onUnlock: () => void;
}

export default function LockScreen({ verifyPin, userName, onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);
  const [lockRemainingMs, setLockRemainingMs] = useState<number>(() => remainingLockMs());
  const isCheckingRef = useRef(false);

  const isThrottled = lockRemainingMs > 0;

  // عدّاد تنازلي حيّ للمنع، فيرى المستخدم متى يستطيع المحاولة مجدداً.
  useEffect(() => {
    if (!isThrottled) return;
    const timer = window.setInterval(() => setLockRemainingMs(remainingLockMs()), 500);
    return () => window.clearInterval(timer);
  }, [isThrottled]);

  const submitPin = useCallback(async (candidate: string) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    try {
      if (await verifyPin(candidate)) {
        registerSuccess();
        setTimeout(onUnlock, 300);
        return;
      }
      const state = registerFailure();
      setLockRemainingMs(Math.max(0, state.lockedUntil - Date.now()));
      setError(true);
      if (navigator.vibrate) navigator.vibrate(200);
      setTimeout(() => {
        setError(false);
        setPin('');
      }, 600);
    } finally {
      isCheckingRef.current = false;
    }
  }, [onUnlock, verifyPin]);

  const handleNumberPress = useCallback((num: string) => {
    if (error || isThrottled) return;
    setPin((previous) => {
      if (previous.length >= PIN_LENGTH) return previous;
      const next = previous + num;
      if (next.length === PIN_LENGTH) void submitPin(next);
      return next;
    });
  }, [error, isThrottled, submitPin]);

  const handleBackspace = useCallback(() => setPin((prev) => prev.slice(0, -1)), []);
  const handleClear = useCallback(() => setPin(''), []);

  // Handle keypress from physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (error || isThrottled) return;
      if (e.key >= '0' && e.key <= '9') handleNumberPress(e.key);
      else if (e.key === 'Backspace') handleBackspace();
      else if (e.key === 'Escape' || e.key === 'Delete') handleClear();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [error, isThrottled, handleNumberPress, handleBackspace, handleClear]);

  return (
    <div
      className="fixed inset-0 bg-gradient-to-b from-[#090d16] via-[#0f172a] to-[#1e293b] text-slate-100 z-55 flex flex-col justify-center items-center p-4 select-none"
      role="dialog"
      aria-modal="true"
      aria-label="شاشة قفل التطبيق"
    >
      <div className="w-full max-w-xs text-center">
        <motion.div
          animate={error ? { x: [0, -10, 10, -10, 10, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="mb-6 flex flex-col items-center gap-3"
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
            {isThrottled ? <ShieldAlert className="h-7 w-7" /> : <Lock className="h-7 w-7" />}
          </span>
          <div>
            <h1 className="text-lg font-bold">أهلاً {userName || 'بك'}</h1>
            <p className="mt-1 text-xs text-slate-400">
              {isThrottled
                ? `محاولات كثيرة خاطئة. أعد المحاولة بعد ${describeRemaining(lockRemainingMs)}.`
                : 'أدخل رمز القفل للمتابعة'}
            </p>
          </div>
        </motion.div>

        <div className="mb-6 flex items-center justify-center gap-3" aria-live="polite">
          {Array.from({ length: PIN_LENGTH }).map((_, index) => (
            <span
              key={index}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border text-lg font-bold transition ${
                error
                  ? 'border-rose-400/70 bg-rose-500/10 text-rose-200'
                  : index < pin.length
                    ? 'border-sky-400/70 bg-sky-500/10 text-sky-100'
                    : 'border-slate-700 bg-slate-900/60 text-slate-500'
              }`}
            >
              {index < pin.length ? (showPin ? pin[index] : '•') : ''}
            </span>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleNumberPress(digit)}
              disabled={isThrottled}
              className="min-h-14 rounded-2xl bg-slate-800/70 text-xl font-bold text-slate-100 transition hover:bg-slate-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 motion-reduce:transform-none"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowPin((prev) => !prev)}
            className="min-h-14 rounded-2xl bg-slate-900/70 text-slate-400 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label={showPin ? 'إخفاء الرمز' : 'إظهار الرمز'}
          >
            {showPin ? <EyeOff className="mx-auto h-5 w-5" /> : <Eye className="mx-auto h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => handleNumberPress('0')}
            disabled={isThrottled}
            className="min-h-14 rounded-2xl bg-slate-800/70 text-xl font-bold text-slate-100 transition hover:bg-slate-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 motion-reduce:transform-none"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="min-h-14 rounded-2xl bg-slate-900/70 text-slate-400 transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label="مسح آخر رقم"
          >
            <Delete className="mx-auto h-5 w-5" />
          </button>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[0.7rem] text-slate-500">
          <KeyRound className="h-3.5 w-3.5" />
          يحمي هذا الرمز فتح التطبيق على هذا الجهاز
        </p>
      </div>
    </div>
  );
}
