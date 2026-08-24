import type { CapacitorConfig } from "@capacitor/cli";

// معرّف التطبيق (Application ID) لمتاجر Google Play وApp Store.
// غيّره إلى معرّف فريد يخصك قبل النشر في المتاجر.
const appId = process.env.CAPACITOR_APP_ID ?? "com.diyuni.budgetpro";

// رابط الموقع المنشور فعلياً (Vercel أو غيره). عند ضبطه، يعرض تطبيق
// الجوال محتوى الموقع الحي مباشرة بدل النسخة المجمّعة محلياً، فتعمل
// عمليات تسجيل الدخول عبر OAuth ونداءات /api/* بشكل طبيعي لأنها تعتمد
// على window.location.origin الفعلي للموقع المنشور.
const productionServerUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId,
  appName: "ديوني وميزانيتي برو",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
    ...(productionServerUrl ? { url: productionServerUrl, cleartext: false } : {}),
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: "#0f172a",
      showSpinner: false,
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#0f172a",
    },
  },
};

export default config;
