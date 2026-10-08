/* v12.9.0 — montagem persistente; diário gravado somente ao confirmar consumo. */
window.TreinoMealBuilder=(()=>{
  let draft=null,sequence=0,persistError=false;
  const clone=value=>JSON.parse(JSON.stringify(value));
  function persist(){
    if(!draft||!draft.items.length)return;
    const snapshot=clone({...draft,saving:false,updatedAt:Date.now()});
    try{localStorage.setItem(window.TreinoWorkflowStore.keys.draft,JSON.stringify(snapshot));persistError=false;}
    catch(error){if(!persistError)toast('Não foi possível guardar o rascunho. A montagem continua aberta.','warn');persistError=true;console.warn(error);}
  }
  function begin(date,mode='consumed'){draft={id:gerarId('meal-draft'),date:String(date),mode:mode==='planned'?'planned':'consumed',mealType:'snack',time:horarioNutricao(),items:[],selected:null,saving:false};return draft;}
  function loadSaved(){const raw=window.TreinoWorkflowStore.read(window.TreinoWorkflowStore.keys.draft,null);if(!raw||!window.TreinoWorkflowStore.validDate(raw.date)||!Array.isArray(raw.items)||!raw.items.length||!raw.id)return null;
    if(raw.items.some(row=>!row?.key||!row.food?.id||!row.food?.name||!['kcal100','protein100','carbs100','fat100'].every(key=>Number.isFinite(Number(row.food[key]))&&Number(row.food[key])>=0)))return null;
    const saved=clone({...raw,mode:raw.mode==='planned'?'planned':'consumed',saving:false});
    saved.items=saved.items.map(row=>{const unit=String(row.unit||'grams'),index=Number(unit.split(':')[1]),measure=row.food.measures?.[index],validUnit=unit==='grams'||unit==='ml'&&Number(row.food.liquidGramsPerMlSnapshot)>0||unit.startsWith('measure:')&&measure?.name&&Number(measure.grams)>0;
      return {...row,amount:validUnit?Number(row.amount)||0:Number(row.grams)||0,grams:Number(row.grams)||0,unit:validUnit?unit:'grams'};});return saved;}
  function resume(snapshot){draft=clone(snapshot);draft.saving=false;draft.selected=null;return draft;}
  function setContext(context){if(!draft)return;for(const key of ['date','mealType','time','mode'])if(context[key]!==undefined)draft[key]=context[key];persist();}
  function active(){return !!draft;}
  function items(){return draft?.items||[];}
  function selected(){return items().find(row=>row.key===draft?.selected)||null;}
  function findFood(id){return items().find(row=>row.food.id===id)||null;}
  function add(food,amount,unit,grams){
    if(!draft)throw new Error('Abra uma refeição antes de escolher alimentos');
    let row=findFood(food.id);
    if(!row){row={key:gerarId('draft-item')+'-'+(++sequence),food:clone(food),amount:Number(amount),unit:String(unit),grams:Number(grams)};if(unit==='ml'&&Number(amount)>0)row.food.liquidGramsPerMlSnapshot=Number(grams)/Number(amount);draft.items.push(row);}
    draft.selected=row.key;persist();return row;
  }
  function select(key){const row=items().find(row=>row.key===key);if(row)draft.selected=key;return row||null;}
  function update(amount,unit,grams){const row=selected();if(row){row.amount=Number(amount);row.unit=String(unit);row.grams=Number(grams);persist();}return row;}
  function remove(key){if(!draft)return;draft.items=draft.items.filter(row=>row.key!==key);if(draft.selected===key)draft.selected=null;if(draft.items.length)persist();else localStorage.removeItem(window.TreinoWorkflowStore.keys.draft);}
  function refreshFood(food){const row=findFood(food.id);if(row){row.food=clone(food);row.unit='grams';row.amount=row.grams;persist();}return row;}
  function valid(){return !!draft&&draft.items.length>0&&draft.items.every(row=>Number.isFinite(row.grams)&&row.grams>0&&row.food?.id&&row.food?.name);}
  function clear(){draft=null;try{localStorage.removeItem(window.TreinoWorkflowStore.keys.draft);persistError=false;}catch(error){console.warn(error);}}
  function data(){return draft;}
  return {begin,active,items,selected,findFood,add,select,update,remove,refreshFood,valid,clear,data,persist,loadSaved,resume,setContext,storageError:()=>persistError};
})();

