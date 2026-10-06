/* v12.8.6 — tendência de peso e objetivos manuais, independentes da alimentação. */
window.TreinoMovementData=(()=>{
  const goalsKey='movementGoalsV1286';
  const number=v=>v==null||!['number','string'].includes(typeof v)||String(v).trim()===''||!Number.isFinite(Number(v))?null:Number(v);
  const positive=v=>{const n=number(v);return n>0&&n<=1000?n:null;};
  function validDate(date){if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number(date.slice(0,4))<1000)return false;const [y,m,d]=date.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)===date;}
  function dates(end,n){const [y,m,d]=end.split('-').map(Number);return Array.from({length:n},(_,i)=>new Date(Date.UTC(y,m-1,d-n+1+i)).toISOString().slice(0,10));}
  function weights(manual,recovery,today){
    const out={};(Array.isArray(recovery?.daily)?recovery.daily:[]).forEach(d=>{const kg=positive(d?.weightKg);if(validDate(d?.date)&&d.date<=today&&kg!=null)out[d.date]={kg,source:'Health Connect'};});
    if(manual&&typeof manual==='object'&&!Array.isArray(manual))Object.entries(manual).forEach(([date,value])=>{const kg=positive(value);if(validDate(date)&&date<=today&&kg!=null)out[date]={kg,source:'Registro local'};});
    return out;
  }
  function average(range,weights){const rows=range.map(date=>weights[date]?.kg).filter(v=>v!=null);return {value:rows.length?rows.reduce((a,b)=>a+b,0)/rows.length:null,count:rows.length,start:range[0],end:range.at(-1)};}
  function weightRows(range,weights){return range.map(date=>{const avg=average(dates(date,7),weights);return {date,weight:weights[date]?.kg??null,weightSource:weights[date]?.source||'',weightTrend:avg.count>=2?avg.value:null,weightTrendCount:avg.count};});}
  function weightSummary(today,weights){
    const recent=dates(today,14),current=average(recent.slice(7),weights),previous=average(recent.slice(0,7),weights),latest=Object.keys(weights).sort().at(-1);
    return {current,previous,delta:current.count>=2&&previous.count>=2?current.value-previous.value:null,latest:latest?{date:latest,...weights[latest]}:null};
  }
  const limits={stepsDaily:[100000,true],cardioMinutesWeekly:[10080,false],cardioSessionsWeekly:[1000,true]};
  function goalValue(value,key){const n=number(value),[max,integer]=limits[key];return n>0&&n<=max&&(!integer||Number.isInteger(n))?n:null;}
  function goals(raw){const v=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};return Object.fromEntries(Object.keys(limits).map(key=>[key,goalValue(v[key],key)]));}
  function week(today){const date=new Date(today+'T12:00:00Z'),offset=(date.getUTCDay()+6)%7,start=dates(today,offset+1)[0],end=dates(start,1)[0],all=dates(new Date(Date.parse(end+'T12:00:00Z')+6*86400000).toISOString().slice(0,10),7);return {start, end:all.at(-1),elapsed:all.filter(d=>d<=today)};}
  function progress(snapshot,today){
    const period=week(today),data=window.TreinoActivityData.normalize(snapshot),summary=window.TreinoActivityData.summarize(data,period.elapsed,today),day=data.daily.find(d=>d.date===today),
      complete=summary.knownDays===period.elapsed.length&&data.readStatus?.sessions?.state!=='partial',observed=summary.cardioCount>0||summary.knownDays>0;
    return {...period,steps:day?.steps??null,minutes:observed?summary.minutes:null,sessions:observed?summary.cardioCount:null,complete,summary,data,day};
  }
  return {goalsKey,limits,number,positive,validDate,dates,weights,average,weightRows,weightSummary,goalValue,goals,week,progress};
})();
function getPesosParaTendencia(){return window.TreinoMovementData.weights(getPeso(),parseJSONSeguro(localStorage.getItem('healthRecoveryCacheV12')||'{}',{},'healthRecoveryCacheV12'),hoje());}
function renderizarTendenciaPeso(){
  const el=document.getElementById('weightInsights');if(!el)return;const visible=document.getElementById('routineMetric')?.value==='weight';el.hidden=!visible;if(!visible)return;
  const s=window.TreinoMovementData.weightSummary(hoje(),getPesosParaTendencia()),fmt=v=>formatarAtividade(v,' kg',2),dates=r=>r.start.slice(8)+'/'+r.start.slice(5,7)+' – '+r.end.slice(8)+'/'+r.end.slice(5,7);
  el.innerHTML='<div class="weight-week-grid"><div><span>Últimos 7 dias</span><strong>'+fmt(s.current.value)+'</strong><small>'+dates(s.current)+' · '+s.current.count+'/7 dias com medida</small></div><div><span>7 dias anteriores</span><strong>'+fmt(s.previous.value)+'</strong><small>'+dates(s.previous)+' · '+s.previous.count+'/7 dias com medida</small></div></div><p class="activity-note">'+(s.delta==null?'Comparação disponível com pelo menos duas pesagens em cada janela.':'Diferença entre médias: '+(s.delta>0?'+':'')+fmt(s.delta)+'.')+(s.latest?' Última medida: '+fmt(s.latest.kg)+' em '+s.latest.date.split('-').reverse().join('/')+' · '+s.latest.source+'.':'')+'</p><details class="activity-disclosure"><summary>Como ler a tendência</summary><p>A linha tracejada é a média das medidas disponíveis nos últimos 7 dias, com no mínimo duas pesagens. Dias sem medida não viram zero nem pesagens inventadas. As janelas comparadas têm 7 dias corridos; confira a quantidade de medidas. O registro local válido tem prioridade sobre o cache Health no mesmo dia. O histórico local legado pode conter pesos importados e não identifica a origem.</p></details>';
}
function getMetasMovimento(){const d=window.TreinoMovementData;return d.goals(parseJSONSeguro(localStorage.getItem(d.goalsKey)||'{}',{},d.goalsKey));}
function abrirMetasMovimento(){const g=getMetasMovimento();for(const key of Object.keys(g))document.getElementById('movementGoal-'+key).value=g[key]??'';document.getElementById('modalMovementGoals').classList.add('open');}
function salvarMetasMovimento(){
  const d=window.TreinoMovementData,g={};for(const key of Object.keys(d.limits)){
    const value=document.getElementById('movementGoal-'+key).value.trim();if(value!==''&&d.goalValue(value,key)==null)return toast('Confira as metas: valores positivos, passos/sessões inteiros e minutos até 10.080 por semana. Deixe vazio para desativar.','warn');
    g[key]=value===''?null:Number(value);
  }
  try{localStorage.setItem(d.goalsKey,JSON.stringify({...g,updatedAt:Date.now()}));}catch(error){console.warn('Metas de movimento não salvas',error);return toast('Não foi possível salvar. Suas metas anteriores foram mantidas.','error');}
  fecharModal('modalMovementGoals');renderizarMetasMovimento();toast('Metas manuais de movimento salvas','success');
}
function renderizarMetasMovimento(){
  const el=document.getElementById('activityMovementGoals');if(!el)return;const g=getMetasMovimento(),active=Object.values(g).some(v=>v!=null),p=window.TreinoMovementData.progress(getAtividadeHealth(),hoje());
  const card=(value,goal,label,quality,partial=false)=>'<div class="movement-goal"><span>'+label+'</span><strong>'+(value==null?'—':formatarAtividade(value,'',label.includes('min')?1:0))+' <small>/ '+formatarAtividade(goal)+'</small></strong><progress value="'+(value==null?0:Math.min(value,goal))+'" max="'+goal+'" aria-label="'+label+'"></progress>'+htmlQualidadeAtividade(quality,partial)+'</div>';
  let cards='';if(g.stepsDaily!=null)cards+=card(p.steps,g.stepsDaily,'Passos hoje',TreinoActivityData.quality(p.day?[p.day]:[],'steps'));
  const q=TreinoActivityData.quality([...p.summary.daily.filter(d=>d.cardioKnown),...p.summary.sessions],'sessions');
  if(g.cardioMinutesWeekly!=null)cards+=card(p.minutes,g.cardioMinutesWeekly,'Cardio na semana (min)',q,!p.complete);
  if(g.cardioSessionsWeekly!=null)cards+=card(p.sessions,g.cardioSessionsWeekly,'Sessões na semana',q,!p.complete);
  el.innerHTML='<div class="movement-goals-head"><div><strong>Suas metas de movimento</strong><span>'+p.start.split('-').reverse().join('/')+' – '+p.end.split('-').reverse().join('/')+'</span></div><button type="button" class="btn btn-outline btn-sm" onclick="abrirMetasMovimento()">'+(active?'Editar metas':'Definir metas')+'</button></div>'+(active?'<div class="movement-goals-grid">'+cards+'</div>':'<p class="activity-note">Escolha suas metas de passos/dia, minutos de cardio e sessões por semana. Nenhum valor é definido automaticamente.</p>')+'<p class="activity-note">Semana de segunda a domingo · todas as modalidades, independentemente do filtro. Dados parciais/salvos são identificados; não há acompanhamento em tempo real. Suas metas alimentares não mudam.</p>';
}
