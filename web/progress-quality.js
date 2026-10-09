/* v12.10.0 — comparação observacional, não diagnóstico de estagnação. */
function esforcoComparavelProgressao(rows,field){return rows.every(r=>{const n=numeroOpcionalAnalise(r[field]);return n!=null&&n>=(field==='rir'?0:1)&&n<=10;});}
function compararDesempenhoProgressao(base,next,selectedEffort=null){
  if(base.length!==next.length||!base.length)return {comparable:false,reason:'Quantidade de séries diferente'};
  if(base.some((r,i)=>Number(r.numSerie)!==Number(next[i].numSerie)))return {comparable:false,reason:'Organização de séries diferente'};
  const both=base.concat(next),effort=selectedEffort?(esforcoComparavelProgressao(both,selectedEffort)?selectedEffort:null):esforcoComparavelProgressao(both,'rir')?'rir':esforcoComparavelProgressao(both,'rpe')?'rpe':null;
  if(!effort)return {comparable:false,reason:'RIR/RPE ausente ou sem base comum'};
  let same=true,better=false,notWorse=true;
  for(let i=0;i<base.length;i++){
    const a=base[i],b=next[i],load=Number(b.carga)-Number(a.carga),reps=Number(b.reps)-Number(a.reps),delta=(numeroOpcionalAnalise(b[effort])-numeroOpcionalAnalise(a[effort]))*(effort==='rir'?1:-1);
    if(Math.abs(load)>.001||reps!==0||delta!==0)same=false;
    if(load<-.001||reps<0||delta<0)notWorse=false;
    if(load>.001||reps>0||delta>0)better=true;
  }
  return {comparable:true,same,improved:notWorse&&better,effort,reason:same?'Mesmas cargas, reps e esforço informado':notWorse&&better?'Mais carga/reps ou esforço informado menor, sem piora nos demais campos':'Cargas, repetições ou esforço mudaram em direções diferentes'};
}
let _progressSource=null,_progressProfiles=null,_progressReports=null;
function analisarEvolucaoContextual(hist=getHist()){
  const profiles=localStorage.getItem(window.TreinoWorkflowStore.keys.profiles)||'';
  if(hist===_progressSource&&profiles===_progressProfiles&&_progressReports)return _progressReports;
  const byExercise=new Map();
  for(const r of hist){if(!setContaParaPR(r)||!cargaComparavelAtual(r)||!window.TreinoWorkflowStore.validDate(r.data)||!Number.isFinite(Number(r.carga))||!Number.isFinite(Number(r.reps))||!(Number(r.carga)>0)||!(Number(r.reps)>0))continue;if(!byExercise.has(r.exercicio))byExercise.set(r.exercicio,[]);byExercise.get(r.exercicio).push(r);}
  const reports=[];
  for(const [ex,records] of byExercise){
    const groups=Object.values(agruparSessoes(records)).sort((a,b)=>getSessionTimestamp(a)-getSessionTimestamp(b)),latest=groups.at(-1)||[],priority=['workset','topset','backoff','amrap'],kind=priority.find(k=>latest.some(r=>normalizarSetType(r.setType)===k));
    const sessions=groups.map(rows=>rows.filter(r=>normalizarSetType(r.setType)===kind).slice().sort((a,b)=>Number(a.numSerie)-Number(b.numSerie))).filter(rows=>rows.length).slice(-4),count=sessions.length;
    const report={ex,kind,count,status:'insufficient',reason:'Registre ao menos duas sessões comparáveis.',mode:tipoCargaExercicio(ex)};
    if(count>=2){const comparison=compararDesempenhoProgressao(sessions[count-2],sessions[count-1]);report.reason=comparison.reason;report.effort=comparison.effort;report.status=!comparison.comparable?'incomplete':comparison.improved?'improved':'changed';
      if(count===4){const all=sessions.flat(),commonEffort=esforcoComparavelProgressao(all,'rir')?'rir':esforcoComparavelProgressao(all,'rpe')?'rpe':null,base=sessions[0],comparisons=commonEffort?sessions.slice(1).map(s=>compararDesempenhoProgressao(base,s,commonEffort)):[];if(comparisons.length===3&&comparisons.every(c=>c.comparable&&c.same)){report.status='stable';report.reason='Quatro sessões com o mesmo número de séries, cargas, reps e '+(commonEffort==='rir'?'RIR':'RPE')+' informados.';}}
      if(report.status==='changed'&&comparison.same)report.reason='Últimas duas sessões semelhantes. Isso não confirma estagnação.';
    }
    reports.push(report);
  }
  _progressSource=hist;_progressProfiles=profiles;_progressReports=reports;return reports;
}
function renderizarEvolucaoContextual(){
  const host=document.getElementById('progressQualityContent');if(!host)return;const reports=analisarEvolucaoContextual(),labels={improved:'Mudança favorável nos registros',stable:'Registros estáveis',changed:'Condições diferentes / sem conclusão',incomplete:'Esforço incompleto',insufficient:'Poucas sessões'};
  host.innerHTML='<p class="nutrition-note">Compara séries concluídas do mesmo exercício, tipo de série e padrão de carga. Aquecimento e assistência não entram. RIR/RPE ausente não vira zero. Não é um diagnóstico nem uma recomendação de alterar o treino.</p>'+(reports.length?reports.slice().sort((a,b)=>Number(b.status==='stable')-Number(a.status==='stable')||a.ex.localeCompare(b.ex,'pt-BR')).map(r=>'<article class="progress-quality-row"><strong>'+esc(r.ex)+'</strong><span>'+labels[r.status]+'</span><small>'+esc(setTypeLabel(r.kind))+' · '+esc(EXERCISE_LOAD_MODES[r.mode].label)+' · '+r.count+' sessão(ões) recentes</small><p>'+esc(r.reason)+'</p></article>').join(''):'<p class="nutrition-note">Ainda não há séries de trabalho com carga/repetições válidas para comparar neste padrão.</p>');
}
renderizarPlateauWarnings=function(hist=null){
  const card=document.getElementById('plateauCard'),list=document.getElementById('plateauList');if(!card||!list)return;const stable=analisarEvolucaoContextual(hist||getHist()).filter(r=>r.status==='stable');card.style.display=stable.length?'block':'none';
  list.innerHTML=stable.map(r=>'<div class="pr-item"><div><div class="pr-ex">'+esc(r.ex)+'</div><p class="nutrition-note">'+esc(r.reason)+' Estabilidade dos registros não comprova plateau; técnica, aparelho e contexto também podem variar.</p></div></div>').join('');
};
const _progressTabBeforeQuality=ativarSubTab;
ativarSubTab=function(id){const result=_progressTabBeforeQuality.apply(this,arguments);if(id==='evolucao')renderizarEvolucaoContextual();return result;};
document.addEventListener('DOMContentLoaded',renderizarEvolucaoContextual);
