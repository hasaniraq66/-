import type {
  AttachmentReviewActor,
  AttachmentReviewAuditEntry,
  AttachmentReviewStatus,
  FinancialAttachment,
} from '../types';

export const DEFAULT_ATTACHMENT_REVIEW_STATUS: AttachmentReviewStatus = 'pending_review';
export const MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH = 2000;
export const MAX_ATTACHMENT_REVIEW_AUDIT_ENTRIES = 100;

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

export function getAttachmentReviewAuditLog(attachment: FinancialAttachment): AttachmentReviewAuditEntry[] {
  return [...(attachment.reviewAuditLog ?? [])]
    .filter((entry) => entry && typeof entry.occurredAt === 'string' && typeof entry.reviewer?.uid === 'string')
    .sort((first, second) => second.occurredAt.localeCompare(first.occurredAt));
}

function createAuditEntry(
  attachment: FinancialAttachment,
  action: AttachmentReviewAuditEntry['action'],
  actor: AttachmentReviewActor,
  occurredAt: string,
  index: number,
  status?: Pick<AttachmentReviewAuditEntry, 'previousStatus' | 'nextStatus'>,
): AttachmentReviewAuditEntry {
  const timestamp = Number.isNaN(Date.parse(occurredAt)) ? occurredAt.replace(/[^0-9]/g, '') : String(Date.parse(occurredAt));
  return {
    id: `audit-${attachment.id}-${timestamp}-${index}`,
    action,
    occurredAt,
    reviewer: {
      uid: actor.uid,
      displayName: actor.displayName.trim().slice(0, 200) || 'مستخدم مصادق',
      ...(actor.email ? { email: actor.email.trim().slice(0, 256) } : {}),
    },
    ...status,
  };
}

export function updateAttachmentReview(
  attachments: FinancialAttachment[],
  attachmentId: string,
  update: { reviewStatus?: AttachmentReviewStatus; internalNote?: string },
  updatedAt = new Date().toISOString(),
  actor?: AttachmentReviewActor,
): FinancialAttachment[] {
  return attachments.map((attachment) => {
    if (attachment.id !== attachmentId) return attachment;

    const previousStatus = getAttachmentReviewStatus(attachment);
    const nextStatus = update.reviewStatus ?? previousStatus;
    const nextNote = update.internalNote === undefined
      ? attachment.internalNote
      : update.internalNote.trim().slice(0, MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH);
    const statusChanged = previousStatus !== nextStatus;
    const noteChanged = update.internalNote !== undefined && nextNote !== attachment.internalNote;
    const existingLog = attachment.reviewAuditLog ?? [];
    const newEntries: AttachmentReviewAuditEntry[] = [];

    if (actor && statusChanged) {
      newEntries.push(createAuditEntry(attachment, 'status_changed', actor, updatedAt, existingLog.length, { previousStatus, nextStatus }));
    }
    if (actor && noteChanged) {
      newEntries.push(createAuditEntry(attachment, 'note_updated', actor, updatedAt, existingLog.length + newEntries.length));
    }

    return {
      ...attachment,
      reviewStatus: nextStatus,
      internalNote: nextNote,
      reviewUpdatedAt: updatedAt,
      ...(newEntries.length > 0 ? { reviewAuditLog: [...existingLog, ...newEntries].slice(-MAX_ATTACHMENT_REVIEW_AUDIT_ENTRIES) } : {}),
    };
  });
}

export function describeAttachmentReviewAuditEntry(entry: AttachmentReviewAuditEntry): string {
  if (entry.action === 'status_changed') {
    const statusLabel = (status: AttachmentReviewStatus | undefined) => status === 'reviewed' ? 'تمت المراجعة' : 'قيد المراجعة';
    return `غيّر الحالة من «${statusLabel(entry.previousStatus)}» إلى «${statusLabel(entry.nextStatus)}»`;
  }
  return 'حدّث الملاحظة الداخلية';
}
