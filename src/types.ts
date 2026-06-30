export type DebtType = 'to_me' | 'to_others'; // 'to_me' = ديون لي, 'to_others' = ديون علي

export interface PaymentInstallment {
  id: string;
  amount: number;
  date: string;
  notes: string;
}

export interface Debt {
  id: string;
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
  projectId?: string; // Linked Work Project if any
}

export interface Expense {
  id: string;
  amount: number;
  category: string; // طعام, فواتير, مواصلات, سكن, صحة, تسديد ديون, ترفيه, أخرى
  date: string;
  description: string;
  linkedDebtId?: string; // If this expense is a payment for a debt we owe
  note?: string;
  photo?: string; // base64 representation
  projectId?: string; // Linked Work Project if any
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

