import { describe, expect, it } from 'vitest';
import type { UserProfile } from '../types';
import { nextProfile, shouldPersistProfile } from './profilePersistence';

const loaded: UserProfile = {
  userId: 'uid-1',
  displayName: 'حسن',
  currency: 'د.ع',
  createdAt: '2026-01-15T10:00:00.000Z',
};

/**
 * الحادثة: يُغلق التطبيق ويُفتح فيعود الاسم إلى «مستخدم جديد». السبب أن الحفظ
 * كان يجري حتى حين يُخفق تحميل الملف، والاسم وقتها على قيمته الافتراضية.
 */
describe('shouldPersistProfile', () => {
  it('لا يكتب شيئاً قبل تحميل ملف نقارن به — وهذا ما كان يمحو الاسم', () => {
    expect(shouldPersistProfile(null, 'مستخدم جديد', 'د.ع')).toBe(false);
  });

  it('لا يكتب حين لا شيء تغيّر، فلا يُصدم الملف عند كل إقلاع', () => {
    expect(shouldPersistProfile(loaded, 'حسن', 'د.ع')).toBe(false);
  });

  it('يكتب عند تغيير الاسم', () => {
    expect(shouldPersistProfile(loaded, 'حسن العراقي', 'د.ع')).toBe(true);
  });

  it('يكتب عند تغيير العملة', () => {
    expect(shouldPersistProfile(loaded, 'حسن', 'ر.س')).toBe(true);
  });
});

describe('nextProfile', () => {
  it('يحافظ على createdAt بدل صدمه إلى «الآن» عند كل حفظ', () => {
    expect(nextProfile(loaded, 'uid-1', 'اسم جديد', 'ر.س').createdAt).toBe(loaded.createdAt);
  });

  it('يحافظ على حقول الإشراف فلا يفقد المساعد ارتباطه بحفظِ اسم', () => {
    const helper: UserProfile = { ...loaded, adminId: 'owner-1', allowedTabs: ['budget'] };
    const updated = nextProfile(helper, 'uid-1', 'اسم', 'د.ع');
    expect(updated.adminId).toBe('owner-1');
    expect(updated.allowedTabs).toEqual(['budget']);
  });

  it('يطبّق الاسم والعملة الجديدين', () => {
    const updated = nextProfile(loaded, 'uid-1', 'اسم جديد', 'ر.س');
    expect(updated.displayName).toBe('اسم جديد');
    expect(updated.currency).toBe('ر.س');
  });

  // الحفظ يعيد الملف المحدَّث إلى الحالة، فيتوقف الشرط عن التحقق ولا تدور حلقة.
  it('يُنتج ملفاً لا يستدعي حفظاً جديداً — فلا حلقة لا نهائية', () => {
    const updated = nextProfile(loaded, 'uid-1', 'اسم جديد', 'ر.س');
    expect(shouldPersistProfile(updated, 'اسم جديد', 'ر.س')).toBe(false);
  });
});
