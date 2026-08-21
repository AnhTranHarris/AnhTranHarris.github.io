/* Harris Portfolio intro — tracer-driven erasure reveal.
   White first paint -> white canvas mask -> dark-teal bridge -> live portfolio.
   The visible tracer body itself erodes the mask throughout pre-roll, head travel,
   and tail drain. No full-width completion wipe is used. */
(() => {
  'use strict';

  const overlay=document.getElementById('portfolio-entry-overlay');
  if(!overlay)return;

  const nav=performance.getEntriesByType?.('navigation')?.[0];
  const skip=nav?.type==='back_forward'||
    window.matchMedia?.('(forced-colors: active)').matches||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finishImmediately=()=>{
    document.documentElement.dataset.entryState='complete';
    overlay.remove();
  };
  if(skip){finishImmediately();return;}

  const TOTAL_MS=3200;
  const SPAWN_CUTOFF_MS=1450;
  const BRIDGE_FADE_START_MS=2450;
  const FAILSAFE_MS=4600;

  const COLORS={
    darkTeal:'#06151c',tealDark:'#0b4d50',tealGreen:'#1a7f77',
    tealBright:'#63d5d0',tealWhite:'#edf7f8',gold:'#d8b86a',goldHi:'#fff0b0'
  };

  const rand=(a,b)=>a+Math.random()*(b-a);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const easeInOut=t=>{t=clamp(t,0,1);return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;};
  const shuffle=array=>{
    for(let i=array.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [array[i],array[j]]=[array[j],array[i]];
    }
    return array;
  };

  const tealLayer=document.createElement('div');
  tealLayer.className='entry-teal-layer';
  tealLayer.setAttribute('aria-hidden','true');
  const mask=document.createElement('canvas');
  mask.className='entry-mask-canvas';
  mask.setAttribute('aria-hidden','true');
  const fx=document.createElement('canvas');
  fx.className='entry-fx-canvas';
  fx.setAttribute('aria-hidden','true');
  overlay.append(tealLayer,mask,fx);

  const mctx=mask.getContext('2d',{alpha:true,desynchronized:true});
  const fctx=fx.getContext('2d',{alpha:true,desynchronized:true});
  if(!mctx||!fctx){finishImmediately();return;}

  let cssW=1,cssH=1,dpr=1,start=0,raf=0,watchdog=0,finished=false;
  let tealEvents=[],goldEvents=[];

  function resizeCanvas(c,ctx){
    c.width=Math.max(1,Math.round(cssW*dpr));
    c.height=Math.max(1,Math.round(cssH*dpr));
    c.style.width=`${cssW}px`;
    c.style.height=`${cssH}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled=true;
  }

  function chooseSpeedVwPerMs(){
    const r=Math.random();
    if(r<.22)return rand(.015,.023);
    if(r<.92)return rand(.009,.015);
    return rand(.006,.009);
  }

  function chooseFamily(){
    const r=Math.random();
    if(r<.42)return{color:COLORS.tealDark,rgb:'11,77,80'};
    if(r<.84)return{color:COLORS.tealGreen,rgb:'26,127,119'};
    return{color:COLORS.tealBright,rgb:'99,213,208'};
  }

  function makeParticle(o={}){
    const thickness=o.thickness??(Math.random()<.84?rand(.55,2.1):rand(2.1,3));
    const family=chooseFamily();
    const speedVwMs=o.speedVwMs??chooseSpeedVwPerMs();
    return{
      y:o.y??rand(.5,Math.max(1,cssH-.5)),
      thickness,
      headLen:o.headLen??rand(2.5,13),
      tracerLen:o.tracerLen??rand(2.6,3.6)*cssW,
      dir:o.dir??(Math.random()<.5?1:-1),
      start:o.start??rand(20,SPAWN_CUTOFF_MS),
      speedPxMs:speedVwMs*cssW,
      preRollMs:o.preRollMs??rand(40,140),
      color:family.color,
      rgb:family.rgb,
      intensity:o.intensity??rand(.52,1),
      glowPct:o.glowPct??rand(.04,.20),
      glowIntensity:o.glowIntensity??rand(0,1),
      glowIntensity2:o.glowIntensity2??rand(0,1),
      eraseWidth:o.eraseWidth??Math.max(1,thickness*rand(.95,1.6)),
      coverage:!!o.coverage,
      coverageTop:o.coverageTop??null,
      coverageHeight:o.coverageHeight??null,
      completed:false
    };
  }

  function buildCoverageClusters(){
    const stripH=clamp(cssH/96,3.5,8);
    const strips=[];
    for(let top=0;top<cssH;top+=stripH){
      const height=Math.min(stripH+0.8,cssH-top);
      strips.push({top,height,y:clamp(top+height*.5+rand(-height*.16,height*.16),.5,cssH-.5)});
    }
    shuffle(strips);

    let cursor=0;
    let clusterIndex=0;
    const clusterTotal=Math.ceil(strips.length/7);
    while(cursor<strips.length){
      const remaining=strips.length-cursor;
      const members=Math.min(remaining,Math.round(rand(4,9)));
      const progress=clusterTotal<=1?0:clusterIndex/Math.max(1,clusterTotal-1);
      const baseStart=90+progress*1220+rand(-55,70);
      const baseSpeed=rand(.0115,.0175);
      const baseDir=Math.random()<.5?1:-1;
      const basePreRoll=rand(55,125);

      for(let j=0;j<members;j++){
        const s=strips[cursor+j];
        const dir=Math.random()<.84?baseDir:-baseDir;
        tealEvents.push(makeParticle({
          y:s.y,
          dir,
          start:clamp(baseStart+rand(-35,70),45,1360),
          speedVwMs:baseSpeed*rand(.92,1.10),
          preRollMs:basePreRoll+rand(-20,25),
          tracerLen:rand(3.1,4.1)*cssW,
          thickness:rand(.65,1.8),
          eraseWidth:s.height+1.2,
          intensity:rand(.48,.84),
          coverage:true,
          coverageTop:s.top,
          coverageHeight:s.height+0.8
        }));
      }
      cursor+=members;
      clusterIndex++;
    }
  }

  function buildEvents(){
    tealEvents=[];
    goldEvents=[];

    const independentCount=Math.round(rand(184,276));
    for(let i=0;i<independentCount;i++)tealEvents.push(makeParticle());

    const clusterCount=Math.round(rand(10,18));
    for(let c=0;c<clusterCount;c++){
      const members=Math.round(rand(4,9));
      const dir=Math.random()<.5?1:-1;
      const baseY=rand(cssH*.05,cssH*.95);
      const baseStart=rand(60,SPAWN_CUTOFF_MS-120);
      const baseSpeed=chooseSpeedVwPerMs();
      const basePreRoll=rand(45,125);
      const spread=rand(5,28);
      for(let j=0;j<members;j++){
        tealEvents.push(makeParticle({
          y:clamp(baseY+rand(-spread,spread),.5,cssH-.5),
          dir,
          start:baseStart+rand(-18,34),
          speedVwMs:baseSpeed*rand(.92,1.08),
          preRollMs:basePreRoll+rand(-18,18),
          tracerLen:rand(3,4)*cssW,
          intensity:rand(.64,1)
        }));
      }
    }

    buildCoverageClusters();

    const goldCount=Math.round(rand(3,6));
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
    // CSS paints the overlay white before JS can run. Only after the white canvas mask is
    // fully initialized do we expose the layer stack beneath it.
    overlay.style.background='transparent';
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

  // The visible tracer body is the eraser. We skip only the transparent first 2% of the
  // core gradient, then erase every on-screen pixel currently occupied by the tracer body.
  // This naturally includes pre-roll and remains active after the particle head exits.
  function eraseVisibleTracer(e,tailStart,head){
    const opaqueTail=tailStart+e.dir*(e.tracerLen*.02);
    const left=clamp(Math.min(opaqueTail,head),0,cssW);
    const right=clamp(Math.max(opaqueTail,head),0,cssW);
    if(right<=left)return;

    if(e.coverage&&e.coverageTop!==null&&e.coverageHeight!==null){
      eraseRect(left,e.coverageTop,right-left,e.coverageHeight,1);
    }else{
      eraseRect(left,e.y-e.eraseWidth/2,right-left,e.eraseWidth,1);
    }
  }

  // Completion is now state only. It never erases pixels. Every coverage strip must already
  // have been physically traversed by its tracer before this flag can be reached.
  function markCoverageComplete(e){
    if(e.coverage)e.completed=true;
  }

  function makeTracerGradient(e,tailStart,head,mode){
    const g=fctx.createLinearGradient(tailStart,0,head,0);
    if(mode==='halo2'){
      g.addColorStop(0,`rgba(${e.rgb},0)`);
      g.addColorStop(.10,`rgba(${e.rgb},.38)`);
      g.addColorStop(.92,`rgba(${e.rgb},.38)`);
      g.addColorStop(1,'rgba(99,213,208,.48)');
    }else if(mode==='halo1'){
      g.addColorStop(0,`rgba(${e.rgb},0)`);
      g.addColorStop(.10,`rgba(${e.rgb},.56)`);
      g.addColorStop(.92,`rgba(${e.rgb},.56)`);
      g.addColorStop(1,'rgba(99,213,208,.68)');
    }else{
      g.addColorStop(0,'rgba(6,21,28,0)');
      g.addColorStop(.008,`rgba(${e.rgb},.18)`);
      g.addColorStop(.02,`rgba(${e.rgb},.64)`);
      g.addColorStop(.20,`rgba(${e.rgb},.66)`);
      g.addColorStop(.50,`rgba(${e.rgb},.68)`);
      g.addColorStop(.80,`rgba(${e.rgb},.70)`);
      g.addColorStop(.94,`rgba(${e.rgb},.74)`);
      g.addColorStop(.98,'rgba(99,213,208,.86)');
      g.addColorStop(.995,'rgba(99,213,208,.97)');
      g.addColorStop(1,'rgba(237,247,248,1)');
    }
    return g;
  }

  function drawTracerStroke(e,tailStart,head){
    const coreGradient=makeTracerGradient(e,tailStart,head,'core');
    const halo1Gradient=makeTracerGradient(e,tailStart,head,'halo1');
    const halo2Gradient=makeTracerGradient(e,tailStart,head,'halo2');

    const primaryRadius=Math.max(6.6,e.thickness*(3.0+e.glowPct*18));
    const secondaryRadius=Math.max(10.0,primaryRadius*1.5);
    const primaryWidth=e.thickness+3*Math.max(.8,e.thickness*e.glowPct*2.5);
    const secondaryWidth=e.thickness+2*Math.max(1.8,e.thickness*e.glowPct*5);

    fctx.save();
    fctx.lineCap='butt';

    fctx.globalAlpha=e.intensity*e.glowIntensity2;
    fctx.strokeStyle=halo2Gradient;
    fctx.lineWidth=secondaryWidth;
    fctx.shadowColor=e.color;
    fctx.shadowBlur=secondaryRadius;
    fctx.beginPath();fctx.moveTo(tailStart,e.y);fctx.lineTo(head,e.y);fctx.stroke();

    fctx.globalAlpha=e.intensity*e.glowIntensity;
    fctx.strokeStyle=halo1Gradient;
    fctx.lineWidth=primaryWidth;
    fctx.shadowBlur=primaryRadius;
    fctx.beginPath();fctx.moveTo(tailStart,e.y);fctx.lineTo(head,e.y);fctx.stroke();

    fctx.shadowBlur=0;
    fctx.globalAlpha=e.intensity*.34;
    fctx.strokeStyle=coreGradient;
    fctx.lineWidth=Math.max(.5,e.thickness*1.18);
    fctx.beginPath();fctx.moveTo(tailStart,e.y);fctx.lineTo(head,e.y);fctx.stroke();

    fctx.globalAlpha=e.intensity;
    fctx.lineWidth=Math.max(.45,e.thickness*.82);
    fctx.beginPath();fctx.moveTo(tailStart,e.y);fctx.lineTo(head,e.y);fctx.stroke();
    fctx.restore();

    return{primaryRadius,secondaryRadius};
  }

  function drawTealEvent(e,t){
    const elapsed=t-e.start;
    if(elapsed<0)return false;

    const pad=Math.max(24,e.headLen*2);
    const startX=e.dir>0?-pad:cssW+pad;
    const head=startX+e.dir*e.speedPxMs*(elapsed+e.preRollMs);
    const tailStart=head-e.dir*e.tracerLen;
    const tailGone=e.dir>0?tailStart>cssW+pad:tailStart<-pad;

    if(tailGone){
      markCoverageComplete(e);
      return false;
    }

    // Erase first, then draw the optical tracer above the newly exposed dark-teal bridge.
    eraseVisibleTracer(e,tailStart,head);
    const halo=drawTracerStroke(e,tailStart,head);

    const headOnOrNearScreen=head>=-pad&&head<=cssW+pad;
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
      fctx.fillStyle=e.color;
      fctx.shadowColor=e.color;
      fctx.shadowBlur=halo.secondaryRadius;
      fctx.globalAlpha=e.intensity*e.glowIntensity2*.72;
      fctx.fillRect(headX,e.y-e.thickness/2,e.headLen,e.thickness);
      fctx.shadowBlur=halo.primaryRadius;
      fctx.globalAlpha=e.intensity*e.glowIntensity*.86;
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
    const center=e.dir>0?-e.glintWidth+p*(cssW+2*e.glintWidth):cssW+e.glintWidth-p*(cssW+2*e.glintWidth);
    const trailEnd=clamp(center,0,cssW);

    if(e.dir>0)eraseRect(0,e.y-e.thickness/2,trailEnd,e.thickness,1);
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
    for(const e of tealEvents)if(e.coverage&&!e.completed)return false;
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
    fctx.clearRect(0,0,cssW,cssH);

    for(const e of goldEvents)drawGoldEvent(e,t);
    for(const e of tealEvents)drawTealEvent(e,t);

    const coverageComplete=allCoverageComplete();
    if(t>=BRIDGE_FADE_START_MS&&coverageComplete){
      const p=clamp((t-BRIDGE_FADE_START_MS)/(TOTAL_MS-BRIDGE_FADE_START_MS),0,1);
      tealLayer.style.opacity=String(1-easeInOut(p));
    }

    // Never end the normal animation while guaranteed coverage tracers are unfinished.
    // This prevents a late overlay removal from masquerading as white-mask erosion.
    if(t>=TOTAL_MS&&coverageComplete){finish();return;}
    raf=requestAnimationFrame(frame);
  }

  let resizeTimer=0;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{if(!finished){resize();start=performance.now();}},100);
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