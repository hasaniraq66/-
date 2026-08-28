import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, ExternalLink, FileImage, FileText, History, LoaderCircle, MessageSquare, Paperclip, Save, Trash2, Upload, X } from 'lucide-react';
import { auth } from '../utils/firebaseService';
import type { FinancialAttachment } from '../types';
import { describeAttachmentReviewAuditEntry, getAttachmentReviewAuditLog, getAttachmentReviewStatus, getAttachmentReviewSummary, MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH } from '../lib/attachmentReview';
import { resolveProtectedAttachmentPreview, type ResolvedAttachmentPreview } from '../lib/protectedAttachmentPreview';
import ModalPortal from './ModalPortal';

const MAX_SIZE = 5 * 1024 * 1024;
const MAX_ATTACHMENTS = 10;
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf';

async function toDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('تعذر قراءة الملف'));
    reader.onerror = () => reject(new Error('تعذر قراءة الملف'));
    reader.readAsDataURL(file);
  });
}

function formatAuditTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime())
    ? timestamp
    : new Intl.DateTimeFormat('ar-IQ', { dateStyle: 'medium', timeStyle: 'medium' }).format(parsed);
}

interface FinancialAttachmentsProps {
  ownerUid: string;
  recordId: string;
  recordType: 'debt' | 'expense';
  attachments?: FinancialAttachment[];
  onChange: (attachments: FinancialAttachment[]) => void;
}

