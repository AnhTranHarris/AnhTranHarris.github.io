/* Harris Portfolio entry: mathematical interference-field reveal.
   Full-screen WebGL2 fragment shader: directional waves + radial pressure waves +
   quantized coordinates + hard thresholds. Resolution-independent and crisp.
   The previous exact-reference media remains in entry-media/ as rollback fallback. */
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

  const TOTAL_MS = 3180;
  const WHITE_HOLD_MS = 80;
  const FAILSAFE_MS = 4300;

  const canvas = document.createElement('canvas');
  canvas.className = 'entry-math-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  overlay.appendChild(canvas);

  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: false,
    premultipliedAlpha: false,
    depth: false,
    stencil: false,
    preserveDrawingBuffer: false,
    powerPreference: 'high-performance'
  });
  if (!gl) { finishImmediately(); return; }

  const vert = `#version 300 es
  precision highp float;
  const vec2 P[3] = vec2[3](vec2(-1.0,-1.0),vec2(3.0,-1.0),vec2(-1.0,3.0));
  out vec2 vUv;
  void main(){
    vec2 p=P[gl_VertexID];
    vUv=p*0.5+0.5;
    gl_Position=vec4(p,0.0,1.0);
  }`;

  const frag = `#version 300 es
  precision highp float;
  in vec2 vUv;
  out vec4 outColor;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uProgress;

  const vec3 WHITE=vec3(1.0);
  const vec3 INK=vec3(0.031,0.090,0.114);
  const vec3 TEAL=vec3(0.075,0.247,0.271);
  const vec3 GOLD=vec3(0.843,0.722,0.416);

  float wave(vec2 p, vec2 k, float speed, float phase){
    return sin(dot(p,k)+uTime*speed+phase);
  }
  float radial(vec2 p, vec2 c, float freq, float speed, float phase){
    return cos(length(p-c)*freq-uTime*speed+phase);
  }

  void main(){
    vec2 res=max(uResolution,vec2(1.0));
    float blockPx=mix(19.0,9.0,0.5+0.5*sin(uTime*1.35));
    vec2 qpx=floor((vUv*res)/blockPx)*blockPx+blockPx*0.5;
    vec2 uv=qpx/res;

    float aspect=res.x/res.y;
    vec2 p=(uv-0.5)*vec2(aspect,1.0)*6.2831853;
    float t=uTime;

    float d1=wave(p,vec2( 1.18, 0.46), 3.85, 0.20);
    float d2=wave(p,vec2(-0.63, 1.36),-3.05, 1.70);
    float d3=wave(p,vec2( 0.82, 1.02), 4.65, 3.10);
    float d4=wave(p,vec2( 1.54,-0.72),-4.10, 4.35);

    vec2 c1=vec2(-1.55+2.85*sin(t*0.71),1.10*cos(t*0.93));
    vec2 c2=vec2( 1.45*cos(t*0.83+1.4),-1.20+2.10*sin(t*0.59));
    float r1=radial(p,c1,2.18,5.15,0.45);
    float r2=radial(p,c2,2.63,-4.55,2.20);

    float goldField= 1.04*d1 + 0.72*d3 - 0.63*d2 + 0.77*r1 - 0.45*r2;
    float inkField =-0.78*d1 + 1.02*d2 + 0.69*d4 + 0.66*r2 - 0.37*r1;
    float whiteField= 0.62*d1 - 0.58*d3 + 0.84*d4 - 0.39*r1 + 0.48*r2;

    goldField+=0.33*sin(t*2.55)+0.21*sin(t*5.20+0.7);
    inkField +=0.30*sin(t*2.16+2.1)+0.22*sin(t*4.78+1.3);
    whiteField+=0.26*sin(t*2.88+4.0)+0.18*sin(t*5.64+2.7);

    float threshold=0.02+0.11*sin(t*1.82);
    vec3 color=WHITE;
    float best=whiteField;
    int winner=0;
    if(inkField>best+threshold){best=inkField;color=INK;winner=1;}
    if(goldField>best+threshold){best=goldField;color=GOLD;winner=2;}

    float competition=abs(goldField-inkField);
    if(winner!=0 && competition<0.16 && sin((p.x-p.y)*1.4+t*5.8)>0.05){color=TEAL;}

    if(uProgress<0.028){outColor=vec4(WHITE,1.0);return;}

    float revealRamp=smoothstep(0.63,0.98,uProgress);
    float revealWave=
      0.70*wave(p,vec2(0.91,-1.13),5.30,0.2)+
      0.56*radial(p,vec2(0.25,-0.20),1.74,5.90,1.0)+
      0.42*wave(p,vec2(-1.48,-0.38),-4.20,2.6);
    float revealThreshold=mix(1.42,-1.52,revealRamp);
    bool transparent=revealRamp>0.0 && revealWave>revealThreshold;

    if(uProgress>0.965){
      float finalCut=smoothstep(0.965,1.0,uProgress);
      float sweep=(uv.x+uv.y*0.58)-mix(-0.35,1.62,finalCut);
      if(sweep<0.0) transparent=true;
    }

    outColor=transparent?vec4(0.0):vec4(color,1.0);
  }`;

  function compile(type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('Entry shader compile failed:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  const vs = compile(gl.VERTEX_SHADER, vert);
  const fs = compile(gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) { finishImmediately(); return; }

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error('Entry shader link failed:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    finishImmediately();
    return;
  }

  gl.useProgram(program);
  const uResolution = gl.getUniformLocation(program, 'uResolution');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uProgress = gl.getUniformLocation(program, 'uProgress');
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  let start = 0;
  let raf = 0;
  let finished = false;
  let watchdog = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(window.innerWidth * dpr));
    const height = Math.max(1, Math.round(window.innerHeight * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    gl.viewport(0, 0, width, height);
    gl.uniform2f(uResolution, width, height);
  }

  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(watchdog);
    cancelAnimationFrame(raf);
    try { gl.deleteVertexArray(vao); gl.deleteProgram(program); } catch (_) {}
    document.documentElement.dataset.entryState = 'complete';
    overlay.classList.add('entry-complete');
    setTimeout(() => overlay.remove(), 100);
  }

  function frame(now) {
    if (!start) start = now;
    const elapsed = Math.max(0, now - start - WHITE_HOLD_MS);
    const progress = Math.min(1, elapsed / TOTAL_MS);
    gl.uniform1f(uTime, elapsed / 1000);
    gl.uniform1f(uProgress, progress);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (progress >= 1) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  let resizeTimer = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 80);
  }, { passive: true });
  window.addEventListener('pageshow', e => { if (e.persisted) finish(); }, { passive: true });

  try {
    resize();
    document.documentElement.dataset.entryState = 'running';
    watchdog = setTimeout(finish, FAILSAFE_MS);
    raf = requestAnimationFrame(frame);
  } catch (_) {
    finishImmediately();
  }
})();