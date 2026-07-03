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
    video.load();
  }

  function syncVideo() {
    if (!video || !videoReady) return;
    const t = (progress / 100) * duration;
    if (Math.abs(video.currentTime - t) > 0.05) {
      video.currentTime = t;
    }
  }

  function drawWaveOverlay(t) {
    if (!ctx || !canvas) return;
    const p = progress / 100;
    ctx.clearRect(0, 0, width, height);

    const waveFront = height * (1.05 - p * 0.9);
    ctx.beginPath();
    for (let x = 0; x <= width; x += 3) {
      const y = waveFront + Math.sin(x * 0.008 + t * 1.2) * 8;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fill();
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
