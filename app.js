(function () {
  const loader = document.getElementById('loader');
  const header = document.getElementById('header');
  const menuBtn = document.getElementById('menuBtn');
  const mobileNav = document.getElementById('mobileNav');

  window.addEventListener('load', () => {
    setTimeout(() => loader?.classList.add('hide'), 700);
  });

  window.addEventListener('scroll', () => {
    header?.classList.toggle('scrolled', window.scrollY > 48);
  });

  menuBtn?.addEventListener('click', () => {
    menuBtn.classList.toggle('open');
    mobileNav?.classList.toggle('open');
    document.body.style.overflow = mobileNav?.classList.contains('open') ? 'hidden' : '';
  });

  mobileNav?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuBtn?.classList.remove('open');
      mobileNav.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  const reveals = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('visible');
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -32px 0px' }
  );
  reveals.forEach((el) => observer.observe(el));
})();
