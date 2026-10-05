import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { buildCommonFoods } from './build-common-foods.mjs';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const catalog=buildCommonFoods();
const sandbox={window:{},console,Map,Date};
vm.runInNewContext(readFileSync(new URL('../web/data/common-foods.js',import.meta.url),'utf8'),sandbox);
assert.deepEqual(JSON.parse(JSON.stringify(sandbox.window.TreinoCommonFoods)),catalog,'Asset gerado deve corresponder às fontes/configuração');
assert.equal(catalog.foods.length,57);
const storage=new Map(),elements=new Map();
const element=id=>{if(!elements.has(id))elements.set(id,{value:'',innerHTML:'',style:{},disabled:false});return elements.get(id);};
const ctx=vm.createContext({window:{TreinoCommonFoods:catalog},console,Date,
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  document:{getElementById:element},parseJSONSeguro:(s,f)=>{try{return JSON.parse(s);}catch{return f;}},
  NUTRITION_FOODS_KEY:'foods',NUTRITION_ENTRIES_KEY:'entries',NUTRITION_RECIPES_KEY:'recipes',
  NUTRITION_MICROS:[{key:'calciumMg'},{key:'potassiumMg'},{key:'vitaminB12Mcg'}],
  NUTRITION_MEALS:[{id:'snack'},{id:'breakfast'},{id:'lunch'},{id:'dinner'}],
  _nutritionSelectedFoodId:null,_nutritionDate:'2026-10-05',
  gerarId:()=>String(Math.random()),horarioNutricao:()=> '12:00',fecharModal:()=>{},dadosNutricaoAlterados:()=>{},
  getReceitasNutricao:()=>[],receitaComoAlimentoNutricao:r=>r,toast:()=>{},
  renderizarBuscaAlimentosNutricao:()=>{},atualizarPreviaRegistroNutricao:()=>{},esc:s=>String(s),
  fetch:async()=>({ok:true,json:async()=>JSON.parse(readFileSync(new URL('../web/data/taco-v4.json',import.meta.url),'utf8'))}),_nutritionTacoFoods:null,
});
function source(name){
  const start=html.indexOf('function '+name+'(');assert.ok(start>=0,name);
  const after=html.slice(start+1).search(/\n(?:async )?function /);
  assert.ok(after>=0,name);return html.slice(start,start+1+after).replace(/^function carregarTaco/,'async function carregarTaco');
}
for(const name of ['numeroNutricao','arredondarNutricao','formatarNutricao','normalizarMicrosNutricao','normalizarBuscaNutricao','getAlimentosNutricao','getRegistrosNutricao','salvarAlimentosNutricaoLocal','salvarRegistrosNutricaoLocal','getAlimentosComunsNutricao','referenciaComumNutricao','getAlimentosDisponiveisNutricao','getItensCatalogoPessoalNutricao','buscarAlimentoTextoNutricao','alimentosFiltradosNutricao','calcularPorGramasNutricao','quantidadeSelecionadaNutricao','selecionarAlimentoNutricao','salvarRegistroNutricao','carregarTacoNutricao'])vm.runInContext(source(name),ctx);
const result=q=>ctx.alimentosFiltradosNutricao(q);
assert.equal(result('pao de queijo pequeno')[0].id,'taco:140');
assert.equal(result('PÃO QUEIJO GRANDE')[0].id,'taco:140');
assert.equal(result('banana terra')[0].id,'taco:175');
assert.equal(result('banana prata')[0].id,'taco:182');
assert.equal(result('pao frances')[0].id,'taco:53');
assert.equal(result('aipim')[0].id,'taco:129');
assert.equal(result('mussarela')[0].id,'taco:463');
assert.ok(result('leite em po').length===2);
assert.ok(result('macarrao cozido').some(f=>f.id==='tbca:BRC0116A'));
assert.equal(storage.size,0,'Consultar banco não grava nem migra dados pessoais');

