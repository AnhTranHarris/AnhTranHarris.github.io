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
  const DRAG_GAIN = 0.41;
  const FRAME = 16.67;
  const INERTIA_LIMIT = 2.8;
  const BRAKE_BASE = 0.965;
  const BRAKE_END = 0.86;
  const STOP_SPEED = 0.012;
  const STOP_DISTANCE = 0.08;
  const DIRECTION_LOCK = 7;
  const BUTTON_SPEED = 2.4;

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

  let angle = 0, velocity = 0, raf = 0, gesture = 'idle';
  let activePointer = null, startX = 0, startY = 0, lastX = 0, lastT = 0, generation = 0;

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
  function stopAnimation() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function invalidate() { generation++; stopAnimation(); }

  // Real inertial carousel motion: release retains a small amount of momentum,
  // then braking progressively increases as the locked card is approached.
  // The final arrival is part of the same animation, not a separate snap.
  function animateToCard(initialVelocity, target) {
    invalidate();
    const my = generation;
    let v = initialVelocity;
    let last = performance.now();

    const tick = now => {
      if (my !== generation) return;
      const dt = Math.min(32, Math.max(8, now - last));
      last = now;
      const frame = dt / FRAME;
      const distance = target - angle;
      const absDistance = Math.abs(distance);

      // Increase braking smoothly over the last half-card.
      const approach = Math.min(1, Math.max(0, 1 - absDistance / (STEP * 0.5)));
      const brake = BRAKE_BASE + (BRAKE_END - BRAKE_BASE) * approach;
      v *= Math.pow(brake, frame);

      // As the card gets close, use the remaining distance to shape the
      // deceleration. This creates a long, soft landing instead of a snap.
      if (absDistance < 24) {
        const desiredVelocity = distance * 0.055;
        const blend = 1 - absDistance / 24;
        v += (desiredVelocity - v) * (0.10 + blend * 0.18);
      }

      const step = v * frame;
      if (absDistance <= STOP_DISTANCE || Math.abs(step) >= absDistance) {
        angle = target;
        velocity = 0;
        render();
        raf = 0;
        return;
      }

      angle += step;
      velocity = v;
      render();

      if (Math.abs(v) <= STOP_SPEED && absDistance < 24) {
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
    gesture = 'pending'; activePointer = e.pointerId;
    startX = lastX = e.clientX; startY = e.clientY; lastT = performance.now(); velocity = 0;
    zone.style.cursor = 'grabbing';
  }

  function move(e) {
    if (!activePointer || e.pointerId !== activePointer || gesture === 'idle') return;
    const dxTotal = e.clientX - startX, dyTotal = e.clientY - startY;
    if (gesture === 'pending') {
      if (Math.hypot(dxTotal, dyTotal) < DIRECTION_LOCK) return;
      if (Math.abs(dyTotal) > Math.abs(dxTotal)) {
        gesture = 'vertical'; activePointer = null; zone.style.cursor = 'grab'; return;
      }
      gesture = 'horizontal';
    }
    if (gesture !== 'horizontal') return;
    e.preventDefault();
    const now = performance.now();
    const dx = e.clientX - lastX, dt = Math.max(8, now - lastT);
    lastX = e.clientX; lastT = now;
    angle += dx * DRAG_GAIN;
    velocity = (dx * DRAG_GAIN) / (dt / FRAME);
    render();
  }

  function end(e) {
    if (!activePointer || e.pointerId !== activePointer) return;
    const horizontal = gesture === 'horizontal';
    const releaseVelocity = velocity;
    activePointer = null; gesture = 'idle'; zone.style.cursor = 'grab';
    if (!horizontal) return;

    const current = Math.round(angle / STEP);
    const offset = angle - current * STEP;
    const direction = Math.sign(releaseVelocity);
    let targetIndex;

    // A real swipe carries into the adjacent card. A very slow release settles
    // to whichever card is actually nearest.
    if (direction && Math.abs(releaseVelocity) > 0.08) {
      targetIndex = direction > 0 ? Math.ceil(angle / STEP) : Math.floor(angle / STEP);
    } else {
      targetIndex = Math.round(angle / STEP);
    }

    // Never allow an already-nearby card target to become a zero-distance
    // release while momentum is still present.
    if (targetIndex === current && direction) targetIndex += direction;

    const target = targetIndex * STEP;
    const toTarget = Math.sign(target - angle);
    const speed = Math.min(INERTIA_LIMIT, Math.max(0.22, Math.abs(releaseVelocity)));
    animateToCard(toTarget * speed, target);
  }

  function cancel(e) {
    if (activePointer !== null && e?.pointerId !== undefined && e.pointerId !== activePointer) return;
    activePointer = null; gesture = 'idle'; zone.style.cursor = 'grab'; velocity = 0; render();
  }

  // Buttons are deliberately independent of current fractional angle. One
  // click always means one complete adjacent-card rotation.
  function rotateBy(direction) {
    invalidate(); gesture = 'idle'; activePointer = null;
    const current = Math.round(angle / STEP);
    const target = (current + direction) * STEP;
    animateToCard(direction * BUTTON_SPEED, target);
  }

  zone.addEventListener('pointerdown', begin, { passive: true });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', end, { passive: true });
  window.addEventListener('pointercancel', cancel, { passive: true });
  window.addEventListener('blur', cancel);
  prev?.addEventListener('click', e => { e.preventDefault(); rotateBy(-1); });
  next?.addEventListener('click', e => { e.preventDefault(); rotateBy(1); });
  window.addEventListener('resize', () => { zone.style.height = window.innerWidth <= 560 ? '390px' : '430px'; });
  render();
})();
