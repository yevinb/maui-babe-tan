const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const NATURAL_FRAG = `
  precision mediump float;
  uniform sampler2D uTex;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float water = smoothstep(0.10, 0.26, uv.y) * (1.0 - smoothstep(0.46, 0.64, uv.y));
    float t = uTime;
    vec2 ripple = vec2(
      sin(uv.x * 24.0 + t * 1.0) * 0.003,
      cos(uv.x * 17.0 - t * 0.7) * 0.002
    ) * water;
    vec3 col = texture2D(uTex, clamp(uv + ripple, 0.002, 0.998)).rgb;
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, 1.06);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
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

function startVideo(wrap, video) {
  if (!video) return () => {};

  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.loop = true;
  video.autoplay = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');

  const play = () => video.play().catch(() => {});

  play();
  video.addEventListener('loadeddata', play);
  video.addEventListener('canplay', play);

  window.addEventListener('hero:ready', play, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) play();
  });

  const observer = new IntersectionObserver(
    ([entry]) => { if (entry.isIntersecting) play(); },
    { threshold: 0.01 }
  );
  observer.observe(wrap);

  return () => {
    observer.disconnect();
    video.removeEventListener('loadeddata', play);
    video.removeEventListener('canplay', play);
  };
}

function startNaturalRenderer(canvas, wrap, video, prefersReduced) {
  const gl =
    canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'high-performance' }) ||
    canvas.getContext('experimental-webgl');
  if (!gl || !video) return null;

  const program = linkProgram(gl, VERT, NATURAL_FRAG);
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

  let running = true;
  let animId;
  const start = performance.now();
  let width = 0;
  let height = 0;
  let glLive = false;
  let lastVideoTime = -1;
  let movingFrames = 0;

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

  function uploadVideoFrame() {
    if (video.readyState < 2) return false;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      return true;
    } catch (_) {
      return false;
    }
  }

  function draw(now) {
    if (!running) return;
    animId = requestAnimationFrame(draw);

    if (video.paused) video.play().catch(() => {});

    const uploaded = uploadVideoFrame();
    if (!uploaded) return;

    const t = video.currentTime;
    if (t !== lastVideoTime) {
      movingFrames++;
      lastVideoTime = t;
    }

    if (!glLive && movingFrames >= 3) {
      glLive = true;
      canvas.classList.add('natural-active');
      wrap.classList.add('webgl-active');
    }

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
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

  resize();
  window.addEventListener('resize', resize);
  draw(start);

  return {
    resize,
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.classList.remove('natural-active');
      wrap.classList.remove('webgl-active');
    },
  };
}

export function initLiveBeach(wrap) {
  if (!wrap) return null;

  const video = wrap.querySelector('.hero-bg-video');
  const img = wrap.querySelector('.hero-bg-img');
  const canvas = wrap.querySelector('#beachWater');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (img) img.style.display = 'none';

  if (!video) return null;

  wrap.classList.add('video-live');
  const stopVideoHelpers = startVideo(wrap, video);

  if (prefersReduced || !canvas) {
    return { destroy: stopVideoHelpers };
  }

  const renderer = startNaturalRenderer(canvas, wrap, video, prefersReduced);

  window.addEventListener('hero:ready', () => {
    renderer?.resize();
    video.play().catch(() => {});
  }, { once: true });

  return {
    destroy() {
      stopVideoHelpers();
      renderer?.destroy();
    },
  };
}
