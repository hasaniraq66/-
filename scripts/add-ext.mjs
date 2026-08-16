import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

// الاستيرادات النسبية التي يجب إضافة .js لها لتوافق Node ESM على Vercel.
async function collectTsFiles(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
      files.push(...(await collectTsFiles(full)));
    } else if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

function addJsExtension(source) {
  // استيراد نسبي: ./x أو ../x بدون امتداد، أو import("...") ديناميكي
  return source.replace(
    /(from\s+["']|\bimport\(\s*["'])(\.\.\/[A-Za-z0-9_\-/]+|\.\/[A-Za-z0-9_\-/]+)(["'])/g,
    (match, pre, path, post) => {
      if (/(\.(js|ts|mjs|json|css)|\.d)$/.test(path)) return match;
      return `${pre}${path}.js${post}`;
    },
  );
}

let changed = 0;
for (const dir of ["server", "api"]) {
  const files = await collectTsFiles(join(ROOT, dir));
  for (const file of files) {
    const src = await readFile(file, "utf8");
    const next = addJsExtension(src);
    if (next !== src) {
      await writeFile(file, next);
      changed++;
      console.log("patched:", file.replace(ROOT, ""));
    }
  }
}
console.log("total patched:", changed);
