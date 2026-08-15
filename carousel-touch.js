/* Harris Portfolio: card-local carousel controller.
   The stage is used only as a stable hit-test surface because CSS 3D faces can
   become unreliable pointer targets at exact quarter-turns. The gesture is
   accepted only when it begins inside the currently visible card. */
(() => {
  const stage = document.querySelector('.stage');
  const barrel = document.querySelector('#barrel');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const controls = document.querySelector('.controls');
  const pages = [...document.querySelectorAll('.page')];
  const dots = [...document.querySelectorAll('.dot')];
  if (!stage || !barrel) return;

  const STEP = 90;
  const DRAG_GAIN = 1.08;
  const FRICTION = 0.94;
  const HIT_PADDING = 14;
  let angle = 0;
  let velocity = 0;
  let raf = 0;
  let dragging = false;
  let activePointer = null;
  let lastX = 0;
  let lastT = 0;
  let generation = 0;
  let moved = false;

  barrel.style.transition = 'none';
  barrel.style.touchAction = 'none';
  barrel.style.userSelect = 'none';
  barrel.style.webkitUserSelect = 'none';
  barrel.style.cursor = 'grab';

  const normalizeIndex = n => ((n % 4) + 4) % 4;
  const frontIndex = () => normalizeIndex(-Math.round(angle / STEP));

  function pointInside(rect, x, y) {
    return x >= rect.left - HIT_PADDING && x <= rect.right + HIT_PADDING &&
           y >= rect.top - HIT_PADDING && y <= rect.bottom + HIT_PADDING;
  }

  function beganOnVisibleCard(e) {
    if (controls && controls.contains(e.target)) return false;
    if (e.target.closest?.('a,button,input,textarea,select')) return false;

    const front = pages[frontIndex()];
    if (front) {
      const rect = front.getBoundingClientRect();
      if (rect.width > 8 && rect.height > 8 && pointInside(rect, e.clientX, e.clientY)) return true;
    }

    // During the few frames between 3D positions, accept a touch on any page
    // that the browser successfully hit-tests. This keeps the interaction local.
    return !!e.target.closest?.('.page');
  }

  const render = () => {
    barrel.style.transform = `rotateY(${angle}deg)`;
    const index = normalizeIndex(Math.round(angle / STEP));
    dots.forEach((dot, i) => dot.classList.toggle('on', i === index));
  };

  const stopAnimation = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  };

  function resetGesture() {
    dragging = false;
    activePointer = null;
    velocity = 0;
    moved = false;
    barrel.style.cursor = 'grab';
  }

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
    if (!beganOnVisibleCard(e)) return;

    generation++;
    stopAnimation();
    dragging = true;
    activePointer = e.pointerId;
    lastX = e.clientX;
    lastT = performance.now();
    velocity = 0;
    moved = false;
    barrel.style.cursor = 'grabbing';
  }

  function move(e) {
    if (!dragging || e.pointerId !== activePointer) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(8, now - lastT);
    lastX = e.clientX;
    lastT = now;

    if (Math.abs(dx) > 0.5) moved = true;
    angle += dx * DRAG_GAIN;
    velocity = (dx * DRAG_GAIN) / (dt / 16.67);
    render();
    e.preventDefault();
  }

  function finish(e) {
    if (!dragging || e.pointerId !== activePointer) return;
    const releaseVelocity = velocity;
    resetGesture();
    if (moved && Math.abs(releaseVelocity) > 0.12) momentum(releaseVelocity);
    else snap();
  }

  function cancel() {
    if (!dragging) return;
    resetGesture();
    snap();
  }

  function rotateBy(delta) {
    resetGesture();
    stopAnimation();
    const myGeneration = ++generation;
    const target = Math.round(angle / STEP) * STEP + delta;
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

  // Stable, untransformed stage receives the initial hit test. Movement and
  // release are global so the gesture survives the barrel moving underneath it.
  stage.addEventListener('pointerdown', begin, { passive: true });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', finish, { passive: false });
  window.addEventListener('pointercancel', cancel, { passive: false });
  window.addEventListener('blur', cancel);

  prev?.addEventListener('click', e => { e.preventDefault(); rotateBy(-STEP); });
  next?.addEventListener('click', e => { e.preventDefault(); rotateBy(STEP); });

  render();
})();
