export function initGallery3D() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const track = document.getElementById('galleryTrack');
  if (!track || prefersReduced) return null;

  const slides = track.querySelectorAll('.gallery-slide');
  if (!slides.length) return null;

  track.style.perspective = '1200px';
  track.style.transformStyle = 'preserve-3d';

  slides.forEach((slide, i) => {
    slide.style.transformStyle = 'preserve-3d';
    slide.dataset.glIndex = String(i);
  });

  function update() {
    const trackRect = track.getBoundingClientRect();
    const centerX = trackRect.left + trackRect.width * 0.5;

    slides.forEach((slide) => {
      const rect = slide.getBoundingClientRect();
      const slideCenter = rect.left + rect.width * 0.5;
      const offset = (slideCenter - centerX) / trackRect.width;
      const clamped = Math.max(-1.5, Math.min(1.5, offset));

      const rotateY = clamped * -22;
      const translateZ = (1 - Math.abs(clamped)) * 100;
      const scale = 0.88 + (1 - Math.abs(clamped) / 1.5) * 0.12;

      slide.style.transform = `rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
      slide.style.opacity = String(0.65 + (1 - Math.abs(clamped) / 1.5) * 0.35);
    });
  }

  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', update);
  update();

  return { destroy() {} };
}
