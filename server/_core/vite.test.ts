import { describe, expect, it } from 'vitest';
import { injectReactDevelopmentPreamble, REACT_DEVELOPMENT_PREAMBLE } from './vite.js';

describe('Vite React preamble', () => {
  const template = '<!doctype html><html><head><title>اختبار</title></head><body><div id="root"></div></body></html>';

  it('injects the React preamble before the development entry point can run', () => {
    const rendered = injectReactDevelopmentPreamble(template, true);
    expect(rendered).toContain(REACT_DEVELOPMENT_PREAMBLE);
    expect(rendered.indexOf('__vite_plugin_react_preamble_installed__')).toBeLessThan(rendered.indexOf('</head>'));
  });

  it('does not add an inline preamble to production HTML', () => {
    expect(injectReactDevelopmentPreamble(template, false)).toBe(template);
  });
});
