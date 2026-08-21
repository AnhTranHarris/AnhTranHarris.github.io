/* Harris Portfolio: modular 3.1s entry choreography.
   White membrane -> triangular murmuration -> word formations -> neon warp -> portfolio reveal.
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
  const FADE_START = 2960;
  const WORDS = [
    { text: 'BUILD', start: 620, peak: 920, release: 1110 },
    { text: 'EXPLORE', start: 1030, peak: 1340, release: 1530 },
    { text: 'IMPROVE', start: 1450, peak: 1760, release: 1970 }
  ];
  const PARTICLES = 230;
  const WORD_PARTICLES = 150;
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const smooth = t => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const rand = (a, b) => a + Math.random() * (b - a);

  let w = 1, h = 1, dpr = 1, start = 0, raf = 0, finished = false;
  let wordTargets = new Map();

  const particles = Array.from({ length: PARTICLES }, (_, i) => ({
    x: rand(-0.12, 1.12), y: rand(-0.12, 1.12),
    vx: rand(-0.00016, 0.00016), vy: rand(-0.00012, 0.00012),
    rot: rand(0, TAU), spin: rand(-0.0045, 0.0045),
    size: rand(2.6, 8.5), depth: rand(0.25, 1), phase: rand(0, TAU),
    wordSlot: i < WORD_PARTICLES ? i : -1,
    lane: Math.floor(rand(0, 5)),
    hue: Math.random() < .18 ? 'gold' : 'teal'
  }));

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
    const ow = Math.min(980, Math.max(420, w * .82));
    const oh = Math.min(260, Math.max(160, h * .25));
    off.width = Math.round(ow);
    off.height = Math.round(oh);
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';
    octx.fillStyle = '#000';
    octx.font = `800 ${Math.max(56, Math.min(142, ow / 6.6))}px Inter, Arial, sans-serif`;

    for (const spec of WORDS) {
      octx.clearRect(0, 0, off.width, off.height);
      octx.fillText(spec.text, off.width / 2, off.height / 2);
      const img = octx.getImageData(0, 0, off.width, off.height).data;
      const pts = [];
      const step = Math.max(5, Math.round(off.width / 130));
      for (let y = 2; y < off.height - 2; y += step) {
        for (let x = 2; x < off.width - 2; x += step) {
          if (img[(y * off.width + x) * 4 + 3] > 120) pts.push([x / off.width, y / off.height]);
        }
      }
      for (let i = pts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      wordTargets.set(spec.text, pts.slice(0, WORD_PARTICLES));
    }
  }

  function activeWord(t) {
    for (const spec of WORDS) if (t >= spec.start && t <= spec.release) return spec;
    return null;
  }

  function wordStrength(spec, t) {
    if (!spec) return 0;
    if (t <= spec.peak) return smooth((t - spec.start) / (spec.peak - spec.start));
    return 1 - smooth((t - spec.peak) / (spec.release - spec.peak));
  }

  function drawTriangle(x, y, size, rot, fill, alpha = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * .88, size * .72);
    ctx.lineTo(-size * .88, size * .72);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawMembrane(t) {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    if (t < 1420) return;
    const consume = ease((t - 1420) / 1450);
    const cx = w * .54, cy = h * .49;
    const maxR = Math.hypot(w, h) * .72;
    const baseR = mix(0, maxR, consume);
    const points = 42;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const a = i / points * TAU;
      const jag = Math.sin(a * 7 + t * .006) * 18 + Math.sin(a * 13 - t * .004) * 9;
      const r = Math.max(0, baseR + jag * consume);
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    const chips = Math.floor(18 + consume * 42);
    for (let i = 0; i < chips; i++) {
      const a = (i / chips) * TAU + Math.sin(i * 2.17) * .16;
      const r = baseR + rand(-34, 72) * consume;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      const s = rand(5, 22) * consume;
      ctx.beginPath();
      ctx.moveTo(x, y - s);
      ctx.lineTo(x + s, y + s);
      ctx.lineTo(x - s * .7, y + s * .55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWarp(t) {
    if (t < 1280) return;
    const p = smooth((t - 1280) / 1580);
    const cx = w * .54, cy = h * .49;
    const count = Math.round(34 + p * 52);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';

    for (let i = 0; i < count; i++) {
      const seed = (i * 0.61803398875) % 1;
      const a = seed * TAU + Math.sin(i * 1.7) * .08;
      const travel = ((t * (.00016 + (i % 7) * .000013) + seed) % 1);
      const r0 = Math.pow(travel, 2.15) * Math.hypot(w, h) * .62;
      const len = 16 + 155 * travel * p;
      const x0 = cx + Math.cos(a) * r0;
      const y0 = cy + Math.sin(a) * r0;
      const x1 = cx + Math.cos(a) * (r0 + len);
      const y1 = cy + Math.sin(a) * (r0 + len);
      const gold = i % 6 === 0;
      ctx.strokeStyle = gold ? 'rgba(255,226,126,.88)' : (i % 3 === 0 ? 'rgba(177,255,248,.92)' : 'rgba(80,235,225,.72)');
      ctx.globalAlpha = clamp(.12 + travel * .9, 0, .92) * p;
      ctx.lineWidth = gold ? 1.4 : (travel > .76 ? 1.8 : .8);
      ctx.shadowBlur = travel > .68 ? 11 : 4;
      ctx.shadowColor = gold ? '#ffe27e' : '#63f5ec';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(t, dt) {
    const spec = activeWord(t);
    const strength = wordStrength(spec, t);
    const targets = spec ? wordTargets.get(spec.text) || [] : [];
    const warp = smooth((t - 1300) / 1500);
    const cx = w * .54, cy = h * .49;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      let nx = p.x, ny = p.y;

      if (strength > 0 && p.wordSlot >= 0 && targets[p.wordSlot]) {
        const [tx, ty] = targets[p.wordSlot];
        const targetX = .5 + (tx - .5) * Math.min(.82, 920 / Math.max(w, 920));
        const targetY = .5 + (ty - .5) * Math.min(.31, 260 / Math.max(h, 260));
        const pull = .018 + strength * .095;
        nx += (targetX - nx) * pull;
        ny += (targetY - ny) * pull;
      } else {
        const flock = 1 - warp;
        const waveX = Math.sin(t * .0019 + p.phase + p.y * 7) * .00025 * flock;
        const waveY = Math.cos(t * .00145 + p.phase * .7 + p.x * 6) * .00018 * flock;
        nx += (p.vx + waveX) * dt;
        ny += (p.vy + waveY) * dt;

        if (warp > 0) {
          const px = nx * w, py = ny * h;
          const dx = px - cx, dy = py - cy;
          const mag = Math.max(1, Math.hypot(dx, dy));
          const thrust = (.000018 + p.depth * .000045) * dt * warp;
          nx += (dx / mag) * thrust;
          ny += (dy / mag) * thrust;
        }
      }

      if (nx < -.18) nx = 1.15;
      if (nx > 1.18) nx = -.15;
      if (ny < -.18) ny = 1.15;
      if (ny > 1.18) ny = -.15;
      p.x = nx; p.y = ny; p.rot += p.spin * dt;

      const px = nx * w, py = ny * h;
      const near = clamp(.45 + p.depth * .75 + warp * p.depth * 1.8, .4, 2.65);
      const size = p.size * near * (strength > .45 && p.wordSlot >= 0 ? .72 : 1);
      let fill = '#24282b';
      let alpha = .78;
      if (t > 1180) {
        const neon = smooth((t - 1180) / 950);
        fill = p.hue === 'gold' ? `rgba(255,221,118,${.5 + neon * .45})` : `rgba(72,229,219,${.48 + neon * .48})`;
        alpha = .58 + neon * .38;
      }
      if (t > 2580) alpha *= 1 - smooth((t - 2580) / 430);
      drawTriangle(px, py, size, p.rot, fill, alpha);
    }
  }

  function drawPortfolioConvergence(t) {
    if (t < 2150) return;
    const p = smooth((t - 2150) / 760);
    const fade = 1 - smooth((t - 2860) / 220);
    const alpha = p * fade;
    const cx = w * .54, cy = h * .49;
    const cardW = Math.min(610, w * .56);
    const cardH = Math.min(430, h * .48);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = 'rgba(255,226,126,.92)';
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#ffe27e';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - cardW / 2, cy - cardH / 2, cardW, cardH);
    ctx.strokeStyle = 'rgba(99,245,235,.76)';
    ctx.shadowColor = '#63f5eb';
    ctx.beginPath();
    ctx.moveTo(w * .18, 86);
    ctx.lineTo(w * .82, 86);
    ctx.stroke();
    ctx.restore();
  }

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    document.documentElement.dataset.entryState = 'complete';
    overlay.classList.add('entry-complete');
    setTimeout(() => overlay.remove(), 180);
  }

  const watchdog = setTimeout(finish, 4300);
  function frame(now) {
    if (!start) start = now;
    const t = now - start;
    const last = frame.last || now;
    const dt = Math.min(32, now - last);
    frame.last = now;

    ctx.clearRect(0, 0, w, h);
    drawMembrane(t);
    drawWarp(t);
    drawParticles(t, dt);
    drawPortfolioConvergence(t);

    if (t >= FADE_START) {
      const a = 1 - smooth((t - FADE_START) / (TOTAL - FADE_START));
      canvas.style.opacity = String(clamp(a, 0, 1));
    }

    if (t >= TOTAL) {
      clearTimeout(watchdog);
      finish();
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  const onVisibility = () => {
    if (!document.hidden && !finished && !raf) raf = requestAnimationFrame(frame);
  };
  document.addEventListener('visibilitychange', onVisibility, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pageshow', e => { if (e.persisted) finish(); }, { once: true });
  window.addEventListener('pagehide', () => { if (!finished) cancelAnimationFrame(raf); }, { once: true });

  document.documentElement.dataset.entryState = 'running';
  resize();
  raf = requestAnimationFrame(frame);
})();
