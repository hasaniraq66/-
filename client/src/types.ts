export type DebtType = 'to_me' | 'to_others'; // 'to_me' = ديون لي, 'to_others' = ديون علي

export interface PaymentInstallment {
  id: string;
  amount: number;
  date: string;
  notes: string;
}

export interface DebtSettlementInvoice {
  id: string;
  amount: number;
  date: string;
  referenceNumber?: string;
  notes?: string;
}

export type AttachmentReviewStatus = 'pending_review' | 'reviewed';

export interface AttachmentReviewActor {
  uid: string;
  displayName: string;
  email?: string;
}

export type AttachmentReviewAuditAction = 'status_changed' | 'note_updated';

export interface AttachmentReviewAuditEntry {
  id: string;
  action: AttachmentReviewAuditAction;
  occurredAt: string;
  reviewer: AttachmentReviewActor;
  previousStatus?: AttachmentReviewStatus;
  nextStatus?: AttachmentReviewStatus;
}

export interface FinancialAttachment {
  id: string;
  name: string;
  url: string;
  storageKey?: string;
  /**
   * مفتاح تنزيل كائن Firebase Storage. هو مفتاح حامل دائم يتجاوز قواعد التخزين:
   * من يملكه يفتح الملف بلا مصادقة. لذلك يُجرَّد من أي نسخة احتياطية تغادر
   * التطبيق (راجع sanitizeAttachmentsForExport).
   */
  storageDownloadToken?: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  size: number;
  uploadedAt: string;
  reviewStatus?: AttachmentReviewStatus;
  internalNote?: string;
  reviewUpdatedAt?: string;
  reviewAuditLog?: AttachmentReviewAuditEntry[];
}

export interface Debt {
  id: string;
  referenceNumber?: string; // رقم مرجعي تلقائي مثل DBT-2026-0001
  type: DebtType;
  personName: string;
  amount: number;
  paidAmount: number;
  dueDate?: string;
  startDate: string;
  category: string; // عائلي, تجاري, شخصي, عمل, أخرى
  description: string;
  status: 'unpaid' | 'partial' | 'paid';
  installments: PaymentInstallment[];
  settlementInvoices?: DebtSettlementInvoice[];
  note?: string;
  photo?: string; // base64 representation
  attachments?: FinancialAttachment[];
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
  attachments?: FinancialAttachment[];
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

/** تصنيفات الدخل الداخلة. الراتب والاستلام اليومي هما الحالتان الأشيع. */
export type IncomeCategory = 'salary' | 'daily' | 'sale' | 'rent' | 'gift' | 'other';

/**
 * دفعة دخل مستلَمة فعلاً. لا تُسجَّل إلا بعد الاستلام، فما لم يُستلم بعد ليس
 * دخلاً بل توقُّعاً — وخلط الاثنين يعطي رصيداً كاذباً.
 */
export interface Income {
  id: string;
  userId?: string;
  amount: number;
  category: IncomeCategory;
  date: string; // YYYY-MM-DD
  description: string;
  note?: string;
  /** مصدر متكرر وُلِّدت منه هذه الدفعة، إن وُجد. */
  sourceId?: string;
  projectId?: string;
}

/** دورية المصدر: شهري للراتب، يومي للاستلام اليومي. */
export type IncomeCadence = 'monthly' | 'daily';

/**
 * مصدر دخل متكرر: الراتب الشهري، أو حصيلة اليوم. يختصر الإدخال إلى ضغطة
 * واحدة بدل ملء نموذج كامل كل مرة، وهو جوهر الميزة لا زينة فيها: دخلٌ يحتاج
 * دقيقة لتسجيله لا يُسجَّل.
 */
export interface IncomeSource {
  id: string;
  userId?: string;
  title: string; // "راتب الوظيفة"، "مبيعات المحل"
  amount: number; // المبلغ المعتاد، قابل للتعديل عند كل استلام
  category: IncomeCategory;
  cadence: IncomeCadence;
  /** يوم الاستحقاق في الشهر (1..28) للمصادر الشهرية. */
  dayOfMonth?: number;
  note?: string;
  isActive: boolean;
  /** تاريخ آخر استلام مسجَّل، لمعرفة ما إذا كانت دفعة هذه الدورة قد سُجِّلت. */
  lastCollectedDate?: string;
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
