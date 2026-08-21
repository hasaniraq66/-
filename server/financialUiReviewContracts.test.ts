import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(new URL('../client/src/App.tsx', import.meta.url), 'utf8');
const previewSource = readFileSync(new URL('../client/src/components/FinancialUiReviewPreview.tsx', import.meta.url), 'utf8');
const debtsSource = readFileSync(new URL('../client/src/components/DebtsManager.tsx', import.meta.url), 'utf8');
const loadErrorSource = readFileSync(new URL('../client/src/components/FinancialDataLoadErrorNotice.tsx', import.meta.url), 'utf8');

describe('financial UI review and recovery contracts', () => {
  it('keeps the development-only empty-state review inaccessible in production', () => {
    expect(appSource).toContain("const financialUiReviewMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('ui-review') : null;");
    expect(previewSource).toContain('لا تتصل بـ Firebase ولا تحفظ أي سجل');
    expect(previewSource).toContain('<Dashboard debts={[]}');
    expect(previewSource).toContain('<DebtsManager debts={[]}');
    expect(previewSource).toContain("get('review-tab') === 'debts'");
    expect(debtsSource).toContain('placeholder="ابحث: اسم، وصف أو رقم DBT"');
    expect(appSource).toContain("financialUiReviewMode === 'financial-error'");
    expect(appSource).toContain('<FinancialDataLoadErrorNotice message="تعذر تحديث البيانات المالية من السحابة."');
  });

  it('shows a recoverable data-load error instead of silently leaving financial pages empty', () => {
    expect(appSource).toContain('const [dataLoadError, setDataLoadError] = useState<string | null>(null);');
    expect(appSource).toContain("setDataLoadError('تعذر تحديث البيانات المالية من السحابة.');");
    expect(appSource).toContain('<FinancialDataLoadErrorNotice message={dataLoadError} onRetry={() => window.location.reload()} />');
    expect(loadErrorSource).toContain('id="financial-data-load-error"');
    expect(loadErrorSource).toContain('onClick={onRetry}');
  });
});
