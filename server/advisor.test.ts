import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import { registerAdvisorRoutes } from "./advisor.js";

describe("financial advisor route", () => {
  let closeServer: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await closeServer?.();
    closeServer = undefined;
  });

  it("rejects a request that has no Firebase session token", async () => {
    const app = express();
    app.use(express.json());
    registerAdvisorRoutes(app);

    const server = await new Promise<ReturnType<typeof app.listen>>(resolve => {
      const instance = app.listen(0, () => resolve(instance));
    });
    closeServer = () => new Promise(resolve => server.close(() => resolve()));

    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server did not receive a TCP port");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/advisor/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userMessage: "حلل بياناتي" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ error: expect.stringContaining("غير مصرح") });
  });
});
