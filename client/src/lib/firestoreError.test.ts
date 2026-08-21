import { describe, expect, it } from 'vitest';
import { getFinancialDataLoadErrorMessage, getFirestoreErrorCode } from './firestoreError';

describe('Firestore load error diagnostics', () => {
  it('identifies a direct Firebase permission denial without exposing a document path', () => {
    const error = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' });

    expect(getFirestoreErrorCode(error)).toBe('permission-denied');
    expect(getFinancialDataLoadErrorMessage(error)).toContain('صلاحيات قاعدة البيانات');
    expect(getFinancialDataLoadErrorMessage(error)).not.toContain('users/');
  });

  it('reads the safe error code carried by a wrapped Firebase operation error', () => {
    const error = new Error(JSON.stringify({ code: 'permission-denied', operationType: 'get' }));

    expect(getFirestoreErrorCode(error)).toBe('permission-denied');
  });

  it('keeps network failures generic and actionable', () => {
    expect(getFinancialDataLoadErrorMessage(new Error('network unavailable'))).toContain('اتصالك');
  });
});
