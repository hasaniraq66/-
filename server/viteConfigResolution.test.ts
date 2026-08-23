import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viteServerSource = readFileSync(resolve(process.cwd(), 'server/_core/vite.ts'), 'utf8');

describe('dynamic Vite configuration support', () => {
  it('resolves the Vite config factory in serve mode before creating the middleware server', () => {
    expect(viteServerSource).toContain('const resolvedViteConfig = typeof viteConfig === "function" ? viteConfig(configEnv) : viteConfig;');
    expect(viteServerSource).toContain('...resolvedViteConfig');
  });
});
