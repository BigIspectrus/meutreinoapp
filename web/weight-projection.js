/* Projeção descritiva: medianas semanais e mediana das inclinações, sem metas alimentares. */
window.TreinoWeightProjection=(()=>{
  'use strict';
  const dayMs=86400000,windows=[30,60,90,180],preferencesKey='weightProjectionPreferencesV12132';
  const day=date=>Date.parse(date+'T00:00:00Z')/dayMs;
  const dateAt=value=>new Date(value*dayMs).toISOString().slice(0,10);
  const displayDate=date=>date.split('-').reverse().join('/');
  const median=values=>{const sorted=values.slice().sort((a,b)=>a-b),i=Math.floor(sorted.length/2);return sorted.length%2?sorted[i]:(sorted[i-1]+sorted[i])/2;};
  const format=(value,digits=1)=>Number(value).toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
  let chart=null,state={days:60,target:''};
  try{const saved=JSON.parse(localStorage.getItem(preferencesKey)||'null');if(saved){if(windows.includes(saved.days))state.days=saved.days;if(TreinoMovementData.validDate(saved.target))state.target=saved.target;}}catch(_){}
  function model(weights,today,days=60){
    const valid=Object.entries(weights||{}).filter(([date,row])=>TreinoMovementData.validDate(date)&&date<=today&&TreinoMovementData.positive(row?.kg)!=null).sort(([a],[b])=>a.localeCompare(b));
    if(!valid.length)return {ready:false,reason:'Registre seu peso para começar a acompanhar a projeção.',rows:[]};
    const latest=valid.at(-1)[0],end=day(latest),cutoff=end-(windows.includes(days)?days:60)+1;
    const rows=valid.filter(([date])=>day(date)>=cutoff).map(([date,row])=>({date,x:day(date)-end,kg:Number(row.kg)})),span=-rows[0].x;
    // Semanas de segunda a domingo. Datas vazias não são preenchidas; frequência de pesagem não dá mais peso a uma semana.
    const groups=new Map();for(const row of rows){const absolute=day(row.date),key=Math.floor((absolute+3)/7);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
    const weeks=[...groups.values()].map(group=>({x:median(group.map(row=>row.x)),kg:median(group.map(row=>row.kg))}));
    const base={rows,weeks,latest,start:rows[0].date,span,age:day(today)-end,count:rows.length};
    if(rows.length<4||span<14||weeks.length<3)return {...base,ready:false,reason:'Para estimar, registre pelo menos 4 pesagens em dias diferentes, distribuídas por 14 dias e 3 semanas. Amplie o período se já houver registros mais antigos.'};
    const slopes=[];for(let i=0;i<weeks.length;i++)for(let j=i+1;j<weeks.length;j++){const distance=weeks[j].x-weeks[i].x;if(distance>0)slopes.push((weeks[j].kg-weeks[i].kg)/distance);}
    const slope=median(slopes),baseline=median(weeks.map(row=>row.kg-slope*row.x)),noise=median(rows.map(row=>Math.abs(row.kg-(baseline+slope*row.x))));
    if(!Number.isFinite(slope)||!Number.isFinite(baseline))return {...base,ready:false,reason:'Não foi possível calcular uma tendência com estes registros.'};
    return {...base,ready:true,slope,baseline,noise,weekly:slope*7};
  }
  function estimate(fit,target,today){
    if(!TreinoMovementData.validDate(target)||day(target)<day(today)||day(target)>day(today)+365)return {ready:false,reason:'Escolha uma data entre hoje e os próximos 365 dias.'};
    if(!fit.ready)return {ready:false,reason:fit.reason};
    const horizon=day(target)-day(fit.latest),kg=fit.baseline+fit.slope*horizon;
    if(!Number.isFinite(kg)||kg<=0||kg>1000)return {ready:false,reason:'Este ritmo não permite uma projeção útil até essa data. Escolha uma data mais próxima ou amplie o histórico.'};
    return {ready:true,kg,horizon,delta:kg-fit.baseline};
  }
  function destroyChart(){if(chart){chart.destroy();chart=null;}}
  function draw(fit,result,target){
    destroyChart();const canvas=document.getElementById('weightProjectionChart');if(!canvas||typeof Chart==='undefined'||!result.ready)return;
    const start=day(fit.start),end=day(fit.latest),destination=day(target),muted=getComputedStyle(document.body).getPropertyValue('--text-muted').trim(),grid=getComputedStyle(document.body).getPropertyValue('--border').trim();
    const point=(x,y)=>({x,y});
    chart=new Chart(canvas,{type:'line',data:{datasets:[
      {label:'Pesagens (kg)',data:fit.rows.map(row=>point(day(row.date),row.kg)),showLine:false,pointRadius:3,borderColor:'#f1bc6b',backgroundColor:'#f1bc6b'},
      {label:'Tendência calculada',data:[point(start,fit.baseline+fit.slope*(start-end)),point(end,fit.baseline)],pointRadius:0,borderColor:'#75aaff',borderWidth:2},
      {label:'Se mantiver o ritmo',data:[point(end,fit.baseline),point(destination,result.kg)],borderDash:[6,4],pointRadius:[0,5],borderColor:'#65d8b0',backgroundColor:'#65d8b0',borderWidth:2}
    ]},options:{responsive:true,maintainAspectRatio:false,animation:false,parsing:false,plugins:{legend:{labels:{color:muted,boxWidth:12,font:{size:10}}},tooltip:{callbacks:{title:items=>items.length?displayDate(dateAt(items[0].parsed.x)):'',label:item=>item.dataset.label+': '+format(item.parsed.y)+' kg'}}},scales:{x:{type:'linear',min:start,max:destination,grid:{display:false},ticks:{color:muted,maxTicksLimit:5,maxRotation:0,callback:value=>{const date=dateAt(value);return date.slice(8)+'/'+date.slice(5,7);}}},y:{beginAtZero:false,grid:{color:grid},ticks:{color:muted,maxTicksLimit:5,callback:value=>format(value)+' kg'}}}}});
    canvas.setAttribute('aria-label','Pesagens de '+displayDate(fit.start)+' até '+displayDate(fit.latest)+', com projeção de '+format(result.kg)+' kg em '+displayDate(target)+'.');
  }
  function render(){
    const section=document.getElementById('weightProjection');if(!section)return;
    const today=hoje(),targetInput=document.getElementById('weightProjectionDate'),daysInput=document.getElementById('weightProjectionDays');
    state.target=targetInput.value;state.days=Number(daysInput.value);try{localStorage.setItem(preferencesKey,JSON.stringify(state));}catch(_){}
    const fit=model(getPesosParaTendencia(),today,state.days),result=estimate(fit,state.target,today),output=document.getElementById('weightProjectionResult'),wrap=document.getElementById('weightProjectionChartWrap');
    destroyChart();wrap.hidden=!result.ready;
    if(!result.ready){output.innerHTML='<p class="activity-note">'+esc(result.reason)+'</p>'+(fit.rows.length?'<p class="activity-note">Base disponível: '+fit.rows.length+' pesagens · '+fit.weeks.length+' semanas · '+fit.span+' dias entre a primeira e a última.</p>':'');return;}
    const direction=Math.abs(fit.weekly)<.01?'Peso praticamente estável':fit.weekly<0?'Tendência de perda':'Tendência de ganho',signed=value=>(value>0?'+':value<0?'−':'')+format(Math.abs(value),2);
    const warnings=[];if(fit.count<8||fit.weeks.length<4)warnings.push('Base curta: a projeção pode mudar bastante com novas pesagens.');if(fit.age>14)warnings.push('Última pesagem há '+fit.age+' dias; registre um peso recente para atualizar o ritmo.');if(result.horizon>fit.span)warnings.push('A data está além do tempo observado no histórico. Quanto mais distante, mais incerta a estimativa.');
    output.innerHTML='<div class="weight-projection-main"><span>Peso estimado em '+displayDate(state.target)+'</span><strong>≈ '+format(result.kg)+' <small>kg</small></strong><span>Se mantiver o ritmo observado</span></div><div class="weight-projection-stats"><div><span>'+direction+'</span><strong>'+signed(fit.weekly)+' kg/semana</strong></div><div><span>Variação da tendência até a data</span><strong>'+signed(result.delta)+' kg</strong></div></div><p class="activity-note">Base: '+fit.count+' pesagens em '+fit.weeks.length+' semanas · '+displayDate(fit.start)+' a '+displayDate(fit.latest)+'. Última medida: '+format(fit.rows.at(-1).kg)+' kg. Tendência calculada nessa data: '+format(fit.baseline)+' kg.</p>'+(warnings.length?'<p class="weight-projection-warning">'+warnings.map(esc).join(' ')+'</p>':'')+'<p class="activity-note">É uma extrapolação do histórico, não uma garantia de resultado. Novos registros podem indicar mudança de ritmo.</p>';
    draw(fit,result,state.target);
  }
  function shortcut(days){const input=document.getElementById('weightProjectionDate');if(input){input.value=dateAt(day(hoje())+days);render();}}
  function mount(parent){
    const today=hoje(),max=dateAt(day(today)+365);if(!TreinoMovementData.validDate(state.target)||state.target<today||state.target>max)state.target=dateAt(day(today)+30);
    const section=document.createElement('section');section.id='weightProjection';section.className='weight-projection';
    section.innerHTML='<h3>Seu peso em uma data</h3><p class="activity-note">Estimativa baseada no seu histórico, para perda, ganho ou manutenção.</p><div class="weight-projection-fields"><label for="weightProjectionDate">Quero estimar para<input id="weightProjectionDate" type="date" min="'+today+'" max="'+max+'" value="'+state.target+'" onchange="TreinoWeightProjection.render()"></label><label for="weightProjectionDays">Histórico usado<select id="weightProjectionDays" onchange="TreinoWeightProjection.render()">'+windows.map(days=>'<option value="'+days+'"'+(days===state.days?' selected':'')+'>Últimos '+days+' dias</option>').join('')+'</select></label></div><div class="weight-projection-shortcuts">'+[30,60,90].map(days=>'<button type="button" class="btn btn-ghost btn-sm" onclick="TreinoWeightProjection.shortcut('+days+')">Daqui a '+days+' dias</button>').join('')+'</div><div id="weightProjectionResult" aria-live="polite"></div><div id="weightProjectionChartWrap" class="weight-projection-chart" hidden><canvas id="weightProjectionChart" role="img"></canvas></div><details class="activity-disclosure"><summary>Como a estimativa é calculada</summary><p>O período termina na última pesagem disponível, usando um peso por dia. O app calcula a mediana de cada semana e a mediana das inclinações entre essas semanas, reduzindo a influência de uma medida isolada. A linha parte da tendência calculada, que pode diferir da última pesagem. Não preenche dias sem peso nem usa calorias ou metas para forçar o resultado. Registros locais têm prioridade sobre o Health Connect no mesmo dia. Para comparar ritmos recentes e mais longos, altere o histórico usado.</p></details>';
    parent.appendChild(section);render();
  }
  return {model,estimate,mount,render,shortcut,destroyChart};
})();
