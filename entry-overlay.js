/* Harris Portfolio: modular 3.1s flock entry choreography.
   Four triangle groups: words, portfolio alignment, membrane erasure, free flight.
   Isolated from carousel/resume systems; watchdog always releases the page. */
(() => {
  'use strict';

  const overlay = document.getElementById('portfolio-entry-overlay');
  if (!overlay) return;

  const nav = performance.getEntriesByType?.('navigation')?.[0];
  if (nav?.type === 'back_forward' || window.matchMedia?.('(forced-colors: active)').matches) {
    document.documentElement.dataset.entryState = 'complete';
    overlay.remove();
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  overlay.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
  if (!ctx) {
    document.documentElement.dataset.entryState = 'complete';
    overlay.remove();
    return;
  }

  const TOTAL = 3100;
  const WIPE_START = 2140;
  const WIPE_END = 2960;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const smooth = t => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const rand = (a, b) => a + Math.random() * (b - a);

  let w = 1, h = 1, dpr = 1, start = 0, raf = 0, finished = false;
  let wordTargets = new Map();

  function randomEdgePoint(pad = 10) {
    const side = Math.floor(rand(0, 4));
    if (side === 0) return { x: rand(-pad, w + pad), y: -pad };
    if (side === 1) return { x: w + pad, y: rand(-pad, h + pad) };
    if (side === 2) return { x: rand(-pad, w + pad), y: h + pad };
    return { x: -pad, y: rand(-pad, h + pad) };
  }

  function oppositeEdgePoint(from, pad = 18) {
    if (from.x < 0) return { x: w + pad, y: rand(h * .08, h * .92) };
    if (from.x > w) return { x: -pad, y: rand(h * .08, h * .92) };
    if (from.y < 0) return { x: rand(w * .08, w * .92), y: h + pad };
    return { x: rand(w * .08, w * .92), y: -pad };
  }

  function makeBird(group, i) {
    const origin = randomEdgePoint(rand(5, 16));
    const end = oppositeEdgePoint(origin, rand(14, 30));
    const cx = rand(w * .18, w * .82);
    const cy = rand(h * .16, h * .84);
    return {
      group,
      i,
      origin,
      end,
      cx,
      cy,
      startDelay: rand(0, 520),
      duration: rand(1500, 2650),
      phase: rand(0, TAU),
      wobble: rand(8, 36),
      depthPhase: rand(0, TAU),
      base: rand(2.6, 7.2),
      rot: rand(0, TAU),
      spin: rand(-.0019, .0019),
      tone: Math.random() < .12 ? 'gold' : (Math.random() < .26 ? 'teal' : 'charcoal'),
      targetSlot: i,
      settled: false
    };
  }

  const group1 = Array.from({ length: 76 }, (_, i) => makeBird(1, i));
  const group2 = Array.from({ length: 62 }, (_, i) => makeBird(2, i));
  const group3 = Array.from({ length: 50 }, (_, i) => makeBird(3, i));
  const group4 = Array.from({ length: 64 }, (_, i) => makeBird(4, i));
  const all = [...group1, ...group2, ...group3, ...group4];

  const WORDS = [
    { text: 'BUILD', start: 520, peak: 760, release: 980 },
    { text: 'EXPLORE', start: 900, peak: 1150, release: 1370 },
    { text: 'IMPROVE', start: 1280, peak: 1530, release: 1770 }
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    w = Math.max(1, window.innerWidth);
    h = Math.max(1, window.innerHeight);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildWordTargets();
  }

  function buildWordTargets() {
    wordTargets = new Map();
    const off = document.createElement('canvas');
    const octx = off.getContext('2d');
    const ow = Math.min(920, Math.max(420, w * .78));
    const oh = Math.min(220, Math.max(150, h * .22));
    off.width = Math.round(ow);
    off.height = Math.round(oh);
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#000';
    octx.font = `800 ${Math.max(52, Math.min(128, ow / 7))}px Inter, Arial, sans-serif`;

    for (const spec of WORDS) {
      octx.clearRect(0, 0, off.width, off.height);
      octx.fillText(spec.text, off.width / 2, off.height / 2);
      const img = octx.getImageData(0, 0, off.width, off.height).data;
      const pts = [];
      const step = Math.max(7, Math.round(off.width / 105));
      for (let y = 2; y < off.height - 2; y += step) {
        for (let x = 2; x < off.width - 2; x += step) {
          if (img[(y * off.width + x) * 4 + 3] > 100) pts.push([x / off.width, y / off.height]);
        }
      }
      for (let i = pts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      wordTargets.set(spec.text, pts.slice(0, group1.length));
    }
  }

  function wordAt(t) {
    return WORDS.find(spec => t >= spec.start && t <= spec.release) || null;
  }

  function wordStrength(spec, t) {
    if (!spec) return 0;
    if (t <= spec.peak) return smooth((t - spec.start) / (spec.peak - spec.start));
    return 1 - smooth((t - spec.peak) / (spec.release - spec.peak));
  }

  function bezier(a, b, c, t) {
    const u = 1 - t;
    return u * u * a + 2 * u * t * b + t * t * c;
  }

  function flightState(p, t) {
    const local = (t - p.startDelay) / p.duration;
    const q = ((local % 1) + 1) % 1;
    const eased = q < .5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2;
    let x = bezier(p.origin.x, p.cx, p.end.x, eased);
    let y = bezier(p.origin.y, p.cy, p.end.y, eased);

    const depth = .12 + .88 * Math.pow(Math.sin(Math.PI * q), 1.35);
    const lateral = Math.sin(t * .0031 + p.phase + q * 6.1) * p.wobble * (.25 + depth * .75);
    const vertical = Math.cos(t * .0024 + p.phase * .71 + q * 5.2) * p.wobble * .36;
    x += lateral;
    y += vertical;

    return { x, y, depth, q };
  }

  function trianglePath(x, y, size, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * .93, size * .78);
    ctx.lineTo(-size * .93, size * .78);
    ctx.closePath();
    ctx.restore();
  }

  function drawTriangle(x, y, size, rot, fill, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * .93, size * .78);
    ctx.lineTo(-size * .93, size * .78);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function colorFor(p, depth, alpha = 1) {
    if (p.tone === 'gold') return `rgba(128,103,53,${alpha})`;
    if (p.tone === 'teal') return `rgba(41,106,108,${alpha})`;
    const c = Math.round(mix(38, 16, depth));
    return `rgba(${c},${c + 3},${c + 5},${alpha})`;
  }

  function portfolioLineTarget(i) {
    const topY = 86;
    const cardW = Math.min(610, w * .56);
    const cardH = Math.min(430, h * .48);
    const cx = w * .66;
    const cy = h * .51;
    const perimeter = 2 * (cardW + cardH);
    if (i < 18) {
      const t = i / 17;
      return { x: mix(w * .31, w * .69, t), y: topY };
    }
    const j = i - 18;
    const d = (j / Math.max(1, group2.length - 19)) * perimeter;
    let x, y;
    if (d < cardW) {
      x = cx - cardW / 2 + d; y = cy - cardH / 2;
    } else if (d < cardW + cardH) {
      x = cx + cardW / 2; y = cy - cardH / 2 + (d - cardW);
    } else if (d < cardW * 2 + cardH) {
      x = cx + cardW / 2 - (d - cardW - cardH); y = cy + cardH / 2;
    } else {
      x = cx - cardW / 2; y = cy + cardH / 2 - (d - cardW * 2 - cardH);
    }
    return { x, y };
  }

  function drawWhiteMembrane() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);
  }

  function eraseGroup3Paths(t) {
    if (t < 480) return;
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    for (const p of group3) {
      const s = flightState(p, t);
      const life = clamp((t - 480) / 1700, 0, 1);
      const size = p.base * (1.2 + s.depth * 3.7) * life;
      ctx.globalAlpha = .12 + s.depth * .22;
      ctx.translate(s.x, s.y);
      ctx.rotate(p.rot + t * p.spin);
      ctx.beginPath();
      ctx.moveTo(0, -size * 2.2);
      ctx.lineTo(size * 1.9, size * 1.7);
      ctx.lineTo(-size * 1.9, size * 1.7);
      ctx.closePath();
      ctx.fill();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    ctx.restore();
  }

  function drawGroup1(t) {
    const spec = wordAt(t);
    const strength = wordStrength(spec, t);
    const targets = spec ? wordTargets.get(spec.text) || [] : [];

    group1.forEach((p, i) => {
      const f = flightState(p, t);
      let x = f.x, y = f.y, depth = f.depth;
      if (strength > 0 && targets[i]) {
        const [tx, ty] = targets[i];
        const txp = w * .5 + (tx - .5) * Math.min(w * .76, 880);
        const typ = h * .49 + (ty - .5) * Math.min(h * .22, 210);
        const pull = smooth(strength);
        x = mix(x, txp, pull);
        y = mix(y, typ, pull);
        depth = mix(depth, .62, pull);
      }
      const size = p.base * (.45 + depth * 2.35) * (strength > .45 ? .78 : 1);
      drawTriangle(x, y, size, p.rot + t * p.spin, colorFor(p, depth, .88), .88);
    });
  }

  function drawGroup2(t) {
    const align = smooth((t - 1420) / 800) * (1 - smooth((t - 2540) / 300));
    group2.forEach((p, i) => {
      const f = flightState(p, t);
      const target = portfolioLineTarget(i);
      const x = mix(f.x, target.x, align);
      const y = mix(f.y, target.y, align);
      const depth = mix(f.depth, .48, align);
      const size = p.base * (.42 + depth * 1.85) * (1 - align * .18);
      drawTriangle(x, y, size, p.rot + t * p.spin, colorFor(p, depth, .80), .80);
    });
  }

  function drawGroup3(t) {
    group3.forEach(p => {
      const f = flightState(p, t);
      const fade = 1 - smooth((t - 2200) / 520);
      if (fade <= 0) return;
      const size = p.base * (.5 + f.depth * 2.8);
      drawTriangle(f.x, f.y, size, p.rot + t * p.spin, colorFor(p, f.depth, .72), .72 * fade);
    });
  }

  function drawGroup4(t) {
    group4.forEach(p => {
      const f = flightState(p, t);
      const fade = 1 - smooth((t - 2700) / 300);
      const size = p.base * (.38 + f.depth * 2.6);
      drawTriangle(f.x, f.y, size, p.rot + t * p.spin, colorFor(p, f.depth, .68), .68 * fade);
    });
  }

  function nearCameraWipe(t) {
    if (t < WIPE_START) return;
    const p = smooth((t - WIPE_START) / (WIPE_END - WIPE_START));
    const startX = -w * .10;
    const endX = w * 1.12;
    const x = mix(startX, endX, p);
    const y = h * (.66 - Math.sin(p * Math.PI) * .31);
    const size = mix(Math.min(w, h) * .05, Math.hypot(w, h) * .82, Math.pow(p, 1.38));
    const rot = mix(-.45, .20, p) + Math.sin(p * Math.PI * 2.2) * .06;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = smooth((t - WIPE_START) / 240);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 1.16, size * .88);
    ctx.lineTo(-size * 1.16, size * .88);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (p < .92) {
      drawTriangle(x, y, size * .96, rot, 'rgba(20,23,25,.88)', .82 * (1 - smooth((p - .66) / .34)));
    }
  }

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState = 'complete';
    overlay.classList.add('entry-complete');
    setTimeout(() => overlay.remove(), 140);
  }

  const watchdog = setTimeout(finish, 4300);

  function frame(now) {
    if (!start) start = now;
    const t = now - start;

    ctx.clearRect(0, 0, w, h);
    drawWhiteMembrane();
    eraseGroup3Paths(t);
    nearCameraWipe(t);

    ctx.globalCompositeOperation = 'source-over';
    drawGroup1(t);
    drawGroup2(t);
    drawGroup3(t);
    drawGroup4(t);

    if (t >= TOTAL) {
      clearTimeout(watchdog);
      finish();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  const onVisibility = () => {
    if (!document.hidden && !finished) {
      frame.last = performance.now();
    }
  };

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', onVisibility, { passive: true });
  window.addEventListener('pagehide', () => cancelAnimationFrame(raf), { once: true });
  window.addEventListener('pageshow', event => {
    if (event.persisted) finish();
  });

  resize();
  document.documentElement.dataset.entryState = 'running';
  raf = requestAnimationFrame(frame);
})();
