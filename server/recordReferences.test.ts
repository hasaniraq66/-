import { describe, expect, it } from 'vitest';
import { createNextReferenceNumber, getDisplayReferenceNumber } from '../client/src/utils/recordReferences';

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
});
