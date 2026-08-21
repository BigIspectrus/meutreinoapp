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
lock=json.loads(read('package-lock.json')) if (ROOT/'package-lock.json').exists() else None
gradle=read('android/app/build.gradle')
manifest=read('android/app/src/main/AndroidManifest.xml')
html=read('web/index.html')
sw=read('web/sw.js')

ok(re.match(r'^\d+\.\d+\.\d+$',version) is not None, 'VERSION inválido')
ok(build.get('version')==version, 'BUILD.json diverge do VERSION')
ok(webbuild.get('version')==version, 'web/BUILD.json diverge do VERSION')
ok(pkg.get('version')==version, 'package.json diverge do VERSION')
ok(lock is None or (lock.get('version')==version and lock.get('packages',{}).get('',{}).get('version')==version), 'package-lock.json diverge do VERSION')
ok(f"versionName '{version}'" in gradle, 'Gradle versionName diverge do VERSION')
ok(f"const APP_VERSION = '{version}';" in html, 'index.html diverge do VERSION')
ok(f"const APP_VERSION = '{version}';" in sw, 'Service Worker diverge do VERSION')
ok("applicationId 'com.treinoapp.app'" in gradle, 'Stable applicationId ausente')
ok("applicationId 'com.treinoapp.beta'" in gradle, 'Beta applicationId ausente')
ok('compileSdk 36' in gradle and 'targetSdk 36' in gradle and 'minSdk 26' in gradle, 'SDKs Android incorretos')
ok('fallbackToDestructiveMigration' not in '\n'.join(p.read_text(errors='ignore') for p in (ROOT/'android/app/src/main/java').rglob('*.kt')), 'Migração destrutiva proibida')
for token in ['FOREGROUND_SERVICE_HEALTH','ACTIVITY_RECOGNITION','POST_NOTIFICATIONS','READ_EXERCISE','READ_HEART_RATE','READ_TOTAL_CALORIES_BURNED','READ_HEALTH_DATA_IN_BACKGROUND','READ_SLEEP','READ_RESTING_HEART_RATE','READ_HEART_RATE_VARIABILITY','READ_BODY_FAT','READ_LEAN_BODY_MASS']:
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


# Integração Health avançada / v12.1
plugin=read('android/app/src/main/java/com/treinoapp/app/nativebridge/TreinoNativePlugin.kt')
repo=read('android/app/src/main/java/com/treinoapp/app/nativebridge/HealthConnectRepository.kt')
dbkt=read('android/app/src/main/java/com/treinoapp/app/data/TreinoDatabase.kt')
for bad in ['call.getDouble("startMs"','call.getDouble("endMs"','call.getDouble("startedAt"','call.getDouble("targetStartMs"','call.getDouble("targetEndMs"']:
    ok(bad not in plugin, 'Timestamp ainda lido via getDouble no bridge: '+bad)
for token in ['longArgOrNull','getHealthExerciseDetail','heartRateSamples','heartRateSampleCount']:
    ok(token in plugin, f'Bridge Health avançado ausente: {token}')
for token in ['HeartRatePoint','readDetailedMetrics','BPM_MIN','heartRateSamples','getExerciseDetail']:
    ok(token in repo, f'Leitura Health detalhada ausente: {token}')
ok('version = 4' in dbkt and all(x in dbkt for x in ['MIGRATION_1_2','MIGRATION_2_3','MIGRATION_3_4']) and '.addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_3_4)' in dbkt, 'Migrações Room 1->2->3->4 ausentes')
for token in ['modalDetalhesSessao','abrirDetalhesTreino','compartilharSessaoDetalhada','renderHealthPerformance','healthPerformanceChart','calcularZonasFc','calcularFcPorExercicio','normalizarAmostrasHealth','healthRelHtml','Galaxy Watch / Health Connect']:
    ok(token in html, f'UI de detalhes/performance/relatório ausente: {token}')
ok('healthLinksV12:localStorage.getItem' in html, 'Backup não inclui vínculos Health')
ok('DATA_SCHEMA_VERSION = 15' in html or 'DATA_SCHEMA_VERSION=15' in html, 'Schema web v15 esperado para contexto e horários precisos')

