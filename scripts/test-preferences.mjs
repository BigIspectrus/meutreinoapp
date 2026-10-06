import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../web/activity.js',import.meta.url),'utf8');
const storage=new Map([['historicoTreinoV3','[{"rir":0,"reps":10}]'],['nutritionGoalsV125','{"kcal":2222}'],['healthActivityCacheV128','{"generatedAt":1791223200000,"daily":[]}']]);
function session(exercises=['Agachamento','Supino']){
  const controls=new Map(),callbacks=[],calls=[];
  const select=(id,value,choices)=>controls.set(id,{value,options:choices.map(value=>({value}))});
  select('activityKind','all',['all','walking','running','treadmill','cycling','stationary']);
  select('activityChartMetric','steps',['steps','cardioMinutes','cardioCount','cardioKcal']);
  select('routineMetric','weight',['weight','steps','cardioMinutes','cardioKcal','kcal','macros']);
  select('tipoGrafico','carga',['carga','volume','rm_estimado','tabela','peso']);
  select('selectGraficoExercicio',exercises[0],exercises);
  select('selectGrupoTabela','',['','Peito','Costas','Pernas','Ombros','Braços','Outros']);
  const ctx=vm.createContext({window:{addEventListener:(name,fn)=>{if(name==='load')callbacks.push(fn);}},
    document:{addEventListener(){},getElementById:id=>controls.get(id),querySelectorAll:()=>[]},
    localStorage:{getItem:key=>storage.get(key)||null,setItem:(key,v)=>storage.set(key,v)},
    console,Date,Map,Set,isNativeAndroid:()=>false,atualizarGrafico:()=>{calls.push('chart');if(controls.get('tipoGrafico').value!=='tabela')controls.get('selectGrupoTabela').value='';},
  });
  vm.runInContext(code,ctx);ctx.TreinoActivityData=ctx.window.TreinoActivityData;ctx.TreinoActivityPreferences=ctx.window.TreinoActivityPreferences;
  return {ctx,controls,callbacks,calls};
}
const first=session(),p=first.ctx.TreinoActivityPreferences;
for(const bad of [null,undefined,'', 'null','[]','true','{invalid}'])assert.equal(p.parse(bad).days,30);
assert.equal(p.normalize({days:90,kind:'stationary'}).days,90);assert.equal(p.normalize({days:90,kind:'stationary'}).kind,'stationary');
assert.equal(p.normalize({days:999,kind:'malicious',activityMetric:'anything',exerciseMetric:'x'}).kind,'all');
assert.equal(p.normalize({days:999}).days,30);assert.equal(p.normalize({exercise:'x'.repeat(161)}).exercise,'');
const field=(id,value)=>{first.controls.get(id).value=value;};
first.callbacks.forEach(fn=>fn());assert.equal(storage.has('activityPreferencesV1283'),false,'Abrir app não regrava preferência nem dados');
field('activityKind','stationary');first.ctx.alterarModalidadeAtividade();
field('activityChartMetric','cardioKcal');first.ctx.alterarGraficoAtividade();
field('routineMetric','macros');first.ctx.alterarGraficoRotina();
field('tipoGrafico','tabela');field('selectGraficoExercicio','Supino');first.ctx.alterarGraficoTreino();
field('selectGrupoTabela','Pernas');first.ctx.alterarGraficoTreino();first.ctx.definirPeriodoAtividade(90);
const saved=JSON.parse(storage.get('activityPreferencesV1283'));
assert.deepEqual(saved,{days:90,kind:'stationary',activityMetric:'cardioKcal',routineMetric:'macros',exerciseMetric:'tabela',exercise:'Supino',exerciseGroup:'Pernas'});
assert.equal(storage.get('historicoTreinoV3'),'[{"rir":0,"reps":10}]');assert.equal(storage.get('nutritionGoalsV125'),'{"kcal":2222}');
assert.equal(storage.get('healthActivityCacheV128'),'{"generatedAt":1791223200000,"daily":[]}');
const closed=storage.get('activityPreferencesV1283'),second=session();second.callbacks.forEach(fn=>fn());
assert.equal(second.controls.get('activityKind').value,'stationary');assert.equal(second.controls.get('activityChartMetric').value,'cardioKcal');
assert.equal(second.controls.get('routineMetric').value,'macros');assert.equal(second.controls.get('tipoGrafico').value,'tabela');
assert.equal(second.controls.get('selectGraficoExercicio').value,'Supino');assert.equal(second.controls.get('selectGrupoTabela').value,'Pernas');
assert.equal(vm.runInContext('_activityDays',second.ctx),90);assert.equal(storage.get('activityPreferencesV1283'),closed);
second.controls.get('tipoGrafico').value='volume';second.ctx.alterarGraficoTreino();
second.controls.get('tipoGrafico').value='tabela';second.ctx.alterarGraficoTreino();assert.equal(second.controls.get('selectGrupoTabela').value,'Pernas');
const removed=session(['Agachamento']);removed.callbacks.forEach(fn=>fn());assert.equal(removed.controls.get('selectGraficoExercicio').value,'Agachamento','Exercício removido não deixa gráfico inválido');
storage.set('activityPreferencesV1283','{invalid}');const broken=session();broken.callbacks.forEach(fn=>fn());assert.equal(broken.controls.get('activityKind').value,'all');assert.equal(vm.runInContext('_activityDays',broken.ctx),30);
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
assert.ok(html.includes('activityPreferencesV1283:localStorage.getItem'));assert.ok(html.includes("if(d.activityPreferencesV1283)"));
console.log('OK: preferências persistidas ao reabrir, seleções inválidas seguras, grupo/exercício, backup e dados/horários preservados.');
