// Shim شفاف يُحقن في حزمة ESM: يجعل require متوفراً عبر createRequire من import.meta.url.
import { createRequire } from "module";

// يُستخدم فقط عند عدم وجود require أصلي (بيئة Node ESM نقية مثل Vercel runtime).
if (typeof globalThis.require === "undefined") {
  globalThis.require = createRequire(import.meta.url);
}