# Fundação v12.4
for token in ['modalContextoSessao','sessionRpe','sessionContext','setStartedAt','restBeforeSec','iniciarSeriePrecisao','selRestVibration','configureRestAlerts','openNotificationSettings']:
    ok(token in html or token in plugin or token in read('src/native-bridge.js'), f'Recurso v12.4.0 ausente: {token}')
service=read('android/app/src/main/java/com/treinoapp/app/nativebridge/WorkoutForegroundService.kt')
for token in ['setLocalOnly(false)','WearableExtender','KEY_REST_VIBRATION','KEY_REST_SOUND','createRestAlertChannel']:
    ok(token in service, f'Aviso Android/relógio v12.4.0 ausente: {token}')

# Feedback personalizado e correção Wear OS / v12.4.1
for token in ['gerarAnaliseSessaoV1241','basesComparaveisV1241','fadigaIntraSessaoV1241','smart-insight-card','smart-technical','testarAvisoGalaxyWatch']:
    ok(token in html, f'Recurso v12.4.1 ausente: {token}')
for token in ['NotificationManagerCompat','setBridgeTag','ACTION_TEST_REST_ALERT','treinoapp_rest_v3_']:
    ok(token in service, f'Correção Wear OS v12.4.1 ausente: {token}')
ok('testRestAlert' in plugin and 'testRestAlert' in read('src/native-bridge.js'), 'Teste nativo de aviso para relógio ausente')

# Início de série pelo Galaxy Watch / v12.4.2
for token in ['testarBotaoGalaxyWatch','aplicarInicioSeriePrecisao','localizarSeriePendenteNativa','pendingSetStartedAt','acknowledgeSetStart','nextOrdinal']:
    ok(token in html or token in plugin or token in read('src/native-bridge.js'), f'Recurso v12.4.2 ausente: {token}')
for token in ['ACTION_START_NEXT_SET','ACTION_TEST_WATCH_SET_ALERT','KEY_PENDING_SET_STARTED_AT','KEY_NEXT_TOKEN','targetPendingIntent','addAction','WATCH_CONFIRMATION_NOTIFICATION_ID']:
    ok(token in service, f'Ação Wear OS v12.4.2 ausente: {token}')
ok('testWatchSetAction' in plugin and 'testWatchSetAction' in read('src/native-bridge.js'), 'Teste nativo do botão do relógio ausente')

# Interface focada / v12.3
for token in ['serie-compact-trigger','atualizarFocoSeries','data-settings-group','dashboardSecondary','selEffortMode','Evolução &amp; Health']:
    ok(token in html, f'Recurso v12.3 ausente: {token}')
ok('exerciseCardsHeight' in html and 'H=Math.max(1350' in html, 'Imagem compartilhada não usa altura dinâmica')
ok('Object.entries(exs).slice(0,7)' not in html, 'Imagem compartilhada ainda limita a quantidade de exercícios')

# Performance & Recovery / v12.2
for token in ['getRecoverySnapshot','SleepSessionRecord','RestingHeartRateRecord','HeartRateVariabilityRmssdRecord','BodyFatRecord','LeanBodyMassRecord']:
    ok(token in repo or token in plugin, f'Recurso Recovery Health ausente: {token}')
for token in ['ativo-rir','ativo-rpe','calcularRecuperacaoSeries','setMarkersV122','calcularPrsAvancadosDaSessao','calcularSugestaoProgressaoExercicio','sub-recovery','sub-agenda','weeklyPlanV12','renderizarAgendaMensal','modalExerciseInsights']:
    ok(token in html, f'Recurso v12.2 ausente: {token}')
ok('rir' in read('android/app/src/main/java/com/treinoapp/app/data/NativeEntities.kt') and 'rpe' in read('android/app/src/main/java/com/treinoapp/app/data/NativeEntities.kt'), 'Room não persiste RIR/RPE')
ok("onclick='abrirDetalhesTreino(${jsArg(sessionKey)})'" in html, 'Botão Detalhes ainda pode quebrar por aspas no HTML dinâmico')

if errors:
    print('VALIDAÇÃO FALHOU')
    for e in errors: print(' -',e)
    sys.exit(1)
print(f'OK TreinoApp v{version}: estrutura Web + Android validada.')
