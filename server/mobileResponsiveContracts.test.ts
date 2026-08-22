import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'client/src/App.tsx'), 'utf8');
const cssSource = readFileSync(resolve(process.cwd(), 'client/src/index.css'), 'utf8');

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
});
