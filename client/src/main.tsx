import { trpc } from "@/lib/trpc";
import { COOKIE_NAME, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { startLogin } from "./const";
import { PwaExperience } from "./components/PwaExperience";
import { bootstrapNativeShell } from "./lib/native";
import "./index.css";

const queryClient = new QueryClient();

if (!import.meta.env.DEV && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
    const announceUpdate = () => {
      if (!registration.waiting) return;
      window.dispatchEvent(new CustomEvent("pwa:update-available", {
        detail: { update: () => registration.waiting?.postMessage({ type: "SKIP_WAITING" }) },
      }));
    };

    registration.addEventListener("updatefound", () => {
      const installing = registration.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          announceUpdate();
        }
      });
    });

    navigator.serviceWorker.ready.then(() => {
      announceUpdate();
      window.dispatchEvent(new Event("pwa:offline-ready"));
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
  }).catch((error) => {
    console.warn("[PWA] تعذر تسجيل عامل الخدمة:", error);
  });
}

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  startLogin();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        // Preview auto-login fallback: when the browser blocks iframe cookies
        // (Safari ITP / private browsing / WebView), the runtime mirrors the
        // session into sessionStorage so we can forward it as a Bearer token.
        // The regular OAuth cookie flow keeps working and takes priority server-side.
        try {
          const raw = sessionStorage.getItem("manus-cookie");
          if (raw) {
            const prefix = `${COOKIE_NAME}=`;
            const pair = raw.split(";").find(s => s.trim().startsWith(prefix));
            const token = pair?.trim().slice(prefix.length);
            if (token) {
              return { Authorization: `Bearer ${token}` };
            }
          }
        } catch {
          // sessionStorage unavailable
        }
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

// تكامل الغلاف الأصلي (أندرويد/iOS). لا يفعل شيئاً في المتصفح، ولا يُؤخّر
// عرض الواجهة، فأي فشل فيه لا يمنع إقلاع التطبيق.
void bootstrapNativeShell().catch((error) => {
  console.error("[Native Shell]", error);
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
      <PwaExperience />
    </QueryClientProvider>
  </trpc.Provider>
);
