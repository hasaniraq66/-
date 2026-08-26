import { describe, expect, it } from 'vitest';
import { isPermissionDenied, resolveCollection, shouldReportLoadFailure } from './collectionAccess';

const denied = () => Object.assign(new Error('denied'), { code: 'permission-denied' });
const offline = () => Object.assign(new Error('offline'), { code: 'unavailable' });

const rejected = (reason: unknown): PromiseSettledResult<number[]> => ({ status: 'rejected', reason });
const fulfilled = (value: number[]): PromiseSettledResult<number[]> => ({ status: 'fulfilled', value });

describe('isPermissionDenied', () => {
  it('يتعرف على رفض الصلاحيات', () => {
    expect(isPermissionDenied(denied())).toBe(true);
  });

  it('لا يخلط انقطاع الاتصال برفض الصلاحيات', () => {
    expect(isPermissionDenied(offline())).toBe(false);
  });
});

describe('resolveCollection', () => {
  it('يعيد البيانات المحمّلة عند النجاح', () => {
    expect(resolveCollection(fulfilled([1, 2]), [9])).toEqual([1, 2]);
  });

  it('يرجع إلى النسخة المخبّأة عندما تكون السحابة فارغة', () => {
    expect(resolveCollection(fulfilled([]), [9])).toEqual([9]);
  });

  it('يعيد قائمة فارغة عند رفض الصلاحيات ولا يكشف النسخة المخبّأة', () => {
    expect(resolveCollection(rejected(denied()), [9])).toEqual([]);
  });

  it('يحتفظ بالعمل دون إنترنت عند تعذر الاتصال', () => {
    expect(resolveCollection(rejected(offline()), [9])).toEqual([9]);
  });
});

describe('shouldReportLoadFailure', () => {
  it('لا يزعج مساعداً محدود الصلاحية برسالة خطأ', () => {
    expect(shouldReportLoadFailure([fulfilled([1]), rejected(denied())])).toBe(false);
  });

  it('يبلّغ عن فشل حقيقي في الاتصال', () => {
    expect(shouldReportLoadFailure([fulfilled([1]), rejected(offline())])).toBe(true);
  });

  it('لا يبلّغ عن شيء عندما ينجح كل شيء', () => {
    expect(shouldReportLoadFailure([fulfilled([1]), fulfilled([])])).toBe(false);
  });
});
