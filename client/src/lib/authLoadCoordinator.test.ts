import { describe, expect, it } from 'vitest';
import { createAuthLoadCoordinator } from './authLoadCoordinator';

describe('createAuthLoadCoordinator', () => {
  it('يتجاهل عملية تحميل قديمة عند بدء جلسة أحدث', () => {
    const coordinator = createAuthLoadCoordinator();
    const firstRequest = coordinator.begin();
    const secondRequest = coordinator.begin();

    expect(coordinator.isCurrent(firstRequest)).toBe(false);
    expect(coordinator.isCurrent(secondRequest)).toBe(true);
  });

  it('يلغي العملية الحالية عند تنظيف مستمع المصادقة', () => {
    const coordinator = createAuthLoadCoordinator();
    const request = coordinator.begin();

    coordinator.invalidate();

    expect(coordinator.isCurrent(request)).toBe(false);
  });
});
