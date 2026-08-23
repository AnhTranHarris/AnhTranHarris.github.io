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
    html[data-effects] .page::before{opacity:0!important;background:none!important;border:0!important;padding:0!important;box-shadow:none!important;filter:none!important;-webkit-mask:none!important;mask:none!important}
    @media(min-width:901px){html[data-effects] .barrel.edge-motion .page{box-shadow:0 28px 65px rgba(0,0,0,.46),0 5px 16px rgba(0,0,0,.25),inset 0 1px rgba(255,255,255,.07)!important}}

    /* Opaque 10px polished-gold rim: darker shoulders, bright yellow-gold center. */
    .carousel-edge-frame{
      position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:inherit;
      box-sizing:border-box;padding:10px;opacity:1;
      background:linear-gradient(135deg,rgb(133,92,28) 0%,rgb(174,126,39) 18%,rgb(238,190,72) 43%,rgb(255,218,103) 50%,rgb(231,177,61) 58%,rgb(163,113,32) 82%,rgb(119,79,22) 100%);
      -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
      -webkit-mask-composite:xor;
      mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
      mask-composite:exclude;
      filter:brightness(.82) drop-shadow(0 0 1px rgba(216,184,106,.08));
      transition:filter 52ms linear;will-change:filter;
    }

    .carousel-edge-rail{position:absolute;z-index:4;pointer-events:none;opacity:0;will-change:transform,opacity,filter;transition:opacity 34ms linear,filter 42ms linear}
    .carousel-edge-rail::before{content:"";position:absolute;inset:0;border-radius:999px}
    .carousel-edge-rail[data-edge="top"],.carousel-edge-rail[data-edge="bottom"]{width:72px;height:10px;left:0}
    .carousel-edge-rail[data-edge="left"],.carousel-edge-rail[data-edge="right"]{width:10px;height:72px;top:0}
    .carousel-edge-rail[data-edge="top"]{top:0}.carousel-edge-rail[data-edge="right"]{right:0;left:auto}.carousel-edge-rail[data-edge="bottom"]{bottom:0;top:auto}.carousel-edge-rail[data-edge="left"]{left:0}

    /* Directional polished-metal tracer: long tail into a concentrated white-hot head. */
    .carousel-edge-rail.head-end::before{background:linear-gradient(90deg,transparent 0%,rgba(216,184,106,.06) 10%,rgba(216,184,106,.18) 28%,rgba(247,204,88,.44) 49%,rgba(255,226,126,.82) 67%,rgba(255,241,176,1) 79%,rgba(255,252,229,1) 87%,rgba(255,255,255,1) 92%,rgba(255,255,255,1) 95%,rgba(255,246,197,1) 98%,rgba(216,184,106,.40) 99%,transparent 100%)}
    .carousel-edge-rail.head-start::before{background:linear-gradient(90deg,transparent 0%,rgba(216,184,106,.40) 1%,rgba(255,246,197,1) 2%,rgba(255,255,255,1) 5%,rgba(255,255,255,1) 8%,rgba(255,252,229,1) 13%,rgba(255,241,176,1) 21%,rgba(255,226,126,.82) 33%,rgba(247,204,88,.44) 51%,rgba(216,184,106,.18) 72%,rgba(216,184,106,.06) 90%,transparent 100%)}
    .carousel-edge-rail[data-edge="left"].head-end::before,.carousel-edge-rail[data-edge="right"].head-end::before{background:linear-gradient(180deg,transparent 0%,rgba(216,184,106,.06) 10%,rgba(216,184,106,.18) 28%,rgba(247,204,88,.44) 49%,rgba(255,226,126,.82) 67%,rgba(255,241,176,1) 79%,rgba(255,252,229,1) 87%,rgba(255,255,255,1) 92%,rgba(255,255,255,1) 95%,rgba(255,246,197,1) 98%,rgba(216,184,106,.40) 99%,transparent 100%)}
    .carousel-edge-rail[data-edge="left"].head-start::before,.carousel-edge-rail[data-edge="right"].head-start::before{background:linear-gradient(180deg,transparent 0%,rgba(216,184,106,.40) 1%,rgba(255,246,197,1) 2%,rgba(255,255,255,1) 5%,rgba(255,255,255,1) 8%,rgba(255,252,229,1) 13%,rgba(255,241,176,1) 21%,rgba(255,226,126,.82) 33%,rgba(247,204,88,.44) 51%,rgba(216,184,106,.18) 72%,rgba(216,184,106,.06) 90%,transparent 100%)}

    .carousel-edge-corner-probe{position:absolute;width:0;height:0;pointer-events:none;z-index:0}.carousel-edge-corner-probe[data-corner="tl"]{left:0;top:0}.carousel-edge-corner-probe[data-corner="tr"]{right:0;top:0}.carousel-edge-corner-probe[data-corner="br"]{right:0;bottom:0}.carousel-edge-corner-probe[data-corner="bl"]{left:0;bottom:0}
    .carousel-edge-corner-flare{position:absolute;left:0;top:0;width:42px;height:28px;z-index:28;pointer-events:none;opacity:0;border-radius:50%;background:radial-gradient(ellipse at center,rgba(255,255,246,1) 0%,rgba(255,251,224,1) 10%,rgba(255,231,145,.96) 27%,rgba(216,184,106,.62) 50%,rgba(216,184,106,.20) 72%,rgba(216,184,106,0) 100%);filter:drop-shadow(0 0 5px rgba(255,249,218,.94)) drop-shadow(0 0 14px rgba(216,184,106,.46));transform:translate(-50%,-50%) scale(.7) rotate(-18deg);transform-origin:center}
    .carousel-edge-corner-flare::before{content:"";position:absolute;left:4px;right:4px;top:50%;height:1px;transform:translateY(-50%);background:linear-gradient(90deg,transparent,rgba(255,231,145,.48) 24%,rgba(255,255,246,1) 49%,rgba(255,255,246,1) 51%,rgba(255,231,145,.48) 76%,transparent);box-shadow:0 0 7px rgba(255,244,190,.78)}
    .carousel-edge-corner-flare::after{content:"";position:absolute;left:9px;right:9px;top:7px;bottom:7px;border-radius:50%;border:1px solid rgba(255,232,150,.24);transform:rotate(-28deg)}
  `;
  document.head.appendChild(style);

  const edgeNames=['top','right','bottom','left'],cornerNames=['tl','tr','br','bl'];
  const pageFx=pages.map(page=>{
    const frame=document.createElement('span');frame.className='carousel-edge-frame';frame.setAttribute('aria-hidden','true');page.appendChild(frame);
    const rails={},probes={};
    edgeNames.forEach(name=>{const rail=document.createElement('span');rail.className='carousel-edge-rail';rail.dataset.edge=name;rail.setAttribute('aria-hidden','true');page.appendChild(rail);rails[name]=rail;});
    cornerNames.forEach(name=>{const probe=document.createElement('span');probe.className='carousel-edge-corner-probe';probe.dataset.corner=name;probe.setAttribute('aria-hidden','true');page.appendChild(probe);probes[name]=probe;});
    return{page,frame,rails,probes};
  });

  const flare=document.createElement('span');flare.className='carousel-edge-corner-flare';flare.setAttribute('aria-hidden','true');stage.appendChild(flare);
  const activePageIndex=()=>{const i=dots.findIndex(dot=>dot.classList.contains('on'));return i>=0?i:0};
  const normalize360=v=>((v%360)+360)%360;
  const signedAngleDelta=(from,to)=>{let d=normalize360(to-from);if(d>180)d-=360;return d};
  const readDriverAngle=()=>normalize360(parseFloat(barrel.style.getPropertyValue('--edge-angle'))||0);
  const clamp01=v=>Math.max(0,Math.min(1,v));
  const smoothstep=v=>{v=clamp01(v);return v*v*(3-2*v)};

  let pageWidth=1,pageHeight=1,perimeter=4;
  const cornerDistances=[{name:'tr',distance:0},{name:'br',distance:0},{name:'bl',distance:0},{name:'tl',distance:0}];
  const syncGeometry=()=>{const sample=pages[0];pageWidth=Math.max(1,sample.offsetWidth);pageHeight=Math.max(1,sample.offsetHeight);perimeter=2*(pageWidth+pageHeight);cornerDistances[0].distance=pageWidth;cornerDistances[1].distance=pageWidth+pageHeight;cornerDistances[2].distance=2*pageWidth+pageHeight;cornerDistances[3].distance=0;};
  syncGeometry();window.addEventListener('resize',syncGeometry,{passive:true});
  const segmentAtDistance=distance=>{let d=((distance%perimeter)+perimeter)%perimeter;if(d<pageWidth)return{edge:'top',offset:d};d-=pageWidth;if(d<pageHeight)return{edge:'right',offset:d};d-=pageHeight;if(d<pageWidth)return{edge:'bottom',offset:pageWidth-d};d-=pageWidth;return{edge:'left',offset:pageHeight-d};};
  const railHalf=36;
  const placeRail=(rail,edge,offset)=>{if(edge==='top'||edge==='bottom'){const x=Math.max(-railHalf,Math.min(pageWidth-railHalf,offset-railHalf));rail.style.transform=`translate3d(${x}px,0,0)`;}else{const y=Math.max(-railHalf,Math.min(pageHeight-railHalf,offset-railHalf));rail.style.transform=`translate3d(0,${y}px,0)`;}};
  const headAtEnd=(edge,sign)=>{const forward=edge==='top'||edge==='right';return sign>=0?forward:!forward;};

  const facingOf=page=>{try{if(typeof DOMMatrix!=='function')return page.classList.contains('edge-fx-primary')?1:.12;const bt=getComputedStyle(barrel).transform,pt=getComputedStyle(page).transform;const bm=new DOMMatrix(bt==='none'?undefined:bt),pm=new DOMMatrix(pt==='none'?undefined:pt);return clamp01(bm.multiply(pm).m11);}catch{return page.classList.contains('edge-fx-primary')?1:.12;}};
  const applyFacingLight=()=>{
    const motionStrength=Math.max(.30,Math.min(1,parseFloat(barrel.style.getPropertyValue('--edge-strength'))||.30));
    let brightestIndex=0,brightestFacing=-1;
    pageFx.forEach((state,index)=>{const f=facingOf(state.page);state.facing=f;if(f>brightestFacing){brightestFacing=f;brightestIndex=index;}});
    pageFx.forEach((state,index)=>{
      const f=state.facing||0,approach=smoothstep((f-.08)/.92),frontal=Math.pow(approach,.62),isBrightest=index===brightestIndex;
      const opacity=clamp01((.12+.88*frontal)*(.88+.12*motionStrength));
      const glare=clamp01(.28+.72*Math.pow(frontal,.44));
      state.page.classList.toggle('edge-fx-primary',isBrightest);
      const frameBright=(.80+.30*Math.pow(frontal,.72)).toFixed(3);
      const frameHalo=(.05+.22*Math.pow(frontal,.90)).toFixed(3);
      const frameBlur=(1+4.5*Math.pow(frontal,.86)).toFixed(2);
      state.frame.style.opacity='1';
      state.frame.style.filter=`brightness(${frameBright}) drop-shadow(0 0 ${frameBlur}px rgba(216,184,106,${frameHalo}))`;
      Object.values(state.rails).forEach(rail=>{
        rail.style.opacity=rail.classList.contains('is-active')?opacity.toFixed(3):'0';
        const whiteAlpha=Math.min(1,.72+.28*glare),goldAlpha=Math.min(1,.58+.38*glare);
        const whiteBlur=5.25+8.75*glare,goldBlur=15.75+26.25*glare;
        rail.style.filter=`brightness(1.75) drop-shadow(0 0 ${whiteBlur.toFixed(1)}px rgba(255,252,230,${whiteAlpha.toFixed(2)})) drop-shadow(0 0 ${goldBlur.toFixed(1)}px rgba(216,184,106,${goldAlpha.toFixed(2)}))`;
      });
    });
  };

  const renderPerimeterLight=(distance,sign)=>{const segment=segmentAtDistance(distance);pageFx.forEach(({rails})=>{edgeNames.forEach(name=>{const rail=rails[name],active=name===segment.edge;rail.classList.toggle('is-active',active);if(!active){rail.classList.remove('head-end','head-start');return;}const end=headAtEnd(segment.edge,sign);rail.classList.toggle('head-end',end);rail.classList.toggle('head-start',!end);});placeRail(rails[segment.edge],segment.edge,segment.offset);});applyFacingLight();};
  const signedPerimeterDelta=(from,to)=>{let d=((to-from)%perimeter+perimeter)%perimeter;if(d>perimeter/2)d-=perimeter;return d};
  const crossedDistance=(from,to,target)=>{const travel=signedPerimeterDelta(from,to),delta=signedPerimeterDelta(from,target);if(Math.abs(travel)<.001)return false;return travel>0?delta>=0&&delta<=travel:delta<=0&&delta>=travel;};

  let flareAnimation=null,lastFlareAt=0,activeFlareProbe=null;
  const positionFlareAtProbe=()=>{
    if(!activeFlareProbe)return false;
    const p=activeFlareProbe.getBoundingClientRect(),s=stage.getBoundingClientRect();
    const x=p.left-s.left,y=p.top-s.top;
    if(!Number.isFinite(x)||!Number.isFinite(y))return false;
    flare.style.left=`${x}px`;flare.style.top=`${y}px`;return true;
  };
  const clearFlare=()=>{flareAnimation?.cancel();flareAnimation=null;activeFlareProbe=null;flare.style.opacity='0';};
  const fireCornerFlare=(cornerName,now)=>{
    if(now-lastFlareAt<180)return;
    const state=pageFx[activePageIndex()]||pageFx[0],probe=state.probes[cornerName];
    if(!probe)return;
    activeFlareProbe=probe;
    if(!positionFlareAtProbe()){activeFlareProbe=null;return;}
    lastFlareAt=now;flareAnimation?.cancel();
    const peak=2+Math.random();
    const frames=[{opacity:0,transform:'translate(-50%,-50%) scale(.72) rotate(-18deg)',offset:0},{opacity:.62,transform:`translate(-50%,-50%) scale(${(peak*.82).toFixed(2)}) rotate(-8deg)`,offset:.22},{opacity:1,transform:`translate(-50%,-50%) scale(${peak.toFixed(2)}) rotate(8deg)`,offset:.44},{opacity:.90,transform:`translate(-50%,-50%) scale(${(peak*.92).toFixed(2)}) rotate(19deg)`,offset:.62},{opacity:.46,transform:`translate(-50%,-50%) scale(${(peak*.72).toFixed(2)}) rotate(10deg)`,offset:.80},{opacity:0,transform:`translate(-50%,-50%) scale(${(peak*.54).toFixed(2)}) rotate(0deg)`,offset:1}];
    if(flare.animate){
      flareAnimation=flare.animate(frames,{duration:620,easing:'cubic-bezier(.22,.62,.30,1)',fill:'both'});
      flareAnimation.onfinish=()=>{flareAnimation=null;activeFlareProbe=null;flare.style.opacity='0';};
    }
  };

  let perimeterDistance=0,lastDistance=0,lastDriverAngle=null,lastMotionSign=1,raf=0;
  const clearRails=()=>pageFx.forEach(({rails})=>edgeNames.forEach(name=>{const rail=rails[name];rail.classList.remove('is-active','head-end','head-start');rail.style.opacity='0';}));
  const tick=now=>{
    raf=0;
    if(!barrel.classList.contains('edge-motion')){lastDriverAngle=null;clearFlare();clearRails();applyFacingLight();return;}
    const driverAngle=readDriverAngle();if(lastDriverAngle===null)lastDriverAngle=driverAngle;
    const angleDelta=signedAngleDelta(lastDriverAngle,driverAngle);lastDriverAngle=driverAngle;if(Math.abs(angleDelta)>.001)lastMotionSign=Math.sign(angleDelta)||lastMotionSign;
    lastDistance=perimeterDistance;perimeterDistance=((perimeterDistance+(angleDelta/360)*perimeter)%perimeter+perimeter)%perimeter;
    renderPerimeterLight(perimeterDistance,lastMotionSign);
    if(activeFlareProbe)positionFlareAtProbe();
    for(const corner of cornerDistances){if(crossedDistance(lastDistance,perimeterDistance,corner.distance)){fireCornerFlare(corner.name,now);break;}}
    if(activeFlareProbe)positionFlareAtProbe();
    raf=requestAnimationFrame(tick);
  };
  const syncLoop=()=>{
    if(barrel.classList.contains('edge-motion')){
      if(!raf){syncGeometry();lastDriverAngle=readDriverAngle();renderPerimeterLight(perimeterDistance,lastMotionSign);if(activeFlareProbe)positionFlareAtProbe();raf=requestAnimationFrame(tick);}
    }else{
      if(raf)cancelAnimationFrame(raf);raf=0;lastDriverAngle=null;clearFlare();clearRails();applyFacingLight();
    }
  };
  if('MutationObserver'in window)new MutationObserver(syncLoop).observe(barrel,{attributes:true,attributeFilter:['class']});syncLoop();
})();
