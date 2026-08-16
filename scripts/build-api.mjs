import { build } from "esbuild";

// حزمة تطبيق Express كامل (tRPC + المرفقات + المستشار + Firestore + S3 proxy)
// في ملف واحد ESM جاهز للتشغيل كدالة Vercel serverless.
await build({
  entryPoints: ["api/index.js"],
  platform: "node",
  bundle: true,
  format: "esm",
  outfile: "dist/server.js",
  allowOverwrite: true,
  inject: ["./scripts/require-shim.js"],
  logLevel: "info",
});
