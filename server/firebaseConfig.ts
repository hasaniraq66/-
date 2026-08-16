import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Node 22 ESM on Vercel requires `with { type: "json" }` for JSON imports;
// to stay portable across bundlers we load the JSON at runtime with fs instead.
let cachedConfig: Record<string, string> | null = null;

export function loadFirebaseConfig(): Record<string, string> {
  if (cachedConfig) return cachedConfig;
  const jsonPath = resolve(__dirname, '..', 'client', 'firebase-applet-config.json');
  const raw = readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw) as Record<string, string>;
  cachedConfig = parsed;
  return parsed;
}

export const firebaseConfig: Record<string, string> = loadFirebaseConfig();
