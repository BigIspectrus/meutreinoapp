/* v12.11.0 — fluxos mais curtos, voltar nativo e cancelamento sem registrar sessão. */
window._uxCancelling=false;
const UX_EDITORS=new Set(['modalNutritionFood','modalNutritionEntry','modalNutritionRecipe','modalNutritionGoals','modalTreino','modalEditarRegistro','modalExerciseProfile','modalMuscleGoals','modalAddSessaoEx','modalMeta','modalContextoSessao']);
const _uxModalBaselines=new WeakMap(),_uxTabStack=[];
let _uxNavigatingBack=false,_uxUpdateFrame=0,_uxFeedbackTimer=null,_uxInlineEntry=null,_uxMealsPending=false,_uxReviewPersistTimer=null,_uxNativeStarting=null;
function uxFormValue(modal){return JSON.stringify({fields:[...modal.querySelectorAll('input,select,textarea')].map(e=>[e.id||e.name,e.type==='checkbox'||e.type==='radio'?e.checked:e.value]),choices:[...modal.querySelectorAll('.session-rpe-btn.active,.context-chip.active,.icon-opt.selected')].map(e=>[e.id,e.dataset.rpe,e.dataset.context,e.dataset.icon,e.textContent])});}
function uxTopModal(){return [...document.querySelectorAll('.modal-overlay.open')].filter(e=>e.getClientRects().length).sort((a,b)=>(Number(getComputedStyle(a).zIndex)||500)-(Number(getComputedStyle(b).zIndex)||500)).at(-1);}
function solicitarFecharJanelaUX(id){
  if(window._uxCancelling)return false;const modal=document.getElementById(id);if(!modal)return false;
  const baseline=_uxModalBaselines.get(modal);
  if(UX_EDITORS.has(id)&&baseline!==undefined&&baseline!==uxFormValue(modal)&&!confirm('Há alterações nesta janela que ainda não foram salvas. Descartar essas alterações e voltar?'))return false;
  fecharModal(id);return true;
}
function voltarDoTreinoUX(){
  if(window._uxCancelling)return;
  if(treinoAtivoTemplate&&salvarRascunho()!==true)return toast('Não consegui guardar o rascunho. O treino permanece aberto.','error');
  fecharQuickInput();_uxTabStack.length=0;_uxNavigatingBack=true;try{irParaAba('dashboard');}finally{_uxNavigatingBack=false;}if(treinoAtivoTemplate)toast('Treino mantido em andamento. Toque em continuar para retornar.','info');
}
function tratarVoltarApp(source='button'){
  if(window._uxCancelling)return true;
  const focused=document.activeElement,keyboard=window.visualViewport&&window.innerHeight-window.visualViewport.height>140;
  if(keyboard&&focused?.matches('input,textarea,select')){focused.blur();fecharQuickInput();return true;}
  const modal=uxTopModal();if(modal){solicitarFecharJanelaUX(modal.id);return true;}
  if(document.getElementById('quickInputBar')?.classList.contains('visible')){fecharQuickInput();focused?.blur();return true;}
  if(document.body.classList.contains('workout-overview')){document.body.classList.remove('workout-overview');document.getElementById('workoutFocusLabel')?.setAttribute('aria-expanded','false');return true;}
  if(document.body.classList.contains('ux-date-open')){document.body.classList.remove('ux-date-open');focused?.blur();return true;}
  if(_uxInlineEntry){if(!uxQuantidadeAlterada()||confirm('Descartar a edição de quantidade ainda não salva e voltar?'))fecharQuantidadeInlineUX();return true;}
  if(_currentTab==='treinar'&&treinoAtivoTemplate){voltarDoTreinoUX();return true;}
  const previous=_uxTabStack.pop();
  if(previous){_uxNavigatingBack=true;try{if(previous.tab===_currentTab&&previous.sub)ativarSubTab(previous.sub);else{if(previous.sub)_currentSubTab=previous.sub;irParaAba(previous.tab);}requestAnimationFrame(()=>window.scrollTo({top:previous.scroll,behavior:'instant'}));}finally{_uxNavigatingBack=false;}return true;}
  if(_currentTab!=='dashboard'){_uxNavigatingBack=true;try{irParaAba('dashboard');}finally{_uxNavigatingBack=false;}return true;}
  return false;
}
function abrirCancelamentoTreinoUX(){
  if(!treinoAtivoTemplate||window._uxCancelling)return;
  const done=[...document.querySelectorAll('#exerciciosAtivos .serie-check.checked')].length,host=document.getElementById('cancelWorkoutMessageUX');
  host.textContent=done?done+' série(s) foram concluídas nesta sessão. Cancelar não as registra no histórico. Você pode finalizar e salvar o treino parcial em vez disso. Uma cópia de segurança será criada antes do cancelamento.':'Este treino foi iniciado, mas nenhuma série foi concluída. Cancelar remove apenas esta sessão em andamento; treinos anteriores e a ficha permanecem.';
  document.getElementById('cancelWorkoutPartialUX').hidden=!done;document.getElementById('cancelWorkoutCheckUX').hidden=!done;
  document.getElementById('cancelWorkoutConfirmUX').checked=false;document.getElementById('cancelWorkoutDiscardUX').disabled=done>0;
  document.getElementById('modalCancelWorkoutUX').dataset.sessionId=window._treinoSessionId||'';document.getElementById('cancelWorkoutErrorUX').textContent='';document.getElementById('modalCancelWorkoutUX').classList.add('open');
}
async function confirmarCancelamentoTreinoUX(){
  const modal=document.getElementById('modalCancelWorkoutUX'),sid=window._treinoSessionId;
  if(window._uxCancelling||!treinoAtivoTemplate||modal.dataset.sessionId!==String(sid||'')||document.getElementById('cancelWorkoutDiscardUX').disabled)return;
  window._uxCancelling=true;modal.querySelectorAll('button,input').forEach(e=>e.disabled=true);
  document.getElementById('cancelWorkoutErrorUX').textContent='Protegendo o rascunho antes de cancelar…';
  try{
    if(salvarRascunho()!==true)throw new Error('Não consegui proteger seu rascunho. O treino não foi cancelado.');
    const completed=[...document.querySelectorAll('#exerciciosAtivos .serie-check.checked')].length,snapshot=await salvarSnapshotSeguro('antes_cancelar_treino');
    if(completed&&!snapshot)throw new Error('Não consegui criar a cópia de segurança. Finalize o treino parcial ou tente cancelar novamente; suas séries continuam aqui.');
    if(isNativeAndroid()){
      document.getElementById('cancelWorkoutErrorUX').textContent='Parando o serviço e os avisos de descanso do Android…';
      if(_uxNativeStarting)await _uxNativeStarting.catch(()=>{});
      const before=await window.TreinoNativeBridge.getWorkoutState();if(before?.active&&String(before.sessionId||'')!==String(sid))throw new Error('A sessão nativa mudou. Nada foi apagado; reabra o aplicativo.');
      await window.TreinoNativeBridge.finishWorkout({sessionId:sid});
      // O serviço é assíncrono: confirmar a parada antes de limpar a interface.
      let stopped=false;for(let attempt=0;attempt<10;attempt++){
        const state=await window.TreinoNativeBridge.getWorkoutState();
        if(state?.active===false){stopped=true;break;}
        if(String(state.sessionId||'')!==String(sid))throw new Error('A sessão nativa mudou. Nada foi apagado; reabra o aplicativo.');
        await new Promise(resolve=>setTimeout(resolve,150));
      }
      if(!stopped)throw new Error('O Android ainda não confirmou a parada. O rascunho foi mantido; tente novamente.');
    }
    limparRascunho();_v12OriginalStopTimer.call(window);limparDadosNaoSalvos();
    const adhoc=treinoAtivoTemplate.isAdHoc;treinoAtivoTemplate=null;window._treinoSessionId=null;window._treinoStartedAt=null;window._treinoPaused=false;window._treinoPauseStartedAt=null;window._treinoTotalPausedMs=0;
    _sessionExerciseChanges=[];_sessionOrderChanged=false;setModoTreinoAtivo(false);pararRelogioTreino();liberarWakeLock();mostrarFABTimer(false);
    if(adhoc)try{localStorage.removeItem('_adhocTemplateV12');}catch(_){}
    document.getElementById('exerciciosAtivos').replaceChildren();document.querySelectorAll('#aba-treinar .card').forEach(c=>c.style.display='');document.getElementById('treinoAtivoCard').style.display='none';
    fecharModal(modal.id);_uxTabStack.length=0;_uxNavigate.call(window,'dashboard');await atualizarWidgetNativo();toast('Sessão cancelada. Histórico anterior e ficha preservados.','info');
  }catch(error){document.getElementById('cancelWorkoutErrorUX').textContent=error?.message||'Não foi possível cancelar. Seu rascunho foi mantido.';}
  finally{window._uxCancelling=false;modal.querySelectorAll('button,input').forEach(e=>e.disabled=false);agendarContextoUX();}
}
function feedbackLocalUX(text,host=document.getElementById('workoutFeedbackUX')){
  if(!host)return;host.textContent=text;clearTimeout(_uxFeedbackTimer);_uxFeedbackTimer=setTimeout(()=>{if(host.isConnected)host.textContent='';},5000);
}
function agendarContextoUX(){if(_uxUpdateFrame)return;_uxUpdateFrame=requestAnimationFrame(()=>{_uxUpdateFrame=0;atualizarContextoUX();});}
function atualizarContextoUX(){
  const bar=document.getElementById('oneHandWorkout');document.body.classList.toggle('ux-dock-visible',!!bar&&!bar.hidden&&bar.getClientRects().length>0);
  const back=document.getElementById('appBackUX');if(back)back.hidden=_currentTab==='dashboard'||document.body.classList.contains('workout-mode');
  const status=document.getElementById('workoutContextUX');if(status){status.hidden=!treinoAtivoTemplate;if(treinoAtivoTemplate){
    const date=document.getElementById('dataTreinoAtivo').value,label=(!date?'Data não definida':date===hoje()?'Hoje':date.split('-').reverse().join('/'))+' · '+(window._treinoPaused?'Pausado':'Em andamento')+' · rascunho automático';
    let titleState=document.getElementById('workoutTitleStateUX');if(!titleState){titleState=document.createElement('small');titleState.id='workoutTitleStateUX';document.getElementById('treinoAtivoNome').appendChild(titleState);}const titleLabel=label.replace(' · rascunho automático','');if(titleState.textContent!==titleLabel)titleState.textContent=titleLabel;
    if(status.dataset.label!==label){status.dataset.label=label;status.innerHTML='<button type="button" class="ux-date-button" onclick="document.body.classList.toggle(\'ux-date-open\')" aria-label="Alterar data do treino">Rascunho automático · alterar data</button><span id="workoutFeedbackUX" aria-live="polite"></span>';}
  }}
  if(!treinoAtivoTemplate)document.body.classList.remove('ux-date-open');
  const state=window.TreinoMealBuilder?.data(),badge=document.getElementById('mealDraftStateUX');if(badge&&state){const date=state.date===hoje()?'Hoje':state.date.split('-').reverse().join('/');badge.textContent=date+' · '+nomeRefeicaoNutricao(state.mealType)+' · '+(state.mode==='planned'?'Planejamento, não consumido':'Rascunho, ainda não registrado');}
}
function uxPreservarRolagem(action,anchor){const y=anchor?.getBoundingClientRect().top,scroll=window.scrollY;action();requestAnimationFrame(()=>{if(anchor?.isConnected&&y!==undefined)window.scrollBy({top:anchor.getBoundingClientRect().top-y,behavior:'instant'});else window.scrollTo({top:scroll,behavior:'instant'});});}

