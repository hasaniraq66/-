import React, { useState, useMemo } from 'react';
import { 
  History, 
  Calendar, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  PlusCircle, 
  Briefcase, 
  DollarSign, 
  Tag, 
  User, 
  FileText, 
  Layers,
  ChevronDown,
  X,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Debt, Expense, Budget, Project, Employee, SalaryPayment } from '../types';
import { formatCurrency, formatDate } from '../utils';

interface ActivityLogProps {
  debts: Debt[];
  expenses: Expense[];
  budgets: Budget[];
  projects: Project[];
  employees: Employee[];
  salaryPayments: SalaryPayment[];
  currency: string;
  onNavigate?: (tab: string) => void;
}

export interface UnifiedActivityItem {
  id: string;
  type: 'debt_added' | 'payment_made' | 'debt_completed' | 'expense_added' | 'budget_set' | 'salary_paid' | 'project_created';
  categoryGroup: 'debts' | 'payments' | 'expenses' | 'budgets' | 'projects';
  title: string;
  details: string;
  amount: number;
  date: string; // YYYY-MM-DD
  personName?: string;
  badgeText: string;
  badgeClass: string;
  icon: React.ReactNode;
  photo?: string;
}

export default function ActivityLog({
  debts,
  expenses,
  budgets,
  projects,
  employees,
  salaryPayments,
  currency,
  onNavigate
}: ActivityLogProps) {
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'debts' | 'payments' | 'expenses' | 'budgets' | 'projects'>('all');
  const [datePreset, setDatePreset] = useState<'all' | 'today' | 'this_month' | 'last_month' | 'this_year' | 'custom'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Compute all unified activities from all data sources
  const allActivities = useMemo(() => {
    const list: UnifiedActivityItem[] = [];

    // 1. Debts Added
    debts.forEach((debt) => {
      const isToMe = debt.type === 'to_me';
      list.push({
        id: `act-debt-${debt.id}`,
        type: 'debt_added',
        categoryGroup: 'debts',
        title: isToMe ? `تسجيل دين جديد مستحق لك (${debt.personName})` : `تسجيل التزام دين جديد عليك (${debt.personName})`,
        details: `الحساب: ${debt.personName} | التصنيف: ${debt.category} ${debt.description ? `• ${debt.description}` : ''}`,
        amount: debt.amount,
        date: debt.startDate || debt.dueDate || new Date().toISOString().split('T')[0],
        personName: debt.personName,
        badgeText: isToMe ? '📥 دين لك' : '📤 دين عليك',
        badgeClass: isToMe ? 'bg-sky-100 text-sky-800 border border-sky-200' : 'bg-rose-100 text-rose-800 border border-rose-200',
        icon: <PlusCircle className={`w-4 h-4 ${isToMe ? 'text-sky-600' : 'text-rose-600'}`} />,
        photo: debt.photo,
      });

      // 2. Debt Payments (Installments)
      debt.installments.forEach((inst) => {
        list.push({
          id: `act-inst-${inst.id}`,
          type: 'payment_made',
          categoryGroup: 'payments',
          title: `تسديد دفعة دين: ${debt.personName}`,
          details: `الحساب: ${debt.personName} ${inst.notes ? `| ملاحظات: ${inst.notes}` : ''}`,
          amount: inst.amount,
          date: inst.date,
          personName: debt.personName,
          badgeText: '💳 تسديد دفعة',
          badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
          icon: <CreditCard className="w-4 h-4 text-emerald-600" />,
        });
      });

      // 3. Debt Completed
      if (debt.status === 'paid' || debt.paidAmount >= debt.amount) {
        const lastInst = debt.installments[debt.installments.length - 1];
        list.push({
          id: `act-debt-complete-${debt.id}`,
          type: 'debt_completed',
          categoryGroup: 'payments',
          title: `إغلاق وسداد دين بالكامل (${debt.personName})`,
          details: `الحساب: ${debt.personName} | تم إكمال سداد المبلغ كاملاً بنجاح 🎉`,
          amount: debt.amount,
          date: lastInst?.date || debt.dueDate || new Date().toISOString().split('T')[0],
          personName: debt.personName,
          badgeText: '✅ سداد كامل',
          badgeClass: 'bg-emerald-200 text-emerald-900 border border-emerald-300 font-black',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-700" />,
        });
      }
    });

    // 4. Expenses Added
    expenses.forEach((exp) => {
      list.push({
        id: `act-exp-${exp.id}`,
        type: 'expense_added',
        categoryGroup: 'expenses',
        title: `تسجيل مصروف: ${exp.description || exp.category}`,
        details: `التصنيف: ${exp.category} ${exp.note ? `| ملاحظة: ${exp.note}` : ''}`,
        amount: exp.amount,
        date: exp.date,
        badgeText: '💸 مصروف',
        badgeClass: 'bg-amber-100 text-amber-800 border border-amber-200',
        icon: <Wallet className="w-4 h-4 text-amber-600" />,
        photo: exp.photo,
      });
    });

    // 5. Budgets Set
    budgets.forEach((bdg) => {
      list.push({
        id: `act-bdg-${bdg.month}`,
        type: 'budget_set',
        categoryGroup: 'budgets',
        title: `تحديد سقف الميزانية لشهر (${bdg.month})`,
        details: `المبلغ المخصص للشهر: ${formatCurrency(bdg.monthlyLimit, currency)}`,
        amount: bdg.monthlyLimit,
        date: `${bdg.month}-01`,
        badgeText: '📊 ميزانية شهرية',
        badgeClass: 'bg-purple-100 text-purple-800 border border-purple-200',
        icon: <Layers className="w-4 h-4 text-purple-600" />,
      });
    });

    // 6. Projects Created
    projects.forEach((proj) => {
      list.push({
        id: `act-proj-${proj.id}`,
        type: 'project_created',
        categoryGroup: 'projects',
        title: `إنشاء مشروع عمل جديد: ${proj.name}`,
        details: `العميل: ${proj.clientName} | ميزانية المشروع: ${formatCurrency(proj.budget, currency)}`,
        amount: proj.budget,
        date: proj.startDate,
        badgeText: '🏗️ مشروع جديد',
        badgeClass: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
        icon: <Briefcase className="w-4 h-4 text-indigo-600" />,
      });
    });

    // 7. Salary Payments
    salaryPayments.forEach((sal) => {
      const emp = employees.find((e) => e.id === sal.employeeId);
      const proj = projects.find((p) => p.id === sal.projectId);
      list.push({
        id: `act-sal-${sal.id}`,
        type: 'salary_paid',
        categoryGroup: 'projects',
        title: `صرف راتب الموظف (${emp ? emp.name : 'موظف'})`,
        details: `المشروع: ${proj ? proj.name : 'غير مخصص'} | لشهر: ${sal.month} ${sal.notes ? `| ملاحظات: ${sal.notes}` : ''}`,
        amount: sal.amount,
        date: sal.paymentDate,
        badgeText: '💼 صرف راتب',
        badgeClass: 'bg-teal-100 text-teal-800 border border-teal-200',
        icon: <User className="w-4 h-4 text-teal-600" />,
      });
    });

    // Sort descending by date
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [debts, expenses, budgets, projects, employees, salaryPayments, currency]);

  // Filter activities based on User Controls
  const filteredActivities = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = todayStr.substring(0, 7); // YYYY-MM
    const currentYear = todayStr.substring(0, 4);  // YYYY

    return allActivities.filter((act) => {
      // 1. Category Filter
      if (categoryFilter !== 'all' && act.categoryGroup !== categoryFilter) {
        return false;
      }

      // 2. Date Preset / Range Filter
      if (datePreset === 'today') {
        if (!act.date.startsWith(todayStr)) return false;
      } else if (datePreset === 'this_month') {
        if (!act.date.startsWith(currentMonth)) return false;
      } else if (datePreset === 'last_month') {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        const lastMonthStr = d.toISOString().substring(0, 7);
        if (!act.date.startsWith(lastMonthStr)) return false;
      } else if (datePreset === 'this_year') {
        if (!act.date.startsWith(currentYear)) return false;
      } else if (datePreset === 'custom') {
        if (startDate && act.date < startDate) return false;
        if (endDate && act.date > endDate) return false;
      }

      // 3. Search Term Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = act.title.toLowerCase().includes(term);
        const matchesDetails = act.details.toLowerCase().includes(term);
        const matchesPerson = act.personName?.toLowerCase().includes(term) || false;
        if (!matchesTitle && !matchesDetails && !matchesPerson) return false;
      }

      return true;
    });
  }, [allActivities, categoryFilter, datePreset, startDate, endDate, searchTerm]);

  // Summary Metrics
  const totalAmountInPeriod = useMemo(() => {
    return filteredActivities.reduce((sum, act) => sum + act.amount, 0);
  }, [filteredActivities]);

  const paymentsCount = useMemo(() => {
    return filteredActivities.filter((act) => act.type === 'payment_made' || act.type === 'debt_completed').length;
  }, [filteredActivities]);

  const expensesCount = useMemo(() => {
    return filteredActivities.filter((act) => act.type === 'expense_added').length;
  }, [filteredActivities]);

  return (
    <div className="space-y-6" id="activity-log-viewport">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs" id="activity-log-header">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">سجل العمليات والحركات الشامل 📋</h1>
              <p className="text-xs text-slate-400 font-medium">
                تتبع زمني دقيق لكل التغييرات الحاصلة في النظام (إضافة ديون، تسديدات، مصاريف، وميزانيات)
              </p>
            </div>
          </div>
        </div>

        {onNavigate && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('debts')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              الديون
            </button>
            <button
              onClick={() => onNavigate('budget')}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              الميزانية
            </button>
          </div>
        )}
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4" id="activity-kpis">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>إجمالي الحركات</span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-black text-slate-800">{filteredActivities.length} <span className="text-xs text-slate-400 font-normal">عملية</span></div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>إجمالي التدفقات المالية</span>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-base font-black text-emerald-600 truncate">{formatCurrency(totalAmountInPeriod, currency)}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>عمليات التسديد</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">{paymentsCount} <span className="text-xs text-slate-400 font-normal">دفعة</span></div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>المصاريف المسجلة</span>
            <Wallet className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600">{expensesCount} <span className="text-xs text-slate-400 font-normal">مصروف</span></div>
        </div>
      </div>

      {/* Filters & Control Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="activity-filters-panel">
        <div className="flex flex-col lg:flex-row gap-3 justify-between items-stretch lg:items-center">
          {/* Search Box */}
          <div className="relative flex-1" id="activity-search-box">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ابحث بالنص، اسم الشخص، أو تفاصيل العملية..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Operation Category Filter */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0" id="category-filter-chips">
            <span className="text-xs font-bold text-slate-500 ml-1">التصنيف:</span>
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'all' ? 'bg-sky-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الكل ({allActivities.length})
            </button>
            <button
              onClick={() => setCategoryFilter('debts')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'debts' ? 'bg-sky-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📥 الديون
            </button>
            <button
              onClick={() => setCategoryFilter('payments')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'payments' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              💳 التسديدات
            </button>
            <button
              onClick={() => setCategoryFilter('expenses')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'expenses' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              💸 المصاريف
            </button>
            <button
              onClick={() => setCategoryFilter('budgets')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'budgets' ? 'bg-purple-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              📊 الميزانية
            </button>
            <button
              onClick={() => setCategoryFilter('projects')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'projects' ? 'bg-indigo-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              💼 المشاريع
            </button>
          </div>
        </div>

        {/* Date Filter Bar */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-bold text-slate-500 flex items-center gap-1 ml-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>فترة التاريخ:</span>
            </span>
            <button
              onClick={() => setDatePreset('all')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                datePreset === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              كل الأوقات
            </button>
            <button
              onClick={() => setDatePreset('today')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                datePreset === 'today' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              اليوم
            </button>
            <button
              onClick={() => setDatePreset('this_month')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                datePreset === 'this_month' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              هذا الشهر
            </button>
            <button
              onClick={() => setDatePreset('last_month')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                datePreset === 'last_month' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              الشهر الماضي
            </button>
            <button
              onClick={() => setDatePreset('this_year')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                datePreset === 'this_year' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              هذه السنة
            </button>
            <button
              onClick={() => setDatePreset('custom')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                datePreset === 'custom' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              تاريخ مخصص 📅
            </button>
          </div>

          {/* Custom Date Inputs if Custom selected */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200" id="custom-date-picker-group">
              <span className="text-slate-500 font-bold">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
              />
              <span className="text-slate-500 font-bold">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold text-slate-800"
              />
            </div>
          )}
        </div>
      </div>

      {/* Main Timeline List */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4" id="activity-timeline-feed">
        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
          <h3 className="font-extrabold text-sm text-slate-800 flex items-center gap-2">
            <History className="w-4 h-4 text-sky-600" />
            <span>تسلسل الحركات والعمليات ({filteredActivities.length})</span>
          </h3>

          <span className="text-xs text-slate-400 font-medium">مرتبة من الأحدث إلى الأقدم</span>
        </div>

        {filteredActivities.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <History className="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <h4 className="font-bold text-sm text-slate-700 mb-1">لا توجد حركات مسجلة تنطبق على الفلتر المحدد</h4>
            <p className="text-xs text-slate-400">جرب تغيير التصنيف أو مسح فلتر البحث ونطاق التواريخ.</p>
          </div>
        ) : (
          <div className="relative border-r-2 border-slate-100 pr-4 sm:pr-6 space-y-4 mr-2" id="timeline-list">
            {filteredActivities.map((act) => (
              <div
                key={act.id}
                id={`activity-item-${act.id}`}
                className="relative bg-white hover:bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80 shadow-2xs transition-all space-y-2.5 group"
              >
                {/* Timeline Dot */}
                <div className="absolute -right-[23px] sm:-right-[31px] top-4 w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow-2xs flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-600"></div>
                </div>

                <div className="flex flex-wrap justify-between items-start gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 ${act.badgeClass}`}>
                        {act.icon}
                        <span>{act.badgeText}</span>
                      </span>

                      {act.personName && (
                        <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{act.personName}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="font-extrabold text-slate-800 text-sm pt-0.5">
                      {act.title}
                    </h4>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 font-bold block">تاريخ العملية</span>
                    <span className="text-xs font-extrabold text-slate-600 flex items-center justify-end gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(act.date)}
                    </span>
                  </div>
                </div>

                {/* Amount and Details Box */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-xs">
                  <p className="text-slate-600 font-semibold leading-relaxed">
                    {act.details}
                  </p>

                  <div className="font-black text-sm shrink-0 text-slate-800 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
                    {formatCurrency(act.amount, currency)}
                  </div>
                </div>

                {/* Photo attachment preview */}
                {act.photo && (
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 font-bold block mb-1">المرفق المصور:</span>
                    <img
                      src={act.photo}
                      alt="Attachment"
                      onClick={() => setSelectedPhoto(act.photo!)}
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 cursor-zoom-in hover:scale-105 transition-transform"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[120] animate-fade-in cursor-zoom-out"
          onClick={() => setSelectedPhoto(null)}
          id="photo-lightbox-modal"
        >
          <div className="relative max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl">
            <img src={selectedPhoto} alt="Zoomed Attachment" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 left-3 bg-slate-900/80 text-white p-2 rounded-full hover:bg-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
