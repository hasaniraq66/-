export type DataLoadingStage = 'auth' | 'profile' | 'records';

export interface LoadingStageCopy {
  title: string;
  description: string;
  liveMessage: string;
  completedSteps: number;
}

const LOADING_STAGE_COPY: Record<DataLoadingStage, LoadingStageCopy> = {
  auth: {
    title: 'نتحقق من جلستك الآمنة',
    description: 'نجهّز مساحة عملك المالية المحمية.',
    liveMessage: 'جاري التحقق من تسجيل الدخول الآمن.',
    completedSteps: 0,
  },
  profile: {
    title: 'نرتّب إعداداتك',
    description: 'نحمّل الملف الشخصي والصلاحيات المخصصة لك.',
    liveMessage: 'جاري تحميل إعدادات الحساب والصلاحيات.',
    completedSteps: 1,
  },
  records: {
    title: 'نحدّث مركزك المالي',
    description: 'نسترجع الديون والمصروفات والميزانيات ومتابعة المشاريع.',
    liveMessage: 'جاري جلب سجلاتك المالية من الخادم.',
    completedSteps: 2,
  },
};

export function getLoadingStageCopy(stage: DataLoadingStage): LoadingStageCopy {
  return LOADING_STAGE_COPY[stage];
}
