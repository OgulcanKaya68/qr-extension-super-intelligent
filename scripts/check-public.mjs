import { readFile, readdir, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ignored = new Set(['.git', 'node_modules', '.browser-cache', 'build', 'releases', 'test-results', 'belege', '.local', 'PRUEFBERICHT.md']);
const forbidden = [
  [/\/(?:Users|home)\/[a-zA-Z0-9_.-]+\//, 'persönlicher Homepfad'],
  [/\/private\/tmp\//, 'lokaler Testpfad'],
  [/Ogulcan\s+Kaya/, 'persönlicher Name statt öffentlichem Handle'],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, 'privater Schlüssel'],
  [/(?:ghp|gho|ghu|ghs|github_pat)_[a-zA-Z0-9_]{20,}/, 'mögliches GitHub-Zugriffstoken'],
  [/AKIA[A-Z0-9]{16}/, 'möglicher Zugriffsschlüssel'],
];
const problems = [];
const publicFiles = [];
async function walk(directory) {
  for (const entry of await readdir(path.join(root, directory), { withFileTypes: true })) {
    if (!directory && ignored.has(entry.name)) continue;
    const relative = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) { problems.push(`${relative}: Symlink im öffentlichen Bestand`); continue; }
    if (entry.isDirectory()) await walk(relative);
    else {
      publicFiles.push(relative);
      if (/\.(png|jpe?g|webp)$/i.test(entry.name)) continue;
      const source = await readFile(path.join(root, relative), 'utf8');
      for (const [pattern, label] of forbidden) if (pattern.test(source)) problems.push(`${relative}: ${label}`);
      if (/\.md$/i.test(entry.name)) {
        for (const match of source.matchAll(/\[[^\]]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)) {
          const target = match[1].replace(/^<|>$/g, '').split('#')[0];
          if (!target || /^[a-z]+:/i.test(target)) continue;
          const resolved = path.resolve(root, directory, decodeURIComponent(target));
          const relativeTarget = path.relative(root, resolved);
          if (relativeTarget.startsWith('..') || ignored.has(relativeTarget.split(path.sep)[0])) {
            problems.push(`${relative}: Link auf nicht veröffentlichten Bestand ${target}`);
            continue;
          }
          try { await stat(resolved); }
          catch { problems.push(`${relative}: fehlender lokaler Link ${target}`); }
        }
      }
    }
  }
}
await walk('');
try {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).split('\0').filter(Boolean);
  for (const file of tracked) if (ignored.has(file.split('/')[0])) problems.push(`${file}: interner oder erzeugter Bestand wird von Git verfolgt`);
} catch (error) {
  if (error.status !== 128) throw error;
}
for (const browser of ['firefox', 'chromium']) {
  const manifestPath = path.join(root, 'build', browser, 'manifest.json');
  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const expected = ['activeTab', 'clipboardWrite', 'scripting', 'storage'].sort();
    if (JSON.stringify([...manifest.permissions].sort()) !== JSON.stringify(expected) || manifest.host_permissions?.length || manifest.optional_host_permissions?.length) problems.push(`${browser}: unerwartete Browserberechtigung`);
    const bundle = await readFile(path.join(root, 'build', browser, 'popup.js'), 'utf8');
    for (const [pattern, label] of forbidden) if (pattern.test(bundle)) problems.push(`${browser}/popup.js: ${label}`);
    if (/\.clipboard\.(read|readText)\s*\(/.test(bundle)) problems.push(`${browser}: Zwischenablage wird gelesen`);
  } catch (error) {
    if (error.code === 'ENOENT') problems.push(`${browser}: zuerst npm run build ausführen`);
    else throw error;
  }
}
if (problems.length) {
  for (const problem of [...new Set(problems)]) console.error(problem);
  process.exitCode = 1;
} else console.log(`Öffentlicher Bestand geprüft: ${publicFiles.length} Dateien, keine privaten Pfade oder üblichen Schlüssel-/Tokenmuster; Berechtigungen geprüft.`);
