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
    // الكتابة مقيّدة بتبويب التحرير الخاص بكل مجموعة، لا بمجرد كون المتصفح مساعداً.
    expect(firestoreRules).toContain("canWriteTab(userId, 'debts')");
    expect(firestoreRules).toContain("canWriteTab(userId, 'budget')");
    expect(firestoreRules).toContain('isValidId(debtId) && isValidDebt(incoming(), userId)');
    expect(firestoreRules).toContain('isValidId(expenseId) && isValidExpense(incoming(), userId)');
    // القراءة مقيّدة بالتبويبات التي تعرض هذه البيانات فعلاً.
    expect(firestoreRules).toContain("canReadTabs(userId, ['debts', 'dashboard', 'reports', 'alerts'])");
    expect(firestoreRules).toContain("canReadTabs(userId, ['budget', 'dashboard', 'reports', 'alerts'])");
  });

  it('separates delete from create and update so owners can remove their own records', () => {
    // عند الحذف تكون request.resource فارغة، فاستدعاء مخطط التحقق داخل قاعدة
    // الحذف يفشل بخطأ null ويمنع المالك من حذف بياناته.
    expect(firestoreRules).toContain("allow delete: if canWriteTab(userId, 'debts');");
    expect(firestoreRules).toContain("allow delete: if canWriteTab(userId, 'budget');");
    expect(firestoreRules).not.toMatch(/allow write:\s*if canAccessUser/);
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
