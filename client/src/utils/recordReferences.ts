type ReferenceRecord = { id: string; referenceNumber?: string };

export type ReferencePrefix = 'DBT' | 'INV';

const REFERENCE_LABELS: Record<ReferencePrefix, string> = {
  DBT: 'د',
  INV: 'ف',
};

export function createNextReferenceNumber(
  records: ReferenceRecord[],
  prefix: ReferencePrefix,
  date: string,
): string {
  const year = /^\d{4}/.test(date) ? date.slice(0, 4) : new Date().getFullYear().toString();
  const matcher = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const highestSequence = records.reduce((highest, record) => {
    const match = record.referenceNumber?.match(matcher);
    const sequence = match ? Number(match[1]) : 0;
    return Number.isSafeInteger(sequence) ? Math.max(highest, sequence) : highest;
  }, 0);

  return `${prefix}-${year}-${String(highestSequence + 1).padStart(4, '0')}`;
}

/** مرجع عرض ثابت للسجلات التي كانت موجودة قبل ميزة الترقيم. */
export function getDisplayReferenceNumber(record: ReferenceRecord, prefix: ReferencePrefix): string {
  if (record.referenceNumber) return record.referenceNumber;
  const stableId = record.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'قديم';
  return `${prefix}-ARCH-${stableId}`;
}

export function getArabicReferenceLabel(referenceNumber: string): string {
  const prefix = referenceNumber.startsWith('INV-') ? 'INV' : 'DBT';
  return `${REFERENCE_LABELS[prefix]}#${referenceNumber}`;
}

/**
 * يطبع إدخال البحث ومرجع السجل للمقارنة دون تأثر بحالة الأحرف أو الفواصل.
 * يقبل أيضاً صيغة العرض العربية مثل «د#DBT-2026-0001» و«ف#INV-2026-0001».
 */
function normalizeReferenceSearchValue(value: string): string {
  return value
    .trim()
    .replace(/^[دف]\s*#?\s*/, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/** يطابق الرقم المرجعي، بما في ذلك المرجع الأرشيفي الثابت للسجلات القديمة. */
export function matchesReferenceSearch(
  record: ReferenceRecord,
  prefix: ReferencePrefix,
  searchTerm: string,
): boolean {
  const normalizedTerm = normalizeReferenceSearchValue(searchTerm);
  if (!normalizedTerm) return false;

  const normalizedReference = normalizeReferenceSearchValue(getDisplayReferenceNumber(record, prefix));
  return normalizedReference.includes(normalizedTerm);
}

export type ClipboardWriter = Pick<Clipboard, 'writeText'>;

/**
 * ينسخ الرقم الخام القابل للبحث، ويرجع false بدلاً من رمي استثناء إن كانت
 * صلاحية الحافظة غير متاحة أو رفضها المتصفح.
 */
export async function copyReferenceNumber(
  referenceNumber: string,
  clipboardWriter?: ClipboardWriter | null,
): Promise<boolean> {
  const value = referenceNumber.trim();
  if (!value) return false;

  const clipboard = clipboardWriter ?? (typeof navigator !== 'undefined' ? navigator.clipboard : undefined);
  if (!clipboard?.writeText) return false;

  try {
    await clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}
