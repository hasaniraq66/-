import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  Lock, 
  User as UserIcon, 
  Eye, 
  EyeOff, 
  Loader2, 
  Coins, 
  AlertCircle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendEmailVerification,
  signOut,
  reload
} from 'firebase/auth';
import { auth, saveUserProfile } from '../utils/firebaseService';
import { getEmailVerificationErrorMessage, requiresEmailVerification } from '../lib/emailVerification';
import { getVerificationStatusMessage } from '../lib/emailVerificationNotice';
import { runWithFirebaseSessionRecovery } from '../lib/firebaseSession';
import EmailVerificationNotice from './EmailVerificationNotice';

interface AuthScreenProps {
  onAuthSuccess: (userId: string, displayName: string, currency: string) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  
  // Fields
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [currency, setCurrency] = useState('ر.س');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode>('');
  const [verificationNotice, setVerificationNotice] = useState('');
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [verificationAction, setVerificationAction] = useState<'idle' | 'resending' | 'checking'>('idle');
  const [verificationError, setVerificationError] = useState('');

  const resolveTargetEmail = (): string | null => {
    if (authMethod === 'email') {
      return email.includes('@') ? email.trim() : null;
    }

    const cleanPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
    return cleanPhone.length >= 9 ? `${cleanPhone}@phone.malyah.com` : null;
  };

