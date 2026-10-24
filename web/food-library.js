/* v12.12.0 — conciliação do catálogo. O diário e as receitas guardam suas próprias tabelas. */
(() => {
  'use strict';
  const MAIN=['kcal100','protein100','carbs100','fat100'],ALL=[...MAIN,'fiber100','sodium100'];
  const copy=value=>JSON.parse(JSON.stringify(value));
  const strings=values=>Array.isArray(values)?[...new Set(values.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim().slice(0,160)))]:[];
  const safeUrl=value=>{try{const url=new URL(String(value));return url.protocol==='https:'?url.href:'';}catch{return '';}};
  let resolving=false,resolvedRaw=null,resolvedIds=new Map(),preview=[],busy=false,importing=false,scanToken=0;
  const dismissed=new Set();
  function metadata(food){
    const result={aliases:strings(food.aliases).slice(0,120),sourceUrl:safeUrl(food.sourceUrl),sourceEdition:String(food.sourceEdition||'').slice(0,180),checkedAt:String(food.checkedAt||'').slice(0,10)};
    if(Array.isArray(food.nutrientKnown))result.nutrientKnown=food.nutrientKnown.filter(k=>ALL.includes(k));
    else result.nutrientKnown=ALL.filter(k=>Object.hasOwn(food,k)&&food[k]!==null&&food[k]!==''&&(MAIN.includes(k)||Number(food[k])>0||!!food.sourceUrl));
    if(food.library?.version===1){const lib=food.library;
      result.library={version:1,mergedIds:strings(lib.mergedIds),catalogIds:strings(lib.catalogIds),mergedAt:Number(lib.mergedAt)||0,resultSignature:String(lib.resultSignature||''),originals:Array.isArray(lib.originals)?lib.originals.filter(r=>r?.food?.id&&r.food.name).map(r=>({personal:!!r.personal,food:snapshot(r.food)})):[]};
    }
    return result;
  }
  function snapshot(food){
    // Não carregar metadados recursivos de conciliações anteriores dentro do arquivo original.
    const {library,aliases,sourceUrl,sourceEdition,checkedAt,...rest}=food;
    return {...copy(rest),aliases:strings(aliases),sourceUrl:safeUrl(sourceUrl),sourceEdition:String(sourceEdition||''),checkedAt:String(checkedAt||'')};
  }
  function identityName(name){
    let tokens=normalizarBuscaNutricao(name).split(' ').filter(t=>t&&!['de','da','do','das','dos','e'].includes(t));
    tokens=tokens.map(t=>({cozida:'cozido',crua:'cru',frita:'frito',assada:'assado',grelhada:'grelhado',refogada:'refogado',mussarela:'mucarela',mozarela:'mucarela',pera:'pera'}[t]||t));
    // Ausência de "crua" só é equivalente nestas frutas, nunca em carnes, massas ou tubérculos.
    if(tokens.some(t=>['banana','maca','laranja','mamao','morango','abacaxi','kiwi','melao','melancia','uva','pera','manga','goiaba','abacate','ameixa','caju','pessego','caqui'].includes(t)))tokens=tokens.filter(t=>t!=='cru');
    if(tokens.includes('leite')&&!tokens.includes('po'))tokens=tokens.filter(t=>!['liquido','uht','vaca'].includes(t));
    return [...new Set(tokens)].sort().join(' ');
  }
  function names(food){
    const own=identityName(food.name);
    // Apelidos de busca muito genéricos ("massa") não são uma identidade para conciliação.
    return [own,...strings(food.aliases).map(identityName).filter(n=>n.split(' ').length>=2)];
  }
  function preparation(food){
    const tokens=normalizarBuscaNutricao(food.name).split(' ');
    return ['cru','cozido','frito','assado','grelhado','refogado'].filter(p=>tokens.some(t=>t===p||t===p.slice(0,-1)+'a')).join('|');
  }
  function sameFood(a,b){
    if(!a?.name||!b?.name)return false;
    const ta=normalizarBuscaNutricao(a.name).split(' '),tb=normalizarBuscaNutricao(b.name).split(' ');
    if(ta.includes('leite')&&tb.includes('leite')&&ta.includes('po')!==tb.includes('po'))return false;
    const x=names(a),y=names(b),byName=x.some(n=>n&&y.includes(n));
    const barcode=String(a.barcode||'').trim();
    if(!byName&&!(barcode&&barcode===String(b.barcode||'').trim()))return false;
    const pa=preparation(a),pb=preparation(b);
    if(pa&&pb&&pa!==pb)return false;
    // Nem o mesmo código de barras permite trocar leite em pó por líquido ou integral por desnatado.
    const variants=['po','desnatado','semidesnatado','integral','lactose','acucar'];
    if(!byName&&variants.some(t=>ta.includes(t)!==tb.includes(t)))return false;
    return true;
  }
  function brand(food){
    const text=normalizarBuscaNutricao(food.brand);
    if(!text||text.startsWith('media de amostras'))return '';
    if(food.source==='taco'&&['cereais e derivados','verduras hortalicas e derivados','frutas e derivados','gorduras e oleos','pescados e frutos do mar','carnes e derivados','leite e derivados','ovos e derivados','produtos acucarados','alimentos preparados','leguminosas e derivados','nozes e sementes','outros alimentos','bebidas alcoolicas e nao alcoolicas'].includes(text))return '';
    return text.replace(/ referencia tbca$/, '');
  }
  function brandCompatible(a,b){return brand(a)===brand(b)||!!(a.barcode&&a.barcode===b.barcode&&(!brand(a)||!brand(b)));}
  function known(food,key){return Array.isArray(food.nutrientKnown)?food.nutrientKnown.includes(key):Object.hasOwn(food,key)&&food[key]!==null&&food[key]!=='';}
  function similar(a,b){
    if(!MAIN.every(k=>known(a,k)&&known(b,k)&&Number.isFinite(Number(a[k]))&&Number.isFinite(Number(b[k]))&&Number(a[k])>=0&&Number(b[k])>=0)||!(a.kcal100>0&&b.kcal100>0))return false;
    for(const key of ALL){
      if(!known(a,key)||!known(b,key))continue;
      const x=Number(a[key]),y=Number(b[key]),largest=Math.max(x,y);
      const tolerance=key==='kcal100'?Math.max(2,largest*.04):key==='sodium100'?Math.max(5,largest*.1):key==='fiber100'?Math.max(.3,largest*.1):Math.max(.25,largest*.05);
      if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(x-y)>tolerance)return false;
    }
    // Não misturar tabelas que discordam nos micronutrientes preenchidos em ambas.
    for(const key of Object.keys(a.micros100||{})){const x=Number(a.micros100[key]),y=Number(b.micros100?.[key]);if(x>0&&y>0&&Math.abs(x-y)>Math.max(.02,Math.max(x,y)*.15))return false;}
    return true;
  }
  function linked(food,common){
    const explicit=(food.library?.catalogIds||[]).includes(common?.id);
    return !!common?.builtIn&&(explicit||(food.source===common.source&&food.sourceId&&food.sourceId===common.sourceId))&&sameFood(food,common)&&similar(food,common)&&(brandCompatible(food,common)||(explicit&&(!brand(food)||!brand(common))));
  }
  function resolve(id){
    if(!id||resolving)return id;resolving=true;
    try{
      const raw=localStorage.getItem(NUTRITION_FOODS_KEY)||'[]';
      if(raw!==resolvedRaw){
        const foods=getAlimentosNutricao(),common=getAlimentosComunsNutricao(),map=new Map(),catalogIds=new Set(common.map(f=>f.id));
        // IDs ainda existentes têm prioridade sobre qualquer redirecionamento arquivado.
        for(const food of foods)map.set(food.id,food.id);
        for(const food of foods)for(const oldId of food.library?.mergedIds||[])if(!catalogIds.has(oldId)&&!map.has(oldId))map.set(oldId,food.id);
        for(const base of common)if(!map.has(base.id)){const food=foods.find(f=>linked(f,base));if(food)map.set(base.id,food.id);}
        resolvedIds=map;resolvedRaw=raw;
      }
      return resolvedIds.get(String(id))||id;
    }finally{resolving=false;}
  }
  function signature(food){const micros=normalizarMicrosNutricao(food.micros100);return JSON.stringify([String(food.name||'').trim(),String(food.brand||'').trim(),food.basis==='portion'?'portion':'100',Number(food.servingGrams)||100,String(food.servingName||'porção'),...ALL.map(k=>Number(food[k])||0),Object.entries(micros).sort(([a],[b])=>a.localeCompare(b)),(food.measures||[]).map(m=>[String(m.id||''),String(m.name).trim(),Number(m.grams)]),String(food.source||'manual'),String(food.sourceId||''),String(food.barcode||'')]);}
  function trustedReference(food){return !!food.builtIn&&['taco','tbca'].includes(food.source)&&getAlimentosComunsNutricao().some(f=>f.id===food.id&&signature(f)===signature(food));}
  function recommended(a,b){
    if(trustedReference(a))return a;
    if(trustedReference(b))return b;
    // Sem uma referência verificada, manter a tabela existente em vez de trocar por mais casas decimais.
    return a;
  }
  function merge(a,b,winner){
    const now=Date.now(),originals=[],seen=new Set();
    for(const food of [a,b]){
      const prior=food.library?.originals?.length?food.library.originals:[{personal:!food.builtIn,food:snapshot(food)}];
      for(const original of prior){const key=(original.personal?'p:':'b:')+original.food.id;if(!seen.has(key)){seen.add(key);originals.push(copy(original));}}
    }
    const allMeasures=[...(winner.measures||[]),...(a.measures||[]),...(b.measures||[])],measures=[];
    for(const measure of allMeasures){const prior=measures.find(m=>normalizarBuscaNutricao(m.name)===normalizarBuscaNutricao(measure.name));
      if(!prior)measures.push({...measure});
      else if(Math.abs(prior.grams-measure.grams)>Math.max(.05,prior.grams*.01)){
        const name=measure.name+' · '+formatarNutricao(measure.grams,1)+' g (outra referência)';
        if(!measures.some(m=>m.name===name))measures.push({...measure,name});
      }
    }
    const food={...snapshot(winner),id:a.id,builtIn:false,favorite:!!(a.favorite||b.favorite),lastUsedAt:Math.max(a.lastUsedAt||0,b.lastUsedAt||0),createdAt:a.createdAt||now,updatedAt:now,measures,aliases:strings([a.name,b.name,...(a.aliases||[]),...(b.aliases||[])]),library:{version:1,mergedIds:strings([a.id,b.id,...(a.library?.mergedIds||[]),...(b.library?.mergedIds||[])]),catalogIds:strings([...(a.builtIn?[a.id]:[]),...(b.builtIn?[b.id]:[]),...(a.library?.catalogIds||[]),...(b.library?.catalogIds||[])]),originals,mergedAt:now}};
    // Valores da tabela escolhida, sem médias e sem preencher micros de uma fonte diferente.
    // A referência genérica pode não ter código de barras; preservar o identificador já cadastrado.
    food.barcode=winner.barcode||a.barcode||b.barcode||'';
    food.library.resultSignature=signature(food);return food;
  }
  function activeDraft(){return !!(window.TreinoMealBuilder?.active()||window.TreinoMealBuilder?.loadSaved());}
  function refresh(message){
    _mealShortcutCacheRaw='';renderizarGerenciadorAlimentosNutricao();renderizarBuscaAlimentosNutricao();atualizarStorageStatus();localStorage.removeItem('_nativeNutritionSyncV1252');agendarSincronizacaoNutricaoNativa();
    if(message)toast(message,'success');
  }
  function candidates(foods){
    const common=getAlimentosComunsNutricao(),pairs=[],seen=new Set(),catalogIndex=new Map();
    const addIndex=food=>{for(const name of names(food)){if(!catalogIndex.has(name))catalogIndex.set(name,[]);catalogIndex.get(name).push(food);}};
    common.forEach(addIndex);
    for(const a of foods){const options=new Map();for(const name of names(a))for(const b of catalogIndex.get(name)||[])options.set(b.id,b);
      if(a.barcode)for(const b of foods)if(b.barcode===a.barcode)options.set(b.id,b);
      for(const b of options.values()){
        if(a.id===b.id||linked(a,b)||!sameFood(a,b))continue;
        const key=[a.id,b.id].sort().join('\n');if(seen.has(key)||dismissed.has(key))continue;seen.add(key);
        // Marcas diferentes ficam separadas; marca ausente só permite conciliação manual explícita.
        if(brand(a)&&brand(b)&&!brandCompatible(a,b))continue;
        pairs.push({a,b,key,similar:similar(a,b),brandConfirmed:brandCompatible(a,b)});
      }addIndex(a);
    }
    return pairs.sort((a,b)=>Number(b.similar)-Number(a.similar)||a.a.name.localeCompare(b.a.name,'pt-BR'));
  }
  function sourceLabel(food){return fonteAlimentoNutricao(food.source)+(food.brand?' · '+food.brand:'')+(food.sourceEdition?' · '+food.sourceEdition:'');}
  function card(pair,index){
    const {a,b}=pair,winner=recommended(a,b),labels=['kcal','Proteína (g)','Carboidratos (g)','Gorduras (g)','Fibras (g)','Sódio (mg)'];
    return '<article class="food-library-pair"><h3>'+esc(a.name)+'</h3><p class="nutrition-note">'+esc(pair.similar?'Composição semelhante por 100 g.':'Composição diferente ou incompleta: confira as tabelas. Não será unida automaticamente.')+'</p>'+
      '<div class="food-library-table-wrap"><table><caption>Comparação por 100 g de parte comestível</caption><thead><tr><th>Nutriente</th><th>'+esc(a.name)+'<small>'+esc(sourceLabel(a))+'</small></th><th>'+esc(b.name)+'<small>'+esc(sourceLabel(b))+'</small></th></tr></thead><tbody>'+ALL.map((key,i)=>'<tr><th>'+labels[i]+'</th><td>'+esc(known(a,key)?formatarNutricao(a[key],2):'Não informado')+'</td><td>'+esc(known(b,key)?formatarNutricao(b[key],2):'Não informado')+'</td></tr>').join('')+'</tbody></table></div>'+
      '<details><summary>Micronutrientes e medidas</summary><p class="nutrition-note">Ao unir, a tabela escolhida será mantida inteira. Nenhum nutriente é calculado pela média das duas fontes.</p>'+[a,b].map(f=>'<p><strong>'+esc(f.name)+'</strong><br>'+esc(NUTRITION_MICROS.filter(m=>Number(f.micros100?.[m.key])>0).map(m=>m.label+': '+formatarNutricao(f.micros100[m.key],2)+' '+m.unit).join(' · ')||'Micronutrientes não informados')+'<br>'+esc((f.measures||[]).map(m=>m.name+' = '+formatarNutricao(m.grams,1)+' g').join(' · ')||'Sem medidas caseiras')+'</p>').join('')+'</details>'+
      (!pair.brandConfirmed?'<p class="nutrition-note">Uma marca não foi informada. Só una se você confirmar que é o mesmo produto.</p>':'')+
      (pair.similar?'<label class="food-library-choice">Tabela para os próximos registros<select id="foodLibraryWinner'+index+'"><option value="a"'+(winner===a?' selected':'')+'>Manter '+esc(a.name+' · '+sourceLabel(a))+'</option><option value="b"'+(winner===b?' selected':'')+'>Usar '+esc(b.name+' · '+sourceLabel(b))+'</option></select></label><button type="button" class="btn btn-primary btn-sm" onclick="unirParBibliotecaAlimentos('+index+')">'+(pair.brandConfirmed?'Unir estes dois':'Confirmo o mesmo produto: unir')+'</button>':'')+
      '<button type="button" class="btn btn-ghost btn-sm" onclick="ignorarParBibliotecaAlimentos('+index+')">Manter separados</button></article>';
  }
  function renderPreview(){
    preview=candidates(getAlimentosNutricao());const host=document.getElementById('foodLibraryReview');
    const safe=unambiguousPairs(preview);
    host.innerHTML=(safe.length?'<button type="button" class="btn btn-outline" onclick="unirEquivalentesBibliotecaAlimentos()">Unir '+safe.length+' equivalência(s) segura(s)</button><p class="nutrition-note">Usa a tabela sugerida abaixo apenas em pares sem outra correspondência possível, com marca e composição compatíveis. Você pode revisar cada par e escolher outra tabela individualmente.</p>':'')+(preview.length?'<p class="nutrition-note">'+preview.length+' comparação(ões). Mostrando até 30 por vez. Confira o preparo, a marca e a tabela; registros anteriores não serão recalculados.</p>'+preview.slice(0,30).map(card).join(''):'<p class="nutrition-note">Nenhum outro par compatível encontrado. Alimentos com marcas ou preparos diferentes são mantidos separados.</p>');
    document.getElementById('foodLibraryArchive').innerHTML=getAlimentosNutricao().filter(f=>f.library?.originals?.length).map(f=>'<div class="food-library-archive"><strong>'+esc(f.name)+'</strong><small>'+f.library.originals.length+' tabela(s) original(is) guardada(s) no backup</small><button type="button" class="btn btn-ghost btn-sm" onclick=\'desfazerUniaoBibliotecaAlimentos('+jsArg(f.id)+')\'>Desfazer união</button></div>').join('');
  }
  function openReview(){dismissed.clear();scanToken++;renderPreview();document.getElementById('modalFoodLibrary').classList.add('open');}
  function unambiguousPairs(pairs){const degrees=new Map();for(const p of pairs)for(const id of [p.a.id,p.b.id])degrees.set(id,(degrees.get(id)||0)+1);return pairs.filter(p=>p.similar&&p.brandConfirmed&&degrees.get(p.a.id)===1&&degrees.get(p.b.id)===1);}
  async function uniteSafeBatch(){
    if(busy||importing)return;const pairs=unambiguousPairs(preview);if(!pairs.length)return;
    if(activeDraft())return toast('Conclua ou descarte a montagem pendente antes de unir alimentos.','warn');
    busy=true;const before=localStorage.getItem(NUTRITION_FOODS_KEY)||'[]',token=scanToken;
    try{
      const backup=await salvarSnapshotSeguro('antes-conciliar-equivalentes');if(!backup)throw new Error('Não foi possível criar a cópia de segurança.');
      if(before!==(localStorage.getItem(NUTRITION_FOODS_KEY)||'[]')||token!==scanToken||activeDraft())throw new Error('Os dados mudaram. Abra novamente a conciliação.');
      let foods=getAlimentosNutricao();const common=getAlimentosComunsNutricao();
      for(const pair of pairs){const a=foods.find(f=>f.id===pair.a.id),b=pair.b.builtIn?common.find(f=>f.id===pair.b.id):foods.find(f=>f.id===pair.b.id);if(!a||!b||!sameFood(a,b)||!similar(a,b)||!brandCompatible(a,b))throw new Error('Uma comparação mudou. Revise antes de continuar.');const food=merge(a,b,recommended(a,b));foods=foods.filter(f=>f.id!==b.id).map(f=>f.id===a.id?food:f);}
      salvarAlimentosNutricaoLocal(foods);refresh(pairs.length+' equivalência(s) unida(s). Diário preservado.');renderPreview();
    }catch(error){toast(String(error.message||error),'error');}finally{busy=false;}
  }
  async function unite(index){
    if(busy||importing)return;const pair=preview[index];if(!pair?.similar)return;
    if(activeDraft())return toast('Guarde os dados e conclua ou descarte a montagem pendente antes de unir alimentos.','warn');
    busy=true;const before=localStorage.getItem(NUTRITION_FOODS_KEY)||'[]',token=scanToken,winner=document.getElementById('foodLibraryWinner'+index)?.value==='b'?'b':'a';
    try{
      const backup=await salvarSnapshotSeguro('antes-conciliacao-alimentos');
      if(!backup)throw new Error('Não foi possível criar a cópia de segurança. Nenhum alimento foi alterado.');
      if(before!==(localStorage.getItem(NUTRITION_FOODS_KEY)||'[]')||token!==scanToken||activeDraft())throw new Error('A biblioteca ou a montagem mudou. Abra novamente a conciliação.');
      const foods=getAlimentosNutricao(),a=foods.find(f=>f.id===pair.a.id),b=pair.b.builtIn?getAlimentosComunsNutricao().find(f=>f.id===pair.b.id):foods.find(f=>f.id===pair.b.id);
      if(!a||!b||!sameFood(a,b)||!similar(a,b))throw new Error('Os alimentos mudaram; revise a comparação novamente.');
      const joined=merge(a,b,winner==='b'?b:a),next=foods.filter(f=>f.id!==b.id).map(f=>f.id===a.id?joined:f);
      salvarAlimentosNutricaoLocal(next);refresh('Alimentos unidos. Suas refeições anteriores foram preservadas.');renderPreview();
    }catch(error){toast(String(error.message||error),'error');}finally{busy=false;}
  }
  async function undo(id){
    if(busy||importing)return;if(activeDraft())return toast('Conclua ou descarte a montagem pendente antes de desfazer a união.','warn');
    const foods=getAlimentosNutricao(),food=foods.find(f=>f.id===id);if(!food?.library?.originals?.length)return;
    if(signature(food)!==food.library.resultSignature)return toast('Este alimento foi editado após a união. As tabelas originais continuam no backup; restaure a cópia anterior pela área de segurança.','warn');
    const originals=food.library.originals.filter(r=>r.personal).map(r=>({...copy(r.food),updatedAt:Date.now()}));
    if(originals.some(r=>foods.some(f=>f.id!==id&&f.id===r.id)))return toast('Um código original já existe. Revise a biblioteca antes de restaurar.','warn');
    busy=true;const before=localStorage.getItem(NUTRITION_FOODS_KEY)||'[]';
    try{const backup=await salvarSnapshotSeguro('antes-desfazer-conciliacao');if(!backup)throw new Error('Não foi possível criar a cópia de segurança.');if(before!==(localStorage.getItem(NUTRITION_FOODS_KEY)||'[]')||activeDraft())throw new Error('Os dados mudaram. Tente novamente.');salvarAlimentosNutricaoLocal(foods.filter(f=>f.id!==id).concat(originals));refresh('Tabelas originais restauradas; diário preservado.');renderPreview();}
    catch(error){toast(String(error.message||error),'error');}finally{busy=false;}
  }
  async function importBatch(event){
    const file=event?.target?.files?.[0];if(event?.target)event.target.value='';if(!file)return;
    if(importing||busy)return toast('Aguarde a operação atual terminar.','info');
    if(file.size>8*1024*1024)return toast('Use um arquivo JSON de até 8 MB.','warn');
    importing=true;
    try{
      const data=JSON.parse(await file.text()),rows=Array.isArray(data)?data:data?.foods;
      if(!Array.isArray(rows)||!rows.length||rows.length>2000)throw new Error('O arquivo precisa conter de 1 a 2.000 alimentos em foods, com valores por 100 g.');
      const before=localStorage.getItem(NUTRITION_FOODS_KEY)||'[]',foods=getAlimentosNutricao(),common=getAlimentosComunsNutricao();let added=0,merged=0,ignored=0,review=0;
      const reservedIds=new Set([...common.map(f=>f.id),...foods.flatMap(f=>[f.id,...(f.library?.mergedIds||[])]),...getRegistrosNutricao().map(e=>e.foodId).filter(Boolean)]);
      function reserveIncoming(food,index){while(reservedIds.has(food.id))food.id='import:'+gerarId('food')+'-'+index;reservedIds.add(food.id);}
      const pendingIds=new Set(window.TreinoMealBuilder?.loadSaved()?.items?.map(row=>row.food?.id)||[]);
      for(const [index,raw] of rows.entries()){
        const parsed={};for(const key of ALL){const value=typeof raw?.[key]==='string'?raw[key].trim().replace(',','.'):raw?.[key];parsed[key]=value===null||value===undefined||value===''?null:['number','string'].includes(typeof value)?Number(value):NaN;}
        if(typeof raw?.name!=='string'||!raw.name.trim()||!MAIN.every(k=>Number.isFinite(parsed[k])&&parsed[k]>=0)||parsed.kcal100>1000||['protein100','carbs100','fat100','fiber100'].some(k=>parsed[k]!==null&&(!Number.isFinite(parsed[k])||parsed[k]<0||parsed[k]>100))||(parsed.sodium100!==null&&(!Number.isFinite(parsed.sodium100)||parsed.sodium100<0||parsed.sodium100>100000))){ignored++;continue;}
        const incoming=normalizarAlimentoImportadoNutricao({...raw,...Object.fromEntries(ALL.map(k=>[k,parsed[k]??0]))},index);
        if(!incoming){ignored++;continue;}
        Object.assign(incoming,{aliases:strings(raw.aliases).slice(0,120),sourceUrl:safeUrl(raw.sourceUrl),sourceEdition:String(raw.sourceEdition||'').slice(0,180),nutrientKnown:ALL.filter(k=>parsed[k]!==null)});
        // Arquivos externos não podem injetar redirecionamentos de IDs para alimentos existentes.
        const relevant=foods.concat(common.filter(b=>!foods.some(f=>f.id===b.id||linked(f,b)))).filter(f=>sameFood(f,incoming));
        const matches=relevant.filter(f=>brandCompatible(f,incoming)&&similar(f,incoming));
        const target=matches.length===1?matches[0]:null;
        if(target&&!activeDraft()&&!pendingIds.has(target.id)){
          if(target.builtIn){reserveIncoming(incoming,index);foods.push(merge(incoming,target,recommended(incoming,target)));}
          else{const idx=foods.findIndex(f=>f.id===target.id);if(incoming.id!==target.id)reserveIncoming(incoming,index);foods[idx]=merge(target,incoming,recommended(target,incoming));}
          merged++;
        }else{
          reserveIncoming(incoming,index);
          foods.push(incoming);added++;if(relevant.length)review++;
        }
      }
      if(!added&&!merged)return toast('Nenhum alimento válido para importar. Preencha nome, kcal, proteína, carboidratos e gordura por 100 g.','warn');
      const backup=await salvarSnapshotSeguro('antes-importar-alimentos');if(!backup)throw new Error('Não foi possível criar a cópia de segurança. A importação não foi aplicada.');
      if(before!==(localStorage.getItem(NUTRITION_FOODS_KEY)||'[]')||(merged&&activeDraft()))throw new Error('A biblioteca ou a montagem mudou durante a importação. Tente novamente.');
      salvarAlimentosNutricaoLocal(foods);refresh(added+' novo(s), '+merged+' conciliado(s), '+ignored+' inválido(s)'+(review?' · '+review+' para revisar':'')+'.');
      if(review)openReview();
    }catch(error){toast('Importação não concluída: '+String(error.message||error),'error');}finally{importing=false;}
  }
  function openSources(){
    const catalog=window.TreinoCommonFoods||{},host=document.getElementById('foodLibrarySources');
    host.innerHTML='<p>'+Number(catalog.foods?.length||0)+' alimentos comuns disponíveis offline. Consulta das fontes: '+esc(catalog.checkedAt||'não informada')+'.</p>'+ (catalog.sources||[]).map(s=>'<p><a href="'+esc(safeUrl(s.url))+'" target="_blank" rel="noopener noreferrer">'+esc(s.name)+'</a><br>'+esc(s.edition)+'</p>').join('')+'<p class="nutrition-note">A data de consulta não é a data das análises. Os valores são referências por 100 g da parte comestível; marcas e receitas variam. Nas fichas TBCA, carboidratos são os totais. Valores ausentes/traços da TACO podem estar representados como zero na base antiga. Para seu produto, prefira um rótulo conferido.</p><p class="nutrition-note">Novos itens sem medida caseira conferida usam gramas. Não há conversão automática de mililitros para gramas sem referência. Mais casas decimais não garantem maior precisão.</p>';
    document.getElementById('modalFoodLibrarySources').classList.add('open');
  }
  window.TreinoFoodLibrary={metadata,sameFood,similar,linked,resolve,importBatch};
  window.abrirConciliacaoAlimentos=openReview;window.unirParBibliotecaAlimentos=unite;
  window.unirEquivalentesBibliotecaAlimentos=uniteSafeBatch;
  window.ignorarParBibliotecaAlimentos=index=>{if(busy)return;const pair=preview[index];if(pair)dismissed.add(pair.key);renderPreview();};
  window.desfazerUniaoBibliotecaAlimentos=undo;window.abrirFontesBibliotecaAlimentos=openSources;
  const holder=document.createElement('div');holder.innerHTML='<div class="modal-overlay" id="modalFoodLibrary"><div class="modal food-library-modal"><div class="modal-title">Conciliar alimentos</div><p class="nutrition-note">Uma entrada por alimento, com a tabela que você escolher. Marcas diferentes e cru/cozido ficam separados. Antes de alterar, o app cria uma cópia de segurança. Você também pode desfazer uma união enquanto o alimento não for editado.</p><div id="foodLibraryReview"></div><details><summary>Uniões anteriores</summary><div id="foodLibraryArchive"></div></details><div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="fecharModal(\'modalFoodLibrary\')">Fechar</button></div></div></div><div class="modal-overlay" id="modalFoodLibrarySources"><div class="modal food-library-modal"><div class="modal-title">Fontes da biblioteca</div><div id="foodLibrarySources"></div><div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="fecharModal(\'modalFoodLibrarySources\')">Fechar</button></div></div></div>';
  document.body.append(...holder.children);
})();
