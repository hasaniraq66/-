import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { Expense, Budget } from '../types';
import { formatCurrency } from '../utils';
import { Flame, AlertCircle, CheckCircle, Info } from 'lucide-react';

interface BudgetBurndownChartProps {
  expenses: Expense[];
  budget: Budget | null;
  currency: string;
}

export default function BudgetBurndownChart({ expenses, budget, currency }: BudgetBurndownChartProps) {
  const monthlyLimit = budget ? budget.monthlyLimit : 0;
  const budgetMonth = budget ? budget.month : useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Calculate days in the budget month
  const daysInMonth = useMemo(() => {
    const [year, month] = budgetMonth.split('-').map(Number);
    if (!year || !month) return 30;
    return new Date(year, month, 0).getDate();
  }, [budgetMonth]);

  // Determine today's day if we are viewing the current month
  const today = useMemo(() => new Date(), []);
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const isCurrentMonth = budgetMonth === currentMonthStr;
  const todayDay = isCurrentMonth ? today.getDate() : daysInMonth;

  // Filter expenses for this budget month
  const currentMonthExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(budgetMonth));
  }, [expenses, budgetMonth]);

  // Process data for the burn-down chart
  const chartData = useMemo(() => {
    if (monthlyLimit <= 0) return [];

    const data = [];
    const idealSpentPerDay = monthlyLimit / daysInMonth;

    // Day 0: Start of the month (Baseline)
    data.push({
      day: 0,
      dayLabel: 'البداية',
      'الميزانية المثالية (المخططة)': monthlyLimit,
      'الميزانية الفعلية المتبقية': monthlyLimit,
    });

    for (let i = 1; i <= daysInMonth; i++) {
      // Ideal Remaining
      const idealRemaining = Math.max(0, Number((monthlyLimit - idealSpentPerDay * i).toFixed(1)));

      // Actual Spent up to day i
      const totalSpentUpToDay = currentMonthExpenses
        .filter(e => {
          const day = parseInt(e.date.split('-')[2], 10);
          return day <= i;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      const actualRemaining = monthlyLimit - totalSpentUpToDay;

      // Only plot actual line up to today if it's the current month
      const showActual = i <= todayDay;

      data.push({
        day: i,
        dayLabel: `${i}`,
        'الميزانية المثالية (المخططة)': idealRemaining,
        ...(showActual ? { 'الميزانية الفعلية المتبقية': Number(actualRemaining.toFixed(1)) } : {}),
      });
    }

    return data;
  }, [monthlyLimit, daysInMonth, currentMonthExpenses, todayDay]);

  // Determine current status: under or over the ideal spending line today
  const spendingStatus = useMemo(() => {
    if (monthlyLimit <= 0 || chartData.length === 0) return null;

    const todayData = chartData.find(d => d.day === todayDay);
    if (!todayData) return null;

    const idealRemaining = todayData['الميزانية المثالية (المخططة)'];
    const actualRemaining = todayData['الميزانية الفعلية المتبقية'];

    if (actualRemaining === undefined) return null;

    const difference = actualRemaining - idealRemaining;
    const isUnderBudget = difference >= 0; // Remaining actual is more than remaining ideal (spending slower)

    return {
      isUnderBudget,
      difference: Math.abs(difference),
      actualRemaining,
      idealRemaining
    };
  }, [chartData, todayDay, monthlyLimit]);

  // Custom tooltips to present details beautifully
  const CustomBurndownTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-800 shadow-xl text-right text-xs space-y-2 font-bold select-none min-w-[160px]">
          <p className="text-slate-300 border-b border-slate-800 pb-1.5 font-black">اليوم {label}</p>
          <div className="space-y-1.5">
            {payload.map((pld: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-6">
                <span style={{ color: pld.color }} className="text-[10px] font-semibold">{pld.name}:</span>
                <span className="font-black text-xs" style={{ color: pld.color }}>
                  {formatCurrency(pld.value, currency)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-100 space-y-6" id="budget-burndown-viewport">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-4">
        <div className="space-y-1 text-right">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-sky-600 animate-pulse" />
            <span>معدل حرق الميزانية (Burn-down Chart) 🔥</span>
          </h3>
          <p className="text-xs text-slate-400 font-bold">
            مخطط بياني يوضح استهلاك الميزانية الشهرية والمسار المتبقي الفعلي مقابل المخطط له
          </p>
        </div>

        {/* Currency status badge */}
        <span className="text-[10px] font-black text-sky-600 bg-sky-50 dark:bg-sky-950/30 px-3 py-1 rounded-full border border-sky-100 dark:border-sky-900">
          الميزانية المرصودة: {formatCurrency(monthlyLimit, currency)}
        </span>
      </div>

      {monthlyLimit <= 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3 border border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
          <Info className="w-8 h-8 text-slate-300" />
          <p className="font-bold text-slate-600">لم يتم تعيين حد ميزانية شهري لهذا الشهر.</p>
          <p className="text-slate-400 max-w-sm">
            يرجى تعيين حد للميزانية الشهرية في صفحة الميزانية لعرض مخطط حرق الميزانية وحماية نفقاتك بذكاء.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Status Message Badge */}
          {spendingStatus && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 border text-xs leading-relaxed ${
              spendingStatus.isUnderBudget 
                ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                : 'bg-rose-50/50 border-rose-100 text-rose-800'
            }`} id="spending-status-banner">
              {spendingStatus.isUnderBudget ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 text-right flex-1">
                <p className="font-extrabold text-sm">
                  {spendingStatus.isUnderBudget 
                    ? 'ممتاز! معدل استهلاك الميزانية تحت المخطط له 🎉' 
                    : 'تنبيه: معدل استهلاك الميزانية يتجاوز المخطط له! ⚠️'}
                </p>
                <p className="font-bold opacity-90">
                  {spendingStatus.isUnderBudget 
                    ? `أنت توفر حالياً ما يقارب ${formatCurrency(spendingStatus.difference, currency)} مقارنة بمتوسط الإنفاق المثالي اليومي.`
                    : `نفقاتك الفعلية أسرع من خط الحرق المخطط بحدود ${formatCurrency(spendingStatus.difference, currency)}. ينصح بترشيد الاستهلاك.`}
                </p>
              </div>
            </div>
          )}

          {/* Chart Wrapper */}
          <div className="h-72 w-full pr-1" id="burndown-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="dayLabel" 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  dy={6}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  axisLine={false}
                  dx={-6}
                  tickFormatter={(val) => `${val}`}
                />
                <Tooltip content={<CustomBurndownTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                  iconType="circle"
                />
                {/* Ideal spending line (dotted, slate/sky) */}
                <Line 
                  type="monotone" 
                  dataKey="الميزانية المثالية (المخططة)" 
                  stroke="#94a3b8" 
                  strokeDasharray="5 5" 
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                />
                {/* Actual spending line (solid, sky blue or amber based on budget state) */}
                <Line 
                  type="monotone" 
                  dataKey="الميزانية الفعلية المتبقية" 
                  stroke={spendingStatus?.isUnderBudget ? '#10b981' : '#f59e0b'} 
                  strokeWidth={3}
                  dot={{ r: 3, strokeWidth: 1 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Burn-down legend description details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-500 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
            <div className="space-y-1">
              <span className="text-slate-800 flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#94a3b8] rounded-full border border-dashed border-white inline-block"></span>
                <span>المسار المثالي (المخطط)</span>
              </span>
              <p className="text-[10px] text-slate-400 font-semibold pr-4 leading-relaxed">
                يمثل التوزيع المتساوي لإنفاق الميزانية بالتساوي على أيام الشهر حتى نصل للصفر في نهاية الشهر.
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-slate-800 flex items-center gap-1.5">
                <span className="w-3 h-3 bg-sky-500 rounded-full inline-block"></span>
                <span>المسار الفعلي المتبقي</span>
              </span>
              <p className="text-[10px] text-slate-400 font-semibold pr-4 leading-relaxed">
                يوضح المبلغ المتبقي من الميزانية فعلياً بعد حسم النفقات والمصاريف اليومية المسجلة.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
