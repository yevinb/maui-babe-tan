import { initBottleScene } from './bottle-3d.js?v=27';
import { initLiveBeach } from './live-beach.js?v=27';
import { initGlDistort } from './gl-distort.js?v=27';
import { initGallery3D } from './gallery-3d.js?v=27';
import { initScrollEffects } from './scroll-effects.js?v=27';

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
