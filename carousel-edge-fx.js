/* Harris Portfolio: modular carousel perimeter light renderer. Physics remain owned by carousel-touch.js. */
(()=>{
  const barrel=document.querySelector('#barrel');
  const stage=document.querySelector('.stage');
  if(!barrel||!stage)return;
  const pages=[...barrel.querySelectorAll('.page')];
  const dots=[...document.querySelectorAll('.dot')];
  if(!pages.length)return;

  const style=document.createElement('style');
  style.id='carousel-edge-fx-style';
  style.textContent=`
    /* Disable the legacy conic-gradient tracer. carousel-touch.js still owns motion state only. */
    html[data-effects] .page::before{
      opacity:0!important;
      background:none!important;
      border:0!important;
      padding:0!important;
      box-shadow:none!important;
      filter:none!important;
      -webkit-mask:none!important;
      mask:none!important;
    }

    /* Preserve card depth while removing the old whole-card gold wash. */
    @media(min-width:901px){
      html[data-effects] .barrel.edge-motion .page{
        box-shadow:0 28px 65px rgba(0,0,0,.46),0 5px 16px rgba(0,0,0,.25),inset 0 1px rgba(255,255,255,.07)!important;
      }
    }

    .carousel-edge-rail{
      position:absolute;z-index:4;pointer-events:none;opacity:0;
      filter:drop-shadow(0 0 2px rgba(255,250,220,.76)) drop-shadow(0 0 6px rgba(216,184,106,.28));
      will-change:transform,opacity;
    }
    .carousel-edge-rail::before{
      content:"";position:absolute;inset:0;border-radius:999px;
      background:linear-gradient(90deg,
        transparent 0%,
        rgba(216,184,106,.05) 13%,
        rgba(247,204,88,.22) 28%,
        rgba(255,231,145,.58) 41%,
        rgba(255,249,218,.94) 47%,
        rgba(255,255,255,1) 50%,
        rgba(255,249,218,.94) 53%,
        rgba(255,231,145,.58) 59%,
        rgba(247,204,88,.22) 72%,
        rgba(216,184,106,.05) 87%,
        transparent 100%);
    }
    .carousel-edge-rail[data-edge="top"],.carousel-edge-rail[data-edge="bottom"]{width:58px;height:3px;left:0;}
    .carousel-edge-rail[data-edge="left"],.carousel-edge-rail[data-edge="right"]{width:3px;height:58px;top:0;}
    .carousel-edge-rail[data-edge="left"]::before,.carousel-edge-rail[data-edge="right"]::before{
      background:linear-gradient(180deg,
        transparent 0%,
        rgba(216,184,106,.05) 13%,
        rgba(247,204,88,.22) 28%,
        rgba(255,231,145,.58) 41%,
        rgba(255,249,218,.94) 47%,
        rgba(255,255,255,1) 50%,
        rgba(255,249,218,.94) 53%,
        rgba(255,231,145,.58) 59%,
        rgba(247,204,88,.22) 72%,
        rgba(216,184,106,.05) 87%,
        transparent 100%);
    }
    .carousel-edge-rail[data-edge="top"]{top:-1px;}
    .carousel-edge-rail[data-edge="right"]{right:-1px;left:auto;}
    .carousel-edge-rail[data-edge="bottom"]{bottom:-1px;top:auto;}
    .carousel-edge-rail[data-edge="left"]{left:-1px;}

    html[data-effects] .barrel.edge-motion .page.edge-fx-primary .carousel-edge-rail.is-active{opacity:var(--edge-strength,.56);}
    html[data-effects] .barrel.edge-motion .page:not(.edge-fx-primary) .carousel-edge-rail.is-active{opacity:calc(var(--edge-strength,.56) * .22);filter:drop-shadow(0 0 2px rgba(216,184,106,.12));}
    .desktop-performance-reduced .carousel-edge-rail{filter:drop-shadow(0 0 2px rgba(216,184,106,.16));}

    .carousel-edge-corner-probe{position:absolute;width:0;height:0;pointer-events:none;z-index:0;}
    .carousel-edge-corner-probe[data-corner="tl"]{left:0;top:0;}
    .carousel-edge-corner-probe[data-corner="tr"]{right:0;top:0;}
    .carousel-edge-corner-probe[data-corner="br"]{right:0;bottom:0;}
    .carousel-edge-corner-probe[data-corner="bl"]{left:0;bottom:0;}

    .carousel-edge-corner-flare{
      position:absolute;left:0;top:0;width:42px;height:28px;z-index:28;pointer-events:none;opacity:0;border-radius:50%;
      background:radial-gradient(ellipse at center,
        rgba(255,255,246,1) 0%,
        rgba(255,251,224,.98) 10%,
        rgba(255,231,145,.80) 27%,
        rgba(216,184,106,.36) 50%,
        rgba(216,184,106,.10) 72%,
        rgba(216,184,106,0) 100%);
      filter:drop-shadow(0 0 3px rgba(255,249,218,.72)) drop-shadow(0 0 8px rgba(216,184,106,.26));
      transform:translate(-50%,-50%) scale(.7) rotate(-18deg);transform-origin:center;
    }
    .carousel-edge-corner-flare::before{
      content:"";position:absolute;left:4px;right:4px;top:50%;height:1px;transform:translateY(-50%);
      background:linear-gradient(90deg,transparent,rgba(255,231,145,.30) 24%,rgba(255,255,246,1) 49%,rgba(255,255,246,1) 51%,rgba(255,231,145,.30) 76%,transparent);
      box-shadow:0 0 4px rgba(255,244,190,.48);
    }
    .carousel-edge-corner-flare::after{
      content:"";position:absolute;left:9px;right:9px;top:7px;bottom:7px;border-radius:50%;border:1px solid rgba(255,232,150,.15);transform:rotate(-28deg);
    }
  `;
  document.head.appendChild(style);

  const edgeNames=['top','right','bottom','left'];
  const cornerNames=['tl','tr','br','bl'];
  const pageFx=pages.map(page=>{
    const rails={};
    edgeNames.forEach(name=>{
      const rail=document.createElement('span');
      rail.className='carousel-edge-rail';
      rail.dataset.edge=name;
      rail.setAttribute('aria-hidden','true');
      page.appendChild(rail);
      rails[name]=rail;
    });
    const probes={};
    cornerNames.forEach(name=>{
      const probe=document.createElement('span');
      probe.className='carousel-edge-corner-probe';
      probe.dataset.corner=name;
      probe.setAttribute('aria-hidden','true');
      page.appendChild(probe);
      probes[name]=probe;
    });
    return{page,rails,probes};
  });

  const flare=document.createElement('span');
  flare.className='carousel-edge-corner-flare';
  flare.setAttribute('aria-hidden','true');
  stage.appendChild(flare);

  const activePageIndex=()=>{
    const index=dots.findIndex(dot=>dot.classList.contains('on'));
    return index>=0?index:0;
  };
  const syncPrimaryPage=()=>{
    const activeIndex=activePageIndex();
    pageFx.forEach((state,index)=>state.page.classList.toggle('edge-fx-primary',index===activeIndex));
  };
  syncPrimaryPage();
  if('MutationObserver'in window&&dots.length){
    const observer=new MutationObserver(syncPrimaryPage);
    dots.forEach(dot=>observer.observe(dot,{attributes:true,attributeFilter:['class']}));
  }

  const normalize360=value=>((value%360)+360)%360;
  const signedAngleDelta=(from,to)=>{
    let delta=normalize360(to-from);
    if(delta>180)delta-=360;
    return delta;
  };
  const readDriverAngle=()=>normalize360(parseFloat(barrel.style.getPropertyValue('--edge-angle'))||0);
  const readStrength=()=>Math.max(.15,Math.min(1,parseFloat(barrel.style.getPropertyValue('--edge-strength'))||.56));

  let pageWidth=0,pageHeight=0,perimeter=0;
  const syncGeometry=()=>{
    const sample=pages[0];
    pageWidth=Math.max(1,sample.offsetWidth);
    pageHeight=Math.max(1,sample.offsetHeight);
    perimeter=2*(pageWidth+pageHeight);
  };
  syncGeometry();
  window.addEventListener('resize',syncGeometry,{passive:true});

  const segmentAtDistance=distance=>{
    let d=((distance%perimeter)+perimeter)%perimeter;
    if(d<pageWidth)return{edge:'top',offset:d,cornerBefore:'tl',cornerAfter:'tr'};
    d-=pageWidth;
    if(d<pageHeight)return{edge:'right',offset:d,cornerBefore:'tr',cornerAfter:'br'};
    d-=pageHeight;
    if(d<pageWidth)return{edge:'bottom',offset:pageWidth-d,cornerBefore:'br',cornerAfter:'bl'};
    d-=pageWidth;
    return{edge:'left',offset:pageHeight-d,cornerBefore:'bl',cornerAfter:'tl'};
  };

  const railHalf=29;
  const placeRail=(rail,edge,offset)=>{
    if(edge==='top'||edge==='bottom'){
      const x=Math.max(-railHalf,Math.min(pageWidth-railHalf,offset-railHalf));
      rail.style.transform=`translate3d(${x}px,0,0)`;
    }else{
      const y=Math.max(-railHalf,Math.min(pageHeight-railHalf,offset-railHalf));
      rail.style.transform=`translate3d(0,${y}px,0)`;
    }
  };

  let currentEdge=null;
  const renderPerimeterLight=distance=>{
    const segment=segmentAtDistance(distance);
    currentEdge=segment.edge;
    pageFx.forEach(({rails})=>{
      edgeNames.forEach(name=>rails[name].classList.toggle('is-active',name===segment.edge));
      placeRail(rails[segment.edge],segment.edge,segment.offset);
    });
  };

  const cornerDistances=[
    {name:'tr',distance:pageWidth},
    {name:'br',distance:pageWidth+pageHeight},
    {name:'bl',distance:2*pageWidth+pageHeight},
    {name:'tl',distance:0}
  ];
  const rebuildCornerDistances=()=>{
    cornerDistances[0].distance=pageWidth;
    cornerDistances[1].distance=pageWidth+pageHeight;
    cornerDistances[2].distance=2*pageWidth+pageHeight;
    cornerDistances[3].distance=0;
  };
  const originalSyncGeometry=syncGeometry;
  const syncAllGeometry=()=>{originalSyncGeometry();rebuildCornerDistances();};
  window.removeEventListener('resize',syncGeometry);
  window.addEventListener('resize',syncAllGeometry,{passive:true});
  syncAllGeometry();

  const signedPerimeterDelta=(from,to)=>{
    let delta=((to-from)%perimeter+perimeter)%perimeter;
    if(delta>perimeter/2)delta-=perimeter;
    return delta;
  };
  const crossedDistance=(from,to,target)=>{
    const travel=signedPerimeterDelta(from,to);
    let delta=signedPerimeterDelta(from,target);
    if(Math.abs(travel)<.001)return false;
    return travel>0?delta>=0&&delta<=travel:delta<=0&&delta>=travel;
  };

  let flareAnimation=null,lastFlareAt=0;
  const fireCornerFlare=(cornerName,now)=>{
    if(now-lastFlareAt<180)return;
    const state=pageFx[activePageIndex()]||pageFx[0];
    const probe=state.probes[cornerName];
    if(!probe)return;
    const probeRect=probe.getBoundingClientRect();
    const stageRect=stage.getBoundingClientRect();
    const x=probeRect.left-stageRect.left;
    const y=probeRect.top-stageRect.top;
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    lastFlareAt=now;
    flare.style.left=`${x}px`;
    flare.style.top=`${y}px`;
    flareAnimation?.cancel();
    const peak=2+Math.random();
    const frames=[
      {opacity:0,transform:'translate(-50%,-50%) scale(.72) rotate(-18deg)',offset:0},
      {opacity:.48,transform:`translate(-50%,-50%) scale(${(peak*.82).toFixed(2)}) rotate(-8deg)`,offset:.22},
      {opacity:.88,transform:`translate(-50%,-50%) scale(${peak.toFixed(2)}) rotate(8deg)`,offset:.44},
      {opacity:.72,transform:`translate(-50%,-50%) scale(${(peak*.92).toFixed(2)}) rotate(19deg)`,offset:.62},
      {opacity:.30,transform:`translate(-50%,-50%) scale(${(peak*.72).toFixed(2)}) rotate(10deg)`,offset:.80},
      {opacity:0,transform:`translate(-50%,-50%) scale(${(peak*.54).toFixed(2)}) rotate(0deg)`,offset:1}
    ];
    if(flare.animate){
      flareAnimation=flare.animate(frames,{duration:620,easing:'cubic-bezier(.22,.62,.30,1)',fill:'both'});
      flareAnimation.onfinish=()=>{flareAnimation=null;};
    }
  };

  let perimeterDistance=0,lastDistance=0,lastDriverAngle=null,raf=0;
  const tick=now=>{
    raf=0;
    if(!barrel.classList.contains('edge-motion')){
      lastDriverAngle=null;
      flareAnimation?.cancel();flareAnimation=null;flare.style.opacity='0';
      pageFx.forEach(({rails})=>edgeNames.forEach(name=>rails[name].classList.remove('is-active')));
      return;
    }

    const driverAngle=readDriverAngle();
    if(lastDriverAngle===null)lastDriverAngle=driverAngle;
    const angleDelta=signedAngleDelta(lastDriverAngle,driverAngle);
    lastDriverAngle=driverAngle;

    lastDistance=perimeterDistance;
    perimeterDistance=((perimeterDistance+(angleDelta/360)*perimeter)%perimeter+perimeter)%perimeter;
    renderPerimeterLight(perimeterDistance);

    for(const corner of cornerDistances){
      if(crossedDistance(lastDistance,perimeterDistance,corner.distance)){
        fireCornerFlare(corner.name,now);
        break;
      }
    }

    raf=requestAnimationFrame(tick);
  };

  const syncLoop=()=>{
    if(barrel.classList.contains('edge-motion')){
      if(!raf){
        syncAllGeometry();
        lastDriverAngle=readDriverAngle();
        renderPerimeterLight(perimeterDistance);
        raf=requestAnimationFrame(tick);
      }
    }else{
      if(raf)cancelAnimationFrame(raf);
      raf=0;lastDriverAngle=null;
      flareAnimation?.cancel();flareAnimation=null;flare.style.opacity='0';
      pageFx.forEach(({rails})=>edgeNames.forEach(name=>rails[name].classList.remove('is-active')));
    }
  };

  if('MutationObserver'in window)new MutationObserver(syncLoop).observe(barrel,{attributes:true,attributeFilter:['class']});
  syncLoop();
})();
