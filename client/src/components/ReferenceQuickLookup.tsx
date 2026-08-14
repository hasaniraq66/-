import { FormEvent, useState } from 'react';
import { ArrowLeft, CheckCircle2, CircleAlert, CreditCard, FileSearch, ReceiptText, Search, X } from 'lucide-react';
import { Debt, Expense } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { findRecordByReference, getArabicReferenceLabel, ReferenceLookupResult } from '../utils/recordReferences';
import ReferenceCopyButton from './ReferenceCopyButton';

interface ReferenceQuickLookupProps {
  debts: Debt[];
  expenses: Expense[];
  currency: string;
  onNavigate: (tab: string) => void;
}

type LookupResult = ReferenceLookupResult<Debt, Expense>;
type LookupState = 'idle' | 'empty' | 'found' | 'not-found';

/** لوحة وصول سريع لاستخراج سجل مالي محدد من رقم مرجعه الكامل. */
export default function ReferenceQuickLookup({ debts, expenses, currency, onNavigate }: ReferenceQuickLookupProps) {
  const [referenceInput, setReferenceInput] = useState('');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);

  const handleLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const reference = referenceInput.trim();

    if (!reference) {
      setLookupState('empty');
      setLookupResult(null);
      return;
    }

    const result = findRecordByReference(debts, expenses, reference);
    setLookupResult(result);
    setLookupState(result ? 'found' : 'not-found');
  };

  const clearLookup = () => {
    setReferenceInput('');
    setLookupResult(null);
    setLookupState('idle');
  };

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/50 p-5 shadow-sm md:p-6"
      id="reference-quick-lookup-panel"
      aria-labelledby="reference-quick-lookup-heading"
    >
      <div className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-12 right-0 h-36 w-36 rounded-full bg-indigo-200/35 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-sky-700">
            <span className="rounded-xl border border-sky-100 bg-white p-2 shadow-sm">
              <FileSearch className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <h2 id="reference-quick-lookup-heading" className="text-sm font-black">استخراج سجل سريع</h2>
          </div>
          <p className="max-w-xl text-xs font-medium leading-relaxed text-slate-500">
            اكتب الرقم المرجعي كاملاً للوصول مباشرة إلى ملخص الدين أو الفاتورة. تقبل اللوحة صيغتي <span className="font-bold text-slate-700">DBT</span> و<span className="font-bold text-slate-700">INV</span> وصيغة العرض العربية.
          </p>
        </div>

        <form className="flex w-full flex-col gap-2 sm:flex-row lg:max-w-xl" onSubmit={handleLookup} noValidate>
          <label className="sr-only" htmlFor="reference-quick-lookup-input">رقم المرجع</label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" aria-hidden="true" />
            <input
              id="reference-quick-lookup-input"
              value={referenceInput}
              onChange={(event) => {
                setReferenceInput(event.target.value);
                if (lookupState !== 'idle') setLookupState('idle');
              }}
              className="h-11 w-full rounded-xl border border-sky-200 bg-white pr-10 pl-9 text-left font-mono text-xs font-bold uppercase tracking-wide text-slate-700 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
              placeholder="مثال: DBT-2026-0001 أو ف#INV 2026 0001"
              dir="ltr"
              autoComplete="off"
            />
            {referenceInput && (
              <button
                type="button"
                onClick={clearLookup}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
                aria-label="مسح رقم المرجع"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-xs font-black text-white shadow-[0_4px_12px_rgba(2,132,199,0.22)] transition hover:bg-sky-500 active:scale-[0.97] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            استخراج السجل
          </button>
        </form>
      </div>

      <div className="relative z-10 mt-4" aria-live="polite">
        {lookupState === 'empty' && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5 text-xs font-bold text-amber-800">
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
            اكتب رقماً مرجعياً كاملاً أولاً، مثل DBT-2026-0001 أو INV-2026-0001.
          </div>
        )}

        {lookupState === 'not-found' && (
          <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white/85 px-3 py-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 font-bold">
              <CircleAlert className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              لم يُعثر على سجل بهذا المرجع. تحقق من الرقم ثم أعد المحاولة.
            </span>
            <button type="button" onClick={clearLookup} className="self-start font-bold text-sky-700 hover:text-sky-600 sm:self-auto">مسح وإعادة المحاولة</button>
          </div>
        )}

        {lookupState === 'found' && lookupResult && (
          lookupResult.kind === 'debt' ? (
            <DebtLookupResult result={lookupResult} currency={currency} onNavigate={onNavigate} />
          ) : (
            <ExpenseLookupResult result={lookupResult} currency={currency} onNavigate={onNavigate} />
          )
        )}
      </div>
    </section>
  );
}

