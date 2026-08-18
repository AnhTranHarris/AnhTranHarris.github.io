/* Harris Portfolio: five-card carousel interaction + responsive geometry + fallback. */
(() => {
  const stage = document.querySelector('.stage');
  const barrel = document.querySelector('#barrel');
  if (!stage || !barrel) return;

  const pages = [...barrel.querySelectorAll('.page')];
  const dots = [...document.querySelectorAll('.dot')];
  const ambient = document.querySelector('.ambient');
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
  const AMBIENT_MIN_SECONDS = 15;
  const AMBIENT_MAX_SECONDS = 200;
  const CARD_HEIGHT_SCALE = 1.15;

  const supports3D = !!(window.CSS?.supports?.('transform-style', 'preserve-3d') && window.CSS?.supports?.('perspective', '1px'));
  const supportsPointers = 'PointerEvent' in window;
  const fallbackMode = !supports3D || !supportsPointers || !window.requestAnimationFrame;

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
  let zone = null;
  let ambientAnimation = null;
  let lastAmbientStart = -1;

  const normalize = n => ((n % CARD_COUNT) + CARD_COUNT) % CARD_COUNT;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function setDot(index) {
    dots.forEach((dot, i) => dot.classList.toggle('on', i === normalize(index)));
  }

  const AMBIENT_STARTS = [
    [-14,-10], [0,-13], [14,-10],
    [-16,0],   [0,0],   [16,0],
    [-15,11],  [0,13],  [15,11],
    [-8,-3],   [9,4],   [-4,8]
  ];

  function randomAmbientSeconds() {
    return AMBIENT_MIN_SECONDS + Math.random() * (AMBIENT_MAX_SECONDS - AMBIENT_MIN_SECONDS);
  }

  function chooseAmbientStart() {
    if (AMBIENT_STARTS.length < 2) return 0;
    let index;
    do index = Math.floor(Math.random() * AMBIENT_STARTS.length);
    while (index === lastAmbientStart);
    lastAmbientStart = index;
    return index;
  }

  function startAmbientCycle() {
    if (!ambient || document.documentElement.matches?.(':has(body)') === false) return;
    const startIndex = chooseAmbientStart();
    const [sx, sy] = AMBIENT_STARTS[startIndex];
    const duration = randomAmbientSeconds() * 1000;
    const ex = clamp(sx + (-18 + Math.random() * 36), -18, 18);
    const ey = clamp(sy + (-16 + Math.random() * 32), -16, 16);
    const mx = (sx + ex) / 2 + (-5 + Math.random() * 10);
    const my = (sy + ey) / 2 + (-4 + Math.random() * 8);
    const s0 = .94 + Math.random() * .08;
    const s1 = 1.04 + Math.random() * .12;
    const s2 = .98 + Math.random() * .10;

    ambientAnimation?.cancel();
    ambient.style.animation = 'none';

    if (ambient.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ambientAnimation = ambient.animate([
        {transform:`translate3d(${sx}%,${sy}%,0) scale(${s0})`, opacity:0, offset:0},
        {transform:`translate3d(${sx * .72 + mx * .28}%,${sy * .72 + my * .28}%,0) scale(${(s0+s1)/2})`, opacity:.48, offset:.16},
        {transform:`translate3d(${mx}%,${my}%,0) scale(${s1})`, opacity:1, offset:.40},
        {transform:`translate3d(${mx * .55 + ex * .45}%,${my * .55 + ey * .45}%,0) scale(${(s1+s2)/2})`, opacity:.64, offset:.58},
        {transform:`translate3d(${ex}%,${ey}%,0) scale(${s2})`, opacity:.16, offset:.82},
        {transform:`translate3d(${ex}%,${ey}%,0) scale(${s2})`, opacity:0, offset:1}
      ], {duration,easing:'ease-in-out',fill:'forwards'});
      ambientAnimation.onfinish = () => { if (!document.hidden) startAmbientCycle(); };
    } else {
      ambient.style.opacity = '.55';
    }
  }

  function syncAmbientPlayback() {
    if (!ambientAnimation) {
      if (!document.hidden) startAmbientCycle();
      return;
    }
    if (document.hidden) ambientAnimation.pause();
    else ambientAnimation.play();
  }

  if (ambient) {
    startAmbientCycle();
    document.addEventListener('visibilitychange', syncAmbientPlayback, {passive:true});
    window.addEventListener('pageshow', syncAmbientPlayback, {passive:true});
    window.addEventListener('pagehide', () => ambientAnimation?.pause(), {passive:true});
  }

  function enableFallback() {
    document.documentElement.classList.add('carousel-fallback');
    stage.style.perspective = 'none';
    stage.style.overflow = 'hidden';
    Object.assign(barrel.style, {
      display:'flex', gap:'18px', width:'100%', maxWidth:'610px', height:'auto',
      minHeight:`${Math.round(350 * CARD_HEIGHT_SCALE)}px`, overflowX:'auto', overflowY:'hidden', transform:'none',
      transformStyle:'flat', scrollSnapType:'x mandatory', scrollBehavior:'smooth',
      WebkitOverflowScrolling:'touch', touchAction:'pan-x pan-y', overscrollBehaviorX:'contain',
      pointerEvents:'auto', userSelect:'auto', WebkitUserSelect:'auto', scrollbarWidth:'none'
    });
    pages.forEach(page => Object.assign(page.style, {
      position:'relative', inset:'auto', left:'auto', right:'auto', transform:'none',
      flex:'0 0 90%', width:'90%', height:'auto', minHeight:`${Math.round(350 * CARD_HEIGHT_SCALE)}px`,
      scrollSnapAlign:'center', scrollSnapStop:'always', backfaceVisibility:'visible',
      WebkitBackfaceVisibility:'visible'
    }));
    const updateFallbackDot = () => {
      const first = pages[0];
      if (!first) return;
      const stride = first.offsetWidth + 18;
      setDot(stride > 0 ? Math.round(barrel.scrollLeft / stride) : 0);
    };
    barrel.addEventListener('scroll', () => requestAnimationFrame(updateFallbackDot), {passive:true});
    updateFallbackDot();
  }

  function rotateFallback(direction) {
    const first = pages[0];
    if (!first) return;
    const stride = first.offsetWidth + 18;
    const current = stride > 0 ? Math.round(barrel.scrollLeft / stride) : 0;
    const target = clamp(current + direction, 0, CARD_COUNT - 1);
    barrel.scrollTo({left:target * stride, behavior:'smooth'});
    setDot(target);
  }

  function syncGeometry() {
    if (fallbackMode) return;
    if (geometryRaf) cancelAnimationFrame(geometryRaf);
    geometryRaf = requestAnimationFrame(() => {
      geometryRaf = 0;
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const width = window.innerWidth;

      if (width <= 560) {
        const baseHeight = clamp(viewportHeight * .54, 350, 390);
        const cardHeight = baseHeight * CARD_HEIGHT_SCALE;
        barrel.style.height = `${Math.round(cardHeight)}px`;
        stage.style.height = `${Math.round(cardHeight + 110)}px`;
        stage.style.minHeight = `${Math.round(cardHeight + 110)}px`;
      } else if (width <= 900) {
        const baseHeight = clamp(viewportHeight * .56, 390, 430);
        const cardHeight = baseHeight * CARD_HEIGHT_SCALE;
        barrel.style.height = `${Math.round(cardHeight)}px`;
        stage.style.height = `${Math.round(cardHeight + 100)}px`;
        stage.style.minHeight = `${Math.round(cardHeight + 100)}px`;
      } else {
        const cardHeight = 430 * CARD_HEIGHT_SCALE;
        barrel.style.height = `${Math.round(cardHeight)}px`;
        stage.style.height = `${Math.round(cardHeight + 120)}px`;
        stage.style.minHeight = `${Math.round(cardHeight + 120)}px`;
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
    if (fallbackMode) return;
    barrel.style.transform = `rotateY(${angle}deg)`;
    setDot(Math.round(angle / STEP));
  }

  function stopAnimation() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function invalidate() { generation++; stopAnimation(); }

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
        angle = target; velocity = 0; render(); raf = 0; return;
      }
      angle += step; velocity = v; render();
      if (Math.abs(target - angle) < .1 && Math.abs(v) < 1) stableFrames++;
      else stableFrames = 0;
      if ((stableFrames >= 3 && elapsed >= MIN_SETTLE_TIME) || elapsed >= MAX_SETTLE_TIME) {
        angle = target; velocity = 0; render(); raf = 0; return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }

  function releasePointer(pointerId) {
    if (pointerId == null || !zone) return;
    try { if (zone.hasPointerCapture?.(pointerId)) zone.releasePointerCapture(pointerId); } catch (_) {}
  }
  function resetGesture(pointerId = activePointer) {
    releasePointer(pointerId); activePointer = null; gesture = 'idle';
    if (zone) zone.style.cursor = 'grab';
  }
  function begin(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    invalidate(); activePointer = e.pointerId; gesture = 'pending';
    startX = lastX = e.clientX; startY = e.clientY; lastT = performance.now(); velocity = 0;
    zone.style.cursor = 'grabbing';
    try { zone.setPointerCapture?.(e.pointerId); } catch (_) {}
  }
  function move(e) {
    if (activePointer === null || e.pointerId !== activePointer || gesture === 'idle') return;
    const dxTotal = e.clientX - startX, dyTotal = e.clientY - startY;
    if (gesture === 'pending') {
      if (Math.hypot(dxTotal, dyTotal) < DIRECTION_LOCK) return;
      if (Math.abs(dyTotal) > Math.abs(dxTotal)) {
        gesture = 'vertical'; releasePointer(e.pointerId); activePointer = null; zone.style.cursor = 'grab'; return;
      }
      gesture = 'horizontal';
    }
    if (gesture !== 'horizontal') return;
    e.preventDefault();
    const now = performance.now(), dx = e.clientX - lastX, dt = Math.max(8, now - lastT);
    lastX = e.clientX; lastT = now; angle += dx * DRAG_GAIN; velocity = (dx * DRAG_GAIN / dt) * 1000; render();
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
    const wasHorizontal = gesture === 'horizontal', releaseVelocity = velocity;
    resetGesture(e.pointerId);
    if (wasHorizontal) finishHorizontal(releaseVelocity);
  }
  function cancel(e) {
    if (activePointer !== null && e?.pointerId != null && e.pointerId !== activePointer) return;
    resetGesture(e?.pointerId ?? activePointer); velocity = 0; render();
  }
  function rotateBy(direction) {
    if (fallbackMode) return rotateFallback(direction);
    invalidate(); resetGesture();
    const target = (Math.round(angle / STEP) + direction) * STEP;
    settleToCard(direction * BUTTON_SPEED, target);
  }

  if (fallbackMode) {
    enableFallback();
  } else {
    zone = document.createElement('div');
    zone.className = 'carousel-touch-zone';
    zone.setAttribute('aria-hidden', 'true');
    Object.assign(zone.style, {
      position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)',
      zIndex:'12', touchAction:'pan-y', background:'transparent', cursor:'grab',
      userSelect:'none', WebkitUserSelect:'none', pointerEvents:'auto'
    });
    stage.appendChild(zone);
    barrel.style.transition = 'none'; barrel.style.pointerEvents = 'none';
    barrel.style.userSelect = 'none'; barrel.style.webkitUserSelect = 'none';
    zone.addEventListener('pointerdown', begin, {passive:true});
    zone.addEventListener('pointermove', move, {passive:false});
    zone.addEventListener('pointerup', end, {passive:true});
    zone.addEventListener('pointercancel', cancel, {passive:true});
    zone.addEventListener('lostpointercapture', e => {
      if (activePointer === e.pointerId && gesture !== 'vertical') cancel(e);
    });
    window.addEventListener('blur', cancel);
    window.addEventListener('resize', syncGeometry, {passive:true});
    window.addEventListener('orientationchange', syncGeometry, {passive:true});
    window.visualViewport?.addEventListener('resize', syncGeometry, {passive:true});
    if ('ResizeObserver' in window) new ResizeObserver(syncGeometry).observe(barrel);
    syncGeometry(); render();
  }

  document.querySelectorAll('[data-dir]').forEach(control => {
    const direction = Number(control.dataset.dir);
    const run = e => { e.preventDefault(); e.stopPropagation(); rotateBy(direction); };
    control.addEventListener('click', run);
    control.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') run(e); });
  });
})();
