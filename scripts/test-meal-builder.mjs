import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {buildCommonFoods} from './build-common-foods.mjs';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
const builderSource=readFileSync(new URL('../web/meal-builder.js',import.meta.url),'utf8');
const catalog=buildCommonFoods();
function source(name){
  const start=html.indexOf('function '+name+'('),after=html.slice(start+1).search(/\n(?:async )?function /);
  assert.ok(start>=0&&after>=0,name);return html.slice(start,start+1+after);
}
const plain=value=>JSON.parse(JSON.stringify(value));
function environment(){
  const old={id:'old',date:'2026-10-01',time:'08:30',mealType:'breakfast',foodId:'past',name:'Histórico',grams:10,kcal:45,protein:2,carbs:4,fat:2,fiber:1,sodium:3,micros:{calciumMg:5},createdAt:1,updatedAt:2};
  const goals='{"kcal":2222,"protein":123,"carbs":200,"fat":60}';
  const storage=new Map([['entries',JSON.stringify([old])],['goals',goals]]),writes=[],events=[],elements=new Map();
  let consent=true,failKey=null,sequence=0;
  const element=id=>{
    if(!elements.has(id)){const classes=new Set();elements.set(id,{value:'',innerHTML:'',textContent:'',style:{},disabled:false,hidden:false,
      focus(){events.push('focus:'+id);},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v),contains:v=>classes.has(v)}});}
    return elements.get(id);
  };
  const ctx=vm.createContext({window:{TreinoCommonFoods:catalog},console:{warn(){}},Date,
    localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(k===failKey)throw new Error('QuotaExceededError');writes.push(k);storage.set(k,String(v));}},
    document:{getElementById:element,querySelectorAll:()=>[]},
    parseJSONSeguro:(s,f)=>{try{return JSON.parse(s);}catch{return f;}},
    NUTRITION_FOODS_KEY:'foods',NUTRITION_ENTRIES_KEY:'entries',NUTRITION_RECIPES_KEY:'recipes',
    NUTRITION_MICROS:[{key:'calciumMg'},{key:'potassiumMg'},{key:'vitaminB12Mcg'}],
    NUTRITION_MEALS:[{id:'snack'},{id:'breakfast'},{id:'lunch'},{id:'dinner'}],
    _nutritionSelectedFoodId:null,_nutritionDate:'2026-10-06',_nutritionFoodScope:'recent',
    gerarId:()=> 'new-'+(++sequence),horarioNutricao:()=> '12:00',confirm:()=>consent,
    dadosNutricaoAlterados:message=>events.push('changed:'+message),toast:message=>events.push('toast:'+message),
    renderizarBuscaAlimentosNutricao:()=>{},esc:s=>String(s),jsArg:v=>JSON.stringify(String(v)),
  });
  for(const name of ['numeroNutricao','arredondarNutricao','formatarNutricao','normalizarMicrosNutricao','somarMicrosNutricao','normalizarBuscaNutricao','getAlimentosNutricao','getRegistrosNutricao','getReceitasNutricao','totaisReceitaNutricao','receitaComoAlimentoNutricao','salvarAlimentosNutricaoLocal','salvarRegistrosNutricaoLocal','getAlimentosComunsNutricao','referenciaComumNutricao','getAlimentosDisponiveisNutricao','getItensCatalogoPessoalNutricao','fonteAlimentoNutricao','calcularPorGramasNutricao','totaisNutricao','quantidadeSelecionadaNutricao','selecionarFiltroAlimentoNutricao','abrirRegistroNutricao','selecionarAlimentoNutricao','atualizarPreviaRegistroNutricao','salvarRegistroNutricao','fecharModal'])vm.runInContext(source(name),ctx);
  vm.runInContext(builderSource,ctx);
  const builder=ctx.window.TreinoMealBuilder;
  function choose(id,amount,unit='grams'){
    ctx.selecionarAlimentoNutricao(id);
    if(amount!==undefined){element('nutritionAddAmount').value=String(amount);element('nutritionAddUnit').value=unit;ctx.atualizarPreviaRegistroNutricao();}
    return builder.selected();
  }
  const readEntries=()=>JSON.parse(storage.get('entries'));
  return {ctx,builder,element,storage,writes,events,choose,readEntries,old,goals,setConsent:v=>consent=v,setFailure:k=>failKey=k};
}