// Fluxo alimentar no mesmo painel, sem fechar a busca para ajustar quantidade.
function confirmarQuantidadeMontagemUX(){
  const row=window.TreinoMealBuilder.selected();if(row&&(!Number.isFinite(row.grams)||arredondarNutricao(row.grams)<=0))return feedbackLocalUX('Informe uma quantidade válida antes de continuar.',document.getElementById('mealInlineFeedbackUX'));
  escolherOutroAlimentoMontagemNutricao();feedbackLocalUX('Alimento mantido na montagem. Continue buscando ou registre a refeição.',document.getElementById('mealInlineFeedbackUX'));
}
function ajustarCargaUmaMaoUX(direction,repetitions=false){
  const state=estadoTreinoUmaMao(),field=document.getElementById(repetitions?'oneHandReps':'oneHandWeight');if(window._uxCancelling||!state?.row||window._treinoPaused||!['start','complete'].includes(state.action))return;
  if(field.dataset.token!==state.token||field.dataset.sessionId!==String(state.sessionId||''))return agendarTreinoUmaMao();
  if(field.validity.badInput)return feedbackLocalUX('Confira o valor digitado antes de ajustar.');
  const input=state.row.querySelector(repetitions?'.ativo-reps':'.ativo-carga'),value=Number(field.value||0),step=repetitions||capturarTipoCargaSerie(state.row).mode==='plates'?1:Number(state.row.dataset.inc)||2.5;if(!Number.isFinite(value)||value<0||repetitions&&!Number.isInteger(value))return;
  input.value=String(Math.max(0,Math.round((value+Number(direction)*step)*100)/100));field.value=input.value;input.dispatchEvent(new Event('input',{bubbles:true}));agendarTreinoUmaMao();
}
function fecharQuantidadeInlineUX(){document.querySelectorAll('.ux-inline-food-editor').forEach(e=>e.remove());_uxInlineEntry=null;if(_uxMealsPending){_uxMealsPending=false;_uxMealsRender(getRegistrosNutricao().filter(e=>e.date===_nutritionDate));}}
function uxQuantidadeAlterada(){const state=_uxInlineEntry,input=document.getElementById('uxInlineAmount');return !!state&&!!input&&(input.value!==String(state.reference?state.reference.amount:state.entry.grams)||document.getElementById('uxInlineUnit').value!==(state.reference?'saved':'grams'));}
function uxAssinaturaRegistro(entry){const {createdAt,updatedAt,...rest}=entry;return JSON.stringify(rest);}
function abrirQuantidadeInlineUX(id,button){
  if(_uxInlineEntry?.id!==id&&uxQuantidadeAlterada()&&!confirm('Descartar a edição de quantidade ainda não salva para editar outro alimento?'))return;
  if(_uxInlineEntry?.id===id){fecharQuantidadeInlineUX();return;}fecharQuantidadeInlineUX();const entry=getRegistrosNutricao().find(e=>e.id===id);if(!entry)return;
  const serving=normalizarPorcaoRegistradaNutricao(entry.serving,entry.grams),reference=serving&&serving.unit!=='grams'?serving:null;
  _uxInlineEntry={id,snapshot:uxAssinaturaRegistro(entry),entry,reference};const panel=document.createElement('div');panel.className='ux-inline-food-editor';
  panel.innerHTML='<strong>'+esc(entry.name)+'</strong><div class="ux-inline-food-fields"><label>Quantidade<input type="number" inputmode="decimal" min="0.0001" step="any" id="uxInlineAmount" value="'+(reference?reference.amount:entry.grams)+'"></label><label>Unidade<select id="uxInlineUnit" onchange="trocarUnidadeInlineUX(this)"><option value="grams">Gramas (g)</option>'+(reference?'<option value="saved" selected>'+esc(reference.name)+'</option>':'')+'</select></label></div><p class="nutrition-note" id="uxInlineFoodPreview" role="status"></p><div class="ux-inline-actions"><button type="button" class="btn btn-ghost" onclick="fecharQuantidadeInlineUX()">Cancelar edição</button><button type="button" class="btn btn-primary" onclick="salvarQuantidadeInlineUX()">Salvar quantidade</button></div>';
  const row=button.closest('.nutrition-entry');row.after(panel);panel.querySelector('input').addEventListener('input',atualizarQuantidadeInlineUX);panel.querySelector('input').dataset.unit=reference?'saved':'grams';atualizarQuantidadeInlineUX();panel.querySelector('input').focus({preventScroll:true});panel.scrollIntoView({block:'nearest'});
}
function trocarUnidadeInlineUX(select){const state=_uxInlineEntry,input=document.getElementById('uxInlineAmount');if(!state||!input)return;const factor=state.reference?.gramsPerUnit||1,grams=Number(input.value)*(input.dataset.unit==='saved'?factor:1);input.value=arredondarNutricao(select.value==='saved'?grams/factor:grams);input.dataset.unit=select.value;atualizarQuantidadeInlineUX();}
function dadosQuantidadeInlineUX(){const state=_uxInlineEntry,amount=Number(document.getElementById('uxInlineAmount')?.value),saved=document.getElementById('uxInlineUnit')?.value==='saved',grams=amount*(saved?state?.reference?.gramsPerUnit||0:1);return state&&Number.isFinite(amount)&&amount>0&&Number.isFinite(grams)&&arredondarNutricao(grams)>0?{amount,grams,saved}:null;}
function atualizarQuantidadeInlineUX(){const el=document.getElementById('uxInlineFoodPreview'),q=dadosQuantidadeInlineUX();if(!el)return;const e=_uxInlineEntry.entry,ratio=q&&e.grams>0?q.grams/e.grams:0;el.textContent=q?formatarNutricao(e.kcal*ratio)+' kcal · P '+formatarNutricao(e.protein*ratio,1)+' g · C '+formatarNutricao(e.carbs*ratio,1)+' g · G '+formatarNutricao(e.fat*ratio,1)+' g':'Informe uma quantidade maior que zero.';}
function salvarQuantidadeInlineUX(){
  const state=_uxInlineEntry,q=dadosQuantidadeInlineUX();if(!state||!q)return atualizarQuantidadeInlineUX();const entries=getRegistrosNutricao(),entry=entries.find(e=>e.id===state.id);
  if(!entry||uxAssinaturaRegistro(entry)!==state.snapshot)return toast('Este registro mudou. Feche a edição e confira o valor atualizado.','warn');
  if(!(entry.grams>0))return toast('Este registro não tem peso de referência. Use a edição completa.','warn');
  const ratio=q.grams/entry.grams;for(const k of ['kcal','protein','carbs','fat','fiber','sodium'])entry[k]=arredondarNutricao(entry[k]*ratio);
  entry.micros=Object.fromEntries(Object.entries(entry.micros||{}).map(([k,v])=>[k,arredondarNutricao(Number(v)*ratio)]));entry.grams=arredondarNutricao(q.grams);
  entry.serving=normalizarPorcaoRegistradaNutricao(q.saved?{...state.reference,amount:q.amount}:{unit:'grams',amount:q.amount,gramsPerUnit:1,name:'g'},entry.grams);entry.updatedAt=Date.now();
  try{salvarRegistrosNutricaoLocal(entries);}catch(_){return toast('Não consegui salvar. Sua edição continua aberta.','error');}
  const scroll=window.scrollY;fecharQuantidadeInlineUX();dadosNutricaoAlterados('Quantidade atualizada');requestAnimationFrame(()=>window.scrollTo({top:scroll,behavior:'instant'}));
}

