// مدخل دالة Vercel الخادمية: يعيد إنشاء تطبيق Express الكامل (tRPC + المرفقات
// + المستشار + وكيل التخزين) من المصدر مباشرة؛ Vercel يبني كامل شجرة الاستيراد
// التي يبدأها هذا الملف، فلا حاجة إلى ملف حزمة خارجي داخل api/.
// ملاحظة: هذا الملف JavaScript خالص عمداً لتفادي فشل typecheck على مستوى Vercel
// الذي يفشل عند التحقق من شجرة الاستيراد بـ tsc (شجرة server/ لا تتوافق مع بيئة
// typecheck الخاصة بـ Vercel بسبب اختلاف إصدارات types).
import { createApp } from "../server/app.js";

const app = createApp();

export function restoreForwardedApiPath(req) {
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
export default function vercelApiHandler(req, res) {
  restoreForwardedApiPath(req);
  return app(req, res);
}
