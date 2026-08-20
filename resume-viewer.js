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
    .resume-fx{position:absolute;inset:0;z-index:10001;pointer-events:none;overflow:hidden;display:none;opacity:1;transition:opacity ${REVEAL}ms ease}
    .resume-fx.active{display:block}.resume-overlay.constructing .resume-fx{opacity:1}.resume-overlay.revealing .resume-fx{opacity:0}
    .rv-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
    @keyframes rvBackIn{to{opacity:1}}@keyframes rvBackOut{from{opacity:1}to{opacity:0}}
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
    const isMobile=mobile?.matches,dpr=Math.min(window.devicePixelRatio||1,isMobile?1:1.2),vw=innerWidth,vh=innerHeight;
    canvas.width=Math.round(vw*dpr);canvas.height=Math.round(vh*dpr);canvas.style.width=`${vw}px`;canvas.style.height=`${vh}px`;ctx.setTransform(dpr,0,0,dpr,0,0);

    const rainPalette=['#0b4f38','#0f654d','#1c8a66','#63d5d0','#8fe6d9','#d8b86a','#fff0b0'];
    const blockPalette=['#0f654d','#1c8a66','#2aa77a','#63d5d0','#8fe6d9','#b89745','#d8b86a','#fff0b0'];
    const rainCount=500;
    const oldCols=isMobile?34:48,oldRows=isMobile?54:66;
    const blockW=Math.max(1.15,(targetRect.width/oldCols)*.10),blockH=Math.max(1.15,(targetRect.height/oldRows)*.10);
    const cols=Math.max(12,Math.floor(targetRect.width/blockW)),rows=Math.max(12,Math.floor(targetRect.height/blockH));
    const activeDepth=Math.min(10,rows),fadeDepth=Math.min(20,Math.max(0,rows-activeDepth));
    const visualRowH=clamp(targetRect.height*(isMobile?.0034:.0038),2.4,4.2);
    const active=Array.from({length:activeDepth},()=>new Uint8Array(cols));
    const activeColors=Array.from({length:activeDepth},()=>new Uint8Array(cols));
    const flash=new Float32Array(activeDepth);
    const history=[];
    let completedRows=0,firstBottomHit=false,bottomHitAt=0,last=performance.now(),depositBudget=0;

    const canFlash=row=>(row<=0||flash[row-1]<=.02)&&(row>=activeDepth-1||flash[row+1]<=.02);
    const startFlash=(row,strength=.7)=>{if(row>=0&&row<activeDepth&&canFlash(row))flash[row]=Math.max(flash[row],strength)};
    const drops=Array.from({length:rainCount},()=>({x:targetRect.left+Math.random()*targetRect.width,y:targetRect.top-vh*(.08+Math.random()*1.15),speed:150+Math.random()*420,width:.55+Math.random()*1.25,tail:18+Math.random()*72,gap:4+Math.random()*7,color:rainPalette[Math.floor(Math.random()*rainPalette.length)],head:Math.random()>.82?'#fff0b0':'#8fe6d9',stopBand:1+Math.floor(Math.random()*activeDepth),retired:false}));
    const start=performance.now();
    const resetDrop=d=>{d.x=targetRect.left+Math.random()*targetRect.width;d.y=targetRect.top-vh*(.05+Math.random()*.55);d.speed=150+Math.random()*420;d.tail=18+Math.random()*72;d.gap=4+Math.random()*7;d.color=rainPalette[Math.floor(Math.random()*rainPalette.length)];d.head=Math.random()>.82?'#fff0b0':'#8fe6d9';d.stopBand=1+Math.floor(Math.random()*activeDepth);d.retired=false};
    const fillCell=(row,col)=>{if(row<0||row>=activeDepth||col<0||col>=cols||active[row][col])return false;active[row][col]=1;activeColors[row][col]=1+Math.floor(Math.random()*blockPalette.length);let full=true;for(let c=0;c<cols;c++){if(!active[row][c]){full=false;break}}if(full)startFlash(row,1);return true};
    const normalizeFlashes=()=>{for(let r=1;r<activeDepth;r++){if(flash[r]>.02&&flash[r-1]>.02){if(flash[r]>flash[r-1])flash[r-1]=0;else flash[r]=0}}};
    const promoteBottom=()=>{
      if(fadeDepth>0){history.unshift({cells:new Uint8Array(active[0]),colors:new Uint8Array(activeColors[0])});if(history.length>fadeDepth)history.pop()}
      completedRows=Math.min(rows,completedRows+1);
      for(let r=0;r<activeDepth-1;r++){active[r].set(active[r+1]);activeColors[r].set(activeColors[r+1]);flash[r]=flash[r+1]}
      active[activeDepth-1].fill(0);activeColors[activeDepth-1].fill(0);flash[activeDepth-1]=0;normalizeFlashes();
    };
    const forceBottomComplete=()=>{for(let c=0;c<cols;c++)if(!active[0][c]){active[0][c]=1;activeColors[0][c]=1+Math.floor(Math.random()*blockPalette.length)}startFlash(0,1)};

    function tick(now){
      const elapsed=now-start,dt=Math.min(.034,Math.max(.008,(now-last)/1000));last=now;
      const p=clamp(elapsed/BUILD,0,1);
      const wallProgress=firstBottomHit?clamp((elapsed-bottomHitAt)/Math.max(1,BUILD-bottomHitAt),0,1):0;
      const rainScale=wallProgress<=.75?1:1-.5*clamp((wallProgress-.75)/.20,0,1);
      const activeRain=Math.max(250,Math.round(rainCount*rainScale));
      const stopRespawn=wallProgress>=.90;
      ctx.clearRect(0,0,vw,vh);

      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<activeRain;i++){
        const d=drops[i];if(d.retired)continue;d.y+=d.speed*dt;
        if(!firstBottomHit&&d.y>=vh-1){firstBottomHit=true;bottomHitAt=elapsed;resetDrop(d);continue}
        if(firstBottomHit&&completedRows>0){
          const collisionRows=Math.min(rows,completedRows+d.stopBand),collisionY=targetRect.bottom-collisionRows*blockH;
          if(d.y>=collisionY){const col=clamp(Math.floor((d.x-targetRect.left)/blockW),0,cols-1);fillCell(Math.min(activeDepth-1,d.stopBand-1),col);if(stopRespawn)d.retired=true;else resetDrop(d);continue}
        }
        if(d.y>=vh-1){if(!firstBottomHit){firstBottomHit=true;bottomHitAt=elapsed}if(stopRespawn)d.retired=true;else resetDrop(d);continue}
        const segments=Math.max(3,Math.floor(d.tail/d.gap));
        for(let j=0;j<segments;j++){const y=d.y-j*d.gap;if(y<-20||y>vh)continue;const fade=1-j/segments;if(fade<=.02)continue;ctx.globalAlpha=j===0?.98:(.06+.62*fade*fade);ctx.fillStyle=j===0?d.head:d.color;ctx.fillRect(d.x,y,d.width,Math.max(2,d.gap*.62))}
      }
      ctx.restore();

      if(firstBottomHit){
        const desiredRows=Math.min(rows,Math.floor(wallProgress*rows));
        depositBudget+=dt*(cols*(5+wallProgress*22));
        while(depositBudget>=1){const row=Math.min(activeDepth-1,Math.floor(Math.pow(Math.random(),1.7)*activeDepth));fillCell(row,Math.floor(Math.random()*cols));depositBudget-=1}
        let promotions=0,maxPromotions=wallProgress<.5?1:wallProgress<.75?2:wallProgress<.94?4:12;
        while(completedRows<desiredRows&&promotions<maxPromotions){forceBottomComplete();promoteBottom();promotions++}
        if(wallProgress>.985&&completedRows<rows){completedRows=rows;for(let r=0;r<activeDepth;r++){active[r].fill(0);activeColors[r].fill(0);flash[r]=0}}

        const historyRows=Math.min(fadeDepth,history.length);
        const totalVisualRows=activeDepth+fadeDepth;
        const bandStart=targetRect.bottom-visualRowH;
        const bandEnd=targetRect.top-(totalVisualRows-1)*visualRowH;
        const bandTop=bandStart+(bandEnd-bandStart)*wallProgress;
        const rowY=index=>bandTop+index*visualRowH;
        const solidTop=Math.min(targetRect.bottom,rowY(activeDepth+historyRows));
        const solidHeight=Math.max(0,targetRect.bottom-solidTop);

        /* Rows 1-10: active particle-reactive Tetris rows using one shared visual geometry. */
        for(let r=0;r<activeDepth;r++){
          const y=rowY(r);
          if(y<targetRect.top||y>=targetRect.bottom)continue;
          for(let c=0;c<cols;c++){
            if(!active[r][c])continue;
            const ci=activeColors[r][c]-1;
            ctx.globalAlpha=.42+.30*Math.random();ctx.fillStyle=blockPalette[Math.max(0,ci)];
            ctx.fillRect(targetRect.left+c*blockW+.12,y+.18,Math.max(.8,blockW-.24),Math.max(1,visualRowH-.36));
          }
          if(flash[r]>0){
            flash[r]=Math.max(0,flash[r]-dt*(.55+Math.random()*.75));
            const g=ctx.createLinearGradient(targetRect.left,0,targetRect.right,0);
            g.addColorStop(0,'rgba(255,255,245,0)');
            g.addColorStop(.18,`rgba(255,240,176,${Math.min(1,flash[r]*.9)})`);
            g.addColorStop(.50,`rgba(255,255,248,${Math.min(1,flash[r]*1.18)})`);
            g.addColorStop(.72,`rgba(216,184,106,${Math.min(1,flash[r])})`);
            g.addColorStop(1,'rgba(216,184,106,0)');
            ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(targetRect.left,y,targetRect.width,visualRowH);
          }
        }
        normalizeFlashes();
        if(Math.random()<.18){const candidates=[];for(let r=0;r<activeDepth;r++)if(flash[r]<=.02&&canFlash(r))candidates.push(r);if(candidates.length){const r=candidates[Math.floor(Math.random()*candidates.length)];startFlash(r,.68+.32*Math.random())}}

        /* Rows 11-30: completed history stays structurally intact underneath the fade overlay. */
        for(let i=0;i<historyRows;i++){
          const row=history[i],y=rowY(activeDepth+i);
          if(y>=targetRect.bottom)break;
          ctx.save();
          ctx.globalAlpha=.94;ctx.fillStyle='rgb(10,45,43)';ctx.fillRect(targetRect.left,y,targetRect.width,visualRowH+.2);
          for(let c=0;c<cols;c++){
            if(!row.cells[c])continue;
            const ci=Math.max(0,row.colors[c]-1);
            ctx.globalAlpha=.68;ctx.fillStyle=blockPalette[ci];ctx.fillRect(targetRect.left+c*blockW+.12,y+.3,Math.max(.8,blockW-.24),Math.max(1,visualRowH-.6));
          }
          ctx.globalAlpha=.22;ctx.fillStyle='rgba(117,186,181,1)';ctx.fillRect(targetRect.left,y,targetRect.width,Math.max(.65,visualRowH*.12));
          ctx.restore();
        }

        /* Single authoritative fade: transparent at row 11, fully dark teal by row 30. */
        if(historyRows>0){
          const fadeTop=rowY(activeDepth),fadeBottom=Math.min(targetRect.bottom,rowY(activeDepth+historyRows));
          if(fadeBottom>fadeTop){
            const fadeG=ctx.createLinearGradient(0,fadeTop,0,fadeBottom);
            fadeG.addColorStop(0,'rgba(3,15,20,0)');
            fadeG.addColorStop(.20,'rgba(3,15,20,.15)');
            fadeG.addColorStop(.45,'rgba(3,15,20,.40)');
            fadeG.addColorStop(.72,'rgba(3,15,20,.72)');
            fadeG.addColorStop(1,'rgba(3,15,20,1)');
            ctx.save();ctx.globalAlpha=1;ctx.fillStyle=fadeG;ctx.fillRect(targetRect.left,fadeTop,targetRect.width,fadeBottom-fadeTop);ctx.restore();
          }
        }

        /* Separate bottom-up resume-paper layer. Cubic rise preserves the dark teal trail much longer. */
        if(solidHeight>0&&wallProgress>.08){
          const whitePhase=clamp((wallProgress-.20)/.80,0,1);
          const whiteRise=whitePhase*whitePhase*whitePhase;
          const visibleHeight=solidHeight*whiteRise;
          if(visibleHeight>0){
            const whiteTop=targetRect.bottom-visibleHeight;
            const g=ctx.createLinearGradient(0,whiteTop,0,targetRect.bottom);
            g.addColorStop(0,'rgba(3,15,20,1)');
            g.addColorStop(.28,'rgba(18,44,46,1)');
            g.addColorStop(.58,'rgba(92,119,118,1)');
            g.addColorStop(.82,'rgba(205,214,210,1)');
            g.addColorStop(1,'rgba(245,244,239,1)');
            ctx.save();ctx.globalAlpha=clamp((wallProgress-.18)/.62,0,1);ctx.fillStyle=g;ctx.fillRect(targetRect.left,whiteTop,targetRect.width,visibleHeight);ctx.restore();
          }
          if(whiteRise<1){ctx.save();ctx.globalAlpha=1;ctx.fillStyle='rgb(3,15,20)';ctx.fillRect(targetRect.left,solidTop,targetRect.width,Math.max(0,solidHeight-visibleHeight));ctx.restore()}
        }

        if(p>.90){const a=clamp((p-.90)/.10,0,1);ctx.save();ctx.globalAlpha=a*.42;ctx.strokeStyle='rgba(9,58,60,.72)';ctx.lineWidth=1;ctx.strokeRect(targetRect.left+.5,targetRect.top+.5,targetRect.width-1,targetRect.height-1);ctx.restore()}
      }

      if(elapsed<BUILD){particleRaf=requestAnimationFrame(tick)}else{particleRaf=0}
    }
    particleRaf=requestAnimationFrame(tick);
  }

  function buildEffects(sourceRect,targetRect){if(reduce?.matches)return;startPrinter(sourceRect,targetRect);fx.classList.add('active')}
  function finishOpen(){stopParticles();overlay.classList.remove('constructing','revealing');overlay.classList.add('open','frame-ready');fx.classList.remove('active');sourceCard?.classList.remove('resume-source-dissolve');close.focus({preventScroll:true})}
  function openResume(e){e?.preventDefault();if(open||closing)return;open=true;lastFocus=document.activeElement;clearTimers();stopParticles();scroller.scrollTop=0;document.body.classList.add('resume-open');overlay.setAttribute('aria-hidden','false');overlay.classList.remove('open','closing','revealing','frame-ready');overlay.classList.add('constructing');if(reduce?.matches){overlay.classList.add('frame-ready','revealing');later(finishOpen,1);return}sourceCard?.classList.add('resume-source-dissolve');requestAnimationFrame(()=>{const sourceRect=sourceCard?.getBoundingClientRect()||trigger.getBoundingClientRect(),targetRect=shell.getBoundingClientRect();buildEffects(sourceRect,targetRect)});later(()=>{overlay.classList.add('frame-ready');overlay.classList.remove('constructing');overlay.classList.add('revealing')},BUILD);later(finishOpen,TOTAL)}
  function closeResume(){if(!open||closing)return;closing=true;clearTimers();stopParticles();overlay.classList.remove('open','revealing');overlay.classList.add('closing','frame-ready');later(()=>{overlay.classList.remove('closing','frame-ready');overlay.setAttribute('aria-hidden','true');document.body.classList.remove('resume-open');fx.classList.remove('active');sourceCard?.classList.remove('resume-source-dissolve');open=false;closing=false;lastFocus?.focus?.({preventScroll:true})},reduce?.matches?1:CLOSE)}

  trigger.textContent='View Resume →';trigger.href='#resume';trigger.removeAttribute('target');trigger.removeAttribute('rel');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls','resume-viewer');trigger.addEventListener('click',openResume);
  overlay.querySelector('[data-up]').onclick=()=>scroller.scrollBy({top:-Math.max(280,scroller.clientHeight*.72),behavior:'smooth'});
  overlay.querySelector('[data-down]').onclick=()=>scroller.scrollBy({top:Math.max(280,scroller.clientHeight*.72),behavior:'smooth'});
  overlay.querySelector('[data-print]').onclick=()=>window.print();close.onclick=closeResume;overlay.addEventListener('click',e=>{if(e.target===overlay&&overlay.classList.contains('open'))closeResume()});
  document.addEventListener('keydown',e=>{if(!open)return;if(e.key==='Escape'&&overlay.classList.contains('open')){e.preventDefault();closeResume();return}if(e.key==='Tab'&&overlay.classList.contains('open')){const items=[...overlay.querySelectorAll('button,a,[tabindex="0"]')].filter(x=>x.offsetParent!==null),first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}});
})();