/* Protocolo local v1: união em três vias; ausência é exclusão, conflito exige escolha. */
globalThis.TreinoLanProtocol=(()=>{
  const arrays={historicoTreinoV3:'id',treinosTemplates:'id',treinoMetas:'id',nutritionFoodsV125:'id',nutritionEntriesV125:'id',nutritionRecipesV1251:'id',nutritionMealTemplatesV1251:'id',nutritionPlansV1290:'id',exerciseProfilesV1290:'exercise'};
  const maps=['pesoCorporal','exerciciosCustomizadosV3','weeklyPlanV12','nutritionDayStatusV1285','muscleGoalsV1291','healthLinksV12'];
  const atomic=['userProfile','nutritionGoalsV125','nutritionUsualPortionsV1290','movementGoalsV1286','descansoPadrao','effortMode','healthHrMax','healthRecoveryCacheV12','healthActivityCacheV128'];
  const mobileOnly=new Set(['healthLinksV12','healthRecoveryCacheV12','healthActivityCacheV128']);
  const keys=[...Object.keys(arrays),...maps,...atomic];
  const stable=value=>value===undefined?'undefined':JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const equal=(a,b)=>stable(a)===stable(b);
  function objectValue(value,key){if(atomic.includes(key)&&typeof value==='string'){try{value=JSON.parse(value);}catch(_){return null;}}return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}
  function contentEqual(a,b,key){const A=objectValue(a,key),B=objectValue(b,key);if(!A||!B)return equal(a,b);const strip=value=>Object.fromEntries(Object.entries(value).filter(([field])=>!['updatedAt','lastUsedAt'].includes(field)));return equal(strip(A),strip(B));}
  function withMetadata(chosen,local,remote,key){const value=objectValue(chosen,key);if(!value)return chosen;const out={...value},L=objectValue(local,key),R=objectValue(remote,key);for(const field of ['updatedAt','lastUsedAt']){const values=[L?.[field],R?.[field]].filter(v=>typeof v==='number'&&Number.isFinite(v));if(values.length)out[field]=Math.max(...values);}return atomic.includes(key)?JSON.stringify(out):out;}
  function sameSnapshot(a,b){for(const key of keys){if(a[key]===b[key])continue;if(a[key]==null||b[key]==null)return false;try{if(!equal(JSON.parse(a[key]),JSON.parse(b[key])))return false;}catch(_){return false;}}return true;}
  function validate(snapshot){if(!snapshot||typeof snapshot!=='object'||Array.isArray(snapshot))throw Error('Dados de sincronização inválidos.');const out=Object.create(null);for(const key of keys){const raw=snapshot[key];if(raw==null)continue;if(typeof raw!=='string')throw Error('Formato inválido: '+key);if(arrays[key]||maps.includes(key)){const parsed=JSON.parse(raw);if(arrays[key]?!Array.isArray(parsed):!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('Coleção inválida: '+key);}out[key]=raw;}return out;}
  function flatten(snapshot,key){const raw=snapshot[key],out=new Map();if(raw==null)return out;if(atomic.includes(key)){out.set('$',raw);return out;}const value=JSON.parse(raw);out.set('~root',true);if(arrays[key]){const occurrences=new Map();for(const row of value){if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Registro inválido: '+key);let id=row[arrays[key]];if(id==null||id===''){const text=stable(row),n=occurrences.get(text)||0;occurrences.set(text,n+1);id='legacy:'+text+':'+n;}else id='id:'+String(id);if(out.has(id))throw Error('IDs repetidos em '+key+'. Corrija antes de sincronizar.');out.set(id,row);}}else for(const [id,row] of Object.entries(value))out.set('id:'+id,row);return out;}
  function expand(key,records){if(atomic.includes(key))return records.has('$')?records.get('$'):null;const entries=[...records].filter(([id])=>id!=='~root');if(!records.has('~root')&&!entries.length)return null;if(arrays[key])return JSON.stringify(entries.map(([,value])=>value));return JSON.stringify(Object.fromEntries(entries.map(([id,value])=>[id.slice(3),value])));}
  function merge(base,local,remote,resolutions={},desktop=false,tombstones={}){base=validate(base);local=validate(local);remote=validate(remote);const snapshot=Object.create(null),conflicts=[];
    for(const key of keys){if(desktop&&mobileOnly.has(key)){if(remote[key]!=null)snapshot[key]=remote[key];continue;}const b=flatten(base,key),l=flatten(local,key),r=flatten(remote,key),out=new Map();
      for(const id of new Set([...b.keys(),...r.keys(),...l.keys()])){const B=b.get(id),L=l.get(id),R=r.get(id),token=JSON.stringify([key,id]);let chosen;
        const previouslyDeleted=L!==undefined&&B===undefined&&R===undefined&&tombstones[token];
        if(previouslyDeleted&&resolutions[token]!=='local'&&resolutions[token]!=='remote'){conflicts.push({token,key,id,label:String(L?.name||L?.exercicio||L?.exercise||id.slice(3)).slice(0,160)+' · excluído anteriormente no PC',local:{value:L},remote:{deleted:true}});continue;}
        if(previouslyDeleted)chosen=resolutions[token]==='local'?L:undefined;else if(key==='muscleGoalsV1291'&&id==='id:updatedAt'&&typeof L==='number'&&typeof R==='number')chosen=Math.max(L,R);else if(contentEqual(L,R,key))chosen=L;else if(contentEqual(L,B,key))chosen=R;else if(contentEqual(R,B,key))chosen=L;else if(resolutions[token]==='local')chosen=L;else if(resolutions[token]==='remote')chosen=R;else{conflicts.push({token,key,id,label:id==='~root'?'Coleção':String(L?.name||R?.name||L?.exercicio||R?.exercicio||L?.exercise||R?.exercise||id.slice(3)).slice(0,160),local:L===undefined?{deleted:true}:{value:L},remote:R===undefined?{deleted:true}:{value:R}});continue;}
        if(chosen!==undefined)chosen=withMetadata(chosen,L,R,key);
        if(chosen!==undefined)out.set(id,chosen);
      }const value=expand(key,out);if(value!=null)snapshot[key]=value;
    }return {snapshot,conflicts};
  }
  function tokens(snapshot){const out=new Set();for(const key of keys)for(const id of flatten(snapshot,key).keys())if(id!=='~root')out.add(JSON.stringify([key,id]));return out;}
  return {version:1,keys,mobileOnly,validate,equal,sameSnapshot,merge,tokens};
})();
