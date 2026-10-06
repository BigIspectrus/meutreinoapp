import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const daySource=readFileSync(new URL('../web/nutrition-days.js',import.meta.url),'utf8');
const key='nutritionDayStatusV1285',entryKey='nutritionEntriesV125',plain=v=>JSON.parse(JSON.stringify(v));
function source(name){const start=html.lastIndexOf('function '+name+'('),after=html.slice(start+1).search(/\n(?:async )?function /);assert.ok(start>=0&&after>=0,name);return html.slice(start,start+1+after);}
const entry=(id,date,kcal,protein=100,micros={calciumMg:400})=>({id,date,time:'12:00',mealType:'lunch',foodId:'f',name:'Alimento de teste',grams:100,kcal,protein,carbs:200,fat:50,fiber:5,sodium:2,micros,createdAt:1,updatedAt:1});
const entries=[entry('a','2026-10-01',2000,150),entry('b','2026-10-02',350,20),entry('c','2026-10-03',2100,140,{calciumMg:600}),entry('d','2026-10-05',0,0),entry('e','2026-10-06',900,60),entry('future','2026-10-07',2200)];
function environment(shared){
  const storage=shared||new Map([[entryKey,JSON.stringify(entries)],['nutritionGoalsV125','{"kcal":2000,"protein":150,"carbs":220,"fat":60,"micros":{"calciumMg":900},"updatedAt":1}'],['historicoTreinoV3','[{"id":"set","rir":0}]']]);
  const events=[],elements=new Map(),writes=[];let consent=true,fail=null,pending;
  const element=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',textContent:'',hidden:false,style:{},classList:{contains:()=>id==='sub-evolucao'}});return elements.get(id);};
  const ctx=vm.createContext({window:{},console:{warn(){}},Date,Map,Set,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(k===fail)throw new Error('QuotaExceededError');writes.push(k);storage.set(k,String(v));}},
    document:{getElementById:element,querySelectorAll:()=>[]},
    hoje:()=> '2026-10-06',_nutritionDate:'2026-10-06',NUTRITION_ENTRIES_KEY:entryKey,NUTRITION_GOALS_KEY:'nutritionGoalsV125',
    NUTRITION_MEALS:[{id:'lunch'},{id:'breakfast'},{id:'dinner'},{id:'snack'}],NUTRITION_MICROS:[{key:'calciumMg',label:'Cálcio',unit:'mg'}],
    parseJSONSeguro:(s,f)=>{try{return JSON.parse(s);}catch{return f;}},esc:s=>String(s),
    localDate:d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'),
    confirmarAcao:(title,message,fn)=>{pending=fn;if(consent)fn();},toast:message=>events.push(message),
    renderizarNutricao:()=>events.push('render'),atualizarStorageStatus:()=>{},fecharModal:()=>{},dadosNutricaoAlterados:()=>{},
    getHist:()=>[{id:'s1',data:'2026-10-01',carga:40,reps:10,rir:0,rpe:8},{id:'s2',data:'2026-10-02',carga:20,reps:10,rir:null,rpe:null}],
    agruparSessoes:rows=>Object.groupBy(rows,r=>r.id),getPeso:()=>({'2026-10-01':80,'2026-10-06':79}),
  });
for(const name of ['numeroNutricao','arredondarNutricao','formatarNutricao','normalizarMicrosNutricao','somarMicrosNutricao','getMetasNutricao','getRegistrosNutricao','salvarRegistrosNutricaoLocal','totaisNutricao','dataOffsetNutricao','mediaNutricao','numeroOpcionalAnalise','valorRecoveryNutricao','correlacaoNutricao','textoCorrelacaoNutricao','barraNutricao','percentualNutricao','dadosRelatorioMensalNutricao','tituloMesNutricao','htmlRelatorioMensalNutricao','renderizarSemanaNutricao','htmlArquivoRelatorioMensalNutricao','salvarEdicaoRegistroNutricao'])vm.runInContext(source(name),ctx);
  vm.runInContext(daySource,ctx);
  return {ctx,storage,events,writes,element,setConsent:v=>consent=v,setFailure:v=>fail=v,confirmPending:()=>pending?.(),read:()=>ctx.getRegistrosNutricao()};
}

// Legado fica parcial; consultas e relatórios não migram nem alteram registros.
{
  const e=environment(),before=JSON.stringify([...e.storage]);
  assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'partial');assert.equal(e.ctx.estadoDiaNutricao('2026-10-04').state,'empty');
  assert.equal(e.ctx.dataValidaEstadoNutricao('2024-02-29'),true);assert.equal(e.ctx.dataValidaEstadoNutricao('2026-02-29'),false);
  assert.equal(e.ctx.datasMesEstadoNutricao('2026-10').length,6);assert.equal(e.ctx.datasMesEstadoNutricao('2026-09').length,30);assert.equal(e.ctx.datasMesEstadoNutricao('2026-11').length,0);
  const report=e.ctx.dadosRelatorioMensalNutricao('2026-10');assert.equal(report.days.length,0);assert.equal(report.coverage.partialDays.length,5);assert.equal(report.coverage.emptyDays.length,1);
  assert.equal(report.kcalAdherence,null);assert.equal(report.proteinAdherence,null);assert.equal(report.trainingAvg.kcal,null);assert.equal(report.microCoverage[0].value,null);
  assert.equal(report.avgRir,0,'RIR zero real preservado');assert.equal(report.avgRpe,8);assert.equal(report.sessions.length,2);
  const output=e.ctx.htmlRelatorioMensalNutricao(report);assert.ok(output.includes('<strong>—</strong><span>média por dia completo'));
  assert.ok(output.includes('parciais / não confirmados'));assert.ok(output.includes('não consumo total estimado'));assert.ok(output.includes('-1 kg'));
  assert.equal(JSON.stringify([...e.storage]),before);assert.equal(e.writes.length,0);
}

