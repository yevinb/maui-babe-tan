(function () {
  'use strict';

  const loader = document.getElementById('loader');
  const loaderPct = document.getElementById('loaderPct');
  const loaderBar = document.getElementById('loaderBar');
  const header = document.getElementById('header');
  const menuBtn = document.getElementById('menuBtn');
  const menuOverlay = document.getElementById('menuOverlay');
  const heroBg = document.getElementById('heroBg');
  const hero = document.getElementById('home');

  let lastScroll = 0;
  let ticking = false;

  /* ── Real asset loader ── */
  const CRITICAL_ASSETS = [
    'assets/hero-beach.jpg',
    'assets/hero-beach.mp4',
    'assets/brand-avatar.jpg',
    'assets/product-pool.jpg',
    'assets/gallery-poolside.jpg',
  ];

  function preloadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = src;
    });
  }

  function preloadVideo(src) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      const done = () => resolve();
      video.addEventListener('canplaythrough', done, { once: true });
      video.addEventListener('loadeddata', done, { once: true });
      video.addEventListener('error', done, { once: true });
      video.src = src;
      video.load();
      setTimeout(done, 4000);
    });
  }

  function updateLoaderProgress(pct) {
    const rounded = Math.min(100, Math.floor(pct));
    if (loaderPct) loaderPct.textContent = rounded + '%';
    if (loaderBar) loaderBar.style.width = rounded + '%';
    window.setLoaderProgress?.(rounded);
  }

  const loadStart = performance.now();
  const MIN_LOADER_MS = 1800;
  let loaded = 0;
  const total = CRITICAL_ASSETS.length + 1;

  CRITICAL_ASSETS.forEach((src) => {
    const load = src.endsWith('.mp4') ? preloadVideo(src) : preloadImage(src);
    load.then(() => {
      loaded++;
      updateLoaderProgress((loaded / total) * 100);
      if (loaded >= total) maybeFinishLoader();
    });
  });

  document.fonts.ready.then(() => {
    loaded++;
    updateLoaderProgress((loaded / total) * 100);
    if (loaded >= total) maybeFinishLoader();
  });

  function maybeFinishLoader() {
    const elapsed = performance.now() - loadStart;
    const wait = Math.max(0, MIN_LOADER_MS - elapsed);
    setTimeout(() => {
      updateLoaderProgress(100);
      setTimeout(finishLoader, 600);
    }, wait);
  }

  function finishLoader() {
    loader?.classList.add('done');
    document.body.style.overflow = '';
    setTimeout(() => loader?.remove(), 1200);
    document.querySelectorAll('.reveal').forEach((el, i) => {
      if (el.closest('.hero')) {
        setTimeout(() => el.classList.add('visible'), 150 + i * 80);
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
    updateActiveNav();
    ticking = false;
  }

  /* ── Scroll spy nav ── */
  const navLinks = document.querySelectorAll('.nav a[href^="#"]');
  const navSections = [...navLinks]
    .map((link) => {
      const id = link.getAttribute('href')?.slice(1);
      const el = id ? document.getElementById(id) : null;
      return el ? { id, el } : null;
    })
    .filter(Boolean);

  function updateActiveNav() {
    if (!navSections.length) return;
    const offset = 140;
    let current = navSections[0].id;
    navSections.forEach(({ id, el }) => {
      if (el.offsetTop - offset <= window.scrollY) current = id;
    });
    navLinks.forEach((link) => {
      const id = link.getAttribute('href')?.slice(1);
      link.classList.toggle('active', id === current);
    });
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

  function parallax() {
    const y = window.scrollY;
    if (heroBg) heroBg.style.transform = `translate3d(0, ${y * 0.22}px, 0)`;
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
    { threshold: 0.1, rootMargin: '0px 0px -30px 0px' }
  );
  reveals.forEach((el) => observer.observe(el));

  /* ── Product 3D tilt ── */
  if (window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('[data-tilt]').forEach((card) => {
      const shine = document.createElement('div');
      shine.className = 'tilt-shine';
      card.appendChild(shine);

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(1000px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(6px)`;
        shine.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.2) 0%, transparent 55%)`;
        shine.style.opacity = '1';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        shine.style.opacity = '0';
      });
    });
  }

  /* ── Gallery drag + touch scroll ── */
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

    let touchStartX = 0;
    let touchScrollLeft = 0;
    galleryTrack.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].pageX;
      touchScrollLeft = galleryTrack.scrollLeft;
    }, { passive: true });
    galleryTrack.addEventListener('touchmove', (e) => {
      const x = e.touches[0].pageX;
      galleryTrack.scrollLeft = touchScrollLeft - (x - touchStartX) * 1.2;
    }, { passive: true });
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