function iniciarMontagemRefeicaoNutricao(date){
  const builder=window.TreinoMealBuilder;
  if(builder.items().length&&!confirm('Descartar a refeição em montagem? Nenhum alimento dela foi registrado ainda.'))return false;
  builder.begin(date);return true;
}
function alimentoSelecionadoMontagemNutricao(){return window.TreinoMealBuilder?.selected()?.food||null;}
function limparSelecaoMontagemNutricao(){
  _nutritionSelectedFoodId=null;document.getElementById('nutritionSelectedFood').innerHTML='';
  document.getElementById('nutritionAmountFields').style.display='none';
}
function selecionarItemMontagemNutricao(key){
  const row=window.TreinoMealBuilder.select(key);if(!row)return;
  selecionarAlimentoNutricao(row.food.id);document.getElementById('nutritionAddAmount').focus();
}
function removerItemMontagemNutricao(key){
  const builder=window.TreinoMealBuilder,wasSelected=builder.selected()?.key===key;builder.remove(key);
  if(wasSelected)limparSelecaoMontagemNutricao();renderizarMontagemRefeicaoNutricao();renderizarBuscaAlimentosNutricao();
}
function escolherOutroAlimentoMontagemNutricao(){
  document.getElementById('nutritionFoodSearch').value='';limparSelecaoMontagemNutricao();
  window.TreinoMealBuilder.data().selected=null;renderizarBuscaAlimentosNutricao();renderizarMontagemRefeicaoNutricao();
  document.getElementById('nutritionFoodSearch').focus();
}
function renderizarMontagemRefeicaoNutricao(){
  const builder=window.TreinoMealBuilder,el=document.getElementById('nutritionMealDraft');if(!el||!builder.active())return;
  const rows=builder.items(),valid=builder.valid(),values=rows.map(row=>calcularPorGramasNutricao(row.food,Number.isFinite(row.grams)&&row.grams>0?row.grams:0)),totals=totaisNutricao(values),date=builder.data().date;
  el.innerHTML='<div class="meal-draft-heading"><strong>Sua refeição · '+rows.length+' '+(rows.length===1?'alimento':'alimentos')+'</strong><span>'+esc(date.split('-').reverse().join('/'))+'</span></div>'+
    (rows.length?'<div class="meal-draft-total"><strong>'+formatarNutricao(totals.kcal)+' kcal</strong><span>P '+formatarNutricao(totals.protein,1)+' g · C '+formatarNutricao(totals.carbs,1)+' g · G '+formatarNutricao(totals.fat,1)+' g</span></div><div class="meal-draft-items">'+rows.map(row=>{
      const ok=Number.isFinite(row.grams)&&row.grams>0,v=calcularPorGramasNutricao(row.food,ok?row.grams:0);
      return '<div class="meal-draft-item'+(builder.selected()?.key===row.key?' editing':'')+'"><button type="button" class="meal-draft-edit" onclick=\'selecionarItemMontagemNutricao('+jsArg(row.key)+')\'><strong>'+esc(row.food.name)+'</strong><span>'+(ok?formatarNutricao(row.grams,1)+' g · '+formatarNutricao(v.kcal)+' kcal':'Ajuste a quantidade antes de salvar')+'</span></button><button type="button" class="meal-draft-remove" aria-label="Remover '+esc(row.food.name)+' da refeição" onclick=\'removerItemMontagemNutricao('+jsArg(row.key)+')\'>×</button></div>';
    }).join('')+'</div>':'<p class="nutrition-note">Busque e escolha os alimentos. Eles ficam aqui até você salvar a refeição.</p>');
  const save=document.getElementById('nutritionAddSave');save.disabled=!valid||builder.data().saving;
  save.textContent=rows.length?'Salvar refeição ('+rows.length+')':'Salvar refeição';
  const next=document.getElementById('nutritionPickNext');if(next)next.hidden=!builder.selected();
  const search=document.getElementById('nutritionMealSearch');if(search)search.hidden=!!builder.selected();
}
function cancelarMontagemRefeicaoNutricao(){
  const builder=window.TreinoMealBuilder;
  builder.persist();limparSelecaoMontagemNutricao();if(typeof renderizarRascunhoRefeicaoPendente==='function')renderizarRascunhoRefeicaoPendente();return true;
}
function salvarMontagemRefeicaoNutricao(){
  const builder=window.TreinoMealBuilder,draft=builder.data();if(!draft||draft.saving)return;
  if(!builder.valid())return toast('Escolha alimentos e confira todas as quantidades.','warn');
  const mealType=document.getElementById('nutritionAddMeal').value,time=document.getElementById('nutritionAddTime').value||horarioNutricao();
  if(typeof atualizarContextoMontagemPersistente==='function'&&!atualizarContextoMontagemPersistente())return;
  if(draft.mode==='planned')return salvarPlanoDaMontagemNutricao();
  if(!NUTRITION_MEALS.some(m=>m.id===mealType)||!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return toast('Confira a data, refeição e horário.','warn');
  draft.saving=true;renderizarMontagemRefeicaoNutricao();
  const now=Date.now(),rows=draft.items.slice(),entries=rows.map(row=>({id:'draft:'+draft.id+':'+row.key,date:draft.date,time,mealType,foodId:row.food.id,name:row.food.name,
    grams:arredondarNutricao(row.grams),serving:capturarPorcaoNutricao(row.food,row.amount,row.unit,row.grams),...calcularPorGramasNutricao(row.food,row.grams),createdAt:now,updatedAt:now}));
  try{
    // Um único setItem para o conjunto inteiro. Se falhar, o rascunho permanece.
    const existing=getRegistrosNutricao(),ids=new Set(existing.map(e=>e.id));salvarRegistrosNutricaoLocal(existing.concat(entries.filter(e=>!ids.has(e.id))));
  }catch(error){draft.saving=false;renderizarMontagemRefeicaoNutricao();console.warn('Falha ao registrar refeição',error);return toast('Não foi possível salvar. Sua refeição continua em montagem; tente novamente.','error');}
  _nutritionDate=draft.date;builder.clear();limparSelecaoMontagemNutricao();
  try{
    const foods=getAlimentosNutricao(),recipes=getReceitasNutricao();let foodsChanged=false,recipesChanged=false;
    for(const row of rows){const f=row.food,stored=foods.find(x=>x.id===f.id);
      if(stored){stored.lastUsedAt=now;stored.updatedAt=Math.max(stored.updatedAt||0,now);foodsChanged=true;}
      else if(f.builtIn){foods.push({...f,builtIn:false,createdAt:now,updatedAt:now,lastUsedAt:now});foodsChanged=true;}
      else if(f.source==='recipe'){const recipe=recipes.find(r=>r.id===f.sourceId);if(recipe){recipe.lastUsedAt=now;recipe.updatedAt=Math.max(recipe.updatedAt||0,now);recipesChanged=true;}}
    }
    if(foodsChanged)salvarAlimentosNutricaoLocal(foods);
    if(recipesChanged)localStorage.setItem(NUTRITION_RECIPES_KEY,JSON.stringify(recipes));
  }catch(error){console.warn('Refeição salva; recentes não atualizados',error);toast('Refeição salva. Não foi possível atualizar a lista de recentes.','warn');}
  fecharModal('modalNutritionAdd');dadosNutricaoAlterados('Refeição registrada · '+entries.length+' '+(entries.length===1?'alimento':'alimentos'));
  renderizarRascunhoRefeicaoPendente();
}
