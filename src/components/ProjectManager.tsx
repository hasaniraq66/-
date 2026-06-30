import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  Users, 
  AlertTriangle, 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  CheckCircle2, 
  Building2, 
  DollarSign, 
  TrendingUp, 
  UserCheck, 
  Percent, 
  FileText,
  BadgeAlert,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Coins
} from 'lucide-react';
import { Project, Employee, SalaryPayment, Debt, Expense } from '../types';
import { formatCurrency, formatDate, getLocalDateString } from '../utils';
import { motion, AnimatePresence } from 'motion/react';

interface ProjectManagerProps {
  projects: Project[];
  employees: Employee[];
  salaryPayments: SalaryPayment[];
  debts: Debt[];
  expenses: Expense[];
  currency: string;
  onAddProject: (p: Omit<Project, 'id'>) => void;
  onEditProject: (p: Project) => void;
  onDeleteProject: (id: string) => void;
  onAddEmployee: (e: Omit<Employee, 'id'>) => void;
  onEditEmployee: (e: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  onAddSalaryPayment: (p: Omit<SalaryPayment, 'id'>) => void;
  onDeleteSalaryPayment: (id: string) => void;
  onAddDebt: (d: Omit<Debt, 'id' | 'paidAmount' | 'status' | 'installments'>) => void;
  onAddExpense: (exp: Omit<Expense, 'id'>) => void;
  onEditDebt: (d: Debt) => void;
  onDeleteDebt: (id: string) => void;
  onAddInstallment: (debtId: string, amount: number, date: string, notes: string, linkToBudget: boolean) => void;
  onDeleteInstallment: (debtId: string, instId: string) => void;
  onEditExpense: (exp: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export default function ProjectManager({
  projects,
  employees,
  salaryPayments,
  debts,
  expenses,
  currency,
  onAddProject,
  onEditProject,
  onDeleteProject,
  onAddEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onAddSalaryPayment,
  onDeleteSalaryPayment,
  onAddDebt,
  onAddExpense,
  onEditDebt,
  onDeleteDebt,
  onAddInstallment,
  onDeleteInstallment,
  onEditExpense,
  onDeleteExpense
}: ProjectManagerProps) {
  // Navigation inside Project tab
  const [subTab, setSubTab] = useState<'projects' | 'employees' | 'debts_expenses' | 'analytics'>('projects');
  const [filterProjId, setFilterProjId] = useState<string>('all');

  // Modals / Form states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [payingEmployee, setPayingEmployee] = useState<Employee | null>(null);

  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  // Form Field States - Project
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectBudget, setProjectBudget] = useState<number>(0);
  const [projectDebtCeiling, setProjectDebtCeiling] = useState<number>(0);
  const [projectStartDate, setProjectStartDate] = useState(getLocalDateString());
  const [projectStatus, setProjectStatus] = useState<'active' | 'completed' | 'on_hold'>('active');

  // Form Field States - Employee
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('');
  const [empSalary, setEmpSalary] = useState<number>(0);
  const [empProjId, setEmpProjId] = useState('');

  // Form Field States - Salary Payment
  const [salaryMonth, setSalaryMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [salaryAmount, setSalaryAmount] = useState<number>(0);
  const [salaryDate, setSalaryDate] = useState(getLocalDateString());
  const [salaryNotes, setSalaryNotes] = useState('');

  // Form Field States - Quick Debt
  const [debtAmount, setDebtAmount] = useState<number>(0);
  const [debtPerson, setDebtPerson] = useState('');
  const [debtDueDate, setDebtDueDate] = useState('');
  const [debtDesc, setDebtDesc] = useState('');
  const [debtType, setDebtType] = useState<'to_me' | 'to_others'>('to_others');

  // Form Field States - Quick Expense
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expDesc, setExpDesc] = useState('');
  const [expCategory, setExpCategory] = useState('عمل');

  // New States for Managing Project-specific Debts & Expenses
  const [editingDebtObj, setEditingDebtObj] = useState<Debt | null>(null);
  const [editDebtAmount, setEditDebtAmount] = useState<number>(0);
  const [editDebtPerson, setEditDebtPerson] = useState('');
  const [editDebtDueDate, setEditDebtDueDate] = useState('');
  const [editDebtDesc, setEditDebtDesc] = useState('');
  const [editDebtType, setEditDebtType] = useState<'to_me' | 'to_others'>('to_others');

  const [editingExpenseObj, setEditingExpenseObj] = useState<Expense | null>(null);
  const [editExpAmount, setEditExpAmount] = useState<number>(0);
  const [editExpDesc, setEditExpDesc] = useState('');
  const [editExpCategory, setEditExpCategory] = useState('عمل');
  const [editExpDate, setEditExpDate] = useState('');

  const [payingDebtObj, setPayingDebtObj] = useState<Debt | null>(null);
  const [instAmount, setInstAmount] = useState<number>(0);
  const [instDate, setInstDate] = useState(getLocalDateString());
  const [instNotes, setInstNotes] = useState('');
  const [instLinkToBudget, setInstLinkToBudget] = useState(true);

  // Open modals with defaults
  const openAddProject = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectDesc('');
    setClientName('');
    setProjectBudget(0);
    setProjectDebtCeiling(0);
    setProjectStartDate(getLocalDateString());
    setProjectStatus('active');
    setIsProjectModalOpen(true);
  };

  const openEditProject = (proj: Project) => {
    setEditingProject(proj);
    setProjectName(proj.name);
    setProjectDesc(proj.description);
    setClientName(proj.clientName);
    setProjectBudget(proj.budget);
    setProjectDebtCeiling(proj.debtCeiling);
    setProjectStartDate(proj.startDate);
    setProjectStatus(proj.status);
    setIsProjectModalOpen(true);
  };

  const openAddEmployee = () => {
    setEditingEmployee(null);
    setEmpName('');
    setEmpRole('');
    setEmpSalary(0);
    setEmpProjId(projects[0]?.id || '');
    setIsEmployeeModalOpen(true);
  };

  const openEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setEmpName(emp.name);
    setEmpRole(emp.role);
    setEmpSalary(emp.salaryAmount);
    setEmpProjId(emp.projectId);
    setIsEmployeeModalOpen(true);
  };

  const openPaySalary = (emp: Employee) => {
    setPayingEmployee(emp);
    setSalaryAmount(emp.salaryAmount);
    setSalaryNotes('');
    setIsSalaryModalOpen(true);
  };

  // Submit handlers
  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    const projData = {
      name: projectName,
      description: projectDesc,
      clientName: clientName,
      budget: Number(projectBudget),
      debtCeiling: Number(projectDebtCeiling),
      startDate: projectStartDate,
      status: projectStatus,
    };

