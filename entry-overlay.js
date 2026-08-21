/* Harris Portfolio intro — particle streak/glint erasure reveal.
   Layer stack: white mask -> solid dark teal -> live portfolio.
   Fast teal particles + slower gold glints permanently erase the white mask.
   White removal is caused by particle/glint travel only: no hidden fade or band wipe. */
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
    tealWhite: '#edf7f8',
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

  function makeParticle(opts={}){
    const thickness = opts.thickness ?? (Math.random()<.84 ? rand(.55,2.1) : rand(2.1,3.0));
    const dir = opts.dir ?? (Math.random()<.5 ? 1 : -1);
    const family = Math.random();
    const color = family<.42 ? COLORS.tealDark : family<.84 ? COLORS.tealGreen : COLORS.tealBright;
    const headLen = opts.headLen ?? rand(2.5,13);
    return {
      y: opts.y ?? rand(.5,Math.max(1,cssH-.5)),
      thickness,
      headLen,
      // Long luminous tails: half a viewport to a full viewport.
      tailLen: opts.tailLen ?? rand(.50,1.00)*cssW,
      dir,
      start: opts.start ?? rand(25,WHITE_GONE_AT-170),
      duration: opts.duration ?? rand(58,165),
      color,
      intensity: opts.intensity ?? rand(.50,1),
      halo: opts.halo ?? rand(.28,.88),
      // The particle remains visually thin. Coverage width controls the permanent cut.
      eraseWidth: opts.eraseWidth ?? Math.max(1,thickness*rand(.95,1.6)),
      lastHead: null
    };
  }

  function buildEvents(){
    tealEvents=[];
    goldEvents=[];

    // Majority: independent high-speed particles.
    const independentCount = Math.round(rand(92,138));
    for(let i=0;i<independentCount;i++) tealEvents.push(makeParticle());

    // Random clusters: members launch together, share direction and similar speed,
    // but keep slightly different Y, thickness and tail intensity.
    const clusterCount = Math.round(rand(5,9));
    for(let c=0;c<clusterCount;c++){
      const members = Math.round(rand(4,9));
      const dir = Math.random()<.5 ? 1 : -1;
      const baseY = rand(cssH*.05,cssH*.95);
      const baseStart = rand(80,WHITE_GONE_AT-300);
      const baseDuration = rand(70,145);
      const spread = rand(5,28);
      for(let j=0;j<members;j++){
        tealEvents.push(makeParticle({
          y: clamp(baseY+rand(-spread,spread),.5,cssH-.5),
          dir,
          start: baseStart+rand(-22,38),
          duration: baseDuration*rand(.88,1.14),
          tailLen: rand(.58,1.00)*cssW,
          intensity: rand(.62,1),
          halo: rand(.35,.92)
        }));
      }
    }

    // Coverage particles: these are still visible micro-particles, but their Y positions
    // are stratified so the sum of particle trails is guaranteed to remove the entire
    // white membrane by 2400 ms. There is no independent white fade/wipe.
    const laneH = clamp(cssH/72,5,12);
    const lanes = Math.ceil(cssH/laneH);
    for(let i=0;i<lanes;i++){
      const top=i*laneH;
      const h=Math.min(laneH+1,cssH-top+1);
      const y=clamp(top+h*.5+rand(-h*.18,h*.18),.5,cssH-.5);
      const dir=i%2===0 ? 1 : -1;
      // Stagger over the first 2.2s so coverage still feels stochastic.
      const start=rand(120,2180);
      tealEvents.push(makeParticle({
        y,
        dir,
        start,
        duration: rand(78,150),
        tailLen: rand(.65,1.00)*cssW,
        thickness: rand(.7,1.9),
        eraseWidth:h+1,
        intensity: rand(.42,.78),
        halo: rand(.22,.58)
      }));
    }

    // Gold system remains unchanged while teal behavior is tuned.
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
    dpr=Math.min(window.devicePixelRatio||1,3);
    resizeCanvas(mask,mctx);
    resizeCanvas(fx,fctx);
    tealLayer.style.background=COLORS.darkTeal;
    tealLayer.style.opacity='1';
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

  function eraseParticlePath(e,head){
    const prev=e.lastHead;
    if(prev!==null){
      // Fill continuously between frames so a very fast particle never leaves gaps.
      const x=Math.min(prev,head)-e.headLen*.35;
      const w=Math.abs(head-prev)+e.headLen*.70;
      eraseRect(x,e.y-e.eraseWidth/2,w,e.eraseWidth,1);
    } else {
      eraseRect(head-e.headLen*.5,e.y-e.eraseWidth/2,e.headLen,e.eraseWidth,1);
    }
    e.lastHead=head;
  }

  function drawTealEvent(e,t,effectAlpha){
    const local=(t-e.start)/e.duration;
    if(local<0){ e.lastHead=null; return; }
    if(local>1){ e.lastHead=null; return; }

    const overscan=e.tailLen+e.headLen+18;
    const travel=cssW+overscan*2;
    const head=e.dir>0 ? -overscan + local*travel : cssW+overscan-local*travel;
    eraseParticlePath(e,head);

    // Tail extends half-to-full viewport. The particle itself stays tiny.
    const tailStart=e.dir>0 ? head-e.tailLen : head+e.tailLen;
    const g=fctx.createLinearGradient(tailStart,0,head,0);
    g.addColorStop(0,'rgba(6,21,28,0)');
    g.addColorStop(.18,'rgba(11,77,80,.025)');
    g.addColorStop(.48,'rgba(11,77,80,.075)');
    g.addColorStop(.72,'rgba(26,127,119,.18)');
    g.addColorStop(.90,'rgba(99,213,208,.50)');
    g.addColorStop(1,'rgba(237,247,248,.98)');

    fctx.save();
    fctx.globalAlpha=effectAlpha*e.intensity*.28*e.halo;
    fctx.strokeStyle=g;
    fctx.lineWidth=Math.max(.45,e.thickness*1.75);
    fctx.lineCap='butt';
    fctx.beginPath();
    fctx.moveTo(tailStart,e.y);
    fctx.lineTo(head,e.y);
    fctx.stroke();

    fctx.globalAlpha=effectAlpha*e.intensity;
    fctx.strokeStyle=g;
    fctx.lineWidth=e.thickness;
    fctx.beginPath();
    fctx.moveTo(tailStart,e.y);
    fctx.lineTo(head,e.y);
    fctx.stroke();

    const headX=e.dir>0 ? head-e.headLen : head;
    const hg=fctx.createLinearGradient(headX,0,headX+e.headLen,0);
    if(e.dir>0){
      hg.addColorStop(0,'rgba(99,213,208,.12)');
      hg.addColorStop(.58,e.color);
      hg.addColorStop(.88,COLORS.tealBright);
      hg.addColorStop(1,COLORS.tealWhite);
    }else{
      hg.addColorStop(0,COLORS.tealWhite);
      hg.addColorStop(.12,COLORS.tealBright);
      hg.addColorStop(.42,e.color);
      hg.addColorStop(1,'rgba(99,213,208,.12)');
    }
    fctx.globalAlpha=effectAlpha*Math.min(1,e.intensity+.15);
    fctx.fillStyle=hg;
    fctx.fillRect(headX,e.y-e.thickness/2,e.headLen,e.thickness);

    const coreW=Math.max(1.0,Math.min(3.2,e.headLen*.20));
    const coreX=e.dir>0 ? head-coreW : head;
    const coreH=Math.max(.45,Math.min(1.2,e.thickness*.68));
    fctx.globalAlpha=effectAlpha*Math.min(1,e.intensity+.25);
    fctx.fillStyle=COLORS.tealWhite;
    fctx.fillRect(coreX,e.y-coreH/2,coreW,coreH);
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

    // Visible effects fade during the second half, but their physical erasure continues.
    const effectAlpha=t<EFFECT_FADE_START
      ? 1
      : 1-clamp((t-EFFECT_FADE_START)/(WHITE_GONE_AT-EFFECT_FADE_START),0,1);

    for(const e of goldEvents) drawGoldEvent(e,t,effectAlpha);
    for(const e of tealEvents) drawTealEvent(e,t,effectAlpha);

    // By design, stratified coverage particles have completed their passes before this
    // point, so all white has been erased by particle/glint travel itself.
    if(t>=WHITE_GONE_AT){
      // Clear any subpixel remnants only after every coverage particle has completed.
      // This is not a fade/wipe; it is a final numerical cleanup of the already-erased mask.
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
