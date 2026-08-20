import { describe, expect, it, vi } from 'vitest';
import { createDisabledStorageProxyHandler } from './storageProxy.js';

describe('legacy Forge storage proxy', () => {
  it('does not issue a signed download URL for an unauthenticated direct storage path', () => {
    const status = vi.fn().mockReturnThis();
    const send = vi.fn();

    createDisabledStorageProxyHandler()({} as never, { status, send } as never);

    expect(status).toHaveBeenCalledWith(404);
    expect(send).toHaveBeenCalledWith('Not found');
  });
});
