(function () {
  'use strict';

  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => [...ctx.querySelectorAll(s)];

  const loader = $('#loader');
  const loaderBar = $('#loaderBar');
  const loaderPct = $('#loaderPct');
  const header = $('#header');
  const menuBtn = $('#menuBtn');
  const menuOverlay = $('#menuOverlay');
  const heroBg = $('#heroBg');
  const interludeBg = $('#interludeBg');
  const hero = $('#home');
  const progress = $('#progress');
  const cursor = $('#cursor');
  const cursorRing = $('#cursorRing');
  const stickyBar = $('#stickyBar');
  const galleryTrack = $('#galleryTrack');

  let lastScroll = 0;
  let ticking = false;
  let cursorX = 0, cursorY = 0;
  let ringX = 0, ringY = 0;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── Preload + Loader ── */
  const images = $$('img[src]');
  let loaded = 0;
  const total = images.length;

  function updateLoader() {
    loaded++;
    const pct = Math.min(100, Math.round((loaded / total) * 100));
    if (loaderBar) loaderBar.style.width = pct + '%';
    if (loaderPct) loaderPct.textContent = pct + '%';
    if (loaded >= total) setTimeout(finishLoader, 400);
  }

  images.forEach((img) => {
    if (img.complete) updateLoader();
    else {
      img.addEventListener('load', updateLoader);
      img.addEventListener('error', updateLoader);
    }
  });

  setTimeout(finishLoader, 3500);

  function finishLoader() {
    loader?.classList.add('done');
    document.body.style.overflow = '';
    setTimeout(() => loader?.remove(), 1400);
    initSplitText();
    $$('.hero .reveal').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), 300 + i * 120);
    });
  }

  document.body.style.overflow = 'hidden';

  /* ── Split text ── */
  function initSplitText() {
    $$('.split-text, .split-text-sm').forEach((el) => {
      const text = el.textContent.trim();
      el.innerHTML = '';
      text.split(' ').forEach((word, wi) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'word';
        word.split('').forEach((char, ci) => {
          const charSpan = document.createElement('span');
          charSpan.className = 'char';
          charSpan.textContent = char;
          charSpan.style.transitionDelay = `${(wi * 4 + ci) * 0.02}s`;
          wordSpan.appendChild(charSpan);
        });
        el.appendChild(wordSpan);
      });
      requestAnimationFrame(() => el.classList.add('visible'));
    });
  }

  /* ── Custom cursor ── */
  if (hasFinePointer && !prefersReduced) {
    document.body.classList.add('has-cursor');

    document.addEventListener('mousemove', (e) => {
      cursorX = e.clientX;
      cursorY = e.clientY;
      if (cursor) {
        cursor.style.left = cursorX + 'px';
        cursor.style.top = cursorY + 'px';
      }
    });

    function animateRing() {
      ringX += (cursorX - ringX) * 0.15;
      ringY += (cursorY - ringY) * 0.15;
      if (cursorRing) {
        cursorRing.style.left = ringX + 'px';
        cursorRing.style.top = ringY + 'px';
      }
      requestAnimationFrame(animateRing);
    }
    animateRing();

    $$('a, button, .product, .ig-tile').forEach((el) => {
      el.addEventListener('mouseenter', () => cursorRing?.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursorRing?.classList.remove('hover'));
    });
  }

  /* ── Magnetic elements ── */
  if (hasFinePointer) {
    $$('.magnetic').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* ── Scroll progress + header ── */
  function onScroll() {
    const y = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? (y / docH) * 100 : 0;
    if (progress) progress.style.width = pct + '%';

    const heroBottom = hero ? hero.offsetHeight - 120 : 600;
    header?.classList.toggle('solid', y > 60);
    header?.classList.toggle('hero-pass', y < heroBottom);
    header?.classList.toggle('hide', y > lastScroll && y > 200);

    stickyBar?.classList.toggle('visible', y > 600);
    lastScroll = y;

    if (!prefersReduced) parallax(y);
    ticking = false;
  }

  function parallax(y) {
    if (heroBg) heroBg.style.transform = `translate3d(0, ${y * 0.25}px, 0)`;
    if (interludeBg) {
      const rect = interludeBg.getBoundingClientRect();
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * 0.1;
      interludeBg.style.transform = `translate3d(0, ${offset}px, 0)`;
    }
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
  onScroll();

  /* ── Menu ── */
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

  /* ── Reveal observer ── */
  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        revealObs.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
  );

  $$('.reveal:not(.hero .reveal), .clip-reveal, .scale-text').forEach((el) => {
    revealObs.observe(el);
  });

  /* ── Product tilt ── */
  if (hasFinePointer) {
    $$('[data-tilt]').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg)`;
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ── Gallery ── */
  if (galleryTrack) {
    const prev = $('#galleryPrev');
    const next = $('#galleryNext');
    const scrollAmt = () => galleryTrack.clientWidth * 0.7;

    prev?.addEventListener('click', () => {
      galleryTrack.scrollBy({ left: -scrollAmt(), behavior: 'smooth' });
    });
    next?.addEventListener('click', () => {
      galleryTrack.scrollBy({ left: scrollAmt(), behavior: 'smooth' });
    });

    let isDown = false, startX, scrollLeft;
    galleryTrack.addEventListener('mousedown', (e) => {
      isDown = true;
      startX = e.pageX;
      scrollLeft = galleryTrack.scrollLeft;
      galleryTrack.style.cursor = 'grabbing';
    });
    window.addEventListener('mouseup', () => {
      isDown = false;
      galleryTrack.style.cursor = '';
    });
    galleryTrack.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      galleryTrack.scrollLeft = scrollLeft - (e.pageX - startX) * 1.2;
    });
  }

  /* ── Smooth anchors ── */
  $$('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const id = anchor.getAttribute('href');
      if (!id || id === '#') return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth' });
    });
  });
})();