// Conclusão explícita não é atingir metas; data capturada na confirmação.
{
  const e=environment(),beforeEntries=e.storage.get(entryKey),goals=e.storage.get('nutritionGoalsV125');
  e.setConsent(false);e.ctx.concluirDiaNutricao('2026-10-01');assert.equal(e.storage.has(key),false);
  e.ctx._nutritionDate='2026-10-03';e.confirmPending();assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'complete');
  e.setConsent(true);e.ctx.concluirDiaNutricao('2026-10-03');
  let report=e.ctx.dadosRelatorioMensalNutricao('2026-10');assert.equal(report.days.length,2);assert.equal(report.tot.kcal/report.div,2050);assert.equal(report.tot.protein/report.div,145);
  assert.equal(report.microCoverage[0].value,500);assert.equal(report.kcalAdherence,100);assert.equal(report.proteinAdherence,100);
  assert.equal(report.trainingAvg.kcal,2000);assert.equal(report.restAvg.kcal,2100);assert.equal(report.coverage.partialDays.length,3);
  e.ctx.renderizarSemanaNutricao();assert.ok(e.element('nutritionWeekly').innerHTML.includes('2 completos · 1 parciais'));
  const second=environment(e.storage);assert.equal(second.ctx.estadoDiaNutricao('2026-10-01').state,'complete','Reabrir app preserva conclusão');
  assert.equal(e.storage.get(entryKey),beforeEntries);assert.equal(e.storage.get('nutritionGoalsV125'),goals);
  e.ctx.concluirDiaNutricao('2026-10-05');assert.equal(e.ctx.estadoDiaNutricao('2026-10-05').state,'complete','Zero explícito com alimento não é ausência');
  e.ctx.concluirDiaNutricao('2026-10-07');assert.equal(e.ctx.estadoDiaNutricao('2026-10-07').state,'partial','Data futura não pode concluir');
  e.ctx.concluirDiaNutricao('2026-10-04');assert.equal(e.ctx.estadoDiaNutricao('2026-10-04').state,'empty');
  e.ctx.reabrirDiaNutricao('2026-10-01');assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'partial');
  e.storage.set('nutritionGoalsV125','{"kcal":999,"protein":1}');assert.equal(e.ctx.estadoDiaNutricao('2026-10-03').state,'complete','Metas não alteram completude');
}

// Identidade estável sem ordem/timestamps; mudanças no conteúdo reabrem o dia.
{
  const e=environment(),rows=e.read(),original=rows.find(r=>r.id==='a');e.ctx.concluirDiaNutricao('2026-10-01');
  const a=e.ctx.assinaturaDiaNutricao([{...original,micros:{calciumMg:10,zincMg:1}},{...original,id:'x'}]);
  assert.equal(a,e.ctx.assinaturaDiaNutricao([{...original,id:'x',updatedAt:999},{...original,micros:{zincMg:1,calciumMg:10},createdAt:999}]));
  rows.find(r=>r.id==='b').kcal=400;e.ctx.salvarRegistrosNutricaoLocal(rows);assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'complete','Outro dia não reabre');
  e.element('nutritionEntryId').value='a';e.element('nutritionEntryGrams').value='200';e.element('nutritionEntryMeal').value='lunch';e.element('nutritionEntryTime').value='12:00';
  e.ctx.salvarEdicaoRegistroNutricao();assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'partial','Edição real reabre');
  e.ctx.salvarRegistrosNutricaoLocal(rows);assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'partial','Voltar ao conteúdo anterior não reconclui');
  e.ctx.concluirDiaNutricao('2026-10-01');e.ctx.salvarRegistrosNutricaoLocal(e.read().concat(entry('extra','2026-10-01',100)));assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'partial','Adicionar reabre');
  e.ctx.concluirDiaNutricao('2026-10-01');e.ctx.salvarRegistrosNutricaoLocal(e.read().filter(r=>r.date!=='2026-10-01'));assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'empty','Apagar todos os itens não cria zero completo');
}

