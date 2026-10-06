/* v12.8 — dados de atividade isolados, sem migrar histórico ou metas existentes. */
window.TreinoActivityData = (() => {
  const kinds = {walking:'Caminhada',running:'Corrida',treadmill:'Corrida na esteira',cycling:'Bicicleta',stationary:'Bicicleta ergométrica'};
  const value = v => v == null || !['number','string'].includes(typeof v) || String(v).trim()==='' || !Number.isFinite(Number(v)) || Number(v) < 0 ? null : Number(v);
  const dateValid = d => /^\d{4}-\d{2}-\d{2}$/.test(String(d));
  const time = v => value(v)>0&&value(v)<=8640000000000000?Math.floor(Number(v)):null;
  const metrics=['steps','activeKcal','totalKcal','sessions','sessionKcal'];
  const permission={steps:'readSteps',activeKcal:'readActiveCalories',totalKcal:'readCalories',sessions:'readExercise'};
  const errorKey={steps:'steps',activeKcal:'calories',totalKcal:'calories',sessions:'sessions',sessionKcal:'sessionCalories'};
  function info(raw){
    const v=raw&&typeof raw==='object'?raw:{};
    return {readAt:time(v.readAt),checkedAt:time(v.checkedAt),state:['fresh','cached','missing','unknown'].includes(v.state)?v.state:'unknown',
      reason:['error','partial','denied','unavailable','outside_range','legacy','no_data',''].includes(v.reason)?v.reason:'legacy'};
  }
  function status(raw,key,attempt){
    const explicit=raw.readStatus?.[key];
    if(raw.available!==true)return {state:explicit&&['error','partial','denied','unavailable'].includes(explicit.state)?explicit.state:'unavailable',readAt:null,checkedAt:time(explicit?.checkedAt)||attempt};
    if(explicit&&['ok','error','partial','denied','unavailable','no_data'].includes(explicit.state))return {
      state:explicit.state,readAt:time(explicit.readAt),checkedAt:time(explicit.checkedAt)||attempt
    };
    let state='ok';
    if(raw.available===false)state='unavailable';
    else if(raw.errors?.includes(errorKey[key]))state='error';
    else if(raw[permission[key]]===false||(key==='sessionKcal'&&raw.readActiveCalories===false&&raw.readCalories===false))state='denied';
    else if(key==='sessions'&&!raw.sessionsComplete)state='partial';
    return {state,checkedAt:attempt,readAt:state==='ok'?attempt:null};
  }
  function legacyInfo(raw,row,key,present){
    if(row.readInfo?.[key])return info(row.readInfo[key]);
    const inRange=dateValid(raw.rangeStart)&&dateValid(raw.rangeEnd)&&row.date>=raw.rangeStart&&row.date<=raw.rangeEnd,
      verified=inRange&&raw.available===true&&time(raw.generatedAt)&&!raw.errors?.includes(errorKey[key])&&
        (key==='sessionKcal'?(raw.readActiveCalories===true||raw.readCalories===true):raw[permission[key]]===true)&&
        (key!=='sessions'||raw.sessionsComplete);
    // Só recuperar o horário global legado quando a consulta correspondente foi
    // bem-sucedida e cobriu esse dia. Nunca atribuir "agora" a dados antigos.
    return {readAt:verified?time(raw.generatedAt):null,checkedAt:verified?time(raw.generatedAt):null,
      state:present?'cached':'unknown',reason:'legacy'};
  }
  function currentInfo(read,present){return {
    readAt:time(read.readAt),checkedAt:time(read.checkedAt),state:present?'fresh':'missing',reason:present?'':'no_data'
  };}
  function savedInfo(before,present,read,reason=read.state){return {
    ...info(before),checkedAt:time(read.checkedAt)||info(before).checkedAt,state:present?'cached':'missing',reason
  };}
  function outsideInfo(before,present){return present?{...info(before),state:'cached',reason:'outside_range'}:info(before);}
  function dates(end, count) {
    const [y,m,d] = end.split('-').map(Number);
    return Array.from({length:count},(_,i) => {
      const day = new Date(y,m-1,d-count+1+i);
      return [day.getFullYear(),String(day.getMonth()+1).padStart(2,'0'),String(day.getDate()).padStart(2,'0')].join('-');
    });
  }
  function normalize(raw={}) {
    raw=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
    return {...raw,
      daily:(Array.isArray(raw.daily)?raw.daily:[]).filter(d=>d&&dateValid(d.date)).map(d=>({
        date:d.date,steps:value(d.steps),activeKcal:value(d.activeKcal),totalKcal:value(d.totalKcal),cardioKnown:!!d.cardioKnown,
        readInfo:Object.fromEntries(['steps','activeKcal','totalKcal','sessions'].map(key=>[key,legacyInfo(raw,d,key,key==='sessions'?!!d.cardioKnown:value(d[key])!=null)]))
      })),
      sessions:(Array.isArray(raw.sessions)?raw.sessions:[]).filter(s=>s&&s.id&&kinds[s.kind]&&dateValid(s.date)&&Number(s.endMs)>Number(s.startMs)&&Number(s.startMs)>0).map(s=>({
        ...s,id:String(s.id),sourcePackage:String(s.sourcePackage||''),source:String(s.source||'Health Connect'),title:String(s.title||''),
        startMs:Number(s.startMs),endMs:Number(s.endMs),minutes:(Number(s.endMs)-Number(s.startMs))/60000,kcal:value(s.kcal),
        calorieKind:['active','total'].includes(s.calorieKind)?s.calorieKind:null,
        readInfo:{sessions:legacyInfo(raw,s,'sessions',true),sessionKcal:legacyInfo(raw,s,'sessionKcal',value(s.kcal)!=null)}
      })).sort((a,b)=>b.startMs-a.startMs),errors:Array.isArray(raw.errors)?raw.errors:[]
    };
  }
  function merge(previous, incoming, now=Date.now()) {
    incoming=incoming&&typeof incoming==='object'&&!Array.isArray(incoming)&&typeof incoming.available==='boolean'?incoming:
      {available:false,readStatus:Object.fromEntries(metrics.map(key=>[key,{state:'error',checkedAt:now}]))};
    const fresh=normalize(incoming),old=normalize(previous);
    const attempt=time(incoming.generatedAt)||time(now),reads=Object.fromEntries(metrics.map(key=>[key,status(incoming,key,attempt)]));
    const readStatus=Object.fromEntries(metrics.map(key=>[key,{...reads[key],readAt:reads[key].state==='ok'?reads[key].readAt:time(old.readStatus?.[key]?.readAt)}]));
    if(!fresh.available)return {...old,available:false,lastAttemptAt:attempt,readStatus,readTrackingVersion:1,
      daily:old.daily.map(d=>({...d,readInfo:Object.fromEntries(['steps','activeKcal','totalKcal','sessions'].map(key=>[key,savedInfo(d.readInfo[key],key==='sessions'?d.cardioKnown:d[key]!=null,reads[key])]))})),
      sessions:old.sessions.map(s=>({...s,readInfo:{sessions:savedInfo(s.readInfo.sessions,true,reads.sessions),sessionKcal:savedInfo(s.readInfo.sessionKcal,s.kcal!=null,reads.sessionKcal)}}))};
    const sameZone=!old.zoneId||old.zoneId===fresh.zoneId;
    const daily=new Map((sameZone?old.daily:[]).map(d=>[d.date,{...d,readInfo:Object.fromEntries(['steps','activeKcal','totalKcal','sessions'].map(key=>[key,outsideInfo(d.readInfo[key],key==='sessions'?d.cardioKnown:d[key]!=null)]))}]));
    fresh.daily.forEach(d=>{
      const before=daily.get(d.date)||{},row={date:d.date,readInfo:{}};
      for(const key of ['steps','activeKcal','totalKcal']){
        const ok=reads[key].state==='ok';row[key]=ok?d[key]:before[key]??null;
        row.readInfo[key]=ok?currentInfo(reads[key],row[key]!=null):savedInfo(before.readInfo?.[key],row[key]!=null,reads[key]);
      }
      const complete=fresh.sessionsComplete&&reads.sessions.state==='ok';
      row.cardioKnown=complete||!!before.cardioKnown;
      row.readInfo.sessions=complete?currentInfo(reads.sessions,true):savedInfo(before.readInfo?.sessions,row.cardioKnown,reads.sessions);
      daily.set(d.date,row);
    });
    const complete=fresh.sessionsComplete&&reads.sessions.state==='ok';
    const retained=(sameZone?old.sessions:[]).filter(s=>!complete||s.date<fresh.rangeStart||s.date>fresh.rangeEnd).map(s=>{
      const inRange=s.date>=fresh.rangeStart&&s.date<=fresh.rangeEnd;
      return {...s,readInfo:{sessions:inRange?savedInfo(s.readInfo.sessions,true,reads.sessions):outsideInfo(s.readInfo.sessions,true),
        sessionKcal:inRange?savedInfo(s.readInfo.sessionKcal,s.kcal!=null,reads.sessionKcal,reads.sessionKcal.state==='ok'?'partial':reads.sessionKcal.state):outsideInfo(s.readInfo.sessionKcal,s.kcal!=null)}};
    });
    const sessions=new Map(retained.map(s=>[s.sourcePackage+':'+s.id,s]));
    fresh.sessions.forEach(s=>{
      const previousSession=sameZone?old.sessions.find(x=>x.id===s.id&&x.sourcePackage===s.sourcePackage&&x.startMs===s.startMs&&x.endMs===s.endMs):null,
        energyRead=['ok','error','denied'].includes(s.kcalReadState)?{state:s.kcalReadState,readAt:time(s.kcalReadAt),checkedAt:time(s.kcalCheckedAt)||attempt}:reads.sessionKcal,
        cachedEnergy=energyRead.state!=='ok'&&previousSession?.kcal!=null,
        readInfo={sessions:currentInfo({readAt:time(s.sessionReadAt)||reads.sessions.readAt||attempt,checkedAt:reads.sessions.checkedAt},true),
          sessionKcal:energyRead.state==='ok'?currentInfo(energyRead,s.kcal!=null):savedInfo(previousSession?.readInfo.sessionKcal,cachedEnergy||s.kcal!=null,energyRead)};
      sessions.set(s.sourcePackage+':'+s.id,{...s,...(cachedEnergy?{kcal:previousSession.kcal,calorieKind:previousSession.calorieKind}:{}),readInfo});
    });
    const cutoff=fresh.rangeEnd?dates(fresh.rangeEnd,366)[0]:'';
    return {...fresh,lastAttemptAt:attempt,readStatus,readTrackingVersion:1,daily:[...daily.values()].filter(d=>d.date>=cutoff).sort((a,b)=>a.date.localeCompare(b.date)),
      sessions:[...sessions.values()].filter(s=>s.date>=cutoff).sort((a,b)=>b.startMs-a.startMs)};
  }
  function failure(previous, now=Date.now(), reason='error'){
    return merge(previous,{available:false,readStatus:Object.fromEntries(metrics.map(key=>[key,{state:reason,checkedAt:now}]))},now);
  }
  function quality(items,key){
    const entries=(items||[]).map(row=>info(row.readInfo?.[key])),times=entries.map(x=>x.readAt).filter(x=>x!=null),
      checks=entries.map(x=>x.checkedAt).filter(x=>x!=null);
    return {count:entries.length,cached:entries.filter(x=>x.state==='cached').length,missing:entries.filter(x=>x.state==='missing').length,
      unknown:entries.filter(x=>x.readAt==null&&x.state!=='missing').length,
      firstReadAt:times.length?Math.min(...times):null,lastReadAt:times.length?Math.max(...times):null,
      lastCheckedAt:checks.length?Math.max(...checks):null,reasons:[...new Set(entries.map(x=>x.reason).filter(Boolean))]};
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
  return {kinds,value,time,metrics,dates,info,normalize,merge,failure,quality,summarize,trends};
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
  const age=Date.now()-Number(cache.lastAttemptAt||cache.generatedAt||0);
  if(!force&&age>=0&&age<300000){renderizarAtividades();return;}
  _activityError='';
  _activityBusy=(async()=>{
    // Até uma exceção síncrona do bridge deve liberar o botão no finally.
    await Promise.resolve();
    try {
      const fresh=await window.TreinoNativeBridge.getActivitySnapshot({days:90});
      if(!fresh||Array.isArray(fresh)||typeof fresh.available!=='boolean')throw new Error('Resposta de atividade do Health Connect inválida');
      localStorage.setItem(ACTIVITY_CACHE_KEY,JSON.stringify(TreinoActivityData.merge(cache,fresh)));
      if(!fresh.available)_activityError='Health Connect indisponível neste aparelho. Os últimos dados salvos continuam visíveis.';
      if(force&&fresh.available)toast(fresh.errors?.length?'Atualização parcial: alguns dados não puderam ser lidos.':'Cardio e passos atualizados.',fresh.errors?.length?'warn':'success');
    } catch(e){console.warn('Atividade Health',e);localStorage.setItem(ACTIVITY_CACHE_KEY,JSON.stringify(TreinoActivityData.failure(cache)));_activityError='Não foi possível atualizar. Os últimos dados salvos foram mantidos; tente novamente.';if(force)toast(_activityError,'warn');}
    finally {_activityBusy=null;renderizarAtividades();renderizarEvolucaoRotina();renderizarAtividadeDashboard();}
  })();
  renderizarAtividades();return _activityBusy;
}
function horaLeituraAtividade(value){
  const time=TreinoActivityData.time(value);if(!time)return '';
  const date=new Date(time);return date.toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',...(date.getFullYear()!==new Date().getFullYear()?{year:'numeric'}:{})});
}
function textoQualidadeAtividade(q,partial=false){
  if(!q.count||q.missing===q.count){
    const reason=q.reasons.includes('denied')?'Sem permissão':q.reasons.includes('unavailable')?'Health indisponível':q.reasons.includes('error')?'Leitura falhou':'Sem dados';
    const check=horaLeituraAtividade(q.lastCheckedAt),label=q.reasons.includes('error')?'tentativa':q.reasons.includes('denied')||q.reasons.includes('unavailable')?'verificação':'consulta';
    return reason+(check?' · '+label+' '+check:'');
  }
    const first=horaLeituraAtividade(q.firstReadAt),last=horaLeituraAtividade(q.lastReadAt),
    stamp=first&&last&&first!==last?'leituras '+first+' a '+last:last?'lido '+last:'sem horário registrado',
    prefix=partial?'Consulta parcial · ':q.cached?(q.cached===q.count?'Salvo · ':'Inclui dados salvos · '):'';
  return prefix+stamp;
}
function htmlQualidadeAtividade(q,partial=false){return '<small class="activity-read-quality'+(q.cached||q.unknown||partial?' saved':'')+'">'+esc(textoQualidadeAtividade(q,partial))+'</small>';}
function htmlEstatisticaAtividade(value,label,note='',quality=null,partial=false){return '<div class="activity-stat"><strong>'+value+'</strong><span>'+label+'</span>'+(note?'<small>'+note+'</small>':'')+(quality?htmlQualidadeAtividade(quality,partial):'')+'</div>';}
function renderizarStatusLeiturasAtividade(data){
  const el=document.getElementById('activityReadStatus');if(!el)return;
  const labels={steps:'Passos',activeKcal:'Kcal ativas do dia',totalKcal:'Kcal totais do dia',sessions:'Lista de cardios',sessionKcal:'Kcal dos cardios'},
    names={ok:'Consulta concluída',error:'Falhou · dados salvos mantidos',partial:'Consulta parcial',denied:'Sem permissão · sem nova leitura',unavailable:'Health indisponível',no_data:'Sem cardios para consultar'};
  el.innerHTML=TreinoActivityData.metrics.map(key=>{
    const s=data.readStatus?.[key],
      last=horaLeituraAtividade(s?.readAt),checked=horaLeituraAtividade(s?.checkedAt);
    return '<div class="activity-read-row"><strong>'+labels[key]+'</strong><span>'+(names[s?.state]||'Dados anteriores · atualize para registrar o horário')+'</span><small>Última consulta completa: '+(last||'horário não registrado')+(checked?' · verificação '+checked:'')+'</small></div>';
  }).join('');
}
function estadoAtividadeHealth(data){
  const notes=[];
  if(!isNativeAndroid())notes.push('A sincronização está disponível no APK Android.');
  else if(!data.generatedAt&&!data.lastAttemptAt)notes.push('Conecte o Health Connect para importar suas atividades.');
  else {
    if(!data.readSteps)notes.push('Passos: autorize a leitura no Health Connect.');
    if(!data.readExercise)notes.push('Cardios: autorize a leitura de exercícios.');
    if(!data.readActiveCalories&&!data.readCalories)notes.push('Kcal: autorize a leitura de calorias.');
    if(!data.historyGranted)notes.push('Sem acesso ao histórico antigo, a leitura nova cobre até 28 dias; dias já salvos são mantidos.');
    if(data.errors.length||Object.values(data.readStatus||{}).some(s=>['error','partial','unavailable'].includes(s.state)))notes.push('Leitura incompleta. Confira os horários e os dados identificados como salvos.');
  }
  if(_activityError)notes.push(_activityError);
  if(data.lastAttemptAt||data.generatedAt)notes.push('Última tentativa: '+horaLeituraAtividade(data.lastAttemptAt||data.generatedAt)+'.');
  return notes.join(' ');
}
function renderizarAtividades(){
  const el=document.getElementById('activityStats');if(!el)return;
  const data=getAtividadeHealth(),s=resumoAtividadeAtual();
  const last=data.daily.find(d=>d.date===hoje()),quality=TreinoActivityData.quality,
    stepsToday=quality(last?[last]:[],'steps'),stepsAverage=quality(s.daily.filter(d=>d.date<hoje()&&d.steps!=null),'steps'),
    cardio=quality([...s.daily.filter(d=>d.cardioKnown),...s.sessions],'sessions'),energy=quality(s.sessions.filter(x=>x.kcal!=null),'sessionKcal'),
    partialSessions=data.readStatus?.sessions?.state==='partial';
  document.querySelectorAll('[data-activity-days]').forEach(b=>{const on=Number(b.dataset.activityDays)===_activityDays;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  el.innerHTML=htmlEstatisticaAtividade(formatarAtividade(s.todaySteps),'passos hoje','dia em andamento',stepsToday)+
    htmlEstatisticaAtividade(formatarAtividade(s.averageSteps),'média de passos/dia',s.stepDays+' dias completos com dados',stepsAverage)+
    htmlEstatisticaAtividade(s.knownDays||s.cardioCount?String(s.cardioCount):'—','cardios no período',formatarAtividade(s.minutes,' min',1),cardio,partialSessions)+
    htmlEstatisticaAtividade(formatarAtividade(s.kcal,' kcal'),'kcal dos cardios',s.kcalCount+'/'+s.cardioCount+' sessões com kcal'+(s.totalFallback?' · inclui gasto total no intervalo':''),energy,data.readStatus?.sessionKcal?.state==='partial');
  document.getElementById('activityEnergy').innerHTML=['activeKcal','totalKcal'].map(key=>'<div><strong>'+formatarAtividade(last?.[key],' kcal')+'</strong><span>'+(key==='activeKcal'?'ativas hoje':'totais hoje')+'</span>'+htmlQualidadeAtividade(quality(last?[last]:[],key))+'</div>').join('');
  document.getElementById('activityStatus').textContent=(_activityBusy?'Atualizando Health Connect… ':'' )+estadoAtividadeHealth(data);
  document.getElementById('activitySyncButton').disabled=!!_activityBusy;
  renderizarStatusLeiturasAtividade(data);
  const filtered=s.sessions,shown=_activityAllRows?filtered:filtered.slice(0,10),list=document.getElementById('activitySessions');
  list.innerHTML=shown.length?shown.map(row=>'<article class="activity-session"><div class="activity-session-mark" aria-hidden="true">'+(row.kind==='cycling'||row.kind==='stationary'?'↻':'↗')+'</div><div class="activity-session-main"><strong>'+esc(TreinoActivityData.kinds[row.kind])+'</strong><span>'+row.date.split('-').reverse().join('/')+' · '+new Date(row.startMs).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})+' · '+formatarAtividade(row.minutes,' min',1)+'</span><small>'+esc(row.source)+(row.title?' · '+esc(row.title):'')+'</small>'+htmlQualidadeAtividade(quality([row],'sessions'))+'</div><div class="activity-session-energy"><strong>'+formatarAtividade(row.kcal)+'</strong><small>'+(row.kcal==null?'kcal não informadas':row.calorieKind==='active'?'kcal ativas':'kcal no intervalo')+'</small>'+htmlQualidadeAtividade(quality([row],'sessionKcal'))+'</div></article>').join(''):
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
  const s=resumoAtividadeAtual(),q=TreinoActivityData.quality(key==='cardioKcal'?s.sessions.filter(x=>x.kcal!=null):key==='steps'?s.daily.filter(x=>x.steps!=null):[...s.daily.filter(x=>x.cardioKnown),...s.sessions],key==='steps'?'steps':key==='cardioKcal'?'sessionKcal':'sessions');
  document.getElementById('activityChartUnit').textContent=c[2]+' por dia · lacunas = sem dados. '+textoQualidadeAtividade(q);
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
  if(mode==='steps'||mode.startsWith('cardio')){
    const s=resumoAtividadeAtual(),items=mode==='steps'?s.daily.filter(x=>x.steps!=null):mode==='cardioKcal'?s.sessions.filter(x=>x.kcal!=null):[...s.daily.filter(x=>x.cardioKnown),...s.sessions];
    note.textContent+=' '+textoQualidadeAtividade(TreinoActivityData.quality(items,mode==='steps'?'steps':mode==='cardioKcal'?'sessionKcal':'sessions'))+'.';
  }
  document.getElementById('routineChartEmpty').hidden=!!vals.length;document.getElementById('routineChartWrap').hidden=!vals.length;
  if(vals.length)_routineChart=construirGraficoRotina('routineChart',rows,series);
  document.querySelectorAll('[data-activity-days]').forEach(b=>{const on=Number(b.dataset.activityDays)===_activityDays;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
}
function renderizarAtividadeDashboard(){
  const el=document.getElementById('activityDashboard');if(!el)return;
  const data=getAtividadeHealth(),s=TreinoActivityData.summarize(data,TreinoActivityData.dates(hoje(),7),hoje());
  const today=data.daily.find(d=>d.date===hoje()),q=TreinoActivityData.quality(today?[today]:[],'steps');
  el.innerHTML='<div><span class="eyebrow">Movimento do dia</span><strong>'+formatarAtividade(s.todaySteps)+' <small>passos hoje</small></strong><span>'+(s.knownDays||s.cardioCount?s.cardioCount+' cardios nos últimos 7 dias · '+formatarAtividade(s.minutes,' min'):'Conecte o Health para acompanhar seus cardios')+'</span>'+htmlQualidadeAtividade(q)+'</div><span class="activity-dashboard-arrow" aria-hidden="true">↗</span>';
}
window.addEventListener('load',()=>{renderizarAtividadeDashboard();if(isNativeAndroid())setTimeout(()=>sincronizarAtividadesHealth(false),2200);});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderizarAtividadeDashboard();if(isNativeAndroid()){sincronizarAtividadesHealth(false);atualizarWidgetNativo();}}});
