import { describe, expect, it } from 'vitest';
import type { Request, Response } from 'express';
import { createAttachmentReviewHandler } from './attachments.js';

function createResponse() {
  let statusCode = 200;
  let payload: unknown;
  const response = {
    status: (code: number) => { statusCode = code; return response; },
    json: (body: unknown) => { payload = body; return response; },
  };
  return { response: response as unknown as Response, result: () => ({ statusCode, payload }) };
}

const attachment = { id: 'attachment-001', name: 'receipt.png', url: '/preview', mimeType: 'image/png' as const, size: 42, uploadedAt: '2026-08-14T00:00:00.000Z' };

describe('attachment review API', () => {
  it('derives reviewer identity on the server and persists an attributable status event', async () => {
    let writtenAttachments: unknown[] = [];
    const handler = createAttachmentReviewHandler({
      getIdentity: async () => ({ uid: 'assistant-uid', idToken: 'token', displayName: 'مساعد المراجعة', email: 'assistant@example.com' }),
      readRecord: async () => ({ userId: 'owner-uid', attachments: [attachment] }),
      writeAttachments: async (_identity, _owner, _type, _record, attachments) => { writtenAttachments = attachments; },
      now: () => new Date('2026-08-14T12:30:45.678Z'),
    });
    const output = createResponse();

    await handler({ body: { ownerUid: 'owner-uid', recordType: 'debt', recordId: 'debt-001', attachmentId: 'attachment-001', reviewStatus: 'reviewed' } } as Request, output.response);

    expect(output.result().statusCode).toBe(200);
    expect(writtenAttachments[0]).toMatchObject({ reviewStatus: 'reviewed', reviewAuditLog: [{ action: 'status_changed', occurredAt: '2026-08-14T12:30:45.678Z', reviewer: { uid: 'assistant-uid', displayName: 'مساعد المراجعة' } }] });
  });

  it('does not write an audit event when the requested attachment is absent from the authorized record', async () => {
    let wrote = false;
    const handler = createAttachmentReviewHandler({
      getIdentity: async () => ({ uid: 'assistant-uid', idToken: 'token' }),
      readRecord: async () => ({ userId: 'owner-uid', attachments: [attachment] }),
      writeAttachments: async () => { wrote = true; },
    });
    const output = createResponse();

    await handler({ body: { ownerUid: 'owner-uid', recordType: 'expense', recordId: 'expense-001', attachmentId: 'attachment-other', reviewStatus: 'reviewed' } } as Request, output.response);

    expect(output.result().statusCode).toBe(404);
    expect(wrote).toBe(false);
  });

  it('rejects an unauthenticated review request before reading or writing an attachment record', async () => {
    let read = false;
    let wrote = false;
    const handler = createAttachmentReviewHandler({
      getIdentity: async () => null,
      readRecord: async () => { read = true; return null; },
      writeAttachments: async () => { wrote = true; },
    });
    const output = createResponse();

    await handler({ body: { ownerUid: 'owner-uid', recordType: 'debt', recordId: 'debt-001', attachmentId: 'attachment-001', reviewStatus: 'reviewed' } } as Request, output.response);

    expect(output.result().statusCode).toBe(401);
    expect(read).toBe(false);
    expect(wrote).toBe(false);
  });

  it('prevents a different user from creating an audit event for an owner record that Firestore denies', async () => {
    let wrote = false;
    const handler = createAttachmentReviewHandler({
      getIdentity: async () => ({ uid: 'attacker-uid', idToken: 'attacker-token', email: 'attacker@example.com' }),
      readRecord: async (identity, ownerUid) => identity.uid === ownerUid ? { userId: ownerUid, attachments: [attachment] } : null,
      writeAttachments: async () => { wrote = true; },
    });
    const output = createResponse();

    await handler({ body: { ownerUid: 'owner-uid', recordType: 'debt', recordId: 'debt-001', attachmentId: 'attachment-001', reviewStatus: 'reviewed' } } as Request, output.response);

    expect(output.result().statusCode).toBe(404);
    expect(wrote).toBe(false);
  });
});
