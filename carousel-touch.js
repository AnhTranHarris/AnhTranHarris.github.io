/* Harris Portfolio: five-card carousel interaction + responsive geometry. */
(() => {
  const stage = document.querySelector('.stage');
  const barrel = document.querySelector('#barrel');
  if (!stage || !barrel) return;

  const pages = [...barrel.querySelectorAll('.page')];
  const dots = [...document.querySelectorAll('.dot')];
  const CARD_COUNT = pages.length;
  const STEP = 360 / CARD_COUNT;

  const DRAG_GAIN = .41;
  const DIRECTION_LOCK = 7;
  const MIN_RELEASE_SPEED = 40;
  const SPRING = 7.5;
  const DAMPING = 4.8;
  const BUTTON_SPEED = 230;
  const MAX_RELEASE_SPEED = 300;
  const MIN_SETTLE_TIME = .62;
  const MAX_SETTLE_TIME = 1.15;

  const zone = document.createElement('div');
  zone.className = 'carousel-touch-zone';
  zone.setAttribute('aria-hidden', 'true');
  Object.assign(zone.style, {
    position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
    zIndex:'12', touchAction:'pan-y', background:'transparent', cursor:'grab',
    userSelect:'none', WebkitUserSelect:'none', pointerEvents:'auto'
  });
  stage.appendChild(zone);

  barrel.style.transition = 'none';
  barrel.style.pointerEvents = 'none';
  barrel.style.userSelect = 'none';
  barrel.style.webkitUserSelect = 'none';

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
  let geometryRaf = 0;

  const normalize = n => ((n % CARD_COUNT) + CARD_COUNT) % CARD_COUNT;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function syncGeometry() {
    if (geometryRaf) cancelAnimationFrame(geometryRaf);
    geometryRaf = requestAnimationFrame(() => {
      geometryRaf = 0;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const width = window.innerWidth;

      if (width <= 560) {
        const cardHeight = clamp(viewportHeight * .54, 350, 390);
        barrel.style.height = `${Math.round(cardHeight)}px`;
        stage.style.height = `${Math.round(cardHeight + 110)}px`;
        stage.style.minHeight = `${Math.round(cardHeight + 110)}px`;
      } else if (width <= 900) {
        const cardHeight = clamp(viewportHeight * .56, 390, 430);
        barrel.style.height = `${Math.round(cardHeight)}px`;
        stage.style.height = `${Math.round(cardHeight + 100)}px`;
        stage.style.minHeight = `${Math.round(cardHeight + 100)}px`;
      } else {
        barrel.style.height = '';
        stage.style.height = '';
        stage.style.minHeight = '';
      }

      const cardWidth = pages[0]?.offsetWidth || barrel.offsetWidth;
      if (cardWidth > 0) {
        const radius = cardWidth / (2 * Math.tan(Math.PI / CARD_COUNT));
        document.documentElement.style.setProperty('--radius', `${radius.toFixed(2)}px`);
        zone.style.width = `${Math.ceil(cardWidth)}px`;
      }
      zone.style.height = `${Math.ceil(barrel.offsetHeight)}px`;
    });
  }

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

  function settleToCard(initialVelocity, target) {
    invalidate();
    const myGeneration = generation;
    let v = initialVelocity;
    let last = performance.now();
    const started = last;
    let stableFrames = 0;

    const tick = now => {
      if (myGeneration !== generation) return;
      const dt = Math.min(.032, Math.max(.008, (now - last) / 1000));
      last = now;
      const distance = target - angle;
      const absDistance = Math.abs(distance);
      const elapsed = (now - started) / 1000;

      v += ((distance * SPRING) - (v * DAMPING)) * dt;
      const step = v * dt;

      if (absDistance > 0 && Math.abs(step) >= absDistance) {
        angle = target;
        velocity = 0;
        render();
        raf = 0;
        return;
      }

      angle += step;
      velocity = v;
      render();

      if (Math.abs(target - angle) < .1 && Math.abs(v) < 1) stableFrames++;
      else stableFrames = 0;

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

  function releasePointer(pointerId) {
    if (pointerId == null) return;
    try {
      if (zone.hasPointerCapture?.(pointerId)) zone.releasePointerCapture(pointerId);
    } catch (_) {}
  }

  function resetGesture(pointerId = activePointer) {
    releasePointer(pointerId);
    activePointer = null;
    gesture = 'idle';
    zone.style.cursor = 'grab';
  }

  function begin(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    invalidate();
    activePointer = e.pointerId;
    gesture = 'pending';
    startX = lastX = e.clientX;
    startY = e.clientY;
    lastT = performance.now();
    velocity = 0;
    zone.style.cursor = 'grabbing';

    try { zone.setPointerCapture?.(e.pointerId); } catch (_) {}
  }

  function move(e) {
    if (activePointer === null || e.pointerId !== activePointer || gesture === 'idle') return;

    const dxTotal = e.clientX - startX;
    const dyTotal = e.clientY - startY;

    if (gesture === 'pending') {
      if (Math.hypot(dxTotal, dyTotal) < DIRECTION_LOCK) return;

      if (Math.abs(dyTotal) > Math.abs(dxTotal)) {
        // Give vertical gestures back to the browser immediately. Because the
        // zone uses touch-action: pan-y, native page scrolling remains active.
        gesture = 'vertical';
        releasePointer(e.pointerId);
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
    velocity = (dx * DRAG_GAIN / dt) * 1000;
    render();
  }

  function finishHorizontal(releaseVelocity) {
    const direction = Math.sign(releaseVelocity);
    const current = Math.round(angle / STEP);
    const offset = angle - current * STEP;
    let targetIndex;

    if (direction && Math.abs(releaseVelocity) > MIN_RELEASE_SPEED) {
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

  function end(e) {
    if (activePointer === null || e.pointerId !== activePointer) return;
    const wasHorizontal = gesture === 'horizontal';
    const releaseVelocity = velocity;
    resetGesture(e.pointerId);
    if (wasHorizontal) finishHorizontal(releaseVelocity);
  }

  function cancel(e) {
    if (activePointer !== null && e?.pointerId != null && e.pointerId !== activePointer) return;
    resetGesture(e?.pointerId ?? activePointer);
    velocity = 0;
    render();
  }

  function rotateBy(direction) {
    invalidate();
    resetGesture();
    const target = (Math.round(angle / STEP) + direction) * STEP;
    settleToCard(direction * BUTTON_SPEED, target);
  }

  zone.addEventListener('pointerdown', begin, {passive:true});
  zone.addEventListener('pointermove', move, {passive:false});
  zone.addEventListener('pointerup', end, {passive:true});
  zone.addEventListener('pointercancel', cancel, {passive:true});
  zone.addEventListener('lostpointercapture', e => {
    if (activePointer === e.pointerId && gesture !== 'vertical') cancel(e);
  });
  window.addEventListener('blur', cancel);

  document.querySelectorAll('[data-dir]').forEach(control => {
    const direction = Number(control.dataset.dir);
    const run = e => {
      e.preventDefault();
      e.stopPropagation();
      rotateBy(direction);
    };
    control.addEventListener('click', run);
    control.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') run(e);
    });
  });

  window.addEventListener('resize', syncGeometry, {passive:true});
  window.addEventListener('orientationchange', syncGeometry, {passive:true});
  window.visualViewport?.addEventListener('resize', syncGeometry, {passive:true});
  if ('ResizeObserver' in window) new ResizeObserver(syncGeometry).observe(barrel);

  syncGeometry();
  render();
})();
