import React, { useState, useMemo, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  X, 
  TrendingDown, 
  Calendar, 
  DollarSign, 
  Tag, 
  FileText, 
  PiggyBank, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Zap,
  Check,
  Sparkles
} from 'lucide-react';
import { Expense, Budget, ExpenseTemplate } from '../types';
import { formatCurrency, formatDate, getLocalDateString, getCurrentMonthString } from '../utils';
import { getArabicReferenceLabel, getDisplayReferenceNumber, matchesReferenceSearch } from '../utils/recordReferences';
import { isPositiveFinancialAmount, isValidBudgetLimit } from '../utils/financialInputValidation';
import AttachmentSelector from './AttachmentSelector';
import ReferenceCopyButton from './ReferenceCopyButton';

interface BudgetManagerProps {
  expenses: Expense[];
  budgets: Budget[];
  currency: string;
  onSetBudget: (month: string, limit: number, categoryLimits?: { [category: string]: number }) => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

const DEFAULT_TEMPLATES: ExpenseTemplate[] = [
  { id: 'tmpl-1', title: 'إيجار السكن الشهري', amount: 1500, category: 'سكن', description: 'دفع إيجار المنزل الشهري المتكرر' },
  { id: 'tmpl-2', title: 'فاتورة الإنترنت والاتصالات', amount: 200, category: 'فواتير', description: 'اشتراك الشبكة المنزلية' },
  { id: 'tmpl-3', title: 'شحن الوقود والمواصلات', amount: 250, category: 'مواصلات', description: 'تكاليف التنقل الأسبوعية' },
  { id: 'tmpl-4', title: 'مشتريات البقالة والمواد الغذائية', amount: 350, category: 'طعام', description: 'مواد غذائية ومستلزمات منزلية' },
];

function FormValidationAlert({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-bold text-rose-800" role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

export default function BudgetManager({
  expenses,
  budgets,
  currency,
  onSetBudget,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
}: BudgetManagerProps) {
  // Navigation & Month Filter
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthString());
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const hasActiveExpenseFilters = Boolean(searchTerm.trim() || categoryFilter !== 'all');
  const resetExpenseFilters = () => {
    setSearchTerm('');
    setCategoryFilter('all');
  };

  // Modals state
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Budget field
  const [budgetLimit, setBudgetLimit] = useState<number | ''>('');
  const [modalCategoryLimits, setModalCategoryLimits] = useState<Record<string, number>>({});

  const modalCategoriesSum = useMemo(() => {
    return (Object.values(modalCategoryLimits) as (number | undefined)[]).reduce<number>((sum, val) => sum + (val || 0), 0);
  }, [modalCategoryLimits]);

  // Expense fields
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseCategory, setExpenseCategory] = useState('طعام');
  const [expenseDate, setExpenseDate] = useState(getLocalDateString());
  const [expenseDescription, setExpenseDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Selected for edit
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  // Attachment states for the modals
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Quick Expense Templates state
  const [templates, setTemplates] = useState<ExpenseTemplate[]>(() => {
    const saved = localStorage.getItem('personal_expense_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback to default
      }
    }
    return DEFAULT_TEMPLATES;
  });

  useEffect(() => {
    localStorage.setItem('personal_expense_templates', JSON.stringify(templates));
  }, [templates]);

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExpenseTemplate | null>(null);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateAmount, setTemplateAmount] = useState<number | ''>('');
  const [templateCategory, setTemplateCategory] = useState('فواتير');
  const [templateDescription, setTemplateDescription] = useState('');
  const [addedTemplateId, setAddedTemplateId] = useState<string | null>(null);

  const handleQuickAddTemplate = (tmpl: ExpenseTemplate) => {
    const todayStr = getLocalDateString();
    const dateToAdd = todayStr.startsWith(selectedMonth) ? todayStr : `${selectedMonth}-01`;

    onAddExpense({
      amount: tmpl.amount,
      category: tmpl.category,
      date: dateToAdd,
      description: tmpl.title + (tmpl.description ? ` (${tmpl.description})` : ''),
      note: tmpl.note || 'تمت الإضافة عبر قوالب المصاريف السريعة ⚡',
    });

    setAddedTemplateId(tmpl.id);
    setTimeout(() => setAddedTemplateId(null), 2200);
  };

