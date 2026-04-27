// Per-asset inspector — reads ?slug=, loads the catalog module, renders it
// with OrbitControls + a studio 3-light rig.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getAsset } from './loader.js';

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug') || 'tree-pine';

const mod = getAsset(slug);
const meta = mod?.meta;

document.title = `viewer — ${slug}`;
document.getElementById('name')!.textContent = meta?.name ?? slug;
document.getElementById('kind')!.textContent = `${meta?.kind ?? '—'} / ${meta?.archetype ?? '—'}`;
document.getElementById('desc')!.textContent =
  meta?.description ?? 'No description.';
document.getElementById('s-slug')!.textContent = slug;
document.getElementById('s-arch')!.textContent = meta?.archetype ?? '—';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);

const wrap = document.getElementById('canvas-wrap')!;
function resize(): void {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6a7078);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(8, 6, 10);

// Studio rig
scene.add(new THREE.AmbientLight(0xffffff, 0.85));
scene.add(new THREE.HemisphereLight(0xeae2d8, 0x4a4a52, 0.7));
const key = new THREE.DirectionalLight(0xfff6e0, 1.6);
key.position.set(8, 12, 8);
scene.add(key);
const fill = new THREE.DirectionalLight(0xc8d8ff, 0.5);
fill.position.set(-6, 6, -4);
scene.add(fill);

// Ground disc for context
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(20, 32),
  new THREE.MeshStandardMaterial({ color: 0x4a4a52, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.001;
scene.add(ground);

let assetRoot: THREE.Object3D | null = null;
if (mod) {
  assetRoot = mod.default(scene, THREE, {});
} else {
  console.error('no catalog module for slug', slug);
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0xff0040, wireframe: true }),
  );
  scene.add(placeholder);
  assetRoot = placeholder;
}

// Stats from the assembled tree
let meshCount = 0;
let tickCount = 0;
let tellCount = 0;
const bbox = new THREE.Box3();
if (assetRoot) {
  assetRoot.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) meshCount++;
    if (typeof (obj.userData as { tick?: unknown }).tick === 'function') tickCount++;
  });
  // Tells live on the root userData
  const tells = (assetRoot.userData as { tells?: unknown[] }).tells;
  tellCount = Array.isArray(tells) ? tells.length : 0;

  bbox.setFromObject(assetRoot);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = maxDim * 2.0 + 1.5;
  camera.position.set(center.x + dist * 0.7, center.y + dist * 0.5, center.z + dist * 0.7);
  camera.lookAt(center);
}
document.getElementById('s-meshes')!.textContent = String(meshCount);
document.getElementById('s-tells')!.textContent = String(tellCount);
document.getElementById('s-ticks')!.textContent = String(tickCount);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;
const center = new THREE.Vector3();
bbox.getCenter(center);
controls.target.copy(center);

// Async-loaded assets (e.g., RealisticBody glTF) may have an empty bbox at
// initial framing; re-frame once after content arrives. Probe a few times
// over the first 2 seconds.
if (assetRoot) {
  let reframed = false;
  const reframeIfReady = (): void => {
    if (reframed || !assetRoot) return;
    const probe = new THREE.Box3().setFromObject(assetRoot);
    const size = new THREE.Vector3();
    probe.getSize(size);
    if (size.length() > 0.1) {
      reframed = true;
      const c = new THREE.Vector3();
      probe.getCenter(c);
      const maxDim = Math.max(size.x, size.y, size.z);
      const dist = maxDim * 2.0 + 1.5;
      camera.position.set(c.x + dist * 0.7, c.y + dist * 0.5, c.z + dist * 0.7);
      camera.lookAt(c);
      controls.target.copy(c);
      bbox.copy(probe);
    }
  };
  for (const delay of [200, 500, 1000, 2000]) {
    setTimeout(reframeIfReady, delay);
  }
}

// UI controls
(document.getElementById('auto-rotate') as HTMLInputElement).addEventListener('change', (e) => {
  controls.autoRotate = (e.target as HTMLInputElement).checked;
});
(document.getElementById('wireframe') as HTMLInputElement).addEventListener('change', (e) => {
  const wf = (e.target as HTMLInputElement).checked;
  if (!assetRoot) return;
  assetRoot.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) (m as THREE.Material & { wireframe?: boolean }).wireframe = wf;
    }
  });
});
const scaleInput = document.getElementById('scale') as HTMLInputElement;
scaleInput.addEventListener('input', () => {
  if (!assetRoot) return;
  assetRoot.scale.setScalar(parseFloat(scaleInput.value));
});
if (assetRoot) assetRoot.scale.setScalar(parseFloat(scaleInput.value));

let last = performance.now();
function tick(): void {
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  const t = now / 1000;
  last = now;
  scene.traverse((obj) => {
    const fn = (obj.userData as { tick?: (t: number, dt: number) => void }).tick;
    if (typeof fn === 'function') fn(t, dt);
  });
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

window.addEventListener('resize', resize);
resize();
