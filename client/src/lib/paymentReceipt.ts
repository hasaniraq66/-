import type { Debt } from '../types';
import { formatCurrency, formatDate } from '../utils';

/**
 * إشعار تسديد يُرسَل عبر واتساب فور تسجيل دفعة.
 *
 * معزول عن الواجهة لأن فيه قرارين يسهل الخطأ فيهما ويصعب ملاحظته:
 *
 * ١) اتجاه الدين يقلب صياغة الرسالة رأساً على عقب. في دين «لي» يكون الطرف
 *    الآخر هو الدافع فأنا أُقرّ باستلام المبلغ؛ وفي دين «عليّ» أكون أنا
 *    الدافع فأنا أُشعر باستلامهم. رسالةٌ بالاتجاه المعكوس تقول للدائن إنك
 *    استلمت منه مالاً وأنت الذي دفعته.
 *
 * ٢) الرصيد بعد الدفعة يُحسب من الدفعة نفسها لا من حالة الدين. فحالة الدين
 *    في الواجهة لحظة بناء الرسالة لم تُحدَّث بعد بالدفعة الجارية، فقراءتها
 *    تعطي رصيداً أعلى من الحقيقي — أي رسالة تطالب بمال سُدِّد فعلاً.
 */

export interface PaymentReceipt {
  /** نص الرسالة كاملاً، جاهزاً للإرسال أو للنسخ. */
  message: string;
  /** رابط واتساب. يفتح المحادثة إن توفّر الهاتف، وإلا فقائمة الاختيار. */
  whatsappUrl: string;
  /** هل سُدِّد الدين بالكامل بهذه الدفعة؟ */
  isSettled: boolean;
  /** المتبقي بعد الدفعة. */
  remainingAfter: number;
}

export interface PaymentReceiptInput {
  debt: Debt;
  amount: number;
  date: string;
  notes?: string;
  currency: string;
}

/** الرصيد بعد إضافة الدفعة، مقصوصاً عند الصفر فلا يظهر متبقٍّ سالب. */
export function remainingAfterPayment(debt: Debt, amount: number): number {
  return Math.max(debt.amount - (debt.paidAmount + amount), 0);
}

export function buildPaymentReceipt({
  debt, amount, date, notes, currency,
}: PaymentReceiptInput): PaymentReceipt {
  const remainingAfter = remainingAfterPayment(debt, amount);
  const isSettled = remainingAfter === 0;
  const paidTotal = Math.min(debt.paidAmount + amount, debt.amount);

  // في دين «لي» الطرف الآخر هو الدافع، وفي دين «عليّ» أنا الدافع.
  const theyPaidMe = debt.type === 'to_me';

  const lines: string[] = [];
  lines.push(theyPaidMe ? '🧾 *إشعار استلام دفعة*' : '🧾 *إشعار تسديد دفعة*');
  lines.push('');
  lines.push(`مرحباً ${debt.personName}،`);
  lines.push(
    theyPaidMe
      ? `نشكر لك سداد دفعة بمبلغ *${formatCurrency(amount, currency)}* بتاريخ ${formatDate(date)}.`
      : `تم تسديد دفعة لكم بمبلغ *${formatCurrency(amount, currency)}* بتاريخ ${formatDate(date)}.`,
  );
  lines.push('');

  if (debt.referenceNumber) lines.push(`🔖 المرجع: ${debt.referenceNumber}`);
  if (debt.description) lines.push(`📌 البيان: ${debt.description}`);

  lines.push(`💵 أصل المبلغ: ${formatCurrency(debt.amount, currency)}`);
  lines.push(`✅ المسدَّد حتى الآن: ${formatCurrency(paidTotal, currency)}`);

  if (isSettled) {
    lines.push('');
    lines.push('🎉 *تم سداد كامل المبلغ. الحساب مُغلق ولا توجد مستحقات.*');
  } else {
    lines.push(`⏳ المتبقي: *${formatCurrency(remainingAfter, currency)}*`);
    if (debt.dueDate) lines.push(`📅 تاريخ الاستحقاق: ${formatDate(debt.dueDate)}`);
  }

  if (notes && notes.trim()) {
    lines.push('');
    lines.push(`📝 ملاحظة: ${notes.trim()}`);
  }

  const message = lines.join('\n');
  return {
    message,
    whatsappUrl: `https://wa.me/?text=${encodeURIComponent(message)}`,
    isSettled,
    remainingAfter,
  };
}
