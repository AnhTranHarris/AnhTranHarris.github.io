/* Harris Portfolio intro — scanline/glint erasure reveal.
   Layer stack: white mask -> solid dark teal -> live portfolio.
   Fast teal streaks and slow gold glints permanently erase the white mask.
   Teal streaks use native-resolution subpixel gradients rather than block bars. */
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
  const EFFECT_FADE_START = 1600;
  const WHITE_GONE_AT = 2400;
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

  function resizeCanvas(canvas, ctx){
    canvas.width = Math.max(1, Math.round(cssW*dpr));
    canvas.height = Math.max(1, Math.round(cssH*dpr));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled = true;
  }

  function buildEvents(){
    tealEvents=[];
    goldEvents=[];

    // Fast streaks: each event gets a long dim tail plus a short bright leading core.
    // Durations are intentionally short compared with the 3.2s intro.
    const tealCount = Math.round(rand(34,52));
    for(let i=0;i<tealCount;i++){
      const thickness = rand(1,7);
      const bodyLen = rand(.10,.31) * cssW;
      const tailLen = bodyLen * rand(.55,1.8);
      const dir = Math.random()<.5 ? 1 : -1;
      const duration = rand(95,285);
      const launch = rand(45, WHITE_GONE_AT-220);
      const color = Math.random()<.52 ? COLORS.tealDark : COLORS.tealGreen;
      tealEvents.push({
        y: rand(1,Math.max(2,cssH-1)),
        thickness,
        bodyLen,
        tailLen,
        dir,
        start: launch,
        duration,
        color,
        intensity: rand(.62,1),
        core: rand(.08,.22),
        erasePad: rand(.5,1.35),
        lastHead: null
      });
    }

    // Gold system intentionally unchanged in this pass.
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
  }

  function resize(){
    cssW=Math.max(1,window.innerWidth);
    cssH=Math.max(1,window.innerHeight);
    // Preserve thin 1px–7px scanlines sharply on modern high-density phones.
    dpr=Math.min(window.devicePixelRatio||1,3);
    resizeCanvas(mask,mctx);
    resizeCanvas(fx,fctx);
    tealLayer.style.background=COLORS.darkTeal;
    resetWhite();
    buildEvents();
  }

  function eraseRect(x,y,w,h,alpha=1){
    if(w<=0||h<=0) return;
    mctx.save();
    mctx.globalCompositeOperation='destination-out';
    mctx.globalAlpha=alpha;
    mctx.fillStyle='#000';
    mctx.fillRect(x,y,w,h);
    mctx.restore();
  }

  function eraseContinuousStreak(e,head){
    const half=(e.thickness+e.erasePad)/2;
    const prev=e.lastHead;
    if(prev===null){
      const start=e.dir>0 ? Math.max(0,head-e.bodyLen*.16) : Math.min(cssW,head+e.bodyLen*.16);
      const x=Math.min(start,head), w=Math.abs(head-start);
      eraseRect(x,e.y-half,w,e.thickness+e.erasePad,1);
    }else{
      const x=Math.min(prev,head)-e.bodyLen*.06;
      const w=Math.abs(head-prev)+e.bodyLen*.12;
      eraseRect(x,e.y-half,w,e.thickness+e.erasePad,1);
    }
    e.lastHead=head;
  }

  function drawTealEvent(e,t,effectAlpha){
    const local=(t-e.start)/e.duration;
    if(local<0){ e.lastHead=null; return; }
    if(local>1){ e.lastHead=null; return; }

    // Linear travel is intentional: the reference reads as a hard zip, not eased UI motion.
    const totalLen=e.bodyLen+e.tailLen;
    const travel=cssW+totalLen*2;
    const head=e.dir>0 ? -totalLen + local*travel : cssW+totalLen-local*travel;
    eraseContinuousStreak(e,head);

    const x0=e.dir>0 ? head-totalLen : head;
    const x1=e.dir>0 ? head : head+totalLen;
    const grad=fctx.createLinearGradient(x0,0,x1,0);

    // Direction-aware brightness profile: transparent/dim tail -> colored body -> bright head.
    if(e.dir>0){
      grad.addColorStop(0,'rgba(99,213,208,0)');
      grad.addColorStop(.22,'rgba(11,77,80,.12)');
      grad.addColorStop(.52,e.color);
      grad.addColorStop(.82,e.color);
      grad.addColorStop(.94,COLORS.tealBright);
      grad.addColorStop(1,'rgba(237,247,248,.92)');
    }else{
      grad.addColorStop(0,'rgba(237,247,248,.92)');
      grad.addColorStop(.06,COLORS.tealBright);
      grad.addColorStop(.18,e.color);
      grad.addColorStop(.48,e.color);
      grad.addColorStop(.78,'rgba(11,77,80,.12)');
      grad.addColorStop(1,'rgba(99,213,208,0)');
    }

    fctx.save();
    fctx.globalAlpha=effectAlpha*e.intensity;
    fctx.fillStyle=grad;
    fctx.fillRect(x0,e.y-e.thickness/2,totalLen,e.thickness);

    // Razor-thin luminous core rides at the leading edge and creates the visual 'zip'.
    const coreLen=Math.max(5,e.bodyLen*e.core);
    const coreX=e.dir>0 ? head-coreLen : head;
    const coreGrad=fctx.createLinearGradient(coreX,0,coreX+coreLen,0);
    if(e.dir>0){
      coreGrad.addColorStop(0,'rgba(99,213,208,0)');
      coreGrad.addColorStop(.72,'rgba(99,213,208,.70)');
      coreGrad.addColorStop(1,'rgba(237,247,248,1)');
    }else{
      coreGrad.addColorStop(0,'rgba(237,247,248,1)');
      coreGrad.addColorStop(.28,'rgba(99,213,208,.70)');
      coreGrad.addColorStop(1,'rgba(99,213,208,0)');
    }
    fctx.globalAlpha=effectAlpha*Math.min(1,e.intensity+.12);
    fctx.fillStyle=coreGrad;
    const coreH=Math.max(.65,Math.min(e.thickness,1.35));
    fctx.fillRect(coreX,e.y-coreH/2,coreLen,coreH);
    fctx.restore();
  }

  function drawGoldEvent(e,t,effectAlpha){
    const local=(t-e.start)/e.duration;
    if(local<0||local>1) return;
    const p=easeInOut(local);
    const center=e.dir>0 ? -e.glintWidth + p*(cssW+2*e.glintWidth) : cssW+e.glintWidth-p*(cssW+2*e.glintWidth);

    const trailEnd=clamp(center,0,cssW);
    if(e.dir>0) eraseRect(0,e.y-e.thickness/2,trailEnd,e.thickness,1);
    else eraseRect(trailEnd,e.y-e.thickness/2,cssW-trailEnd,e.thickness,1);

    const baseW=Math.min(cssW,e.glintWidth*1.55);
    const bx=center-baseW/2;
    fctx.globalAlpha=effectAlpha*e.baseAlpha;
    fctx.fillStyle=COLORS.gold;
    fctx.fillRect(bx,e.y-e.thickness/2,baseW,e.thickness);

    const patches=[
      {o:-.34,w:.18,a:.28},{o:-.13,w:.24,a:.58},{o:.04,w:.12,a:1.0},{o:.19,w:.20,a:.68},{o:.39,w:.10,a:.34}
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
    const bands=18;
    const bandH=cssH/bands;
    for(let i=0;i<bands;i++){
      const delay=(i%6)*.055;
      const q=clamp((p-delay)/(1-delay),0,1);
      if(q<=0) continue;
      const eased=1-Math.pow(1-q,3);
      const width=cssW*eased;
      const y=i*bandH;
      if(i%2===0) eraseRect(0,y,width,bandH+1,1);
      else eraseRect(cssW-width,y,width,bandH+1,1);
    }
    if(p>=.998) mctx.clearRect(0,0,cssW,cssH);
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

    const effectAlpha=t<EFFECT_FADE_START
      ? 1
      : 1-clamp((t-EFFECT_FADE_START)/(WHITE_GONE_AT-EFFECT_FADE_START),0,1);

    for(const e of goldEvents) drawGoldEvent(e,t,effectAlpha);
    for(const e of tealEvents) drawTealEvent(e,t,effectAlpha);
    deterministicCompletion(t);

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
