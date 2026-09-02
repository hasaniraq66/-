import { describe, expect, it } from 'vitest';
import type { Income, IncomeSource } from '../types';
import {
  dueSources,
  isCollectedForPeriod,
  paymentFromSource,
  periodKey,
  totalForMonth,
  totalIncome,
  totalsByCategory,
} from './incomeSchedule';

const salary: IncomeSource = {
  id: 'src-salary',
  title: 'راتب الوظيفة',
  amount: 3000,
  category: 'salary',
  cadence: 'monthly',
  dayOfMonth: 25,
  isActive: true,
};

const shop: IncomeSource = {
  id: 'src-shop',
  title: 'مبيعات المحل',
  amount: 120,
  category: 'daily',
  cadence: 'daily',
  isActive: true,
};

const entry = (extra: Partial<Income>): Income => ({
  id: 'i1',
  amount: 100,
  category: 'other',
  date: '2026-03-10',
  description: '',
  ...extra,
});

describe('periodKey', () => {
  it('يجمع الشهري بالشهر واليومي باليوم', () => {
    expect(periodKey('monthly', '2026-03-25')).toBe('2026-03');
    expect(periodKey('daily', '2026-03-25')).toBe('2026-03-25');
  });
});

describe('isCollectedForPeriod', () => {
  it('يعتبر الراتب مستلَماً إن سُجِّلت دفعة في الشهر نفسه ولو بيوم مختلف', () => {
    const incomes = [entry({ sourceId: 'src-salary', date: '2026-03-02' })];
    expect(isCollectedForPeriod(salary, incomes, '2026-03-27')).toBe(true);
  });

  it('لا يخلط بين شهرين', () => {
    const incomes = [entry({ sourceId: 'src-salary', date: '2026-02-25' })];
    expect(isCollectedForPeriod(salary, incomes, '2026-03-25')).toBe(false);
  });

  it('يفصل اليومي بيومه لا بشهره', () => {
    const incomes = [entry({ sourceId: 'src-shop', date: '2026-03-10' })];
    expect(isCollectedForPeriod(shop, incomes, '2026-03-10')).toBe(true);
    expect(isCollectedForPeriod(shop, incomes, '2026-03-11')).toBe(false);
  });

  it('لا يخلط مصدرين في الدورة نفسها', () => {
    const incomes = [entry({ sourceId: 'src-shop', date: '2026-03-10' })];
    expect(isCollectedForPeriod(salary, incomes, '2026-03-10')).toBe(false);
  });

  // الحقل قد يتخلّف إذا حُذفت الدفعة، فالسجلات هي المرجع لا الحقل
  it('يعتمد على السجلات لا على lastCollectedDate المتخلّف', () => {
    const stale: IncomeSource = { ...salary, lastCollectedDate: '2026-03-25' };
    expect(isCollectedForPeriod(stale, [], '2026-03-25')).toBe(false);
  });
});

describe('dueSources', () => {
  it('لا يعرض الراتب قبل يوم استحقاقه فلا يُسجَّل دخل لم يصل', () => {
    expect(dueSources([salary], [], '2026-03-24')).toHaveLength(0);
    expect(dueSources([salary], [], '2026-03-25')).toHaveLength(1);
    expect(dueSources([salary], [], '2026-03-28')).toHaveLength(1);
  });

  it('يعتبر المصدر الشهري بلا يوم محدد مستحقاً طوال الشهر', () => {
    const anytime: IncomeSource = { ...salary, dayOfMonth: undefined };
    expect(dueSources([anytime], [], '2026-03-01')).toHaveLength(1);
  });

  it('يعرض اليومي كل يوم ما لم يُستلم', () => {
    expect(dueSources([shop], [], '2026-03-10')).toHaveLength(1);
    const collected = [entry({ sourceId: 'src-shop', date: '2026-03-10' })];
    expect(dueSources([shop], collected, '2026-03-10')).toHaveLength(0);
    expect(dueSources([shop], collected, '2026-03-11')).toHaveLength(1);
  });

  it('يتجاهل المصادر المعطّلة', () => {
    expect(dueSources([{ ...shop, isActive: false }], [], '2026-03-10')).toHaveLength(0);
  });

  it('يعيد المستحق وحده حين تختلط المصادر', () => {
    const due = dueSources([salary, shop], [], '2026-03-10');
    expect(due.map((s) => s.id)).toEqual(['src-shop']);
  });
});

describe('المجاميع', () => {
  const incomes = [
    entry({ id: 'a', amount: 3000, category: 'salary', date: '2026-03-25' }),
    entry({ id: 'b', amount: 120, category: 'daily', date: '2026-03-10' }),
    entry({ id: 'c', amount: 500, category: 'sale', date: '2026-02-05' }),
  ];

  it('يحسب مجموع شهر بعينه', () => {
    expect(totalForMonth(incomes, '2026-03')).toBe(3120);
    expect(totalForMonth(incomes, '2026-02')).toBe(500);
    expect(totalForMonth(incomes, '2026-01')).toBe(0);
  });

  it('يحسب المجموع الكلي الداخل في رأس المال', () => {
    expect(totalIncome(incomes)).toBe(3620);
  });

  it('يوزّع على التصنيفات', () => {
    expect(totalsByCategory(incomes)).toEqual({ salary: 3000, daily: 120, sale: 500 });
  });
});

describe('paymentFromSource', () => {
  it('يبني دفعة راتب بوصف يبقى مفهوماً بعد حذف المصدر', () => {
    const payment = paymentFromSource(salary, '2026-03-25');
    expect(payment.amount).toBe(3000);
    expect(payment.category).toBe('salary');
    expect(payment.sourceId).toBe('src-salary');
    expect(payment.description).toContain('راتب الوظيفة');
    expect(payment.description).toContain('2026-03');
  });

  it('يقبل مبلغاً مختلفاً عن المعتاد', () => {
    expect(paymentFromSource(shop, '2026-03-10', 85).amount).toBe(85);
  });

  it('يسمّي الاستلام اليومي بيومه', () => {
    expect(paymentFromSource(shop, '2026-03-10').description).toContain('2026-03-10');
  });
});
