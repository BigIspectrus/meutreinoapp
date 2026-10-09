/* v12.10.0 — cópia anterior à exclusão; recuperação com IDs idempotentes. */
const TRASH_KINDS={sets:{key:'historicoTreinoV3',label:'Séries / sessão'},nutrition:{key:'nutritionEntriesV125',label:'Alimentação'},template:{key:'treinosTemplates',label:'Rotina'}};
const TRASH_RETENTION_MS=30*86400000;
function itensLixeiraValidos(kind,items){
  if(!TRASH_KINDS[kind]||!Array.isArray(items)||!items.length)return false;
  return items.every(r=>r&&typeof r==='object'&&['string','number'].includes(typeof r.id)&&String(r.id).trim()&&(kind==='template'?
    typeof r.nome==='string'&&Array.isArray(r.exercicios)&&r.exercicios.every(e=>typeof e==='string'):
    kind==='sets'?typeof r.exercicio==='string'&&window.TreinoWorkflowStore.validDate(r.data)&&Number.isFinite(Number(r.carga))&&Number(r.carga)>=0&&Number.isFinite(Number(r.reps))&&Number(r.reps)>=0:
    typeof r.name==='string'&&window.TreinoWorkflowStore.validDate(r.date)&&Number(r.grams)>0&&['kcal','protein','carbs','fat'].every(k=>r[k]==null||(Number.isFinite(Number(r[k]))&&Number(r[k])>=0))));
}
function lerLixeiraSegura(){
  const raw=localStorage.getItem(window.TreinoWorkflowStore.keys.trash),rows=raw?JSON.parse(raw):[];
  if(!Array.isArray(rows)||rows.some(e=>!e||typeof e.id!=='string'||!['prepared','deleted','restored'].includes(e.state)||!Number.isFinite(e.deletedAt)||!itensLixeiraValidos(e.kind,e.items)))throw new Error('Lixeira inválida');
  return rows;
}
function dadosAtuaisLixeira(kind){const raw=localStorage.getItem(TRASH_KINDS[kind].key),rows=raw?JSON.parse(raw):[];if(!Array.isArray(rows))throw new Error('Dados atuais inválidos');return rows;}
function guardarEstadoLixeira(rows){return window.TreinoWorkflowStore.save(window.TreinoWorkflowStore.keys.trash,rows);}
function registrarLixeiraAntesExcluir(kind,items,label){
  try{if(!itensLixeiraValidos(kind,items))throw new Error('Registro sem identificação válida');const rows=lerLixeiraSegura().filter(e=>Date.now()-e.deletedAt<TRASH_RETENTION_MS&&e.state!=='restored'),entry={id:gerarId('trash'),kind,items:window.TreinoWorkflowStore.clone(items),label:String(label||TRASH_KINDS[kind].label).slice(0,180),deletedAt:Date.now(),state:'prepared'};
    return guardarEstadoLixeira(rows.concat(entry))?entry.id:null;
  }catch(error){console.warn('Exclusão bloqueada para preservar registros',error);toast('Não foi possível preparar a lixeira. Nenhum registro foi excluído; faça um backup e revise o armazenamento.','error');return null;}
}
function marcarEstadoLixeira(id,state){try{const rows=lerLixeiraSegura(),entry=rows.find(e=>e.id===id);if(entry){entry.state=state;guardarEstadoLixeira(rows);}}catch(error){console.warn('Cópia de recuperação permanece preparada',error);}}
function excluirComLixeira(kind,items,label){
  if(!items.length)return false;const ids=new Set(items.map(r=>String(r.id))),entryId=registrarLixeiraAntesExcluir(kind,items,label);if(!entryId)return false;
  try{const kept=dadosAtuaisLixeira(kind).filter(r=>!ids.has(String(r?.id)));if(kind==='nutrition')salvarRegistrosNutricaoLocal(kept);else localStorage.setItem(TRASH_KINDS[kind].key,JSON.stringify(kept));marcarEstadoLixeira(entryId,'deleted');invalidarCache();return true;}
  catch(error){console.warn('Exclusão interrompida; cópia preservada',error);toast('Não foi possível concluir a exclusão. A cópia de recuperação foi preservada.','error');return false;}
}
let _trashNativeMirror=Promise.resolve();
function agendarEspelhoLixeira(){_trashNativeMirror=_trashNativeMirror.catch(()=>{}).then(async()=>{if(!isNativeAndroid())return;if(getHist().length)await sincronizarBancoNativo(false);else await window.TreinoNativeBridge?.syncNativeDatabase({records:[],replace:true});}).catch(error=>console.warn('Espelho Android pendente; dados canônicos preservados',error));}
function atualizarDepoisLixeira(kind){
  invalidarCache();renderizarHistorico();atualizarGrafico();renderizarDashboard();renderizarSeriesMusculares();
  if(kind==='template'){renderizarTreinoSelector();renderizarListaTreinosSalvos();}
  if(kind==='nutrition')dadosNutricaoAlterados('',false);
  if(kind==='sets')agendarEspelhoLixeira();
  renderizarLixeira();
}
function restaurarItemLixeira(id){
  confirmarAcao('Restaurar registros?','Os registros voltarão com os mesmos valores e IDs. Itens que já existem não serão duplicados.',()=>{
    try{const rows=lerLixeiraSegura(),entry=rows.find(e=>e.id===id);if(!entry||entry.state==='restored'||Date.now()-entry.deletedAt>=TRASH_RETENTION_MS)return toast('Este item não está disponível para recuperação.','warn');
      const current=dadosAtuaisLixeira(entry.kind),ids=new Set(current.map(r=>String(r?.id))),missing=[];
      for(const item of entry.items){if(!ids.has(String(item.id))){missing.push(item);ids.add(String(item.id));}}
      if(missing.length){const merged=current.concat(window.TreinoWorkflowStore.clone(missing));if(entry.kind==='nutrition')salvarRegistrosNutricaoLocal(merged);else localStorage.setItem(TRASH_KINDS[entry.kind].key,JSON.stringify(merged));}
      // Se o marcador falhar, nova tentativa encontra os IDs já existentes.
      marcarEstadoLixeira(entry.id,'restored');atualizarDepoisLixeira(entry.kind);toast(missing.length?missing.length+' registro(s) restaurado(s)':'Os registros já estavam presentes; nada foi duplicado.','success');
    }catch(error){console.warn('Restauração não concluída',error);toast('Não foi possível concluir a restauração. A cópia da lixeira foi mantida.','error');}
  });
}
function eliminarItemLixeira(id){confirmarAcao('Excluir cópia definitivamente?','Esta cópia deixará de ser recuperável pela lixeira. Backups anteriores podem conter cópias.',()=>{try{if(guardarEstadoLixeira(lerLixeiraSegura().filter(e=>e.id!==id)))renderizarLixeira();}catch(_){toast('Lixeira inválida. Faça um backup antes de alterar.','error');}});}
function esvaziarLixeira(){confirmarAcao('Esvaziar lixeira?','Todas as cópias da lixeira serão removidas. Isso não exclui os registros que estão no aplicativo. Backups anteriores não são apagados.',()=>{if(guardarEstadoLixeira([]))renderizarLixeira();});}
function abrirLixeira(){renderizarLixeira();document.getElementById('modalRecycleBin').classList.add('open');}
let _trashVisible=30;
function maisItensLixeira(){_trashVisible+=30;renderizarLixeira();}
function renderizarLixeira(){
  const host=document.getElementById('recycleBinList');if(!host)return;
  try{const entries=lerLixeiraSegura().filter(e=>e.state!=='restored').sort((a,b)=>b.deletedAt-a.deletedAt),now=Date.now();host.innerHTML=entries.length?entries.slice(0,_trashVisible).map(e=>{
      const days=Math.max(0,Math.ceil((e.deletedAt+TRASH_RETENTION_MS-now)/86400000)),currentIds=new Set(dadosAtuaisLixeira(e.kind).map(r=>String(r?.id))),missing=e.items.filter(r=>!currentIds.has(String(r.id))).length;
      return '<article class="recycle-entry"><strong>'+esc(e.label)+'</strong><small>'+esc(TRASH_KINDS[e.kind].label)+' · '+e.items.length+' registro(s) · '+new Date(e.deletedAt).toLocaleString('pt-BR')+'</small><p>'+(days?days+' dia(s) restantes': 'Prazo de recuperação encerrado')+(missing<e.items.length?' · '+(e.items.length-missing)+' já presente(s) no app':'')+'</p><div class="workflow-actions"><button class="btn btn-outline btn-sm" onclick=\'restaurarItemLixeira('+jsArg(e.id)+')\''+(!days?' disabled':'')+'>Restaurar</button><button class="btn btn-ghost btn-sm" onclick=\'eliminarItemLixeira('+jsArg(e.id)+')\'>Excluir cópia</button></div></article>';
    }).join('')+(entries.length>_trashVisible?'<button class="btn btn-ghost" onclick="maisItensLixeira()">Ver mais</button>':''):'<p class="nutrition-note">Nenhuma exclusão guardada. A proteção vale para exclusões feitas a partir desta versão.</p>';
  }catch(_){host.innerHTML='<p class="nutrition-note">Há dados inválidos na lixeira. Faça um backup; nenhuma exclusão protegida será permitida até a revisão.</p>';}
}
// Mantém as confirmações, agora guardando a cópia antes de mudar a origem.
apagarRegistro=function(id){const records=getHist().filter(r=>String(r.id)===String(id));if(!records.length)return;confirmarAcao('Mover série para a lixeira?','Você poderá recuperar por 30 dias.',()=>{if(excluirComLixeira('sets',records,records[0].exercicio+' · série '+records[0].numSerie)){atualizarDepoisLixeira('sets');toast('Série movida para a lixeira','success');}});};
apagarSessao=function(sessionKey){const records=getHist().filter(r=>getSessionKey(r)===sessionKey);if(!records.length)return;confirmarAcao('Mover sessão para a lixeira?','As séries serão removidas do histórico e poderão ser recuperadas por 30 dias. Dados do relógio não serão apagados.',()=>{if(excluirComLixeira('sets',records,(records[0].templateNome||'Treino')+' · '+records[0].data)){atualizarDepoisLixeira('sets');toast('Sessão movida para a lixeira','success');}});};
apagarTreino=function(id){const records=getTreinosSalvos().filter(t=>String(t.id)===String(id));if(!records.length)return;if(excluirComLixeira('template',records,records[0].nome)){atualizarDepoisLixeira('template');toast('Rotina movida para a lixeira','success');}};
excluirRegistroNutricao=function(){const id=document.getElementById('nutritionEntryId').value,records=dadosAtuaisLixeira('nutrition').filter(e=>String(e.id)===String(id));if(!records.length)return;confirmarAcao('Mover alimento registrado para a lixeira?','O consumo sairá do diário, mas poderá ser recuperado por 30 dias com a quantidade e os nutrientes originais.',()=>{if(excluirComLixeira('nutrition',records,records[0].name+' · '+records[0].date)){fecharModal('modalNutritionEntry');atualizarDepoisLixeira('nutrition');toast('Registro movido para a lixeira','success');}});};
