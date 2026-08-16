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
  const DRAG_GAIN = 0.41;
  const FRAME = 16.67;
  const MIN_SPEED = 0.012;
  const STOP_EPSILON = 0.04;
  const DIRECTION_LOCK = 7;
  const RELEASE_BOOST = 1.15;
  const BRAKE = 0.94;
  const FINAL_BRAKE = 0.78;
  const FINAL_WINDOW = 18;
  const BUTTON_SPEED = 2.0;

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

  // Single finite physics pass: retain release momentum, apply progressive
  // braking, then gently damp into one exact card angle. No second snap pass.
  function settleToCard(initialVelocity, target) {
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
      if (absDistance <= STOP_EPSILON) {
        angle = target; velocity = 0; render(); raf = 0; return;
      }

      const finalProgress = Math.max(0, 1 - absDistance / FINAL_WINDOW);
      const brake = BRAKE + (FINAL_BRAKE - BRAKE) * finalProgress;
      v *= Math.pow(brake, frame);

      if (absDistance < FINAL_WINDOW) {
        const desired = distance * 0.065;
        v += (desired - v) * (0.10 + finalProgress * 0.20);
      }

      let step = v * frame;
      if (Math.abs(step) >= absDistance) step = distance;
      angle += step;
      velocity = v;
      render();

      if (Math.abs(target - angle) <= STOP_EPSILON ||
          (Math.abs(v) <= MIN_SPEED && absDistance < FINAL_WINDOW)) {
        angle = target; velocity = 0; render(); raf = 0; return;
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
    startX = lastX = e.clientX; startY = e.clientY; lastT = performance.now();
    velocity = 0; zone.style.cursor = 'grabbing';
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

    const direction = Math.sign(releaseVelocity);
    const nearest = Math.round(angle / STEP);
    const fraction = angle - nearest * STEP;
    let targetIndex = nearest;

    if (direction && Math.abs(releaseVelocity) > 0.08) {
      targetIndex = direction > 0 ? Math.ceil(angle / STEP) : Math.floor(angle / STEP);
      if (targetIndex === nearest) targetIndex += direction;
    } else if (Math.abs(fraction) > STEP / 2) {
      targetIndex += Math.sign(fraction);
    }

    const target = targetIndex * STEP;
    const toTarget = Math.sign(target - angle);
    const momentum = Math.min(2.4, Math.max(0.35, Math.abs(releaseVelocity) * RELEASE_BOOST));
    settleToCard(toTarget * momentum, target);
  }

  function cancel(e) {
    if (activePointer !== null && e?.pointerId !== undefined && e.pointerId !== activePointer) return;
    activePointer = null; gesture = 'idle'; zone.style.cursor = 'grab';
    velocity = 0; render();
  }

  function rotateBy(direction) {
    invalidate(); gesture = 'idle'; activePointer = null;
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
  window.addEventListener('resize', () => { zone.style.height = window.innerWidth <= 560 ? '390px' : '430px'; });
  render();
})();
