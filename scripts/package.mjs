import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rename, rmdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
await mkdir(path.join(root, 'releases'), { recursive: true });
for (const browser of ['firefox', 'chromium']) {
  const filename = `qr-extension-super-intelligent-${browser}-${version}-unsigniert.zip`;
  const temporary = await mkdtemp(path.join(root, 'releases', '.package-'));
  const archive = path.join(temporary, filename);
  const result = spawnSync('zip', ['-q', '-r', archive, '.'], { cwd: path.join(root, 'build', browser), stdio: 'inherit' });
  if (result.error || result.status !== 0) throw new Error(`Paketierung für ${browser} fehlgeschlagen.`);
  await rename(archive, path.join(root, 'releases', filename));
  await rmdir(temporary);
  console.log(`Erstellt: releases/${filename}`);
}
