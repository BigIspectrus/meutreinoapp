import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const version = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
const source = JSON.parse(fs.readFileSync(path.join(root, 'BUILD.json'), 'utf8'));
const out = {
  ...source,
  version,
  commit: process.env.GITHUB_SHA || process.env.GIT_SHA || source.commit || 'local-build',
  deployedAt: process.env.DEPLOYED_AT || new Date().toISOString(),
  channel: process.env.BUILD_CHANNEL || source.channel || 'source'
};
fs.writeFileSync(path.join(root, 'web', 'BUILD.json'), JSON.stringify(out, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'web', 'VERSION'), version + '\n');
console.log(`Stamped ${version} ${out.commit.slice(0, 8)} ${out.channel}`);
