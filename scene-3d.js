import { initBottleScene } from './bottle-3d.js';
import { initLiveBeach } from './live-beach.js';
import { initAmbientScene } from './ambient-3d.js';
import { initScroll3D } from './scroll-3d.js';
import { initProductGL } from './product-gl.js';
import { initGlDistort } from './gl-distort.js';
import { initGallery3D } from './gallery-3d.js';

const scenes = [];

function boot() {
  const ambient = document.getElementById('ambientCanvas');
  if (ambient) scenes.push(initAmbientScene(ambient));

  const bottle = document.getElementById('bottleCanvas');
  if (bottle) scenes.push(initBottleScene(bottle));

  const heroBg = document.getElementById('heroBg');
  if (heroBg) scenes.push(initLiveBeach(heroBg));

  scenes.push(initScroll3D());
  scenes.push(initProductGL());
  scenes.push(initGlDistort());
  scenes.push(initGallery3D());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

window.addEventListener('pagehide', () => {
  scenes.forEach((s) => s?.destroy?.());
});
