export function initLiveBeach(wrap) {
  const canvas = wrap?.querySelector('#beachWater');
  const img = wrap?.querySelector('.hero-bg-img');
  if (!canvas || !wrap) return null;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let running = true;
  let animId;
  let start = performance.now();
  let waterLine = 0.38;
  let staticDrawn = false;

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

  function waveY(x, t, base, amp, freq, speed) {
    return (
      base +
      Math.sin(x * freq + t * speed) * amp +
      Math.sin(x * freq * 1.8 + t * speed * 1.3) * amp * 0.45 +
      Math.sin(x * freq * 0.5 + t * speed * 0.7) * amp * 0.25
    );
  }

  function drawGlints(t) {
    const baseY = height * waterLine;
    const glintCount = width > 600 ? 5 : 3;

    for (let i = 0; i < glintCount; i++) {
      const phase = t * 0.4 + i * 1.7;
      const x = ((Math.sin(phase * 0.3 + i) * 0.5 + 0.5) * width * 0.7 + width * 0.15);
      const y = baseY + 30 + Math.sin(phase + i) * 25 + i * 18;
      const w = 60 + Math.sin(phase * 2) * 20;
      const grad = ctx.createLinearGradient(x - w, y, x + w, y);
      grad.addColorStop(0, 'rgba(255,255,255,0)');
      grad.addColorStop(0.45, 'rgba(255,248,220,0.35)');
      grad.addColorStop(0.55, 'rgba(255,255,255,0.5)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.globalAlpha = 0.25 + Math.sin(phase * 1.5) * 0.1;
      ctx.fillRect(x - w, y - 2, w * 2, 4);
    }
    ctx.globalAlpha = 1;
  }

  function drawFoam(t) {
    const shoreY = height * (waterLine + 0.06);
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 3) {
      const y = shoreY + Math.sin(x * 0.02 + t * 1.2) * 4 + Math.sin(x * 0.05 - t * 0.8) * 2;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    const foam = ctx.createLinearGradient(0, shoreY - 10, 0, shoreY + 40);
    foam.addColorStop(0, 'rgba(255,255,255,0.22)');
    foam.addColorStop(0.5, 'rgba(220,240,255,0.12)');
    foam.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = foam;
    ctx.fill();
  }

  function drawWaves(t) {
    const baseY = height * waterLine;
    const layers = [
      { amp: 16, freq: 0.008, speed: 0.9, color: 'rgba(12, 95, 140, 0.45)' },
      { amp: 11, freq: 0.012, speed: 1.2, color: 'rgba(20, 130, 170, 0.35)' },
      { amp: 8, freq: 0.018, speed: 1.6, color: 'rgba(40, 160, 195, 0.28)' },
      { amp: 6, freq: 0.025, speed: 2.0, color: 'rgba(100, 210, 235, 0.22)' },
    ];

    ctx.clearRect(0, 0, width, height);

    const maskGrad = ctx.createLinearGradient(0, baseY - 80, 0, baseY + 120);
    maskGrad.addColorStop(0, 'rgba(0,0,0,0)');
    maskGrad.addColorStop(0.15, 'rgba(0,0,0,0.6)');
    maskGrad.addColorStop(1, 'rgba(0,0,0,1)');

    layers.forEach((layer, i) => {
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 2) {
        ctx.lineTo(x, waveY(x, t + i * 0.5, baseY + i * 6, layer.amp, layer.freq, layer.speed));
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = layer.color;
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = maskGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'source-over';

    drawGlints(t);
    drawFoam(t);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    const baseY = height * waterLine;
    const grad = ctx.createLinearGradient(0, baseY, 0, height);
    grad.addColorStop(0, 'rgba(30, 140, 180, 0.15)');
    grad.addColorStop(1, 'rgba(10, 80, 120, 0.25)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, baseY, width, height - baseY);
  }

  function animate(now) {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    const t = (now - start) * 0.001;
    if (prefersReduced) {
      if (!staticDrawn) {
        drawStatic();
        staticDrawn = true;
      }
      return;
    }
    drawWaves(t);
  }

  function onImgLoad() {
    resize();
    if (img && img.naturalHeight) {
      const ratio = img.naturalWidth / img.naturalHeight;
      const displayRatio = width / height;
      if (ratio > displayRatio) {
        waterLine = 0.34;
      } else {
        waterLine = 0.4;
      }
    }
  }

  resize();
  if (img?.complete) onImgLoad();
  else img?.addEventListener('load', onImgLoad);

  window.addEventListener('resize', resize);

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
