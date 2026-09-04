/**
 * ترجمة أخطاء دخول Google إلى سبب ملموس وخطوة قابلة للتنفيذ.
 *
 * الدافع حادثة حقيقية: تعطّل الدخول بـ Google وتعطّل النسخ الاحتياطي معه،
 * وكانت الرسالة «فشل تسجيل الدخول، حاول لاحقاً». والسبب كان أن نطاق الموقع
 * غير مُدرَج في النطاقات المصرَّح بها في Firebase — وهي حالة لا يُصلحها
 * الانتظار أبداً. رسالةٌ تدعو إلى الانتظار حين لا ينفع الانتظار أسوأ من
 * رسالة صامتة: تُنفق وقت المستخدم في لا شيء.
 *
 * الوحدة خالصة (لا تلمس المتصفح) لتُختبر بلا واجهة.
 */

export interface GoogleAuthFailure {
  /** ملخّص يُعرض عريضاً. */
  title: string;
  /** شرح السبب والخطوة التالية. */
  detail: string;
  /** هل الإخفاق عابر فتنفع إعادة المحاولة؟ */
  retryable: boolean;
  /** رابط الإعداد في وحدة تحكم Firebase حين يكون الإصلاح هناك. */
  consoleUrl?: string;
}

const PROJECT_ID = 'gen-lang-client-0759922046';
const AUTH_SETTINGS_URL = `https://console.firebase.google.com/project/${PROJECT_ID}/authentication/settings`;
const PROVIDERS_URL = `https://console.firebase.google.com/project/${PROJECT_ID}/authentication/providers`;

/** يستخرج رمز خطأ Firebase من أي شكل قد يصل به. */
export function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

/**
 * @param host اسم النطاق الذي يعمل عليه التطبيق. يُمرَّر بدل قراءة
 *   window.location كي تبقى الدالة قابلة للاختبار، ولأن الرسالة يجب أن تذكر
 *   النطاق الفعلي: الموقع قد يُعيد التوجيه من iqcma.com إلى www.iqcma.com،
 *   والمصرَّح به يجب أن يكون الثاني لا الأول.
 */
export function describeGoogleAuthFailure(error: unknown, host: string): GoogleAuthFailure {
  switch (errorCode(error)) {
    case 'auth/unauthorized-domain':
      return {
        title: 'نطاق الموقع غير مُصرَّح به في Firebase',
        detail:
          `أضف «${host}» إلى النطاقات المصرَّح بها في إعدادات المصادقة. ` +
          'لاحظ أن النطاق بـ www ونطاقه بدونها يُعامَلان كنطاقين منفصلين، ' +
          'فأضف الذي يظهر في شريط العنوان فعلاً.',
        retryable: false,
        consoleUrl: AUTH_SETTINGS_URL,
      };

    case 'auth/operation-not-allowed':
      return {
        title: 'موفّر Google غير مفعّل في المشروع',
        detail: 'فعّله من Authentication ← Sign-in method ← Google.',
        retryable: false,
        consoleUrl: PROVIDERS_URL,
      };

    case 'auth/popup-blocked':
      return {
        title: 'المتصفح حجب نافذة Google',
        detail: 'اسمح بالنوافذ المنبثقة لهذا الموقع ثم أعد المحاولة.',
        retryable: true,
      };

    // ليس إخفاقاً بل انصراف: المستخدم أغلق النافذة أو بدأ محاولة جديدة.
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        title: 'أُلغيت عملية الدخول',
        detail: 'أُغلقت نافذة Google قبل إتمام الدخول.',
        retryable: true,
      };

    case 'auth/network-request-failed':
      return {
        title: 'تعذّر الاتصال بخوادم Google',
        detail: 'تحقق من الاتصال بالإنترنت ثم أعد المحاولة.',
        retryable: true,
      };

    case 'auth/account-exists-with-different-credential':
      return {
        title: 'البريد مسجَّل بطريقة دخول أخرى',
        detail: 'ادخل بكلمة المرور أولاً، ثم اربط حساب Google من الإعدادات.',
        retryable: false,
      };

    default:
      return {
        title: 'تعذّر تسجيل الدخول بحساب Google',
        detail: 'حدث خطأ غير متوقع. أعد المحاولة، وإن تكرر فراجع إعدادات المصادقة.',
        retryable: true,
      };
  }
}

/** النطاق الفعلي في شريط العنوان، مع بديل آمن خارج المتصفح. */
export function currentHost(): string {
  if (typeof window === 'undefined' || !window.location) return 'النطاق الحالي';
  return window.location.hostname;
}
