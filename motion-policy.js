/* Harris Portfolio: site-local motion policy. Full Effects is the portfolio default without changing OS/browser settings. */
(() => {
  const root = document.documentElement;
  root.dataset.effects = 'full';

  const nativeMatchMedia = typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : null;
  const reduceQuery = '(prefers-reduced-motion: reduce)';
  const systemReduce = nativeMatchMedia ? nativeMatchMedia(reduceQuery) : null;

  // Preserve the visitor's actual system preference for diagnostics/future UI.
  window.__portfolioMotionPolicy = {
    mode: 'full',
    systemReducedMotion: !!systemReduce?.matches,
    nativeMatchMedia
  };

  // Site-local compatibility shim: existing animation engines can keep their
  // current reduced-motion checks, but this portfolio resolves that one query
  // to Full Effects. All other media queries pass through untouched.
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

  // CSS media queries are evaluated by the browser independently of the JS
  // matchMedia shim. These Full-Effects-only overrides therefore restore only
  // the current animation systems. The retired carousel conic-gradient tracer
  // is deliberately kept disabled; carousel-edge-fx.js owns perimeter light.
  const installFullEffectsOverrides = () => {
    if (document.getElementById('portfolio-full-effects-overrides')) return;
    const style = document.createElement('style');
    style.id = 'portfolio-full-effects-overrides';
    style.textContent = `
      html[data-effects="full"] .spotlight{will-change:transform,opacity}
      html[data-effects="full"] .barrel{will-change:auto}

      /* Retired carousel pseudo-element renderer must never be resurrected. */
      html[data-effects="full"] .page::before,
      html[data-effects="full"] .barrel.edge-motion .page::before,
      html[data-effects="full"].edge-tracer-supported .barrel.edge-motion .page::before,
      html[data-effects="full"].desktop-edge-standard .barrel.edge-motion .page::before,
      html[data-effects="full"].desktop-edge-webkit .barrel.edge-motion .page::before,
      html[data-effects="full"].desktop-edge-fallback .barrel.edge-motion .page::before{
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

      /* Current physical-perimeter carousel renderer. */
      html[data-effects="full"] .carousel-edge-rail{
        display:block!important;
        animation-play-state:running!important;
      }
      html[data-effects="full"] .carousel-edge-corner-flare{
        display:block!important;
        animation-play-state:running!important;
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