  const openAddTemplateModal = () => {
    setFormError(null);
    setEditingTemplate(null);
    setTemplateTitle('');
    setTemplateAmount('');
    setTemplateCategory('فواتير');
    setTemplateDescription('');
    setIsTemplateModalOpen(true);
  };

  const openEditTemplateModal = (tmpl: ExpenseTemplate) => {
    setFormError(null);
    setEditingTemplate(tmpl);
    setTemplateTitle(tmpl.title);
    setTemplateAmount(tmpl.amount);
    setTemplateCategory(tmpl.category);
    setTemplateDescription(tmpl.description || '');
    setIsTemplateModalOpen(true);
  };

  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateTitle.trim()) {
      setFormError('أدخل عنواناً واضحاً للقالب السريع قبل حفظه.');
      return;
    }
    if (!isPositiveFinancialAmount(templateAmount)) {
      setFormError('أدخل مبلغاً أكبر من صفر للقالب السريع.');
      return;
    }
    setFormError(null);

    if (editingTemplate) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingTemplate.id
            ? {
                ...t,
                title: templateTitle.trim(),
                amount: Number(templateAmount),
                category: templateCategory,
                description: templateDescription.trim(),
              }
            : t
        )
      );
    } else {
      const newTmpl: ExpenseTemplate = {
        id: `tmpl-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: templateTitle.trim(),
        amount: Number(templateAmount),
        category: templateCategory,
        description: templateDescription.trim(),
      };
      setTemplates((prev) => [...prev, newTmpl]);
    }
    setIsTemplateModalOpen(false);
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا القالب السريع؟')) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  const expenseCategories = ['طعام', 'فواتير', 'مواصلات', 'سكن', 'صحة', 'ترفيه', 'تسديد ديون', 'أخرى'];

  // Current Budget Object & Info
  const currentBudgetObj = useMemo(() => {
    return budgets.find((b) => b.month === selectedMonth);
  }, [budgets, selectedMonth]);

  const currentBudget = useMemo(() => {
    return currentBudgetObj ? currentBudgetObj.monthlyLimit : 0;
  }, [currentBudgetObj]);

  const currentCategoryLimits = useMemo(() => {
    return currentBudgetObj?.categoryLimits || {};
  }, [currentBudgetObj]);

  // Filter out project-specific expenses to exclude them from the general budget and lists
  const nonProjectExpenses = useMemo(() => {
    return expenses.filter((e) => !e.projectId);
  }, [expenses]);

  // Calculate spent per category
  const categorySpent = useMemo(() => {
    const spent: Record<string, number> = {};
    expenseCategories.forEach((cat) => {
      spent[cat] = 0;
    });
    nonProjectExpenses.filter((e) => e.date.startsWith(selectedMonth)).forEach((exp) => {
      spent[exp.category] = (spent[exp.category] || 0) + exp.amount;
    });
    return spent;
  }, [nonProjectExpenses, selectedMonth, expenseCategories]);

  // Expenses for the selected month
  const monthlyExpensesList = useMemo(() => {
    return nonProjectExpenses.filter((e) => e.date.startsWith(selectedMonth));
  }, [nonProjectExpenses, selectedMonth]);

  // Sum of expenses for the selected month
  const totalSpent = useMemo(() => {
    return monthlyExpensesList.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpensesList]);

  // Remaining budget
  const remaining = currentBudget - totalSpent;
  const spentPercent = currentBudget > 0 ? Math.round((totalSpent / currentBudget) * 100) : 0;

  // Change Month backward or forward
  const changeMonth = (direction: 'prev' | 'next') => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = month;

    if (direction === 'prev') {
      newMonth = month - 1;
      if (newMonth === 0) {
        newMonth = 12;
        newYear = year - 1;
      }
    } else {
      newMonth = month + 1;
      if (newMonth === 13) {
        newMonth = 1;
        newYear = year + 1;
      }
    }

    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, '0')}`);
  };

  // Open budget modal
  const openBudgetModal = () => {
    setFormError(null);
    setBudgetLimit(currentBudget || '');
    const initialLimits: Record<string, number> = {};
    expenseCategories.forEach((cat) => {
      initialLimits[cat] = currentCategoryLimits[cat] || 0;
    });
    setModalCategoryLimits(initialLimits);
    setIsBudgetModalOpen(true);
  };

  // Open add expense modal
  const openAddExpenseModal = () => {
    setFormError(null);
    setExpenseAmount('');
    setExpenseCategory('طعام');
    setExpenseDate(getLocalDateString());
    setExpenseDescription('');
    setNote('');
    setPhoto('');
    setIsExpenseModalOpen(true);
  };

  // Open edit expense modal
  const openEditExpenseModal = (exp: Expense) => {
    setFormError(null);
    setSelectedExpense(exp);
    setExpenseAmount(exp.amount);
    setExpenseCategory(exp.category);
    setExpenseDate(exp.date);
    setExpenseDescription(exp.description);
    setNote(exp.note || '');
    setPhoto(exp.photo || '');
    setIsEditModalOpen(true);
  };

  // Submit set budget
  const handleBudgetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericBudgetLimit = Number(budgetLimit);
    if (!isValidBudgetLimit(budgetLimit)) {
      setFormError('أدخل حداً شهرياً صحيحاً يساوي صفراً أو أكثر.');
      return;
    }
    if (modalCategoriesSum > numericBudgetLimit) {
      setFormError('لا يمكن أن يتجاوز مجموع حدود التصنيفات الحد الشهري الكلي.');
      return;
    }
    
    const cleanedCategoryLimits: Record<string, number> = {};
    (Object.entries(modalCategoryLimits) as [string, number | undefined][]).forEach(([cat, val]) => {
      if (val && val > 0) {
        cleanedCategoryLimits[cat] = val;
      }
    });

    setFormError(null);
    onSetBudget(selectedMonth, numericBudgetLimit, cleanedCategoryLimits);
    setIsBudgetModalOpen(false);
  };

  // Submit add expense
  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPositiveFinancialAmount(expenseAmount)) {
      setFormError('أدخل مبلغ مصروف أكبر من صفر قبل الحفظ.');
      return;
    }
    if (!expenseDate) {
      setFormError('اختر تاريخ المصروف قبل الحفظ.');
      return;
    }
    setFormError(null);
    onAddExpense({
      amount: Number(expenseAmount),
      category: expenseCategory,
      date: expenseDate,
      description: expenseDescription,
      note,
      photo,
    });
    setIsExpenseModalOpen(false);
  };

  // Submit edit expense
  const handleEditExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;
    if (!isPositiveFinancialAmount(expenseAmount)) {
      setFormError('أدخل مبلغ مصروف أكبر من صفر قبل حفظ التعديلات.');
      return;
    }
    if (!expenseDate) {
      setFormError('اختر تاريخ المصروف قبل حفظ التعديلات.');
      return;
    }
    setFormError(null);
    onEditExpense({
      ...selectedExpense,
      amount: Number(expenseAmount),
      category: expenseCategory,
      date: expenseDate,
      description: expenseDescription,
      note,
      photo,
    });
    setIsEditModalOpen(false);
  };

  // Filtered expense list for display
  const filteredExpenses = useMemo(() => {
    return monthlyExpensesList.filter((e) => {
      // Search by description, category, or invoice reference number
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = e.description.toLowerCase().includes(term);
        const matchesCat = e.category.toLowerCase().includes(term);
        const matchesReference = matchesReferenceSearch(e, 'INV', searchTerm);
        if (!matchesDesc && !matchesCat && !matchesReference) return false;
      }
      // Category
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;

      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [monthlyExpensesList, searchTerm, categoryFilter]);

  return (
    <div className="space-y-6" id="budget-viewport">
      {/* Page Header with Month Changer */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="budget-header">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">تتبع الميزانية والمصاريف 💰</h1>
          <p className="text-xs text-slate-400">حدد ميزانيتك الشهرية وقيد مصروفاتك اليومية لضبط وضعك المالي</p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl self-stretch md:self-auto justify-between" id="month-navigation">
          <button 
            id="prev-month-btn"
            onClick={() => changeMonth('prev')}
            className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-600"
            aria-label="عرض الشهر السابق"
            title="الشهر السابق"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
          
          <span className="text-xs font-extrabold text-slate-800 px-3">
            {formatDate(selectedMonth + '-01').substring(3)}
          </span>

          <button 
            id="next-month-btn"
            onClick={() => changeMonth('next')}
            className="p-1.5 hover:bg-white rounded-lg transition-colors cursor-pointer text-slate-600"
            aria-label="عرض الشهر التالي"
            title="الشهر التالي"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Monthly Budget Summary Card */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6 items-center" id="budget-summary-card">
        {/* Left: Progress Ring or Big Stats */}
        <div className="space-y-4 md:border-l border-slate-100 md:pl-6" id="budget-metrics-left">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-bold">الميزانية المحددة لهذا الشهر</span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-2xl font-black text-slate-800">
                {currentBudget > 0 ? formatCurrency(currentBudget, currency) : 'لم تحدد بعد'}
              </h2>
              <button 
                id="edit-budget-limit-btn"
                onClick={openBudgetModal}
                className="text-xs text-sky-600 hover:underline font-semibold"
              >
                {currentBudget > 0 ? 'تعديل' : 'تحديد الميزانية'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400">إجمالي المصروفات</span>
              <span className="block text-sm font-bold text-rose-600">{formatCurrency(totalSpent, currency)}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-slate-400">المتبقي</span>
              <span className={`block text-sm font-bold ${remaining < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                {formatCurrency(remaining, currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Detailed Progress Bar and Warning Messages */}
        <div className="md:col-span-2 space-y-4" id="budget-progress-center">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600">
              <span>معدل استهلاك الميزانية</span>
              <span className={`${spentPercent > 100 ? 'text-red-600' : spentPercent > 85 ? 'text-amber-500' : 'text-emerald-600'}`}>
                {spentPercent}% ({totalSpent > currentBudget && currentBudget > 0 ? 'تجاوزت الحد!' : 'قيد الاستخدام'})
              </span>
            </div>
            
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  spentPercent > 100 ? 'bg-red-500' : spentPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(spentPercent, 100)}%` }}
              ></div>
            </div>
          </div>

          {/* Smart Budget alert insights */}
          <div id="budget-alert-insights" className="space-y-2">
            {currentBudget === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>يرجى تحديد ميزانية شهرية لكي تتمكن من قياس مستوى الصرف وتلقي التنبيهات اللازمة عند الاقتراب من السقف.</span>
              </div>
            ) : spentPercent > 100 ? (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-800 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>تنبيه هام: لقد تجاوزت الميزانية المحددة لهذا الشهر بمقدار {formatCurrency(Math.abs(remaining), currency)}! يرجى ترشيد المصاريف القادمة.</span>
              </div>
            ) : spentPercent > 85 ? (
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-[11px] text-amber-800 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>تحذير: لقد استهلكت أكثر من 85% من ميزانيتك المقررة. المتبقي لك ضئيل جداً.</span>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 flex gap-2">
                <PiggyBank className="w-4 h-4 shrink-0 mt-0.5" />
                <span>رائع! مصروفاتك آمنة وقيد السيطرة. تتبقى لديك مساحة ممتازة من الميزانية للتوفير.</span>
              </div>
            )}

            {/* Category budget alerts */}
            {expenseCategories
              .filter((cat) => currentCategoryLimits[cat] && currentCategoryLimits[cat] > 0)
              .map((cat) => {
                const limit = currentCategoryLimits[cat];
                const spent = categorySpent[cat] || 0;
                if (spent > limit) {
                  return (
                    <div key={`alert-${cat}`} className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-[11px] text-rose-800 flex gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span>تنبيه فئة <strong className="text-rose-950 font-bold">{cat}</strong>: لقد تجاوزت الميزانية المحددة لهذه الفئة بمقدار {formatCurrency(spent - limit, currency)}!</span>
                    </div>
                  );
                } else if (spent > limit * 0.85) {
                  return (
                    <div key={`alert-${cat}`} className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl text-[11px] text-amber-800 flex gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                      <span>تحذير فئة <strong className="text-amber-950 font-bold">{cat}</strong>: لقد استهلكت أكثر من 85% من الميزانية المقررة لهذه الفئة. المتبقي: {formatCurrency(limit - spent, currency)}.</span>
                    </div>
                  );
                }
                return null;
              })}
          </div>
        </div>
      </div>

      {/* Category-Specific Budgets Progress */}
      {Object.keys(currentCategoryLimits).filter(cat => currentCategoryLimits[cat] > 0).length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 space-y-4" id="category-budgets-section">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <div className="space-y-0.5">
              <h3 className="font-bold text-slate-800 text-sm">ميزانيات فئات الإنفاق لـ {selectedMonth} 📊</h3>
              <p className="text-[11px] text-slate-400">تتبع استهلاك الميزانية المحددة لكل فئة بشكل منفصل</p>
            </div>
            <button 
              onClick={openBudgetModal} 
              className="text-xs text-sky-600 hover:underline font-semibold"
            >
              تعديل ميزانية الفئات
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expenseCategories
              .filter((cat) => currentCategoryLimits[cat] && currentCategoryLimits[cat] > 0)
              .map((cat) => {
                const limit = currentCategoryLimits[cat];
                const spent = categorySpent[cat] || 0;
                const percent = Math.round((spent / limit) * 100);
                const remainingCat = limit - spent;

                return (
                  <div key={cat} className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 space-y-2 hover:bg-slate-50 transition-colors" id={`cat-budget-${cat}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700 text-xs">{cat}</span>
                      <span className={`text-[10px] font-semibold ${percent > 100 ? 'text-rose-600' : percent > 85 ? 'text-amber-500' : 'text-emerald-600'}`}>
                        {percent}% مستهلك
                      </span>
                    </div>

                    <div className="w-full bg-slate-200/60 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          percent > 100 ? 'bg-rose-500' : percent > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>المصروف: <strong className="text-slate-700">{formatCurrency(spent, currency)}</strong> من <strong className="text-slate-700">{formatCurrency(limit, currency)}</strong></span>
                      <span className={remainingCat < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-medium'}>
                        {remainingCat < 0 ? `تجاوز بـ ${formatCurrency(Math.abs(remainingCat), currency)}` : `متبقي: ${formatCurrency(remainingCat, currency)}`}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Quick Expense Templates Section */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-100 space-y-4" id="quick-expense-templates-section">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div className="space-y-0.5">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 fill-amber-400" />
              <span>قوالب المصاريف السريعة ⚡</span>
            </h3>
            <p className="text-[11px] text-slate-400">أنشئ قائمة بمصاريفك المتكررة (إيجار، إنترنت، اشتراكات) وأضفها بضغطة زر واحدة للميزانية الشهرية</p>
          </div>

          <button
            type="button"
            id="add-quick-template-btn"
            onClick={openAddTemplateModal}
            className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 border border-sky-200/60"
          >
            <Plus className="w-3.5 h-3.5 text-sky-600" />
            <span>إنشاء قالب جديد</span>
          </button>
        </div>

        {templates.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-slate-400">
            <Zap className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-xs font-bold mb-1">لا توجد قوالب مصاريف سريعة حالياً</p>
            <button
              onClick={openAddTemplateModal}
              className="text-xs text-sky-600 hover:underline font-bold mt-1 inline-block"
            >
              + إضافة أول قالب سريع
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5" id="quick-templates-grid">
            {templates.map((tmpl) => {
              const isAdded = addedTemplateId === tmpl.id;

              return (
                <div
                  key={tmpl.id}
                  id={`template-card-${tmpl.id}`}
                  className="p-3.5 bg-slate-50/70 hover:bg-white rounded-xl border border-slate-200/80 hover:border-sky-300 hover:shadow-md transition-all flex flex-col justify-between gap-2.5 relative group"
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 bg-slate-200/80 text-slate-700 rounded text-[9px] font-bold truncate max-w-[100px]">
                        {tmpl.category}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEditTemplateModal(tmpl)}
                          className="p-1 text-slate-400 hover:text-sky-600 rounded hover:bg-slate-200/60 transition-colors"
                          title="تعديل القالب"
                          aria-label={`تعديل قالب ${tmpl.title}`}
                        >
                          <Edit3 className="w-3 h-3" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(tmpl.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-200/60 transition-colors"
                          title="حذف القالب"
                          aria-label={`حذف قالب ${tmpl.title}`}
                        >
                          <Trash2 className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-800 text-xs truncate" title={tmpl.title}>
                      {tmpl.title}
                    </h4>

                    {tmpl.description && (
                      <p className="text-[10px] text-slate-400 truncate" title={tmpl.description}>
                        {tmpl.description}
                      </p>
                    )}

                    <div className="text-rose-600 font-black text-sm pt-0.5">
                      {formatCurrency(tmpl.amount, currency)}
                    </div>
                  </div>

                  <button
                    type="button"
                    id={`btn-quick-add-${tmpl.id}`}
                    onClick={() => handleQuickAddTemplate(tmpl)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                      isAdded
                        ? 'bg-emerald-600 text-white font-black scale-98'
                        : 'bg-white hover:bg-sky-600 text-sky-700 hover:text-white border border-sky-200 hover:border-sky-600'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>تمت الإضافة للميزانية! ✨</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>إضافة سريعة للميزانية</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Filters and Search and Register button */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-100" id="expenses-filters">
        <div className="flex flex-col sm:flex-row gap-2 flex-1" id="filters-group">
          {/* Search */}
          <div className="relative flex-1" id="expense-search-wrapper">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              id="expense-search-input"
              type="text"
                placeholder="البحث في المصاريف أو رقم الفاتورة INV..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2" id="expense-category-filter-wrapper">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              id="expense-category-select-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="all">كل الفئات</option>
              {expenseCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {hasActiveExpenseFilters && (
            <button
              id="reset-expense-filters-btn"
              type="button"
              onClick={resetExpenseFilters}
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 transition hover:border-sky-200 hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              مسح الفلاتر
            </button>
          )}
        </div>

        <button
          id="add-expense-main-btn"
          onClick={openAddExpenseModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل مصروف جديد</span>
        </button>
      </div>

      {/* Expenses List Card */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden" id="expenses-table-card">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">سجل المصروفات المجدولة لشهر {selectedMonth}</h3>
          <span className="text-xs text-slate-400">عدد العمليات: {filteredExpenses.length}</span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center text-slate-400" id="empty-expenses-list">
            <TrendingDown className="w-12 h-12 mx-auto text-slate-200 mb-2" />
            <h4 className="font-bold text-slate-700 text-sm mb-1">
              {hasActiveExpenseFilters ? 'لا توجد مصاريف تطابق البحث أو الفئة' : 'لا توجد مصاريف مسجلة'}
            </h4>
            <p className="text-xs max-w-xs mx-auto text-slate-400">
              {hasActiveExpenseFilters
                ? 'جرّب مسح الفلاتر للعودة إلى كل مصاريف الشهر، أو غيّر رقم الفاتورة الذي تبحث عنه.'
                : 'سجل مصروفاتك اليومية ليتم احتسابها تلقائياً وخصمها من ميزانية الشهر.'}
            </p>
            <button
              type="button"
              onClick={hasActiveExpenseFilters ? resetExpenseFilters : openAddExpenseModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-black text-white transition hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
            >
              {hasActiveExpenseFilters ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
              {hasActiveExpenseFilters ? 'مسح الفلاتر' : 'تسجيل أول مصروف'}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto" id="expenses-table-container">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <th className="p-4">التاريخ</th>
                  <th className="p-4">رقم الفاتورة</th>
                  <th className="p-4">الفئة</th>
                  <th className="p-4">المبلغ</th>
                  <th className="p-4">التفاصيل / البيان</th>
                  <th className="p-4 text-left">أدوات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} id={`expense-row-${exp.id}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4 whitespace-nowrap font-medium text-slate-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(exp.date)}</span>
                    </td>
                    <td className="p-4 whitespace-nowrap" title="الرقم المرجعي للفاتورة">
                      <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-slate-600">
                        <span>{getArabicReferenceLabel(getDisplayReferenceNumber(exp, 'INV'))}</span>
                        <ReferenceCopyButton referenceNumber={getDisplayReferenceNumber(exp, 'INV')} recordType="فاتورة" />
                      </div>
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-md font-medium text-[10px] ${
                        exp.category === 'تسديد ديون' 
                          ? 'bg-purple-100 text-purple-800' 
                          : exp.category === 'فواتير' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-4 whitespace-nowrap font-bold text-rose-600">
                      {formatCurrency(exp.amount, currency)}
                    </td>
                    <td className="p-4 max-w-xs truncate text-slate-600" title={exp.description}>
                      {exp.description || <span className="text-slate-300">بدون تفاصيل</span>}
                      {exp.linkedDebtId && (
                        <span className="block text-[9px] text-purple-500 mt-0.5">
                          🔗 مرتبط بسداد دين
                        </span>
                      )}
                      {(exp.note || exp.photo) && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {exp.note && (
                            <span 
                              className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-md max-w-[160px] truncate font-semibold block" 
                              title={exp.note}
                            >
                              📝 {exp.note}
                            </span>
                          )}
                          {exp.photo && (
                            <button
                              type="button"
                              onClick={() => setSelectedPhoto(exp.photo!)}
                              className="text-[9px] bg-sky-50 text-sky-600 border border-sky-100 px-1.5 py-0.5 rounded-md hover:bg-sky-100 transition-colors font-bold flex items-center gap-1 cursor-pointer"
                            >
                              📸 عرض المرفق
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-left whitespace-nowrap">
                      <div className="flex justify-end gap-1.5">
                        <button
                          id={`btn-edit-exp-${exp.id}`}
                          onClick={() => openEditExpenseModal(exp)}
                          className="p-1 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="تعديل المصروف"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-delete-exp-${exp.id}`}
                          onClick={() => {
                            if (confirm('هل تريد حذف هذا المصروف نهائياً؟')) {
                              onDeleteExpense(exp.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="حذف المصروف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Set/Edit Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="set-budget-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">تحديد الميزانية الشهرية 🎯</h2>
              <button onClick={() => setIsBudgetModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleBudgetSubmit} className="p-5 space-y-4 text-xs" id="set-budget-form">
              {formError && <FormValidationAlert message={formError} />}
              <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-500 leading-normal">
                أنت تقوم بتحديد السقف الأقصى للمصاريف لشهر:{' '}
                <span className="font-bold text-slate-800">
                  {formatDate(selectedMonth + '-01').substring(3)}
                </span>
              </div>

              {/* Main monthly limit */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-bold">إجمالي ميزانية الشهر ({currency})</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="مثال: 5000"
                    value={budgetLimit}
                    onChange={(e) => setBudgetLimit(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 font-black text-sm"
                  />
                </div>
                {modalCategoriesSum > 0 && (
                  <div className="flex justify-between items-center mt-1.5 bg-sky-50/50 p-2 rounded-lg border border-sky-100/50">
                    <span className="text-[10px] text-slate-500 font-medium">مجموع ميزانيات الفئات: <strong>{formatCurrency(modalCategoriesSum, currency)}</strong></span>
                    <button
                      type="button"
                      onClick={() => setBudgetLimit(modalCategoriesSum)}
                      className="text-[10px] text-sky-600 hover:underline font-bold"
                    >
                      اعتماده كإجمالي
                    </button>
                  </div>
                )}
              </div>

              {/* Category limits section */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-slate-600 font-bold">تخصيص ميزانيات منفصلة للفئات (اختياري)</label>
                  <span className="text-[10px] text-slate-400">اتركها فارغة أو صفر لإلغاء الميزانية</span>
                </div>

                <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2.5" id="category-limits-scroll-container">
                  {expenseCategories.map((cat) => (
                    <div key={cat} className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <span className="w-20 font-semibold text-slate-700 text-[11px] truncate">{cat}</span>
                      <div className="relative flex-1">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="number"
                          min="0"
                          placeholder="لا يوجد سقف"
                          value={modalCategoryLimits[cat] || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setModalCategoryLimits((prev) => ({
                              ...prev,
                              [cat]: val,
                            }));
                          }}
                          className="w-full pl-2 pr-7 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 font-black"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  حفظ الميزانية
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="add-expense-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">تسجيل مصروف جديد 📝</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleExpenseSubmit} className="p-5 space-y-4 text-xs" id="add-expense-form">
              {formError && <FormValidationAlert message={formError} />}
              {/* Amount */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">المبلغ المصروف ({currency})</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="any"
                    placeholder="0.00"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 font-black"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">فئة المصروف</label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 font-bold"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">تاريخ الصرف</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 font-black"
                  />
                </div>
                <div className="text-[10px] text-emerald-600 font-extrabold text-right mt-1" id="add-expense-date-formatted-preview">
                  {expenseDate ? formatDate(expenseDate) : 'لم يتم اختيار تاريخ'}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">البيان / التفاصيل</label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <textarea
                    placeholder="مثال: فاتورة الإنترنت لشهر 6، غداء مع العائلة..."
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    rows={2}
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 font-medium"
                  />
                </div>
              </div>

              {/* Note & Photo Capture */}
              <AttachmentSelector
                note={note}
                onChangeNote={setNote}
                photo={photo}
                onChangePhoto={setPhoto}
              />

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  تسجيل المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {isEditModalOpen && selectedExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-expense-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">تعديل بيانات المصروف ✏️</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditExpenseSubmit} className="p-5 space-y-4 text-xs" id="edit-expense-form">
              {formError && <FormValidationAlert message={formError} />}
              {/* Amount */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">المبلغ المصروف ({currency})</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="any"
                    value={expenseAmount}
                    onChange={(e) => setExpenseAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 font-black"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">فئة المصروف</label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 font-bold"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">تاريخ الصرف</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 font-black"
                  />
                </div>
                <div className="text-[10px] text-emerald-600 font-extrabold text-right mt-1" id="edit-expense-date-formatted-preview">
                  {expenseDate ? formatDate(expenseDate) : 'لم يتم اختيار تاريخ'}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">البيان / التفاصيل</label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                  <textarea
                    value={expenseDescription}
                    onChange={(e) => setExpenseDescription(e.target.value)}
                    rows={2}
                    className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700 font-medium"
                  />
                </div>
              </div>

              {/* Note & Photo Capture */}
              <AttachmentSelector
                note={note}
                onChangeNote={setNote}
                photo={photo}
                onChangePhoto={setPhoto}
              />

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  تعديل المصروف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create / Edit Quick Expense Template Modal */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="template-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500 fill-amber-400" />
                <span>{editingTemplate ? 'تعديل قالب مصروف سريع' : 'إنشاء قالب مصروف سريع جديد ⚡'}</span>
              </h2>
              <button onClick={() => setIsTemplateModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplateSubmit} className="p-5 space-y-4 text-xs" id="template-form">
              {formError && <FormValidationAlert message={formError} />}
              {/* Template Title */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">اسم القالب (عنوان المصروف المتكرر)</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إيجار الشقة، فاتورة الإنترنت، اشتراك الجيم..."
                  value={templateTitle}
                  onChange={(e) => setTemplateTitle(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-slate-100 dark:bg-slate-900 font-bold"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">المبلغ الافتراضي ({currency})</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="any"
                    placeholder="0.00"
                    value={templateAmount}
                    onChange={(e) => setTemplateAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-slate-100 dark:bg-slate-900 font-black"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">فئة المصروف</label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-slate-100 dark:bg-slate-900 font-bold"
                  >
                    {expenseCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">ملاحظات / وصف مختصر (اختياري)</label>
                <textarea
                  placeholder="مثال: فاتورة الخدمة الشهرية المتكررة..."
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-900 dark:text-slate-100 dark:bg-slate-900 font-medium"
                />
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>{editingTemplate ? 'حفظ التغييرات' : 'حفظ القالب'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in cursor-zoom-out"
          onClick={() => setSelectedPhoto(null)}
          id="photo-lightbox-modal"
        >
          <div className="relative max-w-2xl w-full flex flex-col items-center">
            <button 
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-10 left-1/2 -translate-x-1/2 sm:-top-8 sm:left-auto sm:right-0 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedPhoto}
              alt="Full size attachment"
              referrerPolicy="no-referrer"
              className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl border border-white/10"
            />
            <p className="text-white/60 text-[10px] mt-3 text-center font-semibold">اضغط في أي مكان لإغلاق المعاينة 🔍</p>
          </div>
        </div>
      )}
    </div>
  );
}
