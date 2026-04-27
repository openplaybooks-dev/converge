#!/usr/bin/env node
/**
 * Emit viewer/scene.html — the full-scene viewer.
 *
 * Loads scene.json + scene-shell.js + every glb in placements. Each character
 * gets its Idle clip auto-played via AnimationMixer. Camera is OrbitControls
 * around the center of the arena (no WASD — that's playable-mvp-3d's job).
 *
 * This is the deliverable the user asked for: see characters AND props AND
 * tilemap AND skybox in one viewable scene.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const scene = JSON.parse(readFileSync('assets/scene.json', 'utf-8'));
const characters = JSON.parse(readFileSync('assets/characters.json', 'utf-8'));

let threeVersion = '0.160.0';
try {
  const yml = readFileSync('.converge/playbooks/default/playbook.yml', 'utf-8');
  threeVersion = yml.match(/three_version:\s*([\w.]+)/)?.[1] || threeVersion;
} catch {}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Aether's Edge — full scene</title>
<style>
  html, body { height: 100%; margin: 0; }
  body { background: #0a0a0c; color: #ddd; font-family: system-ui, sans-serif; overflow: hidden; }
  canvas { display: block; }
  .hud {
    position: fixed; top: 12px; left: 12px;
    background: rgba(0,0,0,0.55); padding: 10px 14px; border-radius: 8px;
    font-size: 12px; line-height: 1.6; pointer-events: none;
    max-width: 320px;
  }
  .hud strong { color: #f0a050; }
  .hud .legend { margin-top: 6px; font-size: 11px; color: #999; }
  .hud .legend span { color: #f0a050; }
  #loading {
    position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
    background: #0a0a0c; color: #888; font-size: 14px; z-index: 20;
  }
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
<div id="loading">loading scene…</div>
<div class="hud">
  <strong>Aether's Edge — full scene</strong>
  <div class="legend">
    ${characters.length} characters · ${scene.placements.filter(p => p.asset_kind === 'prop').length} props · ${scene.arena.tilesPerSide}×${scene.arena.tilesPerSide} tilemap
  </div>
  <div class="legend">drag to orbit · scroll to zoom · right-click to pan</div>
</div>

<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildEnvironment } from '../assets/environment/scene-shell.js';

const SCENE = ${JSON.stringify(scene, null, 2)};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.fromArray(SCENE.cameraSuggestion.position);
camera.lookAt(...SCENE.cameraSuggestion.lookAt);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.fromArray(SCENE.cameraSuggestion.lookAt);
controls.enableDamping = true;
controls.minDistance = 4;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI * 0.49;   // can't go below ground

// Environment first (tilemap, skybox, lighting, fog)
buildEnvironment(scene, THREE);

// Now load every placement.
const loader = new GLTFLoader();
const mixers = [];

for (const p of SCENE.placements) {
  try {
    const g = await loader.loadAsync(p.glb);
    const root = g.scene;
    root.position.fromArray(p.position);
    root.rotation.set(...p.rotation);
    if (p.scale) root.scale.setScalar(p.scale);
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    scene.add(root);

    // Characters: try to attach Idle animation.
    if (p.asset_kind === 'character' && p.idle_glb) {
      try {
        const idleGltf = await loader.loadAsync(p.idle_glb);
        if (idleGltf.animations?.length) {
          const mixer = new THREE.AnimationMixer(root);
          mixer.clipAction(idleGltf.animations[0]).play();
          mixers.push(mixer);
        }
      } catch (e) { console.warn('idle anim load failed for', p.asset_id, e); }
    }
  } catch (e) {
    console.error('placement load failed:', p.id, e);
    // Show a red wireframe placeholder so we can spot which one failed.
    const placeholder = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x802020, wireframe: true }),
    );
    placeholder.position.fromArray(p.position);
    scene.add(placeholder);
  }
}

document.getElementById('loading').remove();

const clock = new THREE.Clock();
function tick() {
  const dt = clock.getDelta();
  for (const m of mixers) m.update(dt);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
</script>
</body>
</html>
`;

mkdirSync('viewer', { recursive: true });
writeFileSync('viewer/scene.html', html);
console.log(`✓ viewer/scene.html (${scene.placements.length} placements, three@${threeVersion})`);
