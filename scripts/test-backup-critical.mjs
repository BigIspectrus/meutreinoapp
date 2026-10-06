import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
function source(name){const start=html.lastIndexOf('function '+name+'('),after=html.slice(start+1).search(/\n(?:async )?function /);assert.ok(start>=0&&after>=0,name);return (html.slice(start-6,start)==='async '?'async ':'')+html.slice(start,start+1+after);}
const prefs={days:90,kind:'stationary',activityMetric:'cardioKcal',routineMetric:'macros',exerciseMetric:'peso',exercise:'Supino',exerciseGroup:''};
const original=new Map([
  ['historicoTreinoV3',JSON.stringify([{id:'set',date:'2026-10-05',exercicio:'Supino',rir:0,rpe:null}])],
  ['pesoCorporal','{"2026-10-05":80}'],['nutritionGoalsV125','{"kcal":2222,"protein":150}'],
  ['nutritionEntriesV125','[{"id":"meal","date":"2026-10-05","kcal":400}]'],
  ['nutritionDayStatusV1285','{"2026-10-05":{"completed":false,"updatedAt":1}}'],
  ['healthActivityCacheV128','{"daily":[{"date":"2026-10-05","steps":2000,"readInfo":{"steps":{"readAt":1791223200000,"state":"cached"}}}]}'],
  ['activityPreferencesV1283',JSON.stringify(prefs)],['temaPreferido','dark'],
  ['movementGoalsV1286','{"stepsDaily":8000,"cardioMinutesWeekly":150,"cardioSessionsWeekly":3}'],
]);
const storage=new Map(original),events=[];let consent=true,backupForSnapshot;
const context=vm.createContext({console,Date,APP_VERSION:'12.8.3',APP_BUILD:'test',DATA_SCHEMA_VERSION:18,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,String(v)),removeItem:k=>storage.delete(k)},
  confirm:()=>consent,toast:()=>{},invalidarCache:()=>events.push('invalidate'),setTimeout:()=>{},
  FileReader:class {readAsText(file){this.onload({target:{result:file.content}});}},
  listarSnapshotsSeguro:async()=>[{id:'sample',data:backupForSnapshot}],salvarSnapshotSeguro:async reason=>events.push(reason),
});
for(const name of ['gerarObjetoBackup','importarBackup','restaurarSnapshotSeguro'])vm.runInContext(source(name),context);
vm.runInContext(readFileSync(new URL('../web/nutrition-days.js',import.meta.url),'utf8'),context);
const backup=JSON.parse(JSON.stringify(context.gerarObjetoBackup()));backupForSnapshot=backup;
for(const [key,value] of original)assert.equal(backup[key],value,'Backup completo: '+key);
storage.clear();context.importarBackup({target:{files:[{content:JSON.stringify(backup)}]}});
for(const [key,value] of original)assert.equal(storage.get(key),value,'Importação por arquivo preserva: '+key);
storage.set('nutritionGoalsV125','{"kcal":999}');consent=false;
context.importarBackup({target:{files:[{content:JSON.stringify(backup)}]}});assert.equal(storage.get('nutritionGoalsV125'),'{"kcal":999}','Sem consentimento não substituir');
consent=true;events.length=0;await context.restaurarSnapshotSeguro('sample');
assert.equal(events[0],'antes_restauracao','Criar snapshot de segurança antes de restaurar');
for(const [key,value] of original)assert.equal(storage.get(key),value,'Snapshot preserva: '+key);
const stable=JSON.stringify([...storage]);context.importarBackup({target:{files:[{content:'{invalid}'}]}});assert.equal(JSON.stringify([...storage]),stable);
assert.equal(JSON.parse(storage.get('historicoTreinoV3'))[0].rir,0);assert.equal(JSON.parse(storage.get('nutritionGoalsV125')).kcal,2222);
const legacy={...backup};delete legacy.nutritionDayStatusV1285;
context.importarBackup({target:{files:[{content:JSON.stringify(legacy)}]}});
assert.equal(storage.get('nutritionDayStatusV1285'),'{}','Backup antigo não mantém conclusões do conjunto substituído');
storage.set('nutritionDayStatusV1285','{"old":{"completed":true}}');backupForSnapshot=legacy;
await context.restaurarSnapshotSeguro('sample');assert.equal(storage.get('nutritionDayStatusV1285'),'{}','Snapshot antigo também limpa conclusões');
console.log('OK: exportação/importação/snapshot, consentimento, preferências, metas, RIR zero, cache e horários preservados.');
