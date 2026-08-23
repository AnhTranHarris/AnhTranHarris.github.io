/* Harris Portfolio: data-driven carousel layout bootstrap.
   Card content remains semantic HTML. This module only synchronizes geometry metadata,
   card numbering, 3D card angles, and navigation dots before carousel/FX initialization. */
(()=>{
  'use strict';

  const root=document.documentElement;
  const barrel=document.querySelector('#barrel');
  const dotsHost=document.querySelector('.dots');
  if(!barrel){root.dataset.carouselLayout='fallback';return;}

  const pages=[...barrel.querySelectorAll('.page')];
  const count=pages.length;
  if(count<3){root.dataset.carouselLayout='fallback';return;}

  const step=360/count;
  root.style.setProperty('--carousel-card-count',String(count));
  root.style.setProperty('--carousel-step',`${step}deg`);
  root.dataset.carouselCardCount=String(count);

  pages.forEach((page,index)=>{
    const angle=index*step;
    page.style.transform=`rotateY(${angle}deg) translateZ(var(--radius))`;
    page.style.setProperty('--card-index',String(index));
    page.style.setProperty('--card-angle',`${angle}deg`);
    const number=page.querySelector('.num');
    if(number)number.textContent=String(index+1).padStart(2,'0');
  });

  if(dotsHost){
    const fragment=document.createDocumentFragment();
    pages.forEach((_,index)=>{
      const dot=document.createElement('span');
      dot.className=index===0?'dot on':'dot';
      fragment.appendChild(dot);
    });
    dotsHost.replaceChildren(fragment);
  }

  root.dataset.carouselLayout='ready';
})();
