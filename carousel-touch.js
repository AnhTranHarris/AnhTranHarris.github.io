/* Harris Portfolio: local horizontal carousel + native vertical page scrolling. */
(() => {
  const stage = document.querySelector('.stage');
  const barrel = document.querySelector('#barrel');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const controls = document.querySelector('.controls');
  const dots = [...document.querySelectorAll('.dot')];
  if (!stage || !barrel) return;

  const STEP = 90;
  // Same interaction scale on mobile and desktop; intentionally half the
  // previous direct swipe response so one gesture cannot whip past cards.
  const DRAG_GAIN = 0.41;
  const FRAME = 16.67;
  const MIN_SPEED = 0.010;
  const STOP_DISTANCE = 0.06;
  const DIRECTION_LOCK = 7;
  const APPROACH_WINDOW = 24;
  const BRAKE_MIN = 0.84;
  const BRAKE_MAX = 0.93;
  const APPROACH_GAIN = 0.045;

  const zone = document.createElement('div');
  zone.className = 'carousel-touch-zone';
  zone.setAttribute('aria-hidden', 'true');
  Object.assign(zone.style, {
    position: 'absolute', left: '50%', top: '50%',
    transform: 'translate(-50%, -50%)', width: '90%', height: '430px',
    zIndex: '12', touchAction: 'pan-y', background: 'transparent',
    cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none',
    pointerEvents: 'auto'
  });
  stage.appendChild(zone);

  let angle = 0;
  let velocity = 0;
  let raf = 0;
  let gesture = 'idle';
  let activePointer = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastT = 0;
  let generation = 0;

  barrel.style.transition = 'none';
  barrel.style.pointerEvents = 'none';
  barrel.style.userSelect = 'none';
  barrel.style.webkitUserSelect = 'none';
  zone.style.height = window.innerWidth <= 560 ? '390px' : '430px';

  const normalize = n => ((n % 4) + 4) % 4;
  const render = () => {
    barrel.style.transform = `rotateY(${angle}deg)`;
    const index = normalize(Math.round(angle / STEP));
    dots.forEach((dot, i) => dot.classList.toggle('on', i === index));
  };

  function stopAnimation() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function invalidate() {
    generation++;
    stopAnimation();
  }

  // One and only one post-release animation. It brakes toward a single
  // computed card target and ends at exactly that target with zero velocity.
  function brakeToCard(initialVelocity, explicitTarget = null) {
    invalidate();
    const my = generation;
    const target = explicitTarget === null
      ? Math.round(angle / STEP) * STEP
      : explicitTarget;
    let v = initialVelocity;
    let lastTime = performance.now();

    const tick = now => {
      if (my !== generation) return;
      const dt = Math.min(32, Math.max(8, now - lastTime));
      lastTime = now;
      const distance = target - angle;
      const absDistance = Math.abs(distance);

      // Stronger braking near the destination, but never enough to reverse
      // direction. The target is chosen once, so the carousel cannot jump to
      // card 1 or card 4 because rounding changes during the animation.
      const proximity = Math.min(1, absDistance / STEP);
      const brake = BRAKE_MIN + (BRAKE_MAX - BRAKE_MIN) * proximity;
      const frameFactor = dt / FRAME;
      v *= Math.pow(brake, frameFactor);

      // Final approach: continuously reduce velocity toward the exact remaining
      // distance. This is braking guidance, not a second snap animation.
      if (absDistance < APPROACH_WINDOW) {
        const desired = distance * APPROACH_GAIN;
        const blend = 1 - absDistance / APPROACH_WINDOW;
        v += (desired - v) * (0.12 + blend * 0.16);
      }

      // Never let inertia carry the barrel through its chosen card target.
      if (Math.abs(v * frameFactor) > absDistance && absDistance > STOP_DISTANCE) {
        v = distance / frameFactor;
      }

      angle += v * frameFactor;
      velocity = v;
      render();

      const remaining = target - angle;
      if (Math.abs(remaining) <= STOP_DISTANCE || Math.abs(v) <= MIN_SPEED && absDistance < APPROACH_WINDOW) {
        angle = target;
        velocity = 0;
        render();
        raf = 0;
        return;
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
  }

  function begin(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (controls && controls.contains(e.target)) return;
    invalidate();
    gesture = 'pending';
    activePointer = e.pointerId;
    startX = lastX = e.clientX;
    startY = e.clientY;
    lastT = performance.now();
    velocity = 0;
    zone.style.cursor = 'grabbing';
  }

  function move(e) {
    if (!activePointer || e.pointerId !== activePointer || gesture === 'idle') return;
    const dxTotal = e.clientX - startX;
    const dyTotal = e.clientY - startY;

    if (gesture === 'pending') {
      if (Math.hypot(dxTotal, dyTotal) < DIRECTION_LOCK) return;
      if (Math.abs(dyTotal) > Math.abs(dxTotal)) {
        gesture = 'vertical';
        activePointer = null;
        zone.style.cursor = 'grab';
        return;
      }
      gesture = 'horizontal';
    }

    if (gesture !== 'horizontal') return;
    e.preventDefault();
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(8, now - lastT);
    lastX = e.clientX;
    lastT = now;
    angle += dx * DRAG_GAIN;
    velocity = (dx * DRAG_GAIN) / (dt / FRAME);
    render();
  }

  function end(e) {
    if (!activePointer || e.pointerId !== activePointer) return;
    const wasHorizontal = gesture === 'horizontal';
    const v = velocity;
    activePointer = null;
    gesture = 'idle';
    zone.style.cursor = 'grab';
    if (!wasHorizontal) return;
    brakeToCard(v);
  }

  function cancel(e) {
    if (activePointer !== null && e?.pointerId !== undefined && e.pointerId !== activePointer) return;
    activePointer = null;
    gesture = 'idle';
    zone.style.cursor = 'grab';
    if (Math.abs(velocity) > MIN_SPEED) brakeToCard(velocity);
    else {
      velocity = 0;
      render();
    }
  }

  // Buttons use the exact same continuous rotation model as a swipe, but with
  // a fixed adjacent-card target. They no longer jump/snap the next card in.
  function rotateBy(delta) {
    invalidate();
    gesture = 'idle';
    activePointer = null;
    const currentCard = Math.round(angle / STEP);
    const target = (currentCard * STEP) + delta;
    const direction = delta < 0 ? -1 : 1;
    const distance = target - angle;
    // Gentle initial button motion, then the same braking controller finishes it.
    const initialVelocity = direction * Math.min(2.2, Math.max(0.8, Math.abs(distance) * 0.035));
    brakeToCard(initialVelocity, target);
  }

  zone.addEventListener('pointerdown', begin, { passive: true });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', end, { passive: true });
  window.addEventListener('pointercancel', cancel, { passive: true });
  window.addEventListener('blur', () => cancel());
  prev?.addEventListener('click', e => { e.preventDefault(); rotateBy(-STEP); });
  next?.addEventListener('click', e => { e.preventDefault(); rotateBy(STEP); });

  const resize = () => { zone.style.height = window.innerWidth <= 560 ? '390px' : '430px'; };
  window.addEventListener('resize', resize);
  render();
})();
