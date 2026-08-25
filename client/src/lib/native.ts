import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { SplashScreen } from '@capacitor/splash-screen';
import { Style, StatusBar } from '@capacitor/status-bar';

/** لون سطح الخزينة الكحلي المستخدم في شريط الحالة على الأجهزة الأصلية. */
export const NATIVE_STATUS_BAR_COLOR = '#0f172a';

export type BackButtonAction = 'navigate-back' | 'exit-app';

/**
 * يقرر تصرّف زر الرجوع الأصلي في أندرويد. الغلاف الأصلي يعرض واجهة ويب
 * واحدة، فمن دون هذا القرار يغلق الزر التطبيق كاملاً حتى داخل الصفحات
 * الفرعية. نرجع خطوة في سجل التنقل ما دام ذلك ممكناً، ولا نخرج من
 * التطبيق إلا من الشاشة الجذرية.
 */
export function decideBackButtonAction(canGoBack: boolean): BackButtonAction {
  return canGoBack ? 'navigate-back' : 'exit-app';
}

/**
 * يفعّل تكامل الغلاف الأصلي (شريط الحالة، شاشة البداية، زر الرجوع).
 * لا يفعل شيئاً في المتصفح، فيبقى مسار الويب كما هو تماماً.
 */
export async function bootstrapNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  App.addListener('backButton', ({ canGoBack }) => {
    if (decideBackButtonAction(canGoBack) === 'navigate-back') {
      window.history.back();
      return;
    }
    void App.exitApp();
  });

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: NATIVE_STATUS_BAR_COLOR });
    }
  } catch {
    // شريط الحالة غير متاح على هذه المنصة — تجاهل بصمت.
  }

  await SplashScreen.hide();
}
