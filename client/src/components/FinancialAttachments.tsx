import { ChangeEvent, useRef, useState } from 'react';
import { ExternalLink, FileImage, FileText, LoaderCircle, Paperclip, Trash2, Upload, X } from 'lucide-react';
import { auth } from '../utils/firebaseService';
import type { FinancialAttachment } from '../types';

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
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<FinancialAttachment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isResolvingPreview, setIsResolvingPreview] = useState(false);

  const getProtectedPreviewUrl = async (attachment: FinancialAttachment): Promise<string> => {
    const user = auth.currentUser;
    if (!user) throw new Error('سجّل الدخول أولاً قبل معاينة المرفقات.');
    const idToken = await user.getIdToken();
    const url = `/api/attachments/preview?${new URLSearchParams({ ownerUid, recordType, recordId, attachmentId: attachment.id }).toString()}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
    const body = await response.json() as { url?: string; error?: string };
    if (!response.ok || !body.url) throw new Error(body.error || 'تعذر فتح المرفق.');
    return body.url;
  };

  const handlePreview = async (attachment: FinancialAttachment) => {
    setError(''); setIsResolvingPreview(true);
    try { setPreviewUrl(await getProtectedPreviewUrl(attachment)); setPreviewAttachment(attachment); }
    catch (previewError) { setError(previewError instanceof Error ? previewError.message : 'تعذر فتح المرفق.'); }
    finally { setIsResolvingPreview(false); }
  };

  const handleOpenInNewTab = async (attachment: FinancialAttachment) => {
    const newWindow = window.open('', '_blank', 'noopener,noreferrer');
    setError('');
    try {
      const url = await getProtectedPreviewUrl(attachment);
      if (newWindow) newWindow.location.replace(url);
      else window.location.assign(url);
    } catch (previewError) {
      newWindow?.close();
      setError(previewError instanceof Error ? previewError.message : 'تعذر فتح المرفق.');
    }
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
    setError(''); setIsUploading(true);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch('/api/attachments/upload', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` }, body: JSON.stringify({ dataUrl: await toDataUrl(file), name: file.name, recordType, recordId }) });
      const body = await response.json() as FinancialAttachment & { error?: string };
      if (!response.ok || body.error) throw new Error(body.error || 'تعذر رفع المرفق');
      onChange([...attachments, body]);
    } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : 'تعذر رفع المرفق'); }
    finally { setIsUploading(false); }
  };

  return <div className="relative">
    <button type="button" onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen} aria-label={`مرفقات السجل (${attachments.length})`} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600 transition hover:border-sky-300 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500">
      <Paperclip className="h-3.5 w-3.5" /> {attachments.length ? `${attachments.length} مرفق` : 'مرفق'}
    </button>
    {isOpen && <div className="absolute left-0 z-30 mt-2 w-72 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl" dir="rtl">
      <div className="mb-2 flex items-center justify-between"><strong className="text-xs text-slate-800">فواتير وإيصالات</strong><button type="button" onClick={() => setIsOpen(false)} aria-label="إغلاق المرفقات" className="rounded p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button></div>
      {attachments.length === 0 ? <p className="py-2 text-xs text-slate-500">لا توجد مرفقات بعد.</p> : <ul className="space-y-2">{attachments.map((attachment) => <li key={attachment.id} className="flex items-center gap-2 rounded-lg bg-slate-50 p-2"><button type="button" onClick={() => void handlePreview(attachment)} disabled={isResolvingPreview} className="min-w-0 flex flex-1 items-center gap-2 text-right text-xs font-bold text-sky-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:opacity-60">{attachment.mimeType === 'application/pdf' ? <FileText className="h-4 w-4 shrink-0" /> : <FileImage className="h-4 w-4 shrink-0" />}<span className="truncate">{attachment.name}</span></button><button type="button" onClick={() => void handleOpenInNewTab(attachment)} aria-label={`فتح ${attachment.name} في نافذة جديدة`} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"><ExternalLink className="h-3.5 w-3.5" /></button><button type="button" onClick={() => onChange(attachments.filter((item) => item.id !== attachment.id))} aria-label={`إزالة مرفق ${attachment.name} من السجل`} className="rounded p-1 text-rose-500 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" /></button></li>)}</ul>}
      {error && <p role="alert" className="mt-2 text-[11px] font-bold text-rose-600">{error}</p>}
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleFile} className="hidden" />
      <button type="button" disabled={isUploading || attachments.length >= MAX_ATTACHMENTS} onClick={() => inputRef.current?.click()} className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-500 disabled:opacity-60">{isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{isUploading ? 'يجري الرفع…' : 'إرفاق فاتورة أو إيصال'}</button>
    </div>}
    {previewAttachment && previewUrl && <div role="dialog" aria-modal="true" aria-label={`معاينة ${previewAttachment.name}`} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={() => { setPreviewAttachment(null); setPreviewUrl(null); }}><div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center justify-between border-b border-slate-100 p-3"><strong className="truncate text-sm text-slate-800">{previewAttachment.name}</strong><button type="button" onClick={() => { setPreviewAttachment(null); setPreviewUrl(null); }} aria-label="إغلاق المعاينة" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button></div><div className="max-h-[calc(90vh-60px)] overflow-auto bg-slate-100 p-3">{previewAttachment.mimeType === 'application/pdf' ? <iframe title={`معاينة ${previewAttachment.name}`} src={previewUrl} className="h-[70vh] w-full rounded-lg bg-white" /> : <img src={previewUrl} alt={`معاينة مرفق ${previewAttachment.name}`} className="mx-auto max-h-[70vh] max-w-full rounded-lg object-contain" />}</div></div></div>}
  </div>;
}
