import type { NextFunction, Request, Response } from 'express';

export function buildContentSecurityPolicy(isDevelopment = process.env.NODE_ENV !== 'production') {
  const scriptSource = isDevelopment
    ? "script-src 'self' 'unsafe-inline' https://manus-analytics.com"
    : "script-src 'self' https://manus-analytics.com";

  return [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self' https://ai.studio https://*.google.com https://*.googleusercontent.com https://*.run.app",
  "form-action 'self'",
  scriptSource,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://*.googleapis.com https://*.firebasestorage.app https://firebasestorage.googleapis.com",
  "connect-src 'self' https://manus-analytics.com https://*.googleapis.com https://*.firebaseapp.com https://*.firebaseio.com wss://*.firebaseio.com https://*.firebasestorage.app https://firebasestorage.googleapis.com",
  "frame-src https://accounts.google.com https://*.firebaseapp.com",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
  ].join('; ');
}

export const CONTENT_SECURITY_POLICY = buildContentSecurityPolicy();

/** رؤوس دفاعية لا تعتمد على وسيط خارجي وتناسب واجهة API وSPA في النطاق نفسه. */
export function applySecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  next();
}

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
  now?: () => number;
  maxEntries?: number;
};

type RateLimitEntry = { count: number; resetAt: number };

function getClientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const rawValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const address = rawValue?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  return address.slice(0, 128);
}

/**
 * حماية طبقة تطبيق خفيفة للطلبات المكلفة. نافذتها محلية لكل نسخة تشغيل، لذا لا
 * تستبدل حماية الحافة الموزعة، لكنها تمنع الإساءة المتكررة ضمن النسخة نفسها.
 */
export function createRateLimitMiddleware({ windowMs, maxRequests, keyPrefix, now = Date.now, maxEntries = 10_000 }: RateLimitOptions) {
  if (!Number.isSafeInteger(windowMs) || windowMs <= 0 || !Number.isSafeInteger(maxRequests) || maxRequests <= 0) {
    throw new Error('Invalid rate-limit configuration');
  }

  const entries = new Map<string, RateLimitEntry>();

  function pruneEntries(currentTime: number) {
    entries.forEach((entry, key) => {
      if (entry.resetAt <= currentTime) entries.delete(key);
    });
    while (entries.size >= maxEntries) {
      const firstKey = entries.keys().next().value;
      if (!firstKey) break;
      entries.delete(firstKey);
    }
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const currentTime = now();
    const key = `${keyPrefix}:${getClientKey(req)}`;
    const existing = entries.get(key);
    const entry = !existing || existing.resetAt <= currentTime
      ? (pruneEntries(currentTime), { count: 0, resetAt: currentTime + windowMs })
      : existing;

    if (entry.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1_000));
      res.setHeader('RateLimit-Limit', String(maxRequests));
      res.setHeader('RateLimit-Remaining', '0');
      res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1_000)));
      res.setHeader('Retry-After', String(retryAfterSeconds));
      res.status(429).json({ error: 'تم تجاوز الحد المؤقت للطلبات. يرجى المحاولة لاحقاً.' });
      return;
    }

    entry.count += 1;
    entries.set(key, entry);
    res.setHeader('RateLimit-Limit', String(maxRequests));
    res.setHeader('RateLimit-Remaining', String(maxRequests - entry.count));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1_000)));
    next();
  };
}
