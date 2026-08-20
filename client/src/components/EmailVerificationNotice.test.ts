import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import EmailVerificationNotice from './EmailVerificationNotice';

describe('EmailVerificationNotice', () => {
  it('renders the protected verification journey without exposing the full email address', () => {
    const markup = renderToStaticMarkup(createElement(EmailVerificationNotice, {
      email: 'hassan.als@example.com',
      feedback: 'أرسلنا رسالة التأكيد.',
      error: '',
      busyAction: 'idle',
      onResend: vi.fn(),
      onCheckStatus: vi.fn(),
      onBackToLogin: vi.fn(),
    }));

    expect(markup).toContain('افتح رابط التأكيد لإكمال الدخول');
    expect(markup).toContain('تحقق من الحالة');
    expect(markup).toContain('إعادة إرسال الرسالة');
    expect(markup).toContain('ha•••@example.com');
    expect(markup).not.toContain('hassan.als@example.com');
  });
});
