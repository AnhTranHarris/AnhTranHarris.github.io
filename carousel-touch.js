/* Harris Portfolio: isolated card-only carousel controller. */
(() => {
  const barrel = document.querySelector('.barrel');
  if (!barrel) return;

  barrel.style.touchAction = 'none';
  barrel.style.cursor = 'grab';

  const step = 90;
  let angle = 0;
  let target = 0;
  let dragging = false;
  let pointerId = null;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let raf = 0;

  const normalize = a => ((a % 360) + 360) % 360;
  const shortest = (a, b) => ((a - b + 540) % 360) - 180;
  const render = () => { barrel.style.transform = `rotateY(${angle}deg)`; };
  const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  function snap() {
    const nearest = Math.round(normalize(angle) / step) * step;
    target = angle + shortest(nearest, normalize(angle));
    stop();
    const tick = () => {
      const d = target - angle;
      if (Math.abs(d) < 0.08) { angle = target; render(); raf = 0; return; }
      angle += d * 0.16;
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function momentum() {
    stop();
    const tick = () => {
      angle += velocity;
      velocity *= 0.94;
      render();
      if (Math.abs(velocity) < 0.08) { velocity = 0; snap(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function begin(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    stop();
    dragging = true;
    pointerId = e.pointerId;
    lastX = e.clientX;
    lastT = performance.now();
    velocity = 0;
    barrel.setPointerCapture?.(pointerId);
    barrel.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function move(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(8, now - lastT);
    lastX = e.clientX;
    lastT = now;
    angle += dx * 1.05;
    velocity = (dx * 1.05) / (dt / 16.67);
    render();
    e.preventDefault();
  }

  function end(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    try { barrel.releasePointerCapture?.(pointerId); } catch (_) {}
    pointerId = null;
    barrel.style.cursor = 'grab';
    Math.abs(velocity) > 0.12 ? momentum() : snap();
  }

  barrel.addEventListener('pointerdown', begin, { passive: false });
  barrel.addEventListener('pointermove', move, { passive: false });
  barrel.addEventListener('pointerup', end, { passive: false });
  barrel.addEventListener('pointercancel', end, { passive: false });
  barrel.addEventListener('lostpointercapture', () => {
    if (!dragging) return;
    dragging = false;
    pointerId = null;
    barrel.style.cursor = 'grab';
    snap();
  });
  render();
})();
