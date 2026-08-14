import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { restoreForwardedApiPath } from "../api/index";

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
