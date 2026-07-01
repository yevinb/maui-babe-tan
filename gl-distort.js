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
  uniform vec2 uMouse;
  uniform float uStrength;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;
    vec2 m = uMouse * 0.5 + 0.5;
    float dist = distance(uv, m);
    float wave = sin(dist * 12.0 - uTime * 1.5) * 0.012 * uStrength;
    wave += sin(uv.x * 20.0 + uTime) * 0.004 * uStrength;
    wave += sin(uv.y * 15.0 - uTime * 0.8) * 0.003 * uStrength;
    vec2 offset = vec2(wave, wave * 0.6);
    vec3 col = texture2D(uTex, uv + offset).rgb;
    float shine = pow(max(0.0, 1.0 - dist * 1.5), 3.0) * 0.08 * uStrength;
    col += vec3(1.0, 0.9, 0.7) * shine;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

function createDistortScene(wrap) {
  const img = wrap.querySelector('img');
  const canvas = wrap.querySelector('canvas') || (() => {
    const c = document.createElement('canvas');
    c.className = 'gl-distort-canvas';
    c.setAttribute('aria-hidden', 'true');
    wrap.appendChild(c);
    return c;
  })();

  if (!img) return null;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
  if (!gl) return null;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, 'aPos');
  const uTex = gl.getUniformLocation(program, 'uTex');
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uMouse = gl.getUniformLocation(program, 'uMouse');
  const uStrength = gl.getUniformLocation(program, 'uStrength');

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  let texReady = false;
  const upload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    texReady = true;
    img.style.opacity = '0';
  };
  if (img.complete) upload();
  else img.addEventListener('load', upload);

  let mouseX = 0;
  let mouseY = 0;
  let running = false;
  let animId;
  const start = performance.now();
  const strength = parseFloat(wrap.dataset.glStrength || '1');

  function resize() {
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(now) {
    if (!running || !texReady) return;
    animId = requestAnimationFrame(draw);
    const t = prefersReduced ? 0 : (now - start) * 0.001;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uTex, 0);
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uStrength, strength);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  resize();
  window.addEventListener('resize', resize);
  wrap.addEventListener('pointermove', (e) => {
    const rect = wrap.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) / rect.width * 2 - 1;
    mouseY = -((e.clientY - rect.top) / rect.height * 2 - 1);
  });

  const observer = new IntersectionObserver(
    ([entry]) => {
      running = entry.isIntersecting;
      if (running) draw(performance.now());
    },
    { threshold: 0.05 }
  );
  observer.observe(wrap);
  wrap.classList.add('gl-distort-active');

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      img.style.opacity = '';
    },
  };
}

export function initGlDistort() {
  const selectors = [
    '[data-gl-distort]',
    '.gallery-slide',
    '.about-images figure',
    '.trust-item',
    '.marquee-wrap',
  ];
  const seen = new Set();
  const scenes = [];

  selectors.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      const img = el.querySelector('img');
      if (seen.has(el) || !img) return;
      seen.add(el);
      if (!el.dataset.glDistort) el.dataset.glDistort = 'true';
      if (!el.dataset.glStrength) el.dataset.glStrength = el.classList.contains('gallery-slide') ? '0.7' : '0.9';
      const s = createDistortScene(el);
      if (s) scenes.push(s);
    });
  });

  return { destroy: () => scenes.forEach((s) => s.destroy()) };
}
