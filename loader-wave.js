export function initLoaderWave() {
  const canvas = document.getElementById('loaderWave');
  const track = document.getElementById('loaderWaveTrack');
  if (!canvas || !track) return () => {};

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return () => {};

  let width = 0;
  let height = 0;
  let dpr = 1;
  let progress = 0;
  let targetProgress = 0;
  let running = true;
  let animId;
  let start = performance.now();

  // Path endpoints — ocean (right) → shore (left)
  let startPt = { x: 0, y: 0 };
  let endPt = { x: 0, y: 0 };

  function resize() {
    const rect = track.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const pad = 28;
    const midY = height * 0.5;
    startPt = { x: width - pad, y: midY }; // ocean — start
    endPt = { x: pad, y: midY };           // shore — finish
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function drawWaveAt(x, y, t, scale) {
    const amp = 10 * scale;
    const freq = 0.14;

    // Foam body
    ctx.beginPath();
    ctx.moveTo(x - 50 * scale, y + 20);
    for (let i = -50; i <= 50; i += 2) {
      const px = x + i * scale;
      const py = y + Math.sin(i * freq + t * 3) * amp * scale;
      ctx.lineTo(px, py);
    }
    ctx.lineTo(x + 50 * scale, y + 20);
    ctx.closePath();
    const foam = ctx.createLinearGradient(x - 40 * scale, y - 15, x + 40 * scale, y + 15);
    foam.addColorStop(0, 'rgba(255,255,255,0.85)');
    foam.addColorStop(0.5, 'rgba(200,240,255,0.7)');
    foam.addColorStop(1, 'rgba(255,255,255,0.2)');
    ctx.fillStyle = foam;
    ctx.fill();

    // Crest line
    ctx.beginPath();
    for (let i = -50; i <= 50; i += 2) {
      const px = x + i * scale;
      const py = y + Math.sin(i * freq + t * 3) * amp * scale;
      if (i === -50) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.lineWidth = 2.5 * scale;
    ctx.shadowColor = 'rgba(255,255,255,0.8)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function draw(t) {
    ctx.clearRect(0, 0, width, height);
    const p = progress / 100;

    // Travel path line
    ctx.beginPath();
    ctx.moveTo(startPt.x, startPt.y);
    ctx.lineTo(endPt.x, endPt.y);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Water trail — shows how far the wave has travelled
    const waveX = lerp(startPt.x, endPt.x, p);
    const waveY = lerp(startPt.y, endPt.y, p);

    if (p > 0.01) {
      ctx.beginPath();
      ctx.moveTo(startPt.x, startPt.y);
      ctx.lineTo(waveX, waveY);
      ctx.strokeStyle = 'rgba(80,200,220,0.45)';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Endpoint markers
    // Ocean (start)
    ctx.beginPath();
    ctx.arc(startPt.x, startPt.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1fa3b0';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Shore (end)
    ctx.beginPath();
    ctx.arc(endPt.x, endPt.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#d4c4a8';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Traveling wave
    if (!prefersReduced) {
      drawWaveAt(waveX, waveY, t, 1);
    } else {
      ctx.beginPath();
      ctx.arc(waveX, waveY, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
    }

    // Pulse at destination when nearly done
    if (p > 0.92) {
      const pulse = (Math.sin(t * 6) * 0.5 + 0.5) * (p - 0.92) / 0.08;
      ctx.beginPath();
      ctx.arc(endPt.x, endPt.y, 6 + pulse * 12, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${pulse * 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function animate(now) {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    const elapsed = (now - start) * 0.001;
    progress += (targetProgress - progress) * 0.1;
    draw(elapsed);
  }

  resize();
  window.addEventListener('resize', resize);
  animate(start);

  return function setProgress(p) {
    targetProgress = Math.min(100, Math.max(0, p));
  };
}
