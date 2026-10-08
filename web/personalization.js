/* v12.8.8 — tópicos 13 e 14; preferências independentes dos registros. */
const HOME_LAYOUT_KEY='homeLayoutV1288';
const HOME_CARDS=[
  {id:'workout',slot:'homeSlotWorkout',label:'Treino sugerido ou em andamento',placement:'main'},
  {id:'week',slot:'homeSlotWeek',label:'Resumo da semana',placement:'main'},
  {id:'shortcuts',slot:'homeSlotShortcuts',label:'Atalhos do dia',placement:'main'},
  {id:'nutrition',slot:'homeSlotNutrition',label:'Alimentação de hoje',placement:'main'},
  {id:'movement',slot:'homeSlotMovement',label:'Cardio e passos',placement:'main'},
  {id:'challenge',slot:'homeSlotChallenge',label:'Desafio da semana',placement:'details'},
  {id:'charts',slot:'homeSlotCharts',label:'Gráficos rápidos e grupos musculares',placement:'details'},
  {id:'weight',slot:'homeSlotWeight',label:'Evolução do peso',placement:'details'},
  {id:'level',slot:'homeSlotLevel',label:'Nível e XP',placement:'details'},
  {id:'achievements',slot:'homeSlotAchievements',label:'Conquistas recentes',placement:'details'},
  {id:'backup',slot:'homeSlotBackup',label:'Situação do backup externo',placement:'details'}
];
function normalizarPainelInicio(raw){
  const source=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},out=[],known=new Map(HOME_CARDS.map(c=>[c.id,c]));
  for(const item of Array.isArray(source.cards)?source.cards:[]){if(!known.has(item?.id)||out.some(c=>c.id===item.id))continue;const def=known.get(item.id);out.push({id:def.id,placement:['main','details','hidden'].includes(item.placement)?item.placement:def.placement});}
  for(const def of HOME_CARDS)if(!out.some(c=>c.id===def.id))out.push({id:def.id,placement:def.placement});
  return {version:1,cards:out,detailsOpen:source.detailsOpen===true};
}
function getPainelInicio(){try{return normalizarPainelInicio(JSON.parse(localStorage.getItem(HOME_LAYOUT_KEY)||'{}'));}catch(_){return normalizarPainelInicio(null);}}
let _homeLayoutDraft=null;
function abrirPersonalizacaoInicio(){_homeLayoutDraft=getPainelInicio();renderizarEditorPainel();document.getElementById('modalHomeLayout').classList.add('open');}
function renderizarEditorPainel(){
  const out=document.getElementById('homeLayoutEditor');if(!out||!_homeLayoutDraft)return;
  out.innerHTML=_homeLayoutDraft.cards.map((card,index)=>{const def=HOME_CARDS.find(c=>c.id===card.id);return '<div class="home-layout-row"><div><strong>'+esc(def.label)+'</strong><select aria-label="Onde mostrar '+esc(def.label)+'" onchange="alterarPosicaoCartaoInicio(\''+card.id+'\',this.value)">'+[['main','No início'],['details','Em detalhes'],['hidden','Oculto']].map(([value,label])=>'<option value="'+value+'"'+(card.placement===value?' selected':'')+'>'+label+'</option>').join('')+'</select></div><button type="button" aria-label="Mover '+esc(def.label)+' para cima" onclick="moverCartaoInicio(\''+card.id+'\',-1)"'+(index===0?' disabled':'')+'>↑</button><button type="button" aria-label="Mover '+esc(def.label)+' para baixo" onclick="moverCartaoInicio(\''+card.id+'\',1)"'+(index===_homeLayoutDraft.cards.length-1?' disabled':'')+'>↓</button></div>';}).join('');
}
function alterarPosicaoCartaoInicio(id,placement){const card=_homeLayoutDraft?.cards.find(c=>c.id===id);if(card&&['main','details','hidden'].includes(placement))card.placement=placement;}
function moverCartaoInicio(id,direction){if(!_homeLayoutDraft)return;const from=_homeLayoutDraft.cards.findIndex(c=>c.id===id),to=from+direction;if(from<0||to<0||to>=_homeLayoutDraft.cards.length||![1,-1].includes(direction))return;const [card]=_homeLayoutDraft.cards.splice(from,1);_homeLayoutDraft.cards.splice(to,0,card);renderizarEditorPainel();}
function restaurarRascunhoPainel(){_homeLayoutDraft=normalizarPainelInicio(null);renderizarEditorPainel();}
function salvarPersonalizacaoInicio(){
  if(!_homeLayoutDraft)return;try{localStorage.setItem(HOME_LAYOUT_KEY,JSON.stringify(normalizarPainelInicio(_homeLayoutDraft)));}catch(error){console.warn(error);toast('Não foi possível salvar a organização. Tente novamente.','error');return;}
  fecharModal('modalHomeLayout');renderizarDashboard();renderizarAtividadeDashboard();toast('Seu painel foi atualizado','success');
}
function ajustarGraficosInicio(){requestAnimationFrame(()=>{for(const chart of [typeof dashMiniChartInst==='undefined'?null:dashMiniChartInst,typeof dashPieChartInst==='undefined'?null:dashPieChartInst,window._dashPesoInst])try{chart?.resize();}catch(_){}});}
function aplicarPainelInicio(){
  const hero=document.getElementById('dashHero'),main=document.getElementById('homeMainCards'),details=document.getElementById('dashboardSecondary');if(!hero||!main||!details)return;
  for(const [selector,id] of [['.home-workout','homeSlotWorkout'],['.home-week','homeSlotWeek']]){const node=hero.querySelector(selector),slot=document.getElementById(id);if(node&&slot)slot.replaceChildren(node);}
  const shortcuts=hero.querySelector('.home-shortcuts'),label=hero.querySelector('.home-section-label'),slot=document.getElementById('homeSlotShortcuts');if(shortcuts&&slot)slot.replaceChildren(...[label,shortcuts].filter(Boolean));
  let hidden=document.getElementById('homeHiddenCards');if(!hidden){hidden=document.createElement('div');hidden.id='homeHiddenCards';hidden.hidden=true;document.getElementById('aba-dashboard').appendChild(hidden);}
  const prefs=getPainelInicio();for(const card of prefs.cards){const def=HOME_CARDS.find(c=>c.id===card.id),element=document.getElementById(def.slot);if(!element)continue;element.hidden=card.placement==='hidden';(card.placement==='main'?main:card.placement==='details'?details:hidden).appendChild(element);}
  const count=prefs.cards.filter(c=>c.placement==='details').length,button=document.getElementById('dashboardMoreToggle');
  details.classList.toggle('open',prefs.detailsOpen);button.hidden=count===0;button.setAttribute('aria-expanded',String(prefs.detailsOpen));button.innerHTML=(prefs.detailsOpen?'Ocultar detalhes':'Ver detalhes e evolução')+' <span aria-hidden="true">'+(prefs.detailsOpen?'⌃':'⌄')+'</span>';
  document.getElementById('homeEmptyState').hidden=prefs.cards.some(c=>c.placement==='main');renderizarResumoBackupInicio();ajustarGraficosInicio();
}

