import { Budget, Debt, Expense } from '../types';

export type FinancialFocusTone = 'danger' | 'warning' | 'info' | 'success';

export interface FinancialFocusItem {
  id: string;
  tone: FinancialFocusTone;
  title: string;
  description: string;
  amount?: number;
  targetTab?: 'debts' | 'budget';
  actionLabel?: string;
}

interface FinancialFocusInput {
  debts: Debt[];
  expenses: Expense[];
  budget: Budget | null;
  now?: Date;
}

function toDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getRemaining(debt: Debt): number {
  return Math.max(debt.amount - debt.paidAmount, 0);
}

/** يبني قائمة متابعة يومية من البيانات الحالية فقط، بلا أي توقعات أو قرارات مالية تلقائية. */
export function getFinancialFocusItems({ debts, expenses, budget, now = new Date() }: FinancialFocusInput): FinancialFocusItem[] {
  const today = startOfDay(now);
  const activeDebts = debts.filter((debt) => debt.status !== 'paid' && getRemaining(debt) > 0);
  const items: FinancialFocusItem[] = [];

  const overdueDebts = activeDebts.filter((debt) => {
    const dueDate = debt.dueDate ? toDateOnly(debt.dueDate) : null;
    return dueDate !== null && dueDate < today;
  });
  const overdueAmount = overdueDebts.reduce((sum, debt) => sum + getRemaining(debt), 0);
  if (overdueDebts.length > 0) {
    items.push({
      id: 'overdue',
      tone: 'danger',
      title: `${overdueDebts.length} ${overdueDebts.length === 1 ? 'سجل متأخر' : 'سجلات متأخرة'}`,
      description: 'تحتاج إلى متابعة السداد أو التحصيل اليوم.',
      amount: overdueAmount,
      targetTab: 'debts',
      actionLabel: 'مراجعة الديون',
    });
  }

  const upcomingDebts = activeDebts.filter((debt) => {
    const dueDate = debt.dueDate ? toDateOnly(debt.dueDate) : null;
    if (!dueDate) return false;
    const dayDiff = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000);
    return dayDiff >= 0 && dayDiff <= 7;
  });
  const upcomingAmount = upcomingDebts.reduce((sum, debt) => sum + getRemaining(debt), 0);
  if (upcomingDebts.length > 0) {
    items.push({
      id: 'upcoming',
      tone: 'warning',
      title: `${upcomingDebts.length} ${upcomingDebts.length === 1 ? 'استحقاق خلال 7 أيام' : 'استحقاقات خلال 7 أيام'}`,
      description: 'راجع تواريخ الاستحقاق وجهّز المتابعة المناسبة.',
      amount: upcomingAmount,
      targetTab: 'debts',
      actionLabel: 'عرض الاستحقاقات',
    });
  }

  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthlyExpenses = expenses
    .filter((expense) => expense.date.startsWith(currentMonth))
    .reduce((sum, expense) => sum + expense.amount, 0);

  if (!budget || budget.monthlyLimit <= 0) {
    items.push({
      id: 'budget-not-set',
      tone: 'info',
      title: 'لم يُحدد حد للميزانية هذا الشهر',
      description: 'إضافة حد شهري تجعل مراقبة الإنفاق أكثر وضوحاً.',
      targetTab: 'budget',
      actionLabel: 'ضبط الميزانية',
    });
  } else {
    const percentage = Math.round((monthlyExpenses / budget.monthlyLimit) * 100);
    if (percentage >= 100) {
      items.push({
        id: 'budget-exceeded',
        tone: 'danger',
        title: 'تم تجاوز حد الميزانية الشهري',
        description: `استهلكت ${percentage}% من الحد المحدد لهذا الشهر.`,
        amount: monthlyExpenses - budget.monthlyLimit,
        targetTab: 'budget',
        actionLabel: 'مراجعة المصروفات',
      });
    } else if (percentage >= 80) {
      items.push({
        id: 'budget-near-limit',
        tone: 'warning',
        title: 'الميزانية تقترب من حدها',
        description: `استهلكت ${percentage}% من الحد المحدد لهذا الشهر.`,
        amount: monthlyExpenses,
        targetTab: 'budget',
        actionLabel: 'متابعة الإنفاق',
      });
    }
  }

  const receivables = activeDebts
    .filter((debt) => debt.type === 'to_me')
    .reduce((sum, debt) => sum + getRemaining(debt), 0);
  if (receivables > 0 && items.length < 3) {
    items.push({
      id: 'receivables',
      tone: 'info',
      title: 'لديك مبالغ قابلة للتحصيل',
      description: 'راجع الحسابات المفتوحة وسجل الدفعات عند استلامها.',
      amount: receivables,
      targetTab: 'debts',
      actionLabel: 'فتح كشوف الحساب',
    });
  }

  if (items.length === 0) {
    items.push({
      id: 'stable',
      tone: 'success',
      title: 'لا توجد متابعة عاجلة حالياً',
      description: 'تابع تسجيل الحركات أولاً بأول للحفاظ على دقة هذا الملخص.',
    });
  }

  return items.slice(0, 3);
}
