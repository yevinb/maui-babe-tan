const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAG = `
  precision mediump float;
  uniform sampler2D uTex;
  uniform float uTime;
  varying vec2 vUv;

  float wave(float x, float t, float freq, float speed, float amp) {
    return sin(x * freq + t * speed) * amp
         + sin(x * freq * 1.7 - t * speed * 1.3) * amp * 0.5;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;
    float tide = sin(t * 0.35) * 0.028;

    float skyMask = smoothstep(0.58, 0.72, uv.y);
    float waterMask = smoothstep(0.32, 0.44, uv.y) * (1.0 - smoothstep(0.56, 0.66, uv.y));
    float shoreMask = smoothstep(0.30, 0.40, uv.y) * (1.0 - smoothstep(0.44, 0.52, uv.y));
    float sandMask = 1.0 - smoothstep(0.18, 0.34, uv.y);

    vec2 d = uv;
    d.y += tide;

    d.x += skyMask * sin(t * 0.12 + uv.y * 3.0) * 0.006;

    float w = wave(uv.x, t, 18.0, 1.4, 0.018)
            + wave(uv.x, t, 28.0, 2.0, 0.01)
            + wave(uv.x, t, 8.0, 0.9, 0.025);
    d.x += w * waterMask;
    d.y += (wave(uv.x, t, 22.0, 1.8, 0.012) + sin(t * 0.8) * 0.008) * waterMask;

    float foam = wave(uv.x, t, 35.0, 2.5, 0.007) + sin(uv.x * 50.0 - t * 3.0) * 0.004;
    d.y += foam * shoreMask;

    d.x += sin(uv.x * 40.0 + t * 2.5) * 0.003 * sandMask;
    d.y += (sin(uv.x * 25.0 - t * 1.8) * 0.002 + tide * 0.5) * sandMask;

    d = clamp(d, 0.001, 0.999);
    vec3 col = texture2D(uTex, d).rgb;

    float glint = pow(max(0.0, sin(uv.x * 120.0 + t * 3.5) * sin(uv.y * 80.0 - t * 2.0)), 16.0);
    col += vec3(1.0, 0.95, 0.8) * glint * waterMask * 0.4;

    float foamBright = pow(max(0.0, sin(uv.x * 60.0 - t * 2.8)), 5.0) * shoreMask;
    col = mix(col, vec3(1.0), foamBright * 0.3);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
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
  return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
}

function waveY(x, t, base, amp, freq, speed) {
  return (
    base +
    Math.sin(x * freq + t * speed) * amp +
    Math.sin(x * freq * 1.6 - t * speed * 1.2) * amp * 0.5 +
    Math.sin(x * freq * 0.45 + t * speed * 0.7) * amp * 0.3
  );
}

function initTideOverlay(canvas, wrap) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let running = true;
  let animId;
  let start = performance.now();
  // Shoreline position — tuned for beach video (waves at bottom)
  let shoreLine = 0.58;

  function resize() {
    const rect = wrap.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawTide(t) {
    ctx.clearRect(0, 0, width, height);

    // Slow tide cycle — waterline moves up and down the sand
    const tideCycle = Math.sin(t * 0.32);
    const tidePull = Math.sin(t * 0.32 + 1.2) * 0.5 + 0.5;
    const baseShore = height * (shoreLine + tideCycle * 0.045);

    // Deep ocean swell (higher on screen)
    const swellY = height * (0.38 + tideCycle * 0.015);
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 3) {
      ctx.lineTo(x, waveY(x, t, swellY, 10, 0.006, 0.7));
    }
    ctx.lineTo(width, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    const swellGrad = ctx.createLinearGradient(0, swellY - 30, 0, swellY + 80);
    swellGrad.addColorStop(0, 'rgba(30, 160, 200, 0.08)');
    swellGrad.addColorStop(0.5, 'rgba(60, 190, 220, 0.12)');
    swellGrad.addColorStop(1, 'rgba(100, 220, 255, 0)');
    ctx.fillStyle = swellGrad;
    ctx.fill();

    // Rolling wave layers washing toward shore
    const layers = [
      { amp: 14, freq: 0.009, speed: 1.1, offset: 0, foam: 0.28 },
      { amp: 10, freq: 0.013, speed: 1.5, offset: 18, foam: 0.35 },
      { amp: 7, freq: 0.019, speed: 2.0, offset: 32, foam: 0.42 },
      { amp: 5, freq: 0.026, speed: 2.6, offset: 48, foam: 0.5 },
    ];

    layers.forEach((layer, i) => {
      const layerBase = baseShore + layer.offset - tidePull * 25;
      const phase = t + i * 0.8;

      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 2) {
        ctx.lineTo(x, waveY(x, phase, layerBase, layer.amp, layer.freq, layer.speed));
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, layerBase - 25, 0, layerBase + 50);
      grad.addColorStop(0, `rgba(255, 255, 255, ${layer.foam * 0.35})`);
      grad.addColorStop(0.25, `rgba(200, 240, 255, ${layer.foam * 0.25})`);
      grad.addColorStop(0.6, `rgba(120, 210, 240, ${layer.foam * 0.12})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // White foam crest line — the tide edge
    ctx.beginPath();
    for (let x = 0; x <= width; x += 2) {
      const y = waveY(x, t * 1.3, baseShore - 8, 6, 0.022, 2.2);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.35 + tidePull * 0.25})`;
    ctx.lineWidth = 3 + tidePull * 4;
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Wet sand wash — tide receding leaves shimmer
    const washY = baseShore + 20;
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 3) {
      ctx.lineTo(x, washY + Math.sin(x * 0.03 + t * 1.5) * 6 + tideCycle * 12);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    const washGrad = ctx.createLinearGradient(0, washY - 5, 0, washY + 40);
    washGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
    washGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = washGrad;
    ctx.fill();

    // Sun sparkles on moving water
    const sparkleCount = width > 700 ? 8 : 5;
    for (let i = 0; i < sparkleCount; i++) {
      const phase = t * 0.5 + i * 2.1;
      const sx = (Math.sin(phase * 0.4 + i) * 0.5 + 0.5) * width;
      const sy = swellY + 40 + Math.sin(phase) * 30 + i * 15;
      const size = 2 + Math.sin(phase * 2) * 1.5;
      ctx.globalAlpha = 0.2 + Math.sin(phase * 1.5) * 0.15;
      ctx.fillStyle = '#fff8e0';
      ctx.beginPath();
      ctx.ellipse(sx, sy, size * 3, size, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function animate(now) {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    const t = prefersReduced ? 0 : (now - start) * 0.001;
    drawTide(t);
  }

  resize();
  window.addEventListener('resize', resize);
  canvas.classList.add('tide-active');

  const observer = new IntersectionObserver(
    ([entry]) => {
      running = entry.isIntersecting;
      if (running) animate(performance.now());
    },
    { threshold: 0.05 }
  );
  observer.observe(wrap);

  animate(start);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
    },
  };
}

function startWebGLFallback(canvas, img, wrap, prefersReduced) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return null;

  const program = createProgram(gl, VERT, FRAG);
  if (!program) return null;

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, 'aPos');
  const uTex = gl.getUniformLocation(program, 'uTex');
  const uTime = gl.getUniformLocation(program, 'uTime');

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  let texReady = false;
  const uploadTex = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    texReady = true;
  };
  if (img.complete) uploadTex();
  else img.addEventListener('load', uploadTex);

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
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resize();
  window.addEventListener('resize', resize);
  canvas.classList.add('webgl-active');
  img.classList.add('hidden');

  function draw(now) {
    if (!running || !texReady) return;
    animId = requestAnimationFrame(draw);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTex, 0);
    gl.uniform1f(uTime, prefersReduced ? 0 : (now - start) * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  draw(start);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    },
  };
}

export function initLiveBeach(wrap) {
  if (!wrap) return null;

  const video = wrap.querySelector('.hero-bg-video');
  const img = wrap.querySelector('.hero-bg-img');
  const canvas = wrap.querySelector('#beachWater');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let tideScene = null;
  let webglScene = null;
  let videoObserver = null;
  let videoPlaying = false;

  function setupVideo() {
    if (!video || prefersReduced) return;

    const onReady = () => {
      videoPlaying = true;
      video.classList.add('playing');
      img?.classList.add('hidden');
    };

    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const play = () => video.play().then(onReady).catch(() => {});

    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('error', () => startPhotoFallback(), { once: true });

    if (video.readyState >= 2) play();
    else {
      video.addEventListener('loadeddata', play, { once: true });
      video.load();
      play();
    }

    videoObserver = new IntersectionObserver(
      ([entry]) => {
        if (!video) return;
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.05 }
    );
    videoObserver.observe(wrap);

    setTimeout(() => {
      if (!videoPlaying) startPhotoFallback();
    }, 3000);
  }

  function startPhotoFallback() {
    if (!canvas || !img || webglScene) return;
    tideScene?.destroy();
    tideScene = null;
    canvas.classList.remove('tide-active');
    video?.classList.add('hidden');
    img.classList.remove('hidden');
    webglScene = startWebGLFallback(canvas, img, wrap, prefersReduced);
  }

  function startTideOverlay() {
    if (!canvas || tideScene) return;
    // Tide overlay sits on top of video; WebGL fallback replaces the canvas entirely
    if (!webglScene) {
      tideScene = initTideOverlay(canvas, wrap);
    }
  }

  setupVideo();
  startTideOverlay();

  return {
    destroy() {
      tideScene?.destroy();
      webglScene?.destroy();
      videoObserver?.disconnect();
      video?.pause();
    },
  };
}
