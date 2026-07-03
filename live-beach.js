const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

/* Full-screen luxury tropical ocean — pure WebGL, always vivid blue */
const OCEAN_FRAG = `
  precision mediump float;

  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = rot * p * 2.03 + 0.15;
      a *= 0.5;
    }
    return v;
  }

  float waveHeight(float x, float t) {
    return sin(x * 0.7 + t * 0.65) * 0.014
         + sin(x * 1.4 - t * 1.05) * 0.008
         + sin(x * 2.6 + t * 1.55) * 0.0045
         + sin(x * 4.2 - t * 2.1) * 0.002;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float x = uv.x * aspect * 6.28;

    float horizon = 0.56 + sin(t * 0.12) * 0.006;
    float skyBlend = smoothstep(horizon - 0.008, horizon + 0.14, uv.y);

    vec3 skyZenith  = vec3(0.22, 0.52, 0.82);
    vec3 skyHorizon = vec3(0.55, 0.82, 0.96);
    vec3 sky = mix(skyHorizon, skyZenith, smoothstep(horizon, 1.0, uv.y));

    float h  = waveHeight(x, t);
    float h2 = waveHeight(x + 2.1, t * 1.08);
    float surface = horizon + h;
    float surface2 = horizon + h2;

    float below = surface - uv.y;
    float inSea = smoothstep(-0.005, 0.015, below);

    float depth = clamp(below * 3.5, 0.0, 1.0);
    float shallow = 1.0 - smoothstep(0.0, 0.18, below);

    vec3 deepOcean    = vec3(0.0,  0.12, 0.38);
    vec3 midOcean     = vec3(0.0,  0.38, 0.62);
    vec3 shallowAqua  = vec3(0.12, 0.68, 0.82);
    vec3 crystalTeal  = vec3(0.25, 0.82, 0.88);

    vec3 sea = mix(deepOcean, midOcean, depth * 0.75);
    sea = mix(sea, shallowAqua, shallow * 0.7);
    sea = mix(sea, crystalTeal, shallow * shallow * 0.45);

    vec2 cP = vec2(x * 0.35, uv.y * 8.0 - t * 0.5);
    float caustics = fbm(cP) * fbm(cP * 1.6 + 2.0);
    caustics = pow(caustics, 1.8);
    sea += vec3(0.35, 0.88, 1.0) * caustics * inSea * (1.0 - skyBlend) * 0.22;

    float glitter1 = pow(max(0.0, sin(x * 1.2 - t * 1.8) * sin(uv.y * 40.0 + t * 1.2)), 10.0);
    float glitter2 = pow(max(0.0, sin(x * 2.4 + t * 2.4) * sin(uv.y * 55.0 - t * 1.6)), 12.0);
    sea += vec3(0.75, 0.96, 1.0) * (glitter1 * 0.35 + glitter2 * 0.2) * inSea;

    float sunBand = exp(-pow((uv.y - surface) * 55.0, 2.0)) * inSea;
    sea += vec3(1.0, 0.98, 0.88) * sunBand * 0.18;

    float foamLine = smoothstep(0.02, 0.0, abs(uv.y - surface));
    float foamLine2 = smoothstep(0.015, 0.0, abs(uv.y - surface2));
    sea = mix(sea, vec3(0.88, 0.97, 1.0), (foamLine + foamLine2 * 0.6) * 0.8);

    float foamBody = smoothstep(surface + 0.03, surface - 0.05, uv.y) * shallow;
    sea = mix(sea, vec3(0.7, 0.92, 0.98), foamBody * 0.15);

    float swell = sin(x * 0.4 + t * 0.5) * 0.5 + 0.5;
    sea += midOcean * swell * 0.04 * inSea;

    float sandZone = 1.0 - smoothstep(0.06, 0.18, uv.y);
    vec3 wetSand = vec3(0.72, 0.68, 0.58);
    wetSand = mix(wetSand, shallowAqua * 0.55 + wetSand, 0.45);

    vec3 col = sea;
    col = mix(col, wetSand, sandZone * (1.0 - skyBlend) * 0.85);
    col = mix(col, sky, skyBlend);

    col = pow(max(col, vec3(0.0)), vec3(0.92));
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('Ocean shader:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function linkProgram(gl, vs, fs) {
  const v = compileShader(gl, gl.VERTEX_SHADER, vs);
  const f = compileShader(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

function startOceanRenderer(canvas, wrap, prefersReduced) {
  const gl =
    canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'high-performance' }) ||
    canvas.getContext('experimental-webgl');
  if (!gl) return null;

  const program = linkProgram(gl, VERT, OCEAN_FRAG);
  if (!program) return null;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, 'aPos');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uResolution = gl.getUniformLocation(program, 'uResolution');

  let running = true;
  let animId;
  const start = performance.now();
  let width = 0;
  let height = 0;

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(rect.width, window.innerWidth, 1);
    const h = Math.max(rect.height, window.innerHeight * 0.85, 1);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = w;
    height = h;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(now) {
    if (!running) return;
    animId = requestAnimationFrame(draw);

    const time = prefersReduced ? 0 : (now - start) * 0.001;

    gl.clearColor(0.0, 0.25, 0.48, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform1f(uTime, time);
    gl.uniform2f(uResolution, width, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize();
  canvas.classList.add('ocean-active');
  window.addEventListener('resize', resize);
  draw(start);

  return {
    resize,
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.classList.remove('ocean-active');
    },
  };
}

export function initLiveBeach(wrap) {
  if (!wrap) return null;

  const canvas = wrap.querySelector('#beachWater');
  const video = wrap.querySelector('.hero-bg-video');
  const img = wrap.querySelector('.hero-bg-img');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canvas) return null;

  video?.classList.add('hidden');
  img?.classList.add('hidden');

  const oceanScene = startOceanRenderer(canvas, wrap, prefersReduced);
  if (!oceanScene) {
    img?.classList.remove('hidden');
    return null;
  }

  requestAnimationFrame(() => oceanScene.resize());

  return { destroy: () => oceanScene.destroy() };
}
