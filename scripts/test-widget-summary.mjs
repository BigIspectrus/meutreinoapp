import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const context=vm.createContext({window:{addEventListener(){}},document:{addEventListener(){}},Date,Intl,Map,Set,console});
for(const name of ['activity','movement'])vm.runInContext(readFileSync(new URL('../web/'+name+'.js',import.meta.url),'utf8'),context);
context.TreinoActivityData=context.window.TreinoActivityData;context.TreinoMovementData=context.window.TreinoMovementData;
const today='2026-10-06',time=Date.parse('2026-10-06T14:00:00Z');
const read={state:'fresh',reason:'ok',readAt:time,checkedAt:time};
const snapshot={zoneId:'America/Sao_Paulo',readStatus:{steps:{state:'ok'},sessions:{state:'ok'}},
  daily:[{date:'2026-10-05',steps:1000,cardioKnown:true,readInfo:{steps:read,sessions:read}},{date:today,steps:0,cardioKnown:true,readInfo:{steps:read,sessions:read}}],
  sessions:[{id:'run',date:today,kind:'running',sourcePackage:'samsung',startMs:100000,endMs:1900000,readInfo:{sessions:read}}]};
context.hoje=()=>today;context.getAtividadeHealth=()=>snapshot;
context.getMetasMovimento=()=>({stepsDaily:8000,cardioMinutesWeekly:150,cardioSessionsWeekly:3});
const before=JSON.stringify(snapshot);
let out=context.resumoMovimentoWidget();
assert.equal(out.steps,0);assert.equal(out.sessions,1);assert.equal(out.minutes,30);
assert.equal(out.weekStart,'2026-10-05');assert.equal(out.weekEnd,'2026-10-11');assert.equal(out.partial,false);
assert.equal(out.stepsGoal,8000);assert.equal(out.stepsReadAt,time);assert.equal(out.cardioReadAt,time);
assert.equal(JSON.stringify(snapshot),before,'Gerar o espelho não modifica horários ou dados Health');
context.getAtividadeHealth=()=>({});out=context.resumoMovimentoWidget();
assert.equal(out.steps,null);assert.equal(out.sessions,null);assert.equal(out.minutes,null);assert.equal(out.stepsReadAt,null);
assert.equal(out.partial,true);assert.equal(out.stepsState,'unavailable');
context.getAtividadeHealth=()=>context.TreinoActivityData.failure(snapshot,time+60000,'denied');out=context.resumoMovimentoWidget();
assert.equal(out.steps,0);assert.equal(out.stepsReadAt,time);assert.equal(out.stepsState,'denied');
// O filtro de modalidade da tela não modifica o total semanal espelhado.
context.getAtividadeHealth=()=>({...snapshot,sessions:[...snapshot.sessions,{id:'bike',date:today,kind:'cycling',sourcePackage:'samsung',startMs:2000000,endMs:3200000,readInfo:{sessions:read}}]});
assert.equal(context.resumoMovimentoWidget().sessions,2);assert.equal(context.resumoMovimentoWidget().minutes,50);
context.hoje=()=> '2026-10-12';out=context.resumoMovimentoWidget();
assert.equal(out.steps,null);assert.equal(out.minutes,null);assert.equal(out.sessions,null);assert.equal(out.weekStart,'2026-10-12');
console.log('OK: espelho dos widgets com metas manuais, zero real, ausência, falhas/permissões, horários preservados e virada de semana.');
