import { initBottleScene } from './bottle-3d.js';
import { initLiveBeach } from './live-beach.js';

let heroScene = null;
let beachScene = null;

function boot() {
  const canvas = document.getElementById('bottleCanvas');
  if (canvas) heroScene = initBottleScene(canvas);

  const heroBg = document.getElementById('heroBg');
  if (heroBg) beachScene = initLiveBeach(heroBg);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

window.addEventListener('pagehide', () => {
  heroScene?.destroy();
  beachScene?.destroy();
});
