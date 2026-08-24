/* Harris Portfolio: startup recovery for skipped modules and stalled entry state. */
(()=>{
  'use strict';
  const root=document.documentElement;
  const hasScript=file=>[...document.scripts].some(script=>{
    try{return new URL(script.src,location.href).pathname.endsWith(`/${file}`)}catch{return false}
  });
  const loadMissing=(file,src)=>{
    if(hasScript(file))return;
    const script=document.createElement('script');
    script.src=src;
    script.async=false;
    script.dataset.startupRecovery=file;
    script.onerror=()=>{root.dataset.portfolioHealth='degraded'};
    document.body.appendChild(script);
  };
  const recoverSkippedModules=()=>{
    if(root.dataset.portfolioState!=='ready')return;
    loadMissing('carousel-touch.js','carousel-touch.js?v=handoff-2');
    loadMissing('progression-arrow.js','progression-arrow.js?v=cta-5');
  };
  const stateObserver=new MutationObserver(()=>{
    if(root.dataset.portfolioState!=='ready')return;
    stateObserver.disconnect();
    recoverSkippedModules();
  });
  if(root.dataset.portfolioState==='ready')recoverSkippedModules();
  else stateObserver.observe(root,{attributes:true,attributeFilter:['data-portfolio-state']});
  setTimeout(()=>{
    if(root.dataset.entryState==='complete')return;
    document.getElementById('portfolio-entry-overlay')?.remove();
    root.dataset.entryState='complete';
    root.dataset.entryHealth='degraded';
  },7100);
})();
