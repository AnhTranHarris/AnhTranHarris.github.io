/* Harris Portfolio: modular carousel edge-light renderer. Physics remain owned by carousel-touch.js. */
(()=>{
  const barrel=document.querySelector('#barrel');
  if(!barrel)return;
  const pages=[...barrel.querySelectorAll('.page')];
  if(!pages.length)return;

  const style=document.createElement('style');
  style.id='carousel-edge-fx-style';
  style.textContent=`
    /* Steps 2 + 4: narrow metallic tracer with faint lead-in, white-hot core and transparent tail. */
    .edge-tracer-supported .page::before,
    .desktop-edge-standard .page::before,
    .desktop-edge-webkit .page::before{
      background:conic-gradient(
        from var(--edge-angle,0deg),
        transparent 0deg 338deg,
        rgba(145,98,25,.015) 341deg,
        rgba(216,184,106,.035) 344deg,
        rgba(216,184,106,.08) 347deg,
        rgba(247,204,88,.22) 350deg,
        rgba(255,226,126,.52) 352.2deg,
        rgba(255,244,190,.86) 353.8deg,
        rgba(255,255,244,1) 354.8deg,
        rgba(255,255,255,1) 355.25deg,
        rgba(255,249,218,.92) 355.9deg,
        rgba(255,232,142,.60) 357deg,
        rgba(216,184,106,.26) 358.2deg,
        rgba(216,184,106,.09) 359.1deg,
        rgba(216,184,106,.025) 359.65deg,
        transparent 360deg
      )!important;
      filter:drop-shadow(0 0 2px rgba(255,247,207,.72)) drop-shadow(0 0 5px rgba(216,184,106,.24))!important;
    }

    /* Step 3: keep depth shadows, remove the broad gold wash from the whole card. */
    @media(min-width:901px){
      .barrel.edge-motion .page{
        box-shadow:
          0 28px 65px rgba(0,0,0,.46),
          0 5px 16px rgba(0,0,0,.25),
          inset 0 1px rgba(255,255,255,.07),
          inset 0 0 8px rgba(255,215,112,.14),
          0 0 8px rgba(255,226,126,.18)!important;
      }
      .desktop-performance-reduced .barrel.edge-motion .page{
        box-shadow:
          0 28px 65px rgba(0,0,0,.46),
          0 5px 16px rgba(0,0,0,.25),
          inset 0 1px rgba(255,255,255,.07),
          inset 0 0 6px rgba(255,215,112,.10),
          0 0 6px rgba(255,226,126,.12)!important;
      }
      .desktop-performance-reduced .page::before{
        filter:drop-shadow(0 0 2px rgba(255,247,207,.52)) drop-shadow(0 0 4px rgba(216,184,106,.16))!important;
      }
      .desktop-edge-fallback .page::before{
        padding:0!important;
        border:2px solid rgba(255,226,126,.72)!important;
        background:none!important;
        box-shadow:0 0 5px rgba(216,184,106,.18)!important;
        -webkit-mask:none!important;
        mask:none!important;
        filter:none!important;
      }
    }

    /* Step 5: Full Effects must win over the browser's CSS reduced-motion media query. */
    html[data-effects="full"].edge-tracer-supported .page::before,
    html[data-effects="full"].desktop-edge-standard .page::before,
    html[data-effects="full"].desktop-edge-webkit .page::before{
      border:0!important;
      -webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
      -webkit-mask-composite:xor!important;
      mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)!important;
      mask-composite:exclude!important;
    }
    html[data-effects="full"].edge-tracer-supported .page::before{padding:2px!important;}
    @media(min-width:901px){
      html[data-effects="full"].desktop-edge-standard .page::before,
      html[data-effects="full"].desktop-edge-webkit .page::before{padding:10px!important;}
    }
  `;
  document.head.appendChild(style);
})();
