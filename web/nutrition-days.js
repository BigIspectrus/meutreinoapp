/* v12.8.5 — conclusão manual do diário, sem inferir consumo ou alterar metas. */
const NUTRITION_DAY_STATUS_KEY='nutritionDayStatusV1285';
function dataValidaEstadoNutricao(date){
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const [y,m,d]=date.split('-').map(Number);if(y<1000)return false;
  return new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)===date;
}
function assinaturaDiaNutricao(entries){
  const compare=(a,b)=>a<b?-1:a>b?1:0;
  const rows=(entries||[]).map(e=>({id:String(e.id||''),date:String(e.date||''),time:String(e.time||''),mealType:String(e.mealType||''),
    foodId:String(e.foodId||''),name:String(e.name||''),grams:numeroNutricao(e.grams),kcal:numeroNutricao(e.kcal),protein:numeroNutricao(e.protein),
    carbs:numeroNutricao(e.carbs),fat:numeroNutricao(e.fat),fiber:numeroNutricao(e.fiber),sodium:numeroNutricao(e.sodium),
    micros:Object.fromEntries(Object.entries(e.micros||{}).filter(([,v])=>numeroNutricao(v)>0).sort(([a],[b])=>compare(a,b)).map(([k,v])=>[k,numeroNutricao(v)]))}));
  // Conteúdo canônico, sem timestamps legados inferidos pelo getter. Duas somas
  // independentes + tamanho evitam duplicar o diário inteiro no armazenamento.
  const content=JSON.stringify(rows.sort((a,b)=>compare(a.id,b.id)||compare(JSON.stringify(a),JSON.stringify(b))));
  let a=2166136261,b=5381;
  for(let i=0;i<content.length;i++){const c=content.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b,33)^c;}
  return rows.length+':'+content.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);
}
function getEstadoDiasNutricao(){
  const raw=parseJSONSeguro(localStorage.getItem(NUTRITION_DAY_STATUS_KEY)||'{}',{},NUTRITION_DAY_STATUS_KEY);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return {};
  return Object.fromEntries(Object.entries(raw).filter(([date,v])=>dataValidaEstadoNutricao(date)&&v&&typeof v==='object').map(([date,v])=>[date,{
    completed:v.completed===true&&Number.isFinite(Number(v.completedAt))&&Number(v.completedAt)>0&&typeof v.signature==='string',
    signature:typeof v.signature==='string'?v.signature:'',completedAt:Number(v.completedAt)||0,updatedAt:Number(v.updatedAt)||0,needsReview:v.needsReview===true
  }]));
}
function estadoDiaNutricao(date,entries=getRegistrosNutricao(),marks=getEstadoDiasNutricao()){
  const rows=entries.filter(e=>e.date===date),mark=marks[date];
  if(!rows.length)return {state:'empty',count:0,changed:false};
  const completed=date<=hoje()&&mark?.completed&&mark.signature===assinaturaDiaNutricao(rows);
  return {state:completed?'complete':'partial',count:rows.length,changed:!completed&&(!!mark?.completed||!!mark?.needsReview)};
}
function resumirDiasNutricao(dates,entries=getRegistrosNutricao()){
  const byDate=new Map();entries.forEach(e=>{if(!byDate.has(e.date))byDate.set(e.date,[]);byDate.get(e.date).push(e);});
  const marks=getEstadoDiasNutricao(),rows=dates.map(date=>{const items=byDate.get(date)||[];return {date,...totaisNutricao(items),...estadoDiaNutricao(date,items,marks)};}),
    completeDays=rows.filter(d=>d.state==='complete'),partialDays=rows.filter(d=>d.state==='partial'),emptyDays=rows.filter(d=>d.state==='empty');
  return {rows,completeDays,partialDays,emptyDays,tot:totaisNutricao(completeDays),partialTot:totaisNutricao(partialDays)};
}
function datasMesEstadoNutricao(month){
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||Number(month.slice(0,4))<1000)return [];
  const [y,m]=month.split('-').map(Number),count=new Date(Date.UTC(y,m,0)).getUTCDate();
  return Array.from({length:count},(_,i)=>month+'-'+String(i+1).padStart(2,'0')).filter(date=>date<=hoje());
}
function invalidarDiasAlteradosNutricao(entries){
  const byDate=new Map();entries.forEach(e=>{if(!byDate.has(e.date))byDate.set(e.date,[]);byDate.get(e.date).push(e);});
  const marks=getEstadoDiasNutricao();let changed=false;
  for(const [date,mark] of Object.entries(marks))if(mark.completed&&mark.signature!==assinaturaDiaNutricao(byDate.get(date)||[])){
    marks[date]={completed:false,updatedAt:Date.now(),needsReview:true};changed=true;
  }
  if(changed)localStorage.setItem(NUTRITION_DAY_STATUS_KEY,JSON.stringify(marks));
}
function restaurarEstadoDiasBackupNutricao(backup){
  if(backup[NUTRITION_DAY_STATUS_KEY]!=null)localStorage.setItem(NUTRITION_DAY_STATUS_KEY,String(backup[NUTRITION_DAY_STATUS_KEY]));
  else if(backup.nutritionEntriesV125!=null)localStorage.setItem(NUTRITION_DAY_STATUS_KEY,'{}');
}
function atualizarRelatoriosEstadoDiaNutricao(message){
  renderizarNutricao();atualizarStorageStatus();
  if(typeof renderizarEvolucaoRotina==='function')renderizarEvolucaoRotina();
  if(document.getElementById('modalNutritionMonthly')?.classList.contains('open'))renderizarRelatorioMensalNutricao();
  toast(message,'success');
}
function concluirDiaNutricao(date=_nutritionDate){
  if(!dataValidaEstadoNutricao(date)||date>hoje())return toast('Só é possível concluir hoje ou uma data anterior.','warn');
  if(!getRegistrosNutricao().some(e=>e.date===date))return toast('Registre os alimentos antes de concluir o dia. Sem registro não significa consumo zero.','warn');
  if(window.TreinoMealBuilder?.items().length)return toast('Salve ou descarte a refeição em montagem antes de concluir o dia.','warn');
  confirmarAcao('Concluir alimentação de '+date.split('-').reverse().join('/'),
    'Você registrou tudo o que consumiu nessa data? Concluir confirma o registro completo, não que as metas foram atingidas. Alterar os alimentos depois reabre o dia como parcial.',()=>{
      const entries=getRegistrosNutricao().filter(e=>e.date===date);if(!entries.length)return toast('Não há alimentos para concluir nesta data.','warn');
      const now=Date.now(),marks=getEstadoDiasNutricao();marks[date]={completed:true,signature:assinaturaDiaNutricao(entries),completedAt:now,updatedAt:now};
      try{localStorage.setItem(NUTRITION_DAY_STATUS_KEY,JSON.stringify(marks));}catch(error){console.warn('Conclusão do dia não salva',error);return toast('Não foi possível salvar a conclusão. Seus alimentos foram mantidos.','error');}
      atualizarRelatoriosEstadoDiaNutricao('Dia alimentar concluído');
    });
}
function reabrirDiaNutricao(date=_nutritionDate){
  if(!dataValidaEstadoNutricao(date))return;
  const marks=getEstadoDiasNutricao();marks[date]={completed:false,updatedAt:Date.now()};
  try{localStorage.setItem(NUTRITION_DAY_STATUS_KEY,JSON.stringify(marks));}catch(error){console.warn('Reabertura do dia não salva',error);return toast('Não foi possível reabrir o dia. Tente novamente.','error');}
  atualizarRelatoriosEstadoDiaNutricao('Dia reaberto como parcial');
}
function renderizarEstadoDiaNutricao(entries){
  const el=document.getElementById('nutritionDayStatus');if(!el)return;
  const s=estadoDiaNutricao(_nutritionDate,entries),complete=s.state==='complete',future=_nutritionDate>hoje(),
    title=complete?'Dia alimentar completo':s.state==='empty'?'Dia sem registros':'Registro parcial · não confirmado',
    note=complete?'Você confirmou que registrou tudo. Alterar alimentos reabre o dia.':future?'Datas futuras não entram nas médias alimentares.':s.state==='empty'?'Sem registro não significa consumo zero.':s.changed?'O registro mudou. Confira os alimentos e conclua novamente.':'Conclua quando tiver registrado tudo o que consumiu.';
  el.innerHTML='<section class="nutrition-day-status'+(complete?' complete':'')+'"><div><strong>'+title+'</strong><span>'+note+'</span></div><button type="button" class="btn btn-outline btn-sm" onclick="'+(complete?'reabrirDiaNutricao()':'concluirDiaNutricao()')+'"'+(!complete&&(future||s.state==='empty')?' disabled':'')+'>'+(complete?'Reabrir dia':'Concluir dia')+'</button></section>';
}
function htmlDiasEstadoNutricao(rows){
  return '<details class="nutrition-days-details"><summary>Ver dias e situação dos registros</summary><div class="nutrition-days-list">'+rows.map(d=>
    '<div class="nutrition-day-row"><span>'+esc(d.date.slice(8)+'/'+d.date.slice(5,7))+'</span><span class="nutrition-status-badge '+d.state+'">'+(d.state==='complete'?'Completo':d.state==='partial'?'Parcial / não confirmado':'Sem registros')+'</span><strong>'+(d.state==='empty'?'—':formatarNutricao(d.kcal)+' kcal')+'</strong></div>'
  ).join('')+'</div></details>';
}
