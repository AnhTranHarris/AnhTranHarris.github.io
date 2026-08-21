/* Harris Portfolio entry: true Three.js 3D flock.
   Reynolds boids (separation/alignment/cohesion) + perspective camera + InstancedMesh.
   Four behavior groups remain modular above the untouched portfolio. */
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

  const TOTAL=3150;
  const WIPE_START=2220;
  const WIPE_END=3020;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const rand=(a,b)=>a+Math.random()*(b-a);

  const membrane=document.createElement('canvas');
  membrane.className='entry-membrane';
  membrane.setAttribute('aria-hidden','true');
  overlay.appendChild(membrane);
  const mctx=membrane.getContext('2d');
  if(!mctx){finishImmediately();return;}

  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  renderer.domElement.className='entry-three-canvas';
  renderer.domElement.setAttribute('aria-hidden','true');
  overlay.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(58,1,.1,90);
  camera.position.set(0,0,30);
  camera.lookAt(0,0,0);

  let width=1,height=1,dpr=1;
  let flock=[];
  let grid=new Map();
  let group1=[],group2=[],group3=[],group4=[];
  let wordTargets=new Map();
  let wipeBird=null;
  let wipeActivated=false;
  let start=0,last=0,raf=0,finished=false;

  const isMobile=()=>Math.min(window.innerWidth,window.innerHeight)<620;
  const countForDevice=()=>isMobile()?280:500;

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([
     0,.72,0,
    -.62,-.46,0,
     .62,-.46,0
  ],3));
  geometry.computeVertexNormals();

  const material=new THREE.MeshBasicMaterial({
    vertexColors:true,
    side:THREE.DoubleSide,
    transparent:true,
    opacity:.92,
    depthWrite:false
  });

  let mesh=null;
  const dummy=new THREE.Object3D();
  const color=new THREE.Color();
  const tempView=new THREE.Vector2();
  const tempNdc=new THREE.Vector3();
  const tempDir=new THREE.Vector3();

  const WORDS=[
    {text:'BUILD',start:560,peak:860,release:1090},
    {text:'EXPLORE',start:1000,peak:1310,release:1540},
    {text:'IMPROVE',start:1450,peak:1760,release:2020}
  ];

  function wordStrength(spec,t){
    if(!spec)return 0;
    if(t<=spec.peak)return smooth((t-spec.start)/(spec.peak-spec.start));
    return 1-smooth((t-spec.peak)/(spec.release-spec.peak));
  }
  function activeWord(t){return WORDS.find(s=>t>=s.start&&t<=s.release)||null;}

  function viewSizeAtZ(z){
    const distance=Math.max(.2,camera.position.z-z);
    camera.getViewSize(distance,tempView);
    return{x:tempView.x,y:tempView.y};
  }

  function screenToWorldAtZ(sx,sy,z){
    tempNdc.set((sx/width)*2-1,-((sy/height)*2-1),.5).unproject(camera);
    tempDir.copy(tempNdc).sub(camera.position).normalize();
    const denom=tempDir.z||-1e-6;
    const t=(z-camera.position.z)/denom;
    return camera.position.clone().add(tempDir.multiplyScalar(t));
  }

  function randomBorderSpawn(){
    const z=rand(-10,9);
    const view=viewSizeAtZ(z);
    const pad=rand(.35,.9);
    const side=Math.floor(rand(0,4));
    let x=0,y=0;
    if(side===0){x=rand(-view.x*.5,view.x*.5);y=view.y*.5+pad;}
    else if(side===1){x=view.x*.5+pad;y=rand(-view.y*.5,view.y*.5);}
    else if(side===2){x=rand(-view.x*.5,view.x*.5);y=-view.y*.5-pad;}
    else{x=-view.x*.5-pad;y=rand(-view.y*.5,view.y*.5);}
    return{position:new THREE.Vector3(x,y,z),side,view};
  }

  function speedProfile(){
    const r=Math.random();
    if(r<.20)return{min:9.0,max:15.5,cruise:rand(10.5,14.2)};
    if(r<.76)return{min:5.8,max:10.2,cruise:rand(6.5,9.2)};
    return{min:3.6,max:6.7,cruise:rand(4.1,6.0)};
  }

  function makeBird(index,group){
    const spawn=randomBorderSpawn();
    const sp=speedProfile();
    const oppositeTarget=new THREE.Vector3(
      rand(-spawn.view.x*.32,spawn.view.x*.32),
      rand(-spawn.view.y*.32,spawn.view.y*.32),
      clamp(spawn.position.z+rand(-7,7),-12,12)
    );
    const velocity=oppositeTarget.sub(spawn.position).normalize().multiplyScalar(sp.cruise);
    velocity.x+=rand(-.55,.55);velocity.y+=rand(-.45,.45);velocity.z+=rand(-.5,.5);
    velocity.setLength(sp.cruise);
    return{
      index,group,
      position:spawn.position,
      velocity,
      acceleration:new THREE.Vector3(),
      minSpeed:sp.min,maxSpeed:sp.max,cruise:sp.cruise,
      maxForce:rand(3.2,5.8),
      scale:rand(.17,.34),
      phase:rand(0,Math.PI*2),
      bank:0,
      age:0,
      trail:null,
      tone:Math.random()<.08?'gold':(Math.random()<.16?'teal':'charcoal')
    };
  }

  function respawnBird(b){
    const fresh=makeBird(b.index,b.group);
    b.position.copy(fresh.position);
    b.velocity.copy(fresh.velocity);
    b.acceleration.set(0,0,0);
    b.minSpeed=fresh.minSpeed;b.maxSpeed=fresh.maxSpeed;b.cruise=fresh.cruise;
    b.maxForce=fresh.maxForce;b.scale=fresh.scale;b.phase=fresh.phase;b.bank=0;b.age=0;b.trail=null;b.tone=fresh.tone;
  }

  function buildWordTargets(){
    wordTargets=new Map();
    const off=document.createElement('canvas'),octx=off.getContext('2d');
    const ow=Math.min(1000,Math.max(360,width*.82));
    const oh=Math.min(250,Math.max(130,height*.23));
    off.width=Math.round(ow);off.height=Math.round(oh);
    octx.textAlign='center';octx.textBaseline='middle';octx.fillStyle='#000';
    octx.font=`800 ${Math.max(46,Math.min(136,ow/7))}px Inter,Arial,sans-serif`;
    for(const spec of WORDS){
      octx.clearRect(0,0,off.width,off.height);octx.fillText(spec.text,off.width/2,off.height/2);
      const data=octx.getImageData(0,0,off.width,off.height).data,pts=[];
      const step=Math.max(6,Math.round(off.width/125));
      for(let y=2;y<off.height-2;y+=step){
        for(let x=2;x<off.width-2;x+=step){
          if(data[(y*off.width+x)*4+3]>110)pts.push({x:x/off.width,y:y/off.height});
        }
      }
      for(let i=pts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]];}
      const targets=[];
      for(let i=0;i<group1.length;i++){
        const p=pts[i%Math.max(1,pts.length)]||{x:.5,y:.5};
        const sx=width*.5+(p.x-.5)*Math.min(width*.78,920);
        const sy=height*.49+(p.y-.5)*Math.min(height*.23,220);
        targets.push(screenToWorldAtZ(sx,sy,0));
      }
      wordTargets.set(spec.text,targets);
    }
  }

  function portfolioTargets(){
    const targets=[];
    const cx=width*.66,cy=height*.51;
    const cardW=Math.min(610,width*.56),cardH=Math.min(430,height*.48);
    for(let i=0;i<group2.length;i++){
      let sx,sy;
      if(i<Math.min(18,group2.length)){
        const n=Math.min(18,group2.length);sx=mix(width*.31,width*.69,i/Math.max(1,n-1));sy=86;
      }else{
        const j=i-18,n=Math.max(1,group2.length-18),p=(j/n)*2*(cardW+cardH);
        if(p<cardW){sx=cx-cardW/2+p;sy=cy-cardH/2;}
        else if(p<cardW+cardH){sx=cx+cardW/2;sy=cy-cardH/2+(p-cardW);}
        else if(p<2*cardW+cardH){sx=cx+cardW/2-(p-cardW-cardH);sy=cy+cardH/2;}
        else{sx=cx-cardW/2;sy=cy+cardH/2-(p-2*cardW-cardH);}
      }
      targets.push(screenToWorldAtZ(sx,sy,0));
    }
    return targets;
  }
  let lineTargets=[];

  function initFlock(){
    if(mesh){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();mesh=null;}
    const total=countForDevice();
    const g1=Math.round(total*.29),g2=Math.round(total*.21),g3=Math.round(total*.18),g4=total-g1-g2-g3;
    flock=[];group1=[];group2=[];group3=[];group4=[];
    for(let i=0;i<total;i++){
      const group=i<g1?1:i<g1+g2?2:i<g1+g2+g3?3:4;
      const b=makeBird(i,group);flock.push(b);
      (group===1?group1:group===2?group2:group===3?group3:group4).push(b);
    }
    wipeBird=group3[Math.floor(group3.length*.57)]||flock[0];
    wipeActivated=false;
    mesh=new THREE.InstancedMesh(geometry.clone(),material.clone(),total);
    mesh.frustumCulled=false;
    scene.add(mesh);
    flock.forEach((b,i)=>{
      color.set(b.tone==='gold'?0x8c7447:b.tone==='teal'?0x2c7375:0x252a2d);
      mesh.setColorAt(i,color);
    });
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    buildWordTargets();lineTargets=portfolioTargets();
  }

  const CELL=4.2;
  const keyFor=p=>`${Math.floor(p.x/CELL)},${Math.floor(p.y/CELL)},${Math.floor(p.z/CELL)}`;
  function buildGrid(){
    grid=new Map();
    flock.forEach((b,i)=>{const k=keyFor(b.position);let arr=grid.get(k);if(!arr)grid.set(k,arr=[]);arr.push(i);});
  }

  const neighOffsets=[];
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)neighOffsets.push([x,y,z]);

  function neighborIndices(b){
    const cx=Math.floor(b.position.x/CELL),cy=Math.floor(b.position.y/CELL),cz=Math.floor(b.position.z/CELL),out=[];
    for(const [dx,dy,dz] of neighOffsets){const arr=grid.get(`${cx+dx},${cy+dy},${cz+dz}`);if(arr)out.push(...arr);}
    return out;
  }

  const tmpSep=new THREE.Vector3(),tmpAli=new THREE.Vector3(),tmpCoh=new THREE.Vector3();
  const tmpDesired=new THREE.Vector3(),tmpSteer=new THREE.Vector3(),tmpDelta=new THREE.Vector3();

  function steerToward(b,target,maxSpeed=b.maxSpeed){
    tmpDesired.subVectors(target,b.position);
    if(tmpDesired.lengthSq()<1e-6)return new THREE.Vector3();
    tmpDesired.setLength(maxSpeed);
    tmpSteer.subVectors(tmpDesired,b.velocity);
    if(tmpSteer.length()>b.maxForce)tmpSteer.setLength(b.maxForce);
    return tmpSteer.clone();
  }

  function boidForce(b){
    tmpSep.set(0,0,0);tmpAli.set(0,0,0);tmpCoh.set(0,0,0);
    let sepCount=0,count=0;
    const ids=neighborIndices(b);
    for(const id of ids){
      const o=flock[id];if(o===b)continue;
      tmpDelta.subVectors(o.position,b.position);
      const d2=tmpDelta.lengthSq();
      if(d2>34||d2<1e-8)continue;
      count++;tmpAli.add(o.velocity);tmpCoh.add(o.position);
      if(d2<5.5){tmpSep.addScaledVector(tmpDelta,-1/d2);sepCount++;}
    }
    const force=new THREE.Vector3();
    if(sepCount){tmpSep.divideScalar(sepCount);if(tmpSep.lengthSq()>0)tmpSep.setLength(b.maxSpeed).sub(b.velocity).clampLength(0,b.maxForce);force.addScaledVector(tmpSep,1.55);}
    if(count){
      tmpAli.divideScalar(count);if(tmpAli.lengthSq()>0)tmpAli.setLength(b.cruise).sub(b.velocity).clampLength(0,b.maxForce);force.addScaledVector(tmpAli,.72);
      tmpCoh.divideScalar(count);force.addScaledVector(steerToward(b,tmpCoh,b.cruise),.34);
    }
    return force;
  }

  function formationForce(b,t){
    if(b.group===1){
      const spec=activeWord(t),strength=wordStrength(spec,t);
      if(spec&&strength>0){
        const idx=group1.indexOf(b),target=(wordTargets.get(spec.text)||[])[idx];
        if(target)return steerToward(b,target,b.maxSpeed*.88).multiplyScalar(2.7*strength);
      }
    }
    if(b.group===2){
      const strength=smooth((t-1550)/540)*(1-smooth((t-2630)/240));
      const idx=group2.indexOf(b),target=lineTargets[idx];
      if(target&&strength>0)return steerToward(b,target,b.maxSpeed*.82).multiplyScalar(2.35*strength);
    }
    return new THREE.Vector3();
  }

  function boundaryForce(b){
    const view=viewSizeAtZ(b.position.z);
    const margin=.92;
    const hx=view.x*.5*margin,hy=view.y*.5*margin;
    const f=new THREE.Vector3();
    if(b.position.x>hx)f.x-=((b.position.x-hx)/Math.max(1,hx))*4.2;
    if(b.position.x<-hx)f.x+=((-hx-b.position.x)/Math.max(1,hx))*4.2;
    if(b.position.y>hy)f.y-=((b.position.y-hy)/Math.max(1,hy))*4.2;
    if(b.position.y<-hy)f.y+=((-hy-b.position.y)/Math.max(1,hy))*4.2;
    if(b.position.z>13)f.z-=2.7;if(b.position.z<-13)f.z+=2.7;
    return f;
  }

  function wanderForce(b,t){
    return new THREE.Vector3(
      Math.sin(t*.0011+b.phase)*.28,
      Math.cos(t*.0009+b.phase*.73)*.22,
      Math.sin(t*.0007+b.phase*.43)*.24
    );
  }

  function activateWipeBird(){
    if(wipeActivated||!wipeBird)return;
    wipeActivated=true;
    const spawn=screenToWorldAtZ(-35,height*.70,2);
    wipeBird.position.copy(spawn);
    const nearTarget=new THREE.Vector3(1.4,2.8,28.15);
    wipeBird.velocity.copy(nearTarget.sub(spawn).normalize().multiplyScalar(22));
    wipeBird.minSpeed=18;wipeBird.maxSpeed=26;wipeBird.cruise=22;wipeBird.maxForce=13;wipeBird.scale=.42;
    wipeBird.trail=null;
  }

  function updateBird(b,t,dt){
    b.age+=dt;
    if(b===wipeBird&&t>=WIPE_START){
      activateWipeBird();
      const q=clamp((t-WIPE_START)/(WIPE_END-WIPE_START),0,1);
      const target=q<.64?new THREE.Vector3(2.5,1.0,29.0):new THREE.Vector3(14,8,5);
      b.acceleration.copy(steerToward(b,target,24)).multiplyScalar(1.9);
    }else{
      b.acceleration.copy(boidForce(b));
      b.acceleration.add(formationForce(b,t));
      b.acceleration.add(boundaryForce(b));
      b.acceleration.add(wanderForce(b,t));
      const forward=b.velocity.clone().setLength(b.cruise).sub(b.velocity).clampLength(0,b.maxForce).multiplyScalar(.22);
      b.acceleration.add(forward);
      b.acceleration.clampLength(0,b.maxForce*2.4);
    }

    b.velocity.addScaledVector(b.acceleration,dt);
    const speed=b.velocity.length();
    if(speed<b.minSpeed)b.velocity.setLength(b.minSpeed);
    else if(speed>b.maxSpeed)b.velocity.setLength(b.maxSpeed);
    b.position.addScaledVector(b.velocity,dt);
    b.bank=mix(b.bank,clamp(-b.acceleration.x*.075,-.72,.72),clamp(dt*4.8,0,1));

    if(b!==wipeBird||t<WIPE_START){
      const p=b.position.clone().project(camera),margin=1.45;
      if((Math.abs(p.x)>margin||Math.abs(p.y)>margin||b.position.z>16||b.position.z<-16)&&b.age>.45)respawnBird(b);
    }
  }

  function worldToScreen(pos){
    const p=pos.clone().project(camera);
    return{x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height,z:p.z};
  }

  function eraseGroup3Trail(b){
    const p=worldToScreen(b.position);
    if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
    if(!b.trail){b.trail={x:p.x,y:p.y};return;}
    const distToCamera=Math.max(.35,camera.position.distanceTo(b.position));
    const radius=clamp((b.scale*260)/distToCamera,3,70);
    mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=.16;mctx.lineCap='round';mctx.lineWidth=radius*1.5;
    mctx.beginPath();mctx.moveTo(b.trail.x,b.trail.y);mctx.lineTo(p.x,p.y);mctx.stroke();mctx.restore();
    b.trail.x=p.x;b.trail.y=p.y;
  }

  function wipeMembraneFromBird(t){
    if(!wipeActivated||!wipeBird)return;
    const q=clamp((t-WIPE_START)/(WIPE_END-WIPE_START),0,1);
    const p=worldToScreen(wipeBird.position);
    const dist=Math.max(.18,camera.position.distanceTo(wipeBird.position));
    const radius=clamp((wipeBird.scale*520)/dist,18,Math.hypot(width,height)*1.3);
    mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=clamp(.25+q,0,1);
    mctx.translate(p.x,p.y);mctx.rotate(-.45+q*.7);
    mctx.beginPath();mctx.moveTo(0,-radius*1.15);mctx.lineTo(radius,radius*.78);mctx.lineTo(-radius,radius*.78);mctx.closePath();mctx.fill();mctx.restore();
    if(q>.82){mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=smooth((q-.82)/.18);mctx.fillRect(0,0,width,height);mctx.restore();}
  }

  function updateInstances(t){
    const forward=new THREE.Vector3(0,1,0);
    flock.forEach((b,i)=>{
      dummy.position.copy(b.position);
      const dir=b.velocity.clone().normalize();
      const yaw=Math.atan2(dir.x,dir.y);
      const pitch=Math.atan2(dir.z,Math.hypot(dir.x,dir.y));
      dummy.rotation.set(pitch,0,-yaw+b.bank,'XYZ');
      const near=clamp(1-camera.position.distanceTo(b.position)/32,0,1);
      const s=b.scale*(1+near*.28);
      dummy.scale.set(s,s,s);
      dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate=true;
  }

  function resize(){
    width=Math.max(1,window.innerWidth);height=Math.max(1,window.innerHeight);dpr=Math.min(window.devicePixelRatio||1,1.5);
    camera.aspect=width/height;camera.fov=isMobile()?66:58;camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
    membrane.width=Math.round(width*dpr);membrane.height=Math.round(height*dpr);membrane.style.width=`${width}px`;membrane.style.height=`${height}px`;
    mctx.setTransform(dpr,0,0,dpr,0,0);mctx.globalCompositeOperation='source-over';mctx.fillStyle='#fff';mctx.fillRect(0,0,width,height);
    initFlock();
  }

  function finish(){
    if(finished)return;finished=true;cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState='complete';overlay.classList.add('entry-complete');
    setTimeout(()=>{try{renderer.dispose();geometry.dispose();material.dispose();}catch(_){}overlay.remove();},180);
  }

  const watchdog=setTimeout(finish,4700);
  function frame(now){
    if(!start){start=now;last=now;}
    const t=now-start,dt=clamp((now-last)/1000,0,.032);last=now;
    buildGrid();
    flock.forEach(b=>updateBird(b,t,dt));
    group3.forEach(b=>{if(b!==wipeBird&&t>420&&t<2360)eraseGroup3Trail(b);});
    wipeMembraneFromBird(t);
    updateInstances(t);
    renderer.render(scene,camera);
    if(t>=TOTAL){clearTimeout(watchdog);finish();return;}
    raf=requestAnimationFrame(frame);
  }

  const onResize=()=>resize();
  window.addEventListener('resize',onResize,{passive:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)finish();},{passive:true});

  try{
    resize();
    document.documentElement.dataset.entryState='running';
    raf=requestAnimationFrame(frame);
  }catch(_){clearTimeout(watchdog);finish();}
})();