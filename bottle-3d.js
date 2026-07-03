import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

function createLabelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, '#F5D78E');
  grad.addColorStop(0.45, '#F2C94C');
  grad.addColorStop(1, '#D4A43A');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = 'rgba(28, 20, 16, 0.12)';
  ctx.lineWidth = 4;
  ctx.strokeRect(24, 24, canvas.width - 48, canvas.height - 48);

  ctx.fillStyle = '#1C1410';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 148px Georgia, "Times New Roman", serif';
  ctx.fillText('Maui', canvas.width / 2, 168);
  ctx.fillText('Babe', canvas.width / 2, 332);

  ctx.font = '600 38px Georgia, "Times New Roman", serif';
  ctx.letterSpacing = '0.18em';
  ctx.fillText('BROWNING LOTION', canvas.width / 2, 430);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function initBottleScene(canvas) {
  if (!canvas) return null;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.2, 5.5);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.28;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();

  const bottle = new THREE.Group();

  const brownMat = new THREE.MeshPhysicalMaterial({
    color: 0x3d2a22,
    roughness: 0.35,
    metalness: 0.05,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: 0x5c3d2e,
    roughness: 0.2,
    metalness: 0,
    transmission: 0.15,
    transparent: true,
    opacity: 0.9,
  });

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 40), brownMat);
  cap.position.y = 1.72;
  bottle.add(cap);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.45, 40), brownMat);
  neck.position.y = 1.35;
  bottle.add(neck);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.82, 2.4, 48), brownMat);
  body.position.y = 0.05;
  bottle.add(body);

  const labelTex = createLabelTexture();
  labelTex.anisotropy = maxAniso;
  const labelMat = new THREE.MeshPhysicalMaterial({
    map: labelTex,
    color: 0xffffff,
    side: THREE.DoubleSide,
    roughness: 0.32,
    metalness: 0.08,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });

  const label = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.25), labelMat);
  label.position.set(0, 0.1, 0.79);
  label.renderOrder = 2;
  bottle.add(label);

  const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.75, 1.8, 40), liquidMat);
  liquid.position.y = -0.05;
  bottle.add(liquid);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.88, 0.12, 40), brownMat);
  base.position.y = -1.15;
  bottle.add(base);

  bottle.rotation.x = 0.12;
  bottle.rotation.y = -0.4;
  scene.add(bottle);

  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.6, 0.08, 64),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.12,
    })
  );
  platform.position.y = -1.35;
  scene.add(platform);

  scene.add(new THREE.AmbientLight(0xfff5e6, 0.55));

  const key = new THREE.DirectionalLight(0xfff0d0, 1.6);
  key.position.set(3, 5, 4);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x88ccff, 0.45);
  fill.position.set(-4, 2, 2);
  scene.add(fill);

  const rim = new THREE.PointLight(0xe8b84a, 1.5, 14);
  rim.position.set(0, 2, -3);
  scene.add(rim);

  const particles = new THREE.Group();
  const particleGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const particleMat = new THREE.MeshBasicMaterial({ color: 0xf5d78e, transparent: true, opacity: 0.5 });
  for (let i = 0; i < 24; i++) {
    const p = new THREE.Mesh(particleGeo, particleMat);
    p.userData.speed = 0.2 + Math.random() * 0.4;
    p.userData.offset = Math.random() * Math.PI * 2;
    p.userData.angle = (i / 24) * Math.PI * 2;
    particles.add(p);
  }
  scene.add(particles);

  let targetRotX = 0.12;
  let targetRotY = -0.4;

  function setTargetFromPointer(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = ((clientX - rect.left) / rect.width - 0.5) * 2;
    const mouseY = ((clientY - rect.top) / rect.height - 0.5) * 2;
    targetRotY = -0.4 + mouseX * 0.55;
    targetRotX = 0.12 + mouseY * 0.25;
  }

  function onPointerMove(e) {
    if (prefersReduced) return;
    setTargetFromPointer(e.clientX, e.clientY);
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', (e) => canvas.setPointerCapture(e.pointerId));
  canvas.addEventListener('touchmove', (e) => {
    if (prefersReduced || !e.touches[0]) return;
    setTargetFromPointer(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  function resize() {
    const parent = canvas.parentElement;
    if (!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  let running = true;
  let animId;

  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    bottle.rotation.y += (targetRotY - bottle.rotation.y) * 0.06;
    bottle.rotation.x += (targetRotX - bottle.rotation.x) * 0.06;

    if (!prefersReduced) {
      bottle.position.y = Math.sin(t * 0.9) * 0.06;
      bottle.rotation.z = Math.sin(t * 0.5) * 0.03;

      particles.children.forEach((p) => {
        const a = t * p.userData.speed + p.userData.offset;
        const r = 1.6 + Math.sin(a) * 0.15;
        p.position.x = Math.cos(p.userData.angle + a * 0.3) * r;
        p.position.z = Math.sin(p.userData.angle + a * 0.3) * r;
        p.position.y = Math.sin(a * 1.5) * 1.2;
      });
    }

    renderer.render(scene, camera);
  }

  animate();

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointermove', onPointerMove);
      renderer.dispose();
    },
  };
}