// Falhas: nunca perder refeição nem declarar conclusão que não foi gravada.
{
  const e=environment();e.setFailure(key);e.ctx.concluirDiaNutricao('2026-10-01');assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'partial');
  e.setFailure(null);e.ctx.concluirDiaNutricao('2026-10-01');e.setFailure(key);const rows=e.read();rows[0].kcal=100;
  assert.doesNotThrow(()=>e.ctx.salvarRegistrosNutricaoLocal(rows));assert.equal(e.read()[0].kcal,100);
  assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'partial','Assinatura detecta alteração mesmo sem atualizar metadado');
  e.ctx.renderizarEstadoDiaNutricao(e.read().filter(r=>r.date===e.ctx._nutritionDate));
  e.storage.set(key,'{invalid}');assert.equal(e.ctx.estadoDiaNutricao('2026-10-01').state,'partial');
  e.storage.set(key,'[]');assert.deepEqual(plain(e.ctx.getEstadoDiasNutricao()),{});
}

// Recuperação usa somente pares alimentares completos; semanas exigem 7/7.
{
  const e=environment(),days=Array.from({length:6},(_,i)=>entry('p'+i,'2026-10-0'+(i+1),1500+i*100,100+i*5));
  e.storage.set(entryKey,JSON.stringify(days));
  e.storage.set('healthRecoveryCacheV12',JSON.stringify({daily:Array.from({length:6},(_,i)=>({date:'2026-10-0'+(i+2),hrvMs:20+i*2,sleepMinutes:400+i*10}))}));
  for(let i=1;i<=5;i++)e.ctx.concluirDiaNutricao('2026-10-0'+i);
  const report=e.ctx.dadosRelatorioMensalNutricao('2026-10');assert.equal(report.nextHrv.n,5);assert.equal(report.nextSleep.n,5);assert.equal(report.kcalWeight,null);
  e.ctx.reabrirDiaNutricao('2026-10-01');assert.equal(e.ctx.dadosRelatorioMensalNutricao('2026-10').nextHrv,null,'4 completos não inventam 5º par');
  const exported=e.ctx.htmlArquivoRelatorioMensalNutricao(report);assert.ok(exported.includes('dias completos'));assert.ok(exported.includes('parciais / não confirmados'));assert.ok(exported.includes('7 dias completos consecutivos'));
}

// Evolução: mostrar parciais no gráfico, mas não misturá-los na média.
{
  const e=environment(),days=Array.from({length:12},(_,i)=>entry('week'+i,e.ctx.dataOffsetNutricao('2026-09-25',i),1000+i*100));
  e.storage.set(entryKey,JSON.stringify(days));days.forEach(row=>e.ctx.concluirDiaNutricao(row.date));
  e.ctx.getPeso=()=>Object.fromEntries(Array.from({length:6},(_,i)=>['2026-10-0'+(i+1),75+i*.1]));
  assert.equal(e.ctx.dadosRelatorioMensalNutricao('2026-10').kcalWeight.n,6,'Janelas 7/7 incluindo mês anterior são válidas');
  e.ctx.reabrirDiaNutricao('2026-10-02');assert.equal(e.ctx.dadosRelatorioMensalNutricao('2026-10').kcalWeight,null,'Semana com um dia parcial fica fora');
}

// Evolução: mostrar parciais no gráfico, mas não misturá-los na média.
{
  const e=environment();e.ctx.concluirDiaNutricao('2026-10-01');e.ctx.concluirDiaNutricao('2026-10-03');
  e.ctx.window.addEventListener=()=>{};e.ctx.document.addEventListener=()=>{};
  e.ctx.getComputedStyle=()=>({getPropertyValue:()=> '#10141c'});e.ctx.getAtividadeHealth=()=>({});
  e.ctx.Chart=class {constructor(canvas,config){e.ctx.chartConfig=config;}destroy(){}};
  vm.runInContext(readFileSync(new URL('../web/activity.js',import.meta.url),'utf8'),e.ctx);
  e.ctx.TreinoActivityData=e.ctx.window.TreinoActivityData;e.ctx.periodoAtividade=()=> ['2026-10-01','2026-10-02','2026-10-03'];
  e.element('routineMetric').value='kcal';e.element('activityKind').value='all';e.ctx.renderizarEvolucaoRotina();
  assert.ok(e.element('routineSummary').textContent.includes('2.050'));assert.ok(e.element('routineSummary').textContent.includes('2 dias alimentares concluídos'));
  assert.deepEqual(plain(e.ctx.chartConfig.data.datasets[0].data),[2000,350,2100]);
  assert.equal(e.ctx.chartConfig.options.plugins.tooltip.callbacks.afterTitle([{dataIndex:1}]),'Parcial / não confirmado');
  e.element('routineMetric').value='macros';e.ctx.renderizarEvolucaoRotina();assert.ok(e.element('routineSummary').textContent.includes('145 g de proteína'));
}
assert.ok(html.includes('nutritionDayStatusV1285:localStorage.getItem'));assert.ok(html.includes("'nutritionDayStatusV1285'"));
assert.ok(readFileSync(new URL('../web/sw.js',import.meta.url),'utf8').includes("'./nutrition-days.js'"));
console.log('OK: conclusão manual/persistente, legado parcial, reabertura por alteração, falhas seguras, médias/micros/associações só de completos, gráficos e backup compatíveis.');
