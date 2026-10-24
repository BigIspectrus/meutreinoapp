/* v12.13.0 — quantidades na busca e lista compacta na montagem, sem registrar consumo ao digitar. */
(() => {
  'use strict';
  const builder=()=>window.TreinoMealBuilder;
  const active=()=>builder()?.active()&&!modoTextoRefeicao();
  const quick=()=>active()&&builder().data().quickEntry!==false;
  let resultFoods=new Map();
  function units(food){return unidadesTextoRefeicao(food);}
  function options(food,selected){return units(food).map(u=>'<option value="'+esc(u.value)+'"'+(u.value===selected?' selected':'')+'>'+esc(u.label)+'</option>').join('');}
  function valueAmount(row){return row&&Number.isFinite(row.amount)&&row.amount>0?String(row.amount):'';}
  function amountMarkup(food,row,kind,id){const unit=row?.unit||(units(food).some(u=>u.value==='ml')?'ml':'grams');return '<div class="flow-food-quantity" data-flow-kind="'+kind+'" data-flow-id="'+esc(id)+'"><label><span class="sr-only">Quantidade de '+esc(food.name)+'</span><input type="number" min="0.001" step="any" inputmode="decimal" enterkeyhint="next" autocomplete="off" placeholder="Qtd." value="'+valueAmount(row)+'" data-flow-amount></label><label><span class="sr-only">Unidade de '+esc(food.name)+'</span><select data-flow-unit>'+options(food,unit)+'</select></label></div>';}
  function ensureToggle(){const search=document.getElementById('nutritionMealSearch');if(!search)return;let toggle=document.getElementById('flowQuickFoodMode');if(!toggle){toggle=document.createElement('label');toggle.id='flowQuickFoodMode';toggle.className='flow-quick-toggle';toggle.innerHTML='<input type="checkbox"> Quantidades direto na lista';toggle.querySelector('input').addEventListener('change',event=>{if(!active())return;builder().data().quickEntry=event.target.checked;if(event.target.checked){builder().data().selected=null;limparSelecaoMontagemNutricao();}builder().persist();renderizarBuscaAlimentosNutricao();renderizarMontagemRefeicaoNutricao();});search.prepend(toggle);}toggle.hidden=!active();toggle.querySelector('input').checked=quick();}
  const originalSearch=renderizarBuscaAlimentosNutricao;
  renderizarBuscaAlimentosNutricao=function(){
    ensureToggle();if(!quick())return originalSearch.apply(this,arguments);
    const host=document.getElementById('nutritionFoodResults');if(!host)return;
    const query=document.getElementById('nutritionFoodSearch')?.value||'',all=alimentosFiltradosNutricao(query,query?'all':_nutritionFoodScope),foods=all.slice(0,40);resultFoods=new Map(foods.map(f=>[f.id,f]));
    const note=document.getElementById('nutritionFoodResultsNote');if(note)note.textContent=(all.length>40?'Mostrando 40 de '+all.length+' · refine a busca. ':'')+'Digite as quantidades; o consumo só será registrado ao confirmar a refeição.';
    host.innerHTML=foods.length?foods.map(food=>{
      const existing=builder().items().filter(row=>row.food.id===food.id),row=existing[0],snapshot=row?.food||food;
      return '<div class="flow-food-result" data-food-id="'+esc(food.id)+'"><button type="button" class="flow-food-name" data-flow-details="'+esc(food.id)+'"><strong>'+esc(food.name)+'</strong><small>'+esc(food.brand||fonteAlimentoNutricao(food.source))+' · '+formatarNutricao(food.kcal100)+' kcal/100 g</small></button>'+(existing.length>1?'<small class="flow-food-multiple">'+existing.length+' porções na montagem · ajuste na lista acima</small>':amountMarkup(snapshot,row,'result',food.id))+'<span class="flow-food-added" aria-live="polite">'+(existing.length?'Na montagem':'')+'</span></div>';
    }).join(''):'<p class="nutrition-note">Nenhum alimento encontrado. Ajuste a busca ou consulte o catálogo.</p>';
    renderizarAtalhosRefeicao();
  };
  function updateAmount(box){
    if(!builder()?.active()||builder().data().saving)return;
    const input=box.querySelector('[data-flow-amount]'),select=box.querySelector('[data-flow-unit]'),kind=box.dataset.flowKind,id=box.dataset.flowId;
    let row=kind==='draft'?builder().items().find(r=>r.key===id):builder().findFood(id);
    const food=row?.food||resultFoods.get(id);if(!food)return;
    const unit=units(food).find(u=>u.value===select.value);if(!unit)return;
    const amount=!input.validity.badInput&&Number.isFinite(Number(input.value))&&Number(input.value)>0?Number(input.value):0,grams=amount*unit.factor;
    if(!row){if(!input.value&&!input.validity.badInput)return;row=builder().add(food,amount,select.value,grams);builder().data().selected=null;limparSelecaoMontagemNutricao();}
    builder().setQuantity(row.key,amount,select.value,grams);
    builder().data().selected=null;limparSelecaoMontagemNutricao();builder().persist();
    renderizarMontagemRefeicaoNutricao();renderizarRascunhoRefeicaoPendente();
    const result=[...document.querySelectorAll('.flow-food-result')].find(el=>el.dataset.foodId===food.id),other=result?.querySelector('.flow-food-quantity');
    if(other&&other!==box){const otherInput=other.querySelector('input');if(document.activeElement!==otherInput)otherInput.value=valueAmount(row);other.querySelector('select').innerHTML=options(row.food,row.unit);}
    const added=result?.querySelector('.flow-food-added');if(added)added.textContent='Na montagem';
  }
  function updateCompact(){
    const host=document.getElementById('nutritionMealDraft'),draft=builder().data();if(!host||!draft)return;
    const rows=builder().items();host.hidden=!rows.length;
    if(!host.querySelector('.flow-meal-list'))host.innerHTML='<div class="meal-draft-total"></div><p class="flow-meal-heading">Sua refeição · ajuste as quantidades abaixo</p><div class="flow-meal-list"></div>';
    const total=totaisNutricao(rows.map(row=>calcularPorGramasNutricao(row.food,Number.isFinite(row.grams)&&row.grams>0?row.grams:0)));
    host.querySelector('.meal-draft-total').innerHTML='<strong>'+formatarNutricao(total.kcal)+' kcal</strong><span>P '+formatarNutricao(total.protein,1)+' g · C '+formatarNutricao(total.carbs,1)+' g · G '+formatarNutricao(total.fat,1)+' g</span>';
    const list=host.querySelector('.flow-meal-list'),existing=new Map([...list.children].map(el=>[el.dataset.mealKey,el]));
    for(const row of rows){let el=existing.get(row.key);if(!el){el=document.createElement('div');el.className='flow-meal-row';el.dataset.mealKey=row.key;el.innerHTML='<button type="button" class="flow-food-name" data-flow-edit="'+esc(row.key)+'"><strong></strong><small></small></button>'+amountMarkup(row.food,row,'draft',row.key)+'<button type="button" class="meal-draft-remove" data-flow-remove="'+esc(row.key)+'" aria-label="Remover '+esc(row.food.name)+'">×</button><small class="flow-meal-error"></small>';list.appendChild(el);}
      existing.delete(row.key);el.querySelector('.flow-food-name strong').textContent=row.food.name;
      const ok=Number.isFinite(row.grams)&&row.grams>0,values=calcularPorGramasNutricao(row.food,ok?row.grams:0);
      el.querySelector('.flow-food-name small').textContent=(ok?formatarNutricao(values.kcal)+' kcal · P '+formatarNutricao(values.protein,1)+' · C '+formatarNutricao(values.carbs,1)+' · G '+formatarNutricao(values.fat,1)+' g':'Quantidade pendente')+' · detalhes ›';
      const input=el.querySelector('[data-flow-amount]'),select=el.querySelector('[data-flow-unit]');if(document.activeElement!==input)input.value=valueAmount(row);
      if(document.activeElement!==select)select.innerHTML=options(row.food,row.unit);
      el.querySelector('.flow-meal-error').textContent=ok?'':'Informe uma quantidade maior que zero ou remova este alimento.';el.classList.toggle('invalid',!ok);
    }
    for(const el of existing.values())el.remove();
    const save=document.getElementById('nutritionAddSave');if(!modoTextoRefeicao()){save.disabled=!builder().valid()||draft.saving;save.textContent=(draft.mode==='planned'?'Guardar planejamento':'Registrar refeição')+(rows.length?' ('+rows.length+')':'');}
  }
  const originalRender=renderizarMontagemRefeicaoNutricao;
  renderizarMontagemRefeicaoNutricao=function(){
    // Conservar os mesmos inputs enquanto se digita na lista compacta.
    const result=originalRender.apply(this,arguments);ensureToggle();return result;
  };
  const originalSelect=selecionarAlimentoNutricao;
  selecionarAlimentoNutricao=function(){if(active())builder().data().quickEntry=false;return originalSelect.apply(this,arguments);};
  document.addEventListener('input',event=>{if(event.target.matches('[data-flow-amount]'))updateAmount(event.target.closest('.flow-food-quantity'));});
  document.addEventListener('change',event=>{if(event.target.matches('[data-flow-unit]'))updateAmount(event.target.closest('.flow-food-quantity'));});
  document.addEventListener('click',event=>{
    const details=event.target.closest('[data-flow-details]'),edit=event.target.closest('[data-flow-edit]'),remove=event.target.closest('[data-flow-remove]');
    if(details)selecionarAlimentoNutricao(details.dataset.flowDetails);
    if(edit){if(builder()?.active()){builder().data().quickEntry=false;if(modoTextoRefeicao())mudarModoEntradaRefeicao(false);}selecionarItemMontagemNutricao(edit.dataset.flowEdit);}
    if(remove){removerItemMontagemNutricao(remove.dataset.flowRemove);renderizarBuscaAlimentosNutricao();}
  });
  document.addEventListener('keydown',event=>{if(event.key!=='Enter'||!event.target.matches('[data-flow-amount]'))return;event.preventDefault();const box=event.target.closest('[data-flow-kind]'),inputs=[...document.querySelectorAll('[data-flow-kind="'+box.dataset.flowKind+'"] [data-flow-amount]')].filter(input=>input.getClientRects().length),index=inputs.indexOf(event.target);if(inputs[index+1]){inputs[index+1].focus();inputs[index+1].select();}else event.target.blur();});
  window.TreinoQuickNutrition={renderDraft:updateCompact};
})();
