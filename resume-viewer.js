/* Harris Portfolio: accessible resume viewer with staged progressive-enhancement transitions. */
(() => {
  const trigger=document.querySelector('.page[data-card="about-me"] .repo');
  if(!trigger)return;
  const reduce=window.matchMedia?.('(prefers-reduced-motion:reduce)');
  const mobile=window.matchMedia?.('(max-width:900px)');
  const OPEN=5000,CLOSE=5000;
  const FRAME_AT=3600,CONTENT_AT=4300;
  const PDF='data:application/pdf;base64,JVBERi0xLjQKJUhBUlIKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA2MTIgNzkyXSAvUmVzb3VyY2VzIDw8IC9Gb250IDw8IC9GMSA1IDAgUiAvRjIgNiAwIFIgPj4gPj4gL0NvbnRlbnRzIDQgMCBSID4+CmVuZG9iago0IDAgb2JqCjw8IC9MZW5ndGggMjAxID4+CnN0cmVhbQpCVAovRjIgMjAgVGYKMTgwIDU5MCBUZAooSEFSUklTIC8gUkVTVU1FKSBUagovRjEgMTIgVGYKLTk1IC03MCBUZAooVEhJUyBSRVNVTUUgSVMgQSBQTEFDRUhPTERFUiBXSElMRSBTSVRFIElTIElOIERFVkVMT1BNRU5ULikgVGoKMCAtMjggVGQKKElGIE5FRURJTkcgUkVTVU1FIFBMRUFTRSBDT05UQUNUIE1FIFRIUk9VR0ggTElOS0VESU4uKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjUgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhID4+CmVuZG9iago2IDAgb2JqCjw8IC9UeXBlIC9Gb250IC9TdWJ0eXBlIC9UeXBlMSAvQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkID4+CmVuZG9iagp4cmVmCjAgNwowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwMTUgMDAwMDAgbiAKMDAwMDAwMDA2NCAwMDAwMCBuIAowMDAwMDAwMTIxIDAwMDAwIG4gCjAwMDAwMDAyNTcgMDAwMDAgbiAKMDAwMDAwMDUwOCAwMDAwMCBuIAowMDAwMDAwNTc4IDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgNyAvUm9vdCAxIDAgUiA+PgpzdGFydHhyZWYKNjUzCiUlRU9GCg==';
  let open=false,closing=false,lastFocus=null,phaseTimers=[];

  const css=document.createElement('style');
  css.textContent=`
  body.resume-open{overflow:hidden}
  .resume-overlay{position:fixed;inset:0;z-index:10000;display:none;place-items:center;padding:clamp(12px,2.6vw,32px);background:rgba(2,10,14,.80);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0}
  .resume-overlay.constructing,.resume-overlay.open,.resume-overlay.closing{display:grid}
  .resume-overlay.constructing,.resume-overlay.open{animation:rBackIn 700ms ease forwards}
  .resume-overlay.closing{animation:rBackOut ${CLOSE}ms ease forwards}
  .resume-shell{position:relative;width:min(820px,88vw);height:min(92dvh,1050px);display:grid;grid-template-rows:auto 1fr;border:1px solid rgba(99,213,208,.35);border-radius:10px;overflow:hidden;background:linear-gradient(180deg,rgba(5,24,30,.99),rgba(3,15,20,.99));box-shadow:0 32px 100px rgba(0,0,0,.62);opacity:0;transform:scale(.985)}
  .resume-overlay.frame-ready .resume-shell{opacity:1;transform:none;transition:opacity 520ms ease,transform 520ms cubic-bezier(.2,.72,.18,1)}
  .resume-toolbar,.resume-scroll{opacity:0}
  .resume-overlay.content-ready .resume-toolbar,.resume-overlay.content-ready .resume-scroll{opacity:1;transition:opacity 700ms ease}
  .resume-overlay.closing .resume-shell{opacity:1;animation:rShellOut ${CLOSE}ms ease forwards}
  .resume-toolbar{position:relative;z-index:5;display:flex;align-items:center;gap:8px;padding:10px 12px;border-bottom:1px solid rgba(99,213,208,.20);background:linear-gradient(90deg,#041218,#082024,#041218)}
  .resume-title{margin-right:auto;font-size:.67rem;letter-spacing:.19em;text-transform:uppercase;color:#9fb7bc;white-space:nowrap}.resume-title b{color:#edf7f8}
  .resume-btn{appearance:none;border:1px solid rgba(174,225,230,.24);border-radius:7px;background:rgba(4,20,26,.86);color:#dbeaec;min-height:38px;padding:0 11px;font:650 .64rem/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.10em;text-transform:uppercase;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}.resume-btn:hover,.resume-btn:focus-visible{border-color:#d8b86a;color:#fff0b0;outline:none}.resume-close{font-size:.82rem;min-width:40px;padding:0}
  .resume-scroll{overflow:auto;overscroll-behavior:contain;scroll-behavior:smooth;padding:clamp(18px,3vw,36px);background:radial-gradient(circle at 50% 0,rgba(99,213,208,.055),transparent 35%),#07161c;scrollbar-color:rgba(216,184,106,.7) rgba(4,18,24,.7);scrollbar-width:thin;-webkit-overflow-scrolling:touch}
  .resume-sheet{position:relative;width:min(100%,720px);min-height:930px;margin:0 auto;padding:clamp(42px,7vw,78px) clamp(26px,6vw,70px);background:#f5f4ef;color:#263238;border-radius:3px;box-shadow:0 18px 45px rgba(0,0,0,.35);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}.resume-sheet:before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:linear-gradient(90deg,#0a2d23,#63d5d0 55%,#d8b86a)}.resume-sheet h1{margin:0 0 9px;font-size:clamp(1.9rem,4vw,2.6rem);line-height:1;color:#153138}.resume-kicker{margin:0 0 42px;font-size:.68rem;letter-spacing:.18em;text-transform:uppercase;color:#758287}.resume-placeholder{max-width:520px;margin:26% auto 0;text-align:center;font-size:clamp(1rem,2vw,1.18rem);line-height:1.75;color:#415258}.resume-placeholder strong{display:block;margin-bottom:18px;font-size:.67rem;letter-spacing:.18em;text-transform:uppercase;color:#8a713e}.resume-placeholder a{color:#136f72;font-weight:700;text-decoration:none;border-bottom:1px solid rgba(19,111,114,.3)}
  .resume-fx{position:absolute;inset:0;z-index:10001;pointer-events:none;overflow:hidden;display:none}.resume-fx.active{display:block}
  .rp{position:absolute;width:2px;height:var(--h);left:var(--x);top:var(--y);border-radius:2px;background:linear-gradient(180deg,transparent,var(--c),transparent);opacity:0;animation:rParticle var(--d) cubic-bezier(.2,.55,.24,1) var(--delay) forwards}
  .rs{position:absolute;opacity:0;transform-origin:0 50%;filter:drop-shadow(0 0 5px rgba(99,213,208,.55)) drop-shadow(0 0 3px rgba(216,184,106,.30))}
  .rs.h{height:2px;left:var(--left);top:var(--top);width:var(--width);background:linear-gradient(90deg,transparent,#63d5d0 16%,#0f654d 46%,#d8b86a 78%,#fff0b0 92%,transparent);transform:scaleX(0);animation:rTraceH 2700ms cubic-bezier(.2,.7,.2,1) var(--delay) forwards}
  .rs.v{width:2px;left:var(--left);top:var(--top);height:var(--height);background:linear-gradient(180deg,transparent,#63d5d0 16%,#0f654d 46%,#d8b86a 78%,#fff0b0 92%,transparent);transform-origin:50% 0;transform:scaleY(0);animation:rTraceV 2700ms cubic-bezier(.2,.7,.2,1) var(--delay) forwards}
  .rc{position:absolute;width:10px;height:10px;border-color:#d8b86a;opacity:0;animation:rCorner 900ms ease var(--delay) forwards}.rc.tl{border-left:2px solid;border-top:2px solid}.rc.tr{border-right:2px solid;border-top:2px solid}.rc.bl{border-left:2px solid;border-bottom:2px solid}.rc.br{border-right:2px solid;border-bottom:2px solid}
  @keyframes rBackIn{to{opacity:1}}@keyframes rBackOut{from{opacity:1}to{opacity:0}}@keyframes rShellOut{0%,38%{opacity:1;transform:none}100%{opacity:0;transform:scale(.965) translateY(8px)}}
  @keyframes rParticle{0%{opacity:0;transform:translateY(-8px) scaleY(.4)}12%{opacity:.9}74%{opacity:.72}100%{opacity:0;transform:translateY(var(--fall)) scaleY(1.25)}}
  @keyframes rTraceH{0%{opacity:0;transform:scaleX(0)}8%{opacity:1}82%{opacity:.95;transform:scaleX(1)}100%{opacity:.32;transform:scaleX(1)}}
  @keyframes rTraceV{0%{opacity:0;transform:scaleY(0)}8%{opacity:1}82%{opacity:.95;transform:scaleY(1)}100%{opacity:.32;transform:scaleY(1)}}
  @keyframes rCorner{0%{opacity:0;transform:scale(.5)}55%{opacity:1;transform:scale(1.15)}100%{opacity:.65;transform:scale(1)}}
  @media(max-width:900px){.resume-overlay{padding:0;place-items:stretch;background:rgba(2,10,14,.94);backdrop-filter:none;-webkit-backdrop-filter:none}.resume-shell{width:100%;height:100dvh;border:0;border-radius:0}.resume-toolbar{padding:calc(8px + env(safe-area-inset-top)) 10px 8px;gap:6px}.resume-title{font-size:.59rem;letter-spacing:.14em}.resume-btn{min-height:40px;padding:0 9px;font-size:.58rem}.desktop-only{display:none}.resume-scroll{padding:0;scrollbar-width:none;-ms-overflow-style:none;touch-action:pan-y;overscroll-behavior-y:contain}.resume-scroll::-webkit-scrollbar{display:none}.resume-sheet{width:100%;min-height:calc(100dvh - 58px);border-radius:0;box-shadow:none;padding:38px 22px 70px}.resume-placeholder{margin-top:30vh}}
  @media(prefers-reduced-motion:reduce){.resume-fx{display:none!important}.resume-overlay.constructing .resume-shell,.resume-overlay.frame-ready .resume-shell,.resume-overlay.content-ready .resume-shell,.resume-overlay.constructing .resume-toolbar,.resume-overlay.constructing .resume-scroll,.resume-overlay.content-ready .resume-toolbar,.resume-overlay.content-ready .resume-scroll{opacity:1!important;transform:none!important;transition:none!important}.resume-overlay.constructing{animation-duration:1ms!important}}
  @media print{body *{visibility:hidden!important}.resume-overlay,.resume-overlay *{visibility:visible!important}.resume-overlay{position:static!important;display:block!important;padding:0!important;background:#fff!important;opacity:1!important}.resume-toolbar,.resume-fx{display:none!important}.resume-shell{display:block!important;width:auto!important;height:auto!important;border:0!important;box-shadow:none!important;opacity:1!important;transform:none!important}.resume-scroll{overflow:visible!important;padding:0!important;background:#fff!important;opacity:1!important}.resume-sheet{width:8.5in!important;min-height:11in!important;margin:0!important;padding:.75in!important;box-shadow:none!important}}
  `;
  document.head.appendChild(css);

  const overlay=document.createElement('div');overlay.className='resume-overlay';overlay.id='resume-viewer';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','resume-title');overlay.setAttribute('aria-hidden','true');overlay.innerHTML=`<div class="resume-fx" aria-hidden="true"></div><section class="resume-shell"><header class="resume-toolbar"><div class="resume-title" id="resume-title"><b>Harris</b> // Resume</div><button class="resume-btn desktop-only" data-up>↑ Up</button><button class="resume-btn desktop-only" data-down>↓ Down</button><button class="resume-btn" data-print>Print</button><a class="resume-btn" href="${PDF}" download="Harris_Resume_Placeholder.pdf">PDF</a><button class="resume-btn resume-close" data-close aria-label="Close resume">×</button></header><div class="resume-scroll" tabindex="0"><article class="resume-sheet"><h1>Harris / Resume</h1><p class="resume-kicker">Development Placeholder</p><div class="resume-placeholder"><strong>Resume in development</strong><p>This resume is a placeholder while the site is in development.</p><p>If you need a current resume, please contact me through <a href="https://www.linkedin.com/in/anh-tran-technical-operations/" target="_blank" rel="noreferrer">LinkedIn</a>.</p></div></article></div></section>`;document.body.appendChild(overlay);
  const fx=overlay.querySelector('.resume-fx'),shell=overlay.querySelector('.resume-shell'),scroller=overlay.querySelector('.resume-scroll'),close=overlay.querySelector('[data-close]');
  const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
  const clearTimers=()=>{phaseTimers.forEach(clearTimeout);phaseTimers=[]};

  function effects(sourceRect,targetRect){
    fx.replaceChildren();if(reduce?.matches)return;
    const n=mobile?.matches?28:48,colors=['#63d5d0','#1c8a66','#d8b86a','#8fe6d9','#b89745'];
    const vw=innerWidth,vh=innerHeight,sx=sourceRect.left,sy=sourceRect.top,sw=sourceRect.width,sh=sourceRect.height;
    for(let i=0;i<n;i++){
      const p=document.createElement('i');p.className='rp';
      p.style.cssText=`--x:${clamp(sx+Math.random()*sw,4,vw-4)}px;--y:${clamp(sy+Math.random()*sh,0,vh*.82)}px;--h:${10+Math.random()*34}px;--fall:${220+Math.random()*500}px;--c:${colors[i%colors.length]};--d:${2800+Math.random()*1100}ms;--delay:${Math.random()*850}ms`;
      fx.appendChild(p);
    }
    const l=targetRect.left,t=targetRect.top,w=targetRect.width,h=targetRect.height,r=l+w,b=t+h;
    const traces=[
      ['h',`--left:${l}px;--top:${t}px;--width:${w}px;--delay:650ms`],
      ['v',`--left:${r-2}px;--top:${t}px;--height:${h}px;--delay:1050ms`],
      ['h',`--left:${l}px;--top:${b-2}px;--width:${w}px;--delay:1450ms`],
      ['v',`--left:${l}px;--top:${t}px;--height:${h}px;--delay:1850ms`]
    ];
    traces.forEach(([d,style])=>{const s=document.createElement('i');s.className=`rs ${d}`;s.style.cssText=style;fx.appendChild(s)});
    [['tl',l,t],['tr',r-10,t],['bl',l,b-10],['br',r-10,b-10]].forEach(([c,x,y],i)=>{const corner=document.createElement('i');corner.className=`rc ${c}`;corner.style.cssText=`left:${x}px;top:${y}px;--delay:${2900+i*110}ms`;fx.appendChild(corner)});
    fx.classList.add('active');
  }

  function finishOpen(){
    overlay.classList.remove('constructing','frame-ready');overlay.classList.add('open','frame-ready','content-ready');
    fx.classList.remove('active');close.focus({preventScroll:true});
  }

  function openResume(e){
    e?.preventDefault();if(open||closing)return;
    open=true;lastFocus=document.activeElement;clearTimers();scroller.scrollTop=0;
    document.body.classList.add('resume-open');overlay.setAttribute('aria-hidden','false');
    overlay.classList.remove('open','closing','frame-ready','content-ready');overlay.classList.add('constructing');
    if(reduce?.matches){overlay.classList.add('frame-ready','content-ready');phaseTimers.push(setTimeout(finishOpen,1));return}
    requestAnimationFrame(()=>{
      const sourceRect=trigger.closest('.page')?.getBoundingClientRect()||trigger.getBoundingClientRect();
      const targetRect=shell.getBoundingClientRect();
      effects(sourceRect,targetRect);
      phaseTimers.push(setTimeout(()=>overlay.classList.add('frame-ready'),FRAME_AT));
      phaseTimers.push(setTimeout(()=>overlay.classList.add('content-ready'),CONTENT_AT));
      phaseTimers.push(setTimeout(finishOpen,OPEN));
    });
  }

  function closeResume(){
    if(!open||closing)return;closing=true;clearTimers();
    overlay.classList.remove('open','constructing','content-ready');overlay.classList.add('closing','frame-ready');
    if(!reduce?.matches)requestAnimationFrame(()=>effects(shell.getBoundingClientRect(),trigger.closest('.page')?.getBoundingClientRect()||trigger.getBoundingClientRect()));
    phaseTimers.push(setTimeout(()=>{
      overlay.classList.remove('closing','frame-ready','content-ready');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('resume-open');fx.classList.remove('active');open=false;closing=false;lastFocus?.focus?.({preventScroll:true});
    },reduce?.matches?1:CLOSE));
  }

  trigger.textContent='View Resume →';trigger.href='#resume';trigger.removeAttribute('target');trigger.removeAttribute('rel');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','resume-viewer');trigger.addEventListener('click',openResume);
  overlay.querySelector('[data-up]').onclick=()=>scroller.scrollBy({top:-Math.max(280,scroller.clientHeight*.72),behavior:'smooth'});
  overlay.querySelector('[data-down]').onclick=()=>scroller.scrollBy({top:Math.max(280,scroller.clientHeight*.72),behavior:'smooth'});
  overlay.querySelector('[data-print]').onclick=()=>window.print();close.onclick=closeResume;overlay.addEventListener('click',e=>{if(e.target===overlay&&overlay.classList.contains('open'))closeResume()});
  document.addEventListener('keydown',e=>{if(!open)return;if(e.key==='Escape'){e.preventDefault();closeResume();return}if(e.key==='Tab'&&overlay.classList.contains('content-ready')){const items=[...overlay.querySelectorAll('button,a,[tabindex="0"]')].filter(x=>x.offsetParent!==null),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
})();