function DebtLookupResult({ result, currency, onNavigate }: { result: Extract<LookupResult, { kind: 'debt' }>; currency: string; onNavigate: (tab: string) => void }) {
  const debt = result.record;
  const remaining = Math.max(debt.amount - debt.paidAmount, 0);
  const statusLabel = debt.status === 'paid' ? 'مسدد بالكامل' : debt.status === 'partial' ? 'مسدد جزئياً' : 'غير مسدد';

  return (
    <LookupResultCard accent="sky" icon={<CreditCard className="h-4 w-4" aria-hidden="true" />} title="تم استخراج سجل دين" referenceNumber={result.referenceNumber} recordType="دين">
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <ResultMetric label="صاحب العلاقة" value={debt.personName} />
        <ResultMetric label="إجمالي الدين" value={formatCurrency(debt.amount, currency)} />
        <ResultMetric label="المتبقي" value={formatCurrency(remaining, currency)} />
        <ResultMetric label="الحالة" value={statusLabel} />
      </div>
      <div className="mt-3 flex flex-col gap-2 border-t border-sky-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-medium text-slate-500">{debt.type === 'to_me' ? 'دين مستحق لك' : 'دين مستحق عليك'} · الاستحقاق: {debt.dueDate ? formatDate(debt.dueDate) : 'غير محدد'}</p>
        <button type="button" onClick={() => onNavigate('debts')} className="inline-flex items-center gap-1 self-start text-xs font-black text-sky-700 hover:text-sky-600 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 sm:self-auto">
          فتح سجل الديون <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </LookupResultCard>
  );
}

function ExpenseLookupResult({ result, currency, onNavigate }: { result: Extract<LookupResult, { kind: 'expense' }>; currency: string; onNavigate: (tab: string) => void }) {
  const expense = result.record;

  return (
    <LookupResultCard accent="emerald" icon={<ReceiptText className="h-4 w-4" aria-hidden="true" />} title="تم استخراج سجل فاتورة" referenceNumber={result.referenceNumber} recordType="فاتورة">
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <ResultMetric label="الفئة" value={expense.category} />
        <ResultMetric label="المبلغ" value={formatCurrency(expense.amount, currency)} />
        <ResultMetric label="التاريخ" value={formatDate(expense.date)} />
        <ResultMetric label="البيان" value={expense.description || 'بدون تفاصيل'} />
      </div>
      <div className="mt-3 flex justify-end border-t border-emerald-100 pt-3">
        <button type="button" onClick={() => onNavigate('budget')} className="inline-flex items-center gap-1 text-xs font-black text-emerald-700 hover:text-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2">
          فتح سجل المصروفات <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </LookupResultCard>
  );
}

function LookupResultCard({ accent, icon, title, referenceNumber, recordType, children }: { accent: 'sky' | 'emerald'; icon: React.ReactNode; title: string; referenceNumber: string; recordType: 'دين' | 'فاتورة'; children: React.ReactNode }) {
  const isDebt = accent === 'sky';
  const colors = isDebt
    ? 'border-sky-200 bg-white text-sky-700'
    : 'border-emerald-200 bg-white text-emerald-700';

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${colors}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-lg p-1.5 ${isDebt ? 'bg-sky-50' : 'bg-emerald-50'}`}>{icon}</span>
          <span className="text-xs font-black">{title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <code className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-black text-slate-700">{getArabicReferenceLabel(referenceNumber)}</code>
          <ReferenceCopyButton referenceNumber={referenceNumber} recordType={recordType} />
          <CheckCircle2 className={`h-4 w-4 ${isDebt ? 'text-sky-500' : 'text-emerald-500'}`} aria-label="تم العثور على السجل" />
        </div>
      </div>
      {children}
    </div>
  );
}

function ResultMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-slate-50 px-2.5 py-2">
      <span className="block text-[10px] font-bold text-slate-400">{label}</span>
      <span className="mt-0.5 block truncate font-black text-slate-700" title={value}>{value}</span>
    </div>
  );
}
