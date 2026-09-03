import type { Income, IncomeCategory, IncomeSource } from '../types';

/**
 * منطق دورات مصادر الدخل، معزولاً عن الواجهة لأنه موضع الأخطاء الحقيقي:
 * الفرق بين «استُلم راتب هذا الشهر» و«استُلم راتبٌ ما» يقرّره حساب تواريخ لا
 * شكلُ زر. وهو منطق يسهل اختباره بلا متصفح.
 *
 * كل الدوال تأخذ «اليوم» وسيطاً بدل قراءة الساعة، فتُختبر بيقين ولا تتغير
 * نتيجتها بمرور الوقت.
 */

export const INCOME_CATEGORY_LABELS: Record<IncomeCategory, string> = {
  salary: 'راتب',
  daily: 'استلام يومي',
  sale: 'مبيعات',
  rent: 'إيجار',
  gift: 'هبة',
  other: 'أخرى',
};

/** مفتاح الدورة التي يقع فيها تاريخ ما: الشهر للراتب، اليوم للاستلام اليومي. */
export function periodKey(cadence: IncomeSource['cadence'], date: string): string {
  return cadence === 'monthly' ? date.slice(0, 7) : date.slice(0, 10);
}

/**
 * هل سُجِّلت دفعة هذا المصدر عن الدورة الحالية؟
 *
 * يُحتسب من سجلات الدخل نفسها لا من حقل lastCollectedDate وحده: الحقل قد
 * يتخلّف إذا حُذفت الدفعة، فيظن المستخدم أنه استلم وهو لم يستلم. السجلات هي
 * المصدر الحقيقي.
 */
export function isCollectedForPeriod(
  source: IncomeSource,
  incomes: Income[],
  today: string,
): boolean {
  const current = periodKey(source.cadence, today);
  return incomes.some(
    (entry) => entry.sourceId === source.id && periodKey(source.cadence, entry.date) === current,
  );
}

/**
 * المصادر المستحقة الآن والتي لم تُستلم بعد.
 *
 * المصدر الشهري يظهر ابتداءً من يوم استحقاقه لا قبله، فعرضُ راتبٍ يوم 1 وموعده
 * يوم 25 يدفع إلى تسجيل دخل لم يصل. أما المصدر بلا يوم محدد فيُعتبر مستحقاً
 * طوال الشهر. واليومي مستحق كل يوم بطبيعته.
 */
export function dueSources(
  sources: IncomeSource[],
  incomes: Income[],
  today: string,
): IncomeSource[] {
  const dayOfMonth = Number(today.slice(8, 10));
  return sources.filter((source) => {
    if (!source.isActive) return false;
    if (isCollectedForPeriod(source, incomes, today)) return false;
    if (source.cadence === 'daily') return true;
    return source.dayOfMonth === undefined || dayOfMonth >= source.dayOfMonth;
  });
}

/** مجموع الدخل خلال شهر بصيغة YYYY-MM. */
export function totalForMonth(incomes: Income[], month: string): number {
  return incomes
    .filter((entry) => entry.date.startsWith(month))
    .reduce((sum, entry) => sum + entry.amount, 0);
}

/** مجموع الدخل كله، وهو ما يدخل في حساب رأس المال المتاح. */
export function totalIncome(incomes: Income[]): number {
  return incomes.reduce((sum, entry) => sum + entry.amount, 0);
}

/** توزيع الدخل على التصنيفات، للتقارير ولوحة التحكم. */
export function totalsByCategory(incomes: Income[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const entry of incomes) {
    totals[entry.category] = (totals[entry.category] ?? 0) + entry.amount;
  }
  return totals;
}

/**
 * يبني دفعة دخل من مصدر متكرر. الوصف يحمل عنوان المصدر ودورته، فيبقى السجل
 * مفهوماً بعد حذف المصدر نفسه.
 */
export function paymentFromSource(source: IncomeSource, today: string, amount?: number): Omit<Income, 'id'> {
  const label = source.cadence === 'monthly' ? `راتب ${today.slice(0, 7)}` : `استلام ${today}`;
  return {
    amount: amount ?? source.amount,
    category: source.category,
    date: today,
    description: `${source.title} — ${label}`,
    sourceId: source.id,
  };
}
