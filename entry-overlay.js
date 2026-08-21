/* Harris Portfolio entry: Three.js flock / panic / regroup simulation.
   Individual triangle agents use persistent 3D position, velocity and acceleration.
   State machine: FLOCK -> PANIC -> REGROUP -> FORMATION/REVEAL.
   Modular overlay only; portfolio systems underneath remain untouched. */
(async()=>{
  'use strict';

  const overlay=document.getElementById('portfolio-entry-overlay');
  if(!overlay)return;
  const nav=performance.getEntriesByType?.('navigation')?.[0];
  const finishImmediately=()=>{document.documentElement.dataset.entryState='complete';overlay.remove();};
  if(nav?.type==='back_forward'||window.matchMedia?.('(forced-colors: active)').matches){finishImmediately();return;}

  let THREE;
  try{THREE=await import('https://cdn.jsdelivr.net/npm/three@0.185.0/build/three.module.js');}
  catch(_){finishImmediately();return;}

  const TOTAL=3220;
  const FLOCK_END=760;
  const PANIC_END=1620;
  const REGROUP_END=2300;
  const WIPE_START=2700;
  const WIPE_END=3090;
  const BIRDS=360;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const gaussian=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};

  const membrane=document.createElement('canvas');
  membrane.className='entry-membrane';membrane.setAttribute('aria-hidden','true');overlay.appendChild(membrane);
  const mctx=membrane.getContext('2d');
  if(!mctx){finishImmediately();return;}

  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
  renderer.domElement.className='entry-three-canvas';renderer.domElement.setAttribute('aria-hidden','true');overlay.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(58,1,.1,100);
  camera.position.set(0,0,30);camera.lookAt(0,0,0);

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.88,0,-.74,-.54,0,.74,-.54,0],3));
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.96,depthWrite:false});
  const mesh=new THREE.InstancedMesh(geometry,material,BIRDS);
  mesh.frustumCulled=false;scene.add(mesh);

  const dummy=new THREE.Object3D(),color=new THREE.Color(),ndc=new THREE.Vector3(),rayDir=new THREE.Vector3();
  let width=1,height=1,dpr=1,start=0,last=0,raf=0,finished=false;
  let birds=[],grid=new Map(),flockCenter=new THREE.Vector3(),leaderVelocity=new THREE.Vector3();
  let entrySide=0,exitSide=2,threatPoint=new THREE.Vector3();

  function viewAtZ(z){
    const d=Math.max(.25,camera.position.z-z);
    const vh=2*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*d;
    return{w:vh*camera.aspect,h:vh};
  }
  function screenToWorldAtZ(sx,sy,z){
    ndc.set((sx/width)*2-1,-((sy/height)*2-1),.5).unproject(camera);
    rayDir.copy(ndc).sub(camera.position).normalize();
    const denom=Math.abs(rayDir.z)<1e-6?-1e-6:rayDir.z;
    return camera.position.clone().add(rayDir.multiplyScalar((z-camera.position.z)/denom));
  }
  function worldToScreen(v){const p=v.clone().project(camera);return{x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height,visible:p.z>-1&&p.z<1};}

  function borderWorld(side,z,pad=.05){
    if(side===0)return screenToWorldAtZ(rand(.15,.85)*width,-pad*height,z);
    if(side===1)return screenToWorldAtZ((1+pad)*width,rand(.15,.85)*height,z);
    if(side===2)return screenToWorldAtZ(rand(.15,.85)*width,(1+pad)*height,z);
    return screenToWorldAtZ(-pad*width,rand(.15,.85)*height,z);
  }

  function chooseEntryExit(){
    entrySide=Math.floor(rand(0,4));
    exitSide=(entrySide+2)%4;
    flockCenter=borderWorld(entrySide,-7,.06);
    const target=borderWorld(exitSide,4,.10);
    leaderVelocity.copy(target).sub(flockCenter).normalize().multiplyScalar(15.5);
  }

  function stateFor(t){
    if(t<FLOCK_END)return'flock';
    if(t<PANIC_END)return'panic';
    if(t<REGROUP_END)return'regroup';
    return'calm';
  }

  function initialOffset(){
    return new THREE.Vector3(gaussian()*.38,gaussian()*.30,gaussian()*.34);
  }

  function initBirds(){
    chooseEntryExit();birds=[];
    const dir=leaderVelocity.clone().normalize();
    for(let i=0;i<BIRDS;i++){
      const offset=initialOffset();
      const speed=rand(11.8,16.8);
      const b={
        i,
        position:flockCenter.clone().add(offset),
        velocity:dir.clone().multiplyScalar(speed).add(new THREE.Vector3(rand(-.28,.28),rand(-.22,.22),rand(-.22,.22))),
        acceleration:new THREE.Vector3(),
        maxSpeed:rand(15.0,21.0),
        cruise:rand(12.4,16.4),
        maxForce:rand(18,27),
        scale:rand(.17,.31),
        bank:0,
        panicBias:new THREE.Vector3(gaussian(),gaussian(),gaussian()).normalize(),
        nearPass:Math.random()<.055,
        nearKick:rand(16,28),
        tone:Math.random()<.04?'gold':(Math.random()<.07?'teal':'charcoal'),
        trail:null
      };
      birds.push(b);
      color.set(b.tone==='gold'?0x8b7448:b.tone==='teal'?0x2f7778:0x202427);mesh.setColorAt(i,color);
    }
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }

  const CELL=2.4;
  const OFF=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)OFF.push([x,y,z]);
  const key=p=>`${Math.floor(p.x/CELL)},${Math.floor(p.y/CELL)},${Math.floor(p.z/CELL)}`;
  function buildGrid(){
    grid=new Map();
    birds.forEach((b,i)=>{const k=key(b.position);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(i);});
  }
  function neighbors(b){
    const cx=Math.floor(b.position.x/CELL),cy=Math.floor(b.position.y/CELL),cz=Math.floor(b.position.z/CELL),out=[];
    for(const [dx,dy,dz] of OFF){const a=grid.get(`${cx+dx},${cy+dy},${cz+dz}`);if(a)out.push(...a);}
    return out;
  }

  function limit(v,m){if(v.length()>m)v.setLength(m);return v;}
  function steerTowardVelocity(b,desired){return limit(desired.clone().sub(b.velocity),b.maxForce);}
  function seek(b,target,speed=b.maxSpeed){
    const d=target.clone().sub(b.position);if(d.lengthSq()<1e-8)return new THREE.Vector3();
    d.setLength(speed);return steerTowardVelocity(b,d);
  }

  function reynolds(b,state){
    const sep=new THREE.Vector3(),ali=new THREE.Vector3(),coh=new THREE.Vector3();
    let count=0,sepCount=0;
    const radius=state==='panic'?3.2:2.7;
    const sepRadius=state==='panic'?1.25:.48;
    for(const id of neighbors(b)){
      const o=birds[id];if(o===b)continue;
      const d=o.position.clone().sub(b.position),d2=d.lengthSq();
      if(d2>radius*radius||d2<1e-8)continue;
      count++;ali.add(o.velocity);coh.add(o.position);
      if(d2<sepRadius*sepRadius){sep.addScaledVector(d,-1/Math.max(d2,.02));sepCount++;}
    }
    const f=new THREE.Vector3();
    if(sepCount){sep.divideScalar(sepCount);if(sep.lengthSq())sep.setLength(b.maxSpeed);f.addScaledVector(steerTowardVelocity(b,sep),state==='panic'?3.8:1.7);}
    if(count){
      ali.divideScalar(count);if(ali.lengthSq())ali.setLength(b.cruise);
      coh.divideScalar(count);
      if(state==='flock'){f.addScaledVector(steerTowardVelocity(b,ali),2.5);f.addScaledVector(seek(b,coh,b.cruise),1.8);}
      else if(state==='panic'){f.addScaledVector(steerTowardVelocity(b,ali),.18);f.addScaledVector(seek(b,coh,b.cruise),.08);}
      else {f.addScaledVector(steerTowardVelocity(b,ali),3.0);f.addScaledVector(seek(b,coh,b.cruise),2.8);}
    }
    return f;
  }

  function leaderTarget(t,state){
    const p=clamp(t/REGROUP_END,0,1);
    const z=-6+Math.sin(p*Math.PI*2.4)*10+Math.sin(p*Math.PI*5.2)*4;
    const sweepX=.5+.43*Math.sin(p*Math.PI*2.1+(entrySide%2?1.2:0));
    const sweepY=.5+.40*Math.sin(p*Math.PI*2.8+1.1);
    return screenToWorldAtZ(sweepX*width,sweepY*height,z);
  }

  function updateLeader(t,dt,state){
    const target=leaderTarget(t,state);
    const desired=target.clone().sub(flockCenter);
    if(desired.lengthSq())desired.setLength(state==='panic'?22:state==='regroup'?18:15.5);
    const steer=desired.sub(leaderVelocity);
    limit(steer,state==='panic'?26:18);
    leaderVelocity.addScaledVector(steer,dt);
    limit(leaderVelocity,state==='panic'?23:19);
    flockCenter.addScaledVector(leaderVelocity,dt);
  }

  function panicForce(b,t){
    const q=smooth((t-FLOCK_END)/(PANIC_END-FLOCK_END));
    const away=b.position.clone().sub(threatPoint);
    if(away.lengthSq()<1e-6)away.copy(b.panicBias);
    away.normalize();
    const chaotic=b.panicBias.clone().multiplyScalar(8+10*Math.sin(q*Math.PI));
    const force=away.multiplyScalar(24+28*Math.sin(q*Math.PI)).add(chaotic);
    if(b.nearPass){
      const towardCamera=new THREE.Vector3(0,0,1).multiplyScalar(b.nearKick*Math.sin(q*Math.PI));
      force.add(towardCamera);
    }
    return force;
  }

  function boundaryForce(b){
    const view=viewAtZ(b.position.z),hx=view.w*.62,hy=view.h*.62,f=new THREE.Vector3();
    if(b.position.x>hx)f.x-=20;if(b.position.x<-hx)f.x+=20;
    if(b.position.y>hy)f.y-=20;if(b.position.y<-hy)f.y+=20;
    if(b.position.z>28)f.z-=28;if(b.position.z<-14)f.z+=20;
    return f;
  }

  function updateBirds(t,dt){
    const state=stateFor(t);
    updateLeader(t,dt,state);
    if(state==='panic'){
      const wobble=Math.sin((t-FLOCK_END)*.011);
      threatPoint.copy(flockCenter).add(new THREE.Vector3(wobble*2.4,Math.cos((t-FLOCK_END)*.009)*1.8,-1.5));
    }
    buildGrid();
    for(const b of birds){
      let force=reynolds(b,state);
      force.add(boundaryForce(b));

      if(state==='flock'){
        force.addScaledVector(seek(b,flockCenter,b.cruise),1.55);
        force.addScaledVector(steerTowardVelocity(b,leaderVelocity.clone().setLength(b.cruise)),2.0);
      }else if(state==='panic'){
        force.add(panicForce(b,t));
      }else if(state==='regroup'){
        force.addScaledVector(seek(b,flockCenter,b.maxSpeed),3.7);
        force.addScaledVector(steerTowardVelocity(b,leaderVelocity.clone().setLength(b.cruise)),2.8);
      }else{
        force.addScaledVector(seek(b,flockCenter,b.cruise),2.4);
      }

      limit(force,b.maxForce*(state==='panic'?2.7:2.1));
      b.acceleration.copy(force);
      b.velocity.addScaledVector(b.acceleration,dt);
      const min=state==='panic'?b.cruise*1.15:b.cruise*.78;
      const max=state==='panic'?b.maxSpeed*1.22:b.maxSpeed;
      const speed=b.velocity.length();
      if(speed<min)b.velocity.setLength(min);else if(speed>max)b.velocity.setLength(max);
      b.position.addScaledVector(b.velocity,dt);
      const targetBank=clamp(b.acceleration.x/(b.maxForce*.72),-1.24,1.24);
      b.bank=mix(b.bank,targetBank,clamp(dt*(state==='panic'?15:10),0,1));
    }
  }

  function erasePanicTrails(t){
    if(t<FLOCK_END||t>REGROUP_END)return;
    for(let i=0;i<birds.length;i+=5){
      const b=birds[i],s=worldToScreen(b.position);
      if(!s.visible){b.trail=null;continue;}
      if(!b.trail){b.trail={x:s.x,y:s.y};continue;}
      mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=.09;mctx.lineCap='round';mctx.lineWidth=clamp(b.scale*20,3,9);
      mctx.beginPath();mctx.moveTo(b.trail.x,b.trail.y);mctx.lineTo(s.x,s.y);mctx.stroke();mctx.restore();
      b.trail={x:s.x,y:s.y};
    }
  }

  function renderBirds(t){
    for(const b of birds){
      const heading=Math.atan2(b.velocity.y,b.velocity.x)-Math.PI/2;
      const cameraNear=clamp((b.position.z-18)/10,0,1);
      dummy.position.copy(b.position);
      dummy.rotation.set(0,0,heading+b.bank);
      dummy.scale.setScalar(b.scale*(1+cameraNear*.72));
      dummy.updateMatrix();mesh.setMatrixAt(b.i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
    renderer.render(scene,camera);
  }

  function foregroundOcclusion(t){
    if(t<FLOCK_END||t>PANIC_END)return;
    const q=(t-FLOCK_END)/(PANIC_END-FLOCK_END);
    const pulses=[.18,.46,.73];
    for(const center of pulses){
      const d=Math.abs(q-center);if(d>.11)continue;
      const near=1-d/.11;
      const alpha=Math.pow(near,2.2)*.88;
      mctx.save();mctx.globalCompositeOperation='source-over';mctx.fillStyle=`rgba(14,16,18,${alpha})`;mctx.fillRect(0,0,width,height);mctx.restore();
    }
  }

  function wipe(t){
    if(t<WIPE_START)return;
    const q=smooth((t-WIPE_START)/(WIPE_END-WIPE_START));
    const x=mix(-.18,1.18,q)*width,y=height*(.72-Math.sin(q*Math.PI)*.34);
    const size=mix(24,Math.hypot(width,height)*1.30,smooth(clamp((q-.08)/.68,0,1)));
    mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=clamp(.28+q,0,1);mctx.translate(x,y);mctx.rotate(-.68+q*.96);
    mctx.beginPath();mctx.moveTo(0,-size);mctx.lineTo(size*.98,size*.78);mctx.lineTo(-size*.98,size*.78);mctx.closePath();mctx.fill();mctx.restore();
    if(q>.80){mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=smooth((q-.80)/.20);mctx.fillRect(0,0,width,height);mctx.restore();}
  }

  function resize(){
    width=Math.max(1,window.innerWidth);height=Math.max(1,window.innerHeight);dpr=Math.min(window.devicePixelRatio||1,1.35);
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
    membrane.width=Math.round(width*dpr);membrane.height=Math.round(height*dpr);membrane.style.width=`${width}px`;membrane.style.height=`${height}px`;
    mctx.setTransform(dpr,0,0,dpr,0,0);mctx.globalCompositeOperation='source-over';mctx.fillStyle='#fff';mctx.fillRect(0,0,width,height);
    initBirds();
  }

  function finish(){
    if(finished)return;finished=true;cancelAnimationFrame(raf);renderer.dispose();
    document.documentElement.dataset.entryState='complete';overlay.classList.add('entry-complete');setTimeout(()=>overlay.remove(),160);
  }

  const watchdog=setTimeout(finish,4600);
  function frame(now){
    if(!start){start=now;last=now;}
    const t=now-start,dt=clamp((now-last)/1000,0,.024);last=now;
    updateBirds(t,dt);
    erasePanicTrails(t);
    foregroundOcclusion(t);
    wipe(t);
    renderBirds(t);
    if(t>=TOTAL){clearTimeout(watchdog);finish();return;}
    raf=requestAnimationFrame(frame);
  }

  let resizeTimer=0;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,120);},{passive:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)finish();},{passive:true});

  try{resize();document.documentElement.dataset.entryState='running';raf=requestAnimationFrame(frame);}
  catch(_){clearTimeout(watchdog);finish();}
})();