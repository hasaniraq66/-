import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = process.cwd();
const viteConfig = readFileSync(resolve(projectRoot, "vite.config.ts"), "utf8");
const clientEntry = readFileSync(resolve(projectRoot, "client/src/main.tsx"), "utf8");
const pwaExperience = readFileSync(resolve(projectRoot, "client/src/components/PwaExperience.tsx"), "utf8");

describe("PWA configuration", () => {
  it("generates an RTL installable manifest and a safe offline fallback", () => {
    expect(viteConfig).toContain("VitePWA({");
    expect(viteConfig).toContain('registerType: "prompt"');
    expect(viteConfig).toContain('dir: "rtl"');
    expect(viteConfig).toContain('navigateFallback: "/offline.html"');
    expect(viteConfig).toContain("navigateFallbackDenylist: [/^\\/api\\//, /^\\/__manus__\\//]");
    expect(existsSync(resolve(projectRoot, "client/public/pwa-icon.svg"))).toBe(true);
    expect(existsSync(resolve(projectRoot, "client/public/offline.html"))).toBe(true);
  });

  it("registers updates only in production and preserves explicit user control", () => {
    expect(clientEntry).toContain("if (!import.meta.env.DEV && \"serviceWorker\" in navigator)");
    expect(clientEntry).toContain('navigator.serviceWorker.register("/sw.js", { scope: "/" })');
    expect(clientEntry).toContain('type: "SKIP_WAITING"');
    expect(pwaExperience).toContain('"beforeinstallprompt"');
    expect(pwaExperience).toContain('"pwa:update-available"');
    expect(pwaExperience).toContain("أنت غير متصل");
  });
});
