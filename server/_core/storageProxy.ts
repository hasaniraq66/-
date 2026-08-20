import type { Express, RequestHandler } from "express";

/**
 * مسار توافق قديم. كان يحوّل أي مفتاح تخزين معلوم إلى رابط تنزيل موقّع،
 * ولذلك لا يجوز إعادة تفعيله قبل وجود تحقق هوية وملكية خاص بكل نوع ملف.
 * المرفقات المالية تستخدم حصراً /api/attachments/preview بعد تحقق Firebase.
 */
export function createDisabledStorageProxyHandler(): RequestHandler {
  return (_req, res) => {
    res.status(404).send("Not found");
  };
}

export function registerStorageProxy(app: Express) {
  app.all("/manus-storage/*splat", createDisabledStorageProxyHandler());
}
