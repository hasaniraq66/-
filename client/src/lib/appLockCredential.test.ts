import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import {
  clearPin,
  hasPin,
  hashPin,
  isValidPinFormat,
  migrateLegacyPin,
  safeEqual,
  setPin,
  verifyPin,
} from './appLockCredential';

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  vi.stubGlobal('crypto', webcrypto);
});

describe('isValidPinFormat', () => {
  it('يقبل أربعة أرقام فقط', () => {
    expect(isValidPinFormat('1234')).toBe(true);
    expect(isValidPinFormat('123')).toBe(false);
    expect(isValidPinFormat('12345')).toBe(false);
    expect(isValidPinFormat('12a4')).toBe(false);
  });
});

describe('safeEqual', () => {
  it('يطابق النصوص المتساوية', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
  });

  it('يرفض المختلفة ولو تساوى الطول', () => {
    expect(safeEqual('abc', 'abd')).toBe(false);
    expect(safeEqual('abc', 'abcd')).toBe(false);
  });
});

describe('تخزين الرمز', () => {
  it('لا يترك الرمز نصاً صريحاً على القرص', async () => {
    await setPin('1234');
    const stored = [...store.values()].join('|');
    expect(stored).not.toContain('1234');
    expect(store.has('app_pin_code')).toBe(false);
  });

  it('يقبل الرمز الصحيح ويرفض غيره', async () => {
    await setPin('1234');
    await expect(verifyPin('1234')).resolves.toBe(true);
    await expect(verifyPin('4321')).resolves.toBe(false);
  });

  it('يستخدم ملحاً مختلفاً لكل تثبيت فلا يتطابق التلبيح بين جهازين', async () => {
    await setPin('1234');
    const first = store.get('app_pin_hash');
    clearPin();
    await setPin('1234');
    expect(store.get('app_pin_hash')).not.toBe(first);
  });

  it('يمحو كل الأثر عند الإلغاء', async () => {
    await setPin('1234');
    clearPin();
    expect(hasPin()).toBe(false);
    await expect(verifyPin('1234')).resolves.toBe(false);
  });

  it('ينتج تلبيحاً ثابتاً لنفس الملح والرمز', async () => {
    expect(await hashPin('1234', 'salt')).toBe(await hashPin('1234', 'salt'));
    expect(await hashPin('1234', 'salt')).not.toBe(await hashPin('1234', 'other'));
  });
});

describe('ترحيل الرمز القديم', () => {
  it('يحوّل الرمز المحفوظ نصاً صريحاً إلى تلبيح', async () => {
    store.set('app_pin_code', '4321');
    expect(await migrateLegacyPin()).toBe(true);
    expect(store.has('app_pin_code')).toBe(false);
    await expect(verifyPin('4321')).resolves.toBe(true);
  });

  it('يبقي الرمز القديم صالحاً حتى قبل الترحيل', async () => {
    store.set('app_pin_code', '4321');
    await expect(verifyPin('4321')).resolves.toBe(true);
    // والمطابقة نفسها ترحّله فلا يبقى صريحاً
    expect(store.has('app_pin_code')).toBe(false);
  });

  it('يتعرف على وجود رمز قديم', () => {
    store.set('app_pin_code', '4321');
    expect(hasPin()).toBe(true);
  });

  it('يتجاهل قيمة قديمة تالفة ويمحوها', async () => {
    store.set('app_pin_code', 'تالف');
    expect(await migrateLegacyPin()).toBe(false);
    expect(store.has('app_pin_code')).toBe(false);
  });
});
