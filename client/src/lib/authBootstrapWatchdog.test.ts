import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAuthBootstrapWatchdog } from './authBootstrapWatchdog';

describe('createAuthBootstrapWatchdog', () => {
  afterEach(() => vi.useRealTimers());

  it('ينهي انتظار مستمع المصادقة المتعثر مرة واحدة فقط', async () => {
    vi.useFakeTimers();
    const onExpire = vi.fn();
    createAuthBootstrapWatchdog(onExpire, 250);

    await vi.advanceTimersByTimeAsync(250);
    await vi.advanceTimersByTimeAsync(500);

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('يلغي المهلة عند وصول حالة المصادقة أو عند إلغاء الاشتراك', async () => {
    vi.useFakeTimers();
    const acknowledged = vi.fn();
    const cancelled = vi.fn();
    const first = createAuthBootstrapWatchdog(acknowledged, 250);
    const second = createAuthBootstrapWatchdog(cancelled, 250);

    first.acknowledge();
    second.cancel();
    await vi.advanceTimersByTimeAsync(250);

    expect(acknowledged).not.toHaveBeenCalled();
    expect(cancelled).not.toHaveBeenCalled();
  });
});
