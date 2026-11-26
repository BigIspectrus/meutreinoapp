/* v12.10.0 — controles inferiores delegam às ações/timestamps existentes. */
let _oneHandState=null,_oneHandFrame=0,_oneHandKeyboardGap=0,_oneHandRow=null;
function modoUmaMaoAtivo(){return localStorage.getItem(window.TreinoWorkflowStore.keys.oneHand)!=='0';}
function definirModoUmaMao(value){try{localStorage.setItem(window.TreinoWorkflowStore.keys.oneHand,value==='0'?'0':'1');renderizarTreinoUmaMao();}catch(_){toast('Não foi possível guardar a preferência.','error');}}
function estadoTreinoUmaMao(){
  if(!treinoAtivoTemplate)return null;
  const rest=Math.max(0,Math.ceil((_timerEndTime-Date.now())/1000));
  const active=cardExercicioAtivoSessao();
  const running=linhasValidasTreino().find(serieEmAndamento);
  const row=running||(rest?proximaSerieDoDescanso():null)||serieEmFoco(active);
  const card=row?.closest('.exercicio-card')||active;
  const other=row?null:getExerciseCards().find(candidate=>candidate!==card&&serieEmFoco(candidate));
  const action=window._treinoPaused?'resume':row?(running?'complete':'start'):other?'next':'finish';
  if(row&&!row.dataset.oneHandToken)row.dataset.oneHandToken=gerarId('hand');return {sessionId:window._treinoSessionId,card,row,other,action,rest,token:row?.dataset.oneHandToken||'end'};
}
function agendarTreinoUmaMao(){if(_oneHandFrame)return;_oneHandFrame=requestAnimationFrame(()=>{_oneHandFrame=0;renderizarTreinoUmaMao();});}
function renderizarTreinoUmaMao(){
  const bar=document.getElementById('oneHandWorkout');if(!bar)return;
  const waitingForExercise=treinoAtivoTemplate?.isBlank&&!getExerciseCards().length;
  const enabled=modoUmaMaoAtivo()&&!waitingForExercise,state=estadoTreinoUmaMao(),train=document.body.classList.contains('workout-mode'),modal=!!document.querySelector('.modal-overlay.open,.quick-input-overlay.open,.quick-input-panel.open')||document.getElementById('quickInputBar')?.getAttribute('aria-hidden')==='false',focus=document.activeElement,otherKeyboard=['INPUT','TEXTAREA'].includes(focus?.tagName)&&!bar.contains(focus);
  const visible=enabled&&!!state&&train&&!modal&&!otherKeyboard;
  bar.hidden=!visible;document.body.classList.toggle('one-hand-workout',enabled&&!!state&&train);
  const dockRow=visible?state.row:null;
  if(_oneHandRow!==dockRow){_oneHandRow?.classList.remove('serie-dock-row');dockRow?.classList.add('serie-dock-row');_oneHandRow=dockRow;}
  if(!visible){_oneHandState=null;return;}
  _oneHandState=state;
  const {row,action}=state,ex=state.card?.dataset.ex||treinoAtivoTemplate.nome,serie=numeroSerieSessao(row),resting=state.rest>0&&action!=='complete';
  const labels={resume:'Retomar treino',complete:'Concluir série '+serie,start:'Iniciar série '+serie,next:'Ir para '+(state.other?.dataset.ex||'o próximo exercício'),finish:'Finalizar treino'};
  const phase={resume:'Treino pausado',complete:'Em andamento',start:resting?'Próxima série · em descanso':'Pronta para iniciar',next:'Escolha ou avance para outro exercício',finish:'Revise a sessão antes de finalizar'};
  const heading=row?tituloSerieSessao(row):action==='resume'?'Treino pausado':action==='next'?'Exercício concluído':'Fim das séries';
  document.getElementById('oneHandSetNumber').textContent=heading;
  document.getElementById('oneHandExercise').textContent=ex;
  document.getElementById('oneHandStateLabel').textContent=phase[action];
  bar.dataset.phase=action==='start'&&resting?'rest':action;
  const receipt=document.getElementById('oneHandReceipt'),receiptText=document.getElementById('oneHandReceiptText');
  const previous=_ultimaSerieConcluida?.isConnected&&_ultimaSerieConcluida.querySelector('.serie-check.checked')?_ultimaSerieConcluida:null;
  const confirmation=previous&&action!=='complete'?`Série ${numeroSerieSessao(previous)} concluída`:'';
  receipt.hidden=!confirmation;
  receipt.querySelector('button').disabled=action==='resume';
  if(receiptText.textContent!==confirmation)receiptText.textContent=confirmation;
  const main=document.getElementById('oneHandMainAction');
  if(main.dataset.action!==action||main.dataset.token!==state.token||main.dataset.sessionId!==String(state.sessionId||''))document.getElementById('oneHandSetError').textContent='';
  main.textContent=labels[action];main.dataset.action=action;main.dataset.token=state.token;main.dataset.sessionId=state.sessionId||'';
  for(const [id,selector] of [['oneHandWeight','.ativo-carga'],['oneHandReps','.ativo-reps']]){const field=document.getElementById(id),original=state.row?.querySelector(selector);if(document.activeElement===field&&(field.dataset.token!==state.token||field.dataset.sessionId!==String(state.sessionId||'')||window._treinoPaused))field.blur();field.disabled=!original||!!window._treinoPaused;field.dataset.token=state.token;field.dataset.sessionId=state.sessionId||'';if(document.activeElement!==field)field.value=original?.value||'';field.setAttribute('aria-label',(id==='oneHandWeight'?EXERCISE_LOAD_MODES[capturarTipoCargaSerie(state.row).mode].field:'Repetições')+' · '+ex+' · série '+(serie||'—'));}
  document.getElementById('oneHandWeightLabel').textContent=EXERCISE_LOAD_MODES[capturarTipoCargaSerie(state.row).mode].field;
  const loadField=document.getElementById('oneHandWeight'),plateMode=capturarTipoCargaSerie(state.row).mode==='plates';loadField.step=plateMode?'1':'any';loadField.inputMode=plateMode?'numeric':'decimal';loadField.placeholder=plateMode?'placas':'kg';
  const rest=document.getElementById('oneHandRestControls');rest.hidden=!resting;document.getElementById('oneHandRestTime').textContent=Math.floor(state.rest/60)+':'+String(state.rest%60).padStart(2,'0');rest.querySelectorAll('button').forEach(b=>b.disabled=!!window._treinoPaused);
  document.getElementById('oneHandFields').hidden=!row||resting||action==='resume';
  bar.style.bottom=_oneHandKeyboardGap>0?_oneHandKeyboardGap+'px':'var(--app-safe-bottom)';
  bar.classList.toggle('editing',bar.contains(document.activeElement)&&document.activeElement.tagName==='INPUT');
}
function editarValorUmaMao(field){
  const state=_oneHandState;if(!state?.row?.isConnected||field.dataset.token!==state.token||field.dataset.sessionId!==String(window._treinoSessionId||'')||window._treinoPaused||state.row.querySelector('.serie-check.checked'))return;
  const raw=field.value,n=Number(raw);if(field.validity.badInput||(raw!==''&&(!Number.isFinite(n)||n<0||(field.id==='oneHandReps'&&!Number.isInteger(n)))))return;
  const target=state.row.querySelector(field.id==='oneHandWeight'?'.ativo-carga':'.ativo-reps');if(target){target.value=raw;target.dispatchEvent(new Event('input',{bubbles:true}));document.getElementById('oneHandSetError').textContent='';}
}
function agirTreinoUmaMao(){
  const main=document.getElementById('oneHandMainAction'),state=estadoTreinoUmaMao();if(!state)return;
  if(main.dataset.sessionId!==String(state.sessionId||'')||main.dataset.token!==state.token||main.dataset.action!==state.action){renderizarTreinoUmaMao();return toast('O estado da série mudou. Confira o botão antes de continuar.','info');}
  if(state.action!=='complete'&&state.action!=='resume'&&Date.now()-(Number(_ultimaSerieConcluida?.dataset.completedAt)||0)<350)return;
  if(state.action==='resume')togglePausaTreino();
  else if(state.action==='complete'){
    const inputs=[document.getElementById('oneHandWeight'),document.getElementById('oneHandReps')];
    if(inputs.some(input=>!input.validity.valid||input.value==='')||!uxCamposSerieValidos(state.row)){
      document.getElementById('oneHandSetError').textContent=`Confira a carga e as repetições da série ${numeroSerieSessao(state.row)}.`;
      return;
    }
    state.row.querySelector('.serie-check')?.click();
  }else if(state.action==='next')focarExercicioCard(state.other,false);
  else if(state.action==='finish')abrirEncerramentoTreino();
  else aplicarInicioSeriePrecisao(state.row,Date.now(),'phone');
  renderizarTreinoUmaMao();
}
function abrirOpcoesUmaMao(){document.getElementById('modalWorkoutToolsUI')?.classList.add('open');agendarTreinoUmaMao();}
function atualizarViewportUmaMao(){const v=window.visualViewport;_oneHandKeyboardGap=v?Math.max(0,window.innerHeight-v.height-v.offsetTop):0;agendarTreinoUmaMao();}
document.addEventListener('input',e=>{if(e.target.id==='oneHandWeight'||e.target.id==='oneHandReps')editarValorUmaMao(e.target);agendarTreinoUmaMao();});
for(const event of ['click','change','focusin','focusout'])document.addEventListener(event,agendarTreinoUmaMao);
window.visualViewport?.addEventListener('resize',atualizarViewportUmaMao);window.addEventListener('resize',atualizarViewportUmaMao);
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('oneHandModeSetting').value=modoUmaMaoAtivo()?'1':'0';renderizarTreinoUmaMao();});
setInterval(()=>{if(treinoAtivoTemplate&&!document.hidden)agendarTreinoUmaMao();},1000);
