import { AlertTriangle, ArrowLeft, CalendarClock, CheckCircle2, PiggyBank, WalletCards } from 'lucide-react';
import { Budget, Debt, Expense } from '../types';
import { formatCurrency } from '../utils';
import { FinancialFocusItem, FinancialFocusTone, getFinancialFocusItems } from '../utils/financialFocus';

interface DailyFinancialFocusProps {
  debts: Debt[];
  expenses: Expense[];
  budget: Budget | null;
  currency: string;
  onNavigate: (tab: string) => void;
}

const toneStyles: Record<FinancialFocusTone, { card: string; icon: string; action: string; Icon: typeof AlertTriangle }> = {
  danger: { card: 'border-rose-100 bg-rose-50/70', icon: 'bg-rose-100 text-rose-600', action: 'text-rose-700 hover:text-rose-600', Icon: AlertTriangle },
  warning: { card: 'border-amber-100 bg-amber-50/70', icon: 'bg-amber-100 text-amber-700', action: 'text-amber-800 hover:text-amber-700', Icon: CalendarClock },
  info: { card: 'border-sky-100 bg-sky-50/70', icon: 'bg-sky-100 text-sky-700', action: 'text-sky-700 hover:text-sky-600', Icon: WalletCards },
  success: { card: 'border-emerald-100 bg-emerald-50/70', icon: 'bg-emerald-100 text-emerald-700', action: 'text-emerald-700 hover:text-emerald-600', Icon: CheckCircle2 },
};

/** بطاقة متابعة مركزة تشرح ما يحتاج انتباهاً اليوم، مع انتقال آمن إلى الوحدة المناسبة. */
export default function DailyFinancialFocus({ debts, expenses, budget, currency, onNavigate }: DailyFinancialFocusProps) {
  const focusItems = getFinancialFocusItems({ debts, expenses, budget });

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6" aria-labelledby="daily-financial-focus-heading">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 p-2 text-white shadow-sm">
            <PiggyBank className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="daily-financial-focus-heading" className="text-sm font-black text-slate-800 dark:text-slate-100">متابعة اليوم المالية</h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">أهم العناصر المستخرجة من بياناتك الحالية، دون أي تعديل تلقائي.</p>
          </div>
        </div>
        <span className="self-start rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:self-auto">تحديث مباشر</span>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {focusItems.map((item) => <FocusCard key={item.id} item={item} currency={currency} onNavigate={onNavigate} />)}
      </div>
    </section>
  );
}

function FocusCard({ item, currency, onNavigate }: { item: FinancialFocusItem; currency: string; onNavigate: (tab: string) => void }) {
  const style = toneStyles[item.tone];
  const Icon = style.Icon;

  return (
    <article className={`rounded-2xl border p-4 ${style.card}`}>
      <div className="flex items-start gap-3">
        <span className={`rounded-xl p-2 ${style.icon}`}><Icon className="h-4 w-4" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-black text-slate-800 dark:text-slate-100">{item.title}</h3>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-400">{item.description}</p>
          {typeof item.amount === 'number' && <p className="mt-2 text-sm font-black text-slate-800 dark:text-slate-100">{formatCurrency(item.amount, currency)}</p>}
          {item.targetTab && item.actionLabel && (
            <button type="button" onClick={() => onNavigate(item.targetTab!)} className={`mt-3 inline-flex items-center gap-1 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${style.action}`}>
              {item.actionLabel} <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
