import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth.js";
import { registerStorageProxy } from "./_core/storageProxy.js";
import { appRouter } from "./routers.js";
import { registerAdvisorRoutes } from "./advisor.js";
import { registerAttachmentRoutes } from "./attachments.js";
import { createContext } from "./_core/context.js";
import { applySecurityHeaders, createRateLimitMiddleware } from "./security.js";

/**
 * يجهز تطبيق Express من دون فتح منفذ. تستخدمه جلسة التطوير المحلية ودالة Vercel
 * نفسها حتى تبقى مسارات tRPC والمرفقات متطابقة في البيئتين.
 */
export function createApp(): Express {
  const app = express();

  app.disable("x-powered-by");
  app.use(applySecurityHeaders);
  // 5 MiB للمرفق بعد فك Base64؛ 8 MiB تكفي للترميز وتمنع قبول طلبات ضخمة عامة.
  app.use(express.json({ limit: "8mb" }));
  app.use(express.urlencoded({ limit: "128kb", extended: true }));
  app.use('/api/advisor/analyze', createRateLimitMiddleware({ keyPrefix: 'advisor', windowMs: 15 * 60 * 1_000, maxRequests: 20 }));
  app.use('/api/attachments/upload', createRateLimitMiddleware({ keyPrefix: 'attachment-upload', windowMs: 15 * 60 * 1_000, maxRequests: 12 }));
  app.use('/api/attachments/review', createRateLimitMiddleware({ keyPrefix: 'attachment-review', windowMs: 15 * 60 * 1_000, maxRequests: 30 }));
  app.use('/api/trpc', createRateLimitMiddleware({ keyPrefix: 'trpc', windowMs: 15 * 60 * 1_000, maxRequests: 180 }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerAdvisorRoutes(app);
  registerAttachmentRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  return app;
}
