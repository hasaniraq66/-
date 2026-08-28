/**
 * رمز قفل التطبيق: تخزين ومطابقة.
 *
 * كان الرمز يُحفظ نصاً صريحاً في `localStorage['app_pin_code']` ويُقارَن
 * مباشرةً، أي أن سطراً واحداً في وحدة تحكم المتصفح يكشفه:
 *
 *     localStorage.getItem('app_pin_code')
 *
 * وكان يُمرَّر أيضاً كخاصية إلى شاشة القفل، فيظهر في شجرة React لمن يفتح
 * أدوات المطوّر. القفل الذي يُقرأ رمزه ليس قفلاً.
 *
 * الآن يُحفظ تلبيح (hash) للرمز مع ملح عشوائي لكل تثبيت، فلا يبقى الرمز
 * نفسه على القرص، ولا تملك الواجهة نسخة منه أصلاً — تتحقق عبر دالة لا عبر
 * مقارنة نصية.
 */

const LEGACY_PIN_KEY = 'app_pin_code';
const SALT_KEY = 'app_pin_salt';
const HASH_KEY = 'app_pin_hash';

export const PIN_LENGTH = 4;

export function isValidPinFormat(pin: string): boolean {
  return new RegExp(`^\\d{${PIN_LENGTH}}$`).test(pin);
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function createSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  return toHex(await crypto.subtle.digest('SHA-256', data));
}

/**
 * المقارنة بزمن ثابت. الفارق الزمني هنا ضئيل عملياً لأن الطرفين تلبيحان
 * بطول واحد، لكن المقارنة القصيرة عادة سيئة يُستحسن ألا تُكتب أصلاً.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function setPin(pin: string): Promise<void> {
  const salt = createSalt();
  localStorage.setItem(SALT_KEY, salt);
  localStorage.setItem(HASH_KEY, await hashPin(pin, salt));
  localStorage.removeItem(LEGACY_PIN_KEY);
}

export function clearPin(): void {
  localStorage.removeItem(SALT_KEY);
  localStorage.removeItem(HASH_KEY);
  localStorage.removeItem(LEGACY_PIN_KEY);
}

export function hasPin(): boolean {
  return Boolean(localStorage.getItem(HASH_KEY)) || isValidPinFormat(localStorage.getItem(LEGACY_PIN_KEY) ?? '');
}

/**
 * ترحيل التثبيتات القائمة: من كان رمزه محفوظاً نصاً صريحاً يُحوَّل إلى تلبيح
 * من دون أن يُطلب منه شيء، ويبقى الرمز نفسه صالحاً عند الإدخال.
 */
export async function migrateLegacyPin(): Promise<boolean> {
  const legacy = localStorage.getItem(LEGACY_PIN_KEY);
  if (!legacy || !isValidPinFormat(legacy)) {
    if (legacy !== null) localStorage.removeItem(LEGACY_PIN_KEY);
    return false;
  }
  await setPin(legacy);
  return true;
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = localStorage.getItem(SALT_KEY);
  const stored = localStorage.getItem(HASH_KEY);
  if (salt && stored) return safeEqual(await hashPin(pin, salt), stored);

  // لم يجرِ الترحيل بعد (أول إقلاع بعد التحديث): طابق ثم رحّل فوراً.
  const legacy = localStorage.getItem(LEGACY_PIN_KEY);
  if (legacy && isValidPinFormat(legacy) && safeEqual(pin, legacy)) {
    await setPin(pin);
    return true;
  }
  return false;
}
