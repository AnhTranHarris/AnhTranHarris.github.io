/* Harris Portfolio: modular 3.1s flock entry choreography.
   Stateful 3D steering/boids engine: position + velocity + acceleration.
   Four groups: words, portfolio alignment, membrane erasure, and free flight.
   Isolated from carousel/resume systems; watchdog always releases the page. */
(() => {
  'use strict';

  const overlay=document.getElementById('portfolio-entry-overlay');
  if(!overlay)return;
  const nav=performance.getEntriesByType?.('navigation')?.[0];
  if(nav?.type==='back_forward'||window.matchMedia?.('(forced-colors: active)').matches){
    document.documentElement.dataset.entryState='complete';overlay.remove();return;
  }

  const canvas=document.createElement('canvas');
  canvas.setAttribute('aria-hidden','true');overlay.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
  if(!ctx){document.documentElement.dataset.entryState='complete';overlay.remove();return;}

  const membrane=document.createElement('canvas');
  const mctx=membrane.getContext('2d');
  if(!mctx){document.documentElement.dataset.entryState='complete';overlay.remove();return;}

  const TOTAL=3100,WIPE_START=2200,WIPE_END=2980,TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const V=(x=0,y=0,z=0)=>({x,y,z});
  const add=(a,b)=>V(a.x+b.x,a.y+b.y,a.z+b.z);
  const sub=(a,b)=>V(a.x-b.x,a.y-b.y,a.z-b.z);
  const mul=(a,s)=>V(a.x*s,a.y*s,a.z*s);
  const mag=a=>Math.hypot(a.x,a.y,a.z);
  const norm=a=>{const m=mag(a)||1;return mul(a,1/m);};
  const limit=(a,m)=>{const n=mag(a);return n>m?mul(a,m/n):a;};

  let w=1,h=1,dpr=1,focal=650,start=0,last=0,raf=0,finished=false;
  let birds=[],group1=[],group2=[],group3=[],group4=[],wordTargets=new Map(),wipeBird=null;

  function project(p){
    const z=Math.max(90,p.z),s=focal/z;
    return{x:w*.5+p.x*s,y:h*.5+p.y*s,scale:s,z};
  }
  function screenToWorld(x,y,z){
    const s=focal/z;return V((x-w*.5)/s,(y-h*.5)/s,z);
  }

  function edgePoint(side,pad=16){
    if(side===0)return{x:rand(0,w),y:-pad};
    if(side===1)return{x:w+pad,y:rand(0,h)};
    if(side===2)return{x:rand(0,w),y:h+pad};
    return{x:-pad,y:rand(0,h)};
  }
  function innerAim(side){
    const marginX=w*.12,marginY=h*.12;
    if(side===0)return{x:rand(marginX,w-marginX),y:rand(h*.42,h*.86)};
    if(side===1)return{x:rand(w*.08,w*.58),y:rand(marginY,h-marginY)};
    if(side===2)return{x:rand(marginX,w-marginX),y:rand(h*.10,h*.58)};
    return{x:rand(w*.42,w*.92),y:rand(marginY,h-marginY)};
  }

  function speedProfile(){
    const r=Math.random();
    if(r<.22)return{min:560,max:840,cruise:rand(620,800)};
    if(r<.76)return{min:330,max:560,cruise:rand(380,520)};
    return{min:190,max:360,cruise:rand(220,330)};
  }

  function spawnBird(group,index,bird=null){
    const side=Math.floor(rand(0,4)),screen=edgePoint(side,rand(8,26));
    const z=rand(650,2200),pos=screenToWorld(screen.x,screen.y,z);
    const aim=innerAim(side),aimZ=clamp(z+rand(-650,520),280,2300);
    const target=screenToWorld(aim.x,aim.y,aimZ);
    const speed=speedProfile();
    let dir=norm(sub(target,pos));
    dir=norm(add(dir,V(rand(-.16,.16),rand(-.13,.13),rand(-.10,.10))));
    const obj=bird||{};
    Object.assign(obj,{
      group,index,pos,vel:mul(dir,speed.cruise),acc:V(),
      minSpeed:speed.min,maxSpeed:speed.max,cruise:speed.cruise,
      maxForce:rand(210,390),base:rand(5.2,11.8),phase:rand(0,TAU),
      bank:0,tone:Math.random()<.09?'gold':(Math.random()<.17?'teal':'charcoal'),
      age:0,eraseX:null,eraseY:null
    });
    return obj;
  }

  const WORDS=[
    {text:'BUILD',start:520,peak:800,release:1040},
    {text:'EXPLORE',start:940,peak:1230,release:1480},
    {text:'IMPROVE',start:1360,peak:1660,release:1910}
  ];

  function buildWordTargets(){
    wordTargets=new Map();
    const off=document.createElement('canvas'),octx=off.getContext('2d');
    const ow=Math.min(920,Math.max(320,w*.80)),oh=Math.min(220,Math.max(125,h*.23));
    off.width=Math.round(ow);off.height=Math.round(oh);
    octx.textAlign='center';octx.textBaseline='middle';octx.fillStyle='#000';
    octx.font=`800 ${Math.max(42,Math.min(126,ow/7))}px Inter,Arial,sans-serif`;
    for(const spec of WORDS){
      octx.clearRect(0,0,off.width,off.height);octx.fillText(spec.text,off.width/2,off.height/2);
      const data=octx.getImageData(0,0,off.width,off.height).data,pts=[];
      const step=Math.max(7,Math.round(off.width/105));
      for(let y=2;y<off.height-2;y+=step)for(let x=2;x<off.width-2;x+=step){
        if(data[(y*off.width+x)*4+3]>100)pts.push([x/off.width,y/off.height]);
      }
      for(let i=pts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]];}
      wordTargets.set(spec.text,pts.slice(0,group1.length));
    }
  }
  function activeWord(t){return WORDS.find(s=>t>=s.start&&t<=s.release)||null;}
  function wordStrength(spec,t){
    if(!spec)return 0;
    if(t<=spec.peak)return smooth((t-spec.start)/(spec.peak-spec.start));
    return 1-smooth((t-spec.peak)/(spec.release-spec.peak));
  }

  function portfolioTarget(i){
    const topY=86,cardW=Math.min(610,w*.56),cardH=Math.min(430,h*.48),cx=w*.66,cy=h*.51;
    if(i<16)return{x:mix(w*.31,w*.69,i/15),y:topY};
    const j=i-16,per=2*(cardW+cardH),d=(j/Math.max(1,group2.length-17))*per;
    if(d<cardW)return{x:cx-cardW/2+d,y:cy-cardH/2};
    if(d<cardW+cardH)return{x:cx+cardW/2,y:cy-cardH/2+d-cardW};
    if(d<cardW*2+cardH)return{x:cx+cardW/2-(d-cardW-cardH),y:cy+cardH/2};
    return{x:cx-cardW/2,y:cy+cardH/2-(d-cardW*2-cardH)};
  }

  function initFlock(){
    birds=[];
    group1=Array.from({length:64},(_,i)=>spawnBird(1,i));
    group2=Array.from({length:48},(_,i)=>spawnBird(2,i));
    group3=Array.from({length:38},(_,i)=>spawnBird(3,i));
    group4=Array.from({length:58},(_,i)=>spawnBird(4,i));
    birds=[...group1,...group2,...group3,...group4];
    wipeBird=group3[Math.floor(group3.length*.61)];
    buildWordTargets();
  }

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,1.65);
    w=Math.max(1,window.innerWidth);h=Math.max(1,window.innerHeight);
    focal=clamp(Math.min(w,h)*1.05,320,850);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;ctx.setTransform(dpr,0,0,dpr,0,0);
    membrane.width=Math.round(w*dpr);membrane.height=Math.round(h*dpr);mctx.setTransform(dpr,0,0,dpr,0,0);
    mctx.globalCompositeOperation='source-over';mctx.fillStyle='#fff';mctx.fillRect(0,0,w,h);
    initFlock();
  }

  function seek(b,target,maxSpeed=null){
    const desired=sub(target,b.pos),d=mag(desired);
    if(d<1)return V();
    const speed=maxSpeed||b.maxSpeed;
    return limit(sub(mul(norm(desired),speed),b.vel),b.maxForce);
  }

  function flockForce(b,index){
    let sep=V(),ali=V(),coh=V(),count=0;
    const samples=12,stride=17;
    for(let k=1;k<=samples;k++){
      const other=birds[(index+k*stride)%birds.length];
      if(!other||other===b)continue;
      const delta=sub(other.pos,b.pos),d=mag(delta);
      if(d>520)continue;
      count++;
      if(d<150)sep=add(sep,mul(norm(sub(b.pos,other.pos)),(150-d)/150));
      ali=add(ali,other.vel);coh=add(coh,other.pos);
    }
    if(!count)return V();
    ali=seek(b,add(b.pos,mul(ali,1/count)),b.cruise);
    coh=seek(b,mul(coh,1/count),b.cruise);
    sep=mul(norm(sep),b.maxForce);
    return add(add(mul(ali,.22),mul(coh,.085)),mul(sep,.62));
  }

  function formationForce(b,t){
    if(b.group===1){
      const spec=activeWord(t),strength=wordStrength(spec,t);
      if(spec&&strength>0){
        const pts=wordTargets.get(spec.text)||[],pt=pts[b.index];
        if(pt){
          const sx=w*.5+(pt[0]-.5)*Math.min(w*.78,900);
          const sy=h*.49+(pt[1]-.5)*Math.min(h*.23,215);
          const target=screenToWorld(sx,sy,650);
          return mul(seek(b,target,b.maxSpeed*.82),1.15*strength);
        }
      }
    }
    if(b.group===2){
      const strength=smooth((t-1500)/620)*(1-smooth((t-2580)/260));
      if(strength>0){
        const pt=portfolioTarget(b.index),target=screenToWorld(pt.x,pt.y,720);
        return mul(seek(b,target,b.maxSpeed*.74),1.10*strength);
      }
    }
    return V();
  }

  function airCurrent(b,t){
    const a=Math.sin(t*.00072+b.phase),c=Math.cos(t*.00051+b.phase*.73);
    return V(a*24,c*18,Math.sin(t*.00039+b.phase*.41)*16);
  }

  function outOfFrustum(b){
    const p=project(b.pos),pad=150;
    return b.pos.z<100||b.pos.z>2700||p.x<-pad||p.x>w+pad||p.y<-pad||p.y>h+pad;
  }

  function updateBird(b,index,t,dt){
    b.age+=dt;
    let force=flockForce(b,index);
    force=add(force,formationForce(b,t));
    force=add(force,airCurrent(b,t));
    const desired=mul(norm(b.vel),b.cruise);
    force=add(force,mul(limit(sub(desired,b.vel),b.maxForce),.32));
    b.acc=limit(force,b.maxForce*1.45);
    b.vel=add(b.vel,mul(b.acc,dt));

    const speed=mag(b.vel);
    if(speed<b.minSpeed)b.vel=mul(norm(b.vel),b.minSpeed);
    else if(speed>b.maxSpeed)b.vel=mul(norm(b.vel),b.maxSpeed);

    b.pos=add(b.pos,mul(b.vel,dt));
    const targetBank=clamp(b.acc.x/Math.max(120,b.maxForce),-.72,.72);
    b.bank=mix(b.bank,targetBank,clamp(dt*5.5,0,1));
    if(outOfFrustum(b)&&b.age>.22)spawnBird(b.group,b.index,b);
  }

  function colorFor(b,z,alpha){
    const near=clamp(1-(z-150)/1900,0,1);
    if(b.tone==='gold')return`rgba(124,101,58,${alpha})`;
    if(b.tone==='teal')return`rgba(42,102,104,${alpha})`;
    const c=Math.round(mix(82,20,near));return`rgba(${c},${c+2},${c+4},${alpha})`;
  }

  function drawTriangle(b,alpha=1){
    const p=project(b.pos);if(p.z<90)return;
    const size=clamp(b.base*p.scale*1.9,1.8,72);
    const heading=Math.atan2(b.vel.y,b.vel.x)+Math.PI/2;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(heading+b.bank);ctx.globalAlpha=alpha;ctx.fillStyle=colorFor(b,p.z,alpha);
    ctx.beginPath();ctx.moveTo(0,-size*1.08);ctx.lineTo(size*.98,size*.76);ctx.lineTo(-size*.98,size*.76);ctx.closePath();ctx.fill();ctx.restore();
    return p;
  }

  function eraseTrail(b,p){
    if(!p)return;
    if(b.eraseX==null){b.eraseX=p.x;b.eraseY=p.y;return;}
    const size=clamp(b.base*p.scale*2.2,4,85);
    mctx.save();mctx.globalCompositeOperation='destination-out';mctx.lineCap='round';
    mctx.globalAlpha=.16+clamp(p.scale*.11,0,.32);mctx.lineWidth=size*1.45;
    mctx.beginPath();mctx.moveTo(b.eraseX,b.eraseY);mctx.lineTo(p.x,p.y);mctx.stroke();
    mctx.restore();b.eraseX=p.x;b.eraseY=p.y;
  }

  function nearCameraWipe(t){
    if(t<WIPE_START)return;
    const q=smooth((t-WIPE_START)/(WIPE_END-WIPE_START));
    const sx=mix(-w*.12,w*1.12,q),sy=h*(.68-Math.sin(q*Math.PI)*.34);
    const size=mix(40,Math.hypot(w,h)*1.18,smooth(clamp((q-.18)/.62,0,1)));
    const rot=-.55+q*.85;

    mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=clamp(.25+q*1.1,0,1);
    mctx.translate(sx,sy);mctx.rotate(rot);mctx.beginPath();mctx.moveTo(0,-size);mctx.lineTo(size*.98,size*.78);mctx.lineTo(-size*.98,size*.78);mctx.closePath();mctx.fill();mctx.restore();

    if(q<.86){
      ctx.save();ctx.translate(sx,sy);ctx.rotate(rot);ctx.globalAlpha=.92;ctx.fillStyle='rgba(27,31,34,.92)';
      const capped=Math.min(size,Math.hypot(w,h)*.9);
      ctx.beginPath();ctx.moveTo(0,-capped);ctx.lineTo(capped*.98,capped*.78);ctx.lineTo(-capped*.98,capped*.78);ctx.closePath();ctx.fill();ctx.restore();
    }
    if(q>.80){mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=smooth((q-.80)/.20);mctx.fillRect(0,0,w,h);mctx.restore();}
  }

  function finish(){
    if(finished)return;finished=true;cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState='complete';overlay.classList.add('entry-complete');
    setTimeout(()=>overlay.remove(),180);
  }

  const watchdog=setTimeout(finish,4300);
  function frame(now){
    if(!start){start=now;last=now;}
    const t=now-start,dt=clamp((now-last)/1000,0,.033);last=now;
    birds.forEach((b,i)=>updateBird(b,i,t,dt));

    ctx.clearRect(0,0,w,h);
    ctx.drawImage(membrane,0,0,membrane.width,membrane.height,0,0,w,h);

    birds.forEach(b=>{
      if(b===wipeBird)return;
      const fade=b.group===4?1-smooth((t-2740)/280):1;
      if(fade<=0)return;
      const alpha=(b.group===3?0.72:(b.group===4?0.66:0.86))*fade;
      const p=drawTriangle(b,alpha);
      if(b.group===3&&t>420&&t<2320)eraseTrail(b,p);
    });

    nearCameraWipe(t);
    if(t>=TOTAL){clearTimeout(watchdog);finish();return;}
    raf=requestAnimationFrame(frame);
  }

  window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)finish();},{passive:true});
  try{resize();document.documentElement.dataset.entryState='running';raf=requestAnimationFrame(frame);}catch(_){clearTimeout(watchdog);finish();}
})();
