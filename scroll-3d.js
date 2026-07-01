export function initScroll3D() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return null;

  const sections = document.querySelectorAll('[data-scroll-3d]');
  if (!sections.length) return null;

  document.documentElement.classList.add('scroll-3d-active');

  let ticking = false;

  function update() {
    const vh = window.innerHeight;

    sections.forEach((section) => {
      const inner = section.querySelector('.scroll-3d-inner') || section;
      const rect = section.getBoundingClientRect();
      const center = rect.top + rect.height * 0.5;
      const dist = (center - vh * 0.5) / vh;
      const clamped = Math.max(-1, Math.min(1, dist));

      const rotateX = clamped * -10;
      const translateZ = (1 - Math.abs(clamped)) * 40 - 20;
      const scale = 0.96 + (1 - Math.abs(clamped)) * 0.04;

      inner.style.transform = `perspective(1400px) rotateX(${rotateX}deg) translateZ(${translateZ}px) scale(${scale})`;
      inner.style.opacity = String(0.7 + (1 - Math.abs(clamped)) * 0.3);
    });

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });

  update();

  return { destroy() {} };
}
