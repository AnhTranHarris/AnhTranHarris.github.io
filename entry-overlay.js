/* Harris Portfolio entry: exact reference animation playback.
   Plays the supplied 109-frame / 3.27s geometric animation as one full-screen
   overlay. No procedural shapes, flocking, blobs, or viewport-specific choreography. */
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

  const PARTS = [0,1,2,3,4].map(i => `entry-media/v0${i}.txt?v=exact-reference-1`);
  const WHITE_HOLD_MS = 90;
  const FAILSAFE_MS = 5200;

  const stage = document.createElement('div');
  stage.className = 'entry-reference-stage';
  stage.setAttribute('aria-hidden', 'true');
  overlay.appendChild(stage);

  const video = document.createElement('video');
  video.className = 'entry-reference-video';
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.controls = false;
  video.disablePictureInPicture = true;
  video.setAttribute('muted', '');
  video.setAttribute('playsinline', '');
  video.setAttribute('aria-hidden', 'true');

  let finished = false;
  let objectUrl = '';
  let watchdog = 0;

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    try { video.pause(); } catch (_) {}
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    document.documentElement.dataset.entryState = 'complete';
    overlay.classList.add('entry-complete');
    setTimeout(() => overlay.remove(), 130);
  }

  watchdog = setTimeout(finish, FAILSAFE_MS);
  window.addEventListener('pageshow', e => { if (e.persisted) finish(); }, { passive:true });

  async function loadExactAnimation() {
    try {
      const texts = await Promise.all(PARTS.map(async url => {
        const response = await fetch(url, { cache:'no-store' });
        if (!response.ok) throw new Error(`entry media ${response.status}`);
        return (await response.text()).trim();
      }));

      const encoded = texts.join('');
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      objectUrl = URL.createObjectURL(new Blob([bytes], { type:'video/mp4' }));
      video.src = objectUrl;
      stage.appendChild(video);

      await new Promise((resolve, reject) => {
        if (video.readyState >= 3) return resolve();
        video.addEventListener('canplay', resolve, { once:true });
        video.addEventListener('error', reject, { once:true });
      });

      video.currentTime = 0;
      video.addEventListener('ended', finish, { once:true });
      document.documentElement.dataset.entryState = 'running';

      setTimeout(async () => {
        if (finished) return;
        stage.classList.add('entry-reference-playing');
        try { await video.play(); }
        catch (_) { finish(); }
      }, WHITE_HOLD_MS);
    } catch (_) {
      finish();
    }
  }

  loadExactAnimation();
})();