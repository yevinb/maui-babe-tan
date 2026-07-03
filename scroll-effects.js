export function initScrollEffects() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return { destroy() {} };

  const interludeBg = document.getElementById('interludeBg');
  const interludeText = document.querySelector('.interlude-text');
  const heroCopy = document.querySelector('.hero-copy');
  const clipHeads = document.querySelectorAll('[data-clip-reveal]');
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const vh = window.innerHeight;

      if (interludeBg) {
        const section = interludeBg.closest('.interlude');
        if (section) {
          const rect = section.getBoundingClientRect();
          const progress = 1 - (rect.top + rect.height * 0.5) / (vh + rect.height);
          const clamped = Math.max(0, Math.min(1, progress));
          interludeBg.style.transform = `translate3d(0, ${(clamped - 0.5) * 80}px, 0) scale(${1.08 + clamped * 0.06})`;
          if (interludeText) {
            interludeText.style.transform = `scale(${0.92 + clamped * 0.12})`;
            interludeText.style.opacity = String(0.5 + clamped * 0.5);
          }
        }
      }

      clipHeads.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const visible = rect.top < vh * 0.88 && rect.bottom > 0;
        el.classList.toggle('clipped-in', visible);
      });

      ticking = false;
    });
  }

  if (heroCopy && window.matchMedia('(hover: hover)').matches) {
    heroCopy.addEventListener('mousemove', (e) => {
      const rect = heroCopy.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      heroCopy.style.transform = `translate3d(${x * 8}px, ${y * 6}px, 0)`;
    });
    heroCopy.addEventListener('mouseleave', () => {
      heroCopy.style.transform = '';
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  return {
    destroy() {
      window.removeEventListener('scroll', onScroll);
    },
  };
}
