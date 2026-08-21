/* Harris Portfolio entry — mathematical constructive/destructive field reveal.
   FULL REWRITE: Canvas 2D only, no WebGL, no video, no procedural moving blobs.
   The animation is a low-resolution categorical wave field scaled with nearest-neighbor
   sampling so stepped edges remain razor crisp on desktop and mobile.
   The live portfolio remains untouched underneath this isolated overlay. */
(() => {
  'use strict';

  const overlay = document.getElementById('portfolio-entry-overlay');
  if (!overlay) return;

  const nav = performance.getEntriesByType?.('navigation')?.[0];
  const shouldSkip = nav?.type === 'back_forward' ||
    window.matchMedia?.('(forced-colors: active)').matches ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finishImmediately = () => {
    document.documentElement.dataset.entryState = 'complete';
    overlay.remove();
  };
  if (shouldSkip) { finishImmediately(); return; }

  const TOTAL_MS = 3270;
  const WHITE_HOLD_MS = 95;
  const FAILSAFE_MS = 4600;

  const COLORS = {
    white: [255,255,255,255],
    ink:   [6,21,28,255],
    gold:  [216,184,106,255]
  };

  const canvas = document.createElement('canvas');
  canvas.className = 'entry-field-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  overlay.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha:true, desynchronized:true });
  if (!ctx) { finishImmediately(); return; }
  ctx.imageSmoothingEnabled = false;

  const fieldCanvas = document.createElement('canvas');
  const fieldCtx = fieldCanvas.getContext('2d', { alpha:true, willReadFrequently:false });
  if (!fieldCtx) { finishImmediately(); return; }

  let cssW = 1;
  let cssH = 1;
  let cols = 44;
  let rows = 44;
  let imageData = null;
  let data = null;
  let uCoord = null;
  let vCoord = null;
  let start = 0;
  let raf = 0;
  let watchdog = 0;
  let finished = false;

  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const smoothstep = (a,b,x) => {
    const q = clamp((x-a)/(b-a),0,1);
    return q*q*(3-2*q);
  };

  function resize() {
    cssW = Math.max(1, window.innerWidth);
    cssH = Math.max(1, window.innerHeight);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.max(1, Math.round(cssW*dpr));
    canvas.height = Math.max(1, Math.round(cssH*dpr));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    ctx.imageSmoothingEnabled = false;

    // Same visual cell density on portrait and landscape: the short viewport axis
    // always contains 44 mathematical cells. This keeps mobile/desktop choreography
    // equivalent while preserving hard geometric edges.
    const aspect = cssW/cssH;
    if (aspect >= 1) {
      rows = 44;
      cols = clamp(Math.round(44*aspect),44,104);
    } else {
      cols = 44;
      rows = clamp(Math.round(44/aspect),44,104);
    }

    fieldCanvas.width = cols;
    fieldCanvas.height = rows;
    imageData = fieldCtx.createImageData(cols,rows);
    data = imageData.data;
    uCoord = new Float32Array(cols);
    vCoord = new Float32Array(rows);
    for (let x=0;x<cols;x++) uCoord[x]=(x+.5)/cols;
    for (let y=0;y<rows;y++) vCoord[y]=(y+.5)/rows;
  }

  function setPixel(index, rgba) {
    const o = index*4;
    data[o] = rgba[0];
    data[o+1] = rgba[1];
    data[o+2] = rgba[2];
    data[o+3] = rgba[3];
  }

  function renderWhite() {
    for (let i=0;i<cols*rows;i++) setPixel(i,COLORS.white);
    fieldCtx.putImageData(imageData,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fieldCanvas,0,0,canvas.width,canvas.height);
  }

  function renderField(seconds, progress) {
    const TAU = Math.PI*2;
    const t = seconds;

    // Slowly moving centers for angular pressure waves. Manhattan distance is used
    // intentionally: unlike circular ripples, it generates the stepped diamond/block
    // fronts visible in the reference animation once the field is quantized.
    const c1x = .30 + .24*Math.sin(t*.73);
    const c1y = .34 + .27*Math.cos(t*.91);
    const c2x = .71 + .22*Math.cos(t*.82+1.2);
    const c2y = .65 + .25*Math.sin(t*.64+1.7);

    // Whole-field dominance envelopes. These make gold, ink and white take turns
    // occupying large portions of the viewport instead of behaving like little blobs.
    const goldBias = .34*Math.sin(t*2.55) + .24*Math.sin(t*5.10+.7);
    const inkBias  = .32*Math.sin(t*2.18+2.05) + .23*Math.sin(t*4.72+1.35);
    const whiteBias= .29*Math.sin(t*2.91+3.95) + .20*Math.sin(t*5.58+2.65);

    const revealRamp = smoothstep(.66,.985,progress);
    const finalRamp = smoothstep(.955,1,progress);

    let idx = 0;
    for (let y=0;y<rows;y++) {
      const v = vCoord[y];
      const py = (v-.5)*TAU;
      for (let x=0;x<cols;x++,idx++) {
        const u = uCoord[x];
        const px = (u-.5)*TAU;

        // Four directional waves. Different axes, frequencies and opposing temporal
        // directions create constructive/destructive interference over the full frame.
        const d1 = Math.sin( 1.18*px + .46*py + t*3.90 + .20);
        const d2 = Math.sin(-.63*px +1.36*py - t*3.10 +1.70);
        const d3 = Math.sin( .82*px +1.02*py + t*4.70 +3.10);
        const d4 = Math.sin( 1.54*px -.72*py - t*4.15 +4.35);

        // Constructive/destructive angular fronts. Because coordinates are normalized,
        // these flex with any viewport while keeping identical timing and topology.
        const m1 = Math.abs(u-c1x)+Math.abs(v-c1y);
        const m2 = Math.abs(u-c2x)+Math.abs(v-c2y);
        const r1 = Math.cos(m1*TAU*2.22 - t*5.20 + .45);
        const r2 = Math.cos(m2*TAU*2.58 + t*4.62 +2.20);

        let gold = 1.03*d1 + .73*d3 - .61*d2 + .79*r1 - .46*r2 + goldBias;
        let ink  =-.80*d1 +1.04*d2 + .70*d4 + .68*r2 - .38*r1 + inkBias;
        let white= .63*d1 - .57*d3 + .85*d4 - .40*r1 + .49*r2 + whiteBias;

        // A slower constructive wave periodically swells an entire color territory,
        // then reverses and lets the competing field eat it away.
        const territory = Math.sin((u+v)*TAU*1.18 - t*2.72) +
                          .72*Math.sin((u-v)*TAU*.91 + t*3.18+.8);
        gold += territory*.22*Math.sin(t*1.77+.3);
        ink  -= territory*.24*Math.sin(t*1.77+.3);

        // Hard categorical winner. No interpolation between colors: boundaries stay
        // perfectly sharp at every display resolution.
        let rgba = COLORS.white;
        let best = white;
        const threshold = .015 + .095*Math.sin(t*1.86);
        if (ink > best + threshold) { best = ink; rgba = COLORS.ink; }
        if (gold > best + threshold) { rgba = COLORS.gold; }

        // Late-stage destructive cancellation reveals the live portfolio below using
        // the same wave vocabulary rather than a separate opacity fade.
        let transparent = false;
        if (revealRamp > 0) {
          const reveal =
            .74*Math.sin(.93*px-1.11*py+t*5.22+.2) +
            .58*Math.cos((Math.abs(u-.58)+Math.abs(v-.43))*TAU*1.72-t*5.86+1.0) +
            .44*Math.sin(-1.46*px-.39*py-t*4.18+2.6);
          const revealThreshold = 1.43 + (-2.72*revealRamp);
          transparent = reveal > revealThreshold;
        }

        // Guaranteed final diagonal destruction of every remaining overlay cell.
        if (finalRamp > 0) {
          const sweep = u + .58*v;
          const cut = -.12 + 1.82*finalRamp;
          if (sweep < cut) transparent = true;
        }

        if (transparent) setPixel(idx,[0,0,0,0]);
        else setPixel(idx,rgba);
      }
    }

    fieldCtx.putImageData(imageData,0,0);
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fieldCanvas,0,0,canvas.width,canvas.height);
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState = 'complete';
    overlay.classList.add('entry-complete');
    setTimeout(() => overlay.remove(),100);
  }

  function frame(now) {
    if (!start) start = now;
    const elapsedTotal = now-start;

    if (elapsedTotal < WHITE_HOLD_MS) {
      renderWhite();
    } else {
      const elapsed = elapsedTotal-WHITE_HOLD_MS;
      const progress = clamp(elapsed/TOTAL_MS,0,1);
      renderField(elapsed/1000,progress);
      if (progress >= 1) { finish(); return; }
    }
    raf = requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  window.addEventListener('resize',() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (!finished) resize();
    },90);
  },{passive:true});
  window.addEventListener('pageshow',e => { if (e.persisted) finish(); },{passive:true});

  try {
    resize();
    renderWhite();
    document.documentElement.dataset.entryState = 'running';
    watchdog = setTimeout(finish,FAILSAFE_MS);
    raf = requestAnimationFrame(frame);
  } catch (error) {
    console.error('Entry overlay failed safely:',error);
    finishImmediately();
  }
})();
