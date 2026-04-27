// Per-scene viewer — reads ?slug=, loads the scene module, renders it with
// orbit controls + a sky-blue/dawn-style ambient + sun rig and a wider
// camera framing than the asset viewer (scenes are bigger).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getScene } from './scene-loader.js';

const params = new URLSearchParams(window.location.search);
const slug = params.get('slug') || 'island';
const faceted = params.get('faceted') === '1';
const stripTex = params.get('stripTextures') !== '0';

const mod = getScene(slug);
const meta = mod?.meta;

const FACETED_FLAG = '__viewer_faceted_done';
function applyFaceted(root: THREE.Object3D, strip: boolean): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const ud = mesh.userData as Record<string, unknown>;
    if (ud[FACETED_FLAG]) return;
    if (mesh.geometry instanceof THREE.BufferGeometry) {
      mesh.geometry.computeVertexNormals();
    }
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const std = m as THREE.MeshStandardMaterial & { flatShading?: boolean; needsUpdate?: boolean };
      if (!std) continue;
      std.flatShading = true;
      if (strip) {
        if ((std as { map?: unknown }).map) (std as { map: null }).map = null;
        if ((std as { normalMap?: unknown }).normalMap) (std as { normalMap: null }).normalMap = null;
        if ((std as { roughnessMap?: unknown }).roughnessMap) (std as { roughnessMap: null }).roughnessMap = null;
      }
      std.needsUpdate = true;
    }
    ud[FACETED_FLAG] = true;
  });
}

document.title = `scene — ${slug}`;
document.getElementById('name')!.textContent = meta?.name ?? slug;
document.getElementById('desc')!.textContent =
  meta?.description ?? 'No description.';
document.getElementById('s-slug')!.textContent = slug;

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
// Phase A: shadow maps + tonemapping for lit scenes.
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const wrap = document.getElementById('canvas-wrap')!;
function resize(): void {
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

const scene = new THREE.Scene();
// Bright sky-blue default; scenes with World/DayNight overwrite via the
// daynight tick.
scene.background = new THREE.Color(0x9ec6e8);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
camera.position.set(60, 35, 60);

// Fallback ambient — bumped from 0.05 to 0.4 so scenes that don't add any
// light (or that use dim defaults) still render visibly. World-using scenes
// add their own AmbientLightWidget on top of this.
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// Ground (always present so shadows have a surface to land on). Larger
// radius and a brighter green so the carnival fits inside it.
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(250, 64),
  new THREE.MeshStandardMaterial({ color: 0x6b8e4f, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.001;
ground.receiveShadow = true;
scene.add(ground);

let assetRoot: THREE.Object3D | null = null;
if (mod) {
  assetRoot = mod.default(scene, THREE, {});
  if (faceted) applyFaceted(assetRoot, stripTex);
} else {
  console.error('no scene module for slug', slug);
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(2, 2, 2),
    new THREE.MeshBasicMaterial({ color: 0xff0040, wireframe: true }),
  );
  scene.add(placeholder);
  assetRoot = placeholder;
}

let meshCount = 0;
let tickCount = 0;
const bbox = new THREE.Box3();
if (assetRoot) {
  assetRoot.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) meshCount++;
    if (typeof (obj.userData as { tick?: unknown }).tick === 'function') tickCount++;
  });
  bbox.setFromObject(assetRoot);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  const dist = maxDim * 1.5 + 10;
  camera.position.set(center.x + dist * 0.7, center.y + dist * 0.5, center.z + dist * 0.7);
  camera.lookAt(center);
}
document.getElementById('s-meshes')!.textContent = String(meshCount);
document.getElementById('s-ticks')!.textContent = String(tickCount);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.4;
const center = new THREE.Vector3();
bbox.getCenter(center);
controls.target.copy(center);

// Re-frame once async-loaded glTFs (Quaternius animals, KayKit chars)
// expand the bbox. Probe over the first 3 seconds.
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
      const dist = maxDim * 1.2 + 20;
      camera.position.set(c.x + dist * 0.7, c.y + dist * 0.6, c.z + dist * 0.7);
      camera.lookAt(c);
      controls.target.copy(c);
      bbox.copy(probe);
    }
  };
  for (const delay of [200, 600, 1200, 2400, 3600]) {
    setTimeout(reframeIfReady, delay);
  }
}

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
  if (faceted && assetRoot) applyFaceted(assetRoot, stripTex);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

window.addEventListener('resize', resize);
resize();
