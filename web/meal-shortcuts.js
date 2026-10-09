/* v12.10.0 — frequência por refeição, somente consumo registrado. */
let _mealShortcutCacheRaw='',_mealShortcutCacheMeal='',_mealShortcutCacheDay='',_mealShortcutCache=[];
function atalhosAlimentaresDaRefeicao(meal){
  const raw=localStorage.getItem(NUTRITION_ENTRIES_KEY)||'[]',day=hoje(),start=dataOffsetNutricao(day,-89);
  if(raw!==_mealShortcutCacheRaw||meal!==_mealShortcutCacheMeal||day!==_mealShortcutCacheDay){const map=new Map();for(const entry of getRegistrosNutricao()){
      if(entry.mealType!==meal||entry.date<start||entry.date>hoje()||!entry.foodId||!(entry.grams>0))continue;
      if(!map.has(entry.foodId))map.set(entry.foodId,{foodId:entry.foodId,days:new Set(),latest:entry});const item=map.get(entry.foodId);item.days.add(entry.date);
      if(entry.date+' '+entry.time>item.latest.date+' '+item.latest.time)item.latest=entry;
    }_mealShortcutCache=[...map.values()].sort((a,b)=>b.days.size-a.days.size||b.latest.date.localeCompare(a.latest.date));_mealShortcutCacheRaw=raw;_mealShortcutCacheMeal=meal;_mealShortcutCacheDay=day;}
  const foods=new Map(getItensCatalogoPessoalNutricao().map(f=>[f.id,f]));return _mealShortcutCache.filter(s=>foods.has(s.foodId)).slice(0,6).map(s=>({...s,food:foods.get(s.foodId)}));
}
function renderizarAtalhosRefeicao(){
  const host=document.getElementById('mealContextShortcuts');if(!host)return;const meal=document.getElementById('nutritionAddMeal').value,items=atalhosAlimentaresDaRefeicao(meal),habits=getPorcoesHabituais();host.hidden=!items.length;
  if(!items.length){host.innerHTML='';return;}host.innerHTML='<div class="meal-shortcut-heading">Seus atalhos · '+esc(NUTRITION_MEALS.find(m=>m.id===meal)?.label||meal)+'</div><div class="meal-context-chips">'+items.map(s=>{
    const habit=habits.find(h=>h.foodId===s.foodId),quantity=habit?textoPorcaoNutricao(habit.serving):textoQuantidadeRegistroNutricao(s.latest,s.food);
    return '<button class="meal-context-chip" type="button" onclick=\'usarAtalhoRefeicao('+jsArg(s.foodId)+')\'><strong>'+esc(s.food.name)+'</strong><small>'+esc(quantity)+'</small></button>';
  }).join('')+'</div><p class="nutrition-note">Mais usados nesta refeição nos últimos 90 dias. O toque prepara a quantidade na montagem; não registra consumo sozinho.</p>';
}
function usarAtalhoRefeicao(id){
  if(!window.TreinoMealBuilder?.active())return;const meal=document.getElementById('nutritionAddMeal').value,item=atalhosAlimentaresDaRefeicao(meal).find(s=>s.foodId===id);if(!item)return;
  const existed=!!window.TreinoMealBuilder.findFood(id);selecionarAlimentoNutricao(id);if(existed)return toast('Este alimento já está na montagem. Ajuste a quantidade na prévia.','info');
  const habit=getPorcoesHabituais().find(h=>h.foodId===id);if(habit)usarPorcaoHabitual();else{document.getElementById('nutritionAddUnit').value='grams';document.getElementById('nutritionAddAmount').value=item.latest.grams;atualizarPreviaRegistroNutricao();}
  renderizarAtalhosRefeicao();
}
const _searchBeforeMealShortcuts=renderizarBuscaAlimentosNutricao;
renderizarBuscaAlimentosNutricao=function(){const result=_searchBeforeMealShortcuts.apply(this,arguments);if(document.getElementById('modalNutritionAdd')?.classList.contains('open'))renderizarAtalhosRefeicao();return result;};
const _openMealBeforeShortcuts=abrirMontagemRefeicaoNutricao;
abrirMontagemRefeicaoNutricao=function(){const result=_openMealBeforeShortcuts.apply(this,arguments);renderizarAtalhosRefeicao();return result;};
document.addEventListener('change',e=>{if(e.target.id==='nutritionAddMeal')renderizarAtalhosRefeicao();});
