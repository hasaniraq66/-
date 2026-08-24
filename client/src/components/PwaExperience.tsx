import { Download, RefreshCw, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type UpdateAvailableEvent = CustomEvent<{ update: () => void }>;

export function PwaExperience() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [updateApp, setUpdateApp] = useState<(() => void) | null>(null);
  const [offlineReady, setOfflineReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleUpdateAvailable = (event: Event) => {
      const update = (event as UpdateAvailableEvent).detail?.update;
      if (update) setUpdateApp(() => update);
    };
    const handleOfflineReady = () => setOfflineReady(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("pwa:update-available", handleUpdateAvailable);
    window.addEventListener("pwa:offline-ready", handleOfflineReady);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("pwa:update-available", handleUpdateAvailable);
      window.removeEventListener("pwa:offline-ready", handleOfflineReady);
    };
  }, []);

  const requestInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  if (isOnline && !installPrompt && !updateApp && !offlineReady) return null;

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[100] mx-auto flex max-w-md flex-col gap-2" aria-live="polite">
      {!isOnline && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-amber-300/40 bg-slate-950/95 px-4 py-3 text-sm text-amber-50 shadow-2xl backdrop-blur" role="status">
          <WifiOff className="h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
          <span>أنت غير متصل. ستبقى البيانات المحفوظة محلياً متاحة، وستحتاج العمليات الجديدة إلى اتصال.</span>
        </div>
      )}

      {offlineReady && isOnline && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-sky-300/35 bg-slate-950/95 px-4 py-3 text-sm text-sky-50 shadow-2xl backdrop-blur">
          <Wifi className="h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
          <span className="flex-1">أصبح التطبيق جاهزاً لعرض واجهة أساسية عند انقطاع الاتصال.</span>
          <button className="min-h-10 min-w-10 rounded-lg p-2 text-slate-300 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400" onClick={() => setOfflineReady(false)} aria-label="إغلاق الرسالة">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {installPrompt && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-sky-300/35 bg-slate-950/95 px-4 py-3 text-sm text-sky-50 shadow-2xl backdrop-blur">
          <Download className="h-5 w-5 shrink-0 text-sky-300" aria-hidden="true" />
          <span className="flex-1">ثبّت ديوني وميزانيتي برو لفتحه كتطبيق مستقل.</span>
          <button className="min-h-10 rounded-lg bg-sky-500 px-3 font-bold text-slate-950 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200" onClick={requestInstall}>
            تثبيت
          </button>
        </div>
      )}

      {updateApp && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-emerald-300/35 bg-slate-950/95 px-4 py-3 text-sm text-emerald-50 shadow-2xl backdrop-blur">
          <RefreshCw className="h-5 w-5 shrink-0 text-emerald-300" aria-hidden="true" />
          <span className="flex-1">يتوفر تحديث جديد للتطبيق.</span>
          <button className="min-h-10 rounded-lg bg-emerald-400 px-3 font-bold text-slate-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-100" onClick={updateApp}>
            تحديث
          </button>
        </div>
      )}
    </div>
  );
}
