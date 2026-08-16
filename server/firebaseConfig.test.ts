import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');
const ROOT = resolve(__dirname, '..');

describe('firebaseConfig server module', () => {
  it('loads apiKey and projectId from the client firebase-applet-config.json', async () => {
    const { firebaseConfig } = await import('./firebaseConfig.js');
    const reference = JSON.parse(readFileSync(resolve(ROOT, 'client', 'firebase-applet-config.json'), 'utf8'));

    expect(firebaseConfig.apiKey).toBe(reference.apiKey);
    expect(firebaseConfig.projectId).toBe(reference.projectId);
    expect(firebaseConfig.firestoreDatabaseId).toBe(reference.firestoreDatabaseId);
    expect(typeof firebaseConfig.apiKey).toBe('string');
  });
});

describe('server tree must not import JSON files directly', () => {
  it('contains no static JSON imports in server/ and api/ (Node 22 ESM on Vercel requires with { type: "json" }, so we use fs at runtime)', () => {
    const collect = (directory: string, found: string[] = []): string[] => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const fullPath = join(directory, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules') {
          collect(fullPath, found);
        } else if (/\.(ts|js|mjs)$/.test(entry.name)) {
          const content = readFileSync(fullPath, 'utf8');
          const matches = content.match(/(?:from\s+['"][^'"]*\.json['"]|import\(['"][^'"]*\.json['"])/g) ?? [];
          found.push(...matches.map((match) => `${fullPath}: ${match}`));
        }
      }
      return found;
    };

    const violations = collect(join(ROOT, 'server')).concat(collect(join(ROOT, 'api')));

    expect(violations, `JSON imports found in server code: ${violations.join('; ')}`).toEqual([]);
  });
});
