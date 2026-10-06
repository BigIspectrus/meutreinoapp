import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
function source(name){
  // Há handlers legados e redeclarações; testar a declaração que prevalece.
  const start=html.lastIndexOf('function '+name+'(');assert.ok(start>=0,name);
  const after=html.slice(start+1).search(/\n(?:async )?function /);assert.ok(after>=0,name);
  return (html.slice(start-6,start)==='async '?'async ':'')+html.slice(start,start+1+after);
}
let history=[],appended='',storageWrites=0,nativeCalls=[];
const elements=new Map(),element=id=>{
  if(!elements.has(id))elements.set(id,{innerHTML:'',textContent:'',classList:{add(){}},querySelector:()=>null,appendChild:el=>{appended=el.innerHTML;}});
  return elements.get(id);
};
const ctx=vm.createContext({console,Date,Number,Set,Map,setTimeout:()=>{},
  getHist:()=>history,getHealthLinks:()=>({}),normalizarAmostrasHealth:()=>[],amostraMaisProxima:()=>null,picoFcJanela:()=>null,
  getSessionKey:r=>r.sessionId,getSessionTimestamp:rows=>rows[0]?.startedAt||0,
  agruparSessoes:rows=>Object.groupBy(rows,r=>r.sessionId),
  getTreinosSalvos:()=>[{id:'t',repRangeMap:{Supino:'8-12'},incrementMap:{Supino:2.5}}],
  setContaParaPR:r=>r.setType!=='warmup',volumeSessao:rows=>rows.reduce((n,r)=>n+r.carga*r.reps,0),
  boundsSessao:()=>({startMs:1000,endMs:61000,durationSec:60}),
  document:{getElementById:element,createElement:()=>({innerHTML:'',className:''})},esc:s=>String(s),healthSourceLabel:s=>s,toast:()=>{},
  window:{_lastFinishedSessionId:'s1',TreinoNativeBridge:{
    syncNativeDatabase:async payload=>nativeCalls.push(['database',payload]),
    saveWorkoutMirror:async payload=>nativeCalls.push(['mirror',payload]),
  }},localStorage:{getItem:()=>null,setItem:()=>{storageWrites++;}},isNativeAndroid:()=>true,DATA_SCHEMA_VERSION:18,
  getMetasNutricao:()=>({kcal:2000,protein:100}),getRegistrosNutricao:()=>[],getPeso:()=>({}),
  NUTRITION_MICROS:[],parseJSONSeguro:(s,f)=>{try{return JSON.parse(s);}catch{return f;}},
  totaisNutricao:()=>({kcal:0,protein:0,carbs:0,fat:0,micros:{}}),numeroNutricao:n=>Number(n)||0,
  correlacaoNutricao:()=>({n:0}),valorRecoveryNutricao:()=>NaN,dataOffsetNutricao:d=>d,
});
for(const name of ['numeroOpcionalAnalise','mediaV1241','mediaNutricao','effortInt','effortFloat','calcE1rm',
  'calcularRecuperacaoSeries','fadigaIntraSessaoV1241','metricasSessaoV1241','calcularSugestaoProgressaoExercicio','abrirInsightsExercicio',
  'atualizarResumoPosTreinoHealth','dadosRelatorioMensalNutricao','sincronizarBancoNativo'])vm.runInContext(source(name),ctx);
// Incluir também a proteção real de progressão adicionada na v12.4.1.
const wrapperStart=html.indexOf('const _v1240CalcularSugestaoProgressao='),wrapperEnd=html.indexOf('function injetarAnaliseSessaoV1241(',wrapperStart);
vm.runInContext(html.slice(wrapperStart,wrapperEnd),ctx);

const missing=[null,undefined,'',' ','\t\n',NaN,Infinity,-Infinity,'inválido',false,true,[],{}];
for(const v of missing)assert.equal(ctx.numeroOpcionalAnalise(v),null,'Ausência/valor inválido não é zero: '+String(v));
assert.equal(ctx.numeroOpcionalAnalise(0),0);assert.equal(ctx.numeroOpcionalAnalise('0'),0);
assert.equal(ctx.numeroOpcionalAnalise(' 2 '),2);assert.equal(ctx.numeroOpcionalAnalise('8.5'),8.5);
assert.equal(ctx.mediaV1241([2,...missing]),2);assert.equal(ctx.mediaV1241([0,2,...missing]),1);
assert.equal(ctx.mediaV1241(missing),null);
assert.equal(ctx.effortInt(''),null);assert.equal(ctx.effortFloat(''),null);
assert.equal(ctx.effortInt('0'),0);assert.equal(ctx.effortFloat('0'),0);

const row=(i,extra={})=>Object.freeze({id:'r'+i,sessionId:'s1',templateId:'t',exercicio:'Supino',setType:'workset',
  numSerie:i+1,reps:12,carga:40,data:'2026-10-05',startedAt:1000,finishedAt:61000,...extra});
