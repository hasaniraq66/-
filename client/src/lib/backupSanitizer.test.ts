import { describe, expect, it } from 'vitest';
import type { FinancialAttachment } from '../types';
import {
  sanitizeAttachmentForExport,
  sanitizeRecordsForExport,
} from './backupSanitizer';

const attachment: FinancialAttachment = {
  id: 'att1',
  name: 'فاتورة.pdf',
  url: '/api/attachments/preview?attachmentId=att1',
  storageKey: 'financial-attachments/uid/debt/d1/فاتورة.pdf',
  storageDownloadToken: '7d0f1e2a-3b4c-5d6e-7f80-91a2b3c4d5e6',
  mimeType: 'application/pdf',
  size: 1234,
  uploadedAt: '2026-01-01T00:00:00.000Z',
  reviewStatus: 'pending_review',
};

describe('sanitizeAttachmentForExport', () => {
  it('يحذف مفتاح التنزيل ومسار التخزين', () => {
    const safe = sanitizeAttachmentForExport(attachment);
    expect(safe).not.toHaveProperty('storageDownloadToken');
    expect(safe).not.toHaveProperty('storageKey');
  });

  it('يبقي البيانات الوصفية التي يحتاجها السجل المالي', () => {
    expect(sanitizeAttachmentForExport(attachment)).toMatchObject({
      id: 'att1',
      name: 'فاتورة.pdf',
      mimeType: 'application/pdf',
      size: 1234,
      reviewStatus: 'pending_review',
    });
  });

  it('لا يعدّل الكائن الأصلي', () => {
    sanitizeAttachmentForExport(attachment);
    expect(attachment.storageDownloadToken).toBe('7d0f1e2a-3b4c-5d6e-7f80-91a2b3c4d5e6');
  });
});

describe('sanitizeRecordsForExport', () => {
  it('يجرّد مرفقات كل السجلات', () => {
    const records = [{ id: 'd1', attachments: [attachment] }];
    const [safe] = sanitizeRecordsForExport(records);
    expect(safe.attachments?.[0]).not.toHaveProperty('storageDownloadToken');
  });

  it('يمرّ على السجلات بلا مرفقات كما هي', () => {
    const records = [{ id: 'd2' }];
    expect(sanitizeRecordsForExport(records)).toEqual([{ id: 'd2' }]);
  });

  it('لا يفقد أي سجل', () => {
    const records = [{ id: 'a', attachments: [attachment] }, { id: 'b' }];
    expect(sanitizeRecordsForExport(records)).toHaveLength(2);
  });
});
