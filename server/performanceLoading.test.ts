import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dashboardSource = readFileSync(resolve(process.cwd(), 'client/src/components/Dashboard.tsx'), 'utf8');
const analyticsSource = readFileSync(resolve(process.cwd(), 'client/src/components/DashboardAnalytics.tsx'), 'utf8');
const appSource = readFileSync(resolve(process.cwd(), 'client/src/App.tsx'), 'utf8');

describe('dashboard performance loading boundary', () => {
  it('defers the charting module until the user requests analytics', () => {
    expect(dashboardSource).toContain("lazy(() => import('./DashboardAnalytics'))");
    expect(dashboardSource).toContain('id="load-dashboard-analytics"');
    expect(dashboardSource).toContain('<DeferredDashboardAnalytics');
    expect(dashboardSource).not.toContain("from 'recharts'");
    expect(dashboardSource).not.toContain("from './CashFlowChart'");
    expect(dashboardSource).not.toContain("from './BudgetBurndownChart'");
  });

  it('keeps all charting dependencies behind the deferred analytics boundary', () => {
    expect(analyticsSource).toContain("from 'recharts'");
    expect(analyticsSource).toContain("from './CashFlowChart'");
    expect(analyticsSource).toContain("from './BudgetBurndownChart'");
  });

  it('keeps non-default financial screens out of the initial application import path', () => {
    expect(appSource).toContain("lazy(() => import('./components/DebtsManager'))");
    expect(appSource).toContain("lazy(() => import('./components/BudgetManager'))");
    expect(appSource).toContain("lazy(() => import('./components/AlertsPanel'))");
    expect(appSource).toContain("lazy(() => import('./components/FinancialUiReviewPreview'))");
    expect(appSource).not.toContain("import DebtsManager from './components/DebtsManager'");
    expect(appSource).not.toContain("import BudgetManager from './components/BudgetManager'");
    expect(appSource).not.toContain("import AlertsPanel from './components/AlertsPanel'");
  });
});
