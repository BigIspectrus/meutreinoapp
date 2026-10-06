import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html=readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
// Testar os handlers reais; não manter uma segunda implementação da lógica.
function source(name,next){const start=html.indexOf('function '+name+'('),end=html.indexOf('function '+next+'(',start);assert.ok(start>=0&&end>start);return html.slice(start,end);}
let active=null,draft=null,planned=null,treinos=[],last=null,calls=[];
const context=vm.createContext({
  get treinoAtivoTemplate(){return active;},getTreinosSalvos:()=>treinos,getRascunhoValido:()=>draft,
  getTreinoPlanejadoHoje:()=>planned,getHist:()=>[],obterUltimaSessao:()=>last,
  iniciarTreinoPorId:id=>calls.push(['start',id]),irParaAba:tab=>calls.push(['tab',tab]),
  selecionarTreino:t=>calls.push(['snapshot',t.id]),
});
vm.runInContext(source('normalizarBuscaUI','filtrarTreinosUI')+source('iniciarSugestaoDashboardUI','abrirFerramentasTreinoUI'),context);
assert.equal(context.normalizarBuscaUI('  BRAÇOS · Elevação  '),'bracos · elevacao');
assert.equal(context.normalizarBuscaUI(null),'');
function run(expected){calls=[];context.iniciarSugestaoDashboardUI();assert.deepEqual(calls,expected);}
active={id:'active'};run([['tab','treinar']]); // Nunca reconstruir a sessão ativa.
active=null;treinos=[{id:'a'},{id:'b'}];draft={templateId:'b'};run([['start','b']]);
draft={templateId:'avulso',templateSnapshot:{id:'avulso',isAdHoc:true}};run([['tab','treinar'],['snapshot','avulso']]);
draft=null;planned={id:'b'};run([['start','b']]);
planned=null;last=['session',[{templateId:'b'}]];run([['start','b']]);
last=null;run([['start','a']]);
treinos=[];run([['tab','treinar']]);
vm.runInContext(html.match(/function iniciarTreinoWidget\(\)\{[^\n]+\}/)[0],context);
active={id:'active'};calls=[];context.iniciarTreinoWidget();assert.deepEqual(calls,[['tab','treinar']]);
active=null;planned={id:'b'};calls=[];context.iniciarTreinoWidget();assert.deepEqual(calls,[['start','b']]);
planned=null;

let empty={hidden:true},query={value:'PERNA'},buttons=[{dataset:{search:'treino a peito'},hidden:false},{dataset:{search:'treino b pernas'},hidden:false}];
context.document={getElementById:id=>id==='treinoBusca'?query:empty,querySelectorAll:()=>buttons};
vm.runInContext(source('filtrarTreinosUI','iconeUI'),context);
context.filtrarTreinosUI();assert.equal(buttons[0].hidden,true);assert.equal(buttons[1].hidden,false);assert.equal(empty.hidden,true);
query.value='não existe';context.filtrarTreinosUI();assert.equal(empty.hidden,false);
query.value='';context.filtrarTreinosUI();assert.ok(buttons.every(b=>!b.hidden));assert.equal(empty.hidden,true);
assert.ok(html.includes('partialConfirmed=false')&&html.includes('()=>salvarTreinoAtivo(sessionContext,true)'));
assert.ok(html.includes('href="./mobile-ui.css"'));
assert.ok(readFileSync(new URL('../web/sw.js',import.meta.url),'utf8').includes("'./mobile-ui.css'"));
console.log('OK: atalhos, prioridade da sessão/rascunho/plano, busca sem acentos e assets offline.');
