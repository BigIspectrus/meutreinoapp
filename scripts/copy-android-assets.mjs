import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const target = resolve(root, 'android/app/src/main/assets');
const pub = resolve(target, 'public');
rmSync(pub, { recursive:true, force:true });
mkdirSync(target, { recursive:true });
cpSync(resolve(root,'web'), pub, { recursive:true });
writeFileSync(resolve(target,'capacitor.config.json'), JSON.stringify({
  appId:'com.treinoapp.app', appName:'TreinoApp', webDir:'web', server:{androidScheme:'https'}
}, null, 2));
writeFileSync(resolve(target,'capacitor.plugins.json'), JSON.stringify([
  { pkg:'@capacitor/barcode-scanner', classpath:'com.capacitorjs.barcodescanner.CapacitorBarcodeScannerPlugin' }
], null, 2) + '\n');
console.log('Assets web copiados para android/app/src/main/assets/public');
