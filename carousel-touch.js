/* Harris Portfolio: unified carousel physics for desktop + mobile. */
(() => {
  const stage = document.querySelector('.stage');
  const barrel = document.querySelector('#barrel');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const controls = document.querySelector('.controls');
  const dots = [...document.querySelectorAll('.dot')];
  if (!stage || !barrel) return;

  const STEP = 90;
  // Identical on desktop and mobile. This is deliberately gentle so the
  // release animation, rather than the pointer velocity, supplies the visible spin.
  const DRAG_GAIN = 0.41;
  const FRAME = 16.67;
  const DIRECTION_LOCK = 7;
  const MIN_RELEASE_SPEED = 0.04;

  // Physics are expressed in degrees/second. A critically-damped-ish spring
  // gives us a real rotating motion with a guaranteed finite stop at a card.
  const SPRING = 7.5;
  const DAMPING = 4.8;
  const BUTTON_SPEED = 230;
  const MAX_RELEASE_SPEED = 300;
  const MIN_SETTLE_TIME = 0.62;
  const MAX_SETTLE_TIME = 1.15;

  const zone = document.createElement('div');
  zone.className = 'carousel-touch-zone';
  zone.setAttribute('aria-hidden', 'true');
  Object.assign(zone.style, {
    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
    width: '90%', height: '430px', zIndex: '12', touchAction: 'pan-y',
    background: 'transparent', cursor: 'grab', userSelect: 'none',
    WebkitUserSelect: 'none', pointerEvents: 'auto'
  });
  stage.appendChild(zone);

  let angle = 0;
  let velocity = 0; // degrees/second
  let raf = 0;
  let gesture = 'idle';
  let activePointer = null;
  let startX = 0, startY = 0, lastX = 0, lastT = 0;
  let generation = 0;

  barrel.style.transition = 'none';
  barrel.style.pointerEvents = 'none';
  barrel.style.userSelect = 'none';
  barrel.style.webkitUserSelect = 'none';
  zone.style.height = window.innerWidth <= 560 ? '390px' : '430px';

  const normalize = n => ((n % 4) + 4) % 4;
  function render() {
    barrel.style.transform = `rotateY(${angle}deg)`;
    const index = normalize(Math.round(angle / STEP));
    dots.forEach((dot, i) => dot.classList.toggle('on', i === index));
  }

  function stopAnimation() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function invalidate() {
    generation++;
    stopAnimation();
  }

  // One continuous release animation. The target is locked at release. The
  // spring pulls the barrel toward that card while damping removes momentum.
  // There is no snap phase, no retargeting, and no second spin.
  function settleToCard(initialVelocity, target) {
    invalidate();
    const my = generation;
    let v = initialVelocity;
    let last = performance.now();
    const started = last;
    let stableFrames = 0;

    const tick = now => {
      if (my !== generation) return;
      const dt = Math.min(0.032, Math.max(0.008, (now - last) / 1000));
      last = now;

      const distance = target - angle;
      const absDistance = Math.abs(distance);
      const elapsed = (now - started) / 1000;

      // Spring acceleration toward the fixed card target plus damping against
      // current angular velocity. This naturally changes from spin to brake.
      const acceleration = (distance * SPRING) - (v * DAMPING);
      v += acceleration * dt;

      // Never allow a numerical overshoot to turn into a second spin.
      const step = v * dt;
      if (Math.abs(step) >= absDistance && absDistance > 0) {
        angle = target;
        velocity = 0;
        render();
        raf = 0;
        return;
      }

      angle += step;
      velocity = v;
      render();

      const remaining = Math.abs(target - angle);
      if (remaining < 0.10 && Math.abs(v) < 1.0) stableFrames++;
      else stableFrames = 0;

      // Require a genuinely settled state, then hard-zero once. This is the
      // only finalization step; it is not a visual snap animation.
      if ((stableFrames >= 3 && elapsed >= MIN_SETTLE_TIME) || elapsed >= MAX_SETTLE_TIME) {
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

    // Direct manipulation stays gentle and identical on both platforms.
    angle += dx * DRAG_GAIN;
    velocity = (dx * DRAG_GAIN / dt) * 1000;
    render();
  }

  function end(e) {
    if (!activePointer || e.pointerId !== activePointer) return;
    const horizontal = gesture === 'horizontal';
    const releaseVelocity = velocity;
    activePointer = null;
    gesture = 'idle';
    zone.style.cursor = 'grab';
    if (!horizontal) return;

    const direction = Math.sign(releaseVelocity);
    const current = Math.round(angle / STEP);
    const offset = angle - current * STEP;
    let targetIndex;

    // A swipe always has a clear directional destination. A nearly stationary
    // release simply chooses the nearest card. The target never changes later.
    if (direction && Math.abs(releaseVelocity) > MIN_RELEASE_SPEED * 1000) {
      targetIndex = direction > 0 ? Math.ceil(angle / STEP) : Math.floor(angle / STEP);
      if (targetIndex === current) targetIndex += direction;
    } else {
      targetIndex = Math.round(angle / STEP);
      if (Math.abs(offset) >= STEP / 2) targetIndex += Math.sign(offset);
    }

    const target = targetIndex * STEP;
    const initial = Math.sign(target - angle) * Math.min(MAX_RELEASE_SPEED, Math.max(45, Math.abs(releaseVelocity)));
    settleToCard(initial, target);
  }

  function cancel(e) {
    if (activePointer !== null && e?.pointerId !== undefined && e.pointerId !== activePointer) return;
    activePointer = null;
    gesture = 'idle';
    zone.style.cursor = 'grab';
    velocity = 0;
    render();
  }

  // One click = one complete 90-degree rotation. Button motion uses the same
  // spring/brake physics as a swipe, so it visibly turns the barrel rather than
  // simply changing the selected card.
  function rotateBy(direction) {
    invalidate();
    gesture = 'idle';
    activePointer = null;
    const current = Math.round(angle / STEP);
    const target = (current + direction) * STEP;
    settleToCard(direction * BUTTON_SPEED, target);
  }

  zone.addEventListener('pointerdown', begin, { passive: true });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', end, { passive: true });
  window.addEventListener('pointercancel', cancel, { passive: true });
  window.addEventListener('blur', cancel);
  prev?.addEventListener('click', e => { e.preventDefault(); rotateBy(-1); });
  next?.addEventListener('click', e => { e.preventDefault(); rotateBy(1); });
  window.addEventListener('resize', () => {
    zone.style.height = window.innerWidth <= 560 ? '390px' : '430px';
  });
  render();
})();
