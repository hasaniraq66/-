import { describe, expect, it } from 'vitest';
import type { Debt } from '../types';
import { buildPaymentReceipt, remainingAfterPayment } from './paymentReceipt';

const base: Debt = {
  id: 'd1',
  referenceNumber: 'DBT-2026-0007',
  type: 'to_me',
  personName: 'أبو أحمد',
  amount: 1000,
  paidAmount: 200,
  dueDate: '2026-10-01',
  startDate: '2026-01-01',
  category: 'تجاري',
  description: 'بضاعة',
  status: 'partial',
  installments: [],
};

const receipt = (debt: Debt, amount: number, extra: { notes?: string } = {}) =>
  buildPaymentReceipt({ debt, amount, date: '2026-09-05', currency: 'د.ع', ...extra });

describe('remainingAfterPayment', () => {
  it('يطرح الدفعة من المتبقي', () => {
    expect(remainingAfterPayment(base, 300)).toBe(500);
  });

  it('لا ينزل تحت الصفر عند دفعة زائدة', () => {
    expect(remainingAfterPayment(base, 5000)).toBe(0);
  });
});

/**
 * الخطأ الذي يسهل الوقوع فيه: قراءة المتبقي من حالة الدين وقت بناء الرسالة.
 * الحالة لم تُحدَّث بعد بالدفعة الجارية، فتخرج رسالة تطالب بمالٍ سُدِّد.
 */
describe('الرصيد يُحسب بعد الدفعة لا قبلها', () => {
  it('يذكر المتبقي بعد خصم الدفعة', () => {
    const r = receipt(base, 300);
    expect(r.remainingAfter).toBe(500);
    expect(r.message).toContain('500');
    expect(r.isSettled).toBe(false);
  });

  it('يعلن السداد الكامل حين تُغلق الدفعة الدين', () => {
    const r = receipt(base, 800);
    expect(r.isSettled).toBe(true);
    expect(r.message).toContain('تم سداد كامل المبلغ');
    expect(r.message).not.toContain('المتبقي');
  });

  it('لا يذكر تاريخ استحقاق لدين مُغلق', () => {
    expect(receipt(base, 800).message).not.toContain('تاريخ الاستحقاق');
  });
});

/**
 * اتجاه الدين يقلب الصياغة: في دين «لي» الطرف الآخر هو الدافع فأنا أشكره على
 * السداد؛ وفي دين «عليّ» أنا الدافع فأنا أُشعره بالتسديد. العكس يقول للدائن
 * إنك استلمت منه مالاً وأنت الذي دفعته.
 */
describe('اتجاه الدين يقلب الصياغة', () => {
  it('دين لي: إشعار استلام وشكر على السداد', () => {
    const r = receipt(base, 300);
    expect(r.message).toContain('إشعار استلام دفعة');
    expect(r.message).toContain('نشكر لك سداد');
  });

  it('دين عليّ: إشعار تسديد لهم', () => {
    const r = receipt({ ...base, type: 'to_others' }, 300);
    expect(r.message).toContain('إشعار تسديد دفعة');
    expect(r.message).toContain('تم تسديد دفعة لكم');
    expect(r.message).not.toContain('نشكر لك سداد');
  });
});

describe('محتوى الرسالة', () => {
  it('يذكر اسم الطرف والمرجع والبيان', () => {
    const m = receipt(base, 300).message;
    expect(m).toContain('أبو أحمد');
    expect(m).toContain('DBT-2026-0007');
    expect(m).toContain('بضاعة');
  });

  it('يتجاوز المرجع والبيان حين لا يوجدان بدل طباعة سطور فارغة', () => {
    const bare: Debt = { ...base, referenceNumber: undefined, description: '' };
    const m = receipt(bare, 300).message;
    expect(m).not.toContain('🔖');
    expect(m).not.toContain('📌');
  });

  it('يضيف الملاحظة حين تُكتب ويتجاهل الفراغ', () => {
    expect(receipt(base, 300, { notes: 'نقداً' }).message).toContain('نقداً');
    expect(receipt(base, 300, { notes: '   ' }).message).not.toContain('📝');
  });

  it('يجمع المسدَّد الكلي لا الدفعة وحدها', () => {
    // 200 سابقة + 300 الآن = 500
    expect(receipt(base, 300).message).toContain('500');
  });

  it('لا يتجاوز المسدَّد الكلي أصل المبلغ', () => {
    expect(receipt(base, 5000).message).toContain('1,000');
  });
});

describe('رابط واتساب', () => {
  it('يرمّز الرسالة داخل الرابط', () => {
    const r = receipt(base, 300);
    expect(r.whatsappUrl.startsWith('https://wa.me/?text=')).toBe(true);
    expect(decodeURIComponent(r.whatsappUrl.split('text=')[1])).toBe(r.message);
  });

  it('يرمّز الأسطر الجديدة فلا ينكسر الرابط', () => {
    expect(receipt(base, 300).whatsappUrl).not.toContain('\n');
  });
});
