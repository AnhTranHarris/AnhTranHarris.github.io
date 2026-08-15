/* Harris Portfolio: one isolated carousel controller.
   Horizontal gestures belong to the cards only. Page scrolling is handled elsewhere.
*/
(() => {
  const barrel = document.querySelector('#barrel');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const controls = document.querySelector('.controls');
  const dots = [...document.querySelectorAll('.dot')];
  if (!barrel) return;

  const STEP = 90;
  const DRAG_GAIN = 1.05;
  const FRICTION = 0.94;
  let angle = 0;
  let velocity = 0;
  let raf = 0;
  let dragging = false;
  let activePointer = null;
  let lastX = 0;
  let lastT = 0;
  let generation = 0;

  /* Remove the old CSS animation from the equation. JavaScript owns motion. */
  barrel.style.transition = 'none';
  barrel.style.touchAction = 'none';
  barrel.style.userSelect = 'none';
  barrel.style.webkitUserSelect = 'none';
  barrel.style.cursor = 'grab';
  barrel.style.zIndex = '1';
  if (controls) controls.style.zIndex = '10';

  const render = () => {
    barrel.style.transform = `rotateY(${angle}deg)`;
    const index = ((Math.round(angle / STEP) % 4) + 4) % 4;
    dots.forEach((dot, i) => dot.classList.toggle('on', i === index));
  };

  const stopAnimation = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  const reset = () => {
    dragging = false;
    activePointer = null;
    velocity = 0;
    barrel.style.cursor = 'grab';
  };

  function snap() {
    stopAnimation();
    const myGeneration = ++generation;
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
      angle += d * 0.18;
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function momentum(initialVelocity) {
    stopAnimation();
    const myGeneration = ++generation;
    velocity = initialVelocity;
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

  function begin(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    generation++;
    stopAnimation();
    dragging = true;
    activePointer = e.pointerId;
    lastX = e.clientX;
    lastT = performance.now();
    velocity = 0;
    barrel.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function move(e) {
    if (!dragging || e.pointerId !== activePointer) return;
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

  function finish(e) {
    if (!dragging || e.pointerId !== activePointer) return;
    const releaseVelocity = velocity;
    reset();
    if (Math.abs(releaseVelocity) > 0.12) momentum(releaseVelocity);
    else snap();
  }

  function cancel() {
    if (!dragging) return;
    reset();
    snap();
  }

  function rotateBy(delta) {
    reset();
    stopAnimation();
    const myGeneration = ++generation;
    const target = angle + delta;
    const tick = () => {
      if (myGeneration !== generation) return;
      const d = target - angle;
      if (Math.abs(d) < 0.06) {
        angle = target;
        render();
        raf = 0;
        return;
      }
      angle += d * 0.2;
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  /* Pointer moves/releases are observed at the window level.
     This avoids relying on pointer capture surviving a 3D transform. */
  barrel.addEventListener('pointerdown', begin, { passive: false });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', finish, { passive: false });
  window.addEventListener('pointercancel', cancel, { passive: false });
  window.addEventListener('blur', cancel);

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
