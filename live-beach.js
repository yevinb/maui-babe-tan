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
  uniform vec2 uRes;
  varying vec2 vUv;

  float wave(float x, float t, float freq, float speed, float amp) {
    return sin(x * freq + t * speed) * amp
         + sin(x * freq * 1.7 - t * speed * 1.3) * amp * 0.5
         + sin(x * freq * 0.4 + t * speed * 0.6) * amp * 0.3;
  }

  void main() {
    vec2 uv = vUv;
    float t = uTime;

    // vUv.y: 0 = bottom (sand), 1 = top (sky)
    float skyMask = smoothstep(0.58, 0.72, uv.y);
    float waterMask = smoothstep(0.32, 0.44, uv.y) * (1.0 - smoothstep(0.56, 0.66, uv.y));
    float shoreMask = smoothstep(0.30, 0.40, uv.y) * (1.0 - smoothstep(0.44, 0.52, uv.y));
    float sandMask = 1.0 - smoothstep(0.18, 0.34, uv.y);

    vec2 d = uv;

    // Sky — slow cloud drift
    d.x += skyMask * sin(t * 0.12 + uv.y * 3.0) * 0.005;

    // Ocean — rolling waves
    float w = wave(uv.x, t, 18.0, 1.4, 0.014)
            + wave(uv.x, t, 28.0, 2.0, 0.008)
            + wave(uv.x, t, 8.0, 0.9, 0.02);
    d.x += w * waterMask;
    d.y += wave(uv.x, t, 22.0, 1.8, 0.008) * waterMask;
    d.x += sin(uv.y * 30.0 + t * 1.2) * 0.004 * waterMask;

    // Shore foam band
    float foam = wave(uv.x, t, 35.0, 2.5, 0.005) + sin(uv.x * 50.0 - t * 3.0) * 0.003;
    d.y += foam * shoreMask;

    // Wet sand shimmer
    d.x += sin(uv.x * 40.0 + t * 2.5) * 0.002 * sandMask;
    d.y += sin(uv.x * 25.0 - t * 1.8) * 0.0015 * sandMask;

    d = clamp(d, 0.001, 0.999);
    vec3 col = texture2D(uTex, d).rgb;

    // Sun glints on water
    float glint = pow(max(0.0, sin(uv.x * 120.0 + t * 3.5) * sin(uv.y * 80.0 - t * 2.0)), 18.0);
    col += vec3(1.0, 0.95, 0.8) * glint * waterMask * 0.35;

    // Foam white wash at shore
    float foamBright = pow(max(0.0, sin(uv.x * 60.0 - t * 2.8)), 6.0) * shoreMask;
    col = mix(col, vec3(1.0), foamBright * 0.25);

    // Warm sand pulse
    col += vec3(0.06, 0.03, 0.0) * sandMask * sin(t * 1.5) * 0.15;

    gl_FragColor = vec4(col, 1.0);
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

export function initLiveBeach(wrap) {
  if (!wrap) return null;

  const video = wrap.querySelector('.hero-bg-video');
  const img = wrap.querySelector('.hero-bg-img');
  const canvas = wrap.querySelector('#beachWater');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let running = true;
  let animId;
  let observer;
  let glScene = null;

  function setupVideo() {
    if (!video || prefersReduced) return false;

    const onReady = () => {
      video.classList.add('playing');
      img?.classList.add('hidden');
      canvas?.classList.add('hidden');
    };

    video.addEventListener('loadeddata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });

    video.muted = true;
    video.playsInline = true;
    video.loop = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    const play = () => {
      video.play().then(onReady).catch(() => startWebGL());
    };

    if (video.readyState >= 2) play();
    else {
      video.addEventListener('error', () => startWebGL(), { once: true });
      video.addEventListener('loadeddata', play, { once: true });
      video.load();
      play();
    }

    observer = new IntersectionObserver(
      ([entry]) => {
        if (!video) return;
        if (entry.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.05 }
    );
    observer.observe(wrap);

    return true;
  }

  function startWebGL() {
    if (!canvas || !img || glScene) return;
    video?.classList.add('hidden');
    img.classList.remove('hidden');

    const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
    if (!gl) {
      canvas.classList.add('hidden');
      return;
    }

    const program = createProgram(gl, VERT, FRAG);
    if (!program) return;

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'aPos');
    const uTex = gl.getUniformLocation(program, 'uTex');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uRes = gl.getUniformLocation(program, 'uRes');

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

    let width = 0;
    let height = 0;
    let dpr = 1;
    const start = performance.now();

    function resize() {
      const rect = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio, 2);
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
      const t = prefersReduced ? 0 : (now - start) * 0.001;

      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.uniform1i(uTex, 0);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uRes, width, height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    draw(start);
    glScene = { resize, draw, start };
  }

  if (!setupVideo()) {
    startWebGL();
  } else {
    video?.addEventListener('error', () => startWebGL(), { once: true });
    setTimeout(() => {
      if (!video?.classList.contains('playing')) startWebGL();
    }, 2500);
  }

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      observer?.disconnect();
      video?.pause();
    },
  };
}
