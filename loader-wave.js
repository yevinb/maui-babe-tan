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
    return baseY + Math.sin(x * 0.008 + t * 1.6) * amp + Math.sin(x * 0.015 - t * 1.1) * amp * 0.45;
  }

  function drawWaveOverlay(t) {
    if (!ctx || !canvas) return;
    const p = progress / 100;

    ctx.clearRect(0, 0, width, height);

    // Wave travels bottom → top (ocean washing onto beach in the video)
    const startY = height * 1.05;
    const endY = height * 0.15;
    const waveFront = startY + (endY - startY) * p;

    // Wet sand trail behind the wave
    ctx.fillStyle = 'rgba(120,200,220,0.12)';
    ctx.fillRect(0, waveFront, width, height - waveFront);

    // Foam layers
    const layers = [
      { offset: 40, alpha: 0.2, amp: 16 },
      { offset: 20, alpha: 0.35, amp: 12 },
      { offset: 0, alpha: 0.55, amp: 9 },
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
      const grad = ctx.createLinearGradient(0, base - 30, 0, base + 50);
      grad.addColorStop(0, `rgba(255,255,255,${layer.alpha})`);
      grad.addColorStop(0.5, `rgba(200,240,255,${layer.alpha * 0.6})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.fill();
    });

    // Bright crest
    ctx.beginPath();
    for (let x = 0; x <= width; x += 2) {
      const y = crestY(x, t * 1.3, waveFront, 7);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = `rgba(255,255,255,${0.45 + p * 0.4})`;
    ctx.lineWidth = 3 + p * 4;
    ctx.shadowColor = 'rgba(255,255,255,0.7)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
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