history=Object.freeze([row(0,{rir:1,rpe:8}),row(1,{rir:null,rpe:null}),row(2,{rir:' ',rpe:''})]);
const original=JSON.stringify(history);
let metrics=ctx.metricasSessaoV1241('s1',history);
assert.equal(metrics.avgRir,1);assert.equal(metrics.avgRpe,8);assert.equal(metrics.effortCount,1);assert.equal(metrics.sessionRpe,null);
for(const v of missing){
  const regs=[row(0,{rir:1}),row(1,{rir:v})],result=ctx.calcularSugestaoProgressaoExercicio('Supino',regs);
  assert.equal(result.title,'Sugestão: +2.5 kg');assert.ok(result.text.includes('RIR médio 1.0'));
}
let result=ctx.calcularSugestaoProgressaoExercicio('Supino',[row(0,{rir:null}),row(1,{rir:null})]);
assert.ok(!result.text.includes('RIR médio'),'Sem RIR não fabricar média 0');
result=ctx.calcularSugestaoProgressaoExercicio('Supino',[row(0,{rir:0}),row(1,{rir:null})]);
assert.ok(!result.title.includes('+'),'Zero real permanece esforço informado');
result=ctx.calcularSugestaoProgressaoExercicio('Supino',[row(0,{rir:2,sessionRpe:9}),row(1,{rir:null})]);
assert.equal(result.title,'Sugestão: consolidar a carga');
metrics=ctx.metricasSessaoV1241('s1',[row(0,{rir:0,rpe:0,sessionRpe:' '}),row(1,{rir:null,rpe:null,sessionRpe:7})]);
assert.equal(metrics.avgRir,0);assert.equal(metrics.avgRpe,0);assert.equal(metrics.effortCount,1);assert.equal(metrics.sessionRpe,7);
assert.equal(ctx.fadigaIntraSessaoV1241([row(0,{rir:2}),row(1,{rir:1}),row(2,{rir:''})]).avgRirDrop,null);
assert.equal(ctx.fadigaIntraSessaoV1241([row(0,{rir:2}),row(1,{rir:1}),row(2,{rir:0})]).avgRirDrop,2);
const recovery=ctx.calcularRecuperacaoSeries([row(0,{completedAt:1000000,rir:' ',rpe:''}),row(1,{completedAt:1100000,rir:0,rpe:8.5})],[]);
assert.equal(recovery[0].rir,null);assert.equal(recovery[0].rpe,null);assert.equal(recovery[1].rir,0);assert.equal(recovery[1].rpe,8.5);

ctx.abrirInsightsExercicio('Supino');
assert.ok(element('exerciseInsightsContent').innerHTML.includes('<td>1.0</td>'));
ctx.atualizarResumoPosTreinoHealth('s1',{found:true,sourceApp:'Samsung Health',confidence:1});
assert.ok(appended.includes('RIR médio 1.0'));
let report=ctx.dadosRelatorioMensalNutricao('2026-10');
assert.equal(report.avgRir,1);assert.equal(report.avgRpe,8);
assert.equal(JSON.stringify(history),original,'Analisar não altera registros antigos');assert.equal(storageWrites,0);

history=Object.freeze([row(0,{rir:null,rpe:null}),row(1,{rir:' ',rpe:''})]);
ctx.abrirInsightsExercicio('Supino');assert.ok(element('exerciseInsightsContent').innerHTML.includes('<td>—</td>'));
ctx.atualizarResumoPosTreinoHealth('s1',{found:true,sourceApp:'Samsung Health',confidence:1});assert.ok(!appended.includes('RIR médio'));
report=ctx.dadosRelatorioMensalNutricao('2026-10');assert.equal(report.avgRir,null);assert.equal(report.avgRpe,null);
history=Object.freeze([row(0,{rir:0,rpe:0}),row(1,{rir:2,rpe:8}),row(2,{rir:null,rpe:null})]);
report=ctx.dadosRelatorioMensalNutricao('2026-10');assert.equal(report.avgRir,1);assert.equal(report.avgRpe,4);
const preserved=JSON.stringify(history);await ctx.sincronizarBancoNativo(false);
const mirror=nativeCalls.find(([kind])=>kind==='mirror')[1];
assert.equal(mirror.sets[0].rir,0);assert.equal(mirror.sets[0].rpe,0);assert.equal(mirror.sets[2].rir,null);assert.equal(mirror.sets[2].rpe,null);
assert.equal(JSON.stringify(history),preserved);
history=Object.freeze([row(0,{rir:' ',rpe:''}),row(1,{rir:0,rpe:8.5})]);
const legacyOriginal=JSON.stringify(history);nativeCalls=[];await ctx.sincronizarBancoNativo(false);
const database=nativeCalls.find(([kind])=>kind==='database')[1];
assert.equal(database.records[0].rir,null);assert.equal(database.records[0].rpe,null);
assert.equal(database.records[1].rir,0);assert.equal(database.records[1].rpe,8.5);
assert.equal(JSON.stringify(history),legacyOriginal,'Normalizar payload não regrava histórico importado');
assert.ok(!/map\(r=>Number\(r\.(?:rir|rpe)\)\)/.test(html),'Não reintroduzir conversão direta de RIR/RPE opcional');
console.log('OK: RIR/RPE ausente ≠ zero; progressão, médias, cobertura, fadiga, histórico, pós-treino, relatório e espelho nativo preservados.');
