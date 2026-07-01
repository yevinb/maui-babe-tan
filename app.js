(function () {
  'use strict';

  const loader = document.getElementById('loader');
  const loaderPct = document.getElementById('loaderPct');
  const header = document.getElementById('header');
  const menuBtn = document.getElementById('menuBtn');
  const menuOverlay = document.getElementById('menuOverlay');
  const heroBg = document.getElementById('heroBg');
  const interludeBg = document.getElementById('interludeBg');
  const hero = document.getElementById('home');

  let lastScroll = 0;
  let ticking = false;

  /* ── Loader ── */
  let progress = 0;
  const tickLoader = setInterval(() => {
    progress += Math.random() * 18 + 8;
    if (progress >= 100) {
      progress = 100;
      clearInterval(tickLoader);
      window.setLoaderProgress?.(100);
      setTimeout(finishLoader, 700);
    }
    if (loaderPct) loaderPct.textContent = Math.floor(progress) + '%';
    window.setLoaderProgress?.(progress);
  }, 120);

  function finishLoader() {
    loader?.classList.add('done');
    document.body.style.overflow = '';
    setTimeout(() => loader?.remove(), 1400);
    document.querySelectorAll('.reveal').forEach((el, i) => {
      if (el.closest('.hero')) {
        setTimeout(() => el.classList.add('visible'), 200 + i * 100);
      }
    });
  }

  document.body.style.overflow = 'hidden';

  /* ── Header scroll ── */
  function updateHeader() {
    const y = window.scrollY;
    const heroBottom = hero ? hero.offsetHeight - 120 : 600;

    header?.classList.toggle('solid', y > 60);
    header?.classList.toggle('hero-pass', y < heroBottom);
    header?.classList.toggle('hide', y > lastScroll && y > 200);
    lastScroll = y;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateHeader();
        parallax();
      });
      ticking = true;
    }
  }, { passive: true });

  updateHeader();

  /* ── Parallax ── */
  function parallax() {
    const y = window.scrollY;
    if (heroBg) heroBg.style.transform = `translate3d(0, ${y * 0.28}px, 0)`;
  }

  /* ── Mobile menu ── */
  function toggleMenu(open) {
    const isOpen = open ?? !menuOverlay?.classList.contains('open');
    menuBtn?.classList.toggle('open', isOpen);
    menuOverlay?.classList.toggle('open', isOpen);
    document.body.classList.toggle('menu-open', isOpen);
    menuBtn?.setAttribute('aria-expanded', String(isOpen));
    menuOverlay?.setAttribute('aria-hidden', String(!isOpen));
  }

  menuBtn?.addEventListener('click', () => toggleMenu());
  menuOverlay?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  /* ── Reveal on scroll ── */
  const reveals = document.querySelectorAll('.reveal:not(.hero .reveal)');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  reveals.forEach((el) => observer.observe(el));

  /* Product tilt handled by WebGL (product-gl.js) */
  const galleryTrack = document.getElementById('galleryTrack');
  if (galleryTrack) {
    let isDown = false;
    let startX;
    let scrollLeft;

    galleryTrack.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX - galleryTrack.offsetLeft;
      scrollLeft = galleryTrack.scrollLeft;
      galleryTrack.style.cursor = 'grabbing';
    });
    galleryTrack.addEventListener('mouseleave', () => {
      isDown = false;
      galleryTrack.style.cursor = '';
    });
    galleryTrack.addEventListener('mouseup', () => {
      isDown = false;
      galleryTrack.style.cursor = '';
    });
    galleryTrack.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - galleryTrack.offsetLeft;
      galleryTrack.scrollLeft = scrollLeft - (x - startX) * 1.5;
    });
  }

  /* ── Smooth anchor scroll ── */
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });
})();
