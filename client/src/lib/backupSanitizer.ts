import type { FinancialAttachment } from '../types';

/**
 * تجريد النسخ الاحتياطية من مفاتيح الوصول إلى الملفات.
 *
 * `storageDownloadToken` مفتاح حامل دائم لكائن Firebase Storage: من يملك الرابط
 * يفتح الفاتورة بلا أي مصادقة، وهو يتجاوز قواعد التخزين بحكم تصميم Firebase.
 * وكانت النسخ الاحتياطية — المحلية وتلك المرفوعة إلى Google Drive — تحمله لأن
 * حمولة التصدير تضم الديون والمصروفات بمرفقاتها، فيصبح ملف نسخة مسرَّب وصولاً
 * دائماً إلى كل مستندات المستخدم المالية.
 *
 * نُبقي على البيانات الوصفية (الاسم والحجم والنوع وحالة المراجعة) لأنها جزء من
 * السجل المالي، ونحذف ما يفتح الملف: المفتاح ومسار التخزين.
 */
export function sanitizeAttachmentForExport(attachment: FinancialAttachment): FinancialAttachment {
  const { storageDownloadToken: _token, storageKey: _key, ...safe } = attachment;
  return safe;
}

export function sanitizeAttachmentsForExport(
  attachments: FinancialAttachment[] | undefined,
): FinancialAttachment[] | undefined {
  return attachments?.map(sanitizeAttachmentForExport);
}

/** يطبّق التجريد على أي سجل مالي قد يحمل مرفقات. */
export function sanitizeRecordForExport<T extends { attachments?: FinancialAttachment[] }>(record: T): T {
  if (!record.attachments) return record;
  return { ...record, attachments: sanitizeAttachmentsForExport(record.attachments) };
}

export function sanitizeRecordsForExport<T extends { attachments?: FinancialAttachment[] }>(records: T[]): T[] {
  return records.map(sanitizeRecordForExport);
}
