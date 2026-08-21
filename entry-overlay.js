/* Harris Portfolio: modular 3.1s flock entry choreography.
   True 3D white-space flight volume with four triangle groups:
   words, portfolio alignment, membrane erasure, and free flight.
   Isolated from carousel/resume systems; watchdog always releases the page. */
(() => {
  'use strict';

  const overlay = document.getElementById('portfolio-entry-overlay');
  if (!overlay) return;

  const nav = performance.getEntriesByType?.('navigation')?.[0];
  if (nav?.type === 'back_forward' || window.matchMedia?.('(forced-colors: active)').matches) {
    document.documentElement.dataset.entryState = 'complete';
    overlay.remove();
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  overlay.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) {
    document.documentElement.dataset.entryState = 'complete';
    overlay.remove();
    return;
  }

  const TOTAL = 3100;
  const WIPE_START = 2160;
  const WIPE_END = 2970;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const smoother = t => { t = clamp(t, 0, 1); return t*t*t*(t*(t*6-15)+10); };
  const rand = (a, b) => a + Math.random() * (b - a);

  let w = 1, h = 1, dpr = 1, focal = 700, start = 0, raf = 0, finished = false;
  let wordTargets = new Map();

  const V = (x=0,y=0,z=1) => ({x,y,z});
  const lerpV = (a,b,t) => V(mix(a.x,b.x,t), mix(a.y,b.y,t), mix(a.z,b.z,t));

  function cubic(a,b,c,d,t){
    const u=1-t, uu=u*u, tt=t*t;
    return uu*u*a + 3*uu*t*b + 3*u*tt*c + tt*t*d;
  }
  function cubicD(a,b,c,d,t){
    const u=1-t;
    return 3*u*u*(b-a)+6*u*t*(c-b)+3*t*t*(d-c);
  }

  function project(p){
    const z = Math.max(70, p.z);
    const s = focal / z;
    return { x:w*.5 + p.x*s, y:h*.5 + p.y*s, scale:s, z };
  }

  function screenToWorld(x,y,z){
    const s = focal / z;
    return V((x-w*.5)/s, (y-h*.5)/s, z);
  }

  function projectedEdgePoint(side, pad=14){
    if(side===0) return {x:rand(-pad,w+pad),y:-pad};
    if(side===1) return {x:w+pad,y:rand(-pad,h+pad)};
    if(side===2) return {x:rand(-pad,w+pad),y:h+pad};
    return {x:-pad,y:rand(-pad,h+pad)};
  }

  function make3DPath(group,i){
    const side0=Math.floor(rand(0,4));
    let side1=Math.floor(rand(0,4));
    if(side1===side0) side1=(side1+2)%4;

    const startScreen=projectedEdgePoint(side0,rand(8,22));
    const endScreen=projectedEdgePoint(side1,rand(18,46));
    const z0=rand(1050,2200);
    const z3=rand(800,2100);

    // Most birds move toward camera before veering away again. A minority remain distant.
    const nearPass = Math.random() < .72;
    const zNear = nearPass ? rand(180,620) : rand(700,1250);
    const p0=screenToWorld(startScreen.x,startScreen.y,z0);
    const p3=screenToWorld(endScreen.x,endScreen.y,z3);

    const bend1={x:rand(w*.16,w*.84), y:rand(h*.08,h*.92)};
    const bend2={x:rand(w*.12,w*.88), y:rand(h*.06,h*.94)};
    const p1=screenToWorld(bend1.x,bend1.y,mix(z0,zNear,rand(.48,.78)));
    const p2=screenToWorld(bend2.x,bend2.y,mix(zNear,z3,rand(.22,.58)));
    p1.x += rand(-260,260); p1.y += rand(-180,180);
    p2.x += rand(-260,260); p2.y += rand(-180,180);

    return {
      group,i,p0,p1,p2,p3,
      delay:rand(0,520), duration:rand(1850,3000),
      base:rand(5.5,12.5), phase:rand(0,TAU),
      bankPhase:rand(0,TAU), wing:rand(.55,1.25),
      flutter:rand(.55,1.25),
      tone:Math.random()<.10?'gold':(Math.random()<.18?'teal':'charcoal')
    };
  }

  const group1=Array.from({length:78},(_,i)=>make3DPath(1,i));
  const group2=Array.from({length:64},(_,i)=>make3DPath(2,i));
  const group3=Array.from({length:52},(_,i)=>make3DPath(3,i));
  const group4=Array.from({length:70},(_,i)=>make3DPath(4,i));

  // One group-3 bird is promoted into the dramatic near-camera wipe.
  const wipeBird=group3[Math.floor(group3.length*.63)];
  wipeBird.delay=WIPE_START;
  wipeBird.duration=WIPE_END-WIPE_START;

  const WORDS=[
    {text:'BUILD',start:560,peak:820,release:1040},
    {text:'EXPLORE',start:970,peak:1240,release:1460},
    {text:'IMPROVE',start:1390,peak:1660,release:1890}
  ];

  function resize(){
    dpr=Math.min(window.devicePixelRatio||1,1.75);
    w=Math.max(1,window.innerWidth); h=Math.max(1,window.innerHeight);
    focal=Math.max(520,Math.min(980,w*.78));
    canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
    canvas.style.width=`${w}px`; canvas.style.height=`${h}px`;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    buildWordTargets();
  }

  function buildWordTargets(){
    wordTargets=new Map();
    const off=document.createElement('canvas');
    const octx=off.getContext('2d');
    const ow=Math.min(920,Math.max(420,w*.78));
    const oh=Math.min(220,Math.max(150,h*.22));
    off.width=Math.round(ow); off.height=Math.round(oh);
    octx.textAlign='center'; octx.textBaseline='middle'; octx.fillStyle='#000';
    octx.font=`800 ${Math.max(52,Math.min(128,ow/7))}px Inter, Arial, sans-serif`;
    for(const spec of WORDS){
      octx.clearRect(0,0,off.width,off.height);
      octx.fillText(spec.text,off.width/2,off.height/2);
      const img=octx.getImageData(0,0,off.width,off.height).data, pts=[];
      const step=Math.max(7,Math.round(off.width/105));
      for(let y=2;y<off.height-2;y+=step){
        for(let x=2;x<off.width-2;x+=step){
          if(img[(y*off.width+x)*4+3]>100) pts.push([x/off.width,y/off.height]);
        }
      }
      for(let i=pts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]];}
      wordTargets.set(spec.text,pts.slice(0,group1.length));
    }
  }

  function activeWord(t){return WORDS.find(s=>t>=s.start&&t<=s.release)||null;}
  function wordStrength(spec,t){
    if(!spec)return 0;
    if(t<=spec.peak)return smoother((t-spec.start)/(spec.peak-spec.start));
    return 1-smoother((t-spec.peak)/(spec.release-spec.peak));
  }

  function flight3D(p,t){
    let q=(t-p.delay)/p.duration;
    q=((q%1)+1)%1;
    const u=smoother(q);
    const pos=V(
      cubic(p.p0.x,p.p1.x,p.p2.x,p.p3.x,u),
      cubic(p.p0.y,p.p1.y,p.p2.y,p.p3.y,u),
      cubic(p.p0.z,p.p1.z,p.p2.z,p.p3.z,u)
    );
    const vel=V(
      cubicD(p.p0.x,p.p1.x,p.p2.x,p.p3.x,u),
      cubicD(p.p0.y,p.p1.y,p.p2.y,p.p3.y,u),
      cubicD(p.p0.z,p.p1.z,p.p2.z,p.p3.z,u)
    );

    // Gentle flocking undulation exists in world space, so its apparent amplitude changes with depth.
    const flutter=Math.sin(t*.0052*p.flutter+p.phase+q*TAU*1.7);
    const sway=Math.sin(t*.0022+p.phase+q*TAU)*p.wing;
    pos.x += sway*22 + flutter*6;
    pos.y += Math.cos(t*.0027+p.phase*.7+q*TAU*1.4)*16 + flutter*4;
    pos.z += Math.sin(t*.0018+p.phase)*32;

    const projected=project(pos);
    const heading=Math.atan2(vel.y,vel.x)+Math.PI/2;
    const bank=clamp(vel.x/Math.max(180,Math.abs(vel.z)+180),-.8,.8) + Math.sin(t*.003+p.bankPhase)*.12;
    return {...projected,world:pos,vel,rot:heading+bank,q};
  }

  function colorFor(p,z,alpha){
    const near=clamp(1-(z-150)/1800,0,1);
    if(p.tone==='gold') return `rgba(124,101,58,${alpha})`;
    if(p.tone==='teal') return `rgba(42,102,104,${alpha})`;
    const c=Math.round(mix(78,20,near));
    return `rgba(${c},${c+2},${c+4},${alpha})`;
  }

  function drawTriangle(x,y,size,rot,fill,alpha,stretch=1){
    ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.globalAlpha=alpha; ctx.fillStyle=fill;
    ctx.beginPath();
    ctx.moveTo(0,-size*1.08*stretch);
    ctx.lineTo(size*.98,size*.76);
    ctx.lineTo(-size*.98,size*.76);
    ctx.closePath(); ctx.fill(); ctx.restore();
  }

  function drawWhiteVolume(){
    ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1; ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
  }

  function portfolioTarget(i){
    const topY=86, cardW=Math.min(610,w*.56), cardH=Math.min(430,h*.48), cx=w*.66, cy=h*.51;
    if(i<18)return{x:mix(w*.31,w*.69,i/17),y:topY};
    const j=i-18, perimeter=2*(cardW+cardH), d=(j/Math.max(1,group2.length-19))*perimeter;
    if(d<cardW)return{x:cx-cardW/2+d,y:cy-cardH/2};
    if(d<cardW+cardH)return{x:cx+cardW/2,y:cy-cardH/2+(d-cardW)};
    if(d<cardW*2+cardH)return{x:cx+cardW/2-(d-cardW-cardH),y:cy+cardH/2};
    return{x:cx-cardW/2,y:cy+cardH/2-(d-cardW*2-cardH)};
  }

  function drawGroup1(t){
    const spec=activeWord(t), strength=wordStrength(spec,t), targets=spec?wordTargets.get(spec.text)||[]:[];
    group1.forEach((p,i)=>{
      const f=flight3D(p,t); let x=f.x,y=f.y,z=f.z,rot=f.rot,scale=f.scale;
      if(strength>0&&targets[i]){
        const [tx,ty]=targets[i];
        const sx=w*.5+(tx-.5)*Math.min(w*.76,880);
        const sy=h*.49+(ty-.5)*Math.min(h*.22,210);
        const targetZ=650;
        const wp=screenToWorld(sx,sy,targetZ), merged=lerpV(f.world,wp,strength);
        const pr=project(merged); x=pr.x;y=pr.y;z=pr.z;scale=pr.scale;
        rot=mix(rot,0,strength*.85);
      }
      const size=clamp(p.base*scale*1.9,2.2,56)*(1-strength*.2);
      const stretch=1+Math.abs(f.vel.z)/1800*.18;
      drawTriangle(x,y,size,rot,colorFor(p,z,.88),.88,stretch);
    });
  }

  function drawGroup2(t){
    const align=smoother((t-1500)/760)*(1-smoother((t-2590)/260));
    group2.forEach((p,i)=>{
      const f=flight3D(p,t), target=portfolioTarget(i), targetZ=720;
      const wp=screenToWorld(target.x,target.y,targetZ), merged=lerpV(f.world,wp,align), pr=project(merged);
      const size=clamp(p.base*pr.scale*1.8,2.1,48)*(1-align*.24);
      drawTriangle(pr.x,pr.y,size,mix(f.rot,0,align*.85),colorFor(p,pr.z,.8),.8);
    });
  }

  function eraseGroup3(t){
    if(t<480)return;
    ctx.save(); ctx.globalCompositeOperation='destination-out';
    group3.forEach(p=>{
      if(p===wipeBird)return;
      const f=flight3D(p,t), life=clamp((t-480)/1750,0,1);
      const size=clamp(p.base*f.scale*2.6,3,85)*life;
      ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.rot);ctx.globalAlpha=.08+clamp(f.scale/3,0,.28);
      ctx.beginPath();ctx.moveTo(0,-size*1.8);ctx.lineTo(size*1.5,size*1.35);ctx.lineTo(-size*1.5,size*1.35);ctx.closePath();ctx.fill();ctx.restore();
    });
    ctx.restore();
  }

  function drawGroup3(t){
    group3.forEach(p=>{
      if(p===wipeBird)return;
      const f=flight3D(p,t), fade=1-smoother((t-2300)/430);
      if(fade<=0)return;
      const size=clamp(p.base*f.scale*2.05,2.5,72);
      drawTriangle(f.x,f.y,size,f.rot,colorFor(p,f.z,.72),.72*fade,1.05);
    });
  }

  function drawGroup4(t){
    group4.forEach(p=>{
      const f=flight3D(p,t), fade=1-smoother((t-2750)/260);
      if(fade<=0)return;
      const size=clamp(p.base*f.scale*1.85,1.8,64);
      drawTriangle(f.x,f.y,size,f.rot,colorFor(p,f.z,.66),.66*fade);
    });
  }

  function nearCameraWipe(t){
    if(t<WIPE_START)return;
    const q=smoother((t-WIPE_START)/(WIPE_END-WIPE_START));

    // Special 3D swoop: far-left -> near-camera center -> far-right.
    const z0=1250,z1=110,z2=95,z3=520;
    const p0=screenToWorld(-28,h*.68,z0);
    const p1=screenToWorld(w*.28,h*.30,z1);
    const p2=screenToWorld(w*.72,h*.42,z2);
    const p3=screenToWorld(w+80,h*.18,z3);
    const world=V(
      cubic(p0.x,p1.x,p2.x,p3.x,q),
      cubic(p0.y,p1.y,p2.y,p3.y,q),
      cubic(p0.z,p1.z,p2.z,p3.z,q)
    );
    const vel=V(
      cubicD(p0.x,p1.x,p2.x,p3.x,q),
      cubicD(p0.y,p1.y,p2.y,p3.y,q),
      cubicD(p0.z,p1.z,p2.z,p3.z,q)
    );
    const pr=project(world), rot=Math.atan2(vel.y,vel.x)+Math.PI/2;
    const near=clamp((420-pr.z)/330,0,1);
    const size=mix(36,Math.hypot(w,h)*1.22,smoother(near));

    // As the bird gets too close to camera, its silhouette becomes the wipe mask.
    ctx.save(); ctx.globalCompositeOperation='destination-out';
    ctx.translate(pr.x,pr.y); ctx.rotate(rot); ctx.globalAlpha=clamp(.22+near*.95,0,1);
    ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.98,size*.78);ctx.lineTo(-size*.98,size*.78);ctx.closePath();ctx.fill();ctx.restore();

    if(near<.96){
      drawTriangle(pr.x,pr.y,Math.min(size,Math.hypot(w,h)*.92),rot,'rgba(27,31,34,.92)',.92,1.08);
    }

    // Final fraction guarantees clean reveal after the near-camera pass.
    if(q>.82){
      ctx.save();ctx.globalCompositeOperation='destination-out';ctx.globalAlpha=smoother((q-.82)/.18);ctx.fillRect(0,0,w,h);ctx.restore();
    }
  }

  function finish(){
    if(finished)return; finished=true; cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState='complete'; overlay.classList.add('entry-complete');
    setTimeout(()=>overlay.remove(),180);
  }

  const watchdog=setTimeout(finish,4300);
  function frame(now){
    if(!start)start=now;
    const t=now-start;
    ctx.clearRect(0,0,w,h);
    drawWhiteVolume();
    eraseGroup3(t);
    drawGroup1(t);
    drawGroup2(t);
    drawGroup3(t);
    drawGroup4(t);
    nearCameraWipe(t);

    if(t>=TOTAL){clearTimeout(watchdog);finish();return;}
    raf=requestAnimationFrame(frame);
  }

  const onVisibility=()=>{if(document.hidden)return;};
  const onPageShow=e=>{if(e.persisted)finish();};
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',onVisibility,{passive:true});
  window.addEventListener('pageshow',onPageShow,{passive:true});

  try{resize();document.documentElement.dataset.entryState='running';raf=requestAnimationFrame(frame);}catch(_){clearTimeout(watchdog);finish();}
})();
