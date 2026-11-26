'use strict';
(function(){
  const storeKey='hydrationV1219';
  const sizes=[250,500,1000,1500,2000];
  const format=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:3});
  const byId=id=>document.getElementById(id);
  const showVolume=ml=>ml<1000?ml+' mL':format.format(ml/1000)+' L';

  function read(){
    const saved=parseJSONSeguro(localStorage.getItem(storeKey)||'{}',{},storeKey)||{};
    return {
      bottleMl:sizes.includes(saved.bottleMl)?saved.bottleMl:500,
      goalMl:Number.isInteger(saved.goalMl)&&saved.goalMl>0&&saved.goalMl<=2147483647?saved.goalMl:0,
      days:saved.days&&typeof saved.days==='object'&&!Array.isArray(saved.days)?saved.days:{}
    };
  }
  function entriesFor(state,date){
    const entries=state.days[date];
    return Array.isArray(entries)?entries.filter(ml=>sizes.includes(ml)):[];
  }
  function summary(date){
    const state=read();
    const entries=entriesFor(state,date);
    return {bottleMl:state.bottleMl,goalMl:state.goalMl,entries,totalMl:entries.reduce((sum,ml)=>sum+ml,0)};
  }
  function write(state){
    try{localStorage.setItem(storeKey,JSON.stringify(state));return true;}
    catch(error){toast('Não foi possível salvar o registro de água.','error');return false;}
  }
  function render(){
    if(!byId('hydrationCard'))return;
    const {bottleMl,goalMl,entries,totalMl}=summary(_nutritionDate);
    const future=_nutritionDate>hoje();
    const total=showVolume(totalMl)+(goalMl?' de '+showVolume(goalMl):'');
    if(byId('hydrationTotal').textContent!==total)byId('hydrationTotal').textContent=total;
    const bar=byId('hydrationProgress');
    bar.hidden=!goalMl;
    bar.value=goalMl?Math.min(100,totalMl/goalMl*100):0;
    byId('hydrationNote').textContent=future?'Disponível na data selecionada':!goalMl?'Defina a meta quando quiser.':totalMl>=goalMl?'Meta atingida':'Faltam '+showVolume(goalMl-totalMl);
    byId('hydrationBottle').value=String(bottleMl);
    byId('hydrationAdd').textContent='+ '+showVolume(bottleMl);
    byId('hydrationAdd').disabled=future;
    byId('hydrationUndo').hidden=!entries.length||future;
  }
  function record(undo){
    const date=_nutritionDate;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>hoje())return;
    const state=read(),entries=entriesFor(state,date);
    if(undo){if(!entries.length)return;entries.pop();}
    else entries.push(state.bottleMl);
    if(entries.length)state.days[date]=entries;
    else delete state.days[date];
    if(write(state)){
      render();
      if(date===hoje())atualizarWidgetNativo();
    }
  }
  function showGoal(open){
    byId('hydrationGoalForm').hidden=!open;
    byId('hydrationGoalToggle').setAttribute('aria-expanded',String(open));
    if(open){
      byId('hydrationGoal').value=read().goalMl||'';
      byId('hydrationGoal').focus();
    }
  }
  document.addEventListener('DOMContentLoaded',()=>{
    byId('hydrationBottle')?.addEventListener('change',event=>{
      const ml=Number(event.currentTarget.value);
      if(!sizes.includes(ml))return;
      const state=read();
      state.bottleMl=ml;
      write(state);
      render();
    });
    byId('hydrationAdd')?.addEventListener('click',()=>record(false));
    byId('hydrationUndo')?.addEventListener('click',()=>record(true));
    byId('hydrationGoalToggle')?.addEventListener('click',()=>showGoal(byId('hydrationGoalForm').hidden));
    byId('hydrationGoalForm')?.addEventListener('submit',event=>{
      event.preventDefault();
      const input=byId('hydrationGoal');
      if(!input.validity.valid)return;
      const state=read();
      state.goalMl=Number(input.value);
      if(write(state)){
        showGoal(false);
        byId('hydrationGoalToggle').focus();
        render();
        atualizarWidgetNativo();
      }
    });
  });
  window.TreinoHydration={summary,render};
  window.abrirAguaWidget=function(){
    abrirDiaAlimentacaoWidget();
    const card=byId('hydrationCard');
    card?.focus({preventScroll:true});
    card?.scrollIntoView({block:'center'});
  };
})();
