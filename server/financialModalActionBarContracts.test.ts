import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const debtsSource = readFileSync(resolve(process.cwd(), 'client/src/components/DebtsManager.tsx'), 'utf8');
const previewSource = readFileSync(resolve(process.cwd(), 'client/src/components/ModalExperiencePreview.tsx'), 'utf8');
const cssSource = readFileSync(resolve(process.cwd(), 'client/src/index.css'), 'utf8');

describe('financial form action bar contracts', () => {
  it('keeps add and edit debt forms identifiable without changing their financial logic', () => {
    expect(debtsSource).toContain('id="add-debt-form"');
    expect(debtsSource).toContain('id="edit-debt-form"');
  });

  it('keeps the existing last action row visible inside the scrollable modal on small screens', () => {
    expect(cssSource).toContain('#add-debt-form > div:last-child');
    expect(cssSource).toContain('#edit-debt-form > div:last-child');
    expect(cssSource).toContain('#set-budget-form > div:last-child');
    expect(cssSource).toContain('#add-expense-form > div:last-child');
    expect(cssSource).toContain('#edit-expense-form > div:last-child');
    expect(cssSource).toContain('position: sticky');
    expect(cssSource).toContain('bottom: 0');
    expect(cssSource).toContain('overflow-y: auto');
    expect(cssSource).toContain('box-shadow: 0 -12px 22px');
    expect(cssSource).toContain('env(safe-area-inset-bottom)');
  });

  it('offers a development-only long-form preview without user financial data', () => {
    expect(previewSource).toContain("get('modal-preview') === 'financial-form'");
    expect(previewSource).toContain('لا يتصل هذا النموذج ببياناتك');
    expect(previewSource).toContain('id="add-debt-form"');
  });
});
