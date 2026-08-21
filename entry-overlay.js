/* Harris Portfolio entry: randomized Three.js 3D murmuration.
   A compact flock sweeps the full viewport on a new route each visit.
   Reynolds boids provide local separation/alignment/cohesion while several
   foreground triangles make true near-camera passes. Portfolio remains untouched. */
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

  const TOTAL=3220,FLIGHT_END=2200,FORMATION_START=2050,WIPE_START=2580,WIPE_END=3090;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const mix=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const rand=(a,b)=>a+Math.random()*(b-a);
  const pulse=(p,a,b)=>p<=a||p>=b?0:Math.sin(Math.PI*(p-a)/(b-a));
  const gaussian=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);};

  const membrane=document.createElement('canvas');
  membrane.className='entry-membrane';membrane.setAttribute('aria-hidden','true');overlay.appendChild(membrane);
  const mctx=membrane.getContext('2d');
  if(!mctx){finishImmediately();return;}

  const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0x000000,0);renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.4));
  renderer.domElement.className='entry-three-canvas';renderer.domElement.setAttribute('aria-hidden','true');overlay.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(58,1,.1,100);camera.position.set(0,0,30);camera.lookAt(0,0,0);

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.82,0,-.72,-.52,0,.72,-.52,0],3));
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.96,depthWrite:false});
  const closeMaterial=new THREE.MeshBasicMaterial({color:0x17191b,side:THREE.DoubleSide,depthTest:false,depthWrite:false});

  let width=1,height=1,dpr=1,mesh=null,leaderCurve=null,flock=[],group1=[],group2=[],group3=[],group4=[];
  let wordTargets=new Map(),lineTargets=[],closePasses=[];
  let start=0,last=0,raf=0,finished=false;
  const dummy=new THREE.Object3D(),color=new THREE.Color(),ndc=new THREE.Vector3(),rayDir=new THREE.Vector3();
  const TOTAL_BIRDS=420;

  function screenToWorldAtZ(sx,sy,z){
    ndc.set((sx/width)*2-1,-((sy/height)*2-1),.5).unproject(camera);
    rayDir.copy(ndc).sub(camera.position).normalize();
    const denom=Math.abs(rayDir.z)<1e-6?-1e-6:rayDir.z;
    return camera.position.clone().add(rayDir.multiplyScalar((z-camera.position.z)/denom));
  }
  function worldToScreen(v){const p=v.clone().project(camera);return{x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height,visible:p.z>-1&&p.z<1};}
  function viewAtZ(z){const d=Math.max(.2,camera.position.z-z),vh=2*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*d;return{w:vh*camera.aspect,h:vh};}

  function randomEdgeNormalized(){
    const side=Math.floor(rand(0,4));
    if(side===0)return{x:rand(.08,.92),y:-.04};
    if(side===1)return{x:1.04,y:rand(.08,.92)};
    if(side===2)return{x:rand(.08,.92),y:1.04};
    return{x:-.04,y:rand(.08,.92)};
  }

  function buildLeaderCurve(){
    // Fresh route each load. Alternating left/right zones force repeated full-frame traversals.
    const pts=[];
    const startN=randomEdgeNormalized();
    const zPattern=[-9,-4,5,15,25.8,13,24.8,8,-5];
    pts.push(screenToWorldAtZ(startN.x*width,startN.y*height,zPattern[0]));
    let goLeft=Math.random()<.5;
    for(let i=1;i<zPattern.length-1;i++){
      let x,y;
      if(i===4){x=rand(.38,.62);y=rand(.30,.72);} // near-camera central sweep
      else if(i===6){x=rand(.12,.88);y=rand(.12,.88);} // second near pass can happen anywhere
      else{
        x=goLeft?rand(.05,.26):rand(.74,.95);
        y=rand(.08,.92);
        goLeft=!goLeft;
      }
      pts.push(screenToWorldAtZ(x*width,y*height,zPattern[i]+rand(-1.5,1.5)));
    }
    const endN=randomEdgeNormalized();
    pts.push(screenToWorldAtZ(endN.x*width,endN.y*height,zPattern[zPattern.length-1]));
    leaderCurve=new THREE.CatmullRomCurve3(pts,false,'centripetal',.22);
    leaderCurve.arcLengthDivisions=650;leaderCurve.updateArcLengths();
  }

  function leaderState(t){
    const p=clamp(t/FLIGHT_END,0,1),point=leaderCurve.getPointAt(p);
    const tangent=leaderCurve.getTangentAt(clamp(p+.002,0,1)).normalize();
    const prev=leaderCurve.getTangentAt(clamp(p-.010,0,1)).normalize();
    const next=leaderCurve.getTangentAt(clamp(p+.010,0,1)).normalize();
    let delta=Math.atan2(next.y,next.x)-Math.atan2(prev.y,prev.x);
    while(delta>Math.PI)delta-=Math.PI*2;while(delta<-Math.PI)delta+=Math.PI*2;
    return{p,point,tangent,bank:clamp(delta*11,-1.22,1.22)};
  }

  function compactSlot(){return new THREE.Vector3(gaussian()*.050,gaussian()*.040,gaussian()*.038);}
  function speedProfile(){const r=Math.random();if(r<.20)return{cruise:18,max:24,force:25};if(r<.80)return{cruise:15,max:21,force:22};return{cruise:12.5,max:18,force:19};}

  function slotWorld(slot,leader,t){
    const view=viewAtZ(leader.point.z),p=leader.p;
    // Three rapid breathing waves plus strong depth-driven expansion near the camera.
    const near=clamp((leader.point.z-13)/13,0,1);
    const breathe=.48+1.05*pulse(p,.05,.30)+.82*pulse(p,.30,.52)+1.50*pulse(p,.50,.78)+near*.95;
    const turn=Math.atan2(leader.tangent.y,leader.tangent.x),c=Math.cos(turn),s=Math.sin(turn);
    const sx=slot.x*view.w*breathe,sy=slot.y*view.h*breathe;
    const x=sx*c-sy*s,y=sx*s+sy*c,depth=Math.max(.8,(camera.position.z-leader.point.z)*.12);
    return leader.point.clone().add(new THREE.Vector3(x-slot.z*depth*leader.bank*.20,y+slot.z*depth*.10,slot.z*depth*breathe));
  }

  function buildWordTargets(){
    wordTargets=new Map();
    const off=document.createElement('canvas'),octx=off.getContext('2d');
    const ow=Math.min(980,Math.max(340,width*.80)),oh=Math.min(230,Math.max(125,height*.22));off.width=Math.round(ow);off.height=Math.round(oh);
    octx.textAlign='center';octx.textBaseline='middle';octx.fillStyle='#000';octx.font=`800 ${Math.max(44,Math.min(132,ow/7))}px Inter,Arial,sans-serif`;
    for(const text of ['BUILD','EXPLORE','IMPROVE']){
      octx.clearRect(0,0,off.width,off.height);octx.fillText(text,off.width/2,off.height/2);
      const data=octx.getImageData(0,0,off.width,off.height).data,pts=[],step=Math.max(7,Math.round(off.width/116));
      for(let y=2;y<off.height-2;y+=step)for(let x=2;x<off.width-2;x+=step)if(data[(y*off.width+x)*4+3]>110)pts.push({x:x/off.width,y:y/off.height});
      for(let i=pts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]];}
      wordTargets.set(text,group1.map((_,i)=>{const p=pts[i%Math.max(1,pts.length)]||{x:.5,y:.5};return screenToWorldAtZ(width*.5+(p.x-.5)*Math.min(width*.77,900),height*.48+(p.y-.5)*Math.min(height*.21,205),4);}));
    }
  }

  function buildLineTargets(){
    lineTargets=[];const cx=width*.66,cy=height*.51,cardW=Math.min(610,width*.56),cardH=Math.min(430,height*.48);
    for(let i=0;i<group2.length;i++){
      let sx,sy;
      if(i<16){sx=mix(width*.31,width*.69,i/15);sy=86;}
      else{const j=i-16,n=Math.max(1,group2.length-16),p=(j/n)*2*(cardW+cardH);if(p<cardW){sx=cx-cardW/2+p;sy=cy-cardH/2;}else if(p<cardW+cardH){sx=cx+cardW/2;sy=cy-cardH/2+p-cardW;}else if(p<2*cardW+cardH){sx=cx+cardW/2-(p-cardW-cardH);sy=cy+cardH/2;}else{sx=cx-cardW/2;sy=cy+cardH/2-(p-2*cardW-cardH);}}
      lineTargets.push(screenToWorldAtZ(sx,sy,3));
    }
  }

  function initFlock(){
    if(mesh){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();mesh=null;}
    const g1=Math.round(TOTAL_BIRDS*.23),g2=Math.round(TOTAL_BIRDS*.18),g3=Math.round(TOTAL_BIRDS*.18);
    group1=[];group2=[];group3=[];group4=[];flock=[];
    const leader0=leaderState(0);
    for(let i=0;i<TOTAL_BIRDS;i++){
      const group=i<g1?1:i<g1+g2?2:i<g1+g2+g3?3:4,sp=speedProfile(),slot=compactSlot();
      const b={index:i,group,slot,position:slotWorld(slot,leader0,0),velocity:leader0.tangent.clone().multiplyScalar(sp.cruise).add(new THREE.Vector3(rand(-.08,.08),rand(-.07,.07),rand(-.06,.06))),acceleration:new THREE.Vector3(),cruise:sp.cruise,maxSpeed:sp.max,maxForce:sp.force,scale:rand(.18,.32),bank:leader0.bank,phase:rand(0,Math.PI*2),trail:null,tone:Math.random()<.05?'gold':(Math.random()<.08?'teal':'charcoal')};
      flock.push(b);(group===1?group1:group===2?group2:group===3?group3:group4).push(b);
    }
    mesh=new THREE.InstancedMesh(geometry.clone(),material.clone(),TOTAL_BIRDS);mesh.frustumCulled=false;scene.add(mesh);
    flock.forEach((b,i)=>{color.set(b.tone==='gold'?0x8b7448:b.tone==='teal'?0x2f7778:0x25292c);mesh.setColorAt(i,color);});if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    buildWordTargets();buildLineTargets();buildClosePasses();
  }

  const CELL=2.4;let grid=new Map();const neighborOffsets=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)neighborOffsets.push([x,y,z]);
  const keyFor=p=>`${Math.floor(p.x/CELL)},${Math.floor(p.y/CELL)},${Math.floor(p.z/CELL)}`;
  function buildGrid(){grid=new Map();flock.forEach((b,i)=>{const k=keyFor(b.position);let a=grid.get(k);if(!a)grid.set(k,a=[]);a.push(i);});}
  function neighborsOf(b){const cx=Math.floor(b.position.x/CELL),cy=Math.floor(b.position.y/CELL),cz=Math.floor(b.position.z/CELL),out=[];for(const [dx,dy,dz] of neighborOffsets){const a=grid.get(`${cx+dx},${cy+dy},${cz+dz}`);if(a)out.push(...a);}return out;}
  function steerToVelocity(b,desired){const steer=desired.clone().sub(b.velocity);if(steer.length()>b.maxForce)steer.setLength(b.maxForce);return steer;}
  function seek(b,target,speed=b.maxSpeed){const desired=target.clone().sub(b.position);if(desired.lengthSq()<1e-7)return new THREE.Vector3();desired.setLength(speed);return steerToVelocity(b,desired);}
  function boidForce(b){
    const sep=new THREE.Vector3(),ali=new THREE.Vector3(),coh=new THREE.Vector3();let count=0,sepCount=0;
    for(const id of neighborsOf(b)){const o=flock[id];if(o===b)continue;const d=o.position.clone().sub(b.position),d2=d.lengthSq();if(d2>2.7*2.7||d2<1e-7)continue;count++;ali.add(o.velocity);coh.add(o.position);if(d2<.19*.19){sep.addScaledVector(d,-1/Math.max(d2,.004));sepCount++;}}
    const f=new THREE.Vector3();
    if(sepCount){sep.divideScalar(sepCount);if(sep.lengthSq())sep.setLength(b.maxSpeed);f.addScaledVector(steerToVelocity(b,sep),1.20);}
    if(count){ali.divideScalar(count);if(ali.lengthSq())ali.setLength(b.cruise);f.addScaledVector(steerToVelocity(b,ali),2.15);coh.divideScalar(count);f.addScaledVector(seek(b,coh,b.cruise),1.25);}
    return f;
  }

  function wordSpec(t){if(t<FORMATION_START)return null;if(t<2260)return{text:'BUILD',strength:smooth((t-FORMATION_START)/150)*(1-smooth((t-2230)/70))};if(t<2450)return{text:'EXPLORE',strength:smooth((t-2260)/120)*(1-smooth((t-2420)/55))};if(t<2580)return{text:'IMPROVE',strength:smooth((t-2450)/90)*(1-smooth((t-2550)/40))};return null;}
  function formationTarget(b,t){
    if(b.group===1){const spec=wordSpec(t);if(spec){const idx=group1.indexOf(b),target=(wordTargets.get(spec.text)||[])[idx];if(target)return{target,strength:spec.strength};}}
    if(b.group===2){const strength=smooth((t-2200)/210)*(1-smooth((t-2760)/160)),target=lineTargets[group2.indexOf(b)];if(target&&strength>0)return{target,strength};}
    return null;
  }

  function updateFlock(t,dt){
    const leader=leaderState(t);buildGrid();
    for(const b of flock){
      let force=boidForce(b),slotTarget=slotWorld(b.slot,leader,t);
      force.addScaledVector(seek(b,slotTarget,b.maxSpeed*1.12),3.15);
      force.addScaledVector(steerToVelocity(b,leader.tangent.clone().multiplyScalar(b.cruise*1.08)),2.35);
      const formation=formationTarget(b,t);
      if(formation){force.multiplyScalar(1-formation.strength*.44);force.addScaledVector(seek(b,formation.target,b.maxSpeed),3.15*formation.strength);}
      force.add(new THREE.Vector3(Math.sin(t*.0012+b.phase),Math.cos(t*.00097+b.phase*.67),Math.sin(t*.00075+b.phase*.43)).multiplyScalar(.04));
      if(force.length()>b.maxForce*2.5)force.setLength(b.maxForce*2.5);
      b.acceleration.copy(force);b.velocity.addScaledVector(force,dt);
      const speed=b.velocity.length();if(speed>b.maxSpeed)b.velocity.setLength(b.maxSpeed);else if(speed<b.cruise*.9)b.velocity.setLength(b.cruise*.9);
      b.position.addScaledVector(b.velocity,dt);
      const local=clamp(b.acceleration.x/(b.maxForce*1.1),-.5,.5),targetBank=clamp(leader.bank+local,-1.28,1.28);
      b.bank=mix(b.bank,targetBank,clamp(dt*13,0,1));
    }
  }

  function eraseGroup3Trails(t){
    if(t<1580)return;for(const b of group3){const s=worldToScreen(b.position);if(!s.visible){b.trail=null;continue;}if(!b.trail){b.trail={x:s.x,y:s.y};continue;}mctx.save();mctx.globalCompositeOperation='destination-out';mctx.lineCap='round';mctx.globalAlpha=.12;mctx.lineWidth=clamp(b.scale*20,4,11);mctx.beginPath();mctx.moveTo(b.trail.x,b.trail.y);mctx.lineTo(s.x,s.y);mctx.stroke();mctx.restore();b.trail={x:s.x,y:s.y};}
  }

  function buildClosePasses(){
    closePasses.forEach(p=>scene.remove(p.mesh));closePasses=[];
    const specs=[{start:1180,dur:470},{start:1510,dur:430},{start:1780,dur:520}];
    for(const spec of specs){
      const geo=geometry.clone(),mat=closeMaterial.clone(),m=new THREE.Mesh(geo,mat);m.visible=false;m.renderOrder=999;scene.add(m);
      let a=randomEdgeNormalized(),b=randomEdgeNormalized();
      // Force the pass through a broad central band so it can occlude the camera.
      const mid={x:rand(.28,.72),y:rand(.22,.78)};
      closePasses.push({...spec,mesh:m,a,b,mid,spin:rand(-1.0,1.0)});
    }
  }

  function updateClosePasses(t){
    for(const p of closePasses){
      const q=(t-p.start)/p.dur;if(q<0||q>1){p.mesh.visible=false;continue;}p.mesh.visible=true;
      const e=smooth(q),near=Math.pow(Math.sin(Math.PI*e),2.8);
      const sx=(1-e)*(1-e)*p.a.x+2*(1-e)*e*p.mid.x+e*e*p.b.x;
      const sy=(1-e)*(1-e)*p.a.y+2*(1-e)*e*p.mid.y+e*e*p.b.y;
      const z=mix(9,29.18,near);
      p.mesh.position.copy(screenToWorldAtZ(sx*width,sy*height,z));
      p.mesh.rotation.z=p.spin+e*1.8;
      // At peak the triangle can fill/overrun the viewport, reproducing the GIF's black foreground moments.
      const scale=mix(.45,8.6,Math.pow(near,.82));p.mesh.scale.setScalar(scale);
    }
  }

  function renderFlock(t){
    const leader=leaderState(t),near=clamp((leader.point.z-12)/14,0,1),scaleBoost=1+near*.42;
    for(let i=0;i<flock.length;i++){
      const b=flock[i],formation=formationTarget(b,t);dummy.position.copy(b.position);
      const heading=Math.atan2(b.velocity.y,b.velocity.x)-Math.PI/2;dummy.rotation.set(0,0,heading+b.bank);
      dummy.scale.setScalar(b.scale*scaleBoost*(formation?1-formation.strength*.08:1));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;renderer.render(scene,camera);
  }

  function wipe(t){
    if(t<WIPE_START)return;const q=smooth((t-WIPE_START)/(WIPE_END-WIPE_START)),sx=mix(-width*.14,width*1.15,q),sy=height*(.78-Math.sin(q*Math.PI)*.42),size=mix(24,Math.hypot(width,height)*1.25,smooth(clamp((q-.14)/.62,0,1))),rot=-.72+q*1.02;
    mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=clamp(.30+q,0,1);mctx.translate(sx,sy);mctx.rotate(rot);mctx.beginPath();mctx.moveTo(0,-size);mctx.lineTo(size*.98,size*.78);mctx.lineTo(-size*.98,size*.78);mctx.closePath();mctx.fill();mctx.restore();
    if(q>.82){mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=smooth((q-.82)/.18);mctx.fillRect(0,0,width,height);mctx.restore();}
  }

  function resize(){
    width=Math.max(1,window.innerWidth);height=Math.max(1,window.innerHeight);dpr=Math.min(window.devicePixelRatio||1,1.4);camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
    membrane.width=Math.round(width*dpr);membrane.height=Math.round(height*dpr);membrane.style.width=`${width}px`;membrane.style.height=`${height}px`;mctx.setTransform(dpr,0,0,dpr,0,0);mctx.globalCompositeOperation='source-over';mctx.fillStyle='#fff';mctx.fillRect(0,0,width,height);
    buildLeaderCurve();initFlock();
  }

  function finish(){if(finished)return;finished=true;cancelAnimationFrame(raf);closePasses.forEach(p=>{scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();});renderer.dispose();document.documentElement.dataset.entryState='complete';overlay.classList.add('entry-complete');setTimeout(()=>overlay.remove(),160);}
  const watchdog=setTimeout(finish,4600);
  function frame(now){if(!start){start=now;last=now;}const t=now-start,dt=clamp((now-last)/1000,0,.022);last=now;updateFlock(t,dt);eraseGroup3Trails(t);wipe(t);updateClosePasses(t);renderFlock(t);if(t>=TOTAL){clearTimeout(watchdog);finish();return;}raf=requestAnimationFrame(frame);}

  let resizeTimer=0;window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,120);},{passive:true});window.addEventListener('pageshow',e=>{if(e.persisted)finish();},{passive:true});
  try{resize();document.documentElement.dataset.entryState='running';raf=requestAnimationFrame(frame);}catch(_){clearTimeout(watchdog);finish();}
})();