element('nutritionFoodSearch').value='pao queijo grande';ctx.selecionarAlimentoNutricao('taco:140');
assert.equal(element('nutritionAddUnit').value,'measure:1');
assert.equal(ctx.quantidadeSelecionadaNutricao(result('pao queijo')[0]),50);
element('nutritionAddUnit').value='measure:0';element('nutritionAddAmount').value='2';
assert.equal(ctx.quantidadeSelecionadaNutricao(result('pao queijo')[0]),50);
ctx.selecionarAlimentoNutricao('tbca:BRC0070G');assert.equal(element('nutritionAddUnit').value,'ml');
const skim=result('leite desnatado liquido')[0];assert.equal(ctx.quantidadeSelecionadaNutricao(skim),200);
assert.equal(ctx.calcularPorGramasNutricao(skim,200).kcal,78);
assert.equal(ctx.calcularPorGramasNutricao(skim,200).protein,5.96);
const whole=result('leite integral liquido')[0];assert.equal(ctx.calcularPorGramasNutricao(whole,200).kcal,130);
assert.equal(ctx.calcularPorGramasNutricao(result('macarrao cozido')[0],200).kcal,202);
assert.ok(ctx.calcularPorGramasNutricao(result('macarrao cru')[0],200).kcal>700);

storage.set('goals',JSON.stringify({kcal:2222,protein:123}));
storage.set('entries',JSON.stringify([{id:'old',date:'2026-10-01',name:'Histórico',grams:10,kcal:45,protein:2}]));
element('nutritionAddMeal').value='snack';ctx.salvarRegistroNutricao();
assert.equal(JSON.parse(storage.get('foods')).length,1);
assert.equal(JSON.parse(storage.get('entries'))[0].kcal,45);
assert.equal(JSON.parse(storage.get('entries'))[1].kcal,78);
assert.equal(JSON.parse(storage.get('goals')).kcal,2222);
assert.equal(ctx.getAlimentosDisponiveisNutricao().filter(f=>f.id===skim.id).length,1,'Não duplicar cópia usada');
assert.equal(ctx.alimentosFiltradosNutricao('','recent')[0].id,skim.id);
ctx.salvarRegistroNutricao();assert.equal(JSON.parse(storage.get('foods')).length,1,'Reuso não duplica alimento');
const custom={...skim,id:'my-milk',source:'tbca',sourceId:'BRC0070G',kcal100:42,measures:[{name:'Meu copo',grams:180}],favorite:true};
ctx.salvarAlimentosNutricaoLocal([custom]);
assert.equal(ctx.getAlimentosDisponiveisNutricao().filter(f=>f.sourceId==='BRC0070G').length,1);
assert.equal(result('leite desnatado liquido')[0].kcal100,42,'Cadastro próprio tem prioridade, sem sobrescrita');
assert.equal(result('leite desnatado liquido')[0].measures[0].grams,180);
assert.equal(ctx.alimentosFiltradosNutricao('','favorites')[0].id,'my-milk');
assert.equal(JSON.parse(storage.get('entries'))[1].kcal,78,'Edição não muda snapshot histórico');
const full=await ctx.carregarTacoNutricao();assert.equal(full.length,597);
assert.ok(!full.some(f=>['taco:457','taco:458'].includes(f.id)),'Leites TACO sem macros não devem reaparecer zerados');
assert.equal(full.find(f=>f.id==='tbca:BRC0070G').source,'tbca');
assert.equal(full.find(f=>f.id==='tbca:BRC0044G').kcal100,65);
assert.ok(html.includes('getAlimentosDisponiveisNutricao().sort')&&html.includes("getAlimentosDisponiveisNutricao().find(f=>f.id===document.getElementById('nutritionRecipeFood').value)"),'Receitas usam banco sem importação');
assert.ok(readFileSync(new URL('../web/sw.js',import.meta.url),'utf8').includes("'./data/common-foods.js'"));
console.log('OK: 57 alimentos offline, aliases, porções, mL, cru/cozido, cópias sem duplicação, metas e histórico preservados.');
