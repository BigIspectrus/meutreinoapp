import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const script=readFileSync(new URL('../web/activity.js',import.meta.url),'utf8');
const elements=new Map(),storage=new Map();let request;
const el=id=>{if(!elements.has(id))elements.set(id,{textContent:'',innerHTML:'',value:'all',disabled:false,hidden:false,classList:{contains:()=>false}});return elements.get(id);};
const context=vm.createContext({console,Date,Map,Set,window:{addEventListener(){},TreinoNativeBridge:{getActivitySnapshot:async()=>request()}},
  document:{addEventListener(){},getElementById:el,querySelectorAll:()=>[]},
  localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},
  parseJSONSeguro:(raw,fallback)=>{try{return JSON.parse(raw);}catch{return fallback;}},
  hoje:()=> '2026-10-05',isNativeAndroid:()=>true,toast:()=>{},esc:s=>String(s),
});
context.window.TreinoActivityData=undefined;
vm.runInContext(script,context);context.TreinoActivityData=context.window.TreinoActivityData;context.TreinoActivityPreferences=context.window.TreinoActivityPreferences;
const d=context.TreinoActivityData,day='2026-10-05',t=1791223200000,keys=d.metrics;
const readStatus=(at,overrides={})=>Object.fromEntries(keys.map(key=>[key,{state:'ok',readAt:at,checkedAt:at,...overrides[key]}]));
const cardio=(id='a',extra={})=>({id,kind:'walking',sourcePackage:'samsung',source:'Samsung Health',date:day,title:'Teste',startMs:t-1800000,endMs:t,
  kcal:100,calorieKind:'active',sessionReadAt:t,kcalReadAt:t+10,kcalCheckedAt:t+10,kcalReadState:'ok',...extra});
const snapshot=(at=t,extra={})=>({available:true,generatedAt:at,zoneId:'America/Sao_Paulo',rangeStart:day,rangeEnd:day,
  readSteps:true,readActiveCalories:true,readCalories:true,readExercise:true,sessionsComplete:true,errors:[],readStatus:readStatus(at),
  daily:[{date:day,steps:2000,activeKcal:300,totalKcal:2000}],sessions:[cardio()],...extra});
let original=d.merge({},snapshot(),t);
assert.equal(original.daily[0].readInfo.steps.readAt,t);assert.equal(original.daily[0].readInfo.steps.state,'fresh');
assert.equal(original.sessions[0].readInfo.sessionKcal.readAt,t+10);
const before=JSON.stringify(original);
const next=t+60000,broken=snapshot(next,{daily:[{date:day,steps:2400,activeKcal:null,totalKcal:null}],
  errors:['calories','sessionCalories'],readStatus:readStatus(next,{activeKcal:{state:'error',readAt:null},totalKcal:{state:'error',readAt:null},sessionKcal:{state:'error',readAt:null}}),
  sessions:[cardio('a',{sessionReadAt:next,kcal:null,kcalReadAt:null,kcalCheckedAt:next,kcalReadState:'error'})]});
let merged=d.merge(original,broken,next);
assert.equal(merged.daily[0].steps,2400);assert.equal(merged.daily[0].readInfo.steps.readAt,next);
assert.equal(merged.daily[0].activeKcal,300);assert.equal(merged.daily[0].readInfo.activeKcal.readAt,t);
assert.equal(merged.daily[0].readInfo.activeKcal.checkedAt,next);assert.equal(merged.daily[0].readInfo.activeKcal.state,'cached');
assert.equal(merged.readStatus.activeKcal.readAt,t);assert.equal(merged.readStatus.activeKcal.checkedAt,next);
assert.equal(merged.sessions[0].kcal,100);assert.equal(merged.sessions[0].readInfo.sessionKcal.readAt,t+10);
assert.equal(merged.sessions[0].readInfo.sessions.readAt,next);assert.equal(merged.sessions[0].readInfo.sessionKcal.reason,'error');
assert.equal(JSON.stringify(original),before,'Mesclar não altera o snapshot anterior');
const reopened=d.normalize(JSON.parse(JSON.stringify(merged)));assert.equal(reopened.daily[0].readInfo.activeKcal.readAt,t);

