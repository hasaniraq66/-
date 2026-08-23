import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";
import { createServer as createViteServer, type ConfigEnv } from "vite";
import viteConfig from "../../vite.config";

export const REACT_DEVELOPMENT_PREAMBLE = `<script type="module">
  import RefreshRuntime from "/@react-refresh";
  RefreshRuntime.injectIntoGlobalHook(window);
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type) => type;
  window.__vite_plugin_react_preamble_installed__ = true;
</script>`;

export function injectReactDevelopmentPreamble(template: string, isDevelopment: boolean) {
  return isDevelopment ? template.replace("</head>", `${REACT_DEVELOPMENT_PREAMBLE}</head>`) : template;
}

export async function setupVite(app: Express, server: Server) {
  const configEnv: ConfigEnv = {
    command: "serve",
    mode: "development",
    isSsrBuild: false,
    isPreview: false,
  };
  const resolvedViteConfig = typeof viteConfig === "function" ? viteConfig(configEnv) : viteConfig;
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...resolvedViteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use(async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // تمرير قالب HTML الأصلي إلى Vite كي يحقن React preamble اللازمة لـ Fast Refresh.
      // إضافة معامل استعلام قبل التحويل تمنع الإضافة من التعرف على مدخل React وتنتج صفحة بيضاء.
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = injectReactDevelopmentPreamble(template, process.env.NODE_ENV !== "production");
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "../..", "dist", "public")
      : path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
