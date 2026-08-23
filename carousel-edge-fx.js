/* Harris Portfolio: modular carousel edge-light renderer. Physics remain owned by carousel-touch.js. */
(()=>{
  const barrel=document.querySelector('#barrel');
  if(!barrel)return;
  const pages=[...barrel.querySelectorAll('.page')];
  if(!pages.length)return;

  const style=document.createElement('style');
  style.id='carousel-edge-fx-style';
  style.textContent=`
    /* Step 2: narrow optical glint only. Existing carousel motion variables remain authoritative. */
    .edge-tracer-supported .page::before,
    .desktop-edge-standard .page::before,
    .desktop-edge-webkit .page::before{
      background:conic-gradient(
        from var(--edge-angle,0deg),
        transparent 0deg 344deg,
        rgba(216,184,106,.08) 347deg,
        rgba(247,204,88,.34) 350deg,
        rgba(255,232,142,.74) 352.4deg,
        rgba(255,249,218,.96) 354.2deg,
        rgba(255,255,255,1) 355deg,
        rgba(255,249,218,.96) 355.8deg,
        rgba(255,232,142,.72) 357.2deg,
        rgba(216,184,106,.24) 358.7deg,
        transparent 360deg
      )!important;
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
    }
  `;
  document.head.appendChild(style);
})();
