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

  // Existing CSS contains accessibility fallbacks inside @media
  // (prefers-reduced-motion: reduce). Chrome/Edge evaluate those at the CSS
  // engine level, so JS matchMedia alone cannot override them. Append a
  // higher-specificity, Full-Effects-only restoration after the animation
  // scripts have installed their styles.
  const installFullEffectsOverrides = () => {
    if (document.getElementById('portfolio-full-effects-overrides')) return;
    const style = document.createElement('style');
    style.id = 'portfolio-full-effects-overrides';
    style.textContent = `
      html[data-effects="full"] .spotlight{will-change:transform,opacity}
      html[data-effects="full"] .barrel{will-change:auto}

      html[data-effects="full"] .page::before{transition:opacity 110ms linear!important}
      html[data-effects="full"].edge-tracer-supported .page::before{
        padding:2px!important;border:0!important;box-shadow:none!important;
        background:conic-gradient(from var(--edge-angle,0deg),transparent 0deg 258deg,rgba(216,184,106,.10) 274deg,rgba(255,222,112,.96) 307deg,rgba(255,247,207,1) 323deg,rgba(255,255,238,1) 329deg,rgba(255,236,158,.92) 337deg,rgba(216,184,106,.22) 353deg,transparent 360deg)!important;
        -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
        -webkit-mask-composite:xor!important;
        mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
        mask-composite:exclude!important;
        filter:drop-shadow(0 0 5px rgba(255,226,126,.90)) drop-shadow(0 0 9px rgba(216,184,106,.36))!important
      }
      @media(min-width:901px){
        html[data-effects="full"].desktop-edge-standard .page::before,
        html[data-effects="full"].desktop-edge-webkit .page::before{
          padding:10px!important;border:0!important;
          background:conic-gradient(from var(--edge-angle,0deg),transparent 0deg 327deg,rgba(145,98,25,.12) 331deg,rgba(216,184,106,.38) 335deg,rgba(247,204,88,.72) 339deg,rgba(255,232,142,.96) 343deg,rgba(255,247,207,1) 346deg,rgba(255,255,255,1) 349deg,rgba(255,247,207,1) 352deg,rgba(255,232,142,.94) 355deg,rgba(216,184,106,.42) 358deg,transparent 360deg)!important;
          filter:none!important
        }
        html[data-effects="full"].desktop-edge-standard .page::before{
          -webkit-mask:none!important;-webkit-mask-composite:initial!important;
          mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
          mask-composite:exclude!important
        }
        html[data-effects="full"].desktop-edge-webkit .page::before{
          mask:none!important;mask-composite:initial!important;
          -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
          -webkit-mask-composite:xor!important
        }
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
