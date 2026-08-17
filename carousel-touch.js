/* Harris Portfolio: unified five-card carousel physics for desktop + mobile. */
(() => {
  const stage = document.querySelector('.stage');
  const barrel = document.querySelector('#barrel');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const controls = document.querySelector('.controls');
  if (!stage || !barrel) return;

  // Safely expand the existing four-card barrel into five cards without
  // rewriting the minified index.html. Preserve the three project cards and
  // existing Find Me Online card, then insert About Me as card 1.
  const originalPages = [...barrel.querySelectorAll('.page')];
  if (originalPages.length === 4 && !barrel.querySelector('[data-card="about-me"]')) {
    const about = document.createElement('article');
    about.className = 'page';
    about.dataset.card = 'about-me';
    about.innerHTML = `
      <div class="page-top"><span class="num">01</span><span class="state">Profile</span></div>
      <div>
        <h2>About Me</h2>
        <p>I focus on AI-enabled workflows, technical documentation, technical communication, workflow optimization, and practical knowledge systems. I use AI as an operational tool to learn quickly, test ideas, improve processes, and translate complex information into clear, useful work.</p>
      </div>
      <div class="page-bottom"><span class="repo">Professional Focus</span><span class="small">AI · Documentation · Operations</span></div>`;

    // Desired five-card order:
    // 1 About Me, 2 Project 1, 3 Project 2, 4 Project 3, 5 Find Me Online.
    barrel.replaceChildren(about, originalPages[0], originalPages[1], originalPages[2], originalPages[3]);
  }

  const pages = [...barrel.querySelectorAll('.page')];
  const CARD_COUNT = pages.length;
  const STEP = 360 / CARD_COUNT;

  pages.forEach((page, i) => {
    const num = page.querySelector('.num');
    if (num) num.textContent = String(i + 1).padStart(2, '0');
  });

  const dotHost = document.querySelector('.dots');
  if (dotHost) {
    dotHost.replaceChildren(...Array.from({length: CARD_COUNT}, (_, i) => {
      const dot = document.createElement('span');
      dot.className = 'dot' + (i === 0 ? ' on' : '');
      return dot;
    }));
  }
  const dots = [...document.querySelectorAll('.dot')];

  const DRAG_GAIN=.41,DIRECTION_LOCK=7,MIN_RELEASE_SPEED=.04,SPRING=7.5,DAMPING=4.8,BUTTON_SPEED=230,MAX_RELEASE_SPEED=300,MIN_SETTLE_TIME=.62,MAX_SETTLE_TIME=1.15;
  const zone=document.createElement('div');
  zone.className='carousel-touch-zone';
  zone.setAttribute('aria-hidden','true');
  Object.assign(zone.style,{position:'absolute',left:'50%',top:'50%',transform:'translate(-50%, -50%)',width:'90%',height:'430px',zIndex:'12',touchAction:'pan-y',background:'transparent',cursor:'grab',userSelect:'none',WebkitUserSelect:'none',pointerEvents:'auto'});
  stage.appendChild(zone);

  let angle=0,velocity=0,raf=0,gesture='idle',activePointer=null,startX=0,startY=0,lastX=0,lastT=0,generation=0;
  barrel.style.transition='none';
  barrel.style.pointerEvents='none';
  barrel.style.userSelect='none';
  barrel.style.webkitUserSelect='none';
  zone.style.height=window.innerWidth<=560?'390px':'430px';

  const normalize=n=>((n%CARD_COUNT)+CARD_COUNT)%CARD_COUNT;
  function render(){
    barrel.style.transform=`rotateY(${angle}deg)`;
    const i=normalize(Math.round(angle/STEP));
    dots.forEach((d,n)=>d.classList.toggle('on',n===i));
  }
  function stopAnimation(){if(raf)cancelAnimationFrame(raf);raf=0}
  function invalidate(){generation++;stopAnimation()}
  function settleToCard(initialVelocity,target){
    invalidate();
    const my=generation;
    let v=initialVelocity,last=performance.now(),started=last,stable=0;
    const tick=now=>{
      if(my!==generation)return;
      const dt=Math.min(.032,Math.max(.008,(now-last)/1000));
      last=now;
      const distance=target-angle,abs=Math.abs(distance),elapsed=(now-started)/1000;
      v+=((distance*SPRING)-(v*DAMPING))*dt;
      const step=v*dt;
      if(Math.abs(step)>=abs&&abs>0){angle=target;velocity=0;render();raf=0;return}
      angle+=step;velocity=v;render();
      if(Math.abs(target-angle)<.10&&Math.abs(v)<1)stable++;else stable=0;
      if((stable>=3&&elapsed>=MIN_SETTLE_TIME)||elapsed>=MAX_SETTLE_TIME){angle=target;velocity=0;render();raf=0;return}
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
  }
  function begin(e){
    if(e.pointerType==='mouse'&&e.button!==0)return;
    if(controls&&controls.contains(e.target))return;
    invalidate();gesture='pending';activePointer=e.pointerId;startX=lastX=e.clientX;startY=e.clientY;lastT=performance.now();velocity=0;zone.style.cursor='grabbing';
  }
  function move(e){
    if(activePointer===null||e.pointerId!==activePointer||gesture==='idle')return;
    const dxT=e.clientX-startX,dyT=e.clientY-startY;
    if(gesture==='pending'){
      if(Math.hypot(dxT,dyT)<DIRECTION_LOCK)return;
      if(Math.abs(dyT)>Math.abs(dxT)){gesture='vertical';activePointer=null;zone.style.cursor='grab';return}
      gesture='horizontal';
    }
    if(gesture!=='horizontal')return;
    e.preventDefault();
    const now=performance.now(),dx=e.clientX-lastX,dt=Math.max(8,now-lastT);
    lastX=e.clientX;lastT=now;angle+=dx*DRAG_GAIN;velocity=(dx*DRAG_GAIN/dt)*1000;render();
  }
  function end(e){
    if(activePointer===null||e.pointerId!==activePointer)return;
    const horizontal=gesture==='horizontal',rv=velocity;
    activePointer=null;gesture='idle';zone.style.cursor='grab';
    if(!horizontal)return;
    const dir=Math.sign(rv),current=Math.round(angle/STEP),offset=angle-current*STEP;
    let targetIndex;
    if(dir&&Math.abs(rv)>MIN_RELEASE_SPEED*1000){
      targetIndex=dir>0?Math.ceil(angle/STEP):Math.floor(angle/STEP);
      if(targetIndex===current)targetIndex+=dir;
    } else {
      targetIndex=Math.round(angle/STEP);
      if(Math.abs(offset)>=STEP/2)targetIndex+=Math.sign(offset);
    }
    const target=targetIndex*STEP;
    const initial=Math.sign(target-angle)*Math.min(MAX_RELEASE_SPEED,Math.max(45,Math.abs(rv)));
    settleToCard(initial,target);
  }
  function cancel(e){
    if(activePointer!==null&&e?.pointerId!==undefined&&e.pointerId!==activePointer)return;
    activePointer=null;gesture='idle';zone.style.cursor='grab';velocity=0;render();
  }
  function rotateBy(dir){
    invalidate();gesture='idle';activePointer=null;
    const current=Math.round(angle/STEP),target=(current+dir)*STEP;
    settleToCard(dir*BUTTON_SPEED,target);
  }

  zone.addEventListener('pointerdown',begin,{passive:true});
  window.addEventListener('pointermove',move,{passive:false});
  window.addEventListener('pointerup',end,{passive:true});
  window.addEventListener('pointercancel',cancel,{passive:true});
  window.addEventListener('blur',cancel);
  prev?.addEventListener('click',e=>{e.preventDefault();rotateBy(-1)});
  next?.addEventListener('click',e=>{e.preventDefault();rotateBy(1)});
  window.addEventListener('resize',()=>{zone.style.height=window.innerWidth<=560?'390px':'430px'});

  const presentation=document.createElement('style');
  presentation.textContent=`
    html,body{overflow:auto!important}
    .topbar{height:86px!important;justify-content:center!important;padding:0 24px!important;position:relative;border-bottom:1px solid rgba(174,225,230,.22)!important;background:linear-gradient(90deg,rgba(3,15,21,.78),rgba(8,31,39,.56),rgba(3,15,21,.78))!important;box-shadow:0 10px 34px rgba(0,0,0,.18),inset 0 -1px 0 rgba(99,213,208,.08)}
    .brand{font-size:1.08rem!important;letter-spacing:.28em!important;font-weight:750!important;color:#edf7f8!important;text-align:center;position:relative;padding:0 22px;text-shadow:0 0 20px rgba(99,213,208,.12)}
    .brand:before,.brand:after{content:'';position:absolute;top:50%;width:54px;height:1px;background:linear-gradient(90deg,transparent,rgba(99,213,208,.6));transform:translateY(-50%)}
    .brand:before{right:100%}.brand:after{left:100%;transform:translateY(-50%) rotate(180deg)}
    .nav{display:none!important}.main{padding-top:10px!important;padding-bottom:20px!important;gap:clamp(20px,4vw,60px)!important}
    .shell{height:auto!important;min-height:100vh!important;display:flex!important;flex-direction:column!important}
    .swipe-guide{justify-content:center!important;text-align:center!important;gap:14px!important}
    .swipe-guide .carousel-guide-arrow,.desktop-swipe-guide .carousel-guide-arrow{pointer-events:auto!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;width:38px!important;height:38px!important;flex:0 0 38px!important;border:1px solid rgba(174,225,230,.28)!important;border-radius:50%!important;background:rgba(5,22,29,.72)!important;color:#edf7f8!important;font-size:1rem!important;line-height:1!important;cursor:pointer!important;transition:transform .2s,border-color .2s,color .2s!important}
    .swipe-guide .carousel-guide-arrow:hover,.desktop-swipe-guide .carousel-guide-arrow:hover{transform:scale(1.06)!important;border-color:#d8b86a!important;color:#fff0b0!important}
    .swipe-guide .carousel-guide-label,.desktop-swipe-guide .carousel-guide-label{flex:0 1 auto!important;text-align:center!important}
    .controls,.hint{display:none!important}
    .desktop-swipe-guide{position:absolute!important;left:50%!important;bottom:6px!important;transform:translateX(-50%)!important;display:flex!important;align-items:center!important;justify-content:center!important;gap:14px!important;min-width:330px!important;min-height:52px!important;padding:0 18px!important;border:2px solid transparent!important;border-radius:16px!important;background:linear-gradient(rgba(6,21,28,.22),rgba(6,21,28,.22)) padding-box,linear-gradient(180deg,rgba(6,21,28,.18) 0%,rgba(10,45,35,.98) 100%) border-box!important;color:#9bb7ad!important;font-size:.69rem!important;letter-spacing:.16em!important;text-transform:uppercase!important;box-shadow:0 8px 22px rgba(0,0,0,.18)!important;z-index:30!important;visibility:visible!important;opacity:1!important}
    .barrel{--carousel-radius:min(420px,62vw)!important}
    .barrel>.page:nth-child(1){transform:rotateY(0deg) translateZ(var(--carousel-radius))!important}
    .barrel>.page:nth-child(2){transform:rotateY(72deg) translateZ(var(--carousel-radius))!important}
    .barrel>.page:nth-child(3){transform:rotateY(144deg) translateZ(var(--carousel-radius))!important}
    .barrel>.page:nth-child(4){transform:rotateY(216deg) translateZ(var(--carousel-radius))!important}
    .barrel>.page:nth-child(5){transform:rotateY(288deg) translateZ(var(--carousel-radius))!important}
    .site-disclaimer{display:block!important;position:relative!important;visibility:visible!important;width:min(1180px,calc(100% - 44px));margin:0 auto 22px;padding:16px 20px 17px;border-top:1px solid rgba(99,213,208,.25);border-bottom:1px solid rgba(174,225,230,.10);font-size:.70rem;line-height:1.65;letter-spacing:.025em;color:#789198;text-align:center;background:linear-gradient(90deg,transparent,rgba(7,27,35,.34),transparent)}
    .site-disclaimer strong{display:block;margin-bottom:5px;color:#9bb7bc;font-size:.64rem;letter-spacing:.18em;text-transform:uppercase}.site-disclaimer span{color:#a7bec2}
    @media(max-width:900px){.main{padding-top:16px!important}.site-disclaimer{margin-top:0}.desktop-swipe-guide{display:none!important}}
    @media(max-width:560px){.topbar{height:76px!important}.brand{font-size:.88rem!important;letter-spacing:.20em!important}.brand:before,.brand:after{width:26px}.main{padding-top:8px!important}.site-disclaimer{width:calc(100% - 32px);margin-bottom:14px;padding:14px 12px;font-size:.64rem}.barrel{--carousel-radius:62vw!important}}
  `;
  document.head.appendChild(presentation);
  document.querySelector('.nav')?.remove();
  document.querySelector('.about')?.remove();
  document.querySelectorAll('.hint').forEach(el=>el.remove());

  document.querySelector('.intro .micro')?.remove();
  const introLead=document.querySelector('.intro > p:not(.micro)');
  if(introLead){introLead.textContent='I build AI-enabled workflows, technical documentation, and practical knowledge systems that help teams turn complex information into clear, reliable, and usable work. My focus spans AI operations, AI enablement, technical communication, workflow optimization, documentation strategy, and quality-focused implementation.';}

  function wireGuide(guide){
    const guideParts=[...guide.querySelectorAll('span')];
    if(guideParts.length<3)return;
    const left=guideParts[0],label=guideParts[1],right=guideParts[2];
    left.classList.add('carousel-guide-arrow');right.classList.add('carousel-guide-arrow');label.classList.add('carousel-guide-label');
    left.setAttribute('role','button');left.setAttribute('tabindex','0');left.setAttribute('aria-label','Previous portfolio card');
    right.setAttribute('role','button');right.setAttribute('tabindex','0');right.setAttribute('aria-label','Next portfolio card');
    const activate=(el,dir)=>{const run=e=>{e.preventDefault();e.stopPropagation();rotateBy(dir)};el.addEventListener('click',run);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){run(e)}})};
    activate(left,-1);activate(right,1);
  }
  const mobileGuide=document.querySelector('.swipe-guide');
  if(mobileGuide){
    wireGuide(mobileGuide);
    if(!document.querySelector('.desktop-swipe-guide')){
      const desktopGuide=mobileGuide.cloneNode(true);
      desktopGuide.className='desktop-swipe-guide';
      desktopGuide.removeAttribute('aria-hidden');
      stage.appendChild(desktopGuide);
      wireGuide(desktopGuide);
    }
  }

  if(!document.querySelector('.site-disclaimer')){
    const footer=document.createElement('footer');
    footer.className='site-disclaimer';
    footer.setAttribute('role','note');
    footer.innerHTML='<strong>Development Disclosure</strong><span>This portfolio was vibe-coded with ChatGPT as an AI-assisted development tool. Content direction, review, testing, selection, and publication decisions remain the responsibility of the portfolio owner. AI-assisted methods were used to accelerate design and implementation.</span>';
    document.querySelector('.shell')?.appendChild(footer);
  }

  render();
})();
