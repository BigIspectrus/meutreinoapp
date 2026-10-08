/* v12.8.9 — medidas reais do cabeçalho; barras Android via Capacitor SystemBars. */
let _workoutLayoutFrame=0,_systemBarTheme='';
function atualizarMedidasCabecalhoTreino(){
  if(_workoutLayoutFrame)return;
  _workoutLayoutFrame=requestAnimationFrame(()=>{_workoutLayoutFrame=0;const root=document.documentElement,title=document.querySelector('#treinoAtivoCard > .card-title'),nav=document.getElementById('workoutFocusNav');
    for(const [element,key] of [[title,'--workout-header-height'],[nav,'--workout-nav-height']]){const height=element?.getBoundingClientRect().height;if(height>0){const value=Math.ceil(height)+'px';if(root.style.getPropertyValue(key)!==value)root.style.setProperty(key,value);}}
  });
}
function sincronizarTemaBarrasAndroid(){
  if(!isNativeAndroid()||!window.TreinoNativeBridge?.setSystemBarsStyle)return;
  const light=(document.documentElement.getAttribute('data-theme')||document.body.getAttribute('data-theme'))==='light',style=light?'LIGHT':'DARK';
  if(style===_systemBarTheme)return;_systemBarTheme=style;
  window.TreinoNativeBridge.setSystemBarsStyle(style).catch(error=>{_systemBarTheme='';console.warn('Barras Android',error);});
}
document.addEventListener('DOMContentLoaded',()=>{
  const title=document.querySelector('#treinoAtivoCard > .card-title'),nav=document.getElementById('workoutFocusNav');
  if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(atualizarMedidasCabecalhoTreino);if(title)observer.observe(title);if(nav)observer.observe(nav);}
  new MutationObserver(atualizarMedidasCabecalhoTreino).observe(document.body,{attributes:true,attributeFilter:['class']});
  new MutationObserver(sincronizarTemaBarrasAndroid).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  atualizarMedidasCabecalhoTreino();sincronizarTemaBarrasAndroid();document.fonts?.ready.then(atualizarMedidasCabecalhoTreino);
});
window.addEventListener('resize',atualizarMedidasCabecalhoTreino);
window.visualViewport?.addEventListener('resize',atualizarMedidasCabecalhoTreino);
