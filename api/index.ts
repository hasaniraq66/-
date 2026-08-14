import type { Request, Response } from "express";
import { createApp } from "../server/app";

const app = createApp();

export function restoreForwardedApiPath(req: Pick<Request, "url">): void {
  const requestUrl = new URL(req.url ?? "/api", "https://vercel.internal");
  const forwardedPath = requestUrl.searchParams.get("path");

  if (requestUrl.pathname === "/api" && forwardedPath) {
    requestUrl.searchParams.delete("path");
    const safePath = forwardedPath.replace(/^\/+/, "");
    req.url = `/api/${safePath}${requestUrl.search}`;
  }
}

/**
 * مدخل Vercel لدالة API واحدة. تضيف إعادة الكتابة اسم المسار ضمن query لأن
 * Vercel يوجه جميع /api/* إلى هذا الملف، ثم يعيد Express تنفيذ المسار الأصلي.
 */
export default function vercelApiHandler(req: Request, res: Response) {
  restoreForwardedApiPath(req);
  return app(req, res);
}
