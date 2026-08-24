/* Harris Portfolio: site-local motion policy. Full Effects is the portfolio default without changing OS/browser settings. */
(() => {
  const root = document.documentElement;
  root.dataset.effects = 'full';

  const nativeMatchMedia = typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null;
  const reduceQuery = '(prefers-reduced-motion: reduce)';
  const systemReduce = nativeMatchMedia ? nativeMatchMedia(reduceQuery) : null;

  window.__portfolioMotionPolicy = {
    mode: 'full',
    systemReducedMotion: !!systemReduce?.matches,
    nativeMatchMedia
  };

  if (nativeMatchMedia) {
    window.matchMedia = query => {
      const mql = nativeMatchMedia(query);
      const isReducedMotionQuery = /prefers-reduced-motion\s*:\s*reduce/i.test(String(query));
      if (root.dataset.effects !== 'full' || !isReducedMotionQuery) return mql;

      return new Proxy(mql, {
        get(target, prop) {
          if (prop === 'matches') return false;
          const value = Reflect.get(target, prop, target);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
    };
  }

  if (!document.querySelector('script[data-carousel-edge-fx]')) {
    const carouselFx = document.createElement('script');
    carouselFx.src = 'carousel-edge-fx.js?v=edge-17';
    carouselFx.dataset.carouselEdgeFx = 'true';
    carouselFx.async = false;
    root.dataset.carouselEdgeFx = 'loading';
    carouselFx.addEventListener('load', () => { root.dataset.carouselEdgeFx = 'ready'; }, { once: true });
    carouselFx.addEventListener('error', () => { root.dataset.carouselEdgeFx = 'failed'; }, { once: true });
    document.head.appendChild(carouselFx);
  } else if (!root.dataset.carouselEdgeFx) {
    root.dataset.carouselEdgeFx = 'loading';
  }

  if (!document.querySelector('script[data-carousel-accessibility]')) {
    const carouselAccessibility = document.createElement('script');
    carouselAccessibility.src = 'carousel-accessibility.js?v=a11y-1';
    carouselAccessibility.dataset.carouselAccessibility = 'true';
    document.head.appendChild(carouselAccessibility);
  }

  if (!document.querySelector('script[data-resume-accessibility-guard]')) {
    const resumeAccessibility = document.createElement('script');
    resumeAccessibility.src = 'resume-accessibility-guard.js?v=a11y-2';
    resumeAccessibility.dataset.resumeAccessibilityGuard = 'true';
    document.head.appendChild(resumeAccessibility);
  }

  const installFullEffectsOverrides = () => {
    if (document.getElementById('portfolio-full-effects-overrides')) return;
    const style = document.createElement('style');
    style.id = 'portfolio-full-effects-overrides';
    style.textContent = `
      html[data-effects="full"] .spotlight{will-change:transform,opacity}
      html[data-effects="full"] .barrel{will-change:auto}
      html[data-effects="full"] .carousel-edge-frame,
      html[data-effects="full"] .carousel-edge-rail{will-change:auto!important}
      html[data-effects="full"] .barrel.edge-motion .carousel-edge-frame{will-change:filter!important}
      html[data-effects="full"] .barrel.edge-motion .carousel-edge-rail{will-change:transform,opacity,filter!important}

      html[data-effects="full"][data-carousel-edge-fx="ready"] .page::before,
      html[data-effects="full"][data-carousel-edge-fx="ready"] .barrel.edge-motion .page::before,
      html[data-effects="full"][data-carousel-edge-fx="ready"].edge-tracer-supported .barrel.edge-motion .page::before,
      html[data-effects="full"][data-carousel-edge-fx="ready"].desktop-edge-standard .barrel.edge-motion .page::before,
      html[data-effects="full"][data-carousel-edge-fx="ready"].desktop-edge-webkit .barrel.edge-motion .page::before,
      html[data-effects="full"][data-carousel-edge-fx="ready"].desktop-edge-fallback .barrel.edge-motion .page::before{
        opacity:0!important;
        background:none!important;
        border:0!important;
        padding:0!important;
        box-shadow:none!important;
        filter:none!important;
        -webkit-mask:none!important;
        -webkit-mask-composite:initial!important;
        mask:none!important;
        mask-composite:initial!important;
      }

      html[data-effects="full"] .carousel-edge-frame,
      html[data-effects="full"] .carousel-edge-rail,
      html[data-effects="full"] .carousel-edge-corner-flare{
        display:block!important;
        animation-play-state:running!important;
      }

      /* Static convex-metal crown: broad diffused highlight, intentionally no sharp center line. */
      html[data-effects="full"] .carousel-edge-frame::before{
        content:"";
        position:absolute;
        inset:2px;
        pointer-events:none;
        border-radius:calc(7px - 1px);
        padding:4px;
        background:conic-gradient(
          from var(--metal-angle,315deg),
          color-mix(in srgb,var(--champ-hi,#D7CAA7) 72%,white 28%) 0deg,
          color-mix(in srgb,var(--champ-body,#A99A78) 82%,white 18%) 78deg,
          color-mix(in srgb,var(--champ-hi,#D7CAA7) 74%,white 26%) 168deg,
          color-mix(in srgb,var(--gold-hi,#FFD66B) 70%,white 30%) 244deg,
          color-mix(in srgb,var(--gold-body,#D6A63A) 78%,white 22%) 316deg,
          color-mix(in srgb,var(--champ-hi,#D7CAA7) 72%,white 28%) 360deg
        );
        -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
        -webkit-mask-composite:xor;
        mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);
        mask-composite:exclude;
        opacity:.34;
        filter:blur(1.6px);
        transform:translateZ(0);
      }

      html[data-effects="full"] .carousel-edge-frame::after{
        content:none!important;
        display:none!important;
      }

      html[data-effects="full"] .resume-fx.active{display:block!important}
      html[data-effects="full"] .resume-source-dissolve{
        opacity:0!important;transition:opacity 1700ms cubic-bezier(.3,.05,.5,1)!important
      }
      html[data-effects="full"] .resume-shell{
        opacity:0!important;transform:scale(.99)!important
      }
      html[data-effects="full"] .resume-overlay.frame-ready .resume-shell{
        opacity:1!important;transform:none!important;
        transition:opacity 420ms ease,transform 420ms ease!important
      }
      html[data-effects="full"] .resume-overlay.closing .resume-shell{
        opacity:1!important;transform:none!important;transition:none!important
      }
      html[data-effects="full"] .resume-toolbar,
      html[data-effects="full"] .resume-scroll{opacity:0!important}
      html[data-effects="full"] .resume-overlay.revealing .resume-toolbar,
      html[data-effects="full"] .resume-overlay.revealing .resume-scroll,
      html[data-effects="full"] .resume-overlay.open .resume-toolbar,
      html[data-effects="full"] .resume-overlay.open .resume-scroll{
        opacity:1!important;transition:opacity 2000ms ease!important
      }
      html[data-effects="full"] .resume-overlay.closing .resume-toolbar,
      html[data-effects="full"] .resume-overlay.closing .resume-scroll{
        opacity:1!important;transition:none!important
      }
    `;
    document.head.appendChild(style);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(installFullEffectsOverrides, 0), { once: true });
  } else {
    setTimeout(installFullEffectsOverrides, 0);
  }
})();
