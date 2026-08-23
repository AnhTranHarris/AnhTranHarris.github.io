/* Harris Portfolio: Card 1 referral-aware copy router.
   Uses only the browser-provided referrer. No tracking, storage, network calls, or profiling.
   The HTML contains the Hybrid copy as the authoritative fallback if this module is unavailable. */
(()=>{
  'use strict';

  const root=document.documentElement;
  const card=document.querySelector('.page[data-card="about-me"]');
  if(!card){root.dataset.card1Content='fallback';return;}

  const lead=card.querySelector('[data-card1-lead]');
  const body=card.querySelector('[data-card1-body]');
  if(!lead||!body){root.dataset.card1Content='fallback';return;}

  const COPY={
    linkedin:{
      lead:'Operations experience. AI direction. Evidence in progress.',
      body:"My background is in regulated, high-volume environments where accuracy, documentation, procedural judgment, and resolving discrepancies matter. I'm now building on that experience through applied AI, technical communication, AI-assisted workflows, and evaluation. This portfolio goes beyond the profile. It documents what I'm learning, what I'm building, how I test it, where something fails, and what I improve next."
    },
    github:{
      lead:'Build. Test. Document. Improve.',
      body:"My professional background is rooted in accuracy, documentation, procedural judgment, and resolving discrepancies in regulated environments. I'm applying that same mindset while developing practical skills in applied AI, AI-assisted workflows, technical communication, and evaluation. This portfolio provides the context behind the work: the problem I was trying to solve, what I built, how I tested it, what didn't work, what I changed, and why."
    },
    hybrid:{
      lead:'Operations experience. AI direction. Evidence in progress.',
      body:"My background is in regulated, high-volume environments where accuracy, documentation, procedural judgment, and resolving discrepancies matter. I'm building on that foundation while developing practical skills in applied AI, technical communication, AI-assisted workflows, and evaluation. Rather than present a finished version of myself, this portfolio documents the transition through actual work—what I'm learning, what I'm building, how I test it, where something fails, and what I improve next."
    }
  };

  const classifyReferrer=()=>{
    if(!document.referrer)return'hybrid';
    try{
      const host=new URL(document.referrer).hostname.toLowerCase().replace(/^www\./,'');
      if(host==='linkedin.com'||host.endsWith('.linkedin.com')||host==='lnkd.in'||host.endsWith('.lnkd.in'))return'linkedin';
      if(host==='github.com'||host.endsWith('.github.com'))return'github';
    }catch(_){/* malformed/privacy-modified referrer -> Hybrid */}
    return'hybrid';
  };

  const variant=classifyReferrer();
  const copy=COPY[variant]||COPY.hybrid;
  lead.textContent=copy.lead;
  body.textContent=copy.body;
  root.dataset.card1Variant=variant;
  root.dataset.card1Content='ready';
})();
