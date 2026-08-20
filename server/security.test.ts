import { describe, expect, it, vi } from 'vitest';
import { applySecurityHeaders } from './security.js';

describe('security headers', () => {
  it('sets baseline browser-hardening headers before continuing the request', () => {
    const setHeader = vi.fn();
    const next = vi.fn();

    applySecurityHeaders({} as never, { setHeader } as never, next);

    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    expect(setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    expect(setHeader).toHaveBeenCalledWith('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    expect(setHeader).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'same-origin');
    expect(next).toHaveBeenCalledOnce();
  });
});
