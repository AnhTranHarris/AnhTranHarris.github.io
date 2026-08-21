/* Harris Portfolio entry: exact reference-GIF choreography.
   The uploaded three-color animation is used as the temporal motion template,
   recolored to the portfolio palette and stretched to the live viewport so
   desktop and mobile receive the same frame sequence.
   Portfolio systems underneath remain untouched. */
(() => {
  'use strict';

  const overlay = document.getElementById('portfolio-entry-overlay');
  if (!overlay) return;

  const nav = performance.getEntriesByType?.('navigation')?.[0];
  const skip = nav?.type === 'back_forward' ||
    window.matchMedia?.('(forced-colors: active)').matches ||
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const finishImmediately = () => {
    document.documentElement.dataset.entryState = 'complete';
    overlay.remove();
  };
  if (skip) { finishImmediately(); return; }

  const WHITE_HOLD = 110;
  const GIF_DURATION = 3270;
  const FAILSAFE = 4700;

  const stage = document.createElement('div');
  stage.className = 'entry-reference-stage';
  stage.setAttribute('aria-hidden', 'true');
  overlay.appendChild(stage);

  const img = document.createElement('img');
  img.className = 'entry-reference-gif';
  img.alt = '';
  img.decoding = 'async';

  // Exact 109-frame reference sequence, recolored:
  // source white -> white, source orange -> portfolio gold, source black -> deep teal/ink.
  img.src = 'data:image/gif;base64,"+b64+"';

  let finished = false;
  let playbackTimer = 0;
  const watchdog = setTimeout(finish, FAILSAFE);

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(playbackTimer);
    clearTimeout(watchdog);
    document.documentElement.dataset.entryState = 'complete';
    overlay.classList.add('entry-complete');
    setTimeout(() => overlay.remove(), 140);
  }

  function beginPlayback() {
    if (finished) return;
    document.documentElement.dataset.entryState = 'running';
    setTimeout(() => {
      if (finished) return;
      stage.appendChild(img);
      stage.classList.add('entry-reference-playing');
      playbackTimer = setTimeout(finish, GIF_DURATION);
    }, WHITE_HOLD);
  }

  // The flat white entry frame is visible immediately. We wait for the embedded
  // image to decode before starting so slow mobile decoding cannot skip the opening.
  const ready = () => beginPlayback();
  if (img.decode) {
    img.decode().then(ready).catch(ready);
  } else {
    img.onload = ready;
    img.onerror = finish;
  }

  window.addEventListener('pageshow', e => { if (e.persisted) finish(); }, { passive: true });
})();