// Handlers reais: escolher, editar e remover não escrevem no diário.
{
  const e=environment();e.ctx.abrirRegistroNutricao('lunch');
  assert.equal(e.element('nutritionAddSave').disabled,true);
  e.choose('taco:140',2,'measure:0'); // pão de queijo pequeno: 2 x 25 g
  e.choose('tbca:BRC0070G',200,'ml');
  e.choose('tbca:BRC0116A',100);
  assert.equal(e.builder.items().length,3);assert.equal(e.writes.length,0);
  assert.equal(e.builder.findFood('taco:140').grams,50);
  assert.equal(e.builder.findFood('tbca:BRC0070G').grams,200);
  assert.equal(e.element('nutritionMealSearch').hidden,true,'Ao ajustar, ocultar pesquisa para reduzir rolagem');
  e.ctx.escolherOutroAlimentoMontagemNutricao();assert.equal(e.element('nutritionMealSearch').hidden,false);
  assert.equal(e.builder.items().length,3,'Voltar à busca mantém a lista');
  e.ctx.selecionarAlimentoNutricao('taco:140');
  assert.equal(e.builder.items().length,3,'Reescolher deve focar item, não duplicar');
  assert.equal(e.element('nutritionAddAmount').value,2);assert.equal(e.element('nutritionAddUnit').value,'measure:0');
  e.element('nutritionAddAmount').value='3';e.ctx.atualizarPreviaRegistroNutricao();
  assert.equal(e.builder.findFood('taco:140').grams,75);
  e.ctx.removerItemMontagemNutricao(e.builder.findFood('tbca:BRC0116A').key);
  assert.equal(e.builder.items().length,2);e.choose('tbca:BRC0116A',100);
  const expected=e.builder.items().map(row=>({name:row.food.name,grams:row.grams,...plain(e.ctx.calcularPorGramasNutricao(row.food,row.grams))}));
  assert.ok(e.element('nutritionMealDraft').innerHTML.includes('Sua refeição · 3 alimentos'));
  e.ctx._nutritionDate='2026-10-07';e.ctx.salvarRegistroNutricao();
  const entries=e.readEntries();assert.equal(entries.length,4);assert.deepEqual(entries[0],e.old,'Histórico intacto');
  expected.forEach((value,i)=>{const row=entries[i+1];for(const key of Object.keys(value))assert.deepEqual(row[key],value[key]);assert.equal(row.date,'2026-10-06');assert.equal(row.time,'12:00');assert.equal(row.mealType,'lunch');});
  assert.equal(e.ctx._nutritionDate,'2026-10-06','Diário retorna à data confirmada');
  assert.equal(e.writes.filter(k=>k==='entries').length,1,'Um único commit de todos os alimentos');
  assert.equal(e.writes.filter(k=>k==='foods').length,1,'Recentes em lote');
  assert.equal(JSON.parse(e.storage.get('foods')).length,3);
  assert.equal(e.storage.get('goals'),e.goals);assert.equal(e.events.filter(v=>v.startsWith('changed:')).length,1);
  assert.equal(e.builder.active(),false);assert.equal(e.ctx._nutritionSelectedFoodId,null);
  e.ctx.salvarRegistroNutricao();assert.equal(e.readEntries().length,4,'Duplo toque não duplica');
  e.ctx.abrirRegistroNutricao();e.choose('taco:140',25);e.ctx.salvarRegistroNutricao();
  assert.equal(JSON.parse(e.storage.get('foods')).length,3,'Reuso não duplica cadastro');
}

// Um item inválido impede o lote inteiro; fechar exige confirmação.
{
  const e=environment();e.ctx.abrirRegistroNutricao();e.choose('taco:140',0);e.choose('tbca:BRC0070G',200,'ml');
  assert.equal(e.builder.valid(),false);assert.equal(e.element('nutritionAddSave').disabled,true);
  e.ctx.salvarRegistroNutricao();assert.equal(e.writes.length,0);
  e.setConsent(false);e.ctx.fecharModal('modalNutritionAdd');assert.equal(e.builder.items().length,2);
  assert.equal(e.element('modalNutritionAdd').classList.contains('open'),true);
  e.ctx.abrirRegistroNutricao('dinner');assert.equal(e.builder.items().length,2,'Reabrir não apaga sem consentimento');
  e.setConsent(true);e.ctx.fecharModal('modalNutritionAdd');assert.equal(e.builder.active(),false);
  assert.equal(e.element('modalNutritionAdd').classList.contains('open'),false);assert.equal(e.writes.length,0);
  e.ctx.abrirRegistroNutricao();e.ctx.fecharModal('modalNutritionAdd');assert.equal(e.builder.active(),false,'Fechar vazio também funciona');
}

