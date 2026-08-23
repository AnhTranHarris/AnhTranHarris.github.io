/* Harris Portfolio: modular recruiter CTA arrow with inertial pointer glint and swept subtle corner flares. */
(()=>{
  const mount=document.querySelector('[data-progression-arrow]');
  if(!mount)return;

  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const coarse=window.matchMedia?.('(hover: none), (pointer: coarse)')?.matches;
  const style=document.createElement('style');
  style.textContent=`
    .progression-arrow{display:block;width:clamp(92px,9vw,138px);height:66px;flex:0 0 auto;overflow:visible;filter:drop-shadow(0 3px 0 rgba(82,53,14,.72)) drop-shadow(0 0 7px rgba(216,184,106,.24));transform:translateZ(0)}
    .progression-arrow .pa-depth{fill:rgba(87,57,16,.44);stroke:rgba(120,83,29,.82);stroke-width:3;transform:translate(4px,5px)}
    .progression-arrow .pa-face{fill:rgba(62,45,18,.34);stroke:#b89745;stroke-width:3}
    .progression-arrow .pa-rim{fill:none;stroke:rgba(255,226,126,.72);stroke-width:1.25}
    .progression-arrow .pa-glint,.progression-arrow .pa-core{fill:none;stroke-linecap:round;stroke-linejoin:round;opacity:0;transition:opacity 180ms ease-out;pointer-events:none}
    .progression-arrow .pa-glint{stroke:#fff0b0;stroke-width:4;filter:drop-shadow(0 0 3px rgba(255,240,176,.95)) drop-shadow(0 0 8px rgba(216,184,106,.72))}
    .progression-arrow .pa-core{stroke:rgba(255,255,238,.96);stroke-width:1.4}
    .progression-arrow.is-pointer-active .pa-glint{opacity:1}
    .progression-arrow.is-pointer-active .pa-core{opacity:.96}

    .pa-bloom-anchor,.pa-bloom{pointer-events:none}
    .pa-bloom{opacity:0;transform-box:fill-box;transform-origin:center}
    .pa-bloom-aura{stroke:none;filter:drop-shadow(0 0 4px rgba(255,233,151,.42)) drop-shadow(0 0 9px rgba(216,184,106,.30))}
    .pa-bloom-orbit{fill:none;stroke:rgba(255,229,150,.19);stroke-width:.52;filter:drop-shadow(0 0 2px rgba(255,218,116,.26))}
    .pa-bloom-streak{stroke:url(#pa-flare-streak);stroke-width:.72;stroke-linecap:round;filter:drop-shadow(0 0 3px rgba(255,239,174,.54))}
    .pa-bloom-streak-secondary{stroke:url(#pa-flare-streak-soft);stroke-width:.40;stroke-linecap:round;filter:drop-shadow(0 0 2px rgba(255,235,156,.30))}
    .pa-bloom-core{fill:#fffef2;stroke:rgba(255,249,216,.98);stroke-width:.24;filter:drop-shadow(0 0 2px rgba(255,255,244,1)) drop-shadow(0 0 5px rgba(255,228,126,.82))}

    @media(max-width:900px){.progression-arrow{width:86px;height:104px;transform:rotate(90deg) translateZ(0);transform-origin:43px 52px;margin:2px 0 0 20px}}
    @media(prefers-reduced-motion:reduce){
      .progression-arrow .pa-glint,.progression-arrow .pa-core{transition:none!important;opacity:.38;stroke-dashoffset:0}
      .pa-bloom-anchor{display:none}
    }
    html[data-effects="full"] .pa-bloom-anchor{display:inline!important}
    html[data-effects="full"] .progression-arrow .pa-glint,
    html[data-effects="full"] .progression-arrow .pa-core{transition:opacity 180ms ease-out!important}
  `;
  document.head.appendChild(style);

  const corners=[[8,36],[94,36],[94,18],[136,50],[94,82],[94,64],[8,64]];
  const bloomMarkup=corners.map(([x,y],i)=>`<g class="pa-bloom-anchor" data-bloom="${i}" transform="translate(${x} ${y})"><g class="pa-bloom"><ellipse class="pa-bloom-aura" rx="8.7" ry="5.5" fill="url(#pa-flare-aura)"/><ellipse class="pa-bloom-orbit" rx="6.5" ry="3.8" transform="rotate(-27)"/><line class="pa-bloom-streak" x1="-6.0" y1="0" x2="6.0" y2="0"/><line class="pa-bloom-streak-secondary" x1="-3.5" y1="-1.2" x2="3.9" y2="1.2"/><circle class="pa-bloom-core" r="1.12"/></g></g>`).join('');

  mount.innerHTML=`<svg class="progression-arrow" viewBox="0 0 144 100" role="img" aria-label="Arrow pointing toward the portfolio carousel" focusable="false">
    <defs>
      <radialGradient id="pa-flare-aura" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" stop-color="#fffef4" stop-opacity="1"/>
        <stop offset="12%" stop-color="#fff6cf" stop-opacity=".98"/>
        <stop offset="27%" stop-color="#ffe08b" stop-opacity=".82"/>
        <stop offset="48%" stop-color="#d8b86a" stop-opacity=".42"/>
        <stop offset="72%" stop-color="#d8b86a" stop-opacity=".14"/>
        <stop offset="90%" stop-color="#d8b86a" stop-opacity=".035"/>
        <stop offset="100%" stop-color="#d8b86a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="pa-flare-streak" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fff0b0" stop-opacity="0"/>
        <stop offset="25%" stop-color="#ffe79f" stop-opacity=".36"/>
        <stop offset="48%" stop-color="#fffef2" stop-opacity=".96"/>
        <stop offset="52%" stop-color="#fffef2" stop-opacity="1"/>
        <stop offset="75%" stop-color="#ffe79f" stop-opacity=".36"/>
        <stop offset="100%" stop-color="#fff0b0" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="pa-flare-streak-soft" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fff6cf" stop-opacity="0"/>
        <stop offset="50%" stop-color="#fff6cf" stop-opacity=".52"/>
        <stop offset="100%" stop-color="#fff6cf" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <path class="pa-depth" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    <path class="pa-face" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    ${bloomMarkup}
    <path class="pa-rim" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    <path class="pa-glint" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    <path class="pa-core" d="M8 36H94V18L136 50 94 82V64H8Z"/>
  </svg>`;

  const svg=mount.querySelector('.progression-arrow');
  const guide=svg?.querySelector('.pa-rim');
  const glint=svg?.querySelector('.pa-glint');
  const core=svg?.querySelector('.pa-core');
  const bloomNodes=[...svg?.querySelectorAll('.pa-bloom')||[]];
  if(!svg||!guide||!glint||!core)return;
  if(reduce)return;

  const total=guide.getTotalLength();
  const glintLength=Math.min(28,total*.075);
  const coreLength=Math.min(10,total*.03);
  glint.style.strokeDasharray=`${glintLength} ${Math.max(1,total-glintLength)}`;
  core.style.strokeDasharray=`${coreLength} ${Math.max(1,total-coreLength)}`;

  const nearestPathLengthToPoint=(x,y)=>{
    const samples=72;
    let bestLength=0,bestDistance=Infinity;
    for(let i=0;i<=samples;i++){
      const length=total*(i/samples),point=guide.getPointAtLength(length);
      const dx=point.x-x,dy=point.y-y,distance=dx*dx+dy*dy;
      if(distance<bestDistance){bestDistance=distance;bestLength=length;}
    }
    let step=total/samples;
    for(let pass=0;pass<6;pass++){
      step*=.5;
      for(const candidate of [(bestLength-step+total)%total,(bestLength+step)%total]){
        const point=guide.getPointAtLength(candidate),dx=point.x-x,dy=point.y-y,distance=dx*dx+dy*dy;
        if(distance<bestDistance){bestDistance=distance;bestLength=candidate;}
      }
    }
    return bestLength;
  };

  const cornerStates=corners.map(([x,y],index)=>({length:nearestPathLengthToPoint(x,y),node:bloomNodes[index],armed:true,lastFired:-Infinity,animation:null}));
  const shortestDelta=(from,to)=>{let delta=(to-from)%total;if(delta>total*.5)delta-=total;if(delta<-total*.5)delta+=total;return delta;};
  const circularDistance=(a,b)=>Math.abs(shortestDelta(a,b));

  const BASE_CORNER_RADIUS=Math.max(8,total*.022);
  const CORNER_RADIUS=BASE_CORNER_RADIUS*1.05;
  const CORNER_REARM_RADIUS=CORNER_RADIUS*1.35;
  const CORNER_COOLDOWN=650;

  const sweptAcrossCorner=(from,to,corner,radius)=>{
    const travel=shortestDelta(from,to),cornerDelta=shortestDelta(from,corner);
    if(Math.abs(travel)<.001)return Math.abs(cornerDelta)<=radius;
    return travel>0?cornerDelta>=-radius&&cornerDelta<=travel+radius:cornerDelta<=radius&&cornerDelta>=travel-radius;
  };

  const fireCornerBloom=(state,now)=>{
    if(!state.node||!state.armed||now-state.lastFired<CORNER_COOLDOWN)return;
    state.armed=false;state.lastFired=now;state.animation?.cancel();
    const bloom=2+Math.random();
    const frames=[
      {opacity:0,transform:'scale(.72) rotate(-18deg)',offset:0},
      {opacity:.52,transform:`scale(${(bloom*.84).toFixed(2)}) rotate(-9deg)`,offset:.20},
      {opacity:.90,transform:`scale(${bloom.toFixed(2)}) rotate(4deg)`,offset:.42},
      {opacity:.82,transform:`scale(${(bloom*.96).toFixed(2)}) rotate(19deg)`,offset:.58},
      {opacity:.40,transform:`scale(${(bloom*.80).toFixed(2)}) rotate(10deg)`,offset:.76},
      {opacity:0,transform:`scale(${(bloom*.60).toFixed(2)}) rotate(2deg)`,offset:1}
    ];
    if(state.node.animate){
      state.animation=state.node.animate(frames,{duration:680,easing:'cubic-bezier(.22,.62,.30,1)',fill:'both'});
      state.animation.onfinish=()=>{state.animation=null;};
    }else{
      state.node.style.opacity='.84';state.node.style.transform=`scale(${bloom.toFixed(2)}) rotate(4deg)`;
      setTimeout(()=>{state.node.style.opacity='0';state.node.style.transform='scale(.72) rotate(0deg)';},190);
    }
  };

  const updateCornerBlooms=(from,to,now)=>{
    for(const state of cornerStates){
      if(!state.armed&&circularDistance(to,state.length)>CORNER_REARM_RADIUS)state.armed=true;
      if(sweptAcrossCorner(from,to,state.length,CORNER_RADIUS))fireCornerBloom(state,now);
    }
  };

  let previousLength=0;
  const paint=(length,now=performance.now())=>{
    glint.style.strokeDashoffset=String(total-length+glintLength*.5);
    core.style.strokeDashoffset=String(total-length+coreLength*.5);
    updateCornerBlooms(previousLength,length,now);
    previousLength=length;
  };

  if(coarse){
    const TRAVEL_MS=2300,PAUSE_MS=1900;
    let autoRaf=0,autoTimer=0,cycleStart=0;
    const runCycle=()=>{
      if(document.hidden){autoTimer=setTimeout(runCycle,500);return;}
      cycleStart=performance.now();previousLength=0;paint(0,cycleStart);svg.classList.add('is-pointer-active');
      const tick=now=>{
        const progress=Math.min(1,(now-cycleStart)/TRAVEL_MS);
        const eased=progress<.5?2*progress*progress:1-Math.pow(-2*progress+2,2)/2;
        paint(eased*total,now);
        if(progress<1){autoRaf=requestAnimationFrame(tick);return;}
        svg.classList.remove('is-pointer-active');previousLength=total;autoTimer=setTimeout(runCycle,PAUSE_MS);
      };
      autoRaf=requestAnimationFrame(tick);
    };
    const onVisibility=()=>{if(document.hidden){cancelAnimationFrame(autoRaf);clearTimeout(autoTimer);}else{clearTimeout(autoTimer);autoTimer=setTimeout(runCycle,250);}};
    document.addEventListener('visibilitychange',onVisibility,{passive:true});
    runCycle();
    return;
  }

  let clientX=0,clientY=0,targetLength=0,currentLength=0;
  let searchRaf=0,motionRaf=0,fadeTimer=0,lastFrame=0,initialized=false,pointerFresh=false;
  const FOLLOW_RATE=7.2,SETTLE_EPSILON=.45,IDLE_BEFORE_FADE=260;

  const nearestLength=(x,y)=>{
    const ctm=svg.getScreenCTM();if(!ctm)return currentLength;
    const local=new DOMPoint(x,y).matrixTransform(ctm.inverse());
    const samples=30;let bestLength=0,bestDistance=Infinity;
    for(let i=0;i<=samples;i++){
      const length=total*(i/samples),point=guide.getPointAtLength(length),dx=point.x-local.x,dy=point.y-local.y,distance=dx*dx+dy*dy;
      if(distance<bestDistance){bestDistance=distance;bestLength=length;}
    }
    let step=total/samples;
    for(let pass=0;pass<5;pass++){
      step*=.5;
      for(const candidate of [(bestLength-step+total)%total,(bestLength+step)%total]){
        const point=guide.getPointAtLength(candidate),dx=point.x-local.x,dy=point.y-local.y,distance=dx*dx+dy*dy;
        if(distance<bestDistance){bestDistance=distance;bestLength=candidate;}
      }
    }
    return bestLength;
  };

  const animateGlint=now=>{
    motionRaf=0;
    const dt=Math.min(40,lastFrame?now-lastFrame:16.7);lastFrame=now;
    const delta=shortestDelta(currentLength,targetLength),follow=1-Math.exp(-FOLLOW_RATE*dt/1000);
    currentLength=(currentLength+delta*follow+total)%total;paint(currentLength,now);
    if(Math.abs(delta)>SETTLE_EPSILON||pointerFresh){pointerFresh=false;motionRaf=requestAnimationFrame(animateGlint);}
    else{currentLength=targetLength;paint(currentLength,now);lastFrame=0;}
  };

  const updateTarget=()=>{
    searchRaf=0;targetLength=nearestLength(clientX,clientY);
    if(!initialized){initialized=true;currentLength=targetLength;previousLength=targetLength;glint.style.strokeDashoffset=String(total-currentLength+glintLength*.5);core.style.strokeDashoffset=String(total-currentLength+coreLength*.5);}
    pointerFresh=true;svg.classList.add('is-pointer-active');
    if(!motionRaf){lastFrame=0;motionRaf=requestAnimationFrame(animateGlint);}
  };

  const onPointerMove=event=>{
    if(event.pointerType&&event.pointerType!=='mouse'&&event.pointerType!=='pen')return;
    clientX=event.clientX;clientY=event.clientY;if(!searchRaf)searchRaf=requestAnimationFrame(updateTarget);
    clearTimeout(fadeTimer);fadeTimer=setTimeout(()=>svg.classList.remove('is-pointer-active'),IDLE_BEFORE_FADE);
  };
  window.addEventListener('pointermove',onPointerMove,{passive:true});
})();