/* Harris Portfolio entry — discrete competitive block-growth reveal.
   Full rewrite: Canvas 2D cellular automaton, no video/WebGL/wave blobs.
   White, ink and gold occupy a rectangular lattice and compete through directional
   propagation, erosion and timed reseeding. Geometry changes in discrete bursts so
   the motion reads as block construction/destruction rather than liquid flow. */
(() => {
  'use strict';

  const overlay=document.getElementById('portfolio-entry-overlay');
  if(!overlay)return;
  const nav=performance.getEntriesByType?.('navigation')?.[0];
  const skip=nav?.type==='back_forward'||window.matchMedia?.('(forced-colors: active)').matches||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const finishImmediately=()=>{document.documentElement.dataset.entryState='complete';overlay.remove();};
  if(skip){finishImmediately();return;}

  const TOTAL_MS=3270,WHITE_HOLD_MS=90,FAILSAFE_MS=4700;
  const WHITE=0,INK=1,GOLD=2,CLEAR=3;
  const COLORS=[[255,255,255,255],[6,21,28,255],[216,184,106,255],[0,0,0,0]];
  const rand=(a,b)=>a+Math.random()*(b-a),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const choice=a=>a[Math.floor(Math.random()*a.length)];

  const canvas=document.createElement('canvas');
  canvas.className='entry-field-canvas';canvas.setAttribute('aria-hidden','true');overlay.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  if(!ctx){finishImmediately();return;}ctx.imageSmoothingEnabled=false;
  const field=document.createElement('canvas');
  const fctx=field.getContext('2d',{alpha:true});if(!fctx){finishImmediately();return;}fctx.imageSmoothingEnabled=false;

  let cssW=1,cssH=1,cols=1,rows=1,grid=null,next=null,img=null,pix=null;
  let start=0,lastStep=0,nextStepAt=0,raf=0,watchdog=0,finished=false,stepNo=0;
  let events=[];

  const RUN={
    cellCss:rand(8,14),
    baseTick:rand(28,46),
    fastTick:rand(16,26),
    slowTick:rand(52,78),
    inertia:rand(1.35,1.85),
    capture:rand(.54,.72),
    erosion:rand(.08,.16),
    ortho:rand(1.05,1.35),
    diag:rand(.46,.72),
    burstCount:Math.floor(rand(6,9)),
    revealStart:rand(.64,.71)
  };

  function id(x,y){return y*cols+x;}
  function inb(x,y){return x>=0&&x<cols&&y>=0&&y<rows;}

  function resize(){
    cssW=Math.max(1,window.innerWidth);cssH=Math.max(1,window.innerHeight);
    const dpr=Math.min(window.devicePixelRatio||1,2);
    canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
    canvas.style.width=`${cssW}px`;canvas.style.height=`${cssH}px`;ctx.imageSmoothingEnabled=false;
    cols=clamp(Math.ceil(cssW/RUN.cellCss),38,180);rows=clamp(Math.ceil(cssH/RUN.cellCss),38,180);
    field.width=cols;field.height=rows;img=fctx.createImageData(cols,rows);pix=img.data;
    grid=new Uint8Array(cols*rows);next=new Uint8Array(cols*rows);grid.fill(WHITE);next.fill(WHITE);
    buildEvents();
  }

  function edgePoint(side){
    if(side===0)return{x:Math.floor(rand(0,cols)),y:0};
    if(side===1)return{x:cols-1,y:Math.floor(rand(0,rows))};
    if(side===2)return{x:Math.floor(rand(0,cols)),y:rows-1};
    return{x:0,y:Math.floor(rand(0,rows))};
  }

  function buildEvents(){
    events=[];
    const states=[INK,GOLD,INK,GOLD,WHITE,INK,GOLD,WHITE];
    let t=130;
    for(let i=0;i<RUN.burstCount;i++){
      const side=Math.floor(rand(0,4)),p=edgePoint(side);
      const state=states[i%states.length];
      const duration=rand(300,620);
      const dir=side===0?{x:rand(-.35,.35),y:1}:side===1?{x:-1,y:rand(-.35,.35)}:side===2?{x:rand(-.35,.35),y:-1}:{x:1,y:rand(-.35,.35)};
      events.push({start:t,end:t+duration,state,x:p.x,y:p.y,w:Math.floor(rand(4,11)),h:Math.floor(rand(3,9)),dx:dir.x,dy:dir.y,power:rand(1.2,2.3),seeded:false});
      t+=rand(220,410);
    }
    // Two late transparent fronts reveal the live portfolio through the same lattice.
    events.push({start:TOTAL_MS*RUN.revealStart,end:TOTAL_MS*.90,state:CLEAR,...edgePoint(Math.floor(rand(0,4))),w:8,h:7,dx:choice([-1,1]),dy:choice([-1,1]),power:2.5,seeded:false});
    events.push({start:TOTAL_MS*.82,end:TOTAL_MS,state:CLEAR,...edgePoint(Math.floor(rand(0,4))),w:12,h:10,dx:choice([-1,1]),dy:choice([-1,1]),power:3.0,seeded:false});
  }

  function stamp(e){
    const hw=Math.floor(e.w/2),hh=Math.floor(e.h/2);
    for(let yy=-hh;yy<=hh;yy++)for(let xx=-hw;xx<=hw;xx++){
      const x=clamp(e.x+xx,0,cols-1),y=clamp(e.y+yy,0,rows-1);
      grid[id(x,y)]=e.state;
    }
    e.seeded=true;
  }

  function activeEvents(ms){return events.filter(e=>ms>=e.start&&ms<=e.end);}

  function cadence(ms){
    const active=activeEvents(ms);
    if(active.some(e=>e.state===CLEAR))return RUN.fastTick;
    if(active.length>=2)return RUN.fastTick;
    if(active.length===0)return RUN.slowTick;
    return RUN.baseTick*rand(.82,1.18);
  }

  function influenceAt(x,y,state,e){
    let s=0;
    const nb=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,.58],[1,-1,.58],[-1,1,.58],[-1,-1,.58]];
    for(const [dx,dy,w] of nb){
      const nx=x+dx,ny=y+dy;if(!inb(nx,ny)||grid[id(nx,ny)]!==state)continue;
      let k=w===1?RUN.ortho:RUN.diag;
      if(e){const dot=(-dx)*e.dx+(-dy)*e.dy;k*=1+Math.max(-.35,dot*.55);}
      s+=k;
    }
    return s;
  }

  function step(ms){
    const act=activeEvents(ms);
    for(const e of act)if(!e.seeded)stamp(e);
    next.set(grid);

    for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
      const i=id(x,y),cur=grid[i];
      let bestState=cur,best=RUN.inertia;
      for(const state of [WHITE,INK,GOLD,CLEAR]){
        if(state===cur)continue;
        let related=null,power=1;
        for(const e of act)if(e.state===state){related=e;power=Math.max(power,e.power);}
        let score=influenceAt(x,y,state,related)*power;
        if(state===WHITE&&cur!==WHITE)score+=RUN.erosion*rand(0,1);
        if(state===CLEAR&&ms<TOTAL_MS*RUN.revealStart)score=0;
        if(score>best){best=score;bestState=state;}
      }
      if(bestState!==cur&&Math.random()<RUN.capture)next[i]=bestState;
    }

    // Directional front reinforcement: active events push a rectangular nose forward.
    for(const e of act){
      const p=clamp((ms-e.start)/(e.end-e.start),0,1);
      const travel=Math.floor(p*Math.max(cols,rows)*.78);
      const cx=Math.round(e.x+e.dx*travel),cy=Math.round(e.y+e.dy*travel);
      const rw=Math.max(2,Math.round(e.w*(1-p*.35))),rh=Math.max(2,Math.round(e.h*(1-p*.35)));
      for(let yy=-rh;yy<=rh;yy++)for(let xx=-rw;xx<=rw;xx++){
        const x=cx+xx,y=cy+yy;if(!inb(x,y))continue;
        if(Math.random()<.22+e.power*.06)next[id(x,y)]=e.state;
      }
    }

    const tmp=grid;grid=next;next=tmp;stepNo++;
  }

  function render(){
    for(let i=0;i<grid.length;i++){
      const c=COLORS[grid[i]],o=i*4;pix[o]=c[0];pix[o+1]=c[1];pix[o+2]=c[2];pix[o+3]=c[3];
    }
    fctx.putImageData(img,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
    ctx.drawImage(field,0,0,canvas.width,canvas.height);
  }

  function renderWhite(){grid.fill(WHITE);render();}

  function finish(){
    if(finished)return;finished=true;clearTimeout(watchdog);cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState='complete';overlay.classList.add('entry-complete');
    setTimeout(()=>overlay.remove(),90);
  }

  function frame(now){
    if(!start){start=now;lastStep=now;nextStepAt=now+WHITE_HOLD_MS;}
    const elapsed=now-start;
    if(elapsed<WHITE_HOLD_MS){renderWhite();raf=requestAnimationFrame(frame);return;}
    const sim=elapsed-WHITE_HOLD_MS;
    while(now>=nextStepAt&&sim<TOTAL_MS){step(sim);nextStepAt+=cadence(sim);}
    render();
    if(sim>=TOTAL_MS){finish();return;}
    raf=requestAnimationFrame(frame);
  }

  let resizeTimer=0;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!finished){resize();renderWhite();}},90);},{passive:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)finish();},{passive:true});

  try{
    resize();renderWhite();document.documentElement.dataset.entryState='running';
    watchdog=setTimeout(finish,FAILSAFE_MS);raf=requestAnimationFrame(frame);
  }catch(error){console.error('Entry overlay failed safely:',error);finishImmediately();}
})();