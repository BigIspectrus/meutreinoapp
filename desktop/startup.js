/* Somente companion PC: uma falha de renderização não remove o acesso aos menus. */
(()=>{
  if(!window.__TREINO_DESKTOP__)return;
  const initialize=window.onload;
  window.onload=async function(event){
    try{if(typeof initialize==='function')await initialize.call(this,event);}
    catch(error){
      const message=String(error?.message||error).slice(0,500);
      if(typeof registrarErroLocal==='function')registrarErroLocal(message,'desktop-startup');
      console.error('Inicialização parcial do TreinoApp PC:',error);
      let notice=document.getElementById('desktopStartupNotice');if(notice)return;
      notice=document.createElement('section');notice.id='desktopStartupNotice';notice.className='card';notice.setAttribute('role','alert');notice.style.cssText='max-width:1068px;margin:16px auto;border-color:var(--accent);padding:16px';
      const title=document.createElement('strong');title.textContent='Uma parte da tela não iniciou';
      const note=document.createElement('p');note.className='nutrition-note';note.textContent='Os menus continuam disponíveis. Detalhe: '+message;
      const retry=document.createElement('button');retry.type='button';retry.className='btn btn-outline btn-sm';retry.textContent='Recarregar página';retry.onclick=()=>location.reload();
      notice.append(title,note,retry);const header=document.querySelector('.app-header');if(header)header.after(notice);else document.body.prepend(notice);
    }
  };
})();
