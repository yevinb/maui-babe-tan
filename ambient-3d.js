import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function initAmbientScene(canvas) {
  if (!canvas) return null;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf7f2ea, isMobile ? 0.022 : 0.015);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
  camera.position.set(0, 0, 12);

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const count = isMobile ? 120 : 280;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 40;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
    sizes[i] = 0.03 + Math.random() * 0.1;
    const gold = Math.random() > 0.35;
    colors[i * 3] = gold ? 0.95 : 0.4;
    colors[i * 3 + 1] = gold ? 0.78 : 0.75;
    colors[i * 3 + 2] = gold ? 0.35 : 0.95;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const particleMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
    },
    vertexShader: `
      attribute float size;
      uniform float uTime;
      uniform float uScroll;
      varying vec3 vColor;
      void main() {
        vColor = color;
        vec3 p = position;
        p.y -= uScroll * 60.0;
        p.x += sin(uTime * 0.5 + position.y * 0.1) * 0.4;
        p.y += cos(uTime * 0.4 + position.x * 0.08) * 0.3;
        p.z += sin(uTime * 0.3 + position.x) * 0.2;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * (400.0 / -mv.z);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float glow = pow(1.0 - d * 2.0, 2.0);
        gl_FragColor = vec4(vColor, glow * 0.75);
      }
    `,
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  scene.add(particles);

  // Connection lines between nearby particles
  const lineCount = isMobile ? 40 : 90;
  const linePos = new Float32Array(lineCount * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0xe8b84a,
    transparent: true,
    opacity: 0.06,
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // Floating 3D shapes
  const shapes = new THREE.Group();
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8b84a,
    roughness: 0.2,
    metalness: 0.4,
    transparent: true,
    opacity: 0.35,
    wireframe: false,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x88ddff,
    roughness: 0.1,
    metalness: 0.1,
    transmission: 0.6,
    transparent: true,
    opacity: 0.25,
  });

  const shapeCount = isMobile ? 8 : 18;
  for (let i = 0; i < shapeCount; i++) {
    let mesh;
    const r = Math.random();
    if (r < 0.33) mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2 + Math.random() * 0.4, 1), goldMat.clone());
    else if (r < 0.66) mesh = new THREE.Mesh(new THREE.TorusGeometry(0.3 + Math.random() * 0.3, 0.04, 8, 32), goldMat.clone());
    else mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15 + Math.random() * 0.25, 16, 16), glassMat.clone());

    mesh.position.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 15 - 5
    );
    mesh.userData = {
      speed: 0.2 + Math.random() * 0.5,
      rotSpeed: 0.3 + Math.random() * 0.8,
      offset: Math.random() * Math.PI * 2,
    };
    shapes.add(mesh);
  }
  scene.add(shapes);

  // Gold rings tunnel
  const rings = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.5 + i * 0.8, 0.015, 8, 64),
      new THREE.MeshBasicMaterial({ color: 0xe8b84a, transparent: true, opacity: 0.05, wireframe: true })
    );
    ring.position.z = -i * 3;
    ring.rotation.x = Math.PI * 0.45;
    rings.add(ring);
  }
  scene.add(rings);

  scene.add(new THREE.AmbientLight(0xfff5e6, 0.4));
  const sun = new THREE.PointLight(0xe8b84a, 1.5, 50);
  sun.position.set(5, 10, 8);
  scene.add(sun);
  const ocean = new THREE.PointLight(0x44bbcc, 0.8, 40);
  ocean.position.set(-8, -5, 5);
  scene.add(ocean);

  let mouseX = 0;
  let mouseY = 0;
  let scrollY = 0;
  let running = true;
  let animId;
  const clock = new THREE.Clock();
  const basePositions = positions.slice();

  function updateLines(t) {
    const arr = lineGeo.attributes.position.array;
    let idx = 0;
    for (let i = 0; i < lineCount && idx < arr.length - 5; i++) {
      const a = Math.floor(Math.random() * count);
      const b = Math.floor(Math.random() * count);
      arr[idx++] = basePositions[a * 3];
      arr[idx++] = basePositions[a * 3 + 1] - scrollY * 60;
      arr[idx++] = basePositions[a * 3 + 2];
      arr[idx++] = basePositions[b * 3];
      arr[idx++] = basePositions[b * 3 + 1] - scrollY * 60;
      arr[idx++] = basePositions[b * 3 + 2];
    }
    lineGeo.attributes.position.needsUpdate = true;
    lineMat.opacity = 0.04 + Math.sin(t * 0.5) * 0.02;
  }

  function onPointerMove(e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onScroll() {
    scrollY = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight || 1);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  resize();
  onScroll();

  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (!prefersReduced) {
      particleMat.uniforms.uTime.value = t;
      particleMat.uniforms.uScroll.value = scrollY;

      camera.position.x += (mouseX * 2 - camera.position.x) * 0.04;
      camera.position.y += (-mouseY * 1.5 + scrollY * 8 - camera.position.y) * 0.04;
      camera.position.z = 12 + scrollY * 4;
      camera.lookAt(mouseX * 2, scrollY * 8 - mouseY, 0);

      shapes.children.forEach((mesh) => {
        const d = mesh.userData;
        mesh.rotation.x = t * d.rotSpeed + d.offset;
        mesh.rotation.y = t * d.rotSpeed * 0.7;
        mesh.position.y += Math.sin(t * d.speed + d.offset) * 0.004;
      });

      rings.children.forEach((ring, i) => {
        ring.rotation.z = t * (0.06 + i * 0.02);
        ring.position.y = Math.sin(t * 0.3 + i) * 0.5;
      });

      updateLines(t);

      const pos = particleGeo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] = basePositions[i * 3 + 1] + Math.sin(t * 0.5 + i * 0.1) * 0.15;
      }
      particleGeo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  animate();

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('scroll', onScroll);
      renderer.dispose();
    },
  };
}
