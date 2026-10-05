import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..');
export function buildCommonFoods(){
  const taco=JSON.parse(readFileSync(resolve(root,'web/data/taco-v4.json'),'utf8'));
  const config=JSON.parse(readFileSync(resolve(root,'web/data/common-foods-config.json'),'utf8'));
  const measures=rows=>(rows||[]).map(([name,grams],i)=>({id:'common-measure-'+i,name,grams}));
  const foods=config.taco.map(item=>{
    const original=taco.foods.find(f=>f.id==='taco:'+item.code);
    if(!original)throw new Error('Alimento TACO inexistente: '+item.code);
    return {...original,name:item.name,brand:'',aliases:[original.name,...(item.aliases||[])],source:'taco',sourceId:original.id,sourceUrl:taco.sourceUrl,measures:measures(item.measures),note:item.note||''};
  }).concat(config.supplements.map(f=>({...f,brand:f.brand||'',measures:measures(f.measures)}))).map(f=>({...f,basis:'100',servingName:'100 g',servingGrams:100,favorite:false,barcode:'',createdAt:0,updatedAt:0,lastUsedAt:0,builtIn:true}));
  const seen=new Set();
  for(const food of foods){
    if(seen.has(food.id))throw new Error('ID duplicado: '+food.id);seen.add(food.id);
    if(!(food.kcal100>0)||!['kcal100','protein100','carbs100','fat100','fiber100','sodium100'].every(k=>Number.isFinite(food[k])&&food[k]>=0))throw new Error('Nutrientes inválidos: '+food.name);
    if(!food.measures.every(m=>m.grams>0&&m.name))throw new Error('Medida inválida: '+food.name);
  }
  return {version:config.version,portionNote:config.portionNote,foods};
}
export function writeCommonFoods(){
  const catalog=buildCommonFoods();
  writeFileSync(resolve(root,'web/data/common-foods.js'),'// Gerado por scripts/build-common-foods.mjs; editar common-foods-config.json.\nwindow.TreinoCommonFoods = '+JSON.stringify(catalog)+';\n');
  console.log(`${catalog.foods.length} alimentos comuns preparados para uso offline.`);
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))writeCommonFoods();
