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
  const DRAG_GAIN = 1.0;
  const FRAME = 16.67;
  const BRAKE = 0.965;
  const STOP_VELOCITY = 0.018;
  const STOP_DISTANCE = 0.28;
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

  // Continuous braking stop: no snap animation. The barrel behaves like a tire
  // with brakes being progressively applied, while a tiny final steering force
  // lets it settle naturally on the nearest card.
  function stopNaturally() {
    invalidate();
    const my = generation;
    const nearest = Math.round(angle / STEP) * STEP;
    let v = velocity;

    const tick = () => {
      if (my !== generation) return;
      const distance = nearest - angle;
      const proximity = Math.min(1, Math.abs(distance) / STEP);
      const brake = BRAKE - (0.035 * (1 - proximity));
      v *= brake;

      if (Math.abs(v) < STOP_VELOCITY * 2 && Math.abs(distance) > STOP_DISTANCE) {
        v += distance * 0.004;
      }

      angle += v;
      render();

      if (Math.abs(distance) <= STOP_DISTANCE && Math.abs(v) <= STOP_VELOCITY) {
        angle = nearest;
        velocity = 0;
        render();
        raf = 0;
        return;
      }

      velocity = v;
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
    velocity = v;
    stopNaturally();
  }

  function cancel(e) {
    if (activePointer !== null && e?.pointerId !== undefined && e.pointerId !== activePointer) return;
    activePointer = null;
    gesture = 'idle';
    velocity = 0;
    zone.style.cursor = 'grab';
    stopNaturally();
  }

  function rotateBy(delta) {
    invalidate();
    gesture = 'idle';
    activePointer = null;
    const my = generation;
    const target = Math.round(angle / STEP) * STEP + delta;
    let v = (target - angle) * 0.08;
    const tick = () => {
      if (my !== generation) return;
      const d = target - angle;
      v = v * 0.94 + d * 0.025;
      angle += v;
      render();
      if (Math.abs(d) < STOP_DISTANCE && Math.abs(v) < STOP_VELOCITY) {
        angle = target;
        render();
        raf = 0;
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
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
