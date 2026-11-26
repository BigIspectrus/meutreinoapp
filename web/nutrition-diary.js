const nutritionMacroFields=[['kcal','Calorias','kcal',0],['protein','Proteína','g',1],['carbs','Carboidratos','g',1],['fat','Gorduras','g',1]];
const nutritionProfileLabels={standard:'Padrão',training:'Treino',rest:'Descanso'};

function storedNutritionGoals(){
  const value=parseJSONSeguro(localStorage.getItem(NUTRITION_GOALS_KEY)||'null',null,NUTRITION_GOALS_KEY);
  return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
}
function validNutritionProfile(profile){
  return !!profile&&nutritionMacroFields.every(([key])=>Number.isFinite(Number(profile[key]))&&Number(profile[key])>0);
}
function nutritionProfileForDate(date,stored=storedNutritionGoals(),trainingDates){
  const exists=profile=>profile==='standard'?Number(stored.kcal)>0:validNutritionProfile(stored.profiles?.[profile]);
  const manual=Object.hasOwn(nutritionProfileLabels,stored.dayProfiles?.[date])?stored.dayProfiles[date]:'';
  if(manual&&exists(manual))return manual;
  if(!exists('training')&&!exists('rest'))return 'standard';
  const recorded=trainingDates?trainingDates.has(date):getHist().some(row=>row.data===date);
  const planned=date>=hoje()&&getTreinoPlanejadoHoje(new Date(date+'T12:00:00'));
  const suggestion=recorded||planned?'training':'rest';
  return exists(suggestion)?suggestion:'standard';
}
function renderNutritionProfileSelect(){
  const host=document.getElementById('nutritionDayProfile');
  const stored=storedNutritionGoals();
  const available=['training','rest'].filter(key=>validNutritionProfile(stored.profiles?.[key]));
  host.hidden=!available.length;
  if(!available.length)return;
  const current=nutritionProfileForDate(_nutritionDate,stored);
  const manual=stored.dayProfiles?.[_nutritionDate];
  const options=['standard',...available];
  host.innerHTML='<label for="nutritionProfileChoice">Meta deste dia</label><select id="nutritionProfileChoice" onchange="setNutritionDayProfile(this.value)"><option value="">Sugestão · '+esc(nutritionProfileLabels[current])+'</option>'+options.map(key=>'<option value="'+key+'"'+(manual===key?' selected':'')+'>'+nutritionProfileLabels[key]+'</option>').join('')+'</select>';
  if(options.includes(manual)){
    const auto={...stored,dayProfiles:{}};
    host.querySelector('option').textContent='Sugestão · '+nutritionProfileLabels[nutritionProfileForDate(_nutritionDate,auto)];
  }
}
function setNutritionDayProfile(key){
  const stored=storedNutritionGoals(),dayProfiles={...stored.dayProfiles};
  if(!TreinoWorkflowStore.validDate(_nutritionDate)||!Number(stored.kcal))return;
  if(!key)delete dayProfiles[_nutritionDate];
  else if(key==='standard'||Object.hasOwn(nutritionProfileLabels,key)&&validNutritionProfile(stored.profiles?.[key]))dayProfiles[_nutritionDate]=key;
  else return;
  try{localStorage.setItem(NUTRITION_GOALS_KEY,JSON.stringify({...stored,dayProfiles,updatedAt:Date.now()}));}
  catch(error){renderNutritionProfileSelect();return toast('Não foi possível trocar a meta deste dia.','error');}
  dadosNutricaoAlterados('Meta do dia atualizada');
}
function renderNutritionProfileFields(stored){
  const host=document.getElementById('nutritionExtraProfiles');
  host.innerHTML=['training','rest'].map(key=>{
    const profile=stored.profiles?.[key];
    return '<fieldset><legend>Dia de '+nutritionProfileLabels[key].toLowerCase()+'</legend><div class="nutrition-edit-grid">'+nutritionMacroFields.map(([id,title,unit])=>{
      const inputId='nutrition-profile-'+key+'-'+id;
      return '<label for="'+inputId+'">'+title+' ('+unit+')<input id="'+inputId+'" type="number" min="0.1" step="any" inputmode="decimal" value="'+(Number(profile?.[id])>0?Number(profile[id]):'')+'"></label>';
    }).join('')+'</div></fieldset>';
  }).join('');
}
function readNutritionProfiles(){
  const profiles={};
  for(const type of ['training','rest']){
    const fields=nutritionMacroFields.map(([key])=>[key,document.getElementById('nutrition-profile-'+type+'-'+key)]);
    if(fields.every(([,input])=>!input.value&&!input.validity.badInput))continue;
    const values=Object.fromEntries(fields.map(([key,input])=>[key,Number(input.value)]));
    if(!validNutritionProfile(values))return null;
    profiles[type]=values;
  }
  return profiles;
}

