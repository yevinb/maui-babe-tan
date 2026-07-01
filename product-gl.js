import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function createProductScene(canvas, img) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.z = 3.2;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const texture = new THREE.TextureLoader().load(img.src);
  texture.colorSpace = THREE.SRGBColorSpace;

  const frameGeo = new THREE.BoxGeometry(1.6, 2.0, 0.08);
  const frameMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.15,
  });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  scene.add(frame);

  const planeGeo = new THREE.PlaneGeometry(1.5, 1.88);
  const planeMat = new THREE.MeshPhysicalMaterial({
    map: texture,
    roughness: 0.3,
    metalness: 0.05,
    clearcoat: 0.4,
    clearcoatRoughness: 0.2,
  });
  const plane = new THREE.Mesh(planeGeo, planeMat);
  plane.position.z = 0.05;
  scene.add(plane);

  const shineGeo = new THREE.PlaneGeometry(1.5, 1.88);
  const shineMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  const shine = new THREE.Mesh(shineGeo, shineMat);
  shine.position.z = 0.06;
  scene.add(shine);

  scene.add(new THREE.AmbientLight(0xfff5e6, 0.6));
  const key = new THREE.DirectionalLight(0xfff0d0, 1.2);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.PointLight(0xe8b84a, 0.8, 10);
  rim.position.set(-2, 1, 2);
  scene.add(rim);

  let targetRotX = 0;
  let targetRotY = 0;
  let running = false;
  let animId;
  const clock = new THREE.Clock();
  const parent = canvas.parentElement;

  function resize() {
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function setPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    targetRotY = ((clientX - rect.left) / rect.width - 0.5) * 0.5;
    targetRotX = ((clientY - rect.top) / rect.height - 0.5) * -0.35;
    shineMat.opacity = 0.15;
    shine.position.x = targetRotY * 0.3;
    shine.position.y = -targetRotX * 0.3;
  }

  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    plane.rotation.y += (targetRotY - plane.rotation.y) * 0.08;
    plane.rotation.x += (targetRotX - plane.rotation.x) * 0.08;
    frame.rotation.copy(plane.rotation);

    if (!prefersReduced) {
      plane.position.y = Math.sin(t * 0.8) * 0.03;
      frame.position.y = plane.position.y;
      shine.position.y = plane.position.y + shine.position.y * 0.1;
    }

    renderer.render(scene, camera);
  }

  const observer = new IntersectionObserver(
    ([entry]) => {
      running = entry.isIntersecting;
      if (running) animate();
    },
    { threshold: 0.1 }
  );

  resize();
  window.addEventListener('resize', resize);
  canvas.addEventListener('pointermove', (e) => setPointer(e.clientX, e.clientY));
  canvas.addEventListener('pointerleave', () => {
    targetRotX = 0;
    targetRotY = 0;
    shineMat.opacity = 0;
  });
  if (parent) observer.observe(parent);

  img.style.opacity = '0';

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      renderer.dispose();
      img.style.opacity = '';
    },
  };
}

export function initProductGL() {
  const cards = document.querySelectorAll('.product-visual[data-gl-card]');
  const scenes = [];

  cards.forEach((visual) => {
    const img = visual.querySelector('img');
    if (!img) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'product-gl-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    visual.appendChild(canvas);

    const boot = () => scenes.push(createProductScene(canvas, img));
    if (img.complete) boot();
    else img.addEventListener('load', boot, { once: true });
  });

  return {
    destroy() {
      scenes.forEach((s) => s.destroy());
    },
  };
}
