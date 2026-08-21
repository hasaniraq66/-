import { describe, expect, it, vi } from 'vitest';
import { ensureFirebaseSessionReady } from './firebaseSession';

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
});
