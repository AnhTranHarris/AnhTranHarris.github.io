/* Harris Portfolio: modular carousel edge-light renderer. Physics remain owned by carousel-touch.js. */
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
    /* Steps 2 + 4: narrow metallic tracer with faint lead-in, white-hot core and transparent tail. */
    .edge-tracer-supported .page::before,
    .desktop-edge-standard .page::before,
    .desktop-edge-webkit .page::before{
      background:conic-gradient(
        from var(--edge-angle,0deg),
        transparent 0deg 338deg,
        rgba(145,98,25,.015) 341deg,
        rgba(216,184,106,.035) 344deg,
        rgba(216,184,106,.08) 347deg,
        rgba(247,204,88,.22) 350deg,
        rgba(255,226,126,.52) 352.2deg,
        rgba(255,244,190,.86) 353.8deg,
        rgba(255,255,244,1) 354.8deg,
        rgba(255,255,255,1) 355.25deg,
        rgba(255,249,218,.92) 355.9deg,
        rgba(255,232,142,.60) 357deg,
        rgba(216,184,106,.26) 358.2deg,
        rgba(216,184,106,.09) 359.1deg,
        rgba(216,184,106,.025) 359.65deg,
        transparent 360deg
      )!important;
      filter:drop-shadow(0 0 2px rgba(255,247,207,.72)) drop-shadow(0 0 5px rgba(216,184,106,.24))!important;
    }

    /* Step 3: keep depth shadows, remove the broad gold wash from the whole card. */
    @media(min-width:901px){
      .barrel.edge-motion .page{
        box-shadow:
          0 28px 65px rgba(0,0,0,.46),
          0 5px 16px rgba(0,0,0,.25),
          inset 0 1px rgba(255,255,255,.07),
          inset 0 0 8px rgba(255,215,112,.14),
          0 0 8px rgba(255,226,126,.18)!important;
      }
      .desktop-performance-reduced .barrel.edge-motion .page{
        box-shadow:
          0 28px 65px rgba(0,0,0,.46),
          0 5px 16px rgba(0,0,0,.25),
          inset 0 1px rgba(255,255,255,.07),
          inset 0 0 6px rgba(255,215,112,.10),
          0 0 6px rgba(255,226,126,.12)!important;
      }
      .desktop-performance-reduced .page::before{
        filter:drop-shadow(0 0 2px rgba(255,247,207,.52)) drop-shadow(0 0 4px rgba(216,184,106,.16))!important;
      }
      .desktop-edge-fallback .page::before{
        padding:0!important;
        border:2px solid rgba(255,226,126,.72)!important;
        background:none!important;
        box-shadow:0 0 5px rgba(216,184,106,.18)!important;
        -webkit-mask:none!important;
        mask:none!important;
        filter:none!important;
      }
    }

    /* Step 5: Full Effects must win over the browser's CSS reduced-motion media query. */
    html[data-effects="full"].edge-tracer-supported .page::before,
    html[data-effects="full"].desktop-edge-standard .page::before,
    html[data-effects="full"].desktop-edge-webkit .page::before{
      border:0!important;
      -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
      -webkit-mask-composite:xor!important;
      mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
      mask-composite:exclude!important;
    }
    html[data-effects="full"].edge-tracer-supported .page::before{padding:2px!important;}
    @media(min-width:901px){
      html[data-effects="full"].desktop-edge-standard .page::before,
      html[data-effects="full"].desktop-edge-webkit .page::before{padding:10px!important;}
    }

    /* Step 6: one reusable stage-level lens flare; never clipped by .page overflow. */
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

  const flare=document.createElement('span');
  flare.className='carousel-edge-corner-flare';
  flare.setAttribute('aria-hidden','true');
  stage.appendChild(flare);

  const normalizeAngle=value=>((value%360)+360)%360;
  const shortestAngleDelta=(from,to)=>{let d=normalizeAngle(to-from);if(d>180)d-=360;return d;};
  const crossedAngle=(from,to,target)=>{
    const travel=shortestAngleDelta(from,to),delta=shortestAngleDelta(from,target);
    if(Math.abs(travel)<.001)return false;
    return travel>0?delta>=0&&delta<=travel:delta<=0&&delta>=travel;
  };
  const activePageIndex=()=>{
    const index=dots.findIndex(dot=>dot.classList.contains('on'));
    return index>=0?index:0;
  };

  const cornerAngles=[50,130,230,310];
  const cornerPoint=(rect,index)=>{
    if(index===0)return[rect.right,rect.top];
    if(index===1)return[rect.right,rect.bottom];
    if(index===2)return[rect.left,rect.bottom];
    return[rect.left,rect.top];
  };
  let flareAnimation=null;
  const fireCornerFlare=cornerIndex=>{
    if(document.documentElement.classList.contains('desktop-edge-fallback'))return;
    const page=pages[activePageIndex()]||pages[0];
    const pageRect=page.getBoundingClientRect(),stageRect=stage.getBoundingClientRect();
    const[x,y]=cornerPoint(pageRect,cornerIndex);
    flare.style.left=`${x-stageRect.left}px`;
    flare.style.top=`${y-stageRect.top}px`;
    flareAnimation?.cancel();
    const peak=2+Math.random();
    const direction=cornerIndex===0||cornerIndex===2?1:-1;
    const frames=[
      {opacity:0,transform:`translate(-50%,-50%) scale(.72) rotate(${-18*direction}deg)`,offset:0},
      {opacity:.48,transform:`translate(-50%,-50%) scale(${(peak*.82).toFixed(2)}) rotate(${-8*direction}deg)`,offset:.22},
      {opacity:.88,transform:`translate(-50%,-50%) scale(${peak.toFixed(2)}) rotate(${8*direction}deg)`,offset:.44},
      {opacity:.72,transform:`translate(-50%,-50%) scale(${(peak*.92).toFixed(2)}) rotate(${19*direction}deg)`,offset:.62},
      {opacity:.30,transform:`translate(-50%,-50%) scale(${(peak*.72).toFixed(2)}) rotate(${10*direction}deg)`,offset:.80},
      {opacity:0,transform:`translate(-50%,-50%) scale(${(peak*.54).toFixed(2)}) rotate(0deg)`,offset:1}
    ];
    if(flare.animate){
      flareAnimation=flare.animate(frames,{duration:620,easing:'cubic-bezier(.22,.62,.30,1)',fill:'both'});
      flareAnimation.onfinish=()=>{flareAnimation=null;};
    }
  };

  let phaseRaf=0,lastLightAngle=null;
  const readLightAngle=()=>normalizeAngle((parseFloat(barrel.style.getPropertyValue('--edge-angle'))||0)+355.25);
  const phaseTick=()=>{
    phaseRaf=0;
    if(!barrel.classList.contains('edge-motion')){lastLightAngle=null;return;}
    const lightAngle=readLightAngle();
    if(lastLightAngle!==null){
      for(let i=0;i<cornerAngles.length;i++)if(crossedAngle(lastLightAngle,lightAngle,cornerAngles[i])){fireCornerFlare(i);break;}
    }
    lastLightAngle=lightAngle;
    phaseRaf=requestAnimationFrame(phaseTick);
  };
  const syncPhaseLoop=()=>{
    if(barrel.classList.contains('edge-motion')){
      if(!phaseRaf){lastLightAngle=readLightAngle();phaseRaf=requestAnimationFrame(phaseTick);}
    }else{
      if(phaseRaf)cancelAnimationFrame(phaseRaf);
      phaseRaf=0;lastLightAngle=null;
      flareAnimation?.cancel();flareAnimation=null;flare.style.opacity='0';
    }
  };
  if('MutationObserver'in window)new MutationObserver(syncPhaseLoop).observe(barrel,{attributes:true,attributeFilter:['class']});
  syncPhaseLoop();
})();