function renderNutritionImpact(host,date,added,excludedIds=[],title='Com esta refeição'){
  if(!host)return;
  host.hidden=!date||!added.length;
  if(host.hidden)return;
  const excludes=new Set(excludedIds);
  const base=getRegistrosNutricao().filter(row=>row.date===date&&!excludes.has(row.id));
  const total=totaisNutricao([...base,...added]),goal=getMetasNutricao(date);
  host.innerHTML='<strong>'+title+'</strong><div class="nutrition-impact-values">'+nutritionMacroFields.map(([key,label,unit,decimals])=>{
    const target=Number(goal?.[key]);
    return '<div><span>'+label+'</span><b>'+formatarNutricao(total[key],decimals)+(target>0?' / '+formatarNutricao(target):'')+' '+unit+'</b>'+(target>0?barraNutricao(total[key],target):'')+'</div>';
  }).join('')+'</div>';
}
function renderDraftNutritionImpact(){
  const host=document.getElementById('nutritionDraftImpact'),draft=window.TreinoMealBuilder.data();
  if(!host||!draft)return;
  const manual=draft.items.filter(row=>row.grams>0).map(row=>calcularPorGramasNutricao(row.food,row.grams));
  const pending=modoTextoRefeicao()?(_mealTextRows||[]).filter(row=>!row.excluded):[];
  const resolved=[];
  for(const row of pending){
    const value=valorItemTextoRefeicao(row);
    if(value)resolved.push(calcularPorGramasNutricao(value.food,value.grams));
  }
  const title=pending.length>resolved.length?'Prévia parcial · itens confirmados':draft.mode==='planned'?'Se consumir este plano':'Com esta refeição';
  renderNutritionImpact(host,draft.date,[...manual,...resolved],[],title);
}

