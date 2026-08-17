import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { buildAttachmentStoragePath, createAttachmentPreviewHandler, createAttachmentUploadHandler, readAttachmentRecordFromFirestore, validateAttachmentUpload } from './attachments.js';

describe('attachment upload validation', () => {
  const validPayload = {
    dataUrl: 'data:application/pdf;base64,SGVsbG8=',
    name: 'receipt august.pdf',
    recordType: 'expense' as const,
    recordId: 'expense_2026_0001',
  };

  it('accepts a supported attachment and creates a safe storage name', () => {
    const result = validateAttachmentUpload(validPayload);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mimeType).toBe('application/pdf');
      expect(result.safeName).toBe('receipt_august.pdf');
      expect(result.recordType).toBe('expense');
    }
  });

  it('rejects unsupported file types and malformed record references', () => {
    expect(validateAttachmentUpload({ ...validPayload, dataUrl: 'data:text/plain;base64,SGVsbG8=' })).toMatchObject({ ok: false, error: expect.stringContaining('الصيغة') });
    expect(validateAttachmentUpload({ ...validPayload, recordId: '../other-user' })).toMatchObject({ ok: false, error: expect.stringContaining('مرجع السجل') });
  });

  it('rejects malformed data URLs before storage is attempted', () => {
    expect(validateAttachmentUpload({ ...validPayload, dataUrl: 'not-a-data-url' })).toMatchObject({ ok: false, error: expect.stringContaining('الصيغة') });
  });

  it('builds storage paths from the authenticated owner rather than client-controlled input', () => {
    expect(buildAttachmentStoragePath('owner-A', 'expense', 'expense_2026_0001', 'receipt.pdf')).toBe('financial-attachments/owner-A/expense/expense_2026_0001/receipt.pdf');
    expect(buildAttachmentStoragePath('owner/A', 'debt', 'debt_2026_0001', 'receipt.pdf')).toContain('owner%2FA');
  });

  it('blocks unauthenticated uploads and does not call storage', async () => {
    const put = vi.fn();
    const handler = createAttachmentUploadHandler({ getUid: async () => null, put });
    const status = vi.fn().mockReturnThis();
    const json = vi.fn();

    await handler({ body: validPayload } as Request, { status, json } as unknown as Response);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith({ error: 'يجب تسجيل الدخول قبل رفع مرفق.' });
    expect(put).not.toHaveBeenCalled();
  });

  it('stores an authenticated owner attachment only in that owner path and generates a default attachment ID', async () => {
    const put = vi.fn().mockResolvedValue({ key: 'financial-attachments/owner-A/expense/expense_2026_0001/receipt_august_123.pdf', url: '/manus-storage/owner-a-receipt' });
    const handler = createAttachmentUploadHandler({ getUid: async () => 'owner-A', put, now: () => new Date('2026-08-14T12:00:00.000Z') });
    const json = vi.fn();

    await handler({ body: validPayload } as Request, { status: vi.fn().mockReturnThis(), json } as unknown as Response);

    expect(put).toHaveBeenCalledWith('financial-attachments/owner-A/expense/expense_2026_0001/receipt_august.pdf', expect.any(Buffer), 'application/pdf');
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String), url: expect.stringContaining('/api/attachments/preview?'), storageKey: 'financial-attachments/owner-A/expense/expense_2026_0001/receipt_august_123.pdf' }));
  });

  it('preserves a Firebase download token only when the storage writer returns one', async () => {
    const put = vi.fn().mockResolvedValue({ key: 'financial-attachments/owner-A/expense/expense_2026_0001/receipt.pdf', url: 'https://storage.example/receipt', downloadToken: '12345678-1234-1234-1234-123456789abc' });
    const handler = createAttachmentUploadHandler({ getUid: async () => 'owner-A', put, createId: () => 'att-123' });
    const json = vi.fn();

    await handler({ body: validPayload } as Request, { status: vi.fn().mockReturnThis(), json } as unknown as Response);

    expect(json).toHaveBeenCalledWith(expect.objectContaining({ id: 'att-123', storageDownloadToken: '12345678-1234-1234-1234-123456789abc' }));
  });
});

