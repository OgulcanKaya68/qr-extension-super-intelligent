import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/playwright/cli.js'), 'install', 'chromium', 'firefox'], {
  cwd: root, stdio: 'inherit', env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: path.join(root, '.browser-cache') },
});
if (result.error) { console.error('Testbrowser konnten nicht installiert werden:', result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
