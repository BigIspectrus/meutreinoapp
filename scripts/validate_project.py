#!/usr/bin/env python3
from pathlib import Path
import json, re, subprocess, tempfile, sys, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
errors=[]
def ok(cond,msg):
    if not cond: errors.append(msg)

def read(rel): return (ROOT/rel).read_text(encoding='utf-8')
version=read('VERSION').strip()
build=json.loads(read('BUILD.json'))
webbuild=json.loads(read('web/BUILD.json'))
pkg=json.loads(read('package.json'))
gradle=read('android/app/build.gradle')
manifest=read('android/app/src/main/AndroidManifest.xml')
html=read('web/index.html')

ok(version=='12.0.0' or re.match(r'^\d+\.\d+\.\d+$',version), 'VERSION inválido')
ok(build.get('version')==version, 'BUILD.json diverge do VERSION')
ok(webbuild.get('version')==version, 'web/BUILD.json diverge do VERSION')
ok(pkg.get('version')==version, 'package.json diverge do VERSION')
ok(f"versionName '{version}'" in gradle, 'Gradle versionName diverge do VERSION')
ok("applicationId 'com.treinoapp.app'" in gradle, 'Stable applicationId ausente')
ok("applicationId 'com.treinoapp.beta'" in gradle, 'Beta applicationId ausente')
ok('compileSdk 36' in gradle and 'targetSdk 36' in gradle and 'minSdk 24' in gradle, 'SDKs Android incorretos')
ok('fallbackToDestructiveMigration' not in '\n'.join(p.read_text(errors='ignore') for p in (ROOT/'android/app/src/main/java').rglob('*.kt')), 'Migração destrutiva proibida')
for token in ['FOREGROUND_SERVICE_HEALTH','ACTIVITY_RECOGNITION','POST_NOTIFICATIONS','READ_EXERCISE','READ_HEART_RATE','READ_TOTAL_CALORIES_BURNED','READ_HEALTH_DATA_IN_BACKGROUND']:
    ok(token in manifest, f'Permissão/declaração Android ausente: {token}')
for token in ['WorkoutForegroundService','TreinoAppWidgetProvider','HealthPermissionsRationaleActivity']:
    ok(token in manifest, f'Componente Android ausente: {token}')
ok('android:dataExtractionRules="@xml/data_extraction_rules"' in manifest, 'Regras de backup Android ausentes')

# XML bem-formado
for p in (ROOT/'android/app/src/main/res').rglob('*.xml'):
    try: ET.parse(p)
    except Exception as e: errors.append(f'XML inválido {p.relative_to(ROOT)}: {e}')
try: ET.parse(ROOT/'android/app/src/main/AndroidManifest.xml')
except Exception as e: errors.append(f'AndroidManifest.xml inválido: {e}')

# IDs HTML duplicados
ids=re.findall(r'\bid=["\']([^"\']+)',html)
dups=sorted({x for x in ids if ids.count(x)>1})
ok(not dups, 'IDs HTML duplicados: '+', '.join(dups[:20]))

# Tipos de série obrigatórios
for st in ['workset','warmup','topset','backoff','dropset','cluster','fst7','restpause','myoreps','amrap']:
    ok(re.search(rf"\b{re.escape(st)}\s*:",html) is not None, f'Tipo de série ausente: {st}')

# APK/PWA offline: scripts principais precisam apontar para vendor local
for src in ['./vendor/chart.umd.js','./vendor/jspdf.umd.min.js','./vendor/qrcode.min.js']:
    ok(src in html, f'Biblioteca local não referenciada: {src}')
ok('fonts.googleapis.com' not in html, 'Google Fonts remoto ainda presente')

# JS inline deve ter sintaxe válida. Remove script externo e testa blocos sem type JSON.
scripts=[]
for m in re.finditer(r'<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>',html,re.S|re.I):
    if 'src=' in m.group('attrs').lower(): continue
    body=m.group('body')
    if body.strip(): scripts.append(body)
if scripts:
    with tempfile.NamedTemporaryFile('w',suffix='.js',delete=False,encoding='utf-8') as f:
        f.write('\n'.join(scripts)); tmp=f.name
    r=subprocess.run(['node','--check',tmp],capture_output=True,text=True)
    ok(r.returncode==0,'JavaScript do index inválido: '+(r.stderr.strip()[-1000:] if r.stderr else 'erro desconhecido'))

# Handler inline: apenas funções nomeadas simples; métodos/expressões complexos ficam fora.
handlers=set(re.findall(r'\bon(?:click|change|input|submit)=["\']\s*([A-Za-z_$][\w$]*)\s*\(',html))
functions=set(re.findall(r'\bfunction\s+([A-Za-z_$][\w$]*)\s*\(',html)) | set(re.findall(r'\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(',html))
missing=sorted(h for h in handlers if h not in functions and h not in {'prompt','confirm','alert'})
ok(not missing,'Handlers sem função declarada: '+', '.join(missing[:30]))

# Arquitetura nativa mínima
kt='\n'.join(p.read_text(encoding='utf-8') for p in (ROOT/'android/app/src/main/java').rglob('*.kt'))
for token in ['PARTIAL_WAKE_LOCK','FOREGROUND_SERVICE_TYPE_HEALTH','HealthConnectRepository','PeriodicWorkRequestBuilder','Room.databaseBuilder','com.treinoapp.beta']:
    ok(token in kt or token in gradle, f'Recurso nativo esperado ausente: {token}')
ok('replaceAllLegacy' in kt, 'Sincronização do histórico legado ausente')

if errors:
    print('VALIDAÇÃO FALHOU')
    for e in errors: print(' -',e)
    sys.exit(1)
print(f'OK TreinoApp v{version}: estrutura Web + Android validada.')
