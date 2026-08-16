import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname ?? __dirname, "..");

/**
 * يضمن أن مدخل دالة Vercel (api/index.ts) قابل للبناء من المصدر مباشرة:
 * يستورد createApp من server/app (وليس حزمة خارجية dist/server.js التي لا
 * توجد وقت بناء Vercel — السبب السابق لفشل النشرات: ERR_MODULE_NOT_FOUND
 * لـ /var/task/server/app ثم تعارض includeFiles).
 */
describe("Vercel API entry contract", () => {
  it("api/index.ts imports createApp from server/app.js", () => {
    const source = readFileSync(join(ROOT, "api/index.ts"), "utf8");
    expect(source).toContain('from "../server/app.js"');
    expect(source).not.toContain("dist/server.js");
  });

  it("all relative imports in server/ carry explicit .js extensions (Node ESM on Vercel)", () => {
    const ts = readFileSync(join(ROOT, "server/app.ts"), "utf8");
    const relativeWithoutExt = /from\s+["']\.\.?\/[^"']+(?<!\.(js|ts|mjs|json))["']/g;
    const matches = (ts + "\n" + readFileSync(join(ROOT, "server/storage.ts"), "utf8")).match(relativeWithoutExt);
    expect(matches).toBeNull();
  });

  it("api/index.ts exports a default request handler and path restorer", () => {
    const source = readFileSync(join(ROOT, "api/index.ts"), "utf8");
    expect(source).toContain("export default function");
    expect(source).toContain("restoreForwardedApiPath");
  });

  it("vercel.json has no invalid functions section", () => {
    const config = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")) as Record<string, unknown>;
    const functions = config.functions as Record<string, unknown> | undefined;
    expect(functions?.["api/index.ts"]?.includeFiles).toBeUndefined();
  });

  it("vercel.json rewrites /api routes to the single API function", () => {
    const config = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")) as Record<string, unknown>;
    const rewrites = config.rewrites as Array<{ source: string; destination: string }> | undefined;
    expect(rewrites?.some((r) => r.source === "/api/:path*" && r.destination === "/api?path=:path*")).toBe(true);
  });
});
