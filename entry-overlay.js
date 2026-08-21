/* Harris Portfolio entry: phase-shifted Three.js murmuration.
   Motion model is inspired by the supplied Builder.io particle field: one compact
   flock volume, persistent per-triangle phase offsets, shared trigonometric flow,
   randomized full-screen 3D travel, swell/compress cycles, and near-camera fly-bys.
   The portfolio remains untouched beneath this modular overlay. */
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
  const FLIGHT_END=2250;
  const FORMATION_START=2160;
  const WIPE_START=2630;
  const WIPE_END=3090;
  const BIRDS=420;
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
  renderer.setClearColor(0x000000,0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.4));
  renderer.domElement.className='entry-three-canvas';renderer.domElement.setAttribute('aria-hidden','true');overlay.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(58,1,.1,100);
  camera.position.set(0,0,30);camera.lookAt(0,0,0);

  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute([0,.82,0,-.72,-.52,0,.72,-.52,0],3));
  const material=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.96,depthWrite:false});
  const mesh=new THREE.InstancedMesh(geometry,material,BIRDS);
  mesh.frustumCulled=false;scene.add(mesh);

  let width=1,height=1,dpr=1,route=null,start=0,last=0,raf=0,finished=false;
  let birds=[],group1=[],group2=[],group3=[],group4=[];
  let wordTargets=new Map(),lineTargets=[];
  const dummy=new THREE.Object3D(),color=new THREE.Color(),ndc=new THREE.Vector3(),rayDir=new THREE.Vector3();

  function screenToWorldAtZ(sx,sy,z){
    ndc.set((sx/width)*2-1,-((sy/height)*2-1),.5).unproject(camera);
    rayDir.copy(ndc).sub(camera.position).normalize();
    const denom=Math.abs(rayDir.z)<1e-6?-1e-6:rayDir.z;
    return camera.position.clone().add(rayDir.multiplyScalar((z-camera.position.z)/denom));
  }
  function worldToScreen(v){const p=v.clone().project(camera);return{x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height,visible:p.z>-1&&p.z<1};}
  function viewAtZ(z){const d=Math.max(.2,camera.position.z-z),vh=2*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))*d;return{w:vh*camera.aspect,h:vh};}

  function randomEdge(){
    const side=Math.floor(rand(0,4));
    if(side===0)return{x:rand(.04,.96),y:-.08};
    if(side===1)return{x:1.08,y:rand(.04,.96)};
    if(side===2)return{x:rand(.04,.96),y:1.08};
    return{x:-.08,y:rand(.04,.96)};
  }

  function buildRandomRoute(){
    const pts=[];
    const startN=randomEdge();
    pts.push(screenToWorldAtZ(startN.x*width,startN.y*height,-8));

    let left=Math.random()<.5;
    const z=[-3,5,14,25.8,17,27.6,12,24.8,4,-6];
    for(let i=0;i<z.length;i++){
      let x,y;
      if(i===3||i===5||i===7){
        // Deep near-camera incursions can happen almost anywhere in frame.
        x=rand(.16,.84);y=rand(.12,.88);
      }else{
        // Alternate opposing screen regions to force full-frame flock traversal.
        x=left?rand(.02,.30):rand(.70,.98);
        y=rand(.04,.96);
        left=!left;
      }
      pts.push(screenToWorldAtZ(x*width,y*height,z[i]+rand(-1.0,1.0)));
    }
    const endN=randomEdge();
    pts.push(screenToWorldAtZ(endN.x*width,endN.y*height,-7));
    route=new THREE.CatmullRomCurve3(pts,false,'centripetal',.28);
    route.arcLengthDivisions=800;route.updateArcLengths();
  }

  function routeState(t){
    const p=clamp(t/FLIGHT_END,0,1);
    const point=route.getPointAt(p);
    const tangent=route.getTangentAt(clamp(p+.002,0,1)).normalize();
    const prev=route.getTangentAt(clamp(p-.009,0,1)).normalize();
    const next=route.getTangentAt(clamp(p+.009,0,1)).normalize();
    let da=Math.atan2(next.y,next.x)-Math.atan2(prev.y,prev.x);
    while(da>Math.PI)da-=Math.PI*2;while(da<-Math.PI)da+=Math.PI*2;
    return{p,point,tangent,bank:clamp(da*12.5,-1.28,1.28)};
  }

  function makeBird(i,group){
    // Compact camera-normalized base cloud. Same visual density on desktop/mobile.
    const base=new THREE.Vector3(gaussian()*.045,gaussian()*.038,gaussian()*.034);
    return{
      i,group,base,
      phaseA:rand(0,Math.PI),
      phaseB:rand(0,Math.PI*2),
      phaseRate:rand(.70,1.55),
      amplitude:rand(.55,1.35),
      scale:rand(.18,.32),
      bankBias:rand(-.16,.16),
      prev:null,
      trail:null,
      tone:Math.random()<.05?'gold':(Math.random()<.08?'teal':'charcoal')
    };
  }

  function initBirds(){
    const g1=Math.round(BIRDS*.23),g2=Math.round(BIRDS*.18),g3=Math.round(BIRDS*.18);
    birds=[];group1=[];group2=[];group3=[];group4=[];
    for(let i=0;i<BIRDS;i++){
      const group=i<g1?1:i<g1+g2?2:i<g1+g2+g3?3:4;
      const b=makeBird(i,group);birds.push(b);
      (group===1?group1:group===2?group2:group===3?group3:group4).push(b);
      color.set(b.tone==='gold'?0x8b7448:b.tone==='teal'?0x2f7778:0x25292c);mesh.setColorAt(i,color);
    }
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  }

  function flowPosition(b,state,t){
    const view=viewAtZ(state.point.z),p=state.p;

    // Builder.io-style phase field: every triangle samples the same spherical
    // motion field at a different phase. This rolls/folds the flock organically.
    const time=t*.0047;
    const moveT=b.phaseA+b.phaseRate*time;
    const moveS=b.phaseB+b.phaseRate*.83*time;
    const field=new THREE.Vector3(
      Math.cos(moveS)*Math.sin(moveT),
      Math.cos(moveT),
      Math.sin(moveS)*Math.sin(moveT)
    );

    // A second harmonic stops the field from looking like one clean orbit.
    const h2=new THREE.Vector3(
      Math.sin(moveT*1.71+b.phaseB),
      Math.cos(moveS*1.33+b.phaseA),
      Math.sin((moveT+moveS)*.79)
    );
    field.addScaledVector(h2,.34).normalize();

    // The whole flock repeatedly swells and compresses while perspective expands
    // it again during close camera passes.
    const near=clamp((state.point.z-12)/16,0,1);
    const breathe=.52
      +.92*pulse(p,.03,.22)
      +.60*pulse(p,.20,.38)
      +1.15*pulse(p,.36,.58)
      +.66*pulse(p,.56,.72)
      +1.50*pulse(p,.68,.90)
      +near*.70;

    const turn=Math.atan2(state.tangent.y,state.tangent.x),c=Math.cos(turn),s=Math.sin(turn);
    const bx=b.base.x*view.w*breathe,by=b.base.y*view.h*breathe;
    const rx=bx*c-by*s,ry=bx*s+by*c;
    const depth=Math.max(.8,(camera.position.z-state.point.z)*.12);

    const flowAmp=b.amplitude*(.17+.36*breathe);
    const fx=field.x*view.w*.020*flowAmp;
    const fy=field.y*view.h*.024*flowAmp;
    const fz=field.z*depth*.36*flowAmp;

    return state.point.clone().add(new THREE.Vector3(
      rx+fx-b.base.z*depth*state.bank*.18,
      ry+fy+b.base.z*depth*.10,
      b.base.z*depth*breathe+fz
    ));
  }

  function buildWordTargets(){
    wordTargets=new Map();
    const off=document.createElement('canvas'),octx=off.getContext('2d');
    const ow=Math.min(980,Math.max(340,width*.80)),oh=Math.min(230,Math.max(125,height*.22));
    off.width=Math.round(ow);off.height=Math.round(oh);
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

  function wordSpec(t){
    if(t<FORMATION_START)return null;
    if(t<2350)return{text:'BUILD',strength:smooth((t-FORMATION_START)/130)*(1-smooth((t-2315)/60))};
    if(t<2510)return{text:'EXPLORE',strength:smooth((t-2350)/105)*(1-smooth((t-2480)/50))};
    if(t<2630)return{text:'IMPROVE',strength:smooth((t-2510)/85)*(1-smooth((t-2600)/35))};
    return null;
  }

  function formationPosition(b,pos,t){
    if(b.group===1){
      const spec=wordSpec(t);
      if(spec){const target=(wordTargets.get(spec.text)||[])[group1.indexOf(b)];if(target)return pos.lerp(target,spec.strength);}
    }
    if(b.group===2){
      const strength=smooth((t-2310)/180)*(1-smooth((t-2780)/130));
      const target=lineTargets[group2.indexOf(b)];if(target&&strength>0)return pos.lerp(target,strength);
    }
    return pos;
  }

  function eraseTrails(t,positions){
    if(t<1500)return;
    for(const b of group3){
      const pos=positions[b.i],s=worldToScreen(pos);
      if(!s.visible){b.trail=null;continue;}
      if(!b.trail){b.trail={x:s.x,y:s.y};continue;}
      mctx.save();mctx.globalCompositeOperation='destination-out';mctx.lineCap='round';mctx.globalAlpha=.11;mctx.lineWidth=clamp(b.scale*20,4,10);
      mctx.beginPath();mctx.moveTo(b.trail.x,b.trail.y);mctx.lineTo(s.x,s.y);mctx.stroke();mctx.restore();
      b.trail.x=s.x;b.trail.y=s.y;
    }
  }

  function renderFlock(t){
    const state=routeState(t),positions=new Array(BIRDS);
    for(const b of birds){
      let pos=flowPosition(b,state,t);
      pos=formationPosition(b,pos,t);
      positions[b.i]=pos;

      let heading=state.bank;
      if(b.prev){
        const dx=pos.x-b.prev.x,dy=pos.y-b.prev.y;
        if(Math.abs(dx)+Math.abs(dy)>.0001)heading=Math.atan2(dy,dx)-Math.PI/2;
      }
      b.prev=pos.clone();

      const near=clamp((state.point.z-14)/14,0,1);
      dummy.position.copy(pos);
      dummy.rotation.set(0,0,heading+state.bank*.55+b.bankBias);
      dummy.scale.setScalar(b.scale*(1+near*.24));
      dummy.updateMatrix();mesh.setMatrixAt(b.i,dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate=true;
    eraseTrails(t,positions);
    renderer.render(scene,camera);
  }

  function foregroundPasses(t){
    // Three separate flock members rush so close that their charcoal silhouette can
    // temporarily obscure most of the viewport, like the supplied bird GIF.
    const passes=[
      {a:620,b:920,fromX:-.20,toX:1.12,y:.38,arc:.30,rot:-.70},
      {a:1120,b:1435,fromX:1.15,toX:-.16,y:.64,arc:.34,rot:.58},
      {a:1700,b:2050,fromX:-.18,toX:1.16,y:.52,arc:.42,rot:-.38}
    ];
    for(const pass of passes){
      if(t<pass.a||t>pass.b)continue;
      const q=smooth((t-pass.a)/(pass.b-pass.a));
      const x=mix(pass.fromX,pass.toX,q)*width;
      const y=height*(pass.y-Math.sin(q*Math.PI)*pass.arc);
      const near=Math.sin(q*Math.PI);
      const size=mix(24,Math.hypot(width,height)*1.08,Math.pow(near,2.0));
      renderer.autoClear=false;
      const c=document.createElement('canvas');
      // Canvas creation is avoided in actual drawing; this branch only computes wipe below.
      mctx.save();mctx.globalCompositeOperation='source-over';mctx.fillStyle='rgba(18,20,22,'+(near*.92)+')';mctx.translate(x,y);mctx.rotate(pass.rot+q*.55);
      mctx.beginPath();mctx.moveTo(0,-size);mctx.lineTo(size*.98,size*.78);mctx.lineTo(-size*.98,size*.78);mctx.closePath();mctx.fill();mctx.restore();
      renderer.autoClear=true;
    }
  }

  function wipe(t){
    if(t<WIPE_START)return;
    const q=smooth((t-WIPE_START)/(WIPE_END-WIPE_START));
    const x=mix(-.15,1.15,q)*width,y=height*(.76-Math.sin(q*Math.PI)*.38);
    const size=mix(28,Math.hypot(width,height)*1.25,smooth(clamp((q-.10)/.67,0,1)));
    mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=clamp(.28+q,0,1);mctx.translate(x,y);mctx.rotate(-.65+q*.95);
    mctx.beginPath();mctx.moveTo(0,-size);mctx.lineTo(size*.98,size*.78);mctx.lineTo(-size*.98,size*.78);mctx.closePath();mctx.fill();mctx.restore();
    if(q>.82){mctx.save();mctx.globalCompositeOperation='destination-out';mctx.globalAlpha=smooth((q-.82)/.18);mctx.fillRect(0,0,width,height);mctx.restore();}
  }

  function resize(){
    width=Math.max(1,window.innerWidth);height=Math.max(1,window.innerHeight);dpr=Math.min(window.devicePixelRatio||1,1.4);
    camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
    membrane.width=Math.round(width*dpr);membrane.height=Math.round(height*dpr);membrane.style.width=`${width}px`;membrane.style.height=`${height}px`;
    mctx.setTransform(dpr,0,0,dpr,0,0);mctx.globalCompositeOperation='source-over';mctx.fillStyle='#fff';mctx.fillRect(0,0,width,height);
    buildRandomRoute();initBirds();buildWordTargets();buildLineTargets();
  }

  function finish(){
    if(finished)return;finished=true;cancelAnimationFrame(raf);renderer.dispose();
    document.documentElement.dataset.entryState='complete';overlay.classList.add('entry-complete');setTimeout(()=>overlay.remove(),160);
  }

  const watchdog=setTimeout(finish,4500);
  function frame(now){
    if(!start){start=now;last=now;}
    const t=now-start;last=now;
    renderFlock(t);
    foregroundPasses(t);
    wipe(t);
    if(t>=TOTAL){clearTimeout(watchdog);finish();return;}
    raf=requestAnimationFrame(frame);
  }

  let resizeTimer=0;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(resize,120);},{passive:true});
  window.addEventListener('pageshow',e=>{if(e.persisted)finish();},{passive:true});

  try{resize();document.documentElement.dataset.entryState='running';raf=requestAnimationFrame(frame);}
  catch(_){clearTimeout(watchdog);finish();}
})();