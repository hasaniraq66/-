import { useMemo } from 'react';
import { Bar, BarChart, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, Wallet } from 'lucide-react';
import type { Budget, Debt, Expense } from '../types';
import { getCurrentMonthString } from '../utils';
import BudgetBurndownChart from './BudgetBurndownChart';
import CashFlowChart from './CashFlowChart';

type DashboardAnalyticsProps = {
  debts: Debt[];
  expenses: Expense[];
  budget: Budget | null;
  currency: string;
};

const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#64748b'];

export default function DashboardAnalytics({ debts, expenses, budget, currency }: DashboardAnalyticsProps) {
  const totalToMe = useMemo(() => debts.filter((debt) => debt.type === 'to_me').reduce((sum, debt) => sum + debt.amount, 0), [debts]);
  const totalToOthers = useMemo(() => debts.filter((debt) => debt.type === 'to_others').reduce((sum, debt) => sum + debt.amount, 0), [debts]);
  const paidToMe = useMemo(() => debts.filter((debt) => debt.type === 'to_me').reduce((sum, debt) => sum + debt.paidAmount, 0), [debts]);
  const paidToOthers = useMemo(() => debts.filter((debt) => debt.type === 'to_others').reduce((sum, debt) => sum + debt.paidAmount, 0), [debts]);
  const monthlyExpenses = useMemo(() => expenses.filter((expense) => expense.date.startsWith(getCurrentMonthString())).reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const expenseCategoriesData = useMemo(() => {
    const totals = new Map<string, number>();
    expenses.filter((expense) => expense.date.startsWith(getCurrentMonthString())).forEach((expense) => totals.set(expense.category, (totals.get(expense.category) || 0) + expense.amount));
    return Array.from(totals, ([name, value]) => ({ name, value }));
  }, [expenses]);
  const debtChartData = [
    { name: 'ديون لنا', 'المدفوع منها': paidToMe, 'المتبقي (المستحق)': Math.max(0, totalToMe - paidToMe) },
    { name: 'ديون علينا', 'المدفوع منها': paidToOthers, 'المتبقي (المستحق)': Math.max(0, totalToOthers - paidToOthers) },
  ];

  return (
    <div className="space-y-4" id="dashboard-analytics-content">
      <CashFlowChart debts={debts} currency={currency} />
      <BudgetBurndownChart expenses={expenses} budget={budget} currency={currency} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" id="dashboard-details-row">
        <div className="space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs lg:col-span-2" id="dashboard-chart-debt-compare">
          <div className="flex items-center justify-between"><h2 className="text-base font-bold text-slate-800">مقارنة الديون الحالية</h2><span className="text-xs text-slate-400">مقارنة الديون المترتبة والمستحقة</span></div>
          <div className="h-64" id="debt-bar-chart-container">
            {totalToMe === 0 && totalToOthers === 0 ? <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-sm text-slate-400"><Calendar className="h-8 w-8 text-slate-300" /><span>لا توجد بيانات ديون مسجلة بعد لعرض المخطط البياني.</span></div> : <ResponsiveContainer width="100%" height="100%"><BarChart data={debtChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}><XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} /><YAxis stroke="#64748b" fontSize={11} tickLine={false} /><Tooltip formatter={(value) => [`${value ?? 0} ${currency}`, '']} /><Legend wrapperStyle={{ fontSize: '11px' }} /><Bar dataKey="المدفوع منها" fill="#10b981" radius={[4, 4, 0, 0]} barSize={35} /><Bar dataKey="المتبقي (المستحق)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={35} /></BarChart></ResponsiveContainer>}
          </div>
        </div>
        <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-xs" id="dashboard-chart-expenses-pie">
          <div className="space-y-1"><h2 className="text-base font-bold text-slate-800">توزيع مصاريف الشهر</h2><p className="text-xs text-slate-400">حسب فئات المصاريف المسجلة</p></div>
          <div className="relative flex h-44 items-center justify-center" id="expense-pie-chart-container">
            {expenseCategoriesData.length === 0 ? <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-sm text-slate-400"><Wallet className="h-7 w-7 text-slate-300" /><span>لا توجد مصاريف للشهر الحالي</span></div> : <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={expenseCategoriesData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value">{expenseCategoriesData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => [`${value ?? 0} ${currency}`, '']} /></PieChart></ResponsiveContainer>}
          </div>
          {expenseCategoriesData.length > 0 && <div className="max-h-28 space-y-1.5 overflow-y-auto pr-1 text-xs text-slate-600">{expenseCategoriesData.map((entry, index) => <div key={entry.name} className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} /><span className="truncate">{entry.name}</span></div><div className="shrink-0 font-medium text-slate-700"><span>{entry.value} {currency}</span><span className="mr-1 text-[10px] text-slate-400">({Math.round((entry.value / monthlyExpenses) * 100)}%)</span></div></div>)}</div>}
        </div>
      </div>
    </div>
  );
}
