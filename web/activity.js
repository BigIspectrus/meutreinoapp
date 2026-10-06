/* v12.8 — dados de atividade isolados, sem migrar histórico ou metas existentes. */
window.TreinoActivityData = (() => {
  const kinds = {walking:'Caminhada',running:'Corrida',treadmill:'Corrida na esteira',cycling:'Bicicleta',stationary:'Bicicleta ergométrica'};
  const value = v => v == null || v === '' || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v);
  const dateValid = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d));
  function dates(end, count) {
    const [y,m,d] = end.split('-').map(Number);
    return Array.from({length:count},(_,i) => {
      const day = new Date(y,m-1,d-count+1+i);
      return [day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');
    });
  }
  function normalize(raw={}) {
    return {...raw,
      daily:(Array.isArray(raw.daily)?raw.daily:[]).filter(d=>d&&dateValid(d.date)).map(d=>({
        date:d.date,steps:value(d.steps),activeKcal:value(d.activeKcal),totalKcal:value(d.totalKcal),cardioKnown:!!d.cardioKnown
      })),
      sessions:(Array.isArray(raw.sessions)?raw.sessions:[]).filter(s=>s&&s.id&&kinds[s.kind]&&dateValid(s.date)&&Number(s.endMs)>Number(s.startMs)&&Number(s.startMs)>0).map(s=>({
        ...s,id:String(s.id),sourcePackage:String(s.sourcePackage||''),source:String(s.source||'Health Connect'),title:String(s.title||''),
        startMs:Number(s.startMs),endMs:Number(s.endMs),minutes:(Number(s.endMs)-Number(s.startMs))/60000,kcal:value(s.kcal),
        calorieKind:['active','total'].includes(s.calorieKind)?s.calorieKind:null
      })).sort((a,b)=>b.startMs-a.startMs),errors:Array.isArray(raw.errors)?raw.errors:[]
    };
  }
  function merge(previous, incoming) {
    const fresh=normalize(incoming),old=normalize(previous);
    if(!fresh.available)return old;
    const sameZone=!old.zoneId||old.zoneId===fresh.zoneId;
    const daily=new Map((sameZone?old.daily:[]).map(d=>[d.date,d]));
    fresh.daily.forEach(d=>{
      const before=daily.get(d.date)||{};
      daily.set(d.date,{...d,
        steps:fresh.errors.includes('steps')?before.steps??null:d.steps,
        activeKcal:fresh.errors.includes('calories')?before.activeKcal??null:d.activeKcal,
        totalKcal:fresh.errors.includes('calories')?before.totalKcal??null:d.totalKcal,
        cardioKnown:fresh.sessionsComplete?true:!!before.cardioKnown
      });
    });
    const retained=(sameZone?old.sessions:[]).filter(s=>!fresh.sessionsComplete||s.date<fresh.rangeStart||s.date>fresh.rangeEnd);
    const sessions=new Map(retained.map(s=>[s.sourcePackage+':'+s.id,s]));
    fresh.sessions.forEach(s=>{
      const previousSession=old.sessions.find(x=>x.id===s.id&&x.sourcePackage===s.sourcePackage&&x.startMs===s.startMs&&x.endMs===s.endMs);
      const cachedEnergy=s.kcal==null&&fresh.errors.includes('sessionCalories')&&previousSession?.kcal!=null;
      sessions.set(s.sourcePackage+':'+s.id,cachedEnergy?{...s,kcal:previousSession.kcal,calorieKind:previousSession.calorieKind}:s);
    });
    const cutoff=fresh.rangeEnd?dates(fresh.rangeEnd,366)[0]:'';
    return {...fresh,daily:[...daily.values()].filter(d=>d.date>=cutoff).sort((a,b)=>a.date.localeCompare(b.date)),
      sessions:[...sessions.values()].filter(s=>s.date>=cutoff).sort((a,b)=>b.startMs-a.startMs)};
  }
  function summarize(snapshot, range, today, kind='all') {
    const data=normalize(snapshot),set=new Set(range),daily=data.daily.filter(d=>set.has(d.date)),
      completed=daily.filter(d=>d.date<today&&d.steps!=null),
      sessions=data.sessions.filter(s=>set.has(s.date)&&(kind==='all'||s.kind===kind)),withKcal=sessions.filter(s=>s.kcal!=null);
    return {daily,sessions,todaySteps:daily.find(d=>d.date===today)?.steps??null,
      averageSteps:completed.length?completed.reduce((n,d)=>n+d.steps,0)/completed.length:null,stepDays:completed.length,
      cardioCount:sessions.length,minutes:sessions.reduce((n,s)=>n+s.minutes,0),
      kcal:withKcal.length?withKcal.reduce((n,s)=>n+s.kcal,0):null,kcalCount:withKcal.length,
      totalFallback:withKcal.some(s=>s.calorieKind==='total'),knownDays:daily.filter(d=>d.cardioKnown).length};
  }
  function trends(snapshot, range, entries, weights, kind='all') {
    const data=normalize(snapshot),byDate=new Map(data.daily.map(d=>[d.date,d])),foods=new Map(),cardios=new Map();
    (entries||[]).forEach(e=>{
      if(!dateValid(e.date))return;
      const row=foods.get(e.date)||{kcal:0,protein:0,carbs:0,fat:0,count:0};
      ['kcal','protein','carbs','fat'].forEach(k=>row[k]+=value(e[k])??0);row.count++;foods.set(e.date,row);
    });
    data.sessions.filter(s=>kind==='all'||s.kind===kind).forEach(s=>{
      const row=cardios.get(s.date)||{count:0,minutes:0,kcal:0,kcalCount:0};
      row.count++;row.minutes+=s.minutes;if(s.kcal!=null){row.kcal+=s.kcal;row.kcalCount++;}cardios.set(s.date,row);
    });
    return range.map(date=>{
      const d=byDate.get(date),c=cardios.get(date),n=foods.get(date);
      return {date,steps:d?.steps??null,activeKcal:d?.activeKcal??null,totalKcal:d?.totalKcal??null,
        cardioCount:c?.count??(d?.cardioKnown?0:null),cardioMinutes:c?.minutes??(d?.cardioKnown?0:null),
        cardioKcal:c?.kcalCount?c.kcal:null,weight:value(weights?.[date]),
        kcal:n?.kcal??null,protein:n?.protein??null,carbs:n?.carbs??null,fat:n?.fat??null};
    });
  }
  return {kinds,value,dates,normalize,merge,summarize,trends};
})();

