import React, { useState, useEffect } from 'react';
import { Lock, Delete, ShieldAlert, KeyRound, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';

interface LockScreenProps {
  savedPin: string;
  userName: string;
  onUnlock: () => void;
}

export default function LockScreen({ savedPin, userName, onUnlock }: LockScreenProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [showPin, setShowPin] = useState<boolean>(false);

  // Handle keypress from physical keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (error) return;

      if (e.key >= '0' && e.key <= '9') {
        handleNumberPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pin, error]);

  const handleNumberPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      // Auto-validate if 4 digits reached
      if (newPin.length === 4) {
        if (newPin === savedPin) {
          // Success animation/trigger
          setTimeout(() => {
            onUnlock();
          }, 300);
        } else {
          // Trigger shake animation and clear
          setTimeout(() => {
            setError(true);
            // Vibrate if API supported
            if (navigator.vibrate) {
              navigator.vibrate(200);
            }
            setTimeout(() => {
              setError(false);
              setPin('');
            }, 600);
          }, 200);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-b from-[#090d16] via-[#0f172a] to-[#1e293b] text-slate-100 z-55 flex flex-col justify-center items-center p-4 select-none"
      id="app-lock-screen"
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-sm flex flex-col items-center space-y-8 z-10">
        {/* App Branding */}
        <div className="flex flex-col items-center text-center space-y-3">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className={`p-4 rounded-3xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-[0_0_30px_rgba(14,165,233,0.3)] border border-sky-400/20 relative`}
          >
            <Lock className="w-7 h-7" />
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="absolute inset-0 bg-sky-500/20 rounded-3xl -z-10 blur-md"
            ></motion.div>
          </motion.div>
          
          <div className="space-y-1.5">
            <h1 className="font-black text-lg text-white tracking-tight">ديوني وميزانيتي</h1>
            <p className="text-xs text-slate-400 font-bold">مرحباً بك مجدداً، {userName} 👋</p>
          </div>
        </div>

        {/* PIN Entry Area */}
        <div className="w-full flex flex-col items-center space-y-4">
          <p className="text-xs text-slate-300 font-extrabold flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-sky-400" />
            <span>الرجاء إدخال رمز PIN المكون من 4 أرقام للمتابعة</span>
          </p>

          {/* Dot Indicator / Password Characters */}
          <motion.div 
            animate={error ? { x: [-10, 10, -10, 10, -5, 5, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={`flex items-center justify-center gap-4 py-4 px-6 rounded-2xl bg-slate-900/40 border transition-colors ${
              error ? 'border-rose-500 bg-rose-500/5' : 'border-slate-800'
            }`}
          >
            {[0, 1, 2, 3].map((index) => {
              const hasDigit = pin.length > index;
              return (
                <div key={index} className="relative w-4 h-4 flex items-center justify-center">
                  {showPin && hasDigit ? (
                    <span className="text-sm font-black text-sky-400 absolute">{pin[index]}</span>
                  ) : (
                    <motion.div 
                      animate={{
                        scale: hasDigit ? 1.2 : 1,
                        backgroundColor: error ? '#f43f5e' : hasDigit ? '#0ea5e9' : '#334155'
                      }}
                      className="w-3.5 h-3.5 rounded-full"
                    />
                  )}
                </div>
              );
            })}
          </motion.div>

          {/* Toggle PIN Visibility Button */}
          {pin.length > 0 && (
            <button
              onClick={() => setShowPin(!showPin)}
              className="text-[10px] text-slate-400 hover:text-slate-300 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              {showPin ? (
                <>
                  <EyeOff className="w-3 h-3" />
                  <span>إخفاء الرمز</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>إظهار الرمز</span>
                </>
              )}
            </button>
          )}

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[10px] text-rose-400 font-extrabold flex items-center gap-1"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>رمز PIN غير صحيح، يرجى المحاولة مرة أخرى</span>
            </motion.p>
          )}
        </div>

        {/* Custom Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3.5 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberPress(num)}
              className="h-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 text-white font-black text-xl border border-slate-800/60 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-3xs"
            >
              {num}
            </button>
          ))}
          
          {/* Backspace / Delete */}
          <button
            onClick={handleClear}
            className="h-14 rounded-2xl bg-slate-900/20 hover:bg-slate-900/50 text-slate-400 hover:text-slate-200 font-bold text-xs border border-transparent active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          >
            مسح
          </button>

          {/* Zero */}
          <button
            onClick={() => handleNumberPress('0')}
            className="h-14 rounded-2xl bg-slate-900/50 hover:bg-slate-800/80 text-white font-black text-xl border border-slate-800/60 active:scale-95 transition-all flex items-center justify-center cursor-pointer shadow-3xs"
          >
            0
          </button>

          {/* Backspace icon */}
          <button
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-slate-900/20 hover:bg-slate-900/50 text-slate-400 hover:text-rose-400 border border-transparent active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            title="حذف الرقم الأخير"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info/Reset note */}
        <div className="pt-4 text-center text-[10px] text-slate-500 space-y-1 w-full max-w-xs leading-relaxed">
          <p>🔒 بياناتك المالية محمية بآمان تام داخل هذا الجهاز.</p>
          <p className="border-t border-slate-800/40 pt-2 text-slate-600">
            إذا نسيت رمز PIN، يمكنك إعادة تعيين التطبيق بمسح بيانات تصفح الموقع أو استخدام خيار استرجاع النسخ الاحتياطي لاحقاً.
          </p>
        </div>
      </div>
    </div>
  );
}
