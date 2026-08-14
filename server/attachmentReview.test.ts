import { describe, expect, it } from 'vitest';
import type { FinancialAttachment } from '../client/src/types';
import {
  DEFAULT_ATTACHMENT_REVIEW_STATUS,
  describeAttachmentReviewAuditEntry,
  getAttachmentReviewAuditLog,
  getAttachmentReviewSummary,
  getAttachmentReviewStatus,
  MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH,
  updateAttachmentReview,
} from '../client/src/lib/attachmentReview';

const baseAttachment: FinancialAttachment = {
  id: 'attachment-001',
  name: 'receipt.png',
  url: '/api/attachments/preview',
  mimeType: 'image/png',
  size: 42,
  uploadedAt: '2026-08-14T00:00:00.000Z',
};

describe('attachment review workflow', () => {
  it('treats legacy attachments with no review metadata as pending review', () => {
    expect(getAttachmentReviewStatus(baseAttachment)).toBe(DEFAULT_ATTACHMENT_REVIEW_STATUS);
  });

  it('summarizes reviewed and pending attachments for visible UI state indicators', () => {
    const summary = getAttachmentReviewSummary([
      baseAttachment,
      { ...baseAttachment, id: 'attachment-002', reviewStatus: 'reviewed' },
      { ...baseAttachment, id: 'attachment-003', reviewStatus: 'pending_review' },
    ]);

    expect(summary).toEqual({ total: 3, reviewed: 1, pendingReview: 2 });
  });

  it('updates only the selected attachment review status and preserves other metadata', () => {
    const otherAttachment = { ...baseAttachment, id: 'attachment-002', name: 'invoice.pdf', mimeType: 'application/pdf' as const };
    const updated = updateAttachmentReview([baseAttachment, otherAttachment], baseAttachment.id, { reviewStatus: 'reviewed' }, '2026-08-14T10:00:00.000Z');

    expect(updated[0]).toMatchObject({ id: baseAttachment.id, reviewStatus: 'reviewed', reviewUpdatedAt: '2026-08-14T10:00:00.000Z' });
    expect(updated[1]).toEqual(otherAttachment);
  });

  it('trims and limits internal notes without changing a different attachment', () => {
    const otherAttachment = { ...baseAttachment, id: 'attachment-002' };
    const note = `  ${'م'.repeat(MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH + 20)}  `;
    const updated = updateAttachmentReview([baseAttachment, otherAttachment], baseAttachment.id, { internalNote: note }, '2026-08-14T10:05:00.000Z');

    expect(updated[0].internalNote).toHaveLength(MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH);
    expect(updated[0].internalNote).not.toMatch(/^\s|\s$/);
    expect(updated[1]).toEqual(otherAttachment);
  });

  it('leaves the collection unchanged when a caller targets an attachment outside the record', () => {
    const original = [baseAttachment];
    expect(updateAttachmentReview(original, 'attachment-other-owner', { reviewStatus: 'reviewed' })).toEqual(original);
  });

  it('adds a precise, attributable audit event when the review status changes', () => {
    const updated = updateAttachmentReview(
      [baseAttachment],
      baseAttachment.id,
      { reviewStatus: 'reviewed' },
      '2026-08-14T10:10:11.123Z',
      { uid: 'reviewer-001', displayName: 'سارة المراجع', email: 'sara@example.com' },
    );
    const auditLog = getAttachmentReviewAuditLog(updated[0]);

    expect(auditLog).toHaveLength(1);
    expect(auditLog[0]).toMatchObject({ action: 'status_changed', occurredAt: '2026-08-14T10:10:11.123Z', reviewer: { uid: 'reviewer-001', displayName: 'سارة المراجع' }, previousStatus: 'pending_review', nextStatus: 'reviewed' });
    expect(describeAttachmentReviewAuditEntry(auditLog[0])).toContain('قيد المراجعة');
  });

  it('records internal note edits under the authenticated reviewer without exposing the note text in the audit event', () => {
    const updated = updateAttachmentReview(
      [baseAttachment],
      baseAttachment.id,
      { internalNote: 'معلومة داخلية' },
      '2026-08-14T10:11:00.000Z',
      { uid: 'reviewer-002', displayName: 'علي المحاسب' },
    );

    expect(updated[0].reviewAuditLog?.[0]).toMatchObject({ action: 'note_updated', reviewer: { uid: 'reviewer-002', displayName: 'علي المحاسب' } });
    expect(updated[0].reviewAuditLog?.[0]).not.toHaveProperty('internalNote');
  });
});
