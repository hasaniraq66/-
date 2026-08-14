import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  CreditCard, 
  AlertTriangle, 
  Bell, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownLeft, 
  MessageSquare,
  Briefcase,
  Users,
  CheckCircle,
  Activity,
  X
} from 'lucide-react';
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
  Legend 
} from 'recharts';
import { Debt, Expense, Budget, SystemAlert, Project, Employee, SalaryPayment } from '../types';
import { formatCurrency, formatDate, generateAlerts, generateWhatsAppLink } from '../utils';
import CashFlowChart from './CashFlowChart';
import QuickEntry from './QuickEntry';
import BudgetBurndownChart from './BudgetBurndownChart';

interface DashboardProps {
  debts: Debt[];
  expenses: Expense[];
  budget: Budget | null;
  alerts: SystemAlert[];
  currency: string;
  onNavigate: (tab: string) => void;
  onMarkAlertAsRead: (id: string) => void;
  projects?: Project[];
  employees?: Employee[];
  salaryPayments?: SalaryPayment[];
  onAddDebt?: (debt: Omit<Debt, 'id' | 'paidAmount' | 'status' | 'installments'>) => void;
  onAddExpense?: (expense: Omit<Expense, 'id'>) => void;
  initialCapital?: number;
  onUpdateInitialCapital?: (newCapital: number) => void;
}

