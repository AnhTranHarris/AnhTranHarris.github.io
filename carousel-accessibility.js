/* Harris Portfolio: settled carousel interaction/accessibility ownership. */
(()=>{
  'use strict';
  const barrel=document.querySelector('#barrel');
  if(!barrel)return;
  const pages=[...barrel.querySelectorAll('.page')];
  if(!pages.length)return;

  const normalize360=value=>((value%360)+360)%360;
  const signedDistance=value=>{const n=normalize360(value);return n>180?n-360:n;};
  const readBarrelAngle=()=>{
    const match=/rotateY\(\s*(-?(?:\d+(?:\.\d*)?|\.\d+))deg\s*\)/.exec(barrel.style.transform||'');
    const value=match?Number(match[1]):0;
    return Number.isFinite(value)?value:0;
  };
  const readPageAngle=(page,index)=>{
    const value=parseFloat(page.style.getPropertyValue('--card-angle'));
    return Number.isFinite(value)?value:index*(360/pages.length);
  };
  const frontIndex=()=>{
    if(document.documentElement.classList.contains('carousel-fallback')){
      const dots=[...document.querySelectorAll('.dot')];
      const active=dots.findIndex(dot=>dot.classList.contains('on'));
      return active>=0?Math.min(active,pages.length-1):0;
    }
    const barrelAngle=readBarrelAngle();
    let best=0,bestDistance=Infinity;
    pages.forEach((page,index)=>{
      const distance=Math.abs(signedDistance(barrelAngle+readPageAngle(page,index)));
      if(distance<bestDistance){bestDistance=distance;best=index;}
    });
    return best;
  };
  const sync=()=>{
    const active=frontIndex();
    pages.forEach((page,index)=>{
      const isFront=index===active;
      page.toggleAttribute('inert',!isFront);
      if(isFront)page.removeAttribute('aria-hidden');
      else page.setAttribute('aria-hidden','true');
    });
    document.documentElement.dataset.carouselActiveCard=String(active+1);
  };

  sync();
  if('MutationObserver'in window){
    new MutationObserver(()=>{
      if(!barrel.classList.contains('edge-motion'))sync();
    }).observe(barrel,{attributes:true,attributeFilter:['class']});
  }
  window.addEventListener('pageshow',()=>requestAnimationFrame(sync),{passive:true});
})();
