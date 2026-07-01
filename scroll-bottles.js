import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function makeMiniBottle() {
  const g = new THREE.Group();
  const brown = new THREE.MeshPhysicalMaterial({ color: 0x3d2a22, roughness: 0.4, clearcoat: 0.5 });
  const gold = new THREE.MeshPhysicalMaterial({ color: 0xe8b84a, roughness: 0.3, metalness: 0.2 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 1.2, 16), brown);
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.5, 16, 1, true), gold);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.15, 12), brown);
  cap.position.y = 0.68;
  label.position.y = 0.05;
  g.add(body, label, cap);
  g.scale.setScalar(0.35);
  return g;
}

export function initScrollBottles() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;
  if (prefersReduced || isMobile) return null;

  const sections = document.querySelectorAll('section, .marquee-wrap, .cta');
  if (!sections.length) return null;

  const canvas = document.createElement('canvas');
  canvas.id = 'scrollBottlesCanvas';
  canvas.className = 'scroll-bottles-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  scene.add(new THREE.AmbientLight(0xfff5e6, 0.5));
  const light = new THREE.PointLight(0xe8b84a, 1.2, 100);
  light.position.set(0, 0, 20);
  scene.add(light);

  const bottles = [];
  sections.forEach((section, i) => {
    if (section.id === 'home') return;
    const b = makeMiniBottle();
    b.userData.section = section;
    b.userData.offset = i * 1.3;
    bottles.push(b);
    scene.add(b);
  });

  let mouseX = 0;
  let running = true;
  let animId;
  const clock = new THREE.Clock();

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function updatePositions() {
    const scrollMid = window.scrollY + window.innerHeight * 0.5;
    bottles.forEach((b) => {
      const rect = b.userData.section.getBoundingClientRect();
      const sectionMid = rect.top + rect.height * 0.5;
      const x = (rect.left + rect.width * 0.85) / window.innerWidth * 2 - 1;
      const y = -(sectionMid / window.innerHeight) * 2 + 1;

      b.position.x = x * 8 + mouseX * 0.5;
      b.position.y = y * 6;
      b.position.z = -Math.abs(sectionMid - window.innerHeight * 0.5) * 0.02;

      const vis = Math.max(0, 1 - Math.abs(sectionMid - window.innerHeight * 0.5) / (window.innerHeight * 0.6));
      b.visible = vis > 0.05;
      b.rotation.y = clock.getElapsedTime() * 0.5 + b.userData.offset;
      b.rotation.x = Math.sin(clock.getElapsedTime() * 0.4 + b.userData.offset) * 0.2;
    });
    camera.position.z = 15;
    camera.lookAt(mouseX, 0, 0);
  }

  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    updatePositions();
    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  }, { passive: true });
  window.addEventListener('scroll', updatePositions, { passive: true });
  animate();

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      canvas.remove();
      renderer.dispose();
    },
  };
}
