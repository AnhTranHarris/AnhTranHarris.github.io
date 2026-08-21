/* Harris Portfolio entry: clustered Three.js murmuration.
   Shared camera-relative flock geometry keeps desktop/mobile motion consistent.
   Reynolds boids add local separation/alignment/cohesion inside a fast banking flock.
   The portfolio remains untouched beneath this modular entry layer. */
(async()=>{
  'use strict';

  const overlay=document.getElementById('portfolio-entry-overlay');
  if(!overlay)return;
  const nav=performance.getEntriesByType?.('navigation')?.[0];
  const finishImmediately=()=>{
    document.documentElement.dataset.entryState='complete';
    overlay.remove();
  };
  if(nav?.type==='back_forward'||window.matchMedia?.('(forced-colors: active)').matches){finishImmediately();return;}

  let THREE;
  try{
    THREE=await import('https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js');
  }catch(_){finishImmediately();return;}

  const TOTAL=3180;
  const FORMATION_START=1740;
  const LEADER_FLIGHT_END=1910;
  const WIPE_START=2440;
  const WIPE_END=3060;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const pulse=(p,a,b)=>{
    if(p<=a||p>=b)return 0;
    return Math.sin(Math.PI*(p-a)/(b-a));
  };
  const gaussian=()=>{
    let u=0,v=0;
    while(!u)u=Math.random();
    while(!v)v=Math.random();
    return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
  };

  const membrane=document.createElement('canvas');
  membrane.className='entry-membrane';
  membrane.setAttribute('aria-hidden','true');
  overlay.appendChild(membrane);
  const mctx=membrane.getContext('2d');
  if(!mctx){finishImmediately();return;}

  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.45));
  renderer.domElement.className='entry-three-canvas';
  renderer.domElement.setAttribute('aria-hidden','true');
  overlay.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(56,1,.1,100);
  camera.position.set(0,0,30);
  camera.lookAt(0,0,0);

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
     0,.82,0,
    -.72,-.52,0,
     .72,-.52,0
  ],3));
  const material=new THREE.MeshBasicMaterial({
    vertexColors:true,
    side:THREE.DoubleSide,
    transparent:true,
    opacity:.94,
    depthWrite:false
  });

  let width=1,height=1,dpr=1;
  let flock=[],group1=[],group2=[],group3=[],group4=[];
  let mesh=null,leaderCurve=null,lineTargets=[],wordTargets=new Map();
  let start=0,last=0,raf=0,finished=false;
  let wipeBird=null;
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  const ndc=new THREE.Vector3();
  const rayDir=new THREE.Vector3();

  // Same flock population and same normalized choreography on desktop and mobile.
  const countForDevice=()=>420;

  function screenToWorldAtZ(sx,sy,z){
    ndc.set((sx/width)*2-1,-((sy/height)*2-1),.5).unproject(camera);
    rayDir.copy(ndc).sub(camera.position).normalize();
    const denom=Math.abs(rayDir.z)<1e-6?-1e-6:rayDir.z;
    const t=(z-camera.position.z)/denom;
    return camera.position.clone().add(rayDir.multiplyScalar(t));
  }

  function worldToScreen(v){
    const p=v.clone().project(camera);
    return{x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height,visible:p.z>-1&&p.z<1};
  }

  function viewAtZ(z){
    const distance=Math.max(.25,camera.position.z-z);
    const vh=2*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*distance;
    return{w:vh*camera.aspect,h:vh};
  }

  function buildLeaderCurve(){
    // Same normalized screen choreography at every aspect ratio. The stronger
    // lateral reversals create fast S-turns and visibly harder flock banking.
    const pts=[
      screenToWorldAtZ(width*.92,height*.10,-8),
      screenToWorldAtZ(width*.78,height*.13,-4),
      screenToWorldAtZ(width*.60,height*.24,3),
      screenToWorldAtZ(width*.78,height*.39,10),
      screenToWorldAtZ(width*.51,height*.54,17),
      screenToWorldAtZ(width*.20,height*.66,23.2),
      screenToWorldAtZ(width*.08,height*.75,25.3),
      screenToWorldAtZ(width*.39,height*.59,18),
      screenToWorldAtZ(width*.71,height*.41,8),
      screenToWorldAtZ(width*.88,height*.22,-4)
    ];
    leaderCurve=new THREE.CatmullRomCurve3(pts,false,'centripetal',.30);
    leaderCurve.arcLengthDivisions=500;
    leaderCurve.updateArcLengths();
  }

  function compactSlot(){
    // Normalized camera-space ellipsoid. These numbers are fractions of the
    // visible frustum, so mobile and desktop begin with the same visual cluster.
    return new THREE.Vector3(
      gaussian()*.060,
      gaussian()*.048,
      gaussian()*.042
    );
  }

  function speedProfile(){
    const r=Math.random();
    if(r<.22)return{cruise:14.2,max:19.0,maxForce:19.0};
    if(r<.80)return{cruise:12.1,max:16.2,maxForce:17.0};
    return{cruise:10.2,max:14.0,maxForce:15.2};
  }

  function slotWorld(slot,leader,t){
    const view=viewAtZ(leader.point.z);
    const p=leader.p;
    // Two strong breath cycles: tighten -> swell -> tighten -> swell -> tighten.
    // Perspective adds another natural expansion during the near-camera pass.
    const breathe=.62 + .92*pulse(p,.08,.42) + 1.34*pulse(p,.47,.82);
    const turn=Math.atan2(leader.tangent.y,leader.tangent.x);
    const c=Math.cos(turn),s=Math.sin(turn);
    const sx=slot.x*view.w*breathe;
    const sy=slot.y*view.h*breathe;
    const x=sx*c-sy*s;
    const y=sx*s+sy*c;
    const depthScale=Math.max(1.4,(camera.position.z-leader.point.z)*.16);
    return leader.point.clone().add(new THREE.Vector3(
      x-slot.z*depthScale*leader.bank*.20,
      y+slot.z*depthScale*.08,
      slot.z*depthScale*breathe
    ));
  }

  function buildWordTargets(){
    wordTargets=new Map();
    const off=document.createElement('canvas'),octx=off.getContext('2d');
    const ow=Math.min(980,Math.max(340,width*.80));
    const oh=Math.min(230,Math.max(125,height*.22));
    off.width=Math.round(ow);off.height=Math.round(oh);
    octx.textAlign='center';octx.textBaseline='middle';octx.fillStyle='#000';
    octx.font=`800 ${Math.max(44,Math.min(132,ow/7))}px Inter,Arial,sans-serif`;
    const words=['BUILD','EXPLORE','IMPROVE'];
    for(const text of words){
      octx.clearRect(0,0,off.width,off.height);
      octx.fillText(text,off.width/2,off.height/2);
      const data=octx.getImageData(0,0,off.width,off.height).data,pts=[];
      const step=Math.max(7,Math.round(off.width/116));
      for(let y=2;y<off.height-2;y+=step){
        for(let x=2;x<off.width-2;x+=step){
          if(data[(y*off.width+x)*4+3]>110)pts.push({x:x/off.width,y:y/off.height});
        }
      }
      for(let i=pts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]];}
      const targets=[];
      for(let i=0;i<group1.length;i++){
        const p=pts[i%Math.max(1,pts.length)]||{x:.5,y:.5};
        const sx=width*.5+(p.x-.5)*Math.min(width*.77,900);
        const sy=height*.48+(p.y-.5)*Math.min(height*.21,205);
        targets.push(screenToWorldAtZ(sx,sy,4));
      }
      wordTargets.set(text,targets);
    }
  }

  function buildLineTargets(){
    lineTargets=[];
    const cx=width*.66,cy=height*.51;
    const cardW=Math.min(610,width*.56),cardH=Math.min(430,height*.48);
    for(let i=0;i<group2.length;i++){
      let sx,sy;
      if(i<Math.min(16,group2.length)){
        const n=Math.min(16,group2.length);
        sx=mix(width*.31,width*.69,i/Math.max(1,n-1));sy=86;
      }else{
        const j=i-16,n=Math.max(1,group2.length-16),p=(j/n)*2*(cardW+cardH);
        if(p<cardW){sx=cx-cardW/2+p;sy=cy-cardH/2;}
        else if(p<cardW+cardH){sx=cx+cardW/2;sy=cy-cardH/2+(p-cardW);}
        else if(p<2*cardW+cardH){sx=cx+cardW/2-(p-cardW-cardH);sy=cy+cardH/2;}
        else{sx=cx-cardW/2;sy=cy+cardH/2-(p-2*cardW-cardH);}
      }
      lineTargets.push(screenToWorldAtZ(sx,sy,3));
    }
  }

  function leaderState(t){
    // Fast collective flight: the entire GIF-like flock trajectory completes in
    // ~1.9s, leaving the remaining entry time for formations and final wipe.
    const p=clamp(t/LEADER_FLIGHT_END,0,1);
    const point=leaderCurve.getPointAt(p);
    const tangent=leaderCurve.getTangentAt(clamp(p+.0025,0,1)).normalize();
    const prev=leaderCurve.getTangentAt(clamp(p-.012,0,1)).normalize();
    const next=leaderCurve.getTangentAt(clamp(p+.012,0,1)).normalize();
    const a0=Math.atan2(prev.y,prev.x),a1=Math.atan2(next.y,next.x);
    let delta=a1-a0;
    while(delta>Math.PI)delta-=Math.PI*2;
    while(delta<-Math.PI)delta+=Math.PI*2;
    // Amplified curvature produces the hard coordinated banking seen in a flock turn.
    const bank=clamp(delta*8.5,-1.12,1.12);
    return{p,point,tangent,bank};
  }

  function initFlock(){
    if(mesh){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();mesh=null;}
    const total=countForDevice();
    const g1=Math.round(total*.23),g2=Math.round(total*.18),g3=Math.round(total*.18),g4=total-g1-g2-g3;
    group1=[];group2=[];group3=[];group4=[];flock=[];
    const leader0=leaderState(0);

    for(let i=0;i<total;i++){
      const group=i<g1?1:i<g1+g2?2:i<g1+g2+g3?3:4;
      const sp=speedProfile();
      const slot=compactSlot();
      const initialPosition=slotWorld(slot,leader0,0);
      const b={
        index:i,group,
        position:initialPosition,
        velocity:leader0.tangent.clone().multiplyScalar(sp.cruise).add(new THREE.Vector3(
          rand(-.05,.05),rand(-.04,.04),rand(-.04,.04)
        )),
        acceleration:new THREE.Vector3(),
        slot,
        cruise:sp.cruise,maxSpeed:sp.max,maxForce:sp.maxForce,
        scale:rand(.18,.31),tone:Math.random()<.05?'gold':(Math.random()<.08?'teal':'charcoal'),
        bank:leader0.bank,phase:rand(0,Math.PI*2),trail:null
      };
      flock.push(b);
      (group===1?group1:group===2?group2:group===3?group3:group4).push(b);
    }
    wipeBird=group3[Math.floor(group3.length*.46)]||flock[0];
    mesh=new THREE.InstancedMesh(geometry.clone(),material.clone(),total);
    mesh.frustumCulled=false;
    scene.add(mesh);
    flock.forEach((b,i)=>{
      color.set(b.tone==='gold'?0x8b7448:b.tone==='teal'?0x2f7778:0x25292c);
      mesh.setColorAt(i,color);
    });
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    buildWordTargets();
    buildLineTargets();
  }

  const CELL=2.2;
  let grid=new Map();
  const keyFor=p=>`${Math.floor(p.x/CELL)},${Math.floor(p.y/CELL)},${Math.floor(p.z/CELL)}`;
  const neighborOffsets=[];
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)neighborOffsets.push([x,y,z]);

  function buildGrid(){
    grid=new Map();
    flock.forEach((b,i)=>{
      const k=keyFor(b.position);let arr=grid.get(k);
      if(!arr)grid.set(k,arr=[]);arr.push(i);
    });
  }

  function neighborsOf(b){
    const cx=Math.floor(b.position.x/CELL),cy=Math.floor(b.position.y/CELL),cz=Math.floor(b.position.z/CELL),out=[];
    for(const [dx,dy,dz] of neighborOffsets){
      const arr=grid.get(`${cx+dx},${cy+dy},${cz+dz}`);
      if(arr)out.push(...arr);
    }
    return out;
  }

  function steerToVelocity(b,desired,maxForce=b.maxForce){
    const steer=desired.clone().sub(b.velocity);
    if(steer.length()>maxForce)steer.setLength(maxForce);
    return steer;
  }

  function seek(b,target,speed=b.maxSpeed){
    const desired=target.clone().sub(b.position);
    if(desired.lengthSq()<1e-7)return new THREE.Vector3();
    desired.setLength(speed);
    return steerToVelocity(b,desired);
  }

  function boidForce(b){
    const sep=new THREE.Vector3(),ali=new THREE.Vector3(),coh=new THREE.Vector3();
    let count=0,sepCount=0;
    for(const id of neighborsOf(b)){
      const o=flock[id];if(o===b)continue;
      const dvec=o.position.clone().sub(b.position),d2=dvec.lengthSq();
      if(d2>2.35*2.35||d2<1e-7)continue;
      count++;ali.add(o.velocity);coh.add(o.position);
      if(d2<.20*.20){sep.addScaledVector(dvec,-1/Math.max(d2,.005));sepCount++;}
    }
    const f=new THREE.Vector3();
    if(sepCount){
      sep.divideScalar(sepCount);
      if(sep.lengthSq()>0)sep.setLength(b.maxSpeed);
      f.addScaledVector(steerToVelocity(b,sep),1.20);
    }
    if(count){
      ali.divideScalar(count);if(ali.lengthSq()>0)ali.setLength(b.cruise);
      f.addScaledVector(steerToVelocity(b,ali),2.05);
      coh.divideScalar(count);
      f.addScaledVector(seek(b,coh,b.cruise),1.18);
    }
    return f;
  }

  function wordSpec(t){
    if(t<FORMATION_START)return null;
    if(t<1995)return{text:'BUILD',strength:smooth((t-FORMATION_START)/190)*(1-smooth((t-1970)/70))};
    if(t<2225)return{text:'EXPLORE',strength:smooth((t-1995)/160)*(1-smooth((t-2195)/65))};
    if(t<2440)return{text:'IMPROVE',strength:smooth((t-2225)/145)*(1-smooth((t-2410)/60))};
    return null;
  }

  function formationTarget(b,t){
    if(b.group===1){
      const spec=wordSpec(t);
      if(spec){
        const idx=group1.indexOf(b),target=(wordTargets.get(spec.text)||[])[idx];
        if(target)return{target,strength:spec.strength};
      }
    }
    if(b.group===2){
      const strength=smooth((t-1950)/260)*(1-smooth((t-2670)/210));
      const idx=group2.indexOf(b),target=lineTargets[idx];
      if(target&&strength>0)return{target,strength};
    }
    return null;
  }

  function updateFlock(t,dt){
    const leader=leaderState(t);
    buildGrid();
    for(const b of flock){
      let force=boidForce(b);
      const slotTarget=slotWorld(b.slot,leader,t);
      force.addScaledVector(seek(b,slotTarget,b.maxSpeed*1.10),2.80);
      force.addScaledVector(steerToVelocity(b,leader.tangent.clone().multiplyScalar(b.cruise*1.04)),2.12);

      const formation=formationTarget(b,t);
      if(formation){
        force.multiplyScalar(1-formation.strength*.42);
        force.addScaledVector(seek(b,formation.target,b.maxSpeed*.94),3.05*formation.strength);
      }

      // Very small steering noise: the flock bends and banks, but does not wobble.
      force.add(new THREE.Vector3(
        Math.sin(t*.00115+b.phase),
        Math.cos(t*.00090+b.phase*.67),
        Math.sin(t*.00069+b.phase*.43)
      ).multiplyScalar(.045));

      if(force.length()>b.maxForce*2.35)force.setLength(b.maxForce*2.35);
      b.acceleration.copy(force);
      b.velocity.addScaledVector(b.acceleration,dt);
      const speed=b.velocity.length();
      if(speed>b.maxSpeed)b.velocity.setLength(b.maxSpeed);
      else if(speed<b.cruise*.88)b.velocity.setLength(b.cruise*.88);
      b.position.addScaledVector(b.velocity,dt);

      const localTurn=clamp(b.acceleration.x/(b.maxForce*1.2),-.45,.45);
      const targetBank=clamp(leader.bank+localTurn,-1.18,1.18);
      b.bank=mix(b.bank,targetBank,clamp(dt*11.0,0,1));
    }
  }

  function eraseGroup3Trails(t){
    if(t<1500)return;
    for(const b of group3){
      if(b===wipeBird)continue;
      const s=worldToScreen(b.position);
      if(!s.visible){b.trail=null;continue;}
      if(!b.trail){b.trail={x:s.x,y:s.y};continue;}
      mctx.save();
      mctx.globalCompositeOperation='destination-out';
      mctx.lineCap='round';
      mctx.globalAlpha=.13;
      mctx.lineWidth=clamp(b.scale*19,4,10);
      mctx.beginPath();mctx.moveTo(b.trail.x,b.trail.y);mctx.lineTo(s.x,s.y);mctx.stroke();
      mctx.restore();
      b.trail.x=s.x;b.trail.y=s.y;
    }
  }

  function renderFlock(t){
    const leader=leaderState(t);
    const view=viewAtZ(leader.point.z);
    // World perspective already changes apparent size; a small extra boost makes
    // the close pass read clearly without changing desktop/mobile consistency.
    const near=clamp((leader.point.z-13)/12,0,1);
    const scaleBoost=1+near*.30;
    for(let i=0;i<flock.length;i++){
      const b=flock[i];
      const formation=formationTarget(b,t);
      dummy.position.copy(b.position);
      const heading=Math.atan2(b.velocity.y,b.velocity.x)-Math.PI/2;
      dummy.rotation.set(0,0,heading+b.bank);
      dummy.scale.setScalar(b.scale*scaleBoost*(formation?1-formation.strength*.10:1));
      dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
    renderer.render(scene,camera);
  }

  function wipe(t){
    if(t<WIPE_START)return;
    const q=smooth((t-WIPE_START)/(WIPE_END-WIPE_START));
    const sx=mix(-width*.14,width*1.15,q);
    const sy=height*(.78-Math.sin(q*Math.PI)*.42);
    const size=mix(24,Math.hypot(width,height)*1.24,smooth(clamp((q-.14)/.63,0,1)));
    const rot=-.72+q*1.02;

    mctx.save();
    mctx.globalCompositeOperation='destination-out';
    mctx.globalAlpha=clamp(.30+q,0,1);
    mctx.translate(sx,sy);mctx.rotate(rot);
    mctx.beginPath();mctx.moveTo(0,-size);mctx.lineTo(size*.98,size*.78);mctx.lineTo(-size*.98,size*.78);mctx.closePath();mctx.fill();
    mctx.restore();
    if(q>.82){
      mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=smooth((q-.82)/.18);mctx.fillRect(0,0,width,height);mctx.restore();
    }
  }

  function resize(){
    width=Math.max(1,window.innerWidth);height=Math.max(1,window.innerHeight);dpr=Math.min(window.devicePixelRatio||1,1.45);
    camera.aspect=width/height;camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
    membrane.width=Math.round(width*dpr);membrane.height=Math.round(height*dpr);
    membrane.style.width=`${width}px`;membrane.style.height=`${height}px`;
    mctx.setTransform(dpr,0,0,dpr,0,0);
    mctx.globalCompositeOperation='source-over';mctx.fillStyle='#fff';mctx.fillRect(0,0,width,height);
    buildLeaderCurve();
    initFlock();
  }

  function finish(){
    if(finished)return;finished=true;cancelAnimationFrame(raf);
    renderer.dispose();
    document.documentElement.dataset.entryState='complete';overlay.classList.add('entry-complete');
    setTimeout(()=>overlay.remove(),160);
  }

  const watchdog=setTimeout(finish,4500);
  function frame(now){
    if(!start){start=now;last=now;}
    const t=now-start,dt=clamp((now-last)/1000,0,.024);last=now;
    updateFlock(t,dt);
    eraseGroup3Trails(t);
    wipe(t);
    renderFlock(t);
    if(t>=TOTAL){clearTimeout(watchdog);finish();return;}
    raf=requestAnimationFrame(frame);
  }

  let resizeTimer=0;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,120);},{passive:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)finish();},{passive:true});

  try{
    resize();
    document.documentElement.dataset.entryState='running';
    raf=requestAnimationFrame(frame);
  }catch(_){clearTimeout(watchdog);finish();}
})();