import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Firestore error privacy contract', () => {
  it('logs only the operation and error code, never the owner path or authentication profile', () => {
    const service = readFileSync(
      resolve(process.cwd(), 'client/src/utils/firebaseService.ts'),
      'utf8',
    );

    expect(service).toContain("console.error('Firestore operation failed', safeErrorInfo)");
    expect(service).not.toContain('authInfo:');
    expect(service).not.toContain("console.error('Firestore Error:");
    expect(service).not.toContain('path: string | null');
  });
});
