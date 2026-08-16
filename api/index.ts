// في بيئة Vercel يُخدم المخرج المُجمَّع dist/server.js الذي يعيد تصدير التطبيق بعد
// حزم جميع اعتمادات الخادم (Firestore / S3 proxy / tRPC). يوجَّر هذا الملف إلى
// الدالة عبر functions في vercel.json بحيث يصل الطلب إلى النسخة المجمّعة.
import type { Request, Response } from "express";
import type bundledHandler from "../dist/server";
import actualHandler from "../dist/server.js";

const handler: (req: Request, res: Response) => void = actualHandler;

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
  return handler(req, res);
}
