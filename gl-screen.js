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
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uScroll;
  uniform vec2 uRes;
  varying vec2 vUv;

  float caustic(vec2 uv, float t) {
    vec2 p = uv * 8.0;
    float c = 0.0;
    c += sin(p.x * 1.8 + t * 0.7) * sin(p.y * 2.1 - t * 0.5);
    c += sin(p.x * 2.5 - t * 0.9) * sin(p.y * 1.6 + t * 0.6) * 0.5;
    c += sin((p.x + p.y) * 1.4 + t * 0.4) * 0.3;
    return c * 0.5 + 0.5;
  }

  void main() {
    vec2 uv = vUv;
    vec2 m = uMouse * 0.5 + 0.5;

    // Caustic light ripples across whole page
    float c = caustic(uv + uScroll * 0.5, uTime);
    float caustics = pow(c, 3.0) * 0.12;

    // Mouse ripple
    float dist = distance(uv, m);
    float ripple = sin(dist * 30.0 - uTime * 3.0) * exp(-dist * 3.0) * 0.08;

    // Vignette pulse
    float vig = 1.0 - length((uv - 0.5) * vec2(1.2, 1.0));
    vig = smoothstep(0.0, 0.7, vig);

    // Chromatic edge on scroll
    float aberration = uScroll * 0.03 * sin(uTime * 0.5);

    vec3 col = vec3(0.0);
    col += vec3(0.55, 0.85, 0.95) * caustics;
    col += vec3(0.95, 0.85, 0.55) * caustics * 0.5;
    col += vec3(1.0) * ripple;
    col += vec3(0.9, 0.75, 0.4) * (1.0 - vig) * 0.04;

    float alpha = (caustics + ripple + (1.0 - vig) * 0.03) * (0.6 + uScroll * 0.4);
    gl_FragColor = vec4(col, alpha);
  }
`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
}

export function initGlScreen() {
  const canvas = document.getElementById('glScreen');
  if (!canvas) return null;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
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
  const uTime = gl.getUniformLocation(program, 'uTime');
  const uMouse = gl.getUniformLocation(program, 'uMouse');
  const uScroll = gl.getUniformLocation(program, 'uScroll');
  const uRes = gl.getUniformLocation(program, 'uRes');

  let mouseX = 0;
  let mouseY = 0;
  let scrollY = 0;
  let running = true;
  let animId;
  const start = performance.now();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(now) {
    if (!running) return;
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
    gl.uniform1f(uTime, t);
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uScroll, scrollY);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function onPointerMove(e) {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  function onScroll() {
    scrollY = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  draw(start);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
    },
  };
}
