import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Wallet, 
  CreditCard, 
  User, 
  Calendar, 
  Tag, 
  FileText, 
  Briefcase, 
  CheckCircle, 
  AlertCircle,
  TrendingDown,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { Debt, Expense, Project } from '../types';
import { getLocalDateString, formatDate } from '../utils';

interface QuickEntryProps {
  projects: Project[];
  currency: string;
  onAddDebt: (debt: Omit<Debt, 'id' | 'paidAmount' | 'status' | 'installments'>) => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
}

type FormType = 'expense' | 'debt';

export default function QuickEntry({ projects = [], currency, onAddDebt, onAddExpense }: QuickEntryProps) {
  const [activeForm, setActiveForm] = useState<FormType>('expense');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Common fields
  const [amount, setAmount] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<string>('');

  // Expense specific
  const [expenseCategory, setExpenseCategory] = useState('طعام');
  const [expenseDate, setExpenseDate] = useState(getLocalDateString());

  // Debt specific
  const [debtType, setDebtType] = useState<'to_me' | 'to_others'>('to_me');
  const [personName, setPersonName] = useState('');
  const [debtCategory, setDebtCategory] = useState('شخصي');
  const [debtStartDate, setDebtStartDate] = useState(getLocalDateString());
  const [debtDueDate, setDebtDueDate] = useState('');

  const expenseCategories = ['طعام', 'فواتير', 'مواصلات', 'سكن', 'صحة', 'ترفيه', 'تسديد ديون', 'أخرى'];
  const debtCategories = ['شخصي', 'عائلي', 'عمل', 'تجاري', 'سلفة', 'أخرى'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Common validations
    if (!amount || Number(amount) <= 0) {
      setErrorMessage('الرجاء إدخال مبلغ صحيح أكبر من الصفر.');
      return;
    }

    if (activeForm === 'expense') {
      if (!description.trim()) {
        setErrorMessage('الرجاء كتابة وصف بسيط للمصروف.');
        return;
      }

      onAddExpense({
        amount: Number(amount),
        category: expenseCategory,
        date: expenseDate,
        description: description.trim(),
        projectId: projectId || undefined,
      });

      setSuccessMessage('تم تسجيل المصروف بنجاح! 💸');
      resetForm();
    } else {
      // Debt validations
      if (!personName.trim()) {
        setErrorMessage('الرجاء إدخال اسم الشخص الطرف الآخر في الدين.');
        return;
      }
      if (!debtDueDate) {
        setErrorMessage('الرجاء تحديد تاريخ استحقاق السداد.');
        return;
      }

      onAddDebt({
        type: debtType,
        personName: personName.trim(),
        amount: Number(amount),
        startDate: debtStartDate,
        dueDate: debtDueDate,
        category: debtCategory,
        description: description.trim(),
        projectId: projectId || undefined,
      });

      setSuccessMessage(
        debtType === 'to_me' 
          ? 'تم تسجيل الدين الجديد المستحق لك بنجاح! 📥' 
          : 'تم تسجيل الدين الجديد المترتب عليك بنجاح! 📤'
      );
      resetForm();
    }

    // Auto dismiss notifications
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const resetForm = () => {
    setAmount('');
    setDescription('');
    setProjectId('');
    // Expense defaults
    setExpenseCategory('طعام');
    setExpenseDate(getLocalDateString());
    // Debt defaults
    setDebtType('to_me');
    setPersonName('');
    setDebtCategory('شخصي');
    setDebtStartDate(getLocalDateString());
    setDebtDueDate('');
  };

  return (
    <div 
      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-5 text-right relative overflow-hidden" 
      id="quick-entry-card"
    >
      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-sky-500/10 to-emerald-500/10 text-slate-700 rounded-xl">
            <Plus className="w-5 h-5 text-sky-600" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm md:text-base">نموذج الإدخال السريع ⚡</h3>
            <p className="text-[11px] text-slate-400 font-bold">سجّل مصروفاتك وديونك فوراً بخطوة واحدة</p>
          </div>
        </div>
      </div>

      {/* Form Selector Segment Control */}
      <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-100" id="quick-entry-tabs">
        <button
          type="button"
          onClick={() => {
            setActiveForm('expense');
            setErrorMessage(null);
          }}
          className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeForm === 'expense'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
          }`}
          id="quick-entry-tab-expense"
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          <span>تسجيل مصروف</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveForm('debt');
            setErrorMessage(null);
          }}
          className={`py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeForm === 'debt'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
          }`}
          id="quick-entry-tab-debt"
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          <span>تسجيل دين</span>
        </button>
      </div>

      {/* Alert Banners */}
      <AnimatePresence mode="wait">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2"
            id="quick-entry-success-msg"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2"
            id="quick-entry-error-msg"
          >
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="space-y-4" id="quick-entry-form">
        {/* Dynamic fields based on active form */}
        <AnimatePresence mode="wait">
          {activeForm === 'expense' ? (
            <motion.div
              key="expense-fields"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Expense Row 1 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="quick-expense-amount" className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
                    <span>المبلغ ({currency})</span>
                    <Wallet className="w-3 h-3 text-emerald-600" />
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 150"
                    className="w-full text-left bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2.5 text-xs font-black focus:outline-none transition-all text-slate-900 placeholder:text-slate-500 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
                    id="quick-expense-amount"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="quick-expense-category" className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
                    <span>فئة المصروف</span>
                    <Tag className="w-3 h-3 text-emerald-600" />
                  </label>
                  <select
                    value={expenseCategory}
                    onChange={(e) => setExpenseCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs font-black transition-all text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
                    id="quick-expense-category"
                  >
                    {expenseCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expense Row 2 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="quick-expense-date" className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
                    <span>التاريخ</span>
                    <Calendar className="w-3 h-3 text-emerald-600" />
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full text-left bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3 py-2 text-xs font-black focus:outline-none transition-all text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
                    id="quick-expense-date"
                  />
                  <div className="text-[10px] text-emerald-600 font-extrabold text-right mt-1" id="quick-expense-date-formatted-preview">
                    {expenseDate ? formatDate(expenseDate) : 'لم يتم اختيار تاريخ'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="quick-expense-project" className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
                    <span>المشروع المرتبط (اختياري)</span>
                    <Briefcase className="w-3 h-3 text-emerald-600" />
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs font-black transition-all text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
                    id="quick-expense-project"
                  >
                    <option value="">-- بدون مشروع مرتبط --</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>{proj.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="debt-fields"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Debt Type Toggle */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-black text-slate-500 block">نوع الدين</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-xl border border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDebtType('to_me')}
                    className={`py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      debtType === 'to_me'
                        ? 'bg-sky-50 text-sky-700 border border-sky-100 font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    id="quick-debt-type-me"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-sky-600" />
                    <span>دين لي (أطلبه من غيري)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDebtType('to_others')}
                    className={`py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      debtType === 'to_others'
                        ? 'bg-rose-50 text-rose-700 border border-rose-100 font-extrabold'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                    id="quick-debt-type-others"
                  >
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                    <span>دين عليّ (يطلبه غيري)</span>
                  </button>
                </div>
              </div>

              {/* Debt Row 1 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="quick-debt-person" className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
                    <span>اسم الطرف الآخر</span>
                    <User className="w-3 h-3 text-sky-600" />
                  </label>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    placeholder="مثال: أحمد العلي"
                    className="w-full text-right bg-slate-50 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2.5 text-xs font-black focus:outline-none transition-all text-slate-900 placeholder:text-slate-500 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
                    id="quick-debt-person"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="quick-debt-amount" className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
                    <span>المبلغ ({currency})</span>
                    <Wallet className="w-3 h-3 text-sky-600" />
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="مثال: 500"
                    className="w-full text-left bg-slate-50 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2.5 text-xs font-black focus:outline-none transition-all text-slate-900 placeholder:text-slate-500 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
                    id="quick-debt-amount"
                  />
                </div>
              </div>

              {/* Debt Row 2 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="quick-debt-start-date" className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
                    <span>تاريخ الدين</span>
                    <Calendar className="w-3 h-3 text-sky-600" />
                  </label>
                  <input
                    type="date"
                    value={debtStartDate}
                    onChange={(e) => setDebtStartDate(e.target.value)}
                    className="w-full text-left bg-slate-50 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-xs font-black focus:outline-none transition-all text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
                    id="quick-debt-start-date"
                  />
                  <div className="text-[10px] text-sky-600 font-extrabold text-right mt-1" id="quick-debt-start-date-formatted-preview">
                    {debtStartDate ? formatDate(debtStartDate) : 'لم يتم اختيار تاريخ'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="quick-debt-due-date" className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
                    <span>تاريخ الاستحقاق (السداد)</span>
                    <Calendar className="w-3 h-3 text-rose-500" />
                  </label>
                  <input
                    type="date"
                    value={debtDueDate}
                    onChange={(e) => setDebtDueDate(e.target.value)}
                    className="w-full text-left bg-slate-50 border border-slate-300 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 rounded-xl px-3 py-2 text-xs font-black focus:outline-none transition-all border-rose-100 text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
                    id="quick-debt-due-date"
                  />
                  <div className="text-[10px] text-rose-600 font-extrabold text-right mt-1" id="quick-debt-due-date-formatted-preview">
                    {debtDueDate ? formatDate(debtDueDate) : 'لم يتم اختيار تاريخ'}
                  </div>
                </div>
              </div>

              {/* Debt Row 3 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="quick-debt-category" className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
                    <span>تصنيف الدين</span>
                    <Tag className="w-3 h-3 text-sky-600" />
                  </label>
                  <select
                    value={debtCategory}
                    onChange={(e) => setDebtCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs font-black transition-all text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
                    id="quick-debt-category"
                  >
                    {debtCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="quick-debt-project" className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
                    <span>المشروع المرتبط (اختياري)</span>
                    <Briefcase className="w-3 h-3 text-sky-600" />
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 focus:border-sky-500 focus:outline-none rounded-xl px-3 py-2.5 text-xs font-black transition-all text-slate-900 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
                    id="quick-debt-project"
                  >
                    <option value="">-- بدون مشروع مرتبط --</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>{proj.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Description Field (Common to both) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-slate-500 flex items-center gap-1 justify-end">
            <span>البيان / الوصف والتفاصيل</span>
            <FileText className="w-3 h-3 text-slate-400" />
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={activeForm === 'expense' ? "مثال: غداء عمل مع الفريق" : "مثال: سلفة مستردة لشراء معدات للمكتب"}
            className="w-full text-right bg-slate-50 border border-slate-300 focus:border-slate-400 focus:ring-1 focus:ring-slate-400 rounded-xl px-3 py-2.5 text-xs font-black focus:outline-none transition-all text-slate-900 placeholder:text-slate-500 dark:text-slate-100 dark:bg-slate-900 dark:border-slate-700"
            id="quick-entry-description"
          />
        </div>

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className={`w-full py-3.5 text-white rounded-xl text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ${
            activeForm === 'expense'
              ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/10 hover:shadow-emerald-600/20'
              : 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/10 hover:shadow-sky-600/20'
          }`}
          id="quick-entry-submit-btn"
        >
          <Plus className="w-4 h-4" />
          <span>{activeForm === 'expense' ? 'حفظ المصروف وتسجيله' : 'حفظ الدين وتسجيله'}</span>
        </motion.button>
      </form>
    </div>
  );
}
