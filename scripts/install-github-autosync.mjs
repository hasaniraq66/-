import { execFileSync } from 'node:child_process';
import { chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runGit = (...args) => execFileSync('git', args, { cwd: projectRoot, stdio: 'inherit' });

runGit('config', '--local', 'core.hooksPath', '.githooks');
chmodSync(resolve(projectRoot, '.githooks/post-commit'), 0o755);
console.log('تم تفعيل الدفع التلقائي إلى GitHub بعد كل التزام جديد على main.');
