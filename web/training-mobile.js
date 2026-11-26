function obterTreinoEmDestaque(treinos=getTreinosSalvos()) {
  if(treinoAtivoTemplate)return {template:treinoAtivoTemplate,continuing:true};
  const draft=getRascunhoValido();
  const byId=new Map(treinos.map(template=>[String(template.id),template]));
  const saved=id=>byId.get(String(id));
  if(draft){
    const template=saved(draft.templateId)||draft.templateSnapshot;
    if(template)return {template,continuing:true,draft};
  }
  const planned=getTreinoPlanejadoHoje();
  if(planned)return {template:planned,planned:true};
  const history=getHist();
  // Sessões em branco só aparecem como sugestão quando viram um modelo.
  const latest=obterUltimaSessao(history.filter(row=>row.templateId&&saved(row.templateId)));
  return {template:saved(latest?.[1]?.[0]?.templateId)||treinos[0]};
}

function renderizarTreinoEmDestaque(treinos) {
  const {template,continuing,planned,draft}=obterTreinoEmDestaque(treinos);
  const title=document.getElementById('workoutLaunchTitle');
  const note=document.getElementById('workoutLaunchNote');
  const start=document.getElementById('workoutLaunchStart');
  const blank=document.getElementById('workoutLaunchBlank');
  const count=draft?.exerciseOrder?.length??template?.exercicios?.length??0;
  title.textContent=template?.nome||'Comece seu treino';
  note.textContent=continuing?'Sessão em andamento':planned?'Planejado para hoje':template?'Modelo sugerido':'Adicione exercícios conforme for treinando.';
  if(count)note.textContent+=' · '+count+(count===1?' exercício':' exercícios');
  start.hidden=!template;
  start.textContent=continuing?'Continuar treino':'Iniciar treino';
  blank.className='btn '+(template?'btn-outline':'btn-primary');
  blank.textContent='+ Treino em branco';
}

function iniciarTreinoEmBranco() {
  if(window._uxCancelling)return;
  if(treinoAtivoTemplate)return irParaAba('treinar');
  irParaAba('treinar');
  selecionarTreino({id:gerarId('treino'),nome:'Treino em branco',icone:'',exercicios:[],series:3,isAdHoc:true,isBlank:true},null);
}

function atualizarTreinoVazio() {
  const empty=!!treinoAtivoTemplate?.isBlank&&!getExerciseCards().length;
  document.getElementById('workoutBlankState').hidden=!empty;
  document.querySelectorAll('#workoutFocusNav>button:not(:last-child)').forEach(btn=>btn.hidden=empty);
  document.querySelectorAll('[data-workout-has-exercise]').forEach(btn=>btn.hidden=empty);
  agendarTreinoUmaMao();
}

function capturarNovoModeloSessao() {
  if(!treinoAtivoTemplate?.isAdHoc)return null;
  const cards=getExerciseCards().filter(card=>!card.classList.contains('skipped'));
  const configs=Object.fromEntries(cards.map(card=>[card.dataset.ex,{
    series:card.querySelectorAll('.serie-row').length,
    rest:Number(card.dataset.rest),
    increment:Number(card.dataset.increment),
    repRange:card.dataset.repRange
  }]));
  if(!cards.length)return null;
  return {id:treinoAtivoTemplate.id,exercicios:cards.map(card=>card.dataset.ex),configs};
}

let _novoModeloSessao=null;
function prepararNovoModeloSessao(proposta) {
  _novoModeloSessao=proposta;
  const offer=document.getElementById('workoutModelOffer');
  offer.hidden=!proposta;
  document.getElementById('workoutModelForm').hidden=true;
  document.getElementById('workoutModelChoose').hidden=false;
  document.getElementById('workoutModelName').value='';
  document.getElementById('workoutSummaryClose').textContent=proposta?'Agora não':'Fechar';
  if(proposta){
    const count=proposta.exercicios.length;
    document.getElementById('workoutModelPreview').textContent=count+(count===1?' exercício na ordem da sessão.':' exercícios na ordem da sessão.');
  }
}