let nutritionMealEdit=null,nutritionMealUndo=null;
function scaledNutritionEntry(entry,grams){
  if(grams===entry.grams)return {...entry};
  const ratio=grams/entry.grams,serving=entry.serving;
  const result={...entry,grams,serving:serving?normalizarPorcaoRegistradaNutricao({...serving,amount:grams/serving.gramsPerUnit},grams):null};
  for(const key of ['kcal','protein','carbs','fat','fiber','sodium'])result[key]=arredondarNutricao(entry[key]*ratio);
  result.micros=Object.fromEntries(Object.entries(entry.micros||{}).map(([key,value])=>[key,arredondarNutricao(value*ratio)]));
  return result;
}
function mealEditorField(id){return document.getElementById(id);}
function startNutritionMealEditor(kind,reference){
  if(nutritionMealEdit?.saving)return;
  const saved=kind==='saved'?getRefeicoesProntasNutricao().find(meal=>meal.id===reference):null;
  const originals=saved?saved.items:kind==='diary'?getRegistrosNutricao().filter(row=>row.date===_nutritionDate&&row.mealType===reference):[];
  if(!originals.length)return toast('Esta refeição não tem alimentos.','info');
  const date=_nutritionDate,meal=saved?.mealType||reference;
  nutritionMealEdit={kind,reference,originals,date,meal,rows:originals.map(entry=>({entry,grams:entry.grams,food:null})),catalog:getItensCatalogoPessoalNutricao()};
  fecharModal('modalNutritionLibrary');
  mealEditorField('mealEditTitle').textContent=saved?saved.name:'Editar '+nomeRefeicaoNutricao(meal).toLowerCase();
  mealEditorField('mealEditDate').max=hoje();
  mealEditorField('mealEditDate').value=date;
  mealEditorField('mealEditType').value=meal;
  mealEditorField('mealEditSave').textContent=saved?'Registrar refeição':'Salvar alterações';
  mealEditorField('mealEditScale').hidden=!saved;
  mealEditorField('mealEditScaleValue').value='1';
  renderNutritionMealEditor();
  mealEditorField('modalNutritionMealEditor').classList.add('open');
}
function renderNutritionMealEditor(){
  const edit=nutritionMealEdit, host=mealEditorField('mealEditRows');
  host.innerHTML=edit.rows.map((row,index)=>{
    const id='meal-edit-grams-'+index;
    const name=row.food?.name||row.entry.name;
    return '<article class="nutrition-meal-edit-row"><strong>'+esc(name)+'</strong><input id="meal-edit-food-id-'+index+'" type="hidden" value="'+esc(row.food?.id||row.entry.foodId||'')+'"><div class="nutrition-edit-row-controls"><label for="'+id+'">Peso (g)<input id="'+id+'" type="text" inputmode="decimal" maxlength="10" value="'+(row.grams==null?'':String(row.grams).replace('.',','))+'" data-meal-grams="'+index+'"></label><button type="button" class="btn btn-ghost btn-sm" data-meal-search="'+index+'">Trocar</button></div><div class="nutrition-meal-replacement" data-meal-replacement="'+index+'" hidden><label for="meal-edit-food-'+index+'">Buscar substituto</label><input type="search" id="meal-edit-food-'+index+'" data-meal-query="'+index+'" autocomplete="off"><div data-meal-choices="'+index+'"></div></div></article>';
  }).join('');
  renderNutritionMealEditorTotals();
}
function mealEditorValue(row){
  const grams=Number(row.grams);
  if(!Number.isFinite(grams)||grams<=0||grams>100000)return null;
  if(row.food)return {...row.entry,foodId:row.food.id,name:row.food.name,grams,serving:capturarPorcaoNutricao(row.food,grams,'grams',grams),...calcularPorGramasNutricao(row.food,grams)};
  return row.entry.grams>0?scaledNutritionEntry(row.entry,grams):null;
}
function renderNutritionMealEditorTotals(){
  const edit=nutritionMealEdit;
  if(!edit)return;
  const values=edit.rows.map(mealEditorValue),valid=values.every(Boolean),totals=totaisNutricao(values.filter(Boolean));
  const date=mealEditorField('mealEditDate').value;
  mealEditorField('mealEditSummary').textContent=valid?formatarNutricao(totals.kcal)+' kcal · P '+formatarNutricao(totals.protein,1)+' g · C '+formatarNutricao(totals.carbs,1)+' g · G '+formatarNutricao(totals.fat,1)+' g':'Confira o peso de cada alimento.';
  mealEditorField('mealEditSave').disabled=!valid||!TreinoWorkflowStore.validDate(date)||date>hoje()||!!edit.saving;
  renderNutritionImpact(mealEditorField('mealEditImpact'),date,valid?values:[],edit.kind==='diary'?edit.originals.map(item=>item.id):[]);
}
function scaleNutritionMealEditor(){
  if(!nutritionMealEdit||nutritionMealEdit.kind!=='saved')return;
  const scale=Number(mealEditorField('mealEditScaleValue').value);
  if(![.5,1,1.5,2].includes(scale))return;
  for(const row of nutritionMealEdit.rows)row.grams=arredondarNutricao(row.entry.grams*scale);
  renderNutritionMealEditor();
}
function nutritionMealEntrySignature(row){
  return assinaturaDiaNutricao([row])+'|'+JSON.stringify(normalizarPorcaoRegistradaNutricao(row.serving,row.grams));
}
function saveNutritionMealEditor(event){
  event.preventDefault();
  const edit=nutritionMealEdit;
  if(!edit||edit.saving)return;
  const date=mealEditorField('mealEditDate').value,meal=mealEditorField('mealEditType').value;
  const values=edit.rows.map(mealEditorValue);
  if(!TreinoWorkflowStore.validDate(date)||date>hoje()||!NUTRITION_MEALS.some(item=>item.id===meal)||values.some(item=>!item))return toast('Confira a refeição, as quantidades e escolha uma data até hoje.','warn');
  const existing=getRegistrosNutricao(),byId=new Map(existing.map(row=>[row.id,row]));
  const editing=edit.kind==='diary';
  if(editing&&edit.originals.some(row=>!byId.has(row.id)||nutritionMealEntrySignature(row)!==nutritionMealEntrySignature(byId.get(row.id))))return toast('Esta refeição mudou. Feche e abra novamente para editar.','warn');
  const now=Date.now(),next=values.map((row,index)=>({...row,date,mealType:meal,
    id:editing?row.id:gerarId('meal'),time:editing?row.time:horarioNutricao(),createdAt:editing?row.createdAt:now+index,updatedAt:now}));
  const changed=new Map(next.map(row=>[row.id,row]));
  if(editing&&next.every(row=>nutritionMealEntrySignature(row)===nutritionMealEntrySignature(byId.get(row.id)))){
    fecharModal('modalNutritionMealEditor');
    return;
  }
  const marks=getEstadoDiasNutricao();
  const previousMarks=Object.fromEntries([...new Set([edit.date,date])].filter(key=>marks[key]?.completed).map(key=>[key,marks[key]]));
  edit.saving=true;
  try{salvarRegistrosNutricaoLocal(editing?existing.map(row=>changed.get(row.id)||row):existing.concat(next));}
  catch(error){edit.saving=false;renderNutritionMealEditorTotals();return toast('Não foi possível salvar. A edição continua aberta.','error');}
  if(!editing){
    try{localStorage.setItem(NUTRITION_MEALS_SAVED_KEY,JSON.stringify(getRefeicoesProntasNutricao().map(item=>item.id===edit.reference?{...item,lastUsedAt:now,updatedAt:now}:item)));}
    catch(error){console.warn('Receita registrada; data de uso não atualizada.',error);}
  }
  nutritionMealUndo={next,previous:editing?edit.originals:[],date:edit.date,target:date,previousMarks};
  nutritionMealEdit=null;
  fecharModal('modalNutritionMealEditor');
  _nutritionDate=date;
  dadosNutricaoAlterados('',false);
  showNutritionMealUndo(editing?'Refeição atualizada':'Refeição registrada');
  if(editing&&date!==edit.date&&getNutritionHealthEnabled())void sincronizarNutritionHealthDate(edit.date,false);
}
function showNutritionMealUndo(message){
  const host=mealEditorField('nutritionMealUndo');
  host.querySelector('span').textContent=message;
  host.hidden=false;
}
function undoNutritionMealEditor(){
  const undo=nutritionMealUndo;
  if(!undo)return;
  const existing=getRegistrosNutricao(),byId=new Map(existing.map(row=>[row.id,row]));
  if(undo.next.some(row=>!byId.has(row.id)||byId.get(row.id).updatedAt!==row.updatedAt||nutritionMealEntrySignature(row)!==nutritionMealEntrySignature(byId.get(row.id)))){
    nutritionMealUndo=null;mealEditorField('nutritionMealUndo').hidden=true;
    return toast('Os itens já mudaram. Revise no diário para ajustar.','warn');
  }
  const previous=new Map(undo.previous.map(row=>[row.id,row])),ids=new Set(undo.next.map(row=>row.id));
  const restored=existing.flatMap(row=>!ids.has(row.id)?[row]:previous.has(row.id)?[{...previous.get(row.id),updatedAt:Date.now()}]:[]);
  try{salvarRegistrosNutricaoLocal(restored);}
  catch(error){return toast('Não foi possível desfazer. Tente novamente.','error');}
  const marks=getEstadoDiasNutricao();
  let marksChanged=false;
  for(const [date,mark] of Object.entries(undo.previousMarks)){
    if(!marks[date]?.completed&&marks[date]?.needsReview&&mark.signature===assinaturaDiaNutricao(restored.filter(row=>row.date===date))){
      marks[date]={...mark,updatedAt:Date.now()};marksChanged=true;
    }
  }
  if(marksChanged)try{localStorage.setItem(NUTRITION_DAY_STATUS_KEY,JSON.stringify(marks));}catch(error){console.warn('Marcação do dia não restaurada.',error);}
  nutritionMealUndo=null;mealEditorField('nutritionMealUndo').hidden=true;
  _nutritionDate=undo.date;dadosNutricaoAlterados('Alteração desfeita');
  if(undo.target!==undo.date&&getNutritionHealthEnabled())void sincronizarNutritionHealthDate(undo.target,false);
}

