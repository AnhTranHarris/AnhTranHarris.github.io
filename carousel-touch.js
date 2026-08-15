/* Harris Portfolio: single, card-only carousel controller.
   Page scrolling is intentionally not handled here. The barrel owns its own horizontal interaction.
*/
(() => {
  const barrel = document.querySelector('#barrel');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const dots = [...document.querySelectorAll('.dot')];
  if (!barrel) return;

  const STEP = 90;
  const DRAG_GAIN = 1.05;
  const FRICTION = 0.94;
  let angle = 0;
  let velocity = 0;
  let raf = 0;
  let dragging = false;
  let pointerId = null;
  let lastX = 0;
  let lastT = 0;
  let generation = 0;

  barrel.style.touchAction = 'none';
  barrel.style.userSelect = 'none';
  barrel.style.webkitUserSelect = 'none';
  barrel.style.cursor = 'grab';

  const render = () => {
    barrel.style.transform = `rotateY(${angle}deg)`;
    const index = ((Math.round(angle / STEP) % 4) + 4) % 4;
    dots.forEach((dot, i) => dot.classList.toggle('on', i === index));
  };

  const stopAnimation = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const shortestDelta = (value, target) => {
    let d = target - value;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  };

  function snap() {
    stopAnimation();
    const myGeneration = generation;
    const target = Math.round(angle / STEP) * STEP;
    const tick = () => {
      if (myGeneration !== generation) return;
      const d = target - angle;
      if (Math.abs(d) < 0.06) {
        angle = target;
        render();
        raf = 0;
        return;
      }
      angle += d * 0.16;
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function momentum() {
    stopAnimation();
    const myGeneration = generation;
    const tick = () => {
      if (myGeneration !== generation) return;
      angle += velocity;
      velocity *= FRICTION;
      render();
      if (Math.abs(velocity) < 0.08) {
        velocity = 0;
        snap();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function resetGesture() {
    dragging = false;
    pointerId = null;
    velocity = 0;
    barrel.style.cursor = 'grab';
  }

  function begin(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    generation++;
    stopAnimation();
    dragging = true;
    pointerId = e.pointerId;
    lastX = e.clientX;
    lastT = performance.now();
    velocity = 0;
    barrel.style.cursor = 'grabbing';
    try { barrel.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  }

  function move(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(8, now - lastT);
    lastX = e.clientX;
    lastT = now;
    angle += dx * DRAG_GAIN;
    velocity = (dx * DRAG_GAIN) / (dt / 16.67);
    render();
    e.preventDefault();
  }

  function end(e) {
    if (!dragging || e.pointerId !== pointerId) return;
    const releaseVelocity = velocity;
    const id = pointerId;
    resetGesture();
    try { barrel.releasePointerCapture(id); } catch (_) {}
    if (Math.abs(releaseVelocity) > 0.12) {
      velocity = releaseVelocity;
      momentum();
    } else {
      snap();
    }
  }

  function rotateBy(delta) {
    generation++;
    stopAnimation();
    resetGesture();
    const target = angle + delta;
    const myGeneration = generation;
    const tick = () => {
      if (myGeneration !== generation) return;
      const d = target - angle;
      if (Math.abs(d) < 0.06) {
        angle = target;
        render();
        raf = 0;
        return;
      }
      angle += d * 0.18;
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  barrel.addEventListener('pointerdown', begin, { passive: false });
  barrel.addEventListener('pointermove', move, { passive: false });
  barrel.addEventListener('pointerup', end, { passive: false });
  barrel.addEventListener('pointercancel', end, { passive: false });
  barrel.addEventListener('lostpointercapture', () => {
    if (!dragging) return;
    resetGesture();
    snap();
  });

  prev?.addEventListener('click', (e) => {
    e.preventDefault();
    rotateBy(-STEP);
  });
  next?.addEventListener('click', (e) => {
    e.preventDefault();
    rotateBy(STEP);
  });

  render();
})();
