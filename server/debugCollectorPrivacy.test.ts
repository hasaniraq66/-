import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('debug collector privacy contract', () => {
  it('redacts authentication parameters, headers and bodies before retaining network telemetry', () => {
    const collector = readFileSync(
      resolve(process.cwd(), 'client/public/__manus__/debug-collector.js'),
      'utf8',
    );

    expect(collector).toContain('function sanitizeUrl(url)');
    expect(collector).toContain('function redactSensitiveString(value)');
    expect(collector).toContain('function sanitizeHeaders(headers)');
    expect(collector).toContain('"id_token"');
    expect(collector).toContain('"refresh_token"');
    expect(collector).toContain('url: sanitizeUrl(url)');
    expect(collector).toContain('requestHeaders = sanitizeHeaders(Object.fromEntries(new Headers(init.headers).entries()))');
    expect(collector).toContain('XMLHttpRequest.prototype.setRequestHeader');
    expect(collector).toContain('url: sanitizeUrl(xhr._manusData.url)');
  });
});
