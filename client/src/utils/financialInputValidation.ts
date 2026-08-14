/** قواعد تحقق بسيطة للأرقام المالية قبل بدء عملية الحفظ في الواجهة. */
export function isPositiveFinancialAmount(value: number | ''): boolean {
  return value !== '' && Number.isFinite(Number(value)) && Number(value) > 0;
}

/** يسمح بالحد الصفري للميزانية لأنه يمثل شهراً بلا حد محدد، ولا يسمح بالقيم السالبة أو الفارغة. */
export function isValidBudgetLimit(value: number | ''): boolean {
  return value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0;
}

/** يمنع تسجيل دفعة تتجاوز الرصيد الحقيقي المتبقي. */
export function isPaymentWithinRemainingBalance(value: number | '', remainingBalance: number): boolean {
  return isPositiveFinancialAmount(value) && Number(value) <= Math.max(remainingBalance, 0);
}
