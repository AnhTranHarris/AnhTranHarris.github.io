/* Harris Portfolio: accessibility guard for the deferred resume dialog lifecycle. */
(()=>{
  'use strict';
  const root=document.documentElement;
  const background=document.querySelector('.shell');
  const resumeTrigger=document.querySelector('.page[data-card="about-me"] .repo');
  let overlay=null,observer=null;

  const sync=()=>{
    if(!overlay)return;
    const exposed=overlay.getAttribute('aria-hidden')==='false';
    const interactive=overlay.classList.contains('revealing')||overlay.classList.contains('open')||overlay.classList.contains('closing');
    if(background)background.toggleAttribute('inert',exposed);
    const shell=overlay.querySelector('.resume-shell');
    if(shell)shell.toggleAttribute('inert',exposed&&!interactive);
    if(exposed&&!interactive){
      if(!overlay.hasAttribute('tabindex'))overlay.setAttribute('tabindex','-1');
      if(document.activeElement!==overlay)overlay.focus({preventScroll:true});
    }
    if(!exposed){
      overlay.removeAttribute('tabindex');
      if(background)background.removeAttribute('inert');
      if((document.activeElement===overlay||document.activeElement===document.body)&&resumeTrigger){
        requestAnimationFrame(()=>resumeTrigger.focus({preventScroll:true}));
      }
    }
    root.dataset.resumeModalState=exposed?(interactive?'interactive':'constructing'):'closed';
  };

  const attach=candidate=>{
    if(!candidate||candidate===overlay)return;
    observer?.disconnect();
    overlay=candidate;
    observer=new MutationObserver(sync);
    observer.observe(overlay,{attributes:true,attributeFilter:['class','aria-hidden']});
    sync();
  };

  attach(document.getElementById('resume-viewer'));
  if(!overlay&&'MutationObserver'in window){
    const bodyObserver=new MutationObserver(()=>{
      const candidate=document.getElementById('resume-viewer');
      if(!candidate)return;
      bodyObserver.disconnect();
      attach(candidate);
    });
    bodyObserver.observe(document.body,{childList:true});
  }
})();
