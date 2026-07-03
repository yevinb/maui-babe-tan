const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

/* Graded video/image ocean */
const OCEAN_TEX_FRAG = `
  precision mediump float;
  uniform sampler2D uTex;
  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  float wave(float x, float t, float f, float s, float a) {
    return sin(x * f + t * s) * a + sin(x * f * 1.6 - t * s * 1.2) * a * 0.45;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float ax = uv.x * aspect;

    float waterMask = smoothstep(0.22, 0.38, uv.y) * (1.0 - smoothstep(0.48, 0.68, uv.y));
    float deepWater = smoothstep(0.38, 0.52, uv.y) * waterMask;
    float shoreMask = smoothstep(0.22, 0.34, uv.y) * (1.0 - smoothstep(0.34, 0.44, uv.y));

    vec2 d = uv;
    float tide = sin(t * 0.3) * 0.012;
    d.y += tide;
    d.x += wave(ax, t, 14.0, 1.2, 0.014) * waterMask;
    d.y += wave(ax, t, 18.0, 1.5, 0.01) * waterMask;
    d = clamp(d, 0.001, 0.999);

    vec3 col = texture2D(uTex, d).rgb;

    vec3 sapphire = vec3(0.02, 0.22, 0.48);
    vec3 turquoise = vec3(0.12, 0.65, 0.78);

    col.b *= 1.0 + waterMask * 0.45;
    col.g *= 1.0 + waterMask * 0.15;
    col.r *= 1.0 - waterMask * 0.22;
    col = mix(col, sapphire * 0.4 + col * vec3(0.65, 0.92, 1.2), deepWater * 0.65);
    col = mix(col, turquoise * 0.3 + col, waterMask * 0.35);

    float shimmer = pow(max(0.0, sin(ax * 70.0 - t * 2.5) * sin(uv.y * 55.0 + t * 1.8)), 8.0);
    col += vec3(0.7, 0.95, 1.0) * shimmer * waterMask * 0.35;

    float foamY = 0.36 + wave(ax, t, 28.0, 2.0, 0.006);
    float foam = smoothstep(0.015, 0.0, abs(uv.y - foamY)) * shoreMask;
    col = mix(col, vec3(0.9, 0.98, 1.0), foam * 0.7);

    col = pow(max(col, vec3(0.0)), vec3(0.94));
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

/* Pure procedural luxury ocean — always works, no texture needed */
const OCEAN_PROC_FRAG = `
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
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float waves(vec2 p, float t) {
    float w = 0.0;
    w += sin(p.x * 1.8 + t * 0.9) * 0.5;
    w += sin(p.x * 3.2 - t * 1.3) * 0.28;
    w += sin(p.x * 5.5 + t * 1.8) * 0.14;
    w += sin(p.x * 9.0 - t * 2.4) * 0.07;
    return w;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = vec2(uv.x * aspect * 3.5, uv.y * 2.8);

    float horizon = 0.62;
    float sky = smoothstep(horizon - 0.02, horizon + 0.08, uv.y);

    vec3 skyTop = vec3(0.45, 0.72, 0.92);
    vec3 skyHorizon = vec3(0.65, 0.85, 0.95);
    vec3 skyCol = mix(skyHorizon, skyTop, smoothstep(horizon, 1.0, uv.y));

    float w = waves(p, t);
    float w2 = waves(p + vec2(1.3, 0.4), t * 1.1);
    float surface = horizon - 0.02 + w * 0.018 + w2 * 0.008;

    float depth = smoothstep(surface + 0.02, surface - 0.35, uv.y);
    float shallow = smoothstep(surface, surface - 0.12, uv.y);

    vec3 deepSea = vec3(0.01, 0.18, 0.42);
    vec3 midSea = vec3(0.05, 0.38, 0.62);
    vec3 shallowSea = vec3(0.15, 0.62, 0.78);
    vec3 sea = mix(deepSea, midSea, depth * 0.7);
    sea = mix(sea, shallowSea, shallow * 0.65);

    float caustic = noise(p * 4.0 + t * 0.3) * noise(p * 6.0 - t * 0.25);
    caustic = pow(caustic, 2.0) * depth * 0.15;
    sea += vec3(0.4, 0.9, 1.0) * caustic;

    float shimmer = pow(max(0.0, sin(p.x * 8.0 - t * 2.0) * sin(p.y * 6.0 + t * 1.5)), 6.0);
    sea += vec3(0.8, 0.98, 1.0) * shimmer * (1.0 - sky) * 0.25;

    float foam = smoothstep(0.012, 0.0, abs(uv.y - surface)) * shallow;
    sea = mix(sea, vec3(0.92, 0.99, 1.0), foam * 0.85);

    float sand = 1.0 - smoothstep(0.08, 0.22, uv.y);
    vec3 sandCol = vec3(0.82, 0.76, 0.62);
    sandCol = mix(sandCol, shallowSea * 0.5 + sandCol, 0.3);

    vec3 col = mix(sea, sandCol, sand * (1.0 - sky));
    col = mix(col, skyCol, sky);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('Shader error:', gl.getShaderInfoLog(s));
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

function startOceanRenderer(canvas, wrap, { video, img, prefersReduced }) {
  const gl =
    canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'high-performance' }) ||
    canvas.getContext('experimental-webgl');
  if (!gl) return null;

  const texProgram = linkProgram(gl, VERT, OCEAN_TEX_FRAG);
  const procProgram = linkProgram(gl, VERT, OCEAN_PROC_FRAG);
  if (!texProgram && !procProgram) return null;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  let texReady = false;
  let useProcedural = !texProgram;
  let hasDrawn = false;
  let running = true;
  let animId;
  const start = performance.now();
  let width = 0;
  let height = 0;

  function uploadFromSource(source) {
    if (!source || !texProgram) return false;
    if (source.tagName === 'VIDEO' && source.readyState < 2) return false;
    if (source.tagName === 'IMG' && !source.complete) return false;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      texReady = true;
      useProcedural = false;
      return true;
    } catch (e) {
      return false;
    }
  }

  function pickSource() {
    if (video && video.readyState >= 2) {
      try {
        if (uploadFromSource(video)) return 'video';
      } catch (_) {}
    }
    if (img && img.complete) {
      if (uploadFromSource(img)) return 'img';
    }
    return null;
  }

  if (img) {
    if (img.complete) pickSource();
    else img.addEventListener('load', () => pickSource(), { once: true });
  }
  if (video) {
    video.addEventListener('loadeddata', () => pickSource());
    video.addEventListener('canplay', () => pickSource());
  }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const w = Math.max(rect.width, 1);
    const h = Math.max(rect.height, 1);
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

    if (!texReady && texProgram) pickSource();
    if (!texReady && !useProcedural) useProcedural = true;

    const t = prefersReduced ? 0 : (now - start) * 0.001;
    gl.clearColor(0.02, 0.2, 0.42, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf);

    if (!useProcedural && texReady && texProgram) {
      if (video && video.readyState >= 2) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
        } catch (_) {}
      } else if (img && img.complete && texReady) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        try {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        } catch (_) {}
      }

      gl.useProgram(texProgram);
      const aPos = gl.getAttribLocation(texProgram, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(gl.getUniformLocation(texProgram, 'uTex'), 0);
      gl.uniform1f(gl.getUniformLocation(texProgram, 'uTime'), t);
      gl.uniform2f(gl.getUniformLocation(texProgram, 'uResolution'), width, height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    } else if (procProgram) {
      gl.useProgram(procProgram);
      const aPos = gl.getAttribLocation(procProgram, 'aPos');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(gl.getUniformLocation(procProgram, 'uTime'), t);
      gl.uniform2f(gl.getUniformLocation(procProgram, 'uResolution'), width, height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    if (!hasDrawn) {
      hasDrawn = true;
      canvas.classList.add('ocean-active');
      video?.classList.add('hidden');
      img?.classList.add('hidden');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  draw(start);

  return {
    resize,
    playVideo() {
      if (!video) return;
      video.muted = true;
      video.play().catch(() => {});
    },
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.classList.remove('ocean-active');
      video?.classList.remove('hidden');
      img?.classList.remove('hidden');
    },
  };
}

export function initLiveBeach(wrap) {
  if (!wrap) return null;

  const video = wrap.querySelector('.hero-bg-video');
  const img = wrap.querySelector('.hero-bg-img');
  const canvas = wrap.querySelector('#beachWater');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!canvas) return null;

  const oceanScene = startOceanRenderer(canvas, wrap, { video, img, prefersReduced });
  if (!oceanScene) return null;

  if (video && !prefersReduced) {
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.load();

    const tryPlay = () => video.play().catch(() => {});

    const videoObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) tryPlay();
        else video.pause();
      },
      { threshold: 0.05 }
    );
    videoObserver.observe(wrap);

    requestAnimationFrame(() => {
      oceanScene.resize();
      tryPlay();
    });

    return {
      destroy() {
        oceanScene.destroy();
        videoObserver.disconnect();
        video.pause();
      },
    };
  }

  requestAnimationFrame(() => oceanScene.resize());

  return { destroy: () => oceanScene.destroy() };
}
