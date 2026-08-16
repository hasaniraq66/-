import { describe, expect, it, vi } from 'vitest';
import { copyReferenceNumber, createNextReferenceNumber, findRecordByReference, getDisplayReferenceNumber, matchesReferenceSearch } from '../client/src/utils/recordReferences.js';

describe('record reference numbers', () => {
  it('increments the next debt number inside the same calendar year', () => {
    const reference = createNextReferenceNumber([
      { id: 'one', referenceNumber: 'DBT-2026-0002' },
      { id: 'two', referenceNumber: 'DBT-2026-0007' },
      { id: 'old', referenceNumber: 'DBT-2025-0099' },
    ], 'DBT', '2026-08-14');

    expect(reference).toBe('DBT-2026-0008');
  });

  it('creates a stable display reference for older unnumbered records', () => {
    expect(getDisplayReferenceNumber({ id: 'debt-abc123' }, 'DBT')).toBe('DBT-ARCH-ABC123');
    expect(getDisplayReferenceNumber({ id: 'expense-xyz789' }, 'INV')).toBe('INV-ARCH-XYZ789');
  });

  it('increments invoice numbers independently from debt numbers', () => {
    const reference = createNextReferenceNumber([
      { id: 'invoice-one', referenceNumber: 'INV-2026-0003' },
      { id: 'debt-one', referenceNumber: 'DBT-2026-0099' },
    ], 'INV', '2026-08-14');

    expect(reference).toBe('INV-2026-0004');
  });

  it('matches a debt reference regardless of case, separators, or Arabic display label', () => {
    const record = { id: 'debt-search', referenceNumber: 'DBT-2026-0001' };

    expect(matchesReferenceSearch(record, 'DBT', 'dbt-2026-0001')).toBe(true);
    expect(matchesReferenceSearch(record, 'DBT', 'د#DBT 2026 0001')).toBe(true);
    expect(matchesReferenceSearch(record, 'DBT', 'INV-2026-0001')).toBe(false);
  });

  it('matches the stable archive reference for a legacy invoice', () => {
    expect(matchesReferenceSearch({ id: 'expense-xyz789' }, 'INV', 'INV-ARCH-XYZ789')).toBe(true);
    expect(matchesReferenceSearch({ id: 'expense-xyz789' }, 'INV', 'ف#inv arch xyz789')).toBe(true);
  });

  it('extracts a debt record from its full reference in Arabic display format', () => {
    const debt = { id: 'debt-one', referenceNumber: 'DBT-2026-0001', personName: 'اختبار' };
    const result = findRecordByReference([debt], [], 'د#dbt 2026 0001');

    expect(result).toEqual({ kind: 'debt', record: debt, referenceNumber: 'DBT-2026-0001' });
  });

  it('extracts a legacy invoice but rejects incomplete or unknown references', () => {
    const expense = { id: 'expense-xyz789', category: 'اختبار' };

    expect(findRecordByReference([], [expense], 'ف#INV ARCH XYZ789')).toEqual({
      kind: 'expense',
      record: expense,
      referenceNumber: 'INV-ARCH-XYZ789',
    });
    expect(findRecordByReference([], [expense], 'INV-ARCH')).toBeNull();
    expect(findRecordByReference([], [expense], 'INV-2026-9999')).toBeNull();
  });

  it('copies a trimmed reference through the supplied clipboard writer', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);

    await expect(copyReferenceNumber('  DBT-2026-0001  ', { writeText })).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('DBT-2026-0001');
  });

  it('fails safely when the clipboard is unavailable or rejects the write', async () => {
    await expect(copyReferenceNumber('', null)).resolves.toBe(false);
    await expect(copyReferenceNumber('INV-2026-0001', { writeText: vi.fn().mockRejectedValue(new Error('denied')) })).resolves.toBe(false);
  });
});
