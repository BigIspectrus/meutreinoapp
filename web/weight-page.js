let _weightPageDays=30,_weightPageLimit=8,_weightPageChart=null;

function abrirTelaPeso() {
  if(_currentTab==='progresso'){
    ativarSubTab('peso');
    window.scrollTo({top:0,behavior:'instant'});
    return;
  }
  _currentSubTab='peso';
  irParaAba('progresso');
}

function abrirRegistroPeso(date='') {
  if(document.querySelector('.modal-overlay.open'))return toast('Feche a janela aberta para registrar o peso.','info');
  if(_currentTab!=='progresso'||_currentSubTab!=='peso')abrirTelaPeso();
  const weights=getPesosParaTendencia(),previous=weights[date];
  const modal=document.getElementById('modalWeightEntry');
  const field=document.getElementById('dataPeso'),input=document.getElementById('valorPeso');
  modal.dataset.editDate=previous?date:'';
  document.getElementById('weightEntryTitle').textContent=previous?'Corrigir pesagem':'Registrar peso';
  field.max=hoje();
  field.value=previous?date:hoje();
  field.readOnly=!!previous;
  input.value=previous?String(previous.kg).replace('.',','):'';
  modal.classList.add('open');
  input.focus({preventScroll:true});
  if(previous)input.select();
}

function irParaSimulacaoPeso() {
  if(_currentTab!=='progresso'||_currentSubTab!=='peso')abrirTelaPeso();
  document.getElementById('weightPageProjection').scrollIntoView({block:'start',behavior:'smooth'});
}

function definirPeriodoPeso(days) {
  _weightPageDays=days;
  _weightPageLimit=8;
  renderizarTelaPeso();
}

function mostrarMaisPesagens() {
  _weightPageLimit+=12;
  renderizarHistoricoPeso(TreinoMovementData.dates(hoje(),_weightPageDays),getPesosParaTendencia());
}

function renderizarHistoricoPeso(range,weights) {
  const host=document.getElementById('weightPageHistory');
  const records=range.filter(date=>weights[date]).reverse();
  const more=document.getElementById('weightShowMore');
  more.hidden=records.length<=_weightPageLimit;
  host.innerHTML=records.slice(0,_weightPageLimit).map(date=>{
    const record=weights[date],label=date.split('-').reverse().join('/');
    return '<div class="weight-record"><div><strong>'+formatarAtividade(record.kg,' kg',2)+'</strong><small>'+label+' · '+esc(record.source)+'</small></div><button type="button" class="btn btn-ghost btn-sm" data-weight-edit="'+date+'" aria-label="Corrigir pesagem de '+label+'">Corrigir</button></div>';
  }).join('');
  host.querySelectorAll('[data-weight-edit]').forEach(button=>button.onclick=()=>abrirRegistroPeso(button.dataset.weightEdit));
}

function renderizarTelaPeso() {
  if(_currentTab!=='progresso'||_currentSubTab!=='peso')return;
  const today=hoje(),weights=getPesosParaTendencia(),range=TreinoMovementData.dates(today,_weightPageDays);
  const latest=TreinoMovementData.weightSummary(today,weights).latest;
  const summary=document.getElementById('weightPageSummary');
  const projection=TreinoWeightProjection.model(weights,today,30);
  const rate=projection.ready?(projection.weekly>0?'+':'')+formatarAtividade(projection.weekly,' kg/semana',2):'—';
  summary.innerHTML=latest?
    '<div><span>Última pesagem</span><strong>'+formatarAtividade(latest.kg,' kg',2)+'</strong><small>'+latest.date.split('-').reverse().join('/')+' · '+esc(latest.source)+'</small></div><div><span>Ritmo recente</span><strong>'+rate+'</strong><small>'+(projection.ready?projection.count+' pesagens na janela de 30 dias':'Mais pesagens ajudam a calcular o ritmo')+'</small></div>':
    '<p class="activity-note">Registre sua primeira pesagem para começar.</p>';
  document.querySelectorAll('[data-weight-days]').forEach(button=>{
    const selected=Number(button.dataset.weightDays)===_weightPageDays;
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  const rows=TreinoMovementData.weightRows(range,weights);
  const any=rows.some(row=>row.weight!=null);
  document.getElementById('weightEvolutionEmpty').hidden=any;
  document.getElementById('weightEvolutionWrap').hidden=!any;
  _weightPageChart?.destroy();
  _weightPageChart=any?construirGraficoRotina('weightEvolutionChart',rows,[
    {key:'weight',label:'Pesagens (kg)',color:'#75aaff',connect:true,points:3},
    {key:'weightTrend',label:'Média móvel de 7 dias',color:'#f1bc6b',dash:[5,4],points:0}
  ]):null;
  renderizarHistoricoPeso(range,weights);
  const host=document.getElementById('weightPageProjection');
  if(host.querySelector('#weightProjection'))TreinoWeightProjection.render();
  else TreinoWeightProjection.mount(host);
}