// Falha no commit mantém o rascunho inteiro e permite uma tentativa segura.
{
  const e=environment();e.ctx.abrirRegistroNutricao();e.choose('taco:140',50);e.choose('tbca:BRC0070G',200,'ml');
  e.setFailure('entries');e.ctx.salvarRegistroNutricao();
  assert.equal(e.readEntries().length,1);assert.equal(e.writes.length,0);assert.equal(e.builder.items().length,2);
  assert.equal(e.builder.data().saving,false);assert.equal(e.element('nutritionAddSave').disabled,false);
  e.setFailure(null);e.ctx.salvarRegistroNutricao();assert.equal(e.readEntries().length,3);
  assert.equal(e.writes.filter(k=>k==='entries').length,1);
}

// Falha secundária de recentes não invalida nem repete a refeição já gravada.
{
  const e=environment();e.ctx.abrirRegistroNutricao();e.choose('taco:140',50);e.choose('tbca:BRC0070G',200,'ml');
  e.setFailure('foods');e.ctx.salvarRegistroNutricao();assert.equal(e.readEntries().length,3);assert.equal(e.builder.active(),false);
  assert.equal(e.events.filter(v=>v.startsWith('changed:')).length,1);
  e.ctx.salvarRegistroNutricao();assert.equal(e.readEntries().length,3);assert.equal(e.writes.filter(k=>k==='entries').length,1);
}

// Snapshot de composição, revisão explícita e receitas com micronutrientes.
{
  const e=environment(),food={...catalog.foods[0],id:'own',name:'Alimento próprio',source:'manual',kcal100:100,micros100:{calciumMg:10},measures:[{name:'Colher',grams:25}]};
  e.storage.set('foods',JSON.stringify([food]));
  e.storage.set('recipes',JSON.stringify([{id:'r',name:'Receita caseira',yieldGrams:100,servings:2,items:[{food,grams:100}],createdAt:1,updatedAt:2}]));
  e.ctx.abrirRegistroNutricao();e.choose('own',2,'measure:0');
  food.kcal100=999;e.storage.set('foods',JSON.stringify([food]));
  assert.equal(e.builder.selected().food.kcal100,100,'Snapshot não muda incidentalmente');
  const revision={...food,kcal100:200,measures:[{name:'Nova colher',grams:40}]};
  e.builder.refreshFood(revision);e.ctx.selecionarAlimentoNutricao('own');
  assert.equal(e.builder.selected().grams,50,'Revisão mantém peso escolhido');assert.equal(e.element('nutritionAddUnit').value,'grams');
  e.choose('recipe:r',1,'measure:0');assert.equal(e.builder.selected().grams,50);
  e.ctx.salvarRegistroNutricao();const entries=e.readEntries();
  assert.equal(entries[1].kcal,100);assert.equal(entries[1].micros.calciumMg,5);
  assert.equal(entries[2].kcal,50);assert.equal(entries[2].micros.calciumMg,5);
  assert.ok(JSON.parse(e.storage.get('recipes'))[0].lastUsedAt>0);
  assert.equal(JSON.parse(e.storage.get('foods')).length,1);assert.deepEqual(entries[0],e.old);
}

// Guardas de data, horário e concorrência preservam o lote.
{
  const e=environment();e.ctx.abrirRegistroNutricao();e.choose('taco:140',50);
  e.element('nutritionAddTime').value='25:61';e.ctx.salvarRegistroNutricao();assert.equal(e.writes.length,0);
  e.element('nutritionAddTime').value='13:20';e.builder.data().saving=true;e.ctx.salvarRegistroNutricao();assert.equal(e.writes.length,0);
  e.builder.data().saving=false;e.builder.data().date='invalid';e.ctx.salvarRegistroNutricao();assert.equal(e.writes.length,0);
}
assert.ok(readFileSync(new URL('../web/sw.js',import.meta.url),'utf8').includes("'./meal-builder.js'"),'Rascunho incluído no shell offline');
console.log('OK: refeição em lote, edição/remoção, g/mL/medidas, receitas/micros, snapshots, data, confirmação, falhas de gravação, duplo toque e metas/histórico intactos.');
