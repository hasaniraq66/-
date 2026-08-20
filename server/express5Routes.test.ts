import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();

describe('Express 5 route compatibility', () => {
  it('does not use anonymous wildcard path patterns that Express 5 rejects at startup', () => {
    const storageProxy = fs.readFileSync(path.join(projectRoot, 'server/_core/storageProxy.ts'), 'utf8');
    const viteBridge = fs.readFileSync(path.join(projectRoot, 'server/_core/vite.ts'), 'utf8');

    expect(storageProxy).toContain('"/manus-storage/*splat"');
    expect(storageProxy).not.toContain('"/manus-storage/*"');
    expect(viteBridge).not.toContain('app.use("*"');
  });
});
