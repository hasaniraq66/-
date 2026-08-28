import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'client/src/App.tsx'), 'utf8');
const dashboardSource = readFileSync(resolve(process.cwd(), 'client/src/components/Dashboard.tsx'), 'utf8');
const confirmSource = readFileSync(resolve(process.cwd(), 'client/src/components/ConfirmModal.tsx'), 'utf8');
const previewSource = readFileSync(resolve(process.cwd(), 'client/src/components/ModalExperiencePreview.tsx'), 'utf8');
const cssSource = readFileSync(resolve(process.cwd(), 'client/src/index.css'), 'utf8');

describe('professional modal experience contracts', () => {
  it('uses the shared overlay and modal surface in key settings, confirmation, and capital flows', () => {
    expect(appSource).toContain('app-modal-overlay');
    expect(appSource).toContain('app-modal-surface');
    expect(dashboardSource).toContain('app-modal-overlay');
    expect(dashboardSource).toContain('app-modal-surface');
    expect(confirmSource).toContain('app-modal-overlay');
    expect(confirmSource).toContain('app-modal-surface');
  });

  it('keeps confirmation dialogs accessible and dismissible from the backdrop', () => {
    expect(confirmSource).toContain('role="dialog"');
    expect(confirmSource).toContain('aria-modal="true"');
    expect(confirmSource).toContain('aria-labelledby="confirm-modal-title"');
    expect(confirmSource).toContain('aria-label="إغلاق نافذة التأكيد"');
    expect(confirmSource).toContain('event.target === event.currentTarget');
  });

  it('turns standard data-entry modals into mobile sheets with reduced-motion support', () => {
    expect(cssSource).toContain('#add-debt-modal');
    expect(cssSource).toContain('align-items: flex-end');
    expect(cssSource).toContain('border-bottom-right-radius: 0');
    expect(cssSource).toContain('@media (prefers-reduced-motion: reduce)');
    expect(cssSource).toContain('modal-surface-in');
    expect(cssSource).toContain('.app-modal-surface::before');
  });

  it('keeps a development-only modal preview isolated from user financial data', () => {
    expect(appSource).toContain("financialUiReviewMode === 'modal-experience'");
    expect(appSource).toContain("lazy(() => import('./components/ModalExperiencePreview'))");
    expect(previewSource).toContain('معاينة تطويرية معزولة');
    expect(previewSource).toContain('<ConfirmModal');
    expect(previewSource).toContain('لا تتصل بالبيانات');
  });
});
