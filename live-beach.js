const VERT = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

/* Real video passthrough — subtle refraction only, no fake colours or caustics */
const NATURAL_FRAG = `
  precision mediump float;
  uniform sampler2D uTex;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    float water = smoothstep(0.15, 0.30, uv.y) * (1.0 - smoothstep(0.50, 0.65, uv.y));
    float t = uTime * 0.4;
    vec2 offset = vec2(
      sin(uv.x * 18.0 + t) * 0.0012,
      sin(uv.x * 12.0 - t * 0.7) * 0.0008
    ) * water;

    vec3 col = texture2D(uTex, clamp(uv + offset, 0.002, 0.998)).rgb;
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, 1.05);
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

function setupDirectVideo(wrap, video, img) {
  wrap.classList.add('video-fallback');
  const canvas = wrap.querySelector('#beachWater');
  canvas?.classList.remove('natural-active');

  if (video) {
    video.classList.remove('hidden');
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute('playsinline', '');
    const play = () => video.play().catch(() => {});
    video.addEventListener('canplay', play, { once: true });
    if (video.readyState >= 2) play();
    else video.load();
  } else if (img) {
    img.classList.remove('hidden');
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!video) return;
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    },
    { threshold: 0.05 }
  );
  observer.observe(wrap);

  return {
    destroy() {
      observer.disconnect();
      video?.pause();
    },
  };
}

function startNaturalRenderer(canvas, wrap, video, img, prefersReduced) {
  const gl =
    canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance' }) ||
    canvas.getContext('experimental-webgl');
  if (!gl) return null;

  const program = linkProgram(gl, VERT, NATURAL_FRAG);
  if (!program) return null;

  const source = video || img;
  if (!source) return null;

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

  const isVideo = source.tagName === 'VIDEO';
  let texReady = false;

  function upload() {
    if (isVideo && source.readyState < 2) return false;
    if (!isVideo && !source.complete) return false;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      texReady = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  let running = true;
  let animId;
  const start = performance.now();
  let width = 0;
  let height = 0;

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

    if (!texReady) upload();
    if (!texReady) return;

    if (isVideo && source.readyState >= 2) {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      try {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      } catch (_) {
        return;
      }
    }

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTex, 0);
    gl.uniform1f(uTime, prefersReduced ? 0 : (now - start) * 0.001);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (!canvas.classList.contains('natural-active')) {
      canvas.classList.add('natural-active');
      wrap.classList.add('webgl-active');
    }
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

  if (prefersReduced) {
    img?.classList.remove('hidden');
    return setupDirectVideo(wrap, null, img);
  }

  if (video) {
    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';
    video.load();
    video.play().catch(() => {});
  }

  const renderer = canvas ? startNaturalRenderer(canvas, wrap, video, img, prefersReduced) : null;

  if (!renderer) {
    return setupDirectVideo(wrap, video, img);
  }

  const tryPlay = () => video?.play().catch(() => {});

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!video) return;
      if (entry.isIntersecting) tryPlay();
      else video.pause();
    },
    { threshold: 0.05 }
  );
  observer.observe(wrap);

  window.addEventListener('hero:ready', () => {
    renderer.resize();
    tryPlay();
  }, { once: true });

  requestAnimationFrame(() => {
    renderer.resize();
    tryPlay();
  });

  return {
    destroy() {
      renderer.destroy();
      observer.disconnect();
      video?.pause();
    },
  };
}
