import { describe, expect, it } from 'vitest';
// @ts-expect-error — سكربت تشغيل بلا أنواع، ونختبر منطقه الخالص فقط
import { classifyProfile, summarize } from './auditSubUserLinks.mjs';

describe('classifyProfile', () => {
  it('يعتبر المستخدم بلا مشرف سليماً', () => {
    expect(classifyProfile({ userId: 'u1', adminId: '', adminExists: false, linkExists: false }))
      .toMatchObject({ status: 'standalone' });
  });

  it('يعتبر المساعد المربوط سليماً', () => {
    expect(classifyProfile({ userId: 'u2', adminId: 'a1', adminExists: true, linkExists: true }))
      .toMatchObject({ status: 'linked' });
  });

  it('يكشف adminId بلا سجل subUsers مقابل', () => {
    expect(classifyProfile({ userId: 'u3', adminId: 'a1', adminExists: true, linkExists: false }))
      .toMatchObject({ status: 'dangling', adminId: 'a1' });
  });

  it('يكشف adminId يشير إلى مستخدم غير موجود', () => {
    expect(classifyProfile({ userId: 'u4', adminId: 'ghost', adminExists: false, linkExists: false }))
      .toMatchObject({ status: 'missing-admin' });
  });
});

describe('summarize', () => {
  it('يحصي كل حالة على حدة', () => {
    const counts = summarize([
      { status: 'standalone' },
      { status: 'linked' },
      { status: 'dangling' },
      { status: 'dangling' },
    ]);
    expect(counts).toEqual({ standalone: 1, linked: 1, dangling: 2 });
  });

  it('يعيد كائناً فارغاً بلا نتائج', () => {
    expect(summarize([])).toEqual({});
  });
});
