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

/**
 * روابط الإعداد بلا معرّف المشروع عمداً.
 *
 * الرسالة تُعرض لكل زائر لا لصاحب التطبيق وحده، ووضع المعرّف في الرابط يكشف
 * اسم مشروع Firebase لأي أحد يفتح شاشة الدخول. وحدة التحكم تفتح آخر مشروع
 * مختار على الصفحة نفسها، فالدقة لا تُفقد — ويُذكر المسار نصاً ليصل صاحب
 * التطبيق إليه بلا تخمين.
 */
const AUTH_SETTINGS_URL = 'https://console.firebase.google.com/';
const PROVIDERS_URL = 'https://console.firebase.google.com/';
const AUDIENCE_URL = 'https://console.cloud.google.com/auth/audience';

/** يستخرج رمز خطأ Firebase من أي شكل قد يصل به. */
export function errorCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

/**
 * هل رفَضت Google الدخول لأن التطبيق ما زال في وضع الاختبار؟
 *
 * الرفض يقع على صفحة Google نفسها (`accounts.google.com`) لا في التطبيق، وقد
 * لا تعود منه إلى Firebase رسالةٌ برمز خاص — فحين يصل نصّه نلتقطه من متنه.
 * `admin_policy_enforced` و`org_internal` رفضان من الجنس نفسه: سياسةٌ تمنع
 * الحساب، لا عطلٌ عابر.
 */
export function isConsentScreenRefusal(error: unknown): boolean {
  const parts: string[] = [];
  if (typeof error === 'string') parts.push(error);
  if (typeof error === 'object' && error !== null) {
    const shaped = error as { message?: unknown; customData?: { message?: unknown } };
    if (typeof shaped.message === 'string') parts.push(shaped.message);
    if (typeof shaped.customData?.message === 'string') parts.push(shaped.customData.message);
  }
  return parts.some((text) =>
    /access_denied|admin_policy_enforced|org_internal/i.test(text),
  );
}

/**
 * وضع الاختبار حالةٌ لا يُصلحها الانتظار ولا إعادة المحاولة: Google تمنع كل
 * حساب خارج قائمة المختبِرين. الخطوتان مذكورتان معاً لأن الأولى دائمة والثانية
 * تفتح الباب لحساب واحد فوراً.
 */
const CONSENT_SCREEN_REFUSAL: GoogleAuthFailure = {
  title: 'Google رفضت الدخول: التطبيق ما زال في وضع الاختبار',
  detail:
    'في وضع الاختبار لا يدخل إلا الحسابات المُدرجة في قائمة المختبِرين. ' +
    'الحل الدائم: نشر التطبيق من صفحة «الجمهور» (Audience) في Google Auth Platform. ' +
    'ولفتح حساب واحد فوراً: أضِف بريده في «مستخدمو الاختبار» بالصفحة نفسها. ' +
    'إعادة المحاولة قبل ذلك لن تُجدي.',
  retryable: false,
  consoleUrl: AUDIENCE_URL,
};

/**
 * @param host اسم النطاق الذي يعمل عليه التطبيق. يُمرَّر بدل قراءة
 *   window.location كي تبقى الدالة قابلة للاختبار، ولأن الرسالة يجب أن تذكر
 *   النطاق الفعلي: الموقع قد يُعيد التوجيه من iqcma.com إلى www.iqcma.com،
 *   والمصرَّح به يجب أن يكون الثاني لا الأول.
 */
export function describeGoogleAuthFailure(error: unknown, host: string): GoogleAuthFailure {
  // يُفحص قبل الرموز: الرفض قد يصل محمولاً على رمز عام مثل auth/internal-error،
  // فالرمز وحده يخفيه ويعطي رسالة «أعد المحاولة» التي لا تنفع هنا أبداً.
  if (isConsentScreenRefusal(error)) return CONSENT_SCREEN_REFUSAL;

  switch (errorCode(error)) {
    case 'auth/unauthorized-domain':
      return {
        title: 'نطاق الموقع غير مُصرَّح به في Firebase',
        detail:
          `أضف «${host}» من Authentication ← Settings ← Authorized domains. ` +
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

    // عادةً انصرافٌ لا إخفاق. لكن رفض وضع الاختبار يصل بهذا الرمز نفسه: الرفض
    // يقع على صفحة Google فلا تعود إلى Firebase إلا أن النافذة أُغلقت. لذلك لا
    // نجزم بأن المستخدم ألغى — الجزم يُلبس عطلاً دائماً ثوب اختيارٍ عابر
    // ويُبقيه يعيد المحاولة بلا طائل.
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return {
        title: 'لم تكتمل عملية الدخول',
        detail:
          'أُغلقت نافذة Google قبل إتمام الدخول. ' +
          'وإن كانت النافذة قد أظهرت «تم حظر إمكانية الوصول» فهذا ليس إلغاءً منك: ' +
          'التطبيق ما زال في وضع الاختبار، ولا تنفع إعادة المحاولة قبل نشره.',
        retryable: true,
        consoleUrl: AUDIENCE_URL,
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

    case 'auth/invalid-credential':
      return {
        title: 'بيانات الاعتماد غير صالحة أو منتهية',
        detail: 'تعذر التحقق من بيانات الدخول بحساب Google أو انتهت صلاحية الجلسة. أعد المحاولة أو سجّل الدخول مجدداً.',
        retryable: true,
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
