import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'client/src/App.tsx'), 'utf8');
const cssSource = readFileSync(resolve(process.cwd(), 'client/src/index.css'), 'utf8');
const quickEntrySource = readFileSync(resolve(process.cwd(), 'client/src/components/QuickEntry.tsx'), 'utf8');
const debtsSource = readFileSync(resolve(process.cwd(), 'client/src/components/DebtsManager.tsx'), 'utf8');
const projectsSource = readFileSync(resolve(process.cwd(), 'client/src/components/ProjectManager.tsx'), 'utf8');
const dashboardSource = readFileSync(resolve(process.cwd(), 'client/src/components/Dashboard.tsx'), 'utf8');

describe('mobile responsive navigation contracts', () => {
  it('keeps a dedicated mobile bottom navigation with keyboard and touch semantics', () => {
    expect(appSource).toContain('id="mobile-bottom-nav"');
    expect(appSource).toContain('className="md:hidden fixed bottom-0');
    expect(appSource).toContain('aria-label="التنقل السريع للجوال"');
    expect(appSource).toContain('min-h-12');
    expect(appSource).toContain('focus-visible:ring-2');
    expect(appSource).toContain('aria-current={activeTab');
  });

  it('prevents background scrolling while the mobile drawer is open', () => {
    expect(appSource).toContain("document.body.style.overflow = 'hidden'");
    expect(appSource).toContain('document.body.style.overflow = previousOverflow');
  });

  it('keeps the mobile shell inside the viewport and respects safe areas', () => {
    expect(cssSource).toContain('@media (max-width: 767px)');
    expect(cssSource).toContain('min-height: 100dvh');
    expect(cssSource).toContain('overflow-x: clip');
    expect(cssSource).toContain('env(safe-area-inset-bottom)');
    expect(cssSource).toContain('#main-scrollable-content');
    expect(cssSource).toContain('#mobile-bottom-nav');
  });

  it('stacks dense financial form fields on phones while preserving paired desktop layouts', () => {
    expect(quickEntrySource).toContain('grid grid-cols-2 gap-4');
    expect(debtsSource).toContain('id="add-debt-form"');
    expect(debtsSource).toContain('id="edit-debt-form"');
    expect(projectsSource).toContain('id="project-manager-workspace"');
    expect(cssSource).toContain('#quick-entry-form .grid.grid-cols-2');
    expect(cssSource).toContain('#add-debt-form .grid.grid-cols-2');
    expect(cssSource).toContain('#edit-debt-form .grid.grid-cols-2');
    expect(cssSource).toContain('#project-manager-workspace .fixed .grid.grid-cols-2');
    expect(cssSource).toContain('grid-template-columns: minmax(0, 1fr) !important');
  });

  it('keeps mobile project sections and long modals usable without squeezed controls', () => {
    expect(projectsSource).toContain('id="project-section-tabs"');
    expect(projectsSource).toContain('grid grid-cols-2 sm:flex');
    expect(cssSource).toContain('#project-manager-workspace .fixed > .max-w-md');
    expect(cssSource).toContain('max-height: calc(100dvh - 2rem)');
    expect(cssSource).toContain('overscroll-behavior: contain');
  });

  it('keeps the primary dashboard compact without shrinking touch targets below the usable size', () => {
    expect(appSource).toContain('p-3 md:p-5 xl:p-6');
    expect(appSource).toContain('space-y-4');
    expect(dashboardSource).toContain('id="welcome-banner"');
    expect(dashboardSource).toContain('rounded-2xl p-4 md:p-5');
    expect(dashboardSource).toContain('min-h-10 px-4 py-2.5');
    expect(dashboardSource).toContain('id="kpi-cards-grid"');
    expect(dashboardSource).toContain('grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3');
    expect(quickEntrySource).toContain('id="quick-entry-card"');
    expect(quickEntrySource).toContain('p-4 rounded-2xl');
    expect(quickEntrySource).toContain('min-h-10 py-2 rounded-xl');
    expect(quickEntrySource).toContain('w-full min-h-11 py-3.5');
  });

  it('prevents the mobile welcome card from expanding into an empty visual block', () => {
    expect(dashboardSource).toContain('id="welcome-banner"');
    expect(dashboardSource).toContain('welcome-banner-copy');
    expect(dashboardSource).toContain('welcome-banner-actions');
    expect(cssSource).toContain('#welcome-banner {');
    expect(cssSource).toContain('min-height: 0 !important');
    expect(cssSource).toContain('height: auto !important');
    expect(cssSource).toContain('display: contents');
    expect(cssSource).toContain('#welcome-banner .welcome-banner-copy');
    expect(cssSource).toContain('#welcome-banner .welcome-banner-ambient');
    expect(cssSource).toContain('#welcome-banner .welcome-banner-description');
    expect(cssSource).toContain('display: none');
    expect(cssSource).toContain('min-height: calc(3.75rem + env(safe-area-inset-bottom))');
  });
});