let _externalBackupStatus=null,_externalBackupBusy=false,_externalBackupError='',_externalMirrorReady=false,_externalMirrorTimer=null,_externalMirrorPromise=null,_externalMirrorFingerprint='';
function dataBackupExterno(value){return Number(value)>0?new Date(Number(value)).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Nenhuma cópia ainda';}
function renderizarBackupExterno(){
  const status=_externalBackupStatus||{},card=document.getElementById('externalBackupCard');if(!card||!isNativeAndroid())return;card.hidden=false;
  const error=_externalBackupError||status.lastError||'',message=!status.configured?'Escolha uma pasta para proteger seus registros':status.enabled?'Cópias automáticas ativadas':'Cópias automáticas desativadas';
  document.getElementById('externalBackupStatus').innerHTML='<strong>'+(_externalBackupBusy?'Aguarde…':message)+'</strong>'+(status.configured?'Pasta: '+esc(status.folderName||'Selecionada')+'<br>':'')+'Última cópia gravada: '+esc(dataBackupExterno(status.lastSuccessAt))+(status.stagedAt?'<br>Dados preparados em: '+esc(dataBackupExterno(status.stagedAt)):'')+(status.lastFile?'<br>'+esc(status.lastFile):'')+(error?'<p class="external-backup-error">'+esc(error)+'</p>':'');
  for(const [id,value] of [['externalBackupEnabled',status.enabled?'1':'0'],['externalBackupHours',String(status.hours||24)],['externalBackupKeep',String(status.keep||0)]]){const field=document.getElementById(id);field.value=value;field.disabled=_externalBackupBusy||!status.configured;}
  const folderButton=document.getElementById('externalBackupFolderButton');folderButton.textContent=status.configured?'Trocar pasta e ativar':'Escolher pasta e ativar';folderButton.disabled=_externalBackupBusy;
  document.getElementById('externalBackupNowButton').disabled=_externalBackupBusy||!status.configured;
  document.getElementById('externalBackupRecent').innerHTML=Array.isArray(status.history)&&status.history.length?'<strong>Cópias recentes</strong>'+status.history.slice().reverse().map(row=>'<div>'+esc(row.name)+'<br>'+esc(dataBackupExterno(row.createdAt))+'</div>').join(''):'';
  renderizarResumoBackupInicio();
}
function renderizarResumoBackupInicio(){
  const element=document.getElementById('homeBackupSummary');if(!element)return;
  if(!isNativeAndroid()){element.innerHTML='';return;}
  const status=_externalBackupStatus||{},error=_externalBackupError||status.lastError||'',title=error?'Backup precisa de atenção':status.enabled?'Backup automático ativado':'Proteja seus registros',description=error||(status.lastSuccessAt?'Última cópia: '+dataBackupExterno(status.lastSuccessAt):'Escolha uma pasta e guarde uma cópia fora do aplicativo.');
  element.innerHTML='<button type="button" class="home-backup-card" onclick="abrirDadosBackupExterno()"><div><strong>'+esc(title)+'</strong><small>'+esc(description)+'</small></div><span aria-hidden="true">›</span></button>';
}
function abrirDadosBackupExterno(){irParaAba('config');abrirCategoriaConfig('dados');atualizarStatusBackupExterno();}
async function atualizarStatusBackupExterno(){if(!isNativeAndroid())return;try{_externalBackupStatus=await window.TreinoNativeBridge.getExternalBackupStatus();}catch(error){_externalBackupError=error?.message||'Não foi possível consultar o backup.';}renderizarBackupExterno();}
async function acaoBackupExterno(action){
  if(_externalBackupBusy)return;_externalBackupBusy=true;_externalBackupError='';renderizarBackupExterno();
  try{await action();}catch(error){console.warn('Backup externo',error);_externalBackupError=error?.message||String(error);toast(_externalBackupError,'error');}
  finally{_externalBackupBusy=false;await atualizarStatusBackupExterno();}
}
async function escolherPastaBackupExterno(){
  if(!isNativeAndroid())return;const hours=Number(document.getElementById('externalBackupHours').value)||24,keep=Number(document.getElementById('externalBackupKeep').value)||0;
  await acaoBackupExterno(async()=>{const selected=await window.TreinoNativeBridge.chooseBackupFolder();if(selected?.cancelled)return;_externalBackupStatus=selected;
    await prepararEspelhoBackupExterno(true);_externalBackupStatus=await window.TreinoNativeBridge.configureExternalBackup({enabled:true,hours,keep});toast('Pasta escolhida e backup automático ativado','success');});
}
async function alterarConfigBackupExterno(){
  const options={enabled:document.getElementById('externalBackupEnabled').value==='1',hours:Number(document.getElementById('externalBackupHours').value),keep:Number(document.getElementById('externalBackupKeep').value)};
  await acaoBackupExterno(async()=>{if(options.enabled)await prepararEspelhoBackupExterno(true);_externalBackupStatus=await window.TreinoNativeBridge.configureExternalBackup(options);toast('Configuração de backup salva','success');});
}
async function salvarBackupExternoAgora(){await acaoBackupExterno(async()=>{await prepararEspelhoBackupExterno(true);_externalBackupStatus=await window.TreinoNativeBridge.writeExternalBackup();toast('Cópia completa salva na pasta escolhida','success');});}
async function prepararEspelhoBackupExterno(force=false){
  if(!isNativeAndroid()||(!_externalMirrorReady&&!force)||(!force&&!_externalBackupStatus?.enabled))return;
  if(_externalMirrorPromise){await _externalMirrorPromise;if(force)return prepararEspelhoBackupExterno(true);return;}
  const data=gerarObjetoBackup(),fingerprint=JSON.stringify({...data,exportedAt:undefined});if(!force&&fingerprint===_externalMirrorFingerprint)return;
  _externalMirrorPromise=(async()=>{await Promise.resolve();try{_externalBackupStatus=await window.TreinoNativeBridge.stageExternalBackup(JSON.stringify(data));_externalMirrorFingerprint=fingerprint;_externalBackupError='';renderizarBackupExterno();}catch(error){_externalBackupError=error?.message||'Não foi possível preparar o backup.';renderizarBackupExterno();if(force)throw error;console.warn(error);}finally{_externalMirrorPromise=null;}})();
  return _externalMirrorPromise;
}
function agendarEspelhoBackupExterno(){if(!_externalMirrorReady||!isNativeAndroid()||!_externalBackupStatus?.enabled)return;clearTimeout(_externalMirrorTimer);_externalMirrorTimer=setTimeout(()=>prepararEspelhoBackupExterno(),2000);}
function observarDadosParaBackupExterno(){
  if(typeof Storage==='undefined')return;const keys=new Set(Object.keys(gerarObjetoBackup())),set=Storage.prototype.setItem,remove=Storage.prototype.removeItem;
  for(const [name,original] of [['setItem',set],['removeItem',remove]])Storage.prototype[name]=function(key,...values){const result=original.call(this,key,...values);try{if(this===window.localStorage&&keys.has(String(key)))agendarEspelhoBackupExterno();}catch(_){ }return result;};
}
async function inicializarBackupExterno(){if(!isNativeAndroid())return;_externalMirrorReady=true;await atualizarStatusBackupExterno();await prepararEspelhoBackupExterno();}

// Adaptar a apresentação depois do render existente, sem reconstruir treinos.
const _renderDashboardBeforeLayout=renderizarDashboard;
renderizarDashboard=function(){const result=_renderDashboardBeforeLayout.apply(this,arguments);aplicarPainelInicio();return result;};
const _toggleDashboardBeforeLayout=toggleDashboardSecondary;
toggleDashboardSecondary=function(){_toggleDashboardBeforeLayout();const prefs=getPainelInicio();prefs.detailsOpen=document.getElementById('dashboardSecondary').classList.contains('open');try{localStorage.setItem(HOME_LAYOUT_KEY,JSON.stringify(prefs));}catch(_){ }ajustarGraficosInicio();};
const _abrirCategoriaBeforeBackup=abrirCategoriaConfig;
abrirCategoriaConfig=function(group){const result=_abrirCategoriaBeforeBackup.apply(this,arguments);if(group==='dados')atualizarStatusBackupExterno();return result;};
const _resetarDadosBeforeBackup=resetarDados;
resetarDados=async function(){_externalMirrorReady=false;clearTimeout(_externalMirrorTimer);if(_externalMirrorPromise)try{await _externalMirrorPromise;}catch(_){ }if(isNativeAndroid())try{await window.TreinoNativeBridge.configureExternalBackup({enabled:false,hours:_externalBackupStatus?.hours||24,keep:_externalBackupStatus?.keep||0,clearMirror:true});}catch(error){console.warn(error);}_resetarDadosBeforeBackup.apply(this,arguments);};
observarDadosParaBackupExterno();
document.addEventListener('DOMContentLoaded',()=>{aplicarPainelInicio();inicializarBackupExterno();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)prepararEspelhoBackupExterno();else atualizarStatusBackupExterno();});