    if (editingProject) {
      onEditProject({ ...projData, id: editingProject.id });
    } else {
      onAddProject(projData);
    }
    setIsProjectModalOpen(false);
  };

  const handleEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empProjId) return;

    const empData = {
      name: empName,
      role: empRole,
      salaryAmount: Number(empSalary),
      projectId: empProjId,
      hireDate: getLocalDateString(),
    };

    if (editingEmployee) {
      onEditEmployee({ ...empData, id: editingEmployee.id });
    } else {
      onAddEmployee(empData);
    }
    setIsEmployeeModalOpen(false);
  };

  const handleSalarySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingEmployee || !salaryAmount) return;

    onAddSalaryPayment({
      employeeId: payingEmployee.id,
      projectId: payingEmployee.projectId,
      amount: Number(salaryAmount),
      month: salaryMonth,
      paymentDate: salaryDate,
      notes: salaryNotes,
    });

    setIsSalaryModalOpen(false);
    setPayingEmployee(null);
  };

  const handleQuickDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtAmount || !debtPerson.trim() || !selectedProjectId) return;

    onAddDebt({
      type: debtType,
      personName: debtPerson,
      amount: Number(debtAmount),
      dueDate: debtDueDate || getLocalDateString(),
      startDate: getLocalDateString(),
      category: 'عمل',
      description: `[مشروع: ${projects.find(p => p.id === selectedProjectId)?.name || ''}] ${debtDesc}`,
      projectId: selectedProjectId
    });

    setDebtAmount(0);
    setDebtPerson('');
    setDebtDesc('');
    setIsDebtModalOpen(false);
  };

  const handleQuickExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expAmount || !selectedProjectId) return;

    onAddExpense({
      amount: Number(expAmount),
      category: expCategory,
      date: getLocalDateString(),
      description: `[مشروع: ${projects.find(p => p.id === selectedProjectId)?.name || ''}] ${expDesc}`,
      projectId: selectedProjectId
    });

    setExpAmount(0);
    setExpDesc('');
    setIsExpenseModalOpen(false);
  };

  const openEditDebt = (debt: Debt) => {
    setEditingDebtObj(debt);
    setEditDebtAmount(debt.amount);
    setEditDebtPerson(debt.personName);
    setEditDebtDueDate(debt.dueDate);
    setEditDebtDesc(debt.description || '');
    setEditDebtType(debt.type);
  };

  const openEditExpense = (exp: Expense) => {
    setEditingExpenseObj(exp);
    setEditExpAmount(exp.amount);
    setEditExpDesc(exp.description);
    setEditExpCategory(exp.category);
    setEditExpDate(exp.date);
  };

  const openPayDebt = (debt: Debt) => {
    setPayingDebtObj(debt);
    setInstAmount(Math.max(0, debt.amount - debt.paidAmount));
    setInstDate(getLocalDateString());
    setInstNotes('');
    setInstLinkToBudget(true);
  };

  const handleEditDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebtObj || !editDebtAmount || !editDebtPerson) return;
    onEditDebt({
      ...editingDebtObj,
      amount: Number(editDebtAmount),
      personName: editDebtPerson,
      dueDate: editDebtDueDate,
      description: editDebtDesc,
      type: editDebtType,
      status: Number(editDebtAmount) <= editingDebtObj.paidAmount ? 'paid' : editingDebtObj.paidAmount > 0 ? 'partial' : 'unpaid'
    });
    setEditingDebtObj(null);
  };

  const handleEditExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseObj || !editExpAmount) return;
    onEditExpense({
      ...editingExpenseObj,
      amount: Number(editExpAmount),
      description: editExpDesc,
      category: editExpCategory,
      date: editExpDate
    });
    setEditingExpenseObj(null);
  };

  const handleInstallmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingDebtObj || !instAmount) return;
    onAddInstallment(payingDebtObj.id, Number(instAmount), instDate, instNotes, instLinkToBudget);
    setPayingDebtObj(null);
  };

  // Calculations Helper for specific Project
  const getProjectStats = (projId: string) => {
    const project = projects.find(p => p.id === projId);
    if (!project) return { totalExpenses: 0, totalDebts: 0, totalDebtsToMe: 0, debtCeilingExceeded: false, debtCeilingPercent: 0, employeeCount: 0 };

    // Sum of regular expenses linked to project
    const projExpensesTotal = expenses
      .filter(e => e.projectId === projId)
      .reduce((sum, e) => sum + e.amount, 0);

    // Sum of salaries paid under this project
    const projSalariesTotal = salaryPayments
      .filter(sp => sp.projectId === projId)
      .reduce((sum, sp) => sum + sp.amount, 0);

    const totalExpenses = projExpensesTotal + projSalariesTotal;

    // Debts we owe to others linked to project (Debt status !== 'paid')
    const activeDebtsToOthers = debts
      .filter(d => d.projectId === projId && d.type === 'to_others')
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    // Debts others owe us linked to project (Debt status !== 'paid')
    const activeDebtsToMe = debts
      .filter(d => d.projectId === projId && d.type === 'to_me')
      .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0);

    const employeeCount = employees.filter(emp => emp.projectId === projId).length;

    const debtCeilingPercent = project.debtCeiling > 0 
      ? Math.round((activeDebtsToOthers / project.debtCeiling) * 100) 
      : 0;

    return {
      totalExpenses,
      totalDebts: activeDebtsToOthers,
      totalDebtsToMe: activeDebtsToMe,
      debtCeilingExceeded: project.debtCeiling > 0 && activeDebtsToOthers > project.debtCeiling,
      debtCeilingPercent,
      employeeCount
    };
  };

  const selectedProjStats = useMemo(() => {
    return getProjectStats(selectedProjectId);
  }, [selectedProjectId, projects, debts, expenses, salaryPayments, employees]);

  const selectedProjectObj = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  return (
    <div className="space-y-6" id="project-manager-workspace">
      
      {/* Upper header section */}
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1.5 text-right">
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-sky-600" />
            <span>مشاريع العمل والرواتب</span>
          </h2>
          <p className="text-xs text-slate-500 font-bold leading-normal">
            تابع الميزانية، سقف ديون المشروع، رواتب الموظفين والتحليلات المالية لكل مشروع بشكل متكامل.
          </p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={openAddProject}
            className="flex-1 md:flex-none px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-3xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>مشروع عمل جديد</span>
          </button>
          <button
            onClick={openAddEmployee}
            disabled={projects.length === 0}
            className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-3xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Users className="w-4 h-4" />
            <span>إضافة موظف</span>
          </button>
        </div>
      </div>

      {/* Segmented control for Sub-tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1 max-w-xl">
        <button
          onClick={() => setSubTab('projects')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'projects' 
              ? 'bg-white text-sky-600 shadow-3xs font-extrabold' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>المشاريع ({projects.length})</span>
        </button>
        <button
          onClick={() => setSubTab('employees')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'employees' 
              ? 'bg-white text-sky-600 shadow-3xs font-extrabold' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>الموظفين والرواتب ({employees.length})</span>
        </button>
        <button
          onClick={() => setSubTab('debts_expenses')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'debts_expenses' 
              ? 'bg-white text-sky-600 shadow-3xs font-extrabold' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>ديون ومصاريف المشاريع</span>
        </button>
        <button
          onClick={() => setSubTab('analytics')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
            subTab === 'analytics' 
              ? 'bg-white text-sky-600 shadow-3xs font-extrabold' 
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>التحليل المالي</span>
        </button>
      </div>

      {/* View Rendering based on active Sub-tab */}
      <div className="w-full">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: PROJECTS LIST */}
          {subTab === 'projects' && (
            <motion.div
              key="projects-list-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {projects.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-slate-100 text-center space-y-4 max-w-xl mx-auto shadow-3xs">
                  <div className="w-14 h-14 bg-sky-50 rounded-full flex items-center justify-center text-sky-600 mx-auto">
                    <Briefcase className="w-7 h-7" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-base">لا توجد مشاريع مسجلة حالياً</h3>
                  <p className="text-slate-500 text-xs font-bold leading-relaxed">
                    ابدأ بإضافة أول مشروع عمل لتتبع ميزانيته، سقف ديونه، وإدارته المالية بشكل احترافي.
                  </p>
                  <button
                    onClick={openAddProject}
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs shadow-3xs cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة مشروعك الأول</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((proj) => {
                    const stats = getProjectStats(proj.id);
                    const isExceeded = stats.debtCeilingExceeded;
                    const budgetUsedPercent = proj.budget > 0 
                      ? Math.min(100, Math.round((stats.totalExpenses / proj.budget) * 100)) 
                      : 0;

                    return (
                      <div 
                        key={proj.id}
                        className={`bg-white rounded-3xl p-5 border shadow-2xs relative flex flex-col justify-between transition-all hover:shadow-xs duration-200 ${
                          isExceeded ? 'border-rose-200 ring-2 ring-rose-500/10' : 'border-slate-100'
                        }`}
                      >
                        {/* Status Badge */}
                        <div className="absolute top-5 left-5">
                          {proj.status === 'active' && (
                            <span className="text-[10px] px-2.5 py-1 rounded-lg font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100">نشط</span>
                          )}
                          {proj.status === 'on_hold' && (
                            <span className="text-[10px] px-2.5 py-1 rounded-lg font-extrabold text-amber-700 bg-amber-50 border border-amber-100">موقوف مؤقتاً</span>
                          )}
                          {proj.status === 'completed' && (
                            <span className="text-[10px] px-2.5 py-1 rounded-lg font-extrabold text-slate-600 bg-slate-50 border border-slate-100">مكتمل</span>
                          )}
                        </div>

                        {/* Top Info */}
                        <div className="space-y-3.5 flex-1">
                          <div className="space-y-1">
                            <h3 className="font-extrabold text-slate-800 text-sm leading-tight pl-12">{proj.name}</h3>
                            <p className="text-[10px] text-slate-400 font-bold">العميل: {proj.clientName || 'غير محدد'}</p>
                          </div>
                          
                          <p className="text-[11px] text-slate-500 font-bold line-clamp-2 h-8 leading-relaxed">
                            {proj.description || 'لا يوجد وصف للمشروع.'}
                          </p>

                          {/* Quick Stats Grid */}
                          <div className="grid grid-cols-3 gap-2 bg-slate-50/50 p-2.5 rounded-2xl border border-slate-100/80 text-center">
                            <div className="space-y-0.5">
                              <span className="text-[9px] text-slate-400 font-bold block">الموظفين</span>
                              <span className="text-xs font-black text-slate-700 flex items-center justify-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-500" />
                                {stats.employeeCount}
                              </span>
                            </div>
                            <div className="space-y-0.5 border-r border-slate-200/50">
                              <span className="text-[9px] text-slate-400 font-bold block">المستحقات لنا</span>
                              <span className="text-xs font-black text-sky-600">
                                {formatCurrency(stats.totalDebtsToMe, currency)}
                              </span>
                            </div>
                            <div className="space-y-0.5 border-r border-slate-200/50">
                              <span className="text-[9px] text-slate-400 font-bold block">الديون علينا</span>
                              <span className="text-xs font-black text-rose-600">
                                {formatCurrency(stats.totalDebts, currency)}
                              </span>
                            </div>
                          </div>

                          {/* Progress bar: Budget utilized */}
                          <div className="space-y-1 pt-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-500">ميزانية المشروع المستهلكة</span>
                              <span className="text-slate-700">{budgetUsedPercent}% ({formatCurrency(stats.totalExpenses, currency)})</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  budgetUsedPercent > 90 ? 'bg-rose-500' : budgetUsedPercent > 70 ? 'bg-amber-500' : 'bg-sky-500'
                                }`}
                                style={{ width: `${budgetUsedPercent}%` }}
                              ></div>
                            </div>
                            <span className="text-[9px] text-slate-400 font-bold block">إجمالي موازنة المشروع: {formatCurrency(proj.budget, currency)}</span>
                          </div>

                          {/* Progress bar / Indicator: Debt Ceiling */}
                          <div className="space-y-1 pt-1.5 border-t border-slate-100">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-slate-500">استهلاك سقف ديون المشروع</span>
                              <span className={`font-black ${isExceeded ? 'text-rose-600' : 'text-slate-700'}`}>
                                {stats.debtCeilingPercent}% ({formatCurrency(stats.totalDebts, currency)})
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isExceeded ? 'bg-rose-600 animate-pulse' : stats.debtCeilingPercent > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, stats.debtCeilingPercent)}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                              <span>سقف الديون: {formatCurrency(proj.debtCeiling, currency)}</span>
                              {isExceeded && (
                                <span className="text-rose-600 font-extrabold flex items-center gap-1 bg-rose-50 px-1 rounded">
                                  <ShieldAlert className="w-3 h-3" />
                                  <span>تعدى السقف!</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions Footer */}
                        <div className="flex items-center justify-between border-t border-slate-100/80 pt-3.5 mt-4">
                          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>البدء: {formatDate(proj.startDate)}</span>
                          </span>
                          
                          <div className="flex gap-1">
                            <button
                              onClick={() => { setSelectedProjectId(proj.id); setSubTab('analytics'); }}
                              className="p-1.5 hover:bg-sky-50 text-sky-600 rounded-lg transition-colors border border-transparent hover:border-sky-100 cursor-pointer text-[10px] font-bold px-2"
                              title="التحليل المالي"
                            >
                              التحليل التفصيلي
                            </button>
                            <button
                              onClick={() => openEditProject(proj)}
                              className="p-1.5 hover:bg-slate-50 text-slate-500 hover:text-sky-600 rounded-lg transition-colors cursor-pointer"
                              title="تعديل المشروع"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('هل أنت متأكد من حذف هذا المشروع؟ سيتم فك ارتباط الموظفين والديون به.')) {
                                  onDeleteProject(proj.id);
                                }
                              }}
                              className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                              title="حذف المشروع"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: EMPLOYEES & SALARIES */}
          {subTab === 'employees' && (
            <motion.div
              key="employees-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {projects.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center space-y-4 max-w-lg mx-auto shadow-3xs">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                  <h3 className="font-extrabold text-slate-800 text-sm">يرجى إضافة مشروع أولاً</h3>
                  <p className="text-slate-500 text-xs font-bold leading-relaxed">
                    يجب أن يكون لديك مشروع عمل واحد على الأقل حتى تتمكن من إضافة الموظفين وتخصيص رواتبهم عليه.
                  </p>
                  <button
                    onClick={() => setSubTab('projects')}
                    className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs cursor-pointer"
                  >
                    الذهاب للمشاريع
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Employees list */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                          <Users className="w-5 h-5 text-emerald-600" />
                          <span>سجل الموظفين والمستحقات</span>
                        </h3>
                        <button
                          onClick={openAddEmployee}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>إضافة موظف جديد</span>
                        </button>
                      </div>

                      {employees.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-bold text-xs space-y-2">
                          <p>لا يوجد موظفون مسجلون حالياً في أي مشروع.</p>
                          <p className="text-[10px] text-slate-400 font-medium">اضغط على زر "إضافة موظف جديد" للبدء.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-right text-xs">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 font-extrabold">
                                <th className="pb-3 pt-1">الاسم والمسمى</th>
                                <th className="pb-3 pt-1">مشروع العمل</th>
                                <th className="pb-3 pt-1">الراتب الأساسي</th>
                                <th className="pb-3 pt-1 text-center">الإجراءات والرواتب</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {employees.map((emp) => {
                                const linkedProj = projects.find(p => p.id === emp.projectId);
                                
                                // Total amount of salaries paid to this employee
                                const totalPaid = salaryPayments
                                  .filter(sp => sp.employeeId === emp.id)
                                  .reduce((sum, sp) => sum + sp.amount, 0);

                                return (
                                  <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4">
                                      <div className="space-y-0.5">
                                        <p className="font-extrabold text-slate-800">{emp.name}</p>
                                        <p className="text-[10px] text-slate-400 font-semibold">{emp.role || 'موظف عام'}</p>
                                      </div>
                                    </td>
                                    <td className="py-4">
                                      <span className="text-[10px] bg-sky-50 text-sky-700 font-extrabold px-2.5 py-1 rounded-lg border border-sky-100 block w-fit">
                                        {linkedProj ? linkedProj.name : 'مشروع مجهول'}
                                      </span>
                                    </td>
                                    <td className="py-4 font-black text-slate-700">
                                      {formatCurrency(emp.salaryAmount, currency)}
                                    </td>
                                    <td className="py-4">
                                      <div className="flex items-center justify-center gap-2">
                                        <button
                                          onClick={() => openPaySalary(emp)}
                                          className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all shadow-3xs cursor-pointer"
                                        >
                                          <Coins className="w-3.5 h-3.5" />
                                          <span>صرف الراتب</span>
                                        </button>
                                        <button
                                          onClick={() => openEditEmployee(emp)}
                                          className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-sky-600 rounded-lg transition-colors cursor-pointer"
                                          title="تعديل الموظف"
                                        >
                                          <Edit className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (window.confirm('هل أنت متأكد من حذف هذا الموظف؟ سيتم حذف سجل مدفوعات الرواتب المرتبطة به أيضاً.')) {
                                              onDeleteEmployee(emp.id);
                                            }
                                          }}
                                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                                          title="حذف الموظف"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Salary Payments History */}
                  <div className="space-y-4">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-4">
                      <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <FileText className="w-5 h-5 text-sky-600" />
                        <span>آخر الرواتب المصروفة</span>
                      </h3>

                      {salaryPayments.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-bold text-xs">
                          لا توجد عمليات صرف رواتب مسجلة مؤخراً.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[450px] overflow-y-auto pl-1">
                          {salaryPayments.slice().reverse().map((payment) => {
                            const emp = employees.find(e => e.id === payment.employeeId);
                            const proj = projects.find(p => p.id === payment.projectId);
                            
                            return (
                              <div key={payment.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 space-y-2 text-right relative hover:border-slate-200 transition-colors">
                                <button
                                  onClick={() => onDeleteSalaryPayment(payment.id)}
                                  className="absolute top-3 left-3 text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors cursor-pointer"
                                  title="حذف عملية الدفع"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                <div className="space-y-0.5 pl-6">
                                  <h4 className="font-extrabold text-slate-800 text-xs">
                                    {emp ? emp.name : 'موظف مجهول'}
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-bold">
                                    المشروع: {proj ? proj.name : 'غير معروف'}
                                  </p>
                                </div>

                                <div className="flex items-center justify-between text-[10px] border-t border-slate-200/50 pt-2 font-bold">
                                  <span className="text-slate-400">تاريخ الصرف: {formatDate(payment.paymentDate)}</span>
                                  <span className="text-emerald-600 font-black text-xs bg-emerald-50 px-2 py-0.5 rounded-md">
                                    {formatCurrency(payment.amount, currency)} ({payment.month})
                                  </span>
                                </div>
                                
                                {payment.notes && (
                                  <p className="text-[9px] text-slate-400 bg-white p-1.5 rounded-lg border border-slate-100 font-bold block">
                                    💡 {payment.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: PROJECT DEBTS & EXPENSES MANAGEMENT */}
          {subTab === 'debts_expenses' && (
            <motion.div
              key="debts-expenses-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* Top Filter and Fast Actions Panel */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-right">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <span className="text-xs font-black text-slate-500 whitespace-nowrap self-center">تصفية حسب المشروع:</span>
                  <select
                    value={filterProjId}
                    onChange={(e) => {
                      setFilterProjId(e.target.value);
                      if (e.target.value !== 'all') {
                        setSelectedProjectId(e.target.value);
                      }
                    }}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold text-xs cursor-pointer"
                  >
                    <option value="all">📁 جميع مشاريع العمل</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        💼 {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      if (filterProjId !== 'all') {
                        setSelectedProjectId(filterProjId);
                      } else if (projects.length > 0) {
                        setSelectedProjectId(projects[0].id);
                      }
                      setIsExpenseModalOpen(true);
                    }}
                    disabled={projects.length === 0}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-3xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل مصروف</span>
                  </button>
                  <button
                    onClick={() => {
                      if (filterProjId !== 'all') {
                        setSelectedProjectId(filterProjId);
                      } else if (projects.length > 0) {
                        setSelectedProjectId(projects[0].id);
                      }
                      setIsDebtModalOpen(true);
                    }}
                    disabled={projects.length === 0}
                    className="flex-1 sm:flex-none px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-3xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>تسجيل التزام مالي (دين)</span>
                  </button>
                </div>
              </div>

              {projects.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center space-y-4 max-w-lg mx-auto shadow-3xs">
                  <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                  <div className="space-y-1">
                    <h3 className="font-extrabold text-slate-800 text-sm">لا توجد مشاريع عمل بعد!</h3>
                    <p className="text-slate-400 text-xs">يرجى إضافة مشروع عمل أولاً لتتمكن من إدارة ديونه ومصاريفه المستقلة.</p>
                  </div>
                  <button
                    onClick={openAddProject}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    إضافة مشروعك الأول
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="project-debts-expenses-lists-container">
                  
                  {/* EXPENSES COLUMN */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs space-y-4 text-right">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                        المجموع: {formatCurrency(
                          expenses
                            .filter(e => e.projectId && (filterProjId === 'all' || e.projectId === filterProjId))
                            .reduce((sum, e) => sum + e.amount, 0),
                          currency
                        )}
                      </span>
                      <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        <Coins className="w-4 h-4 text-sky-600" />
                        <span>مصاريف مشاريع العمل المباشرة</span>
                      </h3>
                    </div>

                    {expenses.filter(e => e.projectId && (filterProjId === 'all' || e.projectId === filterProjId)).length === 0 ? (
                      <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                        <Coins className="w-8 h-8 text-slate-300 mx-auto" />
                        <p>لا توجد مصاريف تشغيلية مسجلة للمشروع المختار.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                        {expenses
                          .filter(e => e.projectId && (filterProjId === 'all' || e.projectId === filterProjId))
                          .map((exp) => {
                            const associatedProj = projects.find(p => p.id === exp.projectId);
                            return (
                              <div key={exp.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-2xl flex justify-between items-center gap-4 transition-colors">
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    onClick={() => openEditExpense(exp)}
                                    className="p-1.5 bg-white hover:bg-sky-50 text-sky-600 rounded-lg border border-slate-100 transition-colors cursor-pointer"
                                    title="تعديل"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (confirm('هل أنت متأكد من رغبتك في حذف هذا المصروف؟')) {
                                        onDeleteExpense(exp.id);
                                      }
                                    }}
                                    className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-100 transition-colors cursor-pointer"
                                    title="حذف"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <div className="flex-1 text-right space-y-1 min-w-0">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {associatedProj && (
                                      <span className="text-[9px] font-black bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded-md truncate">
                                        📁 {associatedProj.name}
                                      </span>
                                    )}
                                    <h4 className="font-bold text-slate-800 text-xs truncate">{exp.description}</h4>
                                  </div>
                                  <p className="text-[10px] text-slate-400">{formatDate(exp.date)} • فئة: {exp.category}</p>
                                </div>
                                <span className="font-black text-slate-700 text-xs shrink-0 bg-white border border-slate-100 px-2.5 py-1.5 rounded-xl">
                                  {formatCurrency(exp.amount, currency)}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                  {/* DEBTS COLUMN */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-3xs space-y-4 text-right">
                    <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                      <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                        المستحق المتبقي: {formatCurrency(
                          debts
                            .filter(d => d.projectId && (filterProjId === 'all' || d.projectId === filterProjId))
                            .reduce((sum, d) => sum + (d.amount - d.paidAmount), 0),
                          currency
                        )}
                      </span>
                      <h3 className="font-extrabold text-slate-800 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        <span>الالتزامات والديون المسجلة للمشاريع</span>
                      </h3>
                    </div>

                    {debts.filter(d => d.projectId && (filterProjId === 'all' || d.projectId === filterProjId)).length === 0 ? (
                      <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                        <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto" />
                        <p>لا توجد التزامات أو ديون مسجلة للمشروع المختار.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                        {debts
                          .filter(d => d.projectId && (filterProjId === 'all' || d.projectId === filterProjId))
                          .map((debt) => {
                            const associatedProj = projects.find(p => p.id === debt.projectId);
                            const remaining = debt.amount - debt.paidAmount;
                            return (
                              <div 
                                key={debt.id} 
                                className={`p-3.5 rounded-2xl border flex flex-col gap-3 transition-all ${
                                  debt.type === 'to_others' 
                                    ? 'bg-rose-50/10 border-rose-100/50 hover:bg-rose-50/20' 
                                    : 'bg-sky-50/10 border-sky-100/50 hover:bg-sky-50/20'
                                }`}
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex gap-1.5 shrink-0">
                                    {remaining > 0 && (
                                      <button
                                        onClick={() => openPayDebt(debt)}
                                        className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-600 rounded-lg border border-slate-100 text-[10px] font-black transition-colors cursor-pointer flex items-center gap-1"
                                        title="تسجيل دفعة سداد"
                                      >
                                        <Coins className="w-3 h-3" />
                                        <span>تسديد</span>
                                      </button>
                                    )}
                                    <button
                                      onClick={() => openEditDebt(debt)}
                                      className="p-1.5 bg-white hover:bg-sky-50 text-sky-600 rounded-lg border border-slate-100 transition-colors cursor-pointer"
                                      title="تعديل"
                                    >
                                      <Edit className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (confirm('هل أنت متأكد من حذف هذا الدين؟ جميع الدفعات المرتبطة به ستُحذف أيضاً.')) {
                                          onDeleteDebt(debt.id);
                                        }
                                      }}
                                      className="p-1.5 bg-white hover:bg-rose-50 text-rose-600 rounded-lg border border-slate-100 transition-colors cursor-pointer"
                                      title="حذف"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <div className="flex-1 text-right space-y-0.5 min-w-0">
                                    <div className="flex items-center justify-end gap-1.5">
                                      {associatedProj && (
                                        <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md truncate">
                                          📁 {associatedProj.name}
                                        </span>
                                      )}
                                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                                        debt.type === 'to_others' ? 'bg-rose-100/60 text-rose-800' : 'bg-sky-100/60 text-sky-800'
                                      }`}>
                                        {debt.type === 'to_others' ? 'دين علينا' : 'مستحق لنا'}
                                      </span>
                                      <h4 className="font-extrabold text-slate-800 text-xs truncate">{debt.personName}</h4>
                                    </div>
                                    <p className="text-[10px] text-slate-400 line-clamp-1">{debt.description || 'بلا وصف'}</p>
                                    <p className="text-[9px] text-slate-500">ميعاد الاستحقاق: {formatDate(debt.dueDate)}</p>
                                  </div>
                                </div>

                                {/* Debt details progress bar */}
                                <div className="bg-white/80 p-2.5 rounded-xl border border-slate-100 space-y-1 text-right font-mono">
                                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                                    <span>المتبقي: {formatCurrency(remaining, currency)}</span>
                                    <span>المدفوع: {formatCurrency(debt.paidAmount, currency)} / {formatCurrency(debt.amount, currency)}</span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all duration-300 ${
                                        debt.type === 'to_others' ? 'bg-rose-500' : 'bg-sky-500'
                                      }`}
                                      style={{ width: `${Math.min(100, (debt.paidAmount / debt.amount) * 100)}%` }}
                                    ></div>
                                  </div>
                                </div>

                                {/* List installments paid if any */}
                                {debt.installments && debt.installments.length > 0 && (
                                  <div className="space-y-1 text-right pt-1.5 border-t border-slate-100/50">
                                    <p className="text-[9px] font-black text-slate-400">سجل دفعات السداد المستلمة/المدفوعة:</p>
                                    <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                                      {debt.installments.map((inst) => (
                                        <div key={inst.id} className="flex justify-between items-center p-1.5 bg-white/50 border border-slate-100 rounded-lg text-[9px] font-bold text-slate-600">
                                          <button
                                            onClick={() => {
                                              if (confirm('هل ترغب في حذف دفعة السداد هذه؟')) {
                                                onDeleteInstallment(debt.id, inst.id);
                                              }
                                            }}
                                            className="text-rose-500 hover:text-rose-700 transition-colors"
                                            title="حذف الدفعة"
                                          >
                                            🗑️
                                          </button>
                                          <span>{inst.notes ? `(${inst.notes})` : ''} • {formatDate(inst.date)}</span>
                                          <span className="font-extrabold text-slate-700">{formatCurrency(inst.amount, currency)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </motion.div>
          )}

          {/* TAB 3: FINANCIAL ANALYTICS */}
          {subTab === 'analytics' && (
            <motion.div
              key="analytics-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {projects.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 border border-slate-100 text-center space-y-4 max-w-lg mx-auto shadow-3xs">
                  <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
                  <h3 className="font-extrabold text-slate-800 text-sm">لا تتوفر أي مشاريع للتحليل</h3>
                  <p className="text-slate-500 text-xs font-bold">يرجى تسجيل مشروع عمل واحد على الأقل لرؤية التحليلات التفصيلية.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Selector of Projects */}
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <label className="font-extrabold text-slate-700 text-xs shrink-0">اختر مشروع العمل للاطلاع على تحليلاته المالية الدقيقة:</label>
                    <select
                      value={selectedProjectId}
                      onChange={(e) => setSelectedProjectId(e.target.value)}
                      className="w-full sm:w-72 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-black text-xs"
                    >
                      {projects.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedProjectObj && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Left side: Visual Stats Card */}
                      <div className="lg:col-span-2 space-y-6">
                        
                        {/* Debt Ceiling warning banner */}
                        {selectedProjStats.debtCeilingExceeded && (
                          <div className="bg-rose-50 border border-rose-200 rounded-3xl p-5 text-rose-800 flex gap-3 text-xs leading-relaxed shadow-3xs animate-pulse">
                            <ShieldAlert className="w-6 h-6 shrink-0 text-rose-600" />
                            <div className="space-y-1 text-right">
                              <h4 className="font-black text-rose-950">تحذير حرج: تجاوز سقف ديون هذا المشروع!</h4>
                              <p className="font-bold text-[11px]">
                                تخطى هذا المشروع سقف المديونية المسموح به له. لقد بلغ إجمالي الديون المستحقة عليه للآخرين حالياً <strong className="font-black text-rose-950">{formatCurrency(selectedProjStats.totalDebts, currency)}</strong> بينما الحد الأقصى المقرر هو <strong className="font-black text-rose-950">{formatCurrency(selectedProjectObj.debtCeiling, currency)}</strong>.
                              </p>
                              <p className="text-[10px] text-rose-600/90 font-bold">يرجى تسوية بعض الديون أو زيادة سقف الدين في إعدادات المشروع لتفادي أي عقبات تشغيلية.</p>
                            </div>
                          </div>
                        )}

                        {/* Interactive Project Info Stats Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          
                          {/* Project Budget Card */}
                          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs space-y-3">
                            <span className="text-[10px] text-slate-400 font-black block">إجمالي ميزانية المشروع</span>
                            <div className="space-y-1">
                              <p className="text-lg font-black text-slate-800">
                                {formatCurrency(selectedProjectObj.budget, currency)}
                              </p>
                              <p className="text-[10px] text-slate-500 font-bold">
                                المتبقي للتوجيه: {formatCurrency(Math.max(0, selectedProjectObj.budget - selectedProjStats.totalExpenses), currency)}
                              </p>
                            </div>
                          </div>

                          {/* Project Expenses Card */}
                          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-2xs space-y-3">
                            <span className="text-[10px] text-slate-400 font-black block">المصروفات الفعلية (تشمل الرواتب)</span>
                            <div className="space-y-1">
                              <p className="text-lg font-black text-sky-600">
                                {formatCurrency(selectedProjStats.totalExpenses, currency)}
                              </p>
                              <p className="text-[10px] text-slate-500 font-bold">
                                تمثل {selectedProjectObj.budget > 0 ? Math.round((selectedProjStats.totalExpenses / selectedProjectObj.budget) * 100) : 0}% من إجمالي الميزانية
                              </p>
                            </div>
                          </div>

                          {/* Debt status card */}
                          <div className={`bg-white rounded-3xl p-5 border shadow-2xs space-y-3 ${
                            selectedProjStats.debtCeilingExceeded ? 'border-rose-100 bg-rose-50/10' : 'border-slate-100'
                          }`}>
                            <span className="text-[10px] text-slate-400 font-black block">ديون المشروع (علينا)</span>
                            <div className="space-y-1">
                              <p className={`text-lg font-black ${selectedProjStats.debtCeilingExceeded ? 'text-rose-600' : 'text-slate-800'}`}>
                                {formatCurrency(selectedProjStats.totalDebts, currency)}
                              </p>
                              <p className="text-[10px] text-slate-500 font-bold">
                                سقف ديون المشروع: {formatCurrency(selectedProjectObj.debtCeiling, currency)}
                              </p>
                            </div>
                          </div>

                        </div>

                        {/* Linked Debts & Expenses Lists */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* List of expenses linked to project */}
                          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
                            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-50 pb-2">
                              <Coins className="w-4 h-4 text-sky-600" />
                              <span>مصاريف المشروع والرواتب المنصرفة</span>
                            </h4>

                            {expenses.filter(e => e.projectId === selectedProjectId).length === 0 && 
                             salaryPayments.filter(sp => sp.projectId === selectedProjectId).length === 0 ? (
                              <p className="text-center py-10 text-slate-400 text-[11px] font-bold">لا توجد مصاريف أو رواتب مسجلة لهذا المشروع.</p>
                            ) : (
                              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {/* Regular expenses */}
                                {expenses.filter(e => e.projectId === selectedProjectId).map(exp => (
                                  <div key={exp.id} className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                                    <div className="space-y-0.5 text-right">
                                      <p className="font-bold text-slate-800">{exp.description}</p>
                                      <p className="text-[10px] text-slate-400">{formatDate(exp.date)} • فئة: {exp.category}</p>
                                    </div>
                                    <span className="font-extrabold text-slate-700 bg-white border px-2 py-1 rounded-md shrink-0">
                                      {formatCurrency(exp.amount, currency)}
                                    </span>
                                  </div>
                                ))}

                                {/* Salary payments as expenses */}
                                {salaryPayments.filter(sp => sp.projectId === selectedProjectId).map(pay => {
                                  const empName = employees.find(e => e.id === pay.employeeId)?.name || 'موظف';
                                  return (
                                    <div key={pay.id} className="flex justify-between items-center p-2.5 bg-emerald-50/50 rounded-xl text-xs border border-emerald-100/50">
                                      <div className="space-y-0.5 text-right">
                                        <p className="font-bold text-slate-800">صرف راتب الموظف ({empName})</p>
                                        <p className="text-[10px] text-slate-400">{formatDate(pay.paymentDate)} • شهر {pay.month}</p>
                                      </div>
                                      <span className="font-extrabold text-emerald-700 bg-white border border-emerald-100 px-2 py-1 rounded-md shrink-0">
                                        {formatCurrency(pay.amount, currency)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* List of debts linked to project */}
                          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
                            <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5 border-b border-slate-50 pb-2">
                              <AlertTriangle className="w-4 h-4 text-rose-500" />
                              <span>ديون المشروع والالتزامات</span>
                            </h4>

                            {debts.filter(d => d.projectId === selectedProjectId).length === 0 ? (
                              <p className="text-center py-10 text-slate-400 text-[11px] font-bold">لا توجد ديون مسجلة مرتبطة بهذا المشروع.</p>
                            ) : (
                              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                {debts.filter(d => d.projectId === selectedProjectId).map(debt => {
                                  const remaining = debt.amount - debt.paidAmount;
                                  return (
                                    <div 
                                      key={debt.id} 
                                      className={`flex justify-between items-center p-2.5 rounded-xl text-xs border ${
                                        debt.type === 'to_others' ? 'bg-rose-50/30 border-rose-100' : 'bg-sky-50/30 border-sky-100'
                                      }`}
                                    >
                                      <div className="space-y-0.5 text-right">
                                        <p className="font-bold text-slate-800">{debt.personName}</p>
                                        <p className="text-[10px] text-slate-400">
                                          {debt.type === 'to_others' ? 'دين علينا' : 'دين لنا'} • يستحق: {formatDate(debt.dueDate)}
                                        </p>
                                      </div>
                                      <span className={`font-extrabold px-2.5 py-1 rounded-md ${
                                        debt.type === 'to_others' ? 'text-rose-700 bg-rose-50' : 'text-sky-700 bg-sky-50'
                                      }`}>
                                        {formatCurrency(remaining, currency)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                        </div>

                      </div>

                      {/* Right side: Quick Debt/Expense linkers */}
                      <div className="space-y-6">
                        
                        {/* Live Debt Ceiling Checker inside Form */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4 text-right">
                          <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-rose-500" />
                            <span>تسجيل التزام مالي (دين) للمشروع</span>
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                            سجل دين جديد وسيقوم النظام تلقائياً بالتحقق من مطابقة سقف الديون لتفادي المديونية الزائدة.
                          </p>

                          <button
                            onClick={() => setIsDebtModalOpen(true)}
                            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <AlertTriangle className="w-4 h-4" />
                            <span>إضافة دين للمشروع</span>
                          </button>
                        </div>

                        {/* Link quick expense form */}
                        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4 text-right">
                          <h4 className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                            <Plus className="w-4 h-4 text-sky-600" />
                            <span>تسجيل مصروف للمشروع</span>
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                            أضف مصروف تشغيلي أو شراء خامات للمشروع، ليظهر في الميزانية الإجمالية تلقائياً.
                          </p>

                          <button
                            onClick={() => setIsExpenseModalOpen(true)}
                            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold text-xs transition-colors shadow-3xs cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            <Coins className="w-4 h-4" />
                            <span>إضافة مصروف للمشروع</span>
                          </button>
                        </div>

                      </div>

                    </div>
                  )}

                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* MODAL 1: ADD / EDIT PROJECT */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-55 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 text-right"
          >
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <button 
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-400 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-sky-400" />
                <span>{editingProject ? 'تعديل مشروع عمل' : 'إضافة مشروع عمل جديد'}</span>
              </h3>
            </div>

            <form onSubmit={handleProjectSubmit} className="p-5 space-y-4 text-xs font-bold">
              
              <div className="space-y-1.5">
                <label className="block text-slate-500">اسم المشروع</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  placeholder="مثال: تطوير متجر إلكتروني..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">اسم العميل</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  placeholder="مثال: شركة الحلول المتقدمة..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500">ميزانية المشروع ({currency})</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={projectBudget}
                    onChange={(e) => setProjectBudget(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-rose-600 font-black flex items-center gap-1">
                    <span>سقف ديون المشروع</span>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={projectDebtCeiling}
                    onChange={(e) => setProjectDebtCeiling(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-rose-50/50 border border-rose-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500">تاريخ البدء</label>
                  <input
                    type="date"
                    required
                    value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500">حالة المشروع</label>
                  <select
                    value={projectStatus}
                    onChange={(e) => setProjectStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  >
                    <option value="active">نشط</option>
                    <option value="on_hold">موقوف مؤقتاً</option>
                    <option value="completed">مكتمل</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">وصف مختصر للمشروع</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  placeholder="تفاصيل المشروع أو نطاق العمل..."
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  حفظ المشروع
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT EMPLOYEE */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-55 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 text-right"
          >
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <button 
                onClick={() => setIsEmployeeModalOpen(false)}
                className="text-slate-400 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>{editingEmployee ? 'تعديل بيانات الموظف' : 'تسجيل موظف جديد'}</span>
              </h3>
            </div>

            <form onSubmit={handleEmployeeSubmit} className="p-5 space-y-4 text-xs font-bold">
              
              <div className="space-y-1.5">
                <label className="block text-slate-500">اسم الموظف</label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  placeholder="مثال: أحمد مصطفى..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">المسمى الوظيفي / الدور</label>
                <input
                  type="text"
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  placeholder="مثال: مطور واجهات، مهندس مدني..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500">الراتب الأساسي الشهري ({currency})</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={empSalary}
                    onChange={(e) => setEmpSalary(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500">التخصيص على المشروع</label>
                  <select
                    value={empProjId}
                    onChange={(e) => setEmpProjId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  حفظ الموظف
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 3: PAY EMPLOYEE SALARY */}
      {isSalaryModalOpen && payingEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 z-55 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 text-right"
          >
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <button 
                onClick={() => { setIsSalaryModalOpen(false); setPayingEmployee(null); }}
                className="text-slate-400 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-sky-400" />
                <span>صرف راتب موظف</span>
              </h3>
            </div>

            <form onSubmit={handleSalarySubmit} className="p-5 space-y-4 text-xs font-bold">
              
              <div className="bg-sky-50 border border-sky-100 rounded-2xl p-4 text-slate-700 space-y-1">
                <p className="font-extrabold text-slate-900 text-xs">بيانات الموظف:</p>
                <p>الاسم: <strong className="text-sky-900">{payingEmployee.name}</strong></p>
                <p>المشروع المرتبط: <strong className="text-sky-900">{projects.find(p => p.id === payingEmployee.projectId)?.name}</strong></p>
                <p>الراتب الأساسي المستحق: <strong className="text-sky-900">{formatCurrency(payingEmployee.salaryAmount, currency)}</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500">شهر الراتب</label>
                  <input
                    type="month"
                    required
                    value={salaryMonth}
                    onChange={(e) => setSalaryMonth(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500">المبلغ المدفوع فعلياً ({currency})</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={salaryAmount}
                    onChange={(e) => setSalaryAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">تاريخ الصرف والدفع</label>
                <input
                  type="date"
                  required
                  value={salaryDate}
                  onChange={(e) => setSalaryDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">ملاحظات الصرف</label>
                <input
                  type="text"
                  value={salaryNotes}
                  onChange={(e) => setSalaryNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  placeholder="مثال: مكافأة إضافية، خصم غياب، دفعة مقدمة..."
                />
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-[10px] text-emerald-800 flex gap-2">
                <Coins className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>عند تأكيد الدفع، سيقوم النظام تلقائياً بتسجيل عملية "مصروف مالي" ضمن ميزانية المشروع والتقارير المالية العامة فوراً لضمان دقة الحسابات.</span>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => { setIsSalaryModalOpen(false); setPayingEmployee(null); }}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  تأكيد صرف الراتب
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 4: QUICK DEBT LINK */}
      {isDebtModalOpen && selectedProjectObj && (
        <div className="fixed inset-0 bg-slate-900/60 z-55 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 text-right"
          >
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <button 
                onClick={() => setIsDebtModalOpen(false)}
                className="text-slate-400 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>إضافة دين مرتبط بـ ({selectedProjectObj.name})</span>
              </h3>
            </div>

            <form onSubmit={handleQuickDebtSubmit} className="p-5 space-y-4 text-xs font-bold">
              
              {/* live Debt Ceiling warning in form */}
              {(() => {
                const projectedDebt = selectedProjStats.totalDebts + Number(debtAmount);
                const isWillExceed = selectedProjectObj.debtCeiling > 0 && projectedDebt > selectedProjectObj.debtCeiling;
                if (isWillExceed) {
                  return (
                    <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-2xl text-[10px] space-y-1">
                      <p className="font-extrabold text-rose-950">⚠️ تحذير: هذا الدين سيتجاوز سقف الديون!</p>
                      <p>
                        بإضافة هذا الدين، ستصبح مديونية المشروع الإجمالية <strong className="font-black">{formatCurrency(projectedDebt, currency)}</strong> بينما سقف الدين المحدد هو <strong className="font-black">{formatCurrency(selectedProjectObj.debtCeiling, currency)}</strong>.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-1.5">
                <label className="block text-slate-500">نوع الدين</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDebtType('to_others')}
                    className={`flex-1 py-2 rounded-xl border text-center transition-all ${
                      debtType === 'to_others'
                        ? 'bg-rose-50 border-rose-200 text-rose-700 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    دين علينا (للآخرين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtType('to_me')}
                    className={`flex-1 py-2 rounded-xl border text-center transition-all ${
                      debtType === 'to_me'
                        ? 'bg-sky-50 border-sky-200 text-sky-700 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    دين لنا (على العميل/الآخرين)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500">اسم الشخص / الدائن</label>
                  <input
                    type="text"
                    required
                    value={debtPerson}
                    onChange={(e) => setDebtPerson(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                    placeholder="مثال: مورد الخامات، المقاول..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500">مبلغ الدين ({currency})</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">تاريخ الاستحقاق والوفاء</label>
                <input
                  type="date"
                  required
                  value={debtDueDate}
                  onChange={(e) => setDebtDueDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">تفاصيل إضافية</label>
                <input
                  type="text"
                  value={debtDesc}
                  onChange={(e) => setDebtDesc(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  placeholder="مثال: دفعة توريد حديد وتسليح..."
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsDebtModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  تأكيد وإضافة الدين
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 5: QUICK EXPENSE LINK */}
      {isExpenseModalOpen && selectedProjectObj && (
        <div className="fixed inset-0 bg-slate-900/60 z-55 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 text-right"
          >
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <button 
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-slate-400 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-sky-400" />
                <span>إضافة مصروف مرتبط بـ ({selectedProjectObj.name})</span>
              </h3>
            </div>

            <form onSubmit={handleQuickExpenseSubmit} className="p-5 space-y-4 text-xs font-bold">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500">فئة المصروف</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  >
                    <option value="عمل">عمل ومشاريع</option>
                    <option value="فواتير">فواتير وتراخيص</option>
                    <option value="مواصلات">شحن ونقل ومواصلات</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500">المبلغ ({currency})</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={expAmount}
                    onChange={(e) => setExpAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">بيان ووصف المصروف</label>
                <textarea
                  required
                  rows={2}
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  placeholder="مثال: شراء مواد خام، تكلفة حفر، تراخيص البناء..."
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  تأكيد وإضافة المصروف
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 6: EDIT PROJECT DEBT */}
      {editingDebtObj && (
        <div className="fixed inset-0 bg-slate-900/60 z-55 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 text-right"
          >
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <button 
                onClick={() => setEditingDebtObj(null)}
                className="text-slate-400 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>تعديل الدين لمشروع ({projects.find(p => p.id === editingDebtObj.projectId)?.name})</span>
              </h3>
            </div>

            <form onSubmit={handleEditDebtSubmit} className="p-5 space-y-4 text-xs font-bold">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500">نوع الدين</label>
                  <select
                    value={editDebtType}
                    onChange={(e) => setEditDebtType(e.target.value as 'to_me' | 'to_others')}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  >
                    <option value="to_others">دين علينا (مستحق للغير)</option>
                    <option value="to_me">دين لنا (مستحق على الغير)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500">المبلغ ({currency})</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editDebtAmount}
                    onChange={(e) => setEditDebtAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500">اسم صاحب الدين</label>
                  <input
                    type="text"
                    required
                    value={editDebtPerson}
                    onChange={(e) => setEditDebtPerson(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                    placeholder="اسم الشخص أو الشركة"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    required
                    value={editDebtDueDate}
                    onChange={(e) => setEditDebtDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">التفاصيل والوصف</label>
                <textarea
                  rows={2}
                  value={editDebtDesc}
                  onChange={(e) => setEditDebtDesc(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  placeholder="ملاحظات تفصيلية..."
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingDebtObj(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 7: EDIT PROJECT EXPENSE */}
      {editingExpenseObj && (
        <div className="fixed inset-0 bg-slate-900/60 z-55 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 text-right"
          >
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <button 
                onClick={() => setEditingExpenseObj(null)}
                className="text-slate-400 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-sky-400" />
                <span>تعديل مصروف المشروع ({projects.find(p => p.id === editingExpenseObj.projectId)?.name})</span>
              </h3>
            </div>

            <form onSubmit={handleEditExpenseSubmit} className="p-5 space-y-4 text-xs font-bold">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500">فئة المصروف</label>
                  <select
                    value={editExpCategory}
                    onChange={(e) => setEditExpCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  >
                    <option value="عمل">عمل ومشاريع</option>
                    <option value="فواتير">فواتير وتراخيص</option>
                    <option value="مواصلات">شحن ونقل ومواصلات</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500">المبلغ ({currency})</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editExpAmount}
                    onChange={(e) => setEditExpAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">التاريخ</label>
                <input
                  type="date"
                  required
                  value={editExpDate}
                  onChange={(e) => setEditExpDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">بيان ووصف المصروف</label>
                <textarea
                  required
                  rows={2}
                  value={editExpDesc}
                  onChange={(e) => setEditExpDesc(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingExpenseObj(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL 8: ADD DEBT INSTALLMENT PAYMENT */}
      {payingDebtObj && (
        <div className="fixed inset-0 bg-slate-900/60 z-55 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-md w-full shadow-xl overflow-hidden border border-slate-100 text-right"
          >
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <button 
                onClick={() => setPayingDebtObj(null)}
                className="text-slate-400 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>تسجيل دفعة سداد دين ({payingDebtObj.personName})</span>
              </h3>
            </div>

            <form onSubmit={handleInstallmentSubmit} className="p-5 space-y-4 text-xs font-bold">
              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1.5 border border-slate-100 text-right">
                <p className="text-slate-500 font-bold">ملخص مديونية المشروع:</p>
                <div className="flex justify-between items-center font-mono text-slate-700 text-xs font-black">
                  <span>{formatCurrency(payingDebtObj.amount - payingDebtObj.paidAmount, currency)}</span>
                  <span>المبلغ المتبقي:</span>
                </div>
                <div className="flex justify-between items-center font-mono text-slate-500 text-[11px]">
                  <span>{formatCurrency(payingDebtObj.amount, currency)}</span>
                  <span>إجمالي الدين الأصلي:</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500">مبلغ الدفعة ({currency})</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={payingDebtObj.amount - payingDebtObj.paidAmount}
                    value={instAmount}
                    onChange={(e) => setInstAmount(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-slate-500">تاريخ السداد</label>
                  <input
                    type="date"
                    required
                    value={instDate}
                    onChange={(e) => setInstDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-500">ملاحظات وبيان الدفعة</label>
                <input
                  type="text"
                  value={instNotes}
                  onChange={(e) => setInstNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-800 font-bold"
                  placeholder="مثال: دفعة كاش، شيك رقم 123..."
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between gap-2.5">
                <input
                  type="checkbox"
                  id="instLinkToBudget"
                  checked={instLinkToBudget}
                  onChange={(e) => setInstLinkToBudget(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="instLinkToBudget" className="text-[10px] text-slate-500 font-bold cursor-pointer select-none">
                  ربط السداد كعملية مصروف/إيراد في سجل الميزانية والتقارير العامة تلقائياً
                </label>
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setPayingDebtObj(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  تأكيد سداد الدفعة
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </div>
  );
}
