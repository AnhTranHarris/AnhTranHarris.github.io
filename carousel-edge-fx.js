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
  `;
  document.head.appendChild(style);
})();
