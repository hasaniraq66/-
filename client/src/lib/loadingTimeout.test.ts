import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FIREBASE_PROFILE_LOAD_TIMEOUT_MS,
  createDataLoadTimeoutError,
  withDataLoadTimeout,
} from './loadingTimeout';

describe('withDataLoadTimeout', () => {
  afterEach(() => vi.useRealTimers());

  it('يعيد نتيجة تحميل البيانات إذا وصلت قبل المهلة', async () => {
    await expect(withDataLoadTimeout(Promise.resolve('loaded'), FIREBASE_PROFILE_LOAD_TIMEOUT_MS))
      .resolves.toBe('loaded');
  });

  it('ينهي التحميل المتعثر بخطأ قابل للاستعادة بدلاً من الانتظار غير المنتهي', async () => {
    vi.useFakeTimers();
    const result = withDataLoadTimeout(new Promise<never>(() => undefined), 500);
    const rejection = expect(result).rejects.toMatchObject({ code: 'data-load-timeout' });

    await vi.advanceTimersByTimeAsync(500);

    await rejection;
  });

  it('ينشئ رمز خطأ ثابتاً يمكن لواجهة الاستعادة التعرف عليه', () => {
    expect(createDataLoadTimeoutError()).toMatchObject({ code: 'data-load-timeout' });
  });
});
