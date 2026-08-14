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
