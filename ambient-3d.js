import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export function initAmbientScene(canvas) {
  if (!canvas) return null;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 768;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0xf7f2ea, 0.018);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 8;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: !isMobile,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);

  const count = isMobile ? 60 : 120;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 24;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 12;
    sizes[i] = 0.02 + Math.random() * 0.06;
    speeds[i] = 0.2 + Math.random() * 0.6;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uScroll: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
    },
    vertexShader: `
      attribute float size;
      uniform float uTime;
      uniform float uScroll;
      varying float vAlpha;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.4 + position.x * 0.5) * 0.3;
        p.x += cos(uTime * 0.3 + position.y * 0.4) * 0.2;
        p.z += uScroll * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = size * (300.0 / -mv.z);
        vAlpha = 0.4 + sin(uTime + position.x * 2.0) * 0.15;
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float glow = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(0.95, 0.78, 0.35, glow * vAlpha * 0.7);
      }
    `,
  });

  const particles = new THREE.Points(geo, mat);
  scene.add(particles);

  // Floating rings
  const rings = new THREE.Group();
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xe8b84a,
    transparent: true,
    opacity: 0.06,
    wireframe: true,
  });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2 + i * 1.2, 0.01, 8, 64), ringMat);
    ring.position.z = -3 - i * 2;
    ring.rotation.x = Math.PI * 0.4 + i * 0.2;
    rings.add(ring);
  }
  scene.add(rings);

  let mouseX = 0;
  let mouseY = 0;
  let scrollY = 0;
  let running = true;
  let animId;

  function onPointerMove(e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }

  function onScroll() {
    scrollY = window.scrollY / (document.body.scrollHeight - window.innerHeight || 1);
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

  const clock = new THREE.Clock();

  function animate() {
    if (!running) return;
    animId = requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    if (!prefersReduced) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uScroll.value = scrollY;
      mat.uniforms.uMouse.value.set(mouseX, mouseY);

      camera.position.x += (mouseX * 0.8 - camera.position.x) * 0.03;
      camera.position.y += (-mouseY * 0.5 - camera.position.y) * 0.03;
      camera.lookAt(0, 0, 0);

      rings.children.forEach((ring, i) => {
        ring.rotation.z = t * (0.08 + i * 0.04);
        ring.rotation.y = t * 0.05;
      });

      const pos = geo.attributes.position.array;
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] += Math.sin(t * speeds[i] + i) * 0.002;
      }
      geo.attributes.position.needsUpdate = true;
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