export default function Dashboard({
  debts,
  expenses,
  budget,
  alerts,
  currency,
  onNavigate,
  onMarkAlertAsRead,
  projects = [],
  employees = [],
  salaryPayments = [],
  onAddDebt = () => {},
  onAddExpense = () => {},
  initialCapital = 0,
  onUpdateInitialCapital = () => {},
}: DashboardProps) {
  // Calculate project performance metrics & statistics reports
  const projectStats = useMemo(() => {
    if (!projects || projects.length === 0) return null;

    const totalProjectsCount = projects.length;
    const activeProjectsCount = projects.filter(p => p.status === 'active').length;
    const completedProjectsCount = projects.filter(p => p.status === 'completed').length;

    // Total budgets
    const totalBudgetSum = projects.reduce((sum, p) => sum + p.budget, 0);

    // Total salary payments
    const totalSalaryPaymentsSum = salaryPayments.reduce((sum, sp) => sum + sp.amount, 0);

    // Total project-specific expenses (with e.projectId)
    const totalProjectExpensesSum = expenses
      .filter(e => e.projectId)
      .reduce((sum, e) => sum + e.amount, 0);

    // Total Spent so far (salaries + operational expenses)
    const totalProjectSpentSum = totalSalaryPaymentsSum + totalProjectExpensesSum;

    // Project Debts (we owe others on behalf of projects)
    const projectDebtsSum = debts
      .filter(d => d.projectId && d.type === 'to_others' && d.status !== 'paid')
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    // Project Receivables (clients owe us)
    const projectReceivablesSum = debts
      .filter(d => d.projectId && d.type === 'to_me' && d.status !== 'paid')
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    // Individual progress reports
    const projectsListWithProgress = projects.map(proj => {
      const projSalaries = salaryPayments
        .filter(sp => sp.projectId === proj.id)
        .reduce((sum, sp) => sum + sp.amount, 0);

      const projExpenses = expenses
        .filter(e => e.projectId === proj.id)
        .reduce((sum, e) => sum + e.amount, 0);

      const totalSpentOnProj = projSalaries + projExpenses;
      const progressPercent = proj.budget > 0 
        ? Math.min(Math.round((totalSpentOnProj / proj.budget) * 100), 100)
        : 0;

      const activeDebtsToOthers = debts
        .filter(d => d.projectId === proj.id && d.type === 'to_others' && d.status !== 'paid')
        .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

      const activeDebtsToMe = debts
        .filter(d => d.projectId === proj.id && d.type === 'to_me' && d.status !== 'paid')
        .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

      const empCount = employees.filter(e => e.projectId === proj.id).length;

      return {
        ...proj,
        totalSpent: totalSpentOnProj,
        progressPercent,
        activeDebtsToOthers,
        activeDebtsToMe,
        empCount
      };
    });

    return {
      totalProjectsCount,
      activeProjectsCount,
      completedProjectsCount,
      totalBudgetSum,
      totalSalaryPaymentsSum,
      totalProjectExpensesSum,
      totalProjectSpentSum,
      projectDebtsSum,
      projectReceivablesSum,
      projectsList: projectsListWithProgress
    };
  }, [projects, employees, salaryPayments, expenses, debts]);

  // Calculate any project exceeding debt ceiling
  const exceededProjects = useMemo(() => {
    return projects.filter(proj => {
      if (!proj.debtCeiling) return false;
      const projDebtsTotal = debts
        .filter(d => d.projectId === proj.id && d.type === 'to_others' && d.status !== 'paid')
        .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
      return projDebtsTotal > proj.debtCeiling;
    }).map(proj => {
      const projDebtsTotal = debts
        .filter(d => d.projectId === proj.id && d.type === 'to_others' && d.status !== 'paid')
        .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);
      return {
        ...proj,
        currentDebt: projDebtsTotal
      };
    });
  }, [projects, debts]);

  // 1. Calculate Debt Summaries
  const { totalToMe, totalToOthers, paidToMe, paidToOthers } = useMemo(() => {
    let toMe = 0;
    let toOthers = 0;
    let pToMe = 0;
    let pToOthers = 0;

    debts.forEach((d) => {
      // Exclude project-specific debts since we want only general/personal debts in general totals
      if (d.projectId) return;

      if (d.type === 'to_me') {
        toMe += d.amount;
        pToMe += d.paidAmount;
      } else {
        toOthers += d.amount;
        pToOthers += d.paidAmount;
      }
    });

    return {
      totalToMe: toMe,
      totalToOthers: toOthers,
      paidToMe: pToMe,
      paidToOthers: pToOthers,
    };
  }, [debts]);

  const activeToMe = totalToMe - paidToMe;
  const activeToOthers = totalToOthers - paidToOthers;

  // 2. Expenses this month
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const monthlyExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.date.startsWith(currentMonthStr))
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses, currentMonthStr]);

  const monthlyBudgetLimit = budget ? budget.monthlyLimit : 0;
  const remainingBudget = monthlyBudgetLimit - monthlyExpenses;
  const budgetPercentage = monthlyBudgetLimit > 0 
    ? Math.min(Math.round((monthlyExpenses / monthlyBudgetLimit) * 100), 100)
    : 0;

  // 3. Recharts Data: Debts overview
  const debtChartData = [
    {
      name: 'ديون لي (أريدها من الناس)',
      'المبلغ الإجمالي': totalToMe,
      'المدفوع منها': paidToMe,
      'المتبقي (المستحق)': activeToMe,
    },
    {
      name: 'ديون علي (يطلبها الناس)',
      'المبلغ الإجمالي': totalToOthers,
      'المدفوع منها': paidToOthers,
      'المتبقي (المطلوب)': activeToOthers,
    },
  ];

  // 4. Expense Categories chart data
  const expenseCategoriesData = useMemo(() => {
    const categories: Record<string, number> = {};
    expenses
      .filter((e) => e.date.startsWith(currentMonthStr))
      .forEach((e) => {
        categories[e.category] = (categories[e.category] || 0) + e.amount;
      });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [expenses, currentMonthStr]);

  const COLORS = ['#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#64748b'];

  // 5. Critical Alerts (Overdue + Due today + Soon)
  const criticalAlerts = useMemo(() => {
    return alerts.filter((a) => !a.isRead).slice(0, 4);
  }, [alerts]);

  // 6. Recent activities (recent debts or installments or expenses)
  const recentActivities = useMemo(() => {
    const activities: { id: string; type: 'debt_added' | 'payment_made' | 'expense_added'; title: string; date: string; amount: number; isNegative: boolean }[] = [];

    // Filter out project-specific debts first for general recent activities
    const personalDebts = debts.filter((d) => !d.projectId);

    // Add recent debts (max 3)
    [...personalDebts]
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
      .slice(0, 3)
      .forEach((d) => {
        activities.push({
          id: `act-debt-${d.id}`,
          type: 'debt_added',
          title: d.type === 'to_me' ? `دين جديد مستحق لك من ${d.personName}` : `دين جديد عليك لـ ${d.personName}`,
          date: d.startDate,
          amount: d.amount,
          isNegative: d.type === 'to_others',
        });
      });

    // Add recent payments/installments (max 3)
    personalDebts.forEach((d) => {
      d.installments.forEach((inst) => {
        activities.push({
          id: `act-inst-${inst.id}`,
          type: 'payment_made',
          title: d.type === 'to_me' 
            ? `استلام دفعة من ${d.personName} (${inst.notes || 'سداد جزء'})` 
            : `تسديد دفعة لـ ${d.personName} (${inst.notes || 'سداد جزء'})`,
          date: inst.date,
          amount: inst.amount,
          isNegative: d.type === 'to_others', // Paying off a debt we owe is negative; receiving cash (to_me) is positive
        });
      });
    });

    // Add recent expenses (max 3)
    [...expenses]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .forEach((e) => {
        activities.push({
          id: `act-exp-${e.id}`,
          type: 'expense_added',
          title: `مصروف: ${e.category} (${e.description || 'بدون تفاصيل'})`,
          date: e.date,
          amount: e.amount,
          isNegative: true,
        });
      });

    // Sort all activities by date descending
    return activities
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [debts, expenses]);

  // Dynamic Arabic time-of-day greeting
  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'صباح الخير والبركة ☀️';
    if (hour >= 12 && hour < 17) return 'مرحباً بك وطاب يومك 👋';
    if (hour >= 17 && hour < 22) return 'مساء الخير والمسرات 🌙';
    return 'طاب مساؤك، تمنياتنا بنوم هادئ 🌌';
  }, []);

  const [isEditingCapitalModal, setIsEditingCapitalModal] = useState(false);
  const [tempCapitalValue, setTempCapitalValue] = useState(String(initialCapital || ''));

  // Capital & Cash Balance calculation (رأس المال والسيولة المتاحة)
  // 1. Inflows (+): Paid debt installments received for debts owed to me (excluding project debts!)
  const totalCollectedToMeAllTime = useMemo(() => {
    return debts
      .filter((d) => d.type === 'to_me' && !d.projectId)
      .reduce((sum, d) => sum + d.paidAmount, 0);
  }, [debts]);

  // 2. Outflows (-): Cash expenses + debt payments to others (unlinked installments) + employee salaries (excluding projects!)
  // NOTE: salary auto-expenses created by the app use the id prefix "salary-exp-" to avoid double counting,
  // but totalUnlinkedPaidToOthers only counts unlinked installments, so regular expenses (including those
  // auto-created for debt repayments) are correctly subtracted exactly once.
  const totalExpensesAllTime = useMemo(() => {
    return expenses
      .filter((e) => !e.projectId)
      .reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  // Unlinked installments: payments to others not mirrored as a budget expense.
  // We mark installments as linked greedily by (linkedDebtId, amount) pairs so repeated
  // equal amounts don't falsely mark multiple installments as linked.
  const totalUnlinkedPaidToOthers = useMemo(() => {
    const linkedCounts = new Map<string, number>();
    expenses.forEach((e) => {
      if (e.linkedDebtId) {
        const key = `${e.linkedDebtId}::${e.amount}`;
        linkedCounts.set(key, (linkedCounts.get(key) || 0) + 1);
      }
    });

    return debts
      .filter((d) => d.type === 'to_others' && !d.projectId)
      .reduce((sum, d) => {
        const unlinkedInstSum = d.installments.reduce((instSum, inst) => {
          const key = `${d.id}::${inst.amount}`;
          const remainingLinks = linkedCounts.get(key) || 0;
          if (remainingLinks > 0) {
            linkedCounts.set(key, remainingLinks - 1);
            return instSum; // This installment is mirrored by an expense
          }
          return instSum + inst.amount;
        }, 0);
        return sum + unlinkedInstSum;
      }, 0);
  }, [debts, expenses]);

  // Employee salaries linked to projects are paid from that project's independent budget/account,
  // NOT withdrawn from the general capital!
  const totalSalariesAllTime = useMemo(() => {
    return salaryPayments
      .filter((sp) => !sp.projectId)
      .reduce((sum, sp) => sum + sp.amount, 0);
  }, [salaryPayments]);

  const totalCapitalOutflows = totalExpensesAllTime + totalUnlinkedPaidToOthers + totalSalariesAllTime;
  const currentCapital = initialCapital + totalCollectedToMeAllTime - totalCapitalOutflows;

  // Isolated total balance of all projects
  const totalProjectsBalance = useMemo(() => {
    return projects.reduce((sum, proj) => {
      const projExpenses = expenses
        .filter(e => e.projectId === proj.id && !e.id.startsWith('salary-exp-'))
        .reduce((s, e) => s + e.amount, 0);
      const projSalaries = salaryPayments
        .filter(sp => sp.projectId === proj.id)
        .reduce((s, sp) => s + sp.amount, 0);
      const projCollected = debts
        .filter(d => d.projectId === proj.id && d.type === 'to_me')
        .reduce((s, d) => s + d.paidAmount, 0);
      return sum + (proj.budget + projCollected - (projExpenses + projSalaries));
    }, 0);
  }, [projects, expenses, salaryPayments, debts]);

  // Debt ratios
  const collectedToMeRatio = useMemo(() => {
    if (totalToMe === 0) return 0;
    return Math.round((paidToMe / totalToMe) * 100);
  }, [totalToMe, paidToMe]);

  const paidToOthersRatio = useMemo(() => {
    if (totalToOthers === 0) return 0;
    return Math.round((paidToOthers / totalToOthers) * 100);
  }, [totalToOthers, paidToOthers]);

  return (
    <div className="space-y-6" id="dashboard-viewport">
      {/* Welcome Banner */}
      <div 
        className="relative overflow-hidden bg-gradient-to-br from-[#0b0f19] via-[#111827] to-[#0b0f19] text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center gap-6" 
        id="welcome-banner"
      >
        {/* Abstract artistic glowing layers */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 space-y-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-ping"></span>
            لوحة المتابعة الشاملة
          </span>
          <h1 className="text-xl md:text-3xl font-extrabold tracking-tight mt-1 flex items-center gap-2 text-white">
            <span>{timeGreeting}</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-sm max-w-xl leading-relaxed font-semibold">
            مرحباً بك في مركزك المالي الآمن. تتبع الديون والالتزامات مع الآخرين، راقب ميزانية مصاريفك الشهرية بذكاء، وتلقّ التنبيهات اللازمة لمواعيد الاستحقاق.
          </p>
        </div>
        
        <div className="relative z-10 flex gap-3 w-full md:w-auto shrink-0">
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            id="quick-add-debt-btn"
            onClick={() => onNavigate('debts')}
            className="flex-1 md:flex-none px-5 py-3.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(2,132,199,0.3)] flex items-center justify-center gap-2 cursor-pointer text-white"
          >
            <span>إضافة دين جديد</span>
            <ArrowUpRight className="w-4 h-4 shrink-0" />
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            id="quick-add-expense-btn"
            onClick={() => onNavigate('budget')}
            className="flex-1 md:flex-none px-5 py-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold transition-all shadow-[0_4px_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer text-white"
          >
            <span>تسجيل مصروف</span>
            <ArrowDownLeft className="w-4 h-4 shrink-0" />
          </motion.button>
        </div>
      </div>

      {/* Capital & Cash Balance Overview Card */}
      <div 
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-700/60 relative overflow-hidden" 
        id="capital-summary-card"
      >
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/30">
                <Wallet className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs text-slate-300 font-extrabold block">رأس المال والسيولة المتاحة (صندوق رأس المال) 🏛️</span>
                <span className="text-[11px] text-sky-400 font-semibold">ربط ذكي: تسديد لك ➕ يضيف | مصروف أو سداد منك ➖ يسحب</span>
              </div>
            </div>

            <div className="flex items-baseline gap-3 pt-1">
              <span className={`text-3xl md:text-4xl font-black tracking-tight ${
                currentCapital > 0 ? 'text-emerald-400' : currentCapital < 0 ? 'text-rose-400' : 'text-slate-200'
              }`}>
                {formatCurrency(currentCapital, currency)}
              </span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                currentCapital > 0 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : currentCapital < 0 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' 
                  : 'bg-slate-700 text-slate-300 border-slate-600'
              }`}>
                {currentCapital > 0 ? 'رصيد موجب 🟢' : currentCapital < 0 ? 'عجز في رأس المال 🔴' : 'رصيد متوازن'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Initial Capital Pill */}
            <div className="flex-1 md:flex-none p-3 bg-slate-800/90 rounded-2xl border border-slate-700/80 space-y-1 min-w-[130px]">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold">
                <span>رأس المال الابتدائي</span>
                <button
                  onClick={() => {
                    setTempCapitalValue(String(initialCapital || 0));
                    setIsEditingCapitalModal(true);
                  }}
                  className="text-sky-400 hover:text-sky-300 font-extrabold underline cursor-pointer text-[10px]"
                >
                  تعديل ✏️
                </button>
              </div>
              <div className="text-sm font-extrabold text-white">{formatCurrency(initialCapital, currency)}</div>
            </div>

            {/* Inflows Pill */}
            <div className="flex-1 md:flex-none p-3 bg-emerald-950/50 rounded-2xl border border-emerald-800/60 space-y-1 min-w-[140px]">
              <span className="block text-[10px] text-emerald-300 font-bold">➕ مقبوضات الديون (تُضاف)</span>
              <span className="block text-sm font-extrabold text-emerald-400">+{formatCurrency(totalCollectedToMeAllTime, currency)}</span>
            </div>

            {/* Outflows Pill */}
            <div className="flex-1 md:flex-none p-3 bg-rose-950/50 rounded-2xl border border-rose-800/60 space-y-1 min-w-[140px]">
              <span className="block text-[10px] text-rose-300 font-bold">➖ المصروفات والسداد (تُسحب)</span>
              <span className="block text-sm font-extrabold text-rose-400">-{formatCurrency(totalCapitalOutflows, currency)}</span>
            </div>

            {/* Isolated Projects Pill */}
            <div className="flex-1 md:flex-none p-3 bg-sky-950/60 rounded-2xl border border-sky-800/60 space-y-1 min-w-[150px]">
              <span className="block text-[10px] text-sky-300 font-bold">🔒 حسابات المشاريع (معزولة)</span>
              <span className="block text-sm font-extrabold text-sky-400">{formatCurrency(totalProjectsBalance, currency)}</span>
            </div>
          </div>
        </div>

        {/* Dynamic rule reminder banner */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">💡 آلية رأس المال الآلية:</span>
            <span>عند تسديد أي مبلغ عام لك يضاف تلقائياً، وعند صرف أي مبلغ عام يسحب تلقائياً من رأس المال.</span>
          </div>
          <div className="flex items-center gap-1.5 text-sky-400 font-bold">
            <span>🛡️ مشاريع العمل والرواتب معزولة في حسابات وميزانيات مستقلة تماماً ولا تؤثر على رأس المال.</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="kpi-cards-grid">
        {/* Card 1: Debts to Collect */}
        <motion.div 
          whileHover={{ y: -6, scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-sky-300 transition-all duration-300 flex items-center justify-between group cursor-pointer" 
          id="kpi-debts-to-me"
          onClick={() => onNavigate('debts')}
        >
          {/* Subtle decorative background blob */}
          <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-sky-50 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
          
          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-black text-slate-400 block tracking-wide">الديون المستحقة لي (عند الناس) 📥</span>
            <div className="text-2xl font-black text-sky-600 tracking-tight">{formatCurrency(activeToMe, currency)}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="bg-sky-50 text-sky-700 font-extrabold px-2 py-0.5 rounded-lg border border-sky-100">
                تم تحصيل {collectedToMeRatio}%
              </span>
              <span className="font-semibold text-slate-400">من {formatCurrency(totalToMe, currency)}</span>
            </div>
          </div>
          <div className="p-3 bg-sky-50/80 text-sky-600 rounded-2xl group-hover:bg-sky-600 group-hover:text-white transition-all duration-300 shadow-3xs relative z-10">
            <TrendingUp className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Card 2: Debts to Pay */}
        <motion.div 
          whileHover={{ y: -6, scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-rose-300 transition-all duration-300 flex items-center justify-between group cursor-pointer" 
          id="kpi-debts-to-others"
          onClick={() => onNavigate('debts')}
        >
          {/* Subtle decorative background blob */}
          <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-rose-50 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>

          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-black text-slate-400 block tracking-wide">الديون المطلوبة مني (للناس) 📤</span>
            <div className="text-2xl font-black text-rose-600 tracking-tight">{formatCurrency(activeToOthers, currency)}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="bg-rose-50 text-rose-700 font-extrabold px-2 py-0.5 rounded-lg border border-rose-100">
                تم سداد {paidToOthersRatio}%
              </span>
              <span className="font-semibold text-slate-400">من {formatCurrency(totalToOthers, currency)}</span>
            </div>
          </div>
          <div className="p-3 bg-rose-50/80 text-rose-600 rounded-2xl group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 shadow-3xs relative z-10">
            <TrendingDown className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Card 3: Monthly Expenses */}
        <motion.div 
          whileHover={{ y: -6, scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-amber-300 transition-all duration-300 flex items-center justify-between group cursor-pointer" 
          id="kpi-monthly-expenses"
          onClick={() => onNavigate('budget')}
        >
          {/* Subtle decorative background blob */}
          <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-amber-50 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>

          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-black text-slate-400 block tracking-wide">مصاريف الشهر الحالي 💳</span>
            <div className="text-2xl font-black text-slate-800 tracking-tight">{formatCurrency(monthlyExpenses, currency)}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <span className="bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-lg border border-slate-200">
                لشهر {formatDate(currentMonthStr + '-01').substring(3)}
              </span>
              <span className="font-semibold text-slate-400">بواقع {expenseCategoriesData.length} فئات</span>
            </div>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-2xl group-hover:bg-slate-700 group-hover:text-white transition-all duration-300 shadow-3xs relative z-10">
            <CreditCard className="w-5 h-5" />
          </div>
        </motion.div>

        {/* Card 4: Budget Status */}
        <motion.div 
          whileHover={{ y: -6, scale: 1.015 }}
          whileTap={{ scale: 0.985 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative overflow-hidden bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-emerald-300 transition-all duration-300 flex flex-col justify-between cursor-pointer group" 
          id="kpi-budget-progress"
          onClick={() => onNavigate('budget')}
        >
          {/* Subtle decorative background blob */}
          <div className="absolute -left-4 -bottom-4 w-20 h-20 bg-emerald-50 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>

          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="space-y-1">
              <span className="text-[10px] font-black text-slate-400 block tracking-wide">الميزانية المتبقية 💰</span>
              <div className={`text-xl font-black ${remainingBudget < 0 ? 'text-rose-600 animate-pulse' : 'text-emerald-600'}`}>
                {formatCurrency(remainingBudget, currency)}
              </div>
            </div>
            <div className={`p-2.5 rounded-xl shrink-0 relative z-10 ${remainingBudget < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          
          <div className="space-y-2 relative z-10">
            <div className="flex justify-between text-[10px] text-slate-500">
              <span className="font-semibold text-slate-400">المتاح: {formatCurrency(monthlyBudgetLimit, currency)}</span>
              <span className="font-extrabold text-slate-600">{budgetPercentage}% مستهلك</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${budgetPercentage > 90 ? 'bg-rose-500' : budgetPercentage > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                style={{ width: `${budgetPercentage}%` }}
              ></div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quick Entry Form Section */}
      <QuickEntry 
        projects={projects} 
        currency={currency} 
        onAddDebt={onAddDebt} 
        onAddExpense={onAddExpense} 
      />

      {/* Project Performance and Financial Reports Section */}
      <div className="bg-slate-50/50 border border-slate-200/60 rounded-3xl p-6 space-y-6" id="dashboard-projects-reports-section">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1 text-right">
            <h2 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-sky-600" />
              <span>تقارير أداء مشاريع العمل والرواتب 📊</span>
            </h2>
            <p className="text-xs text-slate-500 font-bold">تحليل مالي وموازنة كافّة المشاريع والرواتب ومصاريف التشغيل</p>
          </div>
          <button
            onClick={() => onNavigate('projects')}
            className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 cursor-pointer shadow-3xs"
          >
            <span>إدارة المشاريع</span>
            <ArrowUpRight className="w-4 h-4 shrink-0 text-slate-400" />
          </button>
        </div>

        {!projectStats ? (
          <div className="bg-white border border-slate-100 rounded-2xl p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2.5">
            <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
              <Briefcase className="w-6 h-6 text-slate-300" />
            </div>
            <p className="font-bold text-slate-600">لا توجد مشاريع عمل مسجلة حتى الآن.</p>
            <p className="text-slate-400 max-w-sm">قم بإضافة مشاريعك الأولى وموظفيك في تبويب "مشاريع العمل والرواتب" لتفعيل لوحة التقارير والتحليلات الخاصة بالمشاريع هنا.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Project KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="project-reports-kpi-grid">
              {/* Card 1: Total Budgets */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block">إجمالي ميزانيات المشاريع</span>
                <span className="text-lg font-black text-slate-800 block">{formatCurrency(projectStats.totalBudgetSum, currency)}</span>
                <span className="text-[9px] text-slate-500 block">عدد المشاريع الكلي: {projectStats.totalProjectsCount} ({projectStats.activeProjectsCount} نشط)</span>
              </div>

              {/* Card 2: Total Spent so far */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block">إجمالي المصروف الفعلي</span>
                <span className="text-lg font-black text-rose-600 block">{formatCurrency(projectStats.totalProjectSpentSum, currency)}</span>
                <div className="flex justify-between text-[9px] text-slate-500 gap-1">
                  <span>الرواتب: {formatCurrency(projectStats.totalSalaryPaymentsSum, currency)}</span>
                  <span>التشغيل: {formatCurrency(projectStats.totalProjectExpensesSum, currency)}</span>
                </div>
              </div>

              {/* Card 3: Remaining Budget */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block">صافي الفائض المالي</span>
                <span className={`text-lg font-black block ${projectStats.totalBudgetSum - projectStats.totalProjectSpentSum >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(projectStats.totalBudgetSum - projectStats.totalProjectSpentSum, currency)}
                </span>
                <span className="text-[9px] text-slate-500 block">نسبة الاستهلاك: {projectStats.totalBudgetSum > 0 ? Math.round((projectStats.totalProjectSpentSum / projectStats.totalBudgetSum) * 100) : 0}%</span>
              </div>

              {/* Card 4: Project Debts Overview */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs space-y-2">
                <span className="text-[10px] font-bold text-slate-400 block">ديون ومستحقات المشاريع</span>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">لنا (عند العملاء):</span>
                    <span className="font-extrabold text-sky-600">{formatCurrency(projectStats.projectReceivablesSum, currency)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">علينا (للموردين):</span>
                    <span className="font-extrabold text-rose-600">{formatCurrency(projectStats.projectDebtsSum, currency)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* List of active projects with progress details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-3xs p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-sky-500" />
                  <span>تتبع ميزانيات المشاريع وتكاليفها</span>
                </span>
                <span className="text-[10px] text-slate-400 font-bold">نسب الاستهلاك الفعلي للميزانية المرصودة</span>
              </div>

              <div className="space-y-4 divide-y divide-slate-50">
                {projectStats.projectsList.map(proj => {
                  const isExceeded = proj.budget > 0 && proj.totalSpent > proj.budget;
                  return (
                    <div key={proj.id} className="pt-3 first:pt-0 space-y-2.5">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-slate-800 text-sm">{proj.name}</h4>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${
                              proj.status === 'active' 
                                ? 'bg-sky-50 text-sky-700' 
                                : proj.status === 'completed' 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {proj.status === 'active' ? 'نشط' : proj.status === 'completed' ? 'مكتمل' : 'معلق'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold">العميل: {proj.clientName} • عدد الموظفين: {proj.empCount}</p>
                        </div>

                        <div className="text-left">
                          <span className="text-xs font-bold text-slate-600">
                            المصروف: <span className={isExceeded ? 'text-rose-600 font-black' : 'text-slate-800 font-extrabold'}>{formatCurrency(proj.totalSpent, currency)}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block">من ميزانية {formatCurrency(proj.budget, currency)}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isExceeded ? 'bg-rose-500' : proj.progressPercent > 85 ? 'bg-amber-500' : 'bg-sky-500'}`}
                            style={{ width: `${proj.progressPercent}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-400">متبقي: {formatCurrency(Math.max(0, proj.budget - proj.totalSpent), currency)}</span>
                          <span className={`font-extrabold ${isExceeded ? 'text-rose-600' : proj.progressPercent > 85 ? 'text-amber-500' : 'text-slate-500'}`}>
                            {proj.progressPercent}% {isExceeded ? 'تجاوز الميزانية!' : 'مستهلك'}
                          </span>
                        </div>
                      </div>

                      {/* Quick info about debts linked to this project */}
                      {(proj.activeDebtsToMe > 0 || proj.activeDebtsToOthers > 0) && (
                        <div className="bg-slate-50 rounded-xl p-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 justify-end border border-slate-100">
                          {proj.activeDebtsToMe > 0 && (
                            <span>مستحقات معلّقة للمشروع (من العميل): <strong className="text-sky-600 font-extrabold">{formatCurrency(proj.activeDebtsToMe, currency)}</strong></span>
                          )}
                          {proj.activeDebtsToOthers > 0 && (
                            <span>ديون على المشروع (لموردين): <strong className="text-rose-600 font-extrabold">{formatCurrency(proj.activeDebtsToOthers, currency)}</strong></span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Project Debt Ceiling Exceeded Alerts */}
      {exceededProjects.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 space-y-3 shadow-3xs text-right text-xs" id="dashboard-project-alerts">
          <div className="flex items-center gap-2 text-rose-800 font-extrabold text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-600 animate-pulse shrink-0" />
            <span>تنبيه حرج: تجاوز سقف ديون مشاريع العمل! 🚨</span>
          </div>
          <p className="text-slate-600 font-bold">المشاريع التالية تخطت سقف المديونية المسموح به لها:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {exceededProjects.map(proj => (
              <div 
                key={proj.id} 
                onClick={() => onNavigate('projects')}
                className="bg-white border border-rose-100 hover:border-rose-300 rounded-xl p-3.5 shadow-2xs flex justify-between items-center gap-2 cursor-pointer transition-all"
              >
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-800">{proj.name}</h4>
                  <p className="text-[10px] text-slate-500 font-bold">
                    الديون الحالية: <span className="text-rose-600 font-black">{formatCurrency(proj.currentDebt, currency)}</span> من سقف {formatCurrency(proj.debtCeiling, currency)}
                  </p>
                </div>
                <span className="text-[10px] bg-rose-50 text-rose-700 px-2.5 py-1 rounded-lg border border-rose-100 font-extrabold shrink-0">
                  تعدى الحد!
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Real-time Alerts Panel */}
      {criticalAlerts.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-amber-50/40 border border-amber-200/80 rounded-2xl p-5 space-y-3 shadow-3xs" id="dashboard-critical-alerts">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800 font-bold">
              <AlertTriangle className="w-5 h-5" />
              <span>تنبيهات استحقاق الدفعات العاجلة</span>
            </div>
            <button 
              id="go-to-alerts-panel"
              onClick={() => onNavigate('alerts')}
              className="text-xs text-amber-800 font-semibold hover:underline flex items-center gap-1"
            >
              <span>عرض جميع التنبيهات ({alerts.filter(a => !a.isRead).length})</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3" id="alerts-grid-dashboard">
            {criticalAlerts.map((alert) => {
              const matchedDebt = debts.find(d => d.id === alert.debtId);
              return (
                <div 
                  key={alert.id} 
                  id={alert.id}
                  className="bg-white border border-amber-100 rounded-xl p-3.5 shadow-2xs flex justify-between items-start gap-2"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${alert.type === 'overdue' ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}></span>
                      <h4 className="text-sm font-bold text-slate-800">{alert.title}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{alert.message}</p>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end justify-between h-full min-h-[50px]">
                    <button
                      onClick={() => onMarkAlertAsRead(alert.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                      title="تحديد كمقروء"
                      id={`mark-alert-read-${alert.id}`}
                    >
                      <Bell className="w-4 h-4 text-emerald-600" />
                    </button>
                    {matchedDebt && (
                      <a
                        href={generateWhatsAppLink(matchedDebt, currency)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        title="إرسال تذكير عبر واتساب"
                        id={`whatsapp-alert-${alert.id}`}
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>تذكير</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Debt Cash Flow Chart Section */}
      <CashFlowChart debts={debts} currency={currency} />

      {/* Budget Burn-down Chart Section */}
      <BudgetBurndownChart expenses={expenses} budget={budget} currency={currency} />

      {/* Main Charts & Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="dashboard-details-row">
        {/* Chart 1: Debts Comparison */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 lg:col-span-2 space-y-4" id="dashboard-chart-debt-compare">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-slate-800 text-base">مقارنة الديون الحالية</h2>
            <span className="text-xs text-slate-400">مقارنة الديون المترتبة والمستحقة</span>
          </div>
          <div className="h-64" id="debt-bar-chart-container">
            {totalToMe === 0 && totalToOthers === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                <Calendar className="w-8 h-8 text-slate-300" />
                <span>لا توجد بيانات ديون مسجلة بعد لعرض المخطط البياني.</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={debtChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip formatter={(value: any) => [`${value} ${currency}`, '']} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="المدفوع منها" fill="#10b981" radius={[4, 4, 0, 0]} barSize={35} />
                  <Bar dataKey="المتبقي (المستحق)" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Expense distribution sidebar */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 space-y-4 flex flex-col justify-between" id="dashboard-chart-expenses-pie">
          <div className="space-y-1">
            <h2 className="font-bold text-slate-800 text-base">توزيع مصاريف الشهر</h2>
            <p className="text-xs text-slate-400">حسب فئات المصاريف المسجلة</p>
          </div>

          <div className="h-44 relative flex items-center justify-center" id="expense-pie-chart-container">
            {expenseCategoriesData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm gap-1">
                <Wallet className="w-7 h-7 text-slate-300" />
                <span>لا توجد مصاريف للشهر الحالي</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseCategoriesData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {expenseCategoriesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value} ${currency}`, '']} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {expenseCategoriesData.length > 0 && (
            <div className="max-h-28 overflow-y-auto space-y-1.5 text-xs text-slate-600 pr-1">
              {expenseCategoriesData.map((entry, index) => {
                const percent = Math.round((entry.value / monthlyExpenses) * 100);
                return (
                  <div key={entry.name} className="flex justify-between items-center gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      <span className="truncate">{entry.name}</span>
                    </div>
                    <div className="shrink-0 font-medium text-slate-700">
                      <span>{entry.value} {currency}</span>
                      <span className="text-[10px] text-slate-400 mr-1">({percent}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Recent Activities */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 space-y-4" id="dashboard-recent-activities">
        <div className="flex justify-between items-center">
          <h2 className="font-bold text-slate-800 text-base">آخر الحركات والنشاطات</h2>
          <span className="text-xs text-slate-400">آخر 5 عمليات مسجلة</span>
        </div>

        <div className="divide-y divide-slate-100" id="activities-list-container">
          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              لا توجد نشاطات مسجلة حتى الآن. ابدأ بإضافة ديون أو مصاريف لتراها هنا.
            </div>
          ) : (
            recentActivities.map((act) => (
              <div key={act.id} className="py-3.5 flex justify-between items-center gap-4" id={act.id}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    act.type === 'debt_added' 
                      ? 'bg-sky-50 text-sky-600' 
                      : act.type === 'payment_made' 
                      ? 'bg-emerald-50 text-emerald-600' 
                      : 'bg-amber-50 text-amber-600'
                  }`}>
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-700">{act.title}</p>
                    <p className="text-xs text-slate-400">{formatDate(act.date)}</p>
                  </div>
                </div>
                <div className={`font-bold text-sm shrink-0 ${act.isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {act.isNegative ? '-' : '+'}{formatCurrency(act.amount, currency)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Initial Capital Modal */}
      {isEditingCapitalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-sky-600" />
                <span>تعديل رأس المال الابتدائي 🏛️</span>
              </h3>
              <button onClick={() => setIsEditingCapitalModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                أدخل الرصيد المالي الأولي الأساسي المتوفر لديك. سيقوم النظام بعد ذلك بإضافة كل الديون المسددة لك وخصم المصاريف تلقائياً احتساباً للسيولة الحقيقية.
              </p>
              
              <div className="space-y-1">
                <label className="block text-slate-700 dark:text-slate-300 font-extrabold">المبلغ الأولي / رأس المال ({currency})</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={tempCapitalValue}
                    onChange={(e) => setTempCapitalValue(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-black text-lg text-slate-900 dark:text-white"
                    placeholder="0"
                    autoFocus
                  />
                  <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">{currency}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingCapitalModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateInitialCapital(Number(tempCapitalValue) || 0);
                  setIsEditingCapitalModal(false);
                }}
                className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold cursor-pointer shadow-xs"
              >
                حفظ التغيير
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
