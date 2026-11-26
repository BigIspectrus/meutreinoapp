/* v12.10.1 — texto local, revisão de ambiguidades e mesmo salvamento atômico do diário. */
let _mealTextRows=null,_mealTextSource='',_mealTextBusy=false,_mealTextRegisterRow=null;
const mealTextNorm=value=>normalizarBuscaNutricao(value).split(' ').filter(t=>t&&!['de','da','do','das','dos'].includes(t)).map(t=>({ovos:'ovo',claras:'clara',bananas:'banana',fatias:'fatia',colheres:'colher',unidades:'unidade',copos:'copo',xicaras:'xicara',porcoes:'porcao'}[t]||t)).join(' ');
function catalogoTextoRefeicao(){return getItensCatalogoPessoalNutricao().filter(f=>f?.id&&f.name&&['kcal100','protein100','carbs100','fat100'].every(k=>Number.isFinite(Number(f[k]))&&Number(f[k])>=0)&&!(f.source==='taco'&&['taco:457','taco:458'].includes(f.sourceId||f.id)&&['kcal100','protein100','carbs100','fat100'].every(k=>Number(f[k])===0)));}
function candidatosTextoRefeicao(query,foods=catalogoTextoRefeicao(),meal=document.getElementById('nutritionAddMeal').value){
  const q=mealTextNorm(query),tokens=q.split(' ').filter(Boolean);if(!tokens.length)return [];
  const frequency=new Map(atalhosAlimentaresDaRefeicao(meal).map(s=>[s.foodId,s.days.size]));
  return foods.map(food=>{const names=[food.name,...(Array.isArray(food.aliases)?food.aliases:[]),food.name+' '+(food.brand||'')].map(mealTextNorm),matches=names.filter(name=>tokens.every(t=>name.split(' ').includes(t)));
    return {food,score:matches.length?(names.includes(q)?100:80):0,frequency:frequency.get(food.id)||0};
  }).filter(c=>c.score).sort((a,b)=>b.score-a.score||b.frequency-a.frequency||Number(b.food.favorite)-Number(a.food.favorite)||a.food.name.localeCompare(b.food.name,'pt-BR'));
}
function analisarItemTextoRefeicao(raw){
  const row={raw,name:raw,amount:null,requestedUnit:'',foodId:'',unit:'',query:'',excluded:false};
  const prefix=raw.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/u);if(!prefix){row.error='Informe a quantidade antes do alimento, por exemplo: 70g de banana.';return row;}
  if(/^\d+[.,]\d{3}$/.test(prefix[1]))row.error='Quantidade com três casas: confira se é decimal ou milhar e digite o valor abaixo sem separador de milhar.';
  else row.amount=Number(prefix[1].replace(',','.'));
  let rest=prefix[2].trim(),unit=rest.match(/^(kg|quilogramas?|g|gramas?|ml|mililitros?|l|litros?)\b\s*(?:de\s+)?(.+)$/iu);
  // A fronteira acima também aceita 40g; nunca interpreta uma palavra como unidade.
  if(unit){const n=normalizarBuscaNutricao(unit[1]);row.requestedUnit=n==='kg'||n.startsWith('quilograma')?'kg':n==='l'||n.startsWith('litro')?'l':n==='ml'||n.startsWith('mililitro')?'ml':'grams';rest=unit[2];}
  else{unit=rest.match(/^((?:unidades?|un|und|fatias?|por[cç][aã]o|por[cç][oõ]es|copos?|x[ií]caras?|colher(?:es)?\s+(?:de\s+)?(?:sopa|ch[aá])))\s+(?:de\s+)?(.+)$/iu);
    if(unit){row.requestedUnit=mealTextNorm(unit[1].replace(/^(?:un|und)$/i,'unidade'));rest=unit[2];}else row.requestedUnit='unidade';}
  row.name=rest.trim().replace(/^de\s+/i,'');if(!row.name)row.error='Informe o nome do alimento.';
  if(row.requestedUnit==='kg'){if(row.amount!==null)row.amount*=1000;row.requestedUnit='grams';}if(row.requestedUnit==='l'){if(row.amount!==null)row.amount*=1000;row.requestedUnit='ml';}
  return row;
}
function unidadesTextoRefeicao(food){
  if(!food)return [];const density=Number(food.liquidGramsPerMlSnapshot||referenciaComumNutricao(food)?.liquidGramsPerMl);
  return [{value:'grams',label:'Gramas (g)',factor:1},...(Number.isFinite(density)&&density>0?[{value:'ml',label:'Mililitros (mL, aprox.)',factor:density}]:[]),...(food.measures||[]).flatMap((m,i)=>Number.isFinite(Number(m.grams))&&Number(m.grams)>0?[{value:'measure:'+i,label:m.name+' ('+formatarNutricao(m.grams,1)+' g)',factor:Number(m.grams)}]:[])];
}
function sugerirUnidadeTextoRefeicao(row,food){
  const units=unidadesTextoRefeicao(food);if(['grams','ml'].includes(row.requestedUnit)){row.unit=units.some(u=>u.value===row.requestedUnit)?row.requestedUnit:'';return;}
  const matches=units.filter(u=>u.value.startsWith('measure:')&&(row.requestedUnit==='unidade'?/^(?:1\s+)?(?:unidade|ovo|clara|banana)\b/.test(mealTextNorm(food.measures[Number(u.value.split(':')[1])].name)):row.requestedUnit.split(' ').every(t=>mealTextNorm(food.measures[Number(u.value.split(':')[1])].name).split(' ').includes(t))));
  row.unit=matches.length===1?matches[0].value:'';
}
function valorItemTextoRefeicao(row){
  const food=catalogoTextoRefeicao().find(f=>f.id===row.foodId),unit=unidadesTextoRefeicao(food).find(u=>u.value===row.unit),grams=Number(row.amount)*Number(unit?.factor);
  if(row.error||!food||!Number.isFinite(row.amount)||row.amount<=0||!unit||!Number.isFinite(grams)||arredondarNutricao(grams)<=0)return null;
  return {food,amount:row.amount,unit:unit.value,grams};
}
function modoTextoRefeicao(){return window.TreinoMealBuilder.data()?.textMode===true;}
function atualizarAcoesEntradaRefeicao(){
  const draft=window.TreinoMealBuilder.data(),text=modoTextoRefeicao(),save=document.getElementById('nutritionAddSave');
  document.getElementById('mealTextPanel').hidden=!text;document.getElementById('mealManualPanel').hidden=text;
  document.getElementById('mealModeSearch').setAttribute('aria-pressed',String(!text));document.getElementById('mealModeText').setAttribute('aria-pressed',String(text));
  if(text){
    const pending=_mealTextRows?.filter(row=>!row.excluded)||[],unresolved=pending.filter(row=>!valorItemTextoRefeicao(row)).length,source=String(draft?.textInput||'');
    const meals=new Set(pending.map(row=>row.mealType||draft.mealType));
    if(draft.items.length)meals.add(draft.mealType);
    save.disabled=_mealTextBusy||!source.trim()||source.length>=6000;
    save.textContent=!_mealTextRows?'Preparar prévia':unresolved?'Revisar '+unresolved+' pendência(s)':draft.mode==='planned'?'Guardar planejamento':meals.size>1?'Registrar '+meals.size+' refeições':'Registrar refeição';
    if(source.length>=6000)document.getElementById('mealTextStatus').textContent='Limite de texto atingido. Confira se a colagem ficou completa e reduza para menos de 6.000 caracteres antes de registrar. Nada foi registrado.';
  }
}
function mudarModoEntradaRefeicao(text){
  const builder=window.TreinoMealBuilder;if(!builder.active())return;builder.data().textMode=!!text;builder.persist();renderizarMontagemRefeicaoNutricao();atualizarAcoesEntradaRefeicao();document.querySelector('#modalNutritionAdd .meal-sheet-body').scrollTop=0;
}
function abrirRefeicaoPorTexto(){abrirRegistroNutricao(refeicaoSugeridaNutricao());if(document.getElementById('modalNutritionAdd').classList.contains('open'))mudarModoEntradaRefeicao(true);}
function abrirRefeicaoTextoWidget(){
  if(document.querySelector('.modal-overlay.open:not(#modalNutritionAdd)'))return toast('Feche a janela aberta para registrar a refeição por texto, sem perder sua edição.','info');
  const pending=rascunhoRefeicaoPendente();_nutritionDate=hoje();irParaAba('nutricao');abrirRefeicaoPorTexto();
  if(pending&&pending.date!==hoje())document.getElementById('mealTextStatus').textContent='Retomei sua montagem de '+pending.date.split('-').reverse().join('/')+'. Confira a data acima antes de registrar; nenhum item foi descartado.';
}
function alterarTextoRefeicao(){
  const builder=window.TreinoMealBuilder;if(!builder.active())return;builder.data().textInput=document.getElementById('mealTextInput').value.slice(0,6000);builder.data().textReview=null;_mealTextRows=null;_mealTextSource='';builder.persist();document.getElementById('mealTextReview').innerHTML='';document.getElementById('mealTextStatus').textContent='O texto é guardado como rascunho. O consumo só entra no diário ao registrar.';atualizarAcoesEntradaRefeicao();
  if(!builder.items().length&&!builder.data().textInput.trim())localStorage.removeItem(window.TreinoWorkflowStore.keys.draft);
  document.getElementById('mealTextGroups').replaceChildren();
  renderDraftNutritionImpact();
}
function separarRefeicoesDigitadas(input,defaultMeal){
  const header=/^\s*(caf[eé][ \t]+da[ \t]+manh[aã]|almo[cç]o|jantar|lanches?|caf[eé][ \t]+da[ \t]+tarde|ceia)(?:[ \t]*[-–—:][ \t]*(.*)|[ \t]*)$/iu;
  const meals={'cafe da manha':'breakfast',almoco:'lunch',jantar:'dinner'};
  let mealType=defaultMeal,explicit=false;
  const parts=[];
  for(const line of input.replace(/^["'“”]+|["'“”]+$/g,'').split(/\r?\n/)){
    const match=line.match(header);
    if(match){mealType=meals[normalizarBuscaNutricao(match[1])]||'snack';explicit=true;}
    const content=match?(match[2]||''):line;
    // Vírgulas entre números mantêm quantidades como 12,5 g.
    for(const part of content.replace(/(\d),(?=\d)/g,'$1.').split(/[,;]+|\s+e\s+(?=\d)/iu)){
      if(part.trim())parts.push({raw:part.trim(),mealType,explicit});
    }
  }
  return parts;
}
function prepararTextoRefeicao(){
  const rawInput=document.getElementById('mealTextInput').value;if(rawInput.length>=6000){atualizarAcoesEntradaRefeicao();return false;}const input=rawInput.trim();if(!input)return false;
  const field=document.getElementById('nutritionAddMeal'),parts=separarRefeicoesDigitadas(input,field.value);
  if(!parts.length||parts.length>60){document.getElementById('mealTextStatus').textContent='Use de 1 a 60 alimentos por lançamento.';return false;}
  if(!window.TreinoMealBuilder.items().length&&parts.every(part=>part.mealType===parts[0].mealType))field.value=parts[0].mealType;
  if(!atualizarContextoMontagemPersistente())return false;
  const foods=catalogoTextoRefeicao();
  _mealTextRows=parts.map(part=>{
    const row={...analisarItemTextoRefeicao(part.raw),mealType:part.explicit?part.mealType:''};
    const candidates=candidatosTextoRefeicao(row.name,foods,part.mealType);
    if(candidates.length===1){row.foodId=candidates[0].food.id;sugerirUnidadeTextoRefeicao(row,candidates[0].food);}
    return row;
  });
  _mealTextSource=input;renderizarRevisaoTextoRefeicao();return true;
}
function opcoesAlimentoTexto(row){
  const foods=catalogoTextoRefeicao(),candidates=candidatosTextoRefeicao(row.query||row.name,foods,row.mealType||undefined).slice(0,30).map(c=>c.food),chosen=foods.find(f=>f.id===row.foodId);if(chosen&&!candidates.some(f=>f.id===chosen.id))candidates.unshift(chosen);
  return '<option value="">Escolha o alimento…</option>'+candidates.map(f=>'<option value="'+esc(f.id)+'"'+(row.foodId===f.id?' selected':'')+'>'+esc(f.name+(f.brand?' · '+f.brand:''))+'</option>').join('');
}
function renderizarRevisaoTextoRefeicao(){
  const host=document.getElementById('mealTextReview'),groups=document.getElementById('mealTextGroups');if(!_mealTextRows){host.innerHTML='';groups.replaceChildren();return;}
  const rows=_mealTextRows.filter(r=>!r.excluded),unresolved=rows.filter(r=>!valorItemTextoRefeicao(r)).length,values=rows.map(valorItemTextoRefeicao).filter(Boolean),total=totaisNutricao(values.map(v=>calcularPorGramasNutricao(v.food,v.grams))),manual=window.TreinoMealBuilder.items().length;
  const fallback=document.getElementById('nutritionAddMeal').value,mealGroups=new Map();
  for(const row of rows){
    const meal=row.mealType||fallback,group=mealGroups.get(meal)||[];
    group.push(row);mealGroups.set(meal,group);
  }
  const title=mealGroups.size>1?mealGroups.size+' refeições':nomeRefeicaoNutricao([...mealGroups.keys()][0]||fallback);
  document.getElementById('mealTextStatus').textContent=title+' · '+rows.length+' alimento(s) no texto'+(unresolved?' · '+unresolved+' para revisar.':' · '+formatarNutricao(total.kcal)+' kcal · P '+formatarNutricao(total.protein,1)+' g · C '+formatarNutricao(total.carbs,1)+' g · G '+formatarNutricao(total.fat,1)+' g. Pronto para registrar.')+(manual?' Os '+manual+' alimento(s) já montados também serão salvos.':'');
  groups.innerHTML=[...mealGroups].map(([meal,items])=>{
    const ready=items.map(valorItemTextoRefeicao).filter(Boolean),groupTotal=totaisNutricao(ready.map(item=>calcularPorGramasNutricao(item.food,item.grams)));
    return '<article><strong>'+esc(nomeRefeicaoNutricao(meal))+'</strong><small>'+formatarNutricao(groupTotal.kcal)+' kcal · P '+formatarNutricao(groupTotal.protein,1)+' g · C '+formatarNutricao(groupTotal.carbs,1)+' g · G '+formatarNutricao(groupTotal.fat,1)+' g'+(ready.length<items.length?' · '+(items.length-ready.length)+' para revisar':'')+'</small></article>';
  }).join('');
  const markup=_mealTextRows.map((row,i)=>{if(row.excluded)return '<div class="meal-text-row"><span>Item removido: '+esc(row.raw)+'</span> <button class="btn btn-ghost" type="button" onclick="removerItemTextoRefeicao('+i+',false)">Desfazer</button></div>';
    const value=valorItemTextoRefeicao(row),food=catalogoTextoRefeicao().find(f=>f.id===row.foodId),unitOptions=unidadesTextoRefeicao(food),note=row.error||(!food?'Alimento não encontrado ou mais de uma opção possível. Busque e escolha abaixo.':!row.unit?'Medida não disponível ou ambígua. Escolha uma medida cadastrada ou informe o peso em gramas; mL não é convertido sem referência.':!value?'Confira a quantidade: use um número maior que zero, sem separador de milhar.':'Confira alimento, quantidade e unidade antes de registrar.');
    return '<details class="meal-text-row'+(!value?' needs-review':'')+'"'+(!value?' open':'')+'><summary><strong>'+esc(row.raw)+'</strong><small>'+(value?esc(food.name)+' · '+esc(textoQuantidadeRegistroNutricao({grams:value.grams,serving:capturarPorcaoNutricao(food,value.amount,value.unit,value.grams)},food))+' · '+formatarNutricao(calcularPorGramasNutricao(food,value.grams).kcal)+' kcal':'Revisar alimento / quantidade / medida')+'</small></summary><p class="'+(!value?'meal-text-warning':'')+'">'+esc(note)+'</p><label for="mealTextSearch'+i+'">Buscar no catálogo do aplicativo</label><input type="search" id="mealTextSearch'+i+'" value="'+esc(row.query||row.name)+'" oninput="buscarItemTextoRefeicao('+i+',this.value)"><label for="mealTextFood'+i+'">Alimento</label><select id="mealTextFood'+i+'" onchange="escolherAlimentoTextoRefeicao('+i+',this.value)">'+opcoesAlimentoTexto(row)+'</select><div class="meal-text-quantity"><label>Quantidade<input type="text" inputmode="decimal" value="'+esc(row.amount===null?'':String(row.amount).replace('.',','))+'" oninput="ajustarQuantidadeTextoRefeicao('+i+',this.value)"></label><label>Unidade<select onchange="ajustarUnidadeTextoRefeicao('+i+',this.value)"><option value="">Escolha a medida…</option>'+unitOptions.map(u=>'<option value="'+esc(u.value)+'"'+(u.value===row.unit?' selected':'')+'>'+esc(u.label)+'</option>').join('')+'</select></label></div><button type="button" class="btn btn-outline" onclick="cadastrarAlimentoTextoRefeicao('+i+')">Cadastrar alimento ausente</button> <button type="button" class="btn btn-ghost" onclick="removerItemTextoRefeicao('+i+',true)">Remover este item</button></details>';
  }).join('');if(window.reconciliarRevisaoTextoUX)reconciliarRevisaoTextoUX(host,markup);else host.innerHTML=markup;
  [...host.children].forEach((item,index)=>{
    const title=item.querySelector('summary strong');
    if(title&&mealGroups.size>1)title.textContent=nomeRefeicaoNutricao(_mealTextRows[index].mealType||fallback)+' · '+_mealTextRows[index].raw;
  });
  atualizarAcoesEntradaRefeicao();renderDraftNutritionImpact();
}
function buscarItemTextoRefeicao(index,query){const row=_mealTextRows?.[index];if(!row)return;row.query=query;document.getElementById('mealTextFood'+index).innerHTML=opcoesAlimentoTexto(row);}
function escolherAlimentoTextoRefeicao(index,id){const row=_mealTextRows?.[index],food=catalogoTextoRefeicao().find(f=>f.id===id);if(!row)return;row.foodId=food?.id||'';row.unit='';if(food)sugerirUnidadeTextoRefeicao(row,food);renderizarRevisaoTextoRefeicao();}
function ajustarQuantidadeTextoRefeicao(index,value){const row=_mealTextRows?.[index];if(!row)return;row.amount=/^\d+(?:[.,]\d+)?$/.test(value.trim())?Number(value.trim().replace(',','.')):null;row.error='';renderizarRevisaoTextoRefeicao();}
function ajustarUnidadeTextoRefeicao(index,value){const row=_mealTextRows?.[index];if(row){row.unit=value;renderizarRevisaoTextoRefeicao();}}
function removerItemTextoRefeicao(index,excluded){if(_mealTextRows?.[index]){_mealTextRows[index].excluded=excluded;renderizarRevisaoTextoRefeicao();}}
function cadastrarAlimentoTextoRefeicao(index){if(!_mealTextRows?.[index])return;_mealTextRegisterRow=index;abrirModalAlimentoNutricao();document.getElementById('nutritionFoodName').value=_mealTextRows[index].name.slice(0,80);}
function salvarRefeicaoDaTela(){
  if(!modoTextoRefeicao()){
    const draft=window.TreinoMealBuilder.data();if(String(draft?.textInput||'').trim()){toast('Há uma refeição digitada pendente. Revise em “Digitar refeição” para salvá-la junto ou apague o texto antes de salvar só os alimentos montados.','info');mudarModoEntradaRefeicao(true);return;}
    return salvarRegistroNutricao();
  }if(_mealTextBusy)return;
  const source=document.getElementById('mealTextInput').value.trim();if(!_mealTextRows||source!==_mealTextSource){prepararTextoRefeicao();return;}
  const rows=_mealTextRows.filter(r=>!r.excluded);if(!rows.length)return toast('Inclua pelo menos um alimento no texto.','warn');
  if(rows.some(r=>!valorItemTextoRefeicao(r))){renderizarRevisaoTextoRefeicao();document.querySelector('.meal-text-row.needs-review')?.scrollIntoView({block:'nearest'});return toast('Confira os itens destacados. Nenhum alimento foi registrado.','info');}
  if(!atualizarContextoMontagemPersistente())return;
  const builder=window.TreinoMealBuilder,oldCount=builder.items().length,draft=builder.data();
  const meals=new Set(rows.map(row=>row.mealType||draft.mealType));
  if(oldCount)meals.add(draft.mealType);
  if(draft.mode==='planned'&&meals.size>1)return toast('Para planejar, mantenha uma refeição por montagem. O texto continua guardado.','info');
  if(draft.mode==='planned'&&meals.size===1){
    document.getElementById('nutritionAddMeal').value=[...meals][0];
    atualizarContextoMontagemPersistente();
  }
  if(oldCount&&!confirm('Registrar os '+rows.length+' alimentos do texto JUNTO com os '+oldCount+' já na montagem? Confira para não repetir alimentos.'))return;
  _mealTextBusy=true;atualizarAcoesEntradaRefeicao();
  try{
    const batch=rows.map(row=>{const value=valorItemTextoRefeicao(row);return value?{...value,mealType:row.mealType||draft.mealType}:null;});
    if(batch.some(v=>!v))throw new Error('O catálogo mudou; revise os alimentos.');
    builder.appendBatch(batch);_mealTextRows=null;_mealTextSource='';document.getElementById('mealTextInput').value='';limparSelecaoMontagemNutricao();renderizarMontagemRefeicaoNutricao();salvarMontagemRefeicaoNutricao();
  }
  catch(error){console.warn('Registro por texto',error);toast('Não foi possível concluir. Confira a montagem antes de tentar novamente.','error');}
  finally{_mealTextBusy=false;atualizarAcoesEntradaRefeicao();renderizarRascunhoRefeicaoPendente();}
}
function restaurarEntradaTextoRefeicao(){
  const draft=window.TreinoMealBuilder.data();_mealTextRows=null;_mealTextSource='';_mealTextRegisterRow=null;document.getElementById('mealTextInput').value=String(draft?.textInput||'').slice(0,6000);document.getElementById('mealTextReview').innerHTML='';document.getElementById('mealTextStatus').textContent=draft?.textInput?'Texto retomado. Ao registrar, o aplicativo confere novamente os alimentos e medidas.':'';atualizarAcoesEntradaRefeicao();document.querySelector('#modalNutritionAdd .meal-sheet-body').scrollTop=0;atualizarViewportRefeicao();
  document.getElementById('mealTextGroups').replaceChildren();
  if(window.retomarRevisaoTextoUX)retomarRevisaoTextoUX();
}
const _showMealBeforeText=mostrarMontagemPersistente;
mostrarMontagemPersistente=function(){const result=_showMealBeforeText.apply(this,arguments);restaurarEntradaTextoRefeicao();return result;};
const _renderMealBeforeText=renderizarMontagemRefeicaoNutricao;
renderizarMontagemRefeicaoNutricao=function(){const result=_renderMealBeforeText.apply(this,arguments);atualizarAcoesEntradaRefeicao();return result;};
const _selectFoodBeforeText=selecionarAlimentoNutricao;
selecionarAlimentoNutricao=function(id){if(_mealTextRegisterRow!==null&&modoTextoRefeicao()&&_mealTextRows){const index=_mealTextRegisterRow;_mealTextRegisterRow=null;escolherAlimentoTextoRefeicao(index,id);return;}const result=_selectFoodBeforeText.apply(this,arguments);requestAnimationFrame(()=>{if(document.getElementById('modalNutritionAdd').classList.contains('open')&&!modoTextoRefeicao())document.getElementById('nutritionAmountFields').scrollIntoView({block:'nearest'});});return result;};
const _saveFoodBeforeText=salvarAlimentoNutricao;
salvarAlimentoNutricao=function(){
  if(_mealTextRegisterRow!==null&&modoTextoRefeicao()&&['nutritionFoodKcal','nutritionFoodProtein','nutritionFoodCarbs','nutritionFoodFat'].some(id=>{const value=document.getElementById(id).value;return value.trim()===''||!Number.isFinite(Number(value))||Number(value)<0;}))return toast('Preencha kcal, proteína, carboidratos e gordura do alimento, inclusive 0 quando informado. Não estimamos valores ausentes.','warn');
  return _saveFoodBeforeText.apply(this,arguments);
};
function atualizarViewportRefeicao(){
  const modal=document.getElementById('modalNutritionAdd');if(!modal?.classList.contains('open'))return;const viewport=window.visualViewport;
  modal.style.setProperty('--meal-keyboard-gap',(viewport?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop):0)+'px');modal.style.setProperty('--meal-viewport-top',(viewport?Math.max(0,viewport.offsetTop):0)+'px');
}
window.visualViewport?.addEventListener('resize',atualizarViewportRefeicao);window.visualViewport?.addEventListener('scroll',atualizarViewportRefeicao);window.addEventListener('resize',atualizarViewportRefeicao);
document.addEventListener('change',e=>{if(['nutritionAddMeal','nutritionDraftDate','nutritionAddTime'].includes(e.target.id)&&modoTextoRefeicao()&&_mealTextRows)renderizarRevisaoTextoRefeicao();});
new MutationObserver(()=>{if(!document.getElementById('modalNutritionFood').classList.contains('open'))_mealTextRegisterRow=null;}).observe(document.getElementById('modalNutritionFood'),{attributes:true,attributeFilter:['class']});
