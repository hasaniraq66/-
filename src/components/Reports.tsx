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
  Info,
  Download,
  Loader2,
  X,
  FileText
} from 'lucide-react';
import { Debt, Expense, Budget } from '../types';
import { formatCurrency, formatDate, getCurrentMonthString, getLocalDateString } from '../utils';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface ReportsProps {
  debts: Debt[];
  expenses: Expense[];
  budgets: Budget[];
  currency: string;
}

export default function Reports({ debts, expenses, budgets, currency }: ReportsProps) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());

  // PDF Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportType, setExportType] = useState<'monthly' | 'annual'>('monthly');
  const [exportMonth, setExportMonth] = useState(getCurrentMonthString());
  const [exportYear, setExportYear] = useState(getCurrentMonthString().substring(0, 4));
  const [isExporting, setIsExporting] = useState(false);

  // Available years list for annual reports
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    // Add current year
    yearsSet.add(new Date().getFullYear().toString());
    expenses.forEach(e => {
      if (e.date && e.date.length >= 4) {
        yearsSet.add(e.date.substring(0, 4));
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [expenses]);

  // --- Export calculations ---
  const exportMonthlyExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(exportMonth) && !e.projectId);
  }, [expenses, exportMonth]);

  const exportExpensesByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    exportMonthlyExpenses.forEach(e => {
      groups[e.category] = (groups[e.category] || 0) + e.amount;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [exportMonthlyExpenses]);

  const exportTotalSpent = useMemo(() => {
    return exportMonthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [exportMonthlyExpenses]);

  const exportAnnualExpenses = useMemo(() => {
    return expenses.filter(e => e.date.startsWith(exportYear) && !e.projectId);
  }, [expenses, exportYear]);

  const exportAnnualExpensesByCategory = useMemo(() => {
    const groups: Record<string, number> = {};
    exportAnnualExpenses.forEach(e => {
      groups[e.category] = (groups[e.category] || 0) + e.amount;
    });
    return Object.entries(groups)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [exportAnnualExpenses]);

  const exportAnnualExpensesByMonth = useMemo(() => {
    const monthsData: Record<string, number> = {};
    for (let i = 1; i <= 12; i++) {
      const mStr = `${exportYear}-${String(i).padStart(2, '0')}`;
      monthsData[mStr] = 0;
    }
    exportAnnualExpenses.forEach(e => {
      const m = e.date.substring(0, 7);
      if (monthsData[m] !== undefined) {
        monthsData[m] += e.amount;
      }
    });
    return Object.entries(monthsData)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }, [exportAnnualExpenses, exportYear]);

  const exportAnnualTotalSpent = useMemo(() => {
    return exportAnnualExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [exportAnnualExpenses]);

  const exportDebtsByPersonData = useMemo(() => {
    const people: Record<string, { name: string; toMe: number; toOthers: number }> = {};
    
    debts.forEach(d => {
      if (d.projectId) return; // Exclude project debts
      const activeAmt = d.amount - d.paidAmount;
      if (activeAmt <= 0) return;

      if (!people[d.personName]) {
        people[d.personName] = { name: d.personName, toMe: 0, toOthers: 0 };
      }

      if (d.type === 'to_me') {
        people[d.personName].toMe += activeAmt;
      } else {
        people[d.personName].toOthers += activeAmt;
      }
    });

    return Object.values(people);
  }, [debts]);

  const exportTotalDebtsSummary = useMemo(() => {
    let toMeTotal = 0;
    let toMePaid = 0;
    let toOthersTotal = 0;
    let toOthersPaid = 0;

    debts.forEach(d => {
      if (d.projectId) return;
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

  // Function to generate the PDF report
  const generatePDF = async () => {
    setIsExporting(true);
    try {
      const element = document.getElementById('pdf-report-content');
      if (!element) {
        alert('حدث خطأ أثناء إعداد قالب التقرير. الرجاء المحاولة مرة أخرى.');
        setIsExporting(false);
        return;
      }

      // Wait a brief moment to ensure React finished rendering any selection changes in DOM
      await new Promise((resolve) => setTimeout(resolve, 600));

      const canvas = await html2canvas(element, {
        scale: 2, // High resolution crisp text rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 size width in mm
      const pageHeight = 297; // A4 size height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const reportName = exportType === 'monthly' 
        ? `التقرير_المالي_الشهري_${exportMonth}.pdf` 
        : `التقرير_المالي_السنوي_${exportYear}.pdf`;

      pdf.save(reportName);
      setShowExportModal(false);
    } catch (error) {
      console.error('PDF export error:', error);
      alert('حدث خطأ أثناء تصدير ملف PDF. يرجى إعادة المحاولة.');
    } finally {
      setIsExporting(false);
    }
  };

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

        <div className="flex flex-wrap items-center gap-2.5" id="reports-month-picker-wrapper">
          <div className="flex items-center gap-2">
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

          <button
            id="export-reports-btn"
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition-all duration-200 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير التقارير (PDF)</span>
          </button>
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

      {/* PDF Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="export-reports-modal" style={{ direction: 'rtl' }}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <h2 className="text-base font-black text-slate-800">تصدير التقارير المالية (PDF)</h2>
              </div>
              <button 
                onClick={() => setShowExportModal(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 text-xs">
              
              {/* Report Type Choice */}
              <div className="space-y-2">
                <label className="block font-bold text-slate-600">نوع التقرير المراد تصديره:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setExportType('monthly')}
                    className={`p-3 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      exportType === 'monthly'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span>تقرير شهري ملخص</span>
                  </button>
                  <button
                    onClick={() => setExportType('annual')}
                    className={`p-3 rounded-xl border font-bold text-center transition-all cursor-pointer ${
                      exportType === 'annual'
                        ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span>تقرير سنوي شامل</span>
                  </button>
                </div>
              </div>

              {/* Date Selector depending on Type */}
              {exportType === 'monthly' ? (
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-600">اختر الشهر المالي:</label>
                  <select
                    value={exportMonth}
                    onChange={(e) => setExportMonth(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                  >
                    {availableMonths.map(m => (
                      <option key={m} value={m}>
                        {formatDate(m + '-01').substring(3)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-600">اختر السنة المالية:</label>
                  <select
                    value={exportYear}
                    onChange={(e) => setExportYear(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
                  >
                    {availableYears.map(y => (
                      <option key={y} value={y}>
                        سنة {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-xl text-[11px] text-amber-700 flex gap-2.5">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  سيتم توليد ملف PDF عالي الجودة يحتوي على كافة جداول المصروفات والديون والتحليلات الذكية للفترة المحددة.
                </p>
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
              <button
                onClick={() => setShowExportModal(false)}
                disabled={isExporting}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={generatePDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحميل...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>تحميل PDF</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Hidden HTML Template for PDF Export */}
      <div className="absolute -left-[9999px] -top-[9999px] bg-white text-slate-800" aria-hidden="true">
        <div 
          id="pdf-report-content" 
          className="w-[850px] p-10 bg-white space-y-8" 
          style={{ direction: 'rtl', fontFamily: "Cairo, 'Segoe UI', Tahoma, Arial, sans-serif" }}
        >
          {/* Page Header */}
          <div className="border-b-4 border-sky-600 pb-5 flex justify-between items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📊</span>
                <h1 className="text-2xl font-black text-slate-800">نظام إدارة الديون والمصاريف الذكي</h1>
              </div>
              <p className="text-xs text-slate-400">التقرير المالي الرسمي والتحليلات الدورية للميزانية</p>
            </div>
            <div className="text-left" style={{ textAlign: 'left' }}>
              <span className="inline-block px-3 py-1 bg-sky-50 text-sky-700 font-bold rounded-lg text-xs">
                {exportType === 'monthly' ? 'تقرير ملخص شهري' : 'تقرير سنوي شامل'}
              </span>
              <p className="text-[10px] text-slate-400 mt-1">تاريخ الاستخراج: {formatDate(getLocalDateString())}</p>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-semibold">الفترة المالية:</span>
                <span className="font-bold text-slate-700">
                  {exportType === 'monthly' 
                    ? formatDate(exportMonth + '-01').substring(3) 
                    : `سنة ${exportYear}`
                  }
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-semibold">عملة التقرير الأساسية:</span>
                <span className="font-bold text-slate-700">{currency}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-semibold">حالة الحساب المالي:</span>
                <span className="font-bold text-emerald-600">نشط ومستقر</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-1">
                <span className="text-slate-400 font-semibold">إجمالي الحركات المسجلة:</span>
                <span className="font-bold text-slate-700">
                  {exportType === 'monthly' ? exportMonthlyExpenses.length : exportAnnualExpenses.length} حركة مصروفات
                </span>
              </div>
            </div>
          </div>

          {/* KPI Indicators Row */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">إجمالي المصروفات</span>
              <span className="text-base font-extrabold text-slate-800">
                {formatCurrency(exportType === 'monthly' ? exportTotalSpent : exportAnnualTotalSpent, currency)}
              </span>
            </div>
            <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100 text-center">
              <span className="text-[10px] text-sky-600/80 font-bold block mb-1">ديون لك (مستحقة)</span>
              <span className="text-base font-extrabold text-sky-700">
                {formatCurrency(exportTotalDebtsSummary.toMeRemaining, currency)}
              </span>
            </div>
            <div className="p-4 bg-rose-50/50 rounded-xl border border-rose-100 text-center">
              <span className="text-[10px] text-rose-600/80 font-bold block mb-1">ديون عليك (مستحقة)</span>
              <span className="text-base font-extrabold text-rose-700">
                {formatCurrency(exportTotalDebtsSummary.toOthersRemaining, currency)}
              </span>
            </div>
            <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
              <span className="text-[10px] text-emerald-600/80 font-bold block mb-1">صافي الالتزام المالي</span>
              <span className={`text-base font-extrabold ${exportTotalDebtsSummary.toMeRemaining - exportTotalDebtsSummary.toOthersRemaining >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(exportTotalDebtsSummary.toMeRemaining - exportTotalDebtsSummary.toOthersRemaining, currency)}
              </span>
            </div>
          </div>

          {/* Section 1: Categories breakdown */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800 border-r-4 border-sky-600 pr-2">أولاً: توزيع المصروفات حسب الفئة</h3>
            <table className="w-full text-xs text-right border-collapse rounded-lg overflow-hidden border border-slate-100">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-3">اسم الفئة المصرفية</th>
                  <th className="p-3">إجمالي المنفق</th>
                  <th className="p-3">النسبة المئوية من الميزانية</th>
                  <th className="p-3 w-40">توزيع بصري للنسبة</th>
                </tr>
              </thead>
              <tbody>
                {(exportType === 'monthly' ? exportExpensesByCategory : exportAnnualExpensesByCategory).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">لا توجد مصاريف مسجلة في هذه الفترة الزمنية.</td>
                  </tr>
                ) : (
                  (exportType === 'monthly' ? exportExpensesByCategory : exportAnnualExpensesByCategory).map((cat) => {
                    const total = exportType === 'monthly' ? exportTotalSpent : exportAnnualTotalSpent;
                    const pct = total > 0 ? Math.round((cat.value / total) * 100) : 0;
                    return (
                      <tr key={cat.name} className="border-b border-slate-100">
                        <td className="p-3 font-bold text-slate-700">{cat.name}</td>
                        <td className="p-3 font-semibold text-slate-800">{formatCurrency(cat.value, currency)}</td>
                        <td className="p-3 font-semibold text-slate-500">{pct}%</td>
                        <td className="p-3">
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-sky-500 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Section 2: Details */}
          {exportType === 'monthly' ? (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-slate-800 border-r-4 border-sky-600 pr-2">ثانياً: سجل حركات المصروفات التفصيلي للملف</h3>
              <table className="w-full text-xs text-right border-collapse border border-slate-100">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">التاريخ</th>
                    <th className="p-3">الفئة</th>
                    <th className="p-3">البيان والوصف</th>
                    <th className="p-3">المبلغ المنفق</th>
                  </tr>
                </thead>
                <tbody>
                  {exportMonthlyExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">لا توجد حركات مصروفات تفصيلية مسجلة في هذا الشهر.</td>
                    </tr>
                  ) : (
                    exportMonthlyExpenses.slice(0, 30).map((exp) => (
                      <tr key={exp.id} className="border-b border-slate-100">
                        <td className="p-3 text-slate-500">{formatDate(exp.date)}</td>
                        <td className="p-3 font-semibold text-slate-600">{exp.category}</td>
                        <td className="p-3 text-slate-700">{exp.description || 'بلا وصف'}</td>
                        <td className="p-3 font-bold text-slate-800">{formatCurrency(exp.amount, currency)}</td>
                      </tr>
                    ))
                  )}
                  {exportMonthlyExpenses.length > 30 && (
                    <tr>
                      <td colSpan={4} className="p-3 text-center font-bold text-sky-600 bg-sky-50/30">
                        تم عرض أول 30 حركة فقط لضمان حجم وتنسيق التقرير. إجمالي الحركات الفعلي: {exportMonthlyExpenses.length}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-extrabold text-slate-800 border-r-4 border-sky-600 pr-2">ثانياً: توزيع المصروفات على مدار أشهر السنة المالية</h3>
              <table className="w-full text-xs text-right border-collapse border border-slate-100">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <th className="p-3">الشهر</th>
                    <th className="p-3">إجمالي المصروفات</th>
                    <th className="p-3">التمثيل البصري للتدفق النقدي</th>
                  </tr>
                </thead>
                <tbody>
                  {exportAnnualExpensesByMonth.map((item) => {
                    const maxSpent = Math.max(...exportAnnualExpensesByMonth.map(m => m.amount), 1);
                    const pct = Math.round((item.amount / maxSpent) * 100);
                    return (
                      <tr key={item.month} className="border-b border-slate-100">
                        <td className="p-3 font-bold text-slate-700">{formatDate(item.month + '-01').substring(3)}</td>
                        <td className="p-3 font-semibold text-slate-800">{formatCurrency(item.amount, currency)}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-48 bg-slate-100 h-3 rounded-md overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-md" style={{ width: `${pct}%` }}></div>
                            </div>
                            <span className="text-[10px] font-bold text-slate-400">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Section 3: Debts Statement */}
          <div className="space-y-3">
            <h3 className="text-sm font-extrabold text-slate-800 border-r-4 border-sky-600 pr-2">ثالثاً: كشف الديون والالتزامات النشطة</h3>
            <table className="w-full text-xs text-right border-collapse border border-slate-100">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                  <th className="p-3">الاسم والجهة المستحقة</th>
                  <th className="p-3">تصنيف المعاملة المالية</th>
                  <th className="p-3">المستحقات المعلقة (لي)</th>
                  <th className="p-3">المستحقات المعلقة (علي)</th>
                </tr>
              </thead>
              <tbody>
                {exportDebtsByPersonData.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400">لا توجد ديون نشطة معلقة في هذا البيان المالي.</td>
                  </tr>
                ) : (
                  exportDebtsByPersonData.map((person) => (
                    <tr key={person.name} className="border-b border-slate-100">
                      <td className="p-3 font-bold text-slate-700">{person.name}</td>
                      <td className="p-3">
                        {person.toMe > 0 && person.toOthers > 0 ? (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 font-bold rounded-full text-[9px] border border-amber-100">مزدوج المعاملات</span>
                        ) : person.toMe > 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded-full text-[9px] border border-emerald-100">أطلبه (لي)</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 font-bold rounded-full text-[9px] border border-rose-100">يطلبني (علي)</span>
                        )}
                      </td>
                      <td className={`p-3 font-bold ${person.toMe > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {person.toMe > 0 ? formatCurrency(person.toMe, currency) : '—'}
                      </td>
                      <td className={`p-3 font-bold ${person.toOthers > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {person.toOthers > 0 ? formatCurrency(person.toOthers, currency) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Section 4: System intelligent Insights */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
              <span>💡 نصائح وتوصيات النظام الذكية للتوفير المالي:</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {exportTotalDebtsSummary.toOthersRemaining > exportTotalDebtsSummary.toMeRemaining ? (
                <span>
                  إن التزاماتك المالية الحالية للآخرين بقيمة ({formatCurrency(exportTotalDebtsSummary.toOthersRemaining, currency)}) تتخطى مستحقاتك عند الناس بمقدار {formatCurrency(exportTotalDebtsSummary.toOthersRemaining - exportTotalDebtsSummary.toMeRemaining, currency)}. نوصي بالتركيز العالي على سداد الديون ذات الأولوية العالية أو المتأخرة لتخفيف الضغوط الائتمانية والتفاوض بلطف لجدولة سدادها.
                </span>
              ) : exportTotalDebtsSummary.toMeRemaining > 0 ? (
                <span>
                  ذمتك المالية الحالية إيجابية للغاية وممتازة؛ فمستحقاتك الخارجية بقيمة ({formatCurrency(exportTotalDebtsSummary.toMeRemaining, currency)}) تفوق ديونك للآخرين. ننصح بتنشيط وتفعيل التذكير الودي ومطالبة المدينين برفق لإعادة توجيه تلك السيولة إلى صندوق استثمارك الشهري.
                </span>
              ) : (
                <span>
                  وضعك المالي مستقر حالياً وخالٍ من الديون المعلقة. ننصح بالاستمرار في هذه الاستراتيجية وتوجيه فائض الدخل والميزانية نحو التوفير وإنشاء صندوق مالي لحالات الطوارئ.
                </span>
              )}
            </p>
          </div>

          {/* Professional Footer Statement */}
          <div className="pt-8 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
            <span>صادر من نظام إدارة الديون والمصاريف الذكي © ٢٠٢٦</span>
            <span className="font-mono">تم استخراج التقرير في {getLocalDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