// Atualização de revisão por chave: não substituir controles enquanto se digita.
function reconciliarRevisaoTextoUX(host,markup){
  const template=document.createElement('template');template.innerHTML=markup;const incoming=[...template.content.children];
  incoming.forEach((fresh,index)=>{
    if(fresh.tagName==='DETAILS'){const button=document.createElement('button');button.type='button';button.className='btn btn-outline ux-text-confirm';button.textContent='Conferir e recolher este item';button.onclick=()=>confirmarItemTextoUX(index);fresh.appendChild(button);}
    fresh.dataset.textIndex=String(index);const old=[...host.children].find(e=>e.dataset.textIndex===String(index));
    if(!old){host.appendChild(fresh);return;}if(old.tagName!==fresh.tagName){old.replaceWith(fresh);return;}
    if(old.tagName!=='DETAILS'){if(old.innerHTML!==fresh.innerHTML)old.innerHTML=fresh.innerHTML;return;}
    old.className=fresh.className;const summary=old.querySelector('summary'),nextSummary=fresh.querySelector('summary');if(summary.innerHTML!==nextSummary.innerHTML)summary.innerHTML=nextSummary.innerHTML;
    const note=old.querySelector('p'),nextNote=fresh.querySelector('p');note.textContent=nextNote.textContent;note.className=nextNote.className;
    const fields=[...old.querySelectorAll('input,select')],nextFields=[...fresh.querySelectorAll('input,select')];fields.forEach((field,i)=>{const next=nextFields[i];if(!next||field===document.activeElement)return;if(field.tagName==='SELECT'&&field.innerHTML!==next.innerHTML)field.innerHTML=next.innerHTML;if(field.value!==next.value)field.value=next.value;});
    if(fresh.classList.contains('needs-review'))old.open=true;
  });[...host.children].forEach(e=>{if(Number(e.dataset.textIndex)>=incoming.length)e.remove();});
  const draft=window.TreinoMealBuilder.data();if(draft&&_mealTextRows){draft.textReview={source:_mealTextSource,rows:JSON.parse(JSON.stringify(_mealTextRows))};clearTimeout(_uxReviewPersistTimer);_uxReviewPersistTimer=setTimeout(()=>window.TreinoMealBuilder.persist(),180);}
}
function confirmarItemTextoUX(index){const row=_mealTextRows?.[index];if(!row||!valorItemTextoRefeicao(row))return toast('Confira alimento, quantidade e unidade deste item.','info');document.activeElement?.blur();document.querySelector('#mealTextReview [data-text-index="'+index+'"]').open=false;const next=document.querySelector('#mealTextReview .needs-review');next?.scrollIntoView({block:'nearest'});}
function retomarRevisaoTextoUX(){
  const draft=window.TreinoMealBuilder.data(),review=draft?.textReview;if(!review||review.source!==String(draft.textInput||'').trim()||!Array.isArray(review.rows)||!review.rows.length||review.rows.length>60)return false;
  if(review.rows.some(r=>!r||typeof r.raw!=='string'||typeof r.name!=='string'||typeof r.foodId!=='string'||typeof r.unit!=='string'||typeof r.requestedUnit!=='string'||r.amount!==null&&(!Number.isFinite(r.amount)||r.amount<0)))return false;
  _mealTextRows=JSON.parse(JSON.stringify(review.rows));_mealTextSource=review.source;renderizarRevisaoTextoRefeicao();return true;
}

