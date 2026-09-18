import React, { useMemo, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { Debt } from '../types';
import { formatCurrency } from '../utils';
import { TrendingUp, CheckCircle, Clock, Calendar, ArrowUpRight, Percent } from 'lucide-react';

interface CashFlowChartProps {
  debts: Debt[];
  currency: string;
}

export default function CashFlowChart({ debts, currency }: CashFlowChartProps) {
  const [timeframe, setTimeframe] = useState<'6m' | '12m' | 'all'>('6m');

  // Custom interactive Tooltip for professional, high-fidelity UI/UX
  const CustomFlowTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-800 shadow-xl text-right text-xs space-y-2 font-bold select-none min-w-[145px]">
          <p className="text-slate-200 border-b border-slate-800 pb-1.5 font-black">{label}</p>
          <div className="space-y-1.5">
            {payload.map((pld: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-6">
                <span style={{ color: pld.stroke || pld.color }} className="text-[10px] font-semibold">{pld.name}:</span>
                <span className="font-black text-xs" style={{ color: pld.stroke || pld.color }}>{formatCurrency(pld.value, currency)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  // Process data to calculate monthly outstanding vs paid
  const monthlyData = useMemo(() => {
    const monthMap: Record<string, { outstanding: number; paid: number; total: number }> = {};

    // Helper to get standard "YYYY-MM" from a date string
    const getYearMonth = (dateStr: string) => {
      if (!dateStr || dateStr.length < 7) return '';
      return dateStr.substring(0, 7); // "YYYY-MM"
    };

    // 1. Process all debts
    debts.forEach((debt) => {
      // Exclude project-specific debts since we want general debts
      if (debt.projectId) return;

      const debtMonth = getYearMonth(debt.startDate || debt.dueDate || '');
      if (!debtMonth) return;

      if (!monthMap[debtMonth]) {
        monthMap[debtMonth] = { outstanding: 0, paid: 0, total: 0 };
      }

      // Remaining/unpaid debt amount (outstanding)
      const outstandingAmt = debt.amount - debt.paidAmount;
      monthMap[debtMonth].outstanding += outstandingAmt;
      monthMap[debtMonth].total += debt.amount;

      // Handle debt paid amount. 
      // If there are installments, we will process them separately to assign payments to their precise payment months.
      // If there are no installments but there is a paid amount, we attribute it to the debt's start month.
      if (debt.paidAmount > 0) {
        if (!debt.installments || debt.installments.length === 0) {
          monthMap[debtMonth].paid += debt.paidAmount;
        } else {
          // Verify if there's any discrepancy between installments and paidAmount
          const installmentTotal = debt.installments.reduce((sum, inst) => sum + inst.amount, 0);
          if (installmentTotal < debt.paidAmount) {
            // Allocate the unrecorded paid difference to the starting month
            monthMap[debtMonth].paid += (debt.paidAmount - installmentTotal);
          }
        }
      }
    });

    // 2. Process all installments separately to distribute payments across correct months
    debts.forEach((debt) => {
      if (debt.projectId) return; // Exclude project debts

      if (debt.installments && debt.installments.length > 0) {
        debt.installments.forEach((inst) => {
          const instMonth = getYearMonth(inst.date);
          if (!instMonth) return;

          if (!monthMap[instMonth]) {
            monthMap[instMonth] = { outstanding: 0, paid: 0, total: 0 };
          }

          monthMap[instMonth].paid += inst.amount;
        });
      }
    });

    // Convert map to array and sort chronologically
    let sortedMonths = Object.keys(monthMap).sort();

    // If empty or has very little data, pre-populate with the last 6 months for a clean, professional look
    if (sortedMonths.length === 0) {
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const yMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthMap[yMonth] = { outstanding: 0, paid: 0, total: 0 };
      }
      sortedMonths = Object.keys(monthMap).sort();
    }

    const data = sortedMonths.map((month) => {
      // Format Arabic month label (e.g. "يونيو 2026" or "06-2026")
      const [year, m] = month.split('-');
      const monthNames = [
        'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
        'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
      ];
      const monthIdx = parseInt(m, 10) - 1;
      const formattedLabel = monthIdx >= 0 && monthIdx < 12 
        ? `${monthNames[monthIdx]} ${year}` 
        : month;

      return {
        month,
        label: formattedLabel,
        'الديون المستحقة': Math.round(monthMap[month].outstanding),
        'الديون المدفوعة': Math.round(monthMap[month].paid),
        'إجمالي الديون المسجلة': Math.round(monthMap[month].total),
      };
    });

    // Apply timeframe filter
    if (timeframe === '6m') {
      return data.slice(-6);
    } else if (timeframe === '12m') {
      return data.slice(-12);
    }
    return data;
  }, [debts, timeframe]);

  // Overall statistics for the selected timeframe
  const summaryStats = useMemo(() => {
    let totalRegistered = 0;
    let totalOutstanding = 0;
    let totalPaid = 0;

    monthlyData.forEach(item => {
      totalRegistered += item['إجمالي الديون المسجلة'];
      totalOutstanding += item['الديون المستحقة'];
      totalPaid += item['الديون المدفوعة'];
    });

    const recoveryRate = totalRegistered > 0 
      ? Math.round((totalPaid / totalRegistered) * 100) 
      : 0;

    return {
      totalRegistered,
      totalOutstanding,
      totalPaid,
      recoveryRate
    };
  }, [monthlyData]);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-100 space-y-6" id="cash-flow-viewport">
      {/* Header with Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-4">
        <div className="space-y-1 text-right">
          <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <span>مخطط التدفق المالي للديون (Cash Flow) 📈</span>
          </h3>
          <p className="text-xs text-slate-400 font-bold">تتبع وتحليل الديون المستحقة مقابل الديون المدفوعة بشكل شهري</p>
        </div>

        {/* Custom timeframe picker */}
        <div className="flex bg-slate-50 border border-slate-200/80 p-1 rounded-xl self-end sm:self-auto" id="cash-flow-timeframe-selector">
          <button
            onClick={() => setTimeframe('6m')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              timeframe === '6m' 
                ? 'bg-white text-slate-800 shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            آخر 6 أشهر
          </button>
          <button
            onClick={() => setTimeframe('12m')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              timeframe === '12m' 
                ? 'bg-white text-slate-800 shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            آخر 12 شهر
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              timeframe === 'all' 
                ? 'bg-white text-slate-800 shadow-3xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            الكل
          </button>
        </div>
      </div>

      {/* KPI Cards inside Cash Flow Component */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="cash-flow-kpi-grid">
        {/* Total Registered */}
        <div className="bg-slate-50/50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <span className="text-[10px] font-bold text-slate-400 block">إجمالي الديون المسجلة</span>
            <span className="text-sm font-black text-slate-800 block">{formatCurrency(summaryStats.totalRegistered, currency)}</span>
          </div>
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Total Outstanding */}
        <div className="bg-amber-50/30 border border-amber-100 p-4 rounded-2xl flex items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <span className="text-[10px] font-bold text-amber-600 block">الديون المستحقة (المتبقية)</span>
            <span className="text-sm font-black text-amber-700 block">{formatCurrency(summaryStats.totalOutstanding, currency)}</span>
          </div>
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Clock className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-emerald-50/30 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <span className="text-[10px] font-bold text-emerald-600 block">الديون المدفوعة (المسددة)</span>
            <span className="text-sm font-black text-emerald-700 block">{formatCurrency(summaryStats.totalPaid, currency)}</span>
          </div>
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Recovery Rate */}
        <div className="bg-violet-50/30 border border-violet-100 p-4 rounded-2xl flex items-center justify-between gap-3">
          <div className="space-y-1 text-right">
            <span className="text-[10px] font-bold text-violet-600 block">نسبة التحصيل والاسترداد</span>
            <span className="text-sm font-black text-violet-700 block">{summaryStats.recoveryRate}%</span>
          </div>
          <div className="p-2.5 bg-violet-50 text-violet-600 rounded-xl shrink-0">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-72 w-full pr-1" id="cash-flow-chart-container">
        {summaryStats.totalRegistered === 0 && summaryStats.totalPaid === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs gap-2 border border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
            <TrendingUp className="w-8 h-8 text-slate-300" />
            <span>لا توجد مبالغ ديون أو دفعات مسجلة في هذه الفترة لعرض منحنى التدفق.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorOutstanding" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="label" 
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
              />
              <Tooltip content={<CustomFlowTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                iconType="circle"
              />
              <Area 
                type="monotone" 
                dataKey="الديون المستحقة" 
                stroke="#f59e0b" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorOutstanding)" 
              />
              <Area 
                type="monotone" 
                dataKey="الديون المدفوعة" 
                stroke="#10b981" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorPaid)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
