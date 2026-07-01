import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function createCardScene(canvas, card) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.z = 4;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(2.8, 1.8, 0.06),
    new THREE.MeshPhysicalMaterial({
      color: card.classList.contains('featured') ? 0xe8b84a : 0xffffff,
      roughness: 0.15,
      metalness: 0.2,
      transparent: true,
      opacity: 0.12,
    })
  );
  scene.add(frame);

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(2.8, 1.8, 0.06)),
    new THREE.LineBasicMaterial({ color: 0xe8b84a, transparent: true, opacity: 0.4 })
  );
  scene.add(edges);

  const particles = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const p = new THREE.Mesh(
      new THREE.SphereGeometry(0.03, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xf5d78e, transparent: true, opacity: 0.5 })
    );
    p.position.set((Math.random() - 0.5) * 2.5, (Math.random() - 0.5) * 1.5, Math.random() * 0.5);
    particles.add(p);
  }
  scene.add(particles);

  scene.add(new THREE.AmbientLight(0xfff5e6, 0.5));
  const rim = new THREE.PointLight(0xe8b84a, 0.8, 10);
  rim.position.set(2, 2, 3);
  scene.add(rim);

  let targetRotX = 0;
  let targetRotY = 0;
  let running = false;
  let animId;
  const clock = new THREE.Clock();

  function resize() {
    const rect = card.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
  }

  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    frame.rotation.y += (targetRotY - frame.rotation.y) * 0.08;
    frame.rotation.x += (targetRotX - frame.rotation.x) * 0.08;
    edges.rotation.copy(frame.rotation);

    if (!prefersReduced) {
      particles.children.forEach((p, i) => {
        p.position.y += Math.sin(t * 2 + i) * 0.002;
      });
    }

    renderer.render(scene, camera);
  }

  card.addEventListener('pointermove', (e) => {
    const rect = card.getBoundingClientRect();
    targetRotY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.4;
    targetRotX = ((e.clientY - rect.top) / rect.height - 0.5) * -0.25;
  });
  card.addEventListener('pointerleave', () => { targetRotX = 0; targetRotY = 0; });

  const observer = new IntersectionObserver(([entry]) => {
    running = entry.isIntersecting;
    if (running) animate();
  }, { threshold: 0.1 });

  resize();
  window.addEventListener('resize', resize);
  observer.observe(card);
  card.style.position = card.style.position || 'relative';

  return { destroy() { running = false; cancelAnimationFrame(animId); observer.disconnect(); renderer.dispose(); } };
}

export function initCardsGL() {
  const cards = document.querySelectorAll('.review-card, .delivery-card, .trust-item');
  const scenes = [];

  cards.forEach((card) => {
    const canvas = document.createElement('canvas');
    canvas.className = 'card-gl-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    card.prepend(canvas);
    scenes.push(createCardScene(canvas, card));
  });

  return { destroy: () => scenes.forEach((s) => s.destroy()) };
}
