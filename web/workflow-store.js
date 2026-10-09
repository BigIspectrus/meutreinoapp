/* v12.9.0 — dados auxiliares, independentes do consumo e do histórico. */
window.TreinoWorkflowStore={
  keys:{draft:'nutritionMealDraftV1290',usual:'nutritionUsualPortionsV1290',plans:'nutritionPlansV1290',profiles:'exerciseProfilesV1290',muscleGoals:'muscleGoalsV1291',trash:'recycleBinV12100',oneHand:'oneHandModeV12100'},
  read(key,fallback){try{const value=localStorage.getItem(key);return value?JSON.parse(value):fallback;}catch(error){console.warn('Dados auxiliares inválidos',key,error);return fallback;}},
  save(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(error){console.warn('Dados auxiliares não salvos',key,error);if(typeof toast==='function')toast('Não foi possível salvar. Os dados anteriores foram mantidos.','error');return false;}},
  validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const [y,m,d]=value.split('-').map(Number);return y>=1000&&new Date(Date.UTC(y,m-1,d)).toISOString().slice(0,10)===value;},
  clone(value){return JSON.parse(JSON.stringify(value));}
};
