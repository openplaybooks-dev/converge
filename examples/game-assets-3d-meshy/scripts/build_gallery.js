#!/usr/bin/env node
/**
 * 08-gallery — emit viewer/gallery.html.
 *
 * Per-character cards rendering each model.glb with three.js + OrbitControls.
 * Auto-bbox-fits each camera. Loads three.js from a CDN via importmap; no build.
 *
 * If a character has rigged animations, the first animation clip is auto-played
 * via AnimationMixer so the card actually moves.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';

const characters = JSON.parse(readFileSync('assets/characters.json', 'utf-8'));

let threeVersion = '0.160.0';
try {
  const yml = readFileSync('.converge/playbooks/default/playbook.yml', 'utf-8');
  threeVersion = yml.match(/three_version:\s*([\w.]+)/)?.[1] || threeVersion;
} catch {}

// For each character collect the available animation glbs (so the gallery can
// auto-play one if present).
const cardData = characters.map(c => {
  const animDir = `assets/characters/${c.id}/anims`;
  const anims = existsSync(animDir)
    ? readdirSync(animDir).filter(f => f.endsWith('.glb')).map(f => ({
        name: f.replace(/\.glb$/, ''),
        path: `../assets/characters/${c.id}/anims/${f}`,
      }))
    : [];
  return {
    id: c.id,
    cls: c.class,
    description: c.description,
    model: `../assets/characters/${c.id}/model.glb`,
    anims,
  };
});

const cards = cardData.map(d => `      <div class="card" data-id="${d.id}" data-src="${d.model}" data-anims='${JSON.stringify(d.anims)}'>
        <canvas></canvas>
        <h2>${d.id}</h2>
        <p class="cls">${d.cls}</p>
        <p class="desc">${d.description.replace(/</g, '&lt;')}</p>
        <p class="meta">${d.anims.length ? d.anims.length + ' anim clips' : 'no anims'}</p>
      </div>`).join('\n');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Aether's Edge — character gallery</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0e0e10; color: #ddd; margin: 0; padding: 24px; }
  h1 { font-weight: 500; margin: 0 0 4px; }
  p.lead { color: #888; margin: 0 0 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; }
  .card { background: #18181b; border: 1px solid #2a2a2f; border-radius: 10px; padding: 12px; }
  .card canvas { width: 100%; height: 280px; display: block; background: #111; border-radius: 6px; }
  .card h2 { margin: 10px 0 2px; font-size: 14px; font-weight: 600; font-family: ui-monospace, monospace; }
  .card p.cls { margin: 0 0 6px; font-size: 11px; color: #f0a050; text-transform: uppercase; letter-spacing: 0.05em; }
  .card p.desc { margin: 0 0 6px; font-size: 12px; color: #aaa; line-height: 1.4; }
  .card p.meta { margin: 0; font-size: 11px; color: #666; }
</style>
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@${threeVersion}/build/three.module.js",
    "three/addons/": "https://unpkg.com/three@${threeVersion}/examples/jsm/"
  }
}
</script>
</head>
<body>
  <h1>Aether's Edge — Character Gallery</h1>
  <p class="lead">${characters.length} characters across ${new Set(characters.map(c=>c.class)).size} classes. Drag to orbit; scroll to zoom.</p>
  <div class="grid">
${cards}
  </div>
<script type="module">
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
  import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

  const loader = new GLTFLoader();
  const cards = document.querySelectorAll('.card');

  for (const card of cards) {
    const canvas = card.querySelector('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 280;
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(w, h, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111114);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(4, 6, 3);
    scene.add(dir);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    let mixer = null;

    try {
      const g = await loader.loadAsync(card.dataset.src);
      // Frame the camera to the model's bbox.
      const box = new THREE.Box3().setFromObject(g.scene);
      const size = box.getSize(new THREE.Vector3()).length() || 2;
      const center = box.getCenter(new THREE.Vector3());
      g.scene.position.sub(center);
      camera.position.set(size, size * 0.6, size);
      camera.lookAt(0, 0, 0);
      scene.add(g.scene);

      // If we have any animation clips for this character, attach a mixer and
      // play the first one. Stub anim glbs are static cubes — that's fine.
      const anims = JSON.parse(card.dataset.anims);
      if (anims.length) {
        try {
          const animGltf = await loader.loadAsync(anims[0].path);
          if (animGltf.animations?.length) {
            mixer = new THREE.AnimationMixer(g.scene);
            mixer.clipAction(animGltf.animations[0]).play();
          }
        } catch (e) { console.warn('anim load failed for', card.dataset.id, e); }
      }
    } catch (e) {
      console.error(card.dataset.id, e);
      scene.add(new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x802020, wireframe: true }),
      ));
    }

    const clock = new THREE.Clock();
    function tick() {
      const dt = clock.getDelta();
      if (mixer) mixer.update(dt);
      controls.update();
      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    tick();
  }
</script>
</body>
</html>
`;

mkdirSync('viewer', { recursive: true });
writeFileSync('viewer/gallery.html', html);
console.log(`✓ viewer/gallery.html (${characters.length} cards, three@${threeVersion})`);
