import { describe, expect, it } from 'vitest';
import { decideBackButtonAction } from './native';

describe('decideBackButtonAction', () => {
  it('يرجع خطوة في سجل التنقل ما دام هناك شاشة سابقة', () => {
    expect(decideBackButtonAction(true)).toBe('navigate-back');
  });

  it('يخرج من التطبيق من الشاشة الجذرية فقط', () => {
    expect(decideBackButtonAction(false)).toBe('exit-app');
  });
});
