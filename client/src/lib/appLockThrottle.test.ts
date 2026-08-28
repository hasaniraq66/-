import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FREE_ATTEMPTS,
  MAX_LOCK_MS,
  describeRemaining,
  lockDurationMs,
  readState,
  registerFailure,
  registerSuccess,
  remainingLockMs,
} from './appLockThrottle';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
});

describe('lockDurationMs', () => {
  it('يسمح بمحاولات حرة للخطأ البشري العادي', () => {
    for (let i = 1; i <= FREE_ATTEMPTS; i += 1) {
      expect(lockDurationMs(i)).toBe(0);
    }
  });

  it('يضاعف الانتظار بعد استنفاد المحاولات الحرة', () => {
    expect(lockDurationMs(FREE_ATTEMPTS + 1)).toBe(5_000);
    expect(lockDurationMs(FREE_ATTEMPTS + 2)).toBe(10_000);
    expect(lockDurationMs(FREE_ATTEMPTS + 3)).toBe(20_000);
  });

  it('يثبت عند حد أقصى فلا يُقفل التطبيق إلى الأبد', () => {
    expect(lockDurationMs(FREE_ATTEMPTS + 40)).toBe(MAX_LOCK_MS);
  });
});

describe('تتبّع المحاولات', () => {
  it('يمنع الإدخال بعد سلسلة إخفاقات', () => {
    const now = 1_000_000;
    for (let i = 0; i < FREE_ATTEMPTS; i += 1) registerFailure(now);
    expect(remainingLockMs(now)).toBe(0);

    registerFailure(now);
    expect(remainingLockMs(now)).toBe(5_000);
  });

  it('يبقى المنع سارياً بعد إعادة تحميل الصفحة', () => {
    const now = 2_000_000;
    for (let i = 0; i <= FREE_ATTEMPTS; i += 1) registerFailure(now);
    // قراءة جديدة تمثّل إقلاعاً جديداً على التخزين نفسه
    expect(readState(now).lockedUntil).toBeGreaterThan(now);
  });

  it('ينتهي المنع بمرور وقته', () => {
    const now = 3_000_000;
    for (let i = 0; i <= FREE_ATTEMPTS; i += 1) registerFailure(now);
    expect(remainingLockMs(now + 5_001)).toBe(0);
  });

  it('يصفّر العدّاد عند النجاح', () => {
    const now = 4_000_000;
    for (let i = 0; i <= FREE_ATTEMPTS; i += 1) registerFailure(now);
    registerSuccess();
    expect(remainingLockMs(now)).toBe(0);
    expect(readState(now).failures).toBe(0);
  });

  it('لا ينهار على حالة تخزين تالفة', () => {
    store.set('app_pin_attempts', '{ليس JSON');
    expect(readState(5_000_000)).toEqual({ failures: 0, lockedUntil: 0 });
  });
});

describe('describeRemaining', () => {
  it('يصوغ الثواني', () => {
    expect(describeRemaining(5_000)).toBe('5 ثانية');
  });

  it('يصوغ الدقائق للمُدد الطويلة', () => {
    expect(describeRemaining(120_000)).toBe('2 دقيقة');
  });
});
