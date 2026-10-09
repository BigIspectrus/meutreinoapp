/* v12.10.0 — OCR local; valores são propostas, jamais cadastro automático. */
const FOOD_LABEL_FIELDS=[['kcal','nutritionFoodKcal','Energia (kcal)'],['protein','nutritionFoodProtein','Proteína (g)'],['carbs','nutritionFoodCarbs','Carboidratos (g)'],['fat','nutritionFoodFat','Gorduras totais (g)'],['fiber','nutritionFoodFiber','Fibras (g)'],['sodium','nutritionFoodSodium','Sódio (mg)']];
let _foodLabelBusy=false,_foodLabelRaw='',_foodLabelPendingReview=false;
function textoAlinhadoRotulo(lines){
  if(!Array.isArray(lines))return '';const rows=[];
  for(const line of lines.filter(l=>typeof l.text==='string'&&Number.isFinite(l.top)&&Number.isFinite(l.left)).sort((a,b)=>a.top-b.top||a.left-b.left)){
    const height=Math.max(1,Number(line.height)||12),center=line.top+height/2,row=rows.find(r=>Math.abs(r.center-center)<=Math.min(r.height,height)*.45);
    if(row)row.parts.push(line);else rows.push({center,height,parts:[line]});
  }return rows.sort((a,b)=>a.center-b.center).map(r=>r.parts.sort((a,b)=>a.left-b.left).map(p=>p.text).join('  ')).join('\n').slice(0,30000);
}
function abrirLeitorRotulo(){
  if(_foodLabelBusy)return;fecharModal('modalNutritionFoods');document.getElementById('modalFoodLabel').classList.add('open');document.getElementById('foodLabelStatus').textContent='Fotografe somente a tabela, com boa luz e foco. Depois escolha a coluna e a base dos valores.';
  if(!document.getElementById('foodLabelFields').children.length)document.getElementById('foodLabelFields').innerHTML=FOOD_LABEL_FIELDS.map(([key,,label])=>'<label for="foodLabel-'+key+'">'+label+'<input id="foodLabel-'+key+'" type="number" min="0" step="any" inputmode="decimal" placeholder="Não reconhecido · preencher"><small id="foodLabelNote-'+key+'"></small></label>').join('');
  _foodLabelRaw='';for(const id of ['foodLabelName','foodLabelText','foodLabelColumn','foodLabelBasis','foodLabelPortionGrams','foodLabelPortionName'])document.getElementById(id).value='';for(const [key] of FOOD_LABEL_FIELDS){document.getElementById('foodLabel-'+key).value='';document.getElementById('foodLabelNote-'+key).textContent='';}atualizarBaseRotulo();
}
async function capturarRotuloAlimento(source='camera'){
  if(_foodLabelBusy)return;if(!isNativeAndroid()||!window.TreinoNativeBridge?.readFoodLabel)return toast('Leitura pela câmera disponível no APK Android. O cadastro manual continua disponível.','info');
  _foodLabelBusy=true;const status=document.getElementById('foodLabelStatus'),buttons=document.querySelectorAll('[data-label-capture]');buttons.forEach(b=>b.disabled=true);status.textContent='Aguardando imagem e leitura local…';
  try{const result=await window.TreinoNativeBridge.readFoodLabel(source);if(result.cancelled){status.textContent='Leitura cancelada. A proposta anterior, se houver, foi mantida.';return;}
    _foodLabelRaw=String(result.text||'').slice(0,30000);document.getElementById('foodLabelText').value=textoAlinhadoRotulo(result.lines)||_foodLabelRaw;for(const id of ['foodLabelColumn','foodLabelBasis','foodLabelPortionGrams','foodLabelPortionName'])document.getElementById(id).value='';atualizarBaseRotulo();
    for(const [key] of FOOD_LABEL_FIELDS){document.getElementById('foodLabel-'+key).value='';document.getElementById('foodLabelNote-'+key).textContent='';}
    status.textContent=_foodLabelRaw?'Texto extraído. Escolha a coluna 1 ou 2, informe a base e interprete para revisar os números.':'Não encontrei texto legível. Tente outra imagem ou preencha manualmente.';
  }catch(error){status.textContent=String(error?.message||'Não foi possível ler o rótulo. Tente outra imagem ou cadastro manual.');}
  finally{_foodLabelBusy=false;buttons.forEach(b=>b.disabled=false);}
}
function usarTextoOriginalRotulo(){const field=document.getElementById('foodLabelText');if(field.value&&field.value!==_foodLabelRaw&&!confirm('Trocar pelo texto original? Os ajustes feitos neste campo serão substituídos.'))return;field.value=_foodLabelRaw;document.getElementById('foodLabelReviewed').checked=false;}
function numeroTextoRotulo(token){
  const text=String(token).trim();if(/^\d+[.,]\d{3}$/.test(text)&&!/^0[.,]/.test(text))return null;
  const normalized=text.includes(',')&&text.includes('.')?text.replace(/\./g,'').replace(',','.'):text.replace(',','.');const n=Number(normalized);return Number.isFinite(n)&&n>=0?n:null;
}
function campoLinhaRotulo(line){const text=normalizarBuscaNutricao(line);if(/^(valor energetico|energia)\b/.test(text))return 'kcal';if(/^proteinas?\b/.test(text))return 'protein';if(/^carboidratos?\b/.test(text))return 'carbs';if(/^gorduras? (total|totais)\b/.test(text))return 'fat';if(/^fibras?( alimentares?)?\b/.test(text))return 'fiber';if(/^sodio\b/.test(text))return 'sodium';return null;}
function valoresLinhaRotulo(line,key){
  const text=line.replace(/\([^)]*\)/g,' ').replace(/\bpor\s+\d+(?:[.,]\d+)?\s*(?:g|ml)\b/gi,' ').replace(/\d+(?:[.,]\d+)?\s*%/g,' '),values=[];
  const tokens=[...text.matchAll(/(\d+(?:[.,]\d+)*)\s*(kcal|kj|mg|mcg|µg|g)?\b/gi)];
  for(const match of tokens){const n=numeroTextoRotulo(match[1]),unit=(match[2]||'').toLowerCase();if(key==='kcal'&&(unit==='kj'||(unit&&unit!=='kcal')))continue;if(key!=='kcal'&&['kcal','kj'].includes(unit))continue;
    if(n==null){values.push({value:null,note:'Separador numérico ambíguo: confira no rótulo.'});continue;}
    const factor=key==='sodium'?(unit==='g'?1000:['mcg','µg'].includes(unit)?0.001:1):unit==='mg'?0.001:['mcg','µg'].includes(unit)?0.000001:1;
    values.push({value:Math.round(n*factor*1000000)/1000000,note:unit?(factor!==1?'Unidade convertida · confira':'Valor proposto · confira'):'Sem unidade reconhecida · confira'});
  }return values;
}
function interpretarTextoRotulo(){
  const selected=document.getElementById('foodLabelColumn').value;if(!selected)return toast('Escolha qual coluna contém os valores que você quer cadastrar.','warn');const column=Number(selected)-1,found=new Map();
  for(const line of document.getElementById('foodLabelText').value.split(/\r?\n/)){const key=campoLinhaRotulo(line.trim());if(key){const values=valoresLinhaRotulo(line,key);found.set(key,values[column]||{value:null,note:'Coluna sem valor reconhecido: preencher manualmente.'});}}
  let count=0;for(const [key] of FOOD_LABEL_FIELDS){const candidate=found.get(key);document.getElementById('foodLabel-'+key).value=candidate?.value??'';document.getElementById('foodLabelNote-'+key).textContent=candidate?.note||'Não reconhecido: confira e preencha.';if(candidate?.value!=null)count++;}
  document.getElementById('foodLabelReviewed').checked=false;document.getElementById('foodLabelStatus').textContent=count+' campo(s) proposto(s). Confira cada número, a coluna, as unidades e a base. Nada foi salvo.';
}
function atualizarBaseRotulo(){document.getElementById('foodLabelPortion').hidden=document.getElementById('foodLabelBasis').value!=='portion';document.getElementById('foodLabelReviewed').checked=false;}
function revisarCadastroDoRotulo(){
  const basis=document.getElementById('foodLabelBasis').value;if(!basis)return toast('Informe se os valores são por 100 g ou por porção.','warn');
  const grams=Number(document.getElementById('foodLabelPortionGrams').value);if(basis==='portion'&&!(grams>0&&Number.isFinite(grams)))return toast('Informe o peso da porção em gramas. Valores por mL não são convertidos em gramas automaticamente.','warn');
  const fields=FOOD_LABEL_FIELDS.map(([key,target,label])=>({key,target,label,field:document.getElementById('foodLabel-'+key)}));
  for(const item of fields){if(item.field.validity.badInput||(item.field.value.trim()&&(!Number.isFinite(Number(item.field.value))||Number(item.field.value)<0))||(['kcal','protein','carbs','fat'].includes(item.key)&&!item.field.value.trim())){item.field.focus();return toast('Confira/preencha '+item.label+'. Zero deve ser informado explicitamente.','warn');}}
  if(!document.getElementById('foodLabelReviewed').checked)return toast('Confirme que revisou os números, a coluna e as unidades no rótulo.','warn');
  abrirModalAlimentoNutricao();_foodLabelPendingReview=true;document.getElementById('nutritionFoodModalTitle').textContent='Revisar alimento lido do rótulo';document.getElementById('nutritionFoodName').value=document.getElementById('foodLabelName').value.trim();document.getElementById('nutritionFoodBasis').value=basis;
  if(basis==='portion'){document.getElementById('nutritionFoodServingGrams').value=grams;document.getElementById('nutritionFoodServingName').value=document.getElementById('foodLabelPortionName').value.trim()||'porção';}
  for(const item of fields)document.getElementById(item.target).value=item.field.value;atualizarBaseAlimentoNutricao();document.getElementById('nutritionFoodSourceNote').textContent='Proposta de OCR local revisada por você. Confira novamente e salve apenas se estiver correto. Fibras/sódio opcionais vazios são normalizados para zero no cadastro atual; isso não comprova ausência do nutriente.';fecharModal('modalFoodLabel');
}
const _foodFormBeforeOcr=abrirModalAlimentoNutricao;
abrirModalAlimentoNutricao=function(){_foodLabelPendingReview=false;return _foodFormBeforeOcr.apply(this,arguments);};
const _saveFoodBeforeOcr=salvarAlimentoNutricao;
salvarAlimentoNutricao=function(){if(_foodLabelPendingReview){for(const id of ['nutritionFoodKcal','nutritionFoodProtein','nutritionFoodCarbs','nutritionFoodFat']){const field=document.getElementById(id);if(!field.value.trim()||!Number.isFinite(Number(field.value))||Number(field.value)<0||field.validity.badInput)return toast('Confira os quatro campos principais do rótulo; zero precisa ser explícito.','warn');}}const result=_saveFoodBeforeOcr.apply(this,arguments);if(!document.getElementById('modalNutritionFood').classList.contains('open'))_foodLabelPendingReview=false;return result;};
document.addEventListener('input',e=>{if(e.target.id!=='foodLabelReviewed'&&e.target.closest('#modalFoodLabel'))document.getElementById('foodLabelReviewed').checked=false;});