describe('attachment preview access', () => {
  const previewQuery = { ownerUid: 'owner-123', recordType: 'debt', recordId: 'debt_2026_0001', attachmentId: 'att-001' };
  const response = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });

  it('rejects a preview request without a verified Firebase identity', async () => {
    const signUrl = vi.fn();
    const handler = createAttachmentPreviewHandler({ getIdentity: async () => null, signUrl });
    const res = response();

    await handler({ query: previewQuery } as unknown as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(signUrl).not.toHaveBeenCalled();
  });

  it('does not sign a URL when the caller cannot read the requested owner record', async () => {
    const readRecord = vi.fn().mockResolvedValue(null);
    const signUrl = vi.fn();
    const handler = createAttachmentPreviewHandler({ getIdentity: async () => ({ uid: 'other-user', idToken: 'token' }), readRecord, signUrl });
    const res = response();

    await handler({ query: previewQuery } as unknown as Request, res as unknown as Response);

    expect(readRecord).toHaveBeenCalledWith({ uid: 'other-user', idToken: 'token' }, 'owner-123', 'debt', 'debt_2026_0001');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(signUrl).not.toHaveBeenCalled();
  });

  it('blocks another authenticated user who guesses a real owner record ID and its attachment reference', async () => {
    const firestoreFetch = vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 }));
    vi.stubGlobal('fetch', firestoreFetch);
    const signUrl = vi.fn();
    const handler = createAttachmentPreviewHandler({
      getIdentity: async () => ({ uid: 'intruder-456', idToken: 'intruder-id-token' }),
      readRecord: readAttachmentRecordFromFirestore,
      signUrl,
    });
    const res = response();

    try {
      await handler({ query: previewQuery } as unknown as Request, res as unknown as Response);

      expect(firestoreFetch).toHaveBeenCalledWith(
        expect.stringContaining('/documents/users/owner-123/debts/debt_2026_0001'),
        { headers: { Authorization: 'Bearer intruder-id-token' } },
      );
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'المرفق غير موجود أو لا تملك صلاحية الوصول إليه.' });
      expect(signUrl).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects an attachment whose storage key does not belong to the requested record', async () => {
    const signUrl = vi.fn();
    const handler = createAttachmentPreviewHandler({
      getIdentity: async () => ({ uid: 'owner-123', idToken: 'token' }),
      readRecord: async () => ({ userId: 'owner-123', attachments: [{ id: 'att-001', storageKey: 'financial-attachments/owner-123/expense/expense_2026_0001/other.pdf' }] }),
      signUrl,
    });
    const res = response();

    await handler({ query: previewQuery } as unknown as Request, res as unknown as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(signUrl).not.toHaveBeenCalled();
  });

  it('returns a signed URL only for an attachment listed on the authorised record', async () => {
    const signUrl = vi.fn().mockResolvedValue('https://signed.example/receipt');
    const handler = createAttachmentPreviewHandler({
      getIdentity: async () => ({ uid: 'owner-123', idToken: 'token' }),
      readRecord: async () => ({ userId: 'owner-123', attachments: [{ id: 'att-001', storageKey: 'financial-attachments/owner-123/debt/debt_2026_0001/receipt_123.pdf' }] }),
      signUrl,
    });
    const res = response();

    await handler({ query: previewQuery } as unknown as Request, res as unknown as Response);

    expect(signUrl).toHaveBeenCalledWith('financial-attachments/owner-123/debt/debt_2026_0001/receipt_123.pdf');
    expect(res.json).toHaveBeenCalledWith({ url: 'https://signed.example/receipt' });
  });

  it('returns a Firebase download URL only after record ownership is verified', async () => {
    const signUrl = vi.fn();
    const handler = createAttachmentPreviewHandler({
      getIdentity: async () => ({ uid: 'owner-123', idToken: 'token' }),
      readRecord: async () => ({ userId: 'owner-123', attachments: [{ id: 'att-001', storageKey: 'financial-attachments/owner-123/debt/debt_2026_0001/receipt.pdf', storageDownloadToken: '12345678-1234-1234-1234-123456789abc' }] }),
      signUrl,
    });
    const res = response();

    await handler({ query: previewQuery } as unknown as Request, res as unknown as Response);

    expect(res.json).toHaveBeenCalledWith({ url: expect.stringContaining('firebasestorage.googleapis.com'), requiresAuthorization: true });
    expect(signUrl).not.toHaveBeenCalled();
  });

  it('returns a safe 404 without a URL when the authorised record points to a missing storage object', async () => {
    const signUrl = vi.fn().mockRejectedValue(new Error('Storage signed URL failed (404): object not found'));
    const handler = createAttachmentPreviewHandler({
      getIdentity: async () => ({ uid: 'owner-123', idToken: 'token' }),
      readRecord: async () => ({
        userId: 'owner-123',
        attachments: [{ id: 'att-001', storageKey: 'financial-attachments/owner-123/debt/debt_2026_0001/expired-receipt.pdf' }],
      }),
      signUrl,
    });
    const res = response();

    await handler({ query: previewQuery } as unknown as Request, res as unknown as Response);

    expect(signUrl).toHaveBeenCalledOnce();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'المرفق غير موجود أو لا تملك صلاحية الوصول إليه.' });
  });
});
