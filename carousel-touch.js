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
  const DRAG_GAIN = 0.82;
  const FRAME = 16.67;
  const BRAKE_START = 0.965;
  const BRAKE_END = 0.82;
  const MIN_SPEED = 0.012;
  const STOP_DISTANCE = 0.08;
  const DIRECTION_LOCK = 7;
  const ARRIVAL_WINDOW = 28;
  const ARRIVAL_GAIN = 0.055;

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

  // One continuous post-release animation: velocity is progressively braked,
  // while the remaining distance to the nearest 90-degree card continuously
  // influences the braking. There is no second animation and no re-start.
  function brakeToCard(initialVelocity) {
    invalidate();
    const my = generation;
    const target = Math.round(angle / STEP) * STEP;
    let v = initialVelocity;
    let lastTime = performance.now();

    const tick = now => {
      if (my !== generation) return;
      const dt = Math.min(32, Math.max(8, now - lastTime));
      lastTime = now;
      const distance = target - angle;
      const absDistance = Math.abs(distance);

      // Stronger braking as the remaining distance shrinks. This is the only
      // mechanism that changes velocity after release; there is no snap phase.
      const progress = Math.min(1, Math.max(0, 1 - absDistance / (STEP * 0.5)));
      const brake = BRAKE_START + (BRAKE_END - BRAKE_START) * progress;
      const frameFactor = dt / FRAME;
      v *= Math.pow(brake, frameFactor);

      // In the final approach window, continuously steer the current velocity
      // toward the exact remaining card distance. This prevents stopping short
      // or crossing the card and then having to restart motion.
      if (absDistance < ARRIVAL_WINDOW) {
        const desired = distance * ARRIVAL_GAIN;
        const blend = 1 - Math.max(0, absDistance / ARRIVAL_WINDOW);
        v += (desired - v) * (0.08 + blend * 0.10);
      }

      // Hard dead-stop only after the continuous braking path has arrived.
      if (absDistance <= STOP_DISTANCE && Math.abs(v) <= MIN_SPEED) {
        angle = target;
        velocity = 0;
        render();
        raf = 0;
        return;
      }

      angle += v * frameFactor;
      velocity = v;
      render();

      // If braking has nearly killed the motion, finish the remaining fraction
      // as part of the same brake path instead of allowing a second spin cycle.
      if (Math.abs(v) <= MIN_SPEED) {
        const remaining = target - angle;
        if (Math.abs(remaining) <= STOP_DISTANCE) {
          angle = target;
          velocity = 0;
          render();
          raf = 0;
          return;
        }
        v = remaining * 0.045;
        velocity = v;
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

  function rotateBy(delta) {
    invalidate();
    gesture = 'idle';
    activePointer = null;
    const target = Math.round(angle / STEP) * STEP + delta;
    const initial = (target - angle) * 0.07;
    brakeToCard(initial);
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
