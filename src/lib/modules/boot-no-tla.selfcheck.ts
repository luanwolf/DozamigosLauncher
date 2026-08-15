/**
 * Boot-critical modules must not use top-level await — it breaks SvelteKit client
 * boot with "Cannot access 'component' before initialization".
 *
 * Run: bun src/lib/modules/boot-no-tla.selfcheck.ts
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const roots = [
  'src/lib/http.ts',
  'src/lib/i18n.ts',
  'src/lib/storage',
  'src/lib/constants/sidebar.ts',
  'src/lib/modules/taxi-service.ts',
  'src/lib/modules/safe-platform.ts',
  'src/routes/+layout.ts'
];

function collect(path: string): string[] {
  try {
    const st = readdirSync(path, { withFileTypes: true });
    return st.flatMap((e) => {
      const p = join(path, e.name);
      if (e.isDirectory()) return collect(p);
      return e.name.endsWith('.ts') || e.name.endsWith('.js') ? [p] : [];
    });
  } catch {
    return [path];
  }
}

const files = roots.flatMap(collect);
const bad: string[] = [];

for (const file of files) {
  if (file.includes('.selfcheck.')) continue;
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  let depth = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const open = (line.match(/[{(/]/g) || []).length;
    const close = (line.match(/[})]/g) || []).length;
    // Rough brace depth — enough to catch module-scope `await`.
    const atModule = depth === 0;
    if (atModule && /^\s*await\s/.test(line)) {
      bad.push(`${file}:${i + 1}: ${line.trim()}`);
    }
    if (atModule && /^\s*(export\s+)?(const|let)\s+[^=]+=\s*await\s/.test(line)) {
      bad.push(`${file}:${i + 1}: ${line.trim()}`);
    }
    depth += open - close;
    if (depth < 0) depth = 0;
  }
}

if (bad.length) {
  console.error('boot-no-tla.selfcheck FAILED:\n' + bad.join('\n'));
  process.exit(1);
}

console.log(`boot-no-tla.selfcheck: ok (${files.length} files)`);
