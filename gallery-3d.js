export function initGallery3D() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const track = document.getElementById('galleryTrack');
  if (!track || prefersReduced || window.innerWidth < 768) return null;

  const slides = track.querySelectorAll('.gallery-slide');
  if (!slides.length) return null;

  function update() {
    const trackRect = track.getBoundingClientRect();
    const centerX = trackRect.left + trackRect.width * 0.5;

    slides.forEach((slide) => {
      const rect = slide.getBoundingClientRect();
      const slideCenter = rect.left + rect.width * 0.5;
      const offset = (slideCenter - centerX) / trackRect.width;
      const clamped = Math.max(-1.2, Math.min(1.2, offset));

      const rotateY = clamped * -12;
      const translateZ = (1 - Math.abs(clamped)) * 40;
      const scale = 0.94 + (1 - Math.abs(clamped) / 1.2) * 0.06;

      slide.style.transform = `perspective(900px) rotateY(${rotateY}deg) translateZ(${translateZ}px) scale(${scale})`;
    });
  }

  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', update);
  update();

  return { destroy() {} };
}
