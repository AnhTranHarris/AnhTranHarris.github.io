/* Harris Portfolio: modular recruiter CTA arrow with inertial pointer-reactive glint and hero corner blooms. */
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
    .progression-arrow.is-autonomous .pa-glint{stroke-dasharray:24 420;animation:progressionGlint 4200ms cubic-bezier(.45,0,.55,1) infinite}
    .progression-arrow.is-autonomous .pa-core{stroke-dasharray:8 436;animation:progressionGlint 4200ms cubic-bezier(.45,0,.55,1) infinite}

    .pa-bloom{pointer-events:none;opacity:0;transform-box:fill-box;transform-origin:center;--hero-scale:12}
    .pa-bloom .pa-bloom-aura{fill:rgba(216,184,106,.28);stroke:rgba(255,226,126,.30);stroke-width:1.8;filter:drop-shadow(0 0 5px rgba(216,184,106,.92)) drop-shadow(0 0 12px rgba(245,193,72,.76))}
    .pa-bloom .pa-bloom-exposure{fill:rgba(247,190,54,.62);stroke:rgba(255,229,131,.88);stroke-width:1.35;filter:drop-shadow(0 0 4px rgba(255,211,81,.98)) drop-shadow(0 0 8px rgba(255,196,54,.88))}
    .pa-bloom .pa-bloom-inner{fill:rgba(255,226,112,.92);stroke:rgba(255,244,187,.98);stroke-width:.9;filter:drop-shadow(0 0 3px rgba(255,239,162,1))}
    .pa-bloom .pa-bloom-core{fill:#fffdeb;stroke:#fff7c9;stroke-width:.6;filter:drop-shadow(0 0 2px rgba(255,255,238,1)) drop-shadow(0 0 5px rgba(255,235,135,.98))}
    .pa-bloom.is-blooming{animation:cornerHeroBloom 760ms cubic-bezier(.16,.76,.18,1) both}
    @keyframes cornerHeroBloom{
      0%{opacity:0;transform:scale(.45)}
      12%{opacity:.92;transform:scale(calc(var(--hero-scale) * .54))}
      23%{opacity:1;transform:scale(var(--hero-scale))}
      38%{opacity:1;transform:scale(calc(var(--hero-scale) * .86))}
      54%{opacity:.88;transform:scale(calc(var(--hero-scale) * .68))}
      100%{opacity:0;transform:scale(calc(var(--hero-scale) * .36))}
    }

    @keyframes progressionGlint{0%,20%{stroke-dashoffset:446;opacity:0}27%{opacity:.95}54%{opacity:1}68%{stroke-dashoffset:0;opacity:.88}74%,100%{stroke-dashoffset:-34;opacity:0}}
    @media(max-width:900px){.progression-arrow{width:86px;height:104px;transform:rotate(90deg) translateZ(0);transform-origin:43px 52px;margin:2px 0 0 20px}}
    @media(prefers-reduced-motion:reduce){.progression-arrow .pa-glint,.progression-arrow .pa-core{animation:none!important;transition:none!important;opacity:.38;stroke-dashoffset:0}.pa-bloom{display:none}}
  `;
  document.head.appendChild(style);

  const corners=[[8,36],[94,36],[94,18],[136,50],[94,82],[94,64],[8,64]];
  const bloomMarkup=corners.map(([x,y],i)=>`<g class="pa-bloom" data-bloom="${i}" transform="translate(${x} ${y})"><circle class="pa-bloom-aura" r="6.2"/><circle class="pa-bloom-exposure" r="3.8"/><circle class="pa-bloom-inner" r="2.25"/><circle class="pa-bloom-core" r="1.05"/></g>`).join('');

  mount.innerHTML=`<svg class="progression-arrow" viewBox="0 0 144 100" role="img" aria-label="Arrow pointing toward the portfolio carousel" focusable="false">
    <path class="pa-depth" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    <path class="pa-face" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    ${bloomMarkup}
    <path class="pa-rim" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    <path class="pa-glint" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    <path class="pa-core" d="M8 36H94V18L136 50 94 82V64H8Z"/>
  </svg>`;

  const svg=mount.querySelector('.progression-arrow');
  const guide=svg.querySelector('.pa-rim');
  const glint=svg.querySelector('.pa-glint');
  const core=svg.querySelector('.pa-core');
  const blooms=[...svg.querySelectorAll('.pa-bloom')];
  if(!svg||!guide||!glint||!core)return;

  if(reduce)return;
  if(coarse){
    svg.classList.add('is-autonomous');
    return;
  }

  const total=guide.getTotalLength();
  const glintLength=Math.min(28,total*.075);
  const coreLength=Math.min(10,total*.03);
  glint.style.strokeDasharray=`${glintLength} ${Math.max(1,total-glintLength)}`;
  core.style.strokeDasharray=`${coreLength} ${Math.max(1,total-coreLength)}`;

  const nearestPathLengthToPoint=(x,y)=>{
    const samples=72;
    let bestLength=0,bestDistance=Infinity;
    for(let i=0;i<=samples;i++){
      const length=total*(i/samples);
      const point=guide.getPointAtLength(length);
      const dx=point.x-x,dy=point.y-y;
      const distance=dx*dx+dy*dy;
      if(distance<bestDistance){bestDistance=distance;bestLength=length;}
    }
    let step=total/samples;
    for(let pass=0;pass<6;pass++){
      step*=.5;
      for(const candidate of [(bestLength-step+total)%total,(bestLength+step)%total]){
        const point=guide.getPointAtLength(candidate);
        const dx=point.x-x,dy=point.y-y;
        const distance=dx*dx+dy*dy;
        if(distance<bestDistance){bestDistance=distance;bestLength=candidate;}
      }
    }
    return bestLength;
  };

  const cornerStates=corners.map(([x,y],index)=>({length:nearestPathLengthToPoint(x,y),node:blooms[index],inside:false,lastFired:-Infinity}));

  let clientX=0,clientY=0,targetLength=0,currentLength=0;
  let searchRaf=0,motionRaf=0,fadeTimer=0,lastFrame=0,initialized=false,pointerFresh=false;
  const FOLLOW_RATE=7.2;
  const SETTLE_EPSILON=.45;
  const IDLE_BEFORE_FADE=260;
  const CORNER_RADIUS=Math.max(8,total*.022);
  const CORNER_COOLDOWN=900;

  const nearestLength=(x,y)=>{
    const ctm=svg.getScreenCTM();
    if(!ctm)return currentLength;
    const local=new DOMPoint(x,y).matrixTransform(ctm.inverse());
    const samples=30;
    let bestLength=0,bestDistance=Infinity;
    for(let i=0;i<=samples;i++){
      const length=total*(i/samples);
      const point=guide.getPointAtLength(length);
      const dx=point.x-local.x,dy=point.y-local.y;
      const distance=dx*dx+dy*dy;
      if(distance<bestDistance){bestDistance=distance;bestLength=length;}
    }
    let step=total/samples;
    for(let pass=0;pass<5;pass++){
      step*=.5;
      const before=(bestLength-step+total)%total;
      const after=(bestLength+step)%total;
      const p1=guide.getPointAtLength(before),p2=guide.getPointAtLength(after);
      const d1=(p1.x-local.x)**2+(p1.y-local.y)**2;
      const d2=(p2.x-local.x)**2+(p2.y-local.y)**2;
      if(d1<bestDistance){bestDistance=d1;bestLength=before;}
      if(d2<bestDistance){bestDistance=d2;bestLength=after;}
    }
    return bestLength;
  };

  const shortestDelta=(from,to)=>{
    let delta=(to-from)%total;
    if(delta>total*.5)delta-=total;
    if(delta<-total*.5)delta+=total;
    return delta;
  };

  const circularDistance=(a,b)=>Math.abs(shortestDelta(a,b));

  const fireCornerBloom=(state,now)=>{
    if(!state.node||now-state.lastFired<CORNER_COOLDOWN)return;
    state.lastFired=now;
    state.node.style.setProperty('--hero-scale',(10+Math.random()*5).toFixed(2));
    state.node.classList.remove('is-blooming');
    void state.node.getBoundingClientRect();
    state.node.classList.add('is-blooming');
  };

  const updateCornerBlooms=(length,now)=>{
    for(const state of cornerStates){
      const inside=circularDistance(length,state.length)<=CORNER_RADIUS;
      if(inside&&!state.inside)fireCornerBloom(state,now);
      state.inside=inside;
    }
  };

  const paint=(length,now=performance.now())=>{
    glint.style.strokeDashoffset=String(total-length+glintLength*.5);
    core.style.strokeDashoffset=String(total-length+coreLength*.5);
    updateCornerBlooms(length,now);
  };

  const animateGlint=now=>{
    motionRaf=0;
    const dt=Math.min(40,lastFrame?now-lastFrame:16.7);
    lastFrame=now;
    const delta=shortestDelta(currentLength,targetLength);
    const follow=1-Math.exp(-FOLLOW_RATE*dt/1000);
    currentLength=(currentLength+delta*follow+total)%total;
    paint(currentLength,now);

    if(Math.abs(delta)>SETTLE_EPSILON||pointerFresh){
      pointerFresh=false;
      motionRaf=requestAnimationFrame(animateGlint);
    }else{
      currentLength=targetLength;
      paint(currentLength,now);
      lastFrame=0;
    }
  };

  const updateTarget=()=>{
    searchRaf=0;
    targetLength=nearestLength(clientX,clientY);
    if(!initialized){
      initialized=true;
      currentLength=targetLength;
      paint(currentLength);
    }
    pointerFresh=true;
    svg.classList.add('is-pointer-active');
    if(!motionRaf){lastFrame=0;motionRaf=requestAnimationFrame(animateGlint);}
  };

  const onPointerMove=event=>{
    if(event.pointerType&&event.pointerType!=='mouse'&&event.pointerType!=='pen')return;
    clientX=event.clientX;clientY=event.clientY;
    if(!searchRaf)searchRaf=requestAnimationFrame(updateTarget);
    clearTimeout(fadeTimer);
    fadeTimer=setTimeout(()=>svg.classList.remove('is-pointer-active'),IDLE_BEFORE_FADE);
  };

  window.addEventListener('pointermove',onPointerMove,{passive:true});
})();