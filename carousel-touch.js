/* Harris Portfolio: five-card carousel + independent ambient spotlight system. */
(() => {
  const stage = document.querySelector('.stage');
  const barrel = document.querySelector('#barrel');
  if (!stage || !barrel) return;

  const pages = [...barrel.querySelectorAll('.page')];
  const dots = [...document.querySelectorAll('.dot')];
  const spotlightElements = [...document.querySelectorAll('.spotlight')];
  const CARD_COUNT = pages.length;
  const STEP = 360 / CARD_COUNT;

  const DRAG_GAIN=.41,DIRECTION_LOCK=7,MIN_RELEASE_SPEED=40,SPRING=7.5,DAMPING=4.8,BUTTON_SPEED=230,MAX_RELEASE_SPEED=300,MIN_SETTLE_TIME=.62,MAX_SETTLE_TIME=1.15;
  const SPOTLIGHT_MIN_SECONDS=15,SPOTLIGHT_MAX_SECONDS=200,CARD_HEIGHT_SCALE=1.15;
  const supports3D=!!(window.CSS?.supports?.('transform-style','preserve-3d')&&window.CSS?.supports?.('perspective','1px'));
  const supportsPointers='PointerEvent' in window;
  const fallbackMode=!supports3D||!supportsPointers||!window.requestAnimationFrame;

  let angle=0,velocity=0,raf=0,gesture='idle',activePointer=null,startX=0,startY=0,lastX=0,lastT=0,generation=0,geometryRaf=0,zone=null;
  const normalize=n=>((n%CARD_COUNT)+CARD_COUNT)%CARD_COUNT;
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  function setDot(index){dots.forEach((dot,i)=>dot.classList.toggle('on',i===normalize(index)))}
  function promoteBarrel(){barrel.style.willChange='transform'}
  function releaseBarrel(){barrel.style.willChange='auto'}

  const SPOTLIGHT_STARTS=[[-38,-30],[0,-34],[38,-30],[-42,0],[0,0],[42,0],[-38,30],[0,34],[38,30],[-20,-15],[22,14],[-14,22]];
  const spotlightStates=spotlightElements.map((el,index)=>({el,index,animation:null,lastStart:-1,activeStart:-1}));
  function randomSpotlightSeconds(){return SPOTLIGHT_MIN_SECONDS+Math.random()*(SPOTLIGHT_MAX_SECONDS-SPOTLIGHT_MIN_SECONDS)}
  function chooseIndependentStart(state){
    const occupied=new Set(spotlightStates.filter(other=>other!==state&&other.activeStart>=0).map(other=>other.activeStart));
    const available=SPOTLIGHT_STARTS.map((_,index)=>index).filter(index=>index!==state.lastStart&&!occupied.has(index));
    const pool=available.length?available:SPOTLIGHT_STARTS.map((_,index)=>index).filter(index=>index!==state.lastStart);
    const next=pool[Math.floor(Math.random()*pool.length)]??0;state.lastStart=next;state.activeStart=next;return next;
  }
  function spotlightScaleRange(type){if(type==='large')return[.92,1.12];if(type==='medium')return[.88,1.16];return[.84,1.20]}
  function startSpotlightCycle(state){
    const {el}=state;if(!el)return;
    const type=el.dataset.spotlight||'large',startIndex=chooseIndependentStart(state),[sx,sy]=SPOTLIGHT_STARTS[startIndex],duration=randomSpotlightSeconds()*1000;
    const ex=clamp(sx+(-46+Math.random()*92),-46,46),ey=clamp(sy+(-38+Math.random()*76),-38,38),mx=clamp((sx+ex)/2+(-18+Math.random()*36),-46,46),my=clamp((sy+ey)/2+(-14+Math.random()*28),-38,38);
    const [minScale,maxScale]=spotlightScaleRange(type),s0=minScale+Math.random()*(maxScale-minScale),s1=minScale+Math.random()*(maxScale-minScale),s2=minScale+Math.random()*(maxScale-minScale);
    const p1=.78+Math.random()*.10,p2=.92+Math.random()*.08,p3=.82+Math.random()*.12,p4=.94+Math.random()*.06,p5=.80+Math.random()*.12;
    state.animation?.cancel();
    if(el.animate&&!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
      state.animation=el.animate([
        {transform:`translate(-50%,-50%) translate3d(${sx}vw,${sy}vh,0) scale(${s0})`,opacity:0,offset:0},
        {transform:`translate(-50%,-50%) translate3d(${sx*.82+mx*.18}vw,${sy*.82+my*.18}vh,0) scale(${(s0*2+s1)/3})`,opacity:p1*.55,offset:.12},
        {transform:`translate(-50%,-50%) translate3d(${sx*.60+mx*.40}vw,${sy*.60+my*.40}vh,0) scale(${(s0+s1)/2})`,opacity:p1,offset:.24},
        {transform:`translate(-50%,-50%) translate3d(${mx}vw,${my}vh,0) scale(${s1})`,opacity:p2,offset:.43},
        {transform:`translate(-50%,-50%) translate3d(${mx*.70+ex*.30}vw,${my*.70+ey*.30}vh,0) scale(${(s1*2+s2)/3})`,opacity:p3,offset:.58},
        {transform:`translate(-50%,-50%) translate3d(${mx*.42+ex*.58}vw,${my*.42+ey*.58}vh,0) scale(${(s1+s2)/2})`,opacity:p4,offset:.72},
        {transform:`translate(-50%,-50%) translate3d(${mx*.16+ex*.84}vw,${my*.16+ey*.84}vh,0) scale(${(s1+s2*2)/3})`,opacity:p5*.55,offset:.88},
        {transform:`translate(-50%,-50%) translate3d(${ex}vw,${ey}vh,0) scale(${s2})`,opacity:0,offset:1}
      ],{duration,easing:'ease-in-out',fill:'forwards'});
      state.animation.onfinish=()=>{state.animation=null;if(!document.hidden)startSpotlightCycle(state)};
    }else{el.style.transform=`translate(-50%,-50%) translate3d(${sx}vw,${sy}vh,0) scale(${s0})`;el.style.opacity='.82'}
  }
  function syncSpotlightPlayback(){spotlightStates.forEach(state=>{if(!state.animation){if(!document.hidden)startSpotlightCycle(state);return}if(document.hidden)state.animation.pause();else state.animation.play()})}
  if(spotlightStates.length){
    spotlightStates.forEach((state,index)=>{const delay=Math.random()*900+index*120;setTimeout(()=>{if(!document.hidden)startSpotlightCycle(state)},delay)});
    document.addEventListener('visibilitychange',syncSpotlightPlayback,{passive:true});window.addEventListener('pageshow',syncSpotlightPlayback,{passive:true});window.addEventListener('pagehide',()=>spotlightStates.forEach(state=>state.animation?.pause()),{passive:true});
  }

  function enableFallback(){
    document.documentElement.classList.add('carousel-fallback');stage.style.perspective='none';stage.style.overflow='hidden';
    Object.assign(barrel.style,{display:'flex',gap:'18px',width:'100%',maxWidth:'610px',height:'auto',minHeight:`${Math.round(350*CARD_HEIGHT_SCALE)}px`,overflowX:'auto',overflowY:'hidden',transform:'none',transformStyle:'flat',scrollSnapType:'x mandatory',scrollBehavior:'smooth',WebkitOverflowScrolling:'touch',touchAction:'pan-x pan-y',overscrollBehaviorX:'contain',pointerEvents:'auto',userSelect:'auto',WebkitUserSelect:'auto',scrollbarWidth:'none',willChange:'auto'});
    pages.forEach(page=>Object.assign(page.style,{position:'relative',inset:'auto',left:'auto',right:'auto',transform:'none',flex:'0 0 90%',width:'90%',height:'auto',minHeight:`${Math.round(350*CARD_HEIGHT_SCALE)}px`,scrollSnapAlign:'center',scrollSnapStop:'always',backfaceVisibility:'visible',WebkitBackfaceVisibility:'visible'}));
    const updateFallbackDot=()=>{const first=pages[0];if(!first)return;const stride=first.offsetWidth+18;setDot(stride>0?Math.round(barrel.scrollLeft/stride):0)};
    barrel.addEventListener('scroll',()=>requestAnimationFrame(updateFallbackDot),{passive:true});updateFallbackDot();
  }
  function rotateFallback(direction){const first=pages[0];if(!first)return;const stride=first.offsetWidth+18,current=stride>0?Math.round(barrel.scrollLeft/stride):0,target=clamp(current+direction,0,CARD_COUNT-1);barrel.scrollTo({left:target*stride,behavior:'smooth'});setDot(target)}
  function syncGeometry(){
    if(fallbackMode)return;if(geometryRaf)cancelAnimationFrame(geometryRaf);
    geometryRaf=requestAnimationFrame(()=>{geometryRaf=0;const viewportHeight=window.visualViewport?.height||window.innerHeight,width=window.innerWidth;let cardHeight;
      if(width<=560){cardHeight=clamp(viewportHeight*.54,350,390)*CARD_HEIGHT_SCALE;stage.style.height=`${Math.round(cardHeight+110)}px`;stage.style.minHeight=stage.style.height}
      else if(width<=900){cardHeight=clamp(viewportHeight*.56,390,430)*CARD_HEIGHT_SCALE;stage.style.height=`${Math.round(cardHeight+100)}px`;stage.style.minHeight=stage.style.height}
      else{cardHeight=430*CARD_HEIGHT_SCALE;stage.style.height=`${Math.round(cardHeight+120)}px`;stage.style.minHeight=stage.style.height}
      barrel.style.height=`${Math.round(cardHeight)}px`;const cardWidth=pages[0]?.offsetWidth||barrel.offsetWidth;if(cardWidth>0){const radius=cardWidth/(2*Math.tan(Math.PI/CARD_COUNT));document.documentElement.style.setProperty('--radius',`${radius.toFixed(2)}px`);zone.style.width=`${Math.ceil(cardWidth)}px`}zone.style.height=`${Math.ceil(barrel.offsetHeight)}px`;
    });
  }
  function render(){if(fallbackMode)return;barrel.style.transform=`rotateY(${angle}deg)`;setDot(Math.round(angle/STEP))}
  function stopAnimation(){if(raf)cancelAnimationFrame(raf);raf=0}function invalidate(){generation++;stopAnimation()}
  function settleToCard(initialVelocity,target){
    invalidate();promoteBarrel();const myGeneration=generation;let v=initialVelocity,last=performance.now(),started=last,stableFrames=0;
    const finish=()=>{velocity=0;render();raf=0;releaseBarrel()};
    const tick=now=>{if(myGeneration!==generation)return;const dt=Math.min(.032,Math.max(.008,(now-last)/1000));last=now;const distance=target-angle,absDistance=Math.abs(distance),elapsed=(now-started)/1000;v+=((distance*SPRING)-(v*DAMPING))*dt;const step=v*dt;if(absDistance>0&&Math.abs(step)>=absDistance){angle=target;finish();return}angle+=step;velocity=v;render();if(Math.abs(target-angle)<.1&&Math.abs(v)<1)stableFrames++;else stableFrames=0;if((stableFrames>=3&&elapsed>=MIN_SETTLE_TIME)||elapsed>=MAX_SETTLE_TIME){angle=target;finish();return}raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);
  }
  function releasePointer(pointerId){if(pointerId==null||!zone)return;try{if(zone.hasPointerCapture?.(pointerId))zone.releasePointerCapture(pointerId)}catch(_){}}
  function resetGesture(pointerId=activePointer){releasePointer(pointerId);activePointer=null;gesture='idle';if(zone)zone.style.cursor='grab'}
  function begin(e){if(e.pointerType==='mouse'&&e.button!==0)return;invalidate();promoteBarrel();activePointer=e.pointerId;gesture='pending';startX=lastX=e.clientX;startY=e.clientY;lastT=performance.now();velocity=0;zone.style.cursor='grabbing';try{zone.setPointerCapture?.(e.pointerId)}catch(_){}}
  function move(e){if(activePointer===null||e.pointerId!==activePointer||gesture==='idle')return;const dxTotal=e.clientX-startX,dyTotal=e.clientY-startY;if(gesture==='pending'){if(Math.hypot(dxTotal,dyTotal)<DIRECTION_LOCK)return;if(Math.abs(dyTotal)>Math.abs(dxTotal)){gesture='vertical';releasePointer(e.pointerId);activePointer=null;zone.style.cursor='grab';releaseBarrel();return}gesture='horizontal'}if(gesture!=='horizontal')return;e.preventDefault();const now=performance.now(),dx=e.clientX-lastX,dt=Math.max(8,now-lastT);lastX=e.clientX;lastT=now;angle+=dx*DRAG_GAIN;velocity=(dx*DRAG_GAIN/dt)*1000;render()}
  function finishHorizontal(releaseVelocity){const direction=Math.sign(releaseVelocity),current=Math.round(angle/STEP),offset=angle-current*STEP;let targetIndex;if(direction&&Math.abs(releaseVelocity)>MIN_RELEASE_SPEED){targetIndex=direction>0?Math.ceil(angle/STEP):Math.floor(angle/STEP);if(targetIndex===current)targetIndex+=direction}else{targetIndex=Math.round(angle/STEP);if(Math.abs(offset)>=STEP/2)targetIndex+=Math.sign(offset)}const target=targetIndex*STEP,initial=Math.sign(target-angle)*Math.min(MAX_RELEASE_SPEED,Math.max(45,Math.abs(releaseVelocity)));settleToCard(initial,target)}
  function end(e){if(activePointer===null||e.pointerId!==activePointer)return;const wasHorizontal=gesture==='horizontal',releaseVelocity=velocity;resetGesture(e.pointerId);if(wasHorizontal)finishHorizontal(releaseVelocity);else releaseBarrel()}
  function cancel(e){if(activePointer!==null&&e?.pointerId!=null&&e.pointerId!==activePointer)return;resetGesture(e?.pointerId??activePointer);velocity=0;render();releaseBarrel()}
  function rotateBy(direction){if(fallbackMode)return rotateFallback(direction);invalidate();resetGesture();const target=(Math.round(angle/STEP)+direction)*STEP;settleToCard(direction*BUTTON_SPEED,target)}

  if(fallbackMode)enableFallback();else{
    zone=document.createElement('div');zone.className='carousel-touch-zone';zone.setAttribute('aria-hidden','true');Object.assign(zone.style,{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)',zIndex:'12',touchAction:'pan-y',background:'transparent',cursor:'grab',userSelect:'none',WebkitUserSelect:'none',pointerEvents:'auto'});stage.appendChild(zone);barrel.style.transition='none';barrel.style.pointerEvents='none';barrel.style.userSelect='none';barrel.style.webkitUserSelect='none';releaseBarrel();
    zone.addEventListener('pointerdown',begin,{passive:true});zone.addEventListener('pointermove',move,{passive:false});zone.addEventListener('pointerup',end,{passive:true});zone.addEventListener('pointercancel',cancel,{passive:true});zone.addEventListener('lostpointercapture',e=>{if(activePointer===e.pointerId&&gesture!=='vertical')cancel(e)});window.addEventListener('blur',cancel);window.addEventListener('resize',syncGeometry,{passive:true});window.addEventListener('orientationchange',syncGeometry,{passive:true});window.visualViewport?.addEventListener('resize',syncGeometry,{passive:true});if('ResizeObserver'in window)new ResizeObserver(syncGeometry).observe(barrel);syncGeometry();render();
  }
  document.querySelectorAll('[data-dir]').forEach(control=>{const direction=Number(control.dataset.dir),run=e=>{e.preventDefault();e.stopPropagation();rotateBy(direction)};control.addEventListener('click',run);control.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')run(e)})});
})();