// Negar permissão ou falhar em toda a consulta não carimba os valores salvos como novos.
const denied=d.merge(merged,snapshot(next+1000,{readSteps:false,readStatus:readStatus(next+1000,{steps:{state:'denied',readAt:null}}),daily:[{date:day,steps:null,activeKcal:320,totalKcal:2020}]}));
assert.equal(denied.daily[0].steps,2400);assert.equal(denied.daily[0].readInfo.steps.readAt,next);
assert.equal(denied.daily[0].readInfo.steps.reason,'denied');assert.equal(denied.daily[0].readInfo.activeKcal.state,'fresh');
const failed=d.failure(merged,next+2000);assert.equal(failed.daily[0].steps,2400);assert.equal(failed.daily[0].readInfo.steps.readAt,next);
assert.equal(failed.lastAttemptAt,next+2000);assert.equal(failed.readStatus.steps.state,'error');assert.equal(failed.daily[0].readInfo.steps.state,'cached');
const unavailable=d.merge(merged,{available:false},next+3000);assert.equal(unavailable.sessions.length,1);
assert.equal(unavailable.daily[0].readInfo.steps.reason,'unavailable');assert.equal(unavailable.daily[0].readInfo.steps.readAt,next);
for(const malformed of [null,undefined,[],{},'inválido']){
  const result=d.merge(original,malformed,next+4000);assert.equal(result.daily[0].steps,2000);
  assert.equal(result.daily[0].readInfo.steps.readAt,t);assert.notEqual(result.readStatus.steps.state,'ok');
}

// Uma sessão falha enquanto outra fornece kcal: conservar somente a energia da sessão que falhou.
const partial=d.merge(original,snapshot(next,{errors:['sessionCalories'],readStatus:readStatus(next,{sessionKcal:{state:'partial',readAt:null}}),
  sessions:[cardio('a',{kcal:null,kcalReadState:'error',kcalReadAt:null,kcalCheckedAt:next}),cardio('b',{kcal:250,kcalReadAt:next,kcalCheckedAt:next})]}));
assert.equal(partial.sessions.find(s=>s.id==='a').kcal,100);assert.equal(partial.sessions.find(s=>s.id==='a').readInfo.sessionKcal.readAt,t+10);
assert.equal(partial.sessions.find(s=>s.id==='b').kcal,250);assert.equal(partial.sessions.find(s=>s.id==='b').readInfo.sessionKcal.state,'fresh');
assert.equal(partial.readStatus.sessionKcal.state,'partial');assert.equal(partial.readStatus.sessionKcal.readAt,t);
const changed=d.merge(original,snapshot(next,{errors:['sessionCalories'],sessions:[cardio('a',{startMs:t-1900000,kcal:null,kcalReadAt:null,kcalReadState:'error',kcalCheckedAt:next})]}));
assert.equal(changed.sessions[0].kcal,null,'Não reutilizar kcal de um intervalo diferente');

// Zero real, resposta vazia válida, paginação parcial e dados fora da janela têm significados distintos.
const zero=d.merge(original,snapshot(next,{daily:[{date:day,steps:0,activeKcal:0,totalKcal:0}],sessions:[cardio('a',{kcal:0,kcalReadAt:next,kcalCheckedAt:next})]}));
assert.equal(zero.daily[0].steps,0);assert.equal(zero.daily[0].readInfo.steps.state,'fresh');assert.equal(zero.sessions[0].kcal,0);
const empty=d.merge(original,snapshot(next,{daily:[{date:day,steps:null,activeKcal:null,totalKcal:null}],sessions:[]}));
assert.equal(empty.daily[0].steps,null);assert.equal(empty.daily[0].readInfo.steps.state,'missing');assert.equal(empty.daily[0].readInfo.steps.readAt,next);assert.equal(empty.sessions.length,0);
const paged=d.merge(original,snapshot(next,{sessionsComplete:false,readStatus:readStatus(next,{sessions:{state:'partial',readAt:null}}),errors:['sessions'],sessions:[]}));
assert.equal(paged.sessions.length,1);assert.equal(paged.daily[0].readInfo.sessions.state,'cached');assert.equal(paged.daily[0].readInfo.sessions.readAt,t);
const out=d.merge(original,snapshot(next,{rangeStart:'2026-10-06',rangeEnd:'2026-10-06',daily:[],sessions:[]}));
assert.equal(out.daily[0].readInfo.steps.reason,'outside_range');assert.equal(out.daily[0].readInfo.steps.readAt,t);
const moved=d.merge(original,snapshot(next,{zoneId:'Europe/Lisbon',daily:[],sessions:[]}));assert.equal(moved.daily.length,0);

