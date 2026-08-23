/* Harris Portfolio: modular recruiter CTA arrow with lightweight SVG glint. */
(()=>{
  const mount=document.querySelector('[data-progression-arrow]');
  if(!mount)return;

  const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const style=document.createElement('style');
  style.textContent=`
    .progression-cta{display:flex;align-items:center;gap:14px;margin-top:22px;color:#d8b86a;font-size:.76rem;font-weight:700;letter-spacing:.10em;text-transform:uppercase}
    .progression-arrow{display:block;width:clamp(92px,9vw,138px);height:66px;flex:0 0 auto;overflow:visible;filter:drop-shadow(0 3px 0 rgba(82,53,14,.72)) drop-shadow(0 0 7px rgba(216,184,106,.24));transform:translateZ(0)}
    .progression-arrow .pa-depth{fill:rgba(87,57,16,.44);stroke:rgba(120,83,29,.82);stroke-width:3;transform:translate(4px,5px)}
    .progression-arrow .pa-face{fill:rgba(62,45,18,.34);stroke:#b89745;stroke-width:3}
    .progression-arrow .pa-rim{fill:none;stroke:rgba(255,226,126,.72);stroke-width:1.25}
    .progression-arrow .pa-glint{fill:none;stroke:#fff0b0;stroke-width:4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:24 420;filter:drop-shadow(0 0 3px rgba(255,240,176,.95)) drop-shadow(0 0 8px rgba(216,184,106,.72));animation:progressionGlint 4200ms cubic-bezier(.45,0,.55,1) infinite}
    .progression-arrow .pa-core{fill:none;stroke:rgba(255,255,238,.92);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:8 436;animation:progressionGlint 4200ms cubic-bezier(.45,0,.55,1) infinite}
    @keyframes progressionGlint{0%,20%{stroke-dashoffset:446;opacity:0}27%{opacity:.95}54%{opacity:1}68%{stroke-dashoffset:0;opacity:.88}74%,100%{stroke-dashoffset:-34;opacity:0}}
    @media(max-width:900px){
      .progression-cta{flex-direction:column;align-items:flex-start;gap:6px;margin-top:18px}
      .progression-arrow{width:86px;height:104px;transform:rotate(90deg) translateZ(0);transform-origin:43px 52px;margin:2px 0 0 20px}
    }
    @media(prefers-reduced-motion:reduce){.progression-arrow .pa-glint,.progression-arrow .pa-core{animation:none;opacity:.72;stroke-dashoffset:0}}
  `;
  document.head.appendChild(style);

  mount.innerHTML=`<svg class="progression-arrow" viewBox="0 0 144 100" role="img" aria-label="Arrow pointing toward the portfolio carousel" focusable="false">
    <path class="pa-depth" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    <path class="pa-face" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    <path class="pa-rim" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    <path class="pa-glint" pathLength="446" d="M8 36H94V18L136 50 94 82V64H8Z"/>
    <path class="pa-core" pathLength="446" d="M8 36H94V18L136 50 94 82V64H8Z"/>
  </svg>`;
})();