export default function FinancialAttachments({ ownerUid, recordId, recordType, attachments = [], onChange }: FinancialAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeUploadName, setActiveUploadName] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<FinancialAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isResolvingPreview, setIsResolvingPreview] = useState(false);
  const [previewingAttachmentId, setPreviewingAttachmentId] = useState<string | null>(null);
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [savingReviewId, setSavingReviewId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const previewCleanupRef = useRef<(() => void) | null>(null);

  const reviewSummary = getAttachmentReviewSummary(attachments);

  const closePreview = () => {
    previewCleanupRef.current?.();
    previewCleanupRef.current = null;
    setPreviewAttachment(null);
    setPreviewUrl(null);
  };

  useEffect(() => () => previewCleanupRef.current?.(), []);

  const saveReview = async (attachment: FinancialAttachment, update: { reviewStatus?: 'pending_review' | 'reviewed'; internalNote?: string }) => {
    const user = auth.currentUser;
    if (!user) return setError('سجّل الدخول أولاً قبل تحديث مراجعة المرفق.');
    setError('');
    setSuccessMessage('');
    setSavingReviewId(attachment.id);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/attachments/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ ownerUid, recordType, recordId, attachmentId: attachment.id, ...update }),
      });
      const body = await response.json() as { attachments?: FinancialAttachment[]; error?: string };
      if (!response.ok || !body.attachments) throw new Error(body.error || 'تعذر حفظ مراجعة المرفق.');
      onChange(body.attachments);
      setSuccessMessage(update.reviewStatus
        ? (update.reviewStatus === 'reviewed' ? `تم تعليم «${attachment.name}» كمراجع وتوثيق العملية.` : `أُعيد «${attachment.name}» إلى قيد المراجعة مع توثيق العملية.`)
        : `تم حفظ الملاحظة الداخلية وتوثيق التغيير لـ «${attachment.name}».`);
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'تعذر حفظ مراجعة المرفق.');
    } finally {
      setSavingReviewId(null);
    }
  };

  const removeAttachment = (attachment: FinancialAttachment) => {
    onChange(attachments.filter((item) => item.id !== attachment.id));
    setError('');
    setSuccessMessage(`تمت إزالة مرجع «${attachment.name}» من السجل.`);
  };

  const startEditingNote = (attachment: FinancialAttachment) => {
    setEditingNoteId(attachment.id);
    setNoteDraft(attachment.internalNote ?? '');
  };

  const getProtectedPreview = async (attachment: FinancialAttachment): Promise<ResolvedAttachmentPreview> => {
    const user = auth.currentUser;
    if (!user) throw new Error('سجّل الدخول أولاً قبل معاينة المرفقات.');
    const idToken = await user.getIdToken();
    const url = `/api/attachments/preview?${new URLSearchParams({ ownerUid, recordType, recordId, attachmentId: attachment.id }).toString()}`;
    return resolveProtectedAttachmentPreview(url, idToken);
  };

  const handlePreview = async (attachment: FinancialAttachment) => {
    setError(''); setSuccessMessage(''); setPreviewingAttachmentId(attachment.id); setIsResolvingPreview(true);
    try {
      const preview = await getProtectedPreview(attachment);
      previewCleanupRef.current?.();
      previewCleanupRef.current = preview.revoke;
      setPreviewUrl(preview.url);
      setPreviewAttachment(attachment);
    }
    catch (previewError) { setError(previewError instanceof Error ? previewError.message : 'تعذر فتح المرفق.'); }
    finally { setPreviewingAttachmentId(null); setIsResolvingPreview(false); }
  };

  const handleOpenInNewTab = async (attachment: FinancialAttachment) => {
    const newWindow = window.open('', '_blank', 'noopener,noreferrer');
    setError(''); setSuccessMessage(''); setOpeningAttachmentId(attachment.id);
    try {
      const preview = await getProtectedPreview(attachment);
      if (newWindow) newWindow.location.replace(preview.url);
      else window.location.assign(preview.url);
      window.setTimeout(preview.revoke, 60_000);
    } catch (previewError) {
      newWindow?.close();
      setError(previewError instanceof Error ? previewError.message : 'تعذر فتح المرفق.');
    } finally { setOpeningAttachmentId(null); }
  };

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (attachments.length >= MAX_ATTACHMENTS) return setError(`الحد الأقصى هو ${MAX_ATTACHMENTS} مرفقات لكل سجل.`);
    if (!ACCEPT.split(',').includes(file.type)) return setError('الصيغة غير مدعومة. ارفع PDF أو JPG أو PNG أو WEBP.');
    if (file.size > MAX_SIZE) return setError('الحد الأقصى للمرفق هو 5 ميغابايت.');
    const user = auth.currentUser;
    if (!user) return setError('سجّل الدخول أولاً قبل رفع المرفقات.');
    setError(''); setSuccessMessage(''); setActiveUploadName(file.name); setIsUploading(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/attachments/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ dataUrl: await toDataUrl(file), name: file.name, recordType, recordId }) });
      const body = await response.json() as FinancialAttachment & { error?: string };
      if (!response.ok || body.error) throw new Error(body.error || 'تعذر رفع المرفق');
      onChange([...attachments, body]);
      setSuccessMessage(`تم رفع «${file.name}» بنجاح وهو الآن قيد المراجعة.`);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع المرفق'); }
    finally { setActiveUploadName(''); setIsUploading(false); }
  };

  return <div className="relative">
    <button type="button" onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen} aria-label={`مرفقات السجل (${attachments.length})`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 transition hover:border-sky-300 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
      <Paperclip className="h-3.5 w-3.5" /> {attachments.length ? `${attachments.length} مرفق` : 'مرفق'}
    </button>
    {isOpen && <div className="absolute left-0 z-30 mt-2 w-80 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl" dir="rtl">
      <div className="mb-2 flex items-center justify-between"><strong className="text-xs text-slate-800">فواتير وإيصالات</strong><button type="button" onClick={() => setIsOpen(false)} aria-label="إغلاق المرفقات" className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
      {attachments.length > 0 && <div className="mb-3 flex flex-wrap gap-1.5" aria-label="ملخص حالة المرفقات"><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800"><Clock3 className="h-3 w-3" />{reviewSummary.pendingReview} قيد المراجعة</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><CheckCircle2 className="h-3 w-3" />{reviewSummary.reviewed} مراجع</span></div>}
      <div className="sr-only" aria-live="polite">{successMessage || (isUploading ? `يجري رفع ${activeUploadName}` : '')}</div>
      {attachments.length === 0 ? <p className="py-2 text-xs text-slate-500">لا توجد مرفقات بعد.</p> : <ul className="space-y-2">{attachments.map((attachment) => {
        const reviewStatus = getAttachmentReviewStatus(attachment);
        const isReviewed = reviewStatus === 'reviewed';
        const isEditingNote = editingNoteId === attachment.id;
        const isSavingThisAttachment = savingReviewId === attachment.id;
        const isPreviewingThisAttachment = isResolvingPreview && previewingAttachmentId === attachment.id;
        const isOpeningThisAttachment = openingAttachmentId === attachment.id;
        const auditLog = getAttachmentReviewAuditLog(attachment);
        const isAuditExpanded = expandedAuditId === attachment.id;
        return <li key={attachment.id} className="rounded-lg bg-slate-50 p-2">
          <div className="flex items-center gap-2"><button type="button" onClick={() => void handlePreview(attachment)} disabled={isResolvingPreview} className="min-w-0 flex flex-1 items-center gap-2 text-right text-xs font-bold text-sky-700 transition duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60">{isPreviewingThisAttachment ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" /> : attachment.mimeType === 'application/pdf' ? <FileText className="h-4 w-4 shrink-0" /> : <FileImage className="h-4 w-4 shrink-0" />}<span className="truncate">{isPreviewingThisAttachment ? 'يجري تجهيز المعاينة…' : attachment.name}</span></button><button type="button" onClick={() => void handleOpenInNewTab(attachment)} disabled={isOpeningThisAttachment} aria-label={`فتح ${attachment.name} في نافذة جديدة`} className="rounded p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-700 disabled:opacity-60">{isOpeningThisAttachment ? <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" /> : <ExternalLink className="h-3.5 w-3.5" />}</button><button type="button" onClick={() => removeAttachment(attachment)} aria-label={`إزالة مرفق ${attachment.name} من السجل`} className="rounded p-1 text-rose-500 transition hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button></div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5"><button type="button" onClick={() => void saveReview(attachment, { reviewStatus: isReviewed ? 'pending_review' : 'reviewed' })} disabled={isSavingThisAttachment} aria-label={isReviewed ? `إعادة ${attachment.name} إلى قيد المراجعة` : `تعليم ${attachment.name} كمراجع`} className={`inline-flex min-h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60 ${isReviewed ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-800 hover:bg-amber-200'}`}>{isSavingThisAttachment ? <LoaderCircle className="h-3 w-3 animate-spin motion-reduce:animate-none" /> : isReviewed ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}{isSavingThisAttachment ? 'يجري الحفظ…' : isReviewed ? 'تمت المراجعة' : 'قيد المراجعة'}</button><button type="button" onClick={() => startEditingNote(attachment)} disabled={isSavingThisAttachment} aria-label={`إضافة أو تعديل ملاحظة داخلية لـ ${attachment.name}`} className="inline-flex min-h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60"><MessageSquare className="h-3 w-3" />{attachment.internalNote ? 'تعديل الملاحظة' : 'ملاحظة داخلية'}</button><button type="button" onClick={() => setExpandedAuditId(isAuditExpanded ? null : attachment.id)} aria-expanded={isAuditExpanded} aria-controls={`attachment-audit-${attachment.id}`} className="inline-flex min-h-7 items-center gap-1 rounded-md px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"><History className="h-3 w-3" />سجل التدقيق {auditLog.length ? `(${auditLog.length})` : ''}</button></div>
          {isEditingNote ? <div className="mt-2"><textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value.slice(0, MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH))} maxLength={MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH} placeholder="ملاحظة للفريق المصرح له…" aria-label={`ملاحظة داخلية لـ ${attachment.name}`} className="min-h-16 w-full resize-y rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100" /><div className="mt-1 flex items-center justify-between gap-2"><span className="text-[10px] text-slate-400">{noteDraft.length}/{MAX_INTERNAL_ATTACHMENT_NOTE_LENGTH}</span><div className="flex gap-1"><button type="button" onClick={() => { setEditingNoteId(null); setNoteDraft(''); }} className="rounded-md px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-200">إلغاء</button><button type="button" disabled={isSavingThisAttachment} onClick={() => { void saveReview(attachment, { internalNote: noteDraft }).then(() => { setEditingNoteId(null); setNoteDraft(''); }); }} className="inline-flex items-center gap-1 rounded-md bg-sky-600 px-2 py-1 text-[10px] font-bold text-white transition duration-150 hover:bg-sky-500 active:scale-[0.98] motion-reduce:transform-none disabled:opacity-60"><Save className="h-3 w-3" />حفظ</button></div></div></div> : attachment.internalNote ? <p className="mt-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[11px] leading-5 text-slate-600"><span className="font-bold text-slate-700">ملاحظة داخلية: </span>{attachment.internalNote}</p> : null}
          {isAuditExpanded && <div id={`attachment-audit-${attachment.id}`} className="mt-2 rounded-lg border border-slate-200 bg-white p-2" aria-label={`سجل تدقيق ${attachment.name}`}><div className="mb-1 flex items-center gap-1 text-[10px] font-bold text-slate-700"><History className="h-3.5 w-3.5 text-sky-600" />سجل المراجعة</div>{auditLog.length === 0 ? <p className="text-[10px] leading-5 text-slate-500">لم تُسجّل مراجعة بعد. سيظهر هنا اسم المراجع والوقت الدقيق لأول تغيير.</p> : <ol className="space-y-2">{auditLog.map((entry) => <li key={entry.id} className="border-r-2 border-sky-200 pr-2 text-[10px] leading-5 text-slate-600"><p className="font-bold text-slate-700">{describeAttachmentReviewAuditEntry(entry)}</p><p>بواسطة <span className="font-bold text-sky-700">{entry.reviewer.displayName}</span>{entry.reviewer.email ? <span className="text-slate-400"> · {entry.reviewer.email}</span> : null}</p><time dateTime={entry.occurredAt} className="block text-[9px] text-slate-500">{formatAuditTimestamp(entry.occurredAt)} <span dir="ltr">({entry.occurredAt})</span></time></li>)}</ol>}</div>}
        </li>;
      })}</ul>}
      {isUploading && <div role="status" className="mt-3 rounded-lg border border-sky-100 bg-sky-50 p-2"><div className="flex items-center gap-2 text-[11px] font-bold text-sky-800"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /><span className="truncate">يجري رفع {activeUploadName || 'المرفق'}…</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sky-100"><div className="h-full w-2/3 rounded-full bg-sky-500 animate-pulse motion-reduce:animate-none" /></div><p className="mt-1 text-[10px] text-sky-700">لا تغلق هذه النافذة حتى يكتمل الحفظ.</p></div>}
      {successMessage && <p role="status" className="mt-2 flex items-start gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-[11px] font-bold leading-5 text-emerald-700"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />{successMessage}</p>}
      {error && <p role="alert" className="mt-2 flex items-start gap-1.5 rounded-lg border border-rose-100 bg-rose-50 p-2 text-[11px] font-bold leading-5 text-rose-700"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{error}</p>}
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleFile} className="hidden" />
      <button type="button" disabled={isUploading || attachments.length >= MAX_ATTACHMENTS} onClick={() => inputRef.current?.click()} className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 text-xs font-bold text-white transition duration-150 hover:bg-sky-500 active:scale-[0.98] motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-60">{isUploading ? <LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Upload className="h-4 w-4" />}{isUploading ? 'يجري الرفع…' : attachments.length >= MAX_ATTACHMENTS ? `وصلت إلى الحد الأقصى (${MAX_ATTACHMENTS})` : 'إرفاق فاتورة أو إيصال'}</button>
    </div>}
    {previewAttachment && previewUrl && <ModalPortal><div role="dialog" aria-modal="true" aria-label={`معاينة ${previewAttachment.name}`} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={closePreview}><div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 p-3"><strong className="truncate text-sm text-slate-800">{previewAttachment.name}</strong><button type="button" onClick={closePreview} aria-label="إغلاق المعاينة" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="max-h-[calc(90vh-60px)] overflow-auto bg-slate-100 p-3">{previewAttachment.mimeType === 'application/pdf' ? <iframe title={`معاينة ${previewAttachment.name}`} src={previewUrl} className="h-[70vh] w-full rounded-lg bg-white" /> : <img src={previewUrl} alt={`معاينة مرفق ${previewAttachment.name}`} className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain" />}</div></div></div></ModalPortal>}
  </div>;
}
