import { initBottleScene } from './bottle-3d.js';
import { initLiveBeach } from './live-beach.js';
import { initGlDistort } from './gl-distort.js';
import { initGallery3D } from './gallery-3d.js';
import { initScrollEffects } from './scroll-effects.js';

const scenes = [];

function boot() {
  const heroBg = document.getElementById('heroBg');
  if (heroBg) scenes.push(initLiveBeach(heroBg));

  const bottle = document.getElementById('bottleCanvas');
  if (bottle) scenes.push(initBottleScene(bottle));

  scenes.push(initGlDistort());
  scenes.push(initGallery3D());
  scenes.push(initScrollEffects());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

window.addEventListener('pagehide', () => {
  scenes.forEach((s) => s?.destroy?.());
});