  const handleResendVerification = async () => {
    const targetEmail = pendingVerificationEmail ?? resolveTargetEmail();
    if (authMethod !== 'email' || !targetEmail || password.length < 6) {
      setError('أدخل بريدك الإلكتروني وكلمة المرور ثم اطلب إعادة إرسال رسالة التحقق.');
      return;
    }

    setIsResendingVerification(true);
    setVerificationAction('resending');
    setError('');
    setVerificationError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
      if (userCredential.user.emailVerified) {
        setVerificationNotice('تم تأكيد بريدك الإلكتروني بالفعل. اضغط «تحقق من الحالة» لفتح حسابك.');
      } else {
        await sendEmailVerification(userCredential.user);
        setVerificationNotice('أُعيد إرسال رسالة التحقق. افحص صندوق الوارد والبريد غير الهام ثم سجّل الدخول مجدداً.');
      }
      await signOut(auth);
    } catch (err: any) {
      const message = getEmailVerificationErrorMessage(err?.code);
      if (pendingVerificationEmail) setVerificationError(message);
      else setError(message);
    } finally {
      setIsResendingVerification(false);
      setVerificationAction('idle');
    }
  };

  const handleVerificationCheck = async () => {
    if (!pendingVerificationEmail || password.length < 6) {
      setVerificationError('لإتمام التحقق بأمان، عد إلى تسجيل الدخول وأدخل بريدك وكلمة المرور مجدداً.');
      return;
    }

    setVerificationAction('checking');
    setVerificationError('');
    try {
      const userCredential = await signInWithEmailAndPassword(auth, pendingVerificationEmail, password);
      await reload(userCredential.user);

      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        setVerificationNotice(getVerificationStatusMessage(false));
        return;
      }

      setPendingVerificationEmail(null);
      setVerificationNotice('');
      onAuthSuccess(
        userCredential.user.uid,
        userCredential.user.displayName || 'مستخدم',
        currency,
      );
    } catch (err: any) {
      setVerificationError(getEmailVerificationErrorMessage(err?.code));
    } finally {
      setVerificationAction('idle');
    }
  };

  const returnToLogin = () => {
    setPendingVerificationEmail(null);
    setVerificationNotice('');
    setVerificationError('');
    setIsLogin(true);
  };

  // Google Provider
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // يقوم مستمع المصادقة في App وحده بتحميل أو إنشاء ملف Firestore.
      // تجنب القراءة المتوازية هنا يمنع تعارض تجديد الرمز بعد تسجيل الدخول.
      onAuthSuccess(user.uid, user.displayName || 'مستثمر جديد', 'ر.س');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/operation-not-allowed') {
        setError(
          <div className="space-y-1.5 leading-relaxed">
            <p className="font-extrabold text-red-400 text-right">⚠️ تسجيل الدخول باستخدام Google غير مفعّل في منصة Firebase لهذا المشروع.</p>
            <p className="font-normal text-slate-300 text-right text-[11px]">لتفعيله: يرجى الانتقال إلى وحدة تحكم Firebase (Firebase Console) والدخول إلى قسم Authentication ثم تبويب Sign-in method وقم بتمكين موفر Google.</p>
            <a 
              href="https://console.firebase.google.com/project/gen-lang-client-0759922046/authentication/providers" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline font-extrabold mt-1 text-[11px]"
            >
              افتح إعدادات تسجيل الدخول في Firebase ➔
            </a>
          </div>
        );
      } else {
        setError('فشل تسجيل الدخول باستخدام حساب Google. يرجى المحاولة لاحقاً.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to validate input
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setVerificationNotice('');
    setIsLoading(true);

    try {
      // 1. Resolve email and username
      let targetEmail = '';
      if (authMethod === 'email') {
        if (!email.includes('@')) {
          setError('يرجى إدخال بريد إلكتروني صالح.');
          setIsLoading(false);
          return;
        }
        targetEmail = email.trim();
      } else {
        // Phone login mapping to custom email
        const cleanPhone = phone.replace(/\s+/g, '').replace(/[^0-9+]/g, '');
        if (cleanPhone.length < 9) {
          setError('يرجى إدخال رقم هاتف صالح (على الأقل 9 أرقام).');
          setIsLoading(false);
          return;
        }
        targetEmail = `${cleanPhone}@phone.malyah.com`;
      }

      if (password.length < 6) {
        setError('يجب أن تتكون كلمة المرور من 6 خانات على الأقل.');
        setIsLoading(false);
        return;
      }

      if (isLogin) {
        // Standard Sign-In
        const userCredential = await signInWithEmailAndPassword(auth, targetEmail, password);
        const user = userCredential.user;

        if (requiresEmailVerification(authMethod, user.emailVerified)) {
          await signOut(auth);
          setPendingVerificationEmail(user.email || targetEmail);
          setVerificationNotice('لم يتم تأكيد البريد الإلكتروني بعد. افتح رسالة التحقق ثم تحقق من الحالة.');
          return;
        }

        onAuthSuccess(
          user.uid,
          user.displayName || fullName || 'مستخدم',
          currency
        );
      } else {
        // Standard Sign-Up
        if (!fullName.trim()) {
          setError('الرجاء إدخال اسمك الكامل.');
          setIsLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, password);
        const user = userCredential.user;

        // Update display name in Firebase Auth
        await updateProfile(user, { displayName: fullName.trim() });

        // Save User Profile in Firestore
        const newProfile = {
          userId: user.uid,
          displayName: fullName.trim(),
          email: authMethod === 'email' ? email.trim() : undefined,
          phoneNumber: authMethod === 'phone' ? phone.trim() : undefined,
          currency: currency,
          createdAt: new Date().toISOString()
        };

        await runWithFirebaseSessionRecovery(user, () => saveUserProfile(newProfile));

        if (authMethod === 'email') {
          await sendEmailVerification(user);
          await signOut(auth);
          setPendingVerificationEmail(user.email || targetEmail);
          setVerificationNotice('أرسلنا رسالة التأكيد. افتح الرابط الوارد فيها لإكمال الدخول.');
          return;
        }

        onAuthSuccess(user.uid, newProfile.displayName, newProfile.currency);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('بيانات الدخول غير صحيحة. يرجى التحقق من البريد أو رقم الهاتف وكلمة المرور.');
      } else if (err.code === 'auth/email-already-in-use') {
        if (authMethod === 'email') {
          setError('البريد الإلكتروني مستخدم بالفعل! البريد الإلكتروني الذي أدخلته مسجل لحساب آخر مسبقاً. يرجى استخدام بريد إلكتروني جديد أو تسجيل الدخول.');
        } else {
          setError('رقم الهاتف مستخدم بالفعل! رقم الهاتف الذي أدخلته مسجل لحساب آخر مسبقاً. يرجى استخدام رقم هاتف جديد أو تسجيل الدخول.');
        }
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(
          <div className="space-y-1.5 leading-relaxed">
            <p className="font-extrabold text-red-400 text-right">⚠️ طريقة تسجيل الدخول هذه (البريد وكلمة المرور) غير مفعلة حالياً في مشروع Firebase الخاص بك.</p>
            <p className="font-normal text-slate-300 text-right text-[11px]">لتفعيلها: يرجى الانتقال إلى وحدة تحكم Firebase (Firebase Console) والدخول إلى قسم Authentication ثم تبويب Sign-in method وقم بتمكين (Enable) خيار Email/Password ثم حفظ التغييرات.</p>
            <a 
              href="https://console.firebase.google.com/project/gen-lang-client-0759922046/authentication/providers" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 underline font-extrabold mt-1 text-[11px]"
            >
              افتح إعدادات تسجيل الدخول في Firebase ➔
            </a>
          </div>
        );
      } else {
        setError(err.message || 'حدث خطأ غير متوقع أثناء المعالجة، يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (pendingVerificationEmail) {
    return (
      <EmailVerificationNotice
        email={pendingVerificationEmail}
        feedback={verificationNotice}
        error={verificationError}
        busyAction={verificationAction}
        onResend={() => { void handleResendVerification(); }}
        onCheckStatus={() => { void handleVerificationCheck(); }}
        onBackToLogin={returnToLogin}
      />
    );
  }

  return (
    <div className="auth-vault-background min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-sans" id="auth-viewport">
      {/* Visual background flares */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl animate-pulse motion-reduce:animate-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-700 motion-reduce:animate-none"></div>

      <div className="auth-vault-card w-full max-w-md border border-sky-100/10 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 space-y-6" id="auth-card">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3.5 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl text-white shadow-lg shadow-sky-500/25 ring-1 ring-inset ring-white/20">
            <Coins className="w-8 h-8" />
          </div>
          <h1 className="auth-wordmark text-xl md:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
            ديوني وميزانيتي <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full font-black">برو</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            خزينة مالية ذكية لإدارة التزاماتك ومشاريعك بثقة
          </p>
        </div>

        {/* Tabs for Login vs Signup */}
        <div className="flex bg-[#070b15]/80 p-1 rounded-xl border border-slate-700/80 shadow-inner shadow-black/20">
          <button
            onClick={() => { setIsLogin(true); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              isLogin 
                ? 'bg-sky-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            تسجيل الدخول
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              !isLogin 
                ? 'bg-sky-600 text-white shadow-md' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            حساب جديد
          </button>
        </div>

        {/* Tab content / Methods Selector */}
        <div className="flex justify-center gap-6 border-b border-slate-800 pb-2">
          <button
            onClick={() => { setAuthMethod('email'); setError(''); }}
            className={`pb-2 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              authMethod === 'email' 
                ? 'border-b-2 border-sky-500 text-sky-400' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>البريد الإلكتروني</span>
          </button>
          <button
            onClick={() => { setAuthMethod('phone'); setError(''); }}
            className={`pb-2 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              authMethod === 'phone' 
                ? 'border-b-2 border-sky-500 text-sky-400' 
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>رقم الهاتف</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" id="auth-credentials-form">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-900 text-red-400 rounded-xl text-xs flex gap-2 items-start font-bold" id="auth-error-alert">
              <AlertCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {verificationNotice && (
            <div className="space-y-3 rounded-xl border border-sky-400/25 bg-sky-500/10 p-3 text-right text-xs font-bold leading-relaxed text-sky-100" role="status" aria-live="polite" id="auth-verification-notice">
              <p>{verificationNotice}</p>
              {authMethod === 'email' && (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification || isLoading}
                  className="inline-flex items-center gap-1.5 text-[11px] font-black text-sky-300 underline decoration-sky-400/60 underline-offset-4 hover:text-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isResendingVerification ? <Loader2 className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Mail className="h-3.5 w-3.5" aria-hidden="true" />}
                  إعادة إرسال رسالة التحقق
                </button>
              )}
            </div>
          )}

          {/* Full Name for signup */}
          {!isLogin && (
            <div className="space-y-1">
              <label htmlFor="auth-fullname" className="block text-xs font-black text-slate-300 text-right">الاسم الكامل</label>
              <div className="relative">
                <input
                  id="auth-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full text-right pr-10 pl-4 py-3 bg-[#090f1d] border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 text-white text-base font-extrabold tracking-wide placeholder-slate-500"
                  placeholder="مثال: أحمد العبدالله"
                />
                <UserIcon className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>
          )}

          {/* Email or Phone */}
          {authMethod === 'email' ? (
            <div className="space-y-1">
              <label htmlFor="auth-email" className="block text-xs font-black text-slate-300 text-right">البريد الإلكتروني</label>
              <div className="relative">
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-left pr-4 pl-10 py-3 bg-[#090f1d] border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 text-white text-base font-extrabold tracking-wide placeholder-slate-500"
                  placeholder="name@example.com"
                />
                <Mail className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="auth-phone" className="block text-xs font-black text-slate-300 text-right">رقم الهاتف</label>
              <div className="relative">
                <input
                  id="auth-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-left pr-4 pl-10 py-3 bg-[#090f1d] border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 text-white text-base font-extrabold tracking-wide placeholder-slate-500"
                  placeholder="05xxxxxxxx"
                />
                <Phone className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
              </div>
            </div>
          )}

          {/* Password */}
          <div className="space-y-1">
            <label htmlFor="auth-password" className="block text-xs font-black text-slate-300 text-right">كلمة المرور</label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-left pr-4 pl-10 py-3 bg-[#090f1d] border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 text-white text-base font-extrabold tracking-wide placeholder-slate-500"
                placeholder="••••••••"
              />
              <Lock className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className="absolute left-3 top-3.5 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
          </div>

          {/* Currency setting for signup */}
          {!isLogin && (
            <div className="space-y-1">
              <label htmlFor="auth-currency" className="block text-xs font-black text-slate-300 text-right">العملة المفضلة</label>
              <select
                id="auth-currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-right px-3 py-3 bg-[#090f1d] border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-400 text-white text-sm font-extrabold"
              >
                <option value="ر.س">ريال سعودي (ر.س)</option>
                <option value="د.إ">درهم إماراتي (د.إ)</option>
                <option value="د.ك">دينار كويتي (د.ك)</option>
                <option value="د.ب">دينار بحريني (د.ب)</option>
                <option value="ر.ع">ريال عماني (ر.ع)</option>
                <option value="ر.ق">ريال قطري (ر.ق)</option>
                <option value="د.أ">دينار أردني (د.أ)</option>
                <option value="د.ع">دينار عراقي (د.ع)</option>
                <option value="$">دولار أمريكي ($)</option>
                <option value="€">يورو (€)</option>
              </select>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-sky-600/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
            ) : (
              <span>{isLogin ? 'تسجيل الدخول' : 'تأكيد إنشاء الحساب'}</span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2 text-slate-600 text-[10px] font-bold">
          <div className="h-px bg-slate-800 flex-1"></div>
          <span>أو الدخول الآمن بلمسة</span>
          <div className="h-px bg-slate-800 flex-1"></div>
        </div>

        {/* Google sign-in alternative */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-[#070b15] hover:bg-slate-900 text-slate-300 border border-slate-800 py-3 px-4 rounded-xl font-extrabold text-xs transition-all disabled:opacity-50 cursor-pointer"
        >
          <svg className="w-4.5 h-4.5" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
          </svg>
          <span>تسجيل الدخول باستخدام Google</span>
        </button>

        <div className="vault-trust-strip text-center font-bold text-[10px] space-y-2 pt-3" id="auth-encryption-badge">
          <p className="flex items-center justify-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
            خصوصيتك وبياناتك المالية في مساحة محمية
          </p>
          <p>🛡️ جميع اتصالاتك وبياناتك مشفرة بالكامل عبر بروتوكول SSL آمن.</p>
          <div className="text-slate-400 text-[10px] font-bold">
            <p>تطوير وبرمجة النظام: <span className="text-sky-400">حسن الشمري</span></p>
            <p className="font-mono text-[9px] mt-0.5 text-slate-500">📱 الدعم الفني: 07812149176</p>
          </div>
        </div>
      </div>
    </div>
  );
}
