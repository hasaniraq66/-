import { describe, expect, it, vi } from 'vitest';
import { ensureFirebaseSessionReady, runWithFirebaseSessionRecovery } from './firebaseSession';

describe('ensureFirebaseSessionReady', () => {
  it('يجدد رمز Firebase إجبارياً قبل تنفيذ أول طلب للبيانات', async () => {
    const getIdToken = vi.fn().mockResolvedValue('fresh-id-token');

    await ensureFirebaseSessionReady({ uid: 'owner-uid', getIdToken });

    expect(getIdToken).toHaveBeenCalledOnce();
    expect(getIdToken).toHaveBeenCalledWith(true);
  });

  it('يرفض المتابعة إذا لم تنتج Firebase رمز جلسة صالحاً', async () => {
    const getIdToken = vi.fn().mockResolvedValue('');

    await expect(ensureFirebaseSessionReady({ uid: 'owner-uid', getIdToken }))
      .rejects.toThrow('تعذر تجديد جلسة المستخدم');
  });

  it('يجدد الرمز مرة واحدة ويعيد محاولة طلب Firestore الأول عند رفض مؤقت للصلاحية', async () => {
    const getIdToken = vi.fn().mockResolvedValue('fresh-id-token');
    const operation = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error('permission denied'), { code: 'permission-denied' }))
      .mockResolvedValueOnce('profile-loaded');

    await expect(runWithFirebaseSessionRecovery({ uid: 'owner-uid', getIdToken }, operation))
      .resolves.toBe('profile-loaded');

    expect(getIdToken).toHaveBeenCalledTimes(2);
    expect(getIdToken).toHaveBeenNthCalledWith(1, true);
    expect(getIdToken).toHaveBeenNthCalledWith(2, true);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('لا يعيد المحاولة عند خطأ ليس رفضاً للصلاحية', async () => {
    const getIdToken = vi.fn().mockResolvedValue('fresh-id-token');
    const operation = vi.fn().mockRejectedValue(Object.assign(new Error('offline'), { code: 'unavailable' }));

    await expect(runWithFirebaseSessionRecovery({ uid: 'owner-uid', getIdToken }, operation))
      .rejects.toThrow('offline');

    expect(getIdToken).toHaveBeenCalledOnce();
    expect(operation).toHaveBeenCalledOnce();
  });
});
