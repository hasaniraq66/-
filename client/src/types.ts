export type DebtType = 'to_me' | 'to_others'; // 'to_me' = ديون لي, 'to_others' = ديون علي

export interface PaymentInstallment {
  id: string;
  amount: number;
  date: string;
  notes: string;
}

export interface Debt {
  id: string;
  referenceNumber?: string; // رقم مرجعي تلقائي مثل DBT-2026-0001
  type: DebtType;
  personName: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  startDate: string;
  category: string; // عائلي, تجاري, شخصي, عمل, أخرى
  description: string;
  status: 'unpaid' | 'partial' | 'paid';
  installments: PaymentInstallment[];
  note?: string;
  photo?: string; // base64 representation
  guarantor?: string; // اسم الكفيل أو الضامن
  projectId?: string; // Linked Work Project if any
}

export interface Expense {
  id: string;
  referenceNumber?: string; // رقم فاتورة تلقائي مثل INV-2026-0001
  amount: number;
  category: string; // طعام, فواتير, مواصلات, سكن, صحة, تسديد ديون, ترفيه, أخرى
  date: string;
  description: string;
  linkedDebtId?: string; // If this expense is a payment for a debt we owe
  note?: string;
  photo?: string; // base64 representation
  projectId?: string; // Linked Work Project if any
}

export interface ExpenseTemplate {
  id: string;
  title: string;
  amount: number;
  category: string;
  description?: string;
  note?: string;
}

export interface Budget {
  monthlyLimit: number;
  month: string; // Format: "YYYY-MM"
  categoryLimits?: { [category: string]: number }; // category limit mapping
}

export interface SystemAlert {
  id: string;
  type: 'overdue' | 'due_today' | 'due_soon' | 'paid_info';
  title: string;
  message: string;
  date: string;
  debtId: string;
  isRead: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientName: string;
  budget: number;
  debtCeiling: number; // سقف ديون المشروع
  startDate: string;
  endDate?: string;
  status: 'active' | 'completed' | 'on_hold';
}

export interface Employee {
  id: string;
  projectId: string; // Project reference
  name: string;
  role: string; // المسمى الوظيفي
  salaryAmount: number; // الراتب الأساسي
  hireDate: string;
}

export interface SalaryPayment {
  id: string;
  employeeId: string; // Employee reference
  projectId: string; // Project reference
  amount: number; // المبلغ المدفوع فعلياً
  month: string; // شهر الراتب (مثال: "2026-06")
  paymentDate: string; // تاريخ الصرف فعلياً
  notes: string;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  currency: string;
  initialCapital?: number; // رأس المال الابتدائي
  createdAt: string;
  adminId?: string; // If this profile belongs to a sub-user, this points to their admin's userId
  allowedTabs?: string[]; // Allowed navigation tabs for this sub-user
}

export interface SubUser {
  id: string; // The sub-user's UID
  displayName: string;
  email: string;
  allowedTabs: string[];
  createdAt: string;
}
