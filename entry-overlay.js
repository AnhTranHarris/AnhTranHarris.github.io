/* Harris Portfolio entry — randomized constructive/destructive field reveal.
   FULL REWRITE: Canvas 2D only. No video, WebGL, Three.js, or moving blob sprites.
   Each load generates a bounded random wave profile. Hard categorical cells are drawn
   with nearest-neighbor scaling so boundaries stay crisp on desktop and mobile. */
(() => {
  'use strict';

  const overlay = document.getElementById('portfolio-entry-overlay');
  if (!overlay) return;

  const nav = performance.getEntriesByType?.('navigation')?.[0];
  const shouldSkip = nav?.type === 'back_forward' ||
    window.matchMedia?.('(forced-colors: active)').matches ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finishImmediately = () => {
    document.documentElement.dataset.entryState = 'complete';
    overlay.remove();
  };
  if (shouldSkip) { finishImmediately(); return; }

  const TOTAL_MS = 3270;
  const WHITE_HOLD_MS = 90;
  const FAILSAFE_MS = 4700;
  const TAU = Math.PI * 2;
  const COLORS = {
    white: [255,255,255,255],
    ink:   [6,21,28,255],
    gold:  [216,184,106,255]
  };

  const rand = (a,b) => a + Math.random() * (b-a);
  const randSign = () => Math.random() < .5 ? -1 : 1;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const smoothstep = (a,b,x) => {
    const q = clamp((x-a)/(b-a),0,1);
    return q*q*(3-2*q);
  };

  // One random but bounded profile per page load. These ranges deliberately keep the
  // animation in the same visual family while changing its exact growth/decay pattern.
  const RUN = {
    cellCss: rand(6.5,11.5),
    waves: [
      {kx:rand(.85,1.55)*randSign(), ky:rand(.28,.82)*randSign(), speed:rand(2.8,5.3)*randSign(), phase:rand(0,TAU)},
      {kx:rand(.45,1.20)*randSign(), ky:rand(.90,1.60)*randSign(), speed:rand(2.5,4.9)*randSign(), phase:rand(0,TAU)},
      {kx:rand(.70,1.45)*randSign(), ky:rand(.65,1.35)*randSign(), speed:rand(3.3,5.8)*randSign(), phase:rand(0,TAU)},
      {kx:rand(1.05,1.80)*randSign(), ky:rand(.35,1.05)*randSign(), speed:rand(2.9,5.5)*randSign(), phase:rand(0,TAU)}
    ],
    pressure: [
      {x:rand(.18,.38),y:rand(.18,.42),dx:rand(.16,.31)*randSign(),dy:rand(.16,.31)*randSign(),driftX:rand(.55,1.05),driftY:rand(.62,1.12),freq:rand(1.7,2.8),speed:rand(3.7,6.2)*randSign(),phase:rand(0,TAU)},
      {x:rand(.62,.82),y:rand(.58,.82),dx:rand(.16,.31)*randSign(),dy:rand(.16,.31)*randSign(),driftX:rand(.58,1.08),driftY:rand(.54,1.02),freq:rand(1.9,3.0),speed:rand(3.5,6.0)*randSign(),phase:rand(0,TAU)}
    ],
    goldGrowth: rand(1.35,2.35),
    inkGrowth: rand(1.20,2.25),
    whiteGrowth: rand(1.35,2.55),
    fastGold: rand(3.7,6.3),
    fastInk: rand(3.5,6.0),
    fastWhite: rand(3.8,6.5),
    territorySpeed: rand(1.25,2.45),
    territoryCross: rand(2.4,4.0),
    revealStart: rand(.61,.70),
    finalStart: rand(.945,.968),
    revealPhase: rand(0,TAU)
  };

  const canvas = document.createElement('canvas');
  canvas.className = 'entry-field-canvas';
  canvas.setAttribute('aria-hidden','true');
  overlay.appendChild(canvas);
  const ctx = canvas.getContext('2d',{alpha:true,desynchronized:true});
  if (!ctx) { finishImmediately(); return; }
  ctx.imageSmoothingEnabled = false;

  const fieldCanvas = document.createElement('canvas');
  const fieldCtx = fieldCanvas.getContext('2d',{alpha:true});
  if (!fieldCtx) { finishImmediately(); return; }
  fieldCtx.imageSmoothingEnabled = false;

  let cssW=1,cssH=1,cols=1,rows=1,imageData=null,data=null;
  let uCoord=null,vCoord=null,waveBase=[],start=0,raf=0,watchdog=0,finished=false;

  function setPixel(index,rgba){
    const o=index*4;
    data[o]=rgba[0];data[o+1]=rgba[1];data[o+2]=rgba[2];data[o+3]=rgba[3];
  }

  function resize(){
    cssW=Math.max(1,window.innerWidth);
    cssH=Math.max(1,window.innerHeight);
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(cssW*dpr);
    canvas.height=Math.round(cssH*dpr);
    canvas.style.width=`${cssW}px`;
    canvas.style.height=`${cssH}px`;
    ctx.imageSmoothingEnabled=false;

    // Cell size is defined in CSS pixels, not viewport count. This makes the stair-step
    // edge scale visually consistent across portrait, landscape, desktop and mobile.
    cols=clamp(Math.ceil(cssW/RUN.cellCss),34,220);
    rows=clamp(Math.ceil(cssH/RUN.cellCss),34,160);
    fieldCanvas.width=cols;
    fieldCanvas.height=rows;
    imageData=fieldCtx.createImageData(cols,rows);
    data=imageData.data;
    uCoord=new Float32Array(cols);
    vCoord=new Float32Array(rows);
    for(let x=0;x<cols;x++)uCoord[x]=(x+.5)/cols;
    for(let y=0;y<rows;y++)vCoord[y]=(y+.5)/rows;

    // Precompute spatial dot products for each directional oscillator. Only time phase
    // changes every frame, keeping the higher-resolution grid fast enough on mobile.
    waveBase=RUN.waves.map(()=>new Float32Array(cols*rows));
    let i=0;
    for(let y=0;y<rows;y++){
      const py=(vCoord[y]-.5)*TAU;
      for(let x=0;x<cols;x++,i++){
        const px=(uCoord[x]-.5)*TAU;
        for(let n=0;n<RUN.waves.length;n++){
          const w=RUN.waves[n];
          waveBase[n][i]=w.kx*px+w.ky*py+w.phase;
        }
      }
    }
  }

  function renderWhite(){
    for(let i=0;i<cols*rows;i++)setPixel(i,COLORS.white);
    fieldCtx.putImageData(imageData,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(fieldCanvas,0,0,canvas.width,canvas.height);
  }

  function renderField(seconds,progress){
    const t=seconds;
    const w0=RUN.waves[0],w1=RUN.waves[1],w2=RUN.waves[2],w3=RUN.waves[3];
    const p0=RUN.pressure[0],p1=RUN.pressure[1];

    const c1x=p0.x+p0.dx*Math.sin(t*p0.driftX+p0.phase);
    const c1y=p0.y+p0.dy*Math.cos(t*p0.driftY+p0.phase*.73);
    const c2x=p1.x+p1.dx*Math.cos(t*p1.driftX+p1.phase);
    const c2y=p1.y+p1.dy*Math.sin(t*p1.driftY+p1.phase*.61);

    // Independent growth/decay clocks. These are randomized each visit, so gold, ink
    // and white do not repeat the same dominance timing from one load to the next.
    const goldBias=.38*Math.sin(t*RUN.goldGrowth+RUN.revealPhase)+.24*Math.sin(t*RUN.fastGold+.7);
    const inkBias =.36*Math.sin(t*RUN.inkGrowth +RUN.revealPhase+2.1)+.23*Math.sin(t*RUN.fastInk+1.35);
    const whiteBias=.33*Math.sin(t*RUN.whiteGrowth+RUN.revealPhase+4.0)+.21*Math.sin(t*RUN.fastWhite+2.65);

    const revealRamp=smoothstep(RUN.revealStart,.985,progress);
    const finalRamp=smoothstep(RUN.finalStart,1,progress);

    let idx=0;
    for(let y=0;y<rows;y++){
      const v=vCoord[y];
      for(let x=0;x<cols;x++,idx++){
        const u=uCoord[x];

        const d1=Math.sin(waveBase[0][idx]+t*w0.speed);
        const d2=Math.sin(waveBase[1][idx]+t*w1.speed);
        const d3=Math.sin(waveBase[2][idx]+t*w2.speed);
        const d4=Math.sin(waveBase[3][idx]+t*w3.speed);

        // Manhattan pressure fronts create the sharp 45-degree/stair-step growth edges
        // seen in the reference rather than soft circular metaball boundaries.
        const m1=Math.abs(u-c1x)+Math.abs(v-c1y);
        const m2=Math.abs(u-c2x)+Math.abs(v-c2y);
        const r1=Math.cos(m1*TAU*p0.freq-t*p0.speed+p0.phase);
        const r2=Math.cos(m2*TAU*p1.freq-t*p1.speed+p1.phase);

        let gold=1.08*d1+.68*d3-.57*d2+.88*r1-.42*r2+goldBias;
        let ink =-.74*d1+1.08*d2+.72*d4+.82*r2-.34*r1+inkBias;
        let white=.62*d1-.53*d3+.92*d4-.37*r1+.45*r2+whiteBias;

        // Large territorial constructive/destructive waves. Different speeds make some
        // regions explode outward while others decay more slowly during the same run.
        const territoryA=Math.sin((u+v)*TAU*randlessA - t*RUN.territorySpeed);
        const territoryB=Math.sin((u-v)*TAU*randlessB + t*RUN.territoryCross+.8);
        const territory=territoryA+.70*territoryB;
        const breathe=Math.sin(t*(RUN.territorySpeed*.72)+RUN.revealPhase);
        gold+=territory*.30*breathe;
        ink -=territory*.27*breathe;
        white+=territory*.17*Math.sin(t*(RUN.territorySpeed*.91)+2.2);

        let rgba=COLORS.white;
        let best=white;
        const threshold=.005+.075*Math.sin(t*randThreshold+RUN.revealPhase);
        if(ink>best+threshold){best=ink;rgba=COLORS.ink;}
        if(gold>best+threshold){rgba=COLORS.gold;}

        let transparent=false;
        if(revealRamp>0){
          const px=(u-.5)*TAU,py=(v-.5)*TAU;
          const reveal=.78*Math.sin(.90*px-1.14*py+t*randRevealSpeed+RUN.revealPhase)+
            .61*Math.cos((Math.abs(u-.56)+Math.abs(v-.45))*TAU*randRevealFreq-t*randRevealPressure+1.0)+
            .39*Math.sin(-1.48*px-.36*py-t*4.0+2.6);
          transparent=reveal>1.47-2.82*revealRamp;
        }

        if(finalRamp>0){
          const direction=randFinalDirection;
          const sweep=direction===0?u+.58*v:direction===1?(1-u)+.58*v:direction===2?u+.58*(1-v):(1-u)+.58*(1-v);
          if(sweep<-.10+1.82*finalRamp)transparent=true;
        }

        setPixel(idx,transparent?[0,0,0,0]:rgba);
      }
    }

    fieldCtx.putImageData(imageData,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(fieldCanvas,0,0,canvas.width,canvas.height);
  }

  // Additional per-run constants used inside the hot pixel loop. Generated once only.
  const randlessA=rand(.72,1.36);
  const randlessB=rand(.66,1.22);
  const randThreshold=rand(1.35,2.35);
  const randRevealSpeed=rand(4.6,6.1);
  const randRevealFreq=rand(1.45,2.05);
  const randRevealPressure=rand(4.7,6.3);
  const randFinalDirection=Math.floor(rand(0,4));

  function finish(){
    if(finished)return;
    finished=true;
    clearTimeout(watchdog);
    cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState='complete';
    overlay.classList.add('entry-complete');
    setTimeout(()=>overlay.remove(),90);
  }

  function frame(now){
    if(!start)start=now;
    const elapsedTotal=now-start;
    if(elapsedTotal<WHITE_HOLD_MS){
      renderWhite();
    }else{
      const elapsed=elapsedTotal-WHITE_HOLD_MS;
      const progress=clamp(elapsed/TOTAL_MS,0,1);
      renderField(elapsed/1000,progress);
      if(progress>=1){finish();return;}
    }
    raf=requestAnimationFrame(frame);
  }

  let resizeTimer=0;
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>{if(!finished)resize();},90);
  },{passive:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)finish();},{passive:true});

  try{
    resize();
    renderWhite();
    document.documentElement.dataset.entryState='running';
    watchdog=setTimeout(finish,FAILSAFE_MS);
    raf=requestAnimationFrame(frame);
  }catch(error){
    console.error('Entry overlay failed safely:',error);
    finishImmediately();
  }
})();