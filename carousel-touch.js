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
  const BRAKE = 0.90;
  const MIN_SPEED = 0.010;
  const STOP_EPSILON = 0.05;
  const DIRECTION_LOCK = 7;

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

  // One finite release animation. The destination is locked once and the
  // velocity only decreases. There is no snap phase and no re-started spin.
  function brakeToCard(initialVelocity, target) {
    invalidate();
    const my = generation;
    let v = initialVelocity;
    let lastTime = performance.now();

    const tick = now => {
      if (my !== generation) return;
      const dt = Math.min(32, Math.max(8, now - lastTime));
      lastTime = now;
      const frame = dt / FRAME;
      const distance = target - angle;

      // Monotonic braking toward the locked target.
      v *= Math.pow(BRAKE, frame);
      const step = v * frame;

      // Never cross the chosen card. The final frame simply completes the
      // remaining rotational distance and kills velocity.
      if (Math.abs(step) >= Math.abs(distance)) {
        angle = target;
        velocity = 0;
        render();
        raf = 0;
        return;
      }

      angle += step;
      velocity = v;
      render();

      if (Math.abs(target - angle) <= STOP_EPSILON || Math.abs(v) <= MIN_SPEED) {
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
    const releaseVelocity = velocity;
    activePointer = null;
    gesture = 'idle';
    zone.style.cursor = 'grab';
    if (!wasHorizontal) return;

    const currentIndex = Math.round(angle / STEP);
    const offset = angle - currentIndex * STEP;
    const direction = Math.sign(releaseVelocity);
    let targetIndex = currentIndex;

    // Release always commits to exactly one adjacent card when the swipe has
    // meaningful velocity; otherwise it settles to the nearest card.
    if (direction !== 0 && Math.abs(releaseVelocity) > 0.12) {
      targetIndex = direction > 0
        ? Math.ceil(angle / STEP)
        : Math.floor(angle / STEP);
    } else if (Math.abs(offset) >= STEP / 2) {
      targetIndex += Math.sign(offset);
    }

    const target = targetIndex * STEP;
    const directionToTarget = Math.sign(target - angle);
    const speed = Math.min(1.4, Math.max(0.18, Math.abs(releaseVelocity)));
    brakeToCard(directionToTarget * speed, target);
  }

  function cancel(e) {
    if (activePointer !== null && e?.pointerId !== undefined && e.pointerId !== activePointer) return;
    activePointer = null;
    gesture = 'idle';
    zone.style.cursor = 'grab';
    velocity = 0;
    render();
  }

  // A button always performs exactly one full 90-degree barrel rotation.
  // It uses the same finite brake-to-stop animation as a swipe.
  function rotateBy(delta) {
    invalidate();
    gesture = 'idle';
    activePointer = null;
    const currentIndex = Math.round(angle / STEP);
    const target = (currentIndex + (delta > 0 ? 1 : -1)) * STEP;
    const distance = target - angle;
    const speed = Math.min(1.2, Math.max(0.72, Math.abs(distance) * 0.028));
    brakeToCard(Math.sign(distance) * speed, target);
  }

  zone.addEventListener('pointerdown', begin, { passive: true });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', end, { passive: true });
  window.addEventListener('pointercancel', cancel, { passive: true });
  window.addEventListener('blur', cancel);
  prev?.addEventListener('click', e => { e.preventDefault(); rotateBy(-STEP); });
  next?.addEventListener('click', e => { e.preventDefault(); rotateBy(STEP); });

  const resize = () => { zone.style.height = window.innerWidth <= 560 ? '390px' : '430px'; };
  window.addEventListener('resize', resize);
  render();
})();
