/* v12.8.9 — guardar a quantidade escolhida, sem alterar macros históricos. */
function normalizarPorcaoRegistradaNutricao(raw,grams){
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||!['grams','ml','measure'].includes(raw.unit))return null;
  const amount=Number(raw.amount),gramsPerUnit=Number(raw.gramsPerUnit);
  if(!Number.isFinite(amount)||amount<=0||!Number.isFinite(gramsPerUnit)||gramsPerUnit<=0||Math.abs(amount*gramsPerUnit-grams)>Math.max(.05,grams*.0001))return null;
  const name=String(raw.name||'').slice(0,80);if(raw.unit==='measure'&&!name)return null;
  return {unit:raw.unit,amount,gramsPerUnit,name:raw.unit==='grams'?'g':raw.unit==='ml'?'mL':name};
}
function capturarPorcaoNutricao(food,amount,unit,grams){
  let serving={unit:'grams',amount:Number(amount),gramsPerUnit:1,name:'g'};
  if(unit==='ml')serving={unit:'ml',amount:Number(amount),gramsPerUnit:Number(food.liquidGramsPerMlSnapshot||referenciaComumNutricao(food)?.liquidGramsPerMl),name:'mL'};
  else if(String(unit).startsWith('measure:')){const measure=(food.measures||[])[Number(unit.split(':')[1])];serving={unit:'measure',amount:Number(amount),gramsPerUnit:Number(measure?.grams),name:String(measure?.name||'')};}
  return normalizarPorcaoRegistradaNutricao(serving,grams);
}
function referenciaPorcaoRegistroNutricao(entry,food=null){
  const saved=normalizarPorcaoRegistradaNutricao(entry.serving,entry.grams);if(saved)return {...saved,inferred:false};
  const f=food||getItensCatalogoPessoalNutricao().find(x=>x.id===entry.foodId);if(!f||!(entry.grams>0))return null;
  const density=Number(referenciaComumNutricao(f)?.liquidGramsPerMl);
  if(Number.isFinite(density)&&density>0)return {unit:'ml',amount:entry.grams/density,gramsPerUnit:density,name:'mL',inferred:true};
  const baseMeasures=(f.measures||[]).length?f.measures:referenciaComumNutricao(f)?.measures||[];
  const measures=baseMeasures.filter(m=>Number.isFinite(Number(m.grams))&&Number(m.grams)>0&&m.name);
  if(measures.length!==1)return null;const m=measures[0];return {unit:'measure',amount:entry.grams/Number(m.grams),gramsPerUnit:Number(m.grams),name:String(m.name),inferred:true};
}
function textoPorcaoNutricao(serving){
  const amount=Number(serving.amount).toLocaleString('pt-BR',{maximumFractionDigits:2});
  if(serving.unit==='measure'&&/^1\s+mL$/i.test(serving.name))return amount+' mL';
  if(serving.unit==='ml')return amount+' mL';if(serving.unit==='grams')return amount+' g';
  const name=String(serving.name),match=name.match(/^1\s+(unidade|clara|fatia|porção|colher|copo|xícara|ovo|banana)(\b|\s|$)(.*)$/i);
  if(!match)return amount+' × '+name;
  const plural={unidade:'unidades',clara:'claras',fatia:'fatias',porção:'porções',colher:'colheres',copo:'copos',xícara:'xícaras',ovo:'ovos',banana:'bananas'},noun=Number(serving.amount)===1?match[1]:plural[match[1].toLocaleLowerCase('pt-BR')];
  return amount+' '+noun+match[2]+match[3];
}
function textoQuantidadeRegistroNutricao(entry,food=null){
  const grams=formatarNutricao(entry.grams,1)+' g',serving=referenciaPorcaoRegistroNutricao(entry,food);
  if(!serving||serving.unit==='grams')return grams;
  return (serving.inferred?'≈ ':'')+textoPorcaoNutricao(serving)+' · '+grams;
}
let _nutritionEntryPortionReference=null;
function prepararEdicaoQuantidadeNutricao(entry){
  const serving=referenciaPorcaoRegistroNutricao(entry),unit=document.getElementById('nutritionEntryUnit'),amount=document.getElementById('nutritionEntryGrams');
  _nutritionEntryPortionReference=serving&&serving.unit!=='grams'?serving:null;
  unit.innerHTML='<option value="grams">Gramas (g)</option>'+(_nutritionEntryPortionReference?'<option value="'+serving.unit+'">'+esc(serving.unit==='ml'?'Mililitros (mL)':serving.name)+'</option>':'');
  unit.value=serving&&!serving.inferred&&serving.unit!=='grams'?serving.unit:'grams';
  amount.value=unit.value==='grams'?entry.grams:serving.amount;
  document.getElementById('nutritionEntryQuantityNote').textContent=serving?.inferred?'Este registro antigo guardou apenas gramas. A equivalência em unidades é aproximada; você pode selecionar a medida acima.':'';
  atualizarRotuloQuantidadeEdicaoNutricao();
}
function atualizarRotuloQuantidadeEdicaoNutricao(){const unit=document.getElementById('nutritionEntryUnit').value;document.getElementById('nutritionEntryGrams').dataset.unit=unit;document.getElementById('nutritionEntryAmountLabel').textContent=unit==='grams'?'Quantidade (g)':unit==='ml'?'Quantidade (mL)':'Quantidade na medida escolhida';}
function alterarUnidadeEdicaoRegistroNutricao(){
  const field=document.getElementById('nutritionEntryGrams'),previous=field.dataset.unit||'grams',next=document.getElementById('nutritionEntryUnit').value,reference=_nutritionEntryPortionReference;
  const grams=numeroNutricao(field.value)*(previous==='grams'?1:reference?.gramsPerUnit||1);
  field.value=arredondarNutricao(next==='grams'?grams:grams/(reference?.gramsPerUnit||1),4);atualizarRotuloQuantidadeEdicaoNutricao();atualizarPreviaEdicaoNutricao();
}
function gramasEdicaoRegistroNutricao(){const unit=document.getElementById('nutritionEntryUnit').value,amount=numeroNutricao(document.getElementById('nutritionEntryGrams').value);return arredondarNutricao(unit==='grams'?amount:amount*(_nutritionEntryPortionReference?.gramsPerUnit||0));}
function porcaoEdicaoRegistroNutricao(grams){const unit=document.getElementById('nutritionEntryUnit').value,amount=numeroNutricao(document.getElementById('nutritionEntryGrams').value);return normalizarPorcaoRegistradaNutricao(unit==='grams'?{unit,amount,gramsPerUnit:1,name:'g'}:{..._nutritionEntryPortionReference,unit,amount},grams);}