const ACTIVITY_CACHE_KEY='healthActivityCacheV128';
let _activityDays=30,_activityAllRows=false,_activityBusy=null,_activityError='',_activityChart=null,_routineChart=null;
function getAtividadeHealth(){return TreinoActivityData.normalize(parseJSONSeguro(localStorage.getItem(ACTIVITY_CACHE_KEY)||'{}',{},ACTIVITY_CACHE_KEY));}
function periodoAtividade(){return TreinoActivityData.dates(hoje(),_activityDays);}
function formatarAtividade(v,suffix='',decimals=0){return v==null?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:decimals})+suffix;}
function resumoAtividadeAtual(){return TreinoActivityData.summarize(getAtividadeHealth(),periodoAtividade(),hoje(),document.getElementById('activityKind')?.value||'all');}
function definirPeriodoAtividade(days){_activityDays=[7,30,90].includes(Number(days))?Number(days):30;_activityAllRows=false;renderizarAtividades();renderizarEvolucaoRotina();}
function abrirCardioPassos(){irParaAba('progresso');ativarSubTab('atividade');}
function abrirRefeicaoWidget(){
  // Um atalho do launcher sempre registra HOJE, não o dia antigo aberto no diário.
  _nutritionDate=hoje();irParaAba('nutricao');abrirRegistroNutricao(refeicaoSugeridaNutricao());
}
async function sincronizarAtividadesHealth(force=false){
  if(!isNativeAndroid()||!window.TreinoNativeBridge?.getActivitySnapshot){renderizarAtividades();return;}
  if(_activityBusy)return _activityBusy;
  const cache=getAtividadeHealth();
  if(!force&&cache.rangeEnd===hoje()&&Date.now()-Number(cache.generatedAt||0)<300000){renderizarAtividades();return;}
  _activityError='';
  _activityBusy=(async()=>{
    try {
      const fresh=await window.TreinoNativeBridge.getActivitySnapshot({days:90});
      if(fresh.available){localStorage.setItem(ACTIVITY_CACHE_KEY,JSON.stringify(TreinoActivityData.merge(cache,fresh)));}
      else _activityError='Health Connect indisponível neste aparelho. Os últimos dados salvos continuam visíveis.';
      if(force&&fresh.available)toast(fresh.errors?.length?'Atualização parcial: alguns dados não puderam ser lidos.':'Cardio e passos atualizados.',fresh.errors?.length?'warn':'success');
    } catch(e){console.warn('Atividade Health',e);_activityError='Não foi possível atualizar. Os últimos dados salvos foram mantidos; tente novamente.';if(force)toast(_activityError,'warn');}
    finally {_activityBusy=null;renderizarAtividades();renderizarEvolucaoRotina();renderizarAtividadeDashboard();}
  })();
  renderizarAtividades();return _activityBusy;
}
function htmlEstatisticaAtividade(value,label,note=''){return '<div class="activity-stat"><strong>'+value+'</strong><span>'+label+'</span>'+(note?'<small>'+note+'</small>':'')+'</div>';}
function estadoAtividadeHealth(data){
  const notes=[];
  if(!isNativeAndroid())notes.push('A sincronização está disponível no APK Android.');
  else if(!data.generatedAt)notes.push('Conecte o Health Connect para importar suas atividades.');
  else {
    if(!data.readSteps)notes.push('Passos: autorize a leitura no Health Connect.');
    if(!data.readExercise)notes.push('Cardios: autorize a leitura de exercícios.');
    if(!data.readActiveCalories&&!data.readCalories)notes.push('Kcal: autorize a leitura de calorias.');
    if(!data.historyGranted)notes.push('Sem acesso ao histórico antigo, a leitura nova cobre até 28 dias; dias já salvos são mantidos.');
    if(data.errors.length)notes.push('Atualização parcial. Dados anteriores podem continuar visíveis.');
  }
  if(_activityError)notes.push(_activityError);
  if(data.generatedAt)notes.push('Última leitura: '+new Date(data.generatedAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})+'.');
  return notes.join(' ');
}
function renderizarAtividades(){
  const el=document.getElementById('activityStats');if(!el)return;
  const data=getAtividadeHealth(),s=resumoAtividadeAtual();
  document.querySelectorAll('[data-activity-days]').forEach(b=>{const on=Number(b.dataset.activityDays)===_activityDays;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  el.innerHTML=htmlEstatisticaAtividade(formatarAtividade(s.todaySteps),'passos hoje','dia em andamento')+
    htmlEstatisticaAtividade(formatarAtividade(s.averageSteps),'média de passos/dia',s.stepDays+' dias completos com dados')+
    htmlEstatisticaAtividade(s.knownDays||s.cardioCount?String(s.cardioCount):'—','cardios no período',formatarAtividade(s.minutes,' min',1))+
    htmlEstatisticaAtividade(formatarAtividade(s.kcal,' kcal'),'kcal dos cardios',s.kcalCount+'/'+s.cardioCount+' sessões com kcal'+(s.totalFallback?' · inclui gasto total no intervalo':''));
  const last=data.daily.find(d=>d.date===hoje());
  document.getElementById('activityEnergy').textContent='Hoje: '+formatarAtividade(last?.activeKcal,' kcal ativas')+' · '+formatarAtividade(last?.totalKcal,' kcal totais')+'. Não somamos esses valores às kcal dos cardios.';
  document.getElementById('activityStatus').textContent=(_activityBusy?'Atualizando Health Connect… ':'' )+estadoAtividadeHealth(data);
  document.getElementById('activitySyncButton').disabled=!!_activityBusy;
  const filtered=s.sessions,shown=_activityAllRows?filtered:filtered.slice(0,10),list=document.getElementById('activitySessions');
  list.innerHTML=shown.length?shown.map(row=>'<article class="activity-session"><div class="activity-session-mark" aria-hidden="true">'+(row.kind==='cycling'||row.kind==='stationary'?'↻':'↗')+'</div><div class="activity-session-main"><strong>'+esc(TreinoActivityData.kinds[row.kind])+'</strong><span>'+row.date.split('-').reverse().join('/')+' · '+new Date(row.startMs).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+' · '+formatarAtividade(row.minutes,' min',1)+'</span><small>'+esc(row.source)+(row.title?' · '+esc(row.title):'')+'</small></div><div class="activity-session-energy"><strong>'+formatarAtividade(row.kcal)+'</strong><small>'+(row.kcal==null?'kcal não informadas':row.calorieKind==='active'?'kcal ativas':'kcal no intervalo')+'</small></div></article>').join(''):
    '<div class="activity-empty"><strong>Nenhum cardio neste período</strong><p>Finalize a atividade no relógio e aguarde Samsung Health → Health Connect. Caminhada, corrida, esteira e bicicletas aparecem aqui quando disponíveis.</p></div>';
  document.getElementById('activityShowAll').hidden=filtered.length<=10||_activityAllRows;
  document.getElementById('activityShowAll').textContent='Ver todos os '+filtered.length+' cardios';
  desenharGraficoAtividade();
}
function mostrarTodosCardios(){_activityAllRows=true;renderizarAtividades();}
function dadosRotinaAtividade(){
  const weights={};
  const recovery=parseJSONSeguro(localStorage.getItem('healthRecoveryCacheV12')||'{}',{},'healthRecoveryCacheV12');
  (recovery.daily||[]).forEach(d=>{if(Number(d.weightKg)>0)weights[d.date]=Number(d.weightKg);});
  Object.assign(weights,getPeso());
  return TreinoActivityData.trends(getAtividadeHealth(),periodoAtividade(),getRegistrosNutricao(),weights,document.getElementById('activityKind')?.value||'all');
}
function construirGraficoRotina(id,rows,series,type='line'){
  const canvas=document.getElementById(id);if(!canvas||typeof Chart==='undefined')return null;
  const muted=getComputedStyle(document.body).getPropertyValue('--text-muted').trim(),grid=getComputedStyle(document.body).getPropertyValue('--border').trim();
  return new Chart(canvas,{type,data:{labels:rows.map(d=>d.date.slice(8)+'/'+d.date.slice(5,7)),datasets:series.map(s=>({
    label:s.label,data:rows.map(d=>d[s.key]),borderColor:s.color,backgroundColor:s.color+'35',borderWidth:2,
    tension:.2,spanGaps:false,pointRadius:rows.length>30?0:2,pointHoverRadius:5,fill:false
  }))},options:{responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:series.length>1,labels:{color:muted,boxWidth:12}},tooltip:{callbacks:{title:items=>rows[items[0]?.dataIndex]?.date.split('-').reverse().join('/')||''}}},
    scales:{x:{grid:{display:false},ticks:{color:muted,maxTicksLimit:6,maxRotation:0}},y:{beginAtZero:!series.some(s=>s.key==='weight'),grid:{color:grid},ticks:{color:muted,maxTicksLimit:5}}}}});
}
function desenharGraficoAtividade(){
  if(_activityChart){_activityChart.destroy();_activityChart=null;}
  if(!document.getElementById('sub-atividade')?.classList.contains('active'))return;
  const rows=dadosRotinaAtividade(),key=document.getElementById('activityChartMetric')?.value||'steps',
    config={steps:['Passos','#75aaff','passos'],cardioMinutes:['Minutos de cardio','#65d8b0','minutos'],cardioCount:['Cardios','#c6a3ff','sessões'],cardioKcal:['Kcal dos cardios','#f1bc6b','kcal']},c=config[key];
  const any=rows.some(d=>d[key]!=null);document.getElementById('activityChartEmpty').hidden=any;
  document.getElementById('activityChartWrap').hidden=!any;
  document.getElementById('activityChartUnit').textContent=c[2]+' por dia · lacunas = sem dados';
  if(any)_activityChart=construirGraficoRotina('activityChart',rows,[{key,label:c[0],color:c[1]}],'bar');
}
function renderizarEvolucaoRotina(){
  if(_routineChart){_routineChart.destroy();_routineChart=null;}
  if(!document.getElementById('sub-evolucao')?.classList.contains('active'))return;
  const rows=dadosRotinaAtividade(),mode=document.getElementById('routineMetric')?.value||'weight',goals=getMetasNutricao(),
    configs={weight:[{key:'weight',label:'Peso (kg)',color:'#f1bc6b'}],steps:[{key:'steps',label:'Passos',color:'#75aaff'}],
      cardioMinutes:[{key:'cardioMinutes',label:'Cardio (min)',color:'#65d8b0'}],cardioKcal:[{key:'cardioKcal',label:'Cardio (kcal)',color:'#f1bc6b'}],
      kcal:[{key:'kcal',label:'Kcal registradas',color:'#c6a3ff'}],macros:[{key:'protein',label:'Proteína (g)',color:'#75aaff'},{key:'carbs',label:'Carboidratos (g)',color:'#f1bc6b'},{key:'fat',label:'Gorduras (g)',color:'#ef97ae'}]},series=configs[mode],key=series[0].key,
    vals=rows.filter(d=>d[key]!=null),past=vals.filter(d=>d.date<hoje()),avg=past.length?past.reduce((n,d)=>n+d[key],0)/past.length:null;
  const note=document.getElementById('routineSummary');
  if(mode==='weight')note.textContent=vals.length>1?'Variação no período: '+(vals.at(-1).weight-vals[0].weight).toLocaleString('pt-BR',{maximumFractionDigits:2})+' kg · '+vals.length+' medidas.':vals.length+' medida(s) no período. Seu gráfico de peso original continua disponível abaixo.';
  else note.textContent='Média: '+formatarAtividade(avg,mode==='macros'?' g de proteína':mode==='cardioMinutes'?' min':mode==='kcal'||mode==='cardioKcal'?' kcal':' passos',mode==='steps'?0:1)+' · '+past.length+' dias completos com registros.'+(mode==='kcal'&&goals?' Meta manual atual: '+formatarAtividade(goals.kcal,' kcal')+'.':'');
  const kind=document.getElementById('activityKind')?.value||'all';if(mode.startsWith('cardio')&&kind!=='all')note.textContent+=' Modalidade: '+TreinoActivityData.kinds[kind]+'.';
  document.getElementById('routineChartEmpty').hidden=!!vals.length;document.getElementById('routineChartWrap').hidden=!vals.length;
  if(vals.length)_routineChart=construirGraficoRotina('routineChart',rows,series);
  document.querySelectorAll('[data-activity-days]').forEach(b=>{const on=Number(b.dataset.activityDays)===_activityDays;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
}
function renderizarAtividadeDashboard(){
  const el=document.getElementById('activityDashboard');if(!el)return;
  const data=getAtividadeHealth(),s=TreinoActivityData.summarize(data,TreinoActivityData.dates(hoje(),7),hoje());
  el.innerHTML='<div><span class="eyebrow">Movimento do dia</span><strong>'+formatarAtividade(s.todaySteps)+' <small>passos hoje</small></strong><span>'+(s.knownDays||s.cardioCount?s.cardioCount+' cardios nos últimos 7 dias · '+formatarAtividade(s.minutes,' min'):'Conecte o Health para acompanhar seus cardios')+'</span></div><span class="activity-dashboard-arrow" aria-hidden="true">↗</span>';
}
window.addEventListener('load',()=>{renderizarAtividadeDashboard();if(isNativeAndroid())setTimeout(()=>sincronizarAtividadesHealth(false),2200);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderizarAtividadeDashboard();if(isNativeAndroid()){sincronizarAtividadesHealth(false);atualizarWidgetNativo();}}});
