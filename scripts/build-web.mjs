import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSync } from 'esbuild';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const web = resolve(root, 'web');
const vendor = resolve(web, 'vendor');
mkdirSync(vendor, { recursive: true });

buildSync({
  entryPoints:[resolve(root, 'src/native-bridge.js')],
  bundle:true,
  format:'iife',
  target:'es2020',
  outfile:resolve(web, 'native-bridge.js'),
  minify:true,
  logLevel:'info'
});

const vendors = [
  [resolve(root,'node_modules/chart.js/dist/chart.umd.js'), resolve(vendor,'chart.umd.js')],
  [resolve(root,'node_modules/jspdf/dist/jspdf.umd.min.js'), resolve(vendor,'jspdf.umd.min.js')],
  [resolve(root,'node_modules/qrcode-generator/qrcode.js'), resolve(vendor,'qrcode.min.js')],
];
for (const [src,dst] of vendors) copyFileSync(src,dst);

const v = readFileSync(resolve(root, 'VERSION'), 'utf8').trim();
writeFileSync(resolve(web, 'VERSION'), v + '\n');
copyFileSync(resolve(root, 'BUILD.json'), resolve(web, 'BUILD.json'));
console.log(`Web preparado: TreinoApp ${v} com dependências locais/offline.`);
