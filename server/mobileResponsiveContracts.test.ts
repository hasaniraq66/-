import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const appSource = readFileSync(resolve(process.cwd(), 'client/src/App.tsx'), 'utf8');

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
});
