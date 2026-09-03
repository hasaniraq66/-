import React, { useMemo, useState } from 'react';
import {
  Plus, X, Trash2, Edit3, Wallet, CalendarClock, Check, TrendingUp,
  DollarSign, FileText, Repeat, Power, Search,
} from 'lucide-react';
import { Income, IncomeCadence, IncomeCategory, IncomeSource } from '../types';
import { formatCurrency, formatDate, getLocalDateString, getCurrentMonthString } from '../utils';
import { isPositiveFinancialAmount } from '../utils/financialInputValidation';
import {
  INCOME_CATEGORY_LABELS, dueSources, paymentFromSource, totalForMonth, totalIncome,
} from '../lib/incomeSchedule';
import ModalPortal from './ModalPortal';

interface IncomeManagerProps {
  incomes: Income[];
  sources: IncomeSource[];
  currency: string;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onEditIncome: (income: Income) => void;
  onDeleteIncome: (id: string) => void;
  onSaveSource: (source: IncomeSource) => void;
  onDeleteSource: (id: string) => void;
}

const CATEGORIES = Object.keys(INCOME_CATEGORY_LABELS) as IncomeCategory[];

function FormError({ message }: { message: string }) {
  return (
    <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-[11px] font-bold text-rose-700" role="alert">
      {message}
    </p>
  );
}

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export default function IncomeManager({
  incomes, sources, currency,
  onAddIncome, onEditIncome, onDeleteIncome, onSaveSource, onDeleteSource,
}: IncomeManagerProps) {
  const today = getLocalDateString();
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());
  const [search, setSearch] = useState('');

  const [isEntryOpen, setIsEntryOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Income | null>(null);
  const [entryAmount, setEntryAmount] = useState<number | ''>('');
  const [entryCategory, setEntryCategory] = useState<IncomeCategory>('salary');
  const [entryDate, setEntryDate] = useState(today);
  const [entryDescription, setEntryDescription] = useState('');
  const [entryError, setEntryError] = useState('');

  const [isSourceOpen, setIsSourceOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<IncomeSource | null>(null);
  const [sourceTitle, setSourceTitle] = useState('');
  const [sourceAmount, setSourceAmount] = useState<number | ''>('');
  const [sourceCategory, setSourceCategory] = useState<IncomeCategory>('salary');
  const [sourceCadence, setSourceCadence] = useState<IncomeCadence>('monthly');
  const [sourceDay, setSourceDay] = useState<number | ''>(25);
  const [sourceError, setSourceError] = useState('');

  const [collecting, setCollecting] = useState<IncomeSource | null>(null);
  const [collectAmount, setCollectAmount] = useState<number | ''>('');
  const [collectError, setCollectError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'income' | 'source'; id: string; label: string } | null>(null);

  const due = useMemo(() => dueSources(sources, incomes, today), [sources, incomes, today]);
  const monthTotal = useMemo(() => totalForMonth(incomes, selectedMonth), [incomes, selectedMonth]);
  const allTimeTotal = useMemo(() => totalIncome(incomes), [incomes]);

  const visibleIncomes = useMemo(() => {
    const term = search.trim();
    return incomes
      .filter((entry) => entry.date.startsWith(selectedMonth))
      .filter((entry) => !term || entry.description.includes(term) || INCOME_CATEGORY_LABELS[entry.category].includes(term))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [incomes, selectedMonth, search]);

  const openNewEntry = () => {
    setEditingEntry(null);
    setEntryAmount('');
    setEntryCategory('salary');
    setEntryDate(today);
    setEntryDescription('');
    setEntryError('');
    setIsEntryOpen(true);
  };

  const openEditEntry = (entry: Income) => {
    setEditingEntry(entry);
    setEntryAmount(entry.amount);
    setEntryCategory(entry.category);
    setEntryDate(entry.date);
    setEntryDescription(entry.description);
    setEntryError('');
    setIsEntryOpen(true);
  };

  const submitEntry = (event: React.FormEvent) => {
    event.preventDefault();
    if (!isPositiveFinancialAmount(entryAmount)) {
      setEntryError('أدخل مبلغاً أكبر من صفر.');
      return;
    }
    const payload = {
      amount: Number(entryAmount),
      category: entryCategory,
      date: entryDate,
      description: entryDescription.trim() || INCOME_CATEGORY_LABELS[entryCategory],
    };
    if (editingEntry) onEditIncome({ ...editingEntry, ...payload });
    else onAddIncome(payload);
    setIsEntryOpen(false);
  };

  const openNewSource = () => {
    setEditingSource(null);
    setSourceTitle('');
    setSourceAmount('');
    setSourceCategory('salary');
    setSourceCadence('monthly');
    setSourceDay(25);
    setSourceError('');
    setIsSourceOpen(true);
  };

  const openEditSource = (source: IncomeSource) => {
    setEditingSource(source);
    setSourceTitle(source.title);
    setSourceAmount(source.amount);
    setSourceCategory(source.category);
    setSourceCadence(source.cadence);
    setSourceDay(source.dayOfMonth ?? '');
    setSourceError('');
    setIsSourceOpen(true);
  };

  const submitSource = (event: React.FormEvent) => {
    event.preventDefault();
    if (!sourceTitle.trim()) {
      setSourceError('اسم المصدر مطلوب.');
      return;
    }
    if (!isPositiveFinancialAmount(sourceAmount)) {
      setSourceError('أدخل مبلغاً معتاداً أكبر من صفر.');
      return;
    }
    const source: IncomeSource = {
      id: editingSource?.id ?? `src-${Date.now()}`,
      title: sourceTitle.trim(),
      amount: Number(sourceAmount),
      category: sourceCategory,
      cadence: sourceCadence,
      isActive: editingSource?.isActive ?? true,
      ...(sourceCadence === 'monthly' && sourceDay !== '' ? { dayOfMonth: Number(sourceDay) } : {}),
    };
    onSaveSource(source);
    setIsSourceOpen(false);
  };

  const openCollect = (source: IncomeSource) => {
    setCollecting(source);
    setCollectAmount(source.amount);
    setCollectError('');
  };

  const submitCollect = (event: React.FormEvent) => {
    event.preventDefault();
    if (!collecting) return;
    if (!isPositiveFinancialAmount(collectAmount)) {
      setCollectError('أدخل المبلغ المستلَم فعلاً.');
      return;
    }
    onAddIncome(paymentFromSource(collecting, today, Number(collectAmount)));
    onSaveSource({ ...collecting, lastCollectedDate: today });
    setCollecting(null);
  };

  const runDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.kind === 'income') onDeleteIncome(confirmDelete.id);
    else onDeleteSource(confirmDelete.id);
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-4 pb-24 text-right" id="income-manager">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-white p-4 dark:border-emerald-900/40 dark:from-emerald-950/40 dark:to-slate-900">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
            <TrendingUp className="h-3.5 w-3.5" /> دخل {formatDate(`${selectedMonth}-01`).substring(3)}
          </span>
          <p className="mt-1 text-lg font-black text-emerald-800 dark:text-emerald-200">{formatCurrency(monthTotal, currency)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
            <Wallet className="h-3.5 w-3.5" /> إجمالي الدخل المسجَّل
          </span>
          <p className="mt-1 text-lg font-black text-slate-800 dark:text-slate-100">{formatCurrency(allTimeTotal, currency)}</p>
        </div>
      </div>

      {due.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/40 dark:bg-amber-950/20" id="income-due-sources">
          <h2 className="flex items-center gap-1.5 text-xs font-black text-amber-800 dark:text-amber-200">
            <CalendarClock className="h-4 w-4" /> مستحق الاستلام الآن
          </h2>
          <p className="mt-1 text-[11px] text-amber-700/80 dark:text-amber-300/70">
            ضغطة واحدة تسجّل الدفعة. المبلغ قابل للتعديل قبل التأكيد.
          </p>
          <div className="mt-3 space-y-2">
            {due.map((source) => (
              <div key={source.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-white p-3 dark:border-amber-900/40 dark:bg-slate-900">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-slate-800 dark:text-slate-100">{source.title}</p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {source.cadence === 'monthly' ? 'شهري' : 'يومي'} · {formatCurrency(source.amount, currency)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCollect(source)}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-[11px] font-black text-white transition hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                >
                  <Check className="h-3.5 w-3.5" /> استلمت
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" id="income-sources">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-xs font-black text-slate-700 dark:text-slate-200">
            <Repeat className="h-4 w-4" /> مصادر الدخل المتكررة
          </h2>
          <button
            type="button"
            onClick={openNewSource}
            className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-slate-800 px-3 text-[11px] font-black text-white transition hover:bg-slate-900"
          >
            <Plus className="h-3.5 w-3.5" /> مصدر
          </button>
        </div>

        {sources.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[11px] leading-6 text-slate-500 dark:bg-slate-800/60">
            أضف راتبك الشهري أو حصيلة يومك مرة واحدة، فيصير تسجيله بعدها ضغطة واحدة بدل نموذج كامل كل مرة.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {sources.map((source) => (
              <li key={source.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-slate-800 dark:text-slate-100">
                    {source.title}
                    {!source.isActive && <span className="mr-1.5 text-[10px] font-bold text-slate-400">(معطّل)</span>}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {INCOME_CATEGORY_LABELS[source.category]} · {source.cadence === 'monthly' ? `شهري${source.dayOfMonth ? ` — يوم ${source.dayOfMonth}` : ''}` : 'يومي'} · {formatCurrency(source.amount, currency)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSaveSource({ ...source, isActive: !source.isActive })}
                    aria-label={source.isActive ? 'تعطيل المصدر' : 'تفعيل المصدر'}
                    className={`rounded-lg p-2 transition ${source.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => openEditSource(source)} aria-label="تعديل المصدر" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ kind: 'source', id: source.id, label: source.title })}
                    aria-label="حذف المصدر"
                    className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" id="income-entries">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-black text-slate-700 dark:text-slate-200">سجل الدخل</h2>
          <button
            type="button"
            onClick={openNewEntry}
            className="inline-flex min-h-9 items-center gap-1 rounded-xl bg-emerald-600 px-3 text-[11px] font-black text-white transition hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" /> تسجيل دخل
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="month"
            value={selectedMonth}
            onChange={(event) => setSelectedMonth(event.target.value)}
            aria-label="اختيار الشهر"
            className={`${inputClass} w-auto flex-1 py-2 text-xs`}
          />
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="بحث في الوصف"
              className={`${inputClass} py-2 pr-9 text-xs`}
            />
          </div>
        </div>

        {visibleIncomes.length === 0 ? (
          <p className="mt-3 rounded-xl bg-slate-50 p-3 text-center text-[11px] text-slate-500 dark:bg-slate-800/60">
            لا دخل مسجَّل في هذا الشهر.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {visibleIncomes.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-slate-800 dark:text-slate-100">{entry.description}</p>
                  <p className="text-[10px] font-bold text-slate-400">
                    {INCOME_CATEGORY_LABELS[entry.category]} · {formatDate(entry.date)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(entry.amount, currency)}
                  </span>
                  <button type="button" onClick={() => openEditEntry(entry)} aria-label="تعديل الدخل" className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100">
                    <Edit3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete({ kind: 'income', id: entry.id, label: entry.description })}
                    aria-label="حذف الدخل"
                    className="rounded-lg p-2 text-rose-500 transition hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isEntryOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md" id="income-entry-modal">
            <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {editingEntry ? 'تعديل دخل' : 'تسجيل دخل'}
                </h2>
                <button type="button" onClick={() => setIsEntryOpen(false)} aria-label="إغلاق" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={submitEntry} className="space-y-4 p-5 text-xs">
                {entryError && <FormError message={entryError} />}
                <div className="space-y-1.5">
                  <label htmlFor="income-amount" className="block font-bold text-slate-500">المبلغ ({currency})</label>
                  <div className="relative">
                    <DollarSign className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="income-amount" type="number" min="1" required
                      value={entryAmount}
                      onChange={(event) => setEntryAmount(event.target.value === '' ? '' : Number(event.target.value))}
                      className={`${inputClass} pr-9`}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="income-category" className="block font-bold text-slate-500">التصنيف</label>
                  <select id="income-category" value={entryCategory} onChange={(event) => setEntryCategory(event.target.value as IncomeCategory)} className={inputClass}>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>{INCOME_CATEGORY_LABELS[category]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="income-date" className="block font-bold text-slate-500">التاريخ</label>
                  <input id="income-date" type="date" required value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="income-description" className="block font-bold text-slate-500">الوصف</label>
                  <div className="relative">
                    <FileText className="absolute right-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      id="income-description" type="text" maxLength={200}
                      placeholder="مثال: راتب شهر آذار"
                      value={entryDescription}
                      onChange={(event) => setEntryDescription(event.target.value)}
                      className={`${inputClass} pr-9`}
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="min-h-12 flex-1 rounded-xl bg-emerald-600 text-xs font-black text-white transition hover:bg-emerald-700">
                    {editingEntry ? 'حفظ التعديل' : 'حفظ الدخل'}
                  </button>
                  <button type="button" onClick={() => setIsEntryOpen(false)} className="min-h-12 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {isSourceOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md" id="income-source-modal">
            <div className="w-full max-w-md rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  {editingSource ? 'تعديل مصدر متكرر' : 'مصدر دخل متكرر'}
                </h2>
                <button type="button" onClick={() => setIsSourceOpen(false)} aria-label="إغلاق" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={submitSource} className="space-y-4 p-5 text-xs">
                {sourceError && <FormError message={sourceError} />}
                <div className="space-y-1.5">
                  <label htmlFor="source-title" className="block font-bold text-slate-500">اسم المصدر</label>
                  <input
                    id="source-title" type="text" required maxLength={100}
                    placeholder="مثال: راتب الوظيفة، مبيعات المحل"
                    value={sourceTitle}
                    onChange={(event) => setSourceTitle(event.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="source-amount" className="block font-bold text-slate-500">المبلغ المعتاد ({currency})</label>
                  <input
                    id="source-amount" type="number" min="1" required
                    value={sourceAmount}
                    onChange={(event) => setSourceAmount(event.target.value === '' ? '' : Number(event.target.value))}
                    className={inputClass}
                  />
                  <p className="text-[10px] text-slate-400">يبقى قابلاً للتعديل عند كل استلام.</p>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="source-category" className="block font-bold text-slate-500">التصنيف</label>
                  <select id="source-category" value={sourceCategory} onChange={(event) => setSourceCategory(event.target.value as IncomeCategory)} className={inputClass}>
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>{INCOME_CATEGORY_LABELS[category]}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <span className="block font-bold text-slate-500">الدورية</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['monthly', 'daily'] as IncomeCadence[]).map((cadence) => (
                      <button
                        key={cadence}
                        type="button"
                        onClick={() => setSourceCadence(cadence)}
                        className={`min-h-11 rounded-xl border text-[11px] font-black transition ${
                          sourceCadence === cadence
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {cadence === 'monthly' ? 'شهري (راتب)' : 'يومي (استلام)'}
                      </button>
                    ))}
                  </div>
                </div>
                {sourceCadence === 'monthly' && (
                  <div className="space-y-1.5">
                    <label htmlFor="source-day" className="block font-bold text-slate-500">يوم الاستحقاق في الشهر</label>
                    <input
                      id="source-day" type="number" min="1" max="28"
                      value={sourceDay}
                      onChange={(event) => setSourceDay(event.target.value === '' ? '' : Number(event.target.value))}
                      className={inputClass}
                    />
                    <p className="text-[10px] text-slate-400">
                      حتى 28 فقط، فلا ينكسر التذكير في فبراير. لا يظهر المصدر مستحقاً قبل هذا اليوم.
                    </p>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="min-h-12 flex-1 rounded-xl bg-slate-800 text-xs font-black text-white transition hover:bg-slate-900">
                    {editingSource ? 'حفظ التعديل' : 'إضافة المصدر'}
                  </button>
                  <button type="button" onClick={() => setIsSourceOpen(false)} className="min-h-12 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {collecting && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md" id="income-collect-modal">
            <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">تأكيد الاستلام</h2>
                <button type="button" onClick={() => setCollecting(null)} aria-label="إغلاق" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={submitCollect} className="space-y-4 p-5 text-xs">
                {collectError && <FormError message={collectError} />}
                <p className="rounded-xl bg-slate-50 p-3 text-[11px] leading-6 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                  <strong className="font-black">{collecting.title}</strong> — تُسجَّل الدفعة بتاريخ اليوم {formatDate(today)}.
                </p>
                <div className="space-y-1.5">
                  <label htmlFor="collect-amount" className="block font-bold text-slate-500">المبلغ المستلَم فعلاً ({currency})</label>
                  <input
                    id="collect-amount" type="number" min="1" required autoFocus
                    value={collectAmount}
                    onChange={(event) => setCollectAmount(event.target.value === '' ? '' : Number(event.target.value))}
                    className={inputClass}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="min-h-12 flex-1 rounded-xl bg-emerald-600 text-xs font-black text-white transition hover:bg-emerald-700">
                    تأكيد الاستلام
                  </button>
                  <button type="button" onClick={() => setCollecting(null)} className="min-h-12 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        </ModalPortal>
      )}

      {confirmDelete && (
        <ModalPortal>
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-md" id="income-delete-modal">
            <div className="w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">تأكيد الحذف</h2>
              <p className="mt-2 text-[11px] leading-6 text-slate-600 dark:text-slate-300">
                سيُحذف «{confirmDelete.label}» نهائياً.
                {confirmDelete.kind === 'source' && ' الدفعات المسجَّلة منه تبقى كما هي.'}
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={runDelete} className="min-h-12 flex-1 rounded-xl bg-rose-600 text-xs font-black text-white transition hover:bg-rose-700">
                  حذف
                </button>
                <button type="button" onClick={() => setConfirmDelete(null)} className="min-h-12 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