const _uxNavigate=irParaAba;irParaAba=function(id){if(window._uxCancelling)return;if(id!==_currentTab&&document.getElementById('aba-'+id)&&!_uxNavigatingBack){_uxTabStack.push({tab:_currentTab,sub:_currentTab==='progresso'?_currentSubTab:null,scroll:window.scrollY});if(_uxTabStack.length>20)_uxTabStack.shift();}const result=_uxNavigate.apply(this,arguments);agendarContextoUX();return result;};
const _uxSubNavigate=ativarSubTab;ativarSubTab=function(id){if(_currentTab==='progresso'&&id!==_currentSubTab&&!_uxNavigatingBack){_uxTabStack.push({tab:'progresso',sub:_currentSubTab,scroll:window.scrollY});if(_uxTabStack.length>20)_uxTabStack.shift();}return _uxSubNavigate.apply(this,arguments);};
function uxCamposSerieValidos(row){const weight=row?.querySelector('.ativo-carga'),reps=row?.querySelector('.ativo-reps');return !!weight&&!!reps&&cargaSerieValida(row)&&!weight.validity.badInput&&!reps.validity.badInput&&weight.value!==''&&Number.isFinite(Number(weight.value))&&Number(weight.value)>=0&&reps.value!==''&&Number.isInteger(Number(reps.value))&&Number(reps.value)>0;}
const _uxCheck=toggleSerieCheck;toggleSerieCheck=function(button){if(window._uxCancelling)return;const checked=button.classList.contains('checked');if(!checked&&!uxCamposSerieValidos(button.closest('.serie-row')))return feedbackLocalUX('Preencha uma carga válida (placas: número inteiro; 0 é permitido) e repetições inteiras maiores que zero.');const result=_uxCheck.apply(this,arguments);if(checked!==button.classList.contains('checked'))feedbackLocalUX(button.classList.contains('checked')?'Série concluída no rascunho. Finalize o treino para registrar no histórico.':'Série reaberta para correção.');agendarContextoUX();return result;};
const _uxHandAction=agirTreinoUmaMao;agirTreinoUmaMao=function(){const state=estadoTreinoUmaMao();if(state?.action==='complete'){const fields=['oneHandWeight','oneHandReps'].map(id=>document.getElementById(id));if(fields.some(e=>e.validity.badInput||e.value===''||!Number.isFinite(Number(e.value))||Number(e.value)<0)||(capturarTipoCargaSerie(state.row).mode==='plates'&&!Number.isInteger(Number(fields[0].value)))||!Number.isInteger(Number(fields[1].value))||Number(fields[1].value)<=0)return feedbackLocalUX('Confira carga e repetições no controle inferior antes de concluir.');}return _uxHandAction.apply(this,arguments);};
const _uxMealRender=renderizarMontagemRefeicaoNutricao;renderizarMontagemRefeicaoNutricao=function(){const result=_uxMealRender.apply(this,arguments);const draft=window.TreinoMealBuilder.data();if(draft){const search=document.getElementById('nutritionMealSearch');search.hidden=false;document.getElementById('nutritionPickNext').textContent='Conferir e continuar buscando';if(!modoTextoRefeicao())document.getElementById('nutritionAddSave').textContent=draft.mode==='planned'?'Guardar planejamento':'Registrar refeição ('+draft.items.length+')';}agendarContextoUX();return result;};
const _uxHandRender=renderizarTreinoUmaMao;renderizarTreinoUmaMao=function(){const result=_uxHandRender.apply(this,arguments);agendarContextoUX();return result;};
const _uxFinishSave=salvarTreinoAtivo;salvarTreinoAtivo=function(){try{return _uxFinishSave.apply(this,arguments);}finally{window._uxSavingSession=false;}};
if(window.TreinoNativeBridge?.startWorkout){const start=window.TreinoNativeBridge.startWorkout;window.TreinoNativeBridge.startWorkout=function(){const task=Promise.resolve(start.apply(this,arguments));_uxNativeStarting=task;return task.finally(()=>{if(_uxNativeStarting===task)_uxNativeStarting=null;});};}
const _uxMealsRender=renderizarRefeicoesNutricao;renderizarRefeicoesNutricao=function(){if(_uxInlineEntry&&document.querySelector('.ux-inline-food-editor')?.isConnected&&_uxInlineEntry.entry.date===_nutritionDate){_uxMealsPending=true;return;}const result=_uxMealsRender.apply(this,arguments);if(_uxInlineEntry&&!document.querySelector('.ux-inline-food-editor'))_uxInlineEntry=null;return result;};
const _uxTools=injetarFerramentasExercicios;injetarFerramentasExercicios=function(){const result=_uxTools.apply(this,arguments);for(const card of getExerciseCards()){const box=card.querySelector('.exercise-context-tools');if(box&&!box.closest('details.ux-exercise-details')){const details=document.createElement('details');details.className='ux-exercise-details';details.innerHTML='<summary>Aparelho, notas e alternativas</summary>';box.before(details);details.appendChild(box);}}return result;};
const _uxChart=atualizarGrafico;atualizarGrafico=function(){if(!document.getElementById('sub-evolucao')?.getClientRects().length)return;return _uxChart.apply(this,arguments);};
const _uxRoutineRender=renderizarEvolucaoRotina;renderizarEvolucaoRotina=function(){if(!document.getElementById('sub-evolucao')?.getClientRects().length)return;return _uxRoutineRender.apply(this,arguments);};
const _uxActivityDraw=desenharGraficoAtividade;desenharGraficoAtividade=function(){if(!document.getElementById('sub-atividade')?.getClientRects().length)return;return _uxActivityDraw.apply(this,arguments);};

