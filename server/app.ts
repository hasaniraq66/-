import express, { type Express } from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { registerStorageProxy } from "./_core/storageProxy";
import { appRouter } from "./routers";
import { registerAdvisorRoutes } from "./advisor";
import { registerAttachmentRoutes } from "./attachments";
import { createContext } from "./_core/context";

/**
 * يجهز تطبيق Express من دون فتح منفذ. تستخدمه جلسة التطوير المحلية ودالة Vercel
 * نفسها حتى تبقى مسارات tRPC والمرفقات متطابقة في البيئتين.
 */
export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
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
