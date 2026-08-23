import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'client/src/App.tsx'), 'utf8');
const dashboardSource = readFileSync(resolve(process.cwd(), 'client/src/components/Dashboard.tsx'), 'utf8');
const dashboardAnalyticsSource = readFileSync(resolve(process.cwd(), 'client/src/components/DashboardAnalytics.tsx'), 'utf8');
const debtsSource = readFileSync(resolve(process.cwd(), 'client/src/components/DebtsManager.tsx'), 'utf8');

describe('financial screen data-state contracts', () => {
  it('keeps the application-level loading experience while protected collections are fetched', () => {
    expect(appSource).toContain('AppDataLoadingExperience');
    expect(appSource).toContain('return <AppDataLoadingExperience stage={loadingStage} />');
  });

  it('keeps meaningful empty states for dashboard financial summaries', () => {
    expect(dashboardSource).toContain('لا توجد مشاريع عمل مسجلة حتى الآن.');
    expect(dashboardAnalyticsSource).toContain('لا توجد بيانات ديون مسجلة بعد لعرض المخطط البياني.');
    expect(dashboardAnalyticsSource).toContain('لا توجد مصاريف للشهر الحالي');
    expect(dashboardSource).toContain('لا توجد نشاطات مسجلة حتى الآن.');
  });

  it('keeps separate empty and no-results recovery states in the debt ledger', () => {
    expect(debtsSource).toContain('لا توجد حسابات ديون مسجلة بعد');
    expect(debtsSource).toContain('لا توجد حسابات تطابق البحث أو المرشحات الحالية');
    expect(debtsSource).toContain('لا توجد حركات مسجلة حالياً بهذا التصنيف.');
  });
});