function inicializarUsabilidadeUX(){
  document.body.insertAdjacentHTML('beforeend','<div class="modal-overlay" id="modalCancelWorkoutUX"><div class="modal"><div class="modal-title">Cancelar este treino?</div><p id="cancelWorkoutMessageUX" class="ux-cancel-message"></p><label id="cancelWorkoutCheckUX" class="ux-cancel-check"><input type="checkbox" id="cancelWorkoutConfirmUX" onchange="document.getElementById(\'cancelWorkoutDiscardUX\').disabled=!this.checked">Entendo que as séries desta sessão não serão registradas ao cancelar.</label><p id="cancelWorkoutErrorUX" class="nutrition-note" role="alert"></p><div class="ux-cancel-actions"><button type="button" class="btn btn-primary" onclick="fecharModal(\'modalCancelWorkoutUX\')">Continuar treino</button><button type="button" id="cancelWorkoutPartialUX" class="btn btn-outline" onclick="fecharModal(\'modalCancelWorkoutUX\');abrirEncerramentoTreino()">Finalizar e registrar séries concluídas</button><button type="button" id="cancelWorkoutDiscardUX" class="btn btn-danger" onclick="confirmarCancelamentoTreinoUX()">Cancelar somente esta sessão</button></div></div></div>');
  document.querySelector('.header-identity').insertAdjacentHTML('afterbegin','<button type="button" id="appBackUX" class="ux-app-back" onclick="tratarVoltarApp(\'button\')" aria-label="Voltar à tela anterior" hidden>‹ Voltar</button>');
  const panel=document.querySelector('#modalNutritionAdd .meal-sheet-body');panel.insertAdjacentHTML('afterbegin','<div class="ux-meal-state" id="mealDraftStateUX" role="status"></div>');
  document.getElementById('nutritionPickNext').onclick=confirmarQuantidadeMontagemUX;
  document.getElementById('nutritionAmountFields').insertAdjacentHTML('afterend','<div id="mealInlineFeedbackUX" class="ux-inline-feedback" role="status"></div>');
  const keep=document.querySelector('#modalNutritionAdd .modal-footer .btn-ghost');keep.textContent='Guardar rascunho';keep.setAttribute('aria-label','Guardar rascunho e fechar sem registrar consumo');
  document.getElementById('oneHandWeight').parentElement.insertAdjacentHTML('beforeend','<span class="ux-weight-adjusts"><button type="button" aria-label="Diminuir carga da série atual" onclick="ajustarCargaUmaMaoUX(-1)">−</button><button type="button" aria-label="Aumentar carga da série atual" onclick="ajustarCargaUmaMaoUX(1)">＋</button></span>');
  document.getElementById('oneHandReps').parentElement.insertAdjacentHTML('beforeend','<span class="ux-weight-adjusts"><button type="button" aria-label="Diminuir uma repetição" onclick="ajustarCargaUmaMaoUX(-1,true)">−</button><button type="button" aria-label="Aumentar uma repetição" onclick="ajustarCargaUmaMaoUX(1,true)">＋</button></span>');
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(entries=>{const height=entries[0]?.contentRect.height;if(height>0){const measured=Math.ceil(document.getElementById('oneHandWorkout').getBoundingClientRect().height)+'px';if(document.documentElement.style.getPropertyValue('--ux-dock-height')!==measured)document.documentElement.style.setProperty('--ux-dock-height',measured);}}).observe(document.getElementById('oneHandWorkout'));
  document.querySelectorAll('.modal-overlay').forEach(modal=>{new MutationObserver(records=>{if(!records.some(r=>r.attributeName==='class'))return;if(modal.classList.contains('open'))_uxModalBaselines.set(modal,uxFormValue(modal));}).observe(modal,{attributes:true,attributeFilter:['class']});});
  new MutationObserver(agendarContextoUX).observe(document.body,{attributes:true,attributeFilter:['class']});
  agendarContextoUX();
}
inicializarUsabilidadeUX();
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&tratarVoltarApp('escape')){event.preventDefault();event.stopImmediatePropagation();}},true);
document.addEventListener('click',event=>{const button=event.target.closest?.('button');if(!button)return;const modal=button.closest('.modal-overlay.open');if(!modal||!UX_EDITORS.has(modal.id))return;const onclick=button.getAttribute('onclick')||'';if(button.classList.contains('modal-close-ui')||/^fecharModal\(['"][^'"]+['"]\);?$/.test(onclick)&&/cancelar|fechar|voltar/i.test(button.textContent)){event.preventDefault();event.stopImmediatePropagation();solicitarFecharJanelaUX(modal.id);}},true);
document.addEventListener('click',event=>{if(!_uxInlineEntry||!event.target.closest?.('.nutrition-datebar button'))return;if(!confirm('Descartar a edição de quantidade ainda não salva para mudar o dia?')){event.preventDefault();event.stopImmediatePropagation();return;}fecharQuantidadeInlineUX();},true);
document.addEventListener('click',event=>{if(!_uxInlineEntry||!event.target.closest?.('.ux-entry-full'))return;if(uxQuantidadeAlterada()&&!confirm('Descartar a edição rápida ainda não salva para abrir as opções completas?')){event.preventDefault();event.stopImmediatePropagation();return;}fecharQuantidadeInlineUX();},true);
document.addEventListener('change',event=>{if(event.target.id!=='nutritionDate'||!_uxInlineEntry)return;if(!confirm('Descartar a edição de quantidade ainda não salva para mudar o dia?')){event.target.value=_uxInlineEntry.entry.date;event.preventDefault();event.stopImmediatePropagation();return;}fecharQuantidadeInlineUX();},true);
document.addEventListener('change',event=>{if(event.target.id==='dataTreinoAtivo'){if(window.TreinoWorkflowStore.validDate(event.target.value)){salvarRascunho();document.body.classList.remove('ux-date-open');}else{document.body.classList.add('ux-date-open');feedbackLocalUX('Escolha uma data válida antes de registrar o treino.');}agendarContextoUX();}if(event.target.id==='nutritionDraftDate'||event.target.id==='nutritionAddMeal')agendarContextoUX();});
