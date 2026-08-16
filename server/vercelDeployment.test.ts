import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
/**
 * نسخ اختبارية مستقلة من دالة استعادة مسار API الموجودة في api/index.js (و
 * api/index.ts سابقاً قبل تحويلها إلى JavaScript نقي). لا يُستورد الملف
 * مباشرة هنا لأنه JavaScript نقي يستورد شجرة server/ الكاملة، ولا يمكن لـ vite
 * في بيئة الاختبارات حل هذه الاستيرادات — سلوك Vercel الفعلي مختلف (يبني الدالة
 * بـ esbuild مع node_modules مثبتة).
 */
function restoreForwardedApiPath(req: { url: string | undefined }): void {
  const requestUrl = new URL(req.url ?? "/api", "https://vercel.internal");
  const forwardedPath = requestUrl.searchParams.get("path");

  if (requestUrl.pathname === "/api" && forwardedPath) {
    requestUrl.searchParams.delete("path");
    const safePath = forwardedPath.replace(/^\/+/, "");
    req.url = `/api/${safePath}${requestUrl.search}`;
  }
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("Vercel deployment contract", () => {
  it("builds the Vite frontend and routes API calls before the SPA fallback", () => {
    const config = JSON.parse(readFileSync(path.join(projectRoot, "vercel.json"), "utf8")) as {
      buildCommand: string;
      outputDirectory: string;
      rewrites: Array<{ source: string; destination: string }>;
    };

    expect(config.buildCommand).toBe("pnpm run build:vercel");
    expect(config.outputDirectory).toBe("dist/public");
    expect(config.rewrites[0]).toEqual({ source: "/api/:path*", destination: "/api?path=:path*" });
    expect(config.rewrites[1]).toEqual({ source: "/:path*", destination: "/index.html" });
  });

  it("restores the original Express API path after Vercel rewrites it", () => {
    const request = { url: "/api?path=attachments%2Fupload&recordId=debt-001" };

    restoreForwardedApiPath(request);

    expect(request.url).toBe("/api/attachments/upload?recordId=debt-001");
  });
});