function nomearNovoModeloSessao() {
  if(!_novoModeloSessao)return;
  document.getElementById('workoutModelChoose').hidden=true;
  document.getElementById('workoutModelForm').hidden=false;
  document.getElementById('workoutModelName').focus();
}

function salvarNovoModeloSessao(event) {
  event.preventDefault();
  const proposal=_novoModeloSessao;
  if(!proposal)return;
  const name=document.getElementById('workoutModelName').value.trim();
  if(!name)return toast('Digite um nome para o modelo.','warn');
  const templates=getTreinosSalvos();
  if(templates.some(t=>chaveExercicioSessao(t.nome)===chaveExercicioSessao(name)))return toast('Já existe um modelo com esse nome. Escolha outro.','warn');
  const map=(key,fallback)=>Object.fromEntries(proposal.exercicios.map(ex=>[ex,proposal.configs[ex][key]??fallback]));
  const template={
    id:proposal.id,nome:name,icone:'💪',exercicios:proposal.exercicios,series:3,
    seriesMap:map('series',3),restMap:map('rest',getDescansoPadrao()),
    incrementMap:map('increment',2.5),repRangeMap:map('repRange','livre')
  };
  if(templates.some(t=>String(t.id)===String(template.id)))return toast('Já existe um modelo vinculado a esta sessão.','info');
  try{setTreinosSalvos([...templates,template]);}catch(error){toast('Não foi possível salvar o modelo. Seu treino já está no histórico.','error');return;}
  prepararNovoModeloSessao(null);
  renderizarTreinoSelector();
  renderizarListaTreinosSalvos();
  renderizarDashboard();
  toast('Modelo salvo em Meus modelos.','success');
}

function renderizarBuscaExercicioSessao() {
  const field=document.getElementById('addSessaoQuery');
  const query=chaveExercicioSessao(field.value);
  const group=document.getElementById('addSessaoGrupo').value;
  const selected=document.getElementById('addSessaoEx').value;
  const occupied=new Set(getExerciseCards().map(card=>chaveExercicioSessao(card.dataset.ex)));
  const lastUsed=new Map();
  for(const row of getHist()){
    const key=chaveExercicioSessao(row.exercicio);
    const stamp=String(row.data||'')+'T'+String(row.hora||'');
    if(stamp>(lastUsed.get(key)||''))lastUsed.set(key,stamp);
  }
  const found=Object.entries(obterExerciciosSalvos()).flatMap(([label,exercises])=>
    (exercises||[]).map(ex=>({ex,label,key:chaveExercicioSessao(ex)})));
  const results=found.filter(item=>!occupied.has(item.key)&&(!group||item.label===group)&&
    chaveExercicioSessao(item.ex+' '+item.label).includes(query));
  results.sort((a,b)=>(lastUsed.get(b.key)||'').localeCompare(lastUsed.get(a.key)||'')||a.ex.localeCompare(b.ex,'pt-BR'));
  const host=document.getElementById('addSessaoSearchResults');
  host.replaceChildren();
  const heading=document.getElementById('addSessaoSearchHeading');
  heading.textContent=results.length?query||group?'Exercícios encontrados':lastUsed.has(results[0].key)?'Usados recentemente':'Exercícios do catálogo':'Nenhum exercício encontrado';
  for(const item of results.slice(0,query||group?24:8)){
    const button=document.createElement('button');
    button.type='button';
    button.className='flow-swap-result';
    button.setAttribute('aria-pressed',String(selected===item.ex));
    button.innerHTML='<strong>'+esc(item.ex)+'</strong><small>'+esc(item.label)+'</small>';
    button.onclick=()=>{
      document.getElementById('addSessaoEx').value=item.ex;
      document.getElementById('addSessaoSelectedGroup').value=item.label;
      renderizarBuscaExercicioSessao();
      host.querySelector('[aria-pressed="true"]')?.focus({preventScroll:true});
    };
    host.appendChild(button);
  }
}

function limparEscolhaExercicioSessao() {
  document.getElementById('addSessaoEx').value='';
  document.getElementById('addSessaoSelectedGroup').value='';
  renderizarBuscaExercicioSessao();
}
