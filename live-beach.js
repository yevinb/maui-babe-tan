const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const OCEAN_FRAG = `
  precision highp float;

  uniform sampler2D uTex;
  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  const vec3 DEEP_SAPPHIRE = vec3(0.01, 0.14, 0.32);
  const vec3 TURQUOISE     = vec3(0.08, 0.68, 0.78);
  const vec3 AQUA_GLOW     = vec3(0.45, 0.92, 1.0);
  const vec3 SKY_CYAN      = vec3(0.55, 0.82, 0.95);

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
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p *= 2.1;
      a *= 0.5;
    }
    return v;
  }

  float wave(float x, float t, float freq, float speed, float amp) {
    return sin(x * freq + t * speed) * amp
         + sin(x * freq * 1.71 - t * speed * 1.35) * amp * 0.48
         + sin(x * freq * 0.42 + t * speed * 0.65) * amp * 0.22;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    float ax = uv.x * aspect;

    float skyMask   = smoothstep(0.60, 0.76, uv.y);
    float waterMask = smoothstep(0.26, 0.40, uv.y) * (1.0 - smoothstep(0.50, 0.64, uv.y));
    float deepWater = smoothstep(0.40, 0.54, uv.y) * waterMask;
    float shoreMask = smoothstep(0.26, 0.36, uv.y) * (1.0 - smoothstep(0.36, 0.46, uv.y));
    float sandMask  = 1.0 - smoothstep(0.10, 0.30, uv.y);

    float tide = sin(t * 0.26) * 0.014 + sin(t * 0.41 + 1.3) * 0.006;

    vec2 d = uv;
    d.y += tide;

    float wx = wave(ax, t, 12.0, 1.1, 0.016)
             + wave(ax, t, 22.0, 1.7, 0.009)
             + wave(ax, t, 7.5, 0.85, 0.022);
    float wy = wave(ax, t, 16.0, 1.4, 0.011) + sin(t * 0.75) * 0.006;
    d.x += wx * waterMask;
    d.y += wy * waterMask;
    d.x += sin(ax * 48.0 + t * 2.2) * 0.0025 * shoreMask;

    d = clamp(d, 0.001, 0.999);
    vec3 col = texture2D(uTex, d).rgb;
    float luma = dot(col, vec3(0.299, 0.587, 0.114));

    // Luxury blue grade — push water toward sapphire / turquoise
    vec3 graded = col;
    graded.r *= 1.0 - waterMask * 0.18;
    graded.g *= 1.0 + waterMask * 0.12;
    graded.b *= 1.0 + waterMask * 0.32;
    col = mix(col, graded, waterMask * 0.82);

    vec3 deepLux = mix(col, DEEP_SAPPHIRE + col * vec3(0.45, 0.88, 1.15), 0.42);
    col = mix(col, deepLux, deepWater * 0.55);

    vec3 aquaMid = mix(col, TURQUOISE * 0.25 + col * 1.08, 0.3);
    col = mix(col, aquaMid, waterMask * 0.28);

    // Caustics — underwater luxury light dance
    vec2 cUv = uv * vec2(14.0 * aspect, 10.0);
    float caustic = fbm(cUv + t * 0.35) * fbm(cUv * 1.4 - t * 0.28 + 4.0);
    caustic = pow(caustic, 2.2);
    col += AQUA_GLOW * caustic * (deepWater * 0.16 + waterMask * 0.06);

    // Surface shimmer streaks
    float streak = sin(ax * 90.0 - t * 2.8 + uv.y * 55.0) * sin(uv.y * 70.0 + t * 2.0);
    streak = pow(max(0.0, streak), 10.0);
    col += vec3(0.85, 0.97, 1.0) * streak * waterMask * 0.42;

    // Broad sun glint patches
    float glint = pow(max(0.0, sin(ax * 55.0 + t * 1.6) * sin(uv.y * 45.0 - t * 1.2)), 14.0);
    col += vec3(1.0, 0.98, 0.92) * glint * waterMask * 0.28;

    // Shore foam — crisp white-blue
    float foamWave = wave(ax, t, 30.0, 2.2, 0.007) + sin(ax * 65.0 - t * 3.2) * 0.004;
    float shoreY = 0.37 + foamWave + tide * 1.5;
    float foamLine = smoothstep(0.018, 0.0, abs(uv.y - shoreY));
    float foamBody = smoothstep(shoreY + 0.02, shoreY - 0.06, uv.y) * shoreMask;
    col = mix(col, vec3(0.92, 0.98, 1.0), foamLine * shoreMask * 0.75);
    col = mix(col, mix(col, vec3(0.75, 0.93, 0.98), 0.5), foamBody * 0.22);

    // Wet sand — reflective turquoise wash
    float wetSand = sandMask * (0.55 + 0.45 * sin(ax * 8.0 + t * 0.9));
    col = mix(col, col * vec3(0.88, 0.96, 1.05) + TURQUOISE * 0.06, wetSand * 0.2);

    // Sky — soft cyan horizon blend
    vec3 skyCol = mix(col, col * vec3(0.88, 0.94, 1.12) + SKY_CYAN * 0.04, skyMask * 0.5);
    col = mix(col, skyCol, skyMask);

    // Saturation & clarity
    col = mix(vec3(luma), col, 1.0 + waterMask * 0.32);
    col = pow(max(col, vec3(0.0)), vec3(0.94));

    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn('Shader compile:', gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

function createProgram(gl, vs, fs) {
  const v = compileShader(gl, gl.VERTEX_SHADER, vs);
  const f = compileShader(gl, gl.FRAGMENT_SHADER, fs);
  if (!v || !f) return null;
  const p = gl.createProgram();
  gl.attachShader(p, v);
  gl.attachShader(p, f);
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    console.warn('Program link:', gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

function startOceanRenderer(canvas, source, wrap, prefersReduced) {
  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  });
  if (!gl) return null;

  const program = createProgram(gl, VERT, OCEAN_FRAG);
  if (!program) return null;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, 'aPos');
  const uTex = gl.getUniformLocation(program, 'uTex');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uResolution = gl.getUniformLocation(program, 'uResolution');

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  const isVideo = source.tagName === 'VIDEO';
  let texReady = false;

  const uploadTex = () => {
    if (isVideo && source.readyState < 2) return;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      texReady = true;
    } catch (_) { /* video not ready yet */ }
  };

  if (isVideo) {
    source.addEventListener('loadeddata', uploadTex);
    source.addEventListener('canplay', uploadTex);
  } else if (source.complete) {
    uploadTex();
  } else {
    source.addEventListener('load', uploadTex);
  }

  let running = true;
  let animId;
  const start = performance.now();
  let width = 0;
  let height = 0;

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resize();
  window.addEventListener('resize', resize);
  canvas.classList.add('ocean-active');

  function draw(now) {
    if (!running) return;
    animId = requestAnimationFrame(draw);
    if (!texReady) {
      uploadTex();
      if (!texReady) return;
    }

    if (isVideo && !source.paused && source.readyState >= 2) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      } catch (_) { return; }
    }

    gl.clearColor(0.01, 0.12, 0.28, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTex, 0);
    gl.uniform1f(uTime, prefersReduced ? 0 : (now - start) * 0.001);
    gl.uniform2f(uResolution, width, height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  draw(start);

  return {
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

  const video = wrap.querySelector('.hero-bg-video');
  const img = wrap.querySelector('.hero-bg-img');
  const canvas = wrap.querySelector('#beachWater');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let oceanScene = null;
  let videoObserver = null;
  let videoPlaying = false;

  function activateOcean(source) {
    if (!canvas || oceanScene) return;
    oceanScene = startOceanRenderer(canvas, source, wrap, prefersReduced);
    if (oceanScene) {
      video?.classList.add('hidden');
      img?.classList.add('hidden');
    }
  }

  function setupVideo() {
    if (!video || prefersReduced) {
      if (img) activateOcean(img);
      return;
    }

    const onReady = () => {
      videoPlaying = true;
      activateOcean(video);
    };

    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const play = () => video.play().then(onReady).catch(() => {});

    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('error', () => {
      if (img) activateOcean(img);
    }, { once: true });

    if (video.readyState >= 2) play();
    else {
      video.addEventListener('loadeddata', play, { once: true });
      video.load();
      play();
    }

    videoObserver = new IntersectionObserver(
      ([entry]) => {
        if (!video || !videoPlaying) return;
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.05 }
    );
    videoObserver.observe(wrap);

    setTimeout(() => {
      if (!videoPlaying && img) activateOcean(img);
    }, 3000);
  }

  setupVideo();

  return {
    destroy() {
      oceanScene?.destroy();
      videoObserver?.disconnect();
      video?.pause();
      video?.classList.remove('hidden');
      img?.classList.remove('hidden');
    },
  };
}
