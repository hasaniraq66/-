import type { Debt, DebtType } from '../types';

export type NewDebtInput = Omit<Debt, 'id' | 'paidAmount' | 'status' | 'installments'>;

/**
 * ينشئ بند دين مستقل لكل عملية إضافة، حتى عند تطابق العميل ونوع الدين.
 * هذا يحافظ على كشف حساب قابل للتدقيق ويمنع إخفاء الحركات الجديدة داخل مبلغ سابق.
 */
export function createIndependentDebt(input: NewDebtInput, id: string): Debt {
  const numericAmount = Number(input.amount);
  return {
    ...input,
    id,
    personName: input.personName.trim(),
    amount: Number.isFinite(numericAmount) && numericAmount >= 0 ? numericAmount : 0,
    paidAmount: 0,
    status: 'unpaid',
    installments: [],
  };
}

/** يعيد كل بنود كشف الحساب العائدة للعميل نفسه، دون دمج أو إخفاء البنود الحديثة. */
export function getAccountStatementDebts(debts: Debt[], personName: string): Debt[] {
  const normalizedName = personName.trim().toLocaleLowerCase();
  return debts.filter(
    debt => !debt.projectId && debt.personName.trim().toLocaleLowerCase() === normalizedName,
  );
}

/**
 * يحسب المبلغ المتبقي لأي دين بدقة تمنع أي قيم سالبة أو شاذة
 */
export function calculateDebtRemaining(debt: Pick<Debt, 'amount' | 'paidAmount'>): number {
  const amount = Number(debt.amount) || 0;
  const paid = Number(debt.paidAmount) || 0;
  return Math.max(0, Math.round((amount - paid) * 100) / 100);
}

/**
 * يحدد حالة الدين المالية بدقة بناءً على الأصل والمدفوع
 */
export function calculateDebtStatus(amount: number, paidAmount: number): Debt['status'] {
  const safeAmount = Math.max(0, Number(amount) || 0);
  const safePaid = Math.max(0, Number(paidAmount) || 0);

  if (safeAmount > 0 && safePaid >= safeAmount) {
    return 'paid';
  }
  if (safePaid > 0) {
    return 'partial';
  }
  return 'unpaid';
}

/**
 * تطبيع وضبط سجل الدين لضمان الاتساق المحاسبي:
 * - منع القيم السالبة أو غير المحددة
 * - مزامنة إجمالي الأقساط مع المدفوع
 * - منع تجاوز المدفوع للأصل
 * - ضبط حالة الدين بدقة
 */
export function normalizeDebtRecord(debt: Debt): Debt {
  const safeAmount = Number.isFinite(Number(debt.amount)) ? Math.max(0, Number(debt.amount)) : 0;
  const rawPaid = Number.isFinite(Number(debt.paidAmount)) ? Math.max(0, Number(debt.paidAmount)) : 0;

  const validInstallments = Array.isArray(debt.installments)
    ? debt.installments.map((inst) => ({
        ...inst,
        amount: Number.isFinite(Number(inst.amount)) ? Math.max(0, Number(inst.amount)) : 0,
      }))
    : [];

  const installmentsTotal = validInstallments.reduce((sum, inst) => sum + inst.amount, 0);

  // المدفوع هو إما المسجل أو مجموع الأقساط المسجلة فعلياً أيهما أكبر
  let safePaid = Math.max(rawPaid, installmentsTotal);

  // لا يجوز أن يتجاوز المدفوع أصل الدين إذا كان الأصل موجباً
  if (safeAmount > 0 && safePaid > safeAmount) {
    safePaid = safeAmount;
  }

  const safeStatus = calculateDebtStatus(safeAmount, safePaid);

  return {
    ...debt,
    amount: safeAmount,
    paidAmount: safePaid,
    status: safeStatus,
    installments: validInstallments,
  };
}

/**
 * حساب إجمالي الديون المستحقة والمسددة والمتبقية بدقة
 */
export function calculateDebtsSummary(debts: Debt[]) {
  let toMeTotal = 0;
  let toMePaid = 0;
  let toOthersTotal = 0;
  let toOthersPaid = 0;

  debts.forEach((debt) => {
    if (debt.projectId) return; // استبعاد ديون المشاريع المعزولة

    const safeDebt = normalizeDebtRecord(debt);
    if (safeDebt.type === 'to_me') {
      toMeTotal += safeDebt.amount;
      toMePaid += safeDebt.paidAmount;
    } else {
      toOthersTotal += safeDebt.amount;
      toOthersPaid += safeDebt.paidAmount;
    }
  });

  return {
    toMeTotal,
    toMePaid,
    toMeRemaining: Math.max(0, toMeTotal - toMePaid),
    toOthersTotal,
    toOthersPaid,
    toOthersRemaining: Math.max(0, toOthersTotal - toOthersPaid),
  };
}
