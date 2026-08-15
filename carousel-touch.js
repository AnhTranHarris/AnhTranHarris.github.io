/* Harris Portfolio: stable 2D touch surface + 3D visual barrel.
   Natural drag + inertial drift, then a soft settle to the nearest card. */
(() => {
  const stage = document.querySelector('.stage');
  const barrel = document.querySelector('#barrel');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const controls = document.querySelector('.controls');
  const dots = [...document.querySelectorAll('.dot')];
  if (!stage || !barrel) return;

  const STEP = 90;
  const DRAG_GAIN = 1.18;
  const FRAME_MS = 16.67;
  const FRICTION = 0.965;
  const MIN_DRIFT = 0.035;
  const SNAP_EASE = 0.105;
  const SNAP_STOP = 0.045;

  const zone = document.createElement('div');
  zone.className = 'carousel-touch-zone';
  zone.setAttribute('aria-hidden', 'true');
  Object.assign(zone.style, {
    position: 'absolute', left: '50%', top: '50%',
    transform: 'translate(-50%, -50%)', width: '90%', height: '430px',
    zIndex: '12', touchAction: 'none', background: 'transparent',
    cursor: 'grab', userSelect: 'none', WebkitUserSelect: 'none',
    pointerEvents: 'auto'
  });
  stage.appendChild(zone);

  let angle = 0;
  let velocity = 0;
  let raf = 0;
  let dragging = false;
  let activePointer = null;
  let lastX = 0;
  let lastT = 0;
  let moved = false;
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

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  function reset() {
    dragging = false;
    activePointer = null;
    velocity = 0;
    moved = false;
    zone.style.cursor = 'grab';
  }

  function snap() {
    stop();
    const my = ++generation;
    const target = Math.round(angle / STEP) * STEP;
    const tick = () => {
      if (my !== generation) return;
      const d = target - angle;
      if (Math.abs(d) < SNAP_STOP) {
        angle = target;
        render();
        raf = 0;
        return;
      }
      angle += d * SNAP_EASE;
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function momentum(v) {
    stop();
    const my = ++generation;
    velocity = v;
    const tick = () => {
      if (my !== generation) return;
      angle += velocity;
      velocity *= FRICTION;
      render();
      if (Math.abs(velocity) < MIN_DRIFT) {
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
    if (controls && controls.contains(e.target)) return;
    stop();
    generation++;
    dragging = true;
    activePointer = e.pointerId;
    lastX = e.clientX;
    lastT = performance.now();
    velocity = 0;
    moved = false;
    zone.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function move(e) {
    if (!dragging || e.pointerId !== activePointer) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const dt = Math.max(8, now - lastT);
    lastX = e.clientX;
    lastT = now;
    if (Math.abs(dx) > 0.35) moved = true;
    angle += dx * DRAG_GAIN;
    velocity = (dx * DRAG_GAIN) / (dt / FRAME_MS);
    render();
    e.preventDefault();
  }

  function end(e) {
    if (!dragging || e.pointerId !== activePointer) return;
    const v = velocity;
    reset();
    if (moved && Math.abs(v) > 0.10) momentum(v); else snap();
  }

  function cancel() {
    if (!dragging) return;
    reset();
    snap();
  }

  function rotateBy(delta) {
    reset();
    stop();
    const my = ++generation;
    const target = Math.round(angle / STEP) * STEP + delta;
    const tick = () => {
      if (my !== generation) return;
      const d = target - angle;
      if (Math.abs(d) < SNAP_STOP) {
        angle = target;
        render();
        raf = 0;
        return;
      }
      angle += d * 0.12;
      render();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  zone.addEventListener('pointerdown', begin, { passive: false });
  window.addEventListener('pointermove', move, { passive: false });
  window.addEventListener('pointerup', end, { passive: false });
  window.addEventListener('pointercancel', cancel, { passive: false });
  window.addEventListener('blur', cancel);
  prev?.addEventListener('click', e => { e.preventDefault(); rotateBy(-STEP); });
  next?.addEventListener('click', e => { e.preventDefault(); rotateBy(STEP); });

  const resize = () => { zone.style.height = window.innerWidth <= 560 ? '390px' : '430px'; };
  window.addEventListener('resize', resize);
  render();
})();
