import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(import.meta.dirname, '..');
const firestoreRules = readFileSync(resolve(projectRoot, 'firestore.rules'), 'utf8');
const attachmentComponent = readFileSync(resolve(projectRoot, 'client/src/components/FinancialAttachments.tsx'), 'utf8');

describe('attachment access contracts', () => {
  it('limits attachment lists to the record owner or an authorised assistant through Firestore rules', () => {
    expect(firestoreRules).toContain('function isValidAttachments(data)');
    expect(firestoreRules).toContain("data.attachments is list && data.attachments.size() <= 10");
    expect(firestoreRules).toContain('canAccessUser(userId) && isValidId(debtId) && isValidDebt(incoming(), userId)');
    expect(firestoreRules).toContain('canAccessUser(userId) && isValidId(expenseId) && isValidExpense(incoming(), userId)');
  });

  it('keeps preview and removal actions scoped to the current record attachment list', () => {
    expect(attachmentComponent).toContain('getProtectedPreview');
    expect(attachmentComponent).toContain('resolveProtectedAttachmentPreview');
    expect(attachmentComponent).toContain('handlePreview(attachment)');
    expect(attachmentComponent).toContain('onChange(attachments.filter((item) => item.id !== attachment.id))');
    expect(attachmentComponent).toContain('src={previewUrl}');
    expect(attachmentComponent).toContain('ownerUid, recordType, recordId, attachmentId: attachment.id');
  });

  it('persists review state and internal notes through the authenticated server review flow', () => {
    expect(firestoreRules).toContain('function canAccessUser(userId)');
    expect(firestoreRules).toContain('return isOwner(userId) || isSubUserOf(userId);');
    expect(attachmentComponent).toContain("fetch('/api/attachments/review'");
    expect(attachmentComponent).toContain('ملاحظة داخلية');
    expect(attachmentComponent).toContain("reviewStatus: isReviewed ? 'pending_review' : 'reviewed'");
  });
});