const mealEditRows=mealEditorField('mealEditRows');
mealEditRows.addEventListener('input',event=>{
  const edit=nutritionMealEdit,field=event.target;
  if(!edit)return;
  if(field.matches('[data-meal-grams]')){
    const text=field.value.trim(),row=edit.rows[Number(field.dataset.mealGrams)];
    row.grams=/^\d+(?:[.,]\d+)?$/.test(text)?Number(text.replace(',','.')):null;
    renderNutritionMealEditorTotals();
  }
  if(field.matches('[data-meal-query]')){
    const index=Number(field.dataset.mealQuery),host=mealEditRows.querySelector('[data-meal-choices="'+index+'"]');
    const matches=field.value.trim().length>=2?edit.catalog.filter(food=>buscarAlimentoTextoNutricao(food,field.value)).slice(0,12):[];
    host.innerHTML=matches.map(food=>'<button type="button" class="btn btn-ghost btn-sm" data-meal-swap="'+index+'" data-food-id="'+esc(food.id)+'">'+esc(food.name+(food.brand?' · '+food.brand:''))+'</button>').join('')||
      '<small class="nutrition-note">'+(field.value.trim().length<2?'Digite pelo menos dois caracteres.':'Nenhum alimento encontrado.')+'</small>';
  }
});
mealEditRows.addEventListener('click',event=>{
  const search=event.target.closest('[data-meal-search]');
  if(search){
    const area=mealEditRows.querySelector('[data-meal-replacement="'+search.dataset.mealSearch+'"]');
    area.hidden=!area.hidden;if(!area.hidden)area.querySelector('input').focus();
  }
  const swap=event.target.closest('[data-meal-swap]');
  if(swap&&nutritionMealEdit){
    const row=nutritionMealEdit.rows[Number(swap.dataset.mealSwap)],food=nutritionMealEdit.catalog.find(item=>item.id===swap.dataset.foodId);
    if(food){row.food=food.id===row.entry.foodId?null:food;renderNutritionMealEditor();}
  }
});
