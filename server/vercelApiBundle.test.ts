import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname ?? __dirname, "..");
const BUNDLE_PATH = join(ROOT, "dist/server.js");

/**
 * يضمن أن حزمة دالة Vercel (dist/server.js) موجودة وقابلة للقراءة وتصدّر
 * معالج طلبات، وأن api/index.ts يشير إليها وليس إلى مصدر غير موجود في
 * بيئة الإنتاج (السبب السابق: ERR_MODULE_NOT_FOUND).
 */
describe("Vercel API bundle contract", () => {
  it("dist/server.js bundle exists", () => {
    expect(existsSync(BUNDLE_PATH)).toBe(true);
  });

  it("api/index.ts re-exports the bundled handler instead of a raw server source", () => {
    const source = readFileSync(join(ROOT, "api/index.ts"), "utf8");
    expect(source).toContain("../dist/server.js");
    expect(source).not.toContain("createApp()");
  });

  it("vercel.json routes the API function to the bundle", () => {
    const config = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8")) as Record<string, unknown>;
    const functions = config.functions as Record<string, unknown>;
    expect(functions?.["api/index.ts"]).toMatchObject({ includeFiles: "dist/server.js" });
  });

  it("bundle contains the attachments upload route handler", () => {
    const bundle = readFileSync(BUNDLE_PATH, "utf8");
    expect(bundle).toContain("/api/attachments/upload");
    expect(bundle).toContain("/api/attachments/preview");
    expect(bundle).toContain("/api/attachments/review");
  });

  it("bundle loads as an ESM default-exported handler", async () => {
    const imported = (await import(BUNDLE_PATH)) as { default?: unknown };
    expect(typeof imported.default).toBe("function");
  });
});
