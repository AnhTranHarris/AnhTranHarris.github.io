/* Harris Portfolio intro — scanline/glint erasure reveal.
   FULL REWRITE. No legacy cellular, wave, video, WebGL, Three.js or flock code.
   Layer stack: white mask -> solid dark teal -> live portfolio.
   Fast teal streaks and slow gold glints permanently erase the white mask.
   At 75% elapsed, white is guaranteed gone. Final 25% fades dark teal to portfolio. */
(() => {
  'use strict';

  const overlay = document.getElementById('portfolio-entry-overlay');
  if (!overlay) return;

  const nav = performance.getEntriesByType?.('navigation')?.[0];
  const skip = nav?.type === 'back_forward' ||
    window.matchMedia?.('(forced-colors: active)').matches ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finishImmediately = () => {
    document.documentElement.dataset.entryState = 'complete';
    overlay.remove();
  };
  if (skip) { finishImmediately(); return; }

  const TOTAL_MS = 3200;
  const EFFECT_FADE_START = 1600; // half remaining
  const WHITE_GONE_AT = 2400;    // quarter remaining
  const FAILSAFE_MS = 4300;

  const COLORS = {
    darkTeal: '#06151c',
    tealDark: '#0b4d50',
    tealGreen: '#1a7f77',
    tealBright: '#63d5d0',
    gold: '#d8b86a',
    goldHi: '#fff0b0'
  };

  const rand = (a,b) => a + Math.random() * (b-a);
  const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
  const easeOut = t => 1 - Math.pow(1-clamp(t,0,1),3);
  const easeInOut = t => { t=clamp(t,0,1); return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; };

  const tealLayer = document.createElement('div');
  tealLayer.className = 'entry-teal-layer';
  tealLayer.setAttribute('aria-hidden','true');

  const mask = document.createElement('canvas');
  mask.className = 'entry-mask-canvas';
  mask.setAttribute('aria-hidden','true');

  const fx = document.createElement('canvas');
  fx.className = 'entry-fx-canvas';
  fx.setAttribute('aria-hidden','true');

  overlay.append(tealLayer, mask, fx);

  const mctx = mask.getContext('2d', { alpha:true, desynchronized:true });
  const fctx = fx.getContext('2d', { alpha:true, desynchronized:true });
  if (!mctx || !fctx) { finishImmediately(); return; }

  let cssW=1, cssH=1, dpr=1, start=0, raf=0, watchdog=0, finished=false;
  let tealEvents=[], goldEvents=[];
  let whiteInitialized=false;

  function resizeCanvas(canvas, ctx){
    canvas.width = Math.max(1, Math.round(cssW*dpr));
    canvas.height = Math.max(1, Math.round(cssH*dpr));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function buildEvents(){
    tealEvents=[];
    goldEvents=[];

    // Numerous fast independent teal streaks. Each run gets new timing, Y, width,
    // thickness and direction. They cross in a fraction of the total intro time.
    const tealCount = Math.round(rand(28,42));
    for(let i=0;i<tealCount;i++){
      const thickness = rand(1,7);
      const len = rand(.16,.52) * cssW;
      const dir = Math.random()<.5 ? 1 : -1;
      const duration = rand(120,390);
      const launch = rand(80, WHITE_GONE_AT-260);
      tealEvents.push({
        y: rand(0,cssH),
        thickness,
        len,
        dir,
        start: launch,
        duration,
        color: Math.random()<.55 ? COLORS.tealDark : COLORS.tealGreen,
        intensity: rand(.58,1),
        tail: rand(.35,.75)
      });
    }

    // Fewer slow gold glints. Each takes most/all of the active erosion phase to
    // traverse. The line is not a perfect bar: several rectangular specular patches
    // ride along one straight horizontal path with unequal brightness.
    const goldCount = Math.round(rand(3,6));
    for(let i=0;i<goldCount;i++){
      goldEvents.push({
        y: rand(cssH*.08, cssH*.92),
        thickness: rand(7,14),
        dir: Math.random()<.5 ? 1 : -1,
        start: rand(30,260),
        duration: rand(2100,2450),
        phase: rand(0,Math.PI*2),
        baseAlpha: rand(.18,.34),
        glintWidth: rand(.10,.23)*cssW
      });
    }
  }

  function resetWhite(){
    mctx.globalCompositeOperation='source-over';
    mctx.globalAlpha=1;
    mctx.fillStyle='#fff';
    mctx.fillRect(0,0,cssW,cssH);
    whiteInitialized=true;
  }

  function resize(){
    cssW=Math.max(1,window.innerWidth);
    cssH=Math.max(1,window.innerHeight);
    dpr=Math.min(window.devicePixelRatio||1,2);
    resizeCanvas(mask,mctx);
    resizeCanvas(fx,fctx);
    tealLayer.style.background=COLORS.darkTeal;
    resetWhite();
    buildEvents();
  }

  function eraseRect(x,y,w,h,alpha=1){
    mctx.save();
    mctx.globalCompositeOperation='destination-out';
    mctx.globalAlpha=alpha;
    mctx.fillStyle='#000';
    mctx.fillRect(x,y,w,h);
    mctx.restore();
  }

  function drawTealEvent(e,t,effectAlpha){
    const local=(t-e.start)/e.duration;
    if(local<0||local>1) return;
    const p=easeOut(local);
    const travel=cssW+e.len*1.4;
    const head=e.dir>0 ? -e.len + p*travel : cssW+e.len-p*travel;
    const x=e.dir>0 ? head-e.len : head;

    // Permanent erasure trail along the streak's travelled path.
    const erased = e.dir>0
      ? {x:0,w:clamp(head,0,cssW)}
      : {x:clamp(head,0,cssW),w:cssW-clamp(head,0,cssW)};
    if(erased.w>0) eraseRect(erased.x,e.y-e.thickness/2,erased.w,e.thickness,1);

    // Visible streak: rectangular, sharp, no blur.
    fctx.globalAlpha=effectAlpha*e.intensity;
    fctx.fillStyle=e.color;
    fctx.fillRect(x,e.y-e.thickness/2,e.len,e.thickness);

    // Occasional bright leading edge for speed perception.
    if(e.thickness>=3){
      fctx.globalAlpha=effectAlpha*.55*e.intensity;
      fctx.fillStyle=COLORS.tealBright;
      const cap=Math.max(2,Math.min(18,e.len*.08));
      fctx.fillRect(e.dir>0?head-cap:head,e.y-e.thickness/2,cap,e.thickness);
    }
    fctx.globalAlpha=1;
  }

  function drawGoldEvent(e,t,effectAlpha){
    const local=(t-e.start)/e.duration;
    if(local<0||local>1) return;
    const p=easeInOut(local);
    const center=e.dir>0 ? -e.glintWidth + p*(cssW+2*e.glintWidth) : cssW+e.glintWidth-p*(cssW+2*e.glintWidth);

    // Slow erosion follows the glint path, permanently exposing dark teal.
    const trailEnd=clamp(center,0,cssW);
    if(e.dir>0) eraseRect(0,e.y-e.thickness/2,trailEnd,e.thickness,1);
    else eraseRect(trailEnd,e.y-e.thickness/2,cssW-trailEnd,e.thickness,1);

    // Dim imperfect metallic baseline only around the active region.
    const baseW=Math.min(cssW,e.glintWidth*1.55);
    const bx=center-baseW/2;
    fctx.globalAlpha=effectAlpha*e.baseAlpha;
    fctx.fillStyle=COLORS.gold;
    fctx.fillRect(bx,e.y-e.thickness/2,baseW,e.thickness);

    // Uneven specular patches: hard-edged rectangular shines, different widths/alpha.
    const patches=[
      {o:-.34,w:.18,a:.28},
      {o:-.13,w:.24,a:.58},
      {o:.04,w:.12,a:1.0},
      {o:.19,w:.20,a:.68},
      {o:.39,w:.10,a:.34}
    ];
    for(let i=0;i<patches.length;i++){
      const q=patches[i];
      const flicker=.72+.28*Math.sin(t*.010*(i+1)+e.phase+i*.9);
      fctx.globalAlpha=effectAlpha*q.a*flicker;
      fctx.fillStyle=i===2?COLORS.goldHi:COLORS.gold;
      const pw=e.glintWidth*q.w;
      fctx.fillRect(center+e.glintWidth*q.o-pw/2,e.y-e.thickness/2,pw,e.thickness);
    }
    fctx.globalAlpha=1;
  }

  function deterministicCompletion(t){
    if(t<EFFECT_FADE_START) return;
    const p=clamp((t-EFFECT_FADE_START)/(WHITE_GONE_AT-EFFECT_FADE_START),0,1);
    // Hidden completion mechanism: horizontal bands are erased from alternating sides.
    // This preserves the scanline vocabulary while guaranteeing zero white at 2400 ms.
    const bands=18;
    const bandH=cssH/bands;
    for(let i=0;i<bands;i++){
      const delay=(i%6)*.055;
      const q=clamp((p-delay)/(1-delay),0,1);
      if(q<=0) continue;
      const width=cssW*easeOut(q);
      const y=i*bandH;
      if(i%2===0) eraseRect(0,y,width,bandH+1,1);
      else eraseRect(cssW-width,y,width,bandH+1,1);
    }
    if(p>=.998){
      mctx.clearRect(0,0,cssW,cssH);
    }
  }

  function finish(){
    if(finished) return;
    finished=true;
    clearTimeout(watchdog);
    cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState='complete';
    overlay.classList.add('entry-complete');
    overlay.remove();
  }

  function frame(now){
    if(!start) start=now;
    const t=now-start;

    fctx.clearRect(0,0,cssW,cssH);

    // Visible teal/gold effects begin fading with half of intro time remaining,
    // reaching zero exactly when the white mask must be fully erased.
    const effectAlpha=t<EFFECT_FADE_START
      ? 1
      : 1-clamp((t-EFFECT_FADE_START)/(WHITE_GONE_AT-EFFECT_FADE_START),0,1);

    for(const e of goldEvents) drawGoldEvent(e,t,effectAlpha);
    for(const e of tealEvents) drawTealEvent(e,t,effectAlpha);
    deterministicCompletion(t);

    // Final quarter: white is gone. Fade only the solid dark-teal bridge layer,
    // exposing the already-loaded live portfolio underneath.
    if(t>=WHITE_GONE_AT){
      mctx.clearRect(0,0,cssW,cssH);
      fctx.clearRect(0,0,cssW,cssH);
      const p=clamp((t-WHITE_GONE_AT)/(TOTAL_MS-WHITE_GONE_AT),0,1);
      tealLayer.style.opacity=String(1-easeInOut(p));
    }

    if(t>=TOTAL_MS){ finish(); return; }
    raf=requestAnimationFrame(frame);
  }

  let resizeTimer=0;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      if(!finished){ resize(); start=performance.now(); }
    },100);
  },{passive:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)finish();},{passive:true});

  try{
    resize();
    document.documentElement.dataset.entryState='running';
    watchdog=setTimeout(finish,FAILSAFE_MS);
    raf=requestAnimationFrame(frame);
  }catch(error){
    console.error('Entry overlay failed safely:',error);
    finishImmediately();
  }
})();
