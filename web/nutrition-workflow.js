/* v12.9.0 — montagem durável, porções pessoais e planejamento independente. */
let _nutritionBuilderPurpose='consumed',_nutritionPlanningDate='',_nutritionPlanToConsume=null;
const NWF=window.TreinoWorkflowStore;
function idsConsumoRascunho(draft){return draft.items.map(row=>'draft:'+draft.id+':'+row.key);}
function rascunhoRefeicaoPendente(){
  const draft=window.TreinoMealBuilder.data()||window.TreinoMealBuilder.loadSaved();if(!draft?.items.length)return null;
  const recorded=draft.mode==='planned'?getPlanosAlimentares().some(plan=>plan.id===draft.id&&!draft.editPlanId):idsConsumoRascunho(draft).every(id=>getRegistrosNutricao().some(e=>e.id===id));
  if(recorded){window.TreinoMealBuilder.clear();return null;}return draft;
}
function renderizarRascunhoRefeicaoPendente(){
  const el=document.getElementById('nutritionPendingDraft');if(!el)return;const draft=rascunhoRefeicaoPendente();
  el.hidden=!draft;if(!draft)return;
  el.innerHTML='<div><strong>'+(draft.mode==='planned'?'Planejamento em montagem':'Refeição em montagem')+'</strong><small>'+esc(draft.date.split('-').reverse().join('/'))+' · '+draft.items.length+' alimentos'+(window.TreinoMealBuilder.storageError()?' · não foi possível guardar a última alteração':' · guardado neste aparelho')+'</small></div><button type="button" class="btn btn-outline btn-sm" onclick="retomarRascunhoRefeicao()">Continuar</button><button type="button" class="btn btn-ghost btn-sm" onclick="descartarRascunhoRefeicao()">Descartar</button>';
}
function descartarRascunhoRefeicao(){if(!confirm('Descartar somente a refeição em montagem? Registros e planos já salvos permanecem.'))return;window.TreinoMealBuilder.clear();limparSelecaoMontagemNutricao();document.getElementById('modalNutritionAdd').classList.remove('open');renderizarRascunhoRefeicaoPendente();}
function abrirMontagemRefeicaoNutricao(meal='snack',mode='consumed',date=_nutritionDate){
  if(mode==='consumed'&&date>hoje())mode='planned';
  const pending=rascunhoRefeicaoPendente();
  if(pending){retomarRascunhoRefeicao();toast('Sua montagem foi retomada. Para outra, descarte esta ou salve antes.','info');return;}
  const raw=localStorage.getItem(NWF.keys.draft);if(raw&&!confirm('Há um rascunho que não pôde ser lido. Substituir somente esse rascunho por uma nova montagem?'))return;
  if(raw)window.TreinoMealBuilder.clear();
  const draft=window.TreinoMealBuilder.begin(date,mode);draft.mealType=NUTRITION_MEALS.some(m=>m.id===meal)?meal:'snack';mostrarMontagemPersistente(draft);
}
function retomarRascunhoRefeicao(){const pending=rascunhoRefeicaoPendente();if(!pending)return;mostrarMontagemPersistente(window.TreinoMealBuilder.resume(pending));}
function mostrarMontagemPersistente(draft){
  _nutritionBuilderPurpose=draft.mode;_nutritionSelectedFoodId=null;
  document.getElementById('nutritionAddMeal').value=draft.mealType||'snack';document.getElementById('nutritionAddTime').value=draft.time||horarioNutricao();document.getElementById('nutritionDraftDate').value=draft.date;
  document.getElementById('nutritionFoodSearch').value='';limparSelecaoMontagemNutricao();selecionarFiltroAlimentoNutricao('recent');
  const modal=document.getElementById('modalNutritionAdd');modal.querySelector('.modal-title').textContent=draft.mode==='planned'?'Planejar refeição':'Montar refeição';
  document.getElementById('nutritionDraftPurpose').textContent=draft.mode==='planned'?'Previsão · não contabiliza consumo':'Consumo · registrado somente ao salvar';
  modal.classList.add('open');renderizarMontagemRefeicaoNutricao();renderizarRascunhoRefeicaoPendente();
}
function atualizarContextoMontagemPersistente(){
  const draft=window.TreinoMealBuilder.data();if(!draft)return false;const date=document.getElementById('nutritionDraftDate').value;
  if(!NWF.validDate(date)){toast('Escolha uma data válida.','warn');return false;}
  if(draft.mode==='consumed'&&date>hoje()){draft.mode='planned';document.querySelector('#modalNutritionAdd .modal-title').textContent='Planejar refeição';document.getElementById('nutritionDraftPurpose').textContent='Previsão · não contabiliza consumo';renderizarMontagemRefeicaoNutricao();toast('Data futura: esta montagem será planejamento, separado do consumo.','info');}
  window.TreinoMealBuilder.setContext({date,mealType:document.getElementById('nutritionAddMeal').value,time:document.getElementById('nutritionAddTime').value||horarioNutricao()});renderizarRascunhoRefeicaoPendente();return true;
}
function getPorcoesHabituais(){const raw=NWF.read(NWF.keys.usual,[]);return Array.isArray(raw)?raw.filter(row=>row?.foodId&&normalizarPorcaoRegistradaNutricao(row.serving,Number(row.grams))):[];}
function foodMontagemAtual(){return alimentoSelecionadoMontagemNutricao()||getItensCatalogoPessoalNutricao().find(f=>f.id===_nutritionSelectedFoodId);}
function guardarPorcaoHabitual(){
  const food=foodMontagemAtual();if(!food)return;const grams=quantidadeSelecionadaNutricao(food),serving=capturarPorcaoNutricao(food,document.getElementById('nutritionAddAmount').value,document.getElementById('nutritionAddUnit').value,grams);
  if(!serving)return toast('Confira a quantidade antes de guardar.','warn');const foodId=food.originalFoodId||food.id;
  const rows=getPorcoesHabituais().filter(row=>row.foodId!==foodId);rows.push({foodId,grams,serving,updatedAt:Date.now()});if(NWF.save(NWF.keys.usual,rows)){toast('Sua porção habitual foi guardada','success');renderizarPorcaoHabitualMontagem();}
}
function esquecerPorcaoHabitual(){const food=foodMontagemAtual();if(food&&NWF.save(NWF.keys.usual,getPorcoesHabituais().filter(row=>row.foodId!==(food.originalFoodId||food.id))))renderizarPorcaoHabitualMontagem();}
function usarPorcaoHabitual(){
  const food=foodMontagemAtual(),habit=getPorcoesHabituais().find(row=>row.foodId===(food?.originalFoodId||food?.id));if(!food||!habit)return;
  const select=document.getElementById('nutritionAddUnit'),amount=document.getElementById('nutritionAddAmount'),serving=habit.serving;let unit='grams',value=habit.grams;
  if(serving.unit==='ml'&&[...select.options].some(o=>o.value==='ml')){unit='ml';value=serving.amount;}
  else if(serving.unit==='measure'){const index=(food.measures||[]).findIndex(m=>normalizarBuscaNutricao(m.name)===normalizarBuscaNutricao(serving.name));if(index>=0){unit='measure:'+index;value=serving.amount;}}
  select.value=unit;amount.value=value;atualizarPreviaRegistroNutricao();if(unit==='grams'&&serving.unit!=='grams')toast('A medida não está disponível: usei as gramas guardadas. Confira a prévia.','info');
}
function renderizarPorcaoHabitualMontagem(){
  const food=foodMontagemAtual(),host=document.getElementById('nutritionSelectedFood');if(!food||!host)return;host.querySelector('.usual-portion-tools')?.remove();
  const habit=getPorcoesHabituais().find(row=>row.foodId===(food.originalFoodId||food.id)),box=document.createElement('div');box.className='usual-portion-tools';
  box.innerHTML=(habit?'<button type="button" class="btn btn-outline btn-sm" onclick="usarPorcaoHabitual()">Usar minha porção · '+esc(textoPorcaoNutricao(habit.serving))+'</button>':'')+'<button type="button" class="btn btn-ghost btn-sm" onclick="guardarPorcaoHabitual()">'+(habit?'Atualizar porção habitual':'Guardar porção habitual')+'</button>'+(habit?'<button type="button" class="btn btn-ghost btn-sm" onclick="esquecerPorcaoHabitual()">Esquecer</button>':'')+'<small>Apenas preenche a quantidade. Revise a prévia e salve quando consumir.</small>';host.appendChild(box);
}
function normalizarItemPlanoNutricao(row){
  if(!row?.name||!(Number(row.grams)>0)||!['kcal','protein','carbs','fat'].every(k=>Number.isFinite(Number(row[k]))&&Number(row[k])>=0))return null;
  return {name:String(row.name),foodId:row.foodId?String(row.foodId):null,grams:Number(row.grams),serving:normalizarPorcaoRegistradaNutricao(row.serving,Number(row.grams)),...Object.fromEntries(['kcal','protein','carbs','fat','fiber','sodium'].map(k=>[k,numeroNutricao(row[k])])),micros:normalizarMicrosNutricao(row.micros)};
}
function getPlanosAlimentares(){const raw=NWF.read(NWF.keys.plans,[]);if(!Array.isArray(raw))return [];return raw.filter(p=>p?.id&&NWF.validDate(p.date)&&Array.isArray(p.items)&&p.items.length&&p.items.every(normalizarItemPlanoNutricao)).map(p=>({...p,mealType:NUTRITION_MEALS.some(m=>m.id===p.mealType)?p.mealType:'snack',items:p.items.map(normalizarItemPlanoNutricao),status:['pending','registering','consumed'].includes(p.status)?p.status:'pending'}));}
function salvarPlanoDaMontagemNutricao(){
  const builder=window.TreinoMealBuilder,draft=builder.data();if(!draft||!builder.valid()||!atualizarContextoMontagemPersistente())return;
  const plans=getPlanosAlimentares(),id=draft.editPlanId||draft.id,old=plans.find(p=>p.id===id);if(old&&estadoConsumoPlano(old)!=='pending')return toast('Este planejamento já tem registro de consumo. Edite pelo diário.','warn');
  const items=draft.items.map(row=>normalizarItemPlanoNutricao({foodId:row.food.originalFoodId||row.food.id,name:row.food.name,grams:arredondarNutricao(row.grams),serving:capturarPorcaoNutricao(row.food,row.amount,row.unit,row.grams),...calcularPorGramasNutricao(row.food,row.grams)}));
  if(items.some(item=>!item))return toast('Confira os alimentos e quantidades do plano.','warn');
  const plan={id,date:draft.date,mealType:draft.mealType,time:draft.time,items,status:'pending',createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};
  if(!NWF.save(NWF.keys.plans,plans.filter(p=>p.id!==id).concat(plan)))return;
  _nutritionPlanningDate=plan.date;builder.clear();limparSelecaoMontagemNutricao();fecharModal('modalNutritionAdd');renderizarPlanejamentoAlimentar();renderizarRascunhoRefeicaoPendente();toast('Planejamento salvo. Não entrou no consumo.','success');
}
function abrirPlanejamentoAlimentar(){_nutritionPlanningDate=_nutritionPlanningDate||(getPlanosAlimentares().some(p=>p.date===_nutritionDate&&estadoConsumoPlano(p)!=='consumed')?_nutritionDate:dataOffsetNutricao(_nutritionDate,1));document.getElementById('nutritionPlanningDate').value=_nutritionPlanningDate;renderizarPlanejamentoAlimentar();document.getElementById('modalNutritionPlanning').classList.add('open');}
function mudarDataPlanejamento(value){if(!NWF.validDate(value))return;_nutritionPlanningDate=value;renderizarPlanejamentoAlimentar();}
function novaRefeicaoPlanejada(){abrirMontagemRefeicaoNutricao('lunch','planned',_nutritionPlanningDate);}
function adicionarProntaAoPlanejamento(){
  const template=getRefeicoesProntasNutricao().find(t=>t.id===document.getElementById('nutritionPlanningTemplate').value);if(!template)return toast('Escolha uma refeição pronta.','warn');
  const items=template.items.map(normalizarItemPlanoNutricao);if(items.some(i=>!i))return toast('Esta refeição pronta tem dados incompletos. Revise antes de planejar.','warn');
  const plan={id:gerarId('plan'),date:_nutritionPlanningDate,mealType:template.mealType,items,status:'pending',time:'12:00',createdAt:Date.now(),updatedAt:Date.now()};
  if(NWF.save(NWF.keys.plans,getPlanosAlimentares().concat(plan))){renderizarPlanejamentoAlimentar();toast('Refeição pronta adicionada ao planejamento','success');}
}
function idsConsumoPlano(plan){return plan.items.map((_,i)=>'plan:'+plan.id+':'+i);}
function estadoConsumoPlano(plan){if(plan.status==='consumed')return 'consumed';const ids=idsConsumoPlano(plan),entries=getRegistrosNutricao();return ids.some(id=>entries.some(e=>e.id===id))?'consumed':plan.status==='registering'?'registering':'pending';}
function renderizarPlanejamentoAlimentar(){
  const date=_nutritionPlanningDate||dataOffsetNutricao(hoje(),1),plans=getPlanosAlimentares().filter(p=>p.date===date),entries=getRegistrosNutricao().filter(e=>e.date===date),actual=totaisNutricao(entries),pending=plans.filter(p=>estadoConsumoPlano(p)!=='consumed'),forecast=totaisNutricao(pending.flatMap(p=>p.items)),goal=getMetasNutricao();
  const macro=t=>'Prot '+formatarNutricao(t.protein,1)+' g · Carb '+formatarNutricao(t.carbs,1)+' g · Gord '+formatarNutricao(t.fat,1)+' g';
  document.getElementById('nutritionPlanningDate').value=date;
  document.getElementById('nutritionPlanningSummary').innerHTML='<strong>Previsto, ainda não consumido: '+formatarNutricao(forecast.kcal)+' kcal</strong><p>'+macro(forecast)+'</p><small>Já registrado no diário: '+formatarNutricao(actual.kcal)+' kcal. Projeção, se consumir tudo: '+formatarNutricao(actual.kcal+forecast.kcal)+' kcal'+(goal?' / meta manual '+formatarNutricao(goal.kcal)+' kcal':'')+'.</small>';
  document.getElementById('nutritionPlanningTemplate').innerHTML='<option value="">Escolha uma refeição pronta…</option>'+getRefeicoesProntasNutricao().map(t=>'<option value="'+esc(t.id)+'">'+esc(t.name)+'</option>').join('');
  document.getElementById('nutritionPlanningList').innerHTML=plans.length?plans.map(plan=>{const state=estadoConsumoPlano(plan),tot=totaisNutricao(plan.items);return '<section class="planned-meal"><strong>'+esc(nomeRefeicaoNutricao(plan.mealType))+' · '+formatarNutricao(tot.kcal)+' kcal</strong><small>'+macro(tot)+'</small><p>'+plan.items.map(i=>esc(i.name)+' · '+esc(textoQuantidadeRegistroNutricao(i))).join('<br>')+'</p><div class="workflow-actions">'+(state==='consumed'?'<span class="workflow-badge">Consumo já registrado</span>':'<button class="btn btn-primary btn-sm" onclick=\'abrirConfirmacaoConsumoPlano('+jsArg(plan.id)+')\'>'+(state==='registering'?'Revisar registro interrompido':'Registrar que comi')+'</button>'+(state==='pending'?'<button class="btn btn-ghost btn-sm" onclick=\'editarPlanoAlimentar('+jsArg(plan.id)+')\'>Editar</button>':''))+'<button class="btn btn-ghost btn-sm" onclick=\'excluirPlanoAlimentar('+jsArg(plan.id)+')\'>Remover plano</button></div></section>';}).join(''):'<p class="nutrition-note">Nenhuma refeição planejada para esta data. Use os botões abaixo.</p>';
}
function editarPlanoAlimentar(id){
  const plan=getPlanosAlimentares().find(p=>p.id===id);if(!plan||estadoConsumoPlano(plan)!=='pending')return;
  if(rascunhoRefeicaoPendente())return toast('Salve ou descarte a montagem atual antes de editar outro plano.','warn');
  const draft=window.TreinoMealBuilder.begin(plan.date,'planned');draft.editPlanId=plan.id;draft.mealType=plan.mealType;draft.time=plan.time||'12:00';
  draft.items=plan.items.map((item,index)=>{const serving=item.serving,measure=serving&&serving.unit!=='grams'?{id:'saved',name:serving.unit==='ml'?'1 mL':serving.name,grams:serving.gramsPerUnit}:null,factor=100/item.grams;
    const food={id:'planned-snapshot:'+plan.id+':'+index,originalFoodId:item.foodId,name:item.name,...Object.fromEntries(['kcal','protein','carbs','fat','fiber','sodium'].map(k=>[k+'100',item[k]*factor])),micros100:Object.fromEntries(Object.entries(item.micros||{}).map(([k,v])=>[k,v*factor])),measures:measure?[measure]:[],source:'planned_snapshot'};
    return {key:gerarId('draft-item'),food,grams:item.grams,unit:measure?'measure:0':'grams',amount:measure?serving.amount:item.grams};});
  window.TreinoMealBuilder.persist();mostrarMontagemPersistente(draft);
}
function excluirPlanoAlimentar(id){if(!confirm('Remover apenas este planejamento? O consumo já registrado permanece no diário.'))return;if(NWF.save(NWF.keys.plans,getPlanosAlimentares().filter(p=>p.id!==id)))renderizarPlanejamentoAlimentar();}
function abrirConfirmacaoConsumoPlano(id){
  const plan=getPlanosAlimentares().find(p=>p.id===id);if(!plan||estadoConsumoPlano(plan)==='consumed')return toast('Essa refeição já foi registrada. Consulte o diário.','info');
  _nutritionPlanToConsume=id;document.getElementById('nutritionConsumePlanDate').value=plan.date<=hoje()?plan.date:hoje();document.getElementById('nutritionConsumePlanTime').value=horarioNutricao();
  document.getElementById('nutritionConsumePlanNote').textContent=(plan.status==='registering'?'O registro anterior foi interrompido e não foram localizados itens no diário. Revise antes de tentar novamente. ':'')+'Confirmar '+nomeRefeicaoNutricao(plan.mealType)+' com '+plan.items.length+' alimentos como realmente consumida?';document.getElementById('modalConsumeNutritionPlan').classList.add('open');
}
function confirmarConsumoPlanoAlimentar(){
  const plans=getPlanosAlimentares(),plan=plans.find(p=>p.id===_nutritionPlanToConsume);if(!plan)return;
  if(estadoConsumoPlano(plan)==='consumed')return toast('Já registrada. Não serão criados itens duplicados.','info');
  const date=document.getElementById('nutritionConsumePlanDate').value,time=document.getElementById('nutritionConsumePlanTime').value;
  if(!NWF.validDate(date)||date>hoje()||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return toast('Use uma data de consumo até hoje e um horário válido.','warn');
  plan.status='registering';plan.actualDate=date;plan.actualTime=time;plan.updatedAt=Date.now();if(!NWF.save(NWF.keys.plans,plans))return;
  const ids=idsConsumoPlano(plan),now=Date.now(),entries=plan.items.map((item,i)=>({...item,id:ids[i],date,time,mealType:plan.mealType,createdAt:now+i,updatedAt:now+i}));
  try{const existing=getRegistrosNutricao(),known=new Set(existing.map(e=>e.id));salvarRegistrosNutricaoLocal(existing.concat(entries.filter(e=>!known.has(e.id))));}
  catch(error){console.warn(error);toast('Não foi possível registrar o consumo. O planejamento foi preservado.','error');renderizarPlanejamentoAlimentar();return;}
  plan.status='consumed';plan.consumedAt=Date.now();NWF.save(NWF.keys.plans,plans);_nutritionDate=date;fecharModal('modalConsumeNutritionPlan');renderizarPlanejamentoAlimentar();dadosNutricaoAlterados('Consumo confirmado no diário');
}

const _renderNutritionBeforeWorkflow=renderizarNutricao;
renderizarNutricao=function(){const value=_renderNutritionBeforeWorkflow.apply(this,arguments);renderizarRascunhoRefeicaoPendente();return value;};
const _previewBeforeUsual=atualizarPreviaRegistroNutricao;
atualizarPreviaRegistroNutricao=function(){const value=_previewBeforeUsual.apply(this,arguments);renderizarPorcaoHabitualMontagem();return value;};
const _renderMealBeforeWorkflow=renderizarMontagemRefeicaoNutricao;
renderizarMontagemRefeicaoNutricao=function(){const value=_renderMealBeforeWorkflow.apply(this,arguments),draft=window.TreinoMealBuilder.data();if(draft?.mode==='planned')document.getElementById('nutritionAddSave').textContent='Guardar planejamento ('+draft.items.length+')';return value;};
const _resetDataBeforeMealDraft=resetarDados;
resetarDados=function(){window.TreinoMealBuilder.clear();return _resetDataBeforeMealDraft.apply(this,arguments);};
document.addEventListener('DOMContentLoaded',()=>{renderizarRascunhoRefeicaoPendente();for(const id of ['nutritionAddMeal','nutritionAddTime'])document.getElementById(id).addEventListener('change',atualizarContextoMontagemPersistente);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)window.TreinoMealBuilder.persist();});
