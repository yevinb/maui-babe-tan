export function initLoaderWave() {
  const loader = document.getElementById('loader');
  const video = document.getElementById('loaderOceanVideo');
  const canvas = document.getElementById('loaderWave');
  if (!loader) return () => {};

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas?.getContext('2d', { alpha: true });

  let width = 0;
  let height = 0;
  let dpr = 1;
  let progress = 0;
  let targetProgress = 0;
  let running = true;
  let animId;
  let start = performance.now();
  let videoReady = false;
  let duration = 10;

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    if (canvas) {
      dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  function setupVideo() {
    if (!video) return;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';

    const onReady = () => {
      videoReady = true;
      duration = video.duration || 10;
      video.pause();
      syncVideo();
    };

    video.addEventListener('loadedmetadata', onReady, { once: true });
    video.addEventListener('canplay', onReady, { once: true });
    video.addEventListener('error', () => { videoReady = false; });
    video.load();
  }

  function syncVideo() {
    if (!video || !videoReady) return;
    const t = (progress / 100) * duration;
    if (Math.abs(video.currentTime - t) > 0.05) {
      video.currentTime = t;
    }
  }

  function crestY(x, t, baseY, amp) {
    return (
      baseY +
      Math.sin(x * 0.008 + t * 1.6) * amp +
      Math.sin(x * 0.015 - t * 1.1) * amp * 0.45 +
      Math.sin(x * 0.004 + t * 0.7) * amp * 0.25
    );
  }

  function drawWaveOverlay(t) {
    if (!ctx || !canvas) return;
    const p = progress / 100;

    ctx.clearRect(0, 0, width, height);

    const startY = height * 1.05;
    const endY = height * 0.12;
    const waveFront = startY + (endY - startY) * p;

    // Deep sapphire wash behind the wave
    const deepGrad = ctx.createLinearGradient(0, waveFront - 120, 0, height);
    deepGrad.addColorStop(0, 'rgba(8, 80, 130, 0.35)');
    deepGrad.addColorStop(0.4, 'rgba(12, 120, 165, 0.28)');
    deepGrad.addColorStop(1, 'rgba(20, 160, 195, 0.15)');
    ctx.fillStyle = deepGrad;
    ctx.fillRect(0, waveFront - 60, width, height - waveFront + 60);

    // Turquoise body fill
    ctx.fillStyle = 'rgba(30, 150, 185, 0.18)';
    ctx.fillRect(0, waveFront, width, height - waveFront);

    // Luxury foam layers
    const layers = [
      { offset: 50, alpha: 0.18, amp: 18, color: 'rgba(180, 235, 255,' },
      { offset: 28, alpha: 0.32, amp: 13, color: 'rgba(210, 245, 255,' },
      { offset: 8, alpha: 0.5, amp: 9, color: 'rgba(240, 252, 255,' },
    ];

    layers.forEach((layer, i) => {
      const base = waveFront - layer.offset;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 3) {
        ctx.lineTo(x, crestY(x, t + i * 0.5, base, layer.amp));
      }
      ctx.lineTo(width, height);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, base - 40, 0, base + 60);
      grad.addColorStop(0, `${layer.color}${layer.alpha})`);
      grad.addColorStop(0.35, `rgba(100, 200, 230, ${layer.alpha * 0.55})`);
      grad.addColorStop(0.7, `rgba(40, 150, 190, ${layer.alpha * 0.2})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Bright aqua crest line
    ctx.beginPath();
    for (let x = 0; x <= width; x += 2) {
      const y = crestY(x, t * 1.3, waveFront, 8);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const crestAlpha = 0.5 + p * 0.45;
    ctx.strokeStyle = `rgba(220, 248, 255, ${crestAlpha})`;
    ctx.lineWidth = 2.5 + p * 5;
    ctx.shadowColor = 'rgba(120, 220, 255, 0.9)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Sparkles on water surface above wave
    const sparkleCount = width > 700 ? 12 : 7;
    for (let i = 0; i < sparkleCount; i++) {
      const phase = t * 0.6 + i * 1.7;
      const sx = (Math.sin(phase * 0.35 + i * 2.3) * 0.5 + 0.5) * width;
      const sy = waveFront - 40 - i * 18 + Math.sin(phase) * 12;
      if (sy < 0) continue;
      const size = 1.5 + Math.sin(phase * 2.2) * 1.2;
      ctx.globalAlpha = 0.15 + Math.sin(phase * 1.8) * 0.12;
      ctx.fillStyle = '#c8f0ff';
      ctx.beginPath();
      ctx.ellipse(sx, sy, size * 4, size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw(t) {
    syncVideo();
    if (!prefersReduced) drawWaveOverlay(t);
  }

  function animate(now) {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    progress += (targetProgress - progress) * 0.09;
    draw((now - start) * 0.001);
  }

  resize();
  setupVideo();
  window.addEventListener('resize', resize);
  animate(start);

  return function setProgress(p) {
    targetProgress = Math.min(100, Math.max(0, p));
  };
}
