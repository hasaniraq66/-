import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const viteConfigSource = readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf8');

describe('production asset optimization', () => {
  it('keeps the Manus runtime and debug collector out of production HTML builds', () => {
    expect(viteConfigSource).toContain("command === 'serve' ? [vitePluginManusRuntime(), vitePluginManusDebugCollector()] : []");
    expect(viteConfigSource).toContain('const DEBUG_COLLECTOR_PATH = path.join(PROJECT_ROOT, "client", "dev-public", "__manus__", "debug-collector.js")');
    expect(viteConfigSource).toContain('publicDir: path.resolve(import.meta.dirname, "client", "public")');
  });
});
