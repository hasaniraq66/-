import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Check, 
  User, 
  Calendar, 
  DollarSign, 
  FileText, 
  MessageSquare, 
  History, 
  X, 
  ChevronDown, 
  ChevronUp, 
  PiggyBank, 
  ShieldAlert,
  CreditCard
} from 'lucide-react';
import { Debt, DebtType, PaymentInstallment, Expense } from '../types';
import { formatCurrency, formatDate, getLocalDateString, generateWhatsAppLink } from '../utils';
import AttachmentSelector from './AttachmentSelector';

interface DebtsManagerProps {
  debts: Debt[];
  currency: string;
  onAddDebt: (debt: Omit<Debt, 'id' | 'paidAmount' | 'status' | 'installments'>) => void;
  onEditDebt: (debt: Debt) => void;
  onDeleteDebt: (id: string) => void;
  onAddInstallment: (debtId: string, amount: number, date: string, notes: string, linkToBudget: boolean) => void;
  onDeleteInstallment: (debtId: string, installmentId: string) => void;
}

export default function DebtsManager({
  debts,
  currency,
  onAddDebt,
  onEditDebt,
  onDeleteDebt,
  onAddInstallment,
  onDeleteInstallment,
}: DebtsManagerProps) {
  // Tabs & Filters State
  const [activeTab, setActiveTab] = useState<'all' | 'to_me' | 'to_others'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modal forms State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Form Field State
  const [personName, setPersonName] = useState('');
  const [type, setType] = useState<DebtType>('to_me');
  const [amount, setAmount] = useState<number | ''>('');
  const [dueDate, setDueDate] = useState('');
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [category, setCategory] = useState('شخصي');
  const [description, setDescription] = useState('');

  // Selected item for Edit/Payment
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);

  // Attachment states for the modals
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // Payment installment fields
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentDate, setPaymentDate] = useState(getLocalDateString());
  const [paymentNotes, setPaymentNotes] = useState('');
  const [linkToBudget, setLinkToBudget] = useState(true);

  // Expand installment logs
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const categories = ['شخصي', 'عائلي', 'عمل', 'تجاري', 'سلفة', 'أخرى'];

  // Handle open add modal
  const openAddModal = () => {
    setPersonName('');
    setType('to_me');
    setAmount('');
    setDueDate('');
    setStartDate(getLocalDateString());
    setCategory('شخصي');
    setDescription('');
    setNote('');
    setPhoto('');
    setIsAddModalOpen(true);
  };

  // Handle open edit modal
  const openEditModal = (debt: Debt) => {
    setSelectedDebt(debt);
    setPersonName(debt.personName);
    setType(debt.type);
    setAmount(debt.amount);
    setDueDate(debt.dueDate);
    setStartDate(debt.startDate);
    setCategory(debt.category);
    setDescription(debt.description);
    setNote(debt.note || '');
    setPhoto(debt.photo || '');
    setIsEditModalOpen(true);
  };

  // Handle open payment modal
  const openPaymentModal = (debt: Debt) => {
    setSelectedDebt(debt);
    setPaymentAmount('');
    setPaymentDate(getLocalDateString());
    setPaymentNotes('');
    setLinkToBudget(debt.type === 'to_others'); // default to true only if it's our debt (to others)
    setIsPaymentModalOpen(true);
  };

  // Submit Add
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !amount || !dueDate) return;
    onAddDebt({
      personName,
      type,
      amount: Number(amount),
      dueDate,
      startDate,
      category,
      description,
      note,
      photo,
    });
    setIsAddModalOpen(false);
  };

  // Submit Edit
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !personName || !amount || !dueDate) return;
    onEditDebt({
      ...selectedDebt,
      personName,
      type,
      amount: Number(amount),
      dueDate,
      startDate,
      category,
      description,
      note,
      photo,
    });
    setIsEditModalOpen(false);
  };

  // Submit Payment/Installment
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt || !paymentAmount) return;
    
    onAddInstallment(
      selectedDebt.id, 
      Number(paymentAmount), 
      paymentDate, 
      paymentNotes, 
      selectedDebt.type === 'to_others' ? linkToBudget : false
    );
    setIsPaymentModalOpen(false);
  };

  // Toggle expand installments logs
  const toggleExpanded = (id: string) => {
    setExpandedDebtId(expandedDebtId === id ? null : id);
  };

  // Filter out project-specific debts to keep them outside of general debts
  const nonProjectDebts = useMemo(() => {
    return debts.filter((d) => !d.projectId);
  }, [debts]);

  // Filter debts
  const filteredDebts = useMemo(() => {
    return nonProjectDebts.filter((d) => {
      // 1. Tab filter
      if (activeTab === 'to_me' && d.type !== 'to_me') return false;
      if (activeTab === 'to_others' && d.type !== 'to_others') return false;

      // 2. Search filter (by person name or notes)
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesName = d.personName.toLowerCase().includes(term);
        const matchesDesc = d.description.toLowerCase().includes(term);
        if (!matchesName && !matchesDesc) return false;
      }

      // 3. Status filter
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;

      // 4. Category filter
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;

      return true;
    });
  }, [nonProjectDebts, activeTab, searchTerm, statusFilter, categoryFilter]);

  return (
    <div className="space-y-6" id="debts-viewport">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-100" id="debts-header">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800">إدارة الديون والتسديدات 💳</h1>
          <p className="text-xs text-slate-400">سجل الديون والالتزامات المستحقة لك والواجبة عليك وقسمها إلى دفعات</p>
        </div>
        <button
          id="add-debt-main-btn"
          onClick={openAddModal}
          className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-white text-sm font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة دين جديد</span>
        </button>
      </div>

      {/* Tabs and Filters Control */}
      <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-100 space-y-4" id="debts-filters-panel">
        {/* Row 1: Primary Tabs */}
        <div className="flex border-b border-slate-100 pb-2" id="debts-type-tabs">
          <button
            id="tab-all-debts"
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-bold transition-all relative ${
              activeTab === 'all' 
                ? 'text-sky-600 border-b-2 border-sky-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            جميع الديون ({nonProjectDebts.length})
          </button>
          <button
            id="tab-to-me-debts"
            onClick={() => setActiveTab('to_me')}
            className={`px-4 py-2 text-sm font-bold transition-all relative ${
              activeTab === 'to_me' 
                ? 'text-sky-600 border-b-2 border-sky-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            ديون لي (مستحقات عند الآخرين) ({nonProjectDebts.filter(d => d.type === 'to_me').length})
          </button>
          <button
            id="tab-to-others-debts"
            onClick={() => setActiveTab('to_others')}
            className={`px-4 py-2 text-sm font-bold transition-all relative ${
              activeTab === 'to_others' 
                ? 'text-sky-600 border-b-2 border-sky-600' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            ديون علي (التزامات للآخرين) ({nonProjectDebts.filter(d => d.type === 'to_others').length})
          </button>
        </div>

        {/* Row 2: Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" id="debts-sub-filters">
          {/* Search bar */}
          <div className="relative" id="filter-search-container">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              id="debt-search-input"
              type="text"
              placeholder="ابحث بالاسم أو التفاصيل..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Status Select */}
          <div className="flex items-center gap-2" id="filter-status-container">
            <span className="text-xs text-slate-400 shrink-0">الحالة:</span>
            <select
              id="debt-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
            >
              <option value="all">الكل</option>
              <option value="unpaid">غير مسددة</option>
              <option value="partial">مسددة جزئياً</option>
              <option value="paid">مسددة بالكامل</option>
            </select>
          </div>

          {/* Category Select */}
          <div className="flex items-center gap-2" id="filter-category-container">
            <span className="text-xs text-slate-400 shrink-0">الفئة:</span>
            <select
              id="debt-category-select"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white"
            >
              <option value="all">الكل</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Debts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="debts-list-grid">
        {filteredDebts.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-2xl text-center border border-slate-100 text-slate-400" id="empty-debts-list">
            <FileText className="w-12 h-12 mx-auto text-slate-200 mb-3" />
            <h3 className="font-bold text-slate-700 mb-1">لا توجد ديون مطابقة للخيارات</h3>
            <p className="text-xs max-w-sm mx-auto">ابدأ بإضافة دين جديد عبر زر "إضافة دين جديد" أو عدل فلاتر البحث الحالية.</p>
          </div>
        ) : (
          filteredDebts.map((debt) => {
            const remaining = debt.amount - debt.paidAmount;
            const percentage = Math.min(Math.round((debt.paidAmount / debt.amount) * 100), 100);

            return (
              <div 
                key={debt.id} 
                id={`debt-card-${debt.id}`}
                className={`bg-white rounded-2xl border p-5 shadow-2xs space-y-4 flex flex-col justify-between transition-all ${
                  debt.status === 'paid' 
                    ? 'border-emerald-100 bg-emerald-50/5' 
                    : debt.type === 'to_me' 
                    ? 'border-sky-100 hover:border-sky-200' 
                    : 'border-rose-100 hover:border-rose-200'
                }`}
              >
                {/* Header section of card */}
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        debt.type === 'to_me' ? 'bg-sky-50 text-sky-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{debt.personName}</h3>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          {debt.category}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div id={`debt-status-badge-${debt.id}`}>
                      {debt.status === 'paid' ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>مسدد</span>
                        </span>
                      ) : debt.status === 'partial' ? (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                          جزئي ({percentage}%)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold">
                          غير مسدد
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Financial Breakdown */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50/80 p-3 rounded-xl text-center" id="financial-breakdown">
                    <div>
                      <span className="block text-[10px] text-slate-400">الإجمالي</span>
                      <span className="text-xs font-bold text-slate-700">{formatCurrency(debt.amount, currency)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">المدفوع</span>
                      <span className="text-xs font-bold text-emerald-600">{formatCurrency(debt.paidAmount, currency)}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400">المتبقي</span>
                      <span className={`text-xs font-bold ${remaining > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                        {formatCurrency(remaining, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>نسبة السداد</span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${debt.status === 'paid' ? 'bg-emerald-500' : 'bg-sky-500'}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Dates & Notes */}
                  <div className="space-y-1.5 text-xs text-slate-500 pt-1 border-t border-slate-50">
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>تاريخ البدء:</span>
                      </span>
                      <span className="font-medium text-slate-600">{formatDate(debt.startDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>تاريخ الاستحقاق:</span>
                      </span>
                      <span className="font-bold text-slate-700">{formatDate(debt.dueDate)}</span>
                    </div>
                    {debt.description && (
                      <div className="pt-1.5 text-slate-400 italic text-[11px] leading-relaxed border-t border-slate-100">
                        "{debt.description}"
                      </div>
                    )}
                    {(debt.note || debt.photo) && (
                      <div className="pt-2 mt-2 border-t border-slate-150/80 space-y-2">
                        <span className="text-[10px] text-slate-400 font-bold block">📎 المرفقات التوثيقية:</span>
                        {debt.note && (
                          <p className="text-[11px] text-slate-600 bg-slate-50/50 p-2 rounded-lg border border-slate-100 leading-relaxed">
                            {debt.note}
                          </p>
                        )}
                        {debt.photo && (
                          <div className="relative group max-w-[120px] rounded-lg overflow-hidden border border-slate-200 shadow-3xs cursor-zoom-in" onClick={() => setSelectedPhoto(debt.photo!)}>
                            <img
                              src={debt.photo}
                              alt="Captured attachment"
                              referrerPolicy="no-referrer"
                              className="w-full h-auto aspect-square object-cover hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
                              تكبير المعاينة 🔍
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions / Bottom controls */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  {/* Action row 1: Primary features */}
                  <div className="flex flex-wrap gap-2">
                    {debt.status !== 'paid' && (
                      <button
                        id={`btn-record-payment-${debt.id}`}
                        onClick={() => openPaymentModal(debt)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>تسجيل دفعة</span>
                      </button>
                    )}
                    
                    <button
                      id={`btn-expand-history-${debt.id}`}
                      onClick={() => toggleExpanded(debt.id)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>الدفعات ({debt.installments.length})</span>
                      {expandedDebtId === debt.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <a
                      id={`btn-whatsapp-remind-${debt.id}`}
                      href={generateWhatsAppLink(debt, currency)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-green-500 hover:bg-green-400 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>واتساب</span>
                    </a>
                  </div>

                  {/* Installment History Sub-view */}
                  {expandedDebtId === debt.id && (
                    <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-100" id={`installment-history-${debt.id}`}>
                      <h4 className="text-xs font-bold text-slate-700 pb-1 border-b border-slate-200 flex justify-between">
                        <span>سجل المبالغ المسددة:</span>
                        <span className="text-[10px] text-slate-400">عدد الدفعات: {debt.installments.length}</span>
                      </h4>
                      {debt.installments.length === 0 ? (
                        <p className="text-[11px] text-slate-400 py-2 text-center">لا توجد أي دفعات جزئية مسجلة بعد.</p>
                      ) : (
                        <div className="divide-y divide-slate-200 max-h-36 overflow-y-auto">
                          {debt.installments.map((inst) => (
                            <div key={inst.id} className="py-2 flex justify-between items-center text-xs gap-2" id={`installment-${inst.id}`}>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-700">{formatCurrency(inst.amount, currency)}</p>
                                <p className="text-[10px] text-slate-400">{formatDate(inst.date)} {inst.notes && `- ${inst.notes}`}</p>
                              </div>
                              <button
                                id={`btn-delete-inst-${inst.id}`}
                                onClick={() => onDeleteInstallment(debt.id, inst.id)}
                                className="p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-slate-100 transition-colors"
                                title="حذف هذه الدفعة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action row 2: Management */}
                  <div className="flex justify-end gap-2 pt-1 border-t border-dashed border-slate-100">
                    <button
                      id={`btn-edit-debt-${debt.id}`}
                      onClick={() => openEditModal(debt)}
                      className="p-1.5 text-slate-500 hover:text-sky-600 rounded-lg hover:bg-slate-50 transition-colors"
                      title="تعديل تفاصيل الدين"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      id={`btn-delete-debt-${debt.id}`}
                      onClick={() => {
                        setConfirmModal({
                          title: 'تأكيد حذف الدين',
                          message: `هل أنت متأكد من رغبتك في حذف الدين المسجل باسم "${debt.personName}"؟`,
                          onConfirm: () => onDeleteDebt(debt.id)
                        });
                      }}
                      className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors"
                      title="حذف الدين"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Debt Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="add-debt-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-100 flex flex-col justify-between">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">إضافة سجل دين جديد ✍️</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs" id="add-debt-form">
              {/* Type Switcher */}
              <div className="space-y-1.5">
                <span className="block text-slate-500 font-semibold">نوع الدين</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setType('to_me')}
                    className={`py-2 rounded-lg font-bold text-center transition-all ${
                      type === 'to_me' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    دين لي (أطلبه من الآخرين)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('to_others')}
                    className={`py-2 rounded-lg font-bold text-center transition-all ${
                      type === 'to_others' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    دين علي (يطلبه الآخرون مني)
                  </button>
                </div>
              </div>

              {/* Person name */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">اسم الشخص / الجهة</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد العبدالله، شركة الكهرباء..."
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              {/* Amount and Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold">قيمة الدين ({currency})</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold">التصنيف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold">تاريخ التسجيل</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 dark:text-slate-100"
                  />
                  <div className="text-[10px] text-sky-600 font-extrabold text-right mt-1" id="add-debt-start-date-formatted-preview">
                    {startDate ? formatDate(startDate) : 'لم يتم اختيار تاريخ'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold">تاريخ الاستحقاق للسداد</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 dark:text-slate-100"
                  />
                  <div className="text-[10px] text-rose-600 font-extrabold text-right mt-1" id="add-debt-due-date-formatted-preview">
                    {dueDate ? formatDate(dueDate) : 'لم يتم اختيار تاريخ'}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">ملاحظات / تفاصيل الدين</label>
                <textarea
                  placeholder="مثال: سلفة لمصاريف السفر، ثمن شراء جهاز لابتوب..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 leading-relaxed"
                />
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
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  حفظ الدين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Debt Modal */}
      {isEditModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="edit-debt-modal">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-slate-100 flex flex-col justify-between">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-base font-bold text-slate-800">تعديل بيانات الدين ✏️</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs" id="edit-debt-form">
              {/* Type Switcher */}
              <div className="space-y-1.5">
                <span className="block text-slate-500 font-semibold">نوع الدين</span>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setType('to_me')}
                    className={`py-2 rounded-lg font-bold text-center transition-all ${
                      type === 'to_me' ? 'bg-white text-sky-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    دين لي (مستحق)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('to_others')}
                    className={`py-2 rounded-lg font-bold text-center transition-all ${
                      type === 'to_others' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    دين علي (التزام)
                  </button>
                </div>
              </div>

              {/* Person name */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">اسم الشخص / الجهة</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-semibold"
                  />
                </div>
              </div>

              {/* Amount and Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold">قيمة الدين الإجمالية ({currency})</label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold">التصنيف</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold">تاريخ التسجيل</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 dark:text-slate-100"
                  />
                  <div className="text-[10px] text-sky-600 font-extrabold text-right mt-1" id="edit-debt-start-date-formatted-preview">
                    {startDate ? formatDate(startDate) : 'لم يتم اختيار تاريخ'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-slate-500 font-semibold">تاريخ الاستحقاق</label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 dark:text-slate-100"
                  />
                  <div className="text-[10px] text-rose-600 font-extrabold text-right mt-1" id="edit-debt-due-date-formatted-preview">
                    {dueDate ? formatDate(dueDate) : 'لم يتم اختيار تاريخ'}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">ملاحظات</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 leading-relaxed"
                />
              </div>

              {/* Note & Photo Capture */}
              <AttachmentSelector
                note={note}
                onChangeNote={setNote}
                photo={photo}
                onChangePhoto={setPhoto}
              />

              {/* Alert message if changed */}
              <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl flex gap-2 text-amber-800">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-normal">
                  تنبيه: تعديل قيمة الدين الكلية سيؤثر على حساب المبالغ المتبقية ونسبة السداد المسجلة للدفعات السابقة.
                </p>
              </div>

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
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment/Installment Modal */}
      {isPaymentModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="payment-modal">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-base font-bold text-slate-800">تسجيل دفعة سداد جديدة 💸</h2>
                <p className="text-[11px] text-slate-400">لصالح: {selectedDebt.personName}</p>
              </div>
              <button onClick={() => setIsPaymentModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4 text-xs" id="payment-form">
              {/* Quick stats */}
              <div className="p-3 bg-slate-50 rounded-xl flex justify-between text-center border border-slate-100">
                <div>
                  <span className="block text-[10px] text-slate-400">إجمالي الدين</span>
                  <span className="font-bold text-slate-700">{formatCurrency(selectedDebt.amount, currency)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">المدفوع سابقاً</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(selectedDebt.paidAmount, currency)}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400">الحد الأقصى للمتبقي</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency(selectedDebt.amount - selectedDebt.paidAmount, currency)}
                  </span>
                </div>
              </div>

              {/* Installment Amount */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">قيمة الدفعة الحالية ({currency})</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="any"
                    max={selectedDebt.amount - selectedDebt.paidAmount}
                    placeholder="أدخل قيمة الدفعة الحالية..."
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 font-bold"
                  />
                </div>
              </div>

              {/* Installment Date */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">تاريخ السداد</label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800 dark:text-slate-100"
                />
                <div className="text-[10px] text-emerald-600 font-extrabold text-right mt-1" id="installment-date-formatted-preview">
                  {paymentDate ? formatDate(paymentDate) : 'لم يتم اختيار تاريخ'}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="block text-slate-500 font-semibold">ملاحظات الدفعة (اختياري)</label>
                <input
                  type="text"
                  placeholder="مثال: الدفعة الأولى، قسط شهر 6..."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 focus:bg-white text-slate-800"
                />
              </div>

              {/* Integrated Budget feature */}
              {selectedDebt.type === 'to_others' && (
                <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl space-y-2" id="integrated-budget-checkbox-wrapper">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={linkToBudget}
                      onChange={(e) => setLinkToBudget(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4 shrink-0"
                    />
                    <div>
                      <span className="block font-bold text-emerald-800 text-xs">خصم الدفعة من الميزانية الشهرية؟</span>
                      <span className="block text-[10px] text-emerald-600/90 leading-relaxed">
                        عند التفعيل، سيتم تلقائياً تسجيل هذا المبلغ كمصروف ضمن الميزانية الحالية تحت فئة "تسديد ديون"، لضمان تطابق حسابات الميزانية.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer"
                >
                  تسجيل الدفعة
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
      {/* Custom Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-xl overflow-hidden border border-slate-100 text-right">
            <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
              <button 
                onClick={() => setConfirmModal(null)}
                className="text-slate-400 hover:text-white font-extrabold text-sm"
              >
                ✕
              </button>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>{confirmModal.title}</span>
              </h3>
            </div>
            <div className="p-6 space-y-4 text-slate-700 font-bold text-xs">
              <p className="leading-relaxed">{confirmModal.message}</p>
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-50 text-white rounded-xl transition-all cursor-pointer"
                >
                  تأكيد الحذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
