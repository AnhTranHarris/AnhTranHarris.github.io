/* Harris Portfolio intro — clean millisecond-native tracer/glint erasure reveal.
   Architecture: white mask -> solid dark-teal bridge -> live portfolio.
   Fast particles physically erode white; launched tracers drain naturally before bridge fade. */
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
  const SPAWN_CUTOFF_MS = 1500;
  const WHITE_TARGET_MS = 2350;
  const BRIDGE_FADE_START_MS = 2400;
  const FAILSAFE_MS = 4400;

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
  const easeInOut = t => {
    t = clamp(t,0,1);
    return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
  };

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

  // Velocity is viewport-widths per millisecond. Motion remains frame-rate independent.
  function chooseSpeedVwPerMs(){
    const r = Math.random();
    if (r < .22) return rand(.015,.023);  // extreme zips
    if (r < .92) return rand(.009,.015);  // majority fast
    return rand(.006,.009);                // small slower accent group
  }

  function makeParticle(o={}){
    const thickness = o.thickness ?? (Math.random()<.84 ? rand(.55,2.1) : rand(2.1,3.0));
    const dir = o.dir ?? (Math.random()<.5 ? 1 : -1);
    const family = Math.random();
    const color = family < .42 ? COLORS.tealDark : family < .84 ? COLORS.tealGreen : COLORS.tealBright;
    const headLen = o.headLen ?? rand(2.5,13);
    const speedVwMs = o.speedVwMs ?? chooseSpeedVwPerMs();

    return {
      y: o.y ?? rand(.5, Math.max(1,cssH-.5)),
      thickness,
      headLen,
      tracerLen: o.tracerLen ?? rand(2.6,3.6)*cssW,
      dir,
      start: o.start ?? rand(20,SPAWN_CUTOFF_MS),
      speedPxMs: speedVwMs*cssW,
      preRollMs: o.preRollMs ?? rand(35,135),
      color,
      intensity: o.intensity ?? rand(.52,1),
      glowPct: o.glowPct ?? rand(.04,.20),
      glowIntensity: o.glowIntensity ?? rand(0,1),
      glowIntensity2: o.glowIntensity2 ?? rand(0,1),
      eraseWidth: o.eraseWidth ?? Math.max(1,thickness*rand(.95,1.6)),
      lastHead:null,
      coverage:!!o.coverage,
      completed:false
    };
  }

  function buildEvents(){
    tealEvents=[];
    goldEvents=[];

    const independentCount = Math.round(rand(184,276));
    for(let i=0;i<independentCount;i++) tealEvents.push(makeParticle());

    const clusterCount = Math.round(rand(10,18));
    for(let c=0;c<clusterCount;c++){
      const members = Math.round(rand(4,9));
      const dir = Math.random()<.5 ? 1 : -1;
      const baseY = rand(cssH*.05,cssH*.95);
      const baseStart = rand(60,SPAWN_CUTOFF_MS-120);
      const baseSpeed = chooseSpeedVwPerMs();
      const basePreRoll = rand(45,125);
      const spread = rand(5,28);

      for(let j=0;j<members;j++){
        tealEvents.push(makeParticle({
          y:clamp(baseY+rand(-spread,spread),.5,cssH-.5),
          dir,
          start:baseStart+rand(-18,34),
          speedVwMs:baseSpeed*rand(.92,1.08),
          preRollMs:basePreRoll+rand(-18,18),
          tracerLen:rand(3.0,4.0)*cssW,
          intensity:rand(.64,1)
        }));
      }
    }

    // Coverage particles are real visible tracer flights assigned across narrow Y lanes.
    // Their launches end early enough that every lane can finish before bridge fade begins.
    const laneH = clamp(cssH/72,5,12);
    const lanes = Math.ceil(cssH/laneH);
    for(let i=0;i<lanes;i++){
      const top=i*laneH;
      const h=Math.min(laneH+1,cssH-top+1);
      const y=clamp(top+h*.5+rand(-h*.18,h*.18),.5,cssH-.5);
      tealEvents.push(makeParticle({
        y,
        dir:i%2===0 ? 1 : -1,
        start:rand(100,1450),
        speedVwMs:rand(.010,.016),
        preRollMs:rand(45,120),
        tracerLen:rand(3.0,4.0)*cssW,
        thickness:rand(.7,1.9),
        eraseWidth:h+1,
        intensity:rand(.46,.80),
        coverage:true
      }));
    }

    const goldCount = Math.round(rand(3,6));
    for(let i=0;i<goldCount;i++){
      goldEvents.push({
        y:rand(cssH*.08,cssH*.92),
        thickness:rand(7,14),
        dir:Math.random()<.5?1:-1,
        start:rand(30,240),
        duration:rand(2050,2280),
        phase:rand(0,Math.PI*2),
        baseAlpha:rand(.18,.34),
        glintWidth:rand(.10,.23)*cssW
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

  function eraseRect(x,y,w,h,a=1){
    if(w<=0||h<=0)return;
    mctx.save();
    mctx.globalCompositeOperation='destination-out';
    mctx.globalAlpha=a;
    mctx.fillStyle='#000';
    mctx.fillRect(x,y,w,h);
    mctx.restore();
  }

  function eraseParticlePath(e,head){
    const prev=e.lastHead;
    if(prev!==null){
      eraseRect(Math.min(prev,head)-e.headLen*.35,e.y-e.eraseWidth/2,Math.abs(head-prev)+e.headLen*.7,e.eraseWidth,1);
    }else{
      eraseRect(head-e.headLen*.5,e.y-e.eraseWidth/2,e.headLen,e.eraseWidth,1);
    }
    e.lastHead=head;
  }

  function completeCoverage(e){
    if(!e.coverage||e.completed)return;
    // Completion is still caused by the assigned tracer flight: once that coverage tracer's
    // tail has drained, its entire traversed lane is committed as erased.
    eraseRect(0,e.y-e.eraseWidth/2,cssW,e.eraseWidth,1);
    e.completed=true;
  }

  function drawTracerStroke(e,tailStart,head,alpha){
    const g=fctx.createLinearGradient(tailStart,0,head,0);
    g.addColorStop(0,'rgba(6,21,28,0)');
    g.addColorStop(.006,'rgba(11,77,80,.36)');
    g.addColorStop(.02,'rgba(11,77,80,.60)');
    g.addColorStop(.20,'rgba(11,77,80,.62)');
    g.addColorStop(.50,'rgba(26,127,119,.64)');
    g.addColorStop(.80,'rgba(26,127,119,.66)');
    g.addColorStop(.94,'rgba(26,127,119,.70)');
    g.addColorStop(.98,'rgba(99,213,208,.84)');
    g.addColorStop(.995,'rgba(99,213,208,.96)');
    g.addColorStop(1,'rgba(237,247,248,1)');

    // Percentage still varies 4%-20%, but we add a physical minimum so the aura survives
    // subpixel particle thicknesses on high-DPI screens.
    const primaryRadius=Math.max(1.15,e.thickness*(.55+e.glowPct*4.0));
    const secondaryRadius=Math.max(2.4,primaryRadius*2.15);
    const primaryWidth=e.thickness+Math.max(.7,e.thickness*e.glowPct*2);
    const secondaryWidth=e.thickness+Math.max(1.5,e.thickness*e.glowPct*4);

    fctx.save();
    fctx.lineCap='butt';

    // Broad secondary aura.
    fctx.globalAlpha=alpha*(.12+.32*e.glowIntensity2);
    fctx.strokeStyle=e.color;
    fctx.lineWidth=secondaryWidth;
    fctx.shadowColor=e.color;
    fctx.shadowBlur=secondaryRadius;
    fctx.beginPath();fctx.moveTo(tailStart,e.y);fctx.lineTo(head,e.y);fctx.stroke();

    // Tighter primary aura.
    fctx.globalAlpha=alpha*(.16+.42*e.glowIntensity);
    fctx.lineWidth=primaryWidth;
    fctx.shadowBlur=primaryRadius;
    fctx.beginPath();fctx.moveTo(tailStart,e.y);fctx.lineTo(head,e.y);fctx.stroke();

    // Clean luminous tracer body above the two halos.
    fctx.shadowBlur=0;
    fctx.globalAlpha=alpha*.46;
    fctx.strokeStyle=g;
    fctx.lineWidth=Math.max(.55,e.thickness*1.55);
    fctx.beginPath();fctx.moveTo(tailStart,e.y);fctx.lineTo(head,e.y);fctx.stroke();

    fctx.globalAlpha=alpha;
    fctx.lineWidth=e.thickness;
    fctx.beginPath();fctx.moveTo(tailStart,e.y);fctx.lineTo(head,e.y);fctx.stroke();
    fctx.restore();

    return {primaryRadius,secondaryRadius};
  }

  function drawTealEvent(e,t){
    const elapsed=t-e.start;
    if(elapsed<0){e.lastHead=null;return false;}

    const pad=Math.max(24,e.headLen*2);
    const startX=e.dir>0 ? -pad : cssW+pad;
    const motionElapsed=elapsed+e.preRollMs;
    const head=startX+e.dir*e.speedPxMs*motionElapsed;
    const tailStart=head-e.dir*e.tracerLen;

    // Event stays alive until the tail itself drains completely out of the opposite edge.
    const tailGone=e.dir>0 ? tailStart>cssW+pad : tailStart<-pad;
    if(tailGone){
      completeCoverage(e);
      e.lastHead=null;
      return false;
    }

    const headOnOrNearScreen=head>=-pad&&head<=cssW+pad;
    if(headOnOrNearScreen) eraseParticlePath(e,head);

    const halo=drawTracerStroke(e,tailStart,head,e.intensity);

    if(headOnOrNearScreen){
      const headX=e.dir>0?head-e.headLen:head;
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

      fctx.save();
      // Head receives both halos without altering the clean core dimensions.
      fctx.fillStyle=e.color;
      fctx.shadowColor=e.color;
      fctx.shadowBlur=halo.secondaryRadius;
      fctx.globalAlpha=e.intensity*(.10+.30*e.glowIntensity2);
      fctx.fillRect(headX,e.y-e.thickness/2,e.headLen,e.thickness);

      fctx.shadowBlur=halo.primaryRadius;
      fctx.globalAlpha=e.intensity*(.18+.42*e.glowIntensity);
      fctx.fillRect(headX,e.y-e.thickness/2,e.headLen,e.thickness);

      fctx.shadowBlur=0;
      fctx.globalAlpha=e.intensity;
      fctx.fillStyle=hg;
      fctx.fillRect(headX,e.y-e.thickness/2,e.headLen,e.thickness);

      const coreW=Math.max(1,Math.min(3.2,e.headLen*.2));
      const coreX=e.dir>0?head-coreW:head;
      const coreH=Math.max(.45,Math.min(1.2,e.thickness*.68));
      fctx.globalAlpha=Math.min(1,e.intensity+.22);
      fctx.fillStyle=COLORS.tealWhite;
      fctx.fillRect(coreX,e.y-coreH/2,coreW,coreH);
      fctx.restore();
    }

    return true;
  }

  function drawGoldEvent(e,t){
    const local=(t-e.start)/e.duration;
    if(local<0||local>1)return false;

    const p=easeInOut(local);
    const center=e.dir>0
      ? -e.glintWidth+p*(cssW+2*e.glintWidth)
      : cssW+e.glintWidth-p*(cssW+2*e.glintWidth);
    const trailEnd=clamp(center,0,cssW);

    if(e.dir>0) eraseRect(0,e.y-e.thickness/2,trailEnd,e.thickness,1);
    else eraseRect(trailEnd,e.y-e.thickness/2,cssW-trailEnd,e.thickness,1);

    const baseW=Math.min(cssW,e.glintWidth*1.55);
    const bx=center-baseW/2;
    fctx.globalAlpha=e.baseAlpha;
    fctx.fillStyle=COLORS.gold;
    fctx.fillRect(bx,e.y-e.thickness/2,baseW,e.thickness);

    const patches=[
      {o:-.34,w:.18,a:.28},{o:-.13,w:.24,a:.58},{o:.04,w:.12,a:1},
      {o:.19,w:.20,a:.68},{o:.39,w:.10,a:.34}
    ];
    for(let i=0;i<patches.length;i++){
      const q=patches[i];
      const flicker=.72+.28*Math.sin(t*.010*(i+1)+e.phase+i*.9);
      fctx.globalAlpha=q.a*flicker;
      fctx.fillStyle=i===2?COLORS.goldHi:COLORS.gold;
      const pw=e.glintWidth*q.w;
      fctx.fillRect(center+e.glintWidth*q.o-pw/2,e.y-e.thickness/2,pw,e.thickness);
    }
    fctx.globalAlpha=1;
    return true;
  }

  function allCoverageComplete(){
    for(const e of tealEvents) if(e.coverage && !e.completed) return false;
    return true;
  }

  function finish(){
    if(finished)return;
    finished=true;
    clearTimeout(watchdog);
    cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState='complete';
    overlay.classList.add('entry-complete');
    overlay.remove();
  }

  function frame(now){
    if(!start)start=now;
    const t=now-start;

    // FX canvas is redrawn each frame, but active tracer lifecycles are never globally faded or
    // cut off. Each tracer disappears only when its own tail has drained.
    fctx.clearRect(0,0,cssW,cssH);

    let activeTracers=0;
    for(const e of goldEvents) drawGoldEvent(e,t);
    for(const e of tealEvents) if(drawTealEvent(e,t)) activeTracers++;

    // Safety target: coverage particles are scheduled to finish naturally before this point.
    // If a very slow device delays frames, completing already-traversed coverage lanes prevents
    // stranded white without fading or clearing the entire mask.
    if(t>=WHITE_TARGET_MS && !allCoverageComplete()){
      for(const e of tealEvents) if(e.coverage && !e.completed) completeCoverage(e);
    }

    // The bridge fade starts only after the white-erasure phase. Existing particle FX are allowed
    // to drain naturally; there is no 2400ms global FX clear anymore.
    if(t>=BRIDGE_FADE_START_MS){
      const p=clamp((t-BRIDGE_FADE_START_MS)/(TOTAL_MS-BRIDGE_FADE_START_MS),0,1);
      tealLayer.style.opacity=String(1-easeInOut(p));
      mask.style.opacity=String(1-easeInOut(p));
    }

    if(t>=TOTAL_MS){finish();return;}
    raf=requestAnimationFrame(frame);
  }

  let resizeTimer=0;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{
      if(!finished){resize();start=performance.now();}
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