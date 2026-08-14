import type { Debt } from '../types';

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
