import type { UserProfile } from '../types';

/**
 * متى يُكتب الملف الشخصي؟
 *
 * كان الحفظ يجري بمجرد انتهاء التحميل: `if (currentUser && !isAuthLoading)`.
 * وهذا يكتب حتى حين يُخفق التحميل — والاسم وقتها ما زال على قيمته الافتراضية
 * «مستخدم جديد»، فتُكتب فوق الاسم الحقيقي في Firestore. مهلةٌ واحدة على شبكة
 * بطيئة عند فتح التطبيق تكفي لمحو الاسم، ثم يظهر عند كل فتح لاحق بالافتراضي.
 *
 * الشرط الصحيح: لا يُكتب شيء ما لم يكن هناك ملفٌ محمَّل فعلاً نقارن به،
 * ولا يُكتب إلا إذا تغيّر شيء. فالكتابة بلا تغيير تستهلك حصة Firestore وتصدم
 * createdAt عند كل إقلاع.
 */
export function shouldPersistProfile(
  loaded: UserProfile | null,
  userName: string,
  currency: string,
): boolean {
  if (!loaded) return false;
  return loaded.displayName !== userName || loaded.currency !== currency;
}

/**
 * يبني الملف المحدَّث محافظاً على كل حقل لم يُقصد تغييره — createdAt وadminId
 * وallowedTabs وغيرها. الصيغة السابقة كانت تبني كائناً جديداً من أربعة حقول،
 * فتُصفّر createdAt إلى «الآن» عند كل حفظ.
 */
export function nextProfile(
  loaded: UserProfile,
  userId: string,
  userName: string,
  currency: string,
): UserProfile {
  return { ...loaded, userId, displayName: userName, currency };
}
