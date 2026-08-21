/* Harris Portfolio entry: modular geometric wipe reveal.
   Inspired by layered stepped-mask motion: white -> charcoal/teal/gold -> live portfolio.
   Pure Canvas 2D, viewport-normalized, no WebGL/Three.js dependency.
   Portfolio systems underneath remain untouched. */
(() => {
  'use strict';

  const overlay = document.getElementById('portfolio-entry-overlay');
  if (!overlay) return;

  const nav = performance.getEntriesByType?.('navigation')?.[0];
  const skip = nav?.type === 'back_forward' ||
    window.matchMedia?.('(forced-colors: active)').matches ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finishImmediately = () => {
    document.documentElement.dataset.entryState = 'complete';
    overlay.remove();
  };
  if (skip) { finishImmediately(); return; }

  const canvas = document.createElement('canvas');
  canvas.className = 'entry-geometric-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  overlay.appendChild(canvas);

  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) { finishImmediately(); return; }

  const TOTAL = 3180;
  const FINAL_CLEAR_START = 2820;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const smoother = t => { t = clamp(t, 0, 1); return t*t*t*(t*(t*6-15)+10); };

  let w = 1, h = 1, dpr = 1, start = 0, raf = 0, finished = false;

  const COLORS = {
    white: '#ffffff',
    ink: '#08171d',
    teal: '#123f45',
    teal2: '#1c6467',
    gold: '#a78a4f',
    gold2: '#d0b56f'
  };

  // Irregular stepped silhouette, intentionally blocky rather than smooth.
  const SHAPE = [
    [-.58,-.28],[-.43,-.28],[-.43,-.42],[-.18,-.42],[-.18,-.54],[.02,-.54],[.02,-.40],
    [.28,-.40],[.28,-.25],[.46,-.25],[.46,-.08],[.58,-.08],[.58,.16],[.43,.16],[.43,.31],
    [.18,.31],[.18,.46],[-.04,.46],[-.04,.36],[-.28,.36],[-.28,.22],[-.48,.22],[-.48,.06],[-.58,.06]
  ];

  // Each block is described entirely in normalized viewport coordinates so desktop/mobile
  // receive the same choreography rather than separate animations.
  const blocks = [
    {c:'ink',   s:120,  e:820,  x0:-.28,y0:.78,x1:.22,y1:.48, sc0:.16,sc1:.92, r0:-.18,r1:.06},
    {c:'teal',  s:260,  e:980,  x0:1.20,y0:.18,x1:.73,y1:.36, sc0:.18,sc1:.88, r0:.26,r1:-.08},
    {c:'gold',  s:430,  e:1100, x0:.48,y0:-.26,x1:.52,y1:.26, sc0:.12,sc1:.74, r0:.06,r1:.18},
    {c:'white', s:610,  e:1240, x0:-.22,y0:.12,x1:.28,y1:.24, sc0:.14,sc1:.66, r0:-.20,r1:.03},
    {c:'ink',   s:760,  e:1430, x0:1.16,y0:.86,x1:.72,y1:.66, sc0:.16,sc1:.96, r0:-.12,r1:.08},
    {c:'teal2', s:930,  e:1570, x0:.10,y0:1.18,x1:.35,y1:.70, sc0:.12,sc1:.80, r0:.22,r1:-.05},
    {c:'gold2', s:1080, e:1730, x0:.92,y0:-.18,x1:.68,y1:.31, sc0:.13,sc1:.70, r0:-.22,r1:.12},
    {c:'ink',   s:1240, e:1880, x0:-.20,y0:.52,x1:.34,y1:.55, sc0:.12,sc1:.78, r0:.20,r1:-.10},
    {c:'white', s:1410, e:2030, x0:.45,y0:1.18,x1:.48,y1:.71, sc0:.10,sc1:.66, r0:-.10,r1:.08},
    {c:'teal',  s:1530, e:2200, x0:1.15,y0:.46,x1:.69,y1:.52, sc0:.13,sc1:.82, r0:.18,r1:-.14},
    {c:'gold',  s:1690, e:2320, x0:-.15,y0:.92,x1:.27,y1:.69, sc0:.11,sc1:.69, r0:-.16,r1:.12},
    {c:'ink',   s:1870, e:2470, x0:.40,y0:-.14,x1:.52,y1:.33, sc0:.12,sc1:.86, r0:.12,r1:-.05},
    {c:'teal2', s:2040, e:2600, x0:1.12,y0:.16,x1:.78,y1:.36, sc0:.12,sc1:.72, r0:-.14,r1:.06},
    {c:'gold2', s:2200, e:2730, x0:-.12,y0:.22,x1:.23,y1:.39, sc0:.10,sc1:.58, r0:.14,r1:-.08}
  ];

  // Smaller fragments add the chopped, restless edge behavior visible in the reference GIF.
  const chips = [
    {c:'ink',s:510,e:930,x0:.96,y0:.58,x1:.73,y1:.52,sc:.12,r:.14},
    {c:'gold',s:690,e:1110,x0:.02,y0:.07,x1:.20,y1:.22,sc:.10,r:-.08},
    {c:'teal2',s:860,e:1280,x0:.82,y0:.98,x1:.66,y1:.78,sc:.11,r:.16},
    {c:'ink',s:1040,e:1450,x0:.18,y0:-.10,x1:.30,y1:.12,sc:.09,r:-.16},
    {c:'gold2',s:1260,e:1660,x0:1.05,y0:.74,x1:.82,y1:.63,sc:.10,r:.10},
    {c:'teal',s:1460,e:1870,x0:-.08,y0:.73,x1:.14,y1:.65,sc:.11,r:-.10},
    {c:'ink',s:1640,e:2050,x0:.77,y0:-.08,x1:.69,y1:.15,sc:.09,r:.16},
    {c:'gold',s:1840,e:2260,x0:.08,y0:1.06,x1:.26,y1:.82,sc:.10,r:-.12},
    {c:'teal2',s:2070,e:2470,x0:1.07,y0:.88,x1:.84,y1:.70,sc:.10,r:.13},
    {c:'ink',s:2260,e:2670,x0:-.06,y0:.12,x1:.17,y1:.24,sc:.09,r:-.14}
  ];

  // Transparent cutouts reveal the real portfolio below. They begin modestly, then increasingly
  // dominate the frame instead of fading the overlay as one flat layer.
  const reveals = [
    {s:1450,e:2040,x0:.92,y0:.14,x1:.70,y1:.34,sc0:.06,sc1:.42,r0:.12,r1:-.05},
    {s:1650,e:2210,x0:.06,y0:.88,x1:.30,y1:.68,sc0:.05,sc1:.46,r0:-.15,r1:.08},
    {s:1850,e:2400,x0:.94,y0:.86,x1:.72,y1:.66,sc0:.05,sc1:.54,r0:.10,r1:-.10},
    {s:2020,e:2520,x0:.08,y0:.12,x1:.28,y1:.31,sc0:.05,sc1:.58,r0:-.08,r1:.12},
    {s:2200,e:2700,x0:.50,y0:1.06,x1:.50,y1:.70,sc0:.05,sc1:.72,r0:.14,r1:-.06},
    {s:2360,e:2820,x0:.50,y0:-.08,x1:.52,y1:.28,sc0:.05,sc1:.78,r0:-.12,r1:.05}
  ];

  function drawStepped(cx, cy, scale, rotation, fill) {
    const base = Math.max(w, h);
    ctx.save();
    ctx.translate(cx * w, cy * h);
    ctx.rotate(rotation);
    ctx.scale(base * scale, base * scale);
    ctx.beginPath();
    SHAPE.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y));
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  function blockProgress(item, t) {
    return smoother((t - item.s) / Math.max(1, item.e - item.s));
  }

  function drawBlock(item, t) {
    if (t < item.s || t > item.e + 220) return;
    let p = blockProgress(item, t);
    // After reaching its destination, let the mass hold briefly then peel away/expand.
    const tail = clamp((t - item.e) / 220, 0, 1);
    const x = mix(item.x0, item.x1, p) + (tail ? (item.x1 - .5) * tail * .18 : 0);
    const y = mix(item.y0, item.y1, p) + (tail ? (item.y1 - .5) * tail * .18 : 0);
    const sc = mix(item.sc0, item.sc1, p) * (1 + tail * .16);
    const r = mix(item.r0, item.r1, p);
    ctx.globalAlpha = 1 - tail * .48;
    drawStepped(x, y, sc, r, COLORS[item.c]);
    ctx.globalAlpha = 1;
  }

  function drawChip(item, t) {
    if (t < item.s || t > item.e) return;
    const p = smoother((t - item.s) / (item.e - item.s));
    const x = mix(item.x0, item.x1, p);
    const y = mix(item.y0, item.y1, p);
    const pop = Math.sin(Math.PI * p);
    drawStepped(x, y, item.sc * (.60 + pop * .55), item.r + p * .22, COLORS[item.c]);
  }

  function cutReveal(item, t) {
    if (t < item.s) return;
    const p = smoother((t - item.s) / Math.max(1, item.e - item.s));
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = .30 + p * .70;
    drawStepped(
      mix(item.x0,item.x1,p),
      mix(item.y0,item.y1,p),
      mix(item.sc0,item.sc1,p),
      mix(item.r0,item.r1,p),
      '#000'
    );
    ctx.restore();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    w = Math.max(1, window.innerWidth);
    h = Math.max(1, window.innerHeight);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState = 'complete';
    overlay.classList.add('entry-complete');
    setTimeout(() => overlay.remove(), 150);
  }

  const watchdog = setTimeout(finish, 4300);

  function frame(now) {
    if (!start) start = now;
    const t = now - start;

    ctx.clearRect(0, 0, w, h);

    // The white starting membrane is a flat first frame, exactly as requested.
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = COLORS.white;
    ctx.fillRect(0, 0, w, h);

    // Layered full-screen exchanges, ordered so later masses can aggressively overtake earlier ones.
    for (const item of blocks) drawBlock(item, t);
    for (const chip of chips) drawChip(chip, t);

    // Portfolio exposure is performed after the color masses, cutting all overlay layers at once.
    for (const reveal of reveals) cutReveal(reveal, t);

    // Final act: instead of a conventional fade, a rapidly enlarging stepped transparent aperture
    // consumes the remaining overlay until the live portfolio owns the entire frame.
    if (t >= FINAL_CLEAR_START) {
      const p = smoother((t - FINAL_CLEAR_START) / (TOTAL - FINAL_CLEAR_START));
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 1;
      drawStepped(.50, .50, mix(.18, 1.62, p), mix(-.08, .04, p), '#000');
      if (p > .78) {
        ctx.globalAlpha = smoother((p - .78) / .22);
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
    }

    if (t >= TOTAL) {
      clearTimeout(watchdog);
      finish();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 100);
  }, { passive: true });
  window.addEventListener('pageshow', e => { if (e.persisted) finish(); }, { passive: true });

  try {
    resize();
    document.documentElement.dataset.entryState = 'running';
    raf = requestAnimationFrame(frame);
  } catch (_) {
    clearTimeout(watchdog);
    finish();
  }
})();