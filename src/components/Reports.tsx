import React, { useMemo, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { 
  PieChart as PieIcon, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  ArrowRightLeft,
  Calendar,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { Debt, Expense, Budget } from '../types';
import { formatCurrency, formatDate, getCurrentMonthString } from '../utils';

interface ReportsProps {
  debts: Debt[];
  expenses: Expense[];
  budgets: Budget[];
  currency: string;
}

export default function Reports({ debts, expenses, budgets, currency }: ReportsProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());

  // Available months list based on expenses & budgets
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    // Add current month
    monthsSet.add(getCurrentMonthString());
    // Add months from expenses
    expenses.forEach(e => {
      if (e.date && e.date.length >= 7) {
        monthsSet.add(e.date.substring(0, 7));
      }
    });
    // Add months from budgets
    budgets.forEach(b => monthsSet.add(b.month));
    
    return Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
  }, [expenses, budgets]);

  // --- Expenses Chart Calculations ---
  const monthlyExpensesList = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(selectedMonth) && !e.projectId);
  }, [expenses, selectedMonth]);

  const expensesCategoryData = useMemo(() => {
    const groups: Record<string, number> = {};
    monthlyExpensesList.forEach(e => {
      groups[e.category] = (groups[e.category] || 0) + e.amount;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [monthlyExpensesList]);

  const totalSpent = useMemo(() => {
    return monthlyExpensesList.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpensesList]);

  // --- Debts Chart Calculations ---
  // Debts breakdown per Person (excluding project-related debts)
  const debtsByPersonData = useMemo(() => {
    const people: Record<string, { name: string; 'أطلبهم (لي)': number; 'يطلبوني (علي)': number }> = {};
    
    debts.forEach(d => {
      if (d.projectId) return; // Exclude project debts
      const activeAmt = d.amount - d.paidAmount;
      if (activeAmt <= 0) return; // Only show active debts

      if (!people[d.personName]) {
        people[d.personName] = { name: d.personName, 'أطلبهم (لي)': 0, 'يطلبوني (علي)': 0 };
      }

      if (d.type === 'to_me') {
        people[d.personName]['أطلبهم (لي)'] += activeAmt;
      } else {
        people[d.personName]['يطلبوني (علي)'] += activeAmt;
      }
    });

    return Object.values(people).slice(0, 10); // Show top 10 people
  }, [debts]);

  // Total debt summaries (excluding project-related debts)
  const totalDebtsSummary = useMemo(() => {
    let toMeTotal = 0;
    let toMePaid = 0;
    let toOthersTotal = 0;
    let toOthersPaid = 0;

    debts.forEach(d => {
      if (d.projectId) return; // Exclude project debts
      if (d.type === 'to_me') {
        toMeTotal += d.amount;
        toMePaid += d.paidAmount;
      } else {
        toOthersTotal += d.amount;
        toOthersPaid += d.paidAmount;
      }
    });

    return {
      toMeTotal,
      toMeRemaining: toMeTotal - toMePaid,
      toOthersTotal,
      toOthersRemaining: toOthersTotal - toOthersPaid,
    };
  }, [debts]);

  // Pie chart COLORS
  const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6', '#14b8a6', '#6366f1'];

  return (
    <div className="space-y-6" id="reports-viewport">
      {/* Top Header & Month Picker */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="reports-header">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">التقارير الرسومية والتحليلات 📊</h1>
          <p className="text-xs text-slate-400">تحليل فني لمصاريفك اليومية وموازنة الديون المستحقة والمطلوبة</p>
        </div>

        <div className="flex items-center gap-2" id="reports-month-picker-wrapper">
          <span className="text-xs text-slate-500 font-bold">شهر التقرير:</span>
          <select
            id="reports-month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {formatDate(m + '-01').substring(3)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="reports-stats-grid">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold block">إجمالي ديون لك (معلقة)</span>
            <span className="text-xl font-extrabold text-sky-600">{formatCurrency(totalDebtsSummary.toMeRemaining, currency)}</span>
            <span className="text-[10px] text-slate-400 block">من إجمالي: {formatCurrency(totalDebtsSummary.toMeTotal, currency)}</span>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold block">إجمالي ديون عليك (معلقة)</span>
            <span className="text-xl font-extrabold text-rose-600">{formatCurrency(totalDebtsSummary.toOthersRemaining, currency)}</span>
            <span className="text-[10px] text-slate-400 block">من إجمالي: {formatCurrency(totalDebtsSummary.toOthersTotal, currency)}</span>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold block">المصروفات الفعلية للشهر</span>
            <span className="text-xl font-extrabold text-slate-800">{formatCurrency(totalSpent, currency)}</span>
            <span className="text-[10px] text-slate-400 block">لشهر {selectedMonth}</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-700 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-bold block">صافي الالتزام المالي</span>
            <span className={`text-xl font-extrabold ${totalDebtsSummary.toMeRemaining - totalDebtsSummary.toOthersRemaining >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {formatCurrency(totalDebtsSummary.toMeRemaining - totalDebtsSummary.toOthersRemaining, currency)}
            </span>
            <span className="text-[10px] text-slate-400 block">الفرق بين الديون المستحقة لك وعليك</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="reports-charts-container">
        {/* Card 1: Expense Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4" id="reports-expenses-pie-card">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-800 text-sm">توزيع المصروفات لشهر {selectedMonth}</h3>
            </div>
            <span className="text-[10px] text-slate-400">إجمالي {formatCurrency(totalSpent, currency)}</span>
          </div>

          <div className="h-64 relative flex items-center justify-center" id="reports-pie-chart-container">
            {expensesCategoryData.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-12 flex flex-col items-center gap-2">
                <PieIcon className="w-10 h-10 text-slate-200" />
                <span>لا توجد مصاريف مسجلة لهذا الشهر لعرض تقريرها البياني.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expensesCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} ${currency}`, '']} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Card 2: Debt Per Person Bar Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4" id="reports-debt-by-person-card">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-600" />
              <h3 className="font-bold text-slate-800 text-sm">مستحقات الديون النشطة حسب الشخص</h3>
            </div>
            <span className="text-[10px] text-slate-400">أعلى 10 أشخاص معلقين</span>
          </div>

          <div className="h-64" id="reports-bar-chart-container">
            {debtsByPersonData.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-12 flex flex-col items-center gap-2">
                <Users className="w-10 h-10 text-slate-200" />
                <span>لا توجد ديون نشطة (متبقية) مسجلة حالياً لعرض تفصيل الأشخاص.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={debtsByPersonData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`${value} ${currency}`, '']} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="أطلبهم (لي)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="يطلبوني (علي)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Analytics Insights Dashboard Row */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row gap-6 justify-between items-stretch" id="reports-intelligent-insights">
        <div className="space-y-3 md:flex-1">
          <div className="flex items-center gap-2 text-amber-400 font-bold">
            <Sparkles className="w-5 h-5" />
            <span>نصائح وملاحظات النظام الذكية 💡</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            {totalDebtsSummary.toOthersRemaining > totalDebtsSummary.toMeRemaining ? (
              <span>
                إن التزاماتك المالية للآخرين ({formatCurrency(totalDebtsSummary.toOthersRemaining, currency)}) تتخطى مستحقاتك عند الناس بمقدار {formatCurrency(totalDebtsSummary.toOthersRemaining - totalDebtsSummary.toMeRemaining, currency)}. ننصحك بإعادة جدولة ديونك وتوفير جزء أكبر من ميزانيتك الشهرية لسداد الديون ذات الأولوية العالية أو المتأخرة لتخفيف الضغط الائتماني.
              </span>
            ) : totalDebtsSummary.toMeRemaining > 0 ? (
              <span>
                رائع! ذمتك المالية إيجابية؛ فمستحقاتك الخارجية ({formatCurrency(totalDebtsSummary.toMeRemaining, currency)}) تفوق ديونك للآخرين. استخدم أدوات التذكير عبر الواتساب لتنشيط تجميع الديون الراكدة لإعادة استثمارها في ميزانيتك الشهرية.
              </span>
            ) : (
              <span>
                وضعك المالي مستقر حالياً، ولا توجد عليك أو لك ديون نشطة معلقة. يعتبر هذا الوقت مثالياً للتوفير وإنشاء صندوق طوارئ من خلال خفض المصاريف الشهرية غير الضرورية.
              </span>
            )}
          </p>
        </div>

        <div className="md:w-px md:bg-slate-800 self-stretch"></div>

        <div className="space-y-2 md:w-80 shrink-0 flex flex-col justify-center">
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>معدل السيولة المتاحة (تقديري):</span>
            <span className="font-bold text-emerald-400">آمن</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>نسبة الديون المسددة بالكامل:</span>
            <span className="font-bold text-sky-400">
              {debts.filter(d => !d.projectId).length > 0 
                ? `${Math.round((debts.filter(d => !d.projectId && d.status === 'paid').length / debts.filter(d => !d.projectId).length) * 100)}%` 
                : '0%'
              }
            </span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>فئة المصاريف الأعلى هذا الشهر:</span>
            <span className="font-bold text-amber-400">
              {expensesCategoryData.length > 0 ? expensesCategoryData[0].name : 'لا يوجد'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
