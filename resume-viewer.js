/* Harris Portfolio: accessible resume viewer with staged material-transition effects. */
(() => {
  const trigger=document.querySelector('.page[data-card="about-me"] .repo');
  if(!trigger)return;
  const sourceCard=trigger.closest('.page');
  const reduce=window.matchMedia?.('(prefers-reduced-motion:reduce)');
  const mobile=window.matchMedia?.('(max-width:900px)');
  const BUILD=5000,REVEAL=2000,TOTAL=BUILD+REVEAL,CLOSE=1800;
  const PDF='data:application/pdf;base64,JVBERi0xLjQKJUhBUlIKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA1IDAgUiAvRjIgNiAwIFIgPj4gPj4gL0NvbnRlbnRzIDQgMCBSID4+CmVuZG9iago0IDAgb2JqCjw8IC9MZW5ndGggMjAxID4+CnN0cmVhbQpCVAovRjIgMjAgVGYKMTgwIDU5MCBUZAooSEFSUklTIC8gUkVTVU1FKSBUagovRjEgMTIgVGYKLTk1IC03MCBUZAooVEhJUyBSRVNVTUUgSVMgQSBQTEFDRUhPTERFUiBXSElMRSBTSVRFIElTIElOIERFVkVMT1BNRU5ULikgVGoKMCAtMjggVGQKKElGIE5FRURJTkcgUkVTVU1FIFBMRUFTRSBDT05UQUNUIE1FIFRIUk9VR0ggTElOS0VESU4uKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago2IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkID4+CmVuZG9iagp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NCAwMDAwMCBuIAowMDAwMDAwMTIxIDAwMDAwIG4gCjAwMDAwMDAyNTcgMDAwMDAgbiAKMDAwMDAwMDUwOCAwMDAwMCBuIAowMDAwMDAwNTc4IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNyAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNjUzCiUlRU9GCg==';
  let open=false,closing=false,lastFocus=null,timers=[],particleRaf=0;
  const later=(fn,ms)=>{const id=setTimeout(fn,ms);timers.push(id);return id};
  const clearTimers=()=>{timers.forEach(clearTimeout);timers=[]};
  const stopParticles=()=>{if(particleRaf)cancelAnimationFrame(particleRaf);particleRaf=0};
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));

  const css=document.createElement('style');
  css.textContent=`
    body.resume-open{overflow:hidden}
    .resume-source-dissolve{opacity:0!important;transition:opacity 1700ms cubic-bezier(.3,.05,.5,1)!important}
    .resume-overlay{position:fixed;inset:0;z-index:10000;display:none;place-items:center;padding:clamp(12px,2.6vw,32px);background:rgba(2,10,14,.82);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0}
    .resume-overlay.constructing,.resume-overlay.revealing,.resume-overlay.open,.resume-overlay.closing{display:grid}
    .resume-overlay.constructing,.resume-overlay.revealing,.resume-overlay.open{animation:rvBackIn 600ms ease forwards}
    .resume-overlay.closing{animation:rvBackOut ${CLOSE}ms ease forwards}
    .resume-shell{position:relative;width:min(820px,88vw);height:min(92dvh,1050px);display:grid;grid-template-rows:auto 1fr;border:1px solid rgba(99,213,208,.42);border-radius:10px;overflow:hidden;background:linear-gradient(180deg,rgba(5,24,30,.99),rgba(3,15,20,.99));box-shadow:0 32px 100px rgba(0,0,0,.62);opacity:0;transform:scale(.99)}
    .resume-overlay.frame-ready .resume-shell{opacity:1;transform:none;transition:opacity 420ms ease,transform 420ms ease}
    .resume-toolbar,.resume-scroll{opacity:0}
    .resume-overlay.revealing .resume-toolbar,.resume-overlay.revealing .resume-scroll,.resume-overlay.open .resume-toolbar,.resume-overlay.open .resume-scroll{opacity:1;transition:opacity ${REVEAL}ms ease}
    .resume-toolbar{position:relative;z-index:5;display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(99,213,208,.20);background:linear-gradient(90deg,#041218,#082024,#041218)}
    .resume-title{margin-right:auto;font-size:.67rem;letter-spacing:.19em;text-transform:uppercase;color:#9fb7bc;white-space:nowrap}.resume-title b{color:#edf7f8}
    .resume-btn{appearance:none;border:1px solid rgba(174,225,230,.24);border-radius:7px;background:rgba(4,20,26,.86);color:#dbeaec;min-height:38px;padding:0 11px;font:650 .64rem/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.10em;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.resume-btn:hover,.resume-btn:focus-visible{border-color:#d8b86a;color:#fff0b0;outline:none}.resume-close{font-size:.82rem;min-width:40px;padding:0}
    .resume-scroll{overflow:auto;overscroll-behavior:contain;scroll-behavior:smooth;padding:clamp(18px,3vw,36px);background:radial-gradient(circle at 50% 0,rgba(99,213,208,.055),transparent 35%),#07161c;scrollbar-color:rgba(216,184,106,.7) rgba(4,18,24,.7);scrollbar-width:thin;-webkit-overflow-scrolling:touch}
    .resume-sheet{position:relative;width:min(100%,720px);min-height:930px;margin:0 auto;padding:clamp(42px,7vw,78px) clamp(26px,6vw,70px);background:#f5f4ef;color:#263238;border-radius:3px;box-shadow:0 18px 45px rgba(0,0,0,.35);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.resume-sheet:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#0a2d23,#63d5d0 55%,#d8b86a)}.resume-sheet h1{margin:0 0 9px;font-size:clamp(1.9rem,4vw,2.6rem);line-height:1;color:#153138}.resume-kicker{margin:0 0 42px;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:#758287}.resume-placeholder{max-width:520px;margin:26% auto 0;text-align:center;font-size:clamp(1rem,2vw,1.18rem);line-height:1.75;color:#415258}.resume-placeholder strong{display:block;margin-bottom:18px;font-size:.67rem;letter-spacing:.18em;text-transform:uppercase;color:#8a713e}.resume-placeholder a{color:#136f72;font-weight:700;text-decoration:none;border-bottom:1px solid rgba(19,111,114,.3)}
    .resume-fx{position:absolute;inset:0;z-index:10001;pointer-events:none;overflow:hidden;display:none}.resume-fx.active{display:block}
    .rv-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    .rv-line,.rv-edge{position:absolute;opacity:0;pointer-events:none}
    .rv-line{height:2px;left:var(--left);top:var(--top);width:var(--width);background:linear-gradient(90deg,transparent 0%,#0f654d 12%,#63d5d0 42%,#fff0b0 70%,#d8b86a 82%,transparent 100%);filter:drop-shadow(0 0 5px rgba(99,213,208,.5));transform:scaleX(0);transform-origin:left center;animation:rvLoadLine var(--dur) cubic-bezier(.22,.7,.22,1) var(--delay) forwards}
    .rv-edge{background:linear-gradient(90deg,#63d5d0,#0f654d,#d8b86a,#fff0b0);filter:drop-shadow(0 0 5px rgba(99,213,208,.55))}.rv-edge.h{height:2px;left:var(--left);top:var(--top);width:var(--width);transform:scaleX(0);transform-origin:left center;animation:rvEdgeH var(--dur) ease var(--delay) forwards}
    @keyframes rvBackIn{to{opacity:1}}@keyframes rvBackOut{from{opacity:1}to{opacity:0}}
    @keyframes rvLoadLine{0%,8%{opacity:0;transform:scaleX(0)}18%{opacity:.95}70%{opacity:.9;transform:scaleX(1)}100%{opacity:0;transform:scaleX(1)}}
    @keyframes rvEdgeH{0%{opacity:0;transform:scaleX(0)}10%{opacity:1}90%{opacity:.9;transform:scaleX(1)}100%{opacity:.35;transform:scaleX(1)}}
    @media(max-width:900px){.resume-overlay{padding:0;place-items:stretch;background:rgba(2,10,14,.94);backdrop-filter:none;-webkit-backdrop-filter:none}.resume-shell{width:100%;height:100dvh;border:0;border-radius:0}.resume-toolbar{padding:calc(8px + env(safe-area-inset-top)) 10px 8px;gap:6px}.resume-title{font-size:.59rem;letter-spacing:.14em}.resume-btn{min-height:40px;padding:0 9px;font-size:.58rem}.desktop-only{display:none}.resume-scroll{padding:0;scrollbar-width:none;-ms-overflow-style:none;touch-action:pan-y;overscroll-behavior-y:contain}.resume-scroll::-webkit-scrollbar{display:none}.resume-sheet{width:100%;min-height:calc(100dvh - 58px);border-radius:0;box-shadow:none;padding:38px 22px 70px}.resume-placeholder{margin-top:30vh}}
    @media(prefers-reduced-motion:reduce){.resume-fx{display:none!important}.resume-shell,.resume-toolbar,.resume-scroll{opacity:1!important;transform:none!important;transition:none!important}.resume-source-dissolve{opacity:1!important}}
    @media print{body *{visibility:hidden!important}.resume-overlay,.resume-overlay *{visibility:visible!important}.resume-overlay{position:static!important;display:block!important;padding:0!important;background:#fff!important;opacity:1!important}.resume-toolbar,.resume-fx{display:none!important}.resume-shell{display:block!important;width:auto!important;height:auto!important;border:0!important;box-shadow:none!important;opacity:1!important;transform:none!important}.resume-scroll{overflow:visible!important;padding:0!important;background:#fff!important;opacity:1!important}.resume-sheet{width:8.5in!important;min-height:11in!important;margin:0!important;padding:.75in!important;box-shadow:none!important}}
  `;
  document.head.appendChild(css);

  const overlay=document.createElement('div');
  overlay.className='resume-overlay';overlay.id='resume-viewer';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','resume-title');overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML=`<div class="resume-fx" aria-hidden="true"><canvas class="rv-canvas"></canvas></div><section class="resume-shell"><header class="resume-toolbar"><div class="resume-title" id="resume-title"><b>Harris</b> // Resume</div><button class="resume-btn desktop-only" data-up>↑ Up</button><button class="resume-btn desktop-only" data-down>↓ Down</button><button class="resume-btn" data-print>Print</button><a class="resume-btn" href="${PDF}" download="Harris_Resume_Placeholder.pdf">PDF</a><button class="resume-btn resume-close" data-close aria-label="Close resume">×</button></header><div class="resume-scroll" tabindex="0"><article class="resume-sheet"><h1>Harris / Resume</h1><p class="resume-kicker">Development Placeholder</p><div class="resume-placeholder"><strong>Resume in development</strong><p>This resume is a placeholder while the site is in development.</p><p>If you need a current resume, please contact me through <a href="https://www.linkedin.com/in/anh-tran-technical-operations/" target="_blank" rel="noreferrer">LinkedIn</a>.</p></div></article></div></section>`;
  document.body.appendChild(overlay);
  const fx=overlay.querySelector('.resume-fx'),canvas=overlay.querySelector('.rv-canvas'),shell=overlay.querySelector('.resume-shell'),scroller=overlay.querySelector('.resume-scroll'),close=overlay.querySelector('[data-close]');

  function startPrinter(sourceRect,targetRect){
    stopParticles();
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return;
    const isMobile=mobile?.matches,dpr=Math.min(window.devicePixelRatio||1,isMobile?1:1.25),vw=innerWidth,vh=innerHeight;
    canvas.width=Math.round(vw*dpr);canvas.height=Math.round(vh*dpr);canvas.style.width=`${vw}px`;canvas.style.height=`${vh}px`;ctx.setTransform(dpr,0,0,dpr,0,0);
    const palette=['#63d5d0','#1c8a66','#d8b86a','#8fe6d9','#fff0b0'];
    const columns=isMobile?58:96,columnWidth=targetRect.width/columns;
    const particles=Array.from({length:5000},(_,i)=>{
      const col=i%columns,x=targetRect.left+(col+.5)*columnWidth+(Math.random()-.5)*columnWidth*.52;
      return {x,phase:Math.random()*(targetRect.height+vh*.9),speed:.16+Math.random()*.42,size:.55+Math.random()*1.55,len:3+Math.random()*15,color:palette[i%palette.length],alpha:.18+Math.random()*.62,twinkle:Math.random()*Math.PI*2};
    });
    const start=performance.now();
    function tick(now){
      const elapsed=now-start,p=clamp(elapsed/BUILD,0,1),rise=1-Math.pow(1-p,2.05),buildY=targetRect.bottom-targetRect.height*rise;
      ctx.clearRect(0,0,vw,vh);
      ctx.save();ctx.globalCompositeOperation='lighter';
      const travel=targetRect.height+vh*.9;
      for(const q of particles){
        let y=targetRect.top-vh*.72+((q.phase+elapsed*q.speed)%travel);
        if(y>buildY){
          const impact=clamp(1-(y-buildY)/26,0,1);
          if(impact<=0)continue;
          y=buildY-(Math.random()*1.7);
          ctx.globalAlpha=q.alpha*(.45+.55*impact);
          ctx.fillStyle=q.color;
          ctx.fillRect(q.x,y,q.size,Math.max(1,q.size*.8));
          continue;
        }
        const headGlow=.78+.22*Math.sin(elapsed*.008+q.twinkle);
        ctx.globalAlpha=q.alpha*headGlow;ctx.fillStyle=q.color;
        ctx.fillRect(q.x,y,q.size,q.len);
      }
      ctx.restore();

      const builtHeight=targetRect.bottom-buildY;
      if(builtHeight>0){
        const fill=ctx.createLinearGradient(0,buildY,0,targetRect.bottom);
        fill.addColorStop(0,'rgba(99,213,208,.08)');fill.addColorStop(.45,'rgba(15,101,77,.06)');fill.addColorStop(1,'rgba(216,184,106,.045)');
        ctx.fillStyle=fill;ctx.fillRect(targetRect.left,buildY,targetRect.width,builtHeight);
      }

      const grad=ctx.createLinearGradient(targetRect.left,0,targetRect.right,0);grad.addColorStop(0,'rgba(15,101,77,0)');grad.addColorStop(.18,'rgba(99,213,208,.9)');grad.addColorStop(.58,'rgba(255,240,176,1)');grad.addColorStop(.84,'rgba(216,184,106,.72)');grad.addColorStop(1,'rgba(216,184,106,0)');ctx.fillStyle=grad;ctx.fillRect(targetRect.left,buildY,targetRect.width,2);

      ctx.strokeStyle='rgba(99,213,208,.58)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(targetRect.left,buildY);ctx.lineTo(targetRect.left,targetRect.bottom);ctx.lineTo(targetRect.right,targetRect.bottom);ctx.lineTo(targetRect.right,buildY);ctx.stroke();
      if(p>.88){ctx.globalAlpha=clamp((p-.88)/.12,0,1)*.55;ctx.strokeStyle='rgba(216,184,106,.72)';ctx.strokeRect(targetRect.left+.5,targetRect.top+.5,targetRect.width-1,targetRect.height-1);ctx.globalAlpha=1}

      if(elapsed<BUILD){particleRaf=requestAnimationFrame(tick)}else{particleRaf=0}
    }
    particleRaf=requestAnimationFrame(tick);
  }

  function buildEffects(sourceRect,targetRect){
    fx.querySelectorAll('.rv-line,.rv-edge').forEach(el=>el.remove());if(reduce?.matches)return;
    startPrinter(sourceRect,targetRect);
    const loadRows=2;
    for(let i=0;i<loadRows;i++){
      const el=document.createElement('i');el.className='rv-line';
      const top=targetRect.bottom-targetRect.height*((i+1)/(loadRows+1));
      el.style.cssText=`--left:${targetRect.left+targetRect.width*.08}px;--top:${top}px;--width:${targetRect.width*.84}px;--dur:${1500+Math.random()*350}ms;--delay:${1650+i*1450}ms`;
      fx.appendChild(el);
    }
    const l=targetRect.left,t=targetRect.top,w=targetRect.width,b=targetRect.bottom;
    [['h',`--left:${l}px;--top:${b-2}px;--width:${w}px;--dur:2100ms;--delay:650ms`],['h',`--left:${l}px;--top:${t}px;--width:${w}px;--dur:1500ms;--delay:3450ms`]].forEach(([d,style])=>{const el=document.createElement('i');el.className=`rv-edge ${d}`;el.style.cssText=style;fx.appendChild(el)});
    fx.classList.add('active');
  }

  function finishOpen(){
    stopParticles();overlay.classList.remove('constructing','revealing');overlay.classList.add('open','frame-ready');fx.classList.remove('active');sourceCard?.classList.remove('resume-source-dissolve');close.focus({preventScroll:true});
  }
  function openResume(e){
    e?.preventDefault();if(open||closing)return;open=true;lastFocus=document.activeElement;clearTimers();stopParticles();scroller.scrollTop=0;
    document.body.classList.add('resume-open');overlay.setAttribute('aria-hidden','false');overlay.classList.remove('open','closing','revealing','frame-ready');overlay.classList.add('constructing');
    if(reduce?.matches){overlay.classList.add('frame-ready','revealing');later(finishOpen,1);return}
    sourceCard?.classList.add('resume-source-dissolve');
    requestAnimationFrame(()=>{const sourceRect=sourceCard?.getBoundingClientRect()||trigger.getBoundingClientRect(),targetRect=shell.getBoundingClientRect();buildEffects(sourceRect,targetRect)});
    later(()=>{overlay.classList.add('frame-ready');overlay.classList.remove('constructing');overlay.classList.add('revealing')},BUILD);
    later(finishOpen,TOTAL);
  }
  function closeResume(){
    if(!open||closing)return;closing=true;clearTimers();stopParticles();overlay.classList.remove('open','revealing');overlay.classList.add('closing','frame-ready');
    later(()=>{overlay.classList.remove('closing','frame-ready');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('resume-open');fx.classList.remove('active');sourceCard?.classList.remove('resume-source-dissolve');open=false;closing=false;lastFocus?.focus?.({preventScroll:true})},reduce?.matches?1:CLOSE);
  }

  trigger.textContent='View Resume →';trigger.href='#resume';trigger.removeAttribute('target');trigger.removeAttribute('rel');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','resume-viewer');trigger.addEventListener('click',openResume);
  overlay.querySelector('[data-up]').onclick=()=>scroller.scrollBy({top:-Math.max(280,scroller.clientHeight*.72),behavior:'smooth'});
  overlay.querySelector('[data-down]').onclick=()=>scroller.scrollBy({top:Math.max(280,scroller.clientHeight*.72),behavior:'smooth'});
  overlay.querySelector('[data-print]').onclick=()=>window.print();close.onclick=closeResume;overlay.addEventListener('click',e=>{if(e.target===overlay&&overlay.classList.contains('open'))closeResume()});
  document.addEventListener('keydown',e=>{if(!open)return;if(e.key==='Escape'&&overlay.classList.contains('open')){e.preventDefault();closeResume();return}if(e.key==='Tab'&&overlay.classList.contains('open')){const items=[...overlay.querySelectorAll('button,a,[tabindex="0"]')].filter(x=>x.offsetParent!==null),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
})();