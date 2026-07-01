export function initLoaderWave() {
  const loader = document.getElementById('loader');
  const canvas = document.getElementById('loaderWave');
  if (!loader || !canvas) return () => {};

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return () => {};

  let width = 0;
  let height = 0;
  let dpr = 1;
  let progress = 0;
  let targetProgress = 0;
  let running = true;
  let finishing = false;
  let finishStart = 0;
  let animId;
  let start = performance.now();

  function resize() {
    dpr = Math.min(window.devicePixelRatio, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function waveLine(x, t, baseX, amp, freq) {
    return baseX + Math.sin(x * freq + t * 1.4) * amp + Math.sin(x * freq * 2.1 - t * 0.9) * amp * 0.4;
  }

  function drawBeach(t) {
    const sandW = width * 0.38;

    // Sand
    const sandGrad = ctx.createLinearGradient(0, 0, sandW, 0);
    sandGrad.addColorStop(0, '#e6d9c4');
    sandGrad.addColorStop(1, '#d4c4a8');
    ctx.fillStyle = sandGrad;
    ctx.fillRect(0, 0, sandW + 40, height);

    // Sand grain
    ctx.fillStyle = 'rgba(180,160,130,0.06)';
    for (let i = 0; i < 80; i++) {
      const sx = (Math.sin(i * 47.3) * 0.5 + 0.5) * sandW;
      const sy = (Math.cos(i * 31.7) * 0.5 + 0.5) * height;
      ctx.fillRect(sx, sy, 2, 1);
    }

    // Ocean
    const oceanGrad = ctx.createLinearGradient(sandW, 0, width, 0);
    oceanGrad.addColorStop(0, '#1fa3b0');
    oceanGrad.addColorStop(0.35, '#168a9e');
    oceanGrad.addColorStop(1, '#0a4f62');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(sandW - 20, 0, width - sandW + 20, height);

    // Ocean ripples
    if (!prefersReduced) {
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i++) {
        ctx.beginPath();
        const oy = height * 0.1 + i * (height * 0.07);
        for (let x = sandW; x <= width; x += 4) {
          const y = oy + Math.sin(x * 0.012 + t * 0.8 + i) * 6;
          if (x === sandW) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }

  function drawFoamLayer(baseX, t, layer, alpha, amp) {
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 3) {
      const y = waveLine(x, t + layer * 0.6, baseX, amp, 0.008 + layer * 0.003);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();

    const grad = ctx.createLinearGradient(baseX - 80, 0, baseX + 60, 0);
    grad.addColorStop(0, `rgba(255,255,255,${alpha * 0.9})`);
    grad.addColorStop(0.4, `rgba(220,245,255,${alpha * 0.6})`);
    grad.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  function draw(t) {
    const p = finishing
      ? Math.min(1, (performance.now() - finishStart) / 800)
      : progress / 100;

    // Wave front: ocean (right) → beach (left)
    const waveFront = width * (1.08 - p * 1.18);

    drawBeach(t);

    if (!prefersReduced) {
      drawFoamLayer(waveFront - 90, t, 3, 0.18, 18);
      drawFoamLayer(waveFront - 55, t, 2, 0.28, 14);
      drawFoamLayer(waveFront - 25, t, 1, 0.4, 10);
      drawFoamLayer(waveFront, t, 0, 0.55, 8);
    } else {
      drawFoamLayer(waveFront, 0, 0, 0.4, 6);
    }

    // Bright foam crest line
    ctx.beginPath();
    for (let x = 0; x <= width; x += 2) {
      const y = waveLine(x, t * 1.2, waveFront, 7, 0.012);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.5 + p * 0.3})`;
    ctx.lineWidth = 4 + p * 6;
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Wet sand sheen behind wave
    if (waveFront < width) {
      ctx.fillStyle = `rgba(180,220,240,${0.08 + p * 0.06})`;
      ctx.fillRect(0, 0, waveFront + 30, height);
    }

    if (finishing) {
      const fade = Math.min(1, (performance.now() - finishStart) / 1200);
      ctx.fillStyle = `rgba(14,10,8,${fade * 0.15})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  function animate(now) {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    const t = (now - start) * 0.001;
    progress += (targetProgress - progress) * 0.12;
    draw(t);
  }

  resize();
  window.addEventListener('resize', resize);
  animate(start);

  return function setProgress(p, isFinish = false) {
    targetProgress = Math.min(100, Math.max(0, p));
    if (isFinish || p >= 100) {
      targetProgress = 100;
      if (!finishing) {
        finishing = true;
        finishStart = performance.now();
      }
    }
  };
}

export function destroyLoaderWave() {
  // called on pagehide if needed
}
