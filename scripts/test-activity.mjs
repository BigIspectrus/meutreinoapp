import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../web/activity.js',import.meta.url),'utf8');
const context=vm.createContext({console,window:{addEventListener(){}},document:{addEventListener(){}},Date,Map,Set});
vm.runInContext(source,context);
const d=context.window.TreinoActivityData,today='2026-10-05',range=d.dates(today,7);
assert.equal(range.length,7);assert.equal(range[0],'2026-09-29');assert.equal(range.at(-1),today);
assert.equal(d.value(null),null);assert.equal(d.value(undefined),null);assert.equal(d.value(''),null);assert.equal(d.value(-3),null);assert.equal(d.value(0),0);
const session=(id,date='2026-10-04',extra={})=>({id,date,kind:'walking',sourcePackage:'samsung',source:'Samsung Health',startMs:100000,endMs:1900000,kcal:null,...extra});
const original={available:true,zoneId:'America/Sao_Paulo',daily:[{date:'2026-10-03',steps:0,cardioKnown:true},{date:'2026-10-04',steps:6000,cardioKnown:true},{date:today,steps:1000}],sessions:[session('a'),session('b','2026-10-04',{kcal:150,calorieKind:'active'}),session('c','2026-10-02',{kcal:0,calorieKind:'total'})]};
const s=d.summarize(original,range,today);
assert.equal(s.averageSteps,3000);assert.equal(s.stepDays,2);assert.equal(s.todaySteps,1000);
assert.equal(s.cardioCount,3);assert.equal(s.minutes,90);assert.equal(s.kcal,150);assert.equal(s.kcalCount,2);assert.equal(s.totalFallback,true);
const noEnergy=d.summarize({...original,sessions:[session('a')]},range,today);assert.equal(noEnergy.kcal,null);
const noData=d.summarize({},range,today);assert.equal(noData.averageSteps,null);assert.equal(noData.todaySteps,null);
const merged=d.merge(original,{available:true,zoneId:original.zoneId,rangeStart:'2026-10-03',rangeEnd:today,sessionsComplete:true,daily:[{date:'2026-10-03',steps:2000},{date:'2026-10-04',steps:6100},{date:today,steps:null}],sessions:[session('b','2026-10-04',{kcal:160})]});
assert.equal(merged.sessions.length,2); // c fora da janela fica, a apagada na fonte sai.
assert.equal(merged.daily.find(x=>x.date==='2026-10-04').steps,6100);
const again=d.merge(merged,{...merged,sessionsComplete:true,rangeStart:'2026-10-03',rangeEnd:today});assert.equal(again.sessions.length,2);
const partial=d.merge(original,{available:true,zoneId:original.zoneId,rangeStart:'2026-10-03',rangeEnd:today,sessionsComplete:false,errors:['steps','sessions'],daily:[{date:'2026-10-04',steps:null}],sessions:[]});
assert.equal(partial.sessions.length,3);assert.equal(partial.daily.find(x=>x.date==='2026-10-04').steps,6000);
const disabled=d.merge(original,{available:false});assert.equal(disabled.sessions.length,3);
const moved=d.merge(original,{available:true,zoneId:'Europe/Lisbon',rangeStart:today,rangeEnd:today,sessionsComplete:true,daily:[],sessions:[]});assert.equal(moved.sessions.length,0);
const entries=[{date:'2026-10-04',kcal:100,protein:5,carbs:10,fat:2},{date:'2026-10-04',kcal:150,protein:10,carbs:20,fat:3}];
const rows=d.trends(original,range,entries,{'2026-10-04':80}),last=rows.find(x=>x.date==='2026-10-04');
assert.equal(last.kcal,250);assert.equal(last.protein,15);assert.equal(last.weight,80);assert.equal(last.cardioKcal,150);
const empty=rows.find(x=>x.date==='2026-10-01');assert.equal(empty.kcal,null);assert.equal(empty.steps,null);assert.equal(empty.cardioCount,null);
const zero=rows.find(x=>x.date==='2026-10-03');assert.equal(zero.steps,0);assert.equal(zero.cardioCount,0);assert.equal(zero.cardioKcal,null);
assert.equal(d.summarize(original,range,today,'stationary').cardioCount,0);
// Handler real do widget: nunca usar o dia antigo aberto no diário.
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const a=html.indexOf('function resumoAlimentacaoWidget('),b=html.indexOf('async function atualizarWidgetNativo(',a);
const widget=vm.createContext({hoje:()=>today,getRegistrosNutricao:()=>[...entries,{date:today,kcal:400,protein:30,carbs:20,fat:10}],getMetasNutricao:()=>({kcal:2000}),totaisNutricao:arr=>arr.reduce((sum,e)=>Object.fromEntries(['kcal','protein','carbs','fat'].map(k=>[k,(sum[k]||0)+(e[k]||0)])),{})});
vm.runInContext(html.slice(a,b),widget);const w=widget.resumoAlimentacaoWidget();assert.equal(w.nutritionDate,today);assert.equal(w.kcal,400);assert.equal(w.goalKcal,2000);
const calls=[];context.hoje=()=>today;context.irParaAba=tab=>calls.push(tab);context.abrirRegistroNutricao=m=>calls.push(m);context.refeicaoSugeridaNutricao=()=> 'lunch';vm.runInContext('let _nutritionDate="2026-01-01";',context);context.abrirRefeicaoWidget();assert.equal(vm.runInContext('_nutritionDate',context),today);assert.deepEqual(calls,['nutricao','lunch']);
for(const asset of ['activity.js','activity.css']){assert.ok(html.includes('./'+asset));assert.ok(readFileSync(new URL('../web/sw.js',import.meta.url),'utf8').includes('./'+asset));}
assert.ok(html.includes('healthActivityCacheV128:localStorage.getItem')); // backup inclui cache de evolução.
console.log('OK: cardio, dias sem dados, média sem hoje, cache incremental, filtros, macros e atalho/widget de hoje.');
