import type { AttachmentReviewStatus, FinancialAttachment } from '../types';

export const DEFAULT_ATTACHMENT_REVIEW_STATUS: AttachmentReviewStatus = 'pending_review';
export const MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH = 2000;

export function getAttachmentReviewStatus(attachment: FinancialAttachment): AttachmentReviewStatus {
  return attachment.reviewStatus ?? DEFAULT_ATTACHMENT_REVIEW_STATUS;
}

export function getAttachmentReviewSummary(attachments: FinancialAttachment[]) {
  const reviewed = attachments.filter((attachment) => getAttachmentReviewStatus(attachment) === 'reviewed').length;
  return {
    total: attachments.length,
    reviewed,
    pendingReview: attachments.length - reviewed,
  };
}

export function updateAttachmentReview(
  attachments: FinancialAttachment[],
  attachmentId: string,
  update: { reviewStatus?: AttachmentReviewStatus; internalNote?: string },
  updatedAt = new Date().toISOString(),
): FinancialAttachment[] {
  return attachments.map((attachment) => {
    if (attachment.id !== attachmentId) return attachment;
    return {
      ...attachment,
      reviewStatus: update.reviewStatus ?? getAttachmentReviewStatus(attachment),
      internalNote: update.internalNote === undefined
        ? attachment.internalNote
        : update.internalNote.trim().slice(0, MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH),
      reviewUpdatedAt: updatedAt,
    };
  });
}
