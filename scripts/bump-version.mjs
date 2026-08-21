import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const version = process.argv[2];
const explicitCode = process.argv[3];
if (!/^\d+\.\d+\.\d+$/.test(version || '')) {
  console.error('Uso: node scripts/bump-version.mjs 12.1.0 [versionCode]');
  process.exit(2);
}
const [maj, min, patch] = version.split('.').map(Number);
const versionCode = explicitCode ? Number(explicitCode) : maj * 10000 + min * 100 + patch;
if (!Number.isInteger(versionCode) || versionCode <= 0) throw new Error('versionCode inválido');
const now = new Date();
const build = `${now.getUTCFullYear()}.${String(now.getUTCMonth()+1).padStart(2,'0')}.${String(now.getUTCDate()).padStart(2,'0')}.${Math.max(1, patch+1)}`;

for (const f of ['VERSION', 'web/VERSION']) fs.writeFileSync(path.join(root, f), version + '\n');
for (const f of ['BUILD.json', 'web/BUILD.json']) {
  const p = path.join(root, f); const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  Object.assign(j, { version, versionCode, build, commit:'local-build', deployedAt:null, channel:'source' });
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
}
const pkgPath = path.join(root, 'package.json'); const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')); pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
const lockPath = path.join(root, 'package-lock.json');
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8')); lock.version = version;
  if (lock.packages?.['']) lock.packages[''].version = version;
  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\n');
}
const gradlePath = path.join(root, 'android/app/build.gradle'); let g = fs.readFileSync(gradlePath,'utf8');
g = g.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`).replace(/versionName\s+'[^']+'/, `versionName '${version}'`);
fs.writeFileSync(gradlePath, g);
const indexPath = path.join(root,'web/index.html'); let html = fs.readFileSync(indexPath,'utf8');
html = html.replace(/const APP_VERSION = '[^']+';/, `const APP_VERSION = '${version}';`).replace(/const APP_BUILD = '[^']+';/, `const APP_BUILD = '${build}';`).replace(/const APP_CACHE_VERSION = '[^']+';/, `const APP_CACHE_VERSION = 'treinoapp-v${version}-${build.replace(/\./g,'')}';`);
fs.writeFileSync(indexPath,html);
const swPath = path.join(root,'web/sw.js'); let sw = fs.readFileSync(swPath,'utf8');
sw = sw.replace(/const APP_VERSION = '[^']+';/, `const APP_VERSION = '${version}';`).replace(/const BUILD = '[^']+';/, `const BUILD = '${build}';`);
fs.writeFileSync(swPath,sw);
console.log(`Versão atualizada para ${version} (versionCode ${versionCode}, build ${build}).`);