// Legados: jamais adivinhar o horário de um valor conservado após erro.
const legacy=d.normalize({available:true,generatedAt:next,rangeStart:day,rangeEnd:day,readSteps:true,readCalories:true,readActiveCalories:true,sessionsComplete:true,
  errors:['calories'],daily:[{date:day,steps:2000,activeKcal:300,totalKcal:2000,cardioKnown:true}],sessions:[]});
assert.equal(legacy.daily[0].readInfo.steps.readAt,next);assert.equal(legacy.daily[0].readInfo.activeKcal.readAt,null);
assert.equal(legacy.daily[0].readInfo.activeKcal.state,'cached');assert.equal(d.normalize(null).daily.length,0);
const notConfirmed=d.normalize({available:false,generatedAt:next,rangeStart:day,rangeEnd:day,readSteps:true,daily:[{date:day,steps:2000}]});
assert.equal(notConfirmed.daily[0].readInfo.steps.readAt,null);
for(const v of [null,undefined,'',false,' ',NaN,Infinity])assert.equal(d.time(v),null);
const q=d.quality(merged.daily,'activeKcal');assert.equal(q.cached,1);assert.equal(q.firstReadAt,t);
assert.ok(context.textoQualidadeAtividade(q).includes('Salvo'));assert.ok(!context.textoQualidadeAtividade(q).includes(context.horaLeituraAtividade(next)));

// Controlador real: erro de bridge grava o estado de falha, e não apenas um aviso temporário.
storage.set('healthActivityCacheV128',JSON.stringify(original));request=()=>{throw new Error('falha simulada');};
const oldWarn=console.warn;console.warn=()=>{};
try {await context.sincronizarAtividadesHealth(true);} finally {console.warn=oldWarn;}
let stored=JSON.parse(storage.get('healthActivityCacheV128'));assert.equal(stored.daily[0].readInfo.steps.readAt,t);assert.equal(stored.readStatus.steps.state,'error');
const asynchronousBridge=context.window.TreinoNativeBridge.getActivitySnapshot;
context.window.TreinoNativeBridge.getActivitySnapshot=()=>{throw new Error('bridge síncrono indisponível');};
console.warn=()=>{};
try {await context.sincronizarAtividadesHealth(true);} finally {console.warn=oldWarn;}
assert.equal(vm.runInContext('_activityBusy',context),null);assert.equal(el('activitySyncButton').disabled,false);
context.window.TreinoNativeBridge.getActivitySnapshot=asynchronousBridge;
request=()=>snapshot(next);await context.sincronizarAtividadesHealth(true);
stored=JSON.parse(storage.get('healthActivityCacheV128'));assert.equal(stored.daily[0].readInfo.steps.state,'fresh');assert.equal(stored.daily[0].readInfo.steps.readAt,next);
const immutable=storage.get('healthActivityCacheV128');context.renderizarAtividades();context.definirPeriodoAtividade(7);assert.equal(storage.get('healthActivityCacheV128'),immutable,'Navegar/filtrar não muda horários');
assert.ok(el('activityReadStatus').innerHTML.includes('Última consulta completa'));
console.log('OK: horários por dado, cache identificado, falhas/permissões, kcal por sessão, legado honesto, persistência e leitura sem mutação.');
