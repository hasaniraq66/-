import { describe, expect, it, vi } from 'vitest';
import { applySecurityHeaders, buildContentSecurityPolicy, CONTENT_SECURITY_POLICY, createRateLimitMiddleware } from './security.js';

describe('security headers', () => {
  it('sets baseline browser-hardening headers before continuing the request', () => {
    const setHeader = vi.fn();
    const next = vi.fn();

    applySecurityHeaders({} as never, { setHeader } as never, next);

    expect(setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    expect(setHeader).toHaveBeenCalledWith('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    expect(setHeader).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    expect(setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'cross-origin');
    expect(setHeader).toHaveBeenCalledWith('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    expect(next).toHaveBeenCalledOnce();
  });

  it('allows only the known analytics, Firebase and Google Drive browser sources in its CSP', () => {
    const productionPolicy = buildContentSecurityPolicy(false);
    expect(productionPolicy).toContain("script-src 'self' https://manus-analytics.com");
    expect(productionPolicy).toContain('https://*.googleapis.com');
    expect(productionPolicy).toContain('https://*.firebaseapp.com');
    expect(productionPolicy).toContain("object-src 'none'");
    expect(productionPolicy).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  it('permits the React preamble only in the development policy', () => {
    expect(buildContentSecurityPolicy(true)).toContain("script-src 'self' 'unsafe-inline'");
    expect(buildContentSecurityPolicy(false)).not.toContain("script-src 'self' 'unsafe-inline'");
  });
});

describe('application rate limit', () => {
  it('rejects a request above its configured fixed window with retry metadata', () => {
    let currentTime = 1_000;
    const limiter = createRateLimitMiddleware({ windowMs: 60_000, maxRequests: 2, keyPrefix: 'test', now: () => currentTime });
    const request = { headers: { 'x-forwarded-for': '198.51.100.24, 10.0.0.1' }, socket: {} } as never;
    const makeResponse = () => ({ setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() });
    const first = makeResponse();
    const second = makeResponse();
    const blocked = makeResponse();
    const next = vi.fn();

    limiter(request, first as never, next);
    limiter(request, second as never, next);
    limiter(request, blocked as never, next);

    expect(next).toHaveBeenCalledTimes(2);
    expect(blocked.status).toHaveBeenCalledWith(429);
    expect(blocked.json).toHaveBeenCalledWith({ error: 'تم تجاوز الحد المؤقت للطلبات. يرجى المحاولة لاحقاً.' });
    expect(blocked.setHeader).toHaveBeenCalledWith('Retry-After', '60');
    currentTime += 60_000;
    const afterWindow = makeResponse();
    limiter(request, afterWindow as never, next);
    expect(next).toHaveBeenCalledTimes(3);
  });
});
