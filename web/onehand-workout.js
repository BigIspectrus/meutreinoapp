/* v12.10.0 — controles inferiores delegam às ações/timestamps existentes. */
let _oneHandState=null,_oneHandFrame=0,_oneHandKeyboardGap=0;
function modoUmaMaoAtivo(){return localStorage.getItem(window.TreinoWorkflowStore.keys.oneHand)!=='0';}
function definirModoUmaMao(value){try{localStorage.setItem(window.TreinoWorkflowStore.keys.oneHand,value==='0'?'0':'1');renderizarTreinoUmaMao();}catch(_){toast('Não foi possível guardar a preferência.','error');}}
function estadoTreinoUmaMao(){
  if(!treinoAtivoTemplate)return null;const cards=getExerciseCards().filter(c=>!c.classList.contains('skipped')),pending=row=>!row.querySelector('.serie-check.checked');
  const rest=Math.max(0,Math.ceil((_timerEndTime-Date.now())/1000)),active=cardExercicioAtivoSessao(),activePending=[...active?.querySelectorAll('.serie-row')||[]].some(pending),suggested=_proximaSerieDescanso?.isConnected&&pending(_proximaSerieDescanso)?_proximaSerieDescanso:null,restRow=rest&&suggested&&(suggested.closest('.exercicio-card')===active||!activePending)?suggested:null;
  const card=restRow?.closest('.exercicio-card')||active,rows=[...card?.querySelectorAll('.serie-row')||[]],row=restRow||rows.find(r=>r.classList.contains('serie-current')&&pending(r))||rows.find(pending)||null;
  const other=cards.find(c=>c!==card&&[...c.querySelectorAll('.serie-row')].some(pending)),action=window._treinoPaused?'resume':row?(Number(row.dataset.setStartedAt)>0?'complete':'start'):other?'next':'finish';
  if(row&&!row.dataset.oneHandToken)row.dataset.oneHandToken=gerarId('hand');return {sessionId:window._treinoSessionId,card,row,other,action,rest,token:row?.dataset.oneHandToken||'end'};
}
function agendarTreinoUmaMao(){if(_oneHandFrame)return;_oneHandFrame=requestAnimationFrame(()=>{_oneHandFrame=0;renderizarTreinoUmaMao();});}
function renderizarTreinoUmaMao(){
  const bar=document.getElementById('oneHandWorkout');if(!bar)return;const enabled=modoUmaMaoAtivo(),state=estadoTreinoUmaMao(),train=document.body.classList.contains('workout-mode'),modal=!!document.querySelector('.modal-overlay.open,.quick-input-overlay.open,.quick-input-panel.open')||document.getElementById('quickInputBar')?.getAttribute('aria-hidden')==='false',focus=document.activeElement,otherKeyboard=['INPUT','TEXTAREA','SELECT'].includes(focus?.tagName)&&!bar.contains(focus);
  const visible=enabled&&!!state&&train&&!modal&&!otherKeyboard;bar.hidden=!visible;document.body.classList.toggle('one-hand-workout',enabled&&!!state&&train);if(!visible){_oneHandState=null;return;}
  _oneHandState=state;const ex=state.card?.dataset.ex||treinoAtivoTemplate.nome,serie=state.row?.querySelector('.ativo-carga')?.dataset.serie,labels={resume:'Retomar treino',complete:'Concluir série',start:state.rest?'Encerrar descanso e iniciar':'Iniciar série',next:'Próximo exercício',finish:'Finalizar treino'};
  document.getElementById('oneHandExercise').textContent=ex;document.getElementById('oneHandStateLabel').textContent=window._treinoPaused?'Treino pausado':serie?'Série '+serie+' · '+(state.action==='complete'?'em andamento':state.rest?'próxima':'a iniciar'):'Exercício concluído';
  const main=document.getElementById('oneHandMainAction');main.textContent=labels[state.action];main.dataset.action=state.action;main.dataset.token=state.token;main.dataset.sessionId=state.sessionId||'';
  for(const [id,selector] of [['oneHandWeight','.ativo-carga'],['oneHandReps','.ativo-reps']]){const field=document.getElementById(id),original=state.row?.querySelector(selector);if(document.activeElement===field&&(field.dataset.token!==state.token||field.dataset.sessionId!==String(state.sessionId||'')||window._treinoPaused))field.blur();field.disabled=!original||!!window._treinoPaused;field.dataset.token=state.token;field.dataset.sessionId=state.sessionId||'';if(document.activeElement!==field)field.value=original?.value||'';field.setAttribute('aria-label',(id==='oneHandWeight'?EXERCISE_LOAD_MODES[capturarTipoCargaSerie(state.row).mode].field:'Repetições')+' · '+ex+' · série '+(serie||'—'));}
  document.getElementById('oneHandWeightLabel').textContent=EXERCISE_LOAD_MODES[capturarTipoCargaSerie(state.row).mode].field;
  const rest=document.getElementById('oneHandRestControls');rest.hidden=!state.rest;document.getElementById('oneHandRestTime').textContent=Math.floor(state.rest/60)+':'+String(state.rest%60).padStart(2,'0');rest.querySelectorAll('button').forEach(b=>b.disabled=!!window._treinoPaused);
  document.getElementById('oneHandFields').hidden=!state.row;
  bar.style.bottom=_oneHandKeyboardGap>0?_oneHandKeyboardGap+'px':'var(--app-safe-bottom)';
  bar.classList.toggle('editing',bar.contains(document.activeElement)&&document.activeElement.tagName==='INPUT');
}
function editarValorUmaMao(field){
  const state=_oneHandState;if(!state?.row?.isConnected||field.dataset.token!==state.token||field.dataset.sessionId!==String(window._treinoSessionId||'')||window._treinoPaused||state.row.querySelector('.serie-check.checked'))return;
  const raw=field.value,n=Number(raw);if(field.validity.badInput||(raw!==''&&(!Number.isFinite(n)||n<0||(field.id==='oneHandReps'&&!Number.isInteger(n)))))return;
  const target=state.row.querySelector(field.id==='oneHandWeight'?'.ativo-carga':'.ativo-reps');if(target){target.value=raw;target.dispatchEvent(new Event('input',{bubbles:true}));}
}
function agirTreinoUmaMao(){
  const main=document.getElementById('oneHandMainAction'),state=estadoTreinoUmaMao();if(!state)return;
  if(main.dataset.sessionId!==String(state.sessionId||'')||main.dataset.token!==state.token||main.dataset.action!==state.action){renderizarTreinoUmaMao();return toast('O estado da série mudou. Confira o botão antes de continuar.','info');}
  if(state.action==='resume')togglePausaTreino();else if(state.action==='complete')state.row.querySelector('.serie-check')?.click();else if(state.action==='next')focarExercicioCard(state.other,false);else if(state.action==='finish')abrirEncerramentoTreino();else{
    if(state.rest&&state.row===_proximaSerieDescanso)iniciarProximaSerieDescanso();else{focarExercicioCard(state.card,false);state.card.querySelectorAll('.serie-row').forEach(r=>r.classList.toggle('serie-manual',r===state.row));atualizarFocoSeries(state.card);aplicarInicioSeriePrecisao(state.row,Date.now(),'phone');}
  }agendarTreinoUmaMao();
}
function abrirOpcoesUmaMao(){document.getElementById('modalWorkoutToolsUI')?.classList.add('open');agendarTreinoUmaMao();}
function atualizarViewportUmaMao(){const v=window.visualViewport;_oneHandKeyboardGap=v?Math.max(0,window.innerHeight-v.height-v.offsetTop):0;agendarTreinoUmaMao();}
document.addEventListener('input',e=>{if(e.target.id==='oneHandWeight'||e.target.id==='oneHandReps')editarValorUmaMao(e.target);agendarTreinoUmaMao();});
for(const event of ['click','change','focusin','focusout'])document.addEventListener(event,agendarTreinoUmaMao);
window.visualViewport?.addEventListener('resize',atualizarViewportUmaMao);window.addEventListener('resize',atualizarViewportUmaMao);
document.addEventListener('DOMContentLoaded',()=>{document.getElementById('oneHandModeSetting').value=modoUmaMaoAtivo()?'1':'0';renderizarTreinoUmaMao();});
setInterval(()=>{if(treinoAtivoTemplate&&!document.hidden)agendarTreinoUmaMao();},1000);
