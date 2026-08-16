import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname ?? __dirname, "..");

/**
 * يضمن أن مدخل دالة Vercel (api/index.js النقي) قابل للنشر مباشرة:
 * - يستخدم JavaScript خالصاً دون ملف TypeScript موازٍ لأن typecheck الخاص
 *   بـ Vercel على api/index.ts يفشل شجرة server/ كاملة (تعارض إصدارات types)
 *   ويجعل النشرة في حالة FUNCTION_INVOCATION_FAILED — انظر
 *   docs/vercel-production-qa-notes.md.
 * - يستورد createApp من server/app.js مباشرة (وليس حزمة خارجية dist/server.js
 *   التي لم تكن متاحة وقت بناء الدالة سابقاً — السبب الأول لفشل النشرات:
 *   ERR_MODULE_NOT_FOUND لـ @shared/* وdist/server.js).
 */
describe("Vercel API entry contract", () => {
  it("api/index.js is pure JavaScript (no sibling api/index.ts)", () => {
    expect(existsSync(join(ROOT, "api/index.js"))).toBe(true);
    expect(existsSync(join(ROOT, "api/index.ts"))).toBe(false);
    const source = readFileSync(join(ROOT, "api/index.js"), "utf8");
    expect(source).not.toMatch(/^\s*import\s+type\b/m);
  });

  it("api/index.js imports createApp from server/app.js", () => {
    const source = readFileSync(join(ROOT, "api/index.js"), "utf8");
    expect(source).toContain('from "../server/app.js"');
    expect(source).not.toContain("dist/server.js");
  });

  it("all relative imports in server/ carry explicit .js extensions (Node ESM on Vercel)", () => {
    const ts = readFileSync(join(ROOT, "server/app.ts"), "utf8");
    const relativeWithoutExt = /from\s+["']\.\.?\/[^"']+(?<!\.(js|ts|mjs|json))["']/g;
    const matches = (ts + "\n" + readFileSync(join(ROOT, "server/storage.ts"), "utf8")).match(relativeWithoutExt);
    expect(matches).toBeNull();
  });

  it("api/index.js exports a default request handler and path restorer", () => {
    const source = readFileSync(join(ROOT, "api/index.js"), "utf8");
    expect(source).toContain("export default function");
    expect(source).toContain("restoreForwardedApiPath");
  });

  it("vercel.json has no invalid functions section", () => {
    const config = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")) as Record<string, unknown>;
    const functions = config.functions as Record<string, unknown> | undefined;
    expect(functions?.["api/index.js"]?.runtime).toBeUndefined();
  });

  it("vercel.json rewrites /api routes to the single API function", () => {
    const config = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")) as Record<string, unknown>;
    const rewrites = config.rewrites as Array<{ source: string; destination: string }> | undefined;
    expect(rewrites?.some((r) => r.source === "/api/:path*" && r.destination === "/api?path=:path*")).toBe(true);
